"""Persistencia de líneas estratégicas; sin confirmaciones de transacción."""

import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.politicas.models import DimensionSeguridadHumana, FasePolitica, LineaEstrategica


class LineaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def obtener(self, id: uuid.UUID):
        return await self.session.scalar(
            select(LineaEstrategica)
            .where(LineaEstrategica.id == id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )

    async def fase(self, id: uuid.UUID):
        return await self.session.scalar(
            select(FasePolitica).where(FasePolitica.id == id).with_for_update()
        )

    async def dimension(self, id: uuid.UUID):
        return await self.session.get(DimensionSeguridadHumana, id)

    async def duplicado(self, fase_id, codigo, excluir=None):
        stmt = select(LineaEstrategica.id).where(
            LineaEstrategica.fase_id == fase_id, LineaEstrategica.codigo == codigo
        )
        if excluir:
            stmt = stmt.where(LineaEstrategica.id != excluir)
        return await self.session.scalar(stmt.limit(1))

    async def referencias(self, id):
        # Incluye también relaciones SET NULL: eliminar no debe desvincular expedientes.
        return await self.session.scalar(
            text("""
            SELECT EXISTS (
                SELECT 1 FROM participacion_ciudadana.propuestas_ciudadanas WHERE linea_id=:id
                UNION ALL SELECT 1 FROM mesas_trabajo.mesas WHERE linea_id=:id
                UNION ALL SELECT 1 FROM motor_instrumentos.instrumentos WHERE linea_id=:id
                UNION ALL SELECT 1 FROM indicadores.fichas_tecnicas_indicadores
                    WHERE linea_estrategica_id=:id
                UNION ALL SELECT 1 FROM presupuesto.asignaciones_presupuestales
                    WHERE linea_estrategica_id=:id
            )
        """),
            {"id": id},
        )

    async def guardar(self, linea):
        self.session.add(linea)
        await self.session.flush()
        await self.session.refresh(linea)
        return linea

    async def eliminar(self, linea):
        await self.session.delete(linea)
        await self.session.flush()
