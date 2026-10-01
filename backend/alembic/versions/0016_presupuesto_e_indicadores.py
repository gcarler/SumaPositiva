"""Presupuesto e indicadores.

Revision ID: 0016_presupuesto_e_indicadores
Revises: 0015_poligonos_geovisor
Create Date: 2026-10-01 14:09:00.000000
"""

from alembic import op

revision = "0016_presupuesto_e_indicadores"
down_revision = "0015_poligonos_geovisor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS presupuesto;")
    op.execute("CREATE SCHEMA IF NOT EXISTS indicadores;")

    # 2. Tablas Presupuesto
    op.execute("""
        CREATE TABLE IF NOT EXISTS presupuesto.fuentes_financiacion (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo VARCHAR(50) UNIQUE NOT NULL,
            nombre VARCHAR(200) NOT NULL,
            tipo_fuente VARCHAR(50) NOT NULL,
            base_legal VARCHAR(250) NOT NULL,
            descripcion TEXT,
            activa BOOLEAN DEFAULT TRUE NOT NULL,
            metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_fuentes_codigo ON presupuesto.fuentes_financiacion (codigo);"
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS presupuesto.asignaciones_presupuestales (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            fuente_financiacion_id UUID NOT NULL REFERENCES presupuesto.fuentes_financiacion(id) ON DELETE RESTRICT,
            linea_estrategica_id UUID NULL REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE SET NULL,
            nodo_instrumento_id UUID NULL,
            monto_estimado NUMERIC(16, 2) NOT NULL,
            anio_vigencia INTEGER NOT NULL,
            es_vigencia_futura BOOLEAN NOT NULL DEFAULT FALSE,
            tipo_vigencia_futura VARCHAR(50) NULL,
            codigo_bpin VARCHAR(100) NULL,
            justificacion TEXT NOT NULL,
            metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_asignaciones_fuente ON presupuesto.asignaciones_presupuestales (fuente_financiacion_id);"
    )

    # 3. Tablas Indicadores
    op.execute("""
        CREATE TABLE IF NOT EXISTS indicadores.fichas_tecnicas_indicadores (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo VARCHAR(100) UNIQUE NOT NULL,
            nombre VARCHAR(250) NOT NULL,
            tipo_indicador VARCHAR(50) NOT NULL CHECK(tipo_indicador IN ('insumo', 'producto', 'resultado', 'impacto')),
            linea_estrategica_id UUID NULL REFERENCES motor_politicas.lineas_estrategicas(id) ON DELETE SET NULL,
            dimension_id UUID NULL REFERENCES motor_politicas.dimensiones_seguridad_humana(id) ON DELETE SET NULL,
            nodo_instrumento_id UUID NULL,
            definicion TEXT NOT NULL,
            metodo_calculo TEXT NOT NULL,
            unidad_medida VARCHAR(50) NOT NULL,
            sentido_esperado VARCHAR(20) DEFAULT 'ascendente' NOT NULL,
            periodicidad VARCHAR(50) NOT NULL,
            linea_base_valor NUMERIC(14, 4) NOT NULL,
            linea_base_anio INTEGER NOT NULL,
            meta_cuatrienio NUMERIC(14, 4) NOT NULL,
            meta_anualizada JSONB NOT NULL DEFAULT '{}'::jsonb,
            valor_actual NUMERIC(14, 4) DEFAULT 0 NOT NULL,
            porcentaje_avance NUMERIC(6, 2) DEFAULT 0.00 NOT NULL,
            fuente_datos VARCHAR(250) NOT NULL,
            responsable_reporte VARCHAR(250) NOT NULL,
            metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_fichas_codigo ON indicadores.fichas_tecnicas_indicadores (codigo);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_fichas_tipo ON indicadores.fichas_tecnicas_indicadores (tipo_indicador);"
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS indicadores.mediciones_indicador (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            indicador_id UUID NOT NULL REFERENCES indicadores.fichas_tecnicas_indicadores(id) ON DELETE CASCADE,
            periodo VARCHAR(20) NOT NULL,
            fecha_corte DATE NOT NULL,
            valor_medido NUMERIC(14, 4) NOT NULL,
            avance_acumulado NUMERIC(6, 2) NOT NULL,
            observaciones TEXT NULL,
            evidencia_documental_url VARCHAR(500) NULL,
            registrado_por VARCHAR(150) NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_mediciones_indicador ON indicadores.mediciones_indicador (indicador_id);"
    )

    # 4. Semillas Presupuesto
    op.execute("""
        INSERT INTO presupuesto.fuentes_financiacion (codigo, nombre, tipo_fuente, base_legal, descripcion) VALUES
        ('FONSET', 'Fondo Territorial de Seguridad y Convivencia Ciudadana', 'TRIBUTARIA_DESTINACION_ESPECIFICA', 'Ley 418 de 1997, Ley 2272 de 2022', 'Recursos recaudados por contribución del 5% en contratos de obra pública para inversión en seguridad.'),
        ('SGP-PROPOSITO-GENERAL', 'Sistema General de Participaciones - Propósito General', 'TRANSFERENCIA_NACION', 'Ley 715 de 2001', 'Transferencias de la nación de libre destinación parcial para municipios.'),
        ('SGR-ASIGNACIONES-DIRECTAS', 'Sistema General de Regalías - Asignaciones Directas', 'REGALIAS', 'Ley 2056 de 2020', 'Recursos derivados de explotación de recursos naturales no renovables.'),
        ('PRESUPUESTO-PARTICIPATIVO', 'Presupuesto Participativo (Acuerdos Ciudadanos)', 'RECURSOS_PROPIOS_INVERSION', 'Ley Estatutaria 1757 de 2015', 'Porción del presupuesto distrital concertada obligatoriamente con la ciudadanía.'),
        ('ICLD', 'Ingresos Corrientes de Libre Destinación', 'RECURSOS_PROPIOS', 'Ley 617 de 2000', 'Recursos propios tributarios sin destinación específica predeterminada.')
        ON CONFLICT (codigo) DO NOTHING;
    """)

    # 5. Semillas Indicadores
    op.execute("""
        INSERT INTO indicadores.fichas_tecnicas_indicadores (
            codigo, nombre, tipo_indicador, definicion, metodo_calculo, unidad_medida, sentido_esperado, periodicidad,
            linea_base_valor, linea_base_anio, meta_cuatrienio, fuente_datos, responsable_reporte
        ) VALUES 
        ('IND-INS-01', 'Presupuesto FONSET asignado a programas de convivencia', 'insumo', 'Total de recursos FONSET destinados', '(Presupuesto FONSET apropiado para programas MGA)', 'Pesos', 'ascendente', 'Anual', 1000000000, 2023, 4000000000, 'CHIP - DNP', 'Secretaría de Hacienda'),
        ('IND-INS-02', 'Cámaras de seguridad en mantenimiento', 'insumo', 'Inversión en cámaras de circuito cerrado', '(Inversión anual en mantenimiento LPR)', 'Pesos', 'ascendente', 'Anual', 500000000, 2023, 2000000000, 'Secotic', 'Secretaría del Interior'),
        ('IND-PROD-01', 'Número de frentes locales de seguridad conformados', 'producto', 'Total de frentes apoyados formalmente', '(Suma de frentes activos)', 'Unidades', 'ascendente', 'Semestral', 45, 2023, 100, 'Policía MEBAR', 'Distriseguridad'),
        ('IND-PROD-02', 'Luminarias instaladas en puntos críticos', 'producto', 'Expansión de alumbrado público en zonas de miedo', '(Nuevas luminarias LED instaladas)', 'Luminarias', 'ascendente', 'Trimestral', 1200, 2023, 6000, 'Concesión Alumbrado', 'Secretaría General'),
        ('IND-PROD-03', 'Jóvenes capacitados en habilidades tecnológicas', 'producto', 'Prevención social mediante oportunidades TIC', '(Número de jóvenes certificados)', 'Personas', 'ascendente', 'Semestral', 500, 2023, 3000, 'Secotic', 'Secretaría de Participación'),
        ('IND-RES-01', 'Tasa de Homicidios por cada 100.000 habitantes', 'resultado', 'Impacto en la reducción de muertes violentas', '(Número de homicidios / Población DANE) * 100.000', 'Tasa', 'descendente', 'Mensual', 32.5, 2023, 25.0, 'Medicina Legal / Policía', 'Observatorio del Delito'),
        ('IND-RES-02', 'Tasa de hurtos a personas denunciados', 'resultado', 'Variación en delitos patrimoniales', '(Número de hurtos / Población DANE) * 100.000', 'Tasa', 'descendente', 'Mensual', 450.2, 2023, 300.0, 'SIEDCO - PONAL', 'Secretaría del Interior'),
        ('IND-RES-03', 'Percepción de Inseguridad en barrios priorizados', 'resultado', 'Sentimiento ciudadano sobre seguridad local', '(Porcentaje encuestados inseguros / Total encuestados) * 100', 'Porcentaje', 'descendente', 'Anual', 78.4, 2023, 60.0, 'Encuesta Cartagena Cómo Vamos', 'Secretaría del Interior')
        ON CONFLICT (codigo) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS indicadores.mediciones_indicador CASCADE;")
    op.execute("DROP TABLE IF EXISTS indicadores.fichas_tecnicas_indicadores CASCADE;")
    op.execute("DROP TABLE IF EXISTS presupuesto.asignaciones_presupuestales CASCADE;")
    op.execute("DROP TABLE IF EXISTS presupuesto.fuentes_financiacion CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS indicadores CASCADE;")
    op.execute("DROP SCHEMA IF EXISTS presupuesto CASCADE;")
