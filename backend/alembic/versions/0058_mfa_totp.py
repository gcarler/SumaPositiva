"""Módulo de autenticación multifactor TOTP RFC 6238 con recuperación y cifrado.

Tarea: [CIERRE-06] MFA (TOTP) para cuentas administrativas
Plan Maestro: bridge/00_plan_maestro_cierre_operativo.md

Revision ID: 0058_mfa_totp
Revises: 0057_comentario_pas
Create Date: 2026-10-13 03:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0058_mfa_totp"
down_revision: str | Sequence[str] | None = "0057_comentario_pas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "usuarios_mfa",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("public.generar_uuid_v7()"),
        ),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("autenticacion.usuarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("secreto_cifrado", sa.String(512), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "codigos_recuperacion",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("activado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ultimo_uso_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("intentos_fallidos", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("bloqueado_hasta", sa.DateTime(timezone=True), nullable=True),
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
        schema="autenticacion",
        comment="Configuración de autenticación multifactor TOTP (RFC 6238) y códigos de recuperación",
    )
    op.create_index(
        "idx_usuarios_mfa_usuario",
        "usuarios_mfa",
        ["usuario_id"],
        unique=True,
        schema="autenticacion",
    )


def downgrade() -> None:
    op.drop_index("idx_usuarios_mfa_usuario", table_name="usuarios_mfa", schema="autenticacion")
    op.drop_table("usuarios_mfa", schema="autenticacion")
