import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoPregunta = Literal["texto_libre", "opcion_unica", "opcion_multiple", "escala_likert"]


class PreguntaEsquema(BaseModel):
    id: str = Field(..., description="Identificador único de la pregunta en el formulario")
    texto: str = Field(..., description="Enunciado de la pregunta")
    tipo: TipoPregunta = Field(..., description="Tipo de control de respuesta")
    opciones: list[str] = Field(default_factory=list, description="Opciones válidas para selección")
    ayuda: str | None = Field(None, description="Texto de ayuda o guía para el ciudadano")
    obligatoria: bool = Field(True, description="Indica si la respuesta es requerida")


class FormularioCrear(BaseModel):
    codigo: str = Field(..., max_length=50, description="Código mnemónico único del formulario")
    titulo: str = Field(..., max_length=250, description="Título público de la consulta")
    descripcion: str = Field(..., description="Descripción y justificación del formulario")
    dimension_id: uuid.UUID | None = Field(
        None, description="Dimensión de seguridad humana asociada"
    )
    territorio_id: uuid.UUID | None = Field(None, description="Territorio focalizado de Cartagena")
    estado: str = Field(default="PUBLICADO", description="Estado: BORRADOR, PUBLICADO, CERRADO")
    esquema_preguntas: list[PreguntaEsquema] = Field(
        ..., description="Lista de preguntas del formulario"
    )
    enfoque_diferencial_habilitado: bool = Field(
        True, description="Habilita preguntas de enfoque diferencial"
    )
    permite_evidencias: bool = Field(True, description="Permite adjuntar evidencias fotográficas")
    fecha_cierre: datetime | None = Field(None, description="Fecha límite de participación")


class FormularioActualizar(BaseModel):
    titulo: str | None = Field(None, max_length=250)
    descripcion: str | None = None
    estado: str | None = Field(None, description="BORRADOR, PUBLICADO, CERRADO")
    esquema_preguntas: list[PreguntaEsquema] | None = None
    fecha_cierre: datetime | None = None


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
