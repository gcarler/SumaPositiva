"""Pruebas del motor DEA de 4 niveles homogéneos y Gobernanza de Cartagena (Fase [30B])."""

from __future__ import annotations

import pandas as pd
import pytest

from app.modules.compromisos.pdt_dea_4niveles_cartagena import (
    calcular_dea_bcc_input,
    calcular_dea_bcc_output,
    calcular_dea_ccr_y_escala,
    evaluar_dea_4_niveles_cartagena,
    generar_tablero_alcalde_y_armonizacion_dea_cartagena,
    recalificar_unidad_tablero_alcalde,
)


def test_calcular_dea_bcc_input_y_output_holguras_y_benchmarks_exactos() -> None:
    """Verifica optimización PuLP en dos etapas (Input y Output), holguras S^-/S^+ y benchmarks."""
    df = pd.DataFrame(
        [
            {
                "dmu": "DMU_EFICIENTE_A",
                "presupuesto_cop": 100.0,
                "personal": 10.0,
                "metas_logradas": 50.0,
                "calidad_mir": 90.0,
            },
            {
                "dmu": "DMU_EFICIENTE_B",
                "presupuesto_cop": 200.0,
                "personal": 20.0,
                "metas_logradas": 100.0,
                "calidad_mir": 95.0,
            },
            {
                # Consume el doble de presupuesto y más personal que DMU_EFICIENTE_A
                "dmu": "DMU_INEFICIENTE_C",
                "presupuesto_cop": 200.0,
                "personal": 25.0,
                "metas_logradas": 50.0,
                "calidad_mir": 80.0,
            },
        ]
    )
    inputs_cols = ["presupuesto_cop", "personal"]
    outputs_cols = ["metas_logradas", "calidad_mir"]

    res_in = calcular_dea_bcc_input(df, inputs_cols, outputs_cols)
    by_name_in = {r["dmu"]: r for r in res_in}

    assert by_name_in["DMU_EFICIENTE_A"]["theta_bcc"] == pytest.approx(1.0, abs=1e-5)
    assert by_name_in["DMU_EFICIENTE_A"]["es_eficiente_bcc"] is True
    assert by_name_in["DMU_EFICIENTE_A"]["holgura_presupuestal_s_minus_cop"] == pytest.approx(
        0.0, abs=1e-4
    )

    c_in = by_name_in["DMU_INEFICIENTE_C"]
    assert c_in["theta_bcc"] == pytest.approx(0.5, abs=1e-4)
    assert c_in["es_eficiente_bcc"] is False
    assert c_in["holguras_insumos_s_minus"]["presupuesto_cop"] == pytest.approx(100.0, abs=1e-2)
    assert c_in["holguras_insumos_s_minus"]["personal"] == pytest.approx(15.0, abs=1e-2)
    assert c_in["holguras_insumos_no_radial_s_minus"]["personal"] == pytest.approx(2.5, abs=1e-2)
    assert c_in["holguras_productos_s_plus"]["calidad_mir"] >= 10.0 - 1e-2
    assert any(b["dmu"] == "DMU_EFICIENTE_A" for b in c_in["benchmarks_referencia"])

    res_out = calcular_dea_bcc_output(df, inputs_cols, outputs_cols)
    by_name_out = {r["dmu"]: r for r in res_out}
    c_out = by_name_out["DMU_INEFICIENTE_C"]
    assert c_out["phi_bcc"] > 1.0
    assert 0.0 < c_out["theta_output"] < 1.0
    assert c_out["deficit_producto_s_plus_total"] > 0.0

    res_escala = calcular_dea_ccr_y_escala(df, inputs_cols, outputs_cols, orientacion="input")
    assert all(
        r["rendimientos_escala"]
        in {"CRS_OPTIMO", "IRS_SUBINVERSION", "DRS_SATURACION_PRESUPUESTAL"}
        for r in res_escala
    )


def test_separacion_estricta_4_fronteras_homogeneas_cartagena() -> None:
    """Verifica que las 4 fronteras homogéneas de Cartagena se estimen por separado."""
    res = evaluar_dea_4_niveles_cartagena(orientacion="input")

    assert res["estado"] == "EVALUADO_ECONOMETRICO_PULP_2_ETAPAS"
    assert res["separacion_estricta_fronteras_homogeneas"] is True
    assert res["verificacion_homogeneidad"]["interseccion_dmus_entre_fronteras"] == 0
    assert res["verificacion_homogeneidad"]["localidades_separadas_de_ieo"] is True
    assert res["verificacion_homogeneidad"]["localidades_separadas_de_ucg"] is True
    assert res["verificacion_homogeneidad"]["ieo_separadas_de_ese"] is True

    n1 = res["niveles"]["nivel_1_territorial_localidades_ucg"]
    loc_dmus = n1["fronteras_independientes"]["localidades_distritales"]["dmus"]
    ucg_dmus = n1["fronteras_independientes"]["unidades_comuneras_gobierno_ucg"]["dmus"]
    assert len(loc_dmus) == 3
    assert len(ucg_dmus) == 15

    n2 = res["niveles"]["nivel_2_institucional_secretarias"]
    sec_names = {d["dmu"] for d in n2["dmus"]}
    assert any("SED" in name for name in sec_names)
    assert any("DADIS" in name for name in sec_names)
    assert any("Infraestructura" in name for name in sec_names)
    assert any("Transcaribe" in name for name in sec_names)

    n3 = res["niveles"]["nivel_3_operativo_ieo_ese"]
    ieo_dmus = n3["fronteras_independientes"]["instituciones_educativas_oficiales_ieo"]["dmus"]
    ese_dmus = n3["fronteras_independientes"]["centros_salud_ese_cartagena"]["dmus"]
    assert len(ieo_dmus) >= 5
    assert len(ese_dmus) >= 5
    assert n3["universo_institucional"]["total_ieo_oficiales_cartagena"] == 105

    # Ninguna Localidad ni UCG aparece en la frontera de IEO ni en la de Secretarías
    loc_ids = {d["dmu"] for d in loc_dmus}
    ieo_ids = {d["dmu"] for d in ieo_dmus}
    assert loc_ids.isdisjoint(ieo_ids)
    assert loc_ids.isdisjoint(sec_names)


def test_mapeo_sectorial_mga_dnp_y_mir_cartagena() -> None:
    """Verifica el mapeo de Insumos (X), Productos MGA y Resultados MIR en los 3 sectores."""
    res = evaluar_dea_4_niveles_cartagena()
    mapeo = res["mapeo_cadena_valor_mga_mir_sectorial"]

    assert "Educación Pública" in mapeo
    assert "Salud Pública" in mapeo
    assert "Infraestructura Vial y Movilidad" in mapeo

    edu = mapeo["Educación Pública"]
    assert any("Me Quedo Porque Me Quedo" in item for item in edu["insumos_x"])
    assert any("SABER 11" in item for item in edu["resultados_y_outc_mir"])

    salud = mapeo["Salud Pública"]
    assert any("Plan Territorial de Salud" in item for item in salud["insumos_x"])
    assert any("discapacidad" in item for item in salud["productos_y_out_mga"])

    infra = mapeo["Infraestructura Vial y Movilidad"]
    assert any("Transcaribe" in item for item in infra["productos_y_out_mga"])
    assert any("Pasajeros movilizados" in item for item in infra["resultados_y_outc_mir"])


def test_tablero_alcalde_dispara_alerta_ineficiencia_financiera_desperdicio() -> None:
    """Verifica recalificación a ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO con theta=0.65."""
    dictamen_directo = recalificar_unidad_tablero_alcalde(
        avance_fisico_pct=100.0,
        theta_bcc=0.65,
        presupuesto_ejecutado_cop=592_307_692_308.0,
        dmu="Secretaría de Infraestructura Distrital",
    )
    assert dictamen_directo["calificacion_nominal_sin_dea"] == "MUY_ALTO_SOBRESALIENTE"
    assert (
        dictamen_directo["calificacion_recalificada_dea"]
        == "ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"
    )
    assert dictamen_directo["recalificado_por_ineficiencia_dea"] is True
    assert dictamen_directo["holgura_presupuestal_s_minus_cop"] > 200_000_000_000.0

    tablero = generar_tablero_alcalde_y_armonizacion_dea_cartagena(orientacion="input")
    alertas = tablero["tablero_alcalde_y_programas"]["alertas_ineficiencia_financiera_desperdicio"]
    assert len(alertas) >= 1
    infra_alerta = next(a for a in alertas if "Infraestructura" in a["dmu"])
    assert infra_alerta["avance_fisico_pct"] == pytest.approx(100.0, abs=1e-2)
    assert infra_alerta["theta_bcc"] == pytest.approx(0.65, abs=1e-2)
    assert (
        infra_alerta["calificacion_recalificada_dea"]
        == "ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"
    )
    assert infra_alerta["holgura_presupuestal_s_minus_cop"] > 0.0


def test_armonizacion_presupuestal_con_benchmarks_frontera() -> None:
    """Verifica Armonización Presupuestal emparejando DMUs ineficientes con Benchmarks."""
    tablero = generar_tablero_alcalde_y_armonizacion_dea_cartagena(orientacion="input")
    armonizacion = tablero["armonizacion_presupuestal_plurianual"]

    assert armonizacion["total_benchmarks_oficiales_frontera"] >= 4
    assert armonizacion["total_unidades_ineficientes_a_reestructurar"] >= 4
    assert armonizacion["presupuesto_total_reasignable_s_minus_cop"] > 0.0

    for bm in armonizacion["benchmarks_oficiales_frontera"]:
        assert bm["theta_bcc"] == pytest.approx(1.0, abs=1e-5)
        assert bm["holgura_presupuestal_s_minus_cop"] == 0.0

    for rec in armonizacion["recomendaciones_armonizacion_por_dmu"]:
        assert rec["theta_bcc"] < 1.0
        assert rec["reasignacion_potencial_s_minus_cop"] > 0.0
        assert len(rec["benchmarks_referencia"]) >= 1
        assert all(
            b["theta_bcc"] == pytest.approx(1.0, abs=1e-4) for b in rec["benchmarks_referencia"]
        )


def test_nivel_4_malmquist_inter_cuatrienial_pdd_2020_2023_vs_2024_2027() -> None:
    """Verifica la descomposición dinámica de Malmquist en el Nivel 4."""
    res = evaluar_dea_4_niveles_cartagena(
        nivel="nivel_4_temporal_inter_cuatrienial",
        orientacion="output",
    )
    n4 = res["nivel_4_temporal_inter_cuatrienial"]
    malmquist = n4["indice_malmquist_inter_cuatrienial"]

    assert malmquist["transicion"] == "PDD_2020_2023->PDD_2024_2027"
    assert malmquist["total_dmus_pareadas"] == 5
    assert malmquist["catch_up_global"] > 0.0
    assert malmquist["frontier_shift_global"] > 0.0
    assert malmquist["mpi_global"] == pytest.approx(
        malmquist["catch_up_global"] * malmquist["frontier_shift_global"],
        rel=1e-4,
    )
    for row in malmquist["unidades"]:
        assert row["indice_malmquist_mpi"] == pytest.approx(
            row["catch_up_pech"] * row["frontier_shift_techch"],
            rel=1e-4,
        )


def test_nivel_3_padron_censal_105_ieo_y_43_ese_en_bd_csh() -> None:
    """Verifica que el Nivel 3 evalúe el padrón censal de 105 IEO oficiales y 43 ESE en bd_csh."""
    res = evaluar_dea_4_niveles_cartagena(
        nivel="nivel_3_operativo_ieo_ese",
        orientacion="input",
    )
    n3 = res["nivel_3_operativo_ieo_ese"]
    padron = n3["padron_censal_bd_csh"]

    assert padron["ieo_evaluadas_en_frontera"] == 105
    assert padron["centros_ese_evaluados_en_frontera"] == 43
    assert "seguimiento.pdd_dmu_ieo_oficiales" in padron["fuente_datos"]
    assert "seguimiento.pdd_dmu_ese_centros_salud" in padron["fuente_datos"]

    ieo_frontera = n3["fronteras_independientes"]["instituciones_educativas_oficiales_ieo"]
    ese_frontera = n3["fronteras_independientes"]["centros_salud_ese_cartagena"]

    assert ieo_frontera["total_dmus"] == 105
    assert len(ieo_frontera["dmus"]) == 105
    assert ieo_frontera["eficientes"] >= 1
    assert ieo_frontera["ineficientes"] >= 1

    assert ese_frontera["total_dmus"] == 43
    assert len(ese_frontera["dmus"]) == 43
    assert ese_frontera["eficientes"] >= 1
    assert ese_frontera["ineficientes"] >= 1
    assert n3["total_dmus"] == 148


def test_desagregacion_fuentes_financiacion_sgr_credito_y_holguras_por_fuente() -> None:
    """Verifica desagregación de fuentes (SGR, Crédito, SGP, ICLD) y holguras S^- por fuente."""
    res = evaluar_dea_4_niveles_cartagena(orientacion="input")
    fuentes_keys = (
        "sgr_regalias_cop",
        "credito_publico_cop",
        "sgp_transferencias_cop",
        "icld_recursos_propios_cop",
        "cofinanciacion_nacion_cop",
    )

    n1 = res["nivel_1_territorial_localidades_ucg"]
    n2 = res["nivel_2_institucional_secretarias"]
    assert len(n1["dmus"]) == 18
    assert len(n2["dmus"]) == 9

    for dmu_row in [*n1["dmus"], *n2["dmus"]]:
        des = dmu_row["desagregacion_fuentes_financiacion"]
        hol_f = dmu_row["holgura_s_minus_por_fuente_cop"]
        for k in fuentes_keys:
            assert k in des
            assert k in hol_f
            assert des[k] >= 0.0
            assert hol_f[k] >= 0.0

        suma_fuentes = sum(des[k] for k in fuentes_keys)
        assert des["total_fuentes_cop"] == pytest.approx(suma_fuentes, abs=1.0)

        suma_holgura_fuentes = sum(hol_f[k] for k in fuentes_keys)
        assert suma_holgura_fuentes == pytest.approx(
            dmu_row["holgura_presupuestal_s_minus_cop"],
            abs=1.0,
        )

    resumen_global = res["resumen_fuentes_financiacion_y_holguras"]
    assert resumen_global["total_dmus_con_fuentes"] == 27
    assert resumen_global["presupuesto_por_fuente_cop"]["sgr_regalias_cop"] > 0.0
    assert resumen_global["presupuesto_por_fuente_cop"]["credito_publico_cop"] > 0.0
    assert resumen_global["holgura_s_minus_por_fuente_cop"]["total_holgura_s_minus_cop"] > 0.0
