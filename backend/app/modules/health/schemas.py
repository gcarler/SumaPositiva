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
