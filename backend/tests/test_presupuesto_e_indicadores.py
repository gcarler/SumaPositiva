from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def sync_client(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app, headers=cabeceras_gestion) as client:
        yield client


def test_presupuesto_fuentes_financiacion(sync_client):
    # Probar que existan fuentes sembradas (FONSET, SGP, etc.)
    resp = sync_client.get("/api/v1/presupuesto/fuentes")
    assert resp.status_code == 200
    fuentes = resp.json()
    assert len(fuentes) >= 5
    codigos = [f["codigo"] for f in fuentes]
    assert "FONSET" in codigos
    assert "SGP-PROPOSITO-GENERAL" in codigos


def test_presupuesto_asignaciones_y_costeo(sync_client):
    # Obtener FONSET
    fuentes = sync_client.get("/api/v1/presupuesto/fuentes").json()
    fonset = next(f for f in fuentes if f["codigo"] == "FONSET")

    anio_actual = datetime.now().year

    # Crear una asignacion normal
    resp_asig1 = sync_client.post(
        "/api/v1/presupuesto/asignaciones",
        json={
            "fuente_financiacion_id": fonset["id"],
            "monto_estimado": 50000000.00,
            "anio_vigencia": anio_actual,
            "justificacion": "Cámaras de seguridad",
        },
    )
    assert resp_asig1.status_code == 201

    # Crear una asignación con vigencias futuras pero sin marcar el flag (debe fallar 400)
    resp_falla = sync_client.post(
        "/api/v1/presupuesto/asignaciones",
        json={
            "fuente_financiacion_id": fonset["id"],
            "monto_estimado": 100000000.00,
            "anio_vigencia": anio_actual + 1,
            "justificacion": "Vigencia futura incorrecta",
        },
    )
    assert resp_falla.status_code == 400

    # Crear una asignación de vigencia futura legal
    resp_asig2 = sync_client.post(
        "/api/v1/presupuesto/asignaciones",
        json={
            "fuente_financiacion_id": fonset["id"],
            "monto_estimado": 150000000.00,
            "anio_vigencia": anio_actual + 1,
            "es_vigencia_futura": True,
            "tipo_vigencia_futura": "Excepcional",
            "justificacion": "Megacolegio fase 2",
        },
    )
    assert resp_asig2.status_code == 201

    # Vigencias futuras excepcionales (Ley 1483/11) que exceden límite máximo de 10 años
    resp_excede = sync_client.post(
        "/api/v1/presupuesto/asignaciones",
        json={
            "fuente_financiacion_id": fonset["id"],
            "monto_estimado": 200000000.00,
            "anio_vigencia": anio_actual + 15,
            "es_vigencia_futura": True,
            "justificacion": "Vigencia que excede 10 años",
        },
    )
    assert resp_excede.status_code == 400

    # Resumen de costeo
    resp_costeo = sync_client.get("/api/v1/presupuesto/resumen-costeo")
    assert resp_costeo.status_code == 200
    costeo = resp_costeo.json()
    assert float(costeo["total_asignado"]) > 0
    assert len(costeo["por_fuente"]) >= 1
    assert len(costeo["por_vigencia"]) >= 1


def test_indicadores_cadena_valor_y_avance(sync_client):
    # Probar que existan fichas sembradas
    resp_fichas = sync_client.get("/api/v1/indicadores/fichas")
    assert resp_fichas.status_code == 200
    fichas = resp_fichas.json()
    assert len(fichas) >= 8

    # Tomar indicador ascendente (IND-INS-01: FONSET asignado)
    ind_asc = next(f for f in fichas if f["codigo"] == "IND-INS-01")
    assert ind_asc["sentido_esperado"] == "ascendente"
    assert float(ind_asc["linea_base_valor"]) == 1000000000.0
    assert float(ind_asc["meta_cuatrienio"]) == 4000000000.0

    # Registrar medición ascendente: subimos a 2500000000 (50% de avance entre 1000 y 4000)
    resp_med1 = sync_client.post(
        f"/api/v1/indicadores/fichas/{ind_asc['id']}/mediciones",
        json={
            "periodo": "Q1",
            "fecha_corte": date.today().isoformat(),
            "valor_medido": 2500000000.0,
            "registrado_por": "Analista Juan",
        },
    )
    assert resp_med1.status_code == 201
    assert float(resp_med1.json()["avance_acumulado"]) == 50.0

    # Tomar indicador descendente (IND-RES-01: Tasa Homicidios)
    ind_desc = next(f for f in fichas if f["codigo"] == "IND-RES-01")
    assert ind_desc["sentido_esperado"] == "descendente"
    assert float(ind_desc["linea_base_valor"]) == 32.5
    assert float(ind_desc["meta_cuatrienio"]) == 25.0

    # Registrar medición descendente: bajamos de 32.5 a 28.75 (50% avance)
    resp_med2 = sync_client.post(
        f"/api/v1/indicadores/fichas/{ind_desc['id']}/mediciones",
        json={
            "periodo": "Mes 1",
            "fecha_corte": date.today().isoformat(),
            "valor_medido": 28.75,
            "registrado_por": "Analista Maria",
        },
    )
    assert resp_med2.status_code == 201
    assert float(resp_med2.json()["avance_acumulado"]) == 50.0

    # Obtener cadena de valor
    resp_cadena = sync_client.get("/api/v1/indicadores/cadena-valor")
    assert resp_cadena.status_code == 200
    cadena = resp_cadena.json()
    assert "insumo" in cadena
    assert "producto" in cadena
    assert "resultado" in cadena
    assert len(cadena["insumo"]) >= 2
    assert len(cadena["resultado"]) >= 3
