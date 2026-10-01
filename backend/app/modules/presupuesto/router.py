import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.presupuesto.repository import PresupuestoRepository
from app.modules.presupuesto.schemas import (
    AsignacionPresupuestalCrear,
    AsignacionPresupuestalRespuesta,
    FuenteFinanciacionRespuesta,
    ResumenCosteo,
)
from app.modules.presupuesto.service import PresupuestoService

router = APIRouter(prefix="/presupuesto", tags=["Presupuesto"])


def get_presupuesto_service(session: SessionDependency) -> PresupuestoService:
    return PresupuestoService(PresupuestoRepository(session))


PresupuestoServiceDep = Annotated[PresupuestoService, Depends(get_presupuesto_service)]


@router.get("/fuentes", response_model=list[FuenteFinanciacionRespuesta])
async def listar_fuentes(service: PresupuestoServiceDep):
    return await service.listar_fuentes()


@router.get("/fuentes/{id}", response_model=FuenteFinanciacionRespuesta)
async def obtener_fuente(id: uuid.UUID, service: PresupuestoServiceDep):
    fuente = await service.obtener_fuente(id)
    if not fuente:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fuente no encontrada")
    return fuente


@router.post(
    "/asignaciones",
    response_model=AsignacionPresupuestalRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("presupuesto:gestionar", nivel_minimo="declarada"))],
)
async def crear_asignacion(datos: AsignacionPresupuestalCrear, service: PresupuestoServiceDep):
    return await service.crear_asignacion(datos)


@router.get("/asignaciones", response_model=list[AsignacionPresupuestalRespuesta])
async def listar_asignaciones(service: PresupuestoServiceDep):
    return await service.listar_asignaciones()


@router.get("/resumen-costeo", response_model=ResumenCosteo)
async def obtener_resumen_costeo(service: PresupuestoServiceDep):
    return await service.obtener_resumen_costeo()
