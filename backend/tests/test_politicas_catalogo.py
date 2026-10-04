import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


def test_catalogo_politicas_publicas_distrital(database_url: str):
    """Verifica que GET /api/v1/politicas exponga el catálogo canónico de Cartagena (H-06)."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        response = client.get("/api/v1/politicas")
        assert response.status_code == 200
        politicas = response.json()
        assert isinstance(politicas, list)
        assert len(politicas) >= 1

        politica = politicas[0]
        assert politica["id"] == "pol-001"
        assert politica["slug"] == "seguridad-humana-cartagena"
        assert "Seguridad Humana" in politica["titulo"]
        assert politica["sector"] == "seguridad"
        assert politica["estado"] == "consulta_publica"
        assert "Cartagena" in politica["cobertura"]
        assert "fechaInicio" in politica or "fecha_inicio" in politica
        assert "fechaCierre" in politica or "fecha_cierre" in politica
        assert "participantes" in politica
        assert politica["participantes"] is None or (isinstance(politica["participantes"], int) and politica["participantes"] >= 0)
        assert isinstance(politica["fases"], list)
        assert len(politica["fases"]) >= 3

        fase1 = politica["fases"][0]
        assert "id" in fase1
        assert "nombre" in fase1
        assert "orden" in fase1
        assert "progreso" in fase1
        assert isinstance(fase1["progreso"], (int, float))
        assert "lineas" in fase1
        assert isinstance(fase1["lineas"], list)
