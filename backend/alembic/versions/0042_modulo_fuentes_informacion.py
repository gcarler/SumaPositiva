"""Persistencia Backend para Solicitudes Oficiales a Fuentes de Información (EDIT-03).

Revision ID: 0042_modulo_fuentes_informacion
Revises: 0041_modulo_agendas_mesas
Create Date: 2026-10-04 05:00:00.000000
"""

from datetime import date
import json
from typing import Sequence, Union
from alembic import op
from sqlalchemy import text

revision: str = "0042_modulo_fuentes_informacion"
down_revision: Union[str, Sequence[str], None] = "0041_modulo_agendas_mesas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FUENTES_INICIALES_CANONICAS = [
    {
        "id": "fnt-loc-01",
        "codigo": "FNT-LOC-001",
        "entidad": "Policía Metropolitana de Cartagena (MECAR)",
        "nombre_fuente": "SIEDCO - Estadísticas Delictivas y Operativas",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "personal",
        "periodicidad": "mensual",
        "radicado_solicitud": "DIST-SEC-2026-0891",
        "fecha_solicitud": "2026-01-15",
        "fecha_limite_respuesta": "2026-02-15",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Homicidios desagregados por cuadrante y móvil",
            "Hurto a personas, comercio y residencias",
            "Lesiones personales y riñas",
            "Incautación de armas de fuego y estupefacientes",
        ],
        "resumen_datos": "Serie histórica consolidada 2021-2025 y cortes mensuales a enero-marzo 2026 por cuadrante.",
        "archivo_adjunto_url": "https://www.policia.gov.co",
        "observaciones_calidad": "Información georreferenciada con cobertura en 108 cuadrantes urbanos y 12 rurales.",
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
        "radicado_solicitud": "DIST-SEC-2026-1045",
        "fecha_solicitud": "2026-02-01",
        "fecha_limite_respuesta": "2026-03-15",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Necropsias por causas externas (homicidio, suicidio, accidentes)",
            "Exámenes por presunto delito sexual y violencia intrafamiliar",
            "Variables sociodemográficas de víctimas (edad, sexo, etnia)",
        ],
        "resumen_datos": "Boletín epidemiológico consolidado 2024-2025 y primer bimestre 2026.",
        "archivo_adjunto_url": "https://www.medicinalegal.gov.co",
        "observaciones_calidad": "Excelente nivel de detalle pericial. Permite cruce con datos de fiscalía y cuadrantes.",
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
        "radicado_solicitud": "DIST-SEC-2026-1180",
        "fecha_solicitud": "2026-02-10",
        "fecha_limite_respuesta": "2026-03-20",
        "estado_entrega": "incompleta",
        "variables_solicitadas": [
            "Ficha 875: Violencia de género e intrafamiliar",
            "Ficha 356: Intoxicaciones por sustancias psicoactivas",
            "Intentos de suicidio por localidad y grupo etario",
            "Casos de desnutrición infantil aguda (Ciénaga y zona insular)",
        ],
        "resumen_datos": "Fichas 875 y 356 entregadas; pendiente georreferenciación de la zona insular (Tierrabomba y Barú).",
        "archivo_adjunto_url": "https://www.cartagena.gov.co",
        "observaciones_calidad": "Requiere completitud en zona corregimental e insular para análisis diferencial de salud y género.",
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
        "radicado_solicitud": "DIST-SEC-2026-1250",
        "fecha_solicitud": "2026-02-20",
        "fecha_limite_respuesta": "2026-04-10",
        "estado_entrega": "en_termino",
        "variables_solicitadas": [
            "Llamadas efectivas a Línea 123 clasificadas por motivo",
            "Tiempos de respuesta de despacho policial y ambulancias",
            "Cámaras de vigilancia activas vs. inoperativas por comuna",
            "Botones de pánico y alarmas comunitarias activadas",
        ],
        "resumen_datos": "Entrega programada para corte del primer trimestre 2026.",
        "archivo_adjunto_url": "https://www.cartagena.gov.co",
        "observaciones_calidad": "Proceso de extracción automatizada desde plataforma CAD de la Policía.",
    },
    {
        "id": "fnt-loc-05",
        "codigo": "FNT-LOC-005",
        "entidad": "Establecimiento Público Ambiental (EPA Cartagena)",
        "nombre_fuente": "Monitoreo de Calidad Ambiental, Vertimientos y Contaminación Sonora",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "ambiental",
        "periodicidad": "semestral",
        "radicado_solicitud": "DIST-SEC-2026-0920",
        "fecha_solicitud": "2026-01-20",
        "fecha_limite_respuesta": "2026-02-28",
        "estado_entrega": "requerimiento_insistencia",
        "variables_solicitadas": [
            "Puntos de emisión sonora crítica en Centro Histórico y Bazurto",
            "Monitoreo de aguas en Ciénaga de la Virgen y Caño de Juan Angola",
            "Licencias y sanciones ambientales en bahía de Cartagena",
        ],
        "resumen_datos": "Sin respuesta inicial. Se radicó oficio de insistencia DIST-INS-2026-012 el 10 de marzo de 2026.",
        "archivo_adjunto_url": "https://www.cartagena.gov.co",
        "observaciones_calidad": "Información crítica para el componente de seguridad ambiental y conflictos ecoterritoriales.",
    },
    {
        "id": "fnt-loc-06",
        "codigo": "FNT-LOC-006",
        "entidad": "Oficina Asesora de Gestión del Riesgo y Desastres (OAGRD)",
        "nombre_fuente": "Inventario de Puntos Críticos, Asentamientos Informales y Riesgo Costero",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "ambiental",
        "periodicidad": "semestral",
        "radicado_solicitud": "DIST-SEC-2026-1011",
        "fecha_solicitud": "2026-01-25",
        "fecha_limite_respuesta": "2026-03-05",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Mapa de sectores con amenaza alta por remoción en masa (La Popa)",
            "Puntos críticos por inundación y marea alta en Ciénaga de la Virgen",
            "Censo de familias en riesgo no mitigable en zonas de bajamar",
        ],
        "resumen_datos": "Documento técnico y capas vectoriales SHP de zonas de riesgo 2025-2026.",
        "archivo_adjunto_url": "https://www.cartagena.gov.co",
        "observaciones_calidad": "Capas georreferenciadas integradas con éxito en el Geovisor PostGIS de POLIS.",
    },
    {
        "id": "fnt-loc-07",
        "codigo": "FNT-LOC-007",
        "entidad": "Cartagena Cómo Vamos (CCV)",
        "nombre_fuente": "Encuesta de Percepción Ciudadana (EPC) e Informe de Calidad de Vida",
        "tipo": "secundaria",
        "ambito": "local",
        "dimension_seguridad": "comunitaria",
        "periodicidad": "anual",
        "radicado_solicitud": "DIST-SEC-2026-0740",
        "fecha_solicitud": "2026-01-10",
        "fecha_limite_respuesta": "2026-02-10",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Percepción de seguridad en barrio y ciudad",
            "Victimización directa e indirecta",
            "Confianza en instituciones públicas y policía",
            "Satisfacción con servicios públicos, hábitat y movilidad",
        ],
        "resumen_datos": "Base de microdatos anonimizada y tabulados en formato CSV/Stata edición 2025.",
        "archivo_adjunto_url": "https://cartagenacomovamos.org",
        "observaciones_calidad": "Muestra representativa de 1.200 hogares en las 3 localidades urbanas.",
    },
    {
        "id": "fnt-loc-08",
        "codigo": "FNT-LOC-008",
        "entidad": "Distrito de Cartagena - Secretaría del Interior",
        "nombre_fuente": "Mesas de Trabajo POLIS 2026 (Actas Territoriales y Árboles MGA)",
        "tipo": "primaria",
        "ambito": "local",
        "dimension_seguridad": "personal",
        "periodicidad": "por_demanda",
        "radicado_solicitud": "POLIS-MESA-PROG-2026",
        "fecha_solicitud": "2026-02-01",
        "fecha_limite_respuesta": "2026-05-30",
        "estado_entrega": "en_termino",
        "variables_solicitadas": [
            "Actas oficiales en PDF firmadas con sellos SHA-256",
            "Registro de asistencia digital multicanal y QR",
            "Árboles de problemas y soluciones diligenciados en papelógrafo",
            "Aportes ciudadanos georreferenciados por mesa comunal",
        ],
        "resumen_datos": "Actas territorializadas consolidadas en base de datos de producción `bd_csh`.",
        "archivo_adjunto_url": "https://www.cartagena.gov.co",
        "observaciones_calidad": "Fuente primaria viva. Validación biométrica y pericial directa en terreno.",
    },
    {
        "id": "fnt-nac-01",
        "codigo": "FNT-NAC-001",
        "entidad": "Departamento Administrativo Nacional de Estadística (DANE)",
        "nombre_fuente": "ECSC - Encuesta de Convivencia y Seguridad Ciudadana",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "personal",
        "periodicidad": "anual",
        "radicado_solicitud": "DANE-PQR-2026-44321",
        "fecha_solicitud": "2026-01-20",
        "fecha_limite_respuesta": "2026-03-01",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Tasa de victimización global y por modalidades delictivas",
            "Cifra negra (delitos no denunciados y motivos de no denuncia)",
            "Percepción de inseguridad y confianza en cuadrantes de Cartagena",
        ],
        "resumen_datos": "Módulo específico para área metropolitana de Cartagena 2024-2025.",
        "archivo_adjunto_url": "https://www.dane.gov.co",
        "observaciones_calidad": "Rigurosidad muestral alta. Muestra una cifra negra del 71.4% en hurto simple.",
    },
    {
        "id": "fnt-nac-02",
        "codigo": "FNT-NAC-002",
        "entidad": "Departamento Administrativo Nacional de Estadística (DANE)",
        "nombre_fuente": "GEIH - Gran Encuesta Integrada de Hogares (Mercado Laboral)",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "economica",
        "periodicidad": "mensual",
        "radicado_solicitud": "DANE-PQR-2026-55102",
        "fecha_solicitud": "2026-02-15",
        "fecha_limite_respuesta": "2026-03-25",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Tasa global de ocupación y desempleo juvenil (18-28 años)",
            "Tasa de informalidad laboral en Cartagena",
            "Ingresos promedio y brecha de género laboral",
        ],
        "resumen_datos": "Serie mensual con corte a febrero 2026. Tasa de informalidad distrital en 57.3%.",
        "archivo_adjunto_url": "https://www.dane.gov.co",
        "observaciones_calidad": "Dato fundamental para modelar la relación entre informalidad juvenil y captación de economías ilícitas.",
    },
    {
        "id": "fnt-nac-03",
        "codigo": "FNT-NAC-003",
        "entidad": "Departamento Administrativo Nacional de Estadística (DANE)",
        "nombre_fuente": "IPM - Índice de Pobreza Multidimensional y Necesidades Básicas Insatisfechas",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "economica",
        "periodicidad": "anual",
        "radicado_solicitud": "DANE-PQR-2026-55103",
        "fecha_solicitud": "2026-02-15",
        "fecha_limite_respuesta": "2026-03-25",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Porcentaje de hogares en privación por dimensión (salud, educación, niñez, trabajo, vivienda)",
            "NBI por sectores censales y corregimientos de Cartagena",
        ],
        "resumen_datos": "Datos censales desagregados a nivel de manzana y sector corregimental.",
        "archivo_adjunto_url": "https://www.dane.gov.co",
        "observaciones_calidad": "Permite correlacionar privación multidimensional con homicidios y delitos de alto impacto.",
    },
    {
        "id": "fnt-nac-04",
        "codigo": "FNT-NAC-004",
        "entidad": "Departamento Nacional de Planeación (DNP)",
        "nombre_fuente": "Terridata - Fichas Territoriales y Ejecución de Inversión",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "politica",
        "periodicidad": "semestral",
        "radicado_solicitud": "DNP-EXP-2026-0098",
        "fecha_solicitud": "2026-01-18",
        "fecha_limite_respuesta": "2026-02-28",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Desempeño fiscal distrital y capacidad de endeudamiento",
            "Inversión per cápita en seguridad y justicia",
            "Indicadores de cobertura en educación media y técnica",
        ],
        "resumen_datos": "Descarga automatizada de fichas consolidadas 2021-2025 para el Distrito de Cartagena.",
        "archivo_adjunto_url": "https://terridata.dnp.gov.co",
        "observaciones_calidad": "Estandarizado y validado según metodología SINERGIA y DNP.",
    },
    {
        "id": "fnt-nac-05",
        "codigo": "FNT-NAC-005",
        "entidad": "Fiscalía General de la Nación",
        "nombre_fuente": "SPOA - Sistema Penal Oral Acusatorio (Noticias Criminales e Impunidad)",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "personal",
        "periodicidad": "trimestral",
        "radicado_solicitud": "FGN-PQR-2026-00912",
        "fecha_solicitud": "2026-01-22",
        "fecha_limite_respuesta": "2026-02-22",
        "estado_entrega": "vencida_sin_entrega",
        "variables_solicitadas": [
            "Noticias criminales abiertas por homicidio doloso, extorsión y microtráfico",
            "Tasa de esclarecimiento y judicialización en Seccional Bolívar",
            "Organizaciones criminales y estructuras GDCO/GAO identificadas",
        ],
        "resumen_datos": "Vencido el término legal sin respuesta institucional. Procede traslado a control disciplinario.",
        "archivo_adjunto_url": "https://www.fiscalia.gov.co",
        "observaciones_calidad": "Brecha pericial crítica para medir la impunidad real frente a la tasa de esclarecimiento.",
    },
    {
        "id": "fnt-nac-06",
        "codigo": "FNT-NAC-006",
        "entidad": "Instituto Nacional de Medicina Legal (Nacional)",
        "nombre_fuente": "Forensis - Datos para la Vida (Consolidado Nacional)",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "personal",
        "periodicidad": "anual",
        "radicado_solicitud": "ML-EXT-2026-0034",
        "fecha_solicitud": "2026-02-05",
        "fecha_limite_respuesta": "2026-03-20",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Análisis comparativo de tasas de homicidio por 100.000 habitantes en ciudades capitales del Caribe",
            "Metodología estandarizada de lesiones no fatales",
        ],
        "resumen_datos": "Tomo Forensis 2024-2025 y avances preliminares 2026.",
        "archivo_adjunto_url": "https://www.medicinalegal.gov.co",
        "observaciones_calidad": "Validación estadística nacional de referencia para la línea base de la política.",
    },
    {
        "id": "fnt-nac-07",
        "codigo": "FNT-NAC-007",
        "entidad": "Defensoría del Pueblo",
        "nombre_fuente": "SAT - Sistema de Alertas Tempranas (Riesgos a Líderes y Comunidades)",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "crisis",
        "periodicidad": "por_demanda",
        "radicado_solicitud": "DP-SAT-2026-00431",
        "fecha_solicitud": "2026-02-12",
        "fecha_limite_respuesta": "2026-03-12",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Alertas Tempranas de Inminencia vigentes para el Distrito de Cartagena",
            "Informes de seguimiento a la Alerta 012 de 2023 y sus notas de seguimiento 2025-2026",
            "Recomendaciones obligatorias a autoridades locales y fuerza pública",
        ],
        "resumen_datos": "Alerta Temprana 002-26 y notas de seguimiento emitidas para Nelson Mandela, El Pozón y Tierrabomba.",
        "archivo_adjunto_url": "https://www.defensoria.gov.co",
        "observaciones_calidad": "Cumplimiento vinculante bajo el Decreto 037 de 2026 del Ministerio del Interior.",
    },
    {
        "id": "fnt-nac-08",
        "codigo": "FNT-NAC-008",
        "entidad": "Unidad para las Víctimas (UARIV)",
        "nombre_fuente": "RUV - Registro Único de Víctimas y Fichas de Sujetos de Reparación Colectiva",
        "tipo": "secundaria",
        "ambito": "nacional",
        "dimension_seguridad": "comunitaria",
        "periodicidad": "semestral",
        "radicado_solicitud": "UARIV-SOL-2026-781",
        "fecha_solicitud": "2026-02-28",
        "fecha_limite_respuesta": "2026-04-15",
        "estado_entrega": "en_termino",
        "variables_solicitadas": [
            "Población víctima del conflicto armada residente en Cartagena (desplazamiento forzado, amenazas)",
            "Planes Integrales de Reparación Colectiva (PIRC) vigentes en la subregión",
            "Avance en medidas de indemnización y satisfacción",
        ],
        "resumen_datos": "Ficha preliminar de caracterización con más de 120.000 víctimas registradas en Cartagena.",
        "archivo_adjunto_url": "https://www.unidadvictimas.gov.co",
        "observaciones_calidad": "En proceso de cruce con la base de Sisbén IV distrital.",
    },
    {
        "id": "fnt-int-01",
        "codigo": "FNT-INT-001",
        "entidad": "Programa de las Naciones Unidas para el Desarrollo (PNUD)",
        "nombre_fuente": "Marco de Indicadores de Seguridad Humana Territorial",
        "tipo": "secundaria",
        "ambito": "internacional",
        "dimension_seguridad": "comunitaria",
        "periodicidad": "anual",
        "radicado_solicitud": "PNUD-COL-2026-019",
        "fecha_solicitud": "2026-01-25",
        "fecha_limite_respuesta": "2026-03-05",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "Dimensiones globales de Seguridad Humana (Personal, Ambiental, Económica, Salud, Alimentaria, Política, Comunitaria)",
            "Metodología de medición de cohesión social y resiliencia urbana",
        ],
        "resumen_datos": "Guía técnica metodológica y matriz de indicadores adaptados al contexto de ciudades puerto del Caribe.",
        "archivo_adjunto_url": "https://www.undp.org",
        "observaciones_calidad": "Estándar internacional rector para la estructura de las 7 dimensiones de POLIS.",
    },
    {
        "id": "fnt-int-02",
        "codigo": "FNT-INT-002",
        "entidad": "Oficina de las Naciones Unidas contra la Droga y el Delito (UNODC)",
        "nombre_fuente": "Monitoreo Portuario y Dinámicas Transnacionales de Tráfico Ilícito",
        "tipo": "secundaria",
        "ambito": "internacional",
        "dimension_seguridad": "personal",
        "periodicidad": "semestral",
        "radicado_solicitud": "UNODC-COL-2026-088",
        "fecha_solicitud": "2026-02-18",
        "fecha_limite_respuesta": "2026-04-05",
        "estado_entrega": "incompleta",
        "variables_solicitadas": [
            "Diagnóstico sobre contaminación de contenedores marítimos en la bahía de Cartagena",
            "Impacto de las rutas transnacionales en el sicariato local y disputas territoriales",
            "Buenas prácticas en control de precursores y microtráfico costero",
        ],
        "resumen_datos": "Entregado resumen ejecutivo; informe reservado pendiente de autorización de la agencia marítima.",
        "archivo_adjunto_url": "https://www.unodc.org",
        "observaciones_calidad": "Datos preliminares muy valiosos para dimensionar la incidencia del narcotráfico en la violencia urbana.",
    },
]


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS auditoria.fuentes_informacion (
            id VARCHAR(50) PRIMARY KEY,
            codigo VARCHAR(50) NOT NULL UNIQUE,
            entidad VARCHAR(255) NOT NULL,
            nombre_fuente VARCHAR(255) NOT NULL,
            tipo VARCHAR(30) NOT NULL DEFAULT 'secundaria',
            ambito VARCHAR(30) NOT NULL DEFAULT 'local',
            dimension_seguridad VARCHAR(50) NOT NULL DEFAULT 'personal',
            periodicidad VARCHAR(30) NOT NULL DEFAULT 'mensual',
            radicado_solicitud VARCHAR(100),
            fecha_solicitud DATE,
            fecha_limite_respuesta DATE,
            estado_entrega VARCHAR(50) NOT NULL DEFAULT 'en_termino',
            variables_solicitadas JSONB NOT NULL DEFAULT '[]'::jsonb,
            resumen_datos TEXT,
            archivo_adjunto_url TEXT,
            responsable_contacto JSONB NOT NULL DEFAULT '{}'::jsonb,
            observaciones_calidad TEXT,
            actualizado_por VARCHAR(100),
            creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_fuentes_info_codigo ON auditoria.fuentes_informacion (codigo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_fuentes_info_entidad ON auditoria.fuentes_informacion (entidad)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_fuentes_info_estado ON auditoria.fuentes_informacion (estado_entrega)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_fuentes_info_radicado ON auditoria.fuentes_informacion (radicado_solicitud)")

    # Permisos RBAC en autenticacion.roles
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

    # Sembrado canónico e idempotente de las 18 fuentes oficiales
    sql_insert = text("""
        INSERT INTO auditoria.fuentes_informacion (
            id, codigo, entidad, nombre_fuente, tipo, ambito, dimension_seguridad,
            periodicidad, radicado_solicitud, fecha_solicitud, fecha_limite_respuesta,
            estado_entrega, variables_solicitadas, resumen_datos, archivo_adjunto_url,
            responsable_contacto, observaciones_calidad
        ) VALUES (
            :id, :codigo, :entidad, :nombre_fuente, :tipo, :ambito, :dimension_seguridad,
            :periodicidad, :radicado_solicitud, :fecha_solicitud, :fecha_limite_respuesta,
            :estado_entrega, CAST(:variables_solicitadas AS jsonb), :resumen_datos, :archivo_adjunto_url,
            CAST(:responsable_contacto AS jsonb), :observaciones_calidad
        ) ON CONFLICT (id) DO NOTHING
    """)

    conn = op.get_bind()
    for f in FUENTES_INICIALES_CANONICAS:
        fecha_sol = (
            date.fromisoformat(f["fecha_solicitud"])
            if f.get("fecha_solicitud")
            else None
        )
        fecha_lim = (
            date.fromisoformat(f["fecha_limite_respuesta"])
            if f.get("fecha_limite_respuesta")
            else None
        )
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
                "radicado_solicitud": f.get("radicado_solicitud"),
                "fecha_solicitud": fecha_sol,
                "fecha_limite_respuesta": fecha_lim,
                "estado_entrega": f["estado_entrega"],
                "variables_solicitadas": json.dumps(f.get("variables_solicitadas", [])),
                "resumen_datos": f.get("resumen_datos"),
                "archivo_adjunto_url": f.get("archivo_adjunto_url"),
                "responsable_contacto": json.dumps(f.get("responsable_contacto", {})),
                "observaciones_calidad": f.get("observaciones_calidad"),
            },
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auditoria.fuentes_informacion CASCADE;")
