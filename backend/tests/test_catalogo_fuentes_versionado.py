"""Carga inmutable e idempotente del inventario en una base polis_test*."""

import asyncio
import hashlib
import json
from copy import deepcopy
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine

from scripts.cargar_catalogo_fuentes import cargar

pytestmark = pytest.mark.integration


def test_carga_real_no_duplica_y_no_promueve(prepared_test_database):
    if prepared_test_database is None:
        pytest.skip("Se requiere POLIS_TEST_DATABASE_URL")
    raiz = Path(__file__).resolve().parents[2]
    inventario = json.loads((raiz / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json").read_text())
    primera = asyncio.run(cargar(prepared_test_database, inventario))
    segunda = asyncio.run(cargar(prepared_test_database, inventario))
    assert primera == segunda
    assert primera["fuentes"] == 43
    assert primera["paquetes"] == 8
    assert primera["artefactos"] == inventario["artefactos"]
    assert primera["promovidos"] == 0
    assert sum(primera["calidad_estructural"].values()) == 43
    assert primera["artefactos_pendientes_asignacion"] > 0

    async def contar():
        engine = create_async_engine(prepared_test_database)
        try:
            async with engine.connect() as conexion:
                fuentes = (await conexion.execute(text("SELECT count(*) FROM seguimiento.fuentes_datos"))).scalar_one()
                lotes = (await conexion.execute(text("SELECT count(*) FROM seguimiento.lotes_fuente"))).scalar_one()
                aprobadas = (
                    await conexion.execute(
                        text("SELECT count(*) FROM seguimiento.fuentes_datos WHERE estado_promocion = 'aprobada'")
                    )
                ).scalar_one()
                sin_paquete = (
                    await conexion.execute(
                        text("SELECT count(*) FROM seguimiento.artefactos_fuente WHERE paquete_clave IS NULL")
                    )
                ).scalar_one()
                paquetes = (
                    await conexion.execute(text("SELECT count(*) FROM seguimiento.paquetes_artefactos"))
                ).scalar_one()
                lotes_auditados = (
                    await conexion.execute(
                        text("""
                        SELECT count(*) FROM seguimiento.lotes_fuente
                        WHERE resultado_calidad ? 'evaluacion_estructural'
                          AND resultado_calidad->>'publicable' = 'false'
                    """)
                    )
                ).scalar_one()
                drive_cotejados = (
                    await conexion.execute(
                        text("""
                        SELECT count(*) FROM seguimiento.artefactos_fuente
                        WHERE jsonb_array_length(evidencia_origen->'drive_file_ids') > 0
                    """)
                    )
                ).scalar_one()
                return fuentes, lotes, aprobadas, sin_paquete, paquetes, lotes_auditados, drive_cotejados
        finally:
            await engine.dispose()

    fuentes, lotes, aprobadas, sin_paquete, paquetes, lotes_auditados, drive_cotejados = asyncio.run(contar())
    assert fuentes >= 43 and lotes >= 43 and aprobadas == 0
    assert sin_paquete == 0 and paquetes == 8 and lotes_auditados >= 43
    assert drive_cotejados == 1403


def test_fallo_tardio_revierte_artefacto_insertado_desde_otra_sesion(prepared_test_database):
    if prepared_test_database is None:
        pytest.skip("Se requiere POLIS_TEST_DATABASE_URL")
    raiz = Path(__file__).resolve().parents[2]
    inventario = deepcopy(json.loads((raiz / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json").read_text()))

    def extra(ruta_relativa: str, formato: str) -> dict:
        ruta = raiz / ruta_relativa
        return {
            "ruta": ruta_relativa,
            "paquete_clave": "banco_local",
            "evidencia_origen": {},
            "sha256": hashlib.sha256(ruta.read_bytes()).hexdigest(),
            "bytes": ruta.stat().st_size,
            "formato": formato,
            "rol": "control",
        }

    ruta_nueva = "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
    inventario["archivos"].append(extra(ruta_nueva, "json"))
    inventario["archivos"].append(extra("data/banco_fuentes_oficiales/plan_actualizacion_2026.json", "x" * 41))
    inventario["artefactos"] += 2
    with pytest.raises(SQLAlchemyError):
        asyncio.run(cargar(prepared_test_database, inventario))

    async def contar() -> int:
        engine = create_async_engine(prepared_test_database)
        try:
            async with engine.connect() as conexion:
                return (
                    await conexion.execute(
                        text("SELECT count(*) FROM seguimiento.artefactos_fuente WHERE ruta = :ruta"),
                        {"ruta": ruta_nueva},
                    )
                ).scalar_one()
        finally:
            await engine.dispose()

    assert asyncio.run(contar()) == 0
