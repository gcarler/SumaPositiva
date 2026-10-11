"""Radicacion ciudadana inmutable y notificaciones transaccionales distritales.

Tarea: [NOTIF-FEEDBACK-01]
Plan Maestro: Fase 2 - Ingesta de Datos Vivos y Feedback Loop

Revision ID: 0056_radicacion_notif
Revises: 0055_ingesta_indicadores_reales
Create Date: 2026-10-11 14:30:00.000000
"""

from typing import Sequence, Union
from alembic import op
from sqlalchemy import text


revision: str = "0056_radicacion_notif"
down_revision: Union[str, Sequence[str], None] = "0055_ingesta_indicadores_reales"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Secuencia atomica de radicacion oficial para propuestas ciudadanas
    op.execute(
        """
        CREATE SEQUENCE IF NOT EXISTS participacion_ciudadana.secuencia_radicados_propuestas
            START WITH 1
            INCREMENT BY 1;
        """
    )

    # 2. Columna codigo_radicado en participacion_ciudadana.propuestas_ciudadanas
    op.execute(
        """
        ALTER TABLE participacion_ciudadana.propuestas_ciudadanas
            ADD COLUMN IF NOT EXISTS codigo_radicado VARCHAR(50);
        """
    )

    # Poblar registros preexistentes si existieren
    op.execute(
        """
        DO $$
        DECLARE
            r RECORD;
            val INT;
        BEGIN
            FOR r IN SELECT id FROM participacion_ciudadana.propuestas_ciudadanas WHERE codigo_radicado IS NULL ORDER BY creado_en ASC LOOP
                val := nextval('participacion_ciudadana.secuencia_radicados_propuestas');
                UPDATE participacion_ciudadana.propuestas_ciudadanas
                SET codigo_radicado = 'POL-2026-' || lpad(CAST(val AS text), 4, '0')
                WHERE id = r.id;
            END LOOP;
        END $$;
        """
    )

    # Restriccion NOT NULL y Unique Index
    op.execute(
        """
        ALTER TABLE participacion_ciudadana.propuestas_ciudadanas
            ALTER COLUMN codigo_radicado SET DEFAULT ('POL-2026-' || lpad(CAST(nextval('participacion_ciudadana.secuencia_radicados_propuestas') AS text), 4, '0'));
        """
    )
    op.execute(
        """
        ALTER TABLE participacion_ciudadana.propuestas_ciudadanas
            ALTER COLUMN codigo_radicado SET NOT NULL;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_propuestas_ciudadanas_codigo_radicado
            ON participacion_ciudadana.propuestas_ciudadanas (codigo_radicado);
        """
    )

    # 3. Tabla participacion_ciudadana.notificaciones_transaccionales
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.notificaciones_transaccionales (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo_radicado VARCHAR(50) NOT NULL,
            destinatario_correo VARCHAR(255) NOT NULL,
            tipo_evento VARCHAR(50) NOT NULL,
            asunto VARCHAR(250) NOT NULL,
            cuerpo_html TEXT NOT NULL,
            estado_envio VARCHAR(30) NOT NULL,
            error_detalle TEXT NULL,
            creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
            enviado_en TIMESTAMP WITH TIME ZONE NULL,
            CONSTRAINT chk_notificaciones_tipo_evento CHECK (
                tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion')
            ),
            CONSTRAINT chk_notificaciones_estado_envio CHECK (
                estado_envio IN ('enviado', 'simulado', 'fallido')
            )
        );
        """
    )
    op.execute(
        """
        COMMENT ON TABLE participacion_ciudadana.notificaciones_transaccionales IS 'Constancias de radicación y avisos transaccionales para erradicar el silencio administrativo (C-150/15)';
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_notif_codigo_radicado
            ON participacion_ciudadana.notificaciones_transaccionales (codigo_radicado);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_notif_destinatario
            ON participacion_ciudadana.notificaciones_transaccionales (destinatario_correo);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_notif_creado_en
            ON participacion_ciudadana.notificaciones_transaccionales (creado_en);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS participacion_ciudadana.notificaciones_transaccionales CASCADE;
        """
    )
    op.execute(
        """
        ALTER TABLE participacion_ciudadana.propuestas_ciudadanas
            DROP COLUMN IF EXISTS codigo_radicado CASCADE;
        """
    )
    op.execute(
        """
        DROP SEQUENCE IF EXISTS participacion_ciudadana.secuencia_radicados_propuestas CASCADE;
        """
    )
