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


class MesaActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=250)
    lugar_nombre: str | None = Field(default=None, max_length=300)
    lugar: str | None = Field(default=None, max_length=300)
    fecha: date | None = None
    horario: str | None = Field(default=None, max_length=100)
    aforo_maximo: int | None = Field(default=None, ge=0)
    aforo_esperado: int | None = Field(default=None, ge=0)
    total_asistentes: int | None = Field(default=None, ge=0)
    modalidad: ModalidadLiteral | None = None
    estado: EstadoMesaLiteral | None = None
    tipo_mesa: TipoMesaLiteral | None = None
    linea_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    territorio_id: uuid.UUID | None = None
    facilitador_id: uuid.UUID | None = None
    entidad_responsable: str | None = Field(default=None, max_length=300)
    facilitador_principal: str | None = Field(default=None, max_length=300)
    metadatos: dict[str, Any] | None = None


class SubMesaCrear(BaseModel):
    slug: str | None = None
    nombre: str
    tipo_mesa: TipoMesaLiteral | None = None
    codigo_oficial: str | None = None
    shortcode_ciudadano: str | None = None
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


class FotoMesaPublica(BaseModel):
    id: uuid.UUID
    archivo_url: str
    descripcion: str = "Fotografía de la mesa aprobada por la institución"


class MesaGeovisorRespuesta(BaseModel):
    id: uuid.UUID
    nombre: str
    fecha: date | None
    horario: str | None
    estado: EstadoMesaLiteral
    realizada: bool
    total_asistentes: int
    territorio_id: uuid.UUID | None
    territorio_nombre: str | None
    territorio_codigo: str | None
    longitud_referencia: float | None
    latitud_referencia: float | None
    tipo_ubicacion: Literal["centroide_territorial_referencia"] | None
    fotos: list[FotoMesaPublica] = Field(default_factory=list)


class FotoMesaSubidaRespuesta(BaseModel):
    id: uuid.UUID
    estado: Literal["PENDIENTE"] = "PENDIENTE"
    mensaje: str = "La fotografía quedó pendiente de revisión institucional."


class FotoMesaRevision(BaseModel):
    id: uuid.UUID
    mesa_id: uuid.UUID
    mesa_nombre: str
    nombre_archivo_original: str
    autorizacion_imagen: bool
    creada_en: datetime
    archivo_revision_url: str


class FotoMesaModeracion(BaseModel):
    estado: Literal["APROBADA", "RECHAZADA"]
    observacion: str | None = Field(default=None, max_length=1000)


class FotoMesaModeradaRespuesta(BaseModel):
    id: uuid.UUID
    mesa_id: uuid.UUID
    estado: Literal["APROBADA", "RECHAZADA"]
    observacion_revision: str | None
    revisada_en: datetime


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


# --- Schemas de Cronograma y Agenda de Mesas (EDIT-02) ---

TipoAgendaLiteral = Literal["territorial", "rural_insular", "poblacional", "sectorial"]
EstadoAgendaLiteral = Literal[
    "programada", "en_curso", "realizada", "cancelada", "reprogramada"
]


class AgendaBase(BaseModel):
    tipo: TipoAgendaLiteral
    nombre: str = Field(..., min_length=2, max_length=255)
    territorio: str = Field(default="", max_length=150)
    lugar: str = Field(..., min_length=2, max_length=300)
    fecha: date
    hora_inicio: str = Field(default="08:30", max_length=20)
    hora_fin: str = Field(default="12:00", max_length=20)
    estado: EstadoAgendaLiteral = "programada"
    dimensiones_onu: list[str] = Field(default_factory=list)
    responsable: str | None = Field(default=None, max_length=255)
    observaciones: str | None = None


class AgendaCrear(AgendaBase):
    id: str | None = None


class AgendaActualizar(BaseModel):
    tipo: TipoAgendaLiteral | None = None
    nombre: str | None = Field(default=None, min_length=2, max_length=255)
    territorio: str | None = Field(default=None, max_length=150)
    lugar: str | None = Field(default=None, min_length=2, max_length=300)
    fecha: date | None = None
    hora_inicio: str | None = Field(default=None, max_length=20)
    hora_fin: str | None = Field(default=None, max_length=20)
    estado: EstadoAgendaLiteral | None = None
    dimensiones_onu: list[str] | None = None
    responsable: str | None = Field(default=None, max_length=255)
    observaciones: str | None = None


class AgendaRespuesta(AgendaBase):
    id: str
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)

