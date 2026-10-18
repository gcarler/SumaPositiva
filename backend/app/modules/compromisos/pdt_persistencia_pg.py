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

ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = ROOT / "data" / "planes_desarrollo"
CACHE_PATH = DATA_DIR / "cache_pdt_ai_evaluator.json"
CHECKPOINT_PATH = DATA_DIR / "checkpoints_pdt_ai_evaluator.json"


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


def _build_payload_resumen(payload: dict[str, Any]) -> dict[str, Any]:
    """Construye un resumen auditable y compacto del resultado PDT-AI-EVALUATOR."""
    dea = payload.get("dea_scores") or {}
    nlp = payload.get("nlp_coherence") or {}
    spatial = payload.get("spatial_lisa") or {}
    forecast = payload.get("time_series_forecast") or {}
    unidades_dmu = payload.get("unidades_dmu") or payload.get("units_dmu") or []
    dmu_rows = dea.get("resultados_dmu") or dea.get("dmus") or []
    malmquist_pairs = (dea.get("malmquist") or {}).get("pares") or []
    mission_creep = nlp.get("alertas_mission_creep") or []
    traps = spatial.get("trampas_territoriales_gestion_publica") or []
    high_risk_series = forecast.get("alto_riesgo_indicadores") or [
        item.get("indicador")
        for item in (forecast.get("series") or [])
        if (item.get("ISRI") or 0.0) > 0.40
    ]

    return _plain_json(
        {
            "motor": payload.get("motor", "PDT-AI-EVALUATOR"),
            "thread_id": payload.get("thread_id", "pdt-cartagena-2024-2027"),
            "jurisdiction": payload.get(
                "jurisdiction",
                "Distrito Turístico y Cultural de Cartagena de Indias",
            ),
            "time_horizon": payload.get("time_horizon", "2024-2027"),
            "total_budget": float(payload.get("total_budget") or 0.0),
            "total_dmus": len(unidades_dmu) or len(dmu_rows),
            "unidades_ineficientes_dea": dea.get("unidades_ineficientes", []),
            "pares_malmquist": len(malmquist_pairs),
            "alertas_mission_creep": len(mission_creep),
            "moran_global_i": spatial.get("moran_global_i"),
            "coldspots": spatial.get("coldspots", []),
            "trampas_territoriales": len(traps),
            "series_alto_riesgo_isri": len(high_risk_series),
            "alto_riesgo_indicadores": high_risk_series[:25],
            "evaluacion_multisectorial": payload.get("evaluacion_multisectorial", []),
            "trazabilidad_fuentes": payload.get("trazabilidad_fuentes")
            or payload.get("source_counts")
            or {},
            "estado_checkpointer": payload.get("estado_checkpointer", "COMPLETADO_SIN_BLOQUEO"),
            "is_valid_human": bool(payload.get("is_valid_human", False)),
            "requiere_validacion_humana": bool(payload.get("requiere_validacion_humana", False)),
            "recommendations": payload.get("recommendations", []),
            "auditoria_humana": payload.get("auditoria_humana"),
            "generado_en": payload.get("generado_en") or datetime.now(UTC).isoformat(),
        }
    )


async def _run_with_session(
    db: AsyncSession | None,
    fn,
) -> Any:
    """Ejecuta una corrutina sobre la sesión entregada o abre una sesión propia."""
    if db is not None:
        return await fn(db, False)
    from app.core.config import Settings

    engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            return await fn(session, True)
    finally:
        await engine.dispose()


async def asegurar_tablas_pdt_ai_pg(db: AsyncSession | None = None) -> None:
    """Crea de forma idempotente las tablas seguimiento.pdt_ai_evaluaciones y
    seguimiento.pdt_ai_checkpoints_hitl en PostgreSQL.
    """

    async def _op(session: AsyncSession, owns_session: bool) -> None:
        await session.execute(text("CREATE SCHEMA IF NOT EXISTS seguimiento"))
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS seguimiento.pdt_ai_evaluaciones (
                    id UUID PRIMARY KEY,
                    thread_id VARCHAR(120) UNIQUE NOT NULL,
                    jurisdiction VARCHAR(255) NOT NULL,
                    time_horizon VARCHAR(64) NOT NULL,
                    total_budget NUMERIC(20, 2) NOT NULL,
                    total_dmus INTEGER NOT NULL,
                    pares_malmquist INTEGER NOT NULL,
                    alertas_mission_creep INTEGER NOT NULL,
                    trampas_territoriales INTEGER NOT NULL,
                    series_alto_riesgo_isri INTEGER NOT NULL,
                    estado_checkpointer VARCHAR(80) NOT NULL,
                    is_valid_human BOOLEAN NOT NULL DEFAULT FALSE,
                    sha256_payload VARCHAR(64) NOT NULL,
                    payload_resumen JSONB NOT NULL,
                    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS seguimiento.pdt_ai_checkpoints_hitl (
                    id UUID PRIMARY KEY,
                    thread_id VARCHAR(120) NOT NULL,
                    estado_checkpointer VARCHAR(80) NOT NULL,
                    aprobado BOOLEAN,
                    auditor VARCHAR(160),
                    observaciones TEXT,
                    patrones_criticos JSONB NOT NULL DEFAULT '[]'::jsonb,
                    recomendaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
                    sha256_checkpoint VARCHAR(64) NOT NULL,
                    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_pdt_ai_checkpoints_hitl_thread
                ON seguimiento.pdt_ai_checkpoints_hitl (thread_id, registrado_en DESC)
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_pdt_ai_checkpoints_hitl_thread_sha
                ON seguimiento.pdt_ai_checkpoints_hitl (thread_id, sha256_checkpoint)
                """
            )
        )
        if owns_session:
            await session.commit()

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

    async def _op(session: AsyncSession, owns_session: bool) -> dict[str, Any]:
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
        if owns_session:
            await session.commit()
        else:
            await session.flush()
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
            "creado_en": row.creado_en.isoformat() if row and row.creado_en else None,
            "actualizado_en": (
                row.actualizado_en.isoformat() if row and row.actualizado_en else None
            ),
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

    async def _op(session: AsyncSession, owns_session: bool) -> dict[str, Any]:
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
        if owns_session:
            await session.commit()
        else:
            await session.flush()
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

    async def _op(session: AsyncSession, _owns_session: bool) -> dict[str, Any]:
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

        evaluaciones = [
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
                "payload_resumen": (
                    json.loads(r.payload_resumen)
                    if isinstance(r.payload_resumen, str)
                    else r.payload_resumen
                ),
                "creado_en": r.creado_en.isoformat() if r.creado_en else None,
                "actualizado_en": (r.actualizado_en.isoformat() if r.actualizado_en else None),
            }
            for r in eval_rows
        ]

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
                    json.loads(r.recomendaciones)
                    if isinstance(r.recomendaciones, str)
                    else (r.recomendaciones or [])
                ),
                "sha256_checkpoint": str(r.sha256_checkpoint),
                "registrado_en": (r.registrado_en.isoformat() if r.registrado_en else None),
            }
            for r in ckpt_rows
        ]

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
            "evaluaciones": evaluaciones,
            "checkpoints_hitl": checkpoints,
            "consultado_en": datetime.now(UTC).isoformat(),
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

    async def _op(session: AsyncSession, owns_session: bool) -> dict[str, Any]:
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
                            entry.get("status")
                            or state.get("estado_checkpointer")
                            or "COMPLETADO_SIN_BLOQUEO"
                        )
                        is_valid = state.get("is_valid_human")
                        auditor = state.get("auditor") or None
                        observaciones = state.get("observaciones_auditor") or None
                        patrones = (state.get("time_series_forecast") or {}).get(
                            "patrones_compuestos_criticos"
                        ) or []
                        recs = state.get("recommendations") or []
                        await registrar_checkpoint_hitl_pdt_pg(
                            thread_id=str(entry.get("thread_id") or t_id),
                            estado=status,
                            aprobado=(
                                bool(is_valid)
                                if auditor
                                or status in {"APROBADO_POR_AUDITOR", "RECHAZADO_POR_AUDITOR"}
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

        if owns_session:
            await session.commit()
        else:
            await session.flush()

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
