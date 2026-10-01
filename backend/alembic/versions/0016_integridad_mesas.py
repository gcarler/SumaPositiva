"""Alinear los campos obligatorios de mesas sin descartar registros existentes.

Revision ID: 0016_integridad_mesas
Revises: 0015_poligonos_geovisor
"""

from alembic import op

revision = "0016_integridad_mesas"
down_revision = "0015_poligonos_geovisor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Las instalaciones históricas admitían NULL en estos tres campos.
    op.execute("ALTER TABLE mesas_trabajo.mesas ADD COLUMN IF NOT EXISTS slug VARCHAR(100)")
    op.execute("UPDATE mesas_trabajo.mesas SET slug = 'mesa-' || id::text WHERE slug IS NULL")
    op.execute("UPDATE mesas_trabajo.mesas SET aforo_maximo = 0 WHERE aforo_maximo IS NULL")
    op.execute("""
        UPDATE mesas_trabajo.mesas AS mesa
        SET total_asistentes = (
            SELECT count(*) FROM mesas_trabajo.participantes_mesa AS participante
            WHERE participante.mesa_id = mesa.id
        )
        WHERE mesa.total_asistentes IS NULL
    """)
    for columna in ("slug", "aforo_maximo", "total_asistentes"):
        op.execute(f"ALTER TABLE mesas_trabajo.mesas ALTER COLUMN {columna} SET NOT NULL")


def downgrade() -> None:
    for columna in ("slug", "aforo_maximo", "total_asistentes"):
        op.execute(f"ALTER TABLE mesas_trabajo.mesas ALTER COLUMN {columna} DROP NOT NULL")
