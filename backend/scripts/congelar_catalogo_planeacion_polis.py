"""Exporta todos los nodos y metas PDD en una única transacción de solo lectura."""

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
from app.modules.compromisos.catalogo_planeacion_corte_polis import CatalogoPlaneacion, escribir_catalogo


async def congelar(destino: Path, *, produccion: bool = False) -> dict:
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
            cobertura = (
                (
                    await conn.execute(
                        text("""
                SELECT p.codigo_plan,
                    (SELECT count(*) FROM seguimiento.pdd_lineas_y_programas n
                     WHERE n.codigo_plan=p.codigo_plan) AS nodos,
                    (SELECT count(*) FROM seguimiento.pdd_metas_oficiales m
                     WHERE m.codigo_plan=p.codigo_plan) AS metas
                FROM seguimiento.planes_desarrollo_distrital p ORDER BY p.codigo_plan
            """)
                    )
                )
                .mappings()
                .all()
            )
            nodos = (
                (
                    await conn.execute(
                        text("""
                SELECT id, codigo_plan, parent_id, nivel, codigo, nombre, orden,
                       ppi_anual_cop, fuente, metadatos FROM seguimiento.pdd_lineas_y_programas
            """)
                    )
                )
                .mappings()
                .all()
            )
            metas = (
                (
                    await conn.execute(
                        text("""
                SELECT id, codigo_plan, linea_id, tipo_meta, codigo, nombre, indicador,
                       unidad_medida, linea_nombre, fuente, fila_fuente, datos_oficiales
                FROM seguimiento.pdd_metas_oficiales
            """)
                    )
                )
                .mappings()
                .all()
            )
            catalogo = CatalogoPlaneacion(
                base_origen=base,
                cobertura_sql={f["codigo_plan"]: {"nodos": f["nodos"], "metas": f["metas"]} for f in cobertura},
                nodos=[dict(f) for f in nodos],
                metas=[dict(f) for f in metas],
            )
        ruta, sha = escribir_catalogo(catalogo, destino)
        return {
            "ruta": str(ruta),
            "sha256": sha,
            "base_origen": base,
            "planes": len(catalogo.cobertura_sql),
            "nodos": len(nodos),
            "metas": len(metas),
            "metas_sin_nodo": sum(m.linea_id is None for m in catalogo.metas),
            "estado_publicacion": "no_publicable",
        }
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destino", type=Path, required=True)
    parser.add_argument("--produccion", action="store_true", help="Lectura explícita de producción, sin escrituras")
    args = parser.parse_args()
    print(json.dumps(asyncio.run(congelar(args.destino, produccion=args.produccion)), ensure_ascii=False))


if __name__ == "__main__":
    main()
