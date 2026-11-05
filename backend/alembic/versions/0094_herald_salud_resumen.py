"""POLIS Herald: salud de entregas y resumen diario de pendientes (Encargo 275).

Crea ``participacion_ciudadana.herald_latido`` (fila única que acredita el
último ciclo del ejecutor, aun con cola vacía), amplía
``chk_notificaciones_tipo_evento`` con el tipo ``resumen_diario`` y crea el
índice único parcial que garantiza un resumen por usuario por día calendario.

Revision ID: 0094_herald_salud_resumen
Revises: 0093_herald_gestion
Create Date: 2026-10-31 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0094_herald_salud_resumen"
down_revision: str | None = "0093_herald_gestion"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "participacion_ciudadana"
TABLA = "notificaciones_transaccionales"

TIPOS_CON_RESUMEN = (
    "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion', 'registro_bienvenida', "
    "'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana', "
    "'perfil_actualizado', 'contrasena_cambiada', 'gestion_institucional', "
    "'alerta_pendientes', 'propuesta_actualizada', 'resumen_diario')"
)
TIPOS_SIN_RESUMEN = (
    "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion', 'registro_bienvenida', "
    "'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana', "
    "'perfil_actualizado', 'contrasena_cambiada', 'gestion_institucional', "
    "'alerta_pendientes', 'propuesta_actualizada')"
)
INDICE_RESUMEN = "uq_notif_resumen_destinatario_dia"


def upgrade() -> None:
    op.create_table(
        "herald_latido",
        sa.Column("id", sa.SmallInteger(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "ultimo_ciclo",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.CheckConstraint("id = 1", name=op.f("chk_herald_latido_unica")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_herald_latido")),
        schema=SCHEMA,
        comment=(
            "Latido del ejecutor de POLIS Herald: acredita que el outbox se está "
            "consumiendo, incluso con la cola vacía (Encargo 275)"
        ),
    )

    op.drop_constraint(op.f("chk_notificaciones_tipo_evento"), TABLA, schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        TIPOS_CON_RESUMEN,
        schema=SCHEMA,
    )

    # Un resumen por usuario por día calendario: reintentos del cron o del CLI
    # en el mismo día no duplican el correo.
    op.create_index(
        INDICE_RESUMEN,
        TABLA,
        ["destinatario_correo", "codigo_radicado"],
        unique=True,
        postgresql_where=sa.text("tipo_evento = 'resumen_diario'"),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index(INDICE_RESUMEN, table_name=TABLA, schema=SCHEMA)
    # Los resúmenes son material del tipo nuevo: sin el índice ni el CHECK que
    # los admiten no pueden persistir (mismo criterio forense que 0092/0093).
    op.execute(f"DELETE FROM {SCHEMA}.{TABLA} WHERE tipo_evento = 'resumen_diario'")
    op.drop_constraint(op.f("chk_notificaciones_tipo_evento"), TABLA, schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        TIPOS_SIN_RESUMEN,
        schema=SCHEMA,
    )
    op.drop_table("herald_latido", schema=SCHEMA)
