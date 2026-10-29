"""Registra procedencia de paquetes locales sin atribuirles fuente institucional.

Revision ID: 0077_paquetes_artefactos
Revises: 0076_lotes_idempotentes
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0077_paquetes_artefactos"
down_revision: str | Sequence[str] | None = "0076_lotes_idempotentes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "paquetes_artefactos",
        sa.Column("clave", sa.String(120), primary_key=True),
        sa.Column("prefijo", sa.String(256), nullable=False),
        sa.Column("descripcion", sa.String(512), nullable=False),
        sa.Column("atribucion", sa.String(120), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="seguimiento",
    )
    op.add_column("artefactos_fuente", sa.Column("paquete_clave", sa.String(120)), schema="seguimiento")
    op.create_foreign_key(
        "fk_artefactos_fuente_paquete",
        "artefactos_fuente",
        "paquetes_artefactos",
        ["paquete_clave"],
        ["clave"],
        source_schema="seguimiento",
        referent_schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_constraint("fk_artefactos_fuente_paquete", "artefactos_fuente", schema="seguimiento")
    op.drop_column("artefactos_fuente", "paquete_clave", schema="seguimiento")
    op.drop_table("paquetes_artefactos", schema="seguimiento")
