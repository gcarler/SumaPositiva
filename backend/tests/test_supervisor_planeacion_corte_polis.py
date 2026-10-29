"""El supervisor enlaza un Agent de solo lectura con artefactos del mismo corte."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest
from langgraph.checkpoint.memory import MemorySaver
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos import articulacion_supervisor_corte_polis as analisis
from app.modules.compromisos import orquestador_grafo as grafo
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.correspondencias_meta_pa_polis import (
    FilaMatrizCorrespondencias,
    resumir_matriz_correspondencias,
)
from app.modules.compromisos.matriz_correspondencias_corte_polis import (
    InstantaneaCorrespondencias,
    escribir_instantanea,
)


def _json(ruta: Path, valor: dict) -> str:
    ruta.write_text(json.dumps(valor, sort_keys=True) + "\n")
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _preparar(tmp_path, monkeypatch):
    monkeypatch.setenv("POLIS_IA_MODELO", "test")
    monkeypatch.setattr(analisis, "DESTINO", tmp_path / "derivaciones")
    fila = FilaMatrizCorrespondencias(
        codigo_plan="PDD_SINTETICO",
        meta_id=uuid.uuid4(),
        codigo_meta="M1",
        nombre_meta="Meta sintética",
        tipo_meta="RESULTADO",
        indicador_meta=None,
        nodo_plan_nivel=None,
        nodo_plan_nombre=None,
        programa_pdd_id=None,
        programa_pdd_nombre=None,
        actividad_pa_id=uuid.uuid4(),
        codigo_actividad_pa="PA1",
        programa_pa_nombre=None,
        codigo_bpim="BP1",
        vigencia=2024,
        tipo_vinculo_heredado="INFERIDO",
        estado_correspondencia="CANDIDATO_BPIM_VIGENCIA",
        documento_evidencia=None,
        pagina_evidencia=None,
    )
    ruta, sha = escribir_instantanea(
        InstantaneaCorrespondencias(
            base_origen="polis_test_sintetica",
            metas_fuente_por_plan={"PDD_SINTETICO": 1},
            matriz=resumir_matriz_correspondencias([fila]),
        ),
        tmp_path / "instantanea",
    )
    inventario = tmp_path / "inventario.json"
    inventario_sha = _json(
        inventario,
        {
            "esquema": "polis.inventario_fuentes.v1",
            "archivos": [{"ruta": str(ruta), "sha256": sha}],
        },
    )
    run_id = uuid.uuid4()
    manifiesto = tmp_path / "corte.json"
    corte_sha = _json(
        manifiesto,
        {
            "run_id": str(run_id),
            "inventario_sha256": inventario_sha,
            "evaluacion_sha256": "a" * 64,
            "consolidado_sha256": "b" * 64,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "artefactos_inventariados": 1,
            "versiones": [],
        },
    )
    solicitud = analisis.SolicitudArticulacionCorte(inventario=str(inventario), instantanea=str(ruta))
    return (manifiesto, corte_sha, run_id), solicitud


def _handler(*_args):
    return 0, {
        "metas_conciliadas": 1,
        "total_filas_en_bd": 1,
        "distribucion_por_tipo_vinculo": {"SINTETICO": 1},
        "cruces_hermanos_3_motores_aplicados": 0,
        "planes_procesados": ["PDD_SINTETICO"],
    }


def _memoria(monkeypatch):
    saver = MemorySaver()
    pasos = []

    @asynccontextmanager
    async def abrir(*_args, **_kwargs):
        yield saver

    async def registrar(thread_id, nodo, etapa, estado, inicio, payload=None, corrida_id=None):
        pasos.append({"nodo": nodo, "etapa": etapa, "estado": estado, "payload": payload})
        return len(pasos)

    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", abrir)
    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    return pasos


def test_agent_local_idempotente_sin_sql_ni_modelo_externo(tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "no_debe_utilizarse")
    monkeypatch.setenv("POLIS_IA_MODELO", "proveedor-inexistente:modelo-inexistente")
    contexto = ContextoCorte(corte[2], corte[0], corte[1])
    primero = asyncio.run(analisis.analizar_articulacion_corte(solicitud, contexto))
    assert asyncio.run(analisis.analizar_articulacion_corte(solicitud, contexto)) == primero
    assert len(list(analisis.DESTINO.iterdir())) == 1
    assert primero["run_id"] == str(corte[2])
    assert primero["cobertura"]["pares_meta_pa_sin_truncar"] == 1
    assert primero["modelo"] == "polis-pdd-function-cognitive"
    assert primero["estado_publicacion"] == "no_publicable"
    assert "muestra" not in primero
    archivo = Path(primero["artefacto"])
    assert hashlib.sha256(archivo.read_bytes()).hexdigest() == primero["sha256"]
    assert len(json.loads(archivo.read_text())["muestra"]) == 1


def test_supervisor_ejecuta_analisis_despues_de_puertas_y_no_promueve(tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    pasos = _memoria(monkeypatch)
    with pytest.raises(ValueError, match="requiere un corte explícito"):
        grafo.correr_grafo(["conciliacion"], planeacion=solicitud)
    resultado = grafo.correr_grafo(
        ["conciliacion"], manejadores={"conciliacion": _handler}, corte=corte, planeacion=solicitud
    )
    assert resultado["estado_checkpointer"] == "COMPLETADO_CON_ANALISIS_NO_PUBLICABLE"
    assert [paso["nodo"] for paso in pasos] == ["nodo_corredor", "nodo_puerta", "nodo_articulacion_planeacion"]
    assert pasos[-1]["etapa"] is None
    assert pasos[-1]["estado"] == "exitoso"
    assert resultado["resultado_planeacion"]["run_id"] == resultado["run_id"] == str(corte[2])
    assert resultado["resultado_planeacion"]["estado_publicacion"] == "no_publicable"


def test_artefacto_alterado_tras_preflight_detiene_analisis_sin_fallback(tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    pasos = _memoria(monkeypatch)

    def alterar(*args):
        Path(solicitud.instantanea).write_text("{}")
        return _handler(*args)

    resultado = grafo.correr_grafo(
        ["conciliacion"], manejadores={"conciliacion": alterar}, corte=corte, planeacion=solicitud
    )
    assert resultado["estado_checkpointer"] == "DETENIDO_POR_ANALISIS_PLANEACION"
    assert resultado["resultado_planeacion"]["ok"] is False
    assert "alterado" in resultado["resultado_planeacion"]["error"]
    assert pasos[-1]["estado"] == "fallo"
    assert not analisis.DESTINO.exists()


def test_fallo_del_diario_no_devuelve_analisis_confirmado(tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    _memoria(monkeypatch)
    registrar = grafo.registrar_paso

    async def fallar(thread_id, nodo, *args, **kwargs):
        if nodo == "nodo_articulacion_planeacion":
            raise RuntimeError("Diario no disponible para confirmar análisis")
        return await registrar(thread_id, nodo, *args, **kwargs)

    monkeypatch.setattr(grafo, "registrar_paso", fallar)
    thread = f"prueba-planeacion-{uuid.uuid4().hex}"
    with pytest.raises(RuntimeError, match="Diario no disponible"):
        grafo.correr_grafo(
            ["conciliacion"],
            thread_id=thread,
            manejadores={"conciliacion": _handler},
            corte=corte,
            planeacion=solicitud,
        )
    assert thread not in grafo._MANEJADORES_POR_THREAD
    # La versión derivada no se publica aunque el archivo exista antes de fallar el diario.
    assert all(json.loads(p.read_text())["estado_publicacion"] == "no_publicable" for p in analisis.DESTINO.iterdir())


def test_hitl_reanuda_referencia_original_y_rechaza_cambio(tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    _memoria(monkeypatch)

    class PuertaHumana:
        async def run(self, *_args):
            return SimpleNamespace(
                output=grafo.DictamenPuerta(
                    aprobado=False,
                    severidad="alta",
                    observaciones="Consulta humana sintética sin regla roja",
                )
            )

    monkeypatch.setattr(grafo, "agente_puerta", lambda: PuertaHumana())
    thread = f"prueba-planeacion-{uuid.uuid4().hex}"
    primera = grafo.correr_grafo(
        ["conciliacion"], thread_id=thread, manejadores={"conciliacion": _handler}, corte=corte, planeacion=solicitud
    )
    assert primera["interrumpido"] is True
    assert not analisis.DESTINO.exists()
    decision = grafo.DecisionAuditor(aprobado=True, auditor="Persona sintética de prueba")
    cambiada = solicitud.model_copy(update={"codigo_plan": "OTRO_PLAN"})
    with pytest.raises(ValueError, match="no puede cambiar"):
        grafo.correr_grafo(["conciliacion"], thread_id=thread, aprobacion=decision, planeacion=cambiada)
    otro_manifiesto = tmp_path / "otro_corte.json"
    otro_id = uuid.uuid4()
    datos_otro = {**json.loads(corte[0].read_text()), "run_id": str(otro_id)}
    otro_sha = _json(otro_manifiesto, datos_otro)
    with pytest.raises(ValueError, match="no puede cambiar el corte"):
        grafo.correr_grafo(
            ["conciliacion"], thread_id=thread, aprobacion=decision, corte=(otro_manifiesto, otro_sha, otro_id)
        )
    final = grafo.correr_grafo(["conciliacion"], thread_id=thread, aprobacion=decision)
    assert final["estado_checkpointer"] == "COMPLETADO_CON_ANALISIS_NO_PUBLICABLE"
    assert final["solicitud_planeacion"] == solicitud.normalizada()
    assert final["resultado_planeacion"]["cobertura"]["metas_distintas"] == 1


def test_rechazo_humano_no_ejecuta_nodo_analitico(tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    pasos = _memoria(monkeypatch)

    def resumen_inconsistente(*args):
        codigo, resumen = _handler(*args)
        return codigo, {**resumen, "total_filas_en_bd": 2}

    thread = f"prueba-planeacion-{uuid.uuid4().hex}"
    primera = grafo.correr_grafo(
        ["conciliacion"],
        thread_id=thread,
        manejadores={"conciliacion": resumen_inconsistente},
        corte=corte,
        planeacion=solicitud,
    )
    assert primera["interrumpido"] is True
    final = grafo.correr_grafo(
        ["conciliacion"],
        thread_id=thread,
        aprobacion=grafo.DecisionAuditor(aprobado=False, auditor="Persona sintética"),
    )
    assert final["estado_checkpointer"] == "DETENIDO_POR_PUERTA"
    assert final["resultado_planeacion"] is None
    assert not any(p["nodo"] == "nodo_articulacion_planeacion" for p in pasos)


@pytest.mark.integration
def test_nodo_registra_referencia_desde_otra_conexion(database_url, tmp_path, monkeypatch):
    corte, solicitud = _preparar(tmp_path, monkeypatch)
    thread = f"prueba-planeacion-{uuid.uuid4().hex}"
    try:
        resultado = grafo.correr_grafo(
            ["conciliacion"],
            thread_id=thread,
            manejadores={"conciliacion": _handler},
            corte=corte,
            planeacion=solicitud,
        )
        assert resultado["estado_checkpointer"] == "COMPLETADO_CON_ANALISIS_NO_PUBLICABLE"

        async def comprobar():
            engine = create_async_engine(database_url)
            try:
                async with engine.connect() as conn:
                    fila = (
                        (
                            await conn.execute(
                                text(
                                    "SELECT estado, payload FROM seguimiento.corridas_pipeline_pasos "
                                    "WHERE thread_id=:thread AND nodo='nodo_articulacion_planeacion'"
                                ),
                                {"thread": thread},
                            )
                        )
                        .mappings()
                        .one()
                    )
                    assert fila["estado"] == "exitoso"
                    assert fila["payload"]["sha256"] == resultado["resultado_planeacion"]["sha256"]
                    assert "muestra" not in fila["payload"]
                    assert fila["payload"]["run_id"] == str(corte[2])
            finally:
                await engine.dispose()

        asyncio.run(comprobar())
    finally:

        async def limpiar():
            engine = create_async_engine(database_url)
            try:
                async with engine.begin() as conn:
                    await conn.execute(
                        text("DELETE FROM seguimiento.corridas_pipeline_pasos WHERE thread_id=:thread"),
                        {"thread": thread},
                    )
                    for tabla in ("checkpoint_writes", "checkpoint_blobs", "checkpoints"):
                        await conn.execute(text(f"DELETE FROM {tabla} WHERE thread_id=:thread"), {"thread": thread})
            finally:
                await engine.dispose()

        asyncio.run(limpiar())
