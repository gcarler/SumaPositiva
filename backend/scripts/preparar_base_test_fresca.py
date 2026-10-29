"""Prepara una base polis_test* fresca para la suite integral.

- Deriva el DSN de POLIS_DATABASE_URL env o backend/.env (sin imprimir secretos).
- Verifica que la base plantilla tenga PostGIS y pgRouting.
- Crea la base nueva con TEMPLATE, garantizando las extensiones (el usuario
  `polis` no puede instalar pgRouting en bases nuevas: hallazgo ambiental).
- Escribe el DSN resultante en /tmp/base_fresca.dsn con chmod 600 para el bash.
- Deja el esquema LÓGICO vacío: baja todas las tablas vía alembic downgrade
  base (subshell), de modo que la suite reconstruya con `upgrade head`.
"""

import asyncio
import os
import pathlib
import subprocess

BASE_ORIGEN = "polis_test"  # única plantilla existente con pgRouting instalado
BASE_NUEVA = "polis_test_verd_<YYYYMMDD>"
RUTA_ENV = pathlib.Path("backend/.env")
RUTA_DSN = pathlib.Path("/tmp/base_fresca.dsn")

from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402


def leer_dsn() -> str:
    if os.environ.get("POLIS_DATABASE_URL"):
        return os.environ["POLIS_DATABASE_URL"]
    if RUTA_ENV.exists():
        for line in RUTA_ENV.read_text().splitlines():
            line = line.strip()
            if line.startswith("POLIS_DATABASE_URL="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("No se encontró POLIS_DATABASE_URL en env ni backend/.env")


def _con(engine):
    return engine.connect()


async def main() -> None:
    raw = leer_dsn()
    url = make_url(raw)
    url_admin = url.set(database="postgres")
    engine = create_async_engine(url_admin, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as con:
            usuario = (await con.execute(text("SELECT current_user"))).scalar_one()
            puede_crear = (
                await con.execute(text("SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user"))
            ).scalar()
            print(f"Usuario DSN: {usuario} | rolcreatedb: {puede_crear}")
            if not puede_crear:
                raise SystemExit("El rol del DSN no puede crear bases; requiere operación manual.")

            # Descartar el intento anterior sin pgRouting, si quedó suelto.
            huérfana = "polis_test_dea_verd_20261024"
            if (await con.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": huérfana})).scalar():
                for fila in (
                    await con.execute(text("SELECT pid FROM pg_stat_activity WHERE datname = :n"), {"n": huérfana})
                ).mappings():
                    await con.execute(text("SELECT pg_terminate_backend(:pid)"), {"pid": fila["pid"]})
                await con.execute(text(f'DROP DATABASE IF EXISTS "{huérfana}"'))
                print(f"Base desechada sin pgRouting: {huérfana}")

            ya_existente = (
                await con.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": BASE_NUEVA})
            ).scalar()
            print(f"Base nueva {BASE_NUEVA}: {'ya existe' if ya_existente else 'no existe'}")

            if not ya_existente:
                origen_ok = (
                    await con.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": BASE_ORIGEN})
                ).scalar()
                if not origen_ok:
                    raise SystemExit(f"La plantilla {BASE_ORIGEN} no existe.")
                await con.execute(text(f'CREATE DATABASE "{BASE_NUEVA}" TEMPLATE "{BASE_ORIGEN}"'))
                print(f"Base {BASE_NUEVA} creada desde plantilla {BASE_ORIGEN}.")

            url_nueva = url.set(database=BASE_NUEVA).render_as_string(hide_password=False)
    finally:
        await engine.dispose()

    # Extensiones presentes en la base clonada.
    engine_nueva = create_async_engine(url_nueva, isolation_level="AUTOCOMMIT")
    try:
        async with engine_nueva.connect() as con:
            filas = (await con.execute(text("SELECT extname FROM pg_extension ORDER BY extname"))).scalars()
            extensiones = list(filas)
            print("Extensiones:", ", ".join(extensiones))
            faltan = {e for e in ("postgis", "pgrouting")} - set(extensiones)
            if faltan:
                raise SystemExit(f"Extensiones ausentes en la plantilla clonada: {faltan}")
            tablas = (
                await con.execute(
                    text(
                        "SELECT count(*) FROM pg_tables "
                        "WHERE schemaname NOT IN ('pg_catalog','information_schema') "
                        "AND tablename != 'spatial_ref_sys'"
                    )
                )
            ).scalar_one()
            print(f"Tablas (pre-downgrade): {tablas}")
    finally:
        await engine_nueva.dispose()

    # Downgrade del esquema lógico a base (deja las extensiones per-db instaladas).
    env = dict(os.environ)
    env["POLIS_DATABASE_URL"] = url_nueva
    resultado = subprocess.run(
        ["uv", "run", "--project", "backend", "alembic", "--config", "backend/alembic.ini", "downgrade", "base"],
        env=env,
        capture_output=True,
        text=True,
        timeout=600,
    )
    print(f"downgrade base exit={resultado.returncode}")
    if resultado.returncode != 0:
        print(resultado.stdout[-3000:])
        print(resultado.stderr[-3000:])
        raise SystemExit("El downgrade a base falló; esquema residual en la base nueva.")

    engine_nueva2 = create_async_engine(url_nueva, isolation_level="AUTOCOMMIT")
    try:
        async with engine_nueva2.connect() as con:
            tablas = (
                await con.execute(
                    text(
                        "SELECT count(*) FROM pg_tables "
                        "WHERE schemaname NOT IN ('pg_catalog','information_schema') "
                        "AND tablename != 'spatial_ref_sys'"
                    )
                )
            ).scalar_one()
            print(f"Tablas (post-downgrade): {tablas} (0 = esquema fresco)")
    finally:
        await engine_nueva2.dispose()

    RUTA_DSN.write_text(url_nueva + "\n")
    RUTA_DSN.chmod(0o600)
    print(f"DSN de la base fresca escrito en {RUTA_DSN} (contraseña no impresa).")


if __name__ == "__main__":
    asyncio.run(main())
