"""Script idempotente para poblar el padrón censal Nivel 3 DEA (105 IEO + 43 Centros ESE)
y la desagregación de fuentes de financiación (SGR, Crédito Público, SGP, ICLD, Cofinanciación)
en PostgreSQL (`bd_csh`, esquema `seguimiento`).

Fase [31B] — Arquitectura DEA Jerárquica de 4 Niveles de Cartagena.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import Settings  # noqa: E402

DDL_IEO_OFICIALES = """
CREATE TABLE IF NOT EXISTS seguimiento.pdd_dmu_ieo_oficiales (
    dmu_codigo VARCHAR(32) PRIMARY KEY,
    nombre_ieo VARCHAR(220) NOT NULL,
    localidad_codigo VARCHAR(32) NOT NULL,
    ucg_codigo VARCHAR(32) NOT NULL,
    presupuesto_total_cop DOUBLE PRECISION NOT NULL,
    recursos_sgr_pae_cop DOUBLE PRECISION NOT NULL,
    planta_docente DOUBLE PRECISION NOT NULL,
    numero_aulas DOUBLE PRECISION NOT NULL,
    cupos_matricula_simat DOUBLE PRECISION NOT NULL,
    estudiantes_beneficiados_pae DOUBLE PRECISION NOT NULL,
    docentes_capacitados DOUBLE PRECISION NOT NULL,
    puntaje_saber11 DOUBLE PRECISION NOT NULL,
    categoria_saber11 VARCHAR(16) NOT NULL,
    reduccion_desercion_pp DOUBLE PRECISION NOT NULL,
    cumplimiento_nominal_pct DOUBLE PRECISION NOT NULL
)
"""

DDL_ESE_CENTROS_SALUD = """
CREATE TABLE IF NOT EXISTS seguimiento.pdd_dmu_ese_centros_salud (
    dmu_codigo VARCHAR(32) PRIMARY KEY,
    nombre_centro_salud VARCHAR(220) NOT NULL,
    tipo_establecimiento VARCHAR(64) NOT NULL,
    localidad_codigo VARCHAR(32) NOT NULL,
    ucg_codigo VARCHAR(32) NOT NULL,
    presupuesto_ese_cop DOUBLE PRECISION NOT NULL,
    inversion_pts_cop DOUBLE PRECISION NOT NULL,
    personal_medico_asistencial DOUBLE PRECISION NOT NULL,
    consultorios_camas DOUBLE PRECISION NOT NULL,
    personas_vulnerables_capacitadas DOUBLE PRECISION NOT NULL,
    valoraciones_discapacidad DOUBLE PRECISION NOT NULL,
    cobertura_vacunacion_pct DOUBLE PRECISION NOT NULL,
    atencion_preferencial_eapb_pct DOUBLE PRECISION NOT NULL,
    cumplimiento_nominal_pct DOUBLE PRECISION NOT NULL
)
"""

DDL_FUENTES_FINANCIACION = """
CREATE TABLE IF NOT EXISTS seguimiento.pdd_fuentes_financiacion_dmu (
    dmu_codigo VARCHAR(64) PRIMARY KEY,
    nombre_dmu VARCHAR(220) NOT NULL,
    nivel_dmu VARCHAR(64) NOT NULL,
    sgr_regalias_cop DOUBLE PRECISION NOT NULL,
    credito_publico_cop DOUBLE PRECISION NOT NULL,
    sgp_transferencias_cop DOUBLE PRECISION NOT NULL,
    icld_recursos_propios_cop DOUBLE PRECISION NOT NULL,
    cofinanciacion_nacion_cop DOUBLE PRECISION NOT NULL,
    total_fuentes_cop DOUBLE PRECISION NOT NULL
)
"""

IEO_NOMBRES_CANONICOS: list[tuple[str, str, str]] = [
    ("Institución Educativa Soledad Acosta de Samper", "LOC-1", "UCG-02"),
    ("INEM José Manuel Rodríguez Torices", "LOC-1", "UCG-10"),
    ("Institución Educativa Nuestra Señora del Carmen", "LOC-2", "UCG-04"),
    ("Institución Educativa John F. Kennedy", "LOC-3", "UCG-12"),
    ("Institución Educativa San Felipe Neri", "LOC-2", "UCG-05"),
    ("Institución Educativa Ambientalista de Cartagena", "LOC-3", "UCG-14"),
    ("Institución Educativa Oficial de Pontezuela", "LOC-2", "UCG-07"),
    ("Institución Educativa Olga González Arraut", "LOC-2", "UCG-06"),
    ("Institución Educativa Técnica Industrial Pedro de Heredia", "LOC-1", "UCG-03"),
    ("Institución Educativa Clemente Manuel Zabala", "LOC-3", "UCG-11"),
    ("Institución Educativa Santa María", "LOC-1", "UCG-02"),
    ("Institución Educativa Islas del Rosario (Zona Insular)", "LOC-1", "UCG-01"),
    ("Institución Educativa Manuela Beltrán", "LOC-3", "UCG-13"),
    ("Institución Educativa Fe y Alegría Las Américas", "LOC-2", "UCG-05"),
    ("Institución Educativa Antonia Santos", "LOC-1", "UCG-03"),
    ("Institución Educativa Liceo de Bolívar", "LOC-1", "UCG-02"),
    ("Institución Educativa Hermano Antonio Ramos de la Salle", "LOC-1", "UCG-03"),
    ("Institución Educativa Mercedes Ábrego", "LOC-3", "UCG-14"),
    ("Institución Educativa Camilo Torres de El Pozón", "LOC-2", "UCG-06"),
    ("Institución Educativa Técnica de Pasacaballos", "LOC-3", "UCG-15"),
    ("Institución Educativa de Bayunca", "LOC-2", "UCG-07"),
    ("Institución Educativa Técnica de La Boquilla", "LOC-2", "UCG-07"),
    ("Institución Educativa de Tierrabomba", "LOC-1", "UCG-01"),
    ("Institución Educativa Luis Carlos Galán Sarmiento", "LOC-2", "UCG-06"),
    ("Institución Educativa Ciudad de Tunja", "LOC-2", "UCG-04"),
    ("Institución Educativa República de Líbano", "LOC-2", "UCG-05"),
    ("Institución Educativa Nuevo Bosque", "LOC-1", "UCG-09"),
    ("Institución Educativa San Juan de Damasco", "LOC-1", "UCG-08"),
    ("Institución Educativa Madre Gabriela de San Martín", "LOC-2", "UCG-05"),
    ("Institución Educativa San Lucas", "LOC-3", "UCG-13"),
    ("Institución Educativa Policarpa Salavarrieta", "LOC-3", "UCG-15"),
    ("Institución Educativa Bertha Gedeón de Baladi", "LOC-1", "UCG-10"),
    ("Institución Educativa Ciudadela 2000", "LOC-3", "UCG-14"),
    ("Institución Educativa Nelson Mandela", "LOC-3", "UCG-14"),
    ("Institución Educativa Jesús Maestro", "LOC-3", "UCG-14"),
    ("Institución Educativa San Francisco de Asís", "LOC-1", "UCG-09"),
    ("Institución Educativa Omaira Sánchez Garzón", "LOC-2", "UCG-04"),
    ("Institución Educativa Foco Rojo", "LOC-2", "UCG-05"),
    ("Institución Educativa 20 de Julio", "LOC-3", "UCG-15"),
    ("Institución Educativa Villa Estrella", "LOC-2", "UCG-06"),
    ("Institución Educativa Flor del Campo", "LOC-2", "UCG-06"),
    ("Institución Educativa Bicentenario", "LOC-2", "UCG-06"),
    ("Institución Educativa Gabriel García Márquez", "LOC-2", "UCG-06"),
    ("Institución Educativa Jorge Artel", "LOC-3", "UCG-13"),
    ("Institución Educativa José María Córdoba de Pasacaballos", "LOC-3", "UCG-15"),
    ("Institución Educativa Santa Ana de Barú", "LOC-1", "UCG-01"),
    ("Institución Educativa de Ararca", "LOC-1", "UCG-01"),
    ("Institución Educativa de Bocachica", "LOC-1", "UCG-01"),
    ("Institución Educativa de Caño del Oro", "LOC-1", "UCG-01"),
    ("Institución Educativa de Punta Canoa", "LOC-2", "UCG-07"),
    ("Institución Educativa de Arroyo de Piedra", "LOC-2", "UCG-07"),
    ("Institución Educativa de Manzanillo del Mar", "LOC-2", "UCG-07"),
    ("Institución Educativa de Tierra Baja", "LOC-2", "UCG-07"),
    ("Institución Educativa de Puerto Rey", "LOC-2", "UCG-07"),
    ("Institución Educativa de Leticia y Recreo", "LOC-3", "UCG-15"),
    ("Institución Educativa María Reina", "LOC-1", "UCG-03"),
    ("Institución Educativa San José de Caño del Oro", "LOC-1", "UCG-01"),
    ("Institución Educativa Rafael Núñez", "LOC-1", "UCG-08"),
    ("Institución Educativa Comfenalco (Convenio Oficial)", "LOC-1", "UCG-09"),
    ("Institución Educativa Salim Bechara", "LOC-1", "UCG-10"),
    ("Institución Educativa Crisanto Luque", "LOC-1", "UCG-09"),
    ("Institución Educativa Las Gaviotas", "LOC-2", "UCG-05"),
    ("Institución Educativa República de Argentina", "LOC-2", "UCG-06"),
    ("Institución Educativa Corazón de María", "LOC-1", "UCG-03"),
    ("Institución Educativa Madre Laura", "LOC-1", "UCG-08"),
    ("Institución Educativa Nuestro Esfuerzo", "LOC-2", "UCG-06"),
    ("Institución Educativa San Pedro Claver Oficial", "LOC-3", "UCG-12"),
    ("Institución Educativa Fernando de la Vega", "LOC-1", "UCG-08"),
    ("Institución EducativaJuan José Nieto", "LOC-1", "UCG-09"),
    ("Institución Educativa Manuela Vergara de Curi", "LOC-3", "UCG-13"),
    ("Institución Educativa Federico Ozanam", "LOC-2", "UCG-06"),
    ("Institución Educativa Playas de Acapulco", "LOC-2", "UCG-05"),
    ("Institución Educativa Islas del Rosario Sede Isla Grande", "LOC-1", "UCG-01"),
    ("Institución Educativa Técnica Acuícola de Barú", "LOC-1", "UCG-01"),
    ("Institución Educativa Etnoeducativa de Boquilla", "LOC-2", "UCG-07"),
    ("Institución Educativa Etnoeducativa de Pasacaballos", "LOC-3", "UCG-15"),
    ("Institución Educativa de Membrillal", "LOC-3", "UCG-15"),
    ("Institución Educativa de Ceballos", "LOC-1", "UCG-09"),
    ("Institución Educativa de Zaragocilla", "LOC-1", "UCG-09"),
    ("Institución Educativa de Chiquinquirá", "LOC-2", "UCG-05"),
    ("Institución Educativa de Olaya Sector Central", "LOC-2", "UCG-05"),
    ("Institución Educativa de Olaya Sector Estela", "LOC-2", "UCG-05"),
    ("Institución Educativa de Olaya Sector Ricaurte", "LOC-2", "UCG-05"),
    ("Institución Educativa de Olaya Sector 11 de Noviembre", "LOC-2", "UCG-05"),
    ("Institución Educativa de Boston", "LOC-2", "UCG-04"),
    ("Institución Educativa de La Candelaria", "LOC-2", "UCG-04"),
    ("Institución Educativa de Alcibia", "LOC-2", "UCG-04"),
    ("Institución Educativa de Tesca", "LOC-2", "UCG-05"),
    ("Institución Educativa de Fredonia", "LOC-2", "UCG-06"),
    ("Institución Educativa de Las Palmeras", "LOC-2", "UCG-06"),
    ("Institución Educativa de San José de los Campanos", "LOC-3", "UCG-13"),
    ("Institución Educativa de Ternera", "LOC-3", "UCG-13"),
    ("Institución Educativa de San Fernando", "LOC-3", "UCG-13"),
    ("Institución Educativa de El Socorro", "LOC-3", "UCG-12"),
    ("Institución Educativa de Blas de Lezo", "LOC-3", "UCG-12"),
    ("Institución Educativa de Almirante Colón", "LOC-3", "UCG-12"),
    ("Institución Educativa de Los Caracoles", "LOC-3", "UCG-12"),
    ("Institución Educativa de Campestre", "LOC-3", "UCG-11"),
    ("Institución Educativa de Bellavista", "LOC-3", "UCG-11"),
    ("Institución Educativa de Albornoz", "LOC-3", "UCG-11"),
    ("Institución Educativa de Policarpa", "LOC-3", "UCG-15"),
    ("Institución Educativa de Puerta de Hierro", "LOC-3", "UCG-11"),
    ("Institución Educativa de Henequén", "LOC-3", "UCG-14"),
    ("Institución Educativa de Luis Felipe Cabrera (Barú)", "LOC-1", "UCG-01"),
    ("Institución Educativa de Cordialidad y Colombiatón", "LOC-2", "UCG-06"),
]

ESE_NOMBRES_CANONICOS: list[tuple[str, str, str, str]] = [
    ("Hospital Local Canapote", "HOSPITAL_LOCAL", "LOC-1", "UCG-02"),
    ("Hospital Local El Pozón", "HOSPITAL_LOCAL", "LOC-2", "UCG-06"),
    ("Hospital Local Arroz Barato", "HOSPITAL_LOCAL", "LOC-3", "UCG-15"),
    ("Hospital Local Nuevo Bosque", "HOSPITAL_LOCAL", "LOC-1", "UCG-09"),
    ("CAP Olaya Herrera (24 Horas)", "CAP_24H", "LOC-2", "UCG-05"),
    ("CAP La Boquilla (24 Horas)", "CAP_24H", "LOC-2", "UCG-07"),
    ("CAP Pasacaballos (24 Horas)", "CAP_24H", "LOC-3", "UCG-15"),
    ("CAP Bayunca (24 Horas)", "CAP_24H", "LOC-2", "UCG-07"),
    ("CAP Nelson Mandela (24 Horas)", "CAP_24H", "LOC-3", "UCG-14"),
    ("CAP Esperanza (24 Horas)", "CAP_24H", "LOC-2", "UCG-04"),
    ("CAP Candelaria (24 Horas)", "CAP_24H", "LOC-2", "UCG-04"),
    ("CAP Blas de Lezo (24 Horas)", "CAP_24H", "LOC-3", "UCG-12"),
    ("CAP Bicentenario (24 Horas)", "CAP_24H", "LOC-2", "UCG-06"),
    ("CAP Ciudadela 2000 (12 Horas)", "CAP_12H", "LOC-3", "UCG-14"),
    ("CAP San Francisco (12 Horas)", "CAP_12H", "LOC-1", "UCG-03"),
    ("CAP Daniel Lemaitre (12 Horas)", "CAP_12H", "LOC-1", "UCG-02"),
    ("CAP Torices / Papayal (12 Horas)", "CAP_12H", "LOC-1", "UCG-02"),
    ("CAP Paseo Bolívar (12 Horas)", "CAP_12H", "LOC-1", "UCG-02"),
    ("CAP Líbano (12 Horas)", "CAP_12H", "LOC-2", "UCG-05"),
    ("CAP Chiquinquirá (12 Horas)", "CAP_12H", "LOC-2", "UCG-05"),
    ("CAP Fredonia (12 Horas)", "CAP_12H", "LOC-2", "UCG-06"),
    ("CAP Las Palmeras (12 Horas)", "CAP_12H", "LOC-2", "UCG-06"),
    ("CAP Flor del Campo (12 Horas)", "CAP_12H", "LOC-2", "UCG-06"),
    ("CAP Los Cerros (12 Horas)", "CAP_12H", "LOC-1", "UCG-08"),
    ("CAP Chile / Paraguay (12 Horas)", "CAP_12H", "LOC-1", "UCG-08"),
    ("CAP Bosquecito (12 Horas)", "CAP_12H", "LOC-1", "UCG-09"),
    ("CAP Piedra de Bolívar (12 Horas)", "CAP_12H", "LOC-1", "UCG-09"),
    ("CAP El Socorro (12 Horas)", "CAP_12H", "LOC-3", "UCG-12"),
    ("CAP Los Caracoles (12 Horas)", "CAP_12H", "LOC-3", "UCG-12"),
    ("CAP San Fernando (12 Horas)", "CAP_12H", "LOC-3", "UCG-13"),
    ("CAP San José de los Campanos (12 Horas)", "CAP_12H", "LOC-3", "UCG-13"),
    ("CAP Bellavista (12 Horas)", "CAP_12H", "LOC-3", "UCG-11"),
    ("CAP Ceballos (12 Horas)", "CAP_12H", "LOC-3", "UCG-11"),
    ("CAP Mandela Sector El Edén (12 Horas)", "CAP_12H", "LOC-3", "UCG-14"),
    ("Puesto de Salud Pontezuela", "PUESTO_SALUD_RURAL_INSULAR", "LOC-2", "UCG-07"),
    ("Puesto de Salud Punta Canoa", "PUESTO_SALUD_RURAL_INSULAR", "LOC-2", "UCG-07"),
    ("Puesto de Salud Arroyo de Piedra", "PUESTO_SALUD_RURAL_INSULAR", "LOC-2", "UCG-07"),
    ("Puesto de Salud Manzanillo del Mar", "PUESTO_SALUD_RURAL_INSULAR", "LOC-2", "UCG-07"),
    ("Puesto de Salud Tierrabomba", "PUESTO_SALUD_RURAL_INSULAR", "LOC-1", "UCG-01"),
    ("Puesto de Salud Bocachica", "PUESTO_SALUD_RURAL_INSULAR", "LOC-1", "UCG-01"),
    ("Puesto de Salud Caño del Oro", "PUESTO_SALUD_RURAL_INSULAR", "LOC-1", "UCG-01"),
    ("Puesto de Salud Santa Ana (Barú)", "PUESTO_SALUD_RURAL_INSULAR", "LOC-1", "UCG-01"),
    (
        "Puesto de Salud Isla Fuerte / Islas del Rosario",
        "PUESTO_SALUD_RURAL_INSULAR",
        "LOC-1",
        "UCG-01",
    ),
]


def _resolver_url_bd_csh() -> str:
    raw_url = Settings().async_database_url
    parsed = make_url(raw_url)
    if (parsed.database or "").startswith("polis_test"):
        return parsed.set(database="bd_csh").render_as_string(hide_password=False)
    return raw_url


def construir_registros_105_ieo() -> list[dict[str, Any]]:
    """Genera el padrón censal determinista de las 105 IEO oficiales de Cartagena."""
    assert len(IEO_NOMBRES_CANONICOS) == 105
    categorias = ("A+", "A", "B", "C", "D")
    filas: list[dict[str, Any]] = []
    for idx, (nombre, loc, ucg) in enumerate(IEO_NOMBRES_CANONICOS, start=1):
        code = f"IEO-{idx:03d}"
        # Las primeras 3 IEOs y la #10 operan sobre la frontera técnica (benchmarks)
        if idx in {1, 2, 3, 10}:
            presupuesto = float(3_600_000_000 + (idx % 4) * 550_000_000)
            sgr_pae = round(presupuesto * 0.34, 2)
            docentes = float(88 + (idx % 4) * 14)
            aulas = float(32 + (idx % 4) * 5)
            simat = float(3150 + (idx % 4) * 380)
            pae = round(simat * 0.92, 1)
            doc_cap = round(docentes * 0.96, 1)
            saber11 = float(318.0 - (idx % 3) * 4.5)
            cat = "A+" if idx in {1, 2} else "A"
            red_desercion = float(2.8 - (idx % 3) * 0.2)
            cumpl = float(96.5 + (idx % 3) * 1.0)
        elif idx in {4, 5, 8}:
            # Casos de alto cumplimiento nominal pero sobre-consumo de recursos
            presupuesto = float(5_850_000_000 + (idx % 3) * 220_000_000)
            sgr_pae = round(presupuesto * 0.38, 2)
            docentes = float(146 + (idx % 3) * 6)
            aulas = float(52 + (idx % 3) * 4)
            simat = float(2480 + (idx % 3) * 110)
            pae = round(simat * 0.84, 1)
            doc_cap = round(docentes * 0.78, 1)
            saber11 = float(252.0 + (idx % 3) * 3.0)
            cat = "C"
            red_desercion = float(1.1 + (idx % 2) * 0.15)
            cumpl = 100.0 if idx == 4 else 92.0
        else:
            es_rural = loc == "LOC-1" and ucg == "UCG-01" or ucg in {"UCG-07", "UCG-15"}
            factor_escala = 0.72 if es_rural else (0.95 + (idx % 7) * 0.08)
            presupuesto = round(3_850_000_000.0 * factor_escala, 2)
            sgr_pae = round(presupuesto * (0.41 if es_rural else 0.33), 2)
            docentes = round(92.0 * factor_escala, 1)
            aulas = round(34.0 * factor_escala, 1)
            eficiencia_simulada = 0.74 + ((idx * 7) % 21) * 0.011
            simat = round(2950.0 * factor_escala * eficiencia_simulada, 1)
            pae = round(simat * (0.91 if es_rural else 0.85), 1)
            doc_cap = round(docentes * (0.80 + (idx % 5) * 0.03), 1)
            saber11 = round(244.0 + ((idx * 11) % 58), 2)
            cat = categorias[min(4, max(0, int((310.0 - saber11) // 16)))]
            red_desercion = round(0.95 + ((idx * 5) % 16) * 0.11, 2)
            cumpl = round(78.0 + (idx % 18) * 1.15, 2)

        filas.append(
            {
                "dmu_codigo": code,
                "nombre_ieo": nombre,
                "localidad_codigo": loc,
                "ucg_codigo": ucg,
                "presupuesto_total_cop": presupuesto,
                "recursos_sgr_pae_cop": sgr_pae,
                "planta_docente": docentes,
                "numero_aulas": aulas,
                "cupos_matricula_simat": simat,
                "estudiantes_beneficiados_pae": pae,
                "docentes_capacitados": doc_cap,
                "puntaje_saber11": saber11,
                "categoria_saber11": cat,
                "reduccion_desercion_pp": red_desercion,
                "cumplimiento_nominal_pct": cumpl,
            }
        )
    return filas


def construir_registros_43_ese() -> list[dict[str, Any]]:
    """Genera el padrón censal determinista de los 43 Centros/Hospitales de la ESE Cartagena."""
    assert len(ESE_NOMBRES_CANONICOS) == 43
    filas: list[dict[str, Any]] = []
    for idx, (nombre, tipo, loc, ucg) in enumerate(ESE_NOMBRES_CANONICOS, start=1):
        code = f"ESE-{idx:03d}"
        if tipo == "HOSPITAL_LOCAL":
            base_pres = 14_200_000_000.0 + (idx % 4) * 1_100_000_000.0
            base_pers = 92.0 + (idx % 4) * 7.0
            base_camas = 38.0 + (idx % 4) * 4.0
        elif tipo == "CAP_24H":
            base_pres = 9_400_000_000.0 + (idx % 5) * 680_000_000.0
            base_pers = 62.0 + (idx % 5) * 5.0
            base_camas = 22.0 + (idx % 5) * 3.0
        elif tipo == "CAP_12H":
            base_pres = 5_100_000_000.0 + (idx % 6) * 420_000_000.0
            base_pers = 34.0 + (idx % 6) * 3.0
            base_camas = 12.0 + (idx % 6) * 2.0
        else:
            base_pres = 2_650_000_000.0 + (idx % 5) * 240_000_000.0
            base_pers = 18.0 + (idx % 4) * 2.0
            base_camas = 6.0 + (idx % 3) * 1.0

        if idx in {1, 2, 3, 5, 14, 35}:
            # Unidades frontera eficiente
            ef_mult = 1.18
            cumpl = 96.5
        elif idx in {4, 6, 15}:
            # Unidades con alto cumplimiento nominal pero baja eficiencia relativa
            base_pres = round(base_pres * 1.38, 2)
            base_pers = round(base_pers * 1.34, 1)
            ef_mult = 0.78
            cumpl = 100.0 if idx == 4 else 91.5
        else:
            ef_mult = 0.82 + ((idx * 9) % 19) * 0.014
            cumpl = round(80.5 + (idx % 15) * 1.1, 2)

        pts_cop = round(base_pres * 0.28, 2)
        vuln_cap = round((base_pers * 490.0) * ef_mult, 1)
        val_disc = round((base_camas * 85.0) * ef_mult, 1)
        vac_pct = round(min(98.5, 84.0 + ef_mult * 11.2), 2)
        eapb_pct = round(min(97.8, 81.5 + ef_mult * 12.0), 2)

        filas.append(
            {
                "dmu_codigo": code,
                "nombre_centro_salud": nombre,
                "tipo_establecimiento": tipo,
                "localidad_codigo": loc,
                "ucg_codigo": ucg,
                "presupuesto_ese_cop": round(base_pres, 2),
                "inversion_pts_cop": pts_cop,
                "personal_medico_asistencial": round(base_pers, 1),
                "consultorios_camas": round(base_camas, 1),
                "personas_vulnerables_capacitadas": vuln_cap,
                "valoraciones_discapacidad": val_disc,
                "cobertura_vacunacion_pct": vac_pct,
                "atencion_preferencial_eapb_pct": eapb_pct,
                "cumplimiento_nominal_pct": cumpl,
            }
        )
    return filas


def construir_registros_fuentes_financiacion() -> list[dict[str, Any]]:
    """Genera los 27 registros de desagregación por fuente (Localidades, UCGs y Secretarías)."""
    filas: list[dict[str, Any]] = []

    localidades = [
        (
            "LOC-1",
            "Localidad 1: Histórica y del Caribe Norte (PDL_1_2024_2027)",
            114_022_800_000.0,
            (0.28, 0.14, 0.22, 0.30, 0.06),
        ),
        (
            "LOC-2",
            "Localidad 2: De la Virgen y Turística (PDL_2_2024_2027)",
            161_289_996_409.0,
            (0.32, 0.18, 0.24, 0.20, 0.06),
        ),
        (
            "LOC-3",
            "Localidad 3: Industrial y de la Bahía (PDL_3_2024_2027)",
            95_365_126_645.0,
            (0.26, 0.15, 0.21, 0.32, 0.06),
        ),
    ]
    for code, nombre, total, weights in localidades:
        sgr = round(total * weights[0], 2)
        cred = round(total * weights[1], 2)
        sgp = round(total * weights[2], 2)
        icld = round(total * weights[3], 2)
        cofin = round(total - (sgr + cred + sgp + icld), 2)
        filas.append(
            {
                "dmu_codigo": code,
                "nombre_dmu": nombre,
                "nivel_dmu": "NIVEL_1_LOCALIDAD",
                "sgr_regalias_cop": sgr,
                "credito_publico_cop": cred,
                "sgp_transferencias_cop": sgp,
                "icld_recursos_propios_cop": icld,
                "cofinanciacion_nacion_cop": cofin,
                "total_fuentes_cop": round(total, 2),
            }
        )

    for idx in range(1, 16):
        code = f"UCG-{idx:02d}"
        total = float(58_000_000_000 + (idx % 5) * 14_500_000_000)
        w_sgr = 0.24 + (idx % 3) * 0.03
        w_cred = 0.16 + (idx % 2) * 0.02
        w_sgp = 0.31
        w_icld = 0.21 - (idx % 3) * 0.02
        sgr = round(total * w_sgr, 2)
        cred = round(total * w_cred, 2)
        sgp = round(total * w_sgp, 2)
        icld = round(total * w_icld, 2)
        cofin = round(total - (sgr + cred + sgp + icld), 2)
        filas.append(
            {
                "dmu_codigo": code,
                "nombre_dmu": f"Unidad Comunera de Gobierno {idx} ({code})",
                "nivel_dmu": "NIVEL_1_UCG",
                "sgr_regalias_cop": sgr,
                "credito_publico_cop": cred,
                "sgp_transferencias_cop": sgp,
                "icld_recursos_propios_cop": icld,
                "cofinanciacion_nacion_cop": cofin,
                "total_fuentes_cop": round(total, 2),
            }
        )

    secretarias = [
        (
            "SED",
            "SED - Secretaría de Educación Distrital",
            410_000_000_000.0,
            (0.14, 0.08, 0.58, 0.14, 0.06),
        ),
        (
            "DADIS",
            "DADIS - Departamento Administrativo Distrital de Salud",
            385_000_000_000.0,
            (0.10, 0.06, 0.62, 0.16, 0.06),
        ),
        (
            "INFRAESTRUCTURA",
            "Secretaría de Infraestructura Distrital",
            592_307_692_308.0,
            (0.34, 0.28, 0.08, 0.22, 0.08),
        ),
        (
            "TRANSCARIBE",
            "Transcaribe S.A.",
            195_000_000_000.0,
            (0.22, 0.26, 0.06, 0.28, 0.18),
        ),
        (
            "PES",
            "PES - Plan de Emergencia Social Pedro Romero",
            92_000_000_000.0,
            (0.18, 0.05, 0.24, 0.43, 0.10),
        ),
        (
            "ESPACIO_PUBLICO",
            "Gerencia de Espacio Público y Movilidad",
            141_538_461_538.0,
            (0.20, 0.24, 0.08, 0.40, 0.08),
        ),
        (
            "EPA",
            "EPA Cartagena - Establecimiento Público Ambiental",
            88_000_000_000.0,
            (0.25, 0.12, 0.15, 0.38, 0.10),
        ),
        (
            "PARTICIPACION",
            "Secretaría de Participación y Desarrollo Social",
            164_000_000_000.0,
            (0.15, 0.07, 0.28, 0.42, 0.08),
        ),
        (
            "INTERIOR",
            "Secretaría del Interior y Convivencia Ciudadana",
            152_000_000_000.0,
            (0.16, 0.14, 0.12, 0.46, 0.12),
        ),
    ]
    for code, nombre, total, weights in secretarias:
        sgr = round(total * weights[0], 2)
        cred = round(total * weights[1], 2)
        sgp = round(total * weights[2], 2)
        icld = round(total * weights[3], 2)
        cofin = round(total - (sgr + cred + sgp + icld), 2)
        filas.append(
            {
                "dmu_codigo": code,
                "nombre_dmu": nombre,
                "nivel_dmu": "NIVEL_2_SECRETARIA_ENTE",
                "sgr_regalias_cop": sgr,
                "credito_publico_cop": cred,
                "sgp_transferencias_cop": sgp,
                "icld_recursos_propios_cop": icld,
                "cofinanciacion_nacion_cop": cofin,
                "total_fuentes_cop": round(total, 2),
            }
        )
    return filas


async def poblar_padron_nivel3_y_fuentes_cartagena() -> dict[str, Any]:
    """Crea y puebla de forma idempotente las 3 tablas canónicas en `bd_csh`."""
    ieos = construir_registros_105_ieo()
    eses = construir_registros_43_ese()
    fuentes = construir_registros_fuentes_financiacion()

    engine = create_async_engine(_resolver_url_bd_csh(), pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA IF NOT EXISTS seguimiento"))
            await conn.execute(text(DDL_IEO_OFICIALES))
            await conn.execute(text(DDL_ESE_CENTROS_SALUD))
            await conn.execute(text(DDL_FUENTES_FINANCIACION))

            await conn.execute(text("TRUNCATE TABLE seguimiento.pdd_dmu_ieo_oficiales"))
            await conn.execute(text("TRUNCATE TABLE seguimiento.pdd_dmu_ese_centros_salud"))
            await conn.execute(text("TRUNCATE TABLE seguimiento.pdd_fuentes_financiacion_dmu"))

            await conn.execute(
                text(
                    """
                    INSERT INTO seguimiento.pdd_dmu_ieo_oficiales (
                        dmu_codigo, nombre_ieo, localidad_codigo, ucg_codigo,
                        presupuesto_total_cop, recursos_sgr_pae_cop, planta_docente,
                        numero_aulas, cupos_matricula_simat, estudiantes_beneficiados_pae,
                        docentes_capacitados, puntaje_saber11, categoria_saber11,
                        reduccion_desercion_pp, cumplimiento_nominal_pct
                    ) VALUES (
                        :dmu_codigo, :nombre_ieo, :localidad_codigo, :ucg_codigo,
                        :presupuesto_total_cop, :recursos_sgr_pae_cop, :planta_docente,
                        :numero_aulas, :cupos_matricula_simat, :estudiantes_beneficiados_pae,
                        :docentes_capacitados, :puntaje_saber11, :categoria_saber11,
                        :reduccion_desercion_pp, :cumplimiento_nominal_pct
                    )
                    """
                ),
                ieos,
            )

            await conn.execute(
                text(
                    """
                    INSERT INTO seguimiento.pdd_dmu_ese_centros_salud (
                        dmu_codigo, nombre_centro_salud, tipo_establecimiento,
                        localidad_codigo, ucg_codigo, presupuesto_ese_cop,
                        inversion_pts_cop, personal_medico_asistencial,
                        consultorios_camas, personas_vulnerables_capacitadas,
                        valoraciones_discapacidad, cobertura_vacunacion_pct,
                        atencion_preferencial_eapb_pct, cumplimiento_nominal_pct
                    ) VALUES (
                        :dmu_codigo, :nombre_centro_salud, :tipo_establecimiento,
                        :localidad_codigo, :ucg_codigo, :presupuesto_ese_cop,
                        :inversion_pts_cop, :personal_medico_asistencial,
                        :consultorios_camas, :personas_vulnerables_capacitadas,
                        :valoraciones_discapacidad, :cobertura_vacunacion_pct,
                        :atencion_preferencial_eapb_pct, :cumplimiento_nominal_pct
                    )
                    """
                ),
                eses,
            )

            await conn.execute(
                text(
                    """
                    INSERT INTO seguimiento.pdd_fuentes_financiacion_dmu (
                        dmu_codigo, nombre_dmu, nivel_dmu,
                        sgr_regalias_cop, credito_publico_cop,
                        sgp_transferencias_cop, icld_recursos_propios_cop,
                        cofinanciacion_nacion_cop, total_fuentes_cop
                    ) VALUES (
                        :dmu_codigo, :nombre_dmu, :nivel_dmu,
                        :sgr_regalias_cop, :credito_publico_cop,
                        :sgp_transferencias_cop, :icld_recursos_propios_cop,
                        :cofinanciacion_nacion_cop, :total_fuentes_cop
                    )
                    """
                ),
                fuentes,
            )

            c_ieo = int(
                (
                    await conn.execute(
                        text("SELECT COUNT(*) FROM seguimiento.pdd_dmu_ieo_oficiales")
                    )
                ).scalar_one()
            )
            c_ese = int(
                (
                    await conn.execute(
                        text("SELECT COUNT(*) FROM seguimiento.pdd_dmu_ese_centros_salud")
                    )
                ).scalar_one()
            )
            c_fnt = int(
                (
                    await conn.execute(
                        text("SELECT COUNT(*) FROM seguimiento.pdd_fuentes_financiacion_dmu")
                    )
                ).scalar_one()
            )
    finally:
        await engine.dispose()

    return {
        "base_datos": "bd_csh",
        "esquema": "seguimiento",
        "tablas_pobladas": {
            "seguimiento.pdd_dmu_ieo_oficiales": c_ieo,
            "seguimiento.pdd_dmu_ese_centros_salud": c_ese,
            "seguimiento.pdd_fuentes_financiacion_dmu": c_fnt,
        },
    }


if __name__ == "__main__":
    resumen = asyncio.run(poblar_padron_nivel3_y_fuentes_cartagena())
    print(json.dumps(resumen, indent=2, ensure_ascii=False))
