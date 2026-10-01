"""Pruebas de integración del módulo de Asistencia y Participación Multicanal Desagregada (T6.3)."""

import uuid
from datetime import date

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


@pytest.fixture
def public_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_tablero_consolidado_distrital(sync_client: TestClient):
    """Verifica el cálculo distrital unificado sin duplicidades y proporciones multicanal."""
    resp = sync_client.get("/api/v1/participacion/consolidado")
    assert resp.status_code == 200
    datos = resp.json()

    # Estructura del tablero
    assert "gran_total_participantes_distrital" in datos
    assert "total_canal_web" in datos
    assert "total_canal_mesas" in datos
    assert "total_canal_escenarios" in datos
    assert "participantes_unicos_identificados" in datos
    assert "porcentaje_canal_web" in datos
    assert "porcentaje_canal_mesas" in datos
    assert "porcentaje_canal_escenarios" in datos
    assert "desglose_territorial_agregado" in datos
    assert "fecha_corte" in datos

    # Verificación matemática estricta:
    # Gran Total = Sujetos Identificados Unificados (Canal 1 ∪ Canal 2) + Asistentes Escenarios (Canal 3)
    gran_total = datos["gran_total_participantes_distrital"]
    unificados = datos["participantes_unicos_identificados"]
    escenarios = datos["total_canal_escenarios"]
    assert gran_total == unificados + escenarios

    # Semillas de escenarios garantizan al menos 570 asistentes
    assert escenarios >= 570
    assert gran_total >= 570


def test_desglose_canal_web(sync_client: TestClient):
    """Verifica la desagregación analítica por Línea Estratégica, Dimensión y Territorio."""
    resp = sync_client.get("/api/v1/participacion/canal-web")
    assert resp.status_code == 200
    datos = resp.json()

    assert "total_aportes" in datos
    assert "total_apoyos" in datos
    assert "total_respuestas_formularios" in datos
    assert "participantes_unicos_web" in datos
    assert isinstance(datos["por_linea_estrategica"], list)
    assert isinstance(datos["por_dimension"], list)
    assert isinstance(datos["por_territorio"], list)

    # Si hay registros de líneas estratégicas, validar su formato
    if datos["por_linea_estrategica"]:
        linea = datos["por_linea_estrategica"][0]
        assert "linea_id" in linea
        assert "codigo" in linea
        assert "titulo" in linea
        assert "total_aportes" in linea


def test_desglose_canal_mesas(sync_client: TestClient):
    """Verifica la desagregación jerárquica ltree de mesas, submesas temáticas y actas C-150/15."""
    resp = sync_client.get("/api/v1/participacion/canal-mesas")
    assert resp.status_code == 200
    datos = resp.json()

    assert "total_mesas_principales" in datos
    assert "total_submesas" in datos
    assert "total_participantes" in datos
    assert "participantes_unicos_mesas" in datos
    assert "total_actas_cerradas" in datos
    assert isinstance(datos["jerarquia_mesas"], list)

    if datos["jerarquia_mesas"]:
        mesa = datos["jerarquia_mesas"][0]
        assert "id" in mesa
        assert "codigo" in mesa
        assert "nombre" in mesa
        assert "tipo_mesa" in mesa
        assert "path" in mesa
        assert "asistentes_conteo" in mesa
        assert "acta_firmada" in mesa
        assert "submesas" in mesa


def test_desglose_canal_escenarios_y_catalogo(sync_client: TestClient):
    """Verifica el registro cuantificado de escenarios especiales de co-creación."""
    resp = sync_client.get("/api/v1/participacion/canal-escenarios")
    assert resp.status_code == 200
    datos = resp.json()

    assert datos["total_asistentes"] >= 570
    assert datos["total_escenarios"] >= 3
    assert "por_tipo" in datos
    assert isinstance(datos["escenarios"], list)

    # Validar catálogo público y filtros
    resp_cat = sync_client.get("/api/v1/participacion/escenarios-especiales")
    assert resp_cat.status_code == 200
    escenarios = resp_cat.json()
    assert len(escenarios) >= 3

    codigos = [e["codigo_unico"] for e in escenarios]
    assert "ESC-001" in codigos
    assert "ESC-002" in codigos
    assert "ESC-003" in codigos

    # Filtrar por tipo CONSULTA_PREVIA
    resp_cp = sync_client.get("/api/v1/participacion/escenarios-especiales?tipo=CONSULTA_PREVIA")
    assert resp_cp.status_code == 200
    cp_list = resp_cp.json()
    assert all(e["tipo_escenario"] == "CONSULTA_PREVIA" for e in cp_list)
    assert any(e["codigo_unico"] == "ESC-001" for e in cp_list)


def test_escenarios_especiales_crud_y_control_acceso(
    sync_client: TestClient,
    public_client: TestClient,
):
    """Verifica la creación y actualización con permiso asistencia:verificar y denegación a ciudadanos."""
    codigo_nuevo = f"ESC-TEST-{uuid.uuid4().hex[:8]}"

    payload = {
        "codigo_unico": codigo_nuevo,
        "nombre": "Mesa Especial de Diálogo Pescadores Barú",
        "tipo_escenario": "TALLER_FOCAL",
        "fecha": str(date.today()),
        "lugar": "Polideportivo Corregimiento de Barú",
        "entidad_convocante": "Secretaría del Interior y Convivencia Ciudadana",
        "total_asistentes": 85,
        "desglose_poblacional": {
            "pescadores": 60,
            "mujeres_lideresas": 25,
        },
        "sintesis_acuerdos": "Acuerdos de salvaguarda cultural y ordenamiento de playas comunitarias.",
        "estado": "REALIZADO",
    }

    # 1. Petición sin token debe ser rechazada 401
    resp_anon = public_client.post("/api/v1/participacion/escenarios-especiales", json=payload)
    assert resp_anon.status_code == 401

    # 2. Petición de ciudadano regular debe ser rechazada 403 (falta permiso asistencia:verificar)
    correo_ciu = f"ciudadano-{uuid.uuid4().hex[:6]}@cartagena.gov.co"
    clave_ciu = "Ciudadano2026*"
    resp_reg = public_client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo_ciu,
            "contrasena": clave_ciu,
            "nombres": "Pedro",
            "apellidos": "Heredia",
        },
    )
    assert resp_reg.status_code == 201

    resp_login = public_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo_ciu, "contrasena": clave_ciu},
    )
    assert resp_login.status_code == 200
    token_ciu = resp_login.json()["token_acceso"]

    resp_ciu = public_client.post(
        "/api/v1/participacion/escenarios-especiales",
        headers={"Authorization": f"Bearer {token_ciu}"},
        json=payload,
    )
    assert resp_ciu.status_code == 403

    # 3. Petición con cabeceras_gestion (autoridad_distrital) debe ser aceptada 201
    resp_crear = sync_client.post("/api/v1/participacion/escenarios-especiales", json=payload)
    assert resp_crear.status_code == 201
    creado = resp_crear.json()
    assert creado["codigo_unico"] == codigo_nuevo
    assert creado["total_asistentes"] == 85
    nuevo_id = creado["id"]

    # 4. Consulta por ID debe ser pública 200
    resp_obtener = public_client.get(f"/api/v1/participacion/escenarios-especiales/{nuevo_id}")
    assert resp_obtener.status_code == 200
    assert resp_obtener.json()["id"] == nuevo_id

    # 5. Actualización con permisos debe ser 200
    resp_actualizar = sync_client.put(
        f"/api/v1/participacion/escenarios-especiales/{nuevo_id}",
        json={
            "total_asistentes": 95,
            "sintesis_acuerdos": "Ampliación de acuerdos de salvaguarda y cronograma concertado.",
        },
    )
    assert resp_actualizar.status_code == 200
    actualizado = resp_actualizar.json()
    assert actualizado["total_asistentes"] == 95
    assert "Ampliación" in actualizado["sintesis_acuerdos"]
