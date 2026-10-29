import openpyxl
import json

wb = openpyxl.load_workbook('/root/polis/data/mesas_programacion_35.xlsx', data_only=True)
sheet = wb['Mesas']
rows = list(sheet.iter_rows(values_only=True))

dim_map = {
    'Comunitaria': 'comunitaria',
    'Personal': 'personal',
    'Política': 'politica',
    'Económica': 'economica',
    'Ambiental': 'ambiental',
    'Alimentaria': 'alimentaria',
    'Salud y sanitaria': 'salud'
}

codigos_map = [
    # Territoriales (3)
    ('Localidad Histórica y del Caribe Norte', 'MT-L01-01', 'MT101', 'TERRITORIAL', 'csh.mt.loc1', 'mesa-territorial-localidad-1', 'Mesa Territorial Localidad Histórica y del Caribe Norte', 'LOC-1'),
    ('Localidad De La Virgen y Turística', 'MT-L02-01', 'MT201', 'TERRITORIAL', 'csh.mt.loc2', 'mesa-territorial-localidad-2', 'Mesa Territorial Localidad De La Virgen y Turística', 'LOC-2'),
    ('Localidad Industrial y de la Bahía', 'MT-L03-01', 'MT301', 'TERRITORIAL', 'csh.mt.loc3', 'mesa-territorial-localidad-3', 'Mesa Territorial Localidad Industrial y de la Bahía', 'LOC-3'),
    # Rurales (11)
    ('Boquilla', 'MR-RUR-01', 'MR101', 'RURAL_INSULAR', 'csh.mr.boquilla', 'mesa-rural-boquilla', 'Mesa Rural La Boquilla', 'LOC-2'),
    ('Arroyo de Piedra', 'MR-RUR-02', 'MR102', 'RURAL_INSULAR', 'csh.mr.arroyopiedra', 'mesa-rural-arroyo-de-piedra', 'Mesa Rural Arroyo de Piedra', 'LOC-2'),
    ('Punta Canoa', 'MR-RUR-03', 'MR103', 'RURAL_INSULAR', 'csh.mr.puntacanoa', 'mesa-rural-punta-canoa', 'Mesa Rural Punta Canoa', 'LOC-2'),
    ('Bayunca', 'MR-RUR-04', 'MR104', 'RURAL_INSULAR', 'csh.mr.bayunca', 'mesa-rural-bayunca', 'Mesa Rural Bayunca', 'LOC-2'),
    ('Pasacaballos', 'MR-RUR-05', 'MR105', 'RURAL_INSULAR', 'csh.mr.pasacaballos', 'mesa-rural-pasacaballos', 'Mesa Rural Pasacaballos', 'LOC-3'),
    ('Arroyo Grande', 'MR-RUR-06', 'MR106', 'RURAL_INSULAR', 'csh.mr.arroyogrande', 'mesa-rural-arroyo-grande', 'Mesa Rural Arroyo Grande', 'LOC-1'),
    ('Santa Ana', 'MR-ISL-07', 'MR107', 'RURAL_INSULAR', 'csh.mr.santaana', 'mesa-insular-santa-ana', 'Mesa Insular Santa Ana', 'INS-BARU'),
    ('Tierra bomba', 'MR-ISL-08', 'MR108', 'RURAL_INSULAR', 'csh.mr.tierrabomba', 'mesa-insular-tierra-bomba', 'Mesa Insular Tierra Bomba', 'INS-TIERRABOMBA'),
    ('Bocachica', 'MR-ISL-09', 'MR109', 'RURAL_INSULAR', 'csh.mr.bocachica', 'mesa-insular-bocachica', 'Mesa Insular Bocachica', 'INS-TIERRABOMBA'),
    ('Isla del Rosario', 'MR-ISL-10', 'MR110', 'RURAL_INSULAR', 'csh.mr.rosario', 'mesa-insular-isla-del-rosario', 'Mesa Insular Isla del Rosario', 'INS-ROSARIO'),
    ('Isla Fuerte', 'MR-ISL-11', 'MR111', 'RURAL_INSULAR', 'csh.mr.islafuerte', 'mesa-insular-isla-fuerte', 'Mesa Insular Isla Fuerte', 'INS-SANBERNARDO'),
    # Poblacionales (9)
    ('Adulto mayor', 'MP-POB-01', 'MP101', 'POBLACIONAL', 'csh.mp.adultomayor', 'mesa-poblacional-adulto-mayor', 'Mesa Poblacional de Adulto Mayor', 'LOC-1'),
    ('Infancia', 'MP-POB-02', 'MP102', 'POBLACIONAL', 'csh.mp.infancia', 'mesa-poblacional-infancia', 'Mesa Poblacional de Infancia y Adolescencia', 'LOC-1'),
    ('LGTBI', 'MP-POB-03', 'MP103', 'POBLACIONAL', 'csh.mp.lgtbi', 'mesa-poblacional-lgtbi', 'Mesa Poblacional LGTBIQ+', 'LOC-1'),
    ('Discapacidad', 'MP-POB-04', 'MP104', 'POBLACIONAL', 'csh.mp.discapacidad', 'mesa-poblacional-discapacidad', 'Mesa Poblacional de Personas con Discapacidad', 'LOC-1'),
    ('Juventud', 'MP-POB-05', 'MP105', 'POBLACIONAL', 'csh.mp.juventud', 'mesa-poblacional-juventud', 'Mesa Poblacional de Juventudes', 'LOC-1'),
    ('Mujeres', 'MP-POB-06', 'MP106', 'POBLACIONAL', 'csh.mp.mujeres', 'mesa-poblacional-mujeres', 'Mesa Poblacional de Mujeres y Equidad de Género', 'LOC-1'),
    ('Victimas', 'MP-POB-07', 'MP107', 'POBLACIONAL', 'csh.mp.victimas', 'mesa-poblacional-victimas', 'Mesa Poblacional de Víctimas del Conflicto Armado', 'LOC-1'),
    ('Étnica', 'MP-ETN-08', 'MP108', 'POBLACIONAL', 'csh.mp.etnica', 'mesa-poblacional-etnica', 'Mesa Poblacional Étnica: Consejos Comunitarios y Cabildos', 'LOC-1'),
    ('Migrantes y refugiados (nueva)', 'MP-POB-09', 'MP109', 'POBLACIONAL', 'csh.mp.migrantes', 'mesa-poblacional-migrantes-refugiados', 'Mesa Poblacional de Migrantes y Refugiados', 'LOC-1'),
    # Sectoriales (12)
    ('Cultura', 'MS-SEC-01', 'MS101', 'SECTORIAL', 'csh.ms.cultura', 'mesa-sectorial-cultura', 'Mesa Sectorial de Cultura y Patrimonio Histórico', 'LOC-1'),
    ('Deporte', 'MS-SEC-02', 'MS102', 'SECTORIAL', 'csh.ms.deporte', 'mesa-sectorial-deporte', 'Mesa Sectorial de Deporte y Recreación', 'LOC-1'),
    ('Salud', 'MS-SEC-03', 'MS103', 'SECTORIAL', 'csh.ms.salud', 'mesa-sectorial-salud', 'Mesa Sectorial de Salud Pública y Red Hospitalaria', 'LOC-1'),
    ('Educacion', 'MS-SEC-04', 'MS104', 'SECTORIAL', 'csh.ms.educacion', 'mesa-sectorial-educacion', 'Mesa Sectorial de Educación y Cobertura', 'LOC-1'),
    ('Movilidad y Espacio Público', 'MS-SEC-05', 'MS105', 'SECTORIAL', 'csh.ms.movilidad', 'mesa-sectorial-movilidad-espacio-publico', 'Mesa Sectorial de Movilidad, Transporte y Espacio Público', 'LOC-1'),
    ('Servicios públicos, infraestructura y vivienda', 'MS-SEC-06', 'MS106', 'SECTORIAL', 'csh.ms.servicios', 'mesa-sectorial-servicios-publicos-vivienda', 'Mesa Sectorial de Servicios Públicos, Infraestructura y Vivienda', 'LOC-1'),
    ('Seguridad y Convivencia Ciudadana', 'MS-SEC-07', 'MS107', 'SECTORIAL', 'csh.ms.seguridad', 'mesa-sectorial-seguridad-convivencia', 'Mesa Sectorial de Seguridad Integral y Convivencia Ciudadana', 'LOC-1'),
    ('Medio ambiente, Gestión del riesgo y Planeación', 'MS-SEC-08', 'MS108', 'SECTORIAL', 'csh.ms.ambiente', 'mesa-sectorial-medio-ambiente-riesgo', 'Mesa Sectorial de Medio Ambiente, Ciénaga de la Virgen y Gestión del Riesgo', 'LOC-1'),
    ('Desarrollo económico, Turismo / Competitividad , ciencia y tecnología', 'MS-SEC-09', 'MS109', 'SECTORIAL', 'csh.ms.desarrollo', 'mesa-sectorial-desarrollo-economico-turismo', 'Mesa Sectorial de Desarrollo Económico, Turismo Sostenible y Competitividad', 'LOC-1'),
    ('Transparencia y Cultura Ciudadana', 'MS-SEC-10', 'MS110', 'SECTORIAL', 'csh.ms.transparencia', 'mesa-sectorial-transparencia-cultura-ciudadana', 'Mesa Sectorial de Transparencia, Veeduría y Cultura Ciudadana', 'LOC-1'),
    ('Mesa de Construcción de Paz', 'MS-SEC-11', 'MS111', 'SECTORIAL', 'csh.ms.paz', 'mesa-sectorial-construccion-de-paz', 'Mesa Sectorial de Construcción de Paz y Reconciliación', 'LOC-1'),
    ('Seguridad alimentaria (nueva)', 'MS-SEC-12', 'MS112', 'SECTORIAL', 'csh.ms.alimentaria', 'mesa-sectorial-seguridad-alimentaria', 'Mesa Sectorial de Seguridad Alimentaria y Soberanía Nutricional', 'LOC-1'),
]

header = '''"""Sincronizar las 35 mesas oficiales de trabajo y metas de convocatoria.

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
    bind.exec_driver_sql("DELETE FROM mesas_trabajo.mesas WHERE codigo_oficial IN ('MR-ISL-12', 'MR-ISL-13', 'MR-ISL-14', 'MR-RUR-15');")
'''

body = []
for item in codigos_map:
    sheet_name = item[0]
    codigo = item[1]
    shortcode = item[2]
    tipo = item[3]
    ltree = item[4]
    slug = item[5]
    nombre = item[6]
    loc = item[7]
    row_data = next(r for r in rows[2:40] if r[1] and str(r[1]).strip().lower() == sheet_name.lower())
    dim = dim_map.get(str(row_data[5]).strip() if row_data[5] else 'Comunitaria', 'comunitaria')
    meta = int(row_data[12])
    meta_max = int(row_data[14])
    actores = str(row_data[11]).strip().replace("'", "''") if row_data[11] else ''
    otras_dims = str(row_data[6]).strip().replace("'", "''") if row_data[6] else ''
    total_actores = row_data[8] or 0
    eje_crisis = row_data[7] or 0
    
    meta_json = json.dumps({
        'meta_personas': meta,
        'meta_maxima': meta_max,
        'actores_clave': actores,
        'otras_dimensiones': otras_dims,
        'total_actores': total_actores,
        'eje_crisis_actores': eje_crisis
    }, ensure_ascii=False).replace("'", "''")
    
    if codigo in ('MP-POB-09', 'MS-SEC-12'):
        uuid_str = '01a0f5fe-86e2-7209-9001-000000000009' if codigo == 'MP-POB-09' else '01a0f5fe-86e5-7ff9-a971-000000000012'
        body.append(f'''    # Nueva mesa: {nombre}
    bind.exec_driver_sql("""
        INSERT INTO mesas_trabajo.mesas (
            id, codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug,
            nombre, tipo_mesa, territorio_id, lugar_nombre, modalidad,
            horario, estado, aforo_maximo, total_asistentes, dimension_id, metadatos
        ) VALUES (
            '{uuid_str}', '{codigo}', '{shortcode}',
            '{ltree}'::ltree, '{slug}', '{nombre}', '{tipo}',
            (SELECT id FROM geodatos.territorios WHERE codigo = '{loc}' LIMIT 1),
            'Por definir', 'HIBRIDA_DIGITAL', 'Por definir', 'PROGRAMADA',
            {meta}, 0,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = '{dim}' LIMIT 1),
            '{meta_json}'::jsonb
        ) ON CONFLICT (codigo_oficial) DO UPDATE SET
            aforo_maximo = EXCLUDED.aforo_maximo,
            dimension_id = EXCLUDED.dimension_id,
            metadatos = EXCLUDED.metadatos;
    """)''')
    else:
        body.append(f'''    # Actualizar aforo y dimensión de: {codigo} ({nombre})
    bind.exec_driver_sql("""
        UPDATE mesas_trabajo.mesas
        SET aforo_maximo = {meta},
            dimension_id = (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = '{dim}' LIMIT 1),
            metadatos = metadatos || '{meta_json}'::jsonb,
            actualizado_en = clock_timestamp()
        WHERE codigo_oficial = '{codigo}';
    """)''')

footer = '''
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
'''

content = header + '\n' + '\n'.join(body) + '\n' + footer
with open('/root/polis/backend/alembic/versions/0088_sincronizar_35_mesas.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Generated /root/polis/backend/alembic/versions/0088_sincronizar_35_mesas.py successfully!')
