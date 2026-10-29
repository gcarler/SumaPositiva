import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.comunicaciones.models import TareaComunicacion


class ComunicacionesRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar(
        self,
        *,
        etapa: str | None = None,
        estado: str | None = None,
    ) -> Sequence[TareaComunicacion]:
        query = select(TareaComunicacion).order_by(
            TareaComunicacion.fecha_inicio.asc(),
            TareaComunicacion.orden.asc(),
            TareaComunicacion.codigo.asc(),
        )
        if etapa:
            query = query.where(TareaComunicacion.etapa == etapa)
        if estado:
            query = query.where(TareaComunicacion.estado == estado)

        result = await self.session.execute(query)
        return result.scalars().all()

    async def obtener_por_id(self, id: uuid.UUID) -> TareaComunicacion | None:
        query = select(TareaComunicacion).where(TareaComunicacion.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def obtener_por_codigo(self, codigo: str) -> TareaComunicacion | None:
        query = select(TareaComunicacion).where(TareaComunicacion.codigo == codigo)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def guardar(self, tarea: TareaComunicacion) -> TareaComunicacion:
        self.session.add(tarea)
        await self.session.flush()
        await self.session.refresh(tarea)
        return tarea

    async def eliminar(self, tarea: TareaComunicacion) -> None:
        await self.session.delete(tarea)
        await self.session.flush()
