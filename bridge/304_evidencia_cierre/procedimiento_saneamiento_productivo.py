"""Operación 304 explícita y reanudable; no es una prueba ni una migración.

PYTHONPATH=backend backend/.venv/bin/python RUTA --fase respaldo|aplicar|recalentar
La fase aplicar exige --sha256-plan. Sin argumentos no se realiza ninguna acción.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import shutil
import tempfile
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import Settings
from app.modules.compromisos.models import RegistroTriadaNormalizado
from app.modules.compromisos.reconciliacion_ceros_pa import (
    aplicar_ceros,
    bytes_plan,
    previsualizar_ceros,
)
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

ROOT = Path("/root/polis")
PRIVADO = ROOT / "backups/reconciliacion_304"
PLAN = PRIVADO / "plan_bd_csh_previsualizacion.json"
CACHE_DIR = ROOT / "data/planes_desarrollo"
ARCHIVOS_CACHE = (
    "cache_pdd_dea_v12.json",
    "cache_inteligencia_triada_6m.json",
    "cache_pdt_ai_evaluator.json",
    "checkpoints_pdt_ai_evaluator.json",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def guardar(path: Path, valor: dict) -> None:
    with path.open("x", encoding="utf-8") as archivo:
        json.dump(
            valor, archivo, ensure_ascii=False, indent=2, default=str, allow_nan=False
        )
        archivo.write("\n")
        archivo.flush()
        os.fsync(archivo.fileno())


async def verificar(sesion, plan, digest):
    ids = [uuid.UUID(r["id"]) for r in plan["registros"]]
    filas = list(
        (
            await sesion.scalars(
                select(RegistroTriadaNormalizado).where(
                    RegistroTriadaNormalizado.id.in_(ids)
                )
            )
        ).all()
    )
    assert len(filas) == 67
    assert all(
        r.apropiacion_definitiva_cop == 0
        and r.datos_origen["_reconciliacion_cero_presupuestal"]["plan_sha256"] == digest
        for r in filas
    )
    assert not (await previsualizar_ceros(sesion))["registros"]


async def ejecutar(args):
    os.umask(0o077)
    url = make_url(Settings().async_database_url)
    if (
        url.database != "bd_csh"
        or (url.port or 5432) != 5432
        or url.host not in {"127.0.0.1", "localhost"}
    ):
        raise ValueError("La operación requiere el destino productivo local declarado")
    plan = json.loads(PLAN.read_text())
    digest = hashlib.sha256(bytes_plan(plan)).hexdigest()
    if plan["base"] != "bd_csh" or len(plan["registros"]) != 67 or sha(PLAN) != digest:
        raise ValueError("El plan productivo no satisface las precondiciones fijadas")
    kwargs = {
        "server_settings": {
            "statement_timeout": "120000",
            "application_name": "POLIS304_saneamiento",
        }
    }
    if args.fase == "respaldo":
        kwargs["server_settings"]["default_transaction_read_only"] = "on"
    motor = create_async_engine(url, hide_parameters=True, connect_args=kwargs)
    sesiones = async_sessionmaker(motor, expire_on_commit=False)
    try:
        if args.fase == "respaldo":
            destino = PRIVADO / "respaldo_previo"
            destino.mkdir(mode=0o700)
            async with sesiones() as sesion:
                await sesion.execute(
                    text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
                )
                actual = await previsualizar_ceros(sesion)
                if bytes_plan(actual) != bytes_plan(plan):
                    raise ValueError(
                        "Los registros cambiaron desde la previsualización"
                    )
                rows = (
                    (
                        await sesion.execute(
                            select(RegistroTriadaNormalizado.__table__).where(
                                RegistroTriadaNormalizado.id.in_(
                                    [uuid.UUID(r["id"]) for r in plan["registros"]]
                                )
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
                guardar(
                    destino / "registros_completos.json",
                    {"registros": [dict(r) for r in rows]},
                )
                guardar(
                    destino / "conteos.json",
                    {
                        t: await sesion.scalar(
                            text("SELECT count(*) FROM seguimiento." + t)
                        )
                        for t in (
                            "archivos_plan_ingeridos",
                            "registros_triada_normalizados",
                            "lotes_ingesta_planes",
                        )
                    },
                )
                for tabla in ("pdt_ai_evaluaciones", "pdt_ai_checkpoints_hitl"):
                    existe = await sesion.scalar(
                        text("SELECT to_regclass(:nombre)"),
                        {"nombre": "seguimiento." + tabla},
                    )
                    if existe:
                        filas = (
                            (
                                await sesion.execute(
                                    text("SELECT * FROM seguimiento." + tabla)
                                )
                            )
                            .mappings()
                            .all()
                        )
                        guardar(
                            destino / (tabla + ".json"),
                            {"registros": [dict(r) for r in filas]},
                        )
            for nombre in ARCHIVOS_CACHE:
                origen = CACHE_DIR / nombre
                if origen.is_file():
                    shutil.copyfile(origen, destino / nombre)
            manifiesto = {
                "base": "bd_csh",
                "solo_lectura": True,
                "plan_sha256": digest,
                "archivos": [
                    {"nombre": p.name, "sha256": sha(p), "bytes": p.stat().st_size}
                    for p in sorted(destino.iterdir())
                ],
            }
            guardar(PRIVADO / "respaldo_previo.json", manifiesto)
            print(
                json.dumps(
                    {
                        "fase": args.fase,
                        "archivos": len(manifiesto["archivos"]),
                        "plan_sha256": digest,
                    }
                )
            )
        elif args.fase == "aplicar":
            if args.sha256_plan != digest:
                raise ValueError("Aplicar exige el SHA-256 explícito del plan revisado")
            previo = json.loads((PRIVADO / "respaldo_previo.json").read_text())
            assert previo["plan_sha256"] == digest
            for r in previo["archivos"]:
                assert sha(PRIVADO / "respaldo_previo" / r["nombre"]) == r["sha256"]
            async with sesiones() as sesion:
                resultado = await aplicar_ceros(sesion, plan, sha256_esperado=digest)
            async with sesiones() as otra:
                await otra.execute(text("SET TRANSACTION READ ONLY"))
                await verificar(otra, plan, digest)
                despues = {
                    t: await otra.scalar(text("SELECT count(*) FROM seguimiento." + t))
                    for t in (
                        "archivos_plan_ingeridos",
                        "registros_triada_normalizados",
                        "lotes_ingesta_planes",
                    )
                }
            assert despues == json.loads(
                (PRIVADO / "respaldo_previo/conteos.json").read_text()
            )
            guardar(
                PRIVADO / "aplicacion_verificada.json",
                {
                    "fecha_utc": datetime.now(UTC).isoformat(),
                    "base": "bd_csh",
                    **resultado,
                    "otra_conexion_verificada": True,
                    "conteos": despues,
                },
            )
            print(
                json.dumps(
                    {"fase": args.fase, **resultado, "otra_conexion_verificada": True}
                )
            )
        else:
            await recalentar(sesiones, plan, digest)
    finally:
        await motor.dispose()


async def recalentar(sesiones, plan, digest):
    from app.modules.compromisos import inteligencia_triada_service as intel
    from app.modules.compromisos import pdd_dea_service as pdd
    from app.modules.compromisos import pdt_ai_evaluator_graph as pdt

    sombra = PRIVADO / "caches_recalculados"
    sombra.mkdir(mode=0o700)
    async with sesiones() as sesion:
        await sesion.execute(text("SET TRANSACTION READ ONLY"))
        await verificar(sesion, plan, digest)
    for nombre in ("cache_pdt_ai_evaluator.json", "checkpoints_pdt_ai_evaluator.json"):
        if (CACHE_DIR / nombre).is_file():
            shutil.copyfile(CACHE_DIR / nombre, sombra / nombre)
    pdt.CACHE_PATH = sombra / "cache_pdt_ai_evaluator.json"
    pdt.CHECKPOINT_PATH = sombra / "checkpoints_pdt_ai_evaluator.json"
    pasos = []
    async with sesiones() as sesion:
        inicio = time.monotonic()
        resultado = await pdt.ejecutar_pdt_ai_evaluator(sesion, force_refresh=True)
        if resultado.get("persistencia_pg", {}).get("estado") != "SINCRONIZADO_PG":
            raise RuntimeError("No se sincronizó la nueva evaluación y su checkpoint")
        pasos.append(
            {
                "motor": "PDT-AI",
                "segundos": time.monotonic() - inicio,
                "fingerprint_fuentes_sha256": resultado.get(
                    "fingerprint_fuentes_sha256"
                ),
                "persistencia_pg": resultado["persistencia_pg"],
            }
        )
    pdd.CACHE_V11 = sombra / "cache_pdd_dea_v12.json"
    pdd.CACHE_V10 = pdd.CACHE_V11
    pdd.PDT_AI_CACHE = pdt.CACHE_PATH
    pdd._DISK_CACHE = {}
    for cache in (pdd._STATE, pdd._RESULT, pdd._RAW_JSON_BYTES):
        cache.clear()
    intel.CACHE_INTELIGENCIA = sombra / "cache_inteligencia_triada_6m.json"
    intel._DISK_RESULTS = {}
    intel._CACHE.clear()
    intel._RESULTS.clear()
    async with sesiones() as sesion:
        await sesion.execute(
            text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        )
        instancias = [
            (
                pdd.PddDeaService(sesion),
                [
                    "catalogo_y_conciliacion_ppi",
                    "cumplimiento_metas",
                    "frontera_dea_pdd",
                    "econometria_comparada_pdd",
                    "explorador_programas_y_seguridad_humana",
                    "laboratorio_prescriptivo_pdd",
                    "resumen_ejecutivo",
                    "comparativo_seguridad_humana_pdd_only",
                ],
            ),
            (intel.InteligenciaTriadaService(sesion), sorted(intel._PERSISTED_METHODS)),
        ]
        for servicio, nombres in instancias:
            for nombre in nombres:
                inicio = time.monotonic()
                parametros = (
                    {"incluir_detalle": False}
                    if nombre == "comparativo_seguridad_humana_pdd_only"
                    else {}
                )
                await getattr(servicio, nombre)(**parametros)
                pasos.append(
                    {
                        "motor": type(servicio).__name__,
                        "metodo": nombre,
                        "segundos": time.monotonic() - inicio,
                    }
                )
                print(json.dumps(pasos[-1]), flush=True)
    for nombre in ARCHIVOS_CACHE:
        contenido = (sombra / nombre).read_text()
        json.loads(
            contenido,
            parse_constant=lambda s: (_ for _ in ()).throw(
                ValueError("No finito: " + s)
            ),
        )
    manifiesto = {
        "base": "bd_csh",
        "plan_sha256": digest,
        "fecha_utc": datetime.now(UTC).isoformat(),
        "pasos": pasos,
        "aprobacion_humana_emitida": False,
        "archivos": [{"nombre": n, "sha256": sha(sombra / n)} for n in ARCHIVOS_CACHE],
    }
    guardar(PRIVADO / "recalentamiento_verificado.json", manifiesto)
    for nombre in ARCHIVOS_CACHE:
        destino = CACHE_DIR / nombre
        descriptor, temporal = tempfile.mkstemp(prefix=".polis304-", dir=CACHE_DIR)
        with os.fdopen(descriptor, "wb") as archivo:
            archivo.write((sombra / nombre).read_bytes())
            archivo.flush()
            os.fsync(archivo.fileno())
        os.chmod(
            temporal, destino.stat().st_mode & 0o777 if destino.exists() else 0o600
        )
        os.replace(temporal, destino)
    guardar(PRIVADO / "caches_publicados.json", manifiesto)
    print(json.dumps({"caches_publicados": len(ARCHIVOS_CACHE), "pasos": len(pasos)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fase", choices=("respaldo", "aplicar", "recalentar"), required=True
    )
    parser.add_argument("--sha256-plan")
    asyncio.run(ejecutar(parser.parse_args()))
