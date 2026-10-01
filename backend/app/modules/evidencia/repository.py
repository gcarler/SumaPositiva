import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.evidencia.models import EvidenciaMultimedia


class EvidenciaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def guardar_evidencia(self, evidencia: EvidenciaMultimedia) -> EvidenciaMultimedia:
        self.session.add(evidencia)
        await self.session.flush()
        await self.session.refresh(evidencia)
        return evidencia

    async def obtener_por_id(self, evidencia_id: uuid.UUID) -> EvidenciaMultimedia | None:
        stmt = select(EvidenciaMultimedia).where(EvidenciaMultimedia.id == evidencia_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def listar_por_propuesta(self, propuesta_id: uuid.UUID) -> list[EvidenciaMultimedia]:
        stmt = (
            select(EvidenciaMultimedia)
            .where(EvidenciaMultimedia.propuesta_id == propuesta_id)
            .order_by(EvidenciaMultimedia.creado_en.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
