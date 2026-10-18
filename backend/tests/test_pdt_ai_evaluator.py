"""Pruebas deterministas del evaluador agéntico PDT."""

import asyncio
import re

import pytest

from app.modules.compromisos import pdt_ai_evaluator_graph as evaluator


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
