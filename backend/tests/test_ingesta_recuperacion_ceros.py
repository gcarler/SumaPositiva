"""Ceros observados y nulos de la ingesta: regresiones de conversión y persistencia."""

from __future__ import annotations

import asyncio
import io
import os
import uuid

import pytest
from openpyxl import Workbook
from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.compromisos import ingesta_masiva_service as servicio
from app.modules.compromisos.ingesta_masiva_excel import ArchivoLeido
from app.modules.compromisos.models import ArchivoPlanIngerido, LoteIngestaPlan, RegistroTriadaNormalizado


@pytest.mark.parametrize("definitiva,inicial,esperado", [(0, 100, 0), (None, 100, 100), (None, None, None)])
def test_fallback_preserva_cero_y_solo_usa_inicial_si_falta_definitiva(definitiva, inicial, esperado):
    archivo = ArchivoLeido("fixture.xlsx", "xlsx", "a" * 64, "fixture", 1, 2024, "ANUAL", "EPA", [])
    fila = {
        "motor_destino": "INVERSION_PRESUPUESTAL",
        "apropiacion_definitiva_cop": definitiva,
        "apropiacion_inicial_cop": inicial,
    }
    registro = servicio._datos_registro(archivo, fila, uuid.uuid4(), uuid.uuid4())
    assert registro.apropiacion_definitiva_cop == esperado


def test_cruce_no_sustituye_cero_estrategico_ni_presupuestal(monkeypatch):
    monkeypatch.setattr(
        servicio,
        "cruzar_tres_lecturas",
        lambda metas, _, ejec: {
            "avance": metas[0].avance_estrategico_pct,
            "definitiva": ejec[0].apropiacion_definitiva_cop,
        },
    )
    filas = [
        {"motor_destino": "PLAN_DESARROLLO", "avance_estrategico_pct": 0, "avance_fisico_pct": 75},
        {"motor_destino": "INVERSION_PRESUPUESTAL", "apropiacion_definitiva_cop": 0, "apropiacion_inicial_cop": 100},
    ]
    assert servicio.IngestaMasivaService._cruzar_filas(filas) == {"avance": 0, "definitiva": 0}


@pytest.mark.integration
def test_cero_presupuestal_y_nulo_persisten_desde_otra_conexion():
    async def ejecutar():
        url = make_url(os.environ["POLIS_TEST_DATABASE_URL"])
        assert url.database.startswith("polis_test")
        motor = create_async_engine(url)
        sesiones = async_sessionmaker(motor, expire_on_commit=False)
        marker = "R304-" + uuid.uuid4().hex
        libro = Workbook()
        hoja = libro.active
        hoja.append(["Dependencia", "Descripción actividad", "Apropiación inicial", "Apropiación definitiva"])
        hoja.append(["EPA", marker + "-cero", 100, 0])
        hoja.append(["EPA", marker + "-nulo", None, "Infinity"])
        buffer = io.BytesIO()
        libro.save(buffer)
        lote_id = None
        try:
            async with sesiones() as sesion:
                respuesta = await servicio.IngestaMasivaService(sesion).ingerir(
                    [("PA_2024_EPA_CEROS.xlsx", buffer.getvalue())], origen="PRUEBA_304"
                )
                assert respuesta["archivos_persistidos"] == 1 and not respuesta["archivos_con_error"]
            async with sesiones() as otra:
                lote_id = await otra.scalar(
                    select(LoteIngestaPlan.id).where(LoteIngestaPlan.codigo_lote == respuesta["codigo_lote"])
                )
                filas = (
                    await otra.scalars(
                        select(RegistroTriadaNormalizado).where(
                            RegistroTriadaNormalizado.lote_id == lote_id,
                            RegistroTriadaNormalizado.motor_destino == "INVERSION_PRESUPUESTAL",
                        )
                    )
                ).all()
                valores = {r.descripcion_actividad: r.apropiacion_definitiva_cop for r in filas}
                assert valores == {marker + "-cero": 0, marker + "-nulo": None}
        finally:
            if lote_id:
                async with sesiones.begin() as limpieza:
                    await limpieza.execute(
                        delete(RegistroTriadaNormalizado).where(RegistroTriadaNormalizado.lote_id == lote_id)
                    )
                    await limpieza.execute(delete(ArchivoPlanIngerido).where(ArchivoPlanIngerido.lote_id == lote_id))
                    await limpieza.execute(delete(LoteIngestaPlan).where(LoteIngestaPlan.id == lote_id))
            await motor.dispose()

    asyncio.run(ejecutar())
