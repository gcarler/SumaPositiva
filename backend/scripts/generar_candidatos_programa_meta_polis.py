"""Extrae candidatos meta→programa de PostgreSQL en una transacción de solo lectura."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.modules.compromisos.candidatos_programa_meta_polis import escribir_corpus_programa_meta


async def generar(destino: Path, *, produccion: bool = False) -> dict:
    prueba = os.environ.get("POLIS_TEST_DATABASE_URL")
    if not prueba and not produccion:
        raise RuntimeError("Se requiere POLIS_TEST_DATABASE_URL o --produccion para lectura explícita")
    url = prueba or Settings().async_database_url
    base = make_url(url).database or ""
    if prueba and not base.startswith("polis_test"):
        raise ValueError("POLIS_TEST_DATABASE_URL debe apuntar a polis_test*")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            metas = (
                (
                    await conn.execute(
                        text(
                            """
                        WITH RECURSIVE ancestros AS (
                            SELECT m.id AS meta_id, m.codigo_plan, n.id AS nodo_id,
                                   n.parent_id, n.nivel, 0 AS profundidad, ARRAY[n.id] AS camino
                            FROM seguimiento.pdd_metas_oficiales AS m
                            JOIN seguimiento.pdd_lineas_y_programas AS n
                              ON n.id=m.linea_id AND n.codigo_plan=m.codigo_plan
                            UNION ALL
                            SELECT anc.meta_id, anc.codigo_plan, padre.id,
                                   padre.parent_id, padre.nivel, anc.profundidad+1, anc.camino || padre.id
                            FROM ancestros AS anc
                            JOIN seguimiento.pdd_lineas_y_programas AS padre
                              ON padre.id=anc.parent_id AND padre.codigo_plan=anc.codigo_plan
                            WHERE anc.profundidad < 12 AND NOT padre.id=ANY(anc.camino)
                        ), programas_actuales AS (
                            SELECT DISTINCT ON (meta_id) meta_id, nodo_id
                            FROM ancestros WHERE nivel='PROGRAMA'
                            ORDER BY meta_id, profundidad, nodo_id
                        )
                        SELECT m.id::text AS id, m.codigo_plan, m.linea_id::text AS linea_id,
                               m.codigo, m.nombre, m.fuente,
                               m.datos_oficiales ->> 'programa_codigo' AS programa_codigo,
                               m.datos_oficiales ->> 'programa_nombre' AS programa_nombre,
                               m.datos_oficiales ->> 'pagina_origen' AS pagina_origen,
                               p.nodo_id::text AS programa_ancestro_id
                        FROM seguimiento.pdd_metas_oficiales AS m
                        LEFT JOIN programas_actuales AS p ON p.meta_id=m.id ORDER BY m.id"""
                        )
                    )
                )
                .mappings()
                .all()
            )
            programas = (
                (
                    await conn.execute(
                        text(
                            """SELECT id::text AS id, codigo_plan, parent_id::text AS parent_id,
                               nivel, codigo, nombre, fuente, metadatos ->> 'pagina_origen' AS pagina_origen
                        FROM seguimiento.pdd_lineas_y_programas
                        WHERE nivel = 'PROGRAMA' ORDER BY id"""
                        )
                    )
                )
                .mappings()
                .all()
            )
        return escribir_corpus_programa_meta(
            [dict(row) for row in metas], [dict(row) for row in programas], destino, base_origen=base
        )
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destino", type=Path, required=True)
    parser.add_argument(
        "--produccion", action="store_true", help="Autoriza una lectura SQL de producción, sin escrituras"
    )
    args = parser.parse_args()
    resultado = asyncio.run(generar(args.destino, produccion=args.produccion))
    print(
        json.dumps(
            {
                "ruta_manifiesto": resultado["ruta_manifiesto"],
                "sha256_manifiesto": resultado["sha256_manifiesto"],
                "conteos_estado": resultado["conteos_estado"],
                "filas_metas": resultado["referencias"]["metas"]["filas"],
                "filas_programas": resultado["referencias"]["programas"]["filas"],
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
