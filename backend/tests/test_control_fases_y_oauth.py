"""Pruebas para [T6.5]: Control de Fases DNP, Google OAuth y Auditoría Forense/Respaldos."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


def test_oauth_google_funcionario_institucional(client: TestClient):
    """Verifica autenticación Google OAuth para funcionario con dominio @cartagena.gov.co."""
    id_token = "test-google-token:alcaldia@cartagena.gov.co:Alcalde Mayor Dumek:sub_dumek_123"
    resp = client.post("/api/v1/identidad/oauth/google", json={"id_token": id_token})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "token_acceso" in data
    assert data["rol"] == "autoridad_distrital"
    assert data["nivel_identidad"] == "verificada"
    assert data["usuario"]["correo"] == "alcaldia@cartagena.gov.co"
    assert "politicas:gestionar" in data["permisos"]
    assert "auditoria:leer" in data["permisos"]


def test_oauth_google_ciudadano_general(client: TestClient):
    """Verifica autenticación Google OAuth para ciudadano general (no gubernamental)."""
    id_token = "test-google-token:ciudadano.cartagenero@gmail.com:Pedro Perez:sub_perez_456"
    resp = client.post("/api/v1/identidad/oauth/google", json={"id_token": id_token})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "token_acceso" in data
    assert data["rol"] == "ciudadano"
    assert data["nivel_identidad"] == "autenticada"
    assert data["usuario"]["correo"] == "ciudadano.cartagenero@gmail.com"


def test_control_fases_dnp_conmutar_web(client: TestClient):
    """Verifica el interruptor maestro de activación/desactivación de fases web DNP."""
    # 1. Login institucional para obtener token con permiso politicas:gestionar
    id_token = "test-google-token:planeacion@cartagena.gov.co:Secretario Planeacion:sub_plan_789"
    resp_auth = client.post("/api/v1/identidad/oauth/google", json={"id_token": id_token})
    assert resp_auth.status_code == 200
    token = resp_auth.json()["token_acceso"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Listar fases de control
    resp_fases = client.get("/api/v1/politicas/fases/control", headers=headers)
    assert resp_fases.status_code == 200
    fases = resp_fases.json()
    assert len(fases) >= 3

    fase_1 = next(f for f in fases if f["codigo"] == "FASE_1_DIAGNOSTICO")
    fase_id = fase_1["id"]

    # 3. Conmutar participación web a False
    resp_conmutar = client.patch(
        f"/api/v1/politicas/fases/{fase_id}/conmutar",
        headers=headers,
        json={"habilitada_web": False, "motivo": "Cierre preventivo de recepción web"},
    )
    assert resp_conmutar.status_code == 200
    data_conmutada = resp_conmutar.json()
    assert data_conmutada["habilitada_web"] is False

    # 4. Reactivar participación web a True
    resp_reactivar = client.patch(
        f"/api/v1/politicas/fases/{fase_id}/conmutar",
        headers=headers,
        json={"habilitada_web": True, "motivo": "Reapertura de participación ciudadana"},
    )
    assert resp_reactivar.status_code == 200
    assert resp_reactivar.json()["habilitada_web"] is True


def test_auditoria_y_supervision_respaldos(client: TestClient):
    """Verifica consulta de registros de auditoría forense y catálogo de respaldos."""
    # Login como autoridad_distrital
    id_token = "test-google-token:seguridad@cartagena.gov.co:Secretario Seguridad:sub_seg_999"
    resp_auth = client.post("/api/v1/identidad/oauth/google", json={"id_token": id_token})
    assert resp_auth.status_code == 200
    token = resp_auth.json()["token_acceso"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Consultar registros de auditoría
    resp_aud = client.get("/api/v1/auditoria/registros", headers=headers)
    assert resp_aud.status_code == 200
    data_aud = resp_aud.json()
    assert "total" in data_aud
    assert isinstance(data_aud["elementos"], list)

    # 2. Consultar catálogo de respaldos
    resp_respaldos = client.get("/api/v1/auditoria/respaldos", headers=headers)
    assert resp_respaldos.status_code == 200
    data_respaldos = resp_respaldos.json()
    assert "directorio" in data_respaldos
    assert "respaldos" in data_respaldos
    assert data_respaldos["total_respaldos"] >= 1
