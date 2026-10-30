import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.database import SessionDependency
from app.modules.comunicaciones.schemas import (
    TareaComunicacionActualizar,
    TareaComunicacionCrear,
    TareaComunicacionLectura,
)
from app.modules.comunicaciones.service import ComunicacionesService
from app.modules.identidad.deps import requerir_permiso
from app.modules.identidad.schemas import SujetoAutenticadoContexto

router = APIRouter(prefix="/comunicaciones", tags=["Comunicaciones y Cronograma"])


def get_comunicaciones_service(session: SessionDependency) -> ComunicacionesService:
    return ComunicacionesService(session)


ComunicacionesServiceDep = Annotated[ComunicacionesService, Depends(get_comunicaciones_service)]
PuedeLeerComunicaciones = Depends(requerir_permiso("comunicaciones:leer", nivel_minimo="declarada"))
PuedeGestionarComunicaciones = Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada"))
# Herald Fase 2: el sujeto autenticado se inyecta para enviar el comprobante
# de gestión al comunicador que ejecuta la acción.
PuedeGestionarComunicacionesSujeto = Annotated[
    SujetoAutenticadoContexto,
    Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada")),
]


@router.get(
    "/tareas",
    response_model=list[TareaComunicacionLectura],
    dependencies=[PuedeLeerComunicaciones],
)
async def listar_tareas(
    service: ComunicacionesServiceDep,
    etapa: str | None = None,
    estado: str | None = None,
):
    """Lista las tareas y actividades del cronograma de comunicaciones."""
    return await service.listar(etapa=etapa, estado=estado)


@router.get(
    "/tareas/{id}",
    response_model=TareaComunicacionLectura,
    dependencies=[PuedeLeerComunicaciones],
)
async def obtener_tarea(
    id: uuid.UUID,
    service: ComunicacionesServiceDep,
):
    """Obtiene el detalle de una tarea específica del cronograma."""
    return await service.obtener(id)


@router.post(
    "/tareas",
    response_model=TareaComunicacionLectura,
    status_code=status.HTTP_201_CREATED,
)
async def crear_tarea(
    datos: TareaComunicacionCrear,
    service: ComunicacionesServiceDep,
    sujeto: PuedeGestionarComunicacionesSujeto,
):
    """Crea una nueva tarea en el cronograma de comunicaciones."""
    return await service.crear(datos, sujeto)


@router.put(
    "/tareas/{id}",
    response_model=TareaComunicacionLectura,
)
async def actualizar_tarea(
    id: uuid.UUID,
    datos: TareaComunicacionActualizar,
    service: ComunicacionesServiceDep,
    sujeto: PuedeGestionarComunicacionesSujeto,
):
    """Actualiza una tarea del cronograma (fechas, entregables, descripción, estado)."""
    return await service.actualizar(id, datos, sujeto)


@router.patch(
    "/tareas/{id}",
    response_model=TareaComunicacionLectura,
)
async def parchear_tarea(
    id: uuid.UUID,
    datos: TareaComunicacionActualizar,
    service: ComunicacionesServiceDep,
    sujeto: PuedeGestionarComunicacionesSujeto,
):
    """Actualización parcial de una tarea del cronograma."""
    return await service.actualizar(id, datos, sujeto)


@router.delete(
    "/tareas/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[PuedeGestionarComunicaciones],
)
async def eliminar_tarea(
    id: uuid.UUID,
    service: ComunicacionesServiceDep,
):
    """Elimina una tarea del cronograma."""
    await service.eliminar(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
