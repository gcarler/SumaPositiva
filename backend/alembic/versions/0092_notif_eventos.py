"""Ampliar tipos de evento de correo transaccional (Encargo 272).

Admite los cuatro flujos del servicio integral de correo: bienvenida de registro,
recuperacion de contrasena, apoyo ("me gusta") y resumen de actividad ciudadana.
Revision ID: 0092_notif_eventos
Revises: 0091_lineas_cartagena_7d
Create Date: 2026-10-29 14:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0092_notif_eventos"
down_revision: str | None = "0091_lineas_cartagena_7d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "participacion_ciudadana"
TABLA = "notificaciones_transaccionales"

# Los tres tipos originales (radicacion, cambio_estado, priorizacion) y los cuatro
# nuevos del servicio integral de correo transaccional.
TIPOS_ACTUALIZADOS = "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion', 'registro_bienvenida', 'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana')"
TIPOS_ORIGINALES = "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion')"


def upgrade() -> None:
    op.drop_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        schema=SCHEMA,
    )
    op.create_check_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        TIPOS_ACTUALIZADOS,
        schema=SCHEMA,
    )


def downgrade() -> None:
    # Los eventos nuevos no tienen significado bajo la constraint histórica;
    # se conservan sus filas solo si ya fueron entregadas, como evidencia forense
    # una vez retirada la restricción, y se retiran antes de restaurar el CHECK.
    op.execute(
        f"DELETE FROM {SCHEMA}.{TABLA} WHERE tipo_evento IN ('registro_bienvenida', 'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana')"
    )
    op.drop_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        schema=SCHEMA,
    )
    op.create_check_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        TIPOS_ORIGINALES,
        schema=SCHEMA,
    )
