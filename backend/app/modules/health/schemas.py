from typing import Literal

from pydantic import BaseModel, Field


class LivenessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "polis-api"


class ReadinessResponse(BaseModel):
    status: Literal["ready", "unavailable"]
    database: Literal["ok", "unavailable"]
    migrations: Literal["ok", "pending", "unknown"]
    extensions: Literal["ok", "missing", "unknown"]


class DatabaseMetrics(BaseModel):
    status: Literal["ok", "unavailable"]
    ping_ms: float
    active_connections: int
    max_connections: int
    migration_revision: str | None = None
    migrations_status: Literal["ok", "pending", "unknown"]
    extensions_status: Literal["ok", "missing", "unknown"]
    installed_extensions: list[str] = Field(default_factory=list)


class ProcessMetrics(BaseModel):
    uptime_seconds: float
    memory_rss_mb: float
    total_requests: int
    requests_2xx: int
    requests_3xx: int
    requests_4xx: int
    requests_5xx: int
    error_rate_pct: float
    avg_latency_ms: float


class StorageMetrics(BaseModel):
    total_gb: float
    used_gb: float
    free_gb: float
    used_pct: float


class ObservabilityMetrics(BaseModel):
    sentry_status: Literal["activo", "desactivado"]


class SystemHealthResponse(BaseModel):
    status: Literal["ok", "degraded", "unavailable"]
    timestamp: str
    service: str = "polis-api"
    version: str = "0.2.1"
    environment: str
    database: DatabaseMetrics
    process: ProcessMetrics
    storage: StorageMetrics
    observability: ObservabilityMetrics


class DatabaseQueryStat(BaseModel):
    """Estadística forense de ejecución de consulta SQL capturada por pg_stat_statements."""

    query: str = Field(..., description="Consulta SQL sanitizada (máximo 200 caracteres)")
    calls: int = Field(..., description="Número total de ejecuciones registradas")
    total_ms: float = Field(..., description="Tiempo total de ejecución acumulado en milisegundos")
    mean_ms: float = Field(..., description="Tiempo promedio por ejecución en milisegundos")
    rows: int = Field(..., description="Total de filas devueltas o afectadas")
    hit_ratio_pct: float = Field(..., description="Porcentaje de acierto en memoria caché de bloques")


class DatabaseTelemetryResponse(BaseModel):
    """Telemetría y observabilidad en vivo del rendimiento de la base de datos PostgreSQL."""

    status: Literal["ok", "degraded", "unavailable"] = "ok"
    timestamp: str = Field(..., description="Estampa temporal ISO 8601")
    total_queries_recorded: int | None = Field(
        default=None, description="Total de consultas catalogadas en pg_stat_statements"
    )
    cache_hit_ratio_pct: float | None = Field(
        default=None, description="Porcentaje global de acierto en caché del motor de base de datos"
    )
    top_queries: list[DatabaseQueryStat] = Field(
        default_factory=list, description="Top de consultas SQL ordenadas por métrica seleccionada"
    )
