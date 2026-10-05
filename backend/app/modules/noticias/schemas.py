import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CategoriaNoticia = Literal[
    "avance_politica", "mesa_realizada", "acuerdo_distrital", "convocatoria", "informe", "logro"
]
EstadoNoticia = Literal["publicada", "borrador", "archivada"]


class NoticiaEntrada(BaseModel):
    titulo: str = Field(min_length=5, max_length=250)
    resumen: str = Field(min_length=10, max_length=3000)
    contenido: str = Field(min_length=20, max_length=100_000)
    imagen_portada: str | None = Field(default=None, max_length=12_000_000)
    galeria: list[str] = Field(default_factory=list, max_length=20)
    video_url: str | None = Field(default=None, max_length=1000)
    categoria: CategoriaNoticia
    autor: str = Field(min_length=2, max_length=200)
    destacada: bool = False
    orden_prioridad: int = Field(default=1, ge=1, le=1000)
    estado: EstadoNoticia = "borrador"
    etiquetas: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("etiquetas")
    @classmethod
    def validar_etiquetas(cls, values: list[str]) -> list[str]:
        normalizadas = [value.strip() for value in values if value.strip()]
        if any(len(value) > 50 for value in normalizadas):
            raise ValueError("Cada etiqueta debe tener máximo 50 caracteres")
        return normalizadas

    @field_validator("imagen_portada", "video_url")
    @classmethod
    def limpiar_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if value.startswith("data:"):
            if not value.startswith("data:image/"):
                raise ValueError("Solo se permiten imágenes en la portada")
            return value
        if not value.startswith(("https://", "http://")):
            raise ValueError("La URL debe usar HTTP o HTTPS")
        return value

    @field_validator("galeria")
    @classmethod
    def validar_galeria(cls, values: list[str]) -> list[str]:
        if any(not value.startswith(("https://", "http://", "data:image/")) for value in values):
            raise ValueError("Cada elemento de galería debe ser una URL de imagen válida")
        if any(len(value) > 12_000_000 for value in values):
            raise ValueError("Una imagen de galería excede el límite permitido")
        return values

    @model_validator(mode="after")
    def limitar_media_embebida(self):
        imagenes = [self.imagen_portada, *self.galeria]
        tamano_total = sum(len(url) for url in imagenes if url and url.startswith("data:image/"))
        if tamano_total > 20_000_000:
            raise ValueError("El total de imágenes embebidas no puede superar 20 MB")
        return self


class NoticiaLectura(BaseModel):
    id: uuid.UUID
    slug: str
    titulo: str
    resumen: str
    contenido: str
    imagen_portada: str | None
    galeria: list[str]
    video_url: str | None
    categoria: CategoriaNoticia
    autor: str
    publicada_en: datetime
    destacada: bool
    orden_prioridad: int
    estado: EstadoNoticia
    etiquetas: list[str]
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class ErrorNoticia(BaseModel):
    detalle: str
