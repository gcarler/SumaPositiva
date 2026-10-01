"""Modulo de Formularios y Consultas Ciudadanas (Forms)

Revision ID: 0020_formularios_y_consultas
Revises: 0019_permisos_gestion
"""

import json

from sqlalchemy import text

from alembic import op

revision = "0020_formularios_y_consultas"
down_revision = "0019_permisos_gestion"
branch_labels = None
depends_on = None

PERMISOS_FORMULARIOS = {
    "autoridad_distrital": ("formularios:gestionar", "formularios:leer"),
    "facilitador_mesa": ("formularios:gestionar", "formularios:leer"),
    "auditor_forense": ("formularios:leer",),
}

PREGUNTAS_L02_CONV = [
    {
        "id": "preg-conv-01",
        "texto": "¿Cuál considera que es el principal factor que afecta la convivencia en su comunidad o barrio?",
        "tipo": "opcion_unica",
        "opciones": [
            "Falta de alumbrado y espacios públicos seguros",
            "Consumo y tráfico de sustancias en entornos escolares",
            "Conflictos entre jóvenes y fronteras invisibles",
            "Falta de alternativas de empleo y emprendimiento",
            "Ruido excesivo y falta de cultura ciudadana",
        ],
        "obligatoria": True,
    },
    {
        "id": "preg-conv-02",
        "texto": "Nivel de confianza en los mecanismos de concertación comunitaria y frentes ciudadanos de seguridad",
        "tipo": "escala_likert",
        "opciones": ["1", "2", "3", "4", "5"],
        "ayuda": "1: Muy baja confianza - 5: Muy alta confianza",
        "obligatoria": True,
    },
    {
        "id": "preg-conv-03",
        "texto": "¿Cuáles intervenciones prioritarias propone para fortalecer la seguridad humana en la Localidad 2?",
        "tipo": "texto_libre",
        "obligatoria": False,
    },
    {
        "id": "preg-conv-04",
        "texto": "¿Apoya la focalización de recursos FONSET para alarmas comunitarias y cámaras articuladas a las JAC?",
        "tipo": "opcion_unica",
        "opciones": [
            "Totalmente de acuerdo",
            "Parcialmente de acuerdo",
            "En desacuerdo - se debe priorizar inversión social",
            "Requiere concertación previa en mesa barrial",
        ],
        "obligatoria": True,
    },
]

PREGUNTAS_CIENAGA_AMB = [
    {
        "id": "preg-amb-01",
        "texto": "Principal problemática ambiental que amenaza el cuerpo hídrico y las comunidades vecinas",
        "tipo": "opcion_unica",
        "opciones": [
            "Relleno y tala ilegal de manglar",
            "Descarga de aguas residuales sin tratamiento",
            "Sedimentación y pérdida de navegabilidad en caños",
            "Basuras y escombros en la ronda hídrica",
            "Pérdida de especies pesqueras tradicionales",
        ],
        "obligatoria": True,
    },
    {
        "id": "preg-amb-02",
        "texto": "Urgencia de ejecutar proyectos de restauración ecológica y dragado ambiental",
        "tipo": "escala_likert",
        "opciones": ["1", "2", "3", "4", "5"],
        "ayuda": "1: No urgente - 5: Emergencia crítica prioritaria",
        "obligatoria": True,
    },
    {
        "id": "preg-amb-03",
        "texto": "Propuestas para vincular a pescadores artesanales y líderes comunitarios en la vigilancia ambiental",
        "tipo": "texto_libre",
        "obligatoria": False,
    },
]


def upgrade() -> None:
    # 1. Crear tabla formularios_consulta
    op.execute(
        text("""
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.formularios_consulta (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo VARCHAR(50) UNIQUE NOT NULL,
            titulo VARCHAR(250) NOT NULL,
            descripcion TEXT NOT NULL,
            dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
            territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
            estado VARCHAR(50) NOT NULL DEFAULT 'PUBLICADO',
            esquema_preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
            enfoque_diferencial_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
            permite_evidencias BOOLEAN NOT NULL DEFAULT TRUE,
            fecha_cierre TIMESTAMPTZ NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
    """)
    )

    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_formularios_codigo ON participacion_ciudadana.formularios_consulta (codigo)
    """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_formularios_dimension ON participacion_ciudadana.formularios_consulta (dimension_id)
    """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_formularios_territorio ON participacion_ciudadana.formularios_consulta (territorio_id)
    """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_formularios_estado ON participacion_ciudadana.formularios_consulta (estado)
    """)
    )

    # 2. Crear tabla respuestas_formulario
    op.execute(
        text("""
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.respuestas_formulario (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            formulario_id UUID NOT NULL REFERENCES participacion_ciudadana.formularios_consulta(id) ON DELETE CASCADE,
            sujeto_id UUID NOT NULL,
            territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
            datos_enfoque JSONB NOT NULL DEFAULT '{}'::jsonb,
            datos_respuesta JSONB NOT NULL DEFAULT '{}'::jsonb,
            evidencias JSONB NOT NULL DEFAULT '[]'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            CONSTRAINT uq_respuesta_formulario_sujeto UNIQUE (formulario_id, sujeto_id)
        )
    """)
    )

    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_respuestas_formulario ON participacion_ciudadana.respuestas_formulario (formulario_id)
    """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_respuestas_sujeto ON participacion_ciudadana.respuestas_formulario (sujeto_id)
    """)
    )

    # 3. Asignar permisos en roles
    for rol, permisos in PERMISOS_FORMULARIOS.items():
        for permiso in permisos:
            op.execute(
                text("""
                UPDATE autenticacion.roles
                SET permisos = permisos || CAST(:permiso AS jsonb)
                WHERE codigo = :rol AND NOT permisos @> CAST(:permiso AS jsonb)
            """).bindparams(rol=rol, permiso=json.dumps([permiso]))
            )

    # 4. Sembrar formularios modelo
    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.formularios_consulta
            (codigo, titulo, descripcion, dimension_id, territorio_id, estado, esquema_preguntas, enfoque_diferencial_habilitado, permite_evidencias)
        SELECT
            'FORM-L02-CONV-2026',
            'Consulta Ciudadana sobre Convivencia y Seguridad Humana - Localidad 2',
            'Diagnóstico participativo para concertar prioridades de convivencia, iluminación y prevención social en la Localidad de la Virgen y Turística.',
            dim.id,
            terr.id,
            'PUBLICADO',
            CAST(:preguntas_conv AS jsonb),
            TRUE,
            TRUE
        FROM motor_politicas.dimensiones_seguridad_humana dim
        CROSS JOIN geodatos.territorios terr
        WHERE dim.codigo = 'comunitaria' AND terr.codigo = 'LOC-2'
        ON CONFLICT (codigo) DO NOTHING
    """).bindparams(preguntas_conv=json.dumps(PREGUNTAS_L02_CONV))
    )

    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.formularios_consulta
            (codigo, titulo, descripcion, dimension_id, territorio_id, estado, esquema_preguntas, enfoque_diferencial_habilitado, permite_evidencias)
        SELECT
            'FORM-CIENAGA-AMB-2026',
            'Diagnóstico Ambiental y Resiliencia Comunitaria - Ciénaga de la Virgen',
            'Consulta territorial sobre vertimientos, recuperación del manglar y soberanía pesquera artesanal.',
            dim.id,
            terr.id,
            'PUBLICADO',
            CAST(:preguntas_amb AS jsonb),
            TRUE,
            TRUE
        FROM motor_politicas.dimensiones_seguridad_humana dim
        CROSS JOIN geodatos.territorios terr
        WHERE dim.codigo = 'ambiental' AND terr.codigo = 'CORR-BOQUILLA'
        ON CONFLICT (codigo) DO NOTHING
    """).bindparams(preguntas_amb=json.dumps(PREGUNTAS_CIENAGA_AMB))
    )


def downgrade() -> None:
    op.execute(
        text("""
        DROP TABLE IF EXISTS participacion_ciudadana.respuestas_formulario CASCADE
    """)
    )
    op.execute(
        text("""
        DROP TABLE IF EXISTS participacion_ciudadana.formularios_consulta CASCADE
    """)
    )

    for rol, permisos in PERMISOS_FORMULARIOS.items():
        op.execute(
            text("""
            UPDATE autenticacion.roles AS rol
            SET permisos = (
                SELECT COALESCE(jsonb_agg(permiso.value ORDER BY permiso.orden), '[]'::jsonb)
                FROM jsonb_array_elements(rol.permisos) WITH ORDINALITY AS permiso(value, orden)
                WHERE NOT CAST(:quitar AS jsonb) @> jsonb_build_array(permiso.value)
            )
            WHERE rol.codigo = :rol
        """).bindparams(rol=rol, quitar=json.dumps(permisos))
        )
