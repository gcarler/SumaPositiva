"""Merge branch heads: 0037_restituir_compromisos_pas y 0037_noticias_institucionales

Revision ID: 0038_merge_heads
Revises: 0037_restituir_compromisos_pas, 0037_noticias_institucionales
Create Date: 2026-10-04 01:10:00.000000
"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "0038_merge_heads"
down_revision: Union[str, Sequence[str], None] = (
    "0037_restituir_compromisos_pas",
    "0037_noticias_institucionales",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
