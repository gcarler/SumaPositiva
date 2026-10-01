"""Pruebas para [T6.5]: Control de Fases DNP, Google OAuth y Auditoría Forense/Respaldos."""

import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from google.oauth2 import id_token as google_id_token
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client(database_url: str, monkeypatch):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        google_client_id="cliente-google-exclusivo-pruebas",
    )

    def verificar(token, request, audience, **kwargs):
        assert audience == settings.google_client_id
        _, correo, nombre, sub = token.split(":")
        return {
            "email": correo,
            "name": nombre,
            "given_name": nombre.split()[0],
            "family_name": " ".join(nombre.split()[1:]),
            "sub": sub,
            "email_verified": True,
            "hd": "cartagena.gov.co" if correo.endswith("@cartagena.gov.co") else None,
        }

    monkeypatch.setattr(google_id_token, "verify_oauth2_token", verificar)
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


def preparar_autoridad(client, database_url, correo):
    assert "polis_test" in database_url
    local, dominio = correo.split("@")
    correo = f"{local}-{uuid.uuid4().hex}@{dominio}"
    registro = client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo,
            "contrasena": "ClavePruebaGoogle2026*",
            "nombres": "Autoridad",
            "apellidos": "Prueba",
        },
    )
    assert registro.status_code == 201, registro.text

    async def asignar():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text("""UPDATE autenticacion.usuarios SET rol_id=
                    (SELECT id FROM autenticacion.roles WHERE codigo='autoridad_distrital')
                    WHERE id=:id"""),
                    {"id": uuid.UUID(registro.json()["id"])},
                )
        finally:
            await engine.dispose()

    asyncio.run(asignar())
    return correo


def test_oauth_google_funcionario_institucional(client: TestClient, database_url):
    """Verifica autenticación Google OAuth para funcionario con dominio @cartagena.gov.co."""
    correo = preparar_autoridad(client, database_url, "alcaldia@cartagena.gov.co")
    id_token = f"test-google-token:{correo}:Alcalde Mayor Dumek:sub_dumek_123"
    resp = client.post("/api/v1/identidad/oauth/google", json={"id_token": id_token})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "token_acceso" in data
    assert data["rol"] == "autoridad_distrital"
    assert data["nivel_identidad"] == "declarada"
    assert data["usuario"]["correo"] == correo
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
    assert data["nivel_identidad"] == "declarada"
    assert data["usuario"]["correo"] == "ciudadano.cartagenero@gmail.com"


def test_control_fases_dnp_conmutar_web(client: TestClient, database_url):
    """Verifica el interruptor maestro de activación/desactivación de fases web DNP."""
    # 1. Login institucional para obtener token con permiso politicas:gestionar
    correo = preparar_autoridad(client, database_url, "planeacion@cartagena.gov.co")
    id_token = f"test-google-token:{correo}:Secretario Planeacion:sub_plan_789"
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


def test_auditoria_y_supervision_respaldos(client: TestClient, database_url):
    """Verifica consulta de registros de auditoría forense y catálogo de respaldos."""
    # Login como autoridad_distrital
    correo = preparar_autoridad(client, database_url, "seguridad@cartagena.gov.co")
    id_token = f"test-google-token:{correo}:Secretario Seguridad:sub_seg_999"
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


def test_google_no_promueve_por_dominio(client):
    resp = client.post(
        "/api/v1/identidad/oauth/google",
        json={"id_token": "test-google-token:admin.nuevo@cartagena.gov.co:Admin Nuevo:sub_nuevo"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["rol"] == "ciudadano"
    assert "usuarios:gestionar" not in resp.json()["permisos"]


def test_google_rollback_usuario_y_sesion(client, database_url, monkeypatch):
    """Un fallo posterior a crear sesión revierte todo, observado desde otra conexión."""
    from fastapi import HTTPException

    from app.modules.identidad.repository import IdentidadRepository

    async def contar():
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as connection:
                return (
                    await connection.execute(
                        text("SELECT count(*) FROM autenticacion.sesiones_usuario")
                    )
                ).scalar_one()
        finally:
            await engine.dispose()

    antes = asyncio.run(contar())
    original = IdentidadRepository.registrar_evento

    async def fallar(self, accion, *args, **kwargs):
        if accion == "login_oauth_google":
            raise HTTPException(503, "Fallo controlado después de crear sesión")
        return await original(self, accion, *args, **kwargs)

    monkeypatch.setattr(IdentidadRepository, "registrar_evento", fallar)
    correo = f"rollback-google-{uuid.uuid4().hex}@gmail.com"
    respuesta = client.post(
        "/api/v1/identidad/oauth/google",
        json={"id_token": f"test-google-token:{correo}:Rollback Prueba:sub_rollback"},
    )
    assert respuesta.status_code == 503
    assert asyncio.run(contar()) == antes

    async def buscar():
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as connection:
                return (
                    await connection.execute(
                        text("SELECT count(*) FROM autenticacion.usuarios WHERE correo=:correo"),
                        {"correo": correo},
                    )
                ).scalar_one()
        finally:
            await engine.dispose()

    assert asyncio.run(buscar()) == 0
