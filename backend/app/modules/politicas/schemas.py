import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DimensionSeguridadHumanaBase(BaseModel):
    """Esquema base para las 7 dimensiones canónicas de la Seguridad Humana (ONU)."""

    codigo: str = Field(..., max_length=50, description="Identificador textual único")
    nombre: str = Field(..., max_length=150, description="Nombre de la dimensión")
    descripcion: str = Field(..., description="Descripción detallada de la dimensión")
    color_hex: str = Field(default="#6366f1", max_length=7, description="Color hexadecimal")
    icono: str = Field(default="shield", max_length=50, description="Identificador de icono")
    orden: int = Field(default=1, description="Orden de presentación")
    activa: bool = Field(default=True, description="Estado de la dimensión")
    metadatos: dict[str, Any] = Field(default_factory=dict, description="Metadatos en JSONB")


class DimensionSeguridadHumanaCreate(DimensionSeguridadHumanaBase):
    """Esquema de creación para dimensión de seguridad humana."""

    pass


class DimensionSeguridadHumanaRead(DimensionSeguridadHumanaBase):
    """Esquema de lectura para dimensión de seguridad humana."""

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class FasePoliticaBase(BaseModel):
    """Esquema base para fases dinámicas de la política pública."""

    orden: int = Field(..., description="Orden cronológico de la fase")
    codigo: str = Field(..., max_length=50, description="Código único de la fase")
    nombre: str = Field(..., max_length=200, description="Nombre descriptivo de la fase")
    descripcion: str | None = Field(default=None, description="Descripción de objetivos")
    estado: str = Field(
        default="preparatoria",
        max_length=50,
        description="Estado: preparatoria, activa, en_revision, cerrada, archivada",
    )
    progreso_porcentaje: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        le=100,
        description="Porcentaje de avance (0 a 100)",
    )
    fecha_inicio: date | None = Field(default=None, description="Fecha programada de inicio")
    fecha_cierre: date | None = Field(default=None, description="Fecha límite de participación")
    reglas_participacion: dict[str, Any] = Field(
        default_factory=dict, description="Reglas configurables de participación ciudadana"
    )
    metadatos: dict[str, Any] = Field(default_factory=dict, description="Metadatos en JSONB")


class FasePoliticaCreate(FasePoliticaBase):
    """Esquema de creación para fase de política."""

    pass


class FasePoliticaRead(FasePoliticaBase):
    """Esquema de lectura para fase de política."""

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class FaseConmutarPeticion(BaseModel):
    estado: str | None = Field(
        default=None,
        description="Nuevo estado: 'preparatoria', 'activa', 'en_revision', 'cerrada', 'archivada'",
    )
    habilitada_web: bool | None = Field(
        default=None, description="Interruptor maestro de participación ciudadana web"
    )
    motivo: str | None = Field(
        default=None, max_length=500, description="Motivo institucional del cambio de fase"
    )


class FaseControlLectura(FasePoliticaRead):
    habilitada_web: bool = Field(default=False, description="Indica si la fase admite aportes web")
    total_lineas: int = Field(default=0, description="Cantidad de líneas estratégicas vinculadas")


class LineaEstrategicaBase(BaseModel):
    """Esquema base para líneas estratégicas de intervención."""

    fase_id: uuid.UUID = Field(..., description="UUID de la fase asociada")
    dimension_id: uuid.UUID | None = Field(
        default=None, description="UUID de la dimensión de seguridad humana asociada"
    )
    codigo: str = Field(..., max_length=50, description="Código de la línea (ej: LE-01)")
    titulo: str = Field(..., max_length=300, description="Título o eje de la línea estratégica")
    descripcion: str = Field(..., description="Descripción detallada de la intervención")
    problema_abordado: str | None = Field(
        default=None, description="Problema central diagnosticado"
    )
    objetivo_especifico: str | None = Field(
        default=None, description="Objetivo transformador esperado"
    )
    costo_estimado: Decimal = Field(
        default=Decimal("0.00"), ge=0, description="Presupuesto proyectado en COP"
    )
    fuentes_financiacion: list[str] = Field(
        default_factory=lambda: ["FONSET"],
        description="Fuentes presupuestales (FONSET, SGP, SGR, etc.)",
    )
    entidad_lider: str = Field(
        default="Secretaría del Interior y Convivencia Ciudadana",
        max_length=250,
        description="Secretaría u organismo distrital líder",
    )
    entidades_coresponsables: list[str] = Field(
        default_factory=list, description="Entidades distritales o nacionales corresponsables"
    )
    orden: int = Field(default=1, description="Orden de despliegue")
    activa: bool = Field(default=True, description="Estado de la línea")
    metadatos: dict[str, Any] = Field(default_factory=dict, description="Metadatos en JSONB")


class SublineaSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    codigo: str = Field(min_length=1, max_length=50)
    titulo: str = Field(min_length=1, max_length=300)
    descripcion: str = Field(default="", max_length=10000)
    meta_cuatrienal: str | None = Field(default=None, max_length=2000)
    indicador_nombre: str | None = Field(default=None, max_length=500)
    actor_coresponsable: str | None = Field(default=None, max_length=250)


class LineaEstrategicaCreate(LineaEstrategicaBase):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    dimension_id: uuid.UUID
    codigo: str = Field(pattern=r"^LE-[0-9]{2,}$", max_length=50)
    titulo: str = Field(min_length=1, max_length=300)
    descripcion: str = Field(min_length=1, max_length=10000)
    entidad_lider: str = Field(min_length=1, max_length=250)
    costo_estimado: Decimal = Field(default=Decimal("0"), ge=0, max_digits=18, decimal_places=2)
    sublineas: list[SublineaSchema] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def jerarquia_valida(self):
        import re

        codigos = [s.codigo for s in self.sublineas]
        if len(codigos) != len(set(codigos)):
            raise ValueError("Los códigos de sublínea deben ser únicos")
        if any(not re.fullmatch(re.escape(self.codigo) + r"\.[1-9][0-9]*", c) for c in codigos):
            raise ValueError("Cada sublínea debe usar el código padre seguido de . y un número")
        if not self.fuentes_financiacion or any(not f.strip() for f in self.fuentes_financiacion):
            raise ValueError("Indique al menos una fuente de financiación")
        if "sublineas" in self.metadatos:
            raise ValueError("Use el campo sublineas, no metadatos.sublineas")
        return self


class LineaEstrategicaUpdate(LineaEstrategicaCreate):
    """PUT reemplaza los campos editables; preserva otros metadatos existentes."""


class LineaEstrategicaRead(LineaEstrategicaBase):
    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime
    sublineas: list[SublineaSchema] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)
