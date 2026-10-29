"""Sincronizar las 35 mesas oficiales de trabajo y metas de convocatoria.

Revision ID: 0088_sincronizar_35_mesas
Revises: 0087_cronograma_diagnostico
Create Date: 2026-10-28
"""

from alembic import op

revision = "0088_sincronizar_35_mesas"
down_revision = "0087_cronograma_diagnostico"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    # 1. Retirar agendas y mesas rurales excedentes para consolidar el censo oficial de 11 rurales
    bind.exec_driver_sql("DELETE FROM mesas_trabajo.agendas WHERE id IN ('mr-012', 'mr-013', 'mr-014', 'mr-015');")
    bind.exec_driver_sql(
        "DELETE FROM mesas_trabajo.mesas WHERE codigo_oficial IN ('MR-ISL-12', 'MR-ISL-13', 'MR-ISL-14', 'MR-RUR-15');"
    )

    # Actualizar aforo y dimensión de: MT-L01-01 (Mesa Territorial Localidad Histórica y del Caribe Norte)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 350,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 350, "meta_maxima": 420, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Instituto de Patrimonio y Cultura de Cartagena (IPCC); Secretaría de Participación y Desarrollo Social (SPD/UMATA) (+5 más; ver hoja Detalle)", "otras_dimensiones": "Personal; Económica", "total_actores": 19, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MT-L01-01';
    """)
    # Actualizar aforo y dimensión de: MT-L02-01 (Mesa Territorial Localidad De La Virgen y Turística)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 400,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 400, "meta_maxima": 480, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Secretaría de Turismo (+3 más; ver hoja Detalle)", "otras_dimensiones": "Económica; Personal", "total_actores": 18, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MT-L02-01';
    """)
    # Actualizar aforo y dimensión de: MT-L03-01 (Mesa Territorial Localidad Industrial y de la Bahía)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 350,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 350, "meta_maxima": 420, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+3 más; ver hoja Detalle)", "otras_dimensiones": "Económica; Personal", "total_actores": 17, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MT-L03-01';
    """)
    # Actualizar aforo y dimensión de: MR-RUR-01 (Mesa Rural La Boquilla)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 60,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 60, "meta_maxima": 75, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 12, "eje_crisis_actores": 4}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-RUR-01';
    """)
    # Actualizar aforo y dimensión de: MR-RUR-02 (Mesa Rural Arroyo de Piedra)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 25,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 25, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 12, "eje_crisis_actores": 4}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-RUR-02';
    """)
    # Actualizar aforo y dimensión de: MR-RUR-03 (Mesa Rural Punta Canoa)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 20,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 20, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 12, "eje_crisis_actores": 4}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-RUR-03';
    """)
    # Actualizar aforo y dimensión de: MR-RUR-04 (Mesa Rural Bayunca)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 65,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 65, "meta_maxima": 90, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 11, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-RUR-04';
    """)
    # Actualizar aforo y dimensión de: MR-RUR-05 (Mesa Rural Pasacaballos)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 50,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 50, "meta_maxima": 60, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+2 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 12, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-RUR-05';
    """)
    # Actualizar aforo y dimensión de: MR-RUR-06 (Mesa Rural Arroyo Grande)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 25,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 25, "meta_maxima": 30, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 11, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-RUR-06';
    """)
    # Actualizar aforo y dimensión de: MR-ISL-07 (Mesa Insular Santa Ana)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 30, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+2 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 16, "eje_crisis_actores": 6}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-ISL-07';
    """)
    # Actualizar aforo y dimensión de: MR-ISL-08 (Mesa Insular Tierra Bomba)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 15, "eje_crisis_actores": 6}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-ISL-08';
    """)
    # Actualizar aforo y dimensión de: MR-ISL-09 (Mesa Insular Bocachica)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 15, "eje_crisis_actores": 6}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-ISL-09';
    """)
    # Actualizar aforo y dimensión de: MR-ISL-10 (Mesa Insular Isla del Rosario)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 20,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 20, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 15, "eje_crisis_actores": 6}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-ISL-10';
    """)
    # Actualizar aforo y dimensión de: MR-ISL-11 (Mesa Insular Isla Fuerte)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 25,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 25, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Ambiental", "total_actores": 15, "eje_crisis_actores": 6}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MR-ISL-11';
    """)
    # Actualizar aforo y dimensión de: MP-POB-01 (Mesa Poblacional de Adulto Mayor)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 65,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 65, "meta_maxima": 80, "actores_clave": "Instituto Distrital de Deporte y Recreación (IDER); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociación de Adultos Mayores de Cartagena", "otras_dimensiones": "Personal", "total_actores": 7, "eje_crisis_actores": 1}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-01';
    """)
    # Actualizar aforo y dimensión de: MP-POB-02 (Mesa Poblacional de Infancia y Adolescencia)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 75,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'personal' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 75, "meta_maxima": 90, "actores_clave": "Secretaría de Educación Distrital (SED); Comisarías de Familia; Fundación Renacer; ICBF - Centro Zonal Cartagena", "otras_dimensiones": "Alimentaria; Comunitaria", "total_actores": 8, "eje_crisis_actores": 1}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-02';
    """)
    # Actualizar aforo y dimensión de: MP-POB-03 (Mesa Poblacional LGTBIQ+)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 40,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 40, "meta_maxima": 45, "actores_clave": "Secretaría de Participación y Desarrollo Social (SPD/UMATA); Organización derecho a resistir", "otras_dimensiones": "Personal; Política", "total_actores": 7, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-03';
    """)
    # Actualizar aforo y dimensión de: MP-POB-04 (Mesa Poblacional de Personas con Discapacidad)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 45,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 45, "meta_maxima": 50, "actores_clave": "Instituto Distrital de Deporte y Recreación (IDER); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociación de Personas con Discapacidad de Cartagena", "otras_dimensiones": "Política", "total_actores": 6, "eje_crisis_actores": 1}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-04';
    """)
    # Actualizar aforo y dimensión de: MP-POB-05 (Mesa Poblacional de Juventudes)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 80,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 80, "meta_maxima": 95, "actores_clave": "Escuela de Gobierno y Liderazgo; Instituto Distrital de Deporte y Recreación (IDER); Corporación Jóvenes por la Paz; Plataforma de Juventudes de Cartagena (+1 más; ver hoja Detalle)", "otras_dimensiones": "Personal; Económica", "total_actores": 10, "eje_crisis_actores": 1}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-05';
    """)
    # Actualizar aforo y dimensión de: MP-POB-06 (Mesa Poblacional de Mujeres y Equidad de Género)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 100,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'personal' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 100, "meta_maxima": 125, "actores_clave": "Secretaría de Participación y Desarrollo Social (SPD/UMATA); Casa de la Mujer (violeta); Comisarías de Familia; Corporación Mujeres Tejiendo Paz (+2 más; ver hoja Detalle)", "otras_dimensiones": "Comunitaria", "total_actores": 11, "eje_crisis_actores": 3}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-06';
    """)
    # Actualizar aforo y dimensión de: MP-POB-07 (Mesa Poblacional de Víctimas del Conflicto Armado)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 60,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'politica' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 60, "meta_maxima": 70, "actores_clave": "Defensoría del Pueblo (Regional Bolívar); Fundación Juan Luis Londoño; Mesa de Víctimas de Cartagena; Personería Distrital (+1 más; ver hoja Detalle)", "otras_dimensiones": "Comunitaria; Personal", "total_actores": 10, "eje_crisis_actores": 4}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-POB-07';
    """)
    # Actualizar aforo y dimensión de: MP-ETN-08 (Mesa Poblacional Étnica: Consejos Comunitarios y Cabildos)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 80,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 80, "meta_maxima": 100, "actores_clave": "Consejo Comunitario de la Comunidad Negra de Pasacaballos; Consejo Comunitario de la Comunidad Negra de la Isla de Barú; Red de Jóvenes Afrodescendientes de Cartagena", "otras_dimensiones": "—", "total_actores": 8, "eje_crisis_actores": 2}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MP-ETN-08';
    """)
    # Nueva mesa: Mesa Poblacional de Migrantes y Refugiados
    bind.exec_driver_sql("""
        INSERT INTO mesas_trabajo.mesas (
            id, codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug,
            nombre, tipo_mesa, territorio_id, lugar_nombre, modalidad,
            horario, estado, aforo_maximo, total_asistentes, dimension_id, metadatos
        ) VALUES (
            '01a0f5fe-86e2-7209-9001-000000000009', 'MP-POB-09', 'MP109',
            'csh.mp.migrantes'::ltree, 'mesa-poblacional-migrantes-refugiados', 'Mesa Poblacional de Migrantes y Refugiados', 'POBLACIONAL',
            (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1' LIMIT 1),
            'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA',
            55, 0,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'personal' LIMIT 1),
            '{"meta_personas": 55, "meta_maxima": 65, "actores_clave": "ACNUR - Agencia de la ONU para los Refugiados; Asociación de Venezolanos en Cartagena (AVEC); Fundación Colombia Somos Todos; Migración Colombia (Regional Bolívar) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Política; Comunitaria", "total_actores": 10, "eje_crisis_actores": 3}'::jsonb
        ) ON CONFLICT (codigo_oficial) DO UPDATE SET
            aforo_maximo = EXCLUDED.aforo_maximo,
            dimension_id = EXCLUDED.dimension_id,
            metadatos = EXCLUDED.metadatos;
    """)
    # Actualizar aforo y dimensión de: MS-SEC-01 (Mesa Sectorial de Cultura y Patrimonio Histórico)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Escuela Taller de Cartagena de Indias (ETCAR); Instituto de Patrimonio y Cultura de Cartagena (IPCC); Universidad de Bellas Artes", "otras_dimensiones": "Económica", "total_actores": 6, "eje_crisis_actores": 0}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-01';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-02 (Mesa Sectorial de Deporte y Recreación)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Instituto Distrital de Deporte y Recreación (IDER)", "otras_dimensiones": "Salud y sanitaria", "total_actores": 6, "eje_crisis_actores": 0}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-02';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-03 (Mesa Sectorial de Salud Pública y Red Hospitalaria)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'salud' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Departamento Administrativo Distrital de Salud (DADIS); Universidad del Sinú", "otras_dimensiones": "—", "total_actores": 6, "eje_crisis_actores": 1}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-03';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-04 (Mesa Sectorial de Educación y Cobertura)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 35,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 35, "meta_maxima": 40, "actores_clave": "Escuela Taller de Cartagena de Indias (ETCAR); Institución Universitaria Mayor de Cartagena (Colmayor); Secretaría de Educación Distrital (SED); SENA - Regional Bolívar (+2 más; ver hoja Detalle)", "otras_dimensiones": "Económica", "total_actores": 15, "eje_crisis_actores": 0}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-04';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-05 (Mesa Sectorial de Movilidad, Transporte y Espacio Público)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 30,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'economica' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Departamento Administrativo de Tránsito y Transporte (DATT); Gerencia de Espacio Público y Movilidad (GEPM); Transcaribe S.A.; Asociación de Trabajadores Informales de Cartagena (+1 más; ver hoja Detalle)", "otras_dimensiones": "Personal", "total_actores": 8, "eje_crisis_actores": 2}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-05';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-06 (Mesa Sectorial de Servicios Públicos, Infraestructura y Vivienda)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 35,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'ambiental' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 35, "meta_maxima": 40, "actores_clave": "Corvivienda; Secretaría General (Oficina de Servicios Públicos - Oficina Asesora Informática); Secretaría de Infraestructura; Líderes de Islas (Tierra Bomba, Barú, etc) (+1 más; ver hoja Detalle)", "otras_dimensiones": "Económica; Comunitaria", "total_actores": 11, "eje_crisis_actores": 1}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-06';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-07 (Mesa Sectorial de Seguridad Integral y Convivencia Ciudadana)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 40,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'personal' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 40, "meta_maxima": 50, "actores_clave": "Departamento Administrativo de Tránsito y Transporte (DATT); Distriseguridad; Secretaría de Interior y Convivencia Ciudadana (SICC); Asociación de Comerciantes del Centro Histórico (+20 más; ver hoja Detalle)", "otras_dimensiones": "—", "total_actores": 38, "eje_crisis_actores": 6}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-07';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-08 (Mesa Sectorial de Medio Ambiente, Ciénaga de la Virgen y Gestión del Riesgo)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 40,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'ambiental' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 40, "meta_maxima": 50, "actores_clave": "CARDIQUE; Corvivienda; Cuerpo Oficial de Bomberos; EPA Cartagena; Oficina Asesora para la Gestión del Riesgo y Desastres - OAGRD (+11 más; ver hoja Detalle)", "otras_dimensiones": "Política", "total_actores": 24, "eje_crisis_actores": 12}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-08';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-09 (Mesa Sectorial de Desarrollo Económico, Turismo Sostenible y Competitividad)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 40,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'economica' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 40, "meta_maxima": 50, "actores_clave": "Corvivienda; Escuela Taller de Cartagena de Indias (ETCAR); Gerencia de Espacio Público y Movilidad (GEPM); Institución Universitaria Mayor de Cartagena (Colmayor) (+17 más; ver hoja Detalle)", "otras_dimensiones": "—", "total_actores": 28, "eje_crisis_actores": 0}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-09';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-10 (Mesa Sectorial de Transparencia, Veeduría y Cultura Ciudadana)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 45,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'politica' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 45, "meta_maxima": 55, "actores_clave": "Secretaría General (Oficina de Servicios Públicos - Oficina Asesora Informática); Secretaría de Planeación Distrital; ACNUR - Agencia de la ONU para los Refugiados; Caracol Radio - Cartagena (+19 más; ver hoja Detalle)", "otras_dimensiones": "—", "total_actores": 35, "eje_crisis_actores": 2}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-10';
    """)
    # Actualizar aforo y dimensión de: MS-SEC-11 (Mesa Sectorial de Construcción de Paz y Reconciliación)
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = 35,
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'politica' LIMIT 1),
            metadatos = metadatos || '{"meta_personas": 35, "meta_maxima": 45, "actores_clave": "ACNUR - Agencia de la ONU para los Refugiados; Corporación Jóvenes por la Paz; Corporación Mujeres Tejiendo Paz; Defensoría del Pueblo (Regional Bolívar) (+7 más; ver hoja Detalle)", "otras_dimensiones": "Personal; Comunitaria", "total_actores": 17, "eje_crisis_actores": 2}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = 'MS-SEC-11';
    """)
    # Nueva mesa: Mesa Sectorial de Seguridad Alimentaria y Soberanía Nutricional
    bind.exec_driver_sql("""
        INSERT INTO mesas_trabajo.mesas (
            id, codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug,
            nombre, tipo_mesa, territorio_id, lugar_nombre, modalidad,
            horario, estado, aforo_maximo, total_asistentes, dimension_id, metadatos
        ) VALUES (
            '01a0f5fe-86e5-7ff9-a971-000000000012', 'MS-SEC-12', 'MS112',
            'csh.ms.alimentaria'::ltree, 'mesa-sectorial-seguridad-alimentaria', 'Mesa Sectorial de Seguridad Alimentaria y Soberanía Nutricional', 'SECTORIAL',
            (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-1' LIMIT 1),
            'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA',
            30, 0,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'alimentaria' LIMIT 1),
            '{"meta_personas": 30, "meta_maxima": 35, "actores_clave": "Secretaría de Educación Distrital (SED)", "otras_dimensiones": "—", "total_actores": 5, "eje_crisis_actores": 0}'::jsonb
        ) ON CONFLICT (codigo_oficial) DO UPDATE SET
            aforo_maximo = EXCLUDED.aforo_maximo,
            dimension_id = EXCLUDED.dimension_id,
            metadatos = EXCLUDED.metadatos;
    """)

    # 2. Insertar agendas correspondientes a las 2 nuevas mesas
    bind.exec_driver_sql("""
        INSERT INTO mesas_trabajo.agendas (
            id, tipo, nombre, territorio, lugar, fecha, hora_inicio, hora_fin,
            estado, dimensiones_onu, responsable, observaciones, mesa_id
        ) VALUES (
            'mp-009', 'poblacional', 'Mesa Poblacional de Migrantes y Refugiados',
            'Distrito de Cartagena', 'Por definir', DATE '2026-11-20', '08:30', '12:00',
            'programada', '["Seguridad Personal", "Seguridad Política", "Seguridad Comunitaria"]'::jsonb,
            'Gerencia de Fronteras y Cooperación Internacional',
            'Mesa poblacional focalizada en población migrante, retornada y refugiada en Cartagena.',
            '01a0f5fe-86e2-7209-9001-000000000009'
        ) ON CONFLICT (id) DO NOTHING;
    """)
    bind.exec_driver_sql("""
        INSERT INTO mesas_trabajo.agendas (
            id, tipo, nombre, territorio, lugar, fecha, hora_inicio, hora_fin,
            estado, dimensiones_onu, responsable, observaciones, mesa_id
        ) VALUES (
            'ms-012', 'sectorial', 'Mesa Sectorial de Seguridad Alimentaria y Soberanía Nutricional',
            'Distrito de Cartagena', 'Por definir', DATE '2026-11-27', '08:30', '12:00',
            'programada', '["Seguridad Alimentaria"]'::jsonb,
            'Secretaría de Participación y Desarrollo Social (SPD/UMATA) / PES-PR',
            'Mesa sectorial articulada a comedores comunitarios, PAE y abastecimiento nutricional.',
            '01a0f5fe-86e5-7ff9-a971-000000000012'
        ) ON CONFLICT (id) DO NOTHING;
    """)


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("DELETE FROM mesas_trabajo.agendas WHERE id IN ('mp-009', 'ms-012');")
    bind.exec_driver_sql("DELETE FROM mesas_trabajo.mesas WHERE codigo_oficial IN ('MP-POB-09', 'MS-SEC-12');")
