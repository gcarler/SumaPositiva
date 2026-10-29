import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.noticias.models import Noticia


class NoticiasRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar(self, *, publicadas: bool) -> list[Noticia]:
        stmt = select(Noticia)
        if publicadas:
            stmt = stmt.where(Noticia.estado == "publicada")
        return list(
            (await self.session.execute(stmt.order_by(Noticia.orden_prioridad, Noticia.publicada_en.desc())))
            .scalars()
            .all()
        )

    async def obtener(self, id: uuid.UUID) -> Noticia | None:
        return await self.session.get(Noticia, id)

    async def obtener_publicada_por_slug(self, slug: str) -> Noticia | None:
        stmt = select(Noticia).where(Noticia.slug == slug, Noticia.estado == "publicada")
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def obtener_publicada_por_id(self, id: uuid.UUID) -> Noticia | None:
        stmt = select(Noticia).where(Noticia.id == id, Noticia.estado == "publicada")
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def obtener_por_slug(self, slug: str) -> Noticia | None:
        stmt = select(Noticia).where(Noticia.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def guardar(self, noticia: Noticia) -> Noticia:
        self.session.add(noticia)
        await self.session.flush()
        await self.session.refresh(noticia)
        return noticia

    async def eliminar(self, noticia: Noticia) -> None:
        await self.session.delete(noticia)
        await self.session.flush()
