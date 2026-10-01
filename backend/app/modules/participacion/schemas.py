import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EscenarioEspecialCrear(BaseModel):
    codigo_unico: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=250)
    tipo_escenario: str = Field(
        ...,
        description="CONSULTA_PREVIA, TALLER_FOCAL, FORO_GREMIAL, ENCUENTRO_COMUNITARIO",
    )
    territorio_id: uuid.UUID | None = None
    fecha: date
    lugar: str = Field(..., max_length=250)
    entidad_convocante: str = Field(..., max_length=150)
    total_asistentes: int = Field(default=0, ge=0)
    desglose_poblacional: dict[str, Any] = Field(default_factory=dict)
    sintesis_acuerdos: str | None = None
    url_evidencia: str | None = None
    estado: str = "REALIZADO"


class EscenarioEspecialActualizar(BaseModel):
    nombre: str | None = None
    tipo_escenario: str | None = None
    territorio_id: uuid.UUID | None = None
    fecha: date | None = None
    lugar: str | None = None
    entidad_convocante: str | None = None
    total_asistentes: int | None = None
    desglose_poblacional: dict[str, Any] | None = None
    sintesis_acuerdos: str | None = None
    url_evidencia: str | None = None
    estado: str | None = None


class EscenarioEspecialLectura(BaseModel):
    id: uuid.UUID
    codigo_unico: str
    nombre: str
    tipo_escenario: str
    territorio_id: uuid.UUID | None
    territorio_nombre: str | None = None
    fecha: date
    lugar: str
    entidad_convocante: str
    total_asistentes: int
    desglose_poblacional: dict[str, Any]
    sintesis_acuerdos: str | None
    url_evidencia: str | None
    estado: str
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class DesgloseCanalWeb(BaseModel):
    total_aportes: int
    total_apoyos: int
    total_respuestas_formularios: int
    participantes_unicos_web: int
    por_linea_estrategica: list[dict[str, Any]]
    por_dimension: list[dict[str, Any]]
    por_territorio: list[dict[str, Any]]


class DesgloseCanalMesas(BaseModel):
    total_mesas_principales: int
    total_submesas: int
    total_participantes: int
    participantes_unicos_mesas: int
    total_actas_cerradas: int
    jerarquia_mesas: list[dict[str, Any]]


class DesgloseCanalEscenarios(BaseModel):
    total_escenarios: int
    total_asistentes: int
    por_tipo: dict[str, int]
    escenarios: list[EscenarioEspecialLectura]


class TableroConsolidado(BaseModel):
    gran_total_participantes_distrital: int
    participantes_unicos_identificados: int
    total_canal_web: int
    total_canal_mesas: int
    total_canal_escenarios: int
    porcentaje_canal_web: float
    porcentaje_canal_mesas: float
    porcentaje_canal_escenarios: float
    desglose_territorial_agregado: list[dict[str, Any]]
    fecha_corte: datetime
