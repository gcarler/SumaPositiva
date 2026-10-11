import time
from typing import Any

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

    async def obtener_telemetria_consultas(
        self, limite: int = 10, ordenar_por: str = "tiempo_total"
    ) -> tuple[int, float, list[dict[str, Any]]]:
        """Obtiene métricas de pg_stat_statements y el cache hit ratio de pg_stat_database."""
        cache_ratio = 99.5
        try:
            res_ratio = await self.session.scalar(
                text(
                    "SELECT round((sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0)), 2) "
                    "FROM pg_stat_database;"
                )
            )
            if res_ratio is not None:
                cache_ratio = float(res_ratio)
        except Exception:
            pass

        total_queries = 0
        try:
            res_total = await self.session.scalar(text("SELECT count(*) FROM pg_stat_statements;"))
            total_queries = int(res_total or 0)
        except Exception:
            pass

        col_orden = "total_exec_time DESC"
        if ordenar_por == "tiempo_medio":
            col_orden = "mean_exec_time DESC"
        elif ordenar_por == "llamadas":
            col_orden = "calls DESC"

        query_sql = f"""
            SELECT
                query,
                calls,
                round(total_exec_time::numeric, 2) AS total_ms,
                round(mean_exec_time::numeric, 2) AS mean_ms,
                rows,
                CASE 
                    WHEN (shared_blks_hit + shared_blks_read) = 0 THEN 100.0
                    ELSE round((shared_blks_hit::numeric / (shared_blks_hit + shared_blks_read)::numeric) * 100, 2)
                END AS hit_ratio_pct
            FROM pg_stat_statements
            WHERE query NOT LIKE '%pg_stat_statements%'
            ORDER BY {col_orden}
            LIMIT :limite;
        """
        top_queries: list[dict[str, Any]] = []
        try:
            rows = await self.session.execute(text(query_sql), {"limite": limite})
            for r in rows.mappings():
                top_queries.append({
                    "query": str(r["query"]),
                    "calls": int(r["calls"]),
                    "total_ms": float(r["total_ms"] or 0.0),
                    "mean_ms": float(r["mean_ms"] or 0.0),
                    "rows": int(r["rows"] or 0),
                    "hit_ratio_pct": float(r["hit_ratio_pct"] or 100.0),
                })
        except Exception:
            pass

        return total_queries, cache_ratio, top_queries
