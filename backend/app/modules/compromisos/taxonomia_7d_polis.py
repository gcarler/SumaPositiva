"""Taxonomía analítica 7D del corte 2026, separada de la taxonomía Drive 8D.

Solo un cruce explícito fuente-indicador clasifica una observación. Los demás
indicadores quedan sin clasificar para revisión de significado y cobertura.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

VERSION = "seguridad_humana_7d_v5"
DIMENSIONES = {
    "PERS": "Seguridad Personal y Ciudadana",
    "COM": "Seguridad Convivencia y Comunitaria",
    "AMB": "Seguridad Ambiental y del Entorno Físico",
    "ECON": "Seguridad Económica y Medios de Vida",
    "SALUD": "Seguridad Alimentaria y Sanitaria",
    "POL": "Seguridad Política, Institucional y DD.HH.",
    "SAT": "Alertas Tempranas y Gestión de Crisis",
}

Dimension = Literal["PERS", "COM", "AMB", "ECON", "SALUD", "POL", "SAT"]


class Clasificacion7D(BaseModel):
    version: str = VERSION
    dimension: Dimension | None
    estado: Literal[
        "exacta",
        "sin_clasificar",
        "no_medible_con_esta_fuente",
        "respuesta_publica",
        "total_multidimensional",
    ]
    regla: str | None = None
    evidencia: str | None = None


FUENTES_COMPLETAS: dict[str, Dimension] = {
    "policia_amenazas": "PERS",
    "policia_delitos_sexuales": "PERS",
    "policia_homicidios": "PERS",
    "policia_hurto_vehiculos": "PERS",
    "policia_hurto_vivienda_comercio": "PERS",
    "policia_lesiones": "PERS",
    "medicina_examenes_sexuales": "PERS",
    "medicina_homicidios": "PERS",
    "medicina_lesiones_accidentales": "PERS",
    "medicina_lesiones_transporte": "PERS",
    "medicina_violencia_interpersonal": "PERS",
    "medicina_suicidios": "SALUD",
    "drive_delito_sexual": "PERS",
    "drive_extorsion": "PERS",
    "drive_homicidios": "PERS",
    "drive_muertes_transporte": "PERS",
    "drive_suicidios": "SALUD",
    "policia_violencia_intrafamiliar": "COM",
    "medicina_violencia_intrafamiliar": "COM",
    "drive_violencia_intrafamiliar": "COM",
    "dane_geih_cartagena": "ECON",
    "dane_geih_informalidad_cartagena": "ECON",
    "dane_pobreza_monetaria": "ECON",
    "ideam_calidad_aire": "AMB",
    "ins_calidad_agua": "SALUD",
    "icbf_bienestarina": "SALUD",
    "procuraduria_pqrsdf_cartagena": "POL",
    "unidad_victimas_irv_cartagena": "SAT",
}

CRUCES: dict[tuple[str, str], Dimension] = {
    ("dane_ecsc_2024", "percepcion_inseguridad_barrio"): "PERS",
    ("dane_ecsc_2024", "percepcion_inseguridad_ciudad"): "PERS",
    ("dane_ecsc_2024", "victimizacion_algun_delito"): "PERS",
    ("dane_ecsc_2024", "victimizacion_extorsion_o_intento"): "PERS",
    ("dane_ecsc_2024", "victimizacion_hurto_personas"): "PERS",
    ("dane_ecsc_2024", "victimas_que_denunciaron"): "POL",
    ("dane_ecsc_2024", "victimas_que_no_denunciaron"): "POL",
    ("dane_nbi_cnpv2018", "nbi_dependencia_economica"): "ECON",
    ("dane_nbi_cnpv2018", "nbi_personas_miseria"): "ECON",
    ("dane_nbi_cnpv2018", "nbi_personas_nbi"): "ECON",
    ("dnp_terridata_13001", "area_deforestada"): "AMB",
    ("dnp_terridata_13001", "eventos_inundacion"): "AMB",
    ("dnp_terridata_13001", "homicidio_intencional_tasa"): "PERS",
    ("dnp_terridata_13001", "incidencia_dengue"): "SALUD",
    ("dnp_terridata_13001", "incidencia_pobreza_monetaria_terridata"): "ECON",
    ("dnp_terridata_13001", "indice_participacion_institucional"): "POL",
    ("dnp_terridata_13001", "indice_transparencia_institucional"): "POL",
    ("dnp_terridata_13001", "mortalidad_desnutricion_menores_5"): "SALUD",
    ("dnp_terridata_13001", "violencia_intrafamiliar_tasa"): "COM",
    ("dnp_terridata_13001", "victimas_desplazamiento_ubicadas"): "SAT",
    ("dane_sae_fies_pobreza_cartagena", "inseguridad_alimentaria_moderada_grave_sae"): "SALUD",
    ("dane_sae_fies_pobreza_cartagena", "pobreza_monetaria_sae"): "ECON",
    ("dane_sae_fies_pobreza_cartagena", "pobreza_multidimensional_sae"): "ECON",
    ("drive_excel_policial_11_delitos", "homicidio_intencional"): "PERS",
    ("drive_excel_policial_11_delitos", "homicidio_transito"): "PERS",
    ("drive_excel_policial_11_delitos", "hurtos_total"): "PERS",
    ("drive_excel_policial_11_delitos", "lesiones_personales"): "PERS",
    ("drive_excel_policial_11_delitos", "lesiones_transito"): "PERS",
    ("drive_excel_policial_11_delitos", "secuestro"): "PERS",
    ("drive_excel_policial_11_delitos", "extorsion"): "PERS",
    ("drive_excel_policial_11_delitos", "amenaza"): "PERS",
    ("drive_excel_policial_11_delitos", "violencia_sexual"): "PERS",
    ("drive_excel_policial_11_delitos", "violencia_intrafamiliar"): "COM",
    ("drive_excel_policial_11_delitos", "terrorismo"): "SAT",
}

ICBF_RPC_CRUCES: dict[Dimension, tuple[str, ...]] = {
    "PERS": (
        "Tasa de homicidios en niños y niñas de 0 a 5 años",
        "Tasa de homicidios en niños y niñas de 6 a 11 años",
        "Tasa de homicidios en adolescentes (12 a 17 años)",
        "Tasa de muertes por eventos de transporte en niños y niñas de 0 a 5 años",
        "Tasa de muertes por eventos de transporte en niños y niñas de 6 a 11 años",
        "Tasa de muertes por eventos de transporte en adolescentes (12 a 17 años)",
        "Tasa de exámenes médico legales por presunto delito sexual contra adolescentes",
        "Tasa de exámenes médico legales por presunto delito sexual contra niños y niñas de 0 a 5 años",
        "Tasa de exámenes médico legales por presunto delito sexual contra niños y niñas de 6 a 11 años",
    ),
    "COM": (
        "Tasa de violencia contra adolescentes 12 a 17 años.",
        "Tasa de violencia contra niños y niñas de 6 a 11 años",
        "Tasa de violencia contra niños y niñas de primera infancia",
        "Tasa de violencia intrafamiliar en adolescentes (12 a 17 años)",
        "Tasa de violencia intrafamiliar en niños y niñas de 0 a 5 años",
        "Tasa de violencia intrafamiliar en niños y niñas de 6 a 11 años",
        "Tasa de violencia de pareja cuando la víctima es menor de 18 años",
    ),
    "SALUD": (
        "Tasa de suicidios en niños y niñas de adolescentes (12 a 17 años)",
        "Tasa de mortalidad en menores de 1 año (por mil nacidos vivos)",
        "Razón de mortalidad materna por 100.000 nacidos vivos",
        "Tasa de mortalidad por desnutrición en menores de 5 años.",
        "Tasa de mortalidad por EDA (Enfermedad diarreica aguda) en niños y niñas "
        "menores de 5 años por cada 100.000 menores de 5 años",
        "Tasa de mortalidad por IRA (Infección respiratoria aguda) en niños y niñas "
        "menores de 5 años por cada 100.000 menores de 5 años",
        "Cobertura de inmunización contra el triple viral (tv) de un año",
        "Cobertura de vacunación con BCG en nacidos vivos",
        "Cobertura de vacunación con pentavalente (DPT y Hepatitis) tres dosis en niños y niñas menores de 1 año",
        "Porcentaje de atención institucional al parto por personal calificado",
        "Porcentaje de nacidos vivos con 4 o más controles prenatales",
        "Porcentaje de niños  y niñas entre 0 a 5 años afiliados al SGSSS",
        "Porcentaje de niños  y niñas entre 6 a 11 años afiliados al SGSSS",
        "Porcentaje de niños  y niñas entre 12 a 17 años afiliados al SGSSS",
        "Porcentaje de cobertura del servicio de acueducto",
        "Calidad de agua",
        "Tasa de fecundidad especifica en niños y niñas de 10 a 14 años",
    ),
    "SAT": (
        "Porcentaje de adolescentes (12 a 17 años) víctimas de desplazamiento forzado "
        "del  total NNA víctimas del conflicto armado",
        "Porcentaje de niñas y niños de 6 a 11 años víctimas de desplazamiento forzado "
        "del total NNA víctimas del conflicto armado",
        "Porcentaje de niños y niñas de primera infancia víctimas de desplazamiento forzado "
        "del  total NNA víctimas del conflicto armado",
    ),
}
CRUCES.update(
    {
        ("icbf_rpc_cartagena", indicador): dimension
        for dimension, indicadores in ICBF_RPC_CRUCES.items()
        for indicador in indicadores
    }
)

CRUCES_SUBTIPO: dict[tuple[str, str, str], Dimension] = {
    **{
        ("fiscalia_spoa_busquedas_por_anio_hecho", "procesos_coincidentes_con_termino", subtipo): dimension
        for subtipo, dimension in {
            "estafa": "ECON",
            "hurto": "PERS",
            "amenazas": "PERS",
            "lesiones": "PERS",
            "desplazamiento forzado": "SAT",
            "violencia intrafamiliar": "COM",
            "acto sexual": "PERS",
            "extorsion": "PERS",
            "homicidio": "PERS",
            "acceso carnal": "PERS",
            "armas de fuego": "PERS",
            "estupefacientes": "PERS",
            "secuestro": "PERS",
            "contaminacion ambiental": "AMB",
            "corrupcion": "POL",
            "trata de personas": "PERS",
            "feminicidio": "COM",
        }.items()
    },
    **{
        ("unidad_victimas_ruv_cartagena", indicador, subtipo): dimension
        for indicador in ("eventos_reportados", "personas_por_declaracion", "personas_por_ocurrencia")
        for subtipo, dimension in {
            "1 | Acto terrorista / Atentados / Combates / Enfrentamientos / Hostigamientos": "SAT",
            "2 | Amenaza": "PERS",
            "3 | Delitos contra la libertad y la integridad sexual en desarrollo del conflicto armado": "PERS",
            "5 | Desplazamiento forzado": "SAT",
            "6 | Homicidio": "PERS",
            "7 | Minas Antipersonal, Munición sin Explotar y Artefacto Explosivo improvisado": "SAT",
            "8 | Secuestro": "PERS",
            "9 | Tortura": "PERS",
            "10 | Vinculación de Niños Niñas y Adolescentes a Actividades Relacionadas con grupos armados": "COM",
            "11 | Abandono o Despojo Forzado de Tierras": "ECON",
            "13 | Lesiones Personales Fisicas": "PERS",
            "14 | Lesiones Personales Psicologicas": "PERS",
            "15 | Confinamiento": "SAT",
            "4 | Desaparición forzada": "PERS",
        }.items()
    },
}

FUENTES_DENOMINADOR = {"dane_poblacion_municipal", "dane_poblacion_vigencia_censal"}
INDICADORES_POBLACION = {"poblacion_total", "poblacion_cabecera", "poblacion_centros_rural"}
RESPUESTA_PUBLICA: dict[str, set[str]] = {
    "icbf_prevencion": {"prevencion"},
    "icbf_primera_infancia": {"primera_infancia"},
    "icbf_uds": {"uds"},
    "unidad_victimas_indemnizaciones_cartagena": {
        "giros_indemnizacion",
        "personas_indemnizadas",
        "valor_indemnizaciones",
    },
    "icbf_rpc_cartagena": {
        "Número de mesas de participación de niños, niñas y adolescentes conformadas y en operación",
        "Número de niños, niñas y mujeres gestantes con educación inicial "
        "en el marco de la atención integral a la primera infancia.",
        "Porcentaje de niños y niñas en servicios de educación inicial en el marco "
        "de la atención integral que cuentan con seis o más atenciones.",
        "Porcentaje de niños y niñas en servicios de educación inicial en el marco "
        "de la atención Integral que cuentan con seis o más atenciones.",
    },
}
TOTALES_MULTIDIMENSIONALES = {
    ("fiscalia_spoa_procesos_por_anio_hecho", "procesos_penales_registrados"),
}


def clasificar(fuente_clave: str, indicador: str, subtipo: str | None = None) -> Clasificacion7D:
    if fuente_clave in FUENTES_DENOMINADOR and indicador in INDICADORES_POBLACION:
        return Clasificacion7D(
            dimension=None,
            estado="no_medible_con_esta_fuente",
            regla="denominador_transversal",
            evidencia=f"{fuente_clave}:{indicador}",
        )
    if indicador in RESPUESTA_PUBLICA.get(fuente_clave, set()):
        return Clasificacion7D(
            dimension=None,
            estado="respuesta_publica",
            regla="oferta_o_reparacion_no_resultado",
            evidencia=f"{fuente_clave}:{indicador}",
        )
    if (fuente_clave, indicador) in TOTALES_MULTIDIMENSIONALES:
        return Clasificacion7D(
            dimension=None,
            estado="total_multidimensional",
            regla="total_no_aditivo_por_dimension",
            evidencia=f"{fuente_clave}:{indicador}",
        )
    dimension = CRUCES_SUBTIPO.get((fuente_clave, indicador, subtipo or ""))
    regla = "fuente_indicador_subtipo_exacto"
    if dimension is None:
        dimension = CRUCES.get((fuente_clave, indicador))
        regla = "fuente_indicador_exacto"
    if dimension is None:
        dimension = FUENTES_COMPLETAS.get(fuente_clave)
        regla = "fuente_serie_unica"
    if dimension is None:
        return Clasificacion7D(dimension=None, estado="sin_clasificar")
    return Clasificacion7D(
        dimension=dimension,
        estado="exacta",
        regla=regla,
        evidencia=f"{fuente_clave}:{indicador}:{subtipo}"
        if regla == "fuente_indicador_subtipo_exacto"
        else f"{fuente_clave}:{indicador}",
    )
