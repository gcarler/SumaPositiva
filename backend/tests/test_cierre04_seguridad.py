"""Pruebas periciales de seguridad perimetral, cabeceras y control de fugas (CIERRE-04)."""

import pytest
from fastapi import APIRouter, Response
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_cabeceras_seguridad_universales():
    """Certifica que toda respuesta HTTP del backend incluye cabeceras de seguridad perimetral y CSP de API."""
    settings = Settings(_env_file=None, environment="development", jwt_secret_key="a" * 32)
    app = create_app(settings)

    with TestClient(app) as client:
        resp = client.get("/api/v1/health/live")
        assert resp.status_code == 200

        # Verificación estricta de cabeceras de protección universal
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in resp.headers.get("Permissions-Policy", "")
        assert "microphone=()" in resp.headers.get("Permissions-Policy", "")
        assert "geolocation=(self)" in resp.headers.get("Permissions-Policy", "")

        # CSP restrictivo de API REST (previene framing y ejecución de scripts en navegador)
        csp = resp.headers.get("Content-Security-Policy", "")
        assert "default-src 'none'" in csp
        assert "frame-ancestors 'none'" in csp


def test_hsts_activado_en_https_o_produccion():
    """Certifica que HSTS se activa cuando el esquema es HTTPS o x-forwarded-proto es https."""
    settings = Settings(_env_file=None, environment="development", jwt_secret_key="a" * 32)
    app = create_app(settings)

    # 1. Petición HTTP simple en desarrollo no emite HSTS
    with TestClient(app) as client:
        resp = client.get("/api/v1/health/live")
        assert "Strict-Transport-Security" not in resp.headers

    # 2. Petición HTTPS con cabecera de proxy inverso emite HSTS
    with TestClient(app) as client:
        resp = client.get(
            "/api/v1/health/live",
            headers={"x-forwarded-proto": "https"},
        )
        assert resp.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"

    # 3. En entorno de producción siempre emite HSTS
    settings_prod = Settings(_env_file=None, environment="production", jwt_secret_key="a" * 32)
    app_prod = create_app(settings_prod)
    with TestClient(app_prod) as client:
        resp = client.get("/api/v1/health/live")
        assert resp.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"


def test_cors_origins_efectivos_produccion_estricto():
    """Certifica que en producción se eliminan orígenes insecure (http://, localhost, 127.0.0.1)."""
    settings = Settings(
        _env_file=None,
        environment="production",
        jwt_secret_key="a" * 32,
        cors_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://seguridadhumanaintegral.org",
            "https://seguridadhumanaintegral.org",
            "https://www.seguridadhumanaintegral.org",
        ],
    )

    efectivos = settings.cors_origins_efectivos
    for origin in efectivos:
        assert origin.startswith("https://"), f"Origen inseguro en producción: {origin}"
        assert "localhost" not in origin, f"Origen de desarrollo en producción: {origin}"
        assert "127.0.0.1" not in origin, f"Origen de loopback en producción: {origin}"

    assert "https://seguridadhumanaintegral.org" in efectivos
    assert "https://www.seguridadhumanaintegral.org" in efectivos


def test_excepcion_no_controlada_no_filtra_traceback():
    """Certifica que las excepciones internas no controladas devuelven 500 genérico sin revelar stack trace."""
    settings = Settings(_env_file=None, environment="development", jwt_secret_key="a" * 32)
    app = create_app(settings)

    router_prueba = APIRouter()

    @router_prueba.get("/test-error-interno")
    async def ruta_falla():
        # Provocar excepción no controlada deliberada
        raise RuntimeError("Error confidencial con datos sensibles de infraestructura: /var/secrets/db_pass")

    app.include_router(router_prueba)

    with TestClient(app, raise_server_exceptions=False) as client:
        resp = client.get("/test-error-interno")
        assert resp.status_code == 500
        data = resp.json()
        assert "detail" in data
        assert "Error interno del servidor" in data["detail"]
        # Verificar que el mensaje sensible jamás llega al cliente
        assert "Error confidencial" not in resp.text
        assert "db_pass" not in resp.text
        assert "Traceback" not in resp.text
