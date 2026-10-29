from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoFuenteLiteral = Literal["primaria", "secundaria"]
AmbitoFuenteLiteral = Literal["local", "nacional", "internacional"]
EstadoEntregaLiteral = Literal[
    "por_solicitar",
    "entregada",
    "en_termino",
    "incompleta",
    "vencida_sin_entrega",
    "requerimiento_insistencia",
]
PeriodicidadLiteral = Literal["mensual", "trimestral", "semestral", "anual", "por_demanda"]


class ResponsableContactoSchema(BaseModel):
    nombre: str = Field(default="", max_length=150)
    cargo: str = Field(default="", max_length=150)
    email: str = Field(default="", max_length=150)
    telefono: str | None = Field(default=None, max_length=50)


class FuenteInformacionBase(BaseModel):
    codigo: str = Field(..., min_length=3, max_length=50)
    entidad: str = Field(..., min_length=3, max_length=255)
    nombre_fuente: str = Field(..., min_length=3, max_length=255)
    tipo: TipoFuenteLiteral = Field(default="secundaria")
    ambito: AmbitoFuenteLiteral = Field(default="local")
    dimension_seguridad: str = Field(default="personal", max_length=50)
    periodicidad: PeriodicidadLiteral = Field(default="mensual")
    radicado_solicitud: str | None = Field(default=None, max_length=100)
    fecha_solicitud: date | None = None
    fecha_limite_respuesta: date | None = None
    estado_entrega: EstadoEntregaLiteral = Field(default="en_termino")
    variables_solicitadas: list[str] = Field(default_factory=list)
    resumen_datos: str | None = None
    archivo_adjunto_url: str | None = None
    responsable_contacto: dict[str, Any] = Field(default_factory=dict)
    observaciones_calidad: str | None = None


class FuenteInformacionCrear(FuenteInformacionBase):
    id: str | None = Field(default=None, max_length=50)


class FuenteInformacionActualizar(BaseModel):
    codigo: str | None = Field(default=None, min_length=3, max_length=50)
    entidad: str | None = Field(default=None, min_length=3, max_length=255)
    nombre_fuente: str | None = Field(default=None, min_length=3, max_length=255)
    tipo: TipoFuenteLiteral | None = None
    ambito: AmbitoFuenteLiteral | None = None
    dimension_seguridad: str | None = None
    periodicidad: PeriodicidadLiteral | None = None
    radicado_solicitud: str | None = None
    fecha_solicitud: date | None = None
    fecha_limite_respuesta: date | None = None
    estado_entrega: EstadoEntregaLiteral | None = None
    variables_solicitadas: list[str] | None = None
    resumen_datos: str | None = None
    archivo_adjunto_url: str | None = None
    responsable_contacto: dict[str, Any] | None = None
    observaciones_calidad: str | None = None


class FuenteInformacionRespuesta(FuenteInformacionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actualizado_por: str | None = None
    creado_en: datetime
    actualizado_en: datetime


class KpisFuentesRespuesta(BaseModel):
    total: int
    entregadas: int
    en_termino: int
    incompletas: int
    vencidas: int
    requerimiento_insistencia: int
    por_solicitar: int = 0
    atencion_critica: int
    porcentaje_cumplimiento: int
