"""Rutas FastAPI para la emisión y verificación de sesiones anónimas con firma digital."""

import time
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.sesion.deps import SesionRequeridaDep
from app.modules.sesion.repository import SesionRepository
from app.modules.sesion.schemas import SesionAnonimaRespuesta, SesionContexto
from app.modules.sesion.service import SesionService

router = APIRouter(prefix="/sesion", tags=["sesion-anonima"])

_limite_ip_memoria: dict[str, list[float]] = defaultdict(list)


def verificar_tasa_ip(ip: str, maximo: int, ventana: int = 900) -> bool:
    ahora = time.time()
    marcas = [t for t in _limite_ip_memoria[ip] if ahora - t < ventana]
    if len(marcas) >= maximo:
        return False
    marcas.append(ahora)
    _limite_ip_memoria[ip] = marcas
    return True


def get_sesion_service(session: SessionDependency) -> SesionService:
    """Inyector de dependencias para el servicio de sesión."""
    return SesionService(SesionRepository(session), Settings())


SesionServiceDep = Annotated[SesionService, Depends(get_sesion_service)]


def extraer_ip_cliente(request: Request) -> str:
    """Extrae la IP real del cliente respetando proxys y encabezados estándar."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # El primer valor en X-Forwarded-For es la IP original del cliente
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


@router.post(
    "/anonima",
    response_model=SesionAnonimaRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir sesión anónima firmada",
    description=(
        "Emite un token JWT firmado digitalmente con HMAC-SHA256 y marca de tiempo UUIDv7. "
        "Calcula la huella no reversible de la conexión conforme a Ley 1581/12 (Habeas Data)."
    ),
)
async def emitir_sesion_anonima(
    request: Request,
    service: SesionServiceDep,
) -> SesionAnonimaRespuesta:
    ip_cliente = extraer_ip_cliente(request)
    settings = request.app.state.settings
    limite = getattr(settings, "sesion_anonima_limite_ip", 30)
    ventana = getattr(settings, "identidad_ventana_segundos", 900)
    if not verificar_tasa_ip(ip_cliente, limite, ventana):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes de sesión anónima. Inténtalo más tarde.",
            headers={"Retry-After": str(ventana)},
        )

    user_agent = request.headers.get("user-agent")
    return await service.emitir_sesion_anonima(ip_cliente, user_agent)


@router.get(
    "/verificar",
    response_model=SesionContexto,
    status_code=status.HTTP_200_OK,
    summary="Verificar sesión actual",
    description="Comprueba la validez y vigencia del token de sesión presentado.",
)
async def verificar_sesion_actual(
    sesion: SesionRequeridaDep,
) -> SesionContexto:
    return sesion
