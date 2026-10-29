import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.alternativas.models import BancoAlternativas
from app.modules.auditoria.models import RegistroAuditoria


class AlternativasRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar(
        self,
        busqueda: str | None = None,
        sector: str | None = None,
        linea: str | None = None,
        dimension: str | None = None,
        estado: str | None = None,
        enfoque_etnico: str | None = None,
    ) -> Sequence[BancoAlternativas]:
        stmt = select(BancoAlternativas).order_by(BancoAlternativas.codigo.asc())

        if sector and sector != "todos":
            stmt = stmt.where(BancoAlternativas.sector == sector)

        if linea and linea != "todas":
            try:
                linea_uuid = uuid.UUID(linea)
                stmt = stmt.where(
                    or_(
                        BancoAlternativas.linea_estrategica_id == linea_uuid,
                        BancoAlternativas.linea_estrategica_codigo == linea,
                    )
                )
            except ValueError:
                stmt = stmt.where(BancoAlternativas.linea_estrategica_codigo == linea)

        if dimension and dimension != "todas":
            try:
                dim_uuid = uuid.UUID(dimension)
                stmt = stmt.where(
                    or_(
                        BancoAlternativas.dimension_id == dim_uuid,
                        BancoAlternativas.dimension_codigo == dimension,
                    )
                )
            except ValueError:
                stmt = stmt.where(BancoAlternativas.dimension_codigo == dimension)

        if estado and estado != "todos":
            stmt = stmt.where(BancoAlternativas.estado == estado)

        if enfoque_etnico == "solo_etnicos":
            stmt = stmt.where(
                or_(
                    BancoAlternativas.requiere_consulta_previa.is_(True),
                    BancoAlternativas.sector == "etnico_comunitario",
                )
            )
        elif enfoque_etnico == "no_etnicos":
            stmt = stmt.where(
                BancoAlternativas.requiere_consulta_previa.is_(False),
                BancoAlternativas.sector != "etnico_comunitario",
            )

        if busqueda:
            term = f"%{busqueda.strip()}%"
            stmt = stmt.where(
                or_(
                    BancoAlternativas.codigo.ilike(term),
                    BancoAlternativas.nombre.ilike(term),
                    BancoAlternativas.descripcion.ilike(term),
                    BancoAlternativas.territorio_cobertura.ilike(term),
                    BancoAlternativas.objetivo_central.ilike(term),
                )
            )

        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def obtener_por_id_o_codigo(self, id_o_codigo: str | uuid.UUID) -> BancoAlternativas | None:
        if isinstance(id_o_codigo, uuid.UUID):
            stmt = select(BancoAlternativas).where(BancoAlternativas.id == id_o_codigo)
        else:
            cand = str(id_o_codigo).strip()
            # Si tiene prefijo alt- común en frontend, probar también sin el prefijo
            cand_sin_prefijo = cand.removeprefix("alt-")
            filtros = [
                func.lower(BancoAlternativas.codigo) == cand.lower(),
                func.lower(BancoAlternativas.codigo) == cand_sin_prefijo.lower(),
            ]
            try:
                filtros.append(BancoAlternativas.id == uuid.UUID(cand))
            except ValueError:
                pass
            try:
                filtros.append(BancoAlternativas.id == uuid.UUID(cand_sin_prefijo))
            except ValueError:
                pass

            stmt = select(BancoAlternativas).where(or_(*filtros))

        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def obtener_por_codigo(self, codigo: str) -> BancoAlternativas | None:
        stmt = select(BancoAlternativas).where(func.lower(BancoAlternativas.codigo) == codigo.strip().lower())
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def crear(self, alternativa: BancoAlternativas) -> BancoAlternativas:
        self.session.add(alternativa)
        await self.session.flush()
        await self.session.refresh(alternativa)
        return alternativa

    async def actualizar(self, alternativa: BancoAlternativas) -> BancoAlternativas:
        await self.session.flush()
        await self.session.refresh(alternativa)
        return alternativa

    async def eliminar(self, alternativa: BancoAlternativas) -> None:
        await self.session.delete(alternativa)
        await self.session.flush()

    async def contar_compromisos_vinculados(self, codigo: str) -> int:
        stmt = text("SELECT count(*) FROM seguimiento.compromisos_pas WHERE alternativa_mga_codigo = :codigo")
        res = await self.session.execute(stmt, {"codigo": codigo})
        return res.scalar() or 0

    async def registrar_auditoria(
        self,
        registro_id: uuid.UUID,
        accion: str,
        justificacion_motivada: str,
        usuario_id: uuid.UUID | None = None,
        causal: str = "tecnica",
        metadatos: dict[str, Any] | None = None,
    ) -> RegistroAuditoria:
        evento = RegistroAuditoria(
            tabla_afectada="banco_alternativas",
            registro_id=registro_id,
            accion=accion,
            usuario_id=usuario_id,
            causal=causal,
            justificacion_motivada=justificacion_motivada,
            metadatos=metadatos or {},
        )
        self.session.add(evento)
        await self.session.flush()
        return evento
