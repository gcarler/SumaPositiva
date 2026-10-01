import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.instrumentos.repository import InstrumentoRepository
from app.modules.instrumentos.schemas import (
    ArbolSerializado,
    ConversionObjetivosPeticion,
    InstrumentoActualizar,
    InstrumentoCrear,
    InstrumentoRespuesta,
    NodoInstrumentoActualizar,
    NodoInstrumentoCrear,
    NodoInstrumentoRespuesta,
)
from app.modules.instrumentos.service import InstrumentoService

router = APIRouter(prefix="/instrumentos", tags=["motor-instrumentos-mga"])


def get_instrumento_service(session: SessionDependency) -> InstrumentoService:
    return InstrumentoService(InstrumentoRepository(session))


InstrumentoServiceDep = Annotated[InstrumentoService, Depends(get_instrumento_service)]


@router.post(
    "",
    response_model=InstrumentoRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def crear_instrumento(datos: InstrumentoCrear, service: InstrumentoServiceDep):
    return await service.crear_instrumento(datos)


@router.get("", response_model=list[InstrumentoRespuesta])
async def listar_instrumentos(
    service: InstrumentoServiceDep,
    mesa_id: uuid.UUID | None = None,
    tipo_instrumento: str | None = None,
    estado: str | None = None,
):
    return await service.listar_instrumentos(mesa_id, tipo_instrumento, estado)


@router.get("/{instrumento_id}", response_model=InstrumentoRespuesta)
async def obtener_instrumento(instrumento_id: uuid.UUID, service: InstrumentoServiceDep):
    return await service.obtener_instrumento(instrumento_id)


@router.put(
    "/{instrumento_id}",
    response_model=InstrumentoRespuesta,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def actualizar_instrumento(
    instrumento_id: uuid.UUID, datos: InstrumentoActualizar, service: InstrumentoServiceDep
):
    return await service.actualizar_instrumento(instrumento_id, datos)


@router.delete(
    "/{instrumento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def eliminar_instrumento(instrumento_id: uuid.UUID, service: InstrumentoServiceDep):
    await service.eliminar_instrumento(instrumento_id)


# --- Endpoints de Árbol y Nodos ---


@router.get("/{instrumento_id}/arbol", response_model=ArbolSerializado)
async def serializar_arbol(instrumento_id: uuid.UUID, service: InstrumentoServiceDep):
    return await service.serializar_arbol(instrumento_id)


@router.post(
    "/{instrumento_id}/nodos",
    response_model=NodoInstrumentoRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def agregar_nodo(
    instrumento_id: uuid.UUID, datos: NodoInstrumentoCrear, service: InstrumentoServiceDep
):
    return await service.agregar_nodo(instrumento_id, datos)


@router.put(
    "/{instrumento_id}/nodos/{nodo_id}",
    response_model=NodoInstrumentoRespuesta,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def actualizar_nodo(
    instrumento_id: uuid.UUID,
    nodo_id: uuid.UUID,
    datos: NodoInstrumentoActualizar,
    service: InstrumentoServiceDep,
    response: Response,
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
):
    res = await service.actualizar_nodo(instrumento_id, nodo_id, datos, if_match)
    if res.etag:
        response.headers["ETag"] = res.etag
    return res


@router.delete(
    "/{instrumento_id}/nodos/{nodo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def eliminar_nodo(
    instrumento_id: uuid.UUID, nodo_id: uuid.UUID, service: InstrumentoServiceDep
):
    await service.eliminar_nodo(instrumento_id, nodo_id)


# --- Conversión MGA DNP: Árbol de Problemas a Árbol de Objetivos ---


@router.post(
    "/{instrumento_id}/convertir-a-objetivos",
    response_model=ArbolSerializado,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("instrumentos:gestionar", nivel_minimo="declarada"))],
)
async def convertir_a_objetivos(
    instrumento_id: uuid.UUID,
    service: InstrumentoServiceDep,
    peticion: ConversionObjetivosPeticion | None = None,
):
    peticion_valida = peticion or ConversionObjetivosPeticion()
    return await service.convertir_a_objetivos(instrumento_id, peticion_valida)
