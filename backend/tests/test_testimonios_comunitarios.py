"""Pruebas de integración del módulo de Testimonios Comunitarios y Memoria Social (T6.4)."""

import uuid

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


def test_listar_testimonios_publicos(public_client: TestClient):
    """Verifica que la galería pública solo exponga testimonios aprobados y destacados."""
    resp = public_client.get("/api/v1/testimonios")
    assert resp.status_code == 200
    testimonios = resp.json()
    assert len(testimonios) >= 3

    # Todos los públicos deben ser APROBADO o DESTACADO
    for t in testimonios:
        assert t["estado"] in ("APROBADO", "DESTACADO")

    codigos = [t["codigo_unico"] for t in testimonios]
    assert "TEST-001" in codigos
    assert "TEST-002" in codigos
    assert "TEST-003" in codigos
    # El testimonio pendiente inicial no debe ser público
    assert "TEST-004" not in codigos

    # El primer elemento debe ser el DESTACADO (TEST-001)
    assert testimonios[0]["estado"] == "DESTACADO"

    # Filtrar solo destacados
    resp_dest = public_client.get("/api/v1/testimonios?destacados=true")
    assert resp_dest.status_code == 200
    destacados = resp_dest.json()
    assert all(t["estado"] == "DESTACADO" for t in destacados)


def test_resumen_testimonios(public_client: TestClient):
    """Verifica las métricas agregadas por estado y territorio."""
    resp = public_client.get("/api/v1/testimonios/resumen")
    assert resp.status_code == 200
    datos = resp.json()

    assert datos["total_testimonios"] >= 4
    assert datos["destacados"] >= 1
    assert datos["aprobados"] >= 2
    assert datos["pendientes"] >= 1
    assert isinstance(datos["por_territorio"], list)


def test_crear_testimonio_ciudadano(public_client: TestClient):
    """Verifica la creación cívica de un relato de memoria social."""
    payload = {
        "nombre_autor": "Marta Cecilia Padilla",
        "organizacion_comunitaria": "Veeduría Ciudadana por la Dignidad de Pasacaballos",
        "titulo": "Protegiendo el canal y la tradición afrodescendiente",
        "relato": "Nuestros ancestros navegaron estas aguas. La política pública debe priorizar el empleo local en la zona industrial sin contaminar nuestra bahía.",
        "metadatos_enfoque": {
            "poblacion": "afrodescendiente",
            "sector": "Pasacaballos",
        },
    }

    # 1. Sin autenticación o sesión debe ser rechazado 401
    resp_anon = public_client.post("/api/v1/testimonios", json=payload)
    assert resp_anon.status_code == 401

    # 2. Con ciudadano registrado
    correo = f"ciudadano-{uuid.uuid4().hex[:6]}@cartagena.gov.co"
    clave = "Cartagena2026*"
    resp_reg = public_client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo,
            "contrasena": clave,
            "nombres": "Marta",
            "apellidos": "Padilla",
        },
    )
    assert resp_reg.status_code == 201

    resp_log = public_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo, "contrasena": clave},
    )
    assert resp_log.status_code == 200
    token = resp_log.json()["token_acceso"]

    resp_crear = public_client.post(
        "/api/v1/testimonios",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert resp_crear.status_code == 201
    creado = resp_crear.json()
    assert creado["nombre_autor"] == "Marta Cecilia Padilla"
    assert creado["estado"] == "PENDIENTE"
    assert creado["codigo_unico"].startswith("TEST-")


def test_panel_gestion_y_moderacion(
    sync_client: TestClient,
    public_client: TestClient,
):
    """Verifica el flujo de curaduría y moderación de testimonios para funcionarios."""
    # 1. Denegación sin permisos
    resp_denegada = public_client.get("/api/v1/testimonios/gestion")
    assert resp_denegada.status_code == 401

    # 2. Crear un testimonio dinámico para probar el ciclo de moderación
    correo = f"autor_mod_{uuid.uuid4().hex[:6]}@cartagena.gov.co"
    clave = "Cartagena2026*"
    public_client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo,
            "contrasena": clave,
            "nombres": "Líder",
            "apellidos": "Comunitario",
        },
    )
    resp_log = public_client.post(
        "/api/v1/identidad/login",
        json={"correo": correo, "contrasena": clave},
    )
    token = resp_log.json()["token_acceso"]

    resp_crear = public_client.post(
        "/api/v1/testimonios",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "nombre_autor": "Líder Barrial Dinámico",
            "titulo": "Testimonio para moderación institucional",
            "relato": "Relato que debe pasar por el filtro de curaduría ética institucional.",
        },
    )
    assert resp_crear.status_code == 201
    nuevo_id = resp_crear.json()["id"]
    nuevo_codigo = resp_crear.json()["codigo_unico"]

    # 3. Consulta con autoridad institucional
    resp_gestion = sync_client.get("/api/v1/testimonios/gestion")
    assert resp_gestion.status_code == 200
    todos = resp_gestion.json()
    assert any(t["id"] == nuevo_id and t["estado"] == "PENDIENTE" for t in todos)

    # 4. Intentar rechazar sin motivo debe fallar 422
    resp_fallo = sync_client.put(
        f"/api/v1/testimonios/{nuevo_id}/moderar",
        json={"estado": "RECHAZADO", "motivo_moderacion": ""},
    )
    assert resp_fallo.status_code == 422

    # 5. Aprobar testimonio
    resp_aprobar = sync_client.put(
        f"/api/v1/testimonios/{nuevo_id}/moderar",
        json={
            "estado": "APROBADO",
            "motivo_moderacion": "Testimonio relevante sobre identidad barrial y convivencia.",
        },
    )
    assert resp_aprobar.status_code == 200
    aprobado = resp_aprobar.json()
    assert aprobado["estado"] == "APROBADO"

    # 6. Ahora debe aparecer en la galería pública
    resp_pub = public_client.get("/api/v1/testimonios")
    assert resp_pub.status_code == 200
    codigos_pub = [t["codigo_unico"] for t in resp_pub.json()]
    assert nuevo_codigo in codigos_pub
