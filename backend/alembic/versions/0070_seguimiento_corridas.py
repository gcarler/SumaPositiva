"""Registro de corridas del pipeline de datos orquestado (seguimiento).

Revision ID: 0070_seguimiento_corridas
Revises: 0069_idx_indicadores_terr_cod
Create Date: 2026-10-21

Contexto:
El pipeline de datos (fuentes → conciliación DEA/tríada) corría de manera
ad hoc a manos de operadores y agentes. `scripts/pipeline_datos_polis.py`
(orquestador) necesita un registro persistente e idempotente de cada etapa:
inicio/fin, estado, intentos, código de salida, ruta de log y resumen JSON.
El índice parcial único impide dos corridas activas simultáneas de la misma
etapa (verificable con CHECK y UNIQUE parcial).

Convención: tabla operacional de bitácora; cada escritura del corredor es
una fila individual auto-confirmada (no participa en casos de uso de negocio
del módulo FastAPI). DDL idempotente con bases donde ya se materializó
manualmente durante el ajuste del corredor.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0070_seguimiento_corridas"
down_revision: str | Sequence[str] | None = "0069_idx_indicadores_terr_cod"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS seguimiento.corridas_pipeline (
            id BIGSERIAL PRIMARY KEY,
            etapa VARCHAR(40) NOT NULL
                CHECK (etapa IN ('fuentes', 'conciliacion', 'dea', 'personalizada')),
            modo VARCHAR(10) NOT NULL DEFAULT 'real'
                CHECK (modo IN ('real', 'prueba')),
            estado VARCHAR(20) NOT NULL DEFAULT 'corriendo'
                CHECK (estado IN ('corriendo', 'exitoso', 'fallo', 'timeout', 'omitido')),
            inicio_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            fin_en TIMESTAMPTZ,
            exit_code INTEGER,
            duracion_ms BIGINT,
            intento INTEGER NOT NULL DEFAULT 1,
            intentos_max INTEGER NOT NULL DEFAULT 2,
            comando VARCHAR(400),
            log_ruta VARCHAR(300),
            resumen JSONB
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_corridas_pipeline_etapa_activa "
        "ON seguimiento.corridas_pipeline (etapa) WHERE estado = 'corriendo'"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_corridas_pipeline_etapa_inicio "
        "ON seguimiento.corridas_pipeline (etapa, inicio_en)"
    )
    op.execute(
        "COMMENT ON TABLE seguimiento.corridas_pipeline IS "
        "'Bitácora operacional del pipeline de datos: una fila por corrida de etapa.'"
    )
    op.execute(
        "COMMENT ON COLUMN seguimiento.corridas_pipeline.etapa IS "
        "'Etapa del pipeline: fuentes, conciliacion, dea o personalizada.'"
    )
    op.execute(
        "COMMENT ON COLUMN seguimiento.corridas_pipeline.resumen IS "
        "'Resumen JSON devuelto por el motor de la etapa (conteos, planes, errores).'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_corridas_pipeline_etapa_inicio")
    op.execute("DROP INDEX IF EXISTS uq_corridas_pipeline_etapa_activa")
    op.execute("DROP TABLE IF EXISTS seguimiento.corridas_pipeline")
