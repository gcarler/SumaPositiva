"""Servicio de lógica de negocio para notificaciones transaccionales y fe pública de radicación."""

import logging
import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as insert_pg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.aportes.models import PropuestaCiudadana
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.plantillas_eventos import (
    generar_html_actividad_apoyo,
    generar_html_constancia_actualizacion_propuesta,
    generar_html_gestion_institucional,
    generar_html_recuperacion_contrasena,
    generar_html_resumen_diario,
    generar_html_seguridad_perfil,
)
from app.modules.notificaciones.plantillas_stack import (
    generar_html_cambio_estado,
    generar_html_constancia_radicacion,
    generar_html_verificacion_correo,
)
from app.modules.notificaciones.schemas import ConsultaRadicadoRespuesta

logger = logging.getLogger("polis.notificaciones.service")


class NotificacionService:
    """Gestión integral de radicados, constancias y notificaciones al ciudadano."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or Settings()

    async def enviar_constancia_radicacion(
        self,
        destinatario: str,
        radicado: str,
        titulo: str,
        descripcion: str,
        autor: str,
        *,
        dimension: str | None = None,
        entidad: str | None = None,
        politica: str | None = None,
    ) -> NotificacionTransaccional:
        """Persiste la constancia oficial en la transacción activa del llamador."""
        url_base = self.settings.identidad_url_publica.rstrip("/")
        enlace_aporte = f"{url_base}/aportes/{radicado}"

        asunto = f"Constancia oficial de radicación {radicado} - POLIS"
        cuerpo_html = generar_html_constancia_radicacion(
            radicado=radicado,
            titulo=titulo,
            descripcion=descripcion,
            autor=autor,
            dimension=dimension or "Participación ciudadana",
            enlace_verificacion=enlace_aporte,
            entidad=entidad or "Alcaldía Mayor de Cartagena de Indias",
            politica=politica,
        )

        notificacion = NotificacionTransaccional(
            codigo_radicado=radicado,
            destinatario_correo=destinatario,
            tipo_evento="radicacion",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            estado_envio="pendiente",
        )
        self.session.add(notificacion)
        await self.session.flush()
        await self.session.refresh(notificacion)
        await self._sincronizar_sm(notificacion)
        return notificacion

    async def enviar_notificacion_cambio_estado(
        self,
        destinatario: str,
        radicado: str,
        titulo: str,
        nuevo_estado: str,
        observaciones: str = "",
        *,
        autor: str = "Ciudadano participante",
    ) -> NotificacionTransaccional:
        """Persiste el aviso de cambio de estado en el outbox de la transacción."""
        url_base = self.settings.identidad_url_publica.rstrip("/")
        enlace_aporte = f"{url_base}/aportes/{radicado}"

        asunto = f"POLIS: Actualización en el estado de su radicado {radicado}"
        cuerpo_html = generar_html_cambio_estado(
            radicado=radicado,
            titulo=titulo,
            autor=autor,
            nuevo_estado=nuevo_estado,
            descripcion_estado=(observaciones or "Su propuesta ha avanzado en la ruta de tramitación institucional."),
            enlace_seguimiento=enlace_aporte,
        )

        notificacion = NotificacionTransaccional(
            codigo_radicado=radicado,
            destinatario_correo=destinatario,
            tipo_evento="cambio_estado" if nuevo_estado != "incorporado" else "priorizacion",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            estado_envio="pendiente",
        )
        self.session.add(notificacion)
        await self.session.flush()
        await self.session.refresh(notificacion)
        await self._sincronizar_sm(notificacion)
        return notificacion

    async def _encolar(
        self,
        *,
        destinatario: str,
        tipo_evento: str,
        asunto: str,
        cuerpo_html: str,
        codigo_radicado: str,
    ) -> NotificacionTransaccional:
        """Persiste la intención dentro de la transacción del llamador (patrón outbox)."""
        notificacion = NotificacionTransaccional(
            codigo_radicado=codigo_radicado,
            destinatario_correo=destinatario,
            tipo_evento=tipo_evento,
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            estado_envio="pendiente",
        )
        self.session.add(notificacion)
        await self.session.flush()
        await self.session.refresh(notificacion)
        await self._sincronizar_sm(notificacion)
        return notificacion

    async def _sincronizar_sm(self, notificacion: NotificacionTransaccional) -> None:
        """Sombra o corte real por tipo, dentro de la transacción del caso de uso.

        Si el puente no acepta la notificación (sin cuenta activa o sin
        consentimiento SM), la fila sigue ``pendiente`` y Herald la envía: el
        corte nunca pierde un correo. Solo cuando SM encoló el mensaje se marca
        ``delegado`` y el worker de Herald deja de reclamarla.
        """
        tipo = notificacion.tipo_evento
        if tipo not in self.settings.sm_eventos_dominio:
            return
        from app.modules.sm.bridge import SMBridge

        mensaje = await SMBridge(settings=self.settings).sincronizar_notificacion(self.session, notificacion)
        if mensaje is None or tipo not in self.settings.sm_corte_tipos:
            return
        notificacion.estado_envio = "delegado"
        await self.session.flush()

    async def enviar_bienvenida_registro(
        self,
        destinatario: str,
        nombre: str,
        enlace_verificacion: str,
        minutos: int,
    ) -> NotificacionTransaccional:
        """Flujo 1: bienvenida institucional con enlace de verificación de uso único.

        Se persiste junto al alta del usuario: si el rollback la cancela, nunca se
        recibe una invitación a una cuenta inexistente.
        """
        asunto = "POLIS: Activa tu cuenta y verifica tu correo electrónico"
        cuerpo_html = generar_html_verificacion_correo(
            nombre=nombre,
            enlace_verificacion=enlace_verificacion,
            minutos_expiracion=minutos,
            aviso_spam=True,
        )
        return await self._encolar(
            destinatario=destinatario,
            tipo_evento="registro_bienvenida",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            codigo_radicado=f"BIENVENIDA-{uuid.uuid4().hex[:12].upper()}",
        )

    async def enviar_recuperacion_contrasena(
        self,
        destinatario: str,
        enlace_restablecer: str,
        minutos: int,
        nombre_destinatario: str | None = None,
    ) -> NotificacionTransaccional:
        """Flujo 2: solicitud de restablecimiento con enlace de uso único caducable."""
        asunto = "POLIS: Restablecer su contraseña"
        cuerpo_html = generar_html_recuperacion_contrasena(
            enlace_restablecer=enlace_restablecer,
            minutos=minutos,
            nombre_destinatario=nombre_destinatario,
        )
        return await self._encolar(
            destinatario=destinatario,
            tipo_evento="recuperacion_contrasena",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            codigo_radicado=f"RECUPERACION-{uuid.uuid4().hex[:12].upper()}",
        )

    async def enviar_aviso_nuevo_apoyo_autor(
        self,
        correo_autor: str,
        radicado: str,
        titulo: str,
        apoyos_totales: int,
        enlace_seguimiento: str,
    ) -> NotificacionTransaccional:
        """Flujo 4a: notifica al autor que su propuesta recibió un respaldo ciudadano."""
        asunto = f"POLIS: Su propuesta {radicado} recibió un nuevo respaldo ciudadano"
        cuerpo_html = generar_html_actividad_apoyo(
            rol_destinatario="autor",
            radicado=radicado,
            titulo=titulo,
            apoyos_totales=apoyos_totales,
            enlace_seguimiento=enlace_seguimiento,
        )
        return await self._encolar(
            destinatario=correo_autor,
            tipo_evento="apoyo_propuesta",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            codigo_radicado=radicado,
        )

    async def enviar_constancia_actividad_apoyo(
        self,
        correo_participante: str,
        radicado: str,
        titulo: str,
        apoyos_totales: int,
        enlace_seguimiento: str,
        *,
        nombre_participante: str | None = None,
        dimension_titulo: str | None = None,
        enlace_actividades: str | None = None,
    ) -> NotificacionTransaccional:
        """Flujo 4b: constancia de respaldo y resumen de actividad del participante."""
        asunto = f"POLIS: Constancia de su respaldo a la propuesta {radicado}"
        cuerpo_html = generar_html_actividad_apoyo(
            rol_destinatario="participante",
            radicado=radicado,
            titulo=titulo,
            apoyos_totales=apoyos_totales,
            enlace_seguimiento=enlace_seguimiento,
            nombre_destinatario=nombre_participante,
            dimension_titulo=dimension_titulo,
            enlace_actividades=enlace_actividades,
        )
        return await self._encolar(
            destinatario=correo_participante,
            tipo_evento="actividad_ciudadana",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            codigo_radicado=radicado,
        )

    def _enlace_panel(self) -> str:
        return f"{self.settings.identidad_url_publica.rstrip('/')}/plataforma"

    async def enviar_aviso_seguridad_perfil(
        self,
        destinatario: str,
        nombre: str,
        accion: str,
        campos: Sequence[str],
        *,
        evento: str = "perfil_actualizado",
    ) -> NotificacionTransaccional:
        """Herald Fase 2 (externo): aviso de seguridad de perfil o contraseña.

        Se persiste dentro de la transacción del caso de uso: si la edición se
        revierte, nunca llega un aviso de una modificación que no ocurrió.
        """
        cuerpo_html = generar_html_seguridad_perfil(
            nombre=nombre,
            accion=accion,
            campos=list(campos),
            enlace_panel=self._enlace_panel(),
        )
        return await self._encolar(
            destinatario=destinatario,
            tipo_evento=evento,
            asunto=f"POLIS: {accion}"[:250],
            cuerpo_html=cuerpo_html,
            codigo_radicado=f"SEGURIDAD-{uuid.uuid4().hex[:12].upper()}",
        )

    async def enviar_comprobante_gestion_interna(
        self,
        destinatario: str,
        nombre_actor: str,
        rol: str,
        accion: str,
        detalle_accion: str,
        pendientes: Sequence[str] | None = None,
        enlace_panel: str | None = None,
    ) -> NotificacionTransaccional:
        """Herald Fase 2 (interno): comprobante de la acción ejecutada por el funcionario."""
        cuerpo_html = generar_html_gestion_institucional(
            nombre_funcionario=nombre_actor,
            rol=rol,
            accion=accion,
            detalle_accion=detalle_accion,
            pendientes_asociados=list(pendientes or []),
            enlace_panel=enlace_panel or self._enlace_panel(),
        )
        return await self._encolar(
            destinatario=destinatario,
            tipo_evento="gestion_institucional",
            asunto=f"POLIS: Comprobante de gestión - {accion}"[:250],
            cuerpo_html=cuerpo_html,
            codigo_radicado=f"GESTION-{uuid.uuid4().hex[:12].upper()}",
        )

    async def enviar_alerta_pendientes(
        self,
        destinatario: str,
        nombre_destinatario: str,
        accion: str,
        detalle: str,
        pendientes: Sequence[str],
        *,
        rol: str = "Facilitación de mesa",
        enlace_panel: str | None = None,
    ) -> NotificacionTransaccional:
        """Herald Fase 2 (interno): pendientes que exigen concepto o validación a término legal."""
        cuerpo_html = generar_html_gestion_institucional(
            nombre_funcionario=nombre_destinatario,
            rol=rol,
            accion=accion,
            detalle_accion=detalle,
            pendientes_asociados=list(pendientes),
            enlace_panel=enlace_panel or self._enlace_panel(),
        )
        return await self._encolar(
            destinatario=destinatario,
            tipo_evento="alerta_pendientes",
            asunto=f"POLIS: Pendientes institucionales - {accion}"[:250],
            cuerpo_html=cuerpo_html,
            codigo_radicado=f"PENDIENTES-{uuid.uuid4().hex[:12].upper()}",
        )

    async def enviar_constancia_actualizacion_propuesta(
        self,
        destinatario: str,
        radicado: str,
        titulo: str,
        campos_modificados: Sequence[str],
        enlace_seguimiento: str,
    ) -> NotificacionTransaccional:
        """Herald Fase 2 (externo): constancia de edición de una propuesta radicada."""
        asunto = f"POLIS: Actualización de su propuesta {radicado}"[:250]
        cuerpo_html = generar_html_constancia_actualizacion_propuesta(
            radicado=radicado,
            titulo=titulo,
            campos_modificados=list(campos_modificados),
            enlace_seguimiento=enlace_seguimiento,
        )
        return await self._encolar(
            destinatario=destinatario,
            tipo_evento="propuesta_actualizada",
            asunto=asunto,
            cuerpo_html=cuerpo_html,
            codigo_radicado=radicado,
        )

    async def correo_de_actor(self, sujeto) -> tuple[str, str] | None:
        """(correo, nombre) del usuario autenticado; None para sesiones anónimas."""
        if sujeto is None or getattr(sujeto, "es_anonimo", True):
            return None
        from app.modules.identidad.models import Usuario

        resultado = await self.session.execute(select(Usuario).where(Usuario.id == sujeto.sujeto_id))
        usuario = resultado.scalar_one_or_none()
        if usuario is None or not usuario.activo:
            return None
        nombre = f"{usuario.nombres} {usuario.apellidos}".strip()
        return usuario.correo, nombre

    async def comprobante_para_sujeto(
        self,
        sujeto,
        *,
        accion: str,
        detalle_accion: str,
        pendientes: Sequence[str] | None = None,
        enlace_panel: str | None = None,
    ) -> NotificacionTransaccional | None:
        """Encola el comprobante de gestión para el funcionario; None si no hay destinatario."""
        destinatario = await self.correo_de_actor(sujeto)
        if destinatario is None:
            return None
        correo, nombre = destinatario
        return await self.enviar_comprobante_gestion_interna(
            destinatario=correo,
            nombre_actor=nombre,
            rol=getattr(sujeto, "rol", "institucional"),
            accion=accion,
            detalle_accion=detalle_accion,
            pendientes=pendientes,
            enlace_panel=enlace_panel,
        )

    async def consultar_por_radicado(self, codigo_radicado: str) -> ConsultaRadicadoRespuesta:
        """Permite a cualquier ciudadano verificar el estado de su propuesta mediante su radicado."""
        stmt = (
            select(PropuestaCiudadana)
            .options(selectinload(PropuestaCiudadana.territorio))
            .where(
                PropuestaCiudadana.codigo_radicado == codigo_radicado.strip().upper(),
                PropuestaCiudadana.activo.is_(True),
            )
        )
        resultado = await self.session.execute(stmt)
        propuesta = resultado.scalar_one_or_none()

        if not propuesta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró ninguna propuesta activa con radicado {codigo_radicado}",
            )

        return ConsultaRadicadoRespuesta(
            id=propuesta.id,
            codigo_radicado=propuesta.codigo_radicado,
            titulo=propuesta.titulo,
            descripcion=propuesta.descripcion,
            tipo_aporte=propuesta.tipo_aporte,
            autor_nombre=propuesta.autor_nombre,
            estado=propuesta.estado,
            territorio_nombre=propuesta.territorio_nombre,
            creado_en=propuesta.creado_en,
            actualizado_en=propuesta.actualizado_en,
        )

    async def listar_historial(
        self,
        limite: int = 50,
        desplazamiento: int = 0,
        codigo_radicado: str | None = None,
        tipo_evento: str | None = None,
        estado_envio: str | None = None,
    ) -> tuple[int, Sequence[NotificacionTransaccional]]:
        """Listado de notificaciones para auditoría forense y control institucional."""
        condiciones = []
        if codigo_radicado:
            condiciones.append(NotificacionTransaccional.codigo_radicado == codigo_radicado.strip().upper())
        if tipo_evento:
            condiciones.append(NotificacionTransaccional.tipo_evento == tipo_evento)
        if estado_envio:
            condiciones.append(NotificacionTransaccional.estado_envio == estado_envio)

        conteo_query = select(func.count(NotificacionTransaccional.id))
        if condiciones:
            conteo_query = conteo_query.where(*condiciones)
        total_res = await self.session.execute(conteo_query)
        total = total_res.scalar_one()

        query = (
            select(NotificacionTransaccional)
            .order_by(NotificacionTransaccional.creado_en.desc())
            .limit(limite)
            .offset(desplazamiento)
        )
        if condiciones:
            query = query.where(*condiciones)

        resultado = await self.session.execute(query)
        elementos = resultado.scalars().all()
        return total, elementos

    async def reintentar_manual(self, notificacion_id: uuid.UUID, sujeto) -> NotificacionTransaccional:
        """Herald Fase 3: reintento manual de una notificación agotada, auditado.

        Solo filas 'fallido' con ``intentos >= MAX_INTENTOS`` (el worker no las
        vuelve a tomar solo). Devuelve la fila a 'pendiente' con contador limpio.
        """
        from app.modules.auditoria.models import RegistroAuditoria
        from app.modules.notificaciones.worker import MAX_INTENTOS

        async with transaction(self.session):
            resultado = await self.session.execute(
                select(NotificacionTransaccional)
                .where(NotificacionTransaccional.id == notificacion_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
            registro = resultado.scalar_one_or_none()
            if registro is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No existe una notificación con ese identificador",
                )
            if registro.estado_envio != "fallido" or registro.intentos < MAX_INTENTOS:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Solo se puede reintentar manualmente una notificación 'fallido' con "
                        f"{MAX_INTENTOS} o más intentos (estado actual: {registro.estado_envio}, "
                        f"intentos: {registro.intentos})."
                    ),
                )

            intentos_previos = registro.intentos
            registro.estado_envio = "pendiente"
            registro.intentos = 0
            registro.proximo_intento_en = None
            registro.error_detalle = None
            await self.session.flush()

            auditoria = RegistroAuditoria(
                tabla_afectada="participacion_ciudadana.notificaciones_transaccionales",
                registro_id=registro.id,
                accion="REINTENTO_MANUAL_HERALD",
                usuario_id=getattr(sujeto, "sujeto_id", None),
                causal="tecnica",
                justificacion_motivada=(
                    f"Reintento manual de notificación agotada ({intentos_previos} intentos previos) "
                    f"para {registro.destinatario_correo}"
                ),
                metadatos={
                    "notificacion_id": str(registro.id),
                    "tipo_evento": registro.tipo_evento,
                    "intentos_previos": intentos_previos,
                },
            )
            self.session.add(auditoria)
            await self.session.flush()
            await self.session.refresh(registro)
            return registro

    async def enviar_resumen_diario(
        self,
        *,
        destinatario: str,
        nombre_funcionario: str,
        fecha_iso: str,
        fecha_legible: str,
        acciones: Sequence[str],
        pendientes: Sequence[str],
        enlace_panel: str | None = None,
    ) -> NotificacionTransaccional | None:
        """Herald Fase 3: resumen diario consolidado de gestión y pendientes.

        Idempotente por diseño: ``codigo_radicado = RESUMEN-{fecha}`` contra el
        índice único parcial ``(destinatario_correo, codigo_radicado)`` con
        ``ON CONFLICT DO NOTHING``. Ante corridas concurrentes el índice gana:
        la perdedora no inserta y devuelve None en lugar de explotar con una
        IntegrityError (remediación del hallazgo D-2 del dictamen EAF 275).
        """
        codigo = f"RESUMEN-{fecha_iso}"
        cuerpo_html = generar_html_resumen_diario(
            nombre_funcionario=nombre_funcionario,
            fecha_legible=fecha_legible,
            acciones=list(acciones),
            pendientes=list(pendientes),
            enlace_panel=enlace_panel or self._enlace_panel(),
        )
        asunto = (f"POLIS: Resumen del día {fecha_legible} — {len(acciones)} acciones, {len(pendientes)} pendientes")[
            :250
        ]
        sentencia = (
            insert_pg(NotificacionTransaccional)
            .values(
                codigo_radicado=codigo,
                destinatario_correo=destinatario,
                tipo_evento="resumen_diario",
                asunto=asunto,
                cuerpo_html=cuerpo_html,
                estado_envio="pendiente",
            )
            .on_conflict_do_nothing(
                index_elements=["destinatario_correo", "codigo_radicado"],
                index_where=text("tipo_evento = 'resumen_diario'"),
            )
            .returning(NotificacionTransaccional.id)
        )
        id_nueva = (await self.session.execute(sentencia)).scalar_one_or_none()
        if id_nueva is None:
            return None
        return await self.session.get(NotificacionTransaccional, id_nueva)
