import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.database import SessionDependency
from app.modules.actores.schemas import (
    ActorEstrategicoActualizar,
    ActorEstrategicoCrear,
    ActorEstrategicoRespuesta,
    KpisActoresRespuesta,
)
from app.modules.actores.service import ActoresService
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso

router = APIRouter(prefix="/actores", tags=["Mapeo de Actores Estratégicos"])


def get_actores_service(session: SessionDependency) -> ActoresService:
    return ActoresService(session)


ActoresServiceDep = Annotated[ActoresService, Depends(get_actores_service)]


@router.get("", response_model=list[ActorEstrategicoRespuesta])
async def listar_actores(
    service: ActoresServiceDep,
    tipo: str | None = Query(default=None),
    territorio: str | None = Query(default=None),
    es_demostracion: bool | None = Query(default=None),
    buscar: str | None = Query(default=None),
):
    """Consulta el catálogo oficial de actores estratégicos mapeados en el Distrito."""
    return await service.listar_actores(
        tipo=tipo,
        territorio=territorio,
        es_demostracion=es_demostracion,
        buscar=buscar,
    )


@router.get("/kpis", response_model=KpisActoresRespuesta)
async def obtener_kpis(service: ActoresServiceDep):
    """Retorna los KPIs agregados por tipo, territorio y postura del mapeo de actores."""
    return await service.obtener_kpis()


@router.get("/{id}", response_model=ActorEstrategicoRespuesta)
async def obtener_actor(id: uuid.UUID, service: ActoresServiceDep):
    """Consulta la ficha técnica de un actor estratégico por su identificador único."""
    return await service.obtener_por_id(id)


@router.post(
    "",
    response_model=ActorEstrategicoRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def crear_actor(
    datos: ActorEstrategicoCrear,
    service: ActoresServiceDep,
    sujeto: SujetoAutenticadoDep,
):
    """Registra un nuevo actor estratégico con auditoría inmutable de procedencia."""
    return await service.crear_actor(datos, usuario_id=sujeto.sujeto_id)


@router.put(
    "/{id}",
    response_model=ActorEstrategicoRespuesta,
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def actualizar_actor(
    id: uuid.UUID,
    cambios: ActorEstrategicoActualizar,
    service: ActoresServiceDep,
    sujeto: SujetoAutenticadoDep,
):
    """Actualiza los datos o postura de un actor estratégico con registro de auditoría."""
    return await service.actualizar_actor(id, cambios, usuario_id=sujeto.sujeto_id)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(requerir_permiso("politicas:gestionar", "declarada"))],
)
async def eliminar_actor(
    id: uuid.UUID,
    service: ActoresServiceDep,
    sujeto: SujetoAutenticadoDep,
):
    """Elimina un actor estratégico del catálogo con registro de auditoría forense."""
    await service.eliminar_actor(id, usuario_id=sujeto.sujeto_id)
