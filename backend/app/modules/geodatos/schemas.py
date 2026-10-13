import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TerritorioBase(BaseModel):
    """Esquema base para división territorial del Distrito de Cartagena."""

    codigo: str = Field(..., max_length=50, description="Código único del territorio")
    nombre: str = Field(..., max_length=200, description="Nombre oficial del territorio")
    tipo_territorio: str = Field(
        ...,
        max_length=50,
        description=(
            "Nivel: distrito, localidad, unidad_actuacion_comunera, "
            "barrio, corregimiento o zona_insular"
        ),
    )
    territorio_padre_id: uuid.UUID | None = Field(
        default=None, description="UUID del territorio padre"
    )
    poblacion_estimada: int | None = Field(default=None, description="Población estimada")
    estrato_predominante: int | None = Field(
        default=None, description="Estrato socioeconómico predominante"
    )
    es_zona_etnica: bool = Field(
        default=False,
        description="Indica si es comunidad negra/afrodescendiente o resguardo indígena",
    )
    nombre_consejo_comunitario: str | None = Field(
        default=None, max_length=250, description="Nombre del Consejo Comunitario de la zona"
    )
    metadatos: dict[str, Any] = Field(default_factory=dict, description="Metadatos adicionales")


class TerritorioCreate(TerritorioBase):
    """Esquema para creación de territorio."""

    pass


class TerritorioRead(TerritorioBase):
    """Esquema de lectura para territorio con coordenadas de centroide."""

    id: uuid.UUID
    coordenadas_centroide: tuple[float, float] | None = Field(
        default=None, description="Coordenadas geográficas [longitud, latitud] EPSG:4326"
    )
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class IndicadorTerritorioBase(BaseModel):
    """Esquema base para indicador estadístico territorial."""

    territorio_id: uuid.UUID = Field(..., description="UUID del territorio asociado")
    dimension_id: uuid.UUID | None = Field(
        default=None, description="UUID de la dimensión de seguridad humana"
    )
    codigo_indicador: str = Field(..., max_length=100, description="Código único del indicador")
    nombre_indicador: str = Field(..., max_length=250, description="Nombre del indicador")
    valor: Decimal = Field(..., description="Valor cuantitativo del indicador")
    unidad_medida: str = Field(..., max_length=50, description="Unidad de medida")
    nivel_riesgo: str = Field(
        default="medio",
        max_length=30,
        description="Nivel de riesgo: bajo, medio, alto o critico",
    )
    anio_corte: int = Field(default=2026, description="Año de corte del indicador")
    fuente_datos: str = Field(..., max_length=200, description="Fuente oficial de los datos")
    metadatos: dict[str, Any] = Field(default_factory=dict, description="Metadatos en JSONB")


class IndicadorTerritorioCreate(IndicadorTerritorioBase):
    """Esquema de creación para indicador territorial."""

    pass


class IndicadorTerritorioRead(IndicadorTerritorioBase):
    """Esquema de lectura para indicador territorial."""

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class CapaGeovisorBase(BaseModel):
    """Esquema base para capa espacial del Geovisor."""

    codigo: str = Field(..., max_length=50, description="Código único de la capa")
    nombre: str = Field(..., max_length=200, description="Nombre visible de la capa")
    categoria: str = Field(..., max_length=100, description="Categoría temática")
    descripcion: str | None = Field(default=None, description="Descripción funcional de la capa")
    tipo_geometria: str = Field(
        default="Poligonos", max_length=50, description="Tipo: Puntos, Poligonos, MapaCalor"
    )
    color_estilo: str = Field(
        default="#ef4444", max_length=7, description="Código de color hexadecimal"
    )
    activa: bool = Field(default=True, description="Estado de visibilidad")
    metadatos: dict[str, Any] = Field(default_factory=dict, description="Metadatos de la capa")


class CapaGeovisorCreate(CapaGeovisorBase):
    """Esquema de creación para capa del geovisor."""

    pass


class CapaGeovisorRead(CapaGeovisorBase):
    """Esquema de lectura para capa del geovisor."""

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class CoordenadasAproximadas(BaseModel):
    """Coordenadas geográficas WGS84 EPSG:4326 del territorio o punto normalizado."""

    latitud: float = Field(..., description="Latitud en grados decimales (-90 a 90)")
    longitud: float = Field(..., description="Longitud en grados decimales (-180 a 180)")


class EstandarizarDireccionRequest(BaseModel):
    """Solicitud de estandarización léxica y territorial de dirección."""

    direccion_raw: str = Field(
        ...,
        min_length=2,
        max_length=300,
        description="Dirección o referencia territorial en texto libre",
    )


class DireccionEstandarizadaResponse(BaseModel):
    """Respuesta con dirección normalizada, desglose de vía/sector y georreferenciación distrital."""

    direccion_original: str = Field(..., description="Texto original proporcionado")
    direccion_normalizada: str = Field(
        ..., description="Dirección normalizada según nomenclatura distrital oficial"
    )
    tipo_via: str | None = Field(
        default=None,
        description="Tipo de vía: Calle, Carrera, Diagonal, Transversal, Avenida, Sector, etc.",
    )
    numero_principal: str | None = Field(
        default=None,
        description="Número de vía principal o identificador de manzana/sector",
    )
    numero_secundario: str | None = Field(
        default=None,
        description="Número de cruce/placa o identificador de lote",
    )
    sector_o_barrio: str | None = Field(
        default=None,
        description="Sector, barrio o territorio identificado en Cartagena",
    )
    territorio_id: uuid.UUID | None = Field(
        default=None,
        description="UUID del territorio en geodatos.territorios si existe correspondencia",
    )
    coordenadas_aproximadas: CoordenadasAproximadas | None = Field(
        default=None,
        description="Coordenadas geográficas aproximadas [latitud, longitud]",
    )
    confianza: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Nivel de confianza de la estandarización (0.0 a 1.0)",
    )


class NodoCercanoRead(BaseModel):
    """Información del nodo de seguridad o salud más cercano."""

    nombre: str = Field(..., description="Nombre del nodo de seguridad humana")
    tipo: str = Field(..., description="Tipo de nodo: seguridad, salud, justicia")
    distancia_metros: float = Field(
        ..., description="Distancia geodésica en metros desde el origen"
    )


class IsocronaProperties(BaseModel):
    """Propiedades temáticas y temporales del polígono de isócrona."""

    minutos: int = Field(..., description="Intervalo temporal en minutos (5, 10, 15)")
    modo: str = Field(..., description="Modo de desplazamiento: 'pie' o 'vehiculo'")
    radio_metros: float = Field(..., description="Radio de cobertura estimado en metros")
    nodo_cercano: NodoCercanoRead | None = Field(
        default=None, description="Nodo de seguridad humana más cercano alcanzable"
    )


class IsocronaFeature(BaseModel):
    """Feature GeoJSON de isócrona poligonal."""

    type: str = Field(default="Feature", description="Tipo GeoJSON Feature")
    geometry: dict[str, Any] = Field(..., description="Geometría Polygon o MultiPolygon GeoJSON")
    properties: IsocronaProperties = Field(..., description="Propiedades de la isócrona")


class IsocronasFeatureCollection(BaseModel):
    """Colección GeoJSON de polígonos de isócronas para el Geovisor."""

    type: str = Field(default="FeatureCollection", description="Tipo GeoJSON FeatureCollection")
    features: list[IsocronaFeature] = Field(
        default_factory=list, description="Lista de polígonos de cobertura temporal"
    )


class SerieTemporalItem(BaseModel):
    """Elemento de serie temporal anual o mensual."""

    periodo: str = Field(..., description="Año o mes analizado")
    cantidad: int = Field(..., description="Cantidad total de incidentes")


class CategoriaConteo(BaseModel):
    """Categoría con su frecuencia y participación porcentual."""

    categoria: str = Field(..., description="Nombre de la categoría")
    cantidad: int = Field(..., description="Número de incidentes")
    porcentaje: float = Field(..., description="Porcentaje sobre el total analizado")


class DistribucionZonaItem(BaseModel):
    """Desglose por zona geográfica urbana vs rural."""

    zona: str = Field(..., description="URBANA o RURAL")
    cantidad: int = Field(..., description="Número de incidentes")
    porcentaje: float = Field(..., description="Porcentaje sobre el total analizado")


class ResumenHurtosResponse(BaseModel):
    """Resumen estadístico y analítico de hurtos para el Geovisor."""

    total_casos: int = Field(..., description="Total de casos registrados según filtros")
    delito: str | None = Field(default=None, description="Filtro de delito aplicado")
    anio: int | None = Field(default=None, description="Filtro de año aplicado")
    zona: str | None = Field(default=None, description="Filtro de zona aplicado")
    serie_anual: list[SerieTemporalItem] = Field(
        default_factory=list, description="Serie temporal anual 2018-2026"
    )
    serie_mensual: list[SerieTemporalItem] = Field(
        default_factory=list, description="Distribución mensual"
    )
    top_armas: list[CategoriaConteo] = Field(
        default_factory=list, description="Top 5 armas o medios empleados"
    )
    top_sitios: list[CategoriaConteo] = Field(
        default_factory=list, description="Top 5 clases de sitio"
    )
    distribucion_zona: list[DistribucionZonaItem] = Field(
        default_factory=list, description="Distribución por zona urbana vs rural"
    )


class HurtoPoligonoProperties(BaseModel):
    """Propiedades analíticas asociadas a cada polígono base."""

    poligono_id: int = Field(..., description="ID del polígono (1 Urbano, 2 Rural)")
    codigo: str = Field(..., description="Código oficial del polígono")
    nombre: str = Field(..., description="Nombre descriptivo del polígono")
    zona: str = Field(..., description="URBANA o RURAL")
    area_km2: float | None = Field(default=None, description="Área superficial en km2")
    delito: str | None = Field(default=None, description="Delito analizado")
    anio: int | None = Field(default=None, description="Año analizado o null para consolidado")
    total_casos: int = Field(..., description="Total de casos en este polígono")
    densidad_casos_km2: float = Field(..., description="Casos por kilómetro cuadrado")
    porcentaje_total: float = Field(..., description="Participación porcentual sobre el distrito")
    top_armas: list[CategoriaConteo] = Field(default_factory=list)
    top_sitios: list[CategoriaConteo] = Field(default_factory=list)


class HurtoFeature(BaseModel):
    """Feature GeoJSON de polígono analítico de hurtos."""

    type: str = Field(default="Feature", description="Tipo GeoJSON Feature")
    id: int = Field(..., description="ID numérico del polígono")
    geometry: dict[str, Any] = Field(..., description="Geometría MultiPolygon EPSG:4326")
    properties: HurtoPoligonoProperties = Field(..., description="Propiedades analíticas")


class HurtosFeatureCollection(BaseModel):
    """Colección GeoJSON con los polígonos urbano y rural y sus estadísticas asociadas."""

    type: str = Field(default="FeatureCollection", description="Tipo GeoJSON FeatureCollection")
    features: list[HurtoFeature] = Field(
        default_factory=list, description="Polígonos temáticos analíticos"
    )


