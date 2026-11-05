"""Autocomprobación del lanzador181; rechazos antes de conectar o escribir."""

import asyncio
import json
import os
from pathlib import Path
import smtplib
import socket

import asyncpg
import psycopg
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

OUT = Path(__file__).resolve().parent
URL = os.environ["POLIS_TEST_DATABASE_URL"]
BASE = make_url(URL).database
assert BASE == json.loads((OUT / "entorno.json").read_text())["base"]
assert make_url(os.environ["POLIS_DATABASE_URL"]).database == BASE
rechazos = []


def debe_rechazar(nombre, operacion):
    try:
        operacion()
    except RuntimeError:
        rechazos.append(nombre)
    else:
        raise AssertionError("Guarda no activa: " + nombre)


async def comprobar():
    try:
        await asyncpg.connect(database="polis_guard_rechazo_sintetico", host="127.0.0.1")
    except RuntimeError:
        rechazos.append("asyncpg")
    else:
        raise AssertionError("asyncpg conectó fuera de la base asignada")
    engine = create_async_engine(URL, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            base_real = await conn.scalar(text("SELECT current_database()"))
            assert base_real == BASE
    finally:
        await engine.dispose()


debe_rechazar("psycopg", lambda: psycopg.connect("dbname=polis_guard_rechazo_sintetico host=127.0.0.1"))
debe_rechazar("SMTP", lambda: smtplib.SMTP("smtp.edd.invalid"))
debe_rechazar("DNS", lambda: socket.getaddrinfo("edd-guard.invalid", 443))
with socket.socket() as sock:
    debe_rechazar("red", lambda: sock.connect(("203.0.113.9", 443)))
debe_rechazar("archivo", lambda: (OUT.parent / "181_guarda_rechazar_sintetico").write_text("no debe existir"))
asyncio.run(comprobar())
(OUT / "validacion-guardas.json").write_text(json.dumps({"base": BASE, "rechazos_antes_io": rechazos,
    "conexion_positiva_base_propia": True, "smtp_real": False}, indent=2) + "\n")
print(json.dumps({"base": BASE, "guardas_validadas": rechazos}))
