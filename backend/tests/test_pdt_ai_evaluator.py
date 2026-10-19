"""Pruebas deterministas del evaluador agéntico PDT."""

import asyncio
import re

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.compromisos import pdt_ai_evaluator_graph as evaluator
from app.modules.compromisos import router


def _state() -> evaluator.AgentState:
    return evaluator._build_state(
        {
            "plans": [],
            "documents": [],
            "nodes": [],
            "goals": [],
            "activities": [],
            "normalized": [],
            "territories": [],
        },
        "Cartagena",
        "2024-2027",
        "test-thread",
    )


def test_specification_covers_methodology_and_sectors():
    specification = evaluator.obtener_especificacion_pdt_ai_evaluator()
    assert len(specification["matriz_multisectorial"]) == 5
    assert {sector["sector"] for sector in specification["matriz_multisectorial"]} == {
        "Educación Pública",
        "Salud Pública",
        "Infraestructura Vial",
        "Desarrollo Agrícola",
        "Medio Ambiente",
    }
    for metric in (
        "CCR",
        "BCC",
        "Malmquist",
        "Bootstrap",
        "c-TF-IDF",
        "Moran",
        "LISA",
        "Chow",
        "ISRI",
    ):
        assert metric.casefold() in str(specification).casefold()
    assert (
        r"\sum_{j=1}^{n} \lambda_j = 1" == specification["ecuaciones_latex"]["dea_bcc_convexidad"]
    )
    assert "0.45" in str(specification)
    assert "0.4" in str(specification)


def test_revision_por_meta_route_normalizes_legacy_builder(monkeypatch):
    class FakeModule:
        @staticmethod
        def obtener_especificacion_revision_por_meta():
            return {
                "diez_dimensiones_revision": {"coherencia": {"peso": 0.1}},
                "siete_roles_revisores": {"curador": {"funcion": "validar"}},
            }

    def builder(codigo_plan, dependencia, limit):
        assert codigo_plan == "PDD_TEST"
        assert dependencia == "Salud"
        assert limit == 25
        return {
            "metas_auditadas": [{"codigo_meta": "M1"}],
            "resumen_auditoria": {"total_metas_plan": 1},
            "generado_en": "2026-10-18T00:00:00Z",
        }

    monkeypatch.setattr(router, "_cargar_revision_por_meta_fn", lambda: (builder, FakeModule))
    result = asyncio.run(
        router.pdt_ai_evaluator_revision_por_meta(object(), "PDD_TEST", None, "Salud", 25, False)
    )

    assert result["sistema"] == "PDT-AI-EVALUATOR-REVISION-10D-META"
    assert result["total_metas_evaluadas"] == 1
    assert result["catalogo_10_dimensiones"][0]["dimension"] == "coherencia"
    assert result["catalogo_7_revisores"][0]["rol"] == "curador"
    assert result["resumen_ejecutivo_revision"] == {"total_metas_plan": 1}
    assert result["matriz_metas"][0]["codigo_meta"] == "M1"


def test_dea_cartagena_routes_delegate_orientations_and_tablero(monkeypatch):
    calls = []

    async def levels(**kwargs):
        calls.append(("levels", kwargs))
        return {
            "estado": "OK",
            "orientacion": kwargs["orientacion"],
            "niveles": {"nivel_1_territorial_localidades_ucg": {"total_dmus": 3}},
        }

    async def dashboard(**kwargs):
        calls.append(("dashboard", kwargs))
        return {
            "estado": "OK",
            "total_alertas_falso_cumplimiento_nominal": 1,
            "benchmarks_armonizacion_presupuestal": [{"theta_bcc": 1.0}],
        }

    monkeypatch.setattr(router, "obtener_dea_cartagena_4_niveles", levels)
    monkeypatch.setattr(router, "obtener_tablero_dea_cartagena", dashboard)
    assert (
        asyncio.run(router.pdt_dea_cartagena_4_niveles(object(), None, "input", None))[
            "orientacion"
        ]
        == "input"
    )
    assert (
        asyncio.run(router.pdt_dea_cartagena_4_niveles(object(), None, "output", None))[
            "orientacion"
        ]
        == "output"
    )
    result = asyncio.run(router.pdt_dea_cartagena_tablero_alcalde(object(), "input", None))
    assert result["total_alertas_falso_cumplimiento_nominal"] == 1
    assert len(calls) == 3
    paths = {route.path for route in router.router.routes}
    assert "/compromisos/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/4-niveles" in paths
    assert (
        "/compromisos/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/tablero-alcalde-armonizacion"
        in paths
    )


def test_pdt_ai_evaluator_informe_integral_spd_endpoint(monkeypatch):
    from app.modules.compromisos import pdt_informe_integral_spd as report_module

    async def fake_report(**kwargs):
        assert kwargs["orientacion_dea"] == "input"
        assert kwargs["incluir_exportables"] is True
        return {
            "encabezado_institucional": {
                "fingerprint_corte_sha256": "a" * 64,
            },
            "sintesis_hoshin_kanri_y_pdl": {},
            "sintesis_revision_10d_y_vinculos_pa": {},
            "sintesis_dea_4_niveles_y_fuentes": {},
            "cobertura_historica_8_planes_2012_2027": {
                "total_planes_oficiales": 8,
                "total_metas_historicas_y_locales": 4637,
                "planes": [
                    {"codigo_plan": f"PLAN_{index}", "periodo": "2012–2027", "tipo_plan": "PDD"}
                    for index in range(8)
                ],
            },
            "tablero_alcalde_alertas_desperdicio": {},
            "tabla_armonizacion_presupuestal_spd": [],
            "exportables_auditables": {
                "markdown_ejecutivo": "# Informe\n## Cobertura histórica de los ocho planes",
                "csv_armonizacion_y_alertas": "nivel,dmu\\n",
            },
        }

    monkeypatch.setattr(report_module, "generar_informe_integral_spd_cartagena", fake_report)
    app = FastAPI()
    app.include_router(router.router, prefix="/api/v1")
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/informe-integral-spd",
            params={"orientacion_dea": "input", "incluir_exportables": "true"},
        )

    assert response.status_code == 200
    payload = response.json()
    fingerprint = payload["encabezado_institucional"]["fingerprint_corte_sha256"]
    assert len(fingerprint) == 64
    assert set(fingerprint) <= set("0123456789abcdef")
    for key in (
        "sintesis_hoshin_kanri_y_pdl",
        "sintesis_revision_10d_y_vinculos_pa",
        "sintesis_dea_4_niveles_y_fuentes",
        "tablero_alcalde_alertas_desperdicio",
        "tabla_armonizacion_presupuestal_spd",
    ):
        assert key in payload
    assert payload["exportables_auditables"]["markdown_ejecutivo"]
    historical = payload["cobertura_historica_8_planes_2012_2027"]
    assert historical["total_planes_oficiales"] == 8
    assert historical["total_metas_historicas_y_locales"] >= 4637
    assert len(historical["planes"]) == 8
    assert "Cobertura histórica" in payload["exportables_auditables"]["markdown_ejecutivo"]
    assert payload["exportables_auditables"]["csv_armonizacion_y_alertas"]


def test_sispt_dnp_seguimiento_endpoint_uses_fallback_when_module_missing(monkeypatch):
    import sys

    sys.modules.pop("app.modules.compromisos.pdt_sispt_dnp_evaluador", None)
    app = FastAPI()
    app.include_router(router.router, prefix="/api/v1")
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/sispt-dnp-seguimiento"
        )
    assert response.status_code == 200
    result = response.json()
    assert result["total_planes"] == 8
    assert result["total_metas"] == 4637
    assert result["resumen_sispt_dnp"]["conteo_por_tipologia"]


def test_informe_integral_sintetiza_sispt_en_huella_y_markdown(monkeypatch):
    from app.modules.compromisos import pdt_informe_integral_spd as report

    async def sources(*_args):
        return (
            {},
            {
                "resumen_sispt_dnp": {
                    "total_metas_evaluadas": 2,
                    "eficacia_media_bruta_pct": 120.0,
                    "eficacia_media_truncada_sispt_pct": 90.0,
                    "conteo_por_tipologia": {"REDUCCION_BRECHA": 2},
                    "alertas_cuipo_piip": {"COHERENTE_SISPT_CUIPO_PIIP": 2},
                }
            },
            {},
            ({"niveles": {}}, {}),
        )

    async def coverage(_db=None):
        return {
            "estado": "TEST",
            "total_planes_oficiales": 8,
            "total_metas_historicas_y_locales": 4637,
            "planes": [],
        }

    monkeypatch.setattr(report, "_gather_sources", sources)
    monkeypatch.setattr(report, "_cobertura_historica_8_planes", coverage)
    result = asyncio.run(report.generar_informe_integral_spd_cartagena())
    assert result["sintesis_sispt_dnp_cuipo_piip"]["eficacia_media_truncada_sispt_pct"] == 90.0
    assert "SisPT truncada al 100%" in result["exportables_auditables"]["markdown_ejecutivo"]


def test_diagnostico_pshc_google_doc_endpoint_entrega_seis_capitulos():
    app = FastAPI()
    app.include_router(router.router, prefix="/api/v1")
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/diagnostico-seguridad-humana-8planes"
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["capitulos"] == ["I", "II", "III", "IV", "V", "VI"]
    assert all(
        f"{chapter}." in payload["html_google_doc"]
        for chapter in ("I", "II", "III", "IV", "V", "VI")
    )
    for color in ("#0B2545", "#134074", "#8DA9C4", "#F4F6F8", "#FAFAFA"):
        assert color in payload["html_google_doc"]
    assert payload["markdown_ejecutivo"]
    assert payload["csv_embudo_y_7_dimensiones"].startswith("tipo_fila,codigo,periodo")
    assert len(payload["huella_verificacion_sha256"]) == 64
    assert len(payload["markdown_ejecutivo"]) >= 340_000
    assert len(payload["html_google_doc"]) >= 460_000
    for section in ("4.1.1", "4.2.10", "4.3.1", "4.4.10", "4.5.1", "4.6.10", "4.7.10"):
        assert section in payload["markdown_ejecutivo"]


def test_informe_integral_incluye_cobertura_historica_en_markdown(monkeypatch):
    from app.modules.compromisos import pdt_informe_integral_spd as report_module

    async def sources(*_args):
        return {}, {}, {}, ({"niveles": {}}, {})

    async def coverage(_db=None):
        plans = [
            {
                "codigo_plan": f"PLAN_{index}",
                "periodo": "2012–2027",
                "tipo_plan": "PDD" if index < 5 else "PDL",
                "total_metas": 580,
                "total_vinculos_pa_triada": 580,
                "ppi_total_corriente_cop": 1,
            }
            for index in range(8)
        ]
        return {
            "estado": "TEST",
            "total_planes_oficiales": 8,
            "total_metas_historicas_y_locales": 4640,
            "planes": plans,
        }

    monkeypatch.setattr(report_module, "_gather_sources", sources)
    monkeypatch.setattr(report_module, "_cobertura_historica_8_planes", coverage)
    result = asyncio.run(report_module.generar_informe_integral_spd_cartagena())
    history = result["cobertura_historica_8_planes_2012_2027"]
    assert history["total_planes_oficiales"] == 8
    assert history["total_metas_historicas_y_locales"] >= 4637
    assert len(history["planes"]) == 8
    markdown = result["exportables_auditables"]["markdown_ejecutivo"]
    assert "Cobertura histórica de los ocho planes" in markdown
    assert "PLAN_7" in markdown


def test_system_prompt_matches_knowledge_specification():
    from pathlib import Path

    knowledge = (
        Path(__file__).resolve().parents[2]
        / "knowledge-base"
        / "13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md"
    )
    content = knowledge.read_text()
    expected = re.search(r"```markdown\n(.*?)\n```", content, re.S).group(1)
    assert evaluator.SYSTEM_INSTRUCTIONS_PDT_AI_EVALUATOR == expected


def test_graph_executes_analytical_nodes_and_returns_pending_for_empty_data():
    graph = evaluator._make_graph()
    result = asyncio.run(
        graph.ainvoke(_state(), {"configurable": {"thread_id": "test-empty-data"}})
    )
    executed = {entry["nodo"] for entry in result["trace"]}
    assert {
        "nodo_supervisor",
        "nodo_nlp",
        "nodo_dea",
        "nodo_espacial",
        "nodo_predictivo",
    } <= executed
    assert result["dea_scores"]["bootstrap_suavizado"]["replicaciones"] == 1000
    assert result["spatial_lisa"]["estado"] == "PENDIENTE_GEOMETRIAS_O_INDICADORES"
    assert result["time_series_forecast"]["estado"] == "PENDIENTE_DATOS_MULTIANUALES"
    assert result["estado_checkpointer"] == "COMPLETADO_SIN_BLOQUEO"


def test_dea_scores_and_chow_are_calculated():
    score, lambdas, status = evaluator._dea_solve(
        [100.0, 200.0], [[10.0, 10.0], [10.0, 20.0]], 0, True
    )
    assert score is not None and 0 <= score <= 1
    assert sum(lambdas) == pytest.approx(1.0)
    assert status == "ESTIMADO"
    pulp_score, _, pulp_status = evaluator._dea_solve_pulp(
        [100.0, 200.0], [[10.0, 10.0], [10.0, 20.0]], 0, True
    )
    assert pulp_status.startswith("ESTIMADO")
    assert pulp_score == pytest.approx(score, abs=1e-7)
    assert (
        evaluator._chow_test(
            list(range(2017, 2026)), [1, 2, 4, 3, 5, 11, 10, 13, 12], break_year=2022
        )["estadistico_f"]
        is not None
    )


def test_durable_human_validation_updates_checkpoint(tmp_path, monkeypatch):
    monkeypatch.setattr(evaluator, "CHECKPOINT_PATH", tmp_path / "checkpoints.json")
    monkeypatch.setattr(evaluator, "CACHE_PATH", tmp_path / "cache.json")
    state = _state()
    state["estado_checkpointer"] = "CONGELADO_PARA_AUDITORIA_HUMANA"
    state["requires_human_review"] = True
    evaluator._save_checkpoint("audit-thread", state, status="CONGELADO_PARA_AUDITORIA_HUMANA")

    result = asyncio.run(
        evaluator.validar_checkpoint_pdt_ai_evaluator(
            "audit-thread", aprobado=True, auditor="Auditor de prueba", observaciones="Validado"
        )
    )
    assert result["is_valid_human"] is True
    assert result["estado_checkpointer"] == "APROBADO_POR_AUDITOR"
    assert result["auditoria_humana"]["auditor"] == "Auditor de prueba"


def test_nlp_spatial_and_forecast_metrics_are_exposed():
    state = _state()
    state["goal_records"] = [
        {"codigo": "G1", "nombre": "mejorar cobertura educativa escolar", "codigo_plan": "P"}
    ]
    state["activity_records"] = [
        {"descripcion_actividad": "mejorar cobertura educativa escolar", "codigo_bpim": "BP1"}
    ]
    nlp = evaluator._nlp_node(state)["nlp_coherence"]
    assert "ponderacion_c_tfidf" in nlp
    assert "similaridad_coseno" in nlp
    assert nlp["similaridad_coseno"]["umbral_alerta"] == 0.45
    assert nlp["clustering_topologico"]["estado"] == "COMPLETADO"
    assert nlp["clustering_topologico"]["fallback_corpus_pequeno"] is True

    large_state = _state()
    large_state["goal_records"] = [
        {
            "codigo": f"G{i}",
            "nombre": (
                f"education school teacher student coverage curriculum classroom grade {i}"
                if i < 5
                else f"hospital clinic physician nurse patient vaccine mortality ward {i}"
            ),
            "codigo_plan": "P",
        }
        for i in range(5)
    ]
    large_state["activity_records"] = [
        {
            "descripcion_actividad": (
                f"education school teacher student coverage curriculum classroom grade service {i}"
                if i < 5
                else f"hospital clinic physician nurse patient vaccine mortality ward service {i}"
            )
        }
        for i in range(5)
    ]
    large_nlp = evaluator._nlp_node(large_state)["nlp_coherence"]
    topics = large_nlp["clustering_topologico"]
    assert topics["estado"] == "COMPLETADO"
    assert topics["algoritmo"].startswith("TruncatedSVD + HDBSCAN")
    assert topics["n_componentes_svd"] > 0
    assert topics["clusters"] == 2
    assert "ponderaciones_por_cluster" in large_nlp["ponderacion_c_tfidf"]
    assert large_nlp["similaridad_coseno"]["matriz_comparabilidad"]["pares_coseno_calculados"] == 25

    spatial = evaluator._moran_lisa(
        [1.0, 1.1, 1.2, 8.0, 8.1, 8.2],
        [f"T{i}" for i in range(6)],
        [(float(i), float(i % 2)) for i in range(6)],
        permutations=99,
    )
    assert spatial["moran_global_i"] is not None
    assert len(spatial["lisa"]) == 6
    assert "Hotspots" in str([row["cluster"] for row in spatial["lisa"]]) or all(
        row["cluster"]
        in {
            "Alto-Alto (Hotspots)",
            "Bajo-Bajo (Coldspots)",
            "Alto-Bajo (Outlier espacial)",
            "Bajo-Alto (Outlier espacial)",
            "No significativo",
        }
        for row in spatial["lisa"]
    )

    state["normalized_records"] = [
        {
            "indicador": "cobertura",
            "vigencia": year,
            "avance_estrategico_pct": value,
            "meta_programada_anual": 100.0,
        }
        for year, value in zip(range(2018, 2025), [40, 45, 50, 48, 52, 55, 60], strict=True)
    ]
    forecast = evaluator._forecast_series(state)
    assert forecast["series"][0]["ISRI"] is not None
    assert forecast["series"][0]["chow"]["anio_ruptura"] == 2024
    assert forecast["series"][0]["modelo_aplicado"].startswith("ARIMA")


def test_dea_node_reports_slacks_simar_wilson_and_four_distance_malmquist():
    state = _state()
    years = [2023, 2023, 2024, 2024]
    entities = ["A", "B", "A", "B"]
    state["df_financial"] = [
        {"dmu": entity, "vigencia": year, "insumo_cop": cost}
        for entity, year, cost in zip(entities, years, [100, 200, 100, 220], strict=True)
    ]
    state["df_outputs"] = [
        {"dmu": entity, "vigencia": year, "ejecutado": amount}
        for entity, year, amount in zip(entities, years, [10, 20, 15, 25], strict=True)
    ]
    state["df_outcomes"] = [
        {"dmu": entity, "vigencia": year, "avance_estrategico_pct": amount}
        for entity, year, amount in zip(entities, years, [50, 80, 60, 90], strict=True)
    ]

    dea = evaluator._dea_node(state)["dea_scores"]
    assert dea["slacks"]
    assert all("insumos" in row and "productos" in row for row in dea["slacks"].values())
    assert dea["bias_corrected"]["replicaciones"] == 1000
    assert dea["bias_corrected"]["por_dmu"]
    assert dea["equivalencia_solvers"]["equivalencia_total"] is True
    assert all(
        row["lambda_sum_bcc"] == pytest.approx(1.0, abs=1e-6)
        for row in dea["resultados_dmu"]
        if row["lambda_sum_bcc"] is not None
    )
    assert dea["malmquist"]["pares"]
    assert all({"Pech", "Techch", "MPI"} <= pair.keys() for pair in dea["malmquist"]["pares"])


def test_dea_eficiencia_invariante_a_unidad_monetaria_comun():
    state = _state()
    state["df_financial"] = [
        {"dmu": "A", "vigencia": 2024, "insumo_cop": 100_000.0},
        {"dmu": "B", "vigencia": 2024, "insumo_cop": 250_000.0},
        {"dmu": "C", "vigencia": 2024, "insumo_cop": 300_000.0},
    ]
    state["df_outputs"] = [
        {"dmu": name, "vigencia": 2024, "ejecutado_pct": pct}
        for name, pct in zip(("A", "B", "C"), (30.0, 80.0, 90.0), strict=True)
    ]
    state["df_outcomes"] = [
        {"dmu": name, "vigencia": 2024, "avance_estrategico_pct": pct}
        for name, pct in zip(("A", "B", "C"), (30.0, 80.0, 90.0), strict=True)
    ]
    baseline = evaluator._dea_node(state)["dea_scores"]["resultados_dmu"]
    scaled_state = {
        **state,
        "df_financial": [
            {**row, "insumo_cop": row["insumo_cop"] * 1000} for row in state["df_financial"]
        ],
    }
    scaled = evaluator._dea_node(scaled_state)["dea_scores"]["resultados_dmu"]
    for left, right in zip(baseline, scaled, strict=True):
        assert left["theta_ccr"] == pytest.approx(right["theta_ccr"], abs=1e-8)
        assert left["theta_bcc"] == pytest.approx(right["theta_bcc"], abs=1e-8)


def test_build_state_preserva_ejecucion_cero_y_fingerprint():
    data = {
        "plans": [],
        "documents": [],
        "nodes": [],
        "goals": [],
        "activities": [],
        "normalized": [
            {
                "entidad_normalizada": "Secretaría de Salud",
                "vigencia": 2024,
                "apropiacion_definitiva_cop": 100,
                "meta_ejecutada_anual": 0.0,
                "avance_fisico_pct": 75.0,
                "avance_estrategico_pct": 70.0,
            }
        ],
        "territories": [],
    }
    state = evaluator._build_state(data, "Cartagena", "2024-2027", "zero-test")
    assert state["df_outputs"][0]["ejecutado"] == 0.0
    assert state["df_outputs"][0]["grupo_comparabilidad_dea"] == "EJECUCION_PRESUPUESTAL_OBSERVADA"
    assert len(state["fingerprint_sources_sha256"]) == 64
    assert state["version_metodologica"] == evaluator.VERSION_METODOLOGICA_PDT


def test_cache_se_reutiliza_solo_con_fingerprint_de_fuentes_igual(tmp_path, monkeypatch):
    data = {
        "plans": [],
        "documents": [],
        "nodes": [],
        "goals": [],
        "activities": [],
        "normalized": [],
        "territories": [],
    }
    state = evaluator._build_state(data, "Cartagena", "2024-2027", "fingerprint-test")
    monkeypatch.setattr(evaluator, "CACHE_PATH", tmp_path / "cache.json")
    cached = {
        "version_metodologica": evaluator.VERSION_METODOLOGICA_PDT,
        "fingerprint_fuentes_sha256": state["fingerprint_sources_sha256"],
        "cached_result": True,
    }
    evaluator._save_cached(
        evaluator._cache_key("Cartagena", "2024-2027", "fingerprint-test"),
        "fingerprint-test",
        cached,
    )

    async def load(_db):
        return data

    monkeypatch.setattr(evaluator, "_load_corpus", load)
    monkeypatch.setattr(evaluator, "_compiled_graph", lambda: pytest.fail("cache miss"))
    result = asyncio.run(
        evaluator.ejecutar_pdt_ai_evaluator(
            object(),
            jurisdiction="Cartagena",
            time_horizon="2024-2027",
            thread_id="fingerprint-test",
        )
    )
    assert result["cached_result"] is True
    assert result["cache"]["estado"] == "HIT"
