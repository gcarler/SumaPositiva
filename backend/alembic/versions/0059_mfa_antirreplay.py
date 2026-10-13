"""Protección antirreplay para TOTP (RFC 6238 §5.2).

Tarea: [CIERRE-06b] Reservas del dictamen MFA: antirreplay TOTP
Plan Maestro: bridge/00_plan_maestro_cierre_operativo.md

Revision ID: 0059_mfa_antirreplay
Revises: 0058_mfa_totp
Create Date: 2026-10-13 04:05:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0059_mfa_antirreplay"
down_revision: Union[str, Sequence[str], None] = "0058_mfa_totp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios_mfa",
        sa.Column(
            "ultimo_paso_totp",
            sa.BigInteger(),
            nullable=True,
            comment="Último paso de tiempo TOTP (RFC 6238 §5.2) aceptado para prevenir reutilización",
        ),
        schema="autenticacion",
    )


def downgrade() -> None:
    op.drop_column("usuarios_mfa", "ultimo_paso_totp", schema="autenticacion")
