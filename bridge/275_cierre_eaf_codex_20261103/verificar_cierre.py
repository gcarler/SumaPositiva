"""Repite el arnés independiente contra una copia del monitor, sin BD ni SMTP."""

import difflib
import hashlib
import json
import os
import shutil
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
E = Path(__file__).resolve().parent
PREV = ROOT / "bridge/275_reinspeccion_eaf_codex_20261103"
RUNTIME = E / ".runtime"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, data):
    (E / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main():
    if (E / "snapshot.json").exists():
        raise SystemExit("La evidencia ya existe; no sobrescribir")
    RUNTIME.mkdir(mode=0o700)
    (E / ".gitignore").write_text(
        ".runtime/\n__pycache__/\n.pytest_cache/\n.ruff_cache/\n"
    )
    prior = json.loads((PREV / "snapshot.json").read_text())["archivos_snapshot"]
    current = {name: digest(ROOT / name) for name in prior}
    changed = [
        {"archivo": name, "anterior": sha, "actual": current[name]}
        for name, sha in prior.items()
        if current[name] != sha
    ]
    if [item["archivo"] for item in changed] != ["scripts/monitor_sistema_polis.sh"]:
        raise SystemExit("Hay cambios adicionales: revisar antes de continuar")
    extras = (
        subprocess.check_output(
            [
                "git",
                "ls-files",
                "--others",
                "--exclude-standard",
                "-z",
                "backend/app",
                "backend/tests",
                "backend/scripts",
                "backend/alembic",
                "deploy/systemd",
            ],
            cwd=ROOT,
        )
        .decode()
        .split("\0")
    )
    new_files = [name for name in extras if name and name not in prior]
    if new_files:
        raise SystemExit("Hay archivos de aplicación nuevos: revisar su alcance")
    frozen = RUNTIME / "snapshot/scripts/monitor_sistema_polis.sh"
    frozen.parent.mkdir(parents=True)
    shutil.copy2(ROOT / "scripts/monitor_sistema_polis.sh", frozen)
    shutil.copy2(frozen, E / "monitor_sistema_polis_auditado.sh")
    test = "test_monitor_reinspeccion.py"
    shutil.copy2(PREV / test, E / test)
    report = ROOT / "bridge/275_dictamen_eaf_independiente_codex.md"
    expected = "dd08d8318afe4eae69c7329064cf5f5d99b7501bb4e3716694fd8670a24c7750"
    if digest(report) != expected:
        raise SystemExit("El dictamen anterior cambió; no sobrescribir")
    shutil.copy2(report, E / "dictamen_rechazado_20261103_preservado.md")
    previous_monitor = PREV / ".runtime/snapshot/scripts/monitor_sistema_polis.sh"
    (E / "remediacion_monitor.diff").write_text(
        "".join(
            difflib.unified_diff(
                previous_monitor.read_text().splitlines(keepends=True),
                frozen.read_text().splitlines(keepends=True),
                fromfile="monitor_reinspeccion_anterior.sh",
                tofile="monitor_cierre_20261103.sh",
            )
        )
    )
    save(
        "snapshot.json",
        {
            "fecha_utc": datetime.now(UTC).isoformat(),
            "head_observado": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT
            )
            .decode()
            .strip(),
            "base_original": "4b45b104acc9d2a16a51bc80bd1ab7d328c56d58",
            "referencia_anterior": str(PREV.relative_to(ROOT) / "snapshot.json"),
            "archivos_comparados": len(prior),
            "archivos_snapshot": current,
            "cambios": changed,
            "nuevos_archivos_backend_deploy": new_files,
            "arnes_original_sha256": digest(PREV / test),
            "arnes_copiado_sha256": digest(E / test),
            "dictamen_preservado_sha256": expected,
            "monitor_congelado_sha256": digest(frozen),
            "sin_env": not (RUNTIME / "snapshot/backend/.env").exists(),
            "bd_smtp_systemd": "stubs, sin conexión ni cambios de servicios",
            "red_real": "solo HTTP efímero ligado a 127.0.0.1",
        },
    )
    print(json.dumps({"comparados": len(prior), "cambios": changed}), flush=True)
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith(("POLIS_", "PG", "SMTP_", "EAF_"))
        and key not in {"DATABASE_URL", "PYTHONPATH"}
    }
    env.update(
        PYTHONNOUSERSITE="1",
        PYTHONDONTWRITEBYTECODE="1",
        PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
    )
    commands = [
        ("sintaxis", ["bash", "-n", str(frozen)]),
    ]
    for run in (1, 2):
        commands.append(
            (
                f"monitor_r{run}",
                [
                    str(ROOT / "backend/.venv/bin/python"),
                    "-m",
                    "pytest",
                    "--noconftest",
                    str(E / test),
                    "-q",
                    "--tb=short",
                    "-p",
                    "no:cacheprovider",
                    f"--basetemp={RUNTIME / f'casos_r{run}'}",
                    f"--junitxml={E / f'monitor_r{run}.xml'}",
                ],
            )
        )
    for label, argv in commands:
        start = datetime.now(UTC).isoformat()
        before = time.monotonic()
        result = subprocess.run(
            argv,
            cwd=RUNTIME / "snapshot",
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=180,
        )
        (E / f"{label}.log").write_text(result.stdout)
        receipt = {
            "label": label,
            "argv": argv,
            "cwd": str(RUNTIME / "snapshot"),
            "inicio_utc": start,
            "segundos": round(time.monotonic() - before, 3),
            "returncode": result.returncode,
            "log": f"{label}.log",
            "databases": [],
            "smtp": "no utilizado",
            "servicios": "stubs",
            "plugins_pytest": "carga automática deshabilitada; sin conftest de aplicación",
        }
        save(f"{label}.json", receipt)
        print(json.dumps(receipt), flush=True)
        print(result.stdout, flush=True)
        if result.returncode:
            raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
