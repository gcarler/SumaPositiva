"""Reintentos y consistencia temporal de la captación de Datos Abiertos."""

import importlib.util
import io
import threading
import time
import urllib.error
import urllib.parse
from pathlib import Path

import pytest


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "data/banco_fuentes_oficiales/sincronizar.py"
    spec = importlib.util.spec_from_file_location("sincronizar_fuentes_publicas_test", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_reintenta_fallo_transitorio_con_limite(monkeypatch):
    modulo = _modulo()
    intentos = []
    esperas = []

    def abrir(*args, **kwargs):
        intentos.append(1)
        if len(intentos) < 3:
            raise urllib.error.URLError("temporal")
        return io.BytesIO(b'{"filas": 3}')

    monkeypatch.setattr(modulo.urllib.request, "urlopen", abrir)
    monkeypatch.setattr(modulo.time, "sleep", esperas.append)
    assert modulo.descargar("https://example.org/archivo.json") == {"filas": 3}
    assert len(intentos) == 3 and esperas == [1, 2]


def test_no_reintenta_http_404(monkeypatch):
    modulo = _modulo()
    intentos = []

    def abrir(*args, **kwargs):
        intentos.append(1)
        raise urllib.error.HTTPError("https://example.org", 404, "ausente", {}, None)

    monkeypatch.setattr(modulo.urllib.request, "urlopen", abrir)
    with pytest.raises(urllib.error.HTTPError):
        modulo.descargar("https://example.org/ausente")
    assert len(intentos) == 1


def test_cambio_de_revision_abortara_el_lote():
    modulo = _modulo()
    assert modulo.verificar_corte({"rowsUpdatedAt": 123}, {"rowsUpdatedAt": 123}, "dataset")
    assert modulo.verificar_corte({}, {}, "dataset") is False
    with pytest.raises(RuntimeError, match="corte cambió"):
        modulo.verificar_corte({"rowsUpdatedAt": 123}, {"rowsUpdatedAt": 124}, "dataset")


def test_estaciones_ideam_separan_cambios_de_ubicacion_por_anio():
    modulo = _modulo()
    filas = [
        {
            "a_o": "2017",
            "id_estacion": "31441",
            "estaci_n": "ZONA FRANCA LA CANDELARIA",
            "latitud": "10.32646",
            "longitud": "-75.489407",
        },
        {
            "a_o": "2024",
            "id_estacion": "31441",
            "estaci_n": "Cartagena - ZF La Candelaria",
            "latitud": "10.326556",
            "longitud": "-75.489222",
        },
    ]
    registro = modulo.estaciones_ideam(filas, 123)
    assert len(registro["estaciones"]) == 2
    assert registro["rowsUpdatedAt"] == 123
    with pytest.raises(ValueError, match="contradictorios"):
        modulo.estaciones_ideam([filas[0], {**filas[0], "latitud": "10.333"}], 123)


def test_paginacion_comprueba_recuento_y_orden(monkeypatch):
    modulo = _modulo()
    consultas = []

    def descargar(url):
        parametros = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        consultas.append(parametros)
        if parametros["$select"] == ["count(*) AS cantidad"]:
            return [{"cantidad": "3"}]
        assert parametros["$order"] == [":id"]
        assert parametros["$limit"] == ["3"]
        return [{"a_o": "2022"}, {"a_o": "2023"}, {"a_o": "2024"}]

    monkeypatch.setattr(modulo, "descargar", descargar)
    assert len(modulo.consultar("dataset", "codigo='13001'", ["a_o"])) == 3
    assert len(consultas) == 3


def test_paginacion_rechaza_pagina_corta_y_cambio_de_recuento(monkeypatch):
    modulo = _modulo()
    recuentos = iter([{"cantidad": "3"}, {"cantidad": "4"}])

    def pagina_corta(url):
        if "count%28%2A%29" in url:
            return [{"cantidad": "3"}]
        return [{"a_o": "2024"}]

    monkeypatch.setattr(modulo, "descargar", pagina_corta)
    with pytest.raises(RuntimeError, match="página incompleta"):
        modulo.consultar("dataset", "codigo='13001'", ["a_o"])

    def recuento_cambiante(url):
        if "count%28%2A%29" in url:
            return [next(recuentos)]
        return [{"a_o": "2022"}, {"a_o": "2023"}, {"a_o": "2024"}]

    monkeypatch.setattr(modulo, "descargar", recuento_cambiante)
    with pytest.raises(RuntimeError, match="recuento filtrado cambió"):
        modulo.consultar("dataset", "codigo='13001'", ["a_o"])


def test_capturas_independientes_respetan_limite_y_se_unen_por_clave(monkeypatch):
    modulo = _modulo()
    bloqueo = threading.Lock()
    activos = 0
    maximo = 0

    def capturar(fuente):
        nonlocal activos, maximo
        with bloqueo:
            activos += 1
            maximo = max(maximo, activos)
        time.sleep(0.02)
        with bloqueo:
            activos -= 1
        return {"fuente": fuente}

    monkeypatch.setattr(modulo, "capturar_fuente", capturar)
    fuentes = [(f"fuente_{i}",) for i in range(8)]
    resultado = modulo.capturar_fuentes(fuentes, max_workers=3)
    assert set(resultado) == {fuente[0] for fuente in fuentes}
    assert all(resultado[fuente[0]]["fuente"] == fuente for fuente in fuentes)
    assert 1 < maximo <= 3


def test_fallo_de_una_captura_no_impide_terminar_las_otras_y_aborta_join(monkeypatch):
    modulo = _modulo()
    visitadas = set()
    bloqueo = threading.Lock()

    def capturar(fuente):
        with bloqueo:
            visitadas.add(fuente[0])
        if fuente[0] == "invalida":
            raise ValueError("corte inconsistente")
        return {"fuente": fuente}

    monkeypatch.setattr(modulo, "capturar_fuente", capturar)
    with pytest.raises(RuntimeError, match="invalida.*corte inconsistente"):
        modulo.capturar_fuentes([("primera",), ("invalida",), ("tercera",)], max_workers=2)
    assert visitadas == {"primera", "invalida", "tercera"}
    with pytest.raises(ValueError, match="positivo"):
        modulo.capturar_fuentes([], max_workers=0)
