import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.evidencia.models import EvidenciaMultimedia, FotoMesa
from app.modules.geodatos.models import Territorio
from app.modules.mesas.models import Mesa


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

    async def guardar_foto_mesa(self, foto: FotoMesa) -> FotoMesa:
        self.session.add(foto)
        await self.session.flush()
        await self.session.refresh(foto)
        return foto

    async def foto_mesa_por_id(self, foto_id: uuid.UUID) -> FotoMesa | None:
        result = await self.session.execute(
            select(FotoMesa).where(FotoMesa.id == foto_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def listar_mesas_geovisor(self) -> list[tuple[Mesa, str | None, str | None, float | None, float | None, FotoMesa | None, EvidenciaMultimedia | None]]:
        stmt = (
            select(
                Mesa,
                Territorio.nombre,
                Territorio.codigo,
                func.ST_X(Territorio.centroide),
                func.ST_Y(Territorio.centroide),
                FotoMesa,
                EvidenciaMultimedia,
            )
            .outerjoin(Territorio, Mesa.territorio_id == Territorio.id)
            .outerjoin(
                FotoMesa,
                (FotoMesa.mesa_id == Mesa.id) & (FotoMesa.estado == "APROBADA"),
            )
            .outerjoin(EvidenciaMultimedia, FotoMesa.evidencia_id == EvidenciaMultimedia.id)
            .order_by(Mesa.fecha.desc().nullslast(), Mesa.nombre, FotoMesa.creado_en)
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def estado_foto_evidencia(self, evidencia_id: uuid.UUID) -> str | None:
        result = await self.session.execute(
            select(FotoMesa.estado).where(FotoMesa.evidencia_id == evidencia_id)
        )
        return result.scalar_one_or_none()

    async def foto_revision_con_archivo(self, foto_id: uuid.UUID) -> tuple[FotoMesa, EvidenciaMultimedia] | None:
        result = await self.session.execute(
            select(FotoMesa, EvidenciaMultimedia)
            .join(EvidenciaMultimedia, FotoMesa.evidencia_id == EvidenciaMultimedia.id)
            .where(FotoMesa.id == foto_id, FotoMesa.estado == "PENDIENTE")
        )
        return result.one_or_none()

    async def foto_mesa_con_evidencia(self, foto: FotoMesa) -> EvidenciaMultimedia:
        evidencia = await self.obtener_por_id(foto.evidencia_id)
        if evidencia is None:
            raise RuntimeError("Evidencia vinculada no encontrada")
        return evidencia

    async def listar_fotos_revision(self) -> list[tuple[FotoMesa, Mesa, EvidenciaMultimedia]]:
        stmt = (
            select(FotoMesa, Mesa, EvidenciaMultimedia)
            .join(Mesa, FotoMesa.mesa_id == Mesa.id)
            .join(EvidenciaMultimedia, FotoMesa.evidencia_id == EvidenciaMultimedia.id)
            .where(FotoMesa.estado == "PENDIENTE")
            .order_by(FotoMesa.creado_en)
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def listar_por_propuesta(self, propuesta_id: uuid.UUID) -> list[EvidenciaMultimedia]:
        stmt = (
            select(EvidenciaMultimedia)
            .where(EvidenciaMultimedia.propuesta_id == propuesta_id)
            .order_by(EvidenciaMultimedia.creado_en.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
