"""Guardias del corredor y del supervisor sin conexión a la base operativa."""

import asyncio
import hashlib
import importlib.util
import json
import subprocess
import time
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest
from langgraph.checkpoint.memory import MemorySaver

from app.modules.compromisos import orquestador_grafo as grafo
from app.modules.compromisos import pdt_conciliador_vinculos_pa_triada as conciliador
from app.modules.compromisos import pdt_dea_4niveles_cartagena as dea
from app.modules.compromisos import pdt_diagnostico_seguridad_humana_8planes as diagnostico
from app.modules.compromisos import pdt_normalizador_canonico_metas as normalizador
from app.modules.compromisos import pdt_sispt_dnp_evaluador as sispt
from app.modules.compromisos.resolutor_bd import resolver_url_bd_csh


def _runner():
    ruta = Path(__file__).resolve().parents[2] / "scripts" / "pipeline_datos_polis.py"
    spec = importlib.util.spec_from_file_location("pipeline_datos_polis_p0", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_corredor_entrega_resumen_real(monkeypatch):
    resumen = {
        "metas_conciliadas": 12,
        "total_filas_en_bd": 12,
        "distribucion_por_tipo_vinculo": {"EXACTO": 12},
        "cruces_hermanos_3_motores_aplicados": 1,
        "planes_procesados": ["PDD_2024_2027"],
    }
    payload = {"conciliacion": {"estado": "exitoso", "exit_code": 0, "resumen": resumen}}
    salida = "línea de log\nPOLIS_PIPELINE_RESULT_JSON=" + json.dumps(payload) + "\n"
    monkeypatch.setattr(
        subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout=salida, stderr="")
    )
    assert grafo.correr_etapa_determinista("conciliacion", "hilo") == (0, resumen, None)


@pytest.mark.parametrize("salida", ["solo log\n", "POLIS_PIPELINE_RESULT_JSON={mal json}\n"])
def test_corredor_rechaza_resultado_ausente_o_invalido(monkeypatch, salida):
    monkeypatch.setattr(
        subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout=salida, stderr="")
    )
    codigo, resumen, _ = grafo.correr_etapa_determinista("fuentes", "hilo")
    assert codigo != 0 and resumen["ok"] is False


def test_corredor_no_acepta_estado_fallido_con_exit_cero(monkeypatch):
    payload = {"fuentes": {"estado": "fallo", "exit_code": None, "resumen": {"ok": True}}}
    salida = "POLIS_PIPELINE_RESULT_JSON=" + json.dumps(payload) + "\n"
    monkeypatch.setattr(
        subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout=salida, stderr="")
    )
    codigo, resumen, _ = grafo.correr_etapa_determinista("fuentes", "hilo")
    assert codigo != 0 and resumen["ok"] is False


def test_fuentes_ambar_no_superan_puerta_aunque_agente_apruebe(monkeypatch):
    async def registrar(*args, **kwargs):
        return 1

    class AgentePermisivo:
        async def run(self, *args, **kwargs):
            return SimpleNamespace(
                output=grafo.DictamenPuerta(aprobado=True, severidad="baja", observaciones="aprobado")
            )

    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    monkeypatch.setattr(grafo, "agente_puerta", lambda: AgentePermisivo())
    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    salida = grafo.correr_grafo(
        ["fuentes"],
        manejadores={
            "fuentes": lambda *args: (
                0,
                {"ok": True, "estado_calidad": "ambar", "estado_publicacion": "no_publicable"},
            )
        },
    )
    assert salida["interrumpido"] is True
    assert salida["pareceres"]["fuentes"]["aprobado"] is False
    assert any(h["regla"] == "fuentes_no_publicables" for h in salida["pareceres"]["fuentes"]["hallazgos"])


def test_rechazo_humano_detiene_etapas_pendientes(monkeypatch):
    llamadas: list[str] = []
    memoria_compartida = MemorySaver()

    async def registrar(*args, **kwargs):
        return 1

    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield memoria_compartida

    def fuentes(etapa, hilo):
        llamadas.append(etapa)
        return 0, {
            "ok": True,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "consolidado_sha256": "a" * 64,
        }

    def conciliacion(etapa, hilo):
        llamadas.append(etapa)
        raise AssertionError("No debe ejecutarse después del rechazo")

    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    thread_id = "prueba-puerta-detiene"
    congelado = grafo.correr_grafo(
        ["fuentes", "conciliacion"],
        thread_id=thread_id,
        manejadores={"fuentes": fuentes, "conciliacion": conciliacion},
    )
    assert congelado["interrumpido"] is True
    reanudado = grafo.correr_grafo(
        ["fuentes", "conciliacion"],
        thread_id=thread_id,
        aprobacion=grafo.DecisionAuditor(aprobado=False, auditor="Revisor de prueba"),
    )
    assert reanudado["interrumpido"] is False
    assert reanudado["estado_checkpointer"] == "DETENIDO_POR_PUERTA"
    assert llamadas == ["fuentes"]


def test_corredor_fuentes_incluye_estado_de_calidad(monkeypatch, tmp_path):
    runner = _runner()
    ruta = tmp_path / "data/banco_fuentes_oficiales/evaluacion_estructural_2026.json"
    ruta.parent.mkdir(parents=True)
    ruta.write_text(
        json.dumps(
            {
                "esquema": "polis.evaluacion_estructural.v1",
                "consolidado_sha256": "a" * 64,
                "evaluacion": {"estado": "ambar", "problemas": {"unidad_sin_contrato": 14}},
                "estado_publicacion": "no_publicable",
            }
        )
    )
    monkeypatch.setattr(runner, "RAIZ", tmp_path)
    monkeypatch.setattr(runner.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0))
    monkeypatch.setattr(runner, "_leer_recibo_derivacion", lambda sha: {"series_7d_sha256": "b" * 64})
    codigo, resumen = runner._correr_fuentes(tmp_path / "fuentes.log")
    assert codigo == 0
    assert resumen["estado_calidad"] == "ambar"
    assert resumen["estado_publicacion"] == "no_publicable"
    assert resumen["consolidado_sha256"] == "a" * 64
    assert resumen["series_7d_sha256"] == "b" * 64

    ruta.unlink()
    codigo, resumen = runner._correr_fuentes(tmp_path / "fuentes.log")
    assert codigo != 0 and resumen["ok"] is False


def test_corredor_fuentes_falla_si_derivacion_analitica_falla(monkeypatch, tmp_path):
    runner = _runner()
    monkeypatch.setattr(runner.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0))

    def fallar_derivacion(sha):
        raise ValueError("serie 7D incompleta")

    ruta = tmp_path / "data/banco_fuentes_oficiales/evaluacion_estructural_2026.json"
    ruta.parent.mkdir(parents=True)
    ruta.write_text(
        json.dumps(
            {
                "esquema": "polis.evaluacion_estructural.v1",
                "consolidado_sha256": "a" * 64,
                "evaluacion": {"estado": "ambar", "problemas": {}},
                "estado_publicacion": "no_publicable",
            }
        )
    )
    monkeypatch.setattr(runner, "RAIZ", tmp_path)
    monkeypatch.setattr(runner, "_leer_recibo_derivacion", fallar_derivacion)
    codigo, resumen = runner._correr_fuentes(tmp_path / "fuentes.log")
    assert codigo != 0
    assert resumen["ok"] is False
    assert "serie 7D incompleta" in resumen["error"]


def test_recibo_de_derivacion_liga_consolidado_e_inventario(monkeypatch, tmp_path):
    runner = _runner()
    monkeypatch.setattr(runner, "RAIZ", tmp_path)
    inventario = tmp_path / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
    inventario.parent.mkdir(parents=True)
    inventario.write_text("inventario original")
    inventario_sha = hashlib.sha256(inventario.read_bytes()).hexdigest()
    consolidado_sha = "a" * 64
    recibo = {
        "esquema": "polis.derivacion_fuentes.v2",
        "consolidado_sha256": consolidado_sha,
        "inventario_sha256": inventario_sha,
    }
    for nombre in ("canonico", "contraste", "series_7d", "paneles_series", "tablero_operacion"):
        ruta = tmp_path / f"{nombre}.json"
        ruta.write_text(nombre)
        recibo[f"{nombre}_ruta"] = ruta.name
        recibo[f"{nombre}_sha256"] = hashlib.sha256(ruta.read_bytes()).hexdigest()
    ruta_recibo = tmp_path / "data/capas_analiticas/derivaciones" / f"{consolidado_sha}-{inventario_sha}-v2.json"
    ruta_recibo.parent.mkdir(parents=True)
    ruta_recibo.write_text(json.dumps(recibo))
    assert runner._leer_recibo_derivacion(consolidado_sha) == recibo
    inventario.write_text("inventario revisado")
    with pytest.raises(FileNotFoundError):
        runner._leer_recibo_derivacion(consolidado_sha)


@pytest.mark.parametrize("plan", [[], ["desconocida"], ["fuentes", "fuentes"]])
def test_grafo_rechaza_planes_invalidos(plan):
    with pytest.raises(ValueError):
        grafo.correr_grafo(plan=plan)


def test_motor_real_no_arranca_sin_corte_congelado(monkeypatch):
    llamadas = []

    def motor(*args):
        llamadas.append(True)
        return 0, {}

    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    async def registrar(*args, **kwargs):
        return 1

    monkeypatch.setattr(grafo, "correr_etapa_determinista", motor)
    monkeypatch.setattr(grafo, "MANEJADORES_DEFECTO", {"default": motor})
    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    salida = grafo.correr_grafo(["dea"])
    assert not llamadas
    assert salida["interrumpido"] is True
    assert salida["resultados"]["dea"]["exit_code"] != 0
    grafo._MANEJADORES_POR_THREAD.pop(salida["thread_id"], None)


def test_runner_no_ejecuta_sin_bitacora(monkeypatch):
    runner = _runner()
    llamadas = []

    async def sin_corrida(*args, **kwargs):
        return None

    monkeypatch.setattr(runner, "_abrir_corrida", sin_corrida)
    resultado = runner._ejecutar_con_reintentos("fuentes", lambda: llamadas.append(True), 1, None)
    assert resultado[0] == "fallo" and not llamadas


@pytest.mark.parametrize(
    ("tipo_error", "tipo_resultado"),
    [("CorridaActivaError", "conflicto_corrida_activa"), ("BitacoraNoDisponibleError", "bitacora_no_disponible")],
)
def test_runner_distingue_conflicto_de_infraestructura(monkeypatch, tipo_error, tipo_resultado):
    runner = _runner()
    llamadas = []

    async def abrir(*args, **kwargs):
        raise getattr(runner, tipo_error)("falló registro")

    monkeypatch.setattr(runner, "_abrir_corrida", abrir)
    estado, _, resumen, _ = runner._ejecutar_con_reintentos("fuentes", lambda: llamadas.append(True), 1, None)
    assert estado == "fallo" and resumen["tipo"] == tipo_resultado and not llamadas


def test_runner_no_acepta_plan_omitido(monkeypatch):
    runner = _runner()
    llamadas = []
    monkeypatch.setattr(runner, "_correr_fuentes", lambda *args: llamadas.append(True))
    assert runner._plan(True, "fuentes", 1, via_grafo=True, omitir=["fuentes"]) == 2
    assert not llamadas


def test_motores_respetan_base_de_pruebas(monkeypatch):
    url = "postgresql+asyncpg://polis@localhost/polis_test_aislado"
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", url)
    assert conciliador._resolver_url_bd_csh() == url
    assert dea._resolver_url_bd_csh() == url
    assert normalizador._resolver_url_bd_csh() == url
    assert sispt._resolver_url_bd_csh() == url
    assert diagnostico._resolver_url_bd_csh() == url
    assert resolver_url_bd_csh() == url
    assert _runner()._url_bd() == url


def test_guardia_rechaza_base_de_pruebas_fuera_del_prefijo_polis_test(monkeypatch):
    url_ajena = "postgresql+asyncpg://polis@localhost/bd_csh"
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", url_ajena)
    with pytest.raises(RuntimeError, match="polis_test"):
        resolver_url_bd_csh()
    with pytest.raises(RuntimeError, match="polis_test"):
        normalizador._resolver_url_bd_csh()


def test_guardia_jamas_redirige_polis_test_a_bd_csh(monkeypatch):
    """Sin POLIS_TEST_DATABASE_URL, resolver una base polis_test* debe FALLAR,
    no redirigir silenciosamente a bd_csh (hallazgo HALL-03, LE-APORTE-8ff57e)."""
    url_prueba = "postgresql+asyncpg://polis:secreto@localhost:5432/polis_test_guardia"
    monkeypatch.setenv("POLIS_DATABASE_URL", url_prueba)
    monkeypatch.delenv("POLIS_TEST_DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="POLIS_TEST_DATABASE_URL"):
        resolver_url_bd_csh()
    with pytest.raises(RuntimeError, match="POLIS_TEST_DATABASE_URL"):
        dea._resolver_url_bd_csh()
    with pytest.raises(RuntimeError, match="POLIS_TEST_DATABASE_URL"):
        conciliador._resolver_url_bd_csh()
    # Confirmación del motivo: la env de configuración apuntaba a polis_test*.
    url_produccion = "postgresql+asyncpg://polis:secreto@localhost:5432/bd_csh"
    monkeypatch.setenv("POLIS_DATABASE_URL", url_produccion)
    assert resolver_url_bd_csh() == url_produccion


def test_puerta_impide_aprobacion_falsa_de_etapa_fallida(monkeypatch):
    async def registrar(*args, **kwargs):
        return 1

    async def ligar(*args, **kwargs):
        return 0

    class AgentePermisivo:
        async def run(self, *args, **kwargs):
            return SimpleNamespace(
                output=grafo.DictamenPuerta(aprobado=True, severidad="baja", observaciones="aprobado por agente")
            )

    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    monkeypatch.setattr(grafo, "_coro_ligar_thread_a_corrida", ligar)
    monkeypatch.setattr(grafo, "agente_puerta", lambda: AgentePermisivo())

    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    salida = grafo.correr_grafo(
        ["fuentes"], manejadores={"fuentes": lambda *args: (1, {"ok": True, "log": "archivo.log"})}
    )
    assert salida["interrumpido"] is True
    dictamen = salida["pareceres"]["fuentes"]
    assert dictamen["aprobado"] is False and dictamen["severidad"] == "alta"
    assert any(h["regla"] == "fallo_etapa" for h in dictamen["hallazgos"])


def test_timeout_cancela_trabajo_y_cierra_resultado(monkeypatch, tmp_path):
    runner = _runner()
    destino = tmp_path / "efecto_tardio.txt"
    monkeypatch.setattr(runner, "TIMEOUT_CORRIDA_S", 0.05)

    def trabajo():
        time.sleep(0.2)
        destino.write_text("ejecutado")
        return 0, {"ok": True}

    estado, codigo, resumen, _ = runner._ejecutar_bajo_timeout(trabajo)
    assert estado == "timeout" and codigo is None and resumen["error"] == "timeout"
    time.sleep(0.25)
    assert not destino.exists()


def test_diario_fallido_detiene_grafo(monkeypatch):
    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    async def fallar(*args, **kwargs):
        raise RuntimeError("bitácora caída")

    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    monkeypatch.setattr(grafo, "registrar_paso", fallar)
    with pytest.raises(RuntimeError, match="bitácora caída"):
        grafo.correr_grafo(
            ["fuentes"],
            thread_id="fallo-diario",
            manejadores={"fuentes": lambda *args: (0, {"ok": True})},
        )
    assert "fallo-diario" not in grafo._MANEJADORES_POR_THREAD


def test_enlace_fallido_se_convierte_en_hallazgo_rojo(monkeypatch):
    @asynccontextmanager
    async def memoria(*args, **kwargs):
        yield MemorySaver()

    async def registrar(*args, **kwargs):
        return 1

    async def enlace(*args, **kwargs):
        return 0

    monkeypatch.setattr(grafo.AsyncPostgresSaver, "from_conn_string", memoria)
    monkeypatch.setattr(grafo, "registrar_paso", registrar)
    monkeypatch.setattr(grafo, "_coro_ligar_thread_a_corrida", enlace)
    salida = grafo.correr_grafo(
        ["fuentes"], manejadores={"fuentes": lambda *args: (0, {"ok": True, "log": "prueba.log"}, 42)}
    )
    assert salida["interrumpido"] is True
    assert salida["pareceres"]["fuentes"]["aprobado"] is False
    assert salida["resultados"]["fuentes"]["exit_code"] == -1


@pytest.mark.integration
def test_dos_solicitudes_concurrentes_abren_una_sola_corrida(prepared_test_database, monkeypatch):
    if prepared_test_database is None:
        pytest.skip("Se requiere polis_test")
    runner = _runner()
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", prepared_test_database)

    async def dos_intentos():
        resultados = await asyncio.gather(
            runner._abrir_corrida("personalizada", 1, "prueba", None),
            runner._abrir_corrida("personalizada", 1, "prueba", None),
            return_exceptions=True,
        )
        return resultados

    resultados = asyncio.run(dos_intentos())
    exitosos = [resultado for resultado in resultados if isinstance(resultado, int)]
    conflictos = [resultado for resultado in resultados if isinstance(resultado, runner.CorridaActivaError)]
    assert len(exitosos) == 1 and len(conflictos) == 1
    assert asyncio.run(runner._cerrar_corrida(exitosos[0], "exitoso", 1, {"ok": True}, 0))
