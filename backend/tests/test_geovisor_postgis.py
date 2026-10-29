import time

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def sync_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_obtener_territorios_geojson(sync_client):
    resp = sync_client.get("/api/v1/geodatos/territorios/geojson")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert isinstance(data["features"], list)

    for feature in data["features"]:
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature
        assert "id" in feature["properties"]
        assert "nombre" in feature["properties"]
        assert "propuestas_conteo" in feature["properties"]


def test_buscar_por_coordenada_rendimiento_y_resultados(sync_client):
    lon = -75.550
    lat = 10.423

    # Warmup para asentar el pool de conexiones
    sync_client.get(f"/api/v1/geodatos/territorios/buscar-por-coordenada?lon={lon}&lat={lat}")

    start = time.perf_counter()
    resp = sync_client.get(f"/api/v1/geodatos/territorios/buscar-por-coordenada?lon={lon}&lat={lat}")
    end = time.perf_counter()
    latency_ms = (end - start) * 1000

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert latency_ms < 50, f"Latencia alta: {latency_ms:.2f} ms"


def test_listar_capas(sync_client):
    resp = sync_client.get("/api/v1/geodatos/capas")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_listar_territorios_filtros(sync_client):
    resp = sync_client.get("/api/v1/geodatos/territorios?es_zona_etnica=true")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
