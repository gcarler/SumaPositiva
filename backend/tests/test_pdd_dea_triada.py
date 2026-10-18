from __future__ import annotations

import numpy as np
import pytest

from app.modules.compromisos import pdd_dea_service as pdd_dea_module
from app.modules.compromisos.dea_econometria_service import _bh, _lp
from app.modules.compromisos.pdd_dea_service import (
    CANONICAL_2016,
    PPI_2020_2019_COP,
    PPI_2020_TOTAL_2019_COP,
    PPI_2024,
    PddDeaService,
    _advance,
    _build_state,
    _gini,
    _hhi,
    _line_key,
    _macroprojects,
    _malmquist_interplan,
    _money_factor,
    _parse_cop,
    _rank_entities,
)
from app.modules.compromisos.router import router
from scripts.sincronizar_catalogo_pdd import extract_catalog


def _row(**kwargs):
    base = {
        "id": "1",
        "archivo_id": "a",
        "motor": "PLAN_DESARROLLO",
        "vigencia": 2024,
        "entidad": "Secretaría de Prueba",
        "linea": "Seguridad Humana",
        "meta": "M-1",
        "indicador": "Indicador",
        "avance_estrategico": 0.8,
        "avance_fisico": None,
        "programada": 10,
        "ejecutada": 8,
        "corte": "ANUAL",
        "archivo_creado_en": "2025-01-01",
        "hoja": "Hoja1",
        "fila": 2,
        "bpim": "BP-1",
        "actividad": "Actividad",
    }
    return base | kwargs


def test_ppi_2024_total_oficial():
    assert sum(PPI_2024.values()) == 12_800_853_474_855


def test_ppi_2020_total_oficial_en_pesos_constantes_2019():
    assert PPI_2020_TOTAL_2019_COP == 6_022_982_600_000
    assert sum(PPI_2020_2019_COP.values()) == 6_022_982_500_000


def test_parse_cop_colombiano_miles_y_decimal():
    assert _parse_cop("$ 3.270.509.322.394") == 3_270_509_322_394
    assert _parse_cop("1.234,50") == 1234.5
    assert _parse_cop("—") == 0


def test_factor_ipc_a_base_2025_y_anio_base():
    assert _money_factor(2025) == 1
    assert _money_factor(2024) > 1


def test_pdd_cache_v11_persists_payload_and_serialized_bytes(tmp_path, monkeypatch):
    cache_file = tmp_path / "pdd-cache.json"
    monkeypatch.setattr(pdd_dea_module, "CACHE_V11", cache_file)
    monkeypatch.setattr(pdd_dea_module, "_DISK_CACHE", {})
    monkeypatch.setattr(pdd_dea_module, "_RAW_JSON_BYTES", {})
    pdd_dea_module._RESULT.clear()
    key = ("db-test", "pdd-dea", "catalogo")
    payload = {"estado": "CALCULADO", "planes": ["PDD_2024_2027"]}
    pdd_dea_module._store(key, payload)
    pdd_dea_module._RESULT.clear()
    monkeypatch.setattr(pdd_dea_module, "_DISK_CACHE", None)
    assert pdd_dea_module._cached(key) == payload
    assert pdd_dea_module._DISK_CACHE == {pdd_dea_module._disk_key(key): payload}
    assert cache_file.exists()
    assert '"version":11' in cache_file.read_text()
    assert pdd_dea_module._disk_key(key) in pdd_dea_module._RAW_JSON_BYTES


def test_advance_only_accepts_verified_scales():
    assert _advance(_row())[0:2] == (80.0, "COCIENTE_VERIFICADO")
    assert _advance(_row(avance_estrategico=0.8, ejecutada=2))[1] == "ESCALA_AMBIGUA"
    assert _advance(_row(avance_estrategico=140))[1] == "FUERA_DE_ESCALA"


def test_build_state_deduplicates_meta_and_keeps_finance_amounts():
    rows = [
        _row(id="1", apropiacion=100, pagos=50),
        _row(id="2", corte="T2", apropiacion=100, pagos=50),
        _row(id="3", meta="M-2", indicador="Indicador 2", bpim="BP-2", apropiacion=250, pagos=30),
        _row(
            id="f1",
            motor="INVERSION_PRESUPUESTAL",
            meta="M-1",
            bpim="BP-1",
            apropiacion=100,
            pagos=50,
        ),
        _row(
            id="f2",
            motor="INVERSION_PRESUPUESTAL",
            meta="M-2",
            bpim="BP-2",
            apropiacion=250,
            pagos=30,
        ),
    ]
    state = _build_state(rows)
    assert len(state["goals_by_plan"]["PDD_2024_2027"]) == 2
    assert state["financial"][("Secretaría de Prueba", 2024, "apropiacion")] == 350
    assert state["financial"][("Secretaría de Prueba", 2024, "pagos")] == 80


def test_financial_unkeyed_same_source_amount_deduplicates():
    rows = [
        _row(motor="INVERSION_PRESUPUESTAL", meta=None, bpim=None, apropiacion=100, pagos=None),
        _row(
            id="2",
            motor="INVERSION_PRESUPUESTAL",
            meta=None,
            bpim=None,
            apropiacion=100,
            pagos=None,
        ),
    ]
    state = _build_state(rows)
    assert state["financial"][("Secretaría de Prueba", 2024, "apropiacion")] == 100


def test_line_alias_normalization():
    assert _line_key("Línea 1: Seguridad Humana", "PDD_2024_2027") == "1. Seguridad Humana"
    assert _line_key("Cartagena Incluyente", "PDD_2020_2023") == "Pilar 2: Cartagena Incluyente"
    assert _line_key("0.5522956144837197", "PDD_2024_2027") in {
        "5. Innovación Pública y Participación Ciudadana",
    }
    assert _line_key("0.82", "PDD_2020_2023") == "Eje Transversal: Finanzas y Gobernanza"
    assert _line_key("# DE VIVIENDAS ENTREGADAS 2018 Junio", "PDD_2024_2027") == "2. Vida Digna"
    assert (
        _line_key("FORMATO PLAN ACCION / PLAN ACCION IPCC 2019", "PDD_2016_2019")
        == CANONICAL_2016[7]
    )


def test_tripartite_progress_imputes_verified_sister_rows():
    pdd = _row(avance_estrategico=None, avance_fisico=None)
    pdd["avance_estrategico"] = None
    pdd["avance_fisico"] = None
    pa = _row(id="pa", motor="PLAN_ACCION", avance_estrategico=0.6, ejecutada=6)
    budget = _row(id="budget", motor="INVERSION_PRESUPUESTAL", apropiacion=500)
    state = _build_state([pdd, pa, budget])
    goal = state["goals_by_plan"]["PDD_2024_2027"][0]
    assert goal["avance_directo_pct"] is None
    assert goal["avance_pa_pct"] == pytest.approx(60)
    assert goal["avance_consolidado_tripartito_pct"] == pytest.approx(60)
    assert goal["soporte_presupuestal_cop"] == 500


def test_malmquist_exact_lp_factorization():
    dmu_a = {
        "A": (np.array([1.0]), np.array([1.0, 1.0])),
        "B": (np.array([2.0]), np.array([2.0, 1.0])),
    }
    dmu_b = {
        "A": (np.array([1.0]), np.array([1.5, 1.0])),
        "B": (np.array([2.0]), np.array([2.5, 1.0])),
    }
    result = _malmquist_interplan("PDD_A", "PDD_B", [], [], dmu_a, dmu_b)
    assert result["metodo"].startswith("Malmquist output-oriented CRS exacto")
    assert result["mpi_global"] == pytest.approx(result["effch_global"] * result["techch_global"])


def test_concentration_metrics_bounds():
    assert _gini([5, 5, 5]) == 0
    assert _hhi([1, 1]) == 0.5
    assert _gini([]) is None


def test_rank_entities_is_sorted_by_verified_advance():
    rows = [
        _row(entidad="Entidad B", avance_estrategico=0.5, ejecutada=5),
        _row(entidad="Entidad A", avance_estrategico=0.9, ejecutada=9),
    ]
    assert [x["entidad"] for x in _rank_entities(rows)] == ["Entidad A", "Entidad B"]


def test_macroproject_list_comes_from_official_source_and_has_19_items():
    projects = _macroprojects()
    assert len(projects) == 19
    assert "Malecón Del Mar" in projects[0]


def test_official_2024_ppi_line_tables_reconcile_to_annual_totals():
    lines = PddDeaService._ppi_2024_lines()
    assert len(lines) == 6
    for year, total in PPI_2024.items():
        assert abs(sum(line["vigencias_cop"][str(year)] for line in lines) - total) <= 1


def test_dea_linear_program_efficiency_is_bounded():
    x = np.array([[1.0], [2.0], [3.0]])
    y = np.array([[1.0, 1.0], [1.5, 1.0], [1.0, 2.0]])
    result = _lp(x, y, x[0], y[0], vrs=True)
    assert result["estado"] == "CALCULADO"
    assert 0 < result["eficiencia"] <= 1


def test_interplan_productivity_proxy_is_geometric_and_paired():
    before = [
        {"entidad": "E1", "avance_promedio_pct": 50.0},
        {"entidad": "E2", "avance_promedio_pct": 40.0},
    ]
    after = [
        {"entidad": "E1", "avance_promedio_pct": 100.0},
        {"entidad": "E2", "avance_promedio_pct": 20.0},
    ]
    result = _malmquist_interplan("PDD_A", "PDD_B", before, after)
    assert result["dmu_pareadas"] == 2
    assert result["mpi_global"] == 1


def test_benjamini_hochberg_adjustment_is_monotone():
    q_values = _bh([0.01, 0.04, 0.03])
    assert q_values == pytest.approx([0.03, 0.04, 0.04])


def test_all_six_pdd_dea_routes_are_registered():
    expected = {
        "/compromisos/triada/pdd-dea/catalogo-y-conciliacion-ppi",
        "/compromisos/triada/pdd-dea/cumplimiento-metas",
        "/compromisos/triada/pdd-dea/frontera-dea-pdd",
        "/compromisos/triada/pdd-dea/econometria-comparada-pdd",
        "/compromisos/triada/pdd-dea/explorador-programas-y-seguridad-humana",
        "/compromisos/triada/pdd-dea/resumen-ejecutivo",
    }
    registered = {route.path for route in router.routes}
    assert expected <= registered


def test_official_catalog_extraction_preserves_2024_ppi_rows_and_eight_plans():
    plans, hierarchy, metas = extract_catalog()
    assert len(plans) == 8
    expected_ppi = {
        "PDD_2012_2015": 3_049_788_268_000,
        "PDD_2016_2019": 4_331_941_000_000,
    }
    for plan in plans:
        assert plan["ppi_total_corriente_cop"] > 0
        assert plan["ppi_total_constante_2025_cop"] > 0
        assert plan["metadatos"]["ppi_estado"] == "OFICIAL_EXTRAIDO"
    assert {
        p["codigo_plan"]: p["ppi_total_corriente_cop"]
        for p in plans
        if p["codigo_plan"] in expected_ppi
    } == expected_ppi
    assert (
        sum(row["codigo_plan"] == "PDD_2024_2027" and row["nivel"] == "LINEA" for row in hierarchy)
        == 6
    )
    assert (
        sum(
            row["codigo_plan"] == "PDD_2024_2027" and row["nivel"] == "IMPULSOR"
            for row in hierarchy
        )
        == 42
    )
    assert (
        sum(
            row["codigo_plan"] == "PDD_2024_2027" and row["nivel"] == "PROGRAMA"
            for row in hierarchy
        )
        == 188
    )
    assert len(metas) > 0


def test_quantified_ocr_extraction_covers_2012_and_2016_plans():
    _, _, metas = extract_catalog()
    counts = {
        plan: sum(row["codigo_plan"] == plan for row in metas)
        for plan in ("PDD_2012_2015", "PDD_2016_2019")
    }
    assert counts["PDD_2012_2015"] > 0
    assert counts["PDD_2016_2019"] > 0
    old_ocr_rows = [
        row
        for row in metas
        if row["codigo_plan"] == "PDD_2012_2015"
        or row["datos_oficiales"].get("extraccion") == "OCR_CUANTITATIVO_REGLAS_V1"
    ]
    assert all(row["datos_oficiales"].get("evidencia_ocr_literal") for row in old_ocr_rows)
    fallback = [
        row
        for row in metas
        if row["codigo_plan"] == "PDD_2016_2019"
        and row["datos_oficiales"].get("extraccion") == "ESTRUCTURA_OFICIAL_FALLBACK"
    ]
    quantified = [
        row
        for row in metas
        if row["codigo_plan"] == "PDD_2016_2019"
        and row["datos_oficiales"].get("extraccion") == "OCR_CUANTITATIVO_REGLAS_V2"
    ]
    assert quantified
    assert not fallback


def test_network_dea_returns_bounded_stage_scores_and_rank_sensitivity():
    from app.modules.compromisos.pdd_dea_service import _network_efficiencies

    dmus = [
        {
            "entidad": "A",
            "presupuesto_cop": 100,
            "productos_operativos": 10,
            "proyectos_bpim_activos": 8,
            "avance_pdd": 20,
            "metas_pdd_observadas": 2,
        },
        {
            "entidad": "B",
            "presupuesto_cop": 200,
            "productos_operativos": 30,
            "proyectos_bpim_activos": 3,
            "avance_pdd": 90,
            "metas_pdd_observadas": 15,
        },
        {
            "entidad": "C",
            "presupuesto_cop": 300,
            "productos_operativos": 8,
            "proyectos_bpim_activos": 2,
            "avance_pdd": 30,
            "metas_pdd_observadas": 3,
        },
        {
            "entidad": "D",
            "presupuesto_cop": 500,
            "productos_operativos": 18,
            "proyectos_bpim_activos": 15,
            "avance_pdd": 45,
            "metas_pdd_observadas": 6,
        },
        {
            "entidad": "E",
            "presupuesto_cop": 120,
            "productos_operativos": 4,
            "proyectos_bpim_activos": 1,
            "avance_pdd": 15,
            "metas_pdd_observadas": 1,
        },
    ]
    result = _network_efficiencies(dmus)
    for row in result:
        assert 0 < row["score_etapa1_operativa_pa"] <= 1
        assert 0 < row["score_etapa2_estrategica_pdd"] <= 1
        assert row["estabilidad_ranking"]["estado_estabilidad"] in {
            "ESTABLE",
            "MODERADO",
            "VOLATIL",
        }
    assert any(row["clasificacion_red"] == "ILUSION_BUROCRATICA" for row in result)


def test_inverse_dea_budget_ledger_is_neutral_for_all_flexibility_levels():
    from app.modules.compromisos.pdd_dea_service import _inverse_dea_scenarios

    dmus = [
        {
            "entidad": f"E{i}",
            "presupuesto_cop": 100_000_000 * (i + 1),
            "score_etapa2_estrategica_pdd": i / 6 + 0.1,
        }
        for i in range(6)
    ]
    scenarios = _inverse_dea_scenarios(dmus)
    assert [row["flexibilidad_pct"] for row in scenarios] == [5, 10, 15]
    assert all(row["ledger_restricciones"]["balance_presupuestal"] for row in scenarios)
    assert all(abs(row["ledger_restricciones"]["suma_delta_cop"]) < 0.01 for row in scenarios)
    assert all(row["ganancia_potencial_cumplimiento_pp"] is None for row in scenarios)


def test_pdd_raw_json_responses_are_pre_serialized_fast_and_support_etag():
    from time import perf_counter

    key = "test/payload-2mb"
    payload = {"body": "x" * 2_000_000}
    pdd_dea_module._RAW_JSON_BYTES.pop(key, None)
    pdd_dea_module._serialize_payload(key, payload)
    start = perf_counter()
    response = pdd_dea_module.pre_serialized_response(key, payload)
    elapsed_ms = (perf_counter() - start) * 1000
    assert elapsed_ms < 25
    assert response.headers["etag"]
    assert response.headers["x-polis-cache"] == "HIT-V11"
    not_modified = pdd_dea_module.pre_serialized_response(key, payload, response.headers["etag"])
    assert not_modified.status_code == 304


def test_all_pdd_dea_routes_are_registered_with_the_prescriptive_lab():
    paths = {route.path for route in router.routes}
    prefix = "/compromisos/triada/pdd-dea/"
    assert sum(path.startswith(prefix) for path in paths) == 11
    assert prefix + "laboratorio-prescriptivo" in paths
    assert prefix + "seguridad-humana-comparativo" in paths
    assert prefix + "cruce-multiagente-pa-bpim" in paths
