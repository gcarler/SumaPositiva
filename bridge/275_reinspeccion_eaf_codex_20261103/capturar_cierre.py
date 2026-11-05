"""Verifica el código y la higiene de la evidencia antes de sellar el dictamen."""

import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

E = Path(__file__).resolve().parent
ROOT = E.parents[1]
SNAP = E / ".runtime/snapshot"


def main():
    original = json.loads((E / "snapshot.json").read_text())
    differences = []
    frozen_differences = []
    for relative, digest in original["archivos_snapshot"].items():
        current = ROOT / relative
        frozen = SNAP / relative
        if (
            not current.exists()
            or hashlib.sha256(current.read_bytes()).hexdigest() != digest
        ):
            differences.append(relative)
        if (
            not frozen.exists()
            or hashlib.sha256(frozen.read_bytes()).hexdigest() != digest
        ):
            frozen_differences.append(relative)
    selected = [
        "backend/app/core/config.py",
        "backend/app/core/database.py",
        "backend/app/core/transactions.py",
        "backend/app/modules/health/router.py",
        "backend/app/modules/health/schemas.py",
        "backend/alembic/versions/0094_herald_salud_resumen.py",
        "backend/alembic/env.py",
        "backend/tests/test_herald_salud_resumen.py",
        "scripts/monitor_sistema_polis.sh",
        "scripts/ingestar_indicadores_reales.py",
        "deploy/systemd/polis-herald-resumen.service",
        "deploy/systemd/polis-herald-resumen.timer",
        "docs/permisos-api.md",
        "docs/rotacion-secretos.md",
        "docs/plan-consolidacion-git.md",
    ]
    selected.extend(
        str(path.relative_to(SNAP))
        for path in (SNAP / "backend/app/modules/notificaciones").glob("*.py")
    )
    hashes = {
        path: hashlib.sha256((SNAP / path).read_bytes()).hexdigest()
        for path in sorted(set(selected))
    }

    private = json.loads((E / ".runtime/laboratorio.json").read_text())
    known = {"credencial_laboratorio": private["password"].encode()}
    for line in (ROOT / "backend/.env").read_text().splitlines():
        if line.startswith("#") or "=" not in line:
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
            known[key.lower()] = value.encode()
    exposed = []
    count = 0
    for path in E.rglob("*"):
        if not path.is_file() or any(
            part in {".runtime", "__pycache__", ".pytest_cache", ".ruff_cache"}
            for part in path.relative_to(E).parts
        ):
            continue
        data = path.read_bytes()
        count += 1
        for kind, value in known.items():
            if value in data:
                exposed.append({"path": str(path.relative_to(E)), "tipo": kind})
    report = ROOT / "bridge/275_dictamen_eaf_independiente_codex.md"
    for kind, value in known.items():
        if value in report.read_bytes():
            exposed.append({"path": str(report.relative_to(ROOT)), "tipo": kind})
    result = {
        "utc": datetime.now(UTC).isoformat(),
        "base_solicitada": original["base_solicitada"],
        "head_final": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "diferencias_head_desde_base": subprocess.check_output(
            ["git", "diff", "--name-status", original["base_solicitada"], "HEAD"],
            cwd=ROOT,
            text=True,
        ),
        "archivos_contrastados": len(original["archivos_snapshot"]),
        "cambios_en_codigo_original_durante_auditoria": differences,
        "cambios_en_copia_fijada": frozen_differences,
        "sha256_alcance": hashes,
        "archivos_evidencia_examinados": count,
        "secretos_actuales_o_lab_expuestos": exposed,
        "sin_commit_ni_push_del_auditor": True,
    }
    (E / "cierre.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    )
    print(
        json.dumps(
            {
                "archivos": result["archivos_contrastados"],
                "cambios_original": differences,
                "cambios_copia": frozen_differences,
                "secretos_expuestos": exposed,
            },
            ensure_ascii=False,
        )
    )
    assert not frozen_differences and not exposed


if __name__ == "__main__":
    main()
