"""Rutas FastAPI para la emisión y verificación de sesiones anónimas con firma digital."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.sesion.deps import SesionRequeridaDep
from app.modules.sesion.repository import SesionRepository
from app.modules.sesion.schemas import SesionAnonimaRespuesta, SesionContexto
from app.modules.sesion.service import SesionService

router = APIRouter(prefix="/sesion", tags=["sesion-anonima"])


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
