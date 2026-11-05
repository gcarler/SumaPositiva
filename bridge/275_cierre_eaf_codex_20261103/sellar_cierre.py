"""Contrasta la evidencia y emite el cierre sin modificar código de aplicación."""

import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
E = Path(__file__).resolve().parent
REPORT = ROOT / "bridge/275_dictamen_eaf_independiente_codex.md"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, data):
    (E / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def exported():
    return sorted(
        path
        for path in E.rglob("*")
        if path.is_file()
        and not set(path.relative_to(E).parts).intersection(
            {
                ".runtime",
                "__pycache__",
                ".pytest_cache",
                ".ruff_cache",
            }
        )
        and path.name not in {"manifest_sha256.json", "notificacion_tmux.json"}
    )


def main():
    if (E / "manifest_sha256.json").exists():
        raise SystemExit("La entrega ya está sellada; no sobrescribir")
    snap = json.loads((E / "snapshot.json").read_text())
    if digest(REPORT) != snap["dictamen_preservado_sha256"]:
        raise SystemExit("El dictamen cambió después de fijar la evidencia")
    differences = [
        name
        for name, sha in snap["archivos_snapshot"].items()
        if not (ROOT / name).is_file() or digest(ROOT / name) != sha
    ]
    assert not differences, differences
    assert digest(E / "test_monitor_reinspeccion.py") == snap["arnes_original_sha256"]
    for path in [
        E / ".runtime/snapshot/scripts/monitor_sistema_polis.sh",
        E / "monitor_sistema_polis_auditado.sh",
    ]:
        assert digest(path) == snap["monitor_congelado_sha256"]
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    assert head == snap["head_observado"]

    results = {}
    for name, expected in [
        ("monitor_r1", 12),
        ("monitor_r2", 12),
        ("http_canales_r2", 4),
    ]:
        suites = list(ET.parse(E / f"{name}.xml").getroot().iter("testsuite"))
        counts = {
            key: sum(int(suite.get(key, "0")) for suite in suites)
            for key in ["tests", "failures", "errors", "skipped"]
        }
        assert counts == {"tests": expected, "failures": 0, "errors": 0, "skipped": 0}
        assert json.loads((E / f"{name}.json").read_text())["returncode"] == 0
        results[name] = counts
    assert json.loads((E / "sintaxis.json").read_text())["returncode"] == 0
    static = json.loads((E / "verificacion_estatica.json").read_text())
    assert all(item["returncode"] == 0 for item in static)

    originals = {
        "f12facbcdde8e2c989cc581aaa337096a7da16354439a95f7f3aa80b9658bcd4": ROOT
        / "bridge/275_reinspeccion_eaf_codex_20261103/dictamen_20261102_original.md",
        snap["dictamen_preservado_sha256"]: E
        / "dictamen_rechazado_20261103_preservado.md",
    }
    custody = []
    for folder in ["275_evidencia_eaf_codex", "275_reinspeccion_eaf_codex_20261103"]:
        manifest = ROOT / "bridge" / folder / "manifest_sha256.json"
        items = json.loads(manifest.read_text())["archivos"]
        for item in items:
            path = ROOT / item["path"]
            if path == REPORT:
                path = originals[item["sha256"]]
            assert digest(path) == item["sha256"], item["path"]
        custody.append(
            {
                "manifiesto": str(manifest.relative_to(ROOT)),
                "sha256": digest(manifest),
                "entradas_verificadas": len(items),
                "discrepancias": [],
                "referencia_dictamen_mutable": "resuelta por copia íntegra preservada con el SHA original",
            }
        )
    save("custodia_historica.json", custody)

    text = REPORT.read_text()
    lines = text.splitlines()
    assert lines[2].startswith("**Dictamen vigente — re-inspección")
    lines[2] = (
        "**Dictamen vigente — cierre independiente del 2026-11-03: APROBADO.** "
        "Se cierran H275-01 a H275-05 en el alcance declarado, incluidos R1.1, R1.2 y R1.3. "
        "Verificación nueva: 12/12 pruebas dos veces y 4/4 comprobaciones HTTP adicionales. "
        "[Detalle vigente en la sección 9](#9-verificación-final-independiente-del-2026-11-03--dictamen-vigente)."
    )
    for i, line in enumerate(lines):
        if line.startswith("> **Antecedente histórico:"):
            lines[i] = (
                "> **Antecedentes históricos:** las secciones 1–7 conservan la evaluación "
                "del 2 de noviembre y la sección 8 documenta la primera re-inspección, "
                "todavía rechazada. **La sección 9 contiene el cierre vigente APROBADO.** "
                "Ambos dictámenes anteriores se custodian íntegros con sus hashes originales."
            )
    text = "\n".join(lines) + "\n"
    text = (
        text.replace(
            "## 8. Re-inspección independiente del 2026-11-03 — dictamen vigente",
            "## 8. Primera re-inspección independiente del 2026-11-03 — evaluación histórica",
            1,
        )
        .replace(
            "**Estado final: RECHAZADO.** Se cierran H275-02",
            "**Estado de esta re-inspección histórica: RECHAZADO.** Se cierran H275-02",
            1,
        )
        .replace(
            "**Conclusión vigente:** hay progreso comprobado y cuatro cierres;",
            "**Conclusión histórica de la primera re-inspección:** hay progreso comprobado y cuatro cierres;",
            1,
        )
    )
    text += "\n" + (E / "cierre_final.md").read_text()

    known = {}
    for line in (ROOT / "backend/.env").read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip("'\"")
        if key == "POLIS_DATABASE_URL":
            value = unquote(urlsplit(value).password or "")
        if (
            key
            in {
                "POLIS_DATABASE_URL",
                "POLIS_JWT_SECRET_KEY",
                "POLIS_IP_SALT",
                "POLIS_SMTP_CONTRASENA",
            }
            and len(value) >= 8
        ):
            known[key] = value.encode()
    historical = subprocess.check_output(
        ["git", "show", "2aad798:scripts/monitor_sistema_polis.sh"],
        cwd=ROOT,
    ).decode()
    match = re.search(r"PGPASSWORD=([^\s]+)", historical)
    assert match
    candidate = match[1].strip("'\"")
    assert not any(char in candidate for char in "$(){}")
    known["bd_anterior_declarada_rotada"] = candidate.encode()
    exposed = []
    for path in exported():
        data = path.read_bytes()
        for kind, value in known.items():
            if value in data:
                exposed.append({"path": str(path.relative_to(ROOT)), "tipo": kind})
    for kind, value in known.items():
        if value in text.encode():
            exposed.append({"path": str(REPORT.relative_to(ROOT)), "tipo": kind})
    assert not exposed, exposed

    REPORT.write_text(text)
    save(
        "resultados_finales.json",
        {
            "utc": datetime.now(UTC).isoformat(),
            "dictamen": "APROBADO",
            "alcance": "Encargo 275, cierre independiente de sus cinco hallazgos",
            "head": head,
            "monitor_sha256": snap["monitor_congelado_sha256"],
            "dictamen_sha256": digest(REPORT),
            "pruebas_nuevas": results,
            "hallazgos": {
                "H275-01": {
                    "estado": "CERRADO",
                    "R1.1": "CERRADO",
                    "R1.2": "CERRADO",
                    "R1.3": "CERRADO",
                },
                "H275-02": {
                    "estado": "CERRADO",
                    "evidencia": "inspección anterior, código sin cambios",
                },
                "H275-03": {
                    "estado": "CERRADO",
                    "evidencia": "inspección anterior, código sin cambios",
                },
                "H275-04": {
                    "estado": "CERRADO",
                    "evidencia": "repetido en ambas corridas del monitor",
                },
                "H275-05": {
                    "estado": "CERRADO en documentos corrientes",
                    "limite": "131 blobs históricos con credencial declarada rotada permanecen",
                },
            },
            "ultimo_check_global": {
                "nuevo_en_este_cierre": False,
                "returncode": 1,
                "passed": 1737,
                "failed": 6,
                "skipped": 16,
            },
            "otros_limites": [
                "cinco fallos de plantillas y uno de agenda fuera de 275",
                "drift preexistente de actividades_anexos en alembic check CLI",
            ],
        },
    )
    save(
        "cierre.json",
        {
            "utc": datetime.now(UTC).isoformat(),
            "head_final": head,
            "archivos_contrastados": len(snap["archivos_snapshot"]),
            "cambios_durante_verificacion": differences,
            "copia_ejecutada_y_publica_identicas": True,
            "arnes_original_sin_cambios": True,
            "custodia_historica": custody,
            "secretos_conocidos_exportados": exposed,
            "tipos_secretos_contrastados": sorted(known),
            "env": "solo lectura para contraste de secretos; no copiado, impreso ni cargado al ejecutar",
            "bases_creadas": [],
            "rol_creado": None,
            "persistencia_retest": "no aplica: delta solo del monitor; evidencia SQL anterior conservada por hash",
            "bd_csh": "sin conexiones ni cambios",
            "postfix_real": "no utilizado",
            "servicios_reales_reiniciados": False,
            "commit_push_del_auditor": False,
        },
    )
    files = [REPORT, *exported()]
    save(
        "manifest_sha256.json",
        {
            "utc": datetime.now(UTC).isoformat(),
            "algoritmo": "sha256",
            "estado": "APROBADO",
            "head": head,
            "monitor_sha256": snap["monitor_congelado_sha256"],
            "exclusiones": [
                ".runtime/",
                "caches",
                "manifest_sha256.json (este archivo)",
                "notificacion_tmux.json (acuse posterior)",
            ],
            "archivos": [
                {
                    "path": str(path.relative_to(ROOT)),
                    "bytes": path.stat().st_size,
                    "sha256": digest(path),
                }
                for path in files
            ],
        },
    )
    print(
        json.dumps(
            {
                "estado": "APROBADO",
                "artefactos_sellados": len(files),
                "dictamen_sha256": digest(REPORT),
                "pruebas": results,
                "cambios_durante_verificacion": differences,
                "secretos_exportados": exposed,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
