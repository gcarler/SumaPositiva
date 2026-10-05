import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso
from app.modules.testimonios.schemas import (
    ResumenTestimonios,
    TestimonioCrear,
    TestimonioEdicion,
    TestimonioLectura,
    TestimonioModeracion,
)
from app.modules.testimonios.service import TestimoniosService

router = APIRouter(prefix="/testimonios", tags=["Testimonios Comunitarios y Memoria Social"])


def get_testimonios_service(session: SessionDependency) -> TestimoniosService:
    return TestimoniosService(session)


TestimoniosServiceDep = Annotated[TestimoniosService, Depends(get_testimonios_service)]


@router.get("", response_model=list[TestimonioLectura])
async def listar_testimonios_publicos(
    service: TestimoniosServiceDep,
    territorio_id: uuid.UUID | None = None,
    dimension_id: uuid.UUID | None = None,
    destacados: bool = False,
):
    """Galería pública de testimonios comunitarios aprobados y destacados de Cartagena."""
    return await service.listar_publicos(
        territorio_id=territorio_id,
        dimension_id=dimension_id,
        solo_destacados=destacados,
    )


@router.post(
    "",
    response_model=TestimonioLectura,
    status_code=status.HTTP_201_CREATED,
)
async def crear_testimonio(
    datos: TestimonioCrear,
    sujeto: SujetoAutenticadoDep,
    service: TestimoniosServiceDep,
):
    """Registra un nuevo relato de memoria social. Ingresa a la cola en estado PENDIENTE."""
    return await service.crear_testimonio(datos, sujeto_id=sujeto.sujeto_id)


@router.get("/resumen", response_model=ResumenTestimonios)
async def obtener_resumen_testimonios(service: TestimoniosServiceDep):
    """Métricas consolidadas de testimonios por estado y distribución territorial."""
    return await service.obtener_resumen_metricas()


@router.get(
    "/gestion",
    response_model=list[TestimonioLectura],
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def listar_testimonios_gestion(
    service: TestimoniosServiceDep,
    estado: str | None = None,
    territorio_id: uuid.UUID | None = None,
):
    """Panel de curaduría y moderación para funcionarios institucionales."""
    return await service.listar_gestion(estado=estado, territorio_id=territorio_id)


@router.get(
    "/gestion/{id}",
    response_model=TestimonioLectura,
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def obtener_testimonio_gestion(id: uuid.UUID, service: TestimoniosServiceDep):
    return await service.obtener_gestion_por_id(id)


@router.get("/{id}", response_model=TestimonioLectura)
async def obtener_testimonio(
    id: uuid.UUID,
    service: TestimoniosServiceDep,
):
    """Consulta individual de un testimonio comunitario."""
    return await service.obtener_por_id(id)


@router.put(
    "/{id}",
    response_model=TestimonioLectura,
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def editar_testimonio(
    id: uuid.UUID, datos: TestimonioEdicion, service: TestimoniosServiceDep
):
    """Edición de contenido desde el panel institucional de testimonios."""
    return await service.editar_testimonio(id=id, datos=datos)


@router.put(
    "/{id}/moderar",
    response_model=TestimonioLectura,
    dependencies=[Depends(requerir_permiso("testimonios:moderar", nivel_minimo="declarada"))],
)
async def moderar_testimonio(
    id: uuid.UUID,
    moderacion: TestimonioModeracion,
    sujeto: SujetoAutenticadoDep,
    service: TestimoniosServiceDep,
):
    """Aprobación, destaque o rechazo motivado de un testimonio comunitario."""
    return await service.moderar_testimonio(
        id=id,
        moderacion=moderacion,
        moderador_id=sujeto.sujeto_id,
    )
