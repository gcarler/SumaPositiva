import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TestimonioCrear(BaseModel):
    nombre_autor: str = Field(..., min_length=2, max_length=200)
    organizacion_comunitaria: str | None = Field(None, max_length=200)
    territorio_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    titulo: str = Field(..., min_length=5, max_length=250)
    relato: str = Field(..., min_length=15)
    url_foto: str | None = Field(None, max_length=500)
    url_audio_video: str | None = Field(None, max_length=500)
    metadatos_enfoque: dict[str, Any] = Field(default_factory=dict)


class TestimonioModeracion(BaseModel):
    estado: str = Field(..., description="APROBADO, DESTACADO, RECHAZADO")
    motivo_moderacion: str | None = Field(None, max_length=500)


class TestimonioEdicion(BaseModel):
    nombre_autor: str = Field(..., min_length=2, max_length=200)
    organizacion_comunitaria: str | None = Field(None, max_length=200)
    territorio_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    titulo: str = Field(..., min_length=5, max_length=250)
    relato: str = Field(..., min_length=15)
    url_foto: str | None = Field(None, max_length=500)
    url_audio_video: str | None = Field(None, max_length=500)
    metadatos_enfoque: dict[str, Any] = Field(default_factory=dict)


class TestimonioLectura(BaseModel):
    id: uuid.UUID
    codigo_unico: str
    nombre_autor: str
    organizacion_comunitaria: str | None = None
    territorio_id: uuid.UUID | None = None
    territorio_nombre: str | None = None
    dimension_id: uuid.UUID | None = None
    dimension_nombre: str | None = None
    titulo: str
    relato: str
    url_foto: str | None = None
    url_audio_video: str | None = None
    metadatos_enfoque: dict[str, Any]
    estado: str
    motivo_moderacion: str | None = None
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumenTestimonios(BaseModel):
    total_testimonios: int
    aprobados: int
    destacados: int
    pendientes: int
    rechazados: int
    por_territorio: list[dict[str, Any]]
