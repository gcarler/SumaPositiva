"""Lanzador EAF: DSN local validado antes de importar configuración POLIS.

No imprime ni guarda credenciales. Todos los comandos hijos reciben las dos
variables de base explícitas. El DSN del backend solo aporta acceso local;
su nombre de base se sustituye antes de cualquier conexión.
"""

import json
from collections import deque
import os
import re
import subprocess
import sys
from pathlib import Path

from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent


def environment():
    raw = os.environ.get("POLIS_DATABASE_URL")
    if not raw:
        for line in (ROOT / "backend/.env").read_text().splitlines():
            if line.startswith("POLIS_DATABASE_URL="):
                raw = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if not raw:
        raise SystemExit("No hay acceso local configurado")
    source = make_url(raw)
    if source.host not in ("127.0.0.1", "localhost", "::1") or source.port != 5432:
        raise SystemExit("Acceso no coincide con clúster local autorizado")
    database = json.loads((EVIDENCE / "base.json").read_text())["database"]
    if not database.startswith("polis_test_eaf_aportes_20261026_"):
        raise SystemExit("Nombre fuera del alcance EAF")
    url = source.set(database=database)
    explicit = url.render_as_string(hide_password=False)
    assert make_url(explicit).database == database
    env = dict(os.environ)
    env.update(
        POLIS_TEST_DATABASE_URL=explicit,
        POLIS_DATABASE_URL=explicit,
        POLIS_ENVIRONMENT="test",
        POLIS_JWT_SECRET_KEY="eaf_aportes_test_secret_20261026_aislado_32bytes",
        POLIS_IP_SALT="eaf_aportes_20261026_salt_exclusivo",
        POLIS_SMTP_HOST="",
        POLIS_SMTP_USUARIO="",
        POLIS_SMTP_CONTRASENA="",
        POLIS_DIRECTORIO_SUBIDAS=str(EVIDENCE / "media_pruebas"),
        POLIS_IDENTIDAD_LIMITE_IP="10000",
        POLIS_IDENTIDAD_LIMITE_CUENTA="1000",
        POLIS_SESION_ANONIMA_LIMITE_IP="10000",
        PYTHONDONTWRITEBYTECODE="1",
        PYTEST_ADDOPTS="-p no:cacheprovider",
        RUFF_CACHE_DIR=str(EVIDENCE / ".ruff_cache"),
        UV_FROZEN="1",
        UV_NO_SYNC="1",
        POLIS_EAF_DATABASE=database,
        POLIS_EAF_EVIDENCE=str(EVIDENCE),
        PYTHONPATH=str(EVIDENCE / "guard") + os.pathsep + str(ROOT / "backend") + os.pathsep + env.get("PYTHONPATH", ""),
    )
    return env, source.password


def main():
    if len(sys.argv) < 3:
        raise SystemExit("Uso: ejecutar_aislado.py nombre.log comando [argumentos]")
    log = EVIDENCE / sys.argv[1]
    if log.parent != EVIDENCE:
        raise SystemExit("Log fuera de evidencia")
    env, password = environment()
    command = sys.argv[2:]
    env["POLIS_EAF_RUN_ID"] = log.stem
    env["PYTEST_ADDOPTS"] += " --junitxml=" + str(log.with_suffix(".xml"))
    def redact(output):
        output = output.replace(env["POLIS_DATABASE_URL"], "[DSN_LOCAL_AISLADO]")
        if password:
            output = output.replace(password, "[CREDENCIAL_REDACTADA]")
        output = re.sub(r"postgresql(?:\+[a-z0-9]+)?://[^\s\"'<>]+", "[DSN_REDACTADO]", output)
        return re.sub(r"\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b", "[JWT_REDACTADO]", output)
    tail = deque(maxlen=90)
    with log.open("w") as file:
        file.write("$ " + " ".join(command) + "\n")
        file.flush()
        process = subprocess.Popen(command, cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        for output in process.stdout:
            output = redact(output)
            file.write(output)
            file.flush()
            tail.append(output)
        code = process.wait()
        file.write(f"\nEXIT_CODE={code}\n")
    xml = log.with_suffix(".xml")
    if xml.exists():
        xml.write_text(redact(xml.read_text()))
    print(f"log={log.relative_to(ROOT)} exit_code={code}", flush=True)
    print("".join(tail)[-10000:], flush=True)
    raise SystemExit(code)


if __name__ == "__main__":
    main()
