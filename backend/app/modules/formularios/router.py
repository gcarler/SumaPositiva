import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.database import SessionDependency
from app.modules.formularios.constructor_schemas import DocumentoFormulario
from app.modules.formularios.constructor_service import ConstructorService
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


@router.get("/publicos", response_model=list[DocumentoFormulario], response_model_exclude_none=True)
async def listar_publicos(session: SessionDependency):
    return await ConstructorService(session).listar(publico=True)


@router.get(
    "/publicos/{slug}", response_model=DocumentoFormulario, response_model_exclude_none=True
)
async def obtener_publico(slug: str, session: SessionDependency):
    return await ConstructorService(session).obtener(slug, publico=True)


@router.get(
    "/constructor",
    response_model=list[DocumentoFormulario],
    response_model_exclude_none=True,
    dependencies=[Depends(requerir_permiso("formularios:leer", nivel_minimo="declarada"))],
)
async def listar_constructor(session: SessionDependency):
    return await ConstructorService(session).listar()


@router.get(
    "/constructor/slug/{slug}",
    response_model=DocumentoFormulario,
    response_model_exclude_none=True,
    dependencies=[Depends(requerir_permiso("formularios:leer", nivel_minimo="declarada"))],
)
async def obtener_constructor(slug: str, session: SessionDependency):
    return await ConstructorService(session).obtener(slug)


@router.post(
    "/constructor",
    response_model=DocumentoFormulario,
    response_model_exclude_none=True,
    status_code=201,
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def crear_constructor(datos: DocumentoFormulario, session: SessionDependency):
    return await ConstructorService(session).guardar(datos)


@router.put(
    "/constructor/{id}",
    response_model=DocumentoFormulario,
    response_model_exclude_none=True,
    dependencies=[Depends(requerir_permiso("formularios:gestionar", nivel_minimo="declarada"))],
)
async def actualizar_constructor(
    id: uuid.UUID, datos: DocumentoFormulario, session: SessionDependency
):
    return await ConstructorService(session).guardar(datos, id)


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
    dependencies=[Depends(requerir_permiso("formularios:leer", nivel_minimo="declarada"))],
)
async def listar_respuestas(
    id: uuid.UUID,
    service: FormularioServiceDep,
):
    return await service.listar_respuestas(id)


@router.get(
    "/{id}/analitica",
    response_model=AnaliticaFormularioRespuesta,
    dependencies=[Depends(requerir_permiso("formularios:leer", nivel_minimo="declarada"))],
)
async def obtener_analitica(
    id: uuid.UUID,
    service: FormularioServiceDep,
):
    return await service.obtener_analitica(id)
