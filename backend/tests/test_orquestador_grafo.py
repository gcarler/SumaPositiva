"""Trazabilidad industrial del orquestador experto (0071): migración, puertas y HITL.

Cubre:
- Migración 0071 en una base polis_test*: `thread_id` en la bitácora 0070, la tabla
  `seguimiento.corridas_pipeline_pasos` con su CHECK de estados y `alembic check` limpio.
- Plan simple con manejador inyectado: el corredor se ejecuta, la puerta aprueba con
  su dictamen validado y todo queda en el diario auditable con SHA-256.
- HITL: resumen con idempotencia rota → severidad alta → congelamiento del grafo,
  y reanudación en el mismo proceso tras la decisión validada del auditor.

Los manejadores son inyectados: las pruebas no tocan `bd_csh` ni el corredor real.
La conexión al diario usa siempre la base de pruebas explícita del entorno.
"""

import asyncio
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

import pytest
from alembic.config import Config
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command

pytestmark = pytest.mark.integration


def _config_alembic() -> Config:
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


def _url_pruebas() -> str:
    database_url = os.getenv("POLIS_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva de pruebas")
    if not (make_url(database_url).database or "").startswith("polis_test"):
        pytest.fail("La base de pruebas debe llamarse polis_test o comenzar por polis_test")
    return database_url


def _limpiar_diario(thread_id: str) -> None:
    async def limpiar() -> None:
        engine = create_async_engine(os.environ["POLIS_TEST_DATABASE_URL"])
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text("DELETE FROM seguimiento.corridas_pipeline_pasos WHERE thread_id = :hilo"),
                    {"hilo": thread_id},
                )
        finally:
            await engine.dispose()

    asyncio.run(limpiar())


def _diario_por_thread(thread_id: str) -> list[dict[str, Any]]:
    async def leer() -> list[dict[str, Any]]:
        engine = create_async_engine(os.environ["POLIS_TEST_DATABASE_URL"])
        try:
            async with engine.connect() as connection:
                filas = (
                    (
                        await connection.execute(
                            text(
                                "SELECT nodo, orden, estado, payload, sha256_payload IS NOT NULL AS con_sha "
                                "FROM seguimiento.corridas_pipeline_pasos WHERE thread_id = :hilo "
                                "ORDER BY orden"
                            ),
                            {"hilo": thread_id},
                        )
                    )
                    .mappings()
                    .all()
                )
            return [dict(fila) for fila in filas]
        finally:
            await engine.dispose()

    return asyncio.run(leer())


def test_migracion_0071_diario_auditable(monkeypatch):
    """La revisión 0071 instala el enlace de hilos y el diario auditable con su guardia."""
    database_url = _url_pruebas()
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = _config_alembic()
    command.upgrade(config, "head")
    command.check(config)

    async def regimen() -> None:
        engine = create_async_engine(database_url)
        try:
            # Verificación de esquema y siembra en su propia transacción.
            async with engine.begin() as connection:
                columnas = (
                    (
                        await connection.execute(
                            text(
                                "SELECT column_name FROM information_schema.columns "
                                "WHERE table_schema = 'seguimiento' "
                                "AND table_name = 'corridas_pipeline'"
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                assert "thread_id" in columnas

                corrida = (
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline "
                            "(etapa, estado, comando, thread_id) "
                            "VALUES ('dea', 'corriendo', 'evaluar_dea', 'hilo-siembra') RETURNING id"
                        )
                    )
                ).scalar_one()

                # Fila del diario con payload JSONB y SHA-256, ligada a la corrida.
                paso = (
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline_pasos "
                            "(thread_id, corrida_id, nodo, orden, etapa, estado, payload, sha256_payload) "
                            "VALUES ('hilo-siembra', :corrida_id, 'nodo_puerta', 1, 'dea', "
                            "'aprobado', '{\"aprobado\": true}'::jsonb, repeat('a', 64)) "
                            "RETURNING id, orden"
                        ),
                        {"corrida_id": corrida},
                    )
                ).one()
                assert paso.orden == 1

            # Un segundo paso del mismo hilo hereda el orden siguiente.
            async with engine.begin() as connection:
                orden_siguiente = (
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline_pasos "
                            "(thread_id, nodo, orden, etapa, estado) VALUES "
                            "('hilo-siembra', 'nodo_corredor', "
                            "COALESCE((SELECT max(orden) + 1 FROM seguimiento.corridas_pipeline_pasos "
                            "WHERE thread_id = 'hilo-siembra'), 1), 'dea', 'fallo') RETURNING orden"
                        )
                    )
                ).scalar_one()
                assert orden_siguiente == 2

            # Estados fuera del catálogo del diario se rechazan.
            async with engine.begin() as connection:
                with pytest.raises(IntegrityError):
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline_pasos "
                            "(thread_id, nodo, orden, etapa, estado) "
                            "VALUES ('hilo-siembra', 'nodo_puerta', 9, 'dea', 'cancelado')"
                        )
                    )

            # Etapas fuera del catálogo se rechazan.
            async with engine.begin() as connection:
                with pytest.raises(IntegrityError):
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.corridas_pipeline_pasos "
                            "(thread_id, nodo, orden, etapa, estado) "
                            "VALUES ('hilo-siembra', 'nodo_puerta', 10, 'respaldo', 'fallo')"
                        )
                    )
            async with engine.begin() as connection:
                await connection.execute(
                    text("DELETE FROM seguimiento.corridas_pipeline_pasos WHERE thread_id = 'hilo-siembra'")
                )
                await connection.execute(
                    text("DELETE FROM seguimiento.corridas_pipeline WHERE id = :id"), {"id": corrida}
                )
        finally:
            await engine.dispose()

    asyncio.run(regimen())


def test_grafo_aprueba_plan_y_deja_diario_completo():
    """Plan de una etapa con manejador inyectado: la puerta aprueba y el diario queda."""
    _url_pruebas()
    thread_id = "grafo-aprobado-0001"

    def manejador_exitoso(etapa: str, hilo: str) -> tuple[int, dict[str, Any]]:
        assert etapa == "fuentes" and hilo == thread_id
        return 0, {
            "ok": True,
            "log": "logs/pipeline/prueba.log",
            "motivo": "ok",
            "estado_calidad": "verde",
            "estado_publicacion": "publicable",
            "consolidado_sha256": "a" * 64,
        }

    from app.modules.compromisos.orquestador_grafo import correr_grafo

    salida = correr_grafo(plan=["fuentes"], thread_id=thread_id, manejadores={"fuentes": manejador_exitoso})
    assert salida["estado_checkpointer"] == "COMPLETADO_SIN_BLOQUEO"
    assert salida["pareceres"]["fuentes"]["aprobado"] is True
    assert salida["decisiones"] == {}
    nodos = {paso["nodo"] for paso in salida["traza"]}
    assert {"nodo_supervisor", "nodo_corredor", "nodo_puerta"} <= nodos

    diario = _diario_por_thread(thread_id)
    estados_puerta = [f["estado"] for f in diario if f["nodo"] == "nodo_puerta"]
    assert estados_puerta == ["aprobado"]
    # Sólo el paso del corredor va sin payload (no hay resumen que exponer ahí);
    # el resto del diario debe llevar su SHA-256 de integridad.
    sin_sha = [f["nodo"] for f in diario if not f["con_sha"]]
    assert all(nodo == "nodo_corredor" for nodo in sin_sha), (diario, sin_sha)
    ordenes = [f["orden"] for f in diario]
    assert ordenes == sorted(ordenes) and len(set(ordenes)) == len(ordenes)
    _limpiar_diario(thread_id)


def test_congelamiento_y_reanudacion_con_auditor():
    """Idempotencia rota → severidad alta → congelamiento; la decisión del auditor reanuda."""
    _url_pruebas()
    thread_id = "grafo-auditoria-0001"

    def manejador_regresivo(etapa: str, hilo: str) -> tuple[int, dict[str, Any]]:
        # El corredor termina bien (exit 0) pero la tabla quedó en estado intermedio:
        # exactamente el escenario industrial que el congelamiento debe interceptar.
        assert etapa == "conciliacion" and hilo == thread_id
        return 0, {
            "metas_conciliadas": 100,
            "total_filas_en_bd": 98,
            "distribucion_por_tipo_vinculo": {"PROGRAMA_Y_DEPENDENCIA_ACREDITADOS": 100},
            "cruces_hermanos_3_motores_aplicados": 4,
            "planes_procesados": ["PDD_2024_2027"],
        }

    from app.modules.compromisos.orquestador_grafo import DecisionAuditor, correr_grafo

    congelado = correr_grafo(
        plan=["conciliacion"], thread_id=thread_id, manejadores={"conciliacion": manejador_regresivo}
    )
    assert congelado["interrumpido"] is True
    assert congelado["estado_checkpointer"] == "CONGELADO_PARA_AUDITORIA_HUMANA"
    assert congelado["pareceres"]["conciliacion"]["aprobado"] is False
    severidades = {h["severidad"] for h in congelado["pareceres"]["conciliacion"]["hallazgos"]}
    assert "alta" in severidades

    reanudado = correr_grafo(
        plan=["conciliacion"],
        thread_id=thread_id,
        aprobacion=DecisionAuditor(aprobado=True, auditor="Auditor de prueba", observaciones="Aceptado con reserva"),
    )
    assert reanudado["estado_checkpointer"] == "DETENIDO_POR_PUERTA"
    assert reanudado["pareceres"]["conciliacion"]["aprobado"] is False
    assert reanudado["decisiones"]["conciliacion"]["auditor"] == "Auditor de prueba"

    diario = _diario_por_thread(thread_id)
    pasos_auditor = {f["estado"] for f in diario if f["nodo"] == "nodo_revision_humana"}
    assert pasos_auditor == {"rechazado_por_auditor"}
    estados_puerta = [f["estado"] for f in diario if f["nodo"] == "nodo_puerta"]
    assert estados_puerta == ["congelado"]
    _limpiar_diario(thread_id)


def test_checkpoint_reanuda_en_otro_proceso_sin_repetir_etapa():
    """Una decisión se recupera desde PostgreSQL al crear un nuevo proceso Python."""
    _url_pruebas()
    thread_id = f"grafo-otro-proceso-{uuid.uuid4().hex}"

    def manejador(etapa: str, hilo: str) -> tuple[int, dict[str, Any]]:
        assert etapa == "fuentes" and hilo == thread_id
        return 0, {"ok": False, "log": "sincronizacion_fallida.log"}

    from app.modules.compromisos.orquestador_grafo import correr_grafo

    congelado = correr_grafo(["fuentes"], thread_id=thread_id, manejadores={"fuentes": manejador})
    assert congelado["interrumpido"] is True
    codigo = (
        "import json,sys; "
        "from app.modules.compromisos.orquestador_grafo import correr_grafo,DecisionAuditor; "
        "r=correr_grafo(['fuentes'],thread_id=sys.argv[1],"
        "aprobacion=DecisionAuditor(aprobado=True,auditor='Auditor externo')); "
        "print('RESULTADO_GRAFO='+json.dumps(r,default=str))"
    )
    proceso = subprocess.run(
        [sys.executable, "-c", codigo, thread_id],
        cwd=Path(__file__).resolve().parents[1],
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        check=True,
        timeout=30,
    )
    linea = next(line for line in proceso.stdout.splitlines() if line.startswith("RESULTADO_GRAFO="))
    reanudado = json.loads(linea.removeprefix("RESULTADO_GRAFO="))
    assert reanudado["interrumpido"] is False
    assert reanudado["estado_checkpointer"] == "DETENIDO_POR_PUERTA"
    assert reanudado["pareceres"]["fuentes"]["aprobado"] is False
    assert sum(paso["nodo"] == "nodo_corredor" for paso in reanudado["traza"]) == 1
    _limpiar_diario(thread_id)


def test_corredor_real_emite_resultado_estructurado_en_subproceso():
    """Ejecuta el runner verdadero con un manejador local y bitácora polis_test."""
    _url_pruebas()
    thread_id = f"corredor-real-{uuid.uuid4().hex}"
    codigo = (
        "import importlib.util,sys; "
        "s=importlib.util.spec_from_file_location('p','../scripts/pipeline_datos_polis.py'); "
        "p=importlib.util.module_from_spec(s); s.loader.exec_module(p); "
        "p._correr_fuentes=lambda ruta:(0,{'ok':True,'log':'prueba.log'}); "
        "raise SystemExit(p._plan(True,'fuentes',1,thread_id=sys.argv[1]))"
    )
    proceso = subprocess.run(
        [sys.executable, "-c", codigo, thread_id],
        cwd=Path(__file__).resolve().parents[1],
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert proceso.returncode == 0, proceso.stderr[-1000:]
    linea = next(line for line in proceso.stdout.splitlines() if line.startswith("POLIS_PIPELINE_RESULT_JSON="))
    paquete = json.loads(linea.removeprefix("POLIS_PIPELINE_RESULT_JSON="))["fuentes"]
    assert paquete["estado"] == "exitoso"
    assert paquete["resumen"] == {"ok": True, "log": "prueba.log"}
    assert isinstance(paquete["corrida_id"], int)

    async def limpiar() -> None:
        engine = create_async_engine(os.environ["POLIS_TEST_DATABASE_URL"])
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text("DELETE FROM seguimiento.corridas_pipeline WHERE id = :id"),
                    {"id": paquete["corrida_id"]},
                )
        finally:
            await engine.dispose()

    asyncio.run(limpiar())


def test_auditor_rechaza_y_el_plan_termina_con_hallazgo():
    """Un rechazo del auditor promote el dictamen: el resultado queda marcado y no se promueve."""
    _url_pruebas()
    thread_id = "grafo-rechazo-0002"

    def manejador_fracasado(etapa: str, hilo: str) -> tuple[int, dict[str, Any]]:
        return 0, {
            "metas_conciliadas": 10,
            "total_filas_en_bd": 9,
            "distribucion_por_tipo_vinculo": {"PROGRAMA_Y_DEPENDENCIA_ACREDITADOS": 10},
            "cruces_hermanos_3_motores_aplicados": 1,
            "planes_procesados": ["PDD_2024_2027"],
        }

    from app.modules.compromisos.orquestador_grafo import DecisionAuditor, correr_grafo

    congelado = correr_grafo(
        plan=["conciliacion"], thread_id=thread_id, manejadores={"conciliacion": manejador_fracasado}
    )
    assert congelado["interrumpido"] is True

    reanudado = correr_grafo(
        plan=["conciliacion"],
        thread_id=thread_id,
        aprobacion=DecisionAuditor(
            aprobado=False, auditor="Auditor de prueba", observaciones="El despisable no es idempotente"
        ),
    )
    assert reanudado["decisiones"]["conciliacion"]["aprobado"] is False
    assert reanudado["resultados"]["conciliacion"]["exit_code"] == -1

    diario = _diario_por_thread(thread_id)
    estados_auditor = [f["estado"] for f in diario if f["nodo"] == "nodo_revision_humana"]
    assert estados_auditor == ["rechazado_por_auditor"]
    _limpiar_diario(thread_id)


def test_decision_humana_exige_auditor():
    """Una decisión sin auditor no pasa el esquema (sin campos libres sin validar)."""
    from app.modules.compromisos.orquestador_grafo import DecisionAuditor

    with pytest.raises(ValidationError):
        DecisionAuditor.model_validate({"aprobado": True, "auditor": ""})
    with pytest.raises(ValidationError):
        DecisionAuditor.model_validate({"auditor": "algo"})
