"""Suite de pruebas del Motor PSHC V2 (+100 paginas) sobre 8 Planes (Fases [34B]/[35B])."""

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
    assert res["version_editorial"] == "V2_MONOGRAFIA_EXHAUSTIVA_100_PAGINAS"
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


def test_macro_v2_monografias_8_planes_top30_secretarias_y_embudo_vinculos() -> None:
    """Verifica monografias_por_plan, Top 30 secretarias y embudo x vinculo."""
    res = construir_diagnostico_seguridad_humana_8planes("TODOS")
    macro = res["diagnostico_macro_8_planes"]

    monografias = macro["monografias_por_plan"]
    assert len(monografias) == 8
    assert [m["codigo_plan"] for m in monografias] == list(PLANES_8_ORDEN)
    for mono in monografias:
        assert len(mono["desglose_lineas_estrategicas"]) >= 1
        assert (
            sum(x["metas_totales"] for x in mono["desglose_lineas_estrategicas"])
            == (mono["metas_totales"])
        )
        assert len(mono["distribucion_7_dimensiones_en_plan"]) == 7
        parrafos = mono["analisis_doctrinal_e_institucional_extenso"]
        assert len(parrafos) == 4
        assert all(len(p) >= 300 for p in parrafos)
        assert "diseno_programatico_y_arquitectura" in parrafos.keys()

    secretarias = macro["matriz_secretarias_y_entidades_distritales"]
    assert len(secretarias) == 30
    for sec in secretarias:
        assert sec["metas_totales"] > 0
        assert sec["apropiacion_definitiva_cop"] > 0
        assert "compromisos_rp_cop" in sec
        assert "obligaciones_cop" in sec
        assert "pagos_tesoreria_cop" in sec
        assert "avance_fisico_medio_pct" in sec
        assert "brecha_financiero_fisica_pct" in sec

    matriz_vinculos = macro["matriz_embudo_por_plan_y_tipo_vinculo"]
    assert len(matriz_vinculos) == 8
    assert sum(r["etapa_1_universo_metas"] for r in matriz_vinculos) == 4637
    for r in matriz_vinculos:
        suma_v = (
            r["DIRECTO_CODIGO"]
            + r["HIBRIDO_LINEA_SEMANTICO"]
            + r["SEMANTICO_PA"]
            + r["SOLO_META_PDT"]
        )
        assert suma_v == r["etapa_1_universo_metas"]


def test_7_dimensiones_v2_con_10_bloques_profundos_y_metas_reales_bd_csh() -> None:
    """Verifica las 7 dimensiones (4.1 a 4.7) y sus 10 bloques profundos V2."""
    res = construir_diagnostico_seguridad_humana_8planes("TODOS")

    semaforos = res["resumen_ejecutivo_tablero"]["matriz_semaforos_7_dimensiones"]
    dimensiones = res["diagnostico_micro_sectorial_7_dimensiones"]
    analisis_dim = res["analisis_por_dimension"]

    assert len(semaforos) == 7
    assert len(dimensiones) == 7
    assert len(analisis_dim) == 7
    assert len(dimensiones["analisis_por_dimension"]) == 7

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

        # Verificar los 10 bloques profundos V2:
        mono_6 = dim["monografia_doctrinal_y_estructural"]
        assert len(mono_6) == 6
        assert all(len(p) >= 350 for p in mono_6)
        assert "marco_internacional_pnud_onu" in mono_6.keys()
        assert "tensiones_presupuestales_y_territoriales" in mono_6.keys()

        evol_8 = dim["evolucion_8_planes"]
        assert len(evol_8) == 8
        assert sum(x["metas_nucleo_dim"] for x in evol_8) == dim["total_metas_nucleo"]

        secs_dim = dim["desempeno_secretarias_dimension"]
        assert len(secs_dim) >= 3
        assert sum(x["metas_nucleo"] for x in secs_dim) == dim["total_metas_nucleo"]

        lineas_dim = dim["lineas_estrategicas_y_programas_dimension"]
        assert 1 <= len(lineas_dim) <= 18

        sispt_dim = dim["evaluacion_sispt_dnp_dimension"]
        assert len(sispt_dim["por_formula_indicador"]) == 4
        assert len(sispt_dim["por_tipo_actividad_pa"]) == 4
        assert len(sispt_dim["por_rango_semaforo_sispt"]) == 4
        assert (
            sum(x["conteo_metas"] for x in sispt_dim["por_formula_indicador"])
            == dim["total_metas_nucleo"]
        )

        top_25 = dim["catalogo_metas_mayor_presupuesto"]
        top_15 = dim["catalogo_metas_criticas_rezagadas"]
        assert len(top_25) == 25
        assert len(top_15) == 15
        for meta_row in top_25[:5] + top_15[:5]:
            assert meta_row["codigo_plan"] in PLANES_8_ORDEN
            assert len(meta_row["meta_texto_canonico"]) > 5
            assert "compromisos_rp_cop" in meta_row
            assert "pagos_tesoreria_cop" in meta_row
            assert "dictamen_meta" in meta_row

        dea_intra = dim["eficiencia_dea_intradimension"]
        assert 0.5 < dea_intra["theta_bcc"] <= 1.0
        assert dea_intra["holgura_presupuesto_cop"] > 0

        terr_dim = dim["territorializacion_lisa_y_riesgo_isri_dimension"]
        assert len(terr_dim["impacto_3_localidades"]) == 3
        assert len(terr_dim["impacto_15_ucg"]) == 15
        assert "rezago_fisico" in terr_dim["descomposicion_isri_2024_2027"]

        ruta_dim = dim["hoja_de_ruta_sectorial_dimension"]
        assert len(ruta_dim) == 6


def test_secciones_ii_v_y_vi_dea_lisa_18_territorios_isri_y_clasificador() -> None:
    """Verifica Marco Normativo, DEA/LISA 18 territorios, Conclusiones y clasificador."""
    res = construir_diagnostico_seguridad_humana_8planes("TODOS")

    marco = res["marco_teorico_normativo_metodologico"]
    assert (
        "Resolución 66/290"
        in marco["paradigma_seguridad_humana"]["instrumentos_normativos_vinculantes"][1]
    )

    avanzado = res["analisis_avanzado_dea_espacial_series"]
    lisa = avanzado["econometria_espacial_lisa"]
    assert lisa["indice_moran_global_i"] < 0
    assert lisa["total_ucgs_evaluadas"] == 15
    assert len(lisa["matriz_espacial_15_ucg"]) == 15
    assert len(lisa["resumen_3_localidades"]) == 3

    perfiles_18 = lisa["perfiles_monograficos_18_territorios"]
    assert len(perfiles_18) == 18
    codigos_t = [p["codigo_territorio"] for p in perfiles_18]
    assert codigos_t[:3] == ["LOC-1", "LOC-2", "LOC-3"]
    assert len([p for p in perfiles_18 if p["tipo_territorio"] == "UCG"]) == 15

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
