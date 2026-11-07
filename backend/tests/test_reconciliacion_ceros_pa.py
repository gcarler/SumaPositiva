"""Reparación del cero con plan fijado, prueba desde otra conexión y rollback."""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from openpyxl import Workbook
from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.transactions import transaction
from app.modules.compromisos.ingesta_masiva_service import IngestaMasivaService
from app.modules.compromisos.models import ArchivoPlanIngerido, LoteIngestaPlan, RegistroTriadaNormalizado
from app.modules.compromisos.reconciliacion_ceros_pa import (
    CLAVE_AUDITORIA,
    _candidato,
    aplicar_ceros,
    bytes_plan,
    previsualizar_ceros,
)


@pytest.mark.parametrize(
    "definitiva,inicial,guardado,es_candidato",
    [
        (0, 100, 100, True),
        ("0", "1.000,50", Decimal("1000.50"), True),
        (None, 100, 100, False),
        (False, 100, 100, False),
        (0, 0, 100, False),
        (0, 100, 0, False),
    ],
)
def test_candidato_exige_cero_observado_y_reproduce_fallback(definitiva, inicial, guardado, es_candidato):
    archivo = ArchivoPlanIngerido(
        id=uuid.uuid4(),
        hash_sha256="a" * 64,
        mapeo_columnas={"Hoja": {"apropiacion_definitiva_cop": "D", "apropiacion_inicial_cop": "I"}},
    )
    registro = RegistroTriadaNormalizado(
        id=uuid.uuid4(),
        hoja_origen="Hoja",
        fila_origen_num=2,
        datos_origen={"D": definitiva, "I": inicial},
        apropiacion_definitiva_cop=guardado,
    )
    antes = dict(registro.datos_origen)
    resultado = _candidato(registro, archivo)
    assert (resultado is not None) is es_candidato
    assert registro.datos_origen == antes and registro.apropiacion_definitiva_cop == guardado


def test_candidato_no_repara_un_valor_que_no_reproduce_el_defecto():
    archivo = ArchivoPlanIngerido(
        mapeo_columnas={"H": {"apropiacion_definitiva_cop": "D", "apropiacion_inicial_cop": "I"}}
    )
    registro = RegistroTriadaNormalizado(
        hoja_origen="H", datos_origen={"D": 0, "I": 100}, apropiacion_definitiva_cop=999
    )
    with pytest.raises(ValueError, match="revisión individual"):
        _candidato(registro, archivo)


def test_plan_canonico_y_sha_invalido_aborta_antes_de_sql():
    plan = {"receta": "invalida", "base": "polis_test", "registros": []}
    assert bytes_plan(plan) == bytes_plan(dict(reversed(list(plan.items()))))
    session = MagicMock()
    with pytest.raises(ValueError, match="SHA-256"):
        asyncio.run(aplicar_ceros(session, plan, sha256_esperado="0" * 64))
    assert not session.mock_calls


@pytest.mark.parametrize("registros", [None, [{}], [{"id": "invalido"}]])
def test_plan_mal_formado_no_abre_transaccion(registros):
    from app.modules.compromisos.reconciliacion_ceros_pa import RECETA_CEROS

    plan = {"receta": RECETA_CEROS, "base": "polis_test", "registros": registros}
    session = MagicMock()
    digest = hashlib.sha256(bytes_plan(plan)).hexdigest()
    with pytest.raises(ValueError):
        asyncio.run(aplicar_ceros(session, plan, sha256_esperado=digest))
    assert not session.mock_calls


def test_plan_no_admite_json_con_no_finitos():
    with pytest.raises(ValueError):
        bytes_plan({"no_finito": float("nan")})


@pytest.mark.integration
@pytest.mark.parametrize("modo", ["exito", "fuente_obsoleta", "fallo_flush"])
def test_reparacion_atomica_idempotente_y_trazable(database_url, modo):
    async def ejecutar():
        assert make_url(database_url).database.startswith("polis_test")
        engine = create_async_engine(database_url)
        sesiones = async_sessionmaker(engine, expire_on_commit=False)
        libro = Workbook()
        hoja = libro.active
        hoja.append(["Dependencia", "Descripción actividad", "Apropiación inicial", "Apropiación definitiva"])
        marcador = uuid.uuid4().hex
        for i in (1, 2):
            hoja.append(["EPA", marcador + str(i), i * 100, 0])
        buffer = io.BytesIO()
        libro.save(buffer)
        lote_id = None
        try:
            async with sesiones() as s:
                res = await IngestaMasivaService(s).ingerir(
                    [("PA_2024_EPA_REPARACION.xlsx", buffer.getvalue())], origen="PRUEBA_304_CEROS"
                )
                assert res["archivos_persistidos"] == 1
            async with sesiones() as s:
                async with transaction(s):
                    lote_id = await s.scalar(
                        select(LoteIngestaPlan.id).where(LoteIngestaPlan.codigo_lote == res["codigo_lote"])
                    )
                    registros = list(
                        (
                            await s.scalars(
                                select(RegistroTriadaNormalizado)
                                .where(
                                    RegistroTriadaNormalizado.lote_id == lote_id,
                                    RegistroTriadaNormalizado.motor_destino == "INVERSION_PRESUPUESTAL",
                                )
                                .order_by(RegistroTriadaNormalizado.id)
                            )
                        ).all()
                    )
                    assert len(registros) == 2
                    for r in registros:
                        r.apropiacion_definitiva_cop = Decimal(str(r.datos_origen["Apropiación inicial"]))
                    ids = {str(r.id) for r in registros}
                    valores_antes = {
                        str(r.id): str(r.apropiacion_definitiva_cop.quantize(Decimal("0.01"))) for r in registros
                    }
            async with sesiones() as s:
                plan = await previsualizar_ceros(s)
                plan["registros"] = [r for r in plan["registros"] if r["id"] in ids]
                assert len(plan["registros"]) == 2
                digest = hashlib.sha256(bytes_plan(plan)).hexdigest()
            if modo == "fuente_obsoleta":
                async with sesiones() as s:
                    async with transaction(s):
                        r = await s.get(RegistroTriadaNormalizado, uuid.UUID(plan["registros"][-1]["id"]))
                        r.datos_origen = {**r.datos_origen, "marca_cambio_fuente": True}
            async with sesiones() as s:
                if modo == "fallo_flush":
                    flush_real = s.flush

                    async def fallar_flush(*args, **kwargs):
                        await flush_real(*args, **kwargs)
                        raise RuntimeError("FALLO_DESPUES_FLUSH_REAL")

                    s.flush = fallar_flush
                if modo == "exito":
                    result = await aplicar_ceros(s, plan, sha256_esperado=digest)
                    assert result == {"plan_sha256": digest, "corregidos": 2, "ya_aplicados": 0}
                else:
                    esperado = ValueError if modo == "fuente_obsoleta" else RuntimeError
                    with pytest.raises(esperado):
                        await aplicar_ceros(s, plan, sha256_esperado=digest)
            async with sesiones() as otra:
                guardados = list(
                    (
                        await otra.scalars(
                            select(RegistroTriadaNormalizado).where(
                                RegistroTriadaNormalizado.id.in_([uuid.UUID(i) for i in ids])
                            )
                        )
                    ).all()
                )
                if modo == "exito":
                    assert all(r.apropiacion_definitiva_cop == 0 for r in guardados)
                    for r in guardados:
                        a = r.datos_origen[CLAVE_AUDITORIA]
                        assert a["plan_sha256"] == digest and a["anterior"] == valores_antes[str(r.id)]
                        assert a["nuevo"] == "0.00" and a["aplicado_en"]
                        assert r.datos_origen["Apropiación definitiva"] == 0
                else:
                    assert {str(r.id): str(r.apropiacion_definitiva_cop) for r in guardados} == valores_antes
                    assert all(CLAVE_AUDITORIA not in r.datos_origen for r in guardados)
            if modo == "exito":
                async with sesiones() as s:
                    result = await aplicar_ceros(s, json.loads(bytes_plan(plan)), sha256_esperado=digest)
                    assert result == {"plan_sha256": digest, "corregidos": 0, "ya_aplicados": 2}
                async with sesiones() as s:
                    nuevo = await previsualizar_ceros(s)
                    assert not any(r["id"] in ids for r in nuevo["registros"])
        finally:
            if lote_id:
                async with sesiones.begin() as limpieza:
                    await limpieza.execute(
                        delete(RegistroTriadaNormalizado).where(RegistroTriadaNormalizado.lote_id == lote_id)
                    )
                    await limpieza.execute(delete(ArchivoPlanIngerido).where(ArchivoPlanIngerido.lote_id == lote_id))
                    await limpieza.execute(delete(LoteIngestaPlan).where(LoteIngestaPlan.id == lote_id))
            await engine.dispose()

    asyncio.run(ejecutar())
