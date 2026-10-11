import asyncio
from datetime import datetime, timezone
import logging
import resource
import shutil

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import Settings
from app.core.migrations import EXPECTED_REVISION
from app.core.telemetry import global_telemetry
from app.modules.health.repository import HealthRepository
from app.modules.health.schemas import (
    DatabaseMetrics,
    ObservabilityMetrics,
    ProcessMetrics,
    ReadinessResponse,
    StorageMetrics,
    SystemHealthResponse,
)

logger = logging.getLogger(__name__)
REQUIRED_EXTENSIONS = {"postgis", "ltree", "pgcrypto", "pg_trgm"}


def obtener_memoria_rss_mb() -> float:
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    return round(int(parts[1]) / 1024.0, 2)
    except Exception:
        pass
    return round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0, 2)


def obtener_metricas_almacenamiento(ruta: str = "/root/polis") -> StorageMetrics:
    try:
        usage = shutil.disk_usage(ruta)
    except Exception:
        usage = shutil.disk_usage("/")
    total_gb = round(usage.total / (1024**3), 2)
    used_gb = round(usage.used / (1024**3), 2)
    free_gb = round(usage.free / (1024**3), 2)
    used_pct = round((usage.used / usage.total) * 100, 1) if usage.total > 0 else 0.0
    return StorageMetrics(
        total_gb=total_gb,
        used_gb=used_gb,
        free_gb=free_gb,
        used_pct=used_pct,
    )


class HealthService:
    def __init__(self, repository: HealthRepository) -> None:
        self.repository = repository

    async def readiness(self) -> ReadinessResponse:
        try:
            async with asyncio.timeout(5):
                revision = await self.repository.migration_revision()
                extensions = await self.repository.installed_extensions()
        except (SQLAlchemyError, OSError, TimeoutError):
            logger.warning("Comprobación de disponibilidad: base de datos inaccesible")
            return ReadinessResponse(
                status="unavailable",
                database="unavailable",
                migrations="unknown",
                extensions="unknown",
            )

        migrated = revision == EXPECTED_REVISION
        extended = REQUIRED_EXTENSIONS <= extensions
        return ReadinessResponse(
            status="ready" if migrated and extended else "unavailable",
            database="ok",
            migrations="ok" if migrated else "pending",
            extensions="ok" if extended else "missing",
        )

    async def system_metrics(self, settings: Settings) -> SystemHealthResponse:
        db_status = "ok"
        ping_ms = 0.0
        active_conn = 0
        max_conn = 100
        revision = None
        extensions: set[str] = set()

        try:
            async with asyncio.timeout(5):
                ping_ms = await self.repository.ping_ms()
                active_conn = await self.repository.active_connections()
                max_conn = await self.repository.max_connections()
                revision = await self.repository.migration_revision()
                extensions = await self.repository.installed_extensions()
        except (SQLAlchemyError, OSError, TimeoutError) as e:
            logger.warning("Fallo al consultar telemetría de base de datos: %s", type(e).__name__)
            db_status = "unavailable"

        migrated = revision == EXPECTED_REVISION
        extended = REQUIRED_EXTENSIONS <= extensions

        db_metrics = DatabaseMetrics(
            status=db_status,
            ping_ms=ping_ms,
            active_connections=active_conn,
            max_connections=max_conn,
            migration_revision=revision,
            migrations_status="ok" if migrated else ("pending" if revision else "unknown"),
            extensions_status="ok" if extended else ("missing" if extensions else "unknown"),
            installed_extensions=sorted(list(extensions)),
        )

        telemetry_data = global_telemetry.get_metrics()
        process_metrics = ProcessMetrics(
            uptime_seconds=telemetry_data["uptime_seconds"],
            memory_rss_mb=obtener_memoria_rss_mb(),
            total_requests=telemetry_data["total_requests"],
            requests_2xx=telemetry_data["requests_2xx"],
            requests_3xx=telemetry_data["requests_3xx"],
            requests_4xx=telemetry_data["requests_4xx"],
            requests_5xx=telemetry_data["requests_5xx"],
            error_rate_pct=telemetry_data["error_rate_pct"],
            avg_latency_ms=telemetry_data["avg_latency_ms"],
        )

        storage_metrics = obtener_metricas_almacenamiento()
        sentry_status = "activo" if settings.sentry_dsn else "desactivado"
        obs_metrics = ObservabilityMetrics(sentry_status=sentry_status)

        overall_status = "ok"
        if db_status != "ok" or not migrated:
            overall_status = "degraded"
        if storage_metrics.used_pct > 95:
            overall_status = "degraded"

        return SystemHealthResponse(
            status=overall_status,
            timestamp=datetime.now(timezone.utc).isoformat(),
            service="polis-api",
            version="0.2.1",
            environment=settings.environment,
            database=db_metrics,
            process=process_metrics,
            storage=storage_metrics,
            observability=obs_metrics,
        )
