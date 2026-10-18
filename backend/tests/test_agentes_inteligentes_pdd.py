from __future__ import annotations

import asyncio
import hashlib
import json

import pytest

from app.modules.compromisos import agentes_inteligentes_pdd as agents_module
from app.modules.compromisos.agentes_inteligentes_pdd import (
    AGENT_SPECS,
    TOOL_SPECS,
    ConsultaAgentesPDD,
    InterpretarFragmentoPDD,
    arquitectura_agentes_ia,
    ejecutar_consulta_pdd,
    interpretar_fragmento,
)


def _pdt_cache(tmp_path):
    diagnostic = {
        "motor": "PDT-AI-EVALUATOR",
        "estado_checkpointer": "COMPLETADO_SIN_BLOQUEO",
        "unidades_dmu": ["Secretaría de Salud", "Secretaría de Infraestructura"],
        "dea_scores": {
            "resultados_dmu": [
                {
                    "dmu": "Secretaría de Salud|2024",
                    "theta_ccr": 0.8,
                    "theta_bcc": 0.9,
                    "SE_o": 0.89,
                    "rendimientos_escala": "IRS",
                    "slacks": {},
                    "origen_insumo": "apropiacion_definitiva_cop",
                },
                {
                    "dmu": "Secretaría de Infraestructura|2024",
                    "theta_ccr": 0.7,
                    "theta_bcc": 0.8,
                    "SE_o": 0.875,
                    "rendimientos_escala": "DRS",
                    "slacks": {},
                    "origen_insumo": "ppi_oficial_desagregado_pdd",
                },
            ],
            "malmquist": {"pares": [{"unidad": "Secretaría de Salud", "MPI": 1.1}]},
            "bias_corrected": {"por_dmu": {}},
        },
        "nlp_coherence": {
            "alertas_mission_creep": [
                {
                    "codigo_plan": "PDD_2024_2027",
                    "dependencias": ["Secretaría de Salud"],
                    "actividad_operativa": "salud sin articulación",
                }
            ],
            "similaridad_coseno": {"pares_evaluados": 1, "promedio": 0.4},
            "sectores": [],
        },
        "spatial_lisa": {
            "lisa": [{"unidad": "Barrio Salud", "cluster": "Bajo-Bajo (Coldspots)"}],
            "trampas_territoriales_gestion_publica": [
                {"unidad_dmu": "Secretaría de Salud|2024", "alerta": "Trampa Territorial"}
            ],
            "poligonos_reales_postgis": 1,
        },
        "time_series_forecast": {
            "series": [
                {
                    "indicador": "Secretaría de Salud",
                    "ISRI": 0.6,
                    "chow": {"anio_ruptura": 2024, "estado": "ESTIMADO"},
                }
            ]
        },
        "evaluacion_multisectorial": [],
    }
    path = tmp_path / "cache_pdt_ai_evaluator.json"
    path.write_text(json.dumps({"runs": {"run": diagnostic}}), encoding="utf-8")
    return path


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return self.rows

    def one(self):
        return self.rows[0]


class FakeSession:
    def __init__(self):
        content = "Programa distrital de salud y seguridad personal, inversión pública."
        digest = hashlib.sha256(content.encode()).hexdigest()
        self.evidence = {
            "codigo_plan": "PDD_2024_2027",
            "archivo": "pdd_2024_2027_oficial.pdf",
            "pagina": 84,
            "sha256_contenido": digest,
            "origen_texto": "PDF_TEXT_LAYER",
            "filas_tabla_detectadas": 2,
            "contenido": content,
        }
        self.node = {
            "id": "node-1",
            "codigo_plan": "PDD_2024_2027",
            "parent_id": None,
            "nivel": "PROGRAMA",
            "codigo": "P-1",
            "nombre": "Salud y seguridad personal",
            "orden": 1,
            "ppi_anual_cop": {},
            "fuente": "catálogo de prueba",
            "metadatos": {
                "grado_frontalidad_sh": "A_NUCLEO_FRONTAL",
                "dimension_sh_primaria": "Salud",
                "pesos_7d": {"Salud": 1.0},
                "ppi_total_constante_2025_cop": 1000,
            },
        }

    async def execute(self, statement, params=None):
        query = str(statement)
        if "count(*) FROM seguimiento.pdd_evidencia_paginas" in query:
            return FakeResult(
                [{"evidencias_paginas": 1, "nodos_mga": 1, "metas_pdd": 1, "metas_pdl": 0}]
            )
        if "FROM seguimiento.pdd_evidencia_paginas" in query:
            return FakeResult([self.evidence])
        if "FROM seguimiento.pdd_lineas_y_programas" in query:
            return FakeResult([self.node])
        if "FROM seguimiento.pdd_metas_oficiales" in query:
            return FakeResult(
                [
                    {
                        "id": "meta-1",
                        "codigo_plan": "PDD_2024_2027",
                        "linea_id": "node-1",
                        "tipo_meta": "RESULTADO",
                        "codigo": "M-1",
                        "nombre": "Mejorar condiciones de salud",
                        "indicador": "Tasa de cobertura",
                        "unidad_medida": "%",
                        "linea_nombre": "Salud",
                        "fuente": "oficial",
                        "fila_fuente": 1,
                        "datos_oficiales": {"linea_base": 10, "meta_cuatrienio": 20},
                    }
                ]
            )
        if "FROM seguimiento.planes_desarrollo_distrital" in query:
            return FakeResult(
                [
                    {
                        "codigo_plan": "PDD_2024_2027",
                        "periodo": "2024-2027",
                        "nombre_oficial": "Plan de Desarrollo",
                        "ppi_total_corriente_cop": 2000,
                        "ppi_total_constante_2025_cop": 2000,
                        "ppi_anual_cop": {},
                        "fuentes": [],
                        "metadatos": {},
                    }
                ]
            )
        return FakeResult([])


def test_arquitectura_expone_seis_agentes_y_pdt_ai_evaluator(tmp_path, monkeypatch):
    monkeypatch.setattr(agents_module, "PDT_CACHE_PATH", _pdt_cache(tmp_path))
    architecture = asyncio.run(arquitectura_agentes_ia(FakeSession()))

    assert architecture["motor"] == "POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2"
    assert len(architecture["nodos_langgraph"]) == 6
    assert len(architecture["herramientas_registradas"]) == 6
    assert {tool["nombre"] for tool in architecture["herramientas_registradas"]} == {
        tool["nombre"] for tool in TOOL_SPECS
    }
    assert {node["id_nodo"] for node in architecture["nodos_langgraph"]} == {
        node["id_nodo"] for node in AGENT_SPECS
    }
    integration = architecture["integracion_pdt_ai_evaluator"]
    assert integration["total_dmus"] == 2
    assert integration["pares_malmquist"] == 1
    assert integration["poligonos_postgis_lisa"] == 1
    assert "tool_consultar_evaluador_pdt_gbr" in {
        item["nombre"] for item in architecture["herramientas_registradas"]
    }


def test_stategraph_invoca_tools_y_verifica_cita_sha256(tmp_path, monkeypatch):
    monkeypatch.setattr(agents_module, "PDT_CACHE_PATH", _pdt_cache(tmp_path))
    result = asyncio.run(
        ejecutar_consulta_pdd(
            FakeSession(),
            ConsultaAgentesPDD(
                pregunta="¿Qué inversión de salud personal figura en el plan?",
                codigo_plan="PDD_2024_2027",
                dimension_sh="Salud",
                grado_frontalidad="A",
            ),
        )
    )

    assert result["motor"] == "POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2"
    assert len(result["traza_langgraph"]) == 6
    assert {step["nodo_langgraph"] for step in result["traza_langgraph"]} == {
        node["id_nodo"] for node in AGENT_SPECS
    }
    assert {
        tool["herramienta"]
        for step in result["traza_langgraph"]
        for tool in step["herramientas_invocadas"]
    } == {tool["nombre"] for tool in TOOL_SPECS}
    citation = result["citas_evidencia_documental"][0]
    assert (
        citation["sha256_contenido"]
        == hashlib.sha256(FakeSession().evidence["contenido"].encode()).hexdigest()
    )
    assert result["verificacion_critica"]["aprobado"] is True
    assert result["verificacion_critica"]["cero_alucinacion_financiera"] is True
    assert result["evidencia_financiera_y_metas"]["planes_analizados"]
    evaluation = result["dictamen_forense_detallado"]["evaluacion_pdt_gbr"]
    assert evaluation["dmu_dea"][0]["dmu"] == "Secretaría de Salud|2024"
    assert evaluation["alertas_mission_creep"]
    assert evaluation["trampas_territoriales"]
    assert evaluation["indicadores_isri_alto_riesgo"][0]["chow"]["anio_ruptura"] == 2024
    assert result["evidencia_financiera_y_metas"]["evaluacion_pdt_gbr"] == evaluation


def test_interpretacion_fragmento_extrae_mga_crema_y_vector_7d():
    result = asyncio.run(
        interpretar_fragmento(
            FakeSession(),
            InterpretarFragmentoPDD(
                texto_fragmento=(
                    "Programa: Cartagena Sin Hambre\n"
                    "Subprograma: Comedores comunitarios\n"
                    "Meta: Reducir de 18,4% a 10,0% la inseguridad alimentaria."
                ),
                codigo_plan_referencia="PDD_2024_2027",
                archivo_origen="pdd_2024_2027_oficial.pdf",
                pagina=84,
            ),
        )
    )

    assert {node["nivel"] for node in result["nodos_extraidos"]} == {
        "PROGRAMA",
        "SUBPROGRAMA",
    }
    assert result["metas_extraidas"][0]["evaluacion_crema"]["puntaje_crema_pct"] > 0
    assert sum(result["clasificacion_neurosimbolica"]["pesos_7d"].values()) == pytest.approx(1.0)
    assert result["clasificacion_neurosimbolica"]["grado_frontalidad"] in "ABCN"
    assert len(result["traza_agentes"]) == 3
