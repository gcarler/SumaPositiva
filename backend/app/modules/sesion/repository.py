"""Repositorio asíncrono para sesiones anónimas y control de trazabilidad."""

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sesion.models import SesionAnonima


class SesionRepository:
    """Acceso a datos para sesiones ciudadanas en participacion_ciudadana."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def registrar_sesion(
        self,
        sesion_id: uuid.UUID,
        huella_hash: str,
        expira_en: datetime,
        metadatos: dict | None = None,
    ) -> SesionAnonima:
        """Persiste la sesión emitida para auditoría forense."""
        registro = SesionAnonima(
            id=sesion_id,
            huella_hash=huella_hash,
            expira_en=expira_en,
            metadatos=metadatos or {},
        )
        self.session.add(registro)
        await self.session.flush()
        await self.session.refresh(registro)
        return registro

    async def obtener_por_id(self, sesion_id: uuid.UUID) -> SesionAnonima | None:
        """Busca una sesión por su identificador UUIDv7."""
        query = select(SesionAnonima).where(SesionAnonima.id == sesion_id)
        resultado = await self.session.execute(query)
        return resultado.scalar_one_or_none()
