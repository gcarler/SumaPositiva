"""Pruebas para sesión anónima con firma digital, dependencias y Habeas Data (Ley 1581/12)."""

import time
import uuid

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.sesion.security import (
    calcular_huella_ip,
    crear_token_sesion,
    decodificar_token_sesion,
    generar_uuidv7,
)

pytestmark = pytest.mark.anyio


def test_generador_uuidv7_rfc_9562():
    """Verifica que el generador produzca identificadores UUID versión 7 válidos."""
    u1 = generar_uuidv7()
    u2 = generar_uuidv7()
    assert isinstance(u1, uuid.UUID)
    assert u1.version == 7
    assert u2.version == 7
    assert u1 != u2


def test_huella_ip_irreversible_habeas_data():
    """Garantiza que la huella sea determinista, HMAC-SHA256 (64 hex) y no reversible."""
    salt = "salt_prueba_secreto_cartagena"
    ip = "190.131.25.10"
    huella1 = calcular_huella_ip(ip, salt)
    huella2 = calcular_huella_ip(ip, salt)
    huella_otra_ip = calcular_huella_ip("190.131.25.11", salt)

    assert len(huella1) == 64
    assert huella1 == huella2
    assert huella1 != huella_otra_ip
    # La IP jamás debe ser inferible del hash
    assert ip not in huella1


def test_emision_y_decodificacion_token_sesion():
    """Valida la generación de tokens firmados y su decodificación en contexto de sesión."""
    settings = Settings(_env_file=None, environment="test")
    sesion_id = generar_uuidv7()
    huella = calcular_huella_ip("186.84.90.1", settings.ip_salt)

    token, exp_segundos, exp_dt = crear_token_sesion(sesion_id, huella, settings)
    assert isinstance(token, str)
    assert exp_segundos == settings.jwt_expiracion_horas * 3600

    contexto = decodificar_token_sesion(token, settings)
    assert contexto.sesion_id == sesion_id
    assert contexto.huella_hash == huella
    assert contexto.rol == "ciudadano_anonimo"
    assert contexto.es_anonimo is True


def test_api_sesion_anonima_y_verificacion(database_url: str):
    """Prueba integral de emisión y verificación de sesión anónima firmada."""
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Emisión de sesión anónima POST /api/v1/sesion/anonima
        resp_emision = client.post(
            "/api/v1/sesion/anonima",
            headers={
                "X-Forwarded-For": "181.143.200.5",
                "User-Agent": "PolisDeliberativa/1.0",
            },
        )
        assert resp_emision.status_code == 201
        data = resp_emision.json()
        assert "token_acceso" in data
        assert data["tipo_token"] == "Bearer"
        assert data["expira_en_segundos"] > 0
        assert data["rol"] == "ciudadano_anonimo"
        assert len(data["huella_hash"]) == 64
        # Validación de que la IP en texto plano NO viaja en la respuesta
        assert "181.143.200.5" not in resp_emision.text

        token = data["token_acceso"]
        sesion_uuid = uuid.UUID(data["sesion_id"])
        assert sesion_uuid.version == 7

        # 2. Verificación de sesión con token válido
        resp_verif = client.get(
            "/api/v1/sesion/verificar",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp_verif.status_code == 200
        data_verif = resp_verif.json()
        assert data_verif["sesion_id"] == data["sesion_id"]
        assert data_verif["huella_hash"] == data["huella_hash"]
        assert data_verif["rol"] == "ciudadano_anonimo"
        assert data_verif["es_anonimo"] is True

        # 3. Rechazo sin encabezado de autorización
        resp_sin_auth = client.get("/api/v1/sesion/verificar")
        assert resp_sin_auth.status_code == 401

        # 4. Rechazo con firma digital adulterada
        token_falso = token[:-6] + "abcdef"
        resp_invalido = client.get(
            "/api/v1/sesion/verificar",
            headers={"Authorization": f"Bearer {token_falso}"},
        )
        assert resp_invalido.status_code == 401


def test_rechazo_token_expirado():
    """Valida que un token vencido sea rechazado con HTTP 401."""
    settings = Settings(_env_file=None, environment="test")
    sesion_id = generar_uuidv7()
    huella = "abcde12345"

    # Token expirado intencionalmente (hace 10 minutos)
    ahora = int(time.time())
    payload_expirado = {
        "sub": "sesion_anonima",
        "sesion_id": str(sesion_id),
        "huella_hash": huella,
        "rol": "ciudadano_anonimo",
        "iat": ahora - 3600,
        "exp": ahora - 600,
    }
    token_vencido = jwt.encode(
        payload_expirado,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(Exception) as exc_info:
        decodificar_token_sesion(token_vencido, settings)
    assert "expirado" in str(exc_info.value.detail).lower()
