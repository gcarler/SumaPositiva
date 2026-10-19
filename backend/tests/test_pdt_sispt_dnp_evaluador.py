"""Pruebas unitarias y de integración (`bd_csh`) del motor `SisPT-DNP` (Fase [33B])."""

from __future__ import annotations

import pytest

from app.modules.compromisos.pdt_sispt_dnp_evaluador import (
    BOLSAS_FINANCIACION_PA_DNP,
    CLASES_META_PLAN_ACCION_DNP,
    PLANES_8_CARTAGENA,
    TIPOLOGIAS_INDICADOR_SISPT,
    TIPOS_ACTIVIDAD_PLAN_ACCION_DNP,
    calcular_eficacia_indicador_sispt,
    clasificar_meta_y_actividad_plan_accion_dnp,
    determinar_tipologia_indicador_sispt,
    evaluar_interoperabilidad_sispt_cuipo_piip_meta,
    evaluar_universo_sispt_dnp_bd_csh,
)


def test_cuatro_tipologias_y_formulas_exactas_sispt_dnp() -> None:
    """Verifica las 4 tipologías y las 4 fórmulas matemáticas exactas de SisPT."""
    t_flujo = determinar_tipologia_indicador_sispt(
        sentido_indicador="ASCENDENTE",
        tipo_agregacion="ACUMULATIVO",
        unidad_medida="Número",
        texto_meta_o_indicador="Construir 20 parques barriales",
    )
    assert t_flujo == "INCREMENTO_ACUMULATIVO_FLUJO"
    e_flujo = calcular_eficacia_indicador_sispt(
        tipologia_sispt=t_flujo,
        linea_base=10.0,
        meta_programada=20.0,
        logro_ejecutado=15.0,
    )
    assert e_flujo["eficacia_bruta_pct"] == pytest.approx(75.0)
    assert e_flujo["eficacia_truncada_sispt_pct"] == pytest.approx(75.0)

    t_cap = determinar_tipologia_indicador_sispt(
        sentido_indicador="ASCENDENTE",
        tipo_agregacion="NO_ACUMULATIVO",
        unidad_medida="Porcentaje (%)",
        texto_meta_o_indicador="Incrementar la tasa de cobertura neta escolar al 90%",
    )
    assert t_cap == "INCREMENTO_NO_ACUMULATIVO_CAPACIDAD"
    e_cap = calcular_eficacia_indicador_sispt(
        tipologia_sispt=t_cap,
        linea_base=80.0,
        meta_programada=90.0,
        logro_ejecutado=88.0,
    )
    # ((88 - 80) / (90 - 80)) * 100 = 80.0%
    assert e_cap["eficacia_bruta_pct"] == pytest.approx(80.0)
    assert e_cap["eficacia_truncada_sispt_pct"] == pytest.approx(80.0)

    t_red = determinar_tipologia_indicador_sispt(
        sentido_indicador="DESCENDENTE",
        tipo_agregacion="DECRECIENTE",
        unidad_medida="Tasa",
        texto_meta_o_indicador="Reducir la tasa de deserción escolar",
    )
    assert t_red == "REDUCCION_BRECHA"
    e_red = calcular_eficacia_indicador_sispt(
        tipologia_sispt=t_red,
        linea_base=10.0,
        meta_programada=4.0,
        logro_ejecutado=5.5,
    )
    # ((10 - 5.5) / (10 - 4)) * 100 = 75.0%
    assert e_red["eficacia_bruta_pct"] == pytest.approx(75.0)
    assert e_red["eficacia_truncada_sispt_pct"] == pytest.approx(75.0)

    t_mant = determinar_tipologia_indicador_sispt(
        sentido_indicador="MANTENIMIENTO",
        tipo_agregacion="MANTENIMIENTO",
        unidad_medida="Unidades",
        texto_meta_o_indicador="Mantener en operación 43 centros de salud ESE",
    )
    assert t_mant == "MANTENIMIENTO_STOCK"
    e_mant = calcular_eficacia_indicador_sispt(
        tipologia_sispt=t_mant,
        linea_base=43.0,
        meta_programada=43.0,
        logro_ejecutado=43.0,
    )
    assert e_mant["eficacia_bruta_pct"] == pytest.approx(100.0)
    assert e_mant["eficacia_truncada_sispt_pct"] == pytest.approx(100.0)


def test_regla_sispt_r2_truncamiento_100_y_preservacion_cero_vs_none() -> None:
    """Verifica el truncamiento anti-compensación al 100% (SISPT-R2) y 0.0 vs None."""
    sobre = calcular_eficacia_indicador_sispt(
        tipologia_sispt="INCREMENTO_ACUMULATIVO_FLUJO",
        linea_base=0.0,
        meta_programada=100.0,
        logro_ejecutado=180.0,
    )
    assert sobre["eficacia_bruta_pct"] == pytest.approx(180.0)
    assert sobre["eficacia_truncada_sispt_pct"] == pytest.approx(100.0)
    assert sobre["sobrecumplimiento_exceso_pct"] == pytest.approx(80.0)
    assert sobre["alerta_subestimacion_meta_sispt"] is True
    assert sobre["rango_desempeno_sispt_mdm"] == "SOBRESALIENTE"

    cero_obs = calcular_eficacia_indicador_sispt(
        tipologia_sispt="INCREMENTO_ACUMULATIVO_FLUJO",
        linea_base=10.0,
        meta_programada=50.0,
        logro_ejecutado=0.0,
    )
    assert cero_obs["eficacia_bruta_pct"] == pytest.approx(0.0)
    assert cero_obs["eficacia_truncada_sispt_pct"] == pytest.approx(0.0)
    assert cero_obs["ceros_observados_preservados"] is True
    assert cero_obs["rango_desempeno_sispt_mdm"] == "CRITICO"

    sin_dato = calcular_eficacia_indicador_sispt(
        tipologia_sispt="INCREMENTO_ACUMULATIVO_FLUJO",
        linea_base=None,
        meta_programada=50.0,
        logro_ejecutado=None,
        avance_fisico_observado_pct=None,
    )
    assert sin_dato["eficacia_bruta_pct"] is None
    assert sin_dato["eficacia_truncada_sispt_pct"] is None
    assert sin_dato["rango_desempeno_sispt_mdm"] == "SIN_MEDICION"


def test_semaforo_oficial_mdm_sispt_5_rangos() -> None:
    """Verifica los 5 rangos oficiales del semáforo de eficacia SisPT / MDM del DNP."""
    casos = [
        (92.0, "SOBRESALIENTE", "VERDE_OSCURO"),
        (78.0, "SATISFACTORIO", "VERDE_CLARO"),
        (65.0, "MEDIO", "AMARILLO"),
        (48.0, "BAJO", "NARANJA"),
        (25.0, "CRITICO", "ROJO"),
    ]
    for avance, rango_esp, sem_esp in casos:
        res = calcular_eficacia_indicador_sispt(
            tipologia_sispt="INCREMENTO_ACUMULATIVO_FLUJO",
            avance_fisico_observado_pct=avance,
        )
        assert res["rango_desempeno_sispt_mdm"] == rango_esp
        assert res["semaforo"] == sem_esp


def test_clasificacion_3_clases_meta_4_tipos_actividad_y_3_bolsas_pa_dnp() -> None:
    """Verifica las 3 clases de metas, 4 tipos de actividades y 3 bolsas del PA DNP."""
    actividades = [
        {"codigo": "A1", "descripcion_actividad": "Expedir decreto reglamentario del programa"},
        {"codigo": "A2", "descripcion_actividad": "Contratar interventoría y suscribir convenio"},
        {
            "codigo": "A3",
            "descripcion_actividad": "Construir y rehabilitar infraestructura escolar",
        },
        {"codigo": "A4", "descripcion_actividad": "Suministrar dotación e instalar equipos"},
    ]
    res_prod = clasificar_meta_y_actividad_plan_accion_dnp(
        texto_meta="Construir 4 ambientes escolares en IEO oficiales",
        actividades_pa=actividades,
        apropiacion_definitiva_cop=1_500_000_000.0,
        codigo_bpin="2024130010045",
    )
    assert res_prod["clase_meta_pa_dnp"] == "META_DE_PRODUCTO"
    assert res_prod["bolsa_financiacion_pa_dnp"] == "INVERSION"
    conteo = res_prod["conteo_actividades_por_tipo_dnp"]
    assert set(conteo.keys()) == set(TIPOS_ACTIVIDAD_PLAN_ACCION_DNP)
    assert conteo["ACTIVIDAD_NORMATIVA"] == 1
    assert conteo["ACTIVIDAD_ADMINISTRATIVA"] == 1
    assert conteo["ACTIVIDAD_DE_GESTION"] == 1
    assert conteo["ACTIVIDAD_LOGISTICA"] == 1

    res_gest = clasificar_meta_y_actividad_plan_accion_dnp(
        texto_meta="Gestionar cofinanciación y radicar proyecto ante la Nación",
        actividades_pa=None,
        apropiacion_definitiva_cop=None,
        codigo_bpin=None,
    )
    assert res_gest["clase_meta_pa_dnp"] == "META_DE_GESTION"
    assert res_gest["bolsa_financiacion_pa_dnp"] == "RECURSOS_DE_GESTION"

    res_adm = clasificar_meta_y_actividad_plan_accion_dnp(
        texto_meta="Actualizar el manual de procesos y atención al ciudadano",
        actividades_pa=None,
        apropiacion_definitiva_cop=None,
        codigo_bpin=None,
    )
    assert res_adm["clase_meta_pa_dnp"] == "META_ADMINISTRATIVA"
    assert res_adm["bolsa_financiacion_pa_dnp"] == "FUNCIONAMIENTO"


def test_interoperabilidad_sispt_cuipo_piip_alertas_r3_r4_r5() -> None:
    """Verifica detección de DESFASE_CUIPO_SIN_AVANCE_PIIP y AVANCE_FISICO_SIN_SOPORTE_CUIPO."""
    desfase = evaluar_interoperabilidad_sispt_cuipo_piip_meta(
        eficacia_truncada_sispt_pct=25.0,
        apropiacion_definitiva_cop=1_000_000_000.0,
        compromisos_rp_cop=850_000_000.0,
        pagos_cop=800_000_000.0,
        codigo_bpin="2024130010012",
        total_actividades_pa=3,
        clase_meta_pa_dnp="META_DE_PRODUCTO",
    )
    assert desfase["ejecucion_financiera_cuipo_pct"] == pytest.approx(85.0)
    assert desfase["estado_coherencia_cuipo_piip"] == "DESFASE_CUIPO_SIN_AVANCE_PIIP"

    sin_cuipo = evaluar_interoperabilidad_sispt_cuipo_piip_meta(
        eficacia_truncada_sispt_pct=95.0,
        apropiacion_definitiva_cop=0.0,
        compromisos_rp_cop=0.0,
        pagos_cop=0.0,
        codigo_bpin=None,
        total_actividades_pa=1,
        clase_meta_pa_dnp="META_DE_PRODUCTO",
    )
    assert sin_cuipo["estado_coherencia_cuipo_piip"] == "AVANCE_FISICO_SIN_SOPORTE_CUIPO"

    coherente = evaluar_interoperabilidad_sispt_cuipo_piip_meta(
        eficacia_truncada_sispt_pct=88.0,
        apropiacion_definitiva_cop=1_000_000_000.0,
        compromisos_rp_cop=860_000_000.0,
        pagos_cop=820_000_000.0,
        codigo_bpin="2024130010099",
        total_actividades_pa=4,
        clase_meta_pa_dnp="META_DE_PRODUCTO",
    )
    assert coherente["estado_coherencia_cuipo_piip"] == "COHERENTE_SISPT_CUIPO_PIIP"
    assert coherente["trazabilidad_pi_pa_cuipo_piip_completa"] is True


def test_evaluar_universo_sispt_dnp_bd_csh_4637_metas_8_planes() -> None:
    """Verifica la evaluación censal SisPT sobre las 4,637 metas de los 8 planes en bd_csh."""
    res = evaluar_universo_sispt_dnp_bd_csh("TODOS")
    assert res["estado"] == "EVALUADO_SISPT_DNP_CUIPO_PIIP"
    assert res["total_planes_evaluados"] == 8
    assert res["total_metas_evaluadas"] == 4637
    assert len(res["resumen_por_plan"]) == 8

    planes_vistos = {p["codigo_plan"] for p in res["resumen_por_plan"]}
    assert planes_vistos == set(PLANES_8_CARTAGENA)

    assert set(res["distribucion_tipologias_sispt"].keys()) == set(TIPOLOGIAS_INDICADOR_SISPT)
    assert sum(res["distribucion_tipologias_sispt"].values()) == 4637

    assert set(res["distribucion_clases_meta_pa_dnp"].keys()) == set(CLASES_META_PLAN_ACCION_DNP)
    assert sum(res["distribucion_clases_meta_pa_dnp"].values()) == 4637

    assert set(res["distribucion_bolsas_financiacion_pa"].keys()) == set(BOLSAS_FINANCIACION_PA_DNP)
    assert sum(res["distribucion_bolsas_financiacion_pa"].values()) == 4637

    assert 0.0 <= res["eficacia_media_truncada_sispt_pct"] <= 100.0
    assert res["eficacia_media_bruta_pct"] >= res["eficacia_media_truncada_sispt_pct"]
    assert res["ceros_observados_preservados_count"] > 0
