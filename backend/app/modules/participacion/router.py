import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.participacion.schemas import (
    DesgloseCanalEscenarios,
    DesgloseCanalMesas,
    DesgloseCanalWeb,
    EscenarioEspecialActualizar,
    EscenarioEspecialCrear,
    EscenarioEspecialLectura,
    TableroConsolidado,
)
from app.modules.participacion.service import ParticipacionService

router = APIRouter(prefix="/participacion", tags=["Asistencia y Participación Multicanal"])


def get_participacion_service(session: SessionDependency) -> ParticipacionService:
    return ParticipacionService(session)


ParticipacionServiceDep = Annotated[ParticipacionService, Depends(get_participacion_service)]


@router.get("/consolidado", response_model=TableroConsolidado)
async def obtener_tablero_consolidado(service: ParticipacionServiceDep):
    """Retorna el Tablero Consolidado Distrital con la métrica unificada sin duplicidades."""
    return await service.obtener_tablero_consolidado()


@router.get("/canal-web", response_model=DesgloseCanalWeb)
async def obtener_desglose_canal_web(service: ParticipacionServiceDep):
    """Retorna la desagregación analítica del Canal Web por línea estratégica, dimensión y territorio."""
    return await service.obtener_desglose_canal_web()


@router.get("/canal-mesas", response_model=DesgloseCanalMesas)
async def obtener_desglose_canal_mesas(service: ParticipacionServiceDep):
    """Retorna la desagregación jerárquica del Canal Mesas territoriales (ltree), submesas y actas."""
    return await service.obtener_desglose_canal_mesas()


@router.get("/canal-escenarios", response_model=DesgloseCanalEscenarios)
async def obtener_desglose_canal_escenarios(service: ParticipacionServiceDep):
    """Retorna el resumen agregado y listado de los escenarios especiales de co-creación."""
    return await service.obtener_desglose_escenarios()


@router.get("/escenarios-especiales", response_model=list[EscenarioEspecialLectura])
async def listar_escenarios_especiales(
    service: ParticipacionServiceDep,
    tipo: str | None = None,
    territorio_id: uuid.UUID | None = None,
    estado: str | None = None,
):
    """Consulta pública del catálogo de escenarios especiales de participación."""
    return await service.listar_escenarios_especiales(tipo, territorio_id, estado)


@router.post(
    "/escenarios-especiales",
    response_model=EscenarioEspecialLectura,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("asistencia:verificar", nivel_minimo="declarada"))],
)
async def crear_escenario_especial(
    datos: EscenarioEspecialCrear,
    service: ParticipacionServiceDep,
):
    """Registra un nuevo escenario especial de co-creación institucional."""
    return await service.crear_escenario_especial(datos)


@router.get("/escenarios-especiales/{id}", response_model=EscenarioEspecialLectura)
async def obtener_escenario_especial(
    id: uuid.UUID,
    service: ParticipacionServiceDep,
):
    """Consulta detallada de un escenario especial por su identificador UUIDv7."""
    return await service.obtener_escenario_por_id(id)


@router.put(
    "/escenarios-especiales/{id}",
    response_model=EscenarioEspecialLectura,
    dependencies=[Depends(requerir_permiso("asistencia:verificar", nivel_minimo="declarada"))],
)
async def actualizar_escenario_especial(
    id: uuid.UUID,
    datos: EscenarioEspecialActualizar,
    service: ParticipacionServiceDep,
):
    """Actualiza datos o síntesis de un escenario especial de co-creación."""
    return await service.actualizar_escenario_especial(id, datos)
