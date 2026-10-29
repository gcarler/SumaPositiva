from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.health.repository import HealthRepository
from app.modules.health.schemas import (
    DatabaseTelemetryResponse,
    LivenessResponse,
    ReadinessResponse,
    SystemHealthResponse,
)
from app.modules.health.service import HealthService

router = APIRouter(prefix="/health", tags=["health"])


def get_health_service(session: SessionDependency) -> HealthService:
    return HealthService(HealthRepository(session))


@router.get("/live", response_model=LivenessResponse)
async def liveness() -> LivenessResponse:
    return LivenessResponse()


@router.get("/ready", response_model=ReadinessResponse, responses={503: {"model": ReadinessResponse}})
async def readiness(
    response: Response, service: Annotated[HealthService, Depends(get_health_service)]
) -> ReadinessResponse:
    result = await service.readiness()
    if result.status != "ready":
        response.status_code = 503
    return result


@router.get("/system", response_model=SystemHealthResponse)
async def system_health(
    request: Request,
    service: Annotated[HealthService, Depends(get_health_service)],
) -> SystemHealthResponse:
    settings: Settings = getattr(request.app.state, "settings", Settings())
    return await service.system_metrics(settings)


@router.get("/database/queries", response_model=DatabaseTelemetryResponse)
async def database_queries(
    service: Annotated[HealthService, Depends(get_health_service)],
    limite: int = Query(default=10, ge=1, le=50, description="Cantidad máxima de consultas a retornar"),
    ordenar_por: Literal["tiempo_total", "tiempo_medio", "llamadas"] = Query(
        default="tiempo_total", description="Criterio de ordenación"
    ),
) -> DatabaseTelemetryResponse:
    return await service.database_queries_telemetry(limite=limite, ordenar_por=ordenar_por)
