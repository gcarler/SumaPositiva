"""Persist page-level provenance for the multi-agent PDD absorption system.

Revision ID: 0067_evidencia_paginas_pdd
Revises: 0066_quince_mesas_corregimientos
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0067_evidencia_paginas_pdd"
down_revision: str | Sequence[str] | None = "0066_quince_mesas_corregimientos"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pdd_evidencia_paginas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("codigo_plan", sa.String(length=40), nullable=False),
        sa.Column("archivo", sa.Text(), nullable=False),
        sa.Column("sha256_archivo", sa.String(length=64), nullable=False),
        sa.Column("pagina", sa.Integer(), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("sha256_contenido", sa.String(length=64), nullable=False),
        sa.Column(
            "tablas",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("filas_tabla_detectadas", sa.Integer(), server_default="0", nullable=False),
        sa.Column("origen_texto", sa.String(length=30), nullable=False),
        sa.Column(
            "metadatos",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["codigo_plan"],
            ["seguimiento.planes_desarrollo_distrital.codigo_plan"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_pdd_evidencia_paginas"),
        sa.UniqueConstraint("archivo", "pagina", name="uq_pdd_evidencia_archivo_pagina"),
        schema="seguimiento",
    )
    op.create_index(
        "idx_pdd_evidencia_plan_archivo",
        "pdd_evidencia_paginas",
        ["codigo_plan", "archivo", "pagina"],
        schema="seguimiento",
    )
    op.create_index(
        "idx_pdd_evidencia_archivo_hash",
        "pdd_evidencia_paginas",
        ["sha256_archivo"],
        schema="seguimiento",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_pdd_evidencia_archivo_hash",
        table_name="pdd_evidencia_paginas",
        schema="seguimiento",
    )
    op.drop_index(
        "idx_pdd_evidencia_plan_archivo",
        table_name="pdd_evidencia_paginas",
        schema="seguimiento",
    )
    op.drop_table("pdd_evidencia_paginas", schema="seguimiento")
