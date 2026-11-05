"""Comprueba rechazo anterior a red/escritura; usa destinos sintéticos sin abrirlos."""

import asyncio
import json
import os
import smtplib
import socket
import uuid
from pathlib import Path

import asyncpg
import psycopg
from sqlalchemy.ext.asyncio import create_async_engine

EVIDENCE = Path(__file__).resolve().parent
assert os.environ["POLIS_EAF_DATABASE"].startswith("polis_test_eaf_aportes_20261026_")
rejections = []


def rejected(label, operation):
    try:
        operation()
    except (RuntimeError, PermissionError) as error:
        assert "Guarda EAF" in str(error)
        rejections.append(label)
    else:
        raise AssertionError("Guarda no aplicada: " + label)


async def rejected_async(label, operation):
    try:
        await operation()
    except RuntimeError as error:
        assert "Guarda EAF" in str(error)
        rejections.append(label)
    else:
        raise AssertionError("Guarda no aplicada: " + label)


async def main():
    for label, operation in [
        ("asyncpg.connect", lambda: asyncpg.connect(database="polis_test_eaf_fuera_de_alcance")),
        ("asyncpg.connection.connect", lambda: asyncpg.connection.connect(database="polis_test_eaf_fuera_de_alcance")),
        ("psycopg.AsyncConnection.connect", lambda: psycopg.AsyncConnection.connect("dbname=polis_test_eaf_fuera_de_alcance")),
    ]:
        await rejected_async(label, operation)
    engine = create_async_engine("postgresql+asyncpg://unused@127.0.0.1/polis_test_eaf_fuera_de_alcance")
    await rejected_async("sqlalchemy.asyncpg", engine.connect)
    await engine.dispose()
    rejected("psycopg.connect", lambda: psycopg.connect("dbname=polis_test_eaf_fuera_de_alcance"))
    rejected("psycopg.Connection.connect", lambda: psycopg.Connection.connect("dbname=polis_test_eaf_fuera_de_alcance"))
    rejected("smtplib.SMTP.connect", lambda: smtplib.SMTP().connect("203.0.113.1", 25))
    with socket.socket() as sock:
        rejected("socket.connect external", lambda: sock.connect(("203.0.113.1", 25)))
    rejected("socket.getaddrinfo external", lambda: socket.getaddrinfo("example.invalid", 443))
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        rejected("socket.sendto external", lambda: sock.sendto(b"EAF", ("203.0.113.1", 25)))
    outside = EVIDENCE.parents[1] / "data" / ("eaf_must_not_exist_" + uuid.uuid4().hex)
    assert not outside.exists()
    rejected("repository write outside evidence", lambda: outside.write_text("must be rejected before creation"))
    assert not outside.exists()
    data = {"database_guard": os.environ["POLIS_EAF_DATABASE"], "rejections_before_io": rejections, "count": len(rejections), "external_connections_opened": 0, "repository_sentinel_created": False}
    (EVIDENCE / "guardas_verificadas.json").write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps(data))


asyncio.run(main())
