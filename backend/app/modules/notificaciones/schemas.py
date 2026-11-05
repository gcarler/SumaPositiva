"""Esquemas Pydantic v2 para consulta de radicados, auditoría y salud del Herald."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Límite compartido con el worker (no se duplica el 8): describe cuándo una fila
# es 'agotada' y habilita el botón de reintento manual en el frontend.
from app.modules.notificaciones.worker import MAX_INTENTOS


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
    territorio_nombre: str | None = Field(default=None, description="Territorio distrital de anclaje")
    creado_en: datetime = Field(..., description="Fecha y hora de radicación oficial")
    actualizado_en: datetime = Field(..., description="Última actualización de tramitación")

    model_config = ConfigDict(from_attributes=True)


class NotificacionLectura(BaseModel):
    """Lectura de evento de notificación transaccional para auditoría forense."""

    id: uuid.UUID
    codigo_radicado: str
    destinatario_correo: str
    tipo_evento: str
    asunto: str
    estado_envio: str
    intentos: int = 0
    error_detalle: str | None = None
    creado_en: datetime
    enviado_en: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class HistorialNotificacionesPaginado(BaseModel):
    """Listado paginado de notificaciones para auditoría institucional."""

    total: int = Field(..., description="Total de notificaciones coincidentes")
    limite: int = Field(..., description="Límite por página")
    desplazamiento: int = Field(..., description="Desplazamiento u offset")
    elementos: list[NotificacionLectura] = Field(..., description="Registros de notificaciones")


class CicloHerald(BaseModel):
    """Resumen del último ciclo del ejecutor (latido)."""

    procesados: int = 0
    enviado: int = 0
    fallido: int = 0
    simulado: int = 0


class EjecutorHerald(BaseModel):
    """Estado del ejecutor de POLIS Herald."""

    activo: bool = Field(..., description="Latido dentro de los últimos 5 minutos")
    ultimo_latido: datetime | None = None
    ultimo_ciclo: CicloHerald | None = None


class ColaHerald(BaseModel):
    """Estado actual de la cola outbox transaccional."""

    pendientes: int = 0
    procesando: int = 0
    fallidos_reintentables: int = Field(0, description=f"fallido con intentos < {MAX_INTENTOS}")
    agotados: int = Field(0, description=f"fallido con intentos >= {MAX_INTENTOS}")
    mas_antiguo_segundos: float | None = None


class Metricas24h(BaseModel):
    """Entregas de las últimas 24 horas (los simulados no son entrega real)."""

    enviados: int = 0
    simulados: int = 0
    fallidos: int = 0
    tasa_exito: float | None = Field(None, ge=0.0, le=1.0)
    latencia_p50_s: float | None = None
    latencia_p95_s: float | None = None


class SaludPorTipo(BaseModel):
    """Conteo por tipo de evento en la ventana de 24 horas y cola actual."""

    tipo_evento: str
    enviados: int = 0
    fallidos: int = 0
    pendientes: int = 0


class SaludHerald(BaseModel):
    """Contrato de GET /notificaciones/salud (fuente de verdad con el frontend)."""

    estado: Literal["saludable", "degradado", "critico"]
    motivos: list[str] = Field(default_factory=list, description="Reglas disparadas, legibles en español")
    smtp_configurado: bool
    ejecutor: EjecutorHerald
    cola: ColaHerald
    ultimas_24h: Metricas24h
    por_tipo: list[SaludPorTipo] = Field(default_factory=list)


class SaludHeraldMinima(BaseModel):
    """Respuesta del endpoint interno /health/herald: solo estado, sin cifras ni PII."""

    estado: Literal["saludable", "degradado", "critico"]
    motivos: list[str] = Field(default_factory=list)


class ReintentoRespuesta(BaseModel):
    """Resultado del reintento manual de una notificación agotada."""

    id: uuid.UUID
    estado_envio: Literal["pendiente"]
