import uuid
from collections.abc import Sequence
from datetime import datetime

from fastapi import HTTPException, status

from app.core.transactions import transaction
from app.modules.presupuesto.models import AsignacionPresupuestal, FuenteFinanciacion
from app.modules.presupuesto.repository import PresupuestoRepository
from app.modules.presupuesto.schemas import (
    AsignacionPresupuestalCrear,
    AsignacionPresupuestalRespuesta,
    ResumenCosteo,
)


class PresupuestoService:
    def __init__(self, repository: PresupuestoRepository) -> None:
        self.repository = repository

    async def listar_fuentes(self) -> Sequence[FuenteFinanciacion]:
        return await self.repository.listar_fuentes()

    async def obtener_fuente(self, id: uuid.UUID) -> FuenteFinanciacion | None:
        return await self.repository.obtener_fuente(id)

    async def crear_asignacion(
        self, datos: AsignacionPresupuestalCrear
    ) -> AsignacionPresupuestalRespuesta:
        async with transaction(self.repository.session):
            fuente = await self.repository.obtener_fuente(datos.fuente_financiacion_id)
            if not fuente:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fuente no encontrada")

            anio_actual = datetime.now().year
            # Control de vigencias futuras según Ley 1483/11
            if datos.anio_vigencia > anio_actual:
                if not datos.es_vigencia_futura:
                    raise HTTPException(
                        status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "El año de vigencia es futuro pero no se marcó como vigencia futura."
                        ),
                    )
                # Limite máximo de vigencias futuras excepcionales (ej: 10 años)
                if datos.anio_vigencia > anio_actual + 10:
                    raise HTTPException(
                        status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "Vigencias futuras excepcionales (Ley 1483/11) exceden límite máx"
                            "imo de 10 años."
                        ),
                    )

            asignacion = AsignacionPresupuestal(
                fuente_financiacion_id=datos.fuente_financiacion_id,
                linea_estrategica_id=datos.linea_estrategica_id,
                nodo_instrumento_id=datos.nodo_instrumento_id,
                monto_estimado=datos.monto_estimado,
                anio_vigencia=datos.anio_vigencia,
                es_vigencia_futura=datos.es_vigencia_futura,
                tipo_vigencia_futura=datos.tipo_vigencia_futura,
                codigo_bpin=datos.codigo_bpin,
                justificacion=datos.justificacion,
                metadatos=datos.metadatos,
            )
            resultado = await self.repository.crear_asignacion(asignacion)
            return AsignacionPresupuestalRespuesta.model_validate(resultado)

    async def listar_asignaciones(self) -> Sequence[AsignacionPresupuestal]:
        return await self.repository.listar_asignaciones()

    async def obtener_resumen_costeo(self) -> ResumenCosteo:
        resumen = await self.repository.obtener_resumen_costeo()
        return ResumenCosteo.model_validate(resumen)
