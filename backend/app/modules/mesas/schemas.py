import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoMesaLiteral = Literal["TERRITORIAL", "RURAL_INSULAR", "POBLACIONAL", "SECTORIAL", "ESPECIAL"]
ModalidadLiteral = Literal["PRESENCIAL", "VIRTUAL", "HIBRIDA_DIGITAL"]
EstadoMesaLiteral = Literal[
    "PROGRAMADA", "CONVOCADA", "EN_DELIBERACION", "ACTA_CONCERTADA", "FINALIZADA"
]
RolMesaLiteral = Literal["facilitador", "relator", "delegado_institucional", "ciudadano"]
EstadoActaLiteral = Literal["BORRADOR", "CONCERTADA", "PUBLICADA"]


class MesaBase(BaseModel):
    tipo_mesa: TipoMesaLiteral
    codigo_oficial: str
    shortcode_ciudadano: str
    nombre: str
    lugar_nombre: str | None = None
    fecha: date | None = None
    horario: str | None = None
    aforo_maximo: int = 0
    modalidad: ModalidadLiteral = "PRESENCIAL"
    estado: EstadoMesaLiteral = "PROGRAMADA"
    linea_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    territorio_id: uuid.UUID | None = None
    facilitador_id: uuid.UUID | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)


class MesaCrear(MesaBase):
    pass


class SubMesaCrear(BaseModel):
    slug: str
    nombre: str
    tipo_mesa: TipoMesaLiteral
    codigo_oficial: str
    shortcode_ciudadano: str
    lugar_nombre: str | None = None
    fecha: date | None = None
    horario: str | None = None
    aforo_maximo: int = 0
    modalidad: ModalidadLiteral = "PRESENCIAL"
    estado: EstadoMesaLiteral = "PROGRAMADA"
    linea_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    territorio_id: uuid.UUID | None = None
    facilitador_id: uuid.UUID | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)


class MesaRespuesta(MesaBase):
    id: uuid.UUID
    mesa_padre_id: uuid.UUID | None = None
    ruta_jerarquica: str
    total_asistentes: int
    sha256_acta: str | None = None
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class ParticipanteCrear(BaseModel):
    sujeto_id: str
    usuario_id: uuid.UUID | None = None
    nombre_completo: str
    rol_en_mesa: RolMesaLiteral = "ciudadano"
    organizacion_comunitaria: str | None = None
    asistencia_confirmada: bool = True
    metadatos: dict[str, Any] = Field(default_factory=dict)


class ParticipanteRespuesta(BaseModel):
    id: uuid.UUID
    mesa_id: uuid.UUID
    sujeto_id: str
    usuario_id: uuid.UUID | None = None
    nombre_completo: str
    rol_en_mesa: str
    organizacion_comunitaria: str | None = None
    asistencia_confirmada: bool
    hora_ingreso: datetime
    metadatos: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class ActaCrear(BaseModel):
    numero_acta: str
    resumen_deliberacion: str
    acuerdos: list[Any] = Field(default_factory=list)
    disensos: list[Any] = Field(default_factory=list)
    compromisos_institucionales: list[Any] = Field(default_factory=list)
    facilitador_firma_id: uuid.UUID | None = None
    nombre_facilitador_firma: str | None = None


class ActaCierre(BaseModel):
    numero_acta: str | None = None
    resumen_deliberacion: str | None = None
    acuerdos: list[Any] | None = None
    disensos: list[Any] | None = None
    compromisos_institucionales: list[Any] | None = None
    facilitador_firma_id: uuid.UUID | None = None
    nombre_facilitador_firma: str | None = None


class ActaRespuesta(BaseModel):
    id: uuid.UUID
    mesa_id: uuid.UUID
    numero_acta: str
    quorum_alcanzado: bool
    total_participantes: int
    resumen_deliberacion: str
    acuerdos: list[Any]
    disensos: list[Any]
    compromisos_institucionales: list[Any]
    metadatos_cierre: dict[str, Any] = Field(default_factory=dict)
    facilitador_firma_id: uuid.UUID | None = None
    nombre_facilitador_firma: str | None = None
    sha256_acta: str
    estado: str
    fecha_cierre: datetime | None = None
    creado_en: datetime
    actualizado_en: datetime
    integridad_valida: bool = True

    model_config = ConfigDict(from_attributes=True)
