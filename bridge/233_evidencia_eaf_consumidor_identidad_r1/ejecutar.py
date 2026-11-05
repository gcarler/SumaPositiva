"""Encargo232: comandos reproducibles, base exclusiva y salidas233.

No carga configuración de la aplicación en el supervisor. Credenciales existentes
solo se leen en memoria, se exige clúster local y se sustituye SIEMPRE la base.
"""
import argparse
import hashlib
import json
import os
import re
import secrets
import subprocess
import sys
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.engine import make_url

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]


def source():
    raw = next((line.split("=", 1)[1].strip().strip("\"'")
                for line in (ROOT / "backend/.env").read_text().splitlines()
                if line.startswith("POLIS_DATABASE_URL=")), None)
    if not raw:
        raise SystemExit("No hay acceso local explícito; sin fallback")
    parsed = make_url(raw)
    if parsed.host not in {"127.0.0.1", "localhost", "::1"} or parsed.port != 5432:
        raise SystemExit("Acceso fuera del clúster local autorizado")
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", parsed.username or ""):
        raise SystemExit("Propietario no reconocido")
    return parsed


def environment():
    original = source()
    database = json.loads((OUT / "base.json").read_text())["database"]
    if not re.fullmatch(r"polis_test_eaf_consumidor_r1_20261026_[0-9a-f]{8}", database):
        raise SystemExit("Base no autorizada")
    dsn = original.set(database=database, drivername="postgresql+asyncpg").render_as_string(hide_password=False)
    env = os.environ.copy()
    # Secretos efímeros de la API de prueba: viven solo en el environment del hijo.
    from cryptography.fernet import Fernet
    env.update(POLIS_DATABASE_URL=dsn, POLIS_TEST_DATABASE_URL=dsn,
               POLIS_ENVIRONMENT="test", POLIS_JWT_SECRET_KEY=secrets.token_urlsafe(48),
               POLIS_IP_SALT=secrets.token_urlsafe(48), POLIS_MFA_ENCRYPTION_KEY=Fernet.generate_key().decode(),
               POLIS_MFA_ROLES_EXIGIDOS="administrador_identidades", POLIS_GOOGLE_CLIENT_ID="",
               POLIS_SMTP_HOST="", POLIS_SMTP_USUARIO="", POLIS_SMTP_CONTRASENA="",
               POLIS_WHATSAPP_HABILITADO="false", POLIS_WHATSAPP_APP_SECRET="", POLIS_WHATSAPP_VERIFY_TOKEN="",
               POLIS_SENTRY_DSN="", POLIS_IDENTIDAD_LIMITE_IP="10000", POLIS_IDENTIDAD_LIMITE_CUENTA="10000",
               POLIS_IDENTIDAD_URL_PUBLICA="http://127.0.0.1:34133", POLIS_LOG_LEVEL="WARNING",
               POLIS_EAF_DATABASE=database, POLIS_EAF_DATABASES=json.dumps([database]),
               POLIS_EAF_EVIDENCE=str(OUT), POLIS_DIRECTORIO_SUBIDAS=str(OUT / "media"),
               PYTHONDONTWRITEBYTECODE="1", PYTHONPATH=str(OUT / "guard") + os.pathsep + str(ROOT / "backend"),
               UV_FROZEN="1", UV_NO_SYNC="1", UV_OFFLINE="1", NEXT_TELEMETRY_DISABLED="1",
               STORYBOOK_DISABLE_TELEMETRY="1", POLIS_BACKEND_URL="http://127.0.0.1:34134",
               POLIS_NEXT_DIST_DIR=".next-eaf233", NEXT_PUBLIC_GOOGLE_CLIENT_ID="eaf233-controlled.apps.googleusercontent.com",
               NEXT_PUBLIC_SENTRY_DSN="", NEXT_PUBLIC_API_URL="", POLIS_API_BASE_URL="",
               PLAYWRIGHT_BROWSERS_PATH="/root/.cache/ms-playwright", BUN_RUNTIME_TRANSPILER_CACHE_PATH=str(OUT / "bun-cache"),
               NODE_OPTIONS="--require=" + str(OUT / "guard_node.cjs"),
               XDG_CACHE_HOME=str(OUT / "cache"), RUFF_CACHE_DIR=str(OUT / "ruff-cache"))
    env.pop("POLIS_TEST_MIGRATIONS_DATABASE_URL", None)
    for key in ("TMPDIR", "TMP", "TEMP"):
        env[key] = str(OUT / "tmp")
    (OUT / "tmp").mkdir(exist_ok=True)
    assert make_url(env["POLIS_DATABASE_URL"]).database == database
    return env


def provision():
    if (OUT / "base.json").exists():
        raise SystemExit("Base233 ya provisionada, no se recrea ni borra")
    original = source()
    database = "polis_test_eaf_consumidor_r1_20261026_" + uuid.uuid4().hex[:8]
    subprocess.run(["runuser", "-u", "postgres", "--", "createdb", "--template=template0",
                    "--owner=" + original.username, database], check=True, capture_output=True, text=True)
    extensions = ["postgis", "ltree", "pgcrypto", "pg_trgm", "pgrouting", "address_standardizer"]
    for extension in extensions:
        subprocess.run(["runuser", "-u", "postgres", "--", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", database,
                        "-c", 'CREATE EXTENSION "' + extension + '"'], check=True, capture_output=True, text=True)
    record = {"database": database, "creada_utc": datetime.now(UTC).isoformat(), "template": "template0",
              "extensiones": extensions, "nota": "Nueva base propia233; sin cambios de roles o servicios"}
    (OUT / "base.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record))


def sanitize(text, env):
    for key in ("POLIS_DATABASE_URL", "POLIS_TEST_DATABASE_URL", "POLIS_IP_SALT", "POLIS_JWT_SECRET_KEY", "POLIS_MFA_ENCRYPTION_KEY"):
        if env.get(key):
            text = text.replace(env[key], "[REDACTADO]")
    if source().password:
        text = text.replace(source().password, "[REDACTADO]")
    return re.sub(r"eyJ[\w-]+\.[\w-]+\.[\w-]+", "[JWT_REDACTADO]",
                  re.sub(r"postgres(?:ql)?(?:\+[a-z0-9_]+)?://[^\s\"'<>]+", "[DSN_REDACTADO]", text))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("accion", choices=["provisionar", "ejecutar"])
    parser.add_argument("--log", default="comando")
    parser.add_argument("--cwd", choices=["raiz", "frontend", "backend"], default="raiz")
    parser.add_argument("comando", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.accion == "provisionar":
        provision()
        return
    env = environment()
    command = args.comando[1:] if args.comando[:1] == ["--"] else args.comando
    if not command or not re.fullmatch(r"[\w-]+", args.log):
        raise SystemExit("Comando/log inválido")
    authorization_path = OUT / "autorizacion-inicio.json"
    if not authorization_path.exists():
        preflight_only = [
            [str(ROOT / "backend/.venv/bin/python"), str(OUT / "probar_guardas.py")],
            ["node", str(OUT / "probar_node.mjs")],
        ]
        if command not in preflight_only:
            raise SystemExit("Pendiente REINSPECCION_CONSUMIDOR_221: solo guardas sin aplicación")
    else:
        authorization = json.loads(authorization_path.read_text())
        if authorization.get("senal") != "REINSPECCION_CONSUMIDOR_221" or not authorization.get("hashes_objeto"):
            raise SystemExit("Señal o hashes de congelación incompletos")
        for relative, expected in authorization["hashes_objeto"].items():
            path = (ROOT / relative).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise SystemExit("Objeto posterior a la congelación: " + relative)
    cwd = {"raiz": ROOT, "frontend": OUT / "fuente", "backend": ROOT / "backend"}[args.cwd]
    log = OUT / (args.log + ".log")
    if log.exists():
        raise SystemExit("Se preservan los logs previos")
    start = time.monotonic()
    result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True)
    output = sanitize(result.stdout + result.stderr, env)
    log.write_text(output)
    record = {"comando": command, "cwd": str(cwd), "codigo_salida": result.returncode,
              "duracion_segundos": round(time.monotonic() - start, 3), "fecha_utc": datetime.now(UTC).isoformat(),
              "database": env["POLIS_EAF_DATABASE"],
              "guarda_sha256": hashlib.sha256((OUT / "guard/sitecustomize.py").read_bytes()).hexdigest()}
    (OUT / (args.log + ".json")).write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record))
    print(output[-6000:])
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
