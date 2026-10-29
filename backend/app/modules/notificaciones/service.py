"""Servicio de lógica de negocio para notificaciones transaccionales y fe pública de radicación."""

import logging
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
