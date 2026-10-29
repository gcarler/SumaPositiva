import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture
def test_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_roles_canonicos_sembrados(test_client: TestClient, provisionar_usuario_sync):
    """Verifica que los 4 roles canónicos estén sembrados y operen en el sistema."""
    roles_esperados = ["ciudadano", "facilitador_mesa", "autoridad_distrital", "auditor_forense"]
    for rol_codigo in roles_esperados:
        correo = f"test_{rol_codigo}_{os.urandom(4).hex()}@cartagena.gov.co"
        resp = provisionar_usuario_sync(
            test_client,
            {
                "correo": correo,
                "contrasena": "ClaveSegura2026*",
                "nombres": f"Usuario {rol_codigo}",
                "apellidos": "Distrital",
                "codigo_rol": rol_codigo,
            },
        )
        assert resp.status_code == 201, f"Fallo al registrar usuario con rol {rol_codigo}: {resp.text}"
        data = resp.json()
        assert data["correo"] == correo
        assert data["activo"] is True


def test_autenticacion_login_y_tokens(test_client: TestClient):
    """Valida el flujo de login y emisión de token JWT firmado."""
    correo = f"login_test_{os.urandom(4).hex()}@cartagena.gov.co"
    contrasena = "Cartagena2026*"
    test_client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo,
            "contrasena": contrasena,
            "nombres": "Ana",
            "apellidos": "Gomez",
        },
    )

    # Login exitoso
    resp_login = test_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo, "contrasena": contrasena},
    )
    assert resp_login.status_code == 200
    token_data = resp_login.json()
    assert "token_acceso" in token_data
    assert token_data["tipo_token"] == "Bearer"
    assert token_data["rol"] == "ciudadano"
    assert token_data["nivel_identidad"] in ("declarada", "autenticada")

    # Login fallido (credenciales incorrectas -> 401)
    resp_fallo = test_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo, "contrasena": "ClaveInvalida"},
    )
    assert resp_fallo.status_code == 401


def test_control_acceso_rbac_y_denegacion_403(test_client: TestClient, provisionar_usuario_sync):
    """Valida que requerir_rol permita autoridades y deniegue con 403 a ciudadanos."""
    # 1. Crear ciudadano
    correo_ciudadano = f"ciudadano_{os.urandom(4).hex()}@cartagena.gov.co"
    test_client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo_ciudadano,
            "contrasena": "Cartagena2026*",
            "nombres": "Carlos",
            "apellidos": "Mendoza",
        },
    )
    resp_login_c = test_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo_ciudadano, "contrasena": "Cartagena2026*"},
    )
    token_ciudadano = resp_login_c.json()["token_acceso"]

    # Acceso restringido (requiere autoridad_distrital o auditor_forense) -> 403
    resp_denegada = test_client.get(
        "/api/v1/identidad/acceso-restringido",
        headers={"Authorization": f"Bearer {token_ciudadano}"},
    )
    assert resp_denegada.status_code == 403

    # 2. Crear autoridad distrital
    correo_autoridad = f"autoridad_{os.urandom(4).hex()}@cartagena.gov.co"
    provisionar_usuario_sync(
        test_client,
        {
            "correo": correo_autoridad,
            "contrasena": "Cartagena2026*",
            "nombres": "Doctora",
            "apellidos": "Secretaria",
            "codigo_rol": "autoridad_distrital",
        },
    )
    resp_login_a = test_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo_autoridad, "contrasena": "Cartagena2026*"},
    )
    token_autoridad = resp_login_a.json()["token_acceso"]

    # Acceso concedido a autoridad -> 200
    resp_concedida = test_client.get(
        "/api/v1/identidad/acceso-restringido",
        headers={"Authorization": f"Bearer {token_autoridad}"},
    )
    assert resp_concedida.status_code == 200
    assert "Acceso concedido" in resp_concedida.json()["mensaje"]


def test_control_acceso_denegacion_401_sin_token(test_client: TestClient):
    """Valida rechazo 401 Unauthorized sin credenciales o con token inválido."""
    # Sin header
    resp_sin_header = test_client.get("/api/v1/identidad/perfil")
    assert resp_sin_header.status_code == 401
    assert "WWW-Authenticate" in resp_sin_header.headers

    # Token corrupto / inválido
    resp_token_falso = test_client.get(
        "/api/v1/identidad/perfil",
        headers={"Authorization": "Bearer token_falsificado_123"},
    )
    assert resp_token_falso.status_code == 401


def test_integracion_sesion_anonima_y_sujeto_autenticado(test_client: TestClient):
    "Valida que un token emitido por /sesion/anonima sea reconocido por obtener_sujeto_autenticado."
    resp_sesion = test_client.post("/api/v1/sesion/anonima")
    assert resp_sesion.status_code == 201
    token_anon = resp_sesion.json()["token_acceso"]
    headers_anon = {"Authorization": f"Bearer {token_anon}"}

    # Sesión anónima no puede acceder al perfil de usuario registrado -> 403
    resp_perfil = test_client.get("/api/v1/identidad/perfil", headers=headers_anon)
    assert resp_perfil.status_code == 403

    # Sesión anónima no puede acceder a endpoints reservados para autoridades -> 403
    resp_admin = test_client.get("/api/v1/identidad/acceso-restringido", headers=headers_anon)
    assert resp_admin.status_code == 403


@pytest.mark.parametrize("rol", ["facilitador_mesa", "autoridad_distrital", "auditor_forense"])
async def test_registro_publico_no_concede_roles_institucionales(test_client, database_url, rol):
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    correo = f"escalamiento_{os.urandom(6).hex()}@example.org"
    response = test_client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo,
            "contrasena": "ClaveSegura2026*",
            "nombres": "Prueba",
            "apellidos": "Acceso",
            "codigo_rol": rol,
        },
    )
    assert response.status_code == 422
    assert any(error["loc"][-1] == "codigo_rol" for error in response.json()["detail"])
    login = test_client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": "ClaveSegura2026*"})
    assert login.status_code == 401
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as connection:
            assert (
                await connection.scalar(
                    text("SELECT count(*) FROM autenticacion.usuarios WHERE correo = :correo"),
                    {"correo": correo},
                )
                == 0
            )
    finally:
        await engine.dispose()
