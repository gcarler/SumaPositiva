"""Fija el commit solicitado y la superposición local, sin copiar .env."""

import hashlib
import io
import json
import shutil
import subprocess
import tarfile
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent
DEST = EVIDENCE / ".runtime" / "snapshot"
BASE = "4b45b104acc9d2a16a51bc80bd1ab7d328c56d58"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    if DEST.exists():
        raise SystemExit("El snapshot ya existe; no sobrescribir")
    DEST.mkdir(parents=True)
    archive = subprocess.check_output(["git", "archive", BASE], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(archive)) as tf:
        members = [
            m
            for m in tf.getmembers()
            if not any(
                p == ".env" or p.startswith(".env.bak") for p in Path(m.name).parts
            )
        ]
        tf.extractall(DEST, members=members, filter="data")
    changed = (
        subprocess.check_output(["git", "diff", "--name-only", "-z", BASE], cwd=ROOT)
        .decode()
        .split("\0")
    )
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
                "docs/herald_catalogo_eventos.md",
            ],
            cwd=ROOT,
        )
        .decode()
        .split("\0")
    )
    overlay = []
    for name in sorted(set(changed + extras)):
        if not name:
            continue
        source, target = ROOT / name, DEST / name
        if source.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            overlay.append({"path": name, "sha256": digest(source)})
        elif target.is_file():
            target.unlink()
            overlay.append({"path": name, "deleted": True})
    files = {}
    for prefix in ["backend", "deploy/systemd", "scripts", "docs"]:
        for file in (DEST / prefix).rglob("*"):
            if file.is_file():
                files[str(file.relative_to(DEST))] = digest(file)
    result = {
        "fecha_utc": datetime.now(UTC).isoformat(),
        "base_solicitada": BASE,
        "head_observado": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT
        )
        .decode()
        .strip(),
        "diferencia_head": subprocess.check_output(
            ["git", "diff", "--name-status", BASE, "HEAD"], cwd=ROOT
        ).decode(),
        "superposicion_local": overlay,
        "archivos_snapshot": files,
        "sin_env": not (DEST / "backend/.env").exists(),
    }
    (EVIDENCE / "snapshot.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "base": BASE,
                "overlay": len(overlay),
                "hashes": len(files),
                "sin_env": result["sin_env"],
            }
        )
    )


if __name__ == "__main__":
    main()
