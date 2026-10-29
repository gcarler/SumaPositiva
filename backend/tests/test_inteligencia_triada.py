"""Contrato HTTP de los seis motores analíticos de la Triada."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client_inteligencia(database_url):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_siete_endpoints_inteligencia_entregan_contratos_analiticos(client_inteligencia):
    base = "/api/v1/compromisos/triada/inteligencia"
    paths = {
        "patologias-dnp": {"resumen_global", "ranking_entidades_dnp", "casos_criticos"},
        "continuidad-gobiernos": {
            "comparativa_periodos",
            "continuidad_bpim",
            "migracion_dimensiones_seguridad",
            "metas_recicladas",
        },
        "radar-transparencia": {
            "archivos_corte_clonado",
            "clones_tabulares_mismo_corte",
            "metas_congeladas_zombies",
            "efecto_diciembre_magico",
            "matriz_completitud_entidades",
        },
        "alineacion-territorial": {"resumen_territorial", "localidades", "barrios_foco"},
        "buscador": {
            "consulta",
            "total_coincidencias",
            "presupuesto_asociado",
            "entidades_involucradas",
            "evolucion_anual",
            "alertas_duplicidad_institucional",
            "muestra_registros",
        },
        "simulador-cierre": {
            "horizonte",
            "resumen_prediccion",
            "proyecciones_por_entidad",
            "proyecciones_por_dimension",
        },
        "resumen-ejecutivo": {
            "universo",
            "motor_1_patologias",
            "motor_2_continuidad",
            "motor_3_transparencia",
            "motor_4_territorial",
            "motor_5_buscador_destacado",
            "motor_6_simulador_2027",
        },
    }
    responses = {}
    for endpoint in paths:
        response = client_inteligencia.get(f"{base}/{endpoint}")
        assert response.status_code == 200, f"{endpoint}: {response.text}"
        responses[endpoint] = response.json()
        assert paths[endpoint] <= responses[endpoint].keys()

    assert len(responses["patologias-dnp"]["ranking_entidades_dnp"]) == 30
    assert len(responses["continuidad-gobiernos"]["comparativa_periodos"]) == 3
    assert len(responses["radar-transparencia"]["matriz_completitud_entidades"]) == 30
    assert len(responses["alineacion-territorial"]["localidades"]) == 3
    m1 = responses["patologias-dnp"]["resumen_global"]
    classified = m1["actividades_verbo_fuerte"] + m1["actividades_verbo_debil"]
    assert 0 <= classified <= m1["total_actividades_evaluadas"]
    assert responses["alineacion-territorial"]["resumen_territorial"]["total_registros_triada_territorializados"] >= 0
    assert responses["buscador"]["consulta"]["q"] == "seguridad"
    assert responses["simulador-cierre"]["horizonte"]["anio_cierre"] == 2027


def test_inteligencia_valida_filtros_y_limites(client_inteligencia):
    base = "/api/v1/compromisos/triada/inteligencia"
    invalid_dimension = client_inteligencia.get(f"{base}/patologias-dnp", params={"dimension": "Dimensión ajena"})
    invalid_period = client_inteligencia.get(f"{base}/buscador", params={"periodo": "PERIODO_AJENO"})
    invalid_search = client_inteligencia.get(f"{base}/buscador", params={"q": "x"})
    assert invalid_dimension.status_code == 422
    assert invalid_period.status_code == 422
    assert invalid_search.status_code == 422
