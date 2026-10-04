import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

EstadoCompromisoType = Literal[
    "sin_reporte",
    "programado",
    "en_ejecucion",
    "cumplido",
    "en_riesgo",
    "retrasado",
]


class CompromisoPASBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=250)
    descripcion: str
    entidad_responsable: str = Field(..., max_length=150)
    linea_estrategica_codigo: str = Field(..., max_length=50)
    alternativa_mga_codigo: str = Field(..., max_length=50)
    indicador_asociado_codigo: str = Field(..., max_length=50)
    meta_cuatrienal_descripcion: str
    meta_cuatrienal_valor: float = Field(..., gt=0)
    unidad_medida: str = Field(..., max_length=50)
    avance_cuatrienal_valor: float | None = Field(default=None, ge=0)
    porcentaje_cumplimiento: float | None = Field(default=None, ge=0, le=100)
    presupuesto_anual_cop: float | None = Field(default=None, ge=0)
    vigencias_programadas: list[int] = Field(default_factory=list)
    estado: EstadoCompromisoType = "sin_reporte"
    fecha_corte_ultimo_reporte: date | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)


class CompromisoPASCrear(CompromisoPASBase):
    pass


class CompromisoPASActualizarAvance(BaseModel):
    avance_cuatrienal_valor: float | None = Field(default=None, ge=0)
    estado: EstadoCompromisoType | None = None
    fecha_corte_ultimo_reporte: date | None = None
    observacion_cualitativa: str | None = None
    url_evidencia: str | None = None


class CompromisoPASActualizar(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    entidad_responsable: str | None = None
    linea_estrategica_codigo: str | None = None
    alternativa_mga_codigo: str | None = None
    indicador_asociado_codigo: str | None = None
    meta_cuatrienal_descripcion: str | None = None
    meta_cuatrienal_valor: float | None = None
    unidad_medida: str | None = None
    avance_cuatrienal_valor: float | None = None
    porcentaje_cumplimiento: float | None = None
    presupuesto_anual_cop: float | None = None
    vigencias_programadas: list[int] | None = None
    estado: EstadoCompromisoType | None = None
    fecha_corte_ultimo_reporte: date | None = None
    metadatos: dict[str, Any] | None = None


class CompromisoPASRespuesta(CompromisoPASBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime


class KpisSeguimientoRespuesta(BaseModel):
    totalCompromisos: int
    compromisosConReporte: int = 0
    compromisosSinReporte: int = 0
    compromisosEnEjecucionOCumplidos: int
    compromisosEnRiesgoORetrasados: int
    promedioCumplimientoCuatrienal: float | None = None
    presupuestoTotalAnualCop: float = 0.0
