"""Pruebas de verificación de ingesta y certificación de indicadores reales (INGESTA-DATOS-01)."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client_indicadores(database_url):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
    )
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_catalogo_fichas_con_mediciones_reales(client_indicadores):
    resp = client_indicadores.get("/api/v1/indicadores/fichas")
    assert resp.status_code == 200, resp.text
    fichas = resp.json()
    assert len(fichas) == 11, f"Se esperaban 11 fichas técnicas, se obtuvieron {len(fichas)}"

    codigos_esperados = {
        "IND-INS-01", "IND-INS-02",
        "IND-PROD-01", "IND-PROD-02", "IND-PROD-03",
        "IND-RES-01", "IND-RES-02", "IND-RES-03",
        "IND-IMP-01", "IND-IMP-02", "IND-IMP-03"
    }
    codigos_obtenidos = {f["codigo"] for f in fichas}
    assert codigos_obtenidos == codigos_esperados

    for f in fichas:
        codigo = f["codigo"]
        assert f["tiene_mediciones"] is True, f"{codigo} debe tener tiene_mediciones=True"
        assert float(f["valor_actual"]) > 0, f"{codigo} debe tener valor_actual > 0"
        assert float(f["porcentaje_avance"]) > 0, f"{codigo} debe tener porcentaje_avance > 0"
        assert f["fecha_corte_ultimo_reporte"] is not None, f"{codigo} debe tener fecha_corte"
        assert f["periodo_ultimo_reporte"] == "2024-ANUAL", f"{codigo} debe tener periodo 2024-ANUAL"

        # Salvaguardas terminológicas
        assert "DNP" not in f["fuente_datos"], f"{codigo} contiene acrónimo ajeno DNP en fuente_datos"
        assert "MEBAR" not in f["fuente_datos"], f"{codigo} no debe referenciar MEBAR (Barranquilla)"


def test_cadena_valor_indicadores_activa(client_indicadores):
    resp = client_indicadores.get("/api/v1/indicadores/cadena-valor")
    assert resp.status_code == 200, resp.text
    cadena = resp.json()

    assert "insumo" in cadena and len(cadena["insumo"]) >= 2
    assert "producto" in cadena and len(cadena["producto"]) >= 3
    assert "resultado" in cadena and len(cadena["resultado"]) >= 3

    for grupo in ("insumo", "producto", "resultado"):
        for f in cadena[grupo]:
            assert f["tiene_mediciones"] is True
            assert float(f["valor_actual"]) > 0
            assert float(f["porcentaje_avance"]) > 0
