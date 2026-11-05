"""Revalida el banco después de registrar los cruces explícitos del portal en 7D."""

from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import os
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent
BANK = ROOT / "data/banco_fuentes_oficiales"
RECEIPTS = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, data):
    (EVIDENCE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def execute(argv, **kwargs):
    if len(argv) > 1 and Path(argv[1]).name == "consolidar_datos_integral.py":
        readme = Path(argv[1]).parent / "README.md"
        text = readme.read_text()
        old = "La revisión semántica 7D de la nueva clave y la licencia siguen pendientes;"
        new = (
            "La nueva clave tiene 19 cruces explícitos en el catálogo 7D v6; "
            "la revisión de licencia y comparabilidad sigue pendiente;"
        )
        if old not in text:
            raise ValueError(
                "La nota del corte anterior cambió; revisar antes de sustituir"
            )
        readme.write_text(text.replace(old, new, 1))
    env = dict(kwargs.pop("env", os.environ))
    for key in [
        "POLIS_DATABASE_URL",
        "POLIS_TEST_DATABASE_URL",
        "DATABASE_URL",
        "PGPASSWORD",
    ]:
        env.pop(key, None)
    env.update(PYTHONDONTWRITEBYTECODE="1", PYTHONPATH=str(ROOT / "backend"))
    check = kwargs.pop("check", False)
    result = subprocess.run(
        argv,
        **kwargs,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=600,
    )
    label = f"v6_{len(RECEIPTS) + 1:02d}"
    (EVIDENCE / f"{label}.log").write_text(result.stdout)
    RECEIPTS.append(
        {"argv": argv, "returncode": result.returncode, "log": f"{label}.log"}
    )
    save("comandos_v6.json", RECEIPTS)
    print(json.dumps({"paso": label, "returncode": result.returncode}), flush=True)
    if check:
        result.check_returncode()
    return result


def main():
    if (EVIDENCE / "integracion_final.json").exists():
        raise ValueError("El cierre ya tiene recibo; no repetir")
    first = json.loads((EVIDENCE / "promocion.json").read_text())
    assert (
        digest(BANK / "indicadores_consolidados_cartagena_2026.csv")
        == first["consolidado_actual_sha256"]
    )
    assert (
        digest(BANK / "inventario_pipeline_2026.json")
        == first["inventario_actual_sha256"]
    )
    spec = importlib.util.spec_from_file_location(
        "versionado_policia_v6", ROOT / "scripts/sincronizar_fuentes_versionado.py"
    )
    runner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runner)
    backup = runner.sincronizar(
        ejecutor=execute, actualizar_red=False, derivar=runner._derivar_capas
    )
    assert (
        digest(backup / "indicadores_consolidados_cartagena_2026.csv")
        == first["consolidado_actual_sha256"]
    )
    assert (
        digest(backup / "inventario_pipeline_2026.json")
        == first["inventario_actual_sha256"]
    )
    csv_path = BANK / "indicadores_consolidados_cartagena_2026.csv"
    rows = list(csv.DictReader(csv_path.open()))
    official = [
        r for r in rows if r["fuente_clave"] == "portal_policia_cuadros_cartagena"
    ]
    assert len(rows) == 2396 and len(official) == 133
    quality = json.loads((BANK / "evaluacion_estructural_2026.json").read_text())
    assert quality["evaluacion"]["filas_tipadas"] == 2396
    assert quality["evaluacion"]["problemas"] == {"dimension_sin_clasificar": 144}
    assert quality["validacion_fuentes"]["estados"] == {"validado_estructural": 43}
    # Inspección del producto real generado por el corredor, no fixtures ni mocks.
    import sys

    sys.path.insert(0, str(ROOT / "backend"))
    from app.modules.compromisos.taxonomia_7d_polis import VERSION, clasificar

    dimensions = Counter()
    for row in official:
        result = clasificar(row["fuente_clave"], row["indicador"], row["subtipo"])
        assert result.estado == "exacta"
        dimensions[result.dimension] += 1
    assert dimensions == {"PERS": 119, "COM": 7, "SAT": 7}
    assert VERSION == "seguridad_humana_7d_v6"
    save(
        "integracion_final.json",
        {
            "utc": datetime.now(UTC).isoformat(),
            "estado": "integrado_y_clasificado_en_banco_local",
            "respaldo_antes_catalogo_v6": str(backup.relative_to(ROOT)),
            "respaldo_original_antes_ingesta": first["version_previa"],
            "consolidado_sha256": digest(csv_path),
            "inventario_sha256": digest(BANK / "inventario_pipeline_2026.json"),
            "fuentes": 43,
            "filas_consolidado": len(rows),
            "filas_portal": len(official),
            "clasificacion_version": VERSION,
            "clasificacion_portal": dict(dimensions),
            "nuevo_portal_sin_clasificar": 0,
            "sin_clasificar_preexistentes": 144,
            "calidad_estructural": quality["evaluacion"],
            "bd_csh": "sin conexiones ni cambios",
            "frontend": "sin cambios",
            "pytest": "no ejecutado; se validaron datos reales y el corredor existente",
            "despliegue_remoto": False,
            "commit": False,
            "push": False,
        },
    )
    print(
        json.dumps(
            {
                "estado": "integrado_y_clasificado_en_banco_local",
                "dimensiones": dict(dimensions),
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
