"""Amplía tipos de evento de correo transaccional para POLIS Herald Fase 2 (Encargo 273).

Añade la trazabilidad de acciones de usuarios externos (perfil actualizado y
contraseña cambiada), la bitácora de gestión institucional de usuarios internos
(gestores, comunicadores y administradores), las alertas de pendientes y la
constancia de actualización de propuestas ciudadanas. Todos los valores nuevos
respetan el límite de 32 caracteres del encargo.

Revision ID: 0093_herald_gestion
Revises: 0092_notif_eventos
Create Date: 2026-10-30 09:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0093_herald_gestion"
down_revision: str | None = "0092_notif_eventos"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "participacion_ciudadana"
TABLA = "notificaciones_transaccionales"

TIPOS_HERALD = (
    "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion', 'registro_bienvenida', "
    "'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana', "
    "'perfil_actualizado', 'contrasena_cambiada', 'gestion_institucional', "
    "'alerta_pendientes', 'propuesta_actualizada')"
)
TIPOS_ANTERIORES = (
    "tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion', 'registro_bienvenida', "
    "'recuperacion_contrasena', 'apoyo_propuesta', 'actividad_ciudadana')"
)
NUEVOS_TIPOS = (
    "'perfil_actualizado', 'contrasena_cambiada', 'gestion_institucional', 'alerta_pendientes', 'propuesta_actualizada'"
)


def upgrade() -> None:
    op.drop_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        schema=SCHEMA,
    )
    op.create_check_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        TIPOS_HERALD,
        schema=SCHEMA,
    )


def downgrade() -> None:
    # Mismo criterio que 0092: los eventos nuevos no existen bajo la constraint
    # anterior; sus filas entregadas se conservan como evidencia forense y las
    # pendientes se retiran antes de restaurar el CHECK.
    op.execute(f"DELETE FROM {SCHEMA}.{TABLA} WHERE tipo_evento IN ({NUEVOS_TIPOS})")
    op.drop_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        schema=SCHEMA,
    )
    op.create_check_constraint(
        op.f("chk_notificaciones_tipo_evento"),
        TABLA,
        TIPOS_ANTERIORES,
        schema=SCHEMA,
    )
