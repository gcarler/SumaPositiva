"""Servicio de lógica de negocio para notificaciones transaccionales y fe pública de radicación."""

import logging
import uuid
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.modules.aportes.models import PropuestaCiudadana
from app.modules.notificaciones.correo import (
    generar_html_cambio_estado,
    generar_html_constancia_radicacion,
)
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.plantillas_eventos import (
    generar_html_actividad_apoyo,
    generar_html_bienvenida_registro,
    generar_html_constancia_actualizacion_propuesta,
    generar_html_gestion_institucional,
    generar_html_recuperacion_contrasena,
    generar_html_seguridad_perfil,
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
    ) -> NotificacionTransaccional:
        """Persiste la intención dentro de la transacción del llamador, sin transporte."""
        url_base = self.settings.identidad_url_publica.rstrip("/")
        enlace_consulta = f"{url_base}/seguimiento?radicado={radicado}"

        asunto = f"POLIS: Constancia de Radicación {radicado} - Cartagena Ciudad de Derechos"
        cuerpo_html = generar_html_constancia_radicacion(
            radicado=radicado,
            titulo=titulo,
            descripcion=descripcion,
            autor=autor,
            enlace_consulta=enlace_consulta,
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
        return notificacion

    async def enviar_notificacion_cambio_estado(
        self,
        destinatario: str,
        radicado: str,
        titulo: str,
        nuevo_estado: str,
        observaciones: str = "",
    ) -> NotificacionTransaccional:
        """Persiste el aviso junto al cambio de estado; un worker entrega tras el commit."""
        url_base = self.settings.identidad_url_publica.rstrip("/")
        enlace_consulta = f"{url_base}/seguimiento?radicado={radicado}"

        asunto = f"POLIS: Actualización de propuesta {radicado} - {nuevo_estado.replace('_', ' ').capitalize()}"
        cuerpo_html = generar_html_cambio_estado(
            radicado=radicado,
            titulo=titulo,
            nuevo_estado=nuevo_estado,
            observaciones=observaciones or "Su propuesta ha avanzado en la ruta de tramitación institucional.",
            enlace_consulta=enlace_consulta,
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
        return notificacion

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
        asunto = "POLIS: Bienvenido(a) a la plataforma distrital - Verifique su cuenta"
        cuerpo_html = generar_html_bienvenida_registro(
            nombre=nombre,
            enlace_verificacion=enlace_verificacion,
            minutos=minutos,
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
    ) -> tuple[int, Sequence[NotificacionTransaccional]]:
        """Listado de notificaciones para auditoría forense y control institucional."""
        condiciones = []
        if codigo_radicado:
            condiciones.append(NotificacionTransaccional.codigo_radicado == codigo_radicado.strip().upper())
        if tipo_evento:
            condiciones.append(NotificacionTransaccional.tipo_evento == tipo_evento)

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
