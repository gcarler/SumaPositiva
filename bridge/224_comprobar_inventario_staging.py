"""Comprueba el candidato completo en staging y solo en la base propia de coordinación."""

import asyncio
import copy
import hashlib
import json
import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from scripts import cargar_catalogo_fuentes as cargador

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "bridge/205_evidencia_temporales_pruebas/224_staging_inventario"
OUT.mkdir(exist_ok=False)
CANDIDATO = next((ROOT / "bridge/223_validacion_candidato_inventario").glob("candidato_corregido_*.json"))
inventario = json.loads(CANDIDATO.read_text())
staging = OUT / "checkout_lectura"
entrada_control = next(e for e in inventario["archivos"] if e["rol"] == "derivado_control")
for entrada in inventario["archivos"]:
    destino = staging / entrada["ruta"]
    destino.parent.mkdir(parents=True, exist_ok=True)
    if entrada is entrada_control:
        origen = ROOT / inventario["captura_control"]["ruta_origen_213"]
        with destino.open("xb") as archivo:
            archivo.write(origen.read_bytes())
    else:
        # Referencias de lectura: no son copias ni artefactos inmutables nuevos.
        destino.symlink_to(ROOT / entrada["ruta"])
cargador.RAIZ = staging
assert cargador.CONSOLIDADO == ROOT / "data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv"
cargador.verificar_inventario(inventario)
url = os.environ["POLIS_TEST_DATABASE_URL"]
assert make_url(url).database == os.environ["POLIS_EDD_DATABASE"]
assert make_url(url).database.startswith("polis_test_edd_coord_20261026_")
TABLAS = ("fuentes_datos", "fuentes_versiones", "contratos_fuente", "lotes_fuente", "paquetes_artefactos", "artefactos_fuente")


async def snapshot():
    engine = create_async_engine(url, poolclass=NullPool)
    try:
        async with engine.connect() as conexion:
            pid = await conexion.scalar(text("SELECT pg_backend_pid()"))
            tablas = {}
            for tabla in TABLAS:
                conteo, digest = (await conexion.execute(text(
                    "SELECT count(*), encode(public.digest(coalesce(string_agg(to_jsonb(t)::text, "
                    "E'\\n' ORDER BY to_jsonb(t)::text), ''), 'sha256'), 'hex') "
                    f"FROM seguimiento.{tabla} AS t"
                ))).one()
                tablas[tabla] = {"filas": conteo, "sha256_contenido": digest}
            return {"pid_observador": pid, "tablas": tablas}
    finally:
        await engine.dispose()


async def main():
    primera = await cargador.cargar(url, inventario)
    despues_primera = await snapshot()
    segunda = await cargador.cargar(url, inventario)
    despues_segunda = await snapshot()
    assert primera == segunda
    assert despues_primera["tablas"] == despues_segunda["tablas"]
    assert primera["fuentes"] == 43 and primera["paquetes"] == 8 and primera["artefactos"] == 1829
    assert primera["promovidos"] == 0
    con_fallo = copy.deepcopy(inventario)
    for nombre, formato in [("control_224_primero.json", "json"), ("control_224_fallo.json", "x" * 41)]:
        ruta = "data/banco_fuentes_oficiales/" + nombre
        fisico = staging / ruta
        with fisico.open("xb") as archivo:
            archivo.write(b"{}")
        con_fallo["archivos"].append({
            "ruta": ruta, "paquete_clave": "banco_local", "evidencia_origen": {},
            "sha256": hashlib.sha256(b"{}").hexdigest(), "bytes": 2, "formato": formato, "rol": "control",
        })
    con_fallo["artefactos"] += 2
    error_sql = None
    try:
        await cargador.cargar(url, con_fallo)
    except SQLAlchemyError as error:
        error_sql = type(error).__name__
    assert error_sql is not None
    despues_error = await snapshot()
    assert despues_segunda["pid_observador"] != despues_error["pid_observador"]
    assert despues_segunda["tablas"] == despues_error["tablas"]
    resultado = {
        "verificador_real_1829": True, "resultado_carga_primera": primera, "resultado_carga_segunda": segunda,
        "idempotencia_tablas": True, "fallo_sql_tardio": error_sql, "rollback_seis_tablas_completas": True,
        "snapshot_antes_fallo": despues_segunda, "snapshot_despues_fallo": despues_error,
        "candidato_sha256": hashlib.sha256(CANDIDATO.read_bytes()).hexdigest(),
        "staging": "1828 enlaces de lectura a originales + una copia real de captura; no se afirma copia inmutable del banco.",
        "destino": make_url(url).database, "sin_publicacion_inventario_activo": True,
    }
    with (OUT / "resultado.json").open("x") as archivo:
        json.dump(resultado, archivo, ensure_ascii=False, indent=2)
    print(json.dumps({k: v for k, v in resultado.items() if not k.startswith("snapshot_")}, ensure_ascii=False))


asyncio.run(main())
