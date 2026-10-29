from app.core.config import Settings


def test_settings_read_namespaced_environment_variables(monkeypatch):
    monkeypatch.setenv("POLIS_ENVIRONMENT", "test")
    monkeypatch.setenv("POLIS_DATABASE_URL", "postgresql://polis:unused@localhost:5433/polis_test")
    monkeypatch.setenv("POLIS_CORS_ORIGINS", '["http://localhost:3001"]')
    # The frontend's legacy Prisma variable must not configure the Python API.
    monkeypatch.setenv("DATABASE_URL", "file:./db/custom.db")
    settings = Settings(_env_file=None)
    assert settings.environment == "test"
    assert settings.async_database_url == ("postgresql+asyncpg://polis:unused@localhost:5433/polis_test")
    assert settings.cors_origins == ["http://localhost:3001"]


def test_whatsapp_disabled_without_explicit_configuration(monkeypatch):
    for name in ("POLIS_WHATSAPP_HABILITADO", "POLIS_WHATSAPP_APP_SECRET", "POLIS_WHATSAPP_VERIFY_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    settings = Settings(_env_file=None)
    assert settings.whatsapp_habilitado is False
    assert settings.whatsapp_app_secret is None
    assert settings.whatsapp_verify_token is None


def test_whatsapp_reads_namespaced_configuration(monkeypatch):
    monkeypatch.setenv("POLIS_WHATSAPP_HABILITADO", "true")
    monkeypatch.setenv("POLIS_WHATSAPP_APP_SECRET", "synthetic-test-app-secret")
    monkeypatch.setenv("POLIS_WHATSAPP_VERIFY_TOKEN", "synthetic-test-verify-token")
    settings = Settings(_env_file=None)
    assert settings.whatsapp_habilitado is True
    assert settings.whatsapp_app_secret == "synthetic-test-app-secret"
    assert settings.whatsapp_verify_token == "synthetic-test-verify-token"
