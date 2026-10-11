from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.health.repository import HealthRepository
from app.modules.health.schemas import (
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


@router.get(
    "/ready", response_model=ReadinessResponse, responses={503: {"model": ReadinessResponse}}
)
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
