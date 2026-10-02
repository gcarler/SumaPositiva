import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.formularios.models import FormularioConsulta, RespuestaFormulario


class FormularioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar(
        self,
        estado: str | None = None,
        dimension_id: uuid.UUID | None = None,
        territorio_id: uuid.UUID | None = None,
    ) -> list[FormularioConsulta]:
        stmt = select(FormularioConsulta)
        if estado:
            stmt = stmt.where(FormularioConsulta.estado == estado)
        if dimension_id:
            stmt = stmt.where(FormularioConsulta.dimension_id == dimension_id)
        if territorio_id:
            stmt = stmt.where(FormularioConsulta.territorio_id == territorio_id)
        stmt = stmt.order_by(FormularioConsulta.creado_en.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def obtener_por_id(self, formulario_id: uuid.UUID) -> FormularioConsulta | None:
        stmt = select(FormularioConsulta).where(FormularioConsulta.id == formulario_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def obtener_por_codigo(self, codigo: str) -> FormularioConsulta | None:
        stmt = select(FormularioConsulta).where(FormularioConsulta.codigo == codigo)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def crear(self, formulario: FormularioConsulta) -> FormularioConsulta:
        self.session.add(formulario)
        await self.session.flush()
        return formulario

    async def eliminar(self, formulario: FormularioConsulta) -> None:
        await self.session.delete(formulario)
        await self.session.flush()

    async def obtener_respuesta_sujeto(
        self, formulario_id: uuid.UUID, sujeto_id: uuid.UUID
    ) -> RespuestaFormulario | None:
        stmt = select(RespuestaFormulario).where(
            RespuestaFormulario.formulario_id == formulario_id,
            RespuestaFormulario.sujeto_id == sujeto_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def guardar_respuesta(self, respuesta: RespuestaFormulario) -> RespuestaFormulario:
        self.session.add(respuesta)
        await self.session.flush()
        return respuesta

    async def listar_respuestas(self, formulario_id: uuid.UUID) -> list[RespuestaFormulario]:
        stmt = (
            select(RespuestaFormulario)
            .where(RespuestaFormulario.formulario_id == formulario_id)
            .order_by(RespuestaFormulario.creado_en.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def contar_respuestas(self, formulario_id: uuid.UUID) -> int:
        stmt = select(func.count(RespuestaFormulario.id)).where(
            RespuestaFormulario.formulario_id == formulario_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    async def obtener_por_slug(self, slug: str, *, bloquear: bool = False):
        stmt = select(FormularioConsulta).where(FormularioConsulta.slug == slug)
        if bloquear:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def guardar(self, formulario: FormularioConsulta):
        await self.session.flush()
        await self.session.refresh(formulario)
        return formulario
