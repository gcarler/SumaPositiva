"""Suite de pruebas para el Motor de Diagnostico PSHC sobre los 8 Planes (Fase [34B])."""

from __future__ import annotations

from app.modules.compromisos.pdt_diagnostico_seguridad_humana_8planes import (
    CATALOGO_7_DIMENSIONES_SH,
    PLANES_8_ORDEN,
    clasificar_meta_embudo_seguridad_humana_7d,
    construir_diagnostico_seguridad_humana_8planes,
)


def test_embudo_analitico_3_etapas_y_evolucion_8_planes_4637_metas() -> None:
    """Verifica el embudo 3 etapas (4637 metas en bd_csh) y suma exacta de los 8 planes."""
    res = construir_diagnostico_seguridad_humana_8planes("TODOS")

    assert res["estado"] == "DIAGNOSTICO_MULTIDIMENSIONAL_SEGURIDAD_HUMANA_8_PLANES_COMPLETO"
    embudo_res = res["resumen_ejecutivo_tablero"]["embudo_analitico_sintesis"]
    embudo_sec3 = res["diagnostico_macro_8_planes"]["embudo_global_3_etapas"]

    e1 = embudo_res["etapa_1_universo_total_metas"]
    e2 = embudo_res["etapa_2_derechos_sociales_y_seguridad_metas"]
    e3 = embudo_res["etapa_3_nucleo_directo_seguridad_humana_7d_metas"]

    assert e1 == 4637
    assert embudo_sec3["etapa_1_universo_total_metas"] == 4637
    assert 4637 >= e2 >= e3 > 0
    assert (
        embudo_res["etapa_1_metas_producto"] + embudo_res["etapa_1_metas_resultado_bienestar"]
        == 4637
    )

    evolucion = res["diagnostico_macro_8_planes"]["evolucion_cuatrienial_8_planes"]
    assert len(evolucion) == 8
    codigos = [row["codigo_plan"] for row in evolucion]
    assert codigos == list(PLANES_8_ORDEN)
    assert sum(row["etapa_1_total_metas"] for row in evolucion) == 4637
    assert sum(row["etapa_2_derechos_sociales_metas"] for row in evolucion) == e2
    assert sum(row["etapa_3_nucleo_seguridad_humana_metas"] for row in evolucion) == e3


def test_7_dimensiones_seguridad_humana_4_1_a_4_7_con_metas_reales_bd_csh() -> None:
    """Verifica las 7 dimensiones (4.1 a 4.7) con metas reales de bd_csh y semaforos."""
    res = construir_diagnostico_seguridad_humana_8planes("TODOS")

    semaforos = res["resumen_ejecutivo_tablero"]["matriz_semaforos_7_dimensiones"]
    dimensiones = res["diagnostico_micro_sectorial_7_dimensiones"]

    assert len(semaforos) == 7
    assert len(dimensiones) == 7

    e3 = res["resumen_ejecutivo_tablero"]["embudo_analitico_sintesis"][
        "etapa_3_nucleo_directo_seguridad_humana_7d_metas"
    ]
    assert sum(d["total_metas_nucleo"] for d in dimensiones) == e3

    codigos_esperados = [d["codigo_dimension"] for d in CATALOGO_7_DIMENSIONES_SH]
    assert [d["codigo_dimension"] for d in dimensiones] == codigos_esperados

    for dim in dimensiones:
        assert dim["total_metas_nucleo"] > 0
        assert sum(dim["conteo_por_plan"].values()) == dim["total_metas_nucleo"]
        assert dim["metas_producto"] + dim["metas_resultado"] == dim["total_metas_nucleo"]
        assert len(dim["indicadores_trazadores_resultado"]) >= 2
        assert len(dim["programas_emblematicos_cartagena"]) >= 2
        assert len(dim["metas_emblematicas_bd_csh"]) >= 5
        for meta_row in dim["metas_emblematicas_bd_csh"]:
            assert meta_row["codigo_plan"] in PLANES_8_ORDEN
            assert len(meta_row["descripcion_meta"]) > 5
        assert len(dim["auditoria_coherencia_gasto_indicador"]) > 20


def test_secciones_ii_v_y_vi_dea_lisa_15_ucg_isri_y_filtrado_plan() -> None:
    """Verifica Marco Normativo (II), DEA/LISA/ISRI (V), Conclusiones (VI) y clasificador."""
    res = construir_diagnostico_seguridad_humana_8planes("TODOS")

    marco = res["marco_teorico_normativo_metodologico"]
    assert (
        "Resolución 66/290"
        in marco["paradigma_seguridad_humana"]["instrumentos_normativos_vinculantes"][1]
    )
    assert len(marco["articulacion_agenda_2030_y_dnp"]["ods_focalizados"]) >= 7

    avanzado = res["analisis_avanzado_dea_espacial_series"]
    dea = avanzado["dea_eficiencia_y_holguras_5_1"]
    assert len(dea["eficiencia_por_dimension_7d"]) == 7
    assert len(dea["eficiencia_por_ejecutora_distrital"]) >= 5

    lisa = avanzado["econometria_espacial_lisa_5_2"]
    assert lisa["indice_moran_global_i"] < 0
    assert lisa["total_ucgs_evaluadas"] == 15
    assert len(lisa["matriz_espacial_15_ucg"]) == 15
    assert lisa["total_trampas_vulnerabilidad_high_low"] >= 3
    assert len(lisa["resumen_3_localidades"]) == 3

    isri = avanzado["proyeccion_alcanzabilidad_isri_5_3"]
    assert len(isri["proyecciones_por_dimension_2027"]) == 7

    concl = res["conclusiones_brechas_y_recomendaciones"]
    assert len(concl["brechas_continuidad_intercuatrienial"]) >= 2
    assert len(concl["hoja_de_ruta_plan_indicativo_y_plan_accion"]) >= 4

    c_sh = clasificar_meta_embudo_seguridad_humana_7d(
        {
            "codigo_plan": "PDD_2024_2027",
            "linea_nombre": "Seguridad Humana y Vida Digna",
            "nombre": "Garantizar raciones de comedores comunitarios contra desnutrición",
            "indicador": "Cobertura de seguridad alimentaria",
            "dependencia_responsable": "Plan de Emergencia Social Pedro Romero (PES)",
            "datos_oficiales": {},
        }
    )
    assert c_sh["etapa_3_nucleo_sh_7d"] is True
    assert c_sh["codigo_dimension_sh"] == "D2_SEGURIDAD_ALIMENTARIA"
