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
    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32, csp_report_limite_ip=3)
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


def test_csp_report_recientes_y_resumen_autorizacion():
    """Valida control de acceso (401/403/200) en la consulta y resumen perimetral de CSP."""
    import uuid

    from app.modules.identidad.deps import obtener_sujeto_autenticado
    from app.modules.identidad.schemas import SujetoAutenticadoContexto

    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32)
    app = create_app(settings)

    # 1. Sembrar un reporte CSP de prueba
    payload = {
        "csp-report": {
            "document-uri": "https://seguridadhumanaintegral.org/plataforma",
            "effective-directive": "script-src",
            "blocked-uri": "https://evil-analytics.org/tracker.js",
            "disposition": "enforce",
        }
    }

    with TestClient(app) as client:
        # Ingesta pública anónima
        resp_post = client.post("/api/v1/seguridad/csp-report", json=payload)
        assert resp_post.status_code == 204

        # 2. Consulta anónima rechazada con 401
        r_anon = client.get("/api/v1/seguridad/csp-report/recientes")
        assert r_anon.status_code == 401

        # 3. Usuario sin permiso auditoria:leer rechazado con 403
        sujeto_ciudadano = SujetoAutenticadoContexto(
            sujeto_id=uuid.uuid4(),
            rol="ciudadano",
            nivel_identidad="declarada",
            permisos=["propuestas:crear"],
            es_anonimo=False,
        )
        app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto_ciudadano
        r_ciudadano = client.get("/api/v1/seguridad/csp-report/recientes")
        assert r_ciudadano.status_code == 403
        assert "Permiso 'auditoria:leer' denegado" in r_ciudadano.json()["detail"]

        # 4. Auditor forense con permiso auditoria:leer accede con 200
        sujeto_auditor = SujetoAutenticadoContexto(
            sujeto_id=uuid.uuid4(),
            rol="auditor_forense",
            nivel_identidad="declarada",
            permisos=["auditoria:leer"],
            es_anonimo=False,
        )
        app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto_auditor

        r_recientes = client.get("/api/v1/seguridad/csp-report/recientes")
        assert r_recientes.status_code == 200
        recientes = r_recientes.json()
        assert len(recientes) == 1
        assert recientes[0]["directiva_violada"] == "script-src"
        assert recientes[0]["uri_bloqueada"] == "https://evil-analytics.org/tracker.js"

        # 5. Resumen estadístico
        r_resumen = client.get("/api/v1/seguridad/csp-report/resumen")
        assert r_resumen.status_code == 200
        resumen = r_resumen.json()
        assert resumen["total_reportes"] == 1
        assert resumen["directivas_afectadas"]["script-src"] == 1
        assert any(d["dominio"] == "evil-analytics.org" for d in resumen["dominios_bloqueados_frecuentes"])

        app.dependency_overrides.clear()
