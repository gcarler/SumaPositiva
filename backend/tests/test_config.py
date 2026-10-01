from app.core.config import Settings


def test_settings_read_namespaced_environment_variables(monkeypatch):
    monkeypatch.setenv("POLIS_ENVIRONMENT", "test")
    monkeypatch.setenv("POLIS_DATABASE_URL", "postgresql://polis:unused@localhost:5433/polis_test")
    monkeypatch.setenv("POLIS_CORS_ORIGINS", '["http://localhost:3001"]')
    # The frontend's legacy Prisma variable must not configure the Python API.
    monkeypatch.setenv("DATABASE_URL", "file:./db/custom.db")
    settings = Settings(_env_file=None)
    assert settings.environment == "test"
    assert settings.async_database_url == (
        "postgresql+asyncpg://polis:unused@localhost:5433/polis_test"
    )
    assert settings.cors_origins == ["http://localhost:3001"]
