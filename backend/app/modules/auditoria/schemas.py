import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CausalDevolucionLiteral = Literal["tecnica", "juridica", "presupuestal"]


class DevolucionRazonCrear(BaseModel):
    causal: CausalDevolucionLiteral = Field(..., description="Causal de rechazo/devolución")
    justificacion_motivada: str = Field(
        ..., min_length=20, max_length=3000, description="Razones sustantivas de la devolución"
    )
    metadatos: dict[str, Any] = Field(default_factory=dict)


class DevolucionRazonRespuesta(BaseModel):
    id: uuid.UUID
    tabla_afectada: str
    registro_id: uuid.UUID
    accion: str
    usuario_id: uuid.UUID | None = None
    causal: str
    justificacion_motivada: str
    metadatos: dict[str, Any]
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class RegistroAuditoriaLectura(BaseModel):
    id: uuid.UUID
    tabla_afectada: str
    registro_id: uuid.UUID
    accion: str
    usuario_id: uuid.UUID | None = None
    causal: str
    justificacion_motivada: str
    metadatos: dict[str, Any]
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class RegistrosAuditoriaPagina(BaseModel):
    total: int
    elementos: list[RegistroAuditoriaLectura]


class RespaldoArchivo(BaseModel):
    archivo: str
    tamano_bytes: int
    fecha_modificacion: datetime
    hash_sha256: str | None = None
    estado: str = "integro"


class EstadoRespaldosSistema(BaseModel):
    directorio: str
    total_respaldos: int
    ultimo_respaldo: RespaldoArchivo | None = None
    respaldos: list[RespaldoArchivo]
    espacio_libre_mb: float
