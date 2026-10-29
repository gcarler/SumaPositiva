"""Exporta la matriz PDD–PA en una transacción SQL de solo lectura."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import Settings
from app.modules.compromisos.correspondencias_meta_pa_polis import consultar_matriz_correspondencias
from app.modules.compromisos.matriz_correspondencias_corte_polis import (
    InstantaneaCorrespondencias,
    escribir_instantanea,
)


async def congelar(destino: Path, *, produccion: bool = False, derivar_candidatos: bool = False) -> dict:
    url = os.environ.get("POLIS_TEST_DATABASE_URL")
    if not url and not produccion:
        raise ValueError("Se requiere POLIS_TEST_DATABASE_URL o --produccion para lectura explícita")
    url = url or Settings().async_database_url
    base = make_url(url).database or ""
    if os.environ.get("POLIS_TEST_DATABASE_URL") and not base.startswith("polis_test"):
        raise ValueError("POLIS_TEST_DATABASE_URL debe apuntar a polis_test*")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            if (
                not derivar_candidatos
                and await conn.scalar(text("SELECT to_regclass('seguimiento.pdd_correspondencias_meta_pa_bpim')"))
                is None
            ):
                raise ValueError(
                    "Falta la tabla de correspondencias. Use --derivar-candidatos para una lectura sin acreditaciones."
                )
            conteos = (
                (
                    await conn.execute(
                        text("""
                    SELECT p.codigo_plan, count(m.id) AS metas
                    FROM seguimiento.planes_desarrollo_distrital AS p
                    LEFT JOIN seguimiento.pdd_metas_oficiales AS m ON m.codigo_plan=p.codigo_plan
                    GROUP BY p.codigo_plan ORDER BY p.codigo_plan
                """)
                    )
                )
                .mappings()
                .all()
            )
            async with AsyncSession(bind=conn) as session:
                matriz = await consultar_matriz_correspondencias(session, derivar_candidatos=derivar_candidatos)
            captura = InstantaneaCorrespondencias(
                base_origen=base,
                modo_matriz="CANDIDATOS_DERIVADOS_SQL_SIN_ACREDITAR" if derivar_candidatos else "MATERIALIZADA",
                metas_fuente_por_plan={fila["codigo_plan"]: fila["metas"] for fila in conteos},
                matriz=matriz,
            )
        ruta, sha = escribir_instantanea(captura, destino)
        return {
            "ruta": str(ruta),
            "sha256": sha,
            "base_origen": base,
            "modo_matriz": captura.modo_matriz,
            "metas_fuente_por_plan": captura.metas_fuente_por_plan,
            "metas_distintas": matriz.metas_distintas,
            "metas_sin_pa": matriz.metas_sin_pa,
            "filas": len(matriz.filas),
            "estado_publicacion": "no_publicable",
        }
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destino", type=Path, required=True)
    parser.add_argument("--produccion", action="store_true", help="Lectura explícita de producción, sin escrituras")
    parser.add_argument("--derivar-candidatos", action="store_true", help="Deriva candidatos BPIM/año sin persistirlos")
    args = parser.parse_args()
    print(
        json.dumps(
            asyncio.run(congelar(args.destino, produccion=args.produccion, derivar_candidatos=args.derivar_candidatos)),
            ensure_ascii=False,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
