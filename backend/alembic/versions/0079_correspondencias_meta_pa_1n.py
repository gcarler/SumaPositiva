"""Candidatos 1:N meta–actividad sin duplicar cifras financieras.

Revision ID: 0079_correspondencias_meta_pa_1n
Revises: 0078_evidencia_drive_artefactos
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0079_correspondencias_meta_pa_1n"
down_revision: str | Sequence[str] | None = "0078_evidencia_drive_artefactos"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pdd_correspondencias_meta_pa_bpim",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("codigo_plan", sa.String(64), nullable=False),
        sa.Column("meta_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actividad_pa_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vinculo_origen_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("codigo_bpim", sa.String(128), nullable=False),
        sa.Column("vigencia", sa.Integer(), nullable=False),
        sa.Column("regla_candidatura", sa.String(64), nullable=False),
        sa.Column("estado_revision", sa.String(40), nullable=False, server_default="CANDIDATO_SIN_ACREDITAR"),
        sa.Column("documento_evidencia", sa.Text()),
        sa.Column("pagina_evidencia", sa.Integer()),
        sa.Column("sha256_documento", sa.CHAR(64)),
        sa.Column("revisor", sa.String(160)),
        sa.Column("fecha_revision", sa.DateTime(timezone=True)),
        sa.Column("evidencia_cruce", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["meta_id"], ["seguimiento.pdd_metas_oficiales.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actividad_pa_id"], ["seguimiento.actividades_plan_accion.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["vinculo_origen_id"], ["seguimiento.pdd_vinculos_meta_pa_triada.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("meta_id", "actividad_pa_id", name="uq_pdd_correspondencias_meta_actividad"),
        sa.CheckConstraint(
            "estado_revision IN ('CANDIDATO_SIN_ACREDITAR', 'ACREDITADO', 'DESCARTADO')",
            name="ck_pdd_correspondencias_estado_revision",
        ),
        sa.CheckConstraint(
            "estado_revision <> 'ACREDITADO' OR "
            "(documento_evidencia IS NOT NULL AND pagina_evidencia > 0 AND "
            "sha256_documento ~ '^[0-9a-f]{64}$' AND revisor IS NOT NULL AND fecha_revision IS NOT NULL)",
            name="ck_pdd_correspondencias_acreditacion",
        ),
        schema="seguimiento",
        comment="Candidatos meta–PA 1:N; sin importes para impedir doble imputación presupuestal",
    )
    op.create_index(
        "idx_pdd_correspondencias_plan_estado",
        "pdd_correspondencias_meta_pa_bpim",
        ["codigo_plan", "estado_revision"],
        schema="seguimiento",
    )
    op.create_index(
        "idx_pdd_correspondencias_meta",
        "pdd_correspondencias_meta_pa_bpim",
        ["meta_id"],
        schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_index("idx_pdd_correspondencias_meta", table_name="pdd_correspondencias_meta_pa_bpim", schema="seguimiento")
    op.drop_index(
        "idx_pdd_correspondencias_plan_estado", table_name="pdd_correspondencias_meta_pa_bpim", schema="seguimiento"
    )
    op.drop_table("pdd_correspondencias_meta_pa_bpim", schema="seguimiento")
