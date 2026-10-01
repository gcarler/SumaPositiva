import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.indicadores.repository import IndicadoresRepository
from app.modules.indicadores.schemas import (
    CadenaValorRespuesta,
    FichaIndicadorCrear,
    FichaIndicadorRespuesta,
    MedicionIndicadorCrear,
    MedicionIndicadorRespuesta,
)
from app.modules.indicadores.service import IndicadoresService

router = APIRouter(prefix="/indicadores", tags=["Indicadores"])


def get_indicadores_service(session: SessionDependency) -> IndicadoresService:
    return IndicadoresService(IndicadoresRepository(session))


IndicadoresServiceDep = Annotated[IndicadoresService, Depends(get_indicadores_service)]


@router.get("/fichas", response_model=list[FichaIndicadorRespuesta])
async def listar_fichas(service: IndicadoresServiceDep):
    return await service.listar_fichas()


@router.get("/fichas/{id}", response_model=FichaIndicadorRespuesta)
async def obtener_ficha(id: uuid.UUID, service: IndicadoresServiceDep):
    ficha = await service.obtener_ficha(id)
    if not ficha:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ficha no encontrada")
    return ficha


@router.post(
    "/fichas",
    response_model=FichaIndicadorRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("indicadores:gestionar", nivel_minimo="declarada"))],
)
async def crear_ficha(datos: FichaIndicadorCrear, service: IndicadoresServiceDep):
    return await service.crear_ficha(datos)


@router.post(
    "/fichas/{id}/mediciones",
    response_model=MedicionIndicadorRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_permiso("indicadores:gestionar", nivel_minimo="declarada"))],
)
async def registrar_medicion(
    id: uuid.UUID, datos: MedicionIndicadorCrear, service: IndicadoresServiceDep
):
    return await service.registrar_medicion(id, datos)


@router.get("/cadena-valor", response_model=CadenaValorRespuesta)
async def obtener_cadena_valor(service: IndicadoresServiceDep):
    return await service.obtener_cadena_valor()
