import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.database import SessionDependency
from app.modules.formularios.schemas import (
    AnaliticaFormularioRespuesta,
    FormularioActualizar,
    FormularioCrear,
    FormularioRespuesta,
    RespuestaFormularioCrear,
    RespuestaFormularioLectura,
)
from app.modules.formularios.service import FormularioService
from app.modules.identidad.deps import SujetoAutenticadoDep, requerir_permiso

router = APIRouter(prefix="/formularios", tags=["Formularios y Consultas"])


def get_formulario_service(session: SessionDependency) -> FormularioService:
    return FormularioService(session)


FormularioServiceDep = Annotated[FormularioService, Depends(get_formulario_service)]


@router.get("", response_model=list[FormularioRespuesta])
async def listar_formularios(
    service: FormularioServiceDep,
    estado: str | None = None,
    dimension_id: uuid.UUID | None = None,
    territorio_id: uuid.UUID | None = None,
):
    return await service.listar_formularios(estado, dimension_id, territorio_id)


@router.post(
    "",
    response_model=FormularioRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def crear_formulario(
    datos: FormularioCrear,
    service: FormularioServiceDep,
):
    return await service.crear_formulario(datos)


@router.get("/{id}", response_model=FormularioRespuesta)
async def obtener_formulario(
    id: uuid.UUID,
    service: FormularioServiceDep,
):
    return await service.obtener_formulario(id)


@router.put(
    "/{id}",
    response_model=FormularioRespuesta,
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def actualizar_formulario(
    id: uuid.UUID,
    datos: FormularioActualizar,
    service: FormularioServiceDep,
):
    return await service.actualizar_formulario(id, datos)


@router.delete(
    "/{id}",
    response_model=dict[str, str],
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def eliminar_formulario(
    id: uuid.UUID,
    service: FormularioServiceDep,
):
    return await service.eliminar_formulario(id)


@router.post(
    "/{id}/respuestas",
    response_model=RespuestaFormularioLectura,
    status_code=status.HTTP_201_CREATED,
)
async def enviar_respuesta(
    id: uuid.UUID,
    datos: RespuestaFormularioCrear,
    sujeto: SujetoAutenticadoDep,
    service: FormularioServiceDep,
):
    return await service.enviar_respuesta(id, sujeto.sujeto_id, datos)


@router.get(
    "/{id}/respuestas",
    response_model=list[RespuestaFormularioLectura],
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def listar_respuestas(
    id: uuid.UUID,
    service: FormularioServiceDep,
):
    return await service.listar_respuestas(id)


@router.get(
    "/{id}/analitica",
    response_model=AnaliticaFormularioRespuesta,
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def obtener_analitica(
    id: uuid.UUID,
    service: FormularioServiceDep,
):
    return await service.obtener_analitica(id)
