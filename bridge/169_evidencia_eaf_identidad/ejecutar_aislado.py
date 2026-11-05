"""Runner EAF: DSN explícito de base nueva; nunca importa configuración antes de validarlo.

Las credenciales existentes se leen en memoria y no se imprimen. No crea roles,
no consulta datos de bases de aplicación y no permite reutilizar otra base.
"""

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
STATE = OUT / "entorno.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("accion", choices=["provisionar", "ejecutar"])
    parser.add_argument("--nombre-log", default="comando")
    parser.add_argument("comando", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    raw = os.environ.get("POLIS_EAF_ORIGEN_DSN")
    if not raw:
        for line in (ROOT / "backend/.env").read_text().splitlines():
            if line.startswith("POLIS_DATABASE_URL="):
                raw = line.split("=", 1)[1].strip().strip("\"'")
                break
    if not raw:
        raise SystemExit("No existe credencial local de provisión; sin fallback")
    source = make_url(raw)
    if source.host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("Origen no local: se rechaza la provisión")
    if args.accion == "provisionar":
        if STATE.exists():
            raise SystemExit("Provisión ya registrada; no se reutiliza ni elimina otra base")
        dbname = "polis_test_eaf_identidad_20261026_" + uuid.uuid4().hex[:10]
    else:
        dbname = json.loads(STATE.read_text())["base"]
    url = source.set(database=dbname, drivername="postgresql+asyncpg")
    if not re.fullmatch(r"polis_test_eaf_identidad_20261026_[a-f0-9]{10}", url.database or ""):
        raise SystemExit("Base no autorizada")
    if args.accion == "provisionar":
        subprocess.run(
            ["runuser", "-u", "postgres", "--", "createdb", "--template=template0", "--owner=" + (url.username or ""), dbname],
            check=True, capture_output=True, text=True,
        )
        state = {"base": dbname, "dsn_sin_credenciales": f"{url.drivername}://{url.host}:{url.port}/{dbname}",
                 "provision_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
                 "credenciales": "Existentes, solo memoria; no se modificaron roles ni servicios", "vacia": True}
        STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps(state, ensure_ascii=False))
        return
    command = args.comando
    if command[:1] == ["--"]:
        command = command[1:]
    if not command:
        raise SystemExit("Falta comando")
    env = os.environ.copy()
    private_dsn = url.render_as_string(hide_password=False)
    env.update({
        "POLIS_TEST_DATABASE_URL": private_dsn, "POLIS_DATABASE_URL": private_dsn,
        "POLIS_ENVIRONMENT": "test", "POLIS_JWT_SECRET_KEY": "eaf_identidad_aislada_20261026_solo_prueba_32bytes!",
        "POLIS_IP_SALT": "eaf_identidad_aislada_salt_20261026_32bytes!",
        "POLIS_SMTP_HOST": "", "POLIS_SMTP_USUARIO": "", "POLIS_SMTP_CONTRASENA": "",
        "POLIS_GOOGLE_CLIENT_ID": "", "POLIS_SENTRY_DSN": "", "POLIS_MFA_ROLES_EXIGIDOS": "",
        "POLIS_MFA_ENCRYPTION_KEY": "", "PYTHONDONTWRITEBYTECODE": "1",
        "POLIS_IDENTIDAD_LIMITE_IP": "10000", "POLIS_IDENTIDAD_LIMITE_CUENTA": "1000",
        "POLIS_SESION_ANONIMA_LIMITE_IP": "10000", "UV_FROZEN": "true", "UV_NO_SYNC": "true",
        "RUFF_CACHE_DIR": str(OUT / "ruff-cache"), "PYTEST_ADDOPTS": "-p no:cacheprovider",
        "PYTHONPATH": str(OUT) + os.pathsep + str(ROOT / "backend"), "POLIS_DIRECTORIO_SUBIDAS": str(OUT / "uploads"),
    })
    # Segundo control inmediatamente antes de cualquier importación de app/pytest.
    assert make_url(env["POLIS_TEST_DATABASE_URL"]).database == dbname
    assert make_url(env["POLIS_DATABASE_URL"]).database == dbname
    start = time.monotonic()
    guard_hash = hashlib.sha256((OUT / "sitecustomize.py").read_bytes()).hexdigest()
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    output = result.stdout + result.stderr
    for secret in [raw, private_dsn, source.password, env["POLIS_JWT_SECRET_KEY"], env["POLIS_IP_SALT"]]:
        if secret:
            output = output.replace(secret, "[REDACTADO]")
    output = re.sub(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[JWT_REDACTADO]", output)
    output = re.sub(r"postgres(?:ql)?(?:\+[a-z0-9_]+)?://[^\s'\"<>]+", "[DSN_REDACTADO]", output)
    (OUT / (args.nombre_log + ".log")).write_text(output)
    meta = {"comando": command, "base": dbname, "codigo_salida": result.returncode,
            "duracion_segundos": round(time.monotonic() - start, 3),
            "guarda_sha256_al_iniciar": guard_hash,
            "fecha_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "variables": "POLIS_TEST_DATABASE_URL y POLIS_DATABASE_URL explícitas, validadas con make_url; SMTP externo desactivado"}
    (OUT / (args.nombre_log + ".json")).write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(meta, ensure_ascii=False))
    print(output[-12000:])
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
