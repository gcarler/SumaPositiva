"""Persistencia Backend para Solicitudes Oficiales a Fuentes de Información (EDIT-03b).

Revision ID: 0042_modulo_fuentes_informacion
Revises: 0041_modulo_agendas_mesas
Create Date: 2026-10-04 05:00:00.000000
"""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0042_modulo_fuentes_informacion"
down_revision: str | Sequence[str] | None = "0041_modulo_agendas_mesas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Catálogo canónico de fuentes oficiales de información identificadas para Cartagena.
# AUDITORÍA EDIT-03b / OBS-REG-DATOS:
# Se prohíbe terminantemente sembrar radicados inventados, fechas falsas de solicitud,
# estados 'entregada' ficticios o resúmenes fabricados.
# Todas las fuentes inician honestamente con estado 'por_solicitar' y campos de radicación NULL.
CATALOGO_FUENTES_CANONICAS = [
    {
        "id": "fnt-loc-01",
        "codigo": "FNT-LOC-001",
        "entidad": "Policía Metropolitana de Cartagena (MECAR)",
        "nombre_fuente": "SIEDCO - Estadísticas Delictivas y Operativas",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "personal",
        "periodicidad": "mensual",
    },
    {
        "id": "fnt-loc-02",
        "codigo": "FNT-LOC-002",
        "entidad": "Instituto Nacional de Medicina Legal (Seccional Bolívar)",
        "nombre_fuente": "Dictámenes Periciales de Muertes Violentas y Lesiones",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "personal",
        "periodicidad": "trimestral",
    },
    {
        "id": "fnt-loc-03",
        "codigo": "FNT-LOC-003",
        "entidad": "Departamento Administrativo Distrital de Salud (DADIS)",
        "nombre_fuente": "SIVIGILA - Eventos de Interés en Salud Pública y Violencia de Género",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "salud",
        "periodicidad": "mensual",
    },
    {
        "id": "fnt-loc-04",
        "codigo": "FNT-LOC-004",
        "entidad": "Distriseguridad",
        "nombre_fuente": "Línea 123, Circuito Cerrado de TV y Centros de Monitoreo",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "crisis",
        "periodicidad": "mensual",
    },
    {
        "id": "fnt-loc-05",
        "codigo": "FNT-LOC-005",
        "entidad": "Secretaría del Interior y Convivencia Ciudadana",
        "nombre_fuente": "Registro de Comisarías de Familia e Inspecciones de Policía",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "comunitaria",
        "periodicidad": "trimestral",
    },
    {
        "id": "fnt-loc-06",
        "codigo": "FNT-LOC-006",
        "entidad": "Establecimiento Público Ambiental (EPA Cartagena)",
        "nombre_fuente": "Monitoreo de Calidad de Aire, Ruido y Residuos Peligrosos",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "ambiental",
        "periodicidad": "semestral",
    },
    {
        "id": "fnt-loc-07",
        "codigo": "FNT-LOC-007",
        "entidad": "Cuerpo Oficial de Bomberos de Cartagena",
        "nombre_fuente": "Bitácora Operativa de Incidentes, Emergencias e Incendios",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "crisis",
        "periodicidad": "mensual",
    },
    {
        "id": "fnt-loc-08",
        "codigo": "FNT-LOC-008",
        "entidad": "Oficina Asesora para la Gestión del Riesgo de Desastres (OAGRD)",
        "nombre_fuente": "Evaluación de Daños y Zonas de Amenaza Crítica por Inundación",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "ambiental",
        "periodicidad": "anual",
    },
    {
        "id": "fnt-nac-01",
        "codigo": "FNT-NAC-001",
        "entidad": "Departamento Administrativo Nacional de Estadística (DANE)",
        "nombre_fuente": "Encuesta de Convivencia y Seguridad Ciudadana (ECSC) y Pobreza Multidimensional",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "economica",
        "periodicidad": "anual",
    },
    {
        "id": "fnt-nac-02",
        "codigo": "FNT-NAC-002",
        "entidad": "Unidad para las Víctimas (Dirección Territorial Bolívar)",
        "nombre_fuente": "Registro Único de Víctimas (RUV) - Desplazamiento y Hechos Victimizantes",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "politica",
        "periodicidad": "trimestral",
    },
    {
        "id": "fnt-nac-03",
        "codigo": "FNT-NAC-003",
        "entidad": "Fiscalía General de la Nación (Seccional Bolívar)",
        "nombre_fuente": "SPOA - Sistema Penal Oral Acusatorio y Noticias Criminales",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "juridica",
        "periodicidad": "semestral",
    },
    {
        "id": "fnt-loc-09",
        "codigo": "FNT-LOC-009",
        "entidad": "Secretaría de Educación Distrital (SED)",
        "nombre_fuente": "SIMAT - Deserción Escolar, Cobertura y Entornos Seguros",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "educacion",
        "periodicidad": "anual",
    },
    {
        "id": "fnt-loc-10",
        "codigo": "FNT-LOC-010",
        "entidad": "Secretaría de Desarrollo Social",
        "nombre_fuente": "Censo Habitantes de Calle y Caracterización de Pobreza Extrema",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "economica",
        "periodicidad": "anual",
    },
    {
        "id": "fnt-nac-04",
        "codigo": "FNT-NAC-004",
        "entidad": "Instituto Colombiano de Bienestar Familiar (ICBF Regional Bolívar)",
        "nombre_fuente": "SISTEMAS PARD - Procesos Administrativos de Restablecimiento de Derechos",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "personal",
        "periodicidad": "trimestral",
    },
    {
        "id": "fnt-nac-05",
        "codigo": "FNT-NAC-005",
        "entidad": "Migración Colombia (Regional Caribe)",
        "nombre_fuente": "Registro de Población Migrante con Permiso por Protección Temporal (PPT)",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "social",
        "periodicidad": "semestral",
    },
    {
        "id": "fnt-loc-11",
        "codigo": "FNT-LOC-011",
        "entidad": "Personería Distrital de Cartagena",
        "nombre_fuente": "Quejas por Vulneración de Derechos Humanos y Abuso Policial",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "politica",
        "periodicidad": "trimestral",
    },
    {
        "id": "fnt-loc-12",
        "codigo": "FNT-LOC-012",
        "entidad": "Secretaría de Hacienda Distrital",
        "nombre_fuente": "Recaudo y Ejecución Presupuestal FONSET y Destinaciones Específicas",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "economica",
        "periodicidad": "trimestral",
    },
    {
        "id": "fnt-nac-06",
        "codigo": "FNT-NAC-006",
        "entidad": "Armada Nacional de Colombia (Fuerza Naval del Caribe)",
        "nombre_fuente": "Control Fluvial, Costero y Lucha contra el Narcotráfico en Bahía",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "personal",
        "periodicidad": "semestral",
    },
]


def upgrade() -> None:
    # 1. Creación de la tabla de fuentes de información y solicitudes oficiales
    op.execute("""
        CREATE TABLE IF NOT EXISTS auditoria.fuentes_informacion (
            id VARCHAR(50) PRIMARY KEY,
            codigo VARCHAR(50) UNIQUE NOT NULL,
            entidad VARCHAR(250) NOT NULL,
            nombre_fuente VARCHAR(250) NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            ambito VARCHAR(20) NOT NULL,
            dimension_seguridad VARCHAR(50) NOT NULL,
            periodicidad VARCHAR(50) NOT NULL,
            radicado_solicitud VARCHAR(100),
            fecha_solicitud DATE,
            fecha_limite_respuesta DATE,
            estado_entrega VARCHAR(30) NOT NULL DEFAULT 'por_solicitar',
            variables_solicitadas JSONB NOT NULL DEFAULT '[]'::jsonb,
            resumen_datos TEXT,
            archivo_adjunto_url VARCHAR(500),
            responsable_contacto JSONB NOT NULL DEFAULT '{}'::jsonb,
            observaciones_calidad TEXT,
            actualizado_por VARCHAR(100),
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # 2. Índices de optimización y búsqueda
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_fuentes_ambito
            ON auditoria.fuentes_informacion (ambito);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_fuentes_estado
            ON auditoria.fuentes_informacion (estado_entrega);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_fuentes_dimension
            ON auditoria.fuentes_informacion (dimension_seguridad);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_fuentes_radicado
            ON auditoria.fuentes_informacion (radicado_solicitud);
    """)

    # 3. Permisos RBAC en autenticacion.roles
    op.execute("""
        UPDATE autenticacion.roles
        SET permisos = permisos || '["fuentes:leer", "fuentes:gestionar"]'::jsonb
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades')
          AND NOT permisos ? 'fuentes:gestionar';
    """)
    op.execute("""
        UPDATE autenticacion.roles
        SET permisos = permisos || '["fuentes:leer"]'::jsonb
        WHERE codigo IN ('auditor_forense', 'facilitador_mesa', 'ciudadano')
          AND NOT permisos ? 'fuentes:leer';
    """)

    # 4. Catálogo inicial canónico: SOLO entidades oficiales con estado 'por_solicitar'
    # CERO radicados, CERO fechas ficticias, CERO resúmenes fabricados.
    sql_insert = text("""
        INSERT INTO auditoria.fuentes_informacion (
            id, codigo, entidad, nombre_fuente, tipo, ambito, dimension_seguridad,
            periodicidad, radicado_solicitud, fecha_solicitud, fecha_limite_respuesta,
            estado_entrega, variables_solicitadas, resumen_datos, archivo_adjunto_url,
            responsable_contacto, observaciones_calidad
        ) VALUES (
            :id, :codigo, :entidad, :nombre_fuente, :tipo, :ambito, :dimension_seguridad,
            :periodicidad, NULL, NULL, NULL,
            'por_solicitar', '[]'::jsonb, NULL, NULL,
            '{}'::jsonb, NULL
        ) ON CONFLICT (id) DO UPDATE SET
            radicado_solicitud = NULL,
            fecha_solicitud = NULL,
            fecha_limite_respuesta = NULL,
            estado_entrega = 'por_solicitar',
            variables_solicitadas = '[]'::jsonb,
            resumen_datos = NULL,
            archivo_adjunto_url = NULL,
            responsable_contacto = '{}'::jsonb,
            observaciones_calidad = NULL;
    """)

    conn = op.get_bind()
    for f in CATALOGO_FUENTES_CANONICAS:
        conn.execute(
            sql_insert,
            {
                "id": f["id"],
                "codigo": f["codigo"],
                "entidad": f["entidad"],
                "nombre_fuente": f["nombre_fuente"],
                "tipo": f["tipo"],
                "ambito": f["ambito"],
                "dimension_seguridad": f["dimension_seguridad"],
                "periodicidad": f["periodicidad"],
            },
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auditoria.fuentes_informacion CASCADE;")
