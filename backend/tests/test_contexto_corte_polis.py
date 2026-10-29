"""Contrato del corte entre el supervisor y los motores PDD/PDT."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid

import pytest

from app.modules.compromisos.agentes_inteligentes_pdd import (
    ConsultaAgentesPDD,
    _load_pdt_diagnostic,
    ejecutar_consulta_pdd,
)
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.pdt_ai_evaluator_graph import VERSION_METODOLOGICA_PDT
from app.modules.ia.grafo.orquestador import PolicyLifecycleGraph
from app.modules.ia.schemas import EntradaCicloPolitica


def _corte(tmp_path, *, run_id=None):
    run_id = run_id or uuid.uuid4()
    path = tmp_path / "corte.json"
    path.write_text(
        json.dumps(
            {
                "esquema": "polis.corte_datos.v1",
                "run_id": str(run_id),
                "inventario_sha256": "a" * 64,
                "evaluacion_sha256": "b" * 64,
                "consolidado_sha256": "c" * 64,
                "estado_calidad": "ambar",
                "estado_publicacion": "no_publicable",
                "artefactos_inventariados": 1,
                "versiones": [],
            }
        )
    )
    return ContextoCorte(run_id, path, hashlib.sha256(path.read_bytes()).hexdigest())


def test_contexto_corte_verifica_hash_identidad_y_estado(tmp_path):
    corte = _corte(tmp_path)
    referencia = corte.referencia()
    assert referencia["run_id"] == str(corte.run_id)
    assert referencia["estado_calidad"] == "ambar"
    assert referencia["estado_publicacion"] == "no_publicable"
    corte.manifiesto.write_text("{}")
    with pytest.raises(ValueError, match="Hash"):
        corte.verificar()


def test_pdt_bajo_corte_ignora_cache_global_y_hereda_run_id(tmp_path, monkeypatch):
    from app.modules.compromisos import agentes_inteligentes_pdd as pdd
    from app.modules.compromisos import pdt_ai_evaluator_graph as pdt

    corte = _corte(tmp_path)
    calls = []

    async def evaluator(_session, **kwargs):
        calls.append(kwargs)
        return {
            "version_metodologica": VERSION_METODOLOGICA_PDT,
            "thread_id": kwargs["thread_id"],
            "estado_checkpointer": "COMPLETADO_SIN_BLOQUEO",
        }

    monkeypatch.setattr(pdd, "_read_pdt_cache", lambda: pytest.fail("cache global reutilizada"))
    monkeypatch.setattr(pdt, "ejecutar_pdt_ai_evaluator", evaluator)
    result, source = asyncio.run(_load_pdt_diagnostic(object(), corte))
    assert result["version_metodologica"] == VERSION_METODOLOGICA_PDT
    assert source == "ejecucion_pdt_ai_evaluator_mismo_run_id"
    assert calls == [{"thread_id": f"pdt-{corte.run_id}", "force_refresh": True}]


def test_corte_alterado_no_se_degrada_a_resultado_pendiente(tmp_path):
    corte = _corte(tmp_path)
    corte.manifiesto.write_text("{}")
    with pytest.raises(ValueError, match="Hash"):
        asyncio.run(_load_pdt_diagnostic(object(), corte))


def test_pdt_bajo_corte_falla_cerrado_si_el_motor_falla_o_cambia_de_hilo(tmp_path, monkeypatch):
    from app.modules.compromisos import pdt_ai_evaluator_graph as pdt

    corte = _corte(tmp_path)

    async def falla(_session, **_kwargs):
        raise RuntimeError("Error SQL PDT")

    monkeypatch.setattr(pdt, "ejecutar_pdt_ai_evaluator", falla)
    with pytest.raises(RuntimeError, match="Error SQL PDT"):
        asyncio.run(_load_pdt_diagnostic(object(), corte))

    async def otro_hilo(_session, **_kwargs):
        return {"thread_id": "pdt-otro-corte"}

    monkeypatch.setattr(pdt, "ejecutar_pdt_ai_evaluator", otro_hilo)
    with pytest.raises(ValueError, match="ajena al corte"):
        asyncio.run(_load_pdt_diagnostic(object(), corte))

    async def interrumpido(_session, **kwargs):
        return {"thread_id": kwargs["thread_id"], "estado_checkpointer": "CONGELADO_PARA_AUDITORIA_HUMANA"}

    monkeypatch.setattr(pdt, "ejecutar_pdt_ai_evaluator", interrumpido)
    with pytest.raises(ValueError, match="no completó"):
        asyncio.run(_load_pdt_diagnostic(object(), corte))


def test_ciclo_politica_hereda_run_id_sin_afirmar_conciliacion(tmp_path):
    corte = _corte(tmp_path)
    graph = PolicyLifecycleGraph()
    entrada = EntradaCicloPolitica(
        titulo="Política de seguridad humana distrital",
        descripcion="Propuesta intersectorial para Cartagena de Indias",
        problema_central="Violencia y desigualdad en barrios de Cartagena",
    )
    respuesta = graph.ejecutar_ciclo(entrada, corte=corte)
    assert respuesta.run_id == corte.run_id
    assert respuesta.corte["sha256"] == corte.sha256
    assert respuesta.alcance_corte == "REFERENCIA_VERIFICADA_PROPUESTA_NO_CONCILIADA_CON_FUENTES"


def test_consulta_pdd_hereda_identidad_y_declara_sql_vivo(tmp_path, monkeypatch):
    from app.modules.compromisos import agentes_inteligentes_pdd as pdd

    corte = _corte(tmp_path)
    monkeypatch.setattr(pdd, "_build_agents", lambda _ctx: {})
    outputs = {
        "lector_semantico_documental": ("tool_buscar_evidencia_paginas_pdd", [{"sha256_contenido": "a" * 64}]),
        "reconstructor_causal_mga": ("tool_consultar_metas_oficiales", []),
        "taxonomo_neurosimbolico_sh": ("tool_consultar_nodos_mga", []),
        "auditor_financiero_ppi": ("tool_conciliar_ppi_plan", []),
        "articulador_operativo_bpim": ("tool_cruzar_actividades_pa_bpim", []),
    }

    async def fake_run(_agents, key, ctx):
        if key in outputs:
            tool, value = outputs[key]
            ctx.resultados[tool] = value
        return ""

    monkeypatch.setattr(pdd, "_run_agent", fake_run)
    respuesta = asyncio.run(
        ejecutar_consulta_pdd(object(), ConsultaAgentesPDD(pregunta="¿Qué dice el plan sobre salud?"), corte=corte)
    )
    assert respuesta["run_id"] == str(corte.run_id)
    assert respuesta["corte"]["sha256"] == corte.sha256
    assert respuesta["alcance_corte"] == "REFERENCIA_VERIFICADA_SQL_EN_VIVO_NO_CONCILIADO"
