"""Sembrar por sí sola el censo canónico de 35 mesas de trabajo (H-05).

Las migraciones anteriores solo corrigen sobre el censo históric o que ya
venía en la base de operación: 0013/0050 sembran catálogos complementarios,
0066 agrega corregimientos y 0088 sincroniza. En una base recién migrada la
cadena dejaba 36 agendas con solo 2 mesas (las nuevas de 0088) y sin
vinculación mesa_id, con lo que la prueba H-05 quedaba roja. Esta revisión
siembra por sí sola el censo canónico definitivo — 3 territoriales, 11
rurales-insulares, 9 poblacionales y 12 sectoriales, es decir 35 mesas —
con el catálogo fijado por el censo oficial y vincula 1:1 cada agenda con
su mesa; la plenaria pc-001 permanece sin mesa. Es idempotente: sobre bases
que ya tienen el censo, el ON CONFLICT por codigo_oficial reafirma los
valores del catálogo sin tocar datos de sucesos (total_asistentes) ni
registros dependientes.

Revision ID: 0095_sembrar_censo_35_mesas
Revises: 0094_herald_salud_resumen
Create Date: 2026-11-04
"""

from alembic import op

revision = "0095_sembrar_censo_35_mesas"
down_revision = "0094_herald_salud_resumen"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Siembra del censo canónico por clave de negocio codigo_oficial.
    bind.exec_driver_sql("""
        INSERT INTO mesas_trabajo.mesas (
            id, codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug,
            nombre, tipo_mesa, territorio_id, lugar_nombre, modalidad,
            horario, estado, aforo_maximo, total_asistentes, dimension_id, metadatos
        )
        SELECT
            c.id::uuid, c.codigo_oficial, c.shortcode_ciudadano, c.ruta_jerarquica, c.slug,
            c.nombre, c.tipo_mesa, t.id, c.lugar_nombre, c.modalidad,
            c.horario, c.estado, c.aforo_maximo, 0, d.id, c.metadatos::jsonb
        FROM (VALUES
            ('01a0f5fe-86e3-7bca-a222-69ddd0da41f4', 'MP-ETN-08', 'MP108', 'csh.mp.etnica'::ltree, 'mesa-etnica-afro-indigena', 'Mesa Étnica: Consejos Comunitarios y Cabildos Indígenas', 'POBLACIONAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 80, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.42, "longitud": -75.535}, "meta_maxima": 100, "actores_clave": "Consejo Comunitario de la Comunidad Negra de Pasacaballos; Consejo Comunitario de la Comunidad Negra de la Isla de Barú; Red de Jóvenes Afrodescendientes de Cartagena", "meta_personas": 80, "total_actores": 8, "otras_dimensiones": "—", "eje_crisis_actores": 2, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e3-7282-a54b-f042f85fa1bc', 'MP-POB-01', 'MP101', 'csh.mp.adulto_mayor'::ltree, 'mesa-adulto-mayor', 'Mesa Poblacional de Adulto Mayor', 'POBLACIONAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 65, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4231, "longitud": -75.5492}, "meta_maxima": 80, "actores_clave": "Instituto Distrital de Deporte y Recreación (IDER); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociación de Adultos Mayores de Cartagena", "meta_personas": 65, "total_actores": 7, "otras_dimensiones": "Personal", "eje_crisis_actores": 1, "enfoque_poblacional": "ADULTO_MAYOR"}'),
            ('01a0f5fe-86e3-7cc2-8436-ebc34e6acbc4', 'MP-POB-02', 'MP102', 'csh.mp.infancia'::ltree, 'mesa-infancia-adolescencia', 'Mesa Poblacional de Infancia y Adolescencia (Prevención ESCNNA)', 'POBLACIONAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 75, 'personal', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.419, "longitud": -75.532}, "meta_maxima": 90, "actores_clave": "Secretaría de Educación Distrital (SED); Comisarías de Familia; Fundación Renacer; ICBF - Centro Zonal Cartagena", "meta_personas": 75, "total_actores": 8, "otras_dimensiones": "Alimentaria; Comunitaria", "eje_crisis_actores": 1, "enfoque_poblacional": "INFANCIA"}'),
            ('01a0f5fe-86e3-773b-9bbb-287eb0a475c4', 'MP-POB-03', 'MP103', 'csh.mp.lgtbi'::ltree, 'mesa-diversidad-lgtbiq', 'Mesa Poblacional LGTBIQ+', 'POBLACIONAL', 'LOC-2', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 40, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.3995, "longitud": -75.4983}, "meta_maxima": 45, "actores_clave": "Secretaría de Participación y Desarrollo Social (SPD/UMATA); Organización derecho a resistir", "meta_personas": 40, "total_actores": 7, "otras_dimensiones": "Personal; Política", "eje_crisis_actores": 3, "enfoque_poblacional": "LGTBIQ"}'),
            ('01a0f5fe-86e3-71a2-a832-83a2b8757f4a', 'MP-POB-04', 'MP104', 'csh.mp.discapacidad'::ltree, 'mesa-personas-con-discapacidad', 'Mesa Poblacional de Personas con Discapacidad y Cuidadores', 'POBLACIONAL', 'LOC-2', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 45, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.3995, "longitud": -75.4983}, "meta_maxima": 50, "actores_clave": "Instituto Distrital de Deporte y Recreación (IDER); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociación de Personas con Discapacidad de Cartagena", "meta_personas": 45, "total_actores": 6, "otras_dimensiones": "Política", "eje_crisis_actores": 1, "enfoque_poblacional": "DISCAPACIDAD"}'),
            ('01a0f5fe-86e3-7cc0-9494-9b43b0de02b0', 'MP-POB-05', 'MP105', 'csh.mp.juventud'::ltree, 'mesa-juventudes', 'Mesa Poblacional de Juventudes', 'POBLACIONAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 80, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.419, "longitud": -75.532}, "meta_maxima": 95, "actores_clave": "Escuela de Gobierno y Liderazgo; Instituto Distrital de Deporte y Recreación (IDER); Corporación Jóvenes por la Paz; Plataforma de Juventudes de Cartagena (+1 más; ver hoja Detalle)", "meta_personas": 80, "total_actores": 10, "otras_dimensiones": "Personal; Económica", "eje_crisis_actores": 1, "enfoque_poblacional": "JUVENTUD"}'),
            ('01a0f5fe-86e3-7ece-aa45-f734eaf5d4dd', 'MP-POB-06', 'MP106', 'csh.mp.mujeres'::ltree, 'mesa-mujeres-genero', 'Mesa Poblacional de Mujeres y Equidad de Género', 'POBLACIONAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 100, 'personal', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.424, "longitud": -75.5495}, "meta_maxima": 125, "actores_clave": "Secretaría de Participación y Desarrollo Social (SPD/UMATA); Casa de la Mujer (violeta); Comisarías de Familia; Corporación Mujeres Tejiendo Paz (+2 más; ver hoja Detalle)", "meta_personas": 100, "total_actores": 11, "otras_dimensiones": "Comunitaria", "eje_crisis_actores": 3, "enfoque_poblacional": "MUJERES"}'),
            ('01a0f5fe-86e3-7e68-89c5-7cc6c9cc4ce8', 'MP-POB-07', 'MP107', 'csh.mp.victimas'::ltree, 'mesa-victimas-conflicto', 'Mesa Poblacional de Víctimas del Conflicto Armado (Ley 1448)', 'POBLACIONAL', 'LOC-2', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 60, 'politica', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.412, "longitud": -75.465}, "meta_maxima": 70, "actores_clave": "Defensoría del Pueblo (Regional Bolívar); Fundación Juan Luis Londoño; Mesa de Víctimas de Cartagena; Personería Distrital (+1 más; ver hoja Detalle)", "meta_personas": 60, "total_actores": 10, "otras_dimensiones": "Comunitaria; Personal", "eje_crisis_actores": 4, "enfoque_poblacional": "VICTIMAS"}'),
            ('01a0f5fe-86e2-7209-9001-000000000009', 'MP-POB-09', 'MP109', 'csh.mp.migrantes'::ltree, 'mesa-poblacional-migrantes-refugiados', 'Mesa Poblacional de Migrantes y Refugiados', 'POBLACIONAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 55, 'personal', '{"lugar": "Por definir", "horario": "Por definir", "meta_maxima": 65, "actores_clave": "ACNUR - Agencia de la ONU para los Refugiados; Asociación de Venezolanos en Cartagena (AVEC); Fundación Colombia Somos Todos; Migración Colombia (Regional Bolívar) (+1 más; ver hoja Detalle)", "meta_personas": 55, "total_actores": 10, "otras_dimensiones": "Política; Comunitaria", "eje_crisis_actores": 3}'),
            ('01a0f5fe-86e2-7ebb-90f1-7268653ea79d', 'MR-ISL-07', 'MR107', 'csh.mr.santaana'::ltree, 'mesa-santa-ana-baru', 'Mesa Insular Santa Ana (Barú)', 'RURAL_INSULAR', 'INS-BARU', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.245, "longitud": -75.592}, "meta_maxima": 30, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+2 más; ver hoja Detalle)", "meta_personas": 30, "total_actores": 16, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 6, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-77ec-aa3f-d52f9fbb8125', 'MR-ISL-08', 'MR108', 'csh.mr.tierrabomba'::ltree, 'mesa-tierra-bomba', 'Mesa Insular Tierra Bomba', 'RURAL_INSULAR', 'INS-TIERRABOMBA', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.355, "longitud": -75.58}, "meta_maxima": 35, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 30, "total_actores": 15, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 6, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-70f0-84de-854dae52dc89', 'MR-ISL-09', 'MR109', 'csh.mr.bocachica'::ltree, 'mesa-bocachica', 'Mesa Insular Bocachica', 'RURAL_INSULAR', 'INS-TIERRABOMBA', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.319, "longitud": -75.605}, "meta_maxima": 35, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 30, "total_actores": 15, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 6, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-7c68-a9f7-4ecbfa5236b5', 'MR-ISL-10', 'MR110', 'csh.mr.rosario'::ltree, 'mesa-islas-del-rosario', 'Mesa Insular Archipiélago del Rosario', 'RURAL_INSULAR', 'INS-ROSARIO', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 20, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.175, "longitud": -75.748}, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 20, "total_actores": 15, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 6, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e3-7288-8425-1317a98eebd4', 'MR-ISL-11', 'MR111', 'csh.mr.islafuerte'::ltree, 'mesa-isla-fuerte', 'Mesa Insular Isla Fuerte', 'RURAL_INSULAR', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 25, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 9.387, "longitud": -76.178}, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 25, "total_actores": 15, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 6, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-7b56-b70b-aa6b3c6feb08', 'MR-RUR-01', 'MR101', 'csh.mr.boquilla'::ltree, 'mesa-la-boquilla', 'Mesa Rural La Boquilla', 'RURAL_INSULAR', 'CORR-BOQUILLA', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 60, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4735, "longitud": -75.5005}, "meta_maxima": 75, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 60, "total_actores": 12, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 4, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-7eb8-85f0-7f8edbd8d441', 'MR-RUR-02', 'MR102', 'csh.mr.arroyopiedra'::ltree, 'mesa-arroyo-de-piedra', 'Mesa Rural Arroyo de Piedra', 'RURAL_INSULAR', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 25, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.638, "longitud": -75.334}, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 25, "total_actores": 12, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 4, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-7b3a-99ca-973a388ae602', 'MR-RUR-03', 'MR103', 'csh.mr.puntacanoa'::ltree, 'mesa-punta-canoa', 'Mesa Rural Punta Canoa', 'RURAL_INSULAR', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 20, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.551, "longitud": -75.467}, "meta_maxima": 25, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 20, "total_actores": 12, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 4, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-76ca-8fb4-8c2403144877', 'MR-RUR-04', 'MR104', 'csh.mr.bayunca'::ltree, 'mesa-bayunca', 'Mesa Rural Bayunca', 'RURAL_INSULAR', 'CORR-BAYUNCA', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 65, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.479, "longitud": -75.431}, "meta_maxima": 90, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 65, "total_actores": 11, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 3, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-71eb-98b5-16f61f5a3b80', 'MR-RUR-05', 'MR105', 'csh.mr.pasacaballos'::ltree, 'mesa-pasacaballos', 'Mesa Rural Pasacaballos', 'RURAL_INSULAR', 'CORR-PASACABALLOS', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 50, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.297, "longitud": -75.513}, "meta_maxima": 60, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+2 más; ver hoja Detalle)", "meta_personas": 50, "total_actores": 12, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 3, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e2-7e7d-b043-8b61c7c913e0', 'MR-RUR-06', 'MR106', 'csh.mr.arroyogrande'::ltree, 'mesa-arroyo-grande', 'Mesa Rural Arroyo Grande', 'RURAL_INSULAR', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 25, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.689, "longitud": -75.312}, "meta_maxima": 30, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+1 más; ver hoja Detalle)", "meta_personas": 25, "total_actores": 11, "otras_dimensiones": "Ambiental", "eje_crisis_actores": 3, "enfoque_poblacional": "ETNICO"}'),
            ('01a0f5fe-86e4-7462-9bf4-7fba713251dd', 'MS-SEC-01', 'MS101', 'csh.ms.cultura'::ltree, 'mesa-cultura-patrimonio', 'Mesa Sectorial de Cultura y Patrimonio Histórico', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4248, "longitud": -75.551}, "meta_maxima": 35, "actores_clave": "Escuela Taller de Cartagena de Indias (ETCAR); Instituto de Patrimonio y Cultura de Cartagena (IPCC); Universidad de Bellas Artes", "meta_personas": 30, "total_actores": 6, "otras_dimensiones": "Económica", "eje_crisis_actores": 0, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e4-7a89-a279-abfbadfa1e91', 'MS-SEC-02', 'MS102', 'csh.ms.deporte'::ltree, 'mesa-deporte-recreacion', 'Mesa Sectorial de Deporte y Recreación Comunitaria', 'SECTORIAL', 'LOC-2', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.401, "longitud": -75.505}, "meta_maxima": 35, "actores_clave": "Instituto Distrital de Deporte y Recreación (IDER)", "meta_personas": 30, "total_actores": 6, "otras_dimensiones": "Salud y sanitaria", "eje_crisis_actores": 0, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7ff9-a971-27375ae9f301', 'MS-SEC-03', 'MS103', 'csh.ms.salud'::ltree, 'mesa-salud-seguridad-social', 'Mesa Sectorial de Salud Pública y Red Hospitalaria', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'salud', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.423, "longitud": -75.549}, "meta_maxima": 35, "actores_clave": "Departamento Administrativo Distrital de Salud (DADIS); Universidad del Sinú", "meta_personas": 30, "total_actores": 6, "otras_dimensiones": "—", "eje_crisis_actores": 1, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7883-9644-8c7a2dac9923', 'MS-SEC-04', 'MS104', 'csh.ms.educacion'::ltree, 'mesa-educacion-calidad', 'Mesa Sectorial de Educación y Cobertura', 'SECTORIAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 35, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.421, "longitud": -75.539}, "meta_maxima": 40, "actores_clave": "Escuela Taller de Cartagena de Indias (ETCAR); Institución Universitaria Mayor de Cartagena (Colmayor); Secretaría de Educación Distrital (SED); SENA - Regional Bolívar (+2 más; ver hoja Detalle)", "meta_personas": 35, "total_actores": 15, "otras_dimensiones": "Económica", "eje_crisis_actores": 0, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7e28-8bd7-4a18a3ea9c19', 'MS-SEC-05', 'MS105', 'csh.ms.movilidad'::ltree, 'mesa-movilidad-espacio-publico', 'Mesa Sectorial de Movilidad, Transporte y Espacio Público', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'economica', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4225, "longitud": -75.5489}, "meta_maxima": 35, "actores_clave": "Departamento Administrativo de Tránsito y Transporte (DATT); Gerencia de Espacio Público y Movilidad (GEPM); Transcaribe S.A.; Asociación de Trabajadores Informales de Cartagena (+1 más; ver hoja Detalle)", "meta_personas": 30, "total_actores": 8, "otras_dimensiones": "Personal", "eje_crisis_actores": 2, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7d19-a547-3edee16440b1', 'MS-SEC-06', 'MS106', 'csh.ms.servicios_publicos'::ltree, 'mesa-servicios-publicos-vivienda', 'Mesa Sectorial de Servicios Públicos, Infraestructura y Vivienda Digna', 'SECTORIAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 35, 'ambiental', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.418, "longitud": -75.541}, "meta_maxima": 40, "actores_clave": "Corvivienda; Secretaría General (Oficina de Servicios Públicos - Oficina Asesora Informática); Secretaría de Infraestructura; Líderes de Islas (Tierra Bomba, Barú, etc) (+1 más; ver hoja Detalle)", "meta_personas": 35, "total_actores": 11, "otras_dimensiones": "Económica; Comunitaria", "eje_crisis_actores": 1, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-752b-bf52-fa98aeb8406a', 'MS-SEC-07', 'MS107', 'csh.ms.seguridad'::ltree, 'mesa-seguridad-convivencia', 'Mesa Sectorial de Seguridad Integral y Convivencia Ciudadana', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 40, 'personal', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4225, "longitud": -75.5489}, "meta_maxima": 50, "actores_clave": "Departamento Administrativo de Tránsito y Transporte (DATT); Distriseguridad; Secretaría de Interior y Convivencia Ciudadana (SICC); Asociación de Comerciantes del Centro Histórico (+20 más; ver hoja Detalle)", "meta_personas": 40, "total_actores": 38, "otras_dimensiones": "—", "eje_crisis_actores": 6, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7e6f-bf6c-9e7b9837816f', 'MS-SEC-08', 'MS108', 'csh.ms.medio_ambiente'::ltree, 'mesa-medio-ambiente-cienaga', 'Mesa Sectorial de Medio Ambiente, Ciénaga de la Virgen y Gestión del Riesgo', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 40, 'ambiental', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4225, "longitud": -75.5489}, "meta_maxima": 50, "actores_clave": "CARDIQUE; Corvivienda; Cuerpo Oficial de Bomberos; EPA Cartagena; Oficina Asesora para la Gestión del Riesgo y Desastres - OAGRD (+11 más; ver hoja Detalle)", "meta_personas": 40, "total_actores": 24, "otras_dimensiones": "Política", "eje_crisis_actores": 12, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7d46-8bfb-527585d6d433', 'MS-SEC-09', 'MS109', 'csh.ms.desarrollo_economico'::ltree, 'mesa-desarrollo-turismo-empleo', 'Mesa Sectorial de Desarrollo Económico, Turismo Sostenible y Competitividad', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 40, 'economica', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4245, "longitud": -75.548}, "meta_maxima": 50, "actores_clave": "Corvivienda; Escuela Taller de Cartagena de Indias (ETCAR); Gerencia de Espacio Público y Movilidad (GEPM); Institución Universitaria Mayor de Cartagena (Colmayor) (+17 más; ver hoja Detalle)", "meta_personas": 40, "total_actores": 28, "otras_dimensiones": "—", "eje_crisis_actores": 0, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7322-953d-72489185aead', 'MS-SEC-10', 'MS110', 'csh.ms.transparencia'::ltree, 'mesa-transparencia-anticorrupcion', 'Mesa Sectorial de Transparencia, Veeduría y Cultura Ciudadana', 'SECTORIAL', 'DISTRITO-CTG', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 45, 'politica', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.4225, "longitud": -75.5489}, "meta_maxima": 55, "actores_clave": "Secretaría General (Oficina de Servicios Públicos - Oficina Asesora Informática); Secretaría de Planeación Distrital; ACNUR - Agencia de la ONU para los Refugiados; Caracol Radio - Cartagena (+19 más; ver hoja Detalle)", "meta_personas": 45, "total_actores": 35, "otras_dimensiones": "—", "eje_crisis_actores": 2, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-767a-8851-6b6a5eb052e6', 'MS-SEC-11', 'MS111', 'csh.ms.paz'::ltree, 'mesa-construccion-de-paz', 'Mesa Sectorial de Construcción de Paz y Reconciliación', 'SECTORIAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 35, 'politica', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.413, "longitud": -75.537}, "meta_maxima": 45, "actores_clave": "ACNUR - Agencia de la ONU para los Refugiados; Corporación Jóvenes por la Paz; Corporación Mujeres Tejiendo Paz; Defensoría del Pueblo (Regional Bolívar) (+7 más; ver hoja Detalle)", "meta_personas": 35, "total_actores": 17, "otras_dimensiones": "Personal; Comunitaria", "eje_crisis_actores": 2, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e5-7ff9-a971-000000000012', 'MS-SEC-12', 'MS112', 'csh.ms.alimentaria'::ltree, 'mesa-sectorial-seguridad-alimentaria', 'Mesa Sectorial de Seguridad Alimentaria y Soberanía Nutricional', 'SECTORIAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 30, 'alimentaria', '{"lugar": "Por definir", "horario": "Por definir", "meta_maxima": 35, "actores_clave": "Secretaría de Educación Distrital (SED)", "meta_personas": 30, "total_actores": 5, "otras_dimensiones": "—", "eje_crisis_actores": 0}'),
            ('01a0f5fe-86df-717b-a4d0-5b6605bdf993', 'MT-L01-01', 'MT101', 'csh.mt.loc1'::ltree, 'localidad-historica-caribe-norte', 'Mesa Territorial Localidad Histórica y del Caribe Norte', 'TERRITORIAL', 'LOC-1', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 350, 'comunitaria', '{"lugar": "Por definir", "entidad": "Mesa TERRITORIAL", "horario": "Por definir", "entidades": [{"id": "ent-1791943145150", "rol": "Convocante", "nombre": "Mesa TERRITORIAL"}], "coordenadas": {"latitud": 10.4225, "longitud": -75.5489}, "meta_maxima": 420, "responsables": [], "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Instituto de Patrimonio y Cultura de Cartagena (IPCC); Secretaría de Participación y Desarrollo Social (SPD/UMATA) (+5 más; ver hoja Detalle)", "meta_personas": 350, "total_actores": 19, "otras_dimensiones": "Personal; Económica", "eje_crisis_actores": 3, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e1-7175-8932-3799c59182c4', 'MT-L02-01', 'MT201', 'csh.mt.loc2'::ltree, 'localidad-de-la-virgen-y-turistica', 'Mesa Territorial Localidad De La Virgen y Turística', 'TERRITORIAL', 'LOC-2', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 400, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.3995, "longitud": -75.4983}, "meta_maxima": 480, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Secretaría de Turismo (+3 más; ver hoja Detalle)", "meta_personas": 400, "total_actores": 18, "otras_dimensiones": "Económica; Personal", "eje_crisis_actores": 3, "enfoque_poblacional": "GENERAL"}'),
            ('01a0f5fe-86e1-7e78-a8e2-401657b07e30', 'MT-L03-01', 'MT301', 'csh.mt.loc3'::ltree, 'localidad-industrial-y-de-la-bahia', 'Mesa Territorial Localidad Industrial y de la Bahía', 'TERRITORIAL', 'LOC-3', 'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA', 350, 'comunitaria', '{"lugar": "Por definir", "horario": "Por definir", "coordenadas": {"latitud": 10.3702, "longitud": -75.4795}, "meta_maxima": 420, "actores_clave": "Alcaldías Locales 1, 2 y 3; Instituto Distrital de Acción Comunal (IDACC); Secretaría de Participación y Desarrollo Social (SPD/UMATA); Asociaciones de Juntas de Acción Comunal (ASOJAC) (+3 más; ver hoja Detalle)", "meta_personas": 350, "total_actores": 17, "otras_dimensiones": "Económica; Personal", "eje_crisis_actores": 3, "enfoque_poblacional": "GENERAL"}')
        ) AS c(id, codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug, nombre,
              tipo_mesa, territorio_codigo, lugar_nombre, modalidad, horario, estado,
              aforo_maximo, dimension_codigo, metadatos)
        LEFT JOIN geodatos.territorios t ON t.codigo = c.territorio_codigo
        LEFT JOIN motor_politicas.dimensiones_seguridad_humana d ON d.codigo = c.dimension_codigo
        ON CONFLICT (codigo_oficial) DO UPDATE SET
            id = EXCLUDED.id,
            shortcode_ciudadano = EXCLUDED.shortcode_ciudadano,
            ruta_jerarquica = EXCLUDED.ruta_jerarquica,
            slug = EXCLUDED.slug,
            nombre = EXCLUDED.nombre,
            tipo_mesa = EXCLUDED.tipo_mesa,
            territorio_id = EXCLUDED.territorio_id,
            lugar_nombre = EXCLUDED.lugar_nombre,
            modalidad = EXCLUDED.modalidad,
            horario = EXCLUDED.horario,
            estado = EXCLUDED.estado,
            aforo_maximo = EXCLUDED.aforo_maximo,
            dimension_id = EXCLUDED.dimension_id,
            metadatos = EXCLUDED.metadatos,
            actualizado_en = clock_timestamp();
    """)

    # 2. Vinculación 1:1 de cada agenda con su mesa canónica por código oficial.
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.agendas a
        SET mesa_id = m.id
        FROM (VALUES
            ('mp-001', 'MP-POB-01'),
            ('mp-002', 'MP-POB-02'),
            ('mp-003', 'MP-POB-03'),
            ('mp-004', 'MP-POB-04'),
            ('mp-005', 'MP-POB-05'),
            ('mp-006', 'MP-POB-06'),
            ('mp-007', 'MP-POB-07'),
            ('mp-008', 'MP-ETN-08'),
            ('mp-009', 'MP-POB-09'),
            ('mr-001', 'MR-RUR-01'),
            ('mr-002', 'MR-RUR-02'),
            ('mr-003', 'MR-RUR-03'),
            ('mr-004', 'MR-RUR-04'),
            ('mr-005', 'MR-RUR-05'),
            ('mr-006', 'MR-RUR-06'),
            ('mr-007', 'MR-ISL-07'),
            ('mr-008', 'MR-ISL-08'),
            ('mr-009', 'MR-ISL-09'),
            ('mr-010', 'MR-ISL-10'),
            ('mr-011', 'MR-ISL-11'),
            ('ms-001', 'MS-SEC-01'),
            ('ms-002', 'MS-SEC-02'),
            ('ms-003', 'MS-SEC-03'),
            ('ms-004', 'MS-SEC-04'),
            ('ms-005', 'MS-SEC-05'),
            ('ms-006', 'MS-SEC-06'),
            ('ms-007', 'MS-SEC-07'),
            ('ms-008', 'MS-SEC-08'),
            ('ms-009', 'MS-SEC-09'),
            ('ms-010', 'MS-SEC-10'),
            ('ms-011', 'MS-SEC-11'),
            ('ms-012', 'MS-SEC-12'),
            ('mt-001', 'MT-L01-01'),
            ('mt-002', 'MT-L02-01'),
            ('mt-003', 'MT-L03-01')
        ) AS v(agenda, codigo)
        JOIN mesas_trabajo.mesas m ON m.codigo_oficial = v.codigo
        WHERE a.id = v.agenda;
    """)

    # 3. Guardia censal: 35 mesas (3/11/9/12), 36 agendas, 35 vinculadas 1:1 y
    #    pc-001 (plenaria) sin mesa. El censo incompleto no puede pasar por verde.
    bind.exec_driver_sql("""
        DO $$
        DECLARE
            mesas_total integer;
            agendas_total integer;
            vinculadas_total integer;
            distintas_total integer;
        BEGIN
            SELECT count(*) INTO mesas_total FROM mesas_trabajo.mesas;
            SELECT count(*) INTO agendas_total FROM mesas_trabajo.agendas;
            SELECT count(mesa_id), count(DISTINCT mesa_id)
                INTO vinculadas_total, distintas_total FROM mesas_trabajo.agendas;
            IF mesas_total <> 35 OR agendas_total <> 36
                OR vinculadas_total <> 35 OR distintas_total <> 35
                OR (SELECT count(*) FROM mesas_trabajo.agendas WHERE id = 'pc-001' AND mesa_id IS NULL) <> 1 THEN
                RAISE EXCEPTION 'Censo H-05 inválido: mesas %, agendas %, vinculadas %, distintas %',
                    mesas_total, agendas_total, vinculadas_total, distintas_total;
            END IF;
            IF (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'TERRITORIAL') <> 3
                OR (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'RURAL_INSULAR') <> 11
                OR (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'POBLACIONAL') <> 9
                OR (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'SECTORIAL') <> 12 THEN
                RAISE EXCEPTION 'Distribución de tipos no coincide con el censo 3/11/9/12';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    bind = op.get_bind()
    # Solo desvincula y retira las mesas del censo; los registros dependientes
    # (actas, participantes, agendas propias) detienen el DELETE por las claves
    # foráneas y conservan los datos persistidos.
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.agendas
        SET mesa_id = NULL
        WHERE mesa_id IN (
            SELECT id FROM mesas_trabajo.mesas
            WHERE codigo_oficial IN ('MP-ETN-08', 'MP-POB-01', 'MP-POB-02', 'MP-POB-03', 'MP-POB-04', 'MP-POB-05', 'MP-POB-06', 'MP-POB-07', 'MP-POB-09', 'MR-ISL-07', 'MR-ISL-08', 'MR-ISL-09', 'MR-ISL-10', 'MR-ISL-11', 'MR-RUR-01', 'MR-RUR-02', 'MR-RUR-03', 'MR-RUR-04', 'MR-RUR-05', 'MR-RUR-06', 'MS-SEC-01', 'MS-SEC-02', 'MS-SEC-03', 'MS-SEC-04', 'MS-SEC-05', 'MS-SEC-06', 'MS-SEC-07', 'MS-SEC-08', 'MS-SEC-09', 'MS-SEC-10', 'MS-SEC-11', 'MS-SEC-12', 'MT-L01-01', 'MT-L02-01', 'MT-L03-01')
        );
    """)
    bind.exec_driver_sql(
        "DELETE FROM mesas_trabajo.mesas WHERE codigo_oficial IN ('MP-ETN-08', 'MP-POB-01', 'MP-POB-02', 'MP-POB-03', 'MP-POB-04', 'MP-POB-05', 'MP-POB-06', 'MP-POB-07', 'MP-POB-09', 'MR-ISL-07', 'MR-ISL-08', 'MR-ISL-09', 'MR-ISL-10', 'MR-ISL-11', 'MR-RUR-01', 'MR-RUR-02', 'MR-RUR-03', 'MR-RUR-04', 'MR-RUR-05', 'MR-RUR-06', 'MS-SEC-01', 'MS-SEC-02', 'MS-SEC-03', 'MS-SEC-04', 'MS-SEC-05', 'MS-SEC-06', 'MS-SEC-07', 'MS-SEC-08', 'MS-SEC-09', 'MS-SEC-10', 'MS-SEC-11', 'MS-SEC-12', 'MT-L01-01', 'MT-L02-01', 'MT-L03-01');"
    )
