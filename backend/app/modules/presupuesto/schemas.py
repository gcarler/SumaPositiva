import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FuenteFinanciacionCrear(BaseModel):
    codigo: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=200)
    tipo_fuente: str = Field(..., max_length=50)
    base_legal: str = Field(..., max_length=250)
    descripcion: str | None = None
    activa: bool = True
    metadatos: dict[str, Any] = Field(default_factory=dict)


class FuenteFinanciacionRespuesta(FuenteFinanciacionCrear):
    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)


class AsignacionPresupuestalCrear(BaseModel):
    fuente_financiacion_id: uuid.UUID
    linea_estrategica_id: uuid.UUID | None = None
    nodo_instrumento_id: uuid.UUID | None = None
    monto_estimado: Decimal
    anio_vigencia: int
    es_vigencia_futura: bool = False
    tipo_vigencia_futura: str | None = Field(default=None, max_length=50)
    codigo_bpin: str | None = Field(default=None, max_length=100)
    justificacion: str
    metadatos: dict[str, Any] = Field(default_factory=dict)


class AsignacionPresupuestalRespuesta(AsignacionPresupuestalCrear):
    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)


class ResumenCosteo(BaseModel):
    total_asignado: Decimal
    por_fuente: list[dict]
    por_vigencia: list[dict]
