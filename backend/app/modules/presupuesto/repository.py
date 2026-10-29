import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.presupuesto.models import AsignacionPresupuestal, FuenteFinanciacion


class PresupuestoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_fuentes(self) -> Sequence[FuenteFinanciacion]:
        res = await self.session.execute(select(FuenteFinanciacion))
        return res.scalars().all()

    async def obtener_fuente(self, id: uuid.UUID) -> FuenteFinanciacion | None:
        res = await self.session.execute(select(FuenteFinanciacion).where(FuenteFinanciacion.id == id))
        return res.scalar_one_or_none()

    async def crear_asignacion(self, asignacion: AsignacionPresupuestal) -> AsignacionPresupuestal:
        self.session.add(asignacion)
        await self.session.flush()
        await self.session.refresh(asignacion)
        return asignacion

    async def listar_asignaciones(self) -> Sequence[AsignacionPresupuestal]:
        res = await self.session.execute(select(AsignacionPresupuestal))
        return res.scalars().all()

    async def obtener_resumen_costeo(self) -> dict:
        total_res = await self.session.execute(select(func.sum(AsignacionPresupuestal.monto_estimado)))
        total = total_res.scalar() or 0

        fuentes_res = await self.session.execute(
            select(FuenteFinanciacion.nombre, func.sum(AsignacionPresupuestal.monto_estimado))
            .join(
                AsignacionPresupuestal,
                FuenteFinanciacion.id == AsignacionPresupuestal.fuente_financiacion_id,
            )
            .group_by(FuenteFinanciacion.nombre)
        )
        por_fuente = [{"fuente": f, "total": float(m)} for f, m in fuentes_res.all()]

        vigencias_res = await self.session.execute(
            select(
                AsignacionPresupuestal.anio_vigencia,
                func.sum(AsignacionPresupuestal.monto_estimado),
            ).group_by(AsignacionPresupuestal.anio_vigencia)
        )
        por_vigencia = [{"vigencia": v, "total": float(m)} for v, m in vigencias_res.all()]

        return {
            "total_asignado": float(total),
            "por_fuente": por_fuente,
            "por_vigencia": por_vigencia,
        }
