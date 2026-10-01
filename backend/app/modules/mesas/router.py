import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.mesas.repository import MesaRepository
from app.modules.mesas.schemas import (
    ActaCierre,
    ActaCrear,
    ActaRespuesta,
    MesaCrear,
    MesaRespuesta,
    ParticipanteCrear,
    ParticipanteRespuesta,
    SubMesaCrear,
)
from app.modules.mesas.service import MesaService

router = APIRouter(prefix="/mesas", tags=["mesas-trabajo"])


def get_mesa_service(session: SessionDependency) -> MesaService:
    return MesaService(MesaRepository(session))


MesaServiceDep = Annotated[MesaService, Depends(get_mesa_service)]


@router.post(
    "",
    response_model=MesaRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada"))],
)
async def crear_mesa(datos: MesaCrear, service: MesaServiceDep):
    return await service.crear_mesa_raiz(datos)


@router.post(
    "/{mesa_id}/submesas",
    response_model=MesaRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("mesas:abrir", nivel_minimo="declarada"))],
)
async def crear_submesa(mesa_id: uuid.UUID, datos: SubMesaCrear, service: MesaServiceDep):
    return await service.crear_submesa(mesa_id, datos)


@router.get("", response_model=list[MesaRespuesta])
async def listar_mesas(
    service: MesaServiceDep,
    tipo_mesa: str | None = None,
    estado: str | None = None,
    fecha: date | None = None,
    territorio_id: uuid.UUID | None = None,
    ancestro_ruta: str | None = None,
):
    return await service.listar_mesas(tipo_mesa, estado, fecha, territorio_id, ancestro_ruta)


@router.get("/{mesa_id}", response_model=MesaRespuesta)
async def obtener_mesa(mesa_id: uuid.UUID, service: MesaServiceDep):
    return await service.obtener_mesa(mesa_id)


@router.get("/{mesa_id}/submesas", response_model=list[MesaRespuesta])
async def obtener_submesas(mesa_id: uuid.UUID, service: MesaServiceDep):
    return await service.listar_submesas(mesa_id)


# --- Endpoints de Participantes ---


@router.post(
    "/{mesa_id}/participantes",
    response_model=ParticipanteRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("asistencia:verificar", nivel_minimo="declarada"))],
)
async def registrar_participante(
    mesa_id: uuid.UUID, datos: ParticipanteCrear, service: MesaServiceDep
):
    return await service.registrar_participante(mesa_id, datos)


@router.get(
    "/{mesa_id}/participantes",
    response_model=list[ParticipanteRespuesta],
    dependencies=[Depends(requerir_permiso("asistencia:verificar", nivel_minimo="declarada"))],
)
async def listar_participantes(mesa_id: uuid.UUID, service: MesaServiceDep):
    return await service.listar_participantes(mesa_id)


# --- Endpoints de Actas Comunitarias ---


@router.post(
    "/{mesa_id}/acta",
    response_model=ActaRespuesta,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(requerir_permiso("mesas:acuerdos", nivel_minimo="declarada"))],
)
async def crear_o_actualizar_acta(mesa_id: uuid.UUID, datos: ActaCrear, service: MesaServiceDep):
    return await service.crear_o_actualizar_borrador_acta(mesa_id, datos)


@router.post(
    "/{mesa_id}/acta/cerrar",
    response_model=ActaRespuesta,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(requerir_permiso("mesas:acuerdos", nivel_minimo="declarada"))],
)
async def cerrar_acta(
    mesa_id: uuid.UUID, service: MesaServiceDep, datos_cierre: ActaCierre | None = None
):
    return await service.cerrar_acta(mesa_id, datos_cierre)


@router.get("/{mesa_id}/acta", response_model=ActaRespuesta)
async def obtener_acta(mesa_id: uuid.UUID, service: MesaServiceDep):
    return await service.obtener_acta(mesa_id)
