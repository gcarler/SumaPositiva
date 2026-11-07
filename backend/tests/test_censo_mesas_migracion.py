"""Replay del censo con datos previos y atomicidad, en la base de migraciones."""

import asyncio
import json
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from app.core.migrations import EXPECTED_REVISION

pytestmark = [pytest.mark.integration, pytest.mark.migration]


def _consulta(url, sql, parametros=None):
    async def ejecutar():
        engine = create_async_engine(url, hide_parameters=True)
        try:
            async with engine.begin() as connection:
                result = await connection.execute(text(sql), parametros or {})
                return result.mappings().all() if result.returns_rows else []
        finally:
            await engine.dispose()

    # Cada comprobación abre otra conexión y ve solo cambios confirmados.
    return asyncio.run(ejecutar())


def _config():
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


@pytest.mark.migration
def test_censo_preserva_uuid_dependiente_y_mesa_ajena(database_url):
    config = _config()
    command.downgrade(config, "0094_herald_salud_resumen")
    mesa_id, extra_id = uuid.uuid4(), uuid.uuid4()
    sujeto = uuid.uuid4().hex
    try:
        _consulta(
            database_url,
            """
            INSERT INTO mesas_trabajo.mesas
                (id, ruta_jerarquica, tipo_mesa, codigo_oficial, shortcode_ciudadano,
                 nombre, slug, aforo_maximo, total_asistentes)
            VALUES (:id, 'prueba.censo', 'POBLACIONAL', 'MP-POB-01', :sujeto,
                    'Mesa anterior con participantes', :slug, 10, 1),
                   (:extra, 'prueba.ajena', 'BARRIAL', :sujeto, :otro_slug,
                    'Mesa fuera del censo', :otro_slug, 10, 0)
            """,
            {"id": mesa_id, "extra": extra_id, "sujeto": sujeto, "slug": sujeto, "otro_slug": f"x-{sujeto}"},
        )
        _consulta(
            database_url,
            """INSERT INTO mesas_trabajo.participantes_mesa (mesa_id, sujeto_id, nombre_completo)
               VALUES (:id, :sujeto, 'Participante anterior')""",
            {"id": mesa_id, "sujeto": sujeto},
        )
        command.upgrade(config, "head")
        mesas = _consulta(
            database_url,
            "SELECT id, total_asistentes FROM mesas_trabajo.mesas WHERE id IN (:id, :extra)",
            {"id": mesa_id, "extra": extra_id},
        )
        assert {r["id"] for r in mesas} == {mesa_id, extra_id}
        assert next(r for r in mesas if r["id"] == mesa_id)["total_asistentes"] == 1
        assert (
            _consulta(
                database_url,
                "SELECT mesa_id FROM mesas_trabajo.participantes_mesa WHERE sujeto_id=:sujeto",
                {"sujeto": sujeto},
            )[0]["mesa_id"]
            == mesa_id
        )
        assert (
            _consulta(database_url, "SELECT mesa_id FROM mesas_trabajo.agendas WHERE id='mp-001'")[0]["mesa_id"]
            == mesa_id
        )
        # Un downgrade con dependientes debe abortar: no borra participantes ni sus vínculos.
        with pytest.raises(RuntimeError, match="con datos dependientes"):
            command.downgrade(config, "0094_herald_salud_resumen")
        assert (
            _consulta(database_url, "SELECT mesa_id FROM mesas_trabajo.agendas WHERE id='mp-001'")[0]["mesa_id"]
            == mesa_id
        )
        assert _consulta(database_url, "SELECT version_num FROM alembic_version")[0]["version_num"] == EXPECTED_REVISION
    finally:
        _consulta(
            database_url, "DELETE FROM mesas_trabajo.participantes_mesa WHERE sujeto_id=:sujeto", {"sujeto": sujeto}
        )
        _consulta(database_url, "DELETE FROM mesas_trabajo.mesas WHERE id=:id", {"id": extra_id})
        command.upgrade(config, "head")


@pytest.mark.migration
def test_censo_incompleto_revierte_siembra_y_version(database_url):
    config = _config()
    command.downgrade(config, "0094_herald_salud_resumen")
    anterior = _consulta(database_url, "SELECT row_to_json(a) AS fila FROM mesas_trabajo.agendas a WHERE id='mp-001'")[
        0
    ]["fila"]
    antes = _consulta(database_url, "SELECT id, codigo_oficial FROM mesas_trabajo.mesas ORDER BY id")
    try:
        _consulta(database_url, "DELETE FROM mesas_trabajo.agendas WHERE id='mp-001'")
        with pytest.raises(RuntimeError, match="Censo H-05 inválido"):
            command.upgrade(config, "head")
        assert _consulta(database_url, "SELECT id, codigo_oficial FROM mesas_trabajo.mesas ORDER BY id") == antes
        assert _consulta(database_url, "SELECT version_num FROM alembic_version")[0]["version_num"] == (
            "0094_herald_salud_resumen"
        )
    finally:
        _consulta(
            database_url,
            """INSERT INTO mesas_trabajo.agendas
               SELECT * FROM jsonb_populate_record(NULL::mesas_trabajo.agendas, CAST(:fila AS jsonb))""",
            {"fila": json.dumps(anterior)},
        )
        command.upgrade(config, "head")
