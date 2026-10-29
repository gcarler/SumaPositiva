"""Merge branch heads: 0037_restituir_compromisos_pas y 0037_noticias_institucionales

Revision ID: 0038_merge_heads
Revises: 0037_restituir_compromisos_pas, 0037_noticias_institucionales
Create Date: 2026-10-04 01:10:00.000000
"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "0038_merge_heads"
down_revision: str | Sequence[str] | None = (
    "0037_restituir_compromisos_pas",
    "0037_noticias_institucionales",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
