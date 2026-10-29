import asyncio
import os
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command

pytestmark = pytest.mark.integration


def _config_alembic() -> Config:
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


def test_corridas_pipeline_regimen_operativo(monkeypatch):
    database_url = os.getenv("POLIS_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva de pruebas")
    if not (make_url(database_url).database or "").startswith("polis_test"):
        pytest.fail("La base de pruebas debe llamarse polis_test o comenzar por polis_test")

    # La migración 0070 debe instalar limpio y pasar alembic check en la base de pruebas.
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = _config_alembic()
    command.upgrade(config, "head")
    command.check(config)

    async def regimen() -> None:
        engine = create_async_engine(database_url)
        try:
            # Cada escenario en su propio begin(): una violación revierte su
            # bloque sin talar los siguientes.
            async with engine.begin() as connection:
                corrida = (
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline (etapa, estado, comando) "
                            "VALUES ('fuentes', 'corriendo', 'sincronizar.py') RETURNING id"
                        )
                    )
                ).scalar_one()
            async with engine.begin() as connection:
                # Única corrida activa por etapa: un segundo `corriendo` viola el índice parcial.
                with pytest.raises(IntegrityError):
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline (etapa, estado) VALUES ('fuentes', 'corriendo')"
                        )
                    )
            async with engine.begin() as connection:
                await connection.execute(
                    text(
                        "UPDATE seguimiento.corridas_pipeline SET estado = 'exitoso', "
                        "fin_en = now(), exit_code = 0, duracion_ms = 5124, "
                        "resumen = '{\"ok\": true}'::jsonb WHERE id = :id"
                    ),
                    {"id": corrida},
                )
                fila = (
                    await connection.execute(
                        text(
                            "SELECT estado, fin_en IS NOT NULL, duracion_ms, resumen->>'ok' "
                            "FROM seguimiento.corridas_pipeline WHERE id = :id"
                        ),
                        {"id": corrida},
                    )
                ).one()
                assert fila[0] == "exitoso" and fila[1] is True and fila[2] == 5124 and fila[3] == "true"
            async with engine.begin() as connection:
                # Estados fuera del catálogo se rechazan.
                with pytest.raises(IntegrityError):
                    await connection.execute(
                        text("INSERT INTO seguimiento.corridas_pipeline (etapa, estado) VALUES ('dea', 'cancelada')")
                    )
            async with engine.begin() as connection:
                # Etapas fuera del catálogo se rechazan.
                with pytest.raises(IntegrityError):
                    await connection.execute(
                        text("INSERT INTO seguimiento.corridas_pipeline (etapa, estado) VALUES ('backup', 'corriendo')")
                    )
            async with engine.begin() as connection:
                await connection.execute(
                    text("DELETE FROM seguimiento.corridas_pipeline WHERE id = :id"), {"id": corrida}
                )
            # Después de cerrar la única activa, una nueva corrida de la misma etapa cabe.
            async with engine.begin() as connection:
                nueva = (
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline (etapa, estado) "
                            "VALUES ('conciliacion', 'corriendo') RETURNING id"
                        )
                    )
                ).scalar_one()
                await connection.execute(
                    text("DELETE FROM seguimiento.corridas_pipeline WHERE id = :id"), {"id": nueva}
                )
        finally:
            await engine.dispose()

    asyncio.run(regimen())


@pytest.mark.migration
def test_corridas_pipeline_reconstruccion_con_datos_previos(database_url, monkeypatch):
    """downgrade a 0069 y reconstrucción: la tabla vuelve vacía y operativa."""
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = _config_alembic()
    command.upgrade(config, "head")

    async def dejar_datos_previos() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text("INSERT INTO seguimiento.corridas_pipeline (etapa, estado) VALUES ('dea', 'omitido')")
                )
        finally:
            await engine.dispose()

    asyncio.run(dejar_datos_previos())
    command.downgrade(config, "0069_idx_indicadores_terr_cod")
    command.upgrade(config, "head")

    async def verificar_tabla_operativa() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                filas = (
                    await connection.execute(text("SELECT count(*) FROM seguimiento.corridas_pipeline"))
                ).scalar_one()
                assert filas == 0  # la reconstrucción parte vacía; lo persistido de negocio queda intacto
        finally:
            await engine.dispose()

    asyncio.run(verificar_tabla_operativa())
