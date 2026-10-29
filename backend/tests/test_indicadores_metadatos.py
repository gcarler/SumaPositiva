import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.auditoria.models import RegistroAuditoria


@pytest.fixture
def sync_client(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app, headers=cabeceras_gestion) as client:
        yield client


def test_actualizar_metadatos_institucionales_exitoso(database_url: str, sync_client):
    # 1. Obtener fichas existentes
    resp = sync_client.get("/api/v1/indicadores/fichas")
    assert resp.status_code == 200
    fichas = resp.json()
    assert len(fichas) > 0

    ficha_objetivo = fichas[0]
    ficha_id = ficha_objetivo["id"]
    linea_base_original = ficha_objetivo["linea_base_valor"]
    metodo_calculo_original = ficha_objetivo["metodo_calculo"]

    # 2. Actualizar metadatos institucionales
    nuevos_datos = {
        "responsable_reporte": "Secretaría del Interior y Convivencia Ciudadana",
        "fuente_datos": "MECAR - Sistema Estadístico SIEDCO Distrital",
        "periodicidad": "Trimestral",
        "metadatos": {
            "contacto_tecnico": "Enlace Técnico Distrital",
            "email_contacto": "seguridad@cartagena.gov.co",
            "telefono_contacto": "+57 605 6411370",
            "fecha_proxima_actualizacion": "2026-11-30",
        },
    }

    resp_patch = sync_client.patch(f"/api/v1/indicadores/fichas/{ficha_id}", json=nuevos_datos)
    assert resp_patch.status_code == 200, resp_patch.text
    data = resp_patch.json()

    assert data["responsable_reporte"] == "Secretaría del Interior y Convivencia Ciudadana"
    assert data["fuente_datos"] == "MECAR - Sistema Estadístico SIEDCO Distrital"
    assert data["periodicidad"] == "Trimestral"
    assert data["metadatos"]["contacto_tecnico"] == "Enlace Técnico Distrital"
    assert data["metadatos"]["fecha_proxima_actualizacion"] == "2026-11-30"

    # Verificar que los campos protegidos DNP permanecen inalterados
    assert data["linea_base_valor"] == linea_base_original
    assert data["metodo_calculo"] == metodo_calculo_original

    # 3. Verificar persistencia de auditoría forense inmutable
    import asyncio

    async def verificar_auditoria():
        engine = create_async_engine(database_url, hide_parameters=True)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            res = await session.execute(
                select(RegistroAuditoria)
                .where(
                    RegistroAuditoria.registro_id == uuid.UUID(ficha_id),
                    RegistroAuditoria.accion == "ACTUALIZAR_METADATOS_FICHA_INDICADOR",
                )
                .order_by(RegistroAuditoria.creado_en.desc())
            )
            auditoria = res.scalars().first()
            assert auditoria is not None
            assert auditoria.tabla_afectada == "indicadores.fichas_tecnicas_indicadores"
            assert auditoria.causal == "tecnica"
            assert "responsable_reporte" in auditoria.metadatos["campos_modificados"]
        await engine.dispose()

    asyncio.run(verificar_auditoria())


def test_salvaguarda_dnp_prohibe_alterar_formula_o_linea_base(sync_client):
    resp = sync_client.get("/api/v1/indicadores/fichas")
    assert resp.status_code == 200
    ficha_id = resp.json()[0]["id"]

    # Intento de alterar línea base valor
    intento_linea_base = {"linea_base_valor": 999999.0}
    resp_lb = sync_client.patch(f"/api/v1/indicadores/fichas/{ficha_id}", json=intento_linea_base)
    assert resp_lb.status_code == 400
    assert "Salvaguarda institucional" in resp_lb.json()["detail"]
    assert "linea_base_valor" in resp_lb.json()["detail"]

    # Intento de alterar método de cálculo matemático
    intento_formula = {"metodo_calculo": "formula_no_autorizada()"}
    resp_form = sync_client.patch(f"/api/v1/indicadores/fichas/{ficha_id}", json=intento_formula)
    assert resp_form.status_code == 400
    assert "Salvaguarda institucional" in resp_form.json()["detail"]
    assert "metodo_calculo" in resp_form.json()["detail"]

    # Intento de inyectar alteración de línea base dentro de metadatos
    intento_metadatos = {"metadatos": {"linea_base_valor": 12345}}
    resp_meta = sync_client.patch(f"/api/v1/indicadores/fichas/{ficha_id}", json=intento_metadatos)
    assert resp_meta.status_code == 400
    assert "Salvaguarda institucional" in resp_meta.json()["detail"]


def test_seguridad_rbac_actualizar_metadatos_indicador(database_url: str, sync_client):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    ficha_id = sync_client.get("/api/v1/indicadores/fichas").json()[0]["id"]

    # 1. Petición sin token -> 401 Unauthorized
    with TestClient(app) as anonymous_client:
        resp_anon = anonymous_client.patch(
            f"/api/v1/indicadores/fichas/{ficha_id}",
            json={"responsable_reporte": "Nuevo Responsable"},
        )
        assert resp_anon.status_code == 401

    # 2. Petición sobre ficha inexistente -> 404 Not Found
    uuid_inexistente = uuid.uuid4()
    resp_404 = sync_client.patch(
        f"/api/v1/indicadores/fichas/{uuid_inexistente}",
        json={"responsable_reporte": "Nuevo Responsable"},
    )
    assert resp_404.status_code == 404
