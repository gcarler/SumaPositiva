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
    ToolContext,
    _query_actividades,
    _query_metas,
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
        if "total_coincidentes" in query:
            return FakeResult(
                [
                    {
                        "codigo_plan": "PDD_2024_2027",
                        "total_metas": 1,
                        "total_coincidentes": 1,
                    }
                ]
            )
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
    from app.modules.compromisos import pdt_hoshin_kanri, pdt_revision_por_meta

    monkeypatch.setattr(
        pdt_hoshin_kanri,
        "construir_matriz_x_hoshin_kanri_pdt",
        lambda **kwargs: {
            "evaluacion_fair": {
                "focus_score": 0.8,
                "alignment_score": 0.7,
                "integration_score": 0.6,
                "review_score": 0.5,
                "fair_global_index": 0.65,
            },
            "bowling_charts": [
                {"color_semaforo": "ROJO_CONTENCION_PDCA"},
                {"color_semaforo": "VERDE"},
            ],
        },
    )
    monkeypatch.setattr(
        pdt_revision_por_meta,
        "construir_matriz_revision_por_meta_pdt",
        lambda codigo_plan=None, limit=100: {
            "resumen_ejecutivo_revision": {"hallazgos_criticos": 2},
            "total_metas_evaluadas": 4,
        },
    )
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
    assert evaluation["hoshin_kanri_fair"]["fair_global_index"] == 0.65
    assert (
        evaluation["hoshin_kanri_fair"]["bowling_charts_pdca"]["conteo_estados"][
            "ROJO_CONTENCION_PDCA"
        ]
        == 1
    )
    assert evaluation["revision_10d_resumen"]["resumen_ejecutivo_revision"] == {
        "hallazgos_criticos": 2
    }
    assert result["evidencia_financiera_y_metas"]["evaluacion_pdt_gbr"] == evaluation


def test_cobertura_universal_metas_y_operacion_sin_truncar(monkeypatch):
    class Result:
        def __init__(self, rows):
            self.rows = rows

        def mappings(self):
            return self

        def all(self):
            return self.rows

    class Session:
        async def execute(self, statement, params=None):
            query = str(statement)
            if "total_coincidentes" in query:
                return Result(
                    [
                        {
                            "codigo_plan": "PDD_2024_2027",
                            "total_metas": 1246,
                            "total_coincidentes": 70,
                        }
                    ]
                )
            if "FROM seguimiento.pdd_metas_oficiales" in query:
                return Result([{"codigo": f"M{i}"} for i in range(20)])
            if "FROM seguimiento.actividades_plan_accion" in query:
                return Result(
                    [
                        {
                            "codigo": "A1",
                            "programa_nombre": "Salud",
                            "entidad_responsable": "DADIS",
                            "codigo_bpim": "BP1",
                            "proyecto_nombre": "Salud barrial",
                            "descripcion_actividad": "Salud",
                            "porcentaje_avance_fisico": 40,
                        },
                        {
                            "codigo": "A2",
                            "programa_nombre": "Salud",
                            "entidad_responsable": "DADIS",
                            "codigo_bpim": "BP2",
                            "proyecto_nombre": "Salud pública",
                            "descripcion_actividad": "Salud",
                            "porcentaje_avance_fisico": 80,
                        },
                    ]
                )
            if "registros_triada_normalizados" in query:
                return Result([{"total_registros": 3, "apropiacion": 900, "compromisos": 700}])
            return Result([])

    consulta = ConsultaAgentesPDD(
        pregunta="Salud", codigo_plan="PDD_2024_2027", dimension_sh="Salud", grado_frontalidad="A"
    )
    context = ToolContext(session=Session(), consulta=consulta)
    metas = asyncio.run(_query_metas(context))
    assert len(metas) == 20
    assert context.cobertura_universo_bd == {
        "planes_evaluados_count": 1,
        "metas_por_plan_totales": {"PDD_2024_2027": 1246},
        "total_metas_coincidentes_sin_truncar": 70,
        "metas_incluidas_en_muestra": 20,
        "muestra_truncada": True,
    }
    monkeypatch.setattr(
        agents_module,
        "_query_nodos",
        lambda _ctx, **_kwargs: asyncio.sleep(
            0,
            result=[
                {
                    "codigo_plan": "PDD_2024_2027",
                    "codigo": "N1",
                    "nombre": "Salud",
                    "metadatos": {"grado_frontalidad_sh": "A"},
                }
            ],
        ),
    )
    activities = asyncio.run(_query_actividades(context))
    assert len(activities) == 2
    coverage = context.cobertura_universo_operativo
    assert coverage["total_actividades_pa_coincidentes_sin_truncar"] == 2
    assert coverage["total_registros_triada_coincidentes_sin_truncar"] == 3
    assert coverage["suma_apropiacion_universo_filtrado_cop"] == 900
    assert coverage["suma_compromisos_universo_filtrado_cop"] == 700
    assert coverage["promedio_avance_fisico_universo_filtrado_pct"] == 60


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


def test_filtro_pdt_exige_plan_y_termino_tematico():
    matches = agents_module._matches_pdt_filter
    assert matches("PDD_2024_2027 Secretaría de Salud", ["salud"], "PDD_2024_2027")
    assert not matches("PDD_2024_2027 Secretaría de Infraestructura", ["salud"], "PDD_2024_2027")
    assert not matches("PDD_2020_2023 Secretaría de Salud", ["salud"], "PDD_2024_2027")


def test_consejo_multiagente_incluye_resumen_dea_cartagena(monkeypatch):
    from app.modules.compromisos import pdd_dea_service

    async def levels(**_kwargs):
        return {
            "estado": "OK",
            "niveles": {
                f"nivel_{number}": {"total_dmus": 2, "eficientes": 1, "ineficientes": 1}
                for number in range(1, 5)
            },
        }

    async def dashboard(**_kwargs):
        return {
            "total_alertas_falso_cumplimiento_nominal": 1,
            "alertas_falso_cumplimiento_nominal": [{"dmu": "SED"}],
            "benchmarks_armonizacion_presupuestal": [{"dmu": "DADIS", "theta_bcc": 1.0}],
        }

    monkeypatch.setattr(pdd_dea_service, "obtener_dea_cartagena_4_niveles", levels)
    monkeypatch.setattr(pdd_dea_service, "obtener_tablero_dea_cartagena", dashboard)
    result = asyncio.run(agents_module._resumen_dea_4_niveles_cartagena(FakeSession()))
    assert result["estado"] == "OK"
    assert len(result["niveles"]) == 4
    assert result["total_alertas_tablero_alcalde"] == 1
    assert result["benchmarks_armonizacion_presupuestal"][0]["theta_bcc"] == 1.0
