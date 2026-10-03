import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auditoria.models import RegistroAuditoria
from app.modules.compromisos.models import CompromisoPAS


class CompromisosRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar(
        self,
        busqueda: str | None = None,
        entidad: str | None = None,
        estado: str | None = None,
    ) -> Sequence[CompromisoPAS]:
        stmt = select(CompromisoPAS).order_by(CompromisoPAS.codigo.asc())
        if entidad and entidad != "todas":
            stmt = stmt.where(CompromisoPAS.entidad_responsable == entidad)
        if estado and estado != "todos":
            stmt = stmt.where(CompromisoPAS.estado == estado)
        if busqueda:
            term = f"%{busqueda.strip()}%"
            stmt = stmt.where(
                or_(
                    CompromisoPAS.codigo.ilike(term),
                    CompromisoPAS.nombre.ilike(term),
                    CompromisoPAS.descripcion.ilike(term),
                    CompromisoPAS.entidad_responsable.ilike(term),
                    CompromisoPAS.indicador_asociado_codigo.ilike(term),
                    CompromisoPAS.alternativa_mga_codigo.ilike(term),
                )
            )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def obtener_por_id_o_codigo(self, id_o_codigo: str | uuid.UUID) -> CompromisoPAS | None:
        if isinstance(id_o_codigo, uuid.UUID):
            stmt = select(CompromisoPAS).where(CompromisoPAS.id == id_o_codigo)
        else:
            try:
                parsed_uuid = uuid.UUID(str(id_o_codigo))
                stmt = select(CompromisoPAS).where(
                    or_(CompromisoPAS.id == parsed_uuid, CompromisoPAS.codigo == str(id_o_codigo))
                )
            except ValueError:
                stmt = select(CompromisoPAS).where(CompromisoPAS.codigo == str(id_o_codigo))
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def crear(self, compromiso: CompromisoPAS) -> CompromisoPAS:
        self.session.add(compromiso)
        await self.session.flush()
        await self.session.refresh(compromiso)
        return compromiso

    async def actualizar(self, compromiso: CompromisoPAS) -> CompromisoPAS:
        await self.session.flush()
        await self.session.refresh(compromiso)
        return compromiso

    async def eliminar(self, compromiso: CompromisoPAS) -> None:
        await self.session.delete(compromiso)
        await self.session.flush()

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
            tabla_afectada="compromisos_pas",
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
