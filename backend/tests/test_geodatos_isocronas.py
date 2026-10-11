import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.geodatos.repository import GeodatosRepository


@pytest.fixture
def sync_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_isocronas_modo_pie_olaya_herrera(sync_client):
    """Verifica retorno de FeatureCollection con 3 polígonos (5, 10, 15 min) a pie y nodo cercano."""
    resp = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 10.4141, "lon": -75.4922, "modo": "pie", "minutos": "5,10,15"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 3

    f5 = data["features"][0]
    assert f5["type"] == "Feature"
    assert f5["geometry"]["type"] in ["Polygon", "MultiPolygon"]
    assert len(f5["geometry"]["coordinates"]) > 0
    assert f5["properties"]["minutos"] == 5
    assert f5["properties"]["modo"] == "pie"
    assert abs(f5["properties"]["radio_metros"] - 375.0) < 5.0

    nodo = f5["properties"]["nodo_cercano"]
    assert nodo is not None
    assert "Olaya Herrera" in nodo["nombre"]
    assert nodo["tipo"] in ["seguridad", "salud"]
    assert nodo["distancia_metros"] < 350.0

    f10 = data["features"][1]
    assert f10["properties"]["minutos"] == 10
    assert abs(f10["properties"]["radio_metros"] - 750.0) < 5.0

    f15 = data["features"][2]
    assert f15["properties"]["minutos"] == 15
    assert abs(f15["properties"]["radio_metros"] - 1125.0) < 5.0


def test_isocronas_modo_vehiculo_escalado(sync_client):
    """Verifica escalado de cobertura en vehículo (~25 km/h) comparado con modo a pie."""
    resp_pie = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 10.4120, "lon": -75.4610, "modo": "pie", "minutos": "5"},
    )
    assert resp_pie.status_code == 200
    data_pie = resp_pie.json()
    radio_pie = data_pie["features"][0]["properties"]["radio_metros"]

    resp_veh = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 10.4120, "lon": -75.4610, "modo": "vehiculo", "minutos": "5"},
    )
    assert resp_veh.status_code == 200
    data_veh = resp_veh.json()
    radio_veh = data_veh["features"][0]["properties"]["radio_metros"]

    assert radio_veh > radio_pie * 5.0
    assert abs(radio_veh - 2083.3) < 5.0
    assert data_veh["features"][0]["properties"]["modo"] == "vehiculo"

    # En El Pozón, el nodo cercano es el CAI El Pozón o CAP El Pozón
    nodo = data_veh["features"][0]["properties"]["nodo_cercano"]
    assert nodo is not None
    assert "El Pozón" in nodo["nombre"]


def test_isocronas_intervalos_personalizados(sync_client):
    """Verifica el cálculo con intervalos arbitrarios de minutos (ej. 3 y 8 minutos)."""
    resp = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 10.4000, "lon": -75.5550, "modo": "pie", "minutos": "3,8"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["features"]) == 2
    assert data["features"][0]["properties"]["minutos"] == 3
    assert data["features"][1]["properties"]["minutos"] == 8

    # En Bocagrande
    nodo = data["features"][0]["properties"]["nodo_cercano"]
    assert nodo is not None
    assert nodo["nombre"] == "CAI Bocagrande"


def test_isocronas_fuera_de_rango_territorial(sync_client):
    """Verifica manejo seguro y retorno 400 ante coordenadas fuera de Cartagena."""
    # Coordenadas de Bogotá
    resp = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 4.6097, "lon": -74.0817},
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert "fuera del rango territorial" in detail.lower()
    assert "cartagena" in detail.lower()


def test_isocronas_coordenadas_extremas_wgs84(sync_client):
    """Verifica validación 422 ante coordenadas fuera del estándar geográfico WGS84."""
    resp = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 999.0, "lon": -75.0},
    )
    assert resp.status_code == 422


def test_isocronas_modo_invalido(sync_client):
    """Verifica validación 422 si se pasa un modo de desplazamiento no admitido."""
    resp = sync_client.get(
        "/api/v1/geodatos/isocronas",
        params={"lat": 10.4141, "lon": -75.4922, "modo": "helicoptero"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_disponibilidad_pgrouting_en_repositorio(database_url: str):
    """Verifica que pgRouting 4.x esté activo y disponible en el motor de base de datos."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    engine = create_async_engine(database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = GeodatosRepository(session)
        version = await repo.verificar_pgrouting()
        assert version is not None
        assert version.startswith("4.")
    await engine.dispose()
