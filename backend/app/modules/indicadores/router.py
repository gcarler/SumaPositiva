import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDependency
from app.modules.identidad.deps import requerir_permiso
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.indicadores.catalogo_polis import (
    CatalogoIndicadoresInvalido,
    leer_catalogo_indicadores,
)
from app.modules.indicadores.repository import IndicadoresRepository
from app.modules.indicadores.schemas import (
    CadenaValorRespuesta,
    CatalogoIndicadoresRespuesta,
    CatalogoIndicadorRead,
    FichaIndicadorActualizar,
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


@router.get(
    "/catalogo",
    response_model=CatalogoIndicadoresRespuesta,
    summary="Catálogo metodológico de indicadores de seguridad humana",
    description=(
        "Devuelve el catálogo validado de indicadores con su fórmula, denominador,"
        " fuente, URL, custodio, licencia, año base y estado. No calcula valores."
    ),
)
async def obtener_catalogo_indicadores(
    dimension: str | None = None,
    tier: str | None = None,
    busqueda: str | None = None,
) -> CatalogoIndicadoresRespuesta:
    try:
        filas, archivo_sha256 = leer_catalogo_indicadores()
    except (CatalogoIndicadoresInvalido, FileNotFoundError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "El catálogo metodológico de indicadores no está disponible "
                "temporalmente por un problema de estructura."
            ),
        ) from error
    texto_busqueda = (busqueda or "").strip().lower()
    items = []
    for fila in filas:
        if dimension and fila.get("dimension", "").strip().upper() != dimension.strip().upper():
            continue
        if tier and fila.get("tier", "").strip().upper() != tier.strip().upper():
            continue
        if texto_busqueda:
            texto = " ".join(fila.values()).lower()
            if texto_busqueda not in texto:
                continue
        items.append(CatalogoIndicadorRead.model_validate(fila))
    return CatalogoIndicadoresRespuesta(
        total=len(items),
        archivo_sha256=archivo_sha256,
        indicadores=items,
    )


@router.get("/fichas", response_model=list[FichaIndicadorRespuesta])
async def listar_fichas(service: IndicadoresServiceDep):
    return await service.listar_fichas()


@router.get("/fichas/{id}", response_model=FichaIndicadorRespuesta)
async def obtener_ficha(id: uuid.UUID, service: IndicadoresServiceDep):
    ficha = await service.obtener_ficha(id)
    if not ficha:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ficha no encontrada")
    return ficha


@router.patch("/fichas/{id}", response_model=FichaIndicadorRespuesta)
async def actualizar_ficha(
    id: uuid.UUID,
    datos: FichaIndicadorActualizar,
    sujeto: Annotated[
        SujetoAutenticadoContexto,
        Depends(requerir_permiso("indicadores:gestionar", nivel_minimo="declarada")),
    ],
    service: IndicadoresServiceDep,
):
    """Actualiza metadatos institucionales de la ficha técnica salvaguardando la fórmula matemática y línea base."""
    return await service.actualizar_ficha(id, datos, usuario_id=sujeto.sujeto_id)


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
async def registrar_medicion(id: uuid.UUID, datos: MedicionIndicadorCrear, service: IndicadoresServiceDep):
    return await service.registrar_medicion(id, datos)


@router.get("/cadena-valor", response_model=CadenaValorRespuesta)
async def obtener_cadena_valor(service: IndicadoresServiceDep):
    return await service.obtener_cadena_valor()
