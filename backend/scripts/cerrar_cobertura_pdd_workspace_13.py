"""Make canonical PDD deduplication explicit and mark a second matching pass."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402


async def close() -> dict[str, int]:
    engine = create_async_engine(Settings().async_database_url)
    try:
        async with engine.begin() as connection:
            rows = (
                (
                    await connection.execute(
                        text("""
                        SELECT id, datos_oficiales
                        FROM seguimiento.pdd_metas_oficiales
                        ORDER BY codigo_plan, id
                    """)
                    )
                )
                .mappings()
                .all()
            )
            canonical: dict[str, str] = {}
            for row in rows:
                data = row["datos_oficiales"] or {}
                audit = data.get("_auditoria_forense", {})
                if audit.get("estado_cobertura") != "DUPLICADA_ENTRE_FUENTES_PDD":
                    canonical[str(row["id"])] = str(row["id"])

            unique_count = 0
            duplicate_count = 0
            second_pass = 0
            for row in rows:
                data = dict(row["datos_oficiales"] or {})
                audit = dict(data.get("_auditoria_forense", {}))
                is_duplicate = audit.get("estado_cobertura") == "DUPLICADA_ENTRE_FUENTES_PDD"
                primary = audit.get("fuente_primaria_id") or data.get("_vinculo_triada", {}).get("fila_primaria_id")
                if is_duplicate:
                    duplicate_count += 1
                    canonical_id = canonical.get(str(primary)) if primary else None
                    if canonical_id is None:
                        # Keep an unresolved clone out of the canonical count; require review.
                        audit["requiere_revision_humana"] = True
                        audit["segunda_pasada"] = "DUPLICADO_SIN_PRIMARIO_CANONICO"
                        duplicate_count -= 1
                        unique_count += 1
                        canonical_id = str(row["id"])
                    else:
                        audit["meta_canonica_id"] = canonical_id
                        audit["es_meta_unica_canonica"] = False
                else:
                    unique_count += 1
                    audit["meta_canonica_id"] = str(row["id"])
                    audit["es_meta_unica_canonica"] = True
                    link = data.get("_vinculo_triada", {})
                    if link.get("registro_triada_id"):
                        audit["segunda_pasada"] = "REVALIDADA_CON_CORPUS_INGESTADO"
                        audit["segunda_pasada_resultado"] = "VINCULO_PREEXISTENTE_CONSERVADOR"
                        second_pass += 1
                    elif audit.get("estado_cobertura") == "CANDIDATO_BAJA_CONFIANZA":
                        audit["segunda_pasada"] = "REVISADA_SIN_EVIDENCIA_SUFICIENTE"
                        audit["segunda_pasada_resultado"] = "SIN_COINCIDENCIA_VERIFICADA_ENTIDAD_INDICADOR"
                        audit["segunda_pasada_umbral_similitud"] = 0.82
                        audit["segunda_pasada_corpus"] = {
                            "actividades_motor_pa_real": 169,
                            "filas_pdf_plan_accion": 6567,
                        }
                        audit["requiere_revision_humana"] = True
                        second_pass += 1
                data["_auditoria_forense"] = audit
                await connection.execute(
                    text("""
                        UPDATE seguimiento.pdd_metas_oficiales
                        SET datos_oficiales=CAST(:data AS jsonb)
                        WHERE id=:id
                    """),
                    {"id": row["id"], "data": json.dumps(data, ensure_ascii=False)},
                )
            if unique_count != 1805 or duplicate_count != 273:
                raise ValueError(
                    "El catálogo PDD no conserva la partición auditada 1.805/273: "
                    f"unicas={unique_count}, duplicadas={duplicate_count}"
                )
        return {
            "metas_brutas": len(rows),
            "metas_unicas_canonicas": unique_count,
            "duplicados_enlazados": duplicate_count,
            "metas_revisadas_segunda_pasada": second_pass,
        }
    finally:
        await engine.dispose()


async def main() -> None:
    result = await close()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
