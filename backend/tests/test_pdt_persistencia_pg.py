"""Pruebas de persistencia transaccional PostgreSQL (seguimiento.pdt_ai_evaluaciones y
seguimiento.pdt_ai_checkpoints_hitl) y del endpoint /historial-auditoria [Fase 24B].
"""

from __future__ import annotations

import asyncio
import os
import uuid
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import get_session
from app.modules.compromisos.pdt_persistencia_pg import (
    asegurar_tablas_pdt_ai_pg,
    guardar_evaluacion_pdt_pg,
    listar_dictamenes_hallazgos_pdt_pg,
    obtener_historial_auditoria_pdt_pg,
    registrar_checkpoint_hitl_pdt_pg,
    registrar_dictamen_hallazgo_pdt_pg,
    sincronizar_cache_y_checkpoints_a_pg,
)
from app.modules.compromisos.router import router as compromisos_router


def _bd_csh_url() -> str:
    """URL de la base de análisis para pruebas: SIEMPRE polis_test* cuando esté
    definida (T6 del plan de remediación; nunca bd_csh en pruebas). Sin base de
    pruebas la llamada se omite con causa explícita: JAMÁS caer a bd_csh
    (hallazgo HALL-03 / docs/transacciones.md)."""
    url_pruebas = os.getenv("POLIS_TEST_DATABASE_URL")
    if not url_pruebas:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva polis_test*")
    base_pruebas = make_url(url_pruebas).database or ""
    if not base_pruebas.startswith("polis_test"):
        raise RuntimeError("POLIS_TEST_DATABASE_URL debe apuntar a una base exclusiva polis_test*")
    return url_pruebas


async def _delete_hallazgo_for_test(hallazgo_id: str) -> None:
    engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            await session.execute(
                text("DELETE FROM seguimiento.pdt_ai_hallazgos_revision WHERE id_hallazgo=:id"),
                {"id": hallazgo_id},
            )
            await session.commit()
    finally:
        await engine.dispose()


def test_tablas_y_sincronizacion_inicial_en_bd_csh() -> None:
    """Verifica la creación idempotente de las tablas seguimiento.pdt_ai_evaluaciones y
    seguimiento.pdt_ai_checkpoints_hitl en bd_csh y la sincronización desde disco.
    """

    async def _run() -> dict[str, Any]:
        engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                await asegurar_tablas_pdt_ai_pg(session)
                sync_res = await sincronizar_cache_y_checkpoints_a_pg(session)
                await session.commit()
                hist = await obtener_historial_auditoria_pdt_pg(session, thread_id="pdt-cartagena-2024-2027", limit=10)
                return {"sync": sync_res, "hist": hist}
        finally:
            await engine.dispose()

    res = asyncio.run(_run())
    assert res["sync"]["evaluaciones_sincronizadas"] >= 1
    assert res["sync"]["checkpoints_sincronizados"] >= 1

    hist = res["hist"]
    assert hist["motor"] == "PDT-AI-EVALUATOR"
    assert hist["esquema_pg"] == "seguimiento"
    assert hist["total_evaluaciones"] >= 1
    assert hist["total_checkpoints_hitl"] >= 1
    first_eval = hist["evaluaciones"][0]
    assert first_eval["thread_id"] == "pdt-cartagena-2024-2027"
    assert len(first_eval["sha256_payload"]) == 64


def test_guardar_evaluacion_y_checkpoint_hitl_sha256_transaccional() -> None:
    """Verifica el upsert transaccional en seguimiento.pdt_ai_evaluaciones y el registro
    de auditoría Human-in-the-Loop en seguimiento.pdt_ai_checkpoints_hitl con hashes SHA-256.
    """
    test_thread = "pdt-test-transaccional-24b"

    async def _run() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                payload = {
                    "motor": "PDT-AI-EVALUATOR",
                    "thread_id": test_thread,
                    "jurisdiction": "Distrito Turístico y Cultural de Cartagena de Indias",
                    "time_horizon": "2024-2027",
                    "total_budget": 945000000000.0,
                    "unidades_dmu": ["Secretaría de Educación", "DADIS Salud"],
                    "dea_scores": {
                        "unidades_ineficientes": ["Secretaría de Educación"],
                        "malmquist": {"pares": [{"unidad": "DADIS Salud", "MPI": 1.04}]},
                    },
                    "nlp_coherence": {"alertas_mission_creep": [{"codigo_meta": "M-01", "alerta": "Mission Creep"}]},
                    "spatial_lisa": {
                        "moran_global_i": 0.412,
                        "coldspots": ["UCG 6"],
                        "trampas_territoriales_gestion_publica": [{"unidad_dmu": "Secretaría de Educación"}],
                    },
                    "time_series_forecast": {
                        "alto_riesgo_indicadores": ["Cobertura Saneamiento"],
                    },
                    "estado_checkpointer": "CONGELADO_PARA_AUDITORIA_HUMANA",
                    "is_valid_human": False,
                    "recommendations": [{"dmu": "Secretaría de Educación", "accion": "Reasignar rubros"}],
                }
                eval_saved = await guardar_evaluacion_pdt_pg(payload, db=session)
                ckpt_saved = await registrar_checkpoint_hitl_pdt_pg(
                    thread_id=test_thread,
                    estado="APROBADO_POR_AUDITOR",
                    aprobado=True,
                    auditor="Auditor General EAF",
                    observaciones="Validado conforme a GBR y MGA.",
                    patrones_criticos=[{"dmu": "Secretaría de Educación"}],
                    recomendaciones=payload["recommendations"],
                    db=session,
                )
                await session.commit()
                hist = await obtener_historial_auditoria_pdt_pg(session, thread_id=test_thread, limit=10)
                # Limpiar el hilo sintético de prueba tras verificar para no contaminar bd_csh
                await session.execute(
                    text("DELETE FROM seguimiento.pdt_ai_evaluaciones WHERE thread_id = :tid"),
                    {"tid": test_thread},
                )
                await session.execute(
                    text("DELETE FROM seguimiento.pdt_ai_checkpoints_hitl WHERE thread_id = :tid"),
                    {"tid": test_thread},
                )
                await session.commit()
                return eval_saved, ckpt_saved, hist
        finally:
            await engine.dispose()

    eval_saved, ckpt_saved, hist = asyncio.run(_run())
    assert eval_saved["thread_id"] == test_thread
    assert eval_saved["total_dmus"] == 2
    assert eval_saved["pares_malmquist"] == 1
    assert eval_saved["alertas_mission_creep"] == 1
    assert eval_saved["trampas_territoriales"] == 1
    assert eval_saved["series_alto_riesgo_isri"] == 1
    assert len(eval_saved["sha256_payload"]) == 64

    assert ckpt_saved["thread_id"] == test_thread
    assert ckpt_saved["estado_checkpointer"] == "APROBADO_POR_AUDITOR"
    assert ckpt_saved["aprobado"] is True
    assert ckpt_saved["auditor"] == "Auditor General EAF"
    assert len(ckpt_saved["sha256_checkpoint"]) == 64

    assert hist["total_evaluaciones"] == 1
    assert hist["total_checkpoints_hitl"] == 1
    assert hist["evaluaciones"][0]["sha256_payload"] == eval_saved["sha256_payload"]
    assert hist["checkpoints_hitl"][0]["sha256_checkpoint"] == ckpt_saved["sha256_checkpoint"]


def test_endpoint_get_historial_auditoria_pdt_ai_evaluator() -> None:
    """Verifica el contrato HTTP de
    GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/historial-auditoria.
    """
    app = FastAPI()
    app.include_router(compromisos_router, prefix="/api/v1")

    async def _override_db():
        engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                yield session
        finally:
            await engine.dispose()

    app.dependency_overrides[get_session] = _override_db
    client = TestClient(app)

    response = client.get(
        "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/historial-auditoria",
        params={"thread_id": "pdt-cartagena-2024-2027", "limit": 20},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["motor"] == "PDT-AI-EVALUATOR"
    assert body["esquema_pg"] == "seguimiento"
    assert "seguimiento.pdt_ai_evaluaciones" in body["tablas"]
    assert "seguimiento.pdt_ai_checkpoints_hitl" in body["tablas"]
    assert body["filtro_thread_id"] == "pdt-cartagena-2024-2027"
    assert body["total_evaluaciones"] >= 1
    assert body["total_checkpoints_hitl"] >= 1
    assert len(body["evaluaciones"][0]["sha256_payload"]) == 64
    assert len(body["checkpoints_hitl"][0]["sha256_checkpoint"]) == 64


def test_registrar_y_listar_dictamen_hallazgo_sha256():
    hallazgo_id = f"TEST-{uuid.uuid4()}"

    async def _run():
        engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                saved = await registrar_dictamen_hallazgo_pdt_pg(
                    id_hallazgo=hallazgo_id,
                    codigo_meta="M-TEST-29A",
                    estado_revision="EN_SUBSANACION_PDCA",
                    responsable="Secretaría de Planeación",
                    accion_correctiva_pdca="Planificar, ejecutar, verificar y ajustar la meta.",
                    auditor="Auditor EAF",
                    dependencia="Planeación",
                    evidencia_subsanacion="Acta de revisión",
                    db=session,
                )
                await session.commit()
                listed = await listar_dictamenes_hallazgos_pdt_pg(
                    db=session,
                    codigo_plan="PDD_2024_2027",
                    codigo_meta="M-TEST-29A",
                    estado_revision="EN_SUBSANACION_PDCA",
                )
                history = await obtener_historial_auditoria_pdt_pg(session, limit=200)
                await session.execute(
                    text("DELETE FROM seguimiento.pdt_ai_hallazgos_revision WHERE id_hallazgo=:id"),
                    {"id": hallazgo_id},
                )
                await session.commit()
                return saved, listed, history
        finally:
            await engine.dispose()

    saved, listed, history = asyncio.run(_run())
    assert saved["id_hallazgo"] == hallazgo_id
    assert saved["estado_revision"] == "EN_SUBSANACION_PDCA"
    assert len(saved["sha256_dictamen"]) == 64
    assert listed["total_dictamenes"] >= 1
    assert listed["dictamenes_hallazgos"][0]["id_hallazgo"] == hallazgo_id
    assert history["total_dictamenes_hallazgos"] >= 1
    assert any(row["id_hallazgo"] == hallazgo_id for row in history["dictamenes_hallazgos"])


def test_endpoints_dictaminar_y_listar_hallazgo(monkeypatch):
    from app.modules.identidad import deps
    from app.modules.identidad.security import crear_token_acceso

    async def sujeto_controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps, "cargar_sujeto_vigente", sujeto_controlado)

    hallazgo_id = f"HTTP-{uuid.uuid4()}"
    test_sujeto_id = uuid.uuid4()
    app = FastAPI()
    app.include_router(compromisos_router, prefix="/api/v1")

    async def _override_db():
        engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                yield session
        finally:
            await engine.dispose()

    app.dependency_overrides[get_session] = _override_db
    client = TestClient(app)
    base = "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta"

    # 1. Sin autenticación debe responder 401 (257-H01)
    unauth = client.post(
        f"{base}/dictaminar-hallazgo",
        json={
            "id_hallazgo": hallazgo_id,
            "codigo_plan": "PDD_2024_2027",
            "codigo_meta": "M-HTTP-29A",
            "estado_revision": "VERIFICADO",
            "responsable": "Secretaría de Salud",
            "accion_correctiva_pdca": "Verificar evidencia y cerrar ciclo PDCA.",
            "auditor": "Auditor Suplantado",
        },
    )
    assert unauth.status_code == 401, unauth.text

    # 2. Con autenticación y permiso seguimiento:gestionar
    token = crear_token_acceso(
        sujeto_id=test_sujeto_id,
        rol="autoridad_distrital",
        nivel_identidad="declarada",
        permisos=["seguimiento:gestionar"],
    )
    auth_headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        f"{base}/dictaminar-hallazgo",
        json={
            "id_hallazgo": hallazgo_id,
            "codigo_plan": "PDD_2024_2027",
            "codigo_meta": "M-HTTP-29A",
            "estado_revision": "VERIFICADO",
            "responsable": "Secretaría de Salud",
            "accion_correctiva_pdca": "Verificar evidencia y cerrar ciclo PDCA.",
            "auditor": "Auditor Intentado",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id_hallazgo"] == hallazgo_id
    assert len(body["sha256_dictamen"]) == 64
    # El auditor fue derivado del sujeto autenticado, no del JSON del cliente (257-H01)
    assert body["auditor"] == f"autoridad_distrital:{test_sujeto_id}"

    listed = client.get(
        f"{base}/dictamenes-hallazgos",
        params={"codigo_meta": "M-HTTP-29A", "estado_revision": "VERIFICADO"},
    )
    assert listed.status_code == 200, listed.text
    assert listed.json()["total_dictamenes"] >= 1
    assert listed.json()["dictamenes_hallazgos"][0]["id_hallazgo"] == hallazgo_id
    asyncio.run(_delete_hallazgo_for_test(hallazgo_id))


def test_construir_resumen_ejecutivo_h11_h1_hoshin_y_revision_10d(corpus_analitica) -> None:
    """Verifica que _construir_resumen_ejecutivo calcula determinísticamente H11, H1,
    Hoshin Kanri FAIR y Revisión 10D.
    """
    from app.modules.compromisos.pdt_persistencia_pg import _construir_resumen_ejecutivo

    run_data = {
        "motor": "PDT-AI-EVALUATOR",
        "thread_id": "pdt-test-unit-27b",
        "jurisdiction": "Distrito Turístico y Cultural de Cartagena de Indias",
        "time_horizon": "2024-2027",
        "version_metodologica": "PDT-AI-EVALUATOR-2026.10-EAF-V2",
        "fingerprint_fuentes_sha256": "a" * 64,
        "total_budget": 1_500_000_000_000.0,
        "unidades_dmu": ["Secretaría de Educación", "Secretaría de Hacienda"],
        "dea_scores": {
            "resultados_dmu": [
                {
                    "dmu": "Secretaría de Educación|2025",
                    "theta_ccr": 0.72,
                    "theta_bcc": 0.78,
                    "SE_o": 0.9231,
                }
            ]
        },
        "time_series_forecast": {
            "series": [
                {
                    "indicador": "Entidad Ejecutora: Secretaría de Educación",
                    "ISRI": 0.55,
                },
                {
                    "indicador": "Indicador Huérfano Sin Entidad",
                    "entidad": None,
                    "ISRI": 0.82,
                },
            ]
        },
    }

    resumen = _construir_resumen_ejecutivo(run_data)
    assert resumen["version_metodologica"] == "PDT-AI-EVALUATOR-2026.10-EAF-V2"
    assert resumen["fingerprint_fuentes_sha256"] == "a" * 64
    assert resumen["total_indicadores_isri_sin_atribucion"] == 1

    fair = resumen["hoshin_kanri_fair"]
    for key in (
        "fair_global_index",
        "focus_score",
        "alignment_score",
        "integration_score",
        "review_score",
        "rojos_contencion_pdca",
        "sesiones_catchball_activas",
    ):
        assert key in fair
    assert fair["fair_global_index"] > 0.0

    rev10d = resumen["revision_10d_resumen"]
    for key in (
        "version_regla",
        "total_metas_plan",
        "con_contradicciones",
        "con_brecha_informacion",
        "con_ceros_observados",
        "total_hallazgos_estructurados",
    ):
        assert key in rev10d
    assert rev10d["total_metas_plan"] == 1246


def test_persistencia_pg_resumen_enriquecido_hoshin_fair_y_10d(corpus_analitica) -> None:
    """Verifica que guardar_evaluacion_pdt_pg y obtener_historial_auditoria_pdt_pg
    persisten y recuperan en PostgreSQL (bd_csh) los bloques H11, H1, hoshin_kanri_fair
    y revision_10d_resumen dentro del JSONB payload_resumen / resumen_ejecutivo.
    """
    test_thread = "pdt-test-pg-27b-hoshin-10d"

    async def _run() -> dict[str, Any]:
        engine = create_async_engine(_bd_csh_url(), pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                payload = {
                    "motor": "PDT-AI-EVALUATOR",
                    "thread_id": test_thread,
                    "jurisdiction": "Distrito Turístico y Cultural de Cartagena de Indias",
                    "time_horizon": "2024-2027",
                    "version_metodologica": "PDT-AI-EVALUATOR-2026.10-EAF",
                    "total_budget": 2_100_000_000_000.0,
                    "trazabilidad_fuentes": {
                        "seguimiento.pdd_metas_oficiales": 1246,
                        "seguimiento.pdd_lineas_y_programas": 1573,
                    },
                    "unidades_dmu": ["Secretaría de Hacienda"],
                    "time_series_forecast": {
                        "series": [
                            {
                                "indicador": "Indicador Global Sin Atribución",
                                "entidad": None,
                                "ISRI": 0.71,
                            }
                        ]
                    },
                }
                await guardar_evaluacion_pdt_pg(payload, db=session)
                await session.commit()
                hist = await obtener_historial_auditoria_pdt_pg(session, thread_id=test_thread, limit=5)
                await session.execute(
                    text("DELETE FROM seguimiento.pdt_ai_evaluaciones WHERE thread_id = :tid"),
                    {"tid": test_thread},
                )
                await session.commit()
                return hist
        finally:
            await engine.dispose()

    hist = asyncio.run(_run())
    assert hist["total_evaluaciones"] == 1
    ev = hist["evaluaciones"][0]
    resumen = ev["resumen_ejecutivo"]
    assert resumen == ev["payload_resumen"]
    assert resumen["version_metodologica"] == "PDT-AI-EVALUATOR-2026.10-EAF"
    assert len(resumen["fingerprint_fuentes_sha256"]) == 64
    assert resumen["total_indicadores_isri_sin_atribucion"] == 1
    assert resumen["hoshin_kanri_fair"]["fair_global_index"] > 0.0
    assert resumen["revision_10d_resumen"]["total_metas_plan"] == 1246
