"""Pruebas de persistencia transaccional PostgreSQL (seguimiento.pdt_ai_evaluaciones y
seguimiento.pdt_ai_checkpoints_hitl) y del endpoint /historial-auditoria [Fase 24B].
"""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.database import get_session
from app.modules.compromisos.pdt_persistencia_pg import (
    asegurar_tablas_pdt_ai_pg,
    guardar_evaluacion_pdt_pg,
    obtener_historial_auditoria_pdt_pg,
    registrar_checkpoint_hitl_pdt_pg,
    sincronizar_cache_y_checkpoints_a_pg,
)
from app.modules.compromisos.router import router as compromisos_router


def _bd_csh_url() -> str:
    return (
        make_url(Settings().async_database_url)
        .set(database="bd_csh")
        .render_as_string(hide_password=False)
    )


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
                hist = await obtener_historial_auditoria_pdt_pg(
                    session, thread_id="pdt-cartagena-2024-2027", limit=10
                )
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
                    "nlp_coherence": {
                        "alertas_mission_creep": [
                            {"codigo_meta": "M-01", "alerta": "Mission Creep"}
                        ]
                    },
                    "spatial_lisa": {
                        "moran_global_i": 0.412,
                        "coldspots": ["UCG 6"],
                        "trampas_territoriales_gestion_publica": [
                            {"unidad_dmu": "Secretaría de Educación"}
                        ],
                    },
                    "time_series_forecast": {
                        "alto_riesgo_indicadores": ["Cobertura Saneamiento"],
                    },
                    "estado_checkpointer": "CONGELADO_PARA_AUDITORIA_HUMANA",
                    "is_valid_human": False,
                    "recommendations": [
                        {"dmu": "Secretaría de Educación", "accion": "Reasignar rubros"}
                    ],
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
                hist = await obtener_historial_auditoria_pdt_pg(
                    session, thread_id=test_thread, limit=10
                )
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


def test_construir_resumen_ejecutivo_h11_h1_hoshin_y_revision_10d() -> None:
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


def test_persistencia_pg_resumen_enriquecido_hoshin_fair_y_10d() -> None:
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
                hist = await obtener_historial_auditoria_pdt_pg(
                    session, thread_id=test_thread, limit=5
                )
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

