"""Capa de persistencia relacional y repositorio del núcleo SM.

Gestiona las operaciones transaccionales en PostgreSQL sobre las tablas
`sm_eventos`, `sm_mensajes`, `sm_entregas`, `sm_auditorias` y `sm_consentimientos`,
garantizando idempotencia, no repudio y aislamiento sin exponer PII.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings

from .boveda import SMBovedaContactoDB, validar_datos_no_personales
from .channels import SMCanalBase, SMCorreoAdapter, SMSMSAdapter, SMTelegramAdapter, SMWebhookAdapter, SMWhatsAppAdapter
from .contracts import (
    SMCanal,
    SMConsentimiento,
    SMContacto,
    SMEstadoConsentimiento,
    SMEstadoMensaje,
    SMEstadoSalud,
    SMEvento,
    SMMensaje,
    SMResultadoEntrega,
    SMSalud,
)
from .core import (
    SMCanalesNoAutorizados,
    SMConsentimientoFaltante,
    SMError,
    SMIdempotenciaConflict,
    hash_traza,
)
from .models import (
    SMAuditoriaRegistro,
    SMConsentimientoRegistro,
    SMEventoRegistro,
    SMMensajeRegistro,
    SMWorkerLatidoRegistro,
)
from .templates import motor_plantillas
from .transports import transportes_desde_settings

ADAPTADORES_BASE: dict[SMCanal, type[SMCanalBase]] = {
    SMCanal.CORREO: SMCorreoAdapter,
    SMCanal.WHATSAPP: SMWhatsAppAdapter,
    SMCanal.TELEGRAM: SMTelegramAdapter,
    SMCanal.WEBHOOK: SMWebhookAdapter,
    SMCanal.SMS: SMSMSAdapter,
}


class SMRepository:
    """Repositorio transaccional de persistencia para SM Core."""

    def __init__(
        self,
        tenant: str = "polis",
        *,
        boveda: SMBovedaContactoDB | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.tenant = tenant
        self.boveda = boveda
        self.settings = settings
        self.adaptadores = dict(ADAPTADORES_BASE)

    def _boveda(self) -> SMBovedaContactoDB:
        """La bóveda aporta el secreto HMAC; sin ella no se puede seudonimizar."""
        if self.boveda is None:
            self.boveda = SMBovedaContactoDB.desde_settings(self.settings)
        return self.boveda

    def huellas_contacto(self, actor: str, canal: SMCanal, contacto: str) -> tuple[str, ...]:
        return self._boveda().huellas(self.tenant, actor, canal.value, contacto)

    async def registrar_consentimiento(
        self,
        session: AsyncSession,
        *,
        actor: str,
        canal: SMCanal,
        contacto: str,
        consentido: bool,
        origen: str = "sm",
        operador: str | None = None,
    ) -> SMConsentimiento:
        """Registra o actualiza consentimiento en base de datos.

        El identificador de contacto se anonimiza inmediatamente a HMAC-SHA256.
        """
        huellas = self.huellas_contacto(actor, canal, contacto)
        contacto_hash = huellas[0]

        validar_datos_no_personales(self.tenant, actor, origen, contacto=contacto)
        await self._bloquear_clave(session, "consentimiento", actor, canal.value, contacto_hash)
        query = select(SMConsentimientoRegistro).where(
            SMConsentimientoRegistro.tenant == self.tenant,
            SMConsentimientoRegistro.actor == actor,
            SMConsentimientoRegistro.canal == canal.value,
            SMConsentimientoRegistro.contacto_hash.in_(huellas),
        )
        res = await session.execute(query.with_for_update().execution_options(populate_existing=True))
        registro = res.scalar_one_or_none()

        nuevo_estado = "otorgado" if consentido else "revocado"
        ahora = datetime.now(UTC)

        if registro:
            registro.estado = nuevo_estado
            registro.actualizado_en = ahora
        else:
            registro = SMConsentimientoRegistro(
                id=uuid.uuid4(),
                tenant=self.tenant,
                actor=actor,
                canal=canal.value,
                contacto_hash=contacto_hash,
                estado=nuevo_estado,
                origen=origen,
                creado_en=ahora,
                actualizado_en=ahora,
            )
            session.add(registro)

        if consentido:
            await self._boveda().almacenar(
                session, tenant=self.tenant, contacto=SMContacto(canal=canal, actor=actor, identificador=contacto)
            )
        else:
            for huella in huellas:
                await SMBovedaContactoDB.purgar(
                    session, tenant=self.tenant, actor=actor, canal=canal, contacto_hash=huella
                )

        # Auditoría transaccional sin PII
        auditoria_hash = hash_traza(
            tenant=self.tenant,
            actor=actor,
            accion="consentimiento.registrado",
            evento_id="",
            mensaje_id=None,
            payload={"canal": canal.value, "estado": nuevo_estado, "origen": origen, "operador": operador or ""},
        )
        auditoria = SMAuditoriaRegistro(
            id=uuid.uuid4(),
            evento_id=None,
            mensaje_id=None,
            tenant=self.tenant,
            actor=actor,
            operador=operador,
            accion="consentimiento.registrado",
            detalle=f"Consentimiento {nuevo_estado} para canal {canal.value}",
            hash=auditoria_hash,
            creado_en=ahora,
        )
        session.add(auditoria)
        await session.flush()

        return SMConsentimiento(
            id=registro.id,
            tenant=registro.tenant,
            actor=registro.actor,
            canal=SMCanal(registro.canal),
            contacto_hash=registro.contacto_hash,
            estado=SMEstadoConsentimiento(registro.estado),
            origen=registro.origen,
            creado_en=registro.creado_en if isinstance(registro.creado_en, datetime) else ahora,
            actualizado_en=registro.actualizado_en if isinstance(registro.actualizado_en, datetime) else ahora,
        )

    async def verificar_consentimiento(
        self,
        session: AsyncSession,
        *,
        actor: str,
        canal: SMCanal,
        contacto_hash: str | None = None,
        contacto_hashes: Sequence[str] = (),
    ) -> bool:
        """Verifica consentimiento por huella almacenada o por huellas candidatas."""
        huellas = tuple(contacto_hashes) or ((contacto_hash,) if contacto_hash else ())
        if not huellas:
            return False
        query = select(SMConsentimientoRegistro.estado).where(
            SMConsentimientoRegistro.tenant == self.tenant,
            SMConsentimientoRegistro.actor == actor,
            SMConsentimientoRegistro.canal == canal.value,
            SMConsentimientoRegistro.contacto_hash.in_(huellas),
        )
        res = await session.execute(query)
        estado = res.scalar_one_or_none()
        return estado == "otorgado"

    async def procesar_evento(
        self,
        session: AsyncSession,
        evento: SMEvento,
        *,
        operador: str | None = None,
    ) -> SMMensaje:
        """Ingresa un evento al outbox relacional con idempotencia y auditoría."""
        if evento.tenant != self.tenant:
            raise SMIdempotenciaConflict(f"Tenant '{evento.tenant}' no coincide con '{self.tenant}'")

        validar_datos_no_personales(
            evento.tenant,
            evento.actor,
            evento.tipo_evento,
            evento.entidad,
            evento.entidad_id,
            evento.idempotencia,
            evento.origen,
            evento.asunto,
            evento.cuerpo,
            *evento.payload.keys(),
            *evento.payload.values(),
            contacto=evento.contacto.identificador,
        )
        if evento.actor != evento.contacto.actor:
            raise SMError("El actor del contacto debe coincidir con el evento")
        await self._bloquear_clave(session, "evento", evento.idempotencia)
        # 1. Chequeo de idempotencia
        query_idem = select(SMEventoRegistro).where(
            SMEventoRegistro.tenant == self.tenant,
            SMEventoRegistro.idempotencia == evento.idempotencia,
        )
        res_idem = await session.execute(query_idem)
        evento_existente = res_idem.scalar_one_or_none()

        if evento_existente:
            if (
                evento_existente.payload != evento.payload
                or evento_existente.entidad != evento.entidad
                or evento_existente.entidad_id != evento.entidad_id
                or evento_existente.plantilla != evento.plantilla
                or evento_existente.origen != evento.origen
                or evento_existente.tipo_evento != evento.tipo_evento
                or evento_existente.actor != evento.actor
                or evento_existente.canal != evento.canal.value
                or evento_existente.contacto_hash
                not in self.huellas_contacto(evento.actor, evento.canal, evento.contacto.identificador)
            ):
                raise SMIdempotenciaConflict("idempotencia repetida con datos distintos")
            asunto_idem, cuerpo_idem = evento.asunto, evento.cuerpo
            if evento.plantilla:
                a, c = motor_plantillas.renderizar(evento.plantilla, {"actor": evento.actor, **evento.payload})
                asunto_idem, cuerpo_idem = a or asunto_idem, c or cuerpo_idem
            if evento_existente.asunto != asunto_idem or evento_existente.cuerpo != cuerpo_idem:
                raise SMIdempotenciaConflict("idempotencia repetida con contenido distinto")
            query_msg = select(SMMensajeRegistro).where(
                SMMensajeRegistro.evento_id == evento_existente.id,
            )
            res_msg = await session.execute(query_msg)
            msg_existente = res_msg.scalar_one_or_none()
            if msg_existente:
                return self._mapear_mensaje_modelo(msg_existente)
            raise SMIdempotenciaConflict("Evento existente sin mensaje asociado")

        # 2. Validación de canal y contacto
        if evento.contacto.canal != evento.canal:
            raise SMConsentimientoFaltante("El canal del contacto y el evento deben ser idénticos")

        huellas = self.huellas_contacto(evento.actor, evento.canal, evento.contacto.identificador)
        contacto_hash = huellas[0]

        # 3. Validación de consentimiento previo (acepta huellas de claves anteriores)
        tiene_consentimiento = await self.verificar_consentimiento(
            session,
            actor=evento.actor,
            canal=evento.canal,
            contacto_hashes=huellas,
        )
        if not tiene_consentimiento:
            raise SMConsentimientoFaltante(
                f"No existe consentimiento otorgado para {evento.actor} en canal {evento.canal.value}"
            )

        # 4. Renderizado opcional de plantilla
        asunto = evento.asunto
        cuerpo = evento.cuerpo
        if evento.plantilla:
            vars_render = {"actor": evento.actor, **evento.payload}
            asunto_rend, cuerpo_rend = motor_plantillas.renderizar(evento.plantilla, vars_render)
            asunto = asunto_rend or asunto
            cuerpo = cuerpo_rend or cuerpo

        validar_datos_no_personales(asunto, cuerpo, contacto=evento.contacto.identificador)
        ahora = datetime.now(UTC)

        # 5. Persistencia de SMEvento
        evento_reg = SMEventoRegistro(
            id=evento.id,
            tenant=evento.tenant,
            tipo_evento=evento.tipo_evento,
            actor=evento.actor,
            entidad=evento.entidad,
            entidad_id=evento.entidad_id,
            payload=evento.payload,
            idempotencia=evento.idempotencia,
            origen=evento.origen,
            canal=evento.canal.value,
            contacto_hash=contacto_hash,
            plantilla=evento.plantilla,
            asunto=asunto,
            cuerpo=cuerpo,
            creado_en=ahora,
        )
        session.add(evento_reg)
        await session.flush()

        # 6. Persistencia de SMMensaje en Outbox
        metadatos = {
            "sm_origen": evento.origen,
            "sm_entidad": evento.entidad or "",
            "sm_entidad_id": evento.entidad_id or "",
            "sm_tipo_evento": evento.tipo_evento,
            **evento.payload,
        }
        mensaje_id = uuid.uuid4()
        mensaje_reg = SMMensajeRegistro(
            id=mensaje_id,
            evento_id=evento.id,
            tenant=evento.tenant,
            canal=evento.canal.value,
            actor=evento.actor,
            contacto_hash=contacto_hash,
            plantilla=evento.plantilla,
            asunto=asunto,
            cuerpo=cuerpo,
            estado=SMEstadoMensaje.PENDIENTE.value,
            idempotencia=evento.idempotencia,
            metadatos=metadatos,
            creado_en=ahora,
            actualizado_en=ahora,
        )
        session.add(mensaje_reg)
        await session.flush()

        # 7. Auditoría forense
        auditoria_hash = hash_traza(
            tenant=evento.tenant,
            actor=evento.actor,
            accion="evento.registrado",
            evento_id=str(evento.id),
            mensaje_id=str(mensaje_id),
            payload={"mensaje": evento.idempotencia, "estado": "pendiente", "operador": operador or ""},
        )
        auditoria = SMAuditoriaRegistro(
            id=uuid.uuid4(),
            evento_id=evento.id,
            mensaje_id=mensaje_id,
            tenant=evento.tenant,
            actor=evento.actor,
            operador=operador,
            accion="evento.registrado",
            detalle=f"Evento {evento.tipo_evento} encolado para {evento.canal.value}",
            hash=auditoria_hash,
            creado_en=ahora,
        )
        session.add(auditoria)
        await session.flush()

        return self._mapear_mensaje_modelo(mensaje_reg)

    async def despachar_mensaje(
        self,
        session: AsyncSession,
        mensaje_id: uuid.UUID,
        *,
        contacto: SMContacto,
    ) -> SMResultadoEntrega:
        """Despacha un mensaje del outbox usando el adaptador correspondiente."""
        query = (
            select(SMMensajeRegistro)
            .where(SMMensajeRegistro.id == mensaje_id, SMMensajeRegistro.tenant == self.tenant)
            .with_for_update()
        )
        res = await session.execute(query)
        mensaje = res.scalar_one_or_none()

        if not mensaje:
            raise SMError(f"Mensaje {mensaje_id} no existe")

        canal_enum = SMCanal(mensaje.canal)
        if canal_enum != contacto.canal or mensaje.actor != contacto.actor:
            raise SMError("El contacto no corresponde al mensaje")

        if canal_enum not in self.adaptadores:
            raise SMCanalesNoAutorizados(f"Canal {canal_enum.value} no configurado")

        # Compatibilidad: esta API prepara, NO registra entregas ni finge despacho.
        # El envío durable se realiza exclusivamente mediante SMWorker, fuera de
        # la transacción del dominio y con consentimiento vigente en cada intento.
        if not await self.verificar_consentimiento(
            session, actor=mensaje.actor, canal=canal_enum, contacto_hash=mensaje.contacto_hash
        ):
            raise SMConsentimientoFaltante("Consentimiento no vigente")
        if mensaje.contacto_hash not in self.huellas_contacto(contacto.actor, canal_enum, contacto.identificador):
            raise SMError("El contacto no corresponde al mensaje")
        return self.adaptadores[canal_enum]().construir(self._mapear_mensaje_modelo(mensaje), contacto)

    async def _bloquear_clave(self, session: AsyncSession, *partes: str) -> None:
        import hashlib
        import json

        raw = json.dumps(["sm", self.tenant, *partes], separators=(",", ":")).encode()
        llave = int.from_bytes(hashlib.sha256(raw).digest()[:8], "big", signed=True)
        await session.execute(select(func.pg_advisory_xact_lock(llave)))

    async def obtener_mensaje(
        self,
        session: AsyncSession,
        mensaje_id: uuid.UUID,
    ) -> SMMensaje | None:
        """Obtiene un mensaje por su ID."""
        query = select(SMMensajeRegistro).where(
            SMMensajeRegistro.id == mensaje_id,
            SMMensajeRegistro.tenant == self.tenant,
        )
        res = await session.execute(query)
        reg = res.scalar_one_or_none()
        if not reg:
            return None
        return self._mapear_mensaje_modelo(reg)

    async def listar_mensajes(
        self,
        session: AsyncSession,
        *,
        canal: SMCanal | None = None,
        estado: SMEstadoMensaje | None = None,
        limite: int = 50,
    ) -> Sequence[SMMensaje]:
        """Consulta el outbox relacional."""
        query = select(SMMensajeRegistro).where(SMMensajeRegistro.tenant == self.tenant)
        if canal:
            query = query.where(SMMensajeRegistro.canal == canal.value)
        if estado:
            query = query.where(SMMensajeRegistro.estado == estado.value)
        query = query.order_by(SMMensajeRegistro.creado_en.desc()).limit(limite)
        res = await session.execute(query)
        return [self._mapear_mensaje_modelo(m) for m in res.scalars().all()]

    async def salud(self, session: AsyncSession, *, settings: Settings | None = None) -> SMSalud:
        """Calcula el estado de salud operativo consultando la base de datos."""
        query = (
            select(
                SMMensajeRegistro.estado,
                func.count(SMMensajeRegistro.id),
            )
            .where(SMMensajeRegistro.tenant == self.tenant)
            .group_by(SMMensajeRegistro.estado)
        )
        res = await session.execute(query)
        conteo_estados = dict(res.all())

        pendientes = conteo_estados.get("pendiente", 0) + conteo_estados.get("encolado", 0)
        enviados = conteo_estados.get("enviado", 0) + conteo_estados.get("entregado", 0)
        fallidos = conteo_estados.get("fallido", 0) + conteo_estados.get("agotado", 0)

        estado = SMEstadoSalud.SALUDABLE
        motivos: list[str] = []
        if fallidos > 0 and pendientes == 0:
            estado = SMEstadoSalud.CRITICO
            motivos.append("Existen mensajes fallidos/agotados sin pendientes en curso")
        elif pendientes > 100:
            estado = SMEstadoSalud.DEGRADADO
            motivos.append(f"Cola acumulada con {pendientes} mensajes pendientes")

        settings = settings or Settings()
        transportes = transportes_desde_settings(settings)
        degradados = tuple(c for c, t in transportes.items() if not t.disponible)
        vivos = tuple(c for c, t in transportes.items() if t.disponible)
        latido = await session.get(SMWorkerLatidoRegistro, self.tenant)
        ultimo = latido.ultimo_latido_en if latido else None
        ahora = datetime.now(UTC)
        mas_viejo = await session.scalar(
            select(func.min(SMMensajeRegistro.creado_en)).where(
                SMMensajeRegistro.tenant == self.tenant,
                SMMensajeRegistro.estado.in_(["pendiente", "encolado", "fallido"]),
                SMMensajeRegistro.reintentable.is_(True),
            )
        )
        if degradados:
            motivos.append("Canales sin transporte configurado o en simulación")
            if estado == SMEstadoSalud.SALUDABLE:
                estado = SMEstadoSalud.DEGRADADO
        if not settings.sm_worker_habilitado:
            motivos.append("Worker deshabilitado por configuración")
            if pendientes and estado != SMEstadoSalud.CRITICO:
                estado = SMEstadoSalud.DEGRADADO
        elif ultimo is None or (ahora - ultimo).total_seconds() > 300:
            motivos.append("Worker sin latido reciente")
            if estado != SMEstadoSalud.CRITICO:
                estado = SMEstadoSalud.DEGRADADO
        return SMSalud(
            tenant=self.tenant,
            estado=estado,
            pendientes=pendientes,
            enviados=enviados,
            fallidos=fallidos,
            canales_vivos=vivos,
            canales_degradados=degradados,
            simulados=conteo_estados.get("simulado", 0),
            worker_ultimo_latido=ultimo,
            antiguedad_pendiente_segundos=max(0, (ahora - mas_viejo).total_seconds()) if mas_viejo else None,
            motivos=tuple(motivos),
        )

    @staticmethod
    def _mapear_mensaje_modelo(reg: SMMensajeRegistro) -> SMMensaje:
        return SMMensaje(
            id=reg.id,
            tenant=reg.tenant,
            evento_id=reg.evento_id,
            canal=SMCanal(reg.canal),
            actor=reg.actor,
            contacto_hash=reg.contacto_hash,
            plantilla=reg.plantilla,
            asunto=reg.asunto,
            cuerpo=reg.cuerpo,
            estado=SMEstadoMensaje(reg.estado),
            idempotencia=reg.idempotencia,
            metadatos={str(k): str(v) for k, v in reg.metadatos.items()} if reg.metadatos else {},
            creado_en=reg.creado_en if isinstance(reg.creado_en, datetime) else datetime.now(UTC),
            actualizado_en=reg.actualizado_en if isinstance(reg.actualizado_en, datetime) else datetime.now(UTC),
            proximo_intento_en=reg.proximo_intento_en if isinstance(reg.proximo_intento_en, datetime) else None,
        )
