"""Esquemas Pydantic v2 para consulta de radicados y auditoría de notificaciones."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConsultaRadicadoRespuesta(BaseModel):
    """Respuesta pública para la verificación del estado de una propuesta radicada."""

    id: uuid.UUID
    codigo_radicado: str = Field(
        ...,
        description="Código oficial único de radicación distrital (ej. POL-2026-0001)",
    )
    titulo: str = Field(..., description="Título de la propuesta o alerta ciudadana")
    descripcion: str = Field(..., description="Contenido de la propuesta")
    tipo_aporte: str = Field(..., description="Tipo de aporte participativo")
    autor_nombre: str = Field(..., description="Autor o 'Ciudadano Anónimo'")
    estado: str = Field(..., description="Estado de tramitación de la propuesta")
    territorio_nombre: str | None = Field(
        default=None, description="Territorio distrital de anclaje"
    )
    creado_en: datetime = Field(..., description="Fecha y hora de radicación oficial")
    actualizado_en: datetime = Field(
        ..., description="Última actualización de tramitación"
    )

    model_config = ConfigDict(from_attributes=True)


class NotificacionLectura(BaseModel):
    """Lectura de evento de notificación transaccional para auditoría forense."""

    id: uuid.UUID
    codigo_radicado: str
    destinatario_correo: str
    tipo_evento: str
    asunto: str
    estado_envio: str
    error_detalle: str | None = None
    creado_en: datetime
    enviado_en: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class HistorialNotificacionesPaginado(BaseModel):
    """Listado paginado de notificaciones para auditoría institucional."""

    total: int = Field(..., description="Total de notificaciones coincidentes")
    limite: int = Field(..., description="Límite por página")
    desplazamiento: int = Field(..., description="Desplazamiento u offset")
    elementos: list[NotificacionLectura] = Field(
        ..., description="Registros de notificaciones"
    )
