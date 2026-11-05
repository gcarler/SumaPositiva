"""Laboratorio exclusivo de auditoría 275. Nunca conecta a bd_csh."""

import argparse
import json
import os
import re
import secrets
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

E = Path(__file__).resolve().parent
ROOT = E.parents[1]
SNAPSHOT = E / ".runtime/snapshot"
PRIVATE = E / ".runtime/laboratorio.json"
DATABASES = ("polis_test_eaf_275_r2_20261103", "polis_test_eaf_275_r2_20261103_mig")
ROLE = "polis_eaf275_r2_20261103"
PROBE_DATABASE = "polis_test_eaf_275_r2_20261103_probes"
MARKER = "codex-eaf-275-20261103-r2"
PYTHON = ROOT / "backend/.venv/bin/python"


def docker_sql(sql):
    user = subprocess.check_output(
        ["docker", "exec", "polis-database-1", "printenv", "POSTGRES_USER"], text=True
    ).strip()
    p = subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            "polis-database-1",
            "psql",
            "-X",
            "-U",
            user,
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-At",
        ],
        input=sql,
        text=True,
        capture_output=True,
    )
    if p.returncode:
        raise RuntimeError(
            "Fallo de administración del laboratorio; SQL y salida retenidos para evitar secretos"
        )
    return p.stdout.strip()


def setup():
    if PRIVATE.exists():
        raise SystemExit("Laboratorio ya provisionado")
    existing = docker_sql(
        "SELECT datname FROM pg_database WHERE datname IN ('"
        + "','".join(DATABASES)
        + "'); SELECT rolname FROM pg_roles WHERE rolname='"
        + ROLE
        + "';"
    )
    if existing:
        raise SystemExit(
            "Colisión con laboratorio existente; no reutilizar ni eliminar"
        )
    password = secrets.token_hex(24)
    config = {
        "role": ROLE,
        "password": password,
        "databases": DATABASES,
        "marker": MARKER,
    }
    fd = os.open(PRIVATE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as file:
        json.dump(config, file)
    docker_sql(f"CREATE ROLE {ROLE} LOGIN SUPERUSER PASSWORD '{password}';")
    for database in DATABASES:
        docker_sql(
            f"CREATE DATABASE {database} OWNER {ROLE}; COMMENT ON DATABASE {database} IS '{MARKER}';"
        )
    print(json.dumps({"created": DATABASES, "role": ROLE, "production_access": False}))


def environment():
    config = json.loads(PRIVATE.read_text())
    assert config["databases"] == list(DATABASES) and config["marker"] == MARKER
    urls = [
        f"postgresql+asyncpg://{ROLE}:{config['password']}@127.0.0.1:5433/{db}"
        for db in DATABASES
    ]
    # No heredar parámetros ni credenciales de producción del shell.
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith(("POLIS_", "PG", "DATABASE_URL", "SMTP_"))
    }
    env.update(
        {
            "POLIS_DATABASE_URL": urls[0],
            "POLIS_TEST_DATABASE_URL": urls[0],
            "POLIS_TEST_MIGRATIONS_DATABASE_URL": urls[1],
            "POLIS_ENVIRONMENT": "test",
            "POLIS_JWT_SECRET_KEY": "eaf275-fixture-key-no-credencial-productiva-2026",
            "POLIS_IP_SALT": "eaf275-fixture-salt-no-productivo-2026",
            "POLIS_SMTP_HOST": "",
            "POLIS_SMTP_USUARIO": "",
            "POLIS_SMTP_CONTRASENA": "",
            "POLIS_SMTP_REMITENTE": "EAF275 <auditoria@example.org>",
            "POLIS_HERALD_RESUMEN_ACTIVO": "true",
            "POLIS_WHATSAPP_HABILITADO": "false",
            "POLIS_IDENTIDAD_LIMITE_IP": "10000",
            "POLIS_IDENTIDAD_LIMITE_CUENTA": "1000",
            "PYTHONPATH": str(SNAPSHOT / "backend"),
            "PYTHONDONTWRITEBYTECODE": "1",
            "UV_PROJECT_ENVIRONMENT": str(ROOT / "backend/.venv"),
            "UV_NO_SYNC": "1",
        }
    )
    return env, config


def setup_probes():
    config = json.loads(PRIVATE.read_text())
    if config.get("probe_database") or docker_sql(
        f"SELECT datname FROM pg_database WHERE datname='{PROBE_DATABASE}';"
    ):
        raise SystemExit("Colision de laboratorio de sondas")
    docker_sql(
        f"CREATE DATABASE {PROBE_DATABASE} OWNER {ROLE}; COMMENT ON DATABASE {PROBE_DATABASE} IS '{MARKER}';"
    )
    config["probe_database"] = PROBE_DATABASE
    PRIVATE.write_text(json.dumps(config))
    print(json.dumps({"created": PROBE_DATABASE}))


def reset_primary():
    config = json.loads(PRIVATE.read_text())
    assert config["marker"] == MARKER
    for database in DATABASES:
        value = docker_sql(
            f"SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname='{database}';"
        )
        assert value == MARKER
        docker_sql(f"DROP DATABASE {database} WITH (FORCE);")
        docker_sql(
            f"CREATE DATABASE {database} OWNER {ROLE}; COMMENT ON DATABASE {database} IS '{MARKER}';"
        )
    # Extensiones requeridas por la suite espacial ajena a 275, instaladas solo
    # en bases nuevas del laboratorio. Ninguna copia del esquema productivo.
    admin = subprocess.check_output(
        ["docker", "exec", "polis-database-1", "printenv", "POSTGRES_USER"], text=True
    ).strip()
    for database in DATABASES:
        p = subprocess.run(
            [
                "docker",
                "exec",
                "-i",
                "polis-database-1",
                "psql",
                "-X",
                "-U",
                admin,
                "-d",
                database,
                "-v",
                "ON_ERROR_STOP=1",
            ],
            input="CREATE EXTENSION postgis; CREATE EXTENSION pgrouting; CREATE EXTENSION address_standardizer; CREATE EXTENSION address_standardizer_data_us;",
            text=True,
            capture_output=True,
        )
        assert p.returncode == 0, "No se pudieron instalar extensiones de pruebas"
    result = {
        "utc": datetime.now(UTC).isoformat(),
        "reiniciadas_vacias": DATABASES,
        "extensiones_solo_lab": [
            "postgis",
            "pgrouting",
            "address_standardizer",
            "address_standardizer_data_us",
        ],
    }
    (E / "preparacion_bases_r2.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))


def run(label, argv, cwd=None, probes=False):
    if not re.fullmatch(r"[a-z0-9_-]+", label):
        raise SystemExit("Etiqueta inválida")
    env, config = environment()
    if probes:
        assert config.get("probe_database") == PROBE_DATABASE
        env["POLIS_DATABASE_URL"] = (
            env["POLIS_DATABASE_URL"].rsplit("/", 1)[0] + "/" + PROBE_DATABASE
        )
        env["POLIS_TEST_DATABASE_URL"] = env["POLIS_DATABASE_URL"]
    start = datetime.now(UTC).isoformat()
    began = time.monotonic()
    proc = subprocess.Popen(
        argv,
        cwd=cwd or SNAPSHOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    log_path = E / f"{label}.log"
    with log_path.open("w") as log:
        for line in proc.stdout:
            line = line.replace(config["password"], "[CLAVE-LAB-REDACTADA]")
            line = re.sub(
                r"Bearer [A-Za-z0-9._+\-=]+", "Bearer [TOKEN-LAB-REDACTADO]", line
            )
            line = re.sub(
                r"(postgres(?:ql)?(?:\+\w+)?://)[^\s\"']+", r"\1[DSN-REDACTADO]", line
            )
            log.write(line)
            log.flush()
    rc = proc.wait()
    record = {
        "label": label,
        "argv": argv,
        "cwd": str(cwd or SNAPSHOT),
        "start_utc": start,
        "seconds": round(time.monotonic() - began, 3),
        "returncode": rc,
        "log": log_path.name,
        "databases": [PROBE_DATABASE] if probes else DATABASES,
        "smtp_host": "",
        "snapshot_env_file": False,
    }
    (E / f"{label}.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record))
    return rc


def cleanup():
    config = json.loads(PRIVATE.read_text())
    assert config["marker"] == MARKER and config["role"] == ROLE
    databases = list(DATABASES) + (
        [PROBE_DATABASE] if config.get("probe_database") == PROBE_DATABASE else []
    )
    for database in databases:
        value = docker_sql(
            f"SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname='{database}';"
        )
        if value != MARKER:
            raise RuntimeError("Identidad del laboratorio discordante; no borrar")
        docker_sql(f"DROP DATABASE {database} WITH (FORCE);")
    docker_sql(f"DROP ROLE {ROLE};")
    remaining = docker_sql(
        "SELECT datname FROM pg_database WHERE datname IN ('"
        + "','".join(databases)
        + "'); SELECT rolname FROM pg_roles WHERE rolname='"
        + ROLE
        + "';"
    )
    PRIVATE.unlink()
    record = {
        "utc": datetime.now(UTC).isoformat(),
        "bases_eliminadas": databases,
        "rol_eliminado": ROLE,
        "residuos": remaining,
        "credencial_privada_eliminada": not PRIVATE.exists(),
        "bd_csh": "sin conexiones ni cambios",
    }
    (E / "limpieza.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=[
            "setup",
            "setup-probes",
            "reset-primary",
            "cleanup",
            "run",
            "run-probes",
        ],
    )
    parser.add_argument("arguments", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.action == "setup":
        setup()
    elif args.action == "cleanup":
        cleanup()
    elif args.action == "setup-probes":
        setup_probes()
    elif args.action == "reset-primary":
        reset_primary()
    else:
        label, *argv = args.arguments
        sys.exit(run(label, argv, probes=args.action == "run-probes"))
