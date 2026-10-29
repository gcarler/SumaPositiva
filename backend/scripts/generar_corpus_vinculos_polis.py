"""Exporta una muestra de vínculos desde PostgreSQL en transacción de solo lectura."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.modules.compromisos.corpus_vinculos_polis import escribir_corpus


async def generar(destino: Path, por_estrato: int) -> dict:
    engine = create_async_engine(os.environ.get("POLIS_TEST_DATABASE_URL") or Settings().async_database_url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            rows = (
                (
                    await conn.execute(
                        text(
                            """
                        SELECT id, codigo_plan, meta_id, codigo_meta, actividad_pa_id,
                               registro_triada_id, codigo_bpim, tipo_vinculo,
                               score_confianza, evidencia_cruce
                        FROM seguimiento.pdd_vinculos_meta_pa_triada
                        ORDER BY id
                        """
                        )
                    )
                )
                .mappings()
                .all()
            )
            return escribir_corpus([dict(row) for row in rows], destino, por_estrato=por_estrato)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destino", type=Path, required=True)
    parser.add_argument("--por-estrato", type=int, default=10)
    args = parser.parse_args()
    print(json.dumps(asyncio.run(generar(args.destino, args.por_estrato)), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
