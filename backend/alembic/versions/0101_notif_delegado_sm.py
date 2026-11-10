"""Estado 'delegado' del outbox: corte real Herald→SM (P5).

Herald conserva la intención del correo, pero cuando ``POLIS_SM_CORTE_TIPOS``
incluye su tipo el envío lo asume SM Core. La fila queda en un estado propio,
distinto de 'enviado', para no acreditar una entrega que no ocurrió: el worker
de Herald solo reclama 'pendiente', 'procesando' y 'fallido'.

El downgrade devuelve esas filas a 'pendiente' antes de reconstruir la
restricción anterior, de modo que Herald pueda enviarlas si se revierte.
"""

import sqlalchemy as sa

from alembic import op

revision = "0101_notif_delegado_sm"
down_revision = "0100_sm_auditoria_operador"
branch_labels = None
depends_on = None
SCHEMA = "participacion_ciudadana"
TABLA = "notificaciones_transaccionales"
RESTRICCION = "chk_notificaciones_estado_envio"
ESTADOS_ANTERIORES = "('pendiente', 'procesando', 'enviado', 'simulado', 'fallido')"
ESTADOS_NUEVOS = "('pendiente', 'procesando', 'enviado', 'simulado', 'fallido', 'delegado')"


def upgrade() -> None:
    op.drop_constraint(op.f(RESTRICCION), TABLA, schema=SCHEMA)
    op.create_check_constraint(op.f(RESTRICCION), TABLA, f"estado_envio IN {ESTADOS_NUEVOS}", schema=SCHEMA)


def downgrade() -> None:
    op.execute(
        sa.text(
            f"UPDATE {SCHEMA}.{TABLA} SET estado_envio = 'pendiente', intentos = 0, "
            "proximo_intento_en = NULL WHERE estado_envio = 'delegado'"
        )
    )
    op.drop_constraint(op.f(RESTRICCION), TABLA, schema=SCHEMA)
    op.create_check_constraint(op.f(RESTRICCION), TABLA, f"estado_envio IN {ESTADOS_ANTERIORES}", schema=SCHEMA)
