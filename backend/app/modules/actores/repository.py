import uuid
from collections.abc import Sequence

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.actores.models import ActorEstrategico


class ActoresRepository:
    """Repositorio asíncrono para actores estratégicos (AUD-14)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar(
        self,
        tipo: str | None = None,
        territorio: str | None = None,
        es_demostracion: bool | None = None,
        buscar: str | None = None,
    ) -> Sequence[ActorEstrategico]:
        stmt = select(ActorEstrategico).order_by(ActorEstrategico.codigo.asc())

        if tipo:
            stmt = stmt.where(ActorEstrategico.tipo == tipo)
        if territorio:
            stmt = stmt.where(ActorEstrategico.territorio == territorio)
        if es_demostracion is not None:
            stmt = stmt.where(ActorEstrategico.es_demostracion == es_demostracion)
        if buscar:
            termino = f"%{buscar.strip()}%"
            stmt = stmt.where(
                or_(
                    ActorEstrategico.codigo.ilike(termino),
                    ActorEstrategico.nombre.ilike(termino),
                    ActorEstrategico.expectativas_principales.ilike(termino),
                )
            )

        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def obtener_por_id(self, actor_id: uuid.UUID) -> ActorEstrategico | None:
        stmt = select(ActorEstrategico).where(ActorEstrategico.id == actor_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def obtener_por_codigo(self, codigo: str) -> ActorEstrategico | None:
        stmt = select(ActorEstrategico).where(ActorEstrategico.codigo == codigo)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def crear(self, actor: ActorEstrategico) -> ActorEstrategico:
        self.session.add(actor)
        await self.session.flush()
        await self.session.refresh(actor)
        return actor

    async def eliminar(self, actor_id: uuid.UUID) -> bool:
        stmt = delete(ActorEstrategico).where(ActorEstrategico.id == actor_id)
        result = await self.session.execute(stmt)
        await self.session.flush()
        return (result.rowcount or 0) > 0

    async def contar(self) -> int:
        stmt = select(func.count(ActorEstrategico.id))
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0
