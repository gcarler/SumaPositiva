"""Testimonios comunitarios y memoria social.

Revision ID: 0024_testimonios_memoria
Revises: 0023_asistencia_multicanal
Create Date: 2026-10-01 16:21:00
"""

import json

from sqlalchemy import text

from alembic import op

revision = "0024_testimonios_memoria"
down_revision = "0023_asistencia_multicanal"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Crear tabla testimonios_comunitarios en participacion_ciudadana
    op.execute(
        text("""
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.testimonios_comunitarios (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo_unico VARCHAR(50) NOT NULL UNIQUE,
            sujeto_id UUID,
            nombre_autor VARCHAR(200) NOT NULL,
            organizacion_comunitaria VARCHAR(200),
            territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
            dimension_id UUID REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
            titulo VARCHAR(250) NOT NULL,
            relato TEXT NOT NULL,
            url_foto VARCHAR(500),
            url_audio_video VARCHAR(500),
            metadatos_enfoque JSONB NOT NULL DEFAULT '{}'::jsonb,
            estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
            motivo_moderacion TEXT,
            moderado_por_id UUID REFERENCES autenticacion.usuarios(id) ON DELETE SET NULL,
            moderado_en TIMESTAMP WITH TIME ZONE,
            activo BOOLEAN NOT NULL DEFAULT true,
            creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
            CONSTRAINT chk_estado_testimonio CHECK (
                estado IN ('PENDIENTE', 'APROBADO', 'DESTACADO', 'RECHAZADO')
            )
        );
        """)
    )

    # 2. Índices de rendimiento y búsqueda
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_testimonios_estado
        ON participacion_ciudadana.testimonios_comunitarios (estado) WHERE activo = true;
        """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_testimonios_territorio
        ON participacion_ciudadana.testimonios_comunitarios (territorio_id);
        """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_testimonios_dimension
        ON participacion_ciudadana.testimonios_comunitarios (dimension_id);
        """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_testimonios_fecha
        ON participacion_ciudadana.testimonios_comunitarios (creado_en DESC);
        """)
    )

    # 3. Semillas oficiales distritales de memoria social de Cartagena
    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.testimonios_comunitarios (
            codigo_unico, nombre_autor, organizacion_comunitaria, territorio_id,
            dimension_id, titulo, relato, url_foto, metadatos_enfoque, estado
        )
        SELECT
            'TEST-001',
            'Ana Rosa Gómez',
            'Junta de Acción Comunal Sector 19 de Febrero - El Pozón',
            t.id,
            d.id,
            'Nuestros jóvenes son semillas de paz y talento',
            'Durante más de quince años hemos padecido las inundaciones del canal y el estigma de la violencia juvenil. Con esta política pública de seguridad humana, por primera vez sentimos que los jóvenes del barrio no son vistos como un peligro sino como sujetos de derechos con talento deportivo y cultural.',
            '/fotos/testimonios/ana_rosa_el_pozon.webp',
            '{"grupo_poblacional": "mujeres_lideresas", "sector": "El Pozón Central", "etnia": "afrodescendiente"}'::jsonb,
            'DESTACADO'
        FROM geodatos.territorios t
        CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
        WHERE t.codigo = 'BARRIO-POZON' AND d.codigo = 'comunitaria'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.testimonios_comunitarios (
            codigo_unico, nombre_autor, organizacion_comunitaria, territorio_id,
            dimension_id, titulo, relato, url_foto, metadatos_enfoque, estado
        )
        SELECT
            'TEST-002',
            'Dionisio Miranda',
            'Consejo Comunitario de Comunidades Negras de La Boquilla',
            t.id,
            d.id,
            'El manglar es la vida de nuestros ancestros y el sustento de la ciénaga',
            'El manglar es nuestra vida y la ciénaga nuestro sustento. La consulta previa no es un obstáculo para la ciudad, es la garantía de que nuestros nietos sigan comiendo del sábalo y la jaiba mientras protegemos la barrera natural contra el cambio climático.',
            '/fotos/testimonios/dionisio_la_boquilla.webp',
            '{"grupo_poblacional": "pescadores_artesanales", "etnia": "afrocolombiano", "consejo": "La Boquilla"}'::jsonb,
            'APROBADO'
        FROM geodatos.territorios t
        CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
        WHERE t.codigo = 'CORR-BOQUILLA' AND d.codigo = 'ambiental'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.testimonios_comunitarios (
            codigo_unico, nombre_autor, organizacion_comunitaria, territorio_id,
            dimension_id, titulo, relato, url_foto, metadatos_enfoque, estado
        )
        SELECT
            'TEST-003',
            'Yorledis Berrío',
            'Colectivo Femenino Tejiendo Esperanza - Nelson Mandela',
            t.id,
            d.id,
            'Tejiendo soberanía alimentaria desde el destierro',
            'Llegamos a Cartagena desplazadas por el conflicto armado y construimos nuestros techos con barro y tablas. Hoy le pedimos a la Alcaldía y al Concejo que el banco de proyectos apoye nuestros emprendimientos de economía popular y comedores comunitarios.',
            '/fotos/testimonios/yorledis_mandela.webp',
            '{"grupo_poblacional": "victimas_conflicto", "ley_1448": true, "genero": "mujer_cabeza_hogar"}'::jsonb,
            'APROBADO'
        FROM geodatos.territorios t
        CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
        WHERE t.codigo = 'BARRIO-MANDELA' AND d.codigo = 'economica'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.testimonios_comunitarios (
            codigo_unico, nombre_autor, organizacion_comunitaria, territorio_id,
            dimension_id, titulo, relato, url_foto, metadatos_enfoque, estado
        )
        SELECT
            'TEST-004',
            'Carlos Mario Morales',
            'Asociación de Vecinos y Amigos de Getsemaní',
            t.id,
            d.id,
            'Turismo responsable que conviva con la gente del barrio',
            'Queremos turismo, pero queremos un turismo respetuoso de la identidad barrial y los residentes tradicionales. La seguridad humana debe cuidar al visitante pero sin expulsar a las familias que le dan alma al barrio.',
            '/fotos/testimonios/carlos_getsemani.webp',
            '{"sector_economico": "comercio_local", "patrimonio": "conservacion_cultural"}'::jsonb,
            'PENDIENTE'
        FROM geodatos.territorios t
        CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
        WHERE t.codigo = 'BARRIO-GETSEMANI' AND d.codigo = 'comunitaria'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    # 4. Asignar permiso testimonios:moderar a autoridad_distrital y facilitador_mesa
    op.execute(
        text("""
        UPDATE autenticacion.roles
        SET permisos = permisos || CAST(:permiso AS jsonb)
        WHERE codigo IN ('autoridad_distrital', 'facilitador_mesa')
          AND NOT permisos @> CAST(:permiso AS jsonb);
        """).bindparams(permiso=json.dumps(["testimonios:moderar"]))
    )


def downgrade() -> None:
    op.execute(
        text("""
        DROP TABLE IF EXISTS participacion_ciudadana.testimonios_comunitarios CASCADE;
        """)
    )
    op.execute(
        text("""
        UPDATE autenticacion.roles
        SET permisos = permisos - 'testimonios:moderar'
        WHERE codigo IN ('autoridad_distrital', 'facilitador_mesa');
        """)
    )
