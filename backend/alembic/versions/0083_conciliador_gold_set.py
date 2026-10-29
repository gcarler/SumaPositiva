"""Gold set de conciliación meta–actividad con doble anotación.

Revision ID: 0083_conciliador_gold_set
Revises: 0082_tablas_dea_dmu_nivel3
Create Date: 2026-10-22

Contexto:
Bridge/09 §4/§6 documenta que la conciliación de los 4.637 vínculos meta–PA
tiene un recobrado del 100 % por diseño (cada meta recibe vínculo) pero sin
validación de precisión: el 45,9 % es inferencia sectorial (`VINCULO_SECTORIAL_
INFERIDO`) y no existía gold set. Esta migración crea la tabla de anotación
server-side del gold set: parejas positivas (vinculadas por el conciliador) y
negativas (no vinculadas), con doble anotación a ciegas, adjudicación y
estado, y las etiquetas maestras. El artefacto JSON/CSV reproducible lo
genera `backend/scripts/conciliador_gold_set.py`; la tabla conserva el estado
durable de la anotación y su adjudicación.

Convención: tabla operacional del aparato de auditoría analítica; no participa
en casos de uso de negocio del módulo FastAPI (igual que la bitácora 0070).
El muestreo y la anotación son actividades del equipo EDD/EAF independientes
del operador del conciliador.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0083_conciliador_gold_set"
down_revision: str | Sequence[str] | None = "0082_tablas_dea_dmu_nivel3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ETIQUETAS = "'VINCULO_CORRECTO', 'VINCULO_INCORRECTO', 'NO_EVALUABLE'"
ESTADOS = "'pendiente', 'anotado', 'requiere_adjudicacion', 'adjudicado'"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS seguimiento.conciliador_gold_set (
            id BIGSERIAL PRIMARY KEY,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            muestrario VARCHAR(80) NOT NULL,
            par_tipo VARCHAR(16) NOT NULL CHECK (par_tipo IN ('positivo', 'negativo')),
            codigo_plan VARCHAR(64) NOT NULL,
            meta_id UUID NOT NULL,
            codigo_meta VARCHAR(128),
            nombre_meta TEXT,
            indicador_meta TEXT,
            actividad_pa_id UUID,
            codigo_actividad VARCHAR(50),
            meta_producto_vigencia TEXT,
            descripcion_actividad TEXT,
            codigo_bpim VARCHAR(50),
            tipo_vinculo_conciliador VARCHAR(64),
            score_confianza NUMERIC(6, 4),
            evidencia_cruce JSONB,
            anotador_a VARCHAR(80),
            etiqueta_a VARCHAR(32) CHECK (etiqueta_a IN ({ETIQUETAS})),
            anotador_b VARCHAR(80),
            etiqueta_b VARCHAR(32) CHECK (etiqueta_b IN ({ETIQUETAS})),
            estado VARCHAR(32) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ({ESTADOS})),
            etiqueta_adjudicada VARCHAR(32) CHECK (etiqueta_adjudicada IN ({ETIQUETAS})),
            adjudicador VARCHAR(80),
            observaciones TEXT
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_conciliador_gold_set_par "
        "ON seguimiento.conciliador_gold_set (muestrario, meta_id, COALESCE(actividad_pa_id, '00000000-0000-0000-0000-000000000000'))"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_conciliador_gold_set_estado "
        "ON seguimiento.conciliador_gold_set (muestrario, estado)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_conciliador_gold_set_tipo "
        "ON seguimiento.conciliador_gold_set (muestrario, par_tipo)"
    )
    op.execute(
        "COMMENT ON TABLE seguimiento.conciliador_gold_set IS "
        "'Gold set de conciliación meta–PA: parejas con doble anotación a ciegas y adjudicación.'"
    )
    op.execute(
        "COMMENT ON COLUMN seguimiento.conciliador_gold_set.etiqueta_a IS "
        "'Etiqueta del primer anotador (ciego al tipo reclamado por el conciliador).'"
    )
    op.execute(
        "COMMENT ON COLUMN seguimiento.conciliador_gold_set.etiqueta_adjudicada IS "
        "'Etiqueta final tras deliberación; en desacuerdo exige adjudicador independiente.'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_conciliador_gold_set_tipo")
    op.execute("DROP INDEX IF EXISTS ix_conciliador_gold_set_estado")
    op.execute("DROP INDEX IF EXISTS uq_conciliador_gold_set_par")
    # No borra anotaciones reales ya registradas en bd_csh; su retiro es una
    # decisión EDD/EAF. Igual que 0082: el lineage no destruye datos operativos.
