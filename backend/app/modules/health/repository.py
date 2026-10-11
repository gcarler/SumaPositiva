import time

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class HealthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ping_ms(self) -> float:
        start = time.perf_counter()
        await self.session.execute(text("SELECT 1"))
        return round((time.perf_counter() - start) * 1000, 2)

    async def active_connections(self) -> int:
        result = await self.session.scalar(
            text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
        )
        return int(result or 0)

    async def max_connections(self) -> int:
        result = await self.session.scalar(text("SHOW max_connections"))
        try:
            return int(result)
        except (ValueError, TypeError):
            return 100

    async def migration_revision(self) -> str | None:
        exists = await self.session.scalar(text("SELECT to_regclass('public.alembic_version')"))
        if exists is None:
            return None
        return await self.session.scalar(text("SELECT version_num FROM alembic_version"))

    async def installed_extensions(self) -> set[str]:
        result = await self.session.scalars(text("SELECT extname FROM pg_extension"))
        return set(result)
