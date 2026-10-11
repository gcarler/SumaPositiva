"""Pruebas de radicación ciudadana inmutable y motor transaccional de notificaciones.

Tarea: [NOTIF-FEEDBACK-01]
Plan Maestro: Fase 2 - Ingesta de Datos Vivos y Feedback Loop
"""

import re
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import (
    PropuestaCiudadanaCreate,
    PropuestaCiudadanaUpdate,
)
from app.modules.aportes.service import AporteService
from app.modules.geodatos.models import Territorio
from app.modules.identidad.security import crear_token_acceso
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.service import NotificacionService
from app.modules.politicas.models import (
    DimensionSeguridadHumana,
    FasePolitica,
    LineaEstrategica,
)

pytestmark = pytest.mark.anyio


@pytest.fixture
async def session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


@pytest.fixture
async def contexto_base(session):
    res_fase = await session.execute(select(FasePolitica).limit(1))
    fase = res_fase.scalar_one()

    res_dim = await session.execute(select(DimensionSeguridadHumana).limit(1))
    dim = res_dim.scalar_one()

    res_ter = await session.execute(select(Territorio).limit(1))
    territorio = res_ter.scalar_one()

    res_linea = await session.execute(
        select(LineaEstrategica).where(LineaEstrategica.fase_id == fase.id).limit(1)
    )
    linea = res_linea.scalar_one_or_none()
    if not linea:
        linea = LineaEstrategica(
            fase_id=fase.id,
            codigo="LN-TEST-RAD",
            titulo="Línea Estratégica para Radicación",
            descripcion="Descripción de prueba de radicación",
            orden=1,
        )
        session.add(linea)
        await session.flush()
        await session.refresh(linea)

    return {
        "fase_id": fase.id,
        "dimension_id": dim.id,
        "territorio_id": territorio.id,
        "linea_id": linea.id,
    }


async def test_radicacion_atomica_formato_oficial(session, contexto_base):
    """Verifica que cada nuevo aporte reciba un radicado inmutable POL-2026-XXXX secuencial."""
    service = AporteService(AporteRepository(session))

    p1 = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Propuesta Comunitaria de Seguridad 1",
            descripcion="Descripción para verificación de secuencia de radicación 1",
            autor_nombre="Vecino El Pozón",
            es_anonimo=False,
        )
    )
    p2 = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Propuesta Comunitaria de Seguridad 2",
            descripcion="Descripción para verificación de secuencia de radicación 2",
            autor_nombre="Vecina Nelson Mandela",
            es_anonimo=False,
        )
    )

    assert p1.codigo_radicado is not None
    assert p2.codigo_radicado is not None
    assert re.match(r"^POL-2026-\d{4,}$", p1.codigo_radicado)
    assert re.match(r"^POL-2026-\d{4,}$", p2.codigo_radicado)

    num1 = int(p1.codigo_radicado.split("-")[-1])
    num2 = int(p2.codigo_radicado.split("-")[-1])
    assert num2 == num1 + 1


async def test_despacho_resiliente_notificacion_radicacion(session, contexto_base):
    """Verifica que si se suministra correo_contacto se persista la constancia transaccional."""
    service = AporteService(AporteRepository(session))

    correo_test = "lider.comunitario@cartagena.gov.co"
    p = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Iluminación pública en caño San Francisco",
            descripcion="Instalación de luminarias LED solares para prevenir delitos nocturnos",
            autor_nombre="Líder Comunitario San Francisco",
            es_anonimo=False,
            correo_contacto=correo_test,
        )
    )

    # Verificar registro en notificaciones_transaccionales
    stmt = (
        select(NotificacionTransaccional)
        .where(NotificacionTransaccional.codigo_radicado == p.codigo_radicado)
        .order_by(NotificacionTransaccional.creado_en.desc())
    )
    res = await session.execute(stmt)
    notif = res.scalar_one_or_none()

    assert notif is not None
    assert notif.destinatario_correo == correo_test
    assert notif.tipo_evento == "radicacion"
    assert p.codigo_radicado in notif.asunto
    assert p.codigo_radicado in notif.cuerpo_html
    assert "Cartagena Ciudad de Derechos" in notif.cuerpo_html
    assert notif.estado_envio in ("simulado", "enviado")


async def test_notificacion_cambio_estado(session, contexto_base):
    """Verifica que el cambio de estado de la propuesta despache notificación si hay correo registrado."""
    service = AporteService(AporteRepository(session))

    correo_test = "vocera.baru@cartagena.gov.co"
    propuesta = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Muelle pesquero comunitario en Barú",
            descripcion="Fortalecimiento de la seguridad alimentaria e ingresos de pescadores",
            autor_nombre="Vocera Barú",
            es_anonimo=False,
            correo_contacto=correo_test,
        )
    )

    # Actualizar estado a 'en_revision'
    await service.actualizar_propuesta(
        propuesta.id,
        PropuestaCiudadanaUpdate(estado="en_revision"),
    )

    # Verificar que exista la notificación de cambio de estado
    stmt = (
        select(NotificacionTransaccional)
        .where(
            NotificacionTransaccional.codigo_radicado == propuesta.codigo_radicado,
            NotificacionTransaccional.tipo_evento == "cambio_estado",
        )
    )
    res = await session.execute(stmt)
    notif = res.scalar_one_or_none()

    assert notif is not None
    assert notif.destinatario_correo == correo_test
    assert "EN REVISION" in notif.cuerpo_html or "EN_REVISION" in notif.cuerpo_html


async def test_endpoint_publico_consulta_radicado(session, contexto_base):
    """Verifica el endpoint GET /api/v1/notificaciones/radicado/{codigo_radicado}."""
    service = AporteService(AporteRepository(session))

    propuesta = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Comedor Comunitario Nelson Mandela",
            descripcion="Dotación integral para el comedor de primera infancia",
            autor_nombre="Madre Comunitaria",
            es_anonimo=False,
        )
    )

    app = create_app(Settings(_env_file=None, environment="test"))
    with TestClient(app) as client:
        # Consulta con radicado exitoso
        resp = client.get(f"/api/v1/notificaciones/radicado/{propuesta.codigo_radicado}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["codigo_radicado"] == propuesta.codigo_radicado
        assert data["titulo"] == "Comedor Comunitario Nelson Mandela"
        assert data["estado"] == "publicado"
        assert data["autor_nombre"] == "Madre Comunitaria"

        # Consulta con radicado inexistente
        resp_404 = client.get("/api/v1/notificaciones/radicado/POL-2026-999999")
        assert resp_404.status_code == 404


async def test_historial_notificaciones_con_permiso(session, contexto_base, monkeypatch):
    """Verifica el endpoint GET /api/v1/notificaciones/historial protegido por auditoria:leer."""
    from app.modules.identidad import deps

    async def sujeto_controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps, "cargar_sujeto_vigente", sujeto_controlado)

    service = AporteService(AporteRepository(session))

    correo = "veeduria.ciudadana@cartagena.gov.co"
    p = await service.crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=contexto_base["linea_id"],
            titulo="Propuesta para Veeduría de Notificaciones",
            descripcion="Aporte comunitario para auditar trazabilidad de constancias",
            autor_nombre="Veedor Cívico",
            es_anonimo=False,
            correo_contacto=correo,
        )
    )

    settings = Settings(_env_file=None, environment="test")
    app = create_app(settings)

    # Token de auditor con permiso 'auditoria:leer'
    token_auditor = crear_token_acceso(
        sujeto_id=uuid.uuid4(),
        rol="auditor_forense",
        nivel_identidad="declarada",
        permisos=["auditoria:leer"],
        settings=settings,
    )

    with TestClient(app, headers={"Authorization": f"Bearer {token_auditor}"}) as client:
        resp = client.get("/api/v1/notificaciones/historial")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "elementos" in data
        assert any(el["codigo_radicado"] == p.codigo_radicado for el in data["elementos"])
