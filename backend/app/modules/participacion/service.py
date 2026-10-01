import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.participacion.models import EscenarioEspecial
from app.modules.participacion.repository import ParticipacionRepository
from app.modules.participacion.schemas import (
    DesgloseCanalEscenarios,
    DesgloseCanalMesas,
    DesgloseCanalWeb,
    EscenarioEspecialActualizar,
    EscenarioEspecialCrear,
    EscenarioEspecialLectura,
    TableroConsolidado,
)


class ParticipacionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ParticipacionRepository(session)

    async def obtener_tablero_consolidado(self) -> TableroConsolidado:
        """Obtiene la métrica consolidada distrital sin duplicidades."""
        async with transaction(self.session):
            metricas = await self.repository.obtener_metricas_consolidadas()
            metricas["fecha_corte"] = datetime.now(UTC)
            return TableroConsolidado(**metricas)

    async def obtener_desglose_canal_web(self) -> DesgloseCanalWeb:
        """Obtiene la desagregación analítica del Canal Web."""
        async with transaction(self.session):
            datos = await self.repository.obtener_desglose_canal_web()
            return DesgloseCanalWeb(**datos)

    async def obtener_desglose_canal_mesas(self) -> DesgloseCanalMesas:
        """Obtiene la desagregación jerárquica del Canal Mesas."""
        async with transaction(self.session):
            datos = await self.repository.obtener_desglose_canal_mesas()
            return DesgloseCanalMesas(**datos)

    async def obtener_desglose_escenarios(self) -> DesgloseCanalEscenarios:
        """Obtiene la cuantificación consolidada de escenarios especiales de co-creación."""
        async with transaction(self.session):
            resumen = await self.repository.obtener_resumen_escenarios()
            escenarios = await self.repository.listar_escenarios_especiales()
            escenarios_dto = [self._mapear_escenario(e) for e in escenarios]
            return DesgloseCanalEscenarios(
                total_escenarios=resumen["total_escenarios"],
                total_asistentes=resumen["total_asistentes"],
                por_tipo=resumen["por_tipo"],
                escenarios=escenarios_dto,
            )

    async def listar_escenarios_especiales(
        self,
        tipo: str | None = None,
        territorio_id: uuid.UUID | None = None,
        estado: str | None = None,
    ) -> list[EscenarioEspecialLectura]:
        async with transaction(self.session):
            escenarios = await self.repository.listar_escenarios_especiales(
                tipo, territorio_id, estado
            )
            return [self._mapear_escenario(e) for e in escenarios]

    async def obtener_escenario_por_id(self, id: uuid.UUID) -> EscenarioEspecialLectura:
        async with transaction(self.session):
            escenario = await self.repository.obtener_escenario_por_id(id)
            if not escenario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Escenario especial con ID {id} no encontrado",
                )
            return self._mapear_escenario(escenario)

    async def crear_escenario_especial(
        self, datos: EscenarioEspecialCrear
    ) -> EscenarioEspecialLectura:
        async with transaction(self.session):
            escenario = EscenarioEspecial(
                codigo_unico=datos.codigo_unico,
                nombre=datos.nombre,
                tipo_escenario=datos.tipo_escenario,
                territorio_id=datos.territorio_id,
                fecha=datos.fecha,
                lugar=datos.lugar,
                entidad_convocante=datos.entidad_convocante,
                total_asistentes=datos.total_asistentes,
                desglose_poblacional=datos.desglose_poblacional,
                sintesis_acuerdos=datos.sintesis_acuerdos,
                url_evidencia=datos.url_evidencia,
                estado=datos.estado,
            )
            creado = await self.repository.crear_escenario_especial(escenario)
            await self.session.refresh(creado)
            return self._mapear_escenario(creado)

    async def actualizar_escenario_especial(
        self, id: uuid.UUID, datos: EscenarioEspecialActualizar
    ) -> EscenarioEspecialLectura:
        async with transaction(self.session):
            escenario = await self.repository.obtener_escenario_por_id(id)
            if not escenario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Escenario especial con ID {id} no encontrado",
                )
            for k, v in datos.model_dump(exclude_unset=True).items():
                setattr(escenario, k, v)
            await self.session.flush()
            await self.session.refresh(escenario)
            return self._mapear_escenario(escenario)

    def _mapear_escenario(self, e: EscenarioEspecial) -> EscenarioEspecialLectura:
        territorio_nombre = None
        if e.territorio_id and "territorio" in e.__dict__ and e.territorio:
            territorio_nombre = e.territorio.nombre
        return EscenarioEspecialLectura(
            id=e.id,
            codigo_unico=e.codigo_unico,
            nombre=e.nombre,
            tipo_escenario=e.tipo_escenario,
            territorio_id=e.territorio_id,
            territorio_nombre=territorio_nombre,
            fecha=e.fecha,
            lugar=e.lugar,
            entidad_convocante=e.entidad_convocante,
            total_asistentes=e.total_asistentes,
            desglose_poblacional=e.desglose_poblacional or {},
            sintesis_acuerdos=e.sintesis_acuerdos,
            url_evidencia=e.url_evidencia,
            estado=e.estado,
            creado_en=e.creado_en,
            actualizado_en=e.actualizado_en,
        )
