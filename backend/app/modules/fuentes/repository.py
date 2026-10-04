from typing import Sequence
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.fuentes.models import FuenteInformacion


class FuentesRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar_fuentes(
        self,
        ambito: str | None = None,
        estado: str | None = None,
        dimension: str | None = None,
        tipo: str | None = None,
        busqueda: str | None = None,
    ) -> Sequence[FuenteInformacion]:
        query = select(FuenteInformacion)

        if ambito and ambito != "todos":
            query = query.where(FuenteInformacion.ambito == ambito)
        if estado and estado != "todos":
            query = query.where(FuenteInformacion.estado_entrega == estado)
        if dimension and dimension != "todas":
            query = query.where(FuenteInformacion.dimension_seguridad == dimension)
        if tipo and tipo != "todos":
            query = query.where(FuenteInformacion.tipo == tipo)
        if busqueda:
            termino = f"%{busqueda.strip()}%"
            query = query.where(
                or_(
                    FuenteInformacion.codigo.ilike(termino),
                    FuenteInformacion.entidad.ilike(termino),
                    FuenteInformacion.nombre_fuente.ilike(termino),
                    FuenteInformacion.radicado_solicitud.ilike(termino),
                )
            )

        query = query.order_by(FuenteInformacion.codigo.asc())
        result = await self.session.execute(query)
        return result.scalars().all()

    async def obtener_por_id(self, id: str) -> FuenteInformacion | None:
        query = select(FuenteInformacion).where(FuenteInformacion.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def obtener_por_codigo(self, codigo: str) -> FuenteInformacion | None:
        query = select(FuenteInformacion).where(FuenteInformacion.codigo == codigo)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def obtener_para_actualizar(self, id: str) -> FuenteInformacion | None:
        query = (
            select(FuenteInformacion)
            .where(FuenteInformacion.id == id)
            .with_for_update()
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def crear_fuente(self, fuente: FuenteInformacion) -> FuenteInformacion:
        self.session.add(fuente)
        await self.session.flush()
        return fuente

    async def actualizar_fuente(self, fuente: FuenteInformacion) -> FuenteInformacion:
        await self.session.flush()
        return fuente

    async def eliminar_fuente(self, fuente: FuenteInformacion) -> None:
        await self.session.delete(fuente)
        await self.session.flush()

    async def contar_metricas(self) -> dict[str, int]:
        query = select(
            func.count(FuenteInformacion.id).label("total"),
            func.count(FuenteInformacion.id)
            .filter(FuenteInformacion.estado_entrega == "entregada")
            .label("entregadas"),
            func.count(FuenteInformacion.id)
            .filter(FuenteInformacion.estado_entrega == "en_termino")
            .label("en_termino"),
            func.count(FuenteInformacion.id)
            .filter(FuenteInformacion.estado_entrega == "incompleta")
            .label("incompletas"),
            func.count(FuenteInformacion.id)
            .filter(FuenteInformacion.estado_entrega == "vencida_sin_entrega")
            .label("vencidas"),
            func.count(FuenteInformacion.id)
            .filter(FuenteInformacion.estado_entrega == "requerimiento_insistencia")
            .label("requerimiento_insistencia"),
            func.count(FuenteInformacion.id)
            .filter(FuenteInformacion.estado_entrega == "por_solicitar")
            .label("por_solicitar"),
        )
        result = await self.session.execute(query)
        fila = result.one()
        total = fila.total or 0
        entregadas = fila.entregadas or 0
        en_termino = fila.en_termino or 0
        incompletas = fila.incompletas or 0
        vencidas = fila.vencidas or 0
        req = fila.requerimiento_insistencia or 0
        por_sol = fila.por_solicitar or 0
        atencion_critica = vencidas + req
        cumplimiento = round((entregadas / total) * 100) if total > 0 else 0

        return {
            "total": total,
            "entregadas": entregadas,
            "en_termino": en_termino,
            "incompletas": incompletas,
            "vencidas": vencidas,
            "requerimiento_insistencia": req,
            "por_solicitar": por_sol,
            "atencion_critica": atencion_critica,
            "porcentaje_cumplimiento": cumplimiento,
        }
