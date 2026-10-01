import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.database import SessionDependency
from app.modules.evidencia.schemas import EvidenciaRespuesta
from app.modules.evidencia.service import EvidenciaService
from app.modules.identidad.deps import SujetoAutenticadoDep

router = APIRouter(prefix="/evidencias", tags=["Evidencias"])


def obtener_evidencia_service(
    session: SessionDependency,
    request: Request,
) -> EvidenciaService:
    settings = getattr(request.app.state, "settings", None) or Settings()
    return EvidenciaService(session, settings)


EvidenciaServiceDep = Annotated[EvidenciaService, Depends(obtener_evidencia_service)]


@router.post(
    "/subir",
    response_model=EvidenciaRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Subir evidencia fotográfica con despojo de metadatos EXIF y GPS",
    description=(
        "Procesa imágenes comunitarias eliminando coordenadas GPS exactas "
        "y marcas EXIF para salvaguarda de líderes sociales (Ley 1581/12)."
    ),
)
async def subir_evidencia(
    sujeto: SujetoAutenticadoDep,
    service: EvidenciaServiceDep,
    archivo: Annotated[
        UploadFile,
        File(description="Archivo de imagen (JPEG, PNG, WebP)"),
    ],
    propuesta_id: Annotated[
        uuid.UUID | None,
        Form(description="UUID de la propuesta asociada (opcional)"),
    ] = None,
) -> EvidenciaRespuesta:
    return await service.guardar_evidencia(archivo, sujeto, propuesta_id=propuesta_id)


@router.get(
    "/{id}",
    response_model=EvidenciaRespuesta,
    summary="Consultar metadatos forenses de evidencia fotográfica",
)
async def consultar_evidencia(
    id: uuid.UUID,
    service: EvidenciaServiceDep,
) -> EvidenciaRespuesta:
    return await service.obtener_evidencia(id)


@router.get(
    "/{id}/archivo",
    response_class=FileResponse,
    summary="Descargar archivo fotográfico sanitizado",
    description="Entrega la imagen física despojada de metadatos sensibles.",
)
async def descargar_archivo_evidencia(
    id: uuid.UUID,
    service: EvidenciaServiceDep,
) -> FileResponse:
    ruta_archivo, tipo_mime = await service.obtener_ruta_archivo(id)
    return FileResponse(
        path=ruta_archivo,
        media_type=tipo_mime,
        filename=ruta_archivo.name,
    )
