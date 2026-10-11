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

