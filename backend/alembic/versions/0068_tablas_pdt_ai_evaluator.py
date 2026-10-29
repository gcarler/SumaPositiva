"""Gobernanza de migraciones para las tablas de persistencia PDT-AI-EVALUATOR.

Revision ID: 0068_tablas_pdt_ai_evaluator
Revises: 0067_evidencia_paginas_pdd
Create Date: 2026-10-21

Contexto:
Las tres tablas de seguimiento relacionadas con PDT-AI-EVALUATOR y HITL se
creaban hasta ahora solo mediante `asegurar_tablas_pdt_ai_pg` en tiempo de
ejecución (findings de `plan_remediacion_20102026.md`: persistencia fuera de
Alembic, `command.check` reporta tablas en base sin contrato de migración).
Esta revisión las incorpora al lineage único con DDL idéntica a la del runtime
(idempotente con bases donde ya se materializaron de manera perezosa),
junto con la tabla de vínculos meta–PA–tríada y sus 2 índices
(inventario total de T4: 4 tablas y 5 índices).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0068_tablas_pdt_ai_evaluator"
down_revision: str | Sequence[str] | None = "0067_evidencia_paginas_pdd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
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
    op.execute(
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
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS seguimiento.pdt_ai_hallazgos_revision (
            id UUID PRIMARY KEY,
            id_hallazgo VARCHAR(160) NOT NULL,
            codigo_plan VARCHAR(64) NOT NULL DEFAULT 'PDD_2024_2027',
            codigo_meta VARCHAR(128) NOT NULL,
            dependencia VARCHAR(255),
            estado_revision VARCHAR(64) NOT NULL,
            responsable VARCHAR(255) NOT NULL,
            accion_correctiva_pdca TEXT NOT NULL,
            evidencia_subsanacion TEXT,
            auditor VARCHAR(160) NOT NULL,
            sha256_dictamen VARCHAR(64) NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_pdt_ai_hallazgos_revision_plan_meta
        ON seguimiento.pdt_ai_hallazgos_revision (codigo_plan, codigo_meta, creado_en DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_pdt_ai_checkpoints_hitl_thread
        ON seguimiento.pdt_ai_checkpoints_hitl (thread_id, registrado_en DESC)
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_pdt_ai_checkpoints_hitl_thread_sha
        ON seguimiento.pdt_ai_checkpoints_hitl (thread_id, sha256_checkpoint)
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS seguimiento.pdd_vinculos_meta_pa_triada (
            id UUID PRIMARY KEY,
            codigo_plan VARCHAR(64) NOT NULL,
            meta_id UUID NOT NULL,
            codigo_meta VARCHAR(128) NOT NULL,
            linea_estrategica TEXT,
            dependencia_responsable VARCHAR(255),
            actividad_pa_id UUID,
            registro_triada_id UUID,
            vigencia INTEGER,
            codigo_bpim VARCHAR(128),
            tipo_vinculo VARCHAR(64) NOT NULL,
            score_confianza NUMERIC(6, 4) NOT NULL,
            apropiacion_definitiva_cop NUMERIC(20, 2),
            compromisos_rp_cop NUMERIC(20, 2),
            obligaciones_cop NUMERIC(20, 2),
            pagos_tesoreria_cop NUMERIC(20, 2),
            meta_programada_anual NUMERIC(20, 4),
            meta_ejecutada_anual NUMERIC(20, 4),
            avance_fisico_pct NUMERIC(10, 4),
            ceros_observados_preservados BOOLEAN NOT NULL DEFAULT FALSE,
            evidencia_cruce JSONB NOT NULL DEFAULT '{}'::jsonb,
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_pdd_vinculos_meta_pa_triada_meta_id
        ON seguimiento.pdd_vinculos_meta_pa_triada (meta_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_pdd_vinculos_meta_pa_triada_plan_tipo
        ON seguimiento.pdd_vinculos_meta_pa_triada (codigo_plan, tipo_vinculo)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS seguimiento.idx_pdd_vinculos_meta_pa_triada_plan_tipo")
    op.execute("DROP INDEX IF EXISTS seguimiento.uq_pdd_vinculos_meta_pa_triada_meta_id")
    op.execute("DROP TABLE IF EXISTS seguimiento.pdd_vinculos_meta_pa_triada")
    op.execute("DROP INDEX IF EXISTS seguimiento.ux_pdt_ai_checkpoints_hitl_thread_sha")
    op.execute("DROP INDEX IF EXISTS seguimiento.idx_pdt_ai_checkpoints_hitl_thread")
    op.execute("DROP INDEX IF EXISTS seguimiento.idx_pdt_ai_hallazgos_revision_plan_meta")
    op.execute("DROP TABLE IF EXISTS seguimiento.pdt_ai_hallazgos_revision")
    op.execute("DROP TABLE IF EXISTS seguimiento.pdt_ai_checkpoints_hitl")
    op.execute("DROP TABLE IF EXISTS seguimiento.pdt_ai_evaluaciones")
