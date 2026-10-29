import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import SessionDependency
from app.modules.geodatos.repository import GeodatosRepository
from app.modules.geodatos.schemas import (
    CapaGeovisorRead,
    DireccionEstandarizadaResponse,
    EstandarizarDireccionRequest,
    ExploradorHurtosResponse,
    HurtosFeatureCollection,
    IndicadoresTerritorioResponse,
    IndicadorTerritorioDetalladoRead,
    IsocronasFeatureCollection,
    ResumenHurtosResponse,
    TerritorioRead,
)
from app.modules.geodatos.service import GeodatosService

router = APIRouter(prefix="/geodatos", tags=["geovisor-territorial"])


def get_geodatos_service(session: SessionDependency) -> GeodatosService:
    return GeodatosService(GeodatosRepository(session))


GeodatosServiceDep = Annotated[GeodatosService, Depends(get_geodatos_service)]


@router.get("/territorios", response_model=list[TerritorioRead])
async def listar_territorios(
    service: GeodatosServiceDep,
    tipo_territorio: str | None = Query(None, description="Tipo de territorio"),
    tipo: str | None = Query(None, description="Alias tipo"),
    es_zona_etnica: bool | None = Query(None, description="Zona étnica"),
):
    tipo_final = tipo_territorio if tipo_territorio is not None else tipo
    return await service.listar_territorios(tipo_final, es_zona_etnica)


@router.get("/territorios/geojson")
async def obtener_territorios_geojson(
    service: GeodatosServiceDep,
    tipo: str | None = Query(None, description="Filtrar por tipo de territorio"),
    tipo_territorio: str | None = Query(None, description="Alias de tipo de territorio"),
    busqueda: str | None = Query(None, description="Búsqueda por nombre o código"),
    es_zona_sat: bool | None = Query(None, description="Filtrar por zona SAT"),
    alerta_sat: bool | None = Query(None, description="Alias de zona SAT"),
    es_zona_etnica: bool | None = Query(None, description="Filtrar por zona étnica"),
):
    tipo_final = tipo_territorio if tipo_territorio is not None else tipo
    sat_final = es_zona_sat if es_zona_sat is not None else alerta_sat
    return await service.obtener_territorios_geojson(
        tipo_territorio=tipo_final,
        busqueda=busqueda,
        es_zona_sat=sat_final,
        es_zona_etnica=es_zona_etnica,
    )


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


@router.get(
    "/indicadores",
    response_model=IndicadoresTerritorioResponse,
    summary="Consultar banco multifuente de indicadores territoriales",
    description=(
        "Permite consultar y filtrar indicadores del Geovisor por territorio, dimensión de seguridad humana, "
        "fuente oficial de datos y año de corte."
    ),
)
async def listar_indicadores(
    service: GeodatosServiceDep,
    territorio_id: Annotated[uuid.UUID | None, Query(description="UUID del territorio")] = None,
    codigo_territorio: Annotated[
        str | None, Query(description="Código del territorio (ej. DISTRITO-CTG, LOC-1)")
    ] = None,
    dimension: Annotated[
        str | None, Query(description="Dimensión (código o nombre: personal, salud, economica, etc.)")
    ] = None,
    fuente_datos: Annotated[
        str | None, Query(description="Filtro por entidad o fuente (DANE, Medicina Legal, ICBF, etc.)")
    ] = None,
    anio_corte: Annotated[int | None, Query(description="Año de corte del indicador")] = None,
    codigo_indicador: Annotated[str | None, Query(description="Código del indicador o patrón")] = None,
    busqueda: Annotated[str | None, Query(description="Búsqueda de texto en nombre de indicador")] = None,
    limit: Annotated[int, Query(ge=1, le=1000, description="Límite de registros por página")] = 100,
    offset: Annotated[int, Query(ge=0, description="Desplazamiento para paginación")] = 0,
) -> IndicadoresTerritorioResponse:
    return await service.listar_indicadores(
        territorio_id=territorio_id,
        codigo_territorio=codigo_territorio,
        dimension=dimension,
        fuente_datos=fuente_datos,
        anio_corte=anio_corte,
        codigo_indicador=codigo_indicador,
        busqueda=busqueda,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/territorios/{id}/indicadores",
    response_model=list[IndicadorTerritorioDetalladoRead],
    summary="Obtener todos los indicadores de un territorio específico",
)
async def obtener_indicadores_territorio(
    id: uuid.UUID,
    service: GeodatosServiceDep,
    dimension: Annotated[str | None, Query(description="Dimensión de seguridad humana opcional")] = None,
    anio_corte: Annotated[int | None, Query(description="Año de corte opcional")] = None,
    busqueda: Annotated[str | None, Query(description="Búsqueda de texto en nombre de indicador")] = None,
) -> list[IndicadorTerritorioDetalladoRead]:
    res = await service.listar_indicadores(
        territorio_id=id,
        dimension=dimension,
        anio_corte=anio_corte,
        busqueda=busqueda,
        limit=1000,
        offset=0,
    )
    return res.indicadores


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
        "calculando la proximidad al nodo de seguridad ciudadana o salud más cercano mediante PostGIS y buffer euclidiano geodésico."
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


@router.get(
    "/analitica/hurtos/registros",
    response_model=ExploradorHurtosResponse,
    summary="Exploración tabular, filtrado multicriterio y pivot analítico de hurtos",
    description=(
        "Permite paginar los 12.280 registros de hurtos, aplicar filtros cruzados "
        "(delito, año, mes, día, armas, sitio, zona, texto) y agrupar dinámicamente por cualquier dimensión."
    ),
)
async def explorar_registros_hurtos(
    service: GeodatosServiceDep,
    delito: str | None = Query(default=None, description="Delito a filtrar o variantes"),
    anio: int | None = Query(default=None, ge=2018, le=2026, description="Año analizado"),
    mes: str | None = Query(default=None, description="Mes del evento"),
    zona: str | None = Query(default=None, pattern="^(URBANA|RURAL|urbana|rural)$", description="Zona URBANA o RURAL"),
    armas_medios: str | None = Query(default=None, description="Modalidad o arma empleada"),
    clase_sitio: str | None = Query(default=None, description="Clase de sitio de ocurrencia"),
    dia_semana: str | None = Query(default=None, description="Día de la semana"),
    busqueda: str | None = Query(default=None, description="Búsqueda textual libre"),
    agrupar_por: str = Query(
        default="armas_medios",
        pattern="^(delito|anio|mes|zona|armas_medios|clase_sitio|dia_semana)$",
        description="Columna para agregación y tabla dinámica (pivot)",
    ),
    limit: int = Query(default=50, ge=1, le=500, description="Límite de registros por página"),
    offset: int = Query(default=0, ge=0, description="Desplazamiento inicial para paginación"),
) -> ExploradorHurtosResponse:
    return await service.explorar_registros_hurtos(
        delito=delito,
        anio=anio,
        mes=mes,
        zona=zona,
        armas_medios=armas_medios,
        clase_sitio=clase_sitio,
        dia_semana=dia_semana,
        busqueda=busqueda,
        agrupar_por=agrupar_por,
        limit=limit,
        offset=offset,
    )
