import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TipoPregunta = Literal["texto_libre", "opcion_unica", "opcion_multiple", "escala_likert"]


class PreguntaEsquema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Identificador único de la pregunta en el formulario",
    )
    texto: str = Field(..., min_length=1, max_length=10000, description="Enunciado de la pregunta")
    tipo: TipoPregunta = Field(..., description="Tipo de control de respuesta")
    opciones: list[str] = Field(default_factory=list, description="Opciones válidas para selección")
    ayuda: str | None = Field(None, description="Texto de ayuda o guía para el ciudadano")
    obligatoria: bool = Field(True, description="Indica si la respuesta es requerida")


def validar_esquema(preguntas):
    if preguntas is None:
        return preguntas
    ids = [p.id for p in preguntas]
    if len(set(ids)) != len(ids):
        raise ValueError("Las preguntas necesitan identificadores únicos")
    for p in preguntas:
        if p.tipo in ("opcion_unica", "opcion_multiple") and not p.opciones:
            raise ValueError("La selección necesita opciones")
        if any(not o.strip() for o in p.opciones) or len(set(p.opciones)) != len(p.opciones):
            raise ValueError("Las opciones deben ser distintas y no vacías")
    return preguntas


class FormularioCrear(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    codigo: str = Field(
        ..., min_length=1, max_length=50, description="Código mnemónico único del formulario"
    )
    titulo: str = Field(
        ..., min_length=1, max_length=250, description="Título público de la consulta"
    )
    descripcion: str = Field(..., description="Descripción y justificación del formulario")
    dimension_id: uuid.UUID | None = Field(
        None, description="Dimensión de seguridad humana asociada"
    )
    territorio_id: uuid.UUID | None = Field(None, description="Territorio focalizado de Cartagena")
    estado: Literal["BORRADOR", "PUBLICADO", "CERRADO"] = Field(
        default="PUBLICADO", description="Estado: BORRADOR, PUBLICADO, CERRADO"
    )
    esquema_preguntas: list[PreguntaEsquema] = Field(
        ..., min_length=1, max_length=500, description="Lista de preguntas del formulario"
    )
    enfoque_diferencial_habilitado: bool = Field(
        True, description="Habilita preguntas de enfoque diferencial"
    )
    permite_evidencias: bool = Field(True, description="Permite adjuntar evidencias fotográficas")
    fecha_cierre: datetime | None = Field(None, description="Fecha límite de participación")

    @field_validator("esquema_preguntas")
    @classmethod
    def validar_preguntas(cls, valor):
        return validar_esquema(valor)


class FormularioActualizar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    titulo: str | None = Field(None, min_length=1, max_length=250)
    descripcion: str | None = None
    estado: Literal["BORRADOR", "PUBLICADO", "CERRADO"] | None = Field(
        None, description="BORRADOR, PUBLICADO, CERRADO"
    )
    esquema_preguntas: list[PreguntaEsquema] | None = Field(
        default=None, min_length=1, max_length=500
    )
    fecha_cierre: datetime | None = None

    @field_validator("esquema_preguntas")
    @classmethod
    def validar_preguntas(cls, valor):
        return validar_esquema(valor)


class FormularioRespuesta(BaseModel):
    id: uuid.UUID
    codigo: str
    titulo: str
    descripcion: str
    dimension_id: uuid.UUID | None
    territorio_id: uuid.UUID | None
    estado: str
    esquema_preguntas: list[dict[str, Any]]
    enfoque_diferencial_habilitado: bool
    permite_evidencias: bool
    fecha_cierre: datetime | None
    creado_en: datetime
    actualizado_en: datetime
    total_respuestas: int = 0

    model_config = ConfigDict(from_attributes=True)


class RespuestaFormularioCrear(BaseModel):
    datos_respuesta: dict[str, Any] = Field(
        ..., description="Respuestas estructuradas por pregunta"
    )
    datos_enfoque: dict[str, Any] = Field(
        default_factory=dict, description="Variables de enfoque diferencial"
    )
    evidencias: list[dict[str, Any]] = Field(
        default_factory=list, description="Evidencias adjuntas"
    )
    territorio_id: uuid.UUID | None = Field(
        None, description="Territorio donde reside el participante"
    )

    @field_validator("datos_enfoque")
    @classmethod
    def enfoque_escalar(cls, valor):
        if any(v is not None and not isinstance(v, (str, bool)) for v in valor.values()):
            raise ValueError("Las variables de enfoque deben ser texto, booleanos o null")
        for clave in ("etnia", "genero", "grupo_etario"):
            if clave in valor and not isinstance(valor[clave], str):
                raise ValueError(f"{clave} debe ser texto")
        for clave in ("victima_conflicto", "discapacidad"):
            if clave in valor and not isinstance(valor[clave], bool):
                raise ValueError(f"{clave} debe ser booleano")
        return valor


class RespuestaFormularioLectura(BaseModel):
    id: uuid.UUID
    formulario_id: uuid.UUID
    sujeto_id: uuid.UUID
    territorio_id: uuid.UUID | None
    datos_enfoque: dict[str, Any]
    datos_respuesta: dict[str, Any]
    evidencias: list[dict[str, Any]]
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class AnaliticaFormularioRespuesta(BaseModel):
    formulario_id: uuid.UUID
    codigo: str
    titulo: str
    estado: str
    total_respuestas: int
    tabulacion_preguntas: dict[str, Any]
    desglose_enfoque_diferencial: dict[str, Any]
    desglose_territorial: dict[str, int]
