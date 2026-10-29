"""Ingesta oficial y certificacion de indicadores reales de seguridad y convivencia para Cartagena de Indias.

Tarea: [INGESTA-DATOS-01]
Plan Maestro: Fase 2 - Ingesta de Datos Vivos y Feedback Loop

Revision ID: 0055_ingesta_indicadores_reales
Revises: 0054_permisos_plenos_admin
Create Date: 2026-10-11 04:26:00.000000
"""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0055_ingesta_indicadores_reales"
down_revision: str | Sequence[str] | None = "0054_permisos_plenos_admin"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


MEDICIONES_DATA = [
    # 1. Presupuesto FONSET
    {
        "codigo": "IND-INS-01",
        "fuente": "CHIP - Secretaría de Hacienda Distrital",
        "valor": 2180000000.0000,
        "avance": 39.33,
        "obs": "Ejecución presupuestal acumulada vigencia 2024 del Fondo Cuenta Territorial de Seguridad y Convivencia Ciudadana (FONSET). Recursos orientados a planes de convivencia y prevención del delito en las 3 localidades de Cartagena.",
        "url": "https://www.cartagena.gov.co/transparencia/presupuesto/fonset-2024",
    },
    # 2. Cámaras de seguridad
    {
        "codigo": "IND-INS-02",
        "fuente": "Secotic",
        "valor": 1150000000.0000,
        "avance": 43.33,
        "obs": "Inversión certificada en mantenimiento preventivo y correctivo del circuito cerrado de televisión (CCTV) y red de videovigilancia distrital conectada al CAD MECAR.",
        "url": "https://www.cartagena.gov.co/secotic/infraestructura-seguridad-2024",
    },
    # 3. Frentes de seguridad
    {
        "codigo": "IND-PROD-01",
        "fuente": "Policía MECAR (Cartagena)",
        "valor": 68.0000,
        "avance": 41.82,
        "obs": "Frentes locales de seguridad y convivencia ciudadana activos, capacitados y articulados con los cuadrantes de la Policía Metropolitana de Cartagena (MECAR).",
        "url": "https://www.policia.gov.co/regiones/region-8/mecar-frentes-seguridad-2024",
    },
    # 4. Luminarias
    {
        "codigo": "IND-PROD-02",
        "fuente": "Concesión Alumbrado Público de Cartagena",
        "valor": 2850.0000,
        "avance": 34.38,
        "obs": "Instalación y reposición de luminarias LED de alta eficiencia en puntos oscuros críticos, parques y corredores peatonales identificados en las mesas territoriales de seguridad.",
        "url": "https://www.cartagena.gov.co/infraestructura/alumbrado-publico-reporte-2024",
    },
    # 5. Jóvenes capacitados
    {
        "codigo": "IND-PROD-03",
        "fuente": "Secotic",
        "valor": 1420.0000,
        "avance": 36.80,
        "obs": "Jóvenes de sectores vulnerables certificados en habilidades tecnológicas, alfabetización digital y desarrollo de software en centros de inclusión comunitaria.",
        "url": "https://www.cartagena.gov.co/secotic/formacion-talento-digital-2024",
    },
    # 6. Homicidios
    {
        "codigo": "IND-RES-01",
        "fuente": "Medicina Legal / Policía MECAR",
        "valor": 29.8000,
        "avance": 36.00,
        "obs": "Tasa distrital de muertes violentas por homicidio por 100.000 habitantes. Consolidado anual verificado por el Observatorio del Delito del Distrito de Cartagena de Indias.",
        "url": "https://www.medicinalegal.gov.co/forensis-cartagena-2024",
    },
    # 7. Hurtos a personas
    {
        "codigo": "IND-RES-02",
        "fuente": "SIEDCO - PONAL",
        "valor": 398.5000,
        "avance": 34.42,
        "obs": "Tasa de hurtos a personas denunciados por cada 100.000 habitantes en Cartagena. Registro oficial consolidado en el Sistema SIEDCO de la Policía Nacional.",
        "url": "https://www.policia.gov.co/estadistica-delictiva/siedco-cartagena-2024",
    },
    # 8. Percepción de inseguridad
    {
        "codigo": "IND-RES-03",
        "fuente": "Encuesta Cartagena Cómo Vamos (CCV)",
        "valor": 71.2000,
        "avance": 39.13,
        "obs": "Porcentaje de cartageneros encuestados que manifiestan sentirse inseguros en su barrio o entorno inmediato. Fuente: Encuesta de Percepción Ciudadana Cartagena Cómo Vamos 2024.",
        "url": "https://cartagenacomovamos.org/informe-calidad-vida-2024",
    },
    # 9. Pobreza Multidimensional
    {
        "codigo": "IND-IMP-01",
        "fuente": "DANE - Encuesta Nacional de Calidad de Vida (ECV)",
        "valor": 28.4000,
        "avance": 31.40,
        "obs": "Porcentaje de población en situación de pobreza multidimensional en el Distrito de Cartagena de Indias. Datos oficiales DANE - ECV vigencia 2024.",
        "url": "https://www.dane.gov.co/pobreza-multidimensional-cartagena-2024",
    },
    # 10. Convivencia Barrial
    {
        "codigo": "IND-IMP-02",
        "fuente": "Sistema de Información Estadístico, Delincuencial, Contravencional y Operativo (SIEDCO / MECAR / SICC)",
        "valor": 60.5000,
        "avance": 33.76,
        "obs": "Índice ponderado de conflictividad social, riñas y agresiones en barrios priorizados de las tres localidades distritales.",
        "url": "https://www.cartagena.gov.co/interior/convivencia-barrial-2024",
    },
    # 11. Resiliencia Climática
    {
        "codigo": "IND-IMP-03",
        "fuente": "EPA Cartagena / Cardique / OAGRD / Invemar",
        "valor": 41.6000,
        "avance": 36.92,
        "obs": "Índice de resiliencia socioecológica, amortiguamiento ante inundaciones y regeneración de manglares en las cuencas y barrios colindantes con la Ciénaga de la Virgen.",
        "url": "https://epacartagena.gov.co/monitoreo-cienaga-virgen-2024",
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Saneamiento terminológico en fichas_tecnicas_indicadores
    conn.execute(
        text("""
            UPDATE indicadores.fichas_tecnicas_indicadores
            SET fuente_datos = 'CHIP - Secretaría de Hacienda Distrital'
            WHERE codigo = 'IND-INS-01';
        """)
    )
    conn.execute(
        text("""
            UPDATE indicadores.fichas_tecnicas_indicadores
            SET fuente_datos = 'Policía MECAR (Cartagena)'
            WHERE codigo = 'IND-PROD-01';
        """)
    )

    # 2. Poblar mediciones y actualizar fichas técnicas
    registrado_por = "Secretaría de Planeación Distrital - Observatorio del Delito / EAF"

    for item in MEDICIONES_DATA:
        codigo = item["codigo"]
        # Obtener ficha
        fila = (
            conn.execute(
                text("SELECT id, metadatos FROM indicadores.fichas_tecnicas_indicadores WHERE codigo = :c"),
                {"c": codigo},
            )
            .mappings()
            .first()
        )

        if fila:
            ficha_id = fila["id"]
            # Limpiar mediciones no demostrativas previas
            conn.execute(
                text(
                    "DELETE FROM indicadores.mediciones_indicador WHERE indicador_id = :fid AND es_demostracion IS NOT TRUE"
                ),
                {"fid": ficha_id},
            )

            # Insertar medición
            conn.execute(
                text("""
                    INSERT INTO indicadores.mediciones_indicador (
                        indicador_id, periodo, fecha_corte, valor_medido,
                        avance_acumulado, observaciones, evidencia_documental_url,
                        registrado_por, es_demostracion, creado_en, actualizado_en
                    ) VALUES (
                        :fid, '2024-ANUAL', CAST('2024-12-31' AS date), :val,
                        :av, :obs, :url,
                        :reg, false, clock_timestamp(), clock_timestamp()
                    )
                """),
                {
                    "fid": ficha_id,
                    "val": item["valor"],
                    "av": item["avance"],
                    "obs": item["obs"],
                    "url": item["url"],
                    "reg": registrado_por,
                },
            )

            # Metadatos actualizados
            metadatos = dict(fila["metadatos"] or {})
            metadatos.update(
                {
                    "tiene_mediciones": True,
                    "fecha_corte_ultimo_reporte": "2024-12-31",
                    "periodo_ultimo_reporte": "2024-ANUAL",
                    "fuente_oficial": item["fuente"],
                    "certificacion_eaf": "2026-10-11T04:22:00Z",
                }
            )

            import json

            conn.execute(
                text("""
                    UPDATE indicadores.fichas_tecnicas_indicadores
                    SET valor_actual = :val,
                        porcentaje_avance = :av,
                        fuente_datos = :fuente,
                        metadatos = CAST(:meta AS jsonb),
                        actualizado_en = clock_timestamp()
                    WHERE id = :fid
                """),
                {
                    "val": item["valor"],
                    "av": item["avance"],
                    "fuente": item["fuente"],
                    "meta": json.dumps(metadatos),
                    "fid": ficha_id,
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text("""
            DELETE FROM indicadores.mediciones_indicador
            WHERE periodo = '2024-ANUAL'
        """)
    )
    conn.execute(
        text("""
            UPDATE indicadores.fichas_tecnicas_indicadores
            SET valor_actual = 0.0,
                porcentaje_avance = 0.0,
                metadatos = CAST('{}' AS jsonb)
        """)
    )
