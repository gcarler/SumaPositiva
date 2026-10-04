"""Restituir compromisos PAS: eliminar datos fabricados de avance, BPIN y observaciones (AUD-13).

Revision ID: 0037_restituir_compromisos_pas
Revises: 0036_restituir_mediciones
Create Date: 2026-10-04 01:10:00.000000
"""

from alembic import op
from sqlalchemy import text

revision = "0037_restituir_compromisos_pas"
down_revision = "0036_restituir_mediciones"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Modificar columnas para permitir NULL en avances no reportados
    conn.execute(
        text("""
            ALTER TABLE seguimiento.compromisos_pas
            ALTER COLUMN avance_cuatrienal_valor DROP NOT NULL,
            ALTER COLUMN avance_cuatrienal_valor DROP DEFAULT,
            ALTER COLUMN porcentaje_cumplimiento DROP NOT NULL,
            ALTER COLUMN porcentaje_cumplimiento DROP DEFAULT,
            ALTER COLUMN fecha_corte_ultimo_reporte DROP NOT NULL,
            ALTER COLUMN fecha_corte_ultimo_reporte DROP DEFAULT,
            ALTER COLUMN presupuesto_anual_cop DROP NOT NULL,
            ALTER COLUMN presupuesto_anual_cop DROP DEFAULT,
            ALTER COLUMN estado SET DEFAULT 'sin_reporte';
        """)
    )

    # 2. Restablecer los compromisos institucionales:
    # - Avance y porcentaje a NULL (Sin reporte)
    # - Fecha de corte y presupuesto anual no trazables a NULL
    # - Estado a 'sin_reporte'
    # - Metadatos saneados eliminando BPINs ficticios, observaciones inventadas y cargos no verificados
    # - Citar fuente oficial: Decreto Nacional 037 de 2026 y Banco de Conocimiento PAS Cartagena
    conn.execute(
        text("""
            UPDATE seguimiento.compromisos_pas
            SET avance_cuatrienal_valor = NULL,
                porcentaje_cumplimiento = NULL,
                presupuesto_anual_cop = NULL,
                fecha_corte_ultimo_reporte = NULL,
                estado = 'sin_reporte',
                metadatos = jsonb_build_object(
                    'fuente', 'Decreto Nacional 037 de 2026 y Banco de Conocimiento PAS Cartagena (docs/lineas-sublineas-estrategicas.md)',
                    'estado_reporte', 'sin_reporte'
                ),
                actualizado_en = clock_timestamp();
        """)
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE seguimiento.compromisos_pas
        SET avance_cuatrienal_valor = COALESCE(avance_cuatrienal_valor, 0),
            porcentaje_cumplimiento = COALESCE(porcentaje_cumplimiento, 0),
            presupuesto_anual_cop = COALESCE(presupuesto_anual_cop, 0),
            fecha_corte_ultimo_reporte = COALESCE(fecha_corte_ultimo_reporte, CURRENT_DATE),
            estado = CASE WHEN estado = 'sin_reporte' THEN 'programado' ELSE estado END
        """
    )
    op.execute(
        """
        ALTER TABLE seguimiento.compromisos_pas
        ALTER COLUMN avance_cuatrienal_valor SET DEFAULT 0,
        ALTER COLUMN avance_cuatrienal_valor SET NOT NULL,
        ALTER COLUMN porcentaje_cumplimiento SET DEFAULT 0,
        ALTER COLUMN porcentaje_cumplimiento SET NOT NULL,
        ALTER COLUMN fecha_corte_ultimo_reporte SET DEFAULT CURRENT_DATE,
        ALTER COLUMN fecha_corte_ultimo_reporte SET NOT NULL,
        ALTER COLUMN presupuesto_anual_cop SET DEFAULT 0,
        ALTER COLUMN presupuesto_anual_cop SET NOT NULL,
        ALTER COLUMN estado SET DEFAULT 'programado'
        """
    )
