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


def test_gating_fases_ciclo_progresos_y_aportes_lineas(database_url: str):
    """Verifica [FASES-CICLO-01] y [LINEAS-APORTES-01]:
    Fase 1 al 15% (activa), Fases 2 y 3 al 0% (preparatoria), y conteo real de aportes en líneas.
    """
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Verificar catálogo consolidado /api/v1/politicas
        res_pol = client.get("/api/v1/politicas")
        assert res_pol.status_code == 200
        fases = res_pol.json()[0]["fases"]
        fase_diag = next(f for f in fases if f["orden"] == 1)
        fase_form = next(f for f in fases if f["orden"] == 2)
        fase_plan = next(f for f in fases if f["orden"] == 3)

        assert fase_diag["estado"] == "activa"
        assert fase_diag["progreso"] == 15.0

        assert fase_form["estado"] == "proxima"
        assert fase_form["progreso"] == 0.0

        assert fase_plan["estado"] == "proxima"
        assert fase_plan["progreso"] == 0.0

        # 2. Verificar endpoint público /api/v1/politicas/fases
        res_fases = client.get("/api/v1/politicas/fases")
        assert res_fases.status_code == 200
        fases_list = res_fases.json()
        f1 = next(f for f in fases_list if f["codigo"] == "FASE_1_DIAGNOSTICO")
        f2 = next(f for f in fases_list if f["codigo"] == "FASE_2_FORMULACION")
        f3 = next(f for f in fases_list if f["codigo"] == "FASE_3_PLAN_ACCION")

        assert f1["estado"] == "activa"
        assert float(f1["progreso_porcentaje"]) == 15.0

        assert f2["estado"] == "preparatoria"
        assert float(f2["progreso_porcentaje"]) == 0.0

        assert f3["estado"] == "preparatoria"
        assert float(f3["progreso_porcentaje"]) == 0.0

        # 3. Verificar endpoint público /api/v1/politicas/lineas con aportes_count
        res_lineas = client.get("/api/v1/politicas/lineas")
        assert res_lineas.status_code == 200
        lineas = res_lineas.json()
        assert len(lineas) >= 7
        for linea in lineas:
            assert "aportes_count" in linea
            assert isinstance(linea["aportes_count"], int)
            assert linea["aportes_count"] >= 0

