"""Participación multicanal y escenarios especiales de co-creación.

Revision ID: 0023_asistencia_multicanal
Revises: 0022_merge_identidad_actas
Create Date: 2026-10-01 16:05:00
"""

from sqlalchemy import text

from alembic import op

revision = "0023_asistencia_multicanal"
down_revision = "0022_merge_identidad_actas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Crear tabla escenarios_especiales en participacion_ciudadana
    op.execute(
        text("""
        CREATE TABLE IF NOT EXISTS participacion_ciudadana.escenarios_especiales (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo_unico VARCHAR(50) NOT NULL UNIQUE,
            nombre VARCHAR(250) NOT NULL,
            tipo_escenario VARCHAR(100) NOT NULL,
            territorio_id UUID REFERENCES geodatos.territorios(id) ON DELETE SET NULL,
            fecha DATE NOT NULL,
            lugar VARCHAR(250) NOT NULL,
            entidad_convocante VARCHAR(150) NOT NULL,
            total_asistentes INTEGER NOT NULL DEFAULT 0,
            desglose_poblacional JSONB NOT NULL DEFAULT '{}'::jsonb,
            sintesis_acuerdos TEXT,
            url_evidencia VARCHAR(500),
            estado VARCHAR(50) NOT NULL DEFAULT 'REALIZADO',
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
        """)
    )

    # 2. Índices para escenarios_especiales
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_escenarios_tipo
        ON participacion_ciudadana.escenarios_especiales (tipo_escenario);
        """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_escenarios_fecha
        ON participacion_ciudadana.escenarios_especiales (fecha);
        """)
    )
    op.execute(
        text("""
        CREATE INDEX IF NOT EXISTS idx_escenarios_territorio
        ON participacion_ciudadana.escenarios_especiales (territorio_id);
        """)
    )

    # 3. Semillas oficiales de Cartagena
    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.escenarios_especiales (
            codigo_unico, nombre, tipo_escenario, territorio_id, fecha, lugar,
            entidad_convocante, total_asistentes, desglose_poblacional, sintesis_acuerdos, estado
        )
        SELECT
            'ESC-001',
            'Consulta Previa Étnica - Consejo Comunitario de La Boquilla',
            'CONSULTA_PREVIA',
            t.id,
            '2026-08-15',
            'I.E. Técnica de La Boquilla - Salón Comunitario',
            'Alcaldía Mayor de Cartagena - Secretaría del Interior',
            150,
            '{"afrocolombianos": 150, "mujeres": 85, "jovenes": 42, "pescadores_artesanales": 55, "victimas": 34}'::jsonb,
            'Garantías y acuerdos para la protección del ecosistema manglar, salvaguardas de la pesca tradicional y equipamiento comunitario.',
            'REALIZADO'
        FROM geodatos.territorios t
        WHERE t.codigo = 'CORR-BOQUILLA'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.escenarios_especiales (
            codigo_unico, nombre, tipo_escenario, territorio_id, fecha, lugar,
            entidad_convocante, total_asistentes, desglose_poblacional, sintesis_acuerdos, estado
        )
        SELECT
            'ESC-002',
            'Taller Focal: Prevención ESCNNA y Violencia Juvenil en El Pozón',
            'TALLER_FOCAL',
            t.id,
            '2026-09-10',
            'Casa de Cultura y Juventudes El Pozón',
            'Secretaría de Participación y Desarrollo Social',
            120,
            '{"jovenes_14_28": 120, "mujeres": 70, "en_riesgo": 35, "victimas": 28}'::jsonb,
            'Estrategias de ocupación del tiempo libre, frentes barriales de paz y red de apoyo psicosocial comunitario.',
            'REALIZADO'
        FROM geodatos.territorios t
        WHERE t.codigo = 'BARRIO-POZON'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    op.execute(
        text("""
        INSERT INTO participacion_ciudadana.escenarios_especiales (
            codigo_unico, nombre, tipo_escenario, territorio_id, fecha, lugar,
            entidad_convocante, total_asistentes, desglose_poblacional, sintesis_acuerdos, estado
        )
        SELECT
            'ESC-003',
            'Foro de Reactivación, Seguridad Turística y Competitividad',
            'FORO_GREMIAL',
            t.id,
            '2026-09-28',
            'Centro de Convenciones Julio César Turbay Ayala - Salón Barahona',
            'Corpoturismo / Cámara de Comercio de Cartagena / ANDI',
            300,
            '{"gremios": 150, "academia": 50, "operadores_turisticos": 100}'::jsonb,
            'Compromisos de frente común empresarial para la seguridad en Centro Histórico, Getsemaní y corredores portuarios.',
            'REALIZADO'
        FROM geodatos.territorios t
        WHERE t.codigo = 'BARRIO-CENTRO'
        ON CONFLICT (codigo_unico) DO NOTHING;
        """)
    )

    # 4. Los roles autoridad_distrital y facilitador_mesa ya cuentan con el permiso asistencia:verificar
    pass


def downgrade() -> None:
    op.execute(
        text("""
        DROP TABLE IF EXISTS participacion_ciudadana.escenarios_especiales CASCADE;
        """)
    )
