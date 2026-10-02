"""Publicar el formulario de reporte sin reescribir registros del constructor."""

import json
from pathlib import Path

from sqlalchemy import text

from alembic import op

revision = "0031_reporte_inseguridad"
down_revision = "0030_url_formularios"
branch_labels = None
depends_on = None


def upgrade():
    doc = json.loads((Path(__file__).parents[1] / "data/0031_reporte_inseguridad.json").read_text())
    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.formularios_consulta
        (id, codigo, slug, titulo, descripcion, estado, esquema_preguntas, documento_constructor)
        VALUES ('4ecd649a-6764-4d62-8ddb-1bcecd342031', 'REPORTE-CIUDADANO-GEOESPACIAL',
        'reporte-inseguridad', :titulo, :descripcion, 'PUBLICADO',
        CAST(:preguntas AS jsonb), CAST(:documento AS jsonb))
    """).bindparams(
            titulo=doc["titulo"],
            descripcion=doc["descripcion"],
            preguntas=json.dumps(doc["preguntas"]),
            documento=json.dumps(doc),
        )
    )


def downgrade():
    op.execute(
        text("""
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM participacion_ciudadana.respuestas_formulario
                     WHERE formulario_id='4ecd649a-6764-4d62-8ddb-1bcecd342031') THEN
            RAISE EXCEPTION 'Conservar o exportar respuestas del reporte antes de downgrade';
          END IF;
        END $$;
    """)
    )
    op.execute(
        text(
            "DELETE FROM participacion_ciudadana.formularios_consulta "
            "WHERE id='4ecd649a-6764-4d62-8ddb-1bcecd342031'"
        )
    )
