"""Rutas FastAPI para la verificación de radicados ciudadanos y auditoría de notificaciones."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.notificaciones.schemas import (
    ConsultaRadicadoRespuesta,
    HistorialNotificacionesPaginado,
    NotificacionLectura,
)
from app.modules.notificaciones.service import NotificacionService

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


def get_notificacion_service(
    session: SessionDependency, request: Request
) -> NotificacionService:
    settings = getattr(request.app.state, "settings", None) or Settings()
    return NotificacionService(session, settings=settings)


NotificacionServiceDep = Annotated[NotificacionService, Depends(get_notificacion_service)]


@router.get(
    "/radicado/{codigo_radicado}",
    response_model=ConsultaRadicadoRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Consultar propuesta por radicado oficial",
    description=(
        "Consulta pública y transparente del estado de tramitación ciudadana "
        "asociado a un código institucional inmutable POL-2026-XXXX."
    ),
)
async def consultar_radicado(
    codigo_radicado: str,
    service: NotificacionServiceDep,
) -> ConsultaRadicadoRespuesta:
    return await service.consultar_por_radicado(codigo_radicado)


@router.get(
    "/historial",
    response_model=HistorialNotificacionesPaginado,
    status_code=status.HTTP_200_OK,
    summary="Auditoría de notificaciones transaccionales",
    description="Supervisión forense e institucional de constancias y avisos despachados al ciudadano.",
    dependencies=[Depends(requerir_permiso("auditoria:leer", nivel_minimo="declarada"))],
)
async def listar_historial_notificaciones(
    service: NotificacionServiceDep,
    limite: Annotated[
        int,
        Query(ge=1, le=100, description="Cantidad máxima de registros por página"),
    ] = 50,
    desplazamiento: Annotated[
        int,
        Query(ge=0, description="Desplazamiento u offset"),
    ] = 0,
    codigo_radicado: Annotated[
        str | None,
        Query(description="Filtrar por código de radicado exacto"),
    ] = None,
    tipo_evento: Annotated[
        str | None,
        Query(description="Filtrar por tipo de evento (radicacion, cambio_estado, priorizacion)"),
    ] = None,
) -> HistorialNotificacionesPaginado:
    total, registros = await service.listar_historial(
        limite=limite,
        desplazamiento=desplazamiento,
        codigo_radicado=codigo_radicado,
        tipo_evento=tipo_evento,
    )
    return HistorialNotificacionesPaginado(
        total=total,
        limite=limite,
        desplazamiento=desplazamiento,
        elementos=[NotificacionLectura.model_validate(r) for r in registros],
    )
