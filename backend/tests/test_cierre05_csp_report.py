"""Pruebas unitarias para el endpoint de recolección de violaciones CSP [CIERRE-05]."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.seguridad.router import (
    limpiar_cache_tasa_csp,
    obtener_reportes_csp_recientes,
)


@pytest.fixture(autouse=True)
def limpiar_estado():
    limpiar_cache_tasa_csp()
    yield
    limpiar_cache_tasa_csp()


def test_csp_report_recepcion_estandar_204():
    """Valida recepción exitosa de reporte CSP tradicional (report-uri) y respuesta 204."""
    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32)
    app = create_app(settings)

    payload = {
        "csp-report": {
            "document-uri": "https://seguridadhumanaintegral.org/geovisor",
            "referrer": "",
            "violated-directive": "script-src",
            "effective-directive": "script-src",
            "original-policy": "default-src 'self'...",
            "disposition": "report",
            "blocked-uri": "https://malicious.example/evil.js",
            "line-number": 42,
            "column-number": 12,
            "source-file": "",
            "status-code": 200,
            "script-sample": "",
        }
    }

    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/seguridad/csp-report",
            json=payload,
            headers={"Content-Type": "application/csp-report"},
        )
        assert resp.status_code == 204
        assert resp.text == ""

    recientes = obtener_reportes_csp_recientes()
    assert len(recientes) == 1
    reporte = recientes[0]
    assert reporte["directiva"] == "script-src"
    assert reporte["blocked_uri"] == "https://malicious.example/evil.js"
    assert reporte["pagina"] == "https://seguridadhumanaintegral.org/geovisor"
    assert reporte["disposicion"] == "report"


def test_csp_report_recepcion_reporting_api_moderna():
    """Valida recepción de reportes emitidos bajo el formato moderno de Reporting-Endpoints."""
    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32)
    app = create_app(settings)

    payload = [
        {
            "type": "csp-violation",
            "age": 5,
            "url": "https://seguridadhumanaintegral.org/plataforma/mesas",
            "body": {
                "documentURL": "https://seguridadhumanaintegral.org/plataforma/mesas",
                "effectiveDirective": "connect-src",
                "blockedURL": "ws://inseguro.example",
                "disposition": "enforce",
            },
        }
    ]

    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/seguridad/csp-report",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 204

    recientes = obtener_reportes_csp_recientes()
    assert len(recientes) == 1
    reporte = recientes[0]
    assert reporte["directiva"] == "connect-src"
    assert reporte["blocked_uri"] == "ws://inseguro.example"
    assert reporte["disposicion"] == "enforce"


def test_csp_report_sanitiza_pii_en_urls():
    """Garantiza que parámetros de consulta (query strings) y hashes no se almacenen (cero PII)."""
    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32)
    app = create_app(settings)

    payload = {
        "csp-report": {
            "document-uri": "https://seguridadhumanaintegral.org/f/reporte?token=secreto123&correo=ciudadano@cartagena.gov.co#seccion-privada",
            "effective-directive": "img-src",
            "blocked-uri": "http://inseguro.org/foto.jpg",
            "disposition": "report",
        }
    }

    with TestClient(app) as client:
        resp = client.post("/api/v1/seguridad/csp-report", json=payload)
        assert resp.status_code == 204

    recientes = obtener_reportes_csp_recientes()
    assert len(recientes) == 1
    reporte = recientes[0]
    # Sanitización: la URL queda limpia sin query parameters ni hash
    assert reporte["pagina"] == "https://seguridadhumanaintegral.org/f/reporte"
    assert "token" not in reporte["pagina"]
    assert "correo" not in reporte["pagina"]
    assert "seccion-privada" not in reporte["pagina"]


def test_csp_report_tamano_maximo_413():
    """Rechaza con 413 si la carga útil excede 32 KB para mitigar ataques de agotamiento de memoria."""
    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32)
    app = create_app(settings)

    payload_gigante = {"csp-report": {"script-sample": "A" * (33 * 1024)}}

    with TestClient(app) as client:
        resp = client.post("/api/v1/seguridad/csp-report", json=payload_gigante)
        assert resp.status_code == 413
        assert "tamaño máximo" in resp.json()["detail"]


def test_csp_report_rate_limit_429():
    """Aplica limitación de tasa por IP retornando 429 con cabecera Retry-After."""
    settings = Settings(
        _env_file=None, environment="test", jwt_secret_key="a" * 32, csp_report_limite_ip=3
    )
    app = create_app(settings)

    headers = {"X-Forwarded-For": "198.51.100.42"}
    payload = {"csp-report": {"effective-directive": "script-src"}}

    with TestClient(app) as client:
        # Primeras 3 peticiones permitidas
        for _ in range(3):
            r = client.post("/api/v1/seguridad/csp-report", json=payload, headers=headers)
            assert r.status_code == 204

        # La 4ta petición supera el límite (csp_report_limite_ip=3)
        r_excedido = client.post("/api/v1/seguridad/csp-report", json=payload, headers=headers)
        assert r_excedido.status_code == 429
        assert "Límite de reportes de seguridad excedido" in r_excedido.json()["detail"]
        assert r_excedido.headers.get("retry-after") == "60"
