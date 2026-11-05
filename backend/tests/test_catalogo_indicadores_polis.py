"""Pruebas de contrato de `/indicadores/catalogo` con el catálogo validado."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.indicadores.catalogo_polis import leer_catalogo_indicadores

RUTA = "/api/v1/indicadores/catalogo"
ARCHIVO = Path(__file__).resolve().parents[2] / "data" / "capas_analiticas" / "catalogo_indicadores" / "catalogo.csv"


@pytest.fixture
def cliente() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_catalogo_responde_y_conserva_sha_del_archivo(cliente: TestClient):
    respuesta = cliente.get(RUTA)
    assert respuesta.status_code == 200
    esperado = leer_catalogo_indicadores()
    cuerpo = respuesta.json()
    assert cuerpo["total"] == len(esperado[0])
    assert cuerpo["archivo_sha256"] == hashlib.sha256(ARCHIVO.read_bytes()).hexdigest()


def test_catalogo_campos_y_sin_valores_numericos(cliente: TestClient):
    respuesta = cliente.get(RUTA)
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == len(cuerpo["indicadores"])
    campos_prohibidos = {"valor", "valor_actual", "valor_medido", "valor_en_banco"}
    for fila in cuerpo["indicadores"]:
        assert fila["estado"] == "no_publicable"
        assert not campos_prohibidos.intersection(fila)


def test_catalogo_responde_a_filtros(cliente: TestClient):
    base = cliente.get(RUTA)
    assert base.status_code == 200
    todas = base.json()["indicadores"]
    dimension_ejemplo = todas[0]["dimension"]
    tier_ejemplo = todas[0]["tier"]
    filtrados = cliente.get(RUTA, params={"dimension": dimension_ejemplo, "tier": tier_ejemplo})
    assert filtrados.status_code == 200
    cuerpo = filtrados.json()
    assert cuerpo["total"] <= base.json()["total"]
    assert all(
        fila["dimension"] == dimension_ejemplo and fila["tier"] == tier_ejemplo for fila in cuerpo["indicadores"]
    )


def test_catalogo_busqueda_y_valor_vacio(cliente: TestClient):
    respuesta = cliente.get(RUTA, params={"busqueda": "homicidio"})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] >= 1
    assert all("homicidio" in fila["nombre"].lower() for fila in cuerpo["indicadores"])


def test_catalogo_dimension_inexistente_devuelve_vacio(cliente: TestClient):
    respuesta = cliente.get(RUTA, params={"dimension": "NO_EXISTE"})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == 0
    assert cuerpo["indicadores"] == []


def test_catalogo_post_bloqueado(cliente: TestClient):
    respuesta = cliente.post(RUTA, json={})
    assert respuesta.status_code == 405


def test_catalogo_error_estructura_retorna_503(cliente: TestClient, monkeypatch: pytest.MonkeyPatch):
    def fake_leer():
        from app.modules.indicadores.catalogo_polis import CatalogoIndicadoresInvalido

        raise CatalogoIndicadoresInvalido("Estructura corrupta simulada")

    monkeypatch.setattr("app.modules.indicadores.router.leer_catalogo_indicadores", fake_leer)
    respuesta = cliente.get(RUTA)
    assert respuesta.status_code == 503
    assert "no está disponible temporalmente por un problema de estructura" in respuesta.json()["detail"]
