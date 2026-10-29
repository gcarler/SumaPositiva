"""Create canonical catalog tables for PDD and PDL data.

Revision ID: 0065_catalogo_planes_desarrollo
Revises: 0064_drive_seguridad_humana
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0065_catalogo_planes_desarrollo"
down_revision: str | Sequence[str] | None = "0064_drive_seguridad_humana"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "planes_desarrollo_distrital",
        sa.Column("codigo_plan", sa.String(40), primary_key=True),
        sa.Column("periodo", sa.String(20), nullable=False),
        sa.Column("nombre_oficial", sa.Text(), nullable=False),
        sa.Column("norma_adopcion", sa.Text()),
        sa.Column("tipo_plan", sa.String(10), nullable=False),
        sa.Column("localidad", sa.String(80)),
        sa.Column("ppi_total_corriente_cop", sa.Numeric(22, 2)),
        sa.Column("ppi_total_constante_2025_cop", sa.Numeric(22, 2)),
        sa.Column(
            "ppi_anual_cop",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "fuentes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "metadatos",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "sincronizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        schema="seguimiento",
    )
    op.create_table(
        "pdd_lineas_y_programas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("codigo_plan", sa.String(40), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True)),
        sa.Column("nivel", sa.String(24), nullable=False),
        sa.Column("codigo", sa.String(80)),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("orden", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "ppi_anual_cop",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("fuente", sa.Text()),
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
        sa.ForeignKeyConstraint(["parent_id"], ["seguimiento.pdd_lineas_y_programas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_pdd_lineas_y_programas"),
        schema="seguimiento",
    )
    op.create_index(
        "idx_pdd_lineas_codigo_plan",
        "pdd_lineas_y_programas",
        ["codigo_plan"],
        schema="seguimiento",
    )
    op.create_index("idx_pdd_lineas_parent", "pdd_lineas_y_programas", ["parent_id"], schema="seguimiento")
    op.create_table(
        "pdd_metas_oficiales",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("codigo_plan", sa.String(40), nullable=False),
        sa.Column("linea_id", postgresql.UUID(as_uuid=True)),
        sa.Column("tipo_meta", sa.String(30), nullable=False),
        sa.Column("codigo", sa.String(100)),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("indicador", sa.Text()),
        sa.Column("unidad_medida", sa.String(120)),
        sa.Column("linea_nombre", sa.Text()),
        sa.Column("fuente", sa.Text()),
        sa.Column("fila_fuente", sa.Integer()),
        sa.Column(
            "datos_oficiales",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["codigo_plan"],
            ["seguimiento.planes_desarrollo_distrital.codigo_plan"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["linea_id"], ["seguimiento.pdd_lineas_y_programas.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_pdd_metas_oficiales"),
        schema="seguimiento",
    )
    op.create_index("idx_pdd_metas_plan", "pdd_metas_oficiales", ["codigo_plan"], schema="seguimiento")
    op.create_index("idx_pdd_metas_linea", "pdd_metas_oficiales", ["linea_id"], schema="seguimiento")


def downgrade() -> None:
    op.drop_index("idx_pdd_metas_linea", table_name="pdd_metas_oficiales", schema="seguimiento")
    op.drop_index("idx_pdd_metas_plan", table_name="pdd_metas_oficiales", schema="seguimiento")
    op.drop_table("pdd_metas_oficiales", schema="seguimiento")
    op.drop_index("idx_pdd_lineas_parent", table_name="pdd_lineas_y_programas", schema="seguimiento")
    op.drop_index("idx_pdd_lineas_codigo_plan", table_name="pdd_lineas_y_programas", schema="seguimiento")
    op.drop_table("pdd_lineas_y_programas", schema="seguimiento")
    op.drop_table("planes_desarrollo_distrital", schema="seguimiento")
