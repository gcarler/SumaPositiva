"""Integra el corte policial por el corredor existente, sin conexiones PostgreSQL."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent
BANK = ROOT / "data/banco_fuentes_oficiales"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, value):
    (EVIDENCE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def execute(argv, **kwargs):
    if len(argv) > 1 and Path(argv[1]).name == "consolidar_datos_integral.py":
        staging = Path(argv[1]).parent
        candidate = (
            staging / "policia_portal/procesados/20261105_v2/candidato_activo.json"
        )
        control = staging / "policia_portal/activo.json"
        if control.exists():
            raise ValueError("Ya hay un puntero activo; no sustituir sin revisión")
        shutil.copy2(candidate, control)
        readme = staging / "README.md"
        with readme.open("a", encoding="utf-8") as output:
            output.write(
                "\n\n## Actualización del portal oficial de Policía — 2026-11-05\n\n"
                "Se descargaron los nueve anexos de https://www.policia.gov.co/estadistica-delictiva: "
                "dos publicaciones de cuadros y siete archivos anuales de registros 2020–2026. "
                "Los originales y sus hashes están en `policia_portal/capturas/20261105/`. "
                "La extracción completa está en `policia_portal/procesados/20261105_v2/`.\n\n"
                "El ZIP compartido es idéntico al oficial y sus 77 valores coinciden. "
                "En el consolidado se sustituye la clave recibida por "
                "`portal_policia_cuadros_cartagena`, con 133 observaciones anuales: "
                "18 delitos/modalidades más el subtotal de hurtos. Se conservan aparte "
                "1.539 observaciones mensuales y 7.290 desgloses mensuales por armas, "
                "sin forzarlos al contrato anual del corredor. El corte de 2026 llega a septiembre.\n\n"
                "Los registros y los cuadros difieren en ocho meses de lesiones de 2021 "
                "(24 casos adicionales en registros). La causa no está determinada; "
                "se conservan ambos valores y se usa como referencia la publicación "
                "de cuadros recomendada por la entidad. Sexo y edad tienen advertencias "
                "de completitud del publicador. No sumar cuadros, registros y ediciones Socrata.\n\n"
                "El SQLite anterior conserva su contenido. La revisión semántica 7D "
                "de la nueva clave y la licencia siguen pendientes; la incorporación "
                "local no es autorización de publicación ni una evaluación causal. "
                "Ver `policia_portal/activo.json` y el informe del puente "
                "`bridge/20261105_cotejo_fuente_oficial_policia.md`.\n"
            )
    env = dict(kwargs.pop("env", os.environ))
    for key in [
        "POLIS_DATABASE_URL",
        "POLIS_TEST_DATABASE_URL",
        "DATABASE_URL",
        "PGPASSWORD",
    ]:
        env.pop(key, None)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PYTHONPATH"] = str(ROOT / "backend")
    check = kwargs.pop("check", False)
    started = datetime.now(UTC).isoformat()
    before = time.monotonic()
    result = subprocess.run(
        argv,
        **kwargs,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=600,
    )
    index = len(RECEIPTS) + 1
    log = f"promocion_{index:02d}_{Path(argv[1]).stem}.log"
    (EVIDENCE / log).write_text(result.stdout)
    RECEIPTS.append(
        {
            "argv": argv,
            "cwd": str(kwargs.get("cwd", ROOT)),
            "inicio_utc": started,
            "segundos": round(time.monotonic() - before, 3),
            "returncode": result.returncode,
            "log": log,
            "base_postgresql": "no utilizada",
        }
    )
    save("comandos_promocion.json", RECEIPTS)
    print(
        json.dumps({"paso": index, "returncode": result.returncode, "log": log}),
        flush=True,
    )
    if check:
        result.check_returncode()
    return result


RECEIPTS = []


def main():
    if (EVIDENCE / "promocion.json").exists():
        raise ValueError("La promoción ya tiene recibo; no repetir")
    previous = json.loads(
        (BANK / "policia_portal/capturas/20261105/entradas_previas.json").read_text()
    )
    for name in [
        "catalogo.csv",
        "cartagena_seguridad_humana.sqlite",
        "indicadores_consolidados_cartagena_2026.csv",
        "indicadores_consolidados_cartagena_2026.manifest.json",
        "inventario_pipeline_2026.json",
    ]:
        relative = "data/banco_fuentes_oficiales/" + name
        if digest(BANK / name) != previous["archivos"][relative]:
            raise ValueError(f"El banco cambió concurrentemente: {name}")
    previous_hashes = dict(previous["archivos"])
    runner = module(
        "polis_versionado_policia", ROOT / "scripts/sincronizar_fuentes_versionado.py"
    )
    backup = runner.sincronizar(
        ejecutor=execute, actualizar_red=False, derivar=runner._derivar_capas
    )
    for relative, expected in previous_hashes.items():
        if relative.startswith("data/banco_fuentes_oficiales/"):
            path = backup / relative.removeprefix("data/banco_fuentes_oficiales/")
        else:
            path = ROOT / relative
        if digest(path) != expected:
            raise ValueError(f"Respaldo no coincide con el original: {relative}")
    save(
        "promocion.json",
        {
            "utc": datetime.now(UTC).isoformat(),
            "estado": "integrado_en_banco_local",
            "version_previa": str(backup.relative_to(ROOT)),
            "version_previa_verificada": True,
            "consolidado_actual_sha256": digest(
                BANK / "indicadores_consolidados_cartagena_2026.csv"
            ),
            "inventario_actual_sha256": digest(BANK / "inventario_pipeline_2026.json"),
            "sqlite_original_sin_cambios": digest(
                BANK / "cartagena_seguridad_humana.sqlite"
            )
            == previous_hashes[
                "data/banco_fuentes_oficiales/cartagena_seguridad_humana.sqlite"
            ],
            "bd_csh": "sin conexiones ni modificaciones",
            "despliegue": False,
            "commit": False,
            "push": False,
        },
    )
    print(
        json.dumps({"estado": "integrado_en_banco_local", "respaldo": str(backup)}),
        flush=True,
    )


if __name__ == "__main__":
    main()
