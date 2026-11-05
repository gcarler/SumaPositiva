"""Regresiones de contratos y lectura del catálogo, sin PostgreSQL ni archivos activos."""

from __future__ import annotations

import csv
import hashlib
import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.indicadores import catalogo_polis


@pytest.fixture
def validador():
    script = Path(__file__).resolve().parents[2] / "scripts/validar_catalogo_indicadores.py"
    spec = importlib.util.spec_from_file_location("validar_catalogo_integridad", script)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def _fila(**cambios):
    return {
        "fuente": "fuente_prueba",
        "numerador": "fuente_prueba.indicador",
        "anio_base": "2024",
        "unidad": "porcentaje",
        **cambios,
    }


@pytest.mark.parametrize("anio", ["2023", "2024.0", "2024-01", "NO_DEFINIDO"])
def test_anio_base_exige_observacion_de_la_serie_seleccionada(validador, anio):
    datos = {("fuente_prueba", "indicador"): [(2024, "total", "%")]}
    assert any("anio_base" in e for e in validador._validar_serie(_fila(anio_base=anio), datos))


def test_anio_base_real_y_unidad_equivalente_son_validos(validador):
    datos = {("fuente_prueba", "indicador"): [(2024, "total", "%")]}
    assert validador._validar_serie(_fila(), datos) == []


def test_no_confunde_habitantes_en_riesgo_con_poblacion_general(validador):
    datos = {("fuente_prueba", "indicador"): [(2024, "total", "Casos por cada 100.000 habitantes en riesgo")]}
    assert any("unidad" in e for e in validador._validar_serie(_fila(unidad="casos por 100000 habitantes"), datos))
    assert validador._validar_serie(_fila(unidad="casos por 100000 habitantes en riesgo"), datos) == []


@pytest.mark.parametrize(
    "selector,espera_error",
    [
        ("PM2.5 | 24 h | estación *", False),
        ("PM10 | 24 h | estación *", True),
        ("PM2.5 | 1 h | estación *", True),
        ("PM2.5 | 24 h | <id_estacion>", True),
        ("*", True),
    ],
)
def test_selector_estacion_conserva_contaminante_y_exposicion(validador, selector, espera_error):
    datos = {
        ("fuente_prueba", "indicador"): [
            (2024, "PM2.5 | 24 h | estación 1 (Uno)", "ugm3"),
            (2024, "PM10 | 24 h | estación 1 (Uno)", "ugm3"),
            (2024, "PM2.5 | 1 h | estación 1 (Uno)", "ugm3"),
        ]
    }
    fila = _fila(
        nombre="PM2.5 en media 24 horas por estación",
        tipo_territorio_fuente="estacion",
        unidad="microgramos por metro cubico",
        numerador=f"fuente_prueba.indicador[{selector}]",
    )
    assert bool(validador._validar_serie(fila, datos)) == espera_error


def test_selector_no_puede_tomar_ano_base_de_otro_subtipo(validador):
    datos = {("fuente_prueba", "indicador"): [(2023, "otro", "%"), (2024, "seleccionado", "%")]}
    assert any(
        "anio_base" in e
        for e in validador._validar_serie(
            _fila(numerador="fuente_prueba.indicador[seleccionado]", anio_base="2023"), datos
        )
    )


def test_denominador_no_se_imputa_para_anios_sin_poblacion(validador):
    datos = {
        ("fuente_prueba", "indicador"): [(2010, "total", "casos")],
        ("poblacion_prueba", "total"): [(2012, "municipal", "personas")],
    }
    errores = validador._validar_serie(
        _fila(anio_base="2010", unidad="casos", denominador="poblacion_prueba.total"), datos
    )
    assert any("denominador" in e for e in errores)


@pytest.mark.parametrize(
    "cambios",
    [
        {"denominador": "Población en edad de trabajar"},
        {"tipo_territorio_fuente": "municipal"},
        {"periodicidad": "anual"},
        {"formula": "oct-dic"},
    ],
)
def test_geih_rechaza_denominador_ambito_o_ventana_incompatibles(validador, cambios):
    fila = _fila(
        fuente="dane_geih_cartagena",
        numerador="dane_geih_cartagena.tasa_desocupacion",
        denominador="Fuerza de trabajo del trimestre móvil",
        tipo_territorio_fuente="cabecera_cartagena_23_ciudades",
        periodicidad="trimestral",
        tipo_periodo="trimestre_movil_publicado",
        formula="oct-dic o jun-ago, cortes separados",
    )
    datos = {("dane_geih_cartagena", "tasa_desocupacion"): [(2024, "oct - dic", "%"), (2026, "jun - ago", "%")]}
    assert validador._validar_serie(fila, datos) == []
    assert validador._validar_serie({**fila, **cambios}, datos)


@pytest.fixture
def archivo_catalogo(tmp_path, monkeypatch):
    ruta = tmp_path / "catalogo.csv"
    monkeypatch.setattr(catalogo_polis, "ARCHIVO_CATALOGO", ruta)
    monkeypatch.setattr(catalogo_polis, "_cache", {})
    return ruta


def _escribir_catalogo(ruta, *, nombre="Indicador de prueba", estado="no_publicable"):
    fila = dict.fromkeys(catalogo_polis.CAMPOS_OBLIGATORIOS, "fixture")
    fila.update(codigo="PERS_001", nombre=nombre, estado=estado)
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=catalogo_polis.CAMPOS_OBLIGATORIOS)
        escritor.writeheader()
        escritor.writerow(fila)


def test_cache_conserva_solo_la_ultima_version_y_copias_independientes(archivo_catalogo):
    for version in range(5):
        _escribir_catalogo(archivo_catalogo, nombre=f"Versión {version}")
        filas, sha = catalogo_polis.leer_catalogo_indicadores()
        assert sha == hashlib.sha256(archivo_catalogo.read_bytes()).hexdigest()
        assert len(catalogo_polis._cache) == 1
        filas[0]["nombre"] = "Cambio del consumidor"
        filas.append({"codigo": "no-debe-entrar-a-cache"})
        recargadas, _ = catalogo_polis.leer_catalogo_indicadores()
        assert len(recargadas) == 1
        assert recargadas[0]["nombre"] == f"Versión {version}"


@pytest.mark.parametrize("problema", ["columna", "fila", "extra_incompleta", "vacio", "utf8", "estado", "ausente"])
def test_catalogo_invalido_temporal_devuelve_503_sin_detalles_internos(archivo_catalogo, problema):
    _escribir_catalogo(archivo_catalogo)
    if problema == "columna":
        archivo_catalogo.write_text("codigo,nombre\nPERS_001,Ejemplo\n")
    elif problema == "fila":
        archivo_catalogo.write_text(archivo_catalogo.read_text().splitlines()[0] + "\nPERS_001\n")
    elif problema == "extra_incompleta":
        cabecera, fila = archivo_catalogo.read_text().splitlines()
        archivo_catalogo.write_text(cabecera + ",extra\n" + fila + "\n")
    elif problema == "vacio":
        archivo_catalogo.write_text(archivo_catalogo.read_text().splitlines()[0] + "\n")
    elif problema == "utf8":
        archivo_catalogo.write_bytes(b"\xff")
    elif problema == "estado":
        _escribir_catalogo(archivo_catalogo, estado="publicable")
    else:
        archivo_catalogo.unlink()
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="postgresql+asyncpg://test:test@127.0.0.1:1/polis_test_sin_conexion",
    )
    with TestClient(create_app(settings)) as cliente:
        respuesta = cliente.get("/api/v1/indicadores/catalogo")
    assert respuesta.status_code == 503
    assert "estructura" in respuesta.json()["detail"]
    assert str(archivo_catalogo) not in respuesta.text
