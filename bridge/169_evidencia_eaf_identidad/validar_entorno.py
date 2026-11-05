import asyncio
import importlib.metadata as md
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import socket

import asyncpg
import psycopg
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

OUT = Path(__file__).resolve().parent
URL = os.environ["POLIS_TEST_DATABASE_URL"]
BASE = make_url(URL).database
assert BASE == json.loads((OUT / "entorno.json").read_text())["base"]
assert "sitecustomize" in sys.modules


async def run():
    rejected = []
    try:
        socket.create_connection(("203.0.113.1", 443), timeout=0.01)
    except RuntimeError as exc:
        assert "EAF" in str(exc)
        rejected.append("red_externa")
    else:
        raise AssertionError("Guarda no rechazó red externa")
    try:
        (OUT.parents[1] / ".eaf_escritura_prohibida").write_text("no debe persistirse")
    except RuntimeError as exc:
        assert "EAF" in str(exc)
        rejected.append("escritura_repositorio")
    else:
        raise AssertionError("Guarda no rechazó escritura de repositorio")
    bad_url = make_url(URL).set(database="fuera_de_alcance_eaf").render_as_string(hide_password=False)
    for name, action in [
        ("asyncpg", lambda: asyncpg.connect(database="fuera_de_alcance_eaf", host="127.0.0.1")),
        ("psycopg_async", lambda: psycopg.AsyncConnection.connect("dbname=fuera_de_alcance_eaf host=127.0.0.1")),
    ]:
        try:
            await action()
        except RuntimeError as exc:
            assert "EAF" in str(exc)
            rejected.append(name)
        else:
            raise AssertionError("Guarda no rechazó " + name)
    try:
        psycopg.connect("dbname=fuera_de_alcance_eaf host=127.0.0.1")
    except RuntimeError as exc:
        assert "EAF" in str(exc)
        rejected.append("psycopg")
    else:
        raise AssertionError("Guarda no rechazó psycopg")
    engine = create_async_engine(bad_url, hide_parameters=True)
    try:
        async with engine.connect():
            raise AssertionError("Guarda no rechazó SQLAlchemy")
    except RuntimeError as exc:
        assert "EAF" in str(exc)
        rejected.append("sqlalchemy")
    finally:
        await engine.dispose()
    engine = create_async_engine(URL, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            database = (await conn.execute(text("SELECT current_database(), current_user, version()"))).one()
            heads = (await conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num"))).scalars().all()
            extensions = (await conn.execute(text("SELECT extname, extversion FROM pg_extension ORDER BY extname"))).mappings().all()
            functions = (await conn.execute(text("""SELECT n.nspname, p.proname, p.prosecdef, p.proconfig,
                  pg_get_userbyid(p.proowner) AS propietario
                FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='autenticacion' OR (n.nspname='public' AND p.proname='generar_uuid_v7')
                ORDER BY n.nspname,p.proname"""))).mappings().all()
            auth_tables = (await conn.execute(text("""SELECT table_name FROM information_schema.tables
                WHERE table_schema='autenticacion' ORDER BY table_name"""))).scalars().all()
        result = {
            "base": database[0], "usuario_bd": database[1], "postgresql": database[2], "alembic_heads": heads,
            "extensiones": [dict(x) for x in extensions], "funciones_identidad": [dict(x) for x in functions],
            "tablas_autenticacion": auth_tables, "guarda_conexion_rechazos_previos_a_red": rejected,
            "python": platform.python_version(), "paquetes": {x: md.version(x) for x in ["sqlalchemy", "alembic", "fastapi", "pydantic", "asyncpg", "psycopg", "pytest", "ruff", "bcrypt", "PyJWT"]},
            "bun": subprocess.check_output(["bun", "--version"], text=True).strip(),
            "uv": subprocess.check_output(["uv", "--version"], text=True).strip(),
        }
        (OUT / "entorno-validado.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps(result, ensure_ascii=False))
    finally:
        await engine.dispose()


asyncio.run(run())
