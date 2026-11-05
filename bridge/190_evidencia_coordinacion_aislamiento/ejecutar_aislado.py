"""Verificación EDD en base nueva propia; no publica DSN ni credenciales."""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
STATE = OUT / "base.json"


def acceso_local():
    raw = None
    for line in (ROOT / "backend/.env").read_text().splitlines():
        if line.startswith("POLIS_DATABASE_URL="):
            raw = line.split("=", 1)[1].strip().strip("\"'")
            break
    if not raw:
        raise SystemExit("Falta acceso local existente; sin fallback")
    source = make_url(raw)
    if source.host not in {"localhost", "127.0.0.1", "::1"} or source.port != 5432:
        raise SystemExit("Solo clúster local autorizado")
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", source.username or ""):
        raise SystemExit("Propietario local no reconocido")
    return source


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("accion", choices=["provisionar", "provisionar-migraciones", "ejecutar"])
    parser.add_argument("--log", default="comando")
    parser.add_argument("comando", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    source = acceso_local()
    migration_state = OUT / "base_migraciones.json"
    if args.accion in {"provisionar", "provisionar-migraciones"}:
        state = STATE if args.accion == "provisionar" else migration_state
        if state.exists():
            raise SystemExit("La base ya se provisionó; no borrar ni reutilizar otra")
        database = ("polis_test_edd_coord_20261026_" if state == STATE else
                    "polis_test_edd_coord_migrations_20261026_") + uuid.uuid4().hex[:8]
        subprocess.run(
            ["runuser", "-u", "postgres", "--", "createdb", "--template=template0",
             "--owner=" + source.username, database],
            check=True, capture_output=True, text=True,
        )
        extensions = ("postgis", "ltree", "pgcrypto", "pg_trgm", "pgrouting", "address_standardizer")
        for extension in extensions:
            subprocess.run(
                ["runuser", "-u", "postgres", "--", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", database,
                 "-c", 'CREATE EXTENSION IF NOT EXISTS "' + extension + '"'],
                check=True, capture_output=True, text=True,
            )
        with state.open("x") as file:
            json.dump({"database": database, "creada_utc": datetime.now(UTC).isoformat(),
                       "template": "template0", "extensiones_locales": extensions,
                       "limite": "Solo base nueva propia; roles/servicios/productiva sin cambios"}, file, indent=2)
            file.write("\n")
        print("Base propia provisionada: " + database)
        return
    database = json.loads(STATE.read_text())["database"]
    if not re.fullmatch(r"polis_test_edd_coord_20261026_[a-f0-9]{8}", database):
        raise SystemExit("Base fuera de alcance")
    private = source.set(database=database, drivername="postgresql+asyncpg").render_as_string(hide_password=False)
    env = os.environ.copy()
    env.update(
        POLIS_DATABASE_URL=private, POLIS_TEST_DATABASE_URL=private, POLIS_ENVIRONMENT="test",
        POLIS_JWT_SECRET_KEY="coordinacion_test_20261026_secret_32_bytes_min",
        POLIS_IP_SALT="coordinacion_test_20261026_salt_32_bytes_min",
        POLIS_SMTP_HOST="", POLIS_SMTP_USUARIO="", POLIS_SMTP_CONTRASENA="", POLIS_SENTRY_DSN="",
        POLIS_GOOGLE_CLIENT_ID="", POLIS_MFA_ROLES_EXIGIDOS="", POLIS_MFA_ENCRYPTION_KEY="",
        POLIS_WHATSAPP_HABILITADO="false", POLIS_WHATSAPP_APP_SECRET="", POLIS_WHATSAPP_VERIFY_TOKEN="",
        POLIS_IDENTIDAD_LIMITE_IP="10000", POLIS_IDENTIDAD_LIMITE_CUENTA="1000",
        POLIS_SESION_ANONIMA_LIMITE_IP="10000", POLIS_EAF_DATABASE=database, POLIS_EAF_EVIDENCE=str(OUT),
        POLIS_DIRECTORIO_SUBIDAS=str(OUT / "media_pruebas"), PYTHONDONTWRITEBYTECODE="1",
        PYTHONPATH=str(OUT / "guard") + os.pathsep + str(ROOT / "backend"),
        PYTEST_ADDOPTS="-p no:cacheprovider", RUFF_CACHE_DIR=str(OUT / "ruff_cache"),
        UV_FROZEN="1", UV_NO_SYNC="1", UV_OFFLINE="1",
    )
    if migration_state.exists():
        migration_database = json.loads(migration_state.read_text())["database"]
        if not re.fullmatch(r"polis_test_edd_coord_migrations_20261026_[a-f0-9]{8}", migration_database):
            raise SystemExit("Base de migraciones fuera de alcance")
        env["POLIS_TEST_MIGRATIONS_DATABASE_URL"] = source.set(
            database=migration_database, drivername="postgresql+asyncpg"
        ).render_as_string(hide_password=False)
        env["POLIS_EAF_DATABASES"] = json.dumps([database, migration_database])
    else:
        env.pop("POLIS_TEST_MIGRATIONS_DATABASE_URL", None)
        env["POLIS_EAF_DATABASES"] = json.dumps([database])
    temporary = OUT / "tmp"
    temporary.mkdir(exist_ok=True)
    for key in ("TMPDIR", "TMP", "TEMP"):
        env[key] = str(temporary)
    for key in ("POLIS_DATABASE_URL", "POLIS_TEST_DATABASE_URL"):
        if make_url(env[key]).database != database:
            raise SystemExit("DSN no coincide con base explícita")
    command = args.comando
    if command[:1] == ["--"]:
        command = command[1:]
    if not command or not re.fullmatch(r"[a-zA-Z0-9_-]+", args.log):
        raise SystemExit("Comando/log inválido")
    log = OUT / (args.log + ".log")
    if log.exists():
        raise SystemExit("No sobrescribir log previo")
    start = time.monotonic()
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    output = result.stdout + result.stderr
    for secret in (private, source.password, env["POLIS_JWT_SECRET_KEY"], env["POLIS_IP_SALT"]):
        if secret:
            output = output.replace(secret, "[REDACTADO]")
    output = re.sub(r"postgres(?:ql)?(?:\+[a-z0-9_]+)?://[^\s\"'<>]+", "[DSN_REDACTADO]", output)
    output = re.sub(r"eyJ[\w-]+\.[\w-]+\.[\w-]+", "[JWT_REDACTADO]", output)
    with log.open("x") as file:
        file.write(output)
    meta = {
        "comando": command, "database": database, "codigo_salida": result.returncode,
        "duracion_segundos": round(time.monotonic() - start, 3), "fecha_utc": datetime.now(UTC).isoformat(),
        "guarda_sha256": hashlib.sha256((OUT / "guard/sitecustomize.py").read_bytes()).hexdigest(),
        "variables": "DSN explícitos; SMTP/red externa/escrituras repo fuera de evidencia bloqueados",
    }
    with (OUT / (args.log + ".json")).open("x") as file:
        json.dump(meta, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(meta, ensure_ascii=False))
    print(output[-10000:])
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
