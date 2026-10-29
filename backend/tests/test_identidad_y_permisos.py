import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


def test_identidad_y_permisos(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Registro de usuario (Ciudadano)
        correo_test = f"test_{os.urandom(4).hex()}@cartagena.gov.co"
        resp_reg = client.post(
            "/api/v1/identidad/registro",
            json={
                "correo": correo_test,
                "contrasena": "Secreta123*",
                "nombres": "Juan",
                "apellidos": "Perez",
            },
        )
        assert resp_reg.status_code == 201

        # 2. Login de usuario
        resp_login = client.post("/api/v1/identidad/login", json={"correo": correo_test, "contrasena": "Secreta123*"})
        assert resp_login.status_code == 200
        token_data = resp_login.json()
        assert "token_acceso" in token_data
        assert token_data["rol"] == "ciudadano"

        token = token_data["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Verificar nivel de identidad (requiere 'declarada')
        resp_nivel = client.get("/api/v1/identidad/verificar-nivel", headers=headers)
        assert resp_nivel.status_code == 200
        assert resp_nivel.json()["nivel_identidad"] == "declarada"

        # 4. Acceso denegado (requiere rol autoridad o auditor)
        resp_restringido = client.get("/api/v1/identidad/acceso-restringido", headers=headers)
        assert resp_restringido.status_code == 403

        # 5. Obtener perfil
        resp_perfil = client.get("/api/v1/identidad/perfil", headers=headers)
        assert resp_perfil.status_code == 200
        assert resp_perfil.json()["correo"] == correo_test

        # 6. Prueba sesión anónima (debería tener anonima, y fallar en acceso-restringido)
        resp_anon = client.post("/api/v1/sesion/anonima")
        token_anon = resp_anon.json()["token_acceso"]
        headers_anon = {"Authorization": f"Bearer {token_anon}"}

        # verificar-nivel requiere declarada, el anonimo deberia fallar
        resp_nivel_anon = client.get("/api/v1/identidad/verificar-nivel", headers=headers_anon)
        assert resp_nivel_anon.status_code == 403

        # perfil falla para anonimos
        resp_perfil_anon = client.get("/api/v1/identidad/perfil", headers=headers_anon)
        assert resp_perfil_anon.status_code == 403

        # Sin token
        resp_sin_token = client.get("/api/v1/identidad/verificar-nivel")
        assert resp_sin_token.status_code == 401
