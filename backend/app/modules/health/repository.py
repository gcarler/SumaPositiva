from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class HealthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def migration_revision(self) -> str | None:
        exists = await self.session.scalar(text("SELECT to_regclass('public.alembic_version')"))
        if exists is None:
            return None
        return await self.session.scalar(text("SELECT version_num FROM alembic_version"))

    async def installed_extensions(self) -> set[str]:
        result = await self.session.scalars(text("SELECT extname FROM pg_extension"))
        return set(result)
