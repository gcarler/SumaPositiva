"""Rutas FastAPI para la verificación de radicados ciudadanos y auditoría de notificaciones."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.notificaciones.schemas import (
    ConsultaRadicadoRespuesta,
    HistorialNotificacionesPaginado,
    NotificacionLectura,
    ReintentoRespuesta,
    SaludHerald,
)
from app.modules.notificaciones.service import NotificacionService

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


def get_notificacion_service(session: SessionDependency, request: Request) -> NotificacionService:
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
    "/qr/{codigo_radicado}.png",
    status_code=status.HTTP_200_OK,
    summary="Generar código QR institucional del radicado en PNG",
    description="Retorna la imagen PNG del código QR para visualización garantizada en clientes como Gmail.",
)
async def qr_radicado(
    codigo_radicado: str,
    request: Request,
) -> Response:
    import io

    import qrcode

    settings = getattr(request.app.state, "settings", None) or Settings()
    url_base = settings.identidad_url_publica.rstrip("/")
    url_aporte = f"{url_base}/aportes/{codigo_radicado}"

    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(url_aporte)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=604800"},
    )


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
    estado_envio: Annotated[
        str | None,
        Query(description="Filtrar por estado de envío (pendiente, procesando, enviado, simulado, fallido)"),
    ] = None,
) -> HistorialNotificacionesPaginado:
    total, registros = await service.listar_historial(
        limite=limite,
        desplazamiento=desplazamiento,
        codigo_radicado=codigo_radicado,
        tipo_evento=tipo_evento,
        estado_envio=estado_envio,
    )
    return HistorialNotificacionesPaginado(
        total=total,
        limite=limite,
        desplazamiento=desplazamiento,
        elementos=[NotificacionLectura.model_validate(r) for r in registros],
    )


@router.get(
    "/salud",
    response_model=SaludHerald,
    status_code=status.HTTP_200_OK,
    summary="Salud de las entregas de POLIS Herald",
    description=(
        "Estado agregado de la cola outbox, el ejecutor y las últimas 24 horas. "
        "No expone host, usuario ni contraseña SMTP."
    ),
    dependencies=[Depends(requerir_permiso("auditoria:leer", nivel_minimo="declarada"))],
)
async def salud_herald(
    service: NotificacionServiceDep,
    request: Request,
) -> SaludHerald:
    from app.modules.notificaciones.salud import recolectar_salud

    settings = getattr(request.app.state, "settings", None) or Settings()
    datos = await recolectar_salud(service.session, settings)
    return SaludHerald.model_validate(datos)


@router.post(
    "/{notificacion_id}/reintentar",
    response_model=ReintentoRespuesta,
    status_code=status.HTTP_200_OK,
    summary="Reintento manual de una notificación agotada",
    description=(
        "Devuelve a 'pendiente' una notificación 'fallido' que agotó el máximo de "
        "intentos. Queda auditado con el actor institucional."
    ),
    dependencies=[Depends(requerir_permiso("usuarios:gestionar", nivel_minimo="declarada"))],
)
async def reintentar_notificacion(
    notificacion_id: uuid.UUID,
    service: NotificacionServiceDep,
    sujeto: SujetoAutenticadoDep,
) -> ReintentoRespuesta:
    registro = await service.reintentar_manual(notificacion_id, sujeto)
    return ReintentoRespuesta(id=registro.id, estado_envio="pendiente")
