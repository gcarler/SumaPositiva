import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.instrumentos.models import Instrumento, NodoInstrumento


class InstrumentoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def crear_instrumento(self, instrumento: Instrumento) -> Instrumento:
        self.session.add(instrumento)
        await self.session.flush()
        await self.session.refresh(instrumento)
        return instrumento

    async def obtener_instrumento(self, instrumento_id: uuid.UUID) -> Instrumento | None:
        stmt = select(Instrumento).where(Instrumento.id == instrumento_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def listar_instrumentos(
        self,
        mesa_id: uuid.UUID | None = None,
        tipo_instrumento: str | None = None,
        estado: str | None = None,
    ) -> Sequence[Instrumento]:
        stmt = select(Instrumento)
        if mesa_id:
            stmt = stmt.where(Instrumento.mesa_id == mesa_id)
        if tipo_instrumento:
            stmt = stmt.where(Instrumento.tipo_instrumento == tipo_instrumento)
        if estado:
            stmt = stmt.where(Instrumento.estado == estado)
        stmt = stmt.order_by(Instrumento.creado_en.desc())
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def actualizar_instrumento(self, instrumento: Instrumento) -> Instrumento:
        self.session.add(instrumento)
        await self.session.flush()
        await self.session.refresh(instrumento)
        return instrumento

    async def eliminar_instrumento(self, instrumento: Instrumento) -> None:
        await self.session.delete(instrumento)
        await self.session.flush()

    # --- Nodos de Instrumento ---

    async def crear_nodo(self, nodo: NodoInstrumento) -> NodoInstrumento:
        self.session.add(nodo)
        await self.session.flush()
        await self.session.refresh(nodo)
        return nodo

    async def crear_nodos_lote(self, nodos: list[NodoInstrumento]) -> list[NodoInstrumento]:
        for n in nodos:
            self.session.add(n)
        await self.session.flush()
        for n in nodos:
            await self.session.refresh(n)
        return nodos

    async def obtener_nodo(self, nodo_id: uuid.UUID) -> NodoInstrumento | None:
        stmt = select(NodoInstrumento).where(NodoInstrumento.id == nodo_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def obtener_nodo_para_actualizar(self, nodo_id: uuid.UUID) -> NodoInstrumento | None:
        stmt = select(NodoInstrumento).where(NodoInstrumento.id == nodo_id).with_for_update()
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def listar_nodos_por_instrumento(
        self, instrumento_id: uuid.UUID
    ) -> Sequence[NodoInstrumento]:
        stmt = (
            select(NodoInstrumento)
            .where(NodoInstrumento.instrumento_id == instrumento_id)
            .order_by(NodoInstrumento.nivel, NodoInstrumento.orden, NodoInstrumento.creado_en)
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def actualizar_nodo(self, nodo: NodoInstrumento) -> NodoInstrumento:
        self.session.add(nodo)
        await self.session.flush()
        await self.session.refresh(nodo)
        return nodo

    async def eliminar_nodo(self, nodo: NodoInstrumento) -> None:
        await self.session.delete(nodo)
        await self.session.flush()
