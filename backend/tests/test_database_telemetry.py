import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.health.service import sanitizar_consulta_sql


@pytest.fixture
def sync_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_database_queries_telemetry_200(sync_client):
    """Verifica que el endpoint de telemetría SQL responda 200 con estructura forense completa."""
    resp = sync_client.get("/api/v1/health/database/queries")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] in ["ok", "degraded"]
    assert "timestamp" in data
    assert isinstance(data["total_queries_recorded"], int)
    assert data["total_queries_recorded"] >= 0
    assert isinstance(data["cache_hit_ratio_pct"], (int, float))
    assert 0.0 <= data["cache_hit_ratio_pct"] <= 100.0

    assert isinstance(data["top_queries"], list)
    if data["top_queries"]:
        primera = data["top_queries"][0]
        assert "query" in primera
        assert isinstance(primera["calls"], int)
        assert primera["calls"] >= 1
        assert isinstance(primera["total_ms"], (int, float))
        assert primera["total_ms"] >= 0.0
        assert isinstance(primera["mean_ms"], (int, float))
        assert primera["mean_ms"] >= 0.0
        assert isinstance(primera["rows"], int)
        assert primera["rows"] >= 0
        assert isinstance(primera["hit_ratio_pct"], (int, float))
        assert 0.0 <= primera["hit_ratio_pct"] <= 100.0


def test_database_queries_limite_param(sync_client):
    """Verifica el cumplimiento estricto del parámetro limite."""
    resp = sync_client.get("/api/v1/health/database/queries", params={"limite": 3})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["top_queries"]) <= 3


def test_database_queries_ordenamiento(sync_client):
    """Verifica los diferentes criterios de ordenación: tiempo_total, tiempo_medio, llamadas."""
    for criterio in ["tiempo_total", "tiempo_medio", "llamadas"]:
        resp = sync_client.get(
            "/api/v1/health/database/queries",
            params={"limite": 5, "ordenar_por": criterio},
        )
        assert resp.status_code == 200
        data = resp.json()
        queries = data["top_queries"]
        if len(queries) >= 2:
            if criterio == "tiempo_total":
                assert queries[0]["total_ms"] >= queries[1]["total_ms"]
            elif criterio == "tiempo_medio":
                assert queries[0]["mean_ms"] >= queries[1]["mean_ms"]
            elif criterio == "llamadas":
                assert queries[0]["calls"] >= queries[1]["calls"]


def test_database_queries_validacion_parametros(sync_client):
    """Verifica que parámetros inválidos sean rechazados con HTTP 422."""
    resp_limite_alto = sync_client.get("/api/v1/health/database/queries", params={"limite": 100})
    assert resp_limite_alto.status_code == 422

    resp_limite_cero = sync_client.get("/api/v1/health/database/queries", params={"limite": 0})
    assert resp_limite_cero.status_code == 422

    resp_orden_invalido = sync_client.get("/api/v1/health/database/queries", params={"ordenar_por": "inventado"})
    assert resp_orden_invalido.status_code == 422


def test_sanitizar_consulta_sql_unit():
    """Valida los guardrails de sanitización de texto SQL: colapso de espacios, enmascaramiento y recorte."""
    # 1. Colapso de espacios y saltos de línea
    raw_multiline = "SELECT   id,   nombre\n\tFROM   territorio\nWHERE activo = true"
    esperado_multiline = "SELECT id, nombre FROM territorio WHERE activo = true"
    assert sanitizar_consulta_sql(raw_multiline) == esperado_multiline

    # 2. Enmascaramiento de contraseñas y tokens
    raw_pwd = "SELECT * FROM auth_usuario WHERE email = 'auditor@polis.gov.co' AND password = 'mi_super_secreto_123'"
    sanitizado_pwd = sanitizar_consulta_sql(raw_pwd)
    assert "mi_super_secreto_123" not in sanitizado_pwd
    assert "password='***'" in sanitizado_pwd

    raw_token = "UPDATE sesiones SET token: 'bearer_token_xyz987' WHERE id = 1"
    sanitizado_token = sanitizar_consulta_sql(raw_token)
    assert "bearer_token_xyz987" not in sanitizado_token
    assert "token:'***'" in sanitizado_token

    raw_clave = "UPDATE usuarios SET clave = 'clave12345' WHERE usuario = 'admin'"
    sanitizado_clave = sanitizar_consulta_sql(raw_clave)
    assert "clave12345" not in sanitizado_clave
    assert "clave='***'" in sanitizado_clave

    # 3. Recorte a máximo 200 caracteres con puntos suspensivos
    larga = "SELECT " + ", ".join([f"campo_{i} AS alias_muy_largo_{i}" for i in range(50)]) + " FROM gran_tabla"
    sanitizada_larga = sanitizar_consulta_sql(larga, max_chars=200)
    assert len(sanitizada_larga) == 200
    assert sanitizada_larga.endswith("...")

    # 4. Manejo de texto vacío
    assert sanitizar_consulta_sql("") == ""


def test_database_queries_telemetry_resilience(sync_client):
    """Verifica que si la BD o pg_stat_statements arroja excepción, el servicio responda con status 'unavailable'."""
    from unittest.mock import AsyncMock

    from sqlalchemy.exc import OperationalError

    from app.modules.health.router import get_health_service
    from app.modules.health.service import HealthService

    mock_repo = AsyncMock()
    mock_repo.obtener_telemetria_consultas.side_effect = OperationalError("SELECT *", {}, Exception("DB down"))

    sync_client.app.dependency_overrides[get_health_service] = lambda: HealthService(mock_repo)
    try:
        resp = sync_client.get("/api/v1/health/database/queries")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "unavailable"
        assert data["top_queries"] == []
    finally:
        sync_client.app.dependency_overrides.pop(get_health_service, None)
