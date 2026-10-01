import uuid
from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.mesas.models import ActaComunitaria, Mesa, ParticipanteMesa


class MesaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def crear(self, mesa: Mesa) -> Mesa:
        self.session.add(mesa)
        await self.session.flush()
        await self.session.refresh(mesa)
        return mesa

    async def actualizar_mesa(self, mesa: Mesa) -> Mesa:
        self.session.add(mesa)
        await self.session.flush()
        await self.session.refresh(mesa)
        return mesa

    async def obtener_por_id(self, mesa_id: uuid.UUID) -> Mesa | None:
        stmt = select(Mesa).where(Mesa.id == mesa_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def obtener_para_actualizar(self, mesa_id: uuid.UUID) -> Mesa | None:
        stmt = select(Mesa).where(Mesa.id == mesa_id).with_for_update()
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def obtener_por_codigo(self, codigo: str) -> Mesa | None:
        stmt = select(Mesa).where(Mesa.codigo_oficial == codigo)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def listar(
        self,
        tipo_mesa: str | None = None,
        estado: str | None = None,
        fecha: date | None = None,
        territorio_id: uuid.UUID | None = None,
        ancestro_ruta: str | None = None,
    ) -> Sequence[Mesa]:
        stmt = select(Mesa)
        if tipo_mesa:
            stmt = stmt.where(Mesa.tipo_mesa == tipo_mesa)
        if estado:
            stmt = stmt.where(Mesa.estado == estado)
        if fecha:
            stmt = stmt.where(Mesa.fecha == fecha)
        if territorio_id:
            stmt = stmt.where(Mesa.territorio_id == territorio_id)
        if ancestro_ruta:
            # operador ltree <@ para descendientes
            stmt = stmt.where(text("ruta_jerarquica <@ CAST(:ancestro_ruta AS ltree)"))
            stmt = stmt.params(ancestro_ruta=ancestro_ruta)

        stmt = stmt.order_by(Mesa.creado_en)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def buscar_descendientes(self, ruta_padre: str, mesa_id: uuid.UUID) -> Sequence[Mesa]:
        stmt = (
            select(Mesa)
            .where(text("ruta_jerarquica <@ CAST(:ruta_padre AS ltree)"), Mesa.id != mesa_id)
            .order_by(Mesa.ruta_jerarquica)
            .params(ruta_padre=ruta_padre)
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    # --- Participantes ---

    async def registrar_participante(self, participante: ParticipanteMesa) -> ParticipanteMesa:
        self.session.add(participante)
        await self.session.flush()
        await self.session.refresh(participante)
        return participante

    async def obtener_participante(
        self, mesa_id: uuid.UUID, sujeto_id: str
    ) -> ParticipanteMesa | None:
        stmt = select(ParticipanteMesa).where(
            ParticipanteMesa.mesa_id == mesa_id,
            ParticipanteMesa.sujeto_id == sujeto_id,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def listar_participantes(self, mesa_id: uuid.UUID) -> Sequence[ParticipanteMesa]:
        stmt = (
            select(ParticipanteMesa)
            .where(ParticipanteMesa.mesa_id == mesa_id)
            .order_by(ParticipanteMesa.sujeto_id, ParticipanteMesa.id)
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def contar_participantes(self, mesa_id: uuid.UUID) -> int:
        stmt = select(func.count(ParticipanteMesa.id)).where(ParticipanteMesa.mesa_id == mesa_id)
        res = await self.session.execute(stmt)
        return res.scalar_one() or 0

    # --- Actas ---

    async def obtener_acta_por_mesa(self, mesa_id: uuid.UUID) -> ActaComunitaria | None:
        stmt = select(ActaComunitaria).where(ActaComunitaria.mesa_id == mesa_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def obtener_acta_por_numero(self, numero_acta: str) -> ActaComunitaria | None:
        stmt = select(ActaComunitaria).where(ActaComunitaria.numero_acta == numero_acta)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def guardar_acta(self, acta: ActaComunitaria) -> ActaComunitaria:
        self.session.add(acta)
        await self.session.flush()
        await self.session.refresh(acta)
        return acta
