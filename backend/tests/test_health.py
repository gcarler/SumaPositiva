import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.core.migrations import EXPECTED_REVISION
from app.main import create_app
from app.modules.health.router import get_health_service
from app.modules.health.service import REQUIRED_EXTENSIONS, HealthService


@pytest.fixture
def repository():
    repository = AsyncMock()
    repository.migration_revision.return_value = EXPECTED_REVISION
    repository.installed_extensions.return_value = REQUIRED_EXTENSIONS
    return repository


def settings() -> Settings:
    return Settings(_env_file=None, environment="test")


def test_liveness_does_not_require_a_database():
    app = create_app(
        Settings(
            _env_file=None,
            environment="test",
            database_url="postgresql+asyncpg://polis:unused@127.0.0.1:1/polis_test",
        )
    )
    with TestClient(app) as client:
        response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "polis-api"}


def test_readiness_returns_503_and_hides_connection_details(repository):
    repository.migration_revision.side_effect = OperationalError(
        "SECRET_DATABASE_URL", {}, Exception("SECRET_PASSWORD")
    )
    app = create_app(settings())
    app.dependency_overrides[get_health_service] = lambda: HealthService(repository)
    with TestClient(app) as client:
        response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "database": "unavailable",
        "migrations": "unknown",
        "extensions": "unknown",
    }
    assert "SECRET" not in response.text


@pytest.mark.parametrize("revision", [None, "outdated_revision"])
def test_readiness_rejects_missing_or_outdated_migrations(repository, revision):
    repository.migration_revision.return_value = revision
    result = asyncio.run(HealthService(repository).readiness())
    assert result.status == "unavailable"
    assert result.database == "ok"
    assert result.migrations == "pending"


def test_readiness_rejects_missing_postgis(repository):
    repository.installed_extensions.return_value = REQUIRED_EXTENSIONS - {"postgis"}
    result = asyncio.run(HealthService(repository).readiness())
    assert result.status == "unavailable"
    assert result.extensions == "missing"


def test_readiness_returns_200_only_when_all_checks_pass(repository):
    app = create_app(settings())
    app.dependency_overrides[get_health_service] = lambda: HealthService(repository)
    with TestClient(app) as client:
        response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "database": "ok",
        "migrations": "ok",
        "extensions": "ok",
    }


def test_cors_allows_only_configured_origins():
    with TestClient(create_app(settings())) as client:
        accepted = client.options(
            "/api/v1/health/live",
            headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
        )
        rejected = client.options(
            "/api/v1/health/live",
            headers={"Origin": "https://unknown.example", "Access-Control-Request-Method": "GET"},
        )
    assert accepted.status_code == 200
    assert accepted.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert rejected.status_code == 400
    assert "access-control-allow-origin" not in rejected.headers


def test_production_disables_interactive_docs():
    with TestClient(create_app(Settings(_env_file=None, environment="production"))) as client:
        assert client.get("/api/v1/docs").status_code == 404
        assert client.get("/api/v1/openapi.json").status_code == 404
