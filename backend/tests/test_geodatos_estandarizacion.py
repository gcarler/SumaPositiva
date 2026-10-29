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


def test_estandarizar_direccion_formal_carrera(sync_client):
    """Verifica estandarización de nomenclatura formal tipo Carrera con coordenadas y barrio."""
    payload = {"direccion_raw": "Cra 3 # 6-20 Bocagrande"}
    resp = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["direccion_original"] == "Cra 3 # 6-20 Bocagrande"
    assert data["direccion_normalizada"] == "CR 3 # 6-20, Bocagrande"
    assert data["tipo_via"] == "Carrera"
    assert data["numero_principal"] == "3"
    assert data["numero_secundario"] == "6-20"
    assert data["sector_o_barrio"] == "Bocagrande"
    assert data["territorio_id"] is not None
    assert data["coordenadas_aproximadas"] is not None
    assert 10.38 <= data["coordenadas_aproximadas"]["latitud"] <= 10.42
    assert -75.57 <= data["coordenadas_aproximadas"]["longitud"] <= -75.53
    assert data["confianza"] >= 0.90


def test_estandarizar_direccion_formal_calle(sync_client):
    """Verifica estandarización de nomenclatura formal tipo Calle (Pie de la Popa)."""
    payload = {"direccion_raw": "Calle 30 # 25-10 Pie de la Popa"}
    resp = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["direccion_original"] == "Calle 30 # 25-10 Pie de la Popa"
    assert data["direccion_normalizada"] == "CL 30 # 25-10, Pie de la Popa"
    assert data["tipo_via"] == "Calle"
    assert data["numero_principal"] == "30"
    assert data["numero_secundario"] == "25-10"
    assert data["sector_o_barrio"] == "Pie de la Popa"
    assert data["territorio_id"] is not None
    assert data["coordenadas_aproximadas"] is not None
    assert data["coordenadas_aproximadas"]["latitud"] == 10.4167
    assert data["coordenadas_aproximadas"]["longitud"] == -75.5333
    assert data["confianza"] == 0.95


def test_estandarizar_direccion_popular_olaya(sync_client):
    """Verifica reconocimiento de sector popular con manzana en Olaya Herrera."""
    payload = {"direccion_raw": "Olaya Herrera sector Playas Blancas mz 12"}
    resp = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["direccion_original"] == "Olaya Herrera sector Playas Blancas mz 12"
    assert data["direccion_normalizada"] == "Olaya Herrera, Sector Playas Blancas, Mz 12"
    assert data["tipo_via"] == "Sector"
    assert data["numero_principal"] == "12"
    assert data["numero_secundario"] is None
    assert data["sector_o_barrio"] == "Olaya Herrera, Sector Playas Blancas"
    assert data["territorio_id"] is not None
    assert data["coordenadas_aproximadas"] is not None
    assert round(data["coordenadas_aproximadas"]["latitud"], 2) == 10.41
    assert round(data["coordenadas_aproximadas"]["longitud"], 2) == -75.49
    assert data["confianza"] >= 0.90


def test_estandarizar_direccion_popular_pozon(sync_client):
    """Verifica reconocimiento de sector popular sin manzana en El Pozón."""
    payload = {"direccion_raw": "Pozón sector 1ro de Mayo"}
    resp = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["direccion_original"] == "Pozón sector 1ro de Mayo"
    assert data["direccion_normalizada"] == "El Pozón, Sector 1ro de Mayo"
    assert data["tipo_via"] == "Sector"
    assert data["sector_o_barrio"] == "El Pozón, Sector 1ro de Mayo"
    assert data["territorio_id"] is not None
    assert data["coordenadas_aproximadas"] is not None
    assert round(data["coordenadas_aproximadas"]["latitud"], 2) == 10.41
    assert round(data["coordenadas_aproximadas"]["longitud"], 2) == -75.46
    assert data["confianza"] >= 0.90


def test_estandarizar_direccion_limpieza_caracteres_especiales(sync_client):
    """Verifica limpieza de signos de puntuación, espaciado redundante y abreviaturas."""
    payload = {"direccion_raw": "  ;;; cll 15 No. 45 - 20 ,,, Manga...  "}
    resp = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["direccion_normalizada"] == "CL 15 # 45-20, Manga"
    assert data["tipo_via"] == "Calle"
    assert data["numero_principal"] == "15"
    assert data["numero_secundario"] == "45-20"
    assert data["sector_o_barrio"] == "Manga"
    assert data["territorio_id"] is not None
    assert data["coordenadas_aproximadas"] is not None


def test_estandarizar_direccion_validacion_payload(sync_client):
    """Verifica que payloads inválidos sean rechazados con 422 Unprocessable Entity."""
    # Texto demasiado corto
    resp_corta = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json={"direccion_raw": "a"})
    assert resp_corta.status_code == 422

    # Objeto vacío
    resp_vacia = sync_client.post("/api/v1/geodatos/estandarizar-direccion", json={})
    assert resp_vacia.status_code == 422
