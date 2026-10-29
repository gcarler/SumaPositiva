"""Integridad de las tablas DMU nivel 3 del DEA al lineage Alembic (migración 0082).

Estructura versionada: modelos ORM coincidentes, upgrade idempotente en base
fresca y downgrade que NO borra datos reales (decisión documentada en
bridge/09 §6: en bd_csh las tablas fueron materializadas por el script
operacional con datos del padrón; su retiro requiere decisión EDD/EAF).
"""

import asyncio
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command

pytestmark = pytest.mark.integration


def _config_alembic() -> Config:
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


def test_tres_tablas_dea_versionadas_check_limpio(prepared_test_database, monkeypatch) -> None:
    """Con la base al head la estructura modelo↔BD coincide y las 3 tablas existen."""
    if not prepared_test_database:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva polis_test*")
    if not (make_url(prepared_test_database).database or "").startswith("polis_test"):
        pytest.fail("La base de pruebas debe llamarse polis_test o comenzar por polis_test")
    monkeypatch.setenv("POLIS_DATABASE_URL", prepared_test_database)
    command.check(_config_alembic())

    async def _verificar() -> None:
        from app.modules.compromisos.models import (
            PddDmuEseCentroSalud,
            PddDmuIeoOficial,
            PddFuentesFinanciacionDmu,
        )

        engine = create_async_engine(prepared_test_database)
        try:
            async with engine.begin() as conexion:
                for modelo in (PddDmuIeoOficial, PddDmuEseCentroSalud, PddFuentesFinanciacionDmu):
                    n = (
                        await conexion.execute(text(f"SELECT to_regclass('seguimiento.{modelo.__tablename__}')"))
                    ).scalar()
                    assert n and n.endswith(modelo.__tablename__), n
        finally:
            await engine.dispose()

    asyncio.run(_verificar())


@pytest.mark.migration
def test_downgrade_0081_no_destruye_datos_y_reconstruccion_limpia(database_url, monkeypatch) -> None:
    """El downgrade documentado como no-op conserva filas; la reconstrucción vuelve al head."""
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = _config_alembic()
    command.upgrade(config, "head")

    async def _sembrar_fila_de_prueba() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conexion:
                await conexion.execute(
                    text(
                        "INSERT INTO seguimiento.pdd_fuentes_financiacion_dmu "
                        "(dmu_codigo, nombre_dmu, nivel_dmu, sgr_regalias_cop, credito_publico_cop, "
                        "sgp_transferencias_cop, icld_recursos_propios_cop, cofinanciacion_nacion_cop, "
                        "total_fuentes_cop) VALUES ('POLIS-TEST-0082', 'Prueba lineage', 'L3', 1, 2, 3, 4, 5, 15) "
                        "ON CONFLICT (dmu_codigo) DO NOTHING"
                    )
                )
        finally:
            await engine.dispose()

    asyncio.run(_sembrar_fila_de_prueba())
    command.downgrade(config, "0081_proteger_correspondencias")

    # Las filas reales del padrón deben sobrevivir el downgrade (retiro de la
    # tabla requiere decisión EDD/EAF; el downgrade del lineage no borra).

    async def _confirmar_conservacion_y_reconstruccion() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conexion:
                fila = (
                    await conexion.execute(
                        text(
                            "SELECT COUNT(*) FROM seguimiento.pdd_fuentes_financiacion_dmu "
                            "WHERE dmu_codigo='POLIS-TEST-0082'"
                        )
                    )
                ).scalar()
                assert int(fila or 0) == 1
                await conexion.execute(
                    text("DELETE FROM seguimiento.pdd_fuentes_financiacion_dmu WHERE dmu_codigo='POLIS-TEST-0082'")
                )
        finally:
            await engine.dispose()

    asyncio.run(_confirmar_conservacion_y_reconstruccion())
    command.upgrade(config, "head")
    command.check(config)
