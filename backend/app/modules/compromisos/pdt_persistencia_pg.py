"""Persistencia transaccional en PostgreSQL (esquema seguimiento de bd_csh) para corridas
del motor PDT-AI-EVALUATOR y bitácora de intervención Human-in-the-Loop (HITL).

Fase [24B] — Tablas:
- seguimiento.pdt_ai_evaluaciones
- seguimiento.pdt_ai_checkpoints_hitl
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.transactions import transaction

ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = ROOT / "data" / "planes_desarrollo"
CACHE_PATH = DATA_DIR / "cache_pdt_ai_evaluator.json"
CHECKPOINT_PATH = DATA_DIR / "checkpoints_pdt_ai_evaluator.json"
ESTADOS_REVISION_HALLAZGO = {
    "PENDIENTE_REVISION_HUMANA",
    "VERIFICADO",
    "EN_SUBSANACION_PDCA",
    "SUBSANADO",
    "DESESTIMADO_CON_EVIDENCIA",
}


def _plain_json(value: Any) -> Any:
    """Normaliza objetos a tipos primitivos serializables en JSONB."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else value
    if isinstance(value, dict):
        return {str(k): _plain_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_plain_json(v) for v in value]
    return value


def _canonical_sha256(data: Any) -> str:
    """Calcula el hash SHA-256 canónico sobre una estructura JSON serializable."""
    serialized = json.dumps(
        _plain_json(data),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


_CACHED_REVISION_10D_RESUMEN: dict[str, Any] | None = None


def _normalizar_texto(valor: Any) -> str:
    return " ".join(str(valor or "").strip().casefold().split())


def _contar_isri_sin_atribucion(run_data: dict[str, Any]) -> int:
    if run_data.get("total_indicadores_isri_sin_atribucion") is not None:
        return int(run_data["total_indicadores_isri_sin_atribucion"])
    forecast = run_data.get("time_series_forecast") or {}
    series = forecast.get("series") or []
    critical_series = [
        item
        for item in series
        if isinstance(item, dict) and item.get("ISRI") is not None and float(item["ISRI"]) > 0.40
    ]
    if not critical_series:
        return 0

    dea_rows = (run_data.get("dea_scores") or {}).get("resultados_dmu") or []
    known_deps = {
        _normalizar_texto(str(r.get("dmu") or "").rsplit("|", 1)[0])
        for r in dea_rows
        if isinstance(r, dict) and r.get("dmu")
    }
    for u in run_data.get("unidades_dmu") or []:
        known_deps.add(_normalizar_texto(str(u).rsplit("|", 1)[0]))
    known_deps.discard("")

    unattributed = 0
    for item in critical_series:
        ent = _normalizar_texto(item.get("entidad"))
        if ent and (not known_deps or ent in known_deps):
            continue
        ind_txt = str(item.get("indicador") or "").strip()
        if _normalizar_texto(ind_txt).startswith("entidad ejecutora:"):
            credited = _normalizar_texto(ind_txt.split(":", 1)[1])
            if credited and (not known_deps or credited in known_deps):
                continue
        unattributed += 1
    return unattributed


def _obtener_resumen_hoshin_fair(run_data: dict[str, Any]) -> dict[str, Any]:
    try:
        from app.modules.compromisos.pdt_hoshin_kanri import (
            SEMAFORO_ROJO,
            _construir_matriz_x_hoshin_kanri_pdt_core,
        )

        hoshin = _construir_matriz_x_hoshin_kanri_pdt_core(diagnostico=run_data)
        fair = hoshin.get("evaluacion_fair") or {}
        bowling = hoshin.get("bowling_charts") or []
        catchball = hoshin.get("catchball_sesiones") or []
        rojos = sum(1 for bc in bowling if isinstance(bc, dict) and bc.get("color_semaforo") == SEMAFORO_ROJO)
        return {
            "fair_global_index": float(fair.get("fair_global_index") or 0.0),
            "focus_score": float(fair.get("focus_score") or 0.0),
            "alignment_score": float(fair.get("alignment_score") or 0.0),
            "integration_score": float(fair.get("integration_score") or 0.0),
            "review_score": float(fair.get("review_score") or 0.0),
            "rojos_contencion_pdca": int(rojos),
            "sesiones_catchball_activas": len(catchball),
        }
    except Exception:
        return {
            "fair_global_index": 0.0,
            "focus_score": 0.0,
            "alignment_score": 0.0,
            "integration_score": 0.0,
            "review_score": 0.0,
            "rojos_contencion_pdca": 0,
            "sesiones_catchball_activas": 0,
        }


def _obtener_resumen_revision_10d(run_data: dict[str, Any]) -> dict[str, Any]:
    global _CACHED_REVISION_10D_RESUMEN
    datos_entrada = run_data.get("datos_revision_10d")
    if datos_entrada is None and _CACHED_REVISION_10D_RESUMEN is not None:
        return dict(_CACHED_REVISION_10D_RESUMEN)
    try:
        from app.modules.compromisos.pdt_revision_por_meta import (
            VERSION_REGLA_CANONICA,
            construir_matriz_revision_por_meta_pdt,
        )

        rev = construir_matriz_revision_por_meta_pdt(
            codigo_plan=str(run_data.get("codigo_plan") or "PDD_2024_2027"),
            limit=25,
            datos_entrada=datos_entrada,
        )
        aud = rev.get("resumen_auditoria") or {}
        resumen_10d = {
            "version_regla": str(rev.get("version_regla") or VERSION_REGLA_CANONICA),
            "total_metas_plan": int(rev.get("total_metas_plan") or 0),
            "con_contradicciones": int(aud.get("con_contradicciones") or 0),
            "con_brecha_informacion": int(aud.get("con_brecha_informacion") or 0),
            "con_ceros_observados": int(aud.get("con_ceros_observados") or 0),
            "total_hallazgos_estructurados": int(aud.get("total_hallazgos_estructurados") or 0),
        }
        if datos_entrada is None and resumen_10d["total_metas_plan"] > 0:
            _CACHED_REVISION_10D_RESUMEN = dict(resumen_10d)
        return resumen_10d
    except Exception:
        return {
            "version_regla": "EAF_REV_META_26B_V1",
            "total_metas_plan": 0,
            "con_contradicciones": 0,
            "con_brecha_informacion": 0,
            "con_ceros_observados": 0,
            "total_hallazgos_estructurados": 0,
        }


def _construir_resumen_ejecutivo(run_data: dict[str, Any]) -> dict[str, Any]:
    """Construye un resumen auditable y compacto de PDT-AI-EVALUATOR (H1, H11, FAIR y 10D)."""
    dea = run_data.get("dea_scores") or {}
    nlp = run_data.get("nlp_coherence") or {}
    spatial = run_data.get("spatial_lisa") or {}
    forecast = run_data.get("time_series_forecast") or {}
    unidades_dmu = run_data.get("unidades_dmu") or run_data.get("units_dmu") or []
    dmu_rows = dea.get("resultados_dmu") or dea.get("dmus") or []
    malmquist_pairs = (dea.get("malmquist") or {}).get("pares") or []
    mission_creep = nlp.get("alertas_mission_creep") or []
    traps = spatial.get("trampas_territoriales_gestion_publica") or []
    high_risk_series = forecast.get("alto_riesgo_indicadores") or [
        item.get("indicador") for item in (forecast.get("series") or []) if (item.get("ISRI") or 0.0) > 0.40
    ]
    fuentes = run_data.get("trazabilidad_fuentes") or run_data.get("source_counts") or {}
    version_metodologica = str(run_data.get("version_metodologica") or "PDT-AI-EVALUATOR-2026.10-EAF")
    fingerprint_fuentes_sha256 = str(
        run_data.get("fingerprint_fuentes_sha256")
        or run_data.get("fingerprint_sources_sha256")
        or _canonical_sha256(fuentes)
    )
    total_isri_sin_atribucion = _contar_isri_sin_atribucion(run_data)
    hoshin_kanri_fair = _obtener_resumen_hoshin_fair(run_data)
    revision_10d_resumen = _obtener_resumen_revision_10d(run_data)

    return _plain_json(
        {
            "motor": run_data.get("motor", "PDT-AI-EVALUATOR"),
            "thread_id": run_data.get("thread_id", "pdt-cartagena-2024-2027"),
            "jurisdiction": run_data.get(
                "jurisdiction",
                "Distrito Turístico y Cultural de Cartagena de Indias",
            ),
            "time_horizon": run_data.get("time_horizon", "2024-2027"),
            "version_metodologica": version_metodologica,
            "fingerprint_fuentes_sha256": fingerprint_fuentes_sha256,
            "total_budget": float(run_data.get("total_budget") or 0.0),
            "total_dmus": len(unidades_dmu) or len(dmu_rows),
            "unidades_ineficientes_dea": dea.get("unidades_ineficientes", []),
            "pares_malmquist": len(malmquist_pairs),
            "alertas_mission_creep": len(mission_creep),
            "moran_global_i": spatial.get("moran_global_i"),
            "coldspots": spatial.get("coldspots", []),
            "trampas_territoriales": len(traps),
            "series_alto_riesgo_isri": len(high_risk_series),
            "total_indicadores_isri_sin_atribucion": total_isri_sin_atribucion,
            "alto_riesgo_indicadores": high_risk_series[:25],
            "evaluacion_multisectorial": run_data.get("evaluacion_multisectorial", []),
            "trazabilidad_fuentes": fuentes,
            "hoshin_kanri_fair": hoshin_kanri_fair,
            "revision_10d_resumen": revision_10d_resumen,
            "estado_checkpointer": run_data.get("estado_checkpointer", "COMPLETADO_SIN_BLOQUEO"),
            "is_valid_human": bool(run_data.get("is_valid_human", False)),
            "requiere_validacion_humana": bool(run_data.get("requiere_validacion_humana", False)),
            "recommendations": run_data.get("recommendations", []),
            "auditoria_humana": run_data.get("auditoria_humana"),
            "generado_en": run_data.get("generado_en") or datetime.now(UTC).isoformat(),
        }
    )


_build_payload_resumen = _construir_resumen_ejecutivo


async def _run_with_session(
    db: AsyncSession | None,
    fn,
) -> Any:
    """Ejecuta la operación sobre la sesión entregada o dentro de un límite propio.

    Con sesión inyectada, el límite transaccional pertenece al caso de uso que
    llamó: aquí no se confirma ni se revierte. Con sesión propia, la operación
    se delimita con `core.transactions.transaction` (éxito → commit; fallo o
    cancelación → rollback completo). El llamador nunca cede la propiedad.
    """
    if db is not None:
        return await fn(db)
    from app.core.config import Settings

    engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            async with transaction(session):
                return await fn(session)
    finally:
        await engine.dispose()


async def asegurar_tablas_pdt_ai_pg(db: AsyncSession | None = None) -> None:
    """Verifica que las tablas de persistencia PDT-AI existan en el esquema seguimiento.

    La creación de tablas e índices pertenece al lineage de migraciones Alembic
    (revisión `0068_tablas_pdt_ai_evaluator`); el runtime solo comprueba el
    catálogo. Si la migración no se aplicó, la operación falla de inmediato y no
    crea artefactos DDL fuera del lineage (hallazgo BD-1 / T4 del plan de
    remediación 2026-10-20).
    """

    TABLAS_REQUERIDAS = (
        "pdt_ai_evaluaciones",
        "pdt_ai_checkpoints_hitl",
        "pdt_ai_hallazgos_revision",
    )

    async def _op(session: AsyncSession) -> None:
        faltantes = list(
            (
                await session.execute(
                    text(
                        "SELECT unnest(CAST(:tablas AS text[])) AS tabla "
                        "EXCEPT ALL SELECT tablename FROM pg_tables WHERE schemaname = 'seguimiento'"
                    ),
                    {"tablas": list(TABLAS_REQUERIDAS)},
                )
            ).scalars()
        )
        if faltantes:
            raise RuntimeError(
                "Migración 0068_tablas_pdt_ai_evaluator no aplicada: faltan tablas de seguimiento: "
                + ", ".join(sorted(faltantes))
            )

    await _run_with_session(db, _op)


async def guardar_evaluacion_pdt_pg(
    payload: dict[str, Any],
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    """Inserta o actualiza una evaluación de PDT-AI-EVALUATOR en
    seguimiento.pdt_ai_evaluaciones con huella criptográfica SHA-256.
    """
    resumen = _build_payload_resumen(payload)
    sha256_hash = _canonical_sha256(resumen)
    thread_id = str(resumen["thread_id"] or "pdt-cartagena-2024-2027")[:120]
    jurisdiction = str(resumen["jurisdiction"])[:255]
    time_horizon = str(resumen["time_horizon"])[:64]
    total_budget = round(float(resumen["total_budget"] or 0.0), 2)
    total_dmus = int(resumen["total_dmus"] or 0)
    pares_malmquist = int(resumen["pares_malmquist"] or 0)
    alertas_mission_creep = int(resumen["alertas_mission_creep"] or 0)
    trampas_territoriales = int(resumen["trampas_territoriales"] or 0)
    series_alto_riesgo_isri = int(resumen["series_alto_riesgo_isri"] or 0)
    estado_checkpointer = str(resumen["estado_checkpointer"])[:80]
    is_valid_human = bool(resumen["is_valid_human"])
    record_id = uuid.uuid5(uuid.NAMESPACE_URL, f"pdt-ai-eval:{thread_id}")
    resumen_json = json.dumps(resumen, ensure_ascii=False)

    async def _op(session: AsyncSession) -> dict[str, Any]:
        await asegurar_tablas_pdt_ai_pg(session)
        row = (
            await session.execute(
                text(
                    """
                    INSERT INTO seguimiento.pdt_ai_evaluaciones (
                        id,
                        thread_id,
                        jurisdiction,
                        time_horizon,
                        total_budget,
                        total_dmus,
                        pares_malmquist,
                        alertas_mission_creep,
                        trampas_territoriales,
                        series_alto_riesgo_isri,
                        estado_checkpointer,
                        is_valid_human,
                        sha256_payload,
                        payload_resumen,
                        creado_en,
                        actualizado_en
                    )
                    VALUES (
                        :id,
                        :thread_id,
                        :jurisdiction,
                        :time_horizon,
                        :total_budget,
                        :total_dmus,
                        :pares_malmquist,
                        :alertas_mission_creep,
                        :trampas_territoriales,
                        :series_alto_riesgo_isri,
                        :estado_checkpointer,
                        :is_valid_human,
                        :sha256_payload,
                        CAST(:payload_resumen AS jsonb),
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT (thread_id) DO UPDATE SET
                        jurisdiction = EXCLUDED.jurisdiction,
                        time_horizon = EXCLUDED.time_horizon,
                        total_budget = EXCLUDED.total_budget,
                        total_dmus = EXCLUDED.total_dmus,
                        pares_malmquist = EXCLUDED.pares_malmquist,
                        alertas_mission_creep = EXCLUDED.alertas_mission_creep,
                        trampas_territoriales = EXCLUDED.trampas_territoriales,
                        series_alto_riesgo_isri = EXCLUDED.series_alto_riesgo_isri,
                        estado_checkpointer = EXCLUDED.estado_checkpointer,
                        is_valid_human = EXCLUDED.is_valid_human,
                        sha256_payload = EXCLUDED.sha256_payload,
                        payload_resumen = EXCLUDED.payload_resumen,
                        actualizado_en = NOW()
                    RETURNING id, thread_id, estado_checkpointer, is_valid_human,
                              sha256_payload, creado_en, actualizado_en
                    """
                ),
                {
                    "id": record_id,
                    "thread_id": thread_id,
                    "jurisdiction": jurisdiction,
                    "time_horizon": time_horizon,
                    "total_budget": total_budget,
                    "total_dmus": total_dmus,
                    "pares_malmquist": pares_malmquist,
                    "alertas_mission_creep": alertas_mission_creep,
                    "trampas_territoriales": trampas_territoriales,
                    "series_alto_riesgo_isri": series_alto_riesgo_isri,
                    "estado_checkpointer": estado_checkpointer,
                    "is_valid_human": is_valid_human,
                    "sha256_payload": sha256_hash,
                    "payload_resumen": resumen_json,
                },
            )
        ).fetchone()
        return {
            "id": str(row.id) if row else str(record_id),
            "thread_id": thread_id,
            "jurisdiction": jurisdiction,
            "time_horizon": time_horizon,
            "total_budget": total_budget,
            "total_dmus": total_dmus,
            "pares_malmquist": pares_malmquist,
            "alertas_mission_creep": alertas_mission_creep,
            "trampas_territoriales": trampas_territoriales,
            "series_alto_riesgo_isri": series_alto_riesgo_isri,
            "estado_checkpointer": estado_checkpointer,
            "is_valid_human": is_valid_human,
            "sha256_payload": sha256_hash,
            "payload_resumen": resumen,
            "resumen_ejecutivo": resumen,
            "creado_en": row.creado_en.isoformat() if row and row.creado_en else None,
            "actualizado_en": (row.actualizado_en.isoformat() if row and row.actualizado_en else None),
        }

    return await _run_with_session(db, _op)


async def registrar_checkpoint_hitl_pdt_pg(
    thread_id: str,
    estado: str,
    aprobado: bool | None,
    auditor: str | None,
    observaciones: str | None,
    patrones_criticos: list[Any],
    recomendaciones: list[Any],
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    """Registra un evento de checkpoint o validación Human-in-the-Loop (HITL) en
    seguimiento.pdt_ai_checkpoints_hitl con hash SHA-256 de integridad.
    """
    clean_thread = str(thread_id or "pdt-cartagena-2024-2027").strip()[:120]
    clean_estado = str(estado or "EN_EJECUCION").strip()[:80]
    clean_auditor = str(auditor).strip()[:160] if auditor else None
    clean_obs = str(observaciones).strip() if observaciones is not None else None
    plain_patrones = _plain_json(list(patrones_criticos or []))
    plain_recs = _plain_json(list(recomendaciones or []))

    ckpt_envelope = {
        "thread_id": clean_thread,
        "estado_checkpointer": clean_estado,
        "aprobado": aprobado,
        "auditor": clean_auditor,
        "observaciones": clean_obs,
        "patrones_criticos": plain_patrones,
        "recomendaciones": plain_recs,
    }
    sha256_ckpt = _canonical_sha256(ckpt_envelope)
    ckpt_id = uuid.uuid5(uuid.NAMESPACE_URL, f"pdt-ai-ckpt:{clean_thread}:{sha256_ckpt}")

    async def _op(session: AsyncSession) -> dict[str, Any]:
        await asegurar_tablas_pdt_ai_pg(session)
        row = (
            await session.execute(
                text(
                    """
                    INSERT INTO seguimiento.pdt_ai_checkpoints_hitl (
                        id,
                        thread_id,
                        estado_checkpointer,
                        aprobado,
                        auditor,
                        observaciones,
                        patrones_criticos,
                        recomendaciones,
                        sha256_checkpoint,
                        registrado_en
                    )
                    VALUES (
                        :id,
                        :thread_id,
                        :estado_checkpointer,
                        :aprobado,
                        :auditor,
                        :observaciones,
                        CAST(:patrones_criticos AS jsonb),
                        CAST(:recomendaciones AS jsonb),
                        :sha256_checkpoint,
                        NOW()
                    )
                    ON CONFLICT (thread_id, sha256_checkpoint) DO UPDATE SET
                        estado_checkpointer = EXCLUDED.estado_checkpointer,
                        aprobado = EXCLUDED.aprobado,
                        auditor = EXCLUDED.auditor,
                        observaciones = EXCLUDED.observaciones,
                        patrones_criticos = EXCLUDED.patrones_criticos,
                        recomendaciones = EXCLUDED.recomendaciones,
                        registrado_en = NOW()
                    RETURNING id, thread_id, estado_checkpointer, aprobado, auditor,
                              observaciones, sha256_checkpoint, registrado_en
                    """
                ),
                {
                    "id": ckpt_id,
                    "thread_id": clean_thread,
                    "estado_checkpointer": clean_estado,
                    "aprobado": aprobado,
                    "auditor": clean_auditor,
                    "observaciones": clean_obs,
                    "patrones_criticos": json.dumps(plain_patrones, ensure_ascii=False),
                    "recomendaciones": json.dumps(plain_recs, ensure_ascii=False),
                    "sha256_checkpoint": sha256_ckpt,
                },
            )
        ).fetchone()
        return {
            "id": str(row.id) if row else str(ckpt_id),
            "thread_id": clean_thread,
            "estado_checkpointer": clean_estado,
            "aprobado": aprobado,
            "auditor": clean_auditor,
            "observaciones": clean_obs,
            "patrones_criticos": plain_patrones,
            "recomendaciones": plain_recs,
            "sha256_checkpoint": sha256_ckpt,
            "registrado_en": (row.registrado_en.isoformat() if row and row.registrado_en else None),
        }

    return await _run_with_session(db, _op)


async def obtener_historial_auditoria_pdt_pg(
    db: AsyncSession | None = None,
    thread_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Consulta en PostgreSQL el historial de evaluaciones PDT-AI-EVALUATOR y los
    checkpoints de auditoría Human-in-the-Loop (HITL).
    """
    safe_limit = max(1, min(int(limit or 50), 200))
    clean_thread = thread_id.strip() if thread_id and thread_id.strip() else None

    async def _op(session: AsyncSession) -> dict[str, Any]:
        await asegurar_tablas_pdt_ai_pg(session)
        eval_query = """
            SELECT id, thread_id, jurisdiction, time_horizon,
                   total_budget::float AS total_budget,
                   total_dmus, pares_malmquist, alertas_mission_creep,
                   trampas_territoriales, series_alto_riesgo_isri,
                   estado_checkpointer, is_valid_human, sha256_payload,
                   payload_resumen, creado_en, actualizado_en
            FROM seguimiento.pdt_ai_evaluaciones
            WHERE (CAST(:thread_id AS varchar) IS NULL OR thread_id = :thread_id)
            ORDER BY actualizado_en DESC
            LIMIT :limit
        """
        eval_rows = (
            await session.execute(
                text(eval_query),
                {"thread_id": clean_thread, "limit": safe_limit},
            )
        ).fetchall()

        ckpt_query = """
            SELECT id, thread_id, estado_checkpointer, aprobado, auditor,
                   observaciones, patrones_criticos, recomendaciones,
                   sha256_checkpoint, registrado_en
            FROM seguimiento.pdt_ai_checkpoints_hitl
            WHERE (CAST(:thread_id AS varchar) IS NULL OR thread_id = :thread_id)
            ORDER BY registrado_en DESC
            LIMIT :limit
        """
        ckpt_rows = (
            await session.execute(
                text(ckpt_query),
                {"thread_id": clean_thread, "limit": safe_limit},
            )
        ).fetchall()
        hallazgo_rows = (
            await session.execute(
                text(
                    """SELECT id,id_hallazgo,codigo_plan,codigo_meta,dependencia,estado_revision,
                              responsable,accion_correctiva_pdca,evidencia_subsanacion,auditor,
                              sha256_dictamen,creado_en
                       FROM seguimiento.pdt_ai_hallazgos_revision
                       ORDER BY creado_en DESC LIMIT :limit"""
                ),
                {"limit": safe_limit},
            )
        ).fetchall()
        hallazgo_count = (
            await session.execute(text("SELECT count(*)::int FROM seguimiento.pdt_ai_hallazgos_revision"))
        ).scalar_one()

        evaluaciones = []
        for r in eval_rows:
            parsed_resumen = json.loads(r.payload_resumen) if isinstance(r.payload_resumen, str) else r.payload_resumen
            evaluaciones.append(
                {
                    "id": str(r.id),
                    "thread_id": str(r.thread_id),
                    "jurisdiction": str(r.jurisdiction),
                    "time_horizon": str(r.time_horizon),
                    "total_budget": float(r.total_budget or 0.0),
                    "total_dmus": int(r.total_dmus or 0),
                    "pares_malmquist": int(r.pares_malmquist or 0),
                    "alertas_mission_creep": int(r.alertas_mission_creep or 0),
                    "trampas_territoriales": int(r.trampas_territoriales or 0),
                    "series_alto_riesgo_isri": int(r.series_alto_riesgo_isri or 0),
                    "estado_checkpointer": str(r.estado_checkpointer),
                    "is_valid_human": bool(r.is_valid_human),
                    "sha256_payload": str(r.sha256_payload),
                    "payload_resumen": parsed_resumen,
                    "resumen_ejecutivo": parsed_resumen,
                    "creado_en": r.creado_en.isoformat() if r.creado_en else None,
                    "actualizado_en": (r.actualizado_en.isoformat() if r.actualizado_en else None),
                }
            )

        checkpoints = [
            {
                "id": str(r.id),
                "thread_id": str(r.thread_id),
                "estado_checkpointer": str(r.estado_checkpointer),
                "aprobado": r.aprobado,
                "auditor": r.auditor,
                "observaciones": r.observaciones,
                "patrones_criticos": (
                    json.loads(r.patrones_criticos)
                    if isinstance(r.patrones_criticos, str)
                    else (r.patrones_criticos or [])
                ),
                "recomendaciones": (
                    json.loads(r.recomendaciones) if isinstance(r.recomendaciones, str) else (r.recomendaciones or [])
                ),
                "sha256_checkpoint": str(r.sha256_checkpoint),
                "registrado_en": (r.registrado_en.isoformat() if r.registrado_en else None),
            }
            for r in ckpt_rows
        ]
        hallazgos = [_dictamen_hallazgo_dict(row) for row in hallazgo_rows]

        return {
            "motor": "PDT-AI-EVALUATOR",
            "esquema_pg": "seguimiento",
            "tablas": [
                "seguimiento.pdt_ai_evaluaciones",
                "seguimiento.pdt_ai_checkpoints_hitl",
            ],
            "filtro_thread_id": clean_thread,
            "limite": safe_limit,
            "total_evaluaciones": len(evaluaciones),
            "total_checkpoints_hitl": len(checkpoints),
            "total_dictamenes_hallazgos": int(hallazgo_count or 0),
            "evaluaciones": evaluaciones,
            "checkpoints_hitl": checkpoints,
            "dictamenes_hallazgos": hallazgos,
            "consultado_en": datetime.now(UTC).isoformat(),
        }

    return await _run_with_session(db, _op)


def _dictamen_hallazgo_dict(row) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "id_hallazgo": str(row.id_hallazgo),
        "codigo_plan": str(row.codigo_plan),
        "codigo_meta": str(row.codigo_meta),
        "dependencia": row.dependencia,
        "estado_revision": str(row.estado_revision),
        "responsable": str(row.responsable),
        "accion_correctiva_pdca": str(row.accion_correctiva_pdca),
        "evidencia_subsanacion": row.evidencia_subsanacion,
        "auditor": str(row.auditor),
        "sha256_dictamen": str(row.sha256_dictamen),
        "creado_en": row.creado_en.isoformat() if row.creado_en else None,
    }


async def persistir_evaluacion_y_checkpoint_pdt_pg(
    *,
    payload_resumen: dict[str, Any],
    thread_id: str,
    estado: str,
    aprobado: bool | None,
    auditor: str | None,
    observaciones: str | None,
    patrones_criticos: list[Any],
    recomendaciones: list[Any],
    db: AsyncSession | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Caso de uso: persiste la evaluación y su checkpoint HITL en un solo límite.

    Éxito → commit único de ambas escrituras; fallo o cancelación → rollback
    completo del conjunto (CA-5.3). Con sesión de petición inyectada, el límite
    se delimita sobre ella; sin sesión, se abre y delimita una propia.
    """

    async def _dml(sesion: AsyncSession) -> tuple[dict[str, Any], dict[str, Any]]:
        evaluacion = await guardar_evaluacion_pdt_pg(payload_resumen, db=sesion)
        checkpoint = await registrar_checkpoint_hitl_pdt_pg(
            thread_id=thread_id,
            estado=estado,
            aprobado=aprobado,
            auditor=auditor,
            observaciones=observaciones,
            patrones_criticos=patrones_criticos,
            recomendaciones=recomendaciones,
            db=sesion,
        )
        return evaluacion, checkpoint

    if db is not None:
        async with transaction(db):
            return await _dml(db)

    from app.core.config import Settings

    engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            async with transaction(session):
                return await _dml(session)
    finally:
        await engine.dispose()


async def dictaminar_hallazgo_pdt_pg(
    id_hallazgo: str,
    codigo_meta: str,
    estado_revision: str,
    responsable: str,
    accion_correctiva_pdca: str,
    auditor: str,
    codigo_plan: str = "PDD_2024_2027",
    dependencia: str | None = None,
    evidencia_subsanacion: str | None = None,
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    """Caso de uso: dictamina un hallazgo dentro del límite transaccional.

    Con sesión de petición inyectada, delimita el caso de uso con
    `core.transactions.transaction` (éxito → commit; fallo o cancelación →
    rollback completo). Sin sesión, `_run_with_session` abre y delimita la
    propia. La delegación interna mantiene el servicio a cargo del límite y el
    router sin gestión de sesión.
    """
    if db is None:
        return await registrar_dictamen_hallazgo_pdt_pg(
            id_hallazgo=id_hallazgo,
            codigo_meta=codigo_meta,
            estado_revision=estado_revision,
            responsable=responsable,
            accion_correctiva_pdca=accion_correctiva_pdca,
            auditor=auditor,
            codigo_plan=codigo_plan,
            dependencia=dependencia,
            evidencia_subsanacion=evidencia_subsanacion,
        )
    async with transaction(db):
        return await registrar_dictamen_hallazgo_pdt_pg(
            id_hallazgo=id_hallazgo,
            codigo_meta=codigo_meta,
            estado_revision=estado_revision,
            responsable=responsable,
            accion_correctiva_pdca=accion_correctiva_pdca,
            auditor=auditor,
            codigo_plan=codigo_plan,
            dependencia=dependencia,
            evidencia_subsanacion=evidencia_subsanacion,
            db=db,
        )


async def registrar_dictamen_hallazgo_pdt_pg(
    id_hallazgo: str,
    codigo_meta: str,
    estado_revision: str,
    responsable: str,
    accion_correctiva_pdca: str,
    auditor: str,
    codigo_plan: str = "PDD_2024_2027",
    dependencia: str | None = None,
    evidencia_subsanacion: str | None = None,
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    """Registra un dictamen trazable para un hallazgo individual de revisión."""
    clean = {
        "id_hallazgo": str(id_hallazgo or "").strip()[:160],
        "codigo_plan": str(codigo_plan or "PDD_2024_2027").strip()[:64],
        "codigo_meta": str(codigo_meta or "").strip()[:128],
        "dependencia": str(dependencia).strip()[:255] if dependencia else None,
        "estado_revision": str(estado_revision or "").strip(),
        "responsable": str(responsable or "").strip()[:255],
        "accion_correctiva_pdca": str(accion_correctiva_pdca or "").strip(),
        "evidencia_subsanacion": str(evidencia_subsanacion).strip() if evidencia_subsanacion else None,
        "auditor": str(auditor or "").strip()[:160],
    }
    for required in (
        "id_hallazgo",
        "codigo_meta",
        "responsable",
        "accion_correctiva_pdca",
        "auditor",
    ):
        if not clean[required]:
            raise ValueError(f"{required} es obligatorio")
    if clean["estado_revision"] not in ESTADOS_REVISION_HALLAZGO:
        raise ValueError("estado_revision no pertenece al catálogo permitido")
    sha256 = _canonical_sha256(clean)
    record_id = uuid.uuid4()

    async def _op(session: AsyncSession) -> dict[str, Any]:
        await asegurar_tablas_pdt_ai_pg(session)
        row = (
            await session.execute(
                text(
                    """INSERT INTO seguimiento.pdt_ai_hallazgos_revision (
                           id,id_hallazgo,codigo_plan,codigo_meta,dependencia,estado_revision,
                           responsable,accion_correctiva_pdca,evidencia_subsanacion,auditor,
                           sha256_dictamen,creado_en
                       ) VALUES (
                           :id,:id_hallazgo,:codigo_plan,:codigo_meta,:dependencia,:estado_revision,
                           :responsable,:accion_correctiva_pdca,:evidencia_subsanacion,:auditor,
                           :sha256_dictamen,NOW()
                       ) RETURNING id,id_hallazgo,codigo_plan,codigo_meta,dependencia,
                           estado_revision,
                           responsable,accion_correctiva_pdca,evidencia_subsanacion,auditor,
                           sha256_dictamen,creado_en"""
                ),
                {"id": record_id, **clean, "sha256_dictamen": sha256},
            )
        ).fetchone()
        return (
            _dictamen_hallazgo_dict(row)
            if row
            else {"id": str(record_id), **clean, "sha256_dictamen": sha256, "creado_en": None}
        )

    return await _run_with_session(db, _op)


async def listar_dictamenes_hallazgos_pdt_pg(
    db: AsyncSession | None = None,
    codigo_plan: str | None = None,
    codigo_meta: str | None = None,
    estado_revision: str | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    """Lista dictámenes de hallazgos con filtros opcionales y límite acotado."""
    safe_limit = max(1, min(int(limit or 100), 500))
    filters = {
        "codigo_plan": codigo_plan.strip() if codigo_plan else None,
        "codigo_meta": codigo_meta.strip() if codigo_meta else None,
        "estado_revision": estado_revision.strip() if estado_revision else None,
    }

    async def _op(session: AsyncSession) -> dict[str, Any]:
        await asegurar_tablas_pdt_ai_pg(session)
        where = """WHERE (CAST(:codigo_plan AS varchar) IS NULL OR codigo_plan=:codigo_plan)
                    AND (CAST(:codigo_meta AS varchar) IS NULL OR codigo_meta=:codigo_meta)
                    AND (CAST(:estado_revision AS varchar) IS NULL
                         OR estado_revision=:estado_revision)"""
        params = {**filters, "limit": safe_limit}
        total = (
            await session.execute(
                text(f"SELECT count(*)::int FROM seguimiento.pdt_ai_hallazgos_revision {where}"),
                filters,
            )
        ).scalar_one()
        rows = (
            await session.execute(
                text(
                    f"""SELECT id,id_hallazgo,codigo_plan,codigo_meta,dependencia,estado_revision,
                               responsable,accion_correctiva_pdca,evidencia_subsanacion,auditor,
                               sha256_dictamen,creado_en
                        FROM seguimiento.pdt_ai_hallazgos_revision {where}
                        ORDER BY creado_en DESC LIMIT :limit"""
                ),
                params,
            )
        ).fetchall()
        registros = [_dictamen_hallazgo_dict(row) for row in rows]
        return {
            "total_dictamenes": int(total or 0),
            "limite": safe_limit,
            "filtros_aplicados": filters,
            "dictamenes_hallazgos": registros,
        }

    return await _run_with_session(db, _op)


async def sincronizar_cache_y_checkpoints_a_pg(
    db: AsyncSession | None = None,
    *,
    cache_path: Path | None = None,
    checkpoint_path: Path | None = None,
) -> dict[str, Any]:
    """Sincroniza de forma idempotente los archivos JSON de caché y checkpoints de
    data/planes_desarrollo hacia seguimiento.pdt_ai_evaluaciones y
    seguimiento.pdt_ai_checkpoints_hitl en PostgreSQL.
    """
    target_cache = cache_path or CACHE_PATH
    target_ckpt = checkpoint_path or CHECKPOINT_PATH

    async def _op(session: AsyncSession) -> dict[str, Any]:
        await asegurar_tablas_pdt_ai_pg(session)
        evals_synced = 0
        ckpts_synced = 0

        if target_cache.exists():
            try:
                cache_data = json.loads(target_cache.read_text(encoding="utf-8"))
                runs = cache_data.get("runs", {})
                if isinstance(runs, dict):
                    for run_payload in runs.values():
                        if isinstance(run_payload, dict):
                            await guardar_evaluacion_pdt_pg(run_payload, db=session)
                            evals_synced += 1
            except (OSError, json.JSONDecodeError):
                pass

        if target_ckpt.exists():
            try:
                ckpt_data = json.loads(target_ckpt.read_text(encoding="utf-8"))
                threads = ckpt_data.get("threads", {})
                if isinstance(threads, dict):
                    for t_id, entry in threads.items():
                        if not isinstance(entry, dict):
                            continue
                        state = entry.get("state") or {}
                        status = str(
                            entry.get("status") or state.get("estado_checkpointer") or "COMPLETADO_SIN_BLOQUEO"
                        )
                        is_valid = state.get("is_valid_human")
                        auditor = state.get("auditor") or None
                        observaciones = state.get("observaciones_auditor") or None
                        patrones = (state.get("time_series_forecast") or {}).get("patrones_compuestos_criticos") or []
                        recs = state.get("recommendations") or []
                        await registrar_checkpoint_hitl_pdt_pg(
                            thread_id=str(entry.get("thread_id") or t_id),
                            estado=status,
                            aprobado=(
                                bool(is_valid)
                                if auditor or status in {"APROBADO_POR_AUDITOR", "RECHAZADO_POR_AUDITOR"}
                                else None
                            ),
                            auditor=auditor,
                            observaciones=observaciones,
                            patrones_criticos=patrones,
                            recomendaciones=recs,
                            db=session,
                        )
                        ckpts_synced += 1
                        if evals_synced == 0 and state:
                            await guardar_evaluacion_pdt_pg(
                                {
                                    "thread_id": str(entry.get("thread_id") or t_id),
                                    **state,
                                },
                                db=session,
                            )
                            evals_synced += 1
            except (OSError, json.JSONDecodeError):
                pass

        return {
            "evaluaciones_sincronizadas": evals_synced,
            "checkpoints_sincronizados": ckpts_synced,
            "cache_path": str(target_cache),
            "checkpoint_path": str(target_ckpt),
        }

    return await _run_with_session(db, _op)


async def _main() -> None:
    res = await sincronizar_cache_y_checkpoints_a_pg()
    hist = await obtener_historial_auditoria_pdt_pg()
    print(
        json.dumps(
            {
                "sincronizacion": res,
                "total_evaluaciones_pg": hist["total_evaluaciones"],
                "total_checkpoints_hitl_pg": hist["total_checkpoints_hitl"],
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    asyncio.run(_main())
