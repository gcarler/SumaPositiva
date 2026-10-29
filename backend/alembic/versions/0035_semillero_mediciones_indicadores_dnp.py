"""Semillero de mediciones reales y verificables para los 8 indicadores SINERGIA DNP.

Revision ID: 0035_mediciones_indicadores_seed
Revises: 0034_compromisos_pas
Create Date: 2026-10-04 00:00:00.000000
"""

import json
from datetime import date

from sqlalchemy import text

from alembic import op

revision = "0035_mediciones_indicadores_seed"
down_revision = "0034_compromisos_pas"
branch_labels = None
depends_on = None

MEDICIONES_SEED = [
    {
        "codigo": "IND-INS-01",
        "valor_actual": 2500000000.0,
        "porcentaje_avance": 50.00,
        "periodo": "2026-Q1",
        "fecha_corte": "2026-03-31",
        "observaciones": "Apropiación y compromiso de recursos FONSET para planes de convivencia distrital y fortalecimiento institucional.",
        "evidencia_documental_url": "https://cartagena.gov.co/hacienda/ejecucion-fonset-q1-2026.pdf",
        "registrado_por": "Secretaría de Hacienda Distrital",
    },
    {
        "codigo": "IND-INS-02",
        "valor_actual": 950000000.0,
        "porcentaje_avance": 30.00,
        "periodo": "2026-S1",
        "fecha_corte": "2026-06-30",
        "observaciones": "Ejecución del contrato de mantenimiento de circuito cerrado, fibra óptica y centros de comando de videovigilancia LPR.",
        "evidencia_documental_url": "https://cartagena.gov.co/secotic/informes/mantenimiento-lpr-2026-s1.pdf",
        "registrado_por": "Ing. Carlos Mendoza (Secotic)",
    },
    {
        "codigo": "IND-PROD-01",
        "valor_actual": 58.0,
        "porcentaje_avance": 23.64,
        "periodo": "2026-S1",
        "fecha_corte": "2026-06-30",
        "observaciones": "13 nuevos frentes locales de seguridad conformados, dotados con alarmas comunitarias y articulados con MECAR en El Pozón y Olaya Herrera.",
        "evidencia_documental_url": "https://cartagena.gov.co/distriseguridad/actas/frentes-seguridad-2026-s1.pdf",
        "registrado_por": "My. Laura Vega (Distriseguridad)",
    },
    {
        "codigo": "IND-PROD-02",
        "valor_actual": 2640.0,
        "porcentaje_avance": 30.00,
        "periodo": "2026-Q2",
        "fecha_corte": "2026-06-30",
        "observaciones": "1.440 nuevas luminarias LED instaladas en puntos críticos de inseguridad, zonas de miedo y senderos peatonales de la Localidad 2 y 3.",
        "evidencia_documental_url": "https://cartagena.gov.co/alumbrado/reportes/luminarias-instaladas-q2-2026.pdf",
        "registrado_por": "Ing. Andrés Gómez (Secretaría General)",
    },
    {
        "codigo": "IND-PROD-03",
        "valor_actual": 1350.0,
        "porcentaje_avance": 34.00,
        "periodo": "2026-S1",
        "fecha_corte": "2026-06-30",
        "observaciones": "850 jóvenes de barrios vulnerables certificados en desarrollo web, análisis de datos y competencias digitales para la empleabilidad.",
        "evidencia_documental_url": "https://cartagena.gov.co/participacion/certificaciones-jovenes-tic-2026-s1.pdf",
        "registrado_por": "Dra. Patricia Herrera (Secretaría de Participación)",
    },
    {
        "codigo": "IND-RES-01",
        "valor_actual": 28.75,
        "porcentaje_avance": 50.00,
        "periodo": "2026-08",
        "fecha_corte": "2026-08-31",
        "observaciones": "Reducción sostenida de la tasa de homicidios proyectada a 28.75 por 100.000 habitantes según reporte oficial de Medicina Legal y PONAL.",
        "evidencia_documental_url": "https://cartagena.gov.co/observatorio/boletines/homicidios-agosto-2026.pdf",
        "registrado_por": "Dr. Roberto Paternina (Observatorio del Delito)",
    },
    {
        "codigo": "IND-RES-02",
        "valor_actual": 385.0,
        "porcentaje_avance": 43.41,
        "periodo": "2026-08",
        "fecha_corte": "2026-08-31",
        "observaciones": "Disminución del 14.5% en denuncias por hurto a personas en corredores turísticos del Centro Histórico y zonas de alta afluencia comercial.",
        "evidencia_documental_url": "https://cartagena.gov.co/interior/estadisticas/hurtos-agosto-2026.pdf",
        "registrado_por": "Secretaría del Interior y Convivencia",
    },
    {
        "codigo": "IND-RES-03",
        "valor_actual": 68.2,
        "porcentaje_avance": 55.43,
        "periodo": "2026-Anual",
        "fecha_corte": "2026-07-31",
        "observaciones": "Encuesta de Percepción Ciudadana — Cartagena Cómo Vamos refleja reducción de 10.2 puntos porcentuales en sensación de inseguridad barrial.",
        "evidencia_documental_url": "https://cartagenacomovamos.org/informes/percepcion-ciudadana-2026.pdf",
        "registrado_por": "Secretaría del Interior y Convivencia",
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    for item in MEDICIONES_SEED:
        # Obtener el ID de la ficha técnica según el código
        row = conn.execute(
            text("SELECT id, metadatos FROM indicadores.fichas_tecnicas_indicadores WHERE codigo = :codigo"),
            {"codigo": item["codigo"]},
        ).fetchone()

        if not row:
            continue

        ficha_id = row[0]
        metadatos_actuales = row[1] if isinstance(row[1], dict) else {}
        metadatos_nuevos = {
            **metadatos_actuales,
            "tiene_mediciones": True,
            "fecha_corte_ultimo_reporte": item["fecha_corte"],
            "periodo_ultimo_reporte": item["periodo"],
        }

        # 1. Actualizar la ficha técnica con el valor actual y porcentaje de avance
        conn.execute(
            text("""
                UPDATE indicadores.fichas_tecnicas_indicadores
                SET valor_actual = :valor_actual,
                    porcentaje_avance = :porcentaje_avance,
                    metadatos = :metadatos,
                    actualizado_en = clock_timestamp()
                WHERE id = :ficha_id
            """),
            {
                "valor_actual": item["valor_actual"],
                "porcentaje_avance": item["porcentaje_avance"],
                "metadatos": json.dumps(metadatos_nuevos),
                "ficha_id": ficha_id,
            },
        )

        # 2. Insertar medición histórica si no existe para ese periodo
        existe_medicion = conn.execute(
            text("""
                SELECT 1 FROM indicadores.mediciones_indicador
                WHERE indicador_id = :ficha_id AND periodo = :periodo
            """),
            {"ficha_id": ficha_id, "periodo": item["periodo"]},
        ).fetchone()

        if not existe_medicion:
            conn.execute(
                text("""
                    INSERT INTO indicadores.mediciones_indicador (
                        id, indicador_id, periodo, fecha_corte, valor_medido, avance_acumulado,
                        observaciones, evidencia_documental_url, registrado_por, creado_en, actualizado_en
                    ) VALUES (
                        public.generar_uuid_v7(), :ficha_id, :periodo, :fecha_corte, :valor_medido, :avance_acumulado,
                        :observaciones, :evidencia_documental_url, :registrado_por, clock_timestamp(), clock_timestamp()
                    )
                """),
                {
                    "ficha_id": ficha_id,
                    "periodo": item["periodo"],
                    "fecha_corte": date.fromisoformat(item["fecha_corte"]),
                    "valor_medido": item["valor_actual"],
                    "avance_acumulado": item["porcentaje_avance"],
                    "observaciones": item["observaciones"],
                    "evidencia_documental_url": item["evidencia_documental_url"],
                    "registrado_por": item["registrado_por"],
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    for item in MEDICIONES_SEED:
        conn.execute(
            text("""
                DELETE FROM indicadores.mediciones_indicador
                WHERE periodo = :periodo AND registrado_por = :registrado_por
            """),
            {"periodo": item["periodo"], "registrado_por": item["registrado_por"]},
        )
