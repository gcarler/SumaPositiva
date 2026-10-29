"""Check backend oficial, aislado y con snapshots de las fuentes efectivamente comprobadas."""

import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "bridge/236_verificacion_backend_final"
AISLADO = ROOT / "bridge/205_evidencia_temporales_pruebas"
OUT.mkdir(exist_ok=False)


def snapshot():
    rutas = set()
    for directorio in ("app", "tests", "scripts", "alembic"):
        rutas.update((ROOT / "backend" / directorio).rglob("*.py"))
    rutas.update(ROOT / ruta for ruta in (
        "backend/pyproject.toml", "backend/uv.lock", "backend/alembic.ini", "backend/.env.example",
        ".github/workflows/check.yml", "scripts/inventariar_fuentes_polis.py",
        "docs/permisos-api.md", "docs/operacion.md", "docs/transacciones.md", "docs/identidad.md",
        "data/banco_fuentes_oficiales/inventario_pipeline_2026.json",
        "data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv",
    ))
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted(rutas) if p.is_file()}
    return {
        "fecha_utc": datetime.now(UTC).isoformat(), "archivos": len(hashes), "sha256": hashes,
        "comando_backend_check": json.loads((ROOT / "package.json").read_bytes())["scripts"]["backend:check"],
        "exclusion": "Frontend/build concurrente fuera de este snapshot; no constituye su verificación.",
    }


def guardar(nombre, valor):
    with (OUT / nombre).open("x") as archivo:
        json.dump(valor, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")


inicio = snapshot()
guardar("snapshot_inicio.json", inicio)
assert hashlib.sha256((ROOT / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json").read_bytes()).hexdigest() == (
    "ec1b06f4f255791561308ade00bf4dd7b60b1d3856d1d0ce5fe3f6d5ef5b2823"
), "Inventario distinto al aprobado para esta corrida"
resultado = subprocess.run([
    str(ROOT / "backend/.venv/bin/python"), str(AISLADO / "ejecutar_aislado.py"),
    "--log", "236_backend_check_final", "ejecutar", "--", "env",
    "PYTEST_ADDOPTS=-p no:cacheprovider --junitxml=bridge/205_evidencia_temporales_pruebas/236_backend_check_final.xml --tb=short",
    "bun", "run", "backend:check",
], cwd=ROOT, text=True, capture_output=True)
with (OUT / "salida_runner.log").open("x") as archivo:
    archivo.write(resultado.stdout + resultado.stderr)
fin = snapshot()
guardar("snapshot_fin.json", fin)
cambios = [p for p in sorted(inicio["sha256"].keys() | fin["sha256"].keys())
           if inicio["sha256"].get(p) != fin["sha256"].get(p)]
meta = json.loads((AISLADO / "236_backend_check_final.json").read_bytes())
resumen = {
    "fecha_utc": datetime.now(UTC).isoformat(), "codigo_salida": resultado.returncode,
    "metadata_corrida": meta, "archivos_snapshot": inicio["archivos"], "fuentes_cambiadas": cambios,
    "comando_oficial_inalterado": inicio["comando_backend_check"] == fin["comando_backend_check"],
}
xml = AISLADO / "236_backend_check_final.xml"
if xml.is_file():
    casos = ET.parse(xml).getroot().findall(".//testcase")
    fallos = [{"clase": c.get("classname"), "caso": c.get("name"),
               "detalle": (c.find("failure").text if c.find("failure") is not None else c.find("error").text)}
              for c in casos if c.find("failure") is not None or c.find("error") is not None]
    omitidas = [{"clase": c.get("classname"), "caso": c.get("name"),
                 "motivo": c.find("skipped").get("message")}
                for c in casos if c.find("skipped") is not None]
    resumen.update(total=len(casos), aprobadas=len(casos) - len(fallos) - len(omitidas),
                   fallidas=len(fallos), omitidas=len(omitidas), detalle_fallos=fallos, detalle_omitidas=omitidas)
guardar("resultado.json", resumen)
print(json.dumps({k: v for k, v in resumen.items() if not k.startswith("detalle_")}, ensure_ascii=False))
assert not cambios and resumen["comando_oficial_inalterado"], "La fuente cambió durante la corrida"
raise SystemExit(resultado.returncode)
