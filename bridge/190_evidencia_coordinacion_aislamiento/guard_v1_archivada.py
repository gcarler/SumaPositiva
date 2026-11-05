"""Guarda de ejecución EAF: no forma parte de POLIS ni modifica sus archivos."""

import json
import os
import ipaddress
import sys
from pathlib import Path

EXPECTED = os.environ.get("POLIS_EAF_DATABASE")
EVIDENCE = os.environ.get("POLIS_EAF_EVIDENCE")


def reject(driver, database):
    if database != EXPECTED:
        if EVIDENCE:
            with (Path(EVIDENCE) / "conexiones_rechazadas.jsonl").open("a") as file:
                file.write(json.dumps({"driver": driver, "database": database, "pid": os.getpid()}) + "\n")
        raise RuntimeError("Guarda EAF: conexión rechazada antes de abrir red a base fuera del alcance")


if EXPECTED:
    REPOSITORY = Path(EVIDENCE).parents[1]

    def audit(event, args):
        if event in {"socket.connect", "socket.sendto", "socket.getaddrinfo"}:
            address = args[0] if event == "socket.getaddrinfo" else args[-1]
            if event == "socket.getaddrinfo":
                address = (address,)
            if isinstance(address, (str, bytes)):
                return  # socket Unix local
            host = address[0]
            try:
                local = ipaddress.ip_address(host).is_loopback
            except ValueError:
                local = host == "localhost"
            if not local:
                raise RuntimeError("Guarda EAF: socket fuera de loopback rechazado antes de conectar")
        paths = []
        def anchored(path, directory_fd=None):
            if directory_fd is not None and directory_fd != -1 and isinstance(path, (str, bytes, os.PathLike)) and not os.path.isabs(path):
                return Path(os.readlink('/proc/self/fd/' + str(directory_fd))) / os.fsdecode(path)
            return path
        if event == "open":
            path, mode, flags = args
            if isinstance(mode, str) and any(c in mode for c in "wax+") or flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC):
                paths.append(path)
        elif event in {"os.remove", "os.rmdir"}:
            paths.append(anchored(args[0], args[1]))
        elif event in {"os.mkdir", "os.chmod"}:
            paths.append(anchored(args[0], args[2]))
        elif event == "os.truncate":
            paths.append(args[0])
        elif event == "os.symlink":
            paths.append(anchored(args[1], args[2]))
        elif event == "os.link":
            paths.append(anchored(args[1], args[3]))
        elif event == "os.rename":
            paths.extend([anchored(args[0], args[2]), anchored(args[1], args[3])])
        for path in paths:
            if isinstance(path, (str, bytes, os.PathLike)):
                resolved = Path(os.fsdecode(path)).resolve()
                if resolved.is_relative_to(REPOSITORY) and not resolved.is_relative_to(Path(EVIDENCE)):
                    raise PermissionError("Guarda EAF: escritura fuera del directorio de evidencia rechazada: " + str(resolved.relative_to(REPOSITORY)))

    sys.addaudithook(audit)

    import asyncpg
    from sqlalchemy.engine import make_url

    original_connect = asyncpg.connect

    async def isolated_connect(*args, **kwargs):
        database = kwargs.get("database")
        dsn = args[0] if args else kwargs.get("dsn")
        if database is None and dsn:
            database = make_url(dsn).database
        reject("asyncpg", database)
        return await original_connect(*args, **kwargs)

    asyncpg.connect = isolated_connect
    asyncpg.connection.connect = isolated_connect

    import psycopg
    from psycopg.conninfo import conninfo_to_dict, make_conninfo

    original_sync = psycopg.Connection.connect
    original_async = psycopg.AsyncConnection.connect

    def target(conninfo, kwargs):
        keys = {key: value for key, value in kwargs.items() if key in {"dbname", "host", "port", "user", "password"}}
        return conninfo_to_dict(make_conninfo(conninfo, **keys)).get("dbname")

    def isolated_sync(conninfo="", **kwargs):
        reject("psycopg", target(conninfo, kwargs))
        return original_sync(conninfo, **kwargs)

    async def isolated_async(conninfo="", **kwargs):
        reject("psycopg_async", target(conninfo, kwargs))
        return await original_async(conninfo, **kwargs)

    psycopg.Connection.connect = isolated_sync
    psycopg.connect = isolated_sync
    psycopg.AsyncConnection.connect = isolated_async

    import smtplib

    def no_smtp(*args, **kwargs):
        raise RuntimeError("Guarda EAF: transporte SMTP real deshabilitado")

    smtplib.SMTP.connect = no_smtp
    smtplib.SMTP_SSL.connect = no_smtp
