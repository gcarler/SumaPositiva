import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import SessionDependency
from app.modules.geodatos.schemas import (
    CapaGeovisorRead,
    DireccionEstandarizadaResponse,
    EstandarizarDireccionRequest,
    HurtosFeatureCollection,
    IsocronasFeatureCollection,
    ResumenHurtosResponse,
    TerritorioRead,
)
from app.modules.geodatos.repository import GeodatosRepository
from app.modules.geodatos.service import GeodatosService

router = APIRouter(prefix="/geodatos", tags=["geovisor-territorial"])


def get_geodatos_service(session: SessionDependency) -> GeodatosService:
    return GeodatosService(GeodatosRepository(session))


GeodatosServiceDep = Annotated[GeodatosService, Depends(get_geodatos_service)]


@router.get("/territorios", response_model=list[TerritorioRead])
async def listar_territorios(
    service: GeodatosServiceDep,
    tipo_territorio: str | None = None,
    es_zona_etnica: bool | None = None,
):
    return await service.listar_territorios(tipo_territorio, es_zona_etnica)


@router.get("/territorios/geojson")
async def obtener_territorios_geojson(service: GeodatosServiceDep):
    return await service.obtener_territorios_geojson()


@router.get("/territorios/buscar-por-coordenada", response_model=list[TerritorioRead])
async def buscar_por_coordenada(
    service: GeodatosServiceDep,
    lon: float = Query(..., description="Longitud WGS84 EPSG:4326"),
    lat: float = Query(..., description="Latitud WGS84 EPSG:4326"),
):
    return await service.buscar_por_coordenada(lon, lat)


@router.get("/territorios/{id}", response_model=TerritorioRead)
async def obtener_territorio(id: uuid.UUID, service: GeodatosServiceDep):
    territorio = await service.obtener_territorio(id)
    if not territorio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Territorio no encontrado")
    return territorio


@router.get("/capas", response_model=list[CapaGeovisorRead])
async def listar_capas(service: GeodatosServiceDep):
    return await service.listar_capas()


@router.post(
    "/estandarizar-direccion",
    response_model=DireccionEstandarizadaResponse,
    summary="Estandarizar y normalizar dirección cartagenera con PostGIS",
    description="Estandariza nomenclaturas formales y sectores populares de Cartagena vinculando territorios y coordenadas.",
)
async def estandarizar_direccion(
    payload: EstandarizarDireccionRequest,
    service: GeodatosServiceDep,
) -> DireccionEstandarizadaResponse:
    return await service.estandarizar_direccion(payload.direccion_raw)


@router.get(
    "/isocronas",
    response_model=IsocronasFeatureCollection,
    summary="Cálculo de isócronas de accesibilidad y ruteo de seguridad humana",
    description=(
        "Genera polígonos de isócronas de cobertura temporal (5, 10, 15 min) a pie o vehículo "
        "calculando la proximidad al nodo de seguridad ciudadana o salud más cercano mediante PostGIS y pgRouting."
    ),
)
async def calcular_isocronas(
    service: GeodatosServiceDep,
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitud WGS84 EPSG:4326"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitud WGS84 EPSG:4326"),
    modo: str = Query(
        default="pie",
        pattern="^(pie|vehiculo)$",
        description="Modo de desplazamiento: 'pie' (~4.5 km/h) o 'vehiculo' (~25 km/h)",
    ),
    minutos: str = Query(
        default="5,10,15",
        description="Intervalos temporales en minutos separados por coma (ej. '5,10,15')",
    ),
) -> IsocronasFeatureCollection:
    return await service.calcular_isocronas(lon=lon, lat=lat, modo=modo, minutos_str=minutos)


@router.get(
    "/analitica/hurtos/resumen",
    response_model=ResumenHurtosResponse,
    summary="Resumen analítico y series temporales de hurtos en Cartagena (2018-2026)",
    description=(
        "Retorna estadísticas acumuladas, series temporal anual 2018-2026, distribución mensual, "
        "top 5 armas/medios empleados, top 5 clases de sitio y distribución urbana vs rural."
    ),
)
async def obtener_resumen_hurtos(
    service: GeodatosServiceDep,
    delito: str | None = Query(
        default=None,
        description="Delito: 'HURTO MOTOCICLETA', 'HURTO RESIDENCIAS', 'HURTO COMERCIO' o variantes",
    ),
    anio: int | None = Query(
        default=None,
        ge=2018,
        le=2026,
        description="Año analizado (2018 a 2026) o omitir para consolidado histórico",
    ),
    zona: str | None = Query(
        default=None,
        pattern="^(URBANA|RURAL|urbana|rural)$",
        description="Filtro de zona: 'URBANA' o 'RURAL'",
    ),
) -> ResumenHurtosResponse:
    return await service.obtener_resumen_hurtos(delito=delito, anio=anio, zona=zona)


@router.get(
    "/analitica/hurtos/geojson",
    response_model=HurtosFeatureCollection,
    summary="Capas GeoJSON ligeras de polígonos urbano y rural con estadísticas de hurtos",
    description=(
        "Retorna FeatureCollection (< 150 KB) con las geometrías base de Cartagena EPSG:4326 "
        "y sus propiedades analíticas calculadas (totales, densidad km2, participación y tops)."
    ),
)
async def obtener_poligonos_hurtos_geojson(
    service: GeodatosServiceDep,
    delito: str | None = Query(
        default=None,
        description="Delito: 'HURTO MOTOCICLETA', 'HURTO RESIDENCIAS', 'HURTO COMERCIO'",
    ),
    anio: int | None = Query(
        default=None,
        ge=2018,
        le=2026,
        description="Año analizado o omitir para consolidado histórico",
    ),
    zona: str | None = Query(
        default=None,
        pattern="^(URBANA|RURAL|urbana|rural)$",
        description="Filtro de zona: 'URBANA' o 'RURAL'",
    ),
) -> HurtosFeatureCollection:
    return await service.obtener_poligonos_hurtos_geojson(delito=delito, anio=anio, zona=zona)

