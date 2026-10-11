import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.sentry import init_sentry
from app.core.telemetry import global_telemetry
from app.main import create_app

pytestmark = pytest.mark.anyio


def test_system_health_metrics_endpoint(database_url: str):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        sentry_dsn=None,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        # Generar algunas peticiones para acumular telemetría
        client.get("/api/v1/health/live")
        client.get("/api/v1/health/ready")
        client.get("/api/v1/ruta-inexistente-404")

        # Consultar el endpoint de observabilidad
        response = client.get("/api/v1/health/system")
        assert response.status_code == 200
        data = response.json()

        # 1. Metadatos generales del servicio
        assert data["service"] == "polis-api"
        assert data["version"] == "0.2.1"
        assert data["environment"] == "test"
        assert data["status"] in {"ok", "degraded"}
        assert "timestamp" in data

        # 2. Métricas de Base de Datos PostgreSQL
        db_metrics = data["database"]
        assert db_metrics["status"] == "ok"
        assert isinstance(db_metrics["ping_ms"], (int, float))
        assert db_metrics["ping_ms"] >= 0
        assert isinstance(db_metrics["active_connections"], int)
        assert db_metrics["active_connections"] >= 1
        assert isinstance(db_metrics["max_connections"], int)
        assert db_metrics["max_connections"] > 0
        assert db_metrics["migrations_status"] in {"ok", "pending"}
        assert db_metrics["extensions_status"] in {"ok", "missing"}
        assert isinstance(db_metrics["installed_extensions"], list)

        # 3. Métricas de Proceso y Telemetría HTTP
        proc = data["process"]
        assert proc["uptime_seconds"] >= 0
        assert proc["memory_rss_mb"] > 0
        assert proc["total_requests"] >= 3
        assert proc["requests_2xx"] >= 2
        assert proc["requests_4xx"] >= 1
        assert isinstance(proc["error_rate_pct"], (int, float))
        assert isinstance(proc["avg_latency_ms"], (int, float))

        # 4. Métricas de Almacenamiento en Disco
        storage = data["storage"]
        assert storage["total_gb"] > 0
        assert storage["free_gb"] >= 0
        assert 0 <= storage["used_pct"] <= 100

        # 5. Estado de Sentry / GlitchTip
        obs = data["observability"]
        assert obs["sentry_status"] == "desactivado"


def test_sentry_defensivo_sin_dsn():
    settings = Settings(_env_file=None, environment="test", sentry_dsn=None)
    # Debe ser totalmente idempotente y seguro
    assert init_sentry(settings) is False


def test_telemetry_tracker_registro_y_reseteo():
    global_telemetry.reset()
    global_telemetry.record_request(200, 15.5)
    global_telemetry.record_request(201, 20.0)
    global_telemetry.record_request(404, 5.0)
    global_telemetry.record_request(500, 50.0)

    metrics = global_telemetry.get_metrics()
    assert metrics["total_requests"] == 4
    assert metrics["requests_2xx"] == 2
    assert metrics["requests_4xx"] == 1
    assert metrics["requests_5xx"] == 1
    assert metrics["error_rate_pct"] == 25.0
    assert metrics["avg_latency_ms"] == round((15.5 + 20.0 + 5.0 + 50.0) / 4, 2)
