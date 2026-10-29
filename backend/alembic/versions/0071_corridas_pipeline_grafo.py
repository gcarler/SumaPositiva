"""Trazabilidad del orquestador inteligente (LangGraph + PydanticAI) en la bitácora.

Revision ID: 0071_corridas_pipeline_grafo
Revises: 0070_seguimiento_corridas
Create Date: 2026-10-21

Contexto:
La capa de orquestación experta (`app/modules/compromisos/orquestador_grafo.py`)
supervisa las etapas del corredor determinista con puertas de calidad
PydanticAI y revisión humana (patrón `interrupt` del evaluador PDT-AI).
Para trazabilidad industrial se ligan dos piezas a la bitácora 0070:

1. `seguimiento.corridas_pipeline.thread_id`: identifica la corrida de grafo
   (supervisor LangGraph) que originó la corrida de etapa; nulas para corridas
   directas del operador sin grafo.
2. `seguimiento.corridas_pipeline_pasos`: una fila por nodo ejecutado del grafo
   (corredor, puerta de calidad, decisión humana, cierre), con orden, estado,
   duración y payload JSONB con el dictamen y su SHA-256. Es el diario auditable
   de cada thread; el estado vivo del grafo se ejecuta en proceso (MemorySaver)
   como en el evaluador PDT-AI.

Convención: tabla operacional de bitácora igual que 0070; cada fila se
auto-confirma y no participa en casos de uso de negocio del módulo FastAPI.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0071_corridas_pipeline_grafo"
down_revision: str | Sequence[str] | None = "0070_seguimiento_corridas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ESTADOS_PASO = (
    "'ejecutando', 'exitoso', 'aprobado', 'rechazado', 'reintento', 'omitido', "
    "'fallo', 'congelado', 'completado', 'aprobado_por_auditor', 'rechazado_por_auditor'"
)


def upgrade() -> None:
    op.execute("ALTER TABLE seguimiento.corridas_pipeline ADD COLUMN IF NOT EXISTS thread_id VARCHAR(120)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_corridas_pipeline_thread_id ON seguimiento.corridas_pipeline (thread_id)")
    op.execute(
        "COMMENT ON COLUMN seguimiento.corridas_pipeline.thread_id IS "
        "'Identificador del thread del grafo supervisor que originó la corrida (0071).'"
    )
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS seguimiento.corridas_pipeline_pasos (
            id BIGSERIAL PRIMARY KEY,
            thread_id VARCHAR(120) NOT NULL,
            corrida_id BIGINT,
            nodo VARCHAR(80) NOT NULL,
            orden INTEGER NOT NULL,
            etapa VARCHAR(40)
                CHECK (etapa IN ('fuentes', 'conciliacion', 'dea', 'personalizada') OR etapa IS NULL),
            estado VARCHAR(40) NOT NULL CHECK (estado IN ({ESTADOS_PASO})),
            inicio_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            fin_en TIMESTAMPTZ,
            duracion_ms BIGINT,
            payload JSONB,
            sha256_payload VARCHAR(64)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_corridas_pipeline_pasos_thread "
        "ON seguimiento.corridas_pipeline_pasos (thread_id, orden)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_corridas_pipeline_pasos_corrida "
        "ON seguimiento.corridas_pipeline_pasos (corrida_id)"
    )
    op.execute(
        "COMMENT ON TABLE seguimiento.corridas_pipeline_pasos IS "
        "'Diario auditable del grafo supervisor: una fila por nodo ejecutado por thread.'"
    )
    op.execute(
        "COMMENT ON COLUMN seguimiento.corridas_pipeline_pasos.thread_id IS "
        "'Thread del grafo supervisor (reanudable con decisiones humanas).'"
    )
    op.execute(
        "COMMENT ON COLUMN seguimiento.corridas_pipeline_pasos.payload IS "
        "'Dictamen de la puerta o decisión humana validada por esquema Pydantic.'"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS seguimiento.corridas_pipeline_pasos")
    op.execute("DROP INDEX IF EXISTS ix_corridas_pipeline_thread_id")
    op.execute("ALTER TABLE seguimiento.corridas_pipeline DROP COLUMN IF EXISTS thread_id")
