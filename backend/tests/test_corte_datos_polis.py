"""El corte fija versiones, calidad y procedencia antes de ejecutar un grafo."""

import json
import uuid
from contextlib import asynccontextmanager

import pytest
from langgraph.checkpoint.memory import MemorySaver

from app.modules.compromisos import orquestador_grafo as grafo
from app.modules.compromisos.corte_datos_polis import construir_manifiesto_corte, verificar_manifiesto_corte


def _insumos(tmp_path):
    inventario = tmp_path / "inventario.json"
    evaluacion = tmp_path / "evaluacion.json"
    inventario.write_text(
        json.dumps(
            {
                "esquema": "polis.inventario_fuentes.v1",
                "corte_consolidado_sha256": "c" * 64,
                "fuentes_clave": 2,
                "artefactos": 3,
                "fuentes": [
                    {"fuente_clave": "policia", "version_id": "a1", "sha256_contenido": "a" * 64},
                    {"fuente_clave": "medicina", "version_id": "b1", "sha256_contenido": "b" * 64},
                ],
            }
        )
    )
    evaluacion.write_text(
        json.dumps(
            {
                "esquema": "polis.evaluacion_estructural.v1",
                "consolidado_sha256": "c" * 64,
                "evaluacion": {"estado": "ambar"},
                "estado_publicacion": "no_publicable",
            }
        )
    )
    return inventario, evaluacion


def test_corte_congelado_es_idempotente_y_detecta_alteracion(tmp_path):
    inventario, evaluacion = _insumos(tmp_path)
    run_id = uuid.uuid4()
    destino = tmp_path / "cortes"
    ruta, sha = construir_manifiesto_corte(inventario, evaluacion, destino, run_id)
    assert construir_manifiesto_corte(inventario, evaluacion, destino, run_id) == (ruta, sha)
    corte = verificar_manifiesto_corte(ruta, sha, run_id)
    assert [fuente.fuente_clave for fuente in corte.versiones] == ["medicina", "policia"]
    assert corte.estado_publicacion == "no_publicable"
    evaluacion.write_text(evaluacion.read_text().replace('"ambar"', '"verde"'))
    with pytest.raises(ValueError, match="manifiesto de corte distinto"):
        construir_manifiesto_corte(inventario, evaluacion, destino, run_id)
    ruta.write_text("alterado")
    with pytest.raises(ValueError, match="Hash"):
        verificar_manifiesto_corte(ruta, sha, run_id)


def test_corte_rechaza_capturas_incompatibles_y_claves_duplicadas(tmp_path):
    inventario, evaluacion = _insumos(tmp_path)
    datos = json.loads(evaluacion.read_text())
    datos["consolidado_sha256"] = "d" * 64
    evaluacion.write_text(json.dumps(datos))
    with pytest.raises(ValueError, match="cortes distintos"):
        construir_manifiesto_corte(inventario, evaluacion, tmp_path / "cortes", uuid.uuid4())

    datos["consolidado_sha256"] = "c" * 64
    evaluacion.write_text(json.dumps(datos))
    catalogo = json.loads(inventario.read_text())
    catalogo["fuentes"][1]["fuente_clave"] = "policia"
    inventario.write_text(json.dumps(catalogo))
    with pytest.raises(ValueError, match="duplicadas"):
        construir_manifiesto_corte(inventario, evaluacion, tmp_path / "cortes", uuid.uuid4())


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("consolidado_sha256", "d" * 64),
        ("estado_calidad", "verde"),
        ("estado_publicacion", "publicable"),
    ],
)
def test_corte_no_escribe_si_resumen_de_fuentes_discrepa(tmp_path, campo, valor):
    inventario, evaluacion = _insumos(tmp_path)
    run_id = uuid.uuid4()
    resumen = {
        "consolidado_sha256": "c" * 64,
        "estado_calidad": "ambar",
        "estado_publicacion": "no_publicable",
    }
    resumen[campo] = valor
    destino = tmp_path / "cortes"
    with pytest.raises(ValueError, match="no corresponde"):
        construir_manifiesto_corte(inventario, evaluacion, destino, run_id, resumen)
    assert not (destino / f"{run_id}.json").exists()


def test_grafo_conserva_referencia_pequena_del_corte(monkeypatch, tmp_path):
    inventario, evaluacion = _insumos(tmp_path)
    run_id = uuid.uuid4()
    corte = (*construir_manifiesto_corte(inventario, evaluacion, tmp_path / "cortes", run_id), run_id)

    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    async def registrar(*args, **kwargs):
        return 1

    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    salida = grafo.correr_grafo(
        ["fuentes"],
        corte=corte,
        manejadores={
            "fuentes": lambda *args: (
                0,
                {
                    "ok": True,
                    "estado_calidad": "ambar",
                    "estado_publicacion": "no_publicable",
                    "consolidado_sha256": "c" * 64,
                },
            )
        },
    )
    assert salida["interrumpido"] is True
    assert salida["run_id"] == str(run_id)
    assert salida["corte_manifest_path"] == str(corte[0])
    assert salida["corte_manifest_sha256"] == corte[1]


def test_grafo_real_congela_corte_despues_de_fuentes(monkeypatch, tmp_path):
    inventario, evaluacion = _insumos(tmp_path)
    banco = tmp_path / "data/banco_fuentes_oficiales"
    banco.mkdir(parents=True)
    (banco / "inventario_pipeline_2026.json").write_bytes(inventario.read_bytes())
    (banco / "evaluacion_estructural_2026.json").write_bytes(evaluacion.read_bytes())

    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    async def registrar(*args, **kwargs):
        return 1

    def corredor_real_simulado(*args):
        return (
            0,
            {
                "ok": True,
                "estado_calidad": "ambar",
                "estado_publicacion": "no_publicable",
                "consolidado_sha256": "c" * 64,
            },
            None,
        )

    monkeypatch.setattr(grafo, "RAIZ", tmp_path)
    monkeypatch.setattr(grafo, "correr_etapa_determinista", corredor_real_simulado)
    monkeypatch.setattr(grafo, "MANEJADORES_DEFECTO", {"default": corredor_real_simulado})
    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    salida = grafo.correr_grafo(["fuentes"])
    assert salida["interrumpido"] is True
    assert salida["corte_manifest_path"]
    assert salida["corte_manifest_sha256"]
    assert (
        verificar_manifiesto_corte(
            tmp_path / "data/capas_analiticas/cortes" / f"{salida['run_id']}.json",
            salida["corte_manifest_sha256"],
            uuid.UUID(salida["run_id"]),
        ).estado_publicacion
        == "no_publicable"
    )
    grafo._MANEJADORES_POR_THREAD.pop(salida["thread_id"], None)
