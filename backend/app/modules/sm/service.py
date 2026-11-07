"""Servicio portátil SM: evento -> mensaje -> entrega -> auditoría."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
from uuid import UUID

from .channels import SMCanalBase, SMCorreoAdapter, SMSMSAdapter, SMTelegramAdapter, SMWebhookAdapter, SMWhatsAppAdapter
from .contracts import (
    SMAuditoria,
    SMCanal,
    SMConsentimiento,
    SMContacto,
    SMEntrega,
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
    hash_contacto,
    hash_traza,
    mensaje_desde_evento,
    transicion_estado,
)

ADAPTADORES_BASE: dict[SMCanal, type[SMCanalBase]] = {
    SMCanal.CORREO: SMCorreoAdapter,
    SMCanal.WHATSAPP: SMWhatsAppAdapter,
    SMCanal.TELEGRAM: SMTelegramAdapter,
    SMCanal.WEBHOOK: SMWebhookAdapter,
    SMCanal.SMS: SMSMSAdapter,
}

CLAVE_CONSENTIMIENTO = tuple[str, str, str, str]
CLAVE_IDEMPOTENCIA = tuple[str, str]


class SMCoreService:
    """Núcleo portable de trazabilidad transaccional multicanal.

    Está desacoplado de cualquier ORM y puede reutilizarse como librería en otro
    software, siempre que ese software use los mismos contratos de evento y canal.
    """

    def __init__(
        self,
        *,
        tenant: str = "polis",
        canales: Mapping[SMCanal, type[SMCanalBase]] | None = None,
    ) -> None:
        self._tenant = tenant
        self._canales = dict(canales or ADAPTADORES_BASE)
        self._consentimientos: dict[CLAVE_CONSENTIMIENTO, SMConsentimiento] = {}
        self._eventos: dict[UUID, SMEvento] = {}
        self._mensajes: dict[UUID, SMMensaje] = {}
        self._entregas: list[SMEntrega] = []
        self._auditorias: list[SMAuditoria] = []
        self._idempotencias: dict[CLAVE_IDEMPOTENCIA, UUID] = {}

    def _canal(self, canal: SMCanal) -> SMCanalBase:
        if canal not in self._canales:
            raise SMCanalesNoAutorizados(f"Canal {canal.value} no autorizado por el núcleo")
        return self._canales[canal]()

    async def registrar_consentimiento(
        self,
        *,
        actor: str,
        canal: SMCanal,
        contacto: str,
        consentido: bool,
    ) -> SMConsentimiento:
        """Registra o actualiza consentimiento por contacto hash. Nunca guarda contacto crudo."""
        contacto_hash = hash_contacto(
            tenant=self._tenant,
            actor=actor,
            canal=canal.value,
            identificador=contacto,
        )
        clave = (self._tenant, actor, canal.value, contacto_hash)
        registro = self._consentimientos.get(clave)
        if registro:
            registro.estado = SMEstadoConsentimiento.OTORGADO if consentido else SMEstadoConsentimiento.REVOCADO
            registro.actualizado_en = datetime.now(UTC)
        else:
            registro = SMConsentimiento(
                tenant=self._tenant,
                actor=actor,
                canal=canal,
                contacto_hash=contacto_hash,
                estado=SMEstadoConsentimiento.OTORGADO if consentido else SMEstadoConsentimiento.REVOCADO,
            )
            self._consentimientos[clave] = registro

        self._auditar(
            actor=actor,
            accion="consentimiento.registrado",
            evento_id=registro.id,
            mensaje_id=None,
            payload={"canal": canal.value, "estado": registro.estado.value},
        )
        return registro

    async def procesar_evento(self, evento: SMEvento) -> SMMensaje:
        """Convierte evento en mensaje outbox y deja auditoría forense."""
        if evento.tenant != self._tenant:
            raise SMIdempotenciaConflict(" tenant del evento no corresponde al núcleo")

        clave_idempotencia = (evento.tenant, evento.idempotencia)
        existing = self._idempotencias.get(clave_idempotencia)
        if existing:
            if existing != evento.id:
                raise SMIdempotenciaConflict("idempotencia repetida con datos distintos")
        else:
            self._idempotencias[clave_idempotencia] = evento.id

        contacto_hash = hash_contacto(
            tenant=evento.tenant,
            actor=evento.actor,
            canal=evento.canal.value,
            identificador=evento.contacto.identificador,
        )
        if evento.contacto.canal != evento.canal:
            raise SMConsentimientoFaltante("canal del contacto y evento deben coincidir")
        consentimiento = self._consentimientos.get((evento.tenant, evento.actor, evento.canal.value, contacto_hash))
        if not consentimiento or consentimiento.estado != SMEstadoConsentimiento.OTORGADO:
            raise SMConsentimientoFaltante(f"Consentimiento ausente para canal {evento.canal.value}")

        mensaje = mensaje_desde_evento(evento=evento, contacto_hash=contacto_hash)
        self._eventos[evento.id] = evento
        self._mensajes[mensaje.id] = mensaje
        self._auditar(
            actor=evento.actor,
            accion="evento.registrado",
            evento_id=evento.id,
            mensaje_id=mensaje.id,
            payload={"mensaje": mensaje.idempotencia, "estado": mensaje.estado.value},
        )
        return mensaje

    async def despachar_mensaje(
        self,
        mensaje_id: UUID,
        *,
        contacto: SMContacto,
    ) -> SMResultadoEntrega:
        """Adapta el mensaje al canal autorizado y registra intento de entrega."""
        mensaje = self._mensajes.get(mensaje_id)
        if not mensaje:
            raise SMError(f"Mensaje {mensaje_id} no existe")
        if mensaje.canal != contacto.canal or mensaje.actor != contacto.actor:
            raise SMError("Contacto no corresponde al mensaje")

        canal = self._canal(mensaje.canal)
        entrega = canal.construir(mensaje=mensaje, contacto=contacto)

        intento = sum(1 for e in self._entregas if e.mensaje_id == mensaje.id) + 1
        entrega.intento = intento
        self._entregas.append(
            SMEntrega(
                tenant=mensaje.tenant,
                mensaje_id=mensaje.id,
                canal=mensaje.canal,
                intento=intento,
                estado_entrega=entrega.estado_entrega,
                externo_id=entrega.externo_id,
                detalle=entrega.detalle,
                payload=entrega.payload,
            )
        )
        mensaje.estado = transicion_estado(mensaje.estado, SMEstadoMensaje.ENVIADO)
        mensaje.actualizado_en = datetime.now(UTC)
        self._auditar(
            actor=mensaje.actor,
            accion="entrega.registrada",
            evento_id=mensaje.evento_id,
            mensaje_id=mensaje.id,
            payload={"estado": mensaje.estado.value, "intento": intento},
        )
        return entrega

    async def listar_mensajes(
        self,
        *,
        canal: SMCanal | None = None,
        estado: SMEstadoMensaje | None = None,
    ) -> tuple[SMMensaje, ...]:
        """Consulta portable del outbox."""
        mensajes = tuple(self._mensajes.values())
        if canal:
            mensajes = tuple(m for m in mensajes if m.canal == canal)
        if estado:
            mensajes = tuple(m for m in mensajes if m.estado == estado)
        return mensajes

    async def salud(self) -> SMSalud:
        """Salud agregada del outbox portable."""
        pendientes = sum(1 for m in self._mensajes.values() if m.estado == SMEstadoMensaje.PENDIENTE)
        enviados = sum(
            1 for m in self._mensajes.values() if m.estado in (SMEstadoMensaje.ENVIADO, SMEstadoMensaje.ENTREGADO)
        )
        fallidos = sum(
            1 for m in self._mensajes.values() if m.estado in (SMEstadoMensaje.FALLIDO, SMEstadoMensaje.AGOTADO)
        )
        canales = tuple(sorted({m.canal for m in self._mensajes.values()}))
        motivos: list[str] = []
        if self._canales and not self._mensajes:
            motivos.append("Núcleo sin mensajes: canales autorizados activos")
        estado = SMEstadoSalud.SALUDABLE
        if fallidos and not pendientes:
            estado = SMEstadoSalud.CRITICO
        elif pendientes and not enviados:
            estado = SMEstadoSalud.DEGRADADO
        return SMSalud(
            tenant=self._tenant,
            estado=estado,
            pendientes=pendientes,
            enviados=enviados,
            fallidos=fallidos,
            canales_vivos=canales,
            motivos=tuple(motivos),
        )

    async def auditorias(self) -> tuple[SMAuditoria, ...]:
        return tuple(self._auditorias)

    def _auditar(
        self,
        *,
        actor: str,
        accion: str,
        evento_id: UUID,
        mensaje_id: UUID | None,
        payload: dict[str, str],
    ) -> SMAuditoria:
        registro = SMAuditoria(
            tenant=self._tenant,
            evento_id=evento_id,
            mensaje_id=mensaje_id,
            actor=actor,
            accion=accion,
            hash=hash_traza(
                tenant=self._tenant,
                actor=actor,
                accion=accion,
                evento_id=str(evento_id),
                mensaje_id=str(mensaje_id) if mensaje_id else None,
                payload=payload,
            ),
        )
        self._auditorias.append(registro)
        return registro
