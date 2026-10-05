import re
import unicodedata
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.noticias.models import Noticia
from app.modules.noticias.repository import NoticiasRepository
from app.modules.noticias.schemas import NoticiaEntrada, NoticiaLectura


class NoticiasService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = NoticiasRepository(session)

    async def listar(self, *, publicadas: bool) -> list[NoticiaLectura]:
        async with transaction(self.session):
            return [
                NoticiaLectura.model_validate(n)
                for n in await self.repository.listar(publicadas=publicadas)
            ]

    async def obtener_publicada(self, slug: str) -> NoticiaLectura:
        async with transaction(self.session):
            noticia = await self.repository.obtener_publicada_por_slug(slug)
            if noticia is None:
                raise HTTPException(status_code=404, detail="Noticia no encontrada")
            return NoticiaLectura.model_validate(noticia)

    async def obtener_publicada_por_id(self, id: uuid.UUID) -> NoticiaLectura:
        async with transaction(self.session):
            noticia = await self.repository.obtener_publicada_por_id(id)
            if noticia is None:
                raise HTTPException(status_code=404, detail="Noticia no encontrada")
            return NoticiaLectura.model_validate(noticia)

    async def crear(self, datos: NoticiaEntrada) -> NoticiaLectura:
        async with transaction(self.session):
            slug = self._slug(datos.titulo)
            noticia = Noticia(slug=slug, **datos.model_dump())
            try:
                await self.repository.guardar(noticia)
            except IntegrityError as exc:
                raise HTTPException(
                    status_code=409, detail="Ya existe una noticia con ese slug"
                ) from exc
            return NoticiaLectura.model_validate(noticia)

    async def actualizar(self, id: uuid.UUID, datos: NoticiaEntrada) -> NoticiaLectura:
        async with transaction(self.session):
            noticia = await self.repository.obtener(id)
            if noticia is None:
                raise HTTPException(status_code=404, detail="Noticia no encontrada")
            estado_anterior = noticia.estado
            for campo, valor in datos.model_dump().items():
                setattr(noticia, campo, valor)
            if estado_anterior != "publicada" and datos.estado == "publicada":
                noticia.publicada_en = datetime.now(UTC)
            try:
                await self.repository.guardar(noticia)
            except IntegrityError as exc:
                raise HTTPException(
                    status_code=409, detail="Ya existe una noticia con ese slug"
                ) from exc
            return NoticiaLectura.model_validate(noticia)

    async def eliminar(self, id: uuid.UUID) -> None:
        async with transaction(self.session):
            noticia = await self.repository.obtener(id)
            if noticia is None:
                raise HTTPException(status_code=404, detail="Noticia no encontrada")
            await self.repository.eliminar(noticia)

    async def obtener_gestion(self, id: uuid.UUID) -> NoticiaLectura:
        async with transaction(self.session):
            noticia = await self.repository.obtener(id)
            if noticia is None:
                raise HTTPException(status_code=404, detail="Noticia no encontrada")
            return NoticiaLectura.model_validate(noticia)

    @staticmethod
    def _slug(titulo: str) -> str:
        normalizado = unicodedata.normalize("NFD", titulo)
        slug = re.sub(
            r"[^a-z0-9]+",
            "-",
            "".join(c for c in normalizado if unicodedata.category(c) != "Mn").lower(),
        ).strip("-")
        return f"{slug[:240]}-{uuid.uuid4().hex[:8]}"
