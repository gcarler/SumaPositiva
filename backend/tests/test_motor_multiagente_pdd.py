from __future__ import annotations

from app.modules.compromisos.motor_multiagente_pdd import (
    EstadoSistemaPDD,
    ResultadoAgente,
    _count_json_records,
    _page_chunks,
    serializar_estado,
)
from scripts.reconstruir_catalogo_pdd_seguridad_humana_16 import _classify
from scripts.sincronizar_catalogo_pdd import _order_hierarchy_parent_first, extract_catalog


def test_page_chunks_recupera_paginas_ocr_y_delimitadores_de_conversion():
    source = """--- PAGINA 1 ---\ntexto uno\n
## Página 2 (OCR Oficial Acuerdo 006 de 2016)\ntexto dos\n
***Página 3 de 3***\ntexto tres\n"""

    assert _page_chunks(source) == {1: "texto uno", 2: "texto dos", 3: "texto tres"}


def test_page_chunks_no_declara_cobertura_si_falta_delimitador():
    assert _page_chunks("## Página 1\ntexto\n## Página 3\ntexto") == {1: "texto", 3: "texto"}


def test_estado_compartido_serializa_bitacora_de_agente_sin_contenido_de_fuentes():
    state = EstadoSistemaPDD(run_id="PDD17-test")
    state.log(
        ResultadoAgente(
            agente="AgenteAbsorcionDocumentalPDD",
            estado="COMPLETADO",
            iniciado_en="2026-01-01T00:00:00+00:00",
            terminado_en="2026-01-01T00:00:01+00:00",
            duracion_segundos=1.0,
            metricas={"paginas_absorbidas": 161},
        )
    )
    payload = serializar_estado(state)

    assert payload["run_id"] == "PDD17-test"
    assert payload["auditoria_agentes"][0]["metricas"]["paginas_absorbidas"] == 161
    assert "paginas" not in payload


def test_json_structurado_cuenta_registros_anidados():
    assert _count_json_records({"programas": [{"metas": [1, 2]}, {"metas": [3]}]}) == 5


def test_catalogo_profundo_recupera_pdd_historicos_y_conserva_padres_validos():
    plans, nodes, goals = extract_catalog()
    node_ids = {row["id"] for row in nodes}
    plan_nodes = {code: [row for row in nodes if row["codigo_plan"] == code] for code in (
        "PDD_2012_2015",
        "PDD_2013_2015",
        "PDD_2016_2019",
        "PDL_2_2024_2027",
    )}
    plan_goals = {code: [row for row in goals if row["codigo_plan"] == code] for code in plan_nodes}

    assert len(plans) == 8
    assert len(plan_goals["PDD_2012_2015"]) >= 150
    assert len(plan_goals["PDD_2013_2015"]) >= 100
    assert len(plan_goals["PDD_2016_2019"]) > 3
    assert sum(row["nivel"] == "PROGRAMA" for row in plan_nodes["PDD_2013_2015"]) >= 30
    assert sum(row["nivel"] == "SUBPROGRAMA" for row in plan_nodes["PDD_2013_2015"]) >= 30
    assert sum(row["nivel"] == "PROGRAMA" for row in plan_nodes["PDL_2_2024_2027"]) >= 10
    assert sum(row["nivel"] == "PROGRAMA" for row in plan_nodes["PDD_2016_2019"]) >= 50
    assert sum(row["nivel"] == "SUBPROGRAMA" for row in plan_nodes["PDD_2016_2019"]) >= 100
    assert all(row.get("parent_id") in node_ids for row in nodes if row.get("parent_id"))


def test_taxonomia_clasifica_los_ejes_historicos_en_frontalidad_y_determinantes():
    direct_grade, _, direct_weights = _classify(
        "Eje 5. Seguridad Ciudadana y Buen Gobierno", "EJE", {}
    )
    determinant_grade, _, determinant_weights = _classify(
        "Programa de superación de pobreza y generación de ingresos", "PROGRAMA", {}
    )

    assert direct_grade.startswith("A_")
    assert determinant_grade.startswith("B_")
    assert sum(direct_weights.values()) == 1.0
    assert sum(determinant_weights.values()) == 1.0


def test_catalogo_inserta_padres_antes_de_hijos_en_lotes_postgresql():
    parent_id = "00000000-0000-0000-0000-000000000001"
    child_id = "00000000-0000-0000-0000-000000000002"
    rows = [
        {"id": child_id, "parent_id": parent_id, "nombre": "Programa"},
        {"id": parent_id, "parent_id": None, "nombre": "Objetivo"},
    ]

    ordered = _order_hierarchy_parent_first(rows)

    assert [row["id"] for row in ordered] == [parent_id, child_id]
