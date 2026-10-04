import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SectorMGA = Literal[
    "seguridad_convivencia",
    "proteccion_nna",
    "ambiente_habitat",
    "genero_inclusion",
    "desarrollo_economico",
    "educacion_cultura",
    "etnico_comunitario",
]

EstadoAlternativa = Literal[
    "en_formulacion",
    "viable",
    "requiere_ajustes",
    "priorizada",
    "descartada",
]


class AlternativaBase(BaseModel):
    codigo: str = Field(..., min_length=3, max_length=50, description="Código único MGA, ej. ALT-ESCNNA-01")
    nombre: str = Field(..., min_length=5, max_length=250, description="Nombre de la alternativa de solución")
    descripcion: str = Field(default="", description="Descripción detallada de la alternativa")
    sector: SectorMGA = Field(..., description="Sector MGA correspondiente")
    linea_estrategica_codigo: str | None = Field(default=None, max_length=50)
    dimension_codigo: str | None = Field(default=None, max_length=50)
    objetivo_central: str | None = Field(default=None, description="Objetivo central formulado")
    territorio_cobertura: str | None = Field(default=None, description="Territorios o sectores cubiertos")
    poblacion_objetivo_estimada: int = Field(default=0, ge=0)
    costo_estimado_cop: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    horizonte_anios: int = Field(default=4, ge=1, le=20)
    fuentes_financiacion_sugeridas: list[str] = Field(default_factory=list)
    estado: EstadoAlternativa = Field(default="en_formulacion")
    requiere_consulta_previa: bool = Field(default=False)
    territorios_focalizados: list[Any] = Field(default_factory=list)
    metadatos: dict[str, Any] = Field(default_factory=dict)


class AlternativaCrear(AlternativaBase):
    linea_estrategica_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None


class AlternativaActualizar(BaseModel):
    codigo: str | None = Field(default=None, min_length=3, max_length=50)
    nombre: str | None = Field(default=None, min_length=5, max_length=250)
    descripcion: str | None = None
    sector: SectorMGA | None = None
    linea_estrategica_id: uuid.UUID | None = None
    linea_estrategica_codigo: str | None = None
    dimension_id: uuid.UUID | None = None
    dimension_codigo: str | None = None
    objetivo_central: str | None = None
    territorio_cobertura: str | None = None
    poblacion_objetivo_estimada: int | None = Field(default=None, ge=0)
    costo_estimado_cop: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    horizonte_anios: int | None = Field(default=None, ge=1, le=20)
    fuentes_financiacion_sugeridas: list[str] | None = None
    estado: EstadoAlternativa | None = None
    requiere_consulta_previa: bool | None = None
    territorios_focalizados: list[Any] | None = None
    metadatos: dict[str, Any] | None = None
    justificacion_motivada: str | None = Field(
        default=None, description="Motivación de la actualización para registro de auditoría"
    )


class AlternativaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    nombre: str
    descripcion: str
    sector: str
    linea_estrategica_id: uuid.UUID | None = None
    linea_estrategica_codigo: str | None = None
    dimension_id: uuid.UUID | None = None
    dimension_codigo: str | None = None
    costo_estimado_cop: Decimal
    horizonte_anios: int
    estado: str
    requiere_consulta_previa: bool
    territorios_focalizados: list[Any]
    territorio_cobertura: str | None = None
    poblacion_objetivo_estimada: int
    objetivo_central: str | None = None
    fuentes_financiacion_sugeridas: list[str]
    metadatos: dict[str, Any]
    creado_en: datetime
    actualizado_en: datetime
