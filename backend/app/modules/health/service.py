import asyncio
import logging

from sqlalchemy.exc import SQLAlchemyError

from app.core.migrations import EXPECTED_REVISION
from app.modules.health.repository import HealthRepository
from app.modules.health.schemas import ReadinessResponse

logger = logging.getLogger(__name__)
REQUIRED_EXTENSIONS = {"postgis", "ltree", "pgcrypto", "pg_trgm"}


class HealthService:
    def __init__(self, repository: HealthRepository) -> None:
        self.repository = repository

    async def readiness(self) -> ReadinessResponse:
        try:
            async with asyncio.timeout(5):
                revision = await self.repository.migration_revision()
                extensions = await self.repository.installed_extensions()
        except (SQLAlchemyError, OSError, TimeoutError):
            # Do not put database credentials or exception details in the public response/log.
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
