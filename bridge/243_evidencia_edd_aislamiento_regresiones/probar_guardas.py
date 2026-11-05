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
assert os.environ["POLIS_EDD_DATABASE"].startswith("polis_test_edd_aislamiento_20261027_")
rejections = []


def rejected(label, operation):
    try:
        operation()
    except (RuntimeError, PermissionError) as error:
        assert "Guarda EDD" in str(error)
        rejections.append(label)
    else:
        raise AssertionError("Guarda no aplicada: " + label)


async def rejected_async(label, operation):
    try:
        await operation()
    except RuntimeError as error:
        assert "Guarda EDD" in str(error)
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
    expected = os.environ["POLIS_EDD_DATABASE"]
    await rejected_async("asyncpg correct_db wrong_port", lambda: asyncpg.connect(database=expected, host="127.0.0.1", port=5433))
    await rejected_async("asyncpg correct_db external_host", lambda: asyncpg.connect(database=expected, host="203.0.113.1", port=5432))
    rejected("psycopg correct_db wrong_port", lambda: psycopg.connect(dbname=expected, host="127.0.0.1", port=5433))
    rejected("psycopg correct_db external_hostaddr", lambda: psycopg.connect(dbname=expected, host="localhost", hostaddr="203.0.113.1", port=5432))
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
        rejected("socket.sendto external", lambda: sock.sendto(b"EDD", ("203.0.113.1", 25)))
    outside = EVIDENCE.parents[1] / "data" / ("eaf_must_not_exist_" + uuid.uuid4().hex)
    assert not outside.exists()
    rejected("repository write outside evidence", lambda: outside.write_text("must be rejected before creation"))
    assert not outside.exists()
    outside_tmp = Path("/tmp") / ("edd_must_not_exist_" + uuid.uuid4().hex)
    rejected("temporary write outside isolated directory", lambda: outside_tmp.write_text("must not exist"))
    assert not outside_tmp.exists()
    from sqlalchemy import text
    positive = create_async_engine(os.environ["POLIS_TEST_DATABASE_URL"])
    try:
        async with positive.connect() as connection:
            actual = await connection.scalar(text("SELECT current_database()"))
            assert actual == expected
    finally:
        await positive.dispose()
    migration = create_async_engine(os.environ["POLIS_TEST_MIGRATIONS_DATABASE_URL"])
    try:
        async with migration.connect() as connection:
            migration_actual = await connection.scalar(text("SELECT current_database()"))
            assert migration_actual != expected and migration_actual in json.loads(os.environ["POLIS_EDD_DATABASES"])
    finally:
        await migration.dispose()
    import tempfile
    with tempfile.TemporaryDirectory() as isolated:
        assert Path(isolated).is_relative_to(EVIDENCE / "tmp")
    data = {"positive_migrations_database_matches": True, "temporary_directory_isolated": True,"positive_database_matches": actual == expected, "database_guard": os.environ["POLIS_EDD_DATABASE"], "rejections_before_io": rejections, "count": len(rejections), "external_connections_opened": 0, "repository_sentinel_created": False}
    (EVIDENCE / "guardas_verificadas_v2.json").write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps(data))


asyncio.run(main())
