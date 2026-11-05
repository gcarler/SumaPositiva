"""Comprueba artefactos reales, conservación de valores y reglas del corte final."""

from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
E = Path(__file__).resolve().parent
BANK = ROOT / "data/banco_fuentes_oficiales"


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def csv_rows(path):
    with path.open(newline="", encoding="utf-8") as stream:
        return list(csv.DictReader(stream))


def facts(rows):
    fields = [
        "fuente_clave",
        "indicador",
        "anio",
        "subtipo",
        "valor",
        "unidad",
        "ambito",
    ]
    return Counter(tuple(row[key] for key in fields) for row in rows)


def main():
    receipt = json.loads((E / "integracion_final.json").read_text())
    inventory = json.loads((BANK / "inventario_pipeline_2026.json").read_text())
    assert sha(BANK / "inventario_pipeline_2026.json") == receipt["inventario_sha256"]
    assert (
        sha(BANK / "indicadores_consolidados_cartagena_2026.csv")
        == receipt["consolidado_sha256"]
    )
    bad = []
    for entry in inventory["archivos"]:
        path = ROOT / entry["ruta"]
        if (
            not path.is_file()
            or sha(path) != entry["sha256"]
            or path.stat().st_size != entry["bytes"]
        ):
            bad.append(entry["ruta"])
    assert not bad, bad
    previous = ROOT / receipt["respaldo_original_antes_ingesta"]
    before = csv_rows(previous / "indicadores_consolidados_cartagena_2026.csv")
    after = csv_rows(BANK / "indicadores_consolidados_cartagena_2026.csv")
    retained_before = [
        r for r in before if r["fuente_clave"] != "drive_excel_policial_11_delitos"
    ]
    retained_after = [
        r for r in after if r["fuente_clave"] != "portal_policia_cuadros_cartagena"
    ]
    assert len(retained_before) == len(retained_after) == 2263
    assert facts(retained_before) == facts(retained_after)
    assert sha(previous / "cartagena_seguridad_humana.sqlite") == sha(
        BANK / "cartagena_seguridad_humana.sqlite"
    )
    for p in (previous / "extracciones").glob("policia_*.json"):
        assert sha(p) == sha(BANK / "extracciones" / p.name)

    sys.dont_write_bytecode = True
    sys.path.insert(0, str(ROOT / "backend"))
    from app.modules.compromisos.taxonomia_7d_polis import clasificar

    spec = importlib.util.spec_from_file_location(
        "taxonomia_antes_portal", E / "taxonomia_7d_antes.py"
    )
    old = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = old
    spec.loader.exec_module(old)
    changes = []
    for row in retained_before:
        a = old.clasificar(row["fuente_clave"], row["indicador"], row["subtipo"])
        b = clasificar(row["fuente_clave"], row["indicador"], row["subtipo"])
        if (a.dimension, a.estado, a.regla) != (b.dimension, b.estado, b.regla):
            changes.append(row["fuente_clave"])
    assert not changes
    # El reemplazo de la clave recibida conserva las dimensiones de sus 77 datos.
    new_rows = {
        (r["anio"], r["indicador"]): r
        for r in after
        if r["fuente_clave"] == "portal_policia_cuadros_cartagena"
    }
    for row in before:
        if row["fuente_clave"] != "drive_excel_policial_11_delitos":
            continue
        current = new_rows[(row["anio"], row["indicador"])]
        a = old.clasificar(row["fuente_clave"], row["indicador"], row["subtipo"])
        b = clasificar(
            current["fuente_clave"], current["indicador"], current["subtipo"]
        )
        assert a.dimension == b.dimension and a.estado == b.estado

    derivation_path = (
        ROOT
        / "data/capas_analiticas/derivaciones"
        / (
            receipt["consolidado_sha256"]
            + "-"
            + receipt["inventario_sha256"]
            + "-v2.json"
        )
    )
    derivation = json.loads(derivation_path.read_text())
    for prefix in [
        "canonico",
        "contraste",
        "series_7d",
        "paneles_series",
        "tablero_operacion",
    ]:
        assert (
            sha(ROOT / derivation[prefix + "_ruta"]) == derivation[prefix + "_sha256"]
        )
    canonical = [
        json.loads(line) for line in (ROOT / derivation["canonico_ruta"]).open()
    ]
    official = [
        r for r in canonical if r["fuente_clave"] == "portal_policia_cuadros_cartagena"
    ]
    assert len(canonical) == 2396 and len(official) == 133
    dimensions = Counter(r["clasificacion_7d"]["dimension"] for r in official)
    assert dimensions == {"PERS": 119, "COM": 7, "SAT": 7}
    assert all(r["clasificacion_7d"]["estado"] == "exacta" for r in official)
    assert all(
        r["tipo_fecha"] == "anio_declarado_por_fuente" and r["territorio_id"] == "13001"
        for r in official
    )
    assert all(r["provisional"] == (r["anio"] == 2026) for r in official)
    for directory in [
        receipt["respaldo_original_antes_ingesta"],
        receipt["respaldo_antes_catalogo_v6"],
    ]:
        stage_name = Path(directory).name
        assert not (
            ROOT / "data" / ("banco_fuentes_oficiales.stage." + stage_name)
        ).exists()
    result = {
        "utc": datetime.now(UTC).isoformat(),
        "estado": "verificado",
        "artefactos_inventario_verificados": len(inventory["archivos"]),
        "discrepancias_sha": bad,
        "valores_preexistentes_preservados": len(retained_before),
        "clasificaciones_preexistentes_preservadas": len(retained_before),
        "dimensiones_de_los_77_reemplazados_preservadas": True,
        "sqlite_y_extracciones_socrata_sin_cambios": True,
        "clasificaciones_portal_en_producto_canonico": dict(dimensions),
        "observaciones_portal_canonicas": len(official),
        "derivacion": str(derivation_path.relative_to(ROOT)),
        "derivacion_sha256": sha(derivation_path),
        "artefactos_derivados": {
            key: value
            for key, value in derivation.items()
            if key.endswith(("_ruta", "_sha256"))
        },
        "staging_propios_residuales": [],
        "pytest": "no ejecutado",
    }
    (E / "verificacion_final.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                key: result[key]
                for key in [
                    "estado",
                    "artefactos_inventario_verificados",
                    "valores_preexistentes_preservados",
                    "observaciones_portal_canonicas",
                    "clasificaciones_portal_en_producto_canonico",
                ]
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
