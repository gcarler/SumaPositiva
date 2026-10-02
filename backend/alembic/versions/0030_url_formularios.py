"""Persistir URLs y documentos del constructor sin modificar revisiones aplicadas."""

from sqlalchemy import text

from alembic import op

revision = "0030_url_formularios"
down_revision = "0029_merge_formularios_fotos"
branch_labels = None
depends_on = None


def upgrade():
    for sentencia in """
        ALTER TABLE participacion_ciudadana.formularios_consulta
        ADD COLUMN slug VARCHAR(80), ADD COLUMN documento_constructor JSONB;
        UPDATE participacion_ciudadana.formularios_consulta
        SET slug = 'consulta-' || replace(id::text, '-', '');
        ALTER TABLE participacion_ciudadana.formularios_consulta
        ALTER COLUMN slug SET NOT NULL;
        ALTER TABLE participacion_ciudadana.formularios_consulta
        ADD CONSTRAINT uq_formulario_slug UNIQUE (slug);
    """.split(";"):
        if sentencia.strip():
            op.execute(text(sentencia))


def downgrade():
    op.execute(
        text("""
        ALTER TABLE participacion_ciudadana.formularios_consulta
        DROP CONSTRAINT uq_formulario_slug,
        DROP COLUMN documento_constructor, DROP COLUMN slug;
    """)
    )
