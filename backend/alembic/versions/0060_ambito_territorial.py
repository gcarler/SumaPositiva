"""Ámbitos territoriales de autorización PBAC para actores institucionales.

Tarea: [CIERRE-07] Alcance territorial de permisos institucionales
Plan Maestro: bridge/00_plan_maestro_cierre_operativo.md

Revision ID: 0060_ambito_territorial
Revises: 0059_mfa_antirreplay
Create Date: 2026-10-13 04:35:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0060_ambito_territorial"
down_revision: str | Sequence[str] | None = "0059_mfa_antirreplay"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ambitos_territoriales_usuario",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo_ambito", sa.String(length=20), nullable=False),
        sa.Column("identificador_territorial", sa.String(length=100), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "tipo_ambito IN ('distrital', 'localidad', 'mesa')",
            name="ck_tipo_ambito",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["autenticacion.usuarios.id"],
            name="fk_ambitos_usuario_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_ambitos_territoriales_usuario"),
        sa.UniqueConstraint(
            "usuario_id",
            "tipo_ambito",
            "identificador_territorial",
            name="uq_usuario_ambito",
        ),
        schema="autenticacion",
        comment="Ámbitos territoriales de autorización PBAC para actores institucionales",
    )
    op.create_index(
        "idx_ambitos_usuario",
        "ambitos_territoriales_usuario",
        ["usuario_id"],
        unique=False,
        schema="autenticacion",
        postgresql_where=sa.text("activo = true"),
    )
    op.create_index(
        "idx_ambitos_territorio",
        "ambitos_territoriales_usuario",
        ["tipo_ambito", "identificador_territorial"],
        unique=False,
        schema="autenticacion",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_ambitos_territorio",
        table_name="ambitos_territoriales_usuario",
        schema="autenticacion",
    )
    op.drop_index(
        "idx_ambitos_usuario",
        table_name="ambitos_territoriales_usuario",
        schema="autenticacion",
        postgresql_where=sa.text("activo = true"),
    )
    op.drop_table("ambitos_territoriales_usuario", schema="autenticacion")
