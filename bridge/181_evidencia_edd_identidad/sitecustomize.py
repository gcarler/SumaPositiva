"""Frena conexiones PostgreSQL fuera de la única base asignada a esta auditoría."""

import os
import re
import json
from pathlib import Path
import ipaddress
import sys

import asyncpg
from sqlalchemy.engine import make_url

_base = make_url(os.environ["POLIS_TEST_DATABASE_URL"]).database
assert re.fullmatch(r"polis_test_edd_identidad_20261026_[a-f0-9]{10}", _base or "")
assert make_url(os.environ["POLIS_DATABASE_URL"]).database == _base
_connect = asyncpg.connect


def _rechazar(canal, database):
    if database != _base:
        with (Path(__file__).parent / "conexiones-rechazadas.jsonl").open("a") as log:
            log.write(json.dumps({"canal": canal, "base_intentada": database, "pid": os.getpid()}) + "\n")
        raise RuntimeError("EDD: conexión fuera de la base asignada BLOQUEADA antes de conectar")


async def _connect_aislado(*args, **kwargs):
    dsn = args[0] if args else kwargs.get("dsn")
    database = kwargs.get("database")
    if database is None and dsn:
        database = make_url(dsn).database
    _rechazar("asyncpg", database)
    return await _connect(*args, **kwargs)


asyncpg.connect = _connect_aislado

import psycopg
from psycopg.conninfo import conninfo_to_dict, make_conninfo

_sync = psycopg.Connection.connect
_async = psycopg.AsyncConnection.connect


def _nombre_conninfo(conninfo, kwargs):
    partes = {k: v for k, v in kwargs.items() if k in {"dbname", "host", "port", "user", "password"}}
    return conninfo_to_dict(make_conninfo(conninfo, **partes)).get("dbname")


def _sync_aislado(conninfo="", **kwargs):
    _rechazar("psycopg", _nombre_conninfo(conninfo, kwargs))
    return _sync(conninfo, **kwargs)


async def _async_aislado(conninfo="", **kwargs):
    _rechazar("psycopg_async", _nombre_conninfo(conninfo, kwargs))
    return await _async(conninfo, **kwargs)


psycopg.Connection.connect = _sync_aislado
psycopg.connect = _sync_aislado
psycopg.AsyncConnection.connect = _async_aislado

from sqlalchemy import event
from sqlalchemy.engine import Engine


@event.listens_for(Engine, "do_connect")
def _sqlalchemy_aislado(dialect, record, args, kwargs):
    database = kwargs.get("database") or kwargs.get("dbname")
    if database is None and args:
        try:
            database = make_url(args[0]).database
        except Exception:
            database = _nombre_conninfo(args[0], kwargs)
    _rechazar("sqlalchemy:" + dialect.name, database)


import smtplib


def _sin_smtp(*args, **kwargs):
    raise RuntimeError("EDD: transporte SMTP real deshabilitado")


smtplib.SMTP.connect = _sin_smtp
smtplib.SMTP_SSL.connect = _sin_smtp

_out = Path(__file__).resolve().parent
_root = _out.parents[1]


def _registro_guardas(clase, detalle):
    with (_out / "guardas-rechazos.jsonl").open("a") as log:
        log.write(json.dumps({"clase": clase, "detalle": detalle, "pid": os.getpid()}) + "\n")


def _ruta_escritura(path, dir_fd=None):
    if not isinstance(path, (str, bytes, os.PathLike)):
        return
    candidate = Path(os.fsdecode(path))
    if not candidate.is_absolute() and isinstance(dir_fd, int) and dir_fd >= 0:
        candidate = Path(os.readlink(f"/proc/self/fd/{dir_fd}")) / candidate
    resolved = candidate.resolve()
    if resolved.is_relative_to(_root) and not resolved.is_relative_to(_out):
        _registro_guardas("escritura_repositorio", str(resolved.relative_to(_root)))
        raise RuntimeError("EDD: escritura fuera del directorio de evidencia bloqueada")


def _es_local(host):
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def _audit(event, args):
    if event == "open":
        path, mode, flags = args
        writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
            isinstance(flags, int) and flags & (os.O_WRONLY | os.O_RDWR | os.O_APPEND | os.O_TRUNC | os.O_CREAT)
        )
        if writing:
            _ruta_escritura(path)
    elif event in {"os.remove", "os.rmdir"}:
        _ruta_escritura(args[0], args[1] if len(args) > 1 else None)
    elif event in {"os.mkdir", "os.chmod"}:
        _ruta_escritura(args[0], args[2] if len(args) > 2 else None)
    elif event == "os.truncate":
        _ruta_escritura(args[0])
    elif event in {"os.rename", "os.link"}:
        _ruta_escritura(args[0], args[2] if len(args) > 2 else None)
        _ruta_escritura(args[1], args[3] if len(args) > 3 else None)
    elif event == "os.symlink":
        _ruta_escritura(args[1], args[2] if len(args) > 2 else None)
    elif event in {"socket.connect", "socket.sendto"}:
        address = args[-1]
        if isinstance(address, tuple) and not _es_local(address[0]):
            _registro_guardas("red_externa", "destino externo bloqueado sin registrar dirección ni credenciales")
            raise RuntimeError("EDD: conexión externa bloqueada")
    elif event == "socket.getaddrinfo" and args[0] and not _es_local(args[0]):
        _registro_guardas("dns_externo", "consulta externa bloqueada")
        raise RuntimeError("EDD: resolución externa bloqueada")


sys.addaudithook(_audit)
