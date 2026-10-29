"""Impide que resembrados de planes o PA borren revisiones meta–actividad.

Revision ID: 0081_proteger_correspondencias
Revises: 0080_guardas_correspondencias
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0081_proteger_correspondencias"
down_revision: str | Sequence[str] | None = "0080_guardas_correspondencias"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "pdd_correspondencias_meta_pa_bpim"
SCHEMA = "seguimiento"
FOREIGN_KEYS = (
    ("fk_pdd_correspondencias_meta_pa_bpim_meta_id_pdd_metas__1255", "meta_id", "pdd_metas_oficiales"),
    ("fk_pdd_correspondencias_meta_pa_bpim_actividad_pa_id_ac_b433", "actividad_pa_id", "actividades_plan_accion"),
    (
        "fk_pdd_correspondencias_meta_pa_bpim_vinculo_origen_id__d8e6",
        "vinculo_origen_id",
        "pdd_vinculos_meta_pa_triada",
    ),
)


def _recrear(ondelete: str) -> None:
    for name, column, target in FOREIGN_KEYS:
        op.drop_constraint(name, TABLE, schema=SCHEMA, type_="foreignkey")
        op.create_foreign_key(
            name,
            TABLE,
            target,
            [column],
            ["id"],
            source_schema=SCHEMA,
            referent_schema=SCHEMA,
            ondelete=ondelete,
        )


def upgrade() -> None:
    _recrear("RESTRICT")


def downgrade() -> None:
    _recrear("CASCADE")
