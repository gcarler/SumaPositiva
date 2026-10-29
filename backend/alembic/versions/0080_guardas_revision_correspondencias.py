"""Exige evidencia completa y autor identificado en decisiones de correspondencia.

Revision ID: 0080_guardas_correspondencias
Revises: 0079_correspondencias_meta_pa_1n
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0080_guardas_correspondencias"
down_revision: str | Sequence[str] | None = "0079_correspondencias_meta_pa_1n"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_pdd_correspondencias_acreditacion",
        "pdd_correspondencias_meta_pa_bpim",
        schema="seguimiento",
        type_="check",
    )
    op.create_check_constraint(
        "ck_pdd_correspondencias_acreditacion",
        "pdd_correspondencias_meta_pa_bpim",
        "estado_revision <> 'ACREDITADO' OR ("
        "documento_evidencia IS NOT NULL AND length(trim(documento_evidencia)) > 0 AND "
        "pagina_evidencia IS NOT NULL AND pagina_evidencia > 0 AND "
        "sha256_documento IS NOT NULL AND sha256_documento ~ '^[0-9a-f]{64}$' AND "
        "revisor IS NOT NULL AND length(trim(revisor)) > 0 AND fecha_revision IS NOT NULL)",
        schema="seguimiento",
    )
    op.create_check_constraint(
        "ck_pdd_correspondencias_decision_identificada",
        "pdd_correspondencias_meta_pa_bpim",
        "estado_revision = 'CANDIDATO_SIN_ACREDITAR' OR ("
        "revisor IS NOT NULL AND length(trim(revisor)) > 0 AND fecha_revision IS NOT NULL)",
        schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_pdd_correspondencias_decision_identificada",
        "pdd_correspondencias_meta_pa_bpim",
        schema="seguimiento",
        type_="check",
    )
    op.drop_constraint(
        "ck_pdd_correspondencias_acreditacion",
        "pdd_correspondencias_meta_pa_bpim",
        schema="seguimiento",
        type_="check",
    )
    op.create_check_constraint(
        "ck_pdd_correspondencias_acreditacion",
        "pdd_correspondencias_meta_pa_bpim",
        "estado_revision <> 'ACREDITADO' OR ("
        "documento_evidencia IS NOT NULL AND pagina_evidencia > 0 AND "
        "sha256_documento ~ '^[0-9a-f]{64}$' AND revisor IS NOT NULL AND fecha_revision IS NOT NULL)",
        schema="seguimiento",
    )
