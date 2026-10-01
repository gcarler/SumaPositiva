"""Asociar evidencias fotográficas sanitizadas a mesas con moderación previa.

Revision ID: 0026_fotos_mes_vigilancia
Revises: 0025_control_fases_y_oauth
"""

from alembic import op
from sqlalchemy import text

revision = "0026_fotos_mes_vigilancia"
down_revision = "0025_control_fases_y_oauth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(text("""
        CREATE TABLE mesas_trabajo.fotos_mesa (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            mesa_id UUID NOT NULL REFERENCES mesas_trabajo.mesas(id) ON DELETE CASCADE,
            evidencia_id UUID NOT NULL REFERENCES participacion_ciudadana.evidencias_multimedia(id) ON DELETE CASCADE,
            subido_por_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
            autorizacion_imagen BOOLEAN NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
            observacion_revision TEXT,
            revisada_por_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
            revisada_en TIMESTAMPTZ,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            CONSTRAINT uq_fotos_mesa_evidencia UNIQUE (evidencia_id),
            CONSTRAINT chk_fotos_mesa_estado CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
            CONSTRAINT chk_fotos_mesa_aprobacion_autorizada CHECK (estado <> 'APROBADA' OR autorizacion_imagen)
        )
    """))
    op.execute(text("""
        CREATE INDEX idx_fotos_mesa_publicas ON mesas_trabajo.fotos_mesa (mesa_id, creado_en DESC) WHERE estado = 'APROBADA'
    """))
    op.execute(text("""
        CREATE INDEX idx_fotos_mesa_revision ON mesas_trabajo.fotos_mesa (creado_en) WHERE estado = 'PENDIENTE'
    """))
    op.execute(text("""
        COMMENT ON TABLE mesas_trabajo.fotos_mesa IS 'Relación de evidencias fotográficas sanitizadas de mesas; solo imágenes aprobadas se exponen públicamente.'
    """))


def downgrade() -> None:
    op.execute(text("DROP TABLE IF EXISTS mesas_trabajo.fotos_mesa CASCADE"))
