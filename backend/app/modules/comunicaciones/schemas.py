import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EstadoTarea = Literal["pendiente", "en_progreso", "completada", "reprogramada"]


class TareaComunicacionBase(BaseModel):
    codigo: str = Field(..., max_length=50, description="Código de la tarea, ej: TC-01")
    etapa: str = Field(..., max_length=100, description="Etapa del cronograma")
    territorio: str = Field(..., max_length=150, description="Barrios o territorio de cobertura")
    titulo: str = Field(..., max_length=255, description="Título conciso de la tarea")
    descripcion: str = Field(default="", description="Detalle operativo de la actividad")
    entregables: str = Field(default="", description="Entregables verificables del equipo")
    fecha_inicio: date = Field(..., description="Fecha de inicio (YYYY-MM-DD)")
    fecha_fin: date = Field(..., description="Fecha de culminación (YYYY-MM-DD)")
    estado: EstadoTarea = Field(default="pendiente", description="Estado de avance de la tarea")
    responsable: str = Field(
        default="Equipo de Comunicaciones",
        max_length=150,
        description="Persona o rol responsable de la entrega",
    )
    orden: int = Field(default=0, description="Orden de secuenciación en la vista")


class TareaComunicacionCrear(TareaComunicacionBase):
    pass


class TareaComunicacionActualizar(BaseModel):
    codigo: str | None = Field(default=None, max_length=50)
    etapa: str | None = Field(default=None, max_length=100)
    territorio: str | None = Field(default=None, max_length=150)
    titulo: str | None = Field(default=None, max_length=255)
    descripcion: str | None = None
    entregables: str | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    estado: EstadoTarea | None = None
    responsable: str | None = Field(default=None, max_length=150)
    orden: int | None = None


class TareaComunicacionLectura(TareaComunicacionBase):
    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)
