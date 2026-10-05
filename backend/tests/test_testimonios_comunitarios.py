"""Pruebas de integración del módulo de Testimonios Comunitarios y Memoria Social (T6.4)."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.testimonios.models import TestimonioComunitario as ModeloTestimonio
from app.modules.testimonios.schemas import TestimonioEdicion as DatosEdicionTestimonio
from app.modules.testimonios.service import TestimoniosService as ServicioTestimonios


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
        "relato": (
            "Nuestros ancestros navegaron estas aguas. La política pública debe priorizar "
            "el empleo "
            "local en la zona industrial sin contaminar nuestra bahía."
        ),
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


def test_editar_testimonio_desde_plataforma_conserva_moderacion(
    sync_client: TestClient, public_client: TestClient
):
    pendiente = next(
        item
        for item in sync_client.get("/api/v1/testimonios/gestion").json()
        if item["estado"] == "PENDIENTE"
    )
    respuesta = sync_client.put(
        f"/api/v1/testimonios/{pendiente['id']}",
        json={
            "nombre_autor": "Autora editada desde POLIS",
            "organizacion_comunitaria": "Colectivo comunitario",
            "territorio_id": None,
            "dimension_id": None,
            "titulo": "Relato actualizado en plataforma",
            "relato": "El equipo editorial corrigió y enriqueció este relato comunitario.",
            "url_foto": None,
            "url_audio_video": None,
            "metadatos_enfoque": {"canal_origen": "plataforma"},
        },
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["titulo"] == "Relato actualizado en plataforma"
    assert respuesta.json()["estado"] == "PENDIENTE"
    lectura_gestion = sync_client.get(f"/api/v1/testimonios/gestion/{pendiente['id']}")
    assert lectura_gestion.status_code == 200
    assert lectura_gestion.json()["titulo"] == "Relato actualizado en plataforma"

    # Una ruta pública nunca revela relatos pendientes, incluso si se conoce su UUID.
    assert public_client.get(f"/api/v1/testimonios/{pendiente['id']}").status_code == 404


@pytest.mark.integration
@pytest.mark.anyio
async def test_fallo_despues_de_editar_testimonio_revierte(database_url):
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            original = await session.scalar(
                select(ModeloTestimonio).where(ModeloTestimonio.codigo_unico == "TEST-004")
            )
            assert original is not None
            testimonio_id = original.id
            titulo_anterior = original.titulo
            service = ServicioTestimonios(session)
            guardar_real = service.repository.actualizar_contenido

            async def guardar_y_fallar(testimonio, datos):
                await guardar_real(testimonio, datos)
                raise RuntimeError("fallo inyectado después del flush editorial")

            service.repository.actualizar_contenido = guardar_y_fallar
            with pytest.raises(RuntimeError, match="después del flush editorial"):
                await service.editar_testimonio(
                    testimonio_id,
                    DatosEdicionTestimonio(
                        nombre_autor="Nombre para rollback",
                        titulo="Título de rollback posterior al flush",
                        relato="Relato de prueba con cambio editorial que debe revertirse.",
                    ),
                )

        async with sessions() as verificacion:
            persistido = await verificacion.get(ModeloTestimonio, testimonio_id)
            assert persistido is not None
            assert persistido.titulo == titulo_anterior
            assert persistido.nombre_autor != "Nombre para rollback"
    finally:
        await engine.dispose()
