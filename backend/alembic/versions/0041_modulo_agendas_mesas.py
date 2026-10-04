"""Dinamización y Gestión de Cronograma de Agendas de Mesas (EDIT-02).

Revision ID: 0041_modulo_agendas_mesas
Revises: 0040_modulo_actores_estrategicos
Create Date: 2026-10-04 04:30:00.000000
"""

import json
from typing import Sequence, Union
from alembic import op
from sqlalchemy import text

revision: str = '0041_modulo_agendas_mesas'
down_revision: Union[str, Sequence[str], None] = '0040_modulo_actores_estrategicos'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS mesas_trabajo.agendas (
            id VARCHAR(50) PRIMARY KEY,
            tipo VARCHAR(50) NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            territorio VARCHAR(150) NOT NULL DEFAULT '',
            lugar VARCHAR(300) NOT NULL,
            fecha DATE NOT NULL,
            hora_inicio VARCHAR(20) NOT NULL DEFAULT '08:30',
            hora_fin VARCHAR(20) NOT NULL DEFAULT '12:00',
            estado VARCHAR(50) NOT NULL DEFAULT 'programada',
            dimensiones_onu JSONB NOT NULL DEFAULT '[]'::jsonb,
            responsable VARCHAR(255),
            observaciones TEXT,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_agendas_tipo ON mesas_trabajo.agendas (tipo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agendas_estado ON mesas_trabajo.agendas (estado)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agendas_fecha ON mesas_trabajo.agendas (fecha)")

    semillas = [
    {
        "id": "mt-001",
        "tipo": "territorial",
        "nombre": "Mesa Territorial — Localidad Histórica y del Caribe Norte",
        "territorio": "Localidad 1 — Histórica y del Caribe Norte",
        "lugar": "SENA Plaza de la Aduana, Auditorio Rodolfo Martínez",
        "fecha": "2026-10-15",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Comunitaria",
            "Seguridad Política"
        ],
        "responsable": "Secretaría de Planeación Distrital"
    },
    {
        "id": "mt-002",
        "tipo": "territorial",
        "nombre": "Mesa Territorial — Localidad De La Virgen y Turística",
        "territorio": "Localidad 2 — De la Virgen y Turística",
        "lugar": "Sala de Juntas, Estadio Jaime Morón León",
        "fecha": "2026-10-16",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Ambiental",
            "Seguridad Económica"
        ],
        "responsable": "Secretaría de Planeación Distrital"
    },
    {
        "id": "mt-003",
        "tipo": "territorial",
        "nombre": "Mesa Territorial — Localidad Industrial y de la Bahía",
        "territorio": "Localidad 3 — Industrial y de la Bahía",
        "lugar": "Institución Educativa Nelson Mandela",
        "fecha": "2026-10-17",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Económica",
            "Seguridad Comunitaria"
        ],
        "responsable": "Secretaría de Planeación Distrital"
    },
    {
        "id": "mr-001",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — La Boquilla",
        "territorio": "Corregimiento La Boquilla",
        "lugar": "Centro Cultural de La Boquilla",
        "fecha": "2026-10-20",
        "horaInicio": "08:30",
        "horaFin": "11:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad Económica",
            "Seguridad Alimentaria"
        ],
        "observaciones": "Énfasis en pesca artesanal y ESCNNA turística"
    },
    {
        "id": "mr-002",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — Arroyo de Piedra",
        "territorio": "Corregimiento Arroyo de Piedra",
        "lugar": "Institución Educativa Arroyo de Piedra",
        "fecha": "2026-10-20",
        "horaInicio": "11:30",
        "horaFin": "14:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Alimentaria",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "mr-003",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — Punta Canoa",
        "territorio": "Corregimiento Punta Canoa",
        "lugar": "Institución Educativa Punta Canoa",
        "fecha": "2026-10-20",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad Alimentaria"
        ]
    },
    {
        "id": "mr-004",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — Bayunca",
        "territorio": "Corregimiento Bayunca",
        "lugar": "Institución Educativa de Bayunca",
        "fecha": "2026-10-21",
        "horaInicio": "08:30",
        "horaFin": "11:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Alimentaria",
            "Seguridad de la Salud"
        ]
    },
    {
        "id": "mr-005",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — Pasacaballos",
        "territorio": "Corregimiento Pasacaballos",
        "lugar": "Institución Técnica de Pasacaballos",
        "fecha": "2026-10-21",
        "horaInicio": "11:30",
        "horaFin": "14:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Económica"
        ]
    },
    {
        "id": "mr-006",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — Arroyo Grande",
        "territorio": "Corregimiento Arroyo Grande",
        "lugar": "Institución Educativa de Arroyo Grande",
        "fecha": "2026-10-21",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Alimentaria",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "mr-007b",
        "tipo": "rural_insular",
        "nombre": "Mesa Insular — Barú y Comunidades del Archipiélago",
        "territorio": "Isla de Barú",
        "lugar": "Institución Educativa de Barú",
        "fecha": "2026-10-22",
        "horaInicio": "07:30",
        "horaFin": "10:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Alimentaria",
            "Seguridad Ambiental",
            "Seguridad Comunitaria"
        ],
        "responsable": "Consejo Comunitario de Barú",
        "observaciones": "Mesa con protocolo diferencial étnico — Comunidad afrodescendiente. Requiere Consulta Previa conforme Convenio 169 OIT y Sentencia SU-123/18. Coordinar con Consejo Comunitario con anterioridad mínima de 30 días."
    },
    {
        "id": "mr-007",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural — Santa Ana",
        "territorio": "Corregimiento Santa Ana",
        "lugar": "Institución Educativa Barbacoas",
        "fecha": "2026-10-22",
        "horaInicio": "08:30",
        "horaFin": "11:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Comunitaria",
            "Seguridad Alimentaria"
        ]
    },
    {
        "id": "mr-008",
        "tipo": "rural_insular",
        "nombre": "Mesa Insular — Tierrabomba",
        "territorio": "Isla de Tierrabomba",
        "lugar": "Institución Educativa Tierra Bomba",
        "fecha": "2026-10-22",
        "horaInicio": "11:30",
        "horaFin": "14:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad Económica",
            "Seguridad Alimentaria"
        ],
        "observaciones": "Requiere transporte marítimo — coordinar con anterioridad"
    },
    {
        "id": "mr-009",
        "tipo": "rural_insular",
        "nombre": "Mesa Insular — Bocachica",
        "territorio": "Isla Bocachica",
        "lugar": "Institución Educativa Domingo Benkos Biohó",
        "fecha": "2026-10-22",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Comunitaria",
            "Seguridad Ambiental"
        ],
        "observaciones": "Requiere transporte marítimo — coordinar con líderes comunales"
    },
    {
        "id": "mr-010",
        "tipo": "rural_insular",
        "nombre": "Mesa Insular — Isla del Rosario",
        "territorio": "Archipiélago Islas del Rosario",
        "lugar": "Institución Educativa Isla Rosario",
        "fecha": "2026-10-23",
        "horaInicio": "08:30",
        "horaFin": "11:30",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad Económica"
        ],
        "observaciones": "Área de conservación — énfasis en dimensión ambiental"
    },
    {
        "id": "mr-011",
        "tipo": "rural_insular",
        "nombre": "Mesa Insular — Isla Fuerte",
        "territorio": "Isla Fuerte",
        "lugar": "Institución Educativa Isla Fuerte",
        "fecha": "2026-10-23",
        "horaInicio": "13:00",
        "horaFin": "16:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad Alimentaria"
        ],
        "observaciones": "La isla más alejada — logística especial requerida"
    },
    {
        "id": "mr-012",
        "tipo": "rural_insular",
        "nombre": "Mesa Rural e Insular — Barú",
        "territorio": "Corregimiento de Barú",
        "lugar": "Institución Educativa de Barú",
        "fecha": "2026-10-24",
        "horaInicio": "09:00",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad Económica",
            "Seguridad Comunitaria"
        ],
        "observaciones": "Comunidad étnica afrodescendiente — énfasis en sostenibilidad costera y consulta comunitaria"
    },
    {
        "id": "mp-001",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Adulto Mayor",
        "territorio": "Distrito de Cartagena",
        "lugar": "Concejo Distrital de Cartagena",
        "fecha": "2026-11-05",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad de la Salud",
            "Seguridad Económica",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "mp-002",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Infancia y Primera Infancia",
        "territorio": "Distrito de Cartagena",
        "lugar": "Universidad del Sinú — Sede Pie de la Popa",
        "fecha": "2026-11-05",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad de la Salud",
            "Seguridad Personal",
            "Seguridad Alimentaria"
        ],
        "observaciones": "Participación con representantes de familias y docentes"
    },
    {
        "id": "mp-003",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Población LGBTIQ+",
        "territorio": "Distrito de Cartagena",
        "lugar": "Estadio Jaime Morón León — Sala de Juntas",
        "fecha": "2026-11-06",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Política",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "mp-004",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Personas con Discapacidad",
        "territorio": "Distrito de Cartagena",
        "lugar": "Estadio Jaime Morón León — Sala de Juntas",
        "fecha": "2026-11-06",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad de la Salud",
            "Seguridad Económica"
        ],
        "observaciones": "Garantizar condiciones de accesibilidad en el lugar"
    },
    {
        "id": "mp-005",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Juventud",
        "territorio": "Distrito de Cartagena",
        "lugar": "Universidad del Sinú — Sede Pie de la Popa",
        "fecha": "2026-11-12",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Económica",
            "Seguridad Política",
            "Seguridad Personal"
        ]
    },
    {
        "id": "mp-006",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Mujeres",
        "territorio": "Distrito de Cartagena",
        "lugar": "Universidad de Cartagena — Claustro San Agustín, Aula Máxima de Derecho",
        "fecha": "2026-11-12",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Económica",
            "Seguridad Comunitaria"
        ],
        "observaciones": "Énfasis en violencia basada en género y ESCNNA"
    },
    {
        "id": "mp-007",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Víctimas del Conflicto",
        "territorio": "Distrito de Cartagena",
        "lugar": "Centro de Atención a la Familia — Barrio Bicentenario",
        "fecha": "2026-11-13",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Comunitaria",
            "Seguridad Política"
        ],
        "responsable": "Unidad para las Víctimas — Oficina Cartagena"
    },
    {
        "id": "mp-008",
        "tipo": "poblacional",
        "nombre": "Mesa Poblacional — Comunidades Étnicas",
        "territorio": "Distrito de Cartagena",
        "lugar": "Complejo de Raquetas — Bocagrande",
        "fecha": "2026-11-13",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Comunitaria",
            "Seguridad Política",
            "Seguridad Alimentaria"
        ],
        "observaciones": "Comunidades afrodescendientes, raizales e indígenas"
    },
    {
        "id": "ms-001",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Cultura y Patrimonio",
        "territorio": "Distrito de Cartagena",
        "lugar": "Teatro Adolfo Mejía — Salón Foyer",
        "fecha": "2026-11-19",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Comunitaria",
            "Seguridad Económica"
        ]
    },
    {
        "id": "ms-002",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Deporte y Recreación",
        "territorio": "Distrito de Cartagena",
        "lugar": "Coliseo Napoleón Perea — Salón Cartagena de Indias",
        "fecha": "2026-11-19",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad de la Salud",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "ms-003",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Salud Pública",
        "territorio": "Distrito de Cartagena",
        "lugar": "Alcaldía de Cartagena — Salón Vicente Martínez",
        "fecha": "2026-11-20",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad de la Salud",
            "Seguridad Alimentaria"
        ]
    },
    {
        "id": "ms-004",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Educación",
        "territorio": "Distrito de Cartagena",
        "lugar": "CASD Manuela Beltrán",
        "fecha": "2026-11-20",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Económica",
            "Seguridad Política",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "ms-005",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Movilidad y Espacio Público",
        "territorio": "Distrito de Cartagena",
        "lugar": "SENA Plaza de la Aduana",
        "fecha": "2026-11-26",
        "horaInicio": "08:00",
        "horaFin": "10:30",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "ms-006",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Servicios Públicos, Infraestructura y Vivienda",
        "territorio": "Distrito de Cartagena",
        "lugar": "Sociedad de Ingenieros y Arquitectos de Bolívar",
        "fecha": "2026-11-26",
        "horaInicio": "11:00",
        "horaFin": "13:30",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Económica",
            "Seguridad de la Salud",
            "Seguridad Ambiental"
        ]
    },
    {
        "id": "ms-007",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Seguridad y Convivencia Ciudadana",
        "territorio": "Distrito de Cartagena",
        "lugar": "SENA Plaza de la Aduana",
        "fecha": "2026-11-26",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Comunitaria",
            "Seguridad Política"
        ],
        "responsable": "Secretaría del Interior y Convivencia Ciudadana"
    },
    {
        "id": "ms-008",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Medio Ambiente, Gestión del Riesgo y Planeación",
        "territorio": "Distrito de Cartagena",
        "lugar": "SENA Plaza de la Aduana",
        "fecha": "2026-11-27",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Ambiental",
            "Seguridad de la Salud",
            "Seguridad Alimentaria"
        ],
        "observaciones": "Incluye análisis de Ciénaga de la Virgen y bahía de Cartagena"
    },
    {
        "id": "ms-009",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Desarrollo Económico, Turismo y Competitividad",
        "territorio": "Distrito de Cartagena",
        "lugar": "Cámara de Comercio de Cartagena — Sede Centro",
        "fecha": "2026-11-27",
        "horaInicio": "14:00",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Económica",
            "Seguridad Personal",
            "Seguridad Ambiental"
        ],
        "observaciones": "Incluye ciencia, tecnología e innovación"
    },
    {
        "id": "ms-010",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Transparencia y Cultura Ciudadana",
        "territorio": "Distrito de Cartagena",
        "lugar": "SENA Plaza de la Aduana",
        "fecha": "2026-12-04",
        "horaInicio": "08:30",
        "horaFin": "12:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Política",
            "Seguridad Comunitaria"
        ]
    },
    {
        "id": "ms-011",
        "tipo": "sectorial",
        "nombre": "Mesa Sectorial — Construcción de Paz y Reconciliación",
        "territorio": "Distrito de Cartagena",
        "lugar": "ARN — Manga, Callejón Santa Clara, Cra 19 N 24A-93",
        "fecha": "2026-12-04",
        "horaInicio": "14:30",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Política",
            "Seguridad Comunitaria"
        ],
        "responsable": "Agencia para la Reincorporación y la Normalización (ARN)",
        "observaciones": "Mesa especial de construcción de paz — enfoque diferencial étnico y de género"
    },
    {
        "id": "pc-001",
        "tipo": "territorial",
        "nombre": "Plenaria de Cierre — Consolidación de Aportes Ciudadanos",
        "territorio": "Distrito de Cartagena",
        "lugar": "Centro de Convenciones de Cartagena de Indias",
        "fecha": "2026-12-11",
        "horaInicio": "08:00",
        "horaFin": "17:00",
        "estado": "programada",
        "dimensionesONU": [
            "Seguridad Personal",
            "Seguridad Comunitaria",
            "Seguridad Económica",
            "Seguridad Ambiental",
            "Seguridad Alimentaria",
            "Seguridad de la Salud",
            "Seguridad Política"
        ],
        "responsable": "Alcaldía Mayor de Cartagena — Secretaría de Planeación Distrital",
        "observaciones": "Sesión plenaria de cierre de la consulta pública. Incluye espacio formal de devolución ciudadana motivada (Sentencia C-150/15): presentación de resultados consolidados, respuesta institucional fundamentada a cada eje temático y firma del Acta de Compromisos 2026-2036. Asistencia abierta a todos los participantes de las mesas."
    }
]

    for item in semillas:
        op.execute(
            text("""
                INSERT INTO mesas_trabajo.agendas (
                    id, tipo, nombre, territorio, lugar, fecha,
                    hora_inicio, hora_fin, estado, dimensiones_onu,
                    responsable, observaciones
                ) VALUES (
                    :id, :tipo, :nombre, :territorio, :lugar, CAST(:fecha AS date),
                    :hora_inicio, :hora_fin, :estado, CAST(:dimensiones_onu AS jsonb),
                    :responsable, :observaciones
                ) ON CONFLICT (id) DO NOTHING;
            """).bindparams(
                id=item['id'],
                tipo=item['tipo'],
                nombre=item['nombre'],
                territorio=item.get('territorio', ''),
                lugar=item['lugar'],
                fecha=item['fecha'],
                hora_inicio=item.get('horaInicio', '08:30'),
                hora_fin=item.get('horaFin', '12:00'),
                estado=item.get('estado', 'programada'),
                dimensiones_onu=json.dumps(item.get('dimensionesONU', [])),
                responsable=item.get('responsable'),
                observaciones=item.get('observaciones'),
            )
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS mesas_trabajo.agendas CASCADE;")
