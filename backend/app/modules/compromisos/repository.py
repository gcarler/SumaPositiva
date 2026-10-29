import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auditoria.models import RegistroAuditoria
from app.modules.compromisos.models import ActividadPlanAccion, CompromisoPAS


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

    async def listar_actividades(
        self,
        vigencia: int | None = None,
        entidad: str | None = None,
        linea_codigo: str | None = None,
        tipo_meta: str | None = None,
        tipo_actividad: str | None = None,
        categoria_recursos: str | None = None,
        fuente_financiacion: str | None = None,
        busqueda: str | None = None,
        compromiso_pas_codigo: str | None = None,
    ) -> Sequence[ActividadPlanAccion]:
        stmt = select(ActividadPlanAccion).order_by(ActividadPlanAccion.codigo.asc())
        if vigencia:
            stmt = stmt.where(ActividadPlanAccion.vigencia == vigencia)
        if entidad and entidad != "todas":
            stmt = stmt.where(ActividadPlanAccion.entidad_responsable == entidad)
        if linea_codigo and linea_codigo != "todas":
            stmt = stmt.where(ActividadPlanAccion.linea_estrategica_codigo == linea_codigo)
        if compromiso_pas_codigo and compromiso_pas_codigo != "todas":
            stmt = stmt.where(ActividadPlanAccion.compromiso_pas_codigo == compromiso_pas_codigo)
        if tipo_meta and tipo_meta != "todas":
            stmt = stmt.where(ActividadPlanAccion.tipo_meta == tipo_meta)
        if tipo_actividad and tipo_actividad != "todas":
            stmt = stmt.where(ActividadPlanAccion.tipo_actividad == tipo_actividad)
        if categoria_recursos and categoria_recursos != "todas":
            stmt = stmt.where(ActividadPlanAccion.categoria_recursos == categoria_recursos)
        if fuente_financiacion and fuente_financiacion != "todas":
            stmt = stmt.where(ActividadPlanAccion.fuente_financiacion == fuente_financiacion)
        if busqueda:
            term = f"%{busqueda.strip()}%"
            stmt = stmt.where(
                or_(
                    ActividadPlanAccion.codigo.ilike(term),
                    ActividadPlanAccion.descripcion_actividad.ilike(term),
                    ActividadPlanAccion.proyecto_nombre.ilike(term),
                    ActividadPlanAccion.codigo_bpim.ilike(term),
                    ActividadPlanAccion.entidad_responsable.ilike(term),
                    ActividadPlanAccion.lider_responsable.ilike(term),
                    ActividadPlanAccion.compromiso_pas_codigo.ilike(term),
                )
            )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def obtener_actividad_por_id_o_codigo(self, id_o_codigo: str | uuid.UUID) -> ActividadPlanAccion | None:
        if isinstance(id_o_codigo, uuid.UUID):
            stmt = select(ActividadPlanAccion).where(ActividadPlanAccion.id == id_o_codigo)
        else:
            try:
                parsed_uuid = uuid.UUID(str(id_o_codigo))
                stmt = select(ActividadPlanAccion).where(
                    or_(ActividadPlanAccion.id == parsed_uuid, ActividadPlanAccion.codigo == str(id_o_codigo))
                )
            except ValueError:
                stmt = select(ActividadPlanAccion).where(ActividadPlanAccion.codigo == str(id_o_codigo))
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def crear_actividad(self, actividad: ActividadPlanAccion) -> ActividadPlanAccion:
        self.session.add(actividad)
        await self.session.flush()
        await self.session.refresh(actividad)
        return actividad

    async def actualizar_actividad(self, actividad: ActividadPlanAccion) -> ActividadPlanAccion:
        await self.session.flush()
        await self.session.refresh(actividad)
        return actividad

    async def eliminar_actividad(self, actividad: ActividadPlanAccion) -> None:
        await self.session.delete(actividad)
        await self.session.flush()
