from __future__ import annotations

from scripts.reconstruir_catalogo_pdd_seguridad_humana_16 import (
    DIMENSIONS,
    PPI_2012,
    VISION_METAS_2012,
    _amounts_2020,
    _classify,
    _dimension,
    _source_2016,
)


def test_2012_reemplaza_ocr_contaminado_con_siete_compromisos_de_la_vision():
    assert len(VISION_METAS_2012) == 7
    assert "34,2 %" in VISION_METAS_2012[0]["linea_base"]
    assert "57 %" in VISION_METAS_2012[2]["meta_cuatrienio"]
    assert "22,5" in VISION_METAS_2012[5]["linea_base"]
    assert [goal["eje"] for goal in VISION_METAS_2012] == ["1", "1", "3", "4", "4", "5", "5"]


def test_ppi_2012_ejes_reconcilia_con_total_oficial_hasta_redondeo_de_1000_cop():
    annual_totals = {str(year): sum(values[str(year)] for values in PPI_2012.values()) for year in range(2012, 2016)}
    assert annual_totals == {
        "2012": 718_910_383_000,
        "2013": 712_219_308_000,
        "2014": 787_872_146_000,
        "2015": 830_786_430_000,
    }
    assert abs(sum(annual_totals.values()) - 3_049_788_268_000) <= 1_000


def test_tabla_209_2016_recupera_subtotales_y_11_lineas_fuente():
    source = _source_2016()
    assert len(source) == 11  # 11 renglones de línea con valores anuales
    line_sum = sum(sum(values.values()) for values in source.values())
    assert line_sum == 4_328_520_000_000
    assert 4_331_941_000_000 - line_sum == 3_421_000_000
    security_line = source["3.1 LINEA ESTRATEGICA: CARTAGENA SIN MIEDOS (SEGURIDAD Y CONVIVENCIA)"]
    assert sum(security_line.values()) == 70_157_000_000


def test_tabla_financiera_2020_recupera_linea_y_base_de_precios():
    source = _amounts_2020()
    assert {row[1] for row in source} == {"PILAR", "LINEA_ESTRATEGICA", "PROGRAMA"}
    security = next(row for row in source if row[0] == "10.4.3")
    assert "CONVIVENCIA Y SEGURIDAD" in security[2]
    assert sum(security[3].values()) == 62_628_600_000


def test_vector_de_dimensiones_suma_uno_y_clasificacion_mixta_no_duplica():
    primary, weights = _dimension("Seguridad ciudadana y salud pública")
    assert primary == "Seguridad Personal"
    assert set(weights) == set(DIMENSIONS)
    assert sum(weights.values()) == 1.0
    grade, dimension, mixed_weights = _classify("Seguridad Humana y Buen Gobierno", "LINEA_ESTRATEGICA", {})
    assert grade == "C_CONTEXTUAL_HABILITANTE"
    assert dimension is None
    assert mixed_weights == {}


def test_amenazas_de_vision_2012_se_clasifican_en_su_dimension_directa():
    employment_grade, employment_dimension, employment_weights = _classify(
        VISION_METAS_2012[2]["nombre"], "RESULTADO", {}
    )
    water_grade, water_dimension, water_weights = _classify(VISION_METAS_2012[3]["nombre"], "RESULTADO", {})
    flood_grade, flood_dimension, flood_weights = _classify(VISION_METAS_2012[4]["nombre"], "RESULTADO", {})
    homicide_grade, homicide_dimension, homicide_weights = _classify(VISION_METAS_2012[5]["nombre"], "RESULTADO", {})
    assert water_grade == "B_DETERMINANTE_DIRECTO"
    assert water_dimension == "Seguridad Ambiental"
    assert sum(water_weights.values()) == 1.0
    assert flood_grade == "A_NUCLEO_FRONTAL"
    assert flood_dimension == "Seguridad Personal"
    assert sum(flood_weights.values()) == 1.0
    assert homicide_grade == "A_NUCLEO_FRONTAL"
    assert homicide_dimension == "Seguridad Personal"
    assert sum(homicide_weights.values()) == 1.0
    assert employment_grade == "B_DETERMINANTE_DIRECTO"
    assert employment_dimension == "Seguridad Económica"
    assert sum(employment_weights.values()) == 1.0
