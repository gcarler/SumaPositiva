"""Quitar fechas y horarios fijos de las 35 mesas de trabajo dejándolas por definir.

Revision ID: 0089_fechas_mesas_por_definir
Revises: 0088_sincronizar_35_mesas
Create Date: 2026-10-28
"""

from alembic import op

revision = "0089_fechas_mesas_por_definir"
down_revision = "0088_sincronizar_35_mesas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Permitir fecha nula en mesas_trabajo.agendas
    bind.exec_driver_sql("ALTER TABLE mesas_trabajo.agendas ALTER COLUMN fecha DROP NOT NULL;")

    # 2. En mesas_trabajo.mesas: dejar fecha NULL, horario y lugar 'Por definir'
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET fecha = NULL,
            horario = 'Por definir',
            lugar_nombre = 'Por definir',
            metadatos = jsonb_set(
                jsonb_set(metadatos, '{lugar}', '"Por definir"'::jsonb),
                '{horario}', '"Por definir"'::jsonb
            ),
            actualizado_en = clock_timestamp();
    """)

    # 3. En mesas_trabajo.agendas: dejar fecha NULL, horarios y lugar 'Por definir'
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.agendas
        SET fecha = NULL,
            hora_inicio = 'Por definir',
            hora_fin = 'Por definir',
            lugar = 'Por definir',
            actualizado_en = clock_timestamp();
    """)


def downgrade() -> None:
    # No-op seguro: la consulta histórica de las mesas no destroza el cartel
    pass
