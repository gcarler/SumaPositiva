from __future__ import annotations

import asyncio
import hashlib

import pytest

from app.modules.compromisos.agentes_inteligentes_pdd import (
    AGENT_SPECS,
    TOOL_SPECS,
    ConsultaAgentesPDD,
    InterpretarFragmentoPDD,
    arquitectura_agentes_ia,
    ejecutar_consulta_pdd,
    interpretar_fragmento,
)


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


def test_arquitectura_expone_seis_agentes_y_cinco_tools():
    architecture = asyncio.run(arquitectura_agentes_ia(FakeSession()))

    assert architecture["motor"] == "POLIS_NEUROSIMBOLICO_LANGGRAPH_PYDANTIC_AI_V2"
    assert len(architecture["nodos_langgraph"]) == 6
    assert len(architecture["herramientas_registradas"]) == 5
    assert {tool["nombre"] for tool in architecture["herramientas_registradas"]} == {
        tool["nombre"] for tool in TOOL_SPECS
    }
    assert {node["id_nodo"] for node in architecture["nodos_langgraph"]} == {
        node["id_nodo"] for node in AGENT_SPECS
    }


def test_stategraph_invoca_tools_y_verifica_cita_sha256():
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
