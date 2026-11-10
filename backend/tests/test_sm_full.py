"""Pruebas integrales de SM Core (Fases 1 a 7).

Cubre:
- Motor de plantillas dinámico y validación de variables.
- Persistencia durable con SQLAlchemy en PostgreSQL (SMRepository).
- Worker transaccional, reintentos exponenciales y política de agotamiento.
- Puente de eventos del dominio POLIS (SMBridge).
- SDK portable (SMClient).
- Endpoints HTTP REST (router /api/v1/sm).
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.sm.boveda import SMBovedaContactoDB
from app.modules.sm.bridge import SMBridge
from app.modules.sm.client import SMClient
from app.modules.sm.contracts import (
    SMCanal,
    SMContacto,
    SMEstadoConsentimiento,
    SMEstadoEntrega,
    SMEstadoMensaje,
    SMEvento,
    SMMensaje,
)
from app.modules.sm.core import (
    SMConsentimientoFaltante,
    SMIdempotenciaConflict,
)
from app.modules.sm.models import SMAuditoriaRegistro
from app.modules.sm.repository import SMRepository
from app.modules.sm.templates import SMPlantilla, SMPlantillaInvalida, motor_plantillas
from app.modules.sm.worker import SMWorker

pytestmark = pytest.mark.anyio


def huella(tenant: str, actor: str, canal: str, contacto: str) -> str:
    return SMBovedaContactoDB.desde_settings().huella(tenant, actor, canal, contacto)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def db_session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()
    await engine.dispose()


@pytest.fixture
def test_client(database_url: str, provisionar_usuario_sync):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings)) as client:
        correo = f"sm-admin-{uuid.uuid4().hex}@example.org"
        clave = "ClavePruebaSM2026*"
        provisionar_usuario_sync(
            client,
            {
                "correo": correo,
                "contrasena": clave,
                "nombres": "Admin",
                "apellidos": "SM",
                "codigo_rol": "autoridad_distrital",
            },
        )
        login = client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": clave})
        assert login.status_code == 200, login.text
        client.headers.update({"Authorization": "Bearer " + login.json()["token_acceso"]})
        yield client


@pytest.fixture
def cliente_anonimo(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings)) as client:
        yield client


# --- 1. Pruebas del Motor de Plantillas ---


def test_plantillas_registro_y_renderizado():
    nueva_plantilla = SMPlantilla(
        nombre="sm.prueba.custom",
        asunto_patron="Aviso: {tema}",
        cuerpo_patron="Hola {usuario}, su trámite {tramite_id} fue procesado.",
        variables_requeridas=("usuario", "tema", "tramite_id"),
    )
    motor_plantillas.registrar(nueva_plantilla)

    asunto, cuerpo = motor_plantillas.renderizar(
        "sm.prueba.custom",
        {"usuario": "Ciudadana 1", "tema": "Votación", "tramite_id": "TR-99"},
    )
    assert asunto == "Aviso: Votación"
    assert cuerpo == "Hola Ciudadana 1, su trámite TR-99 fue procesado."


def test_plantillas_variables_faltantes_lanza_error():
    with pytest.raises(SMPlantillaInvalida) as exc:
        motor_plantillas.renderizar(
            "sm.mesa.convocatoria",
            {"actor": "Juan"},
        )
    assert "Faltan variables obligatorias" in str(exc.value)


def test_plantillas_nombre_invalido():
    with pytest.raises(SMPlantillaInvalida):
        motor_plantillas.registrar(
            SMPlantilla(
                nombre="INVALID NAME WITH SPACES",
                cuerpo_patron="test",
            )
        )


def test_plantillas_predeterminadas_completas():
    asunto, cuerpo = motor_plantillas.renderizar(
        "sm.notificacion.general",
        {"actor": "Maria", "titulo": "Cierre de fase", "mensaje": "La fase concluyó", "entidad": "Secretaría"},
    )
    assert "Cierre de fase" in (asunto or "")
    assert "Maria" in cuerpo


# --- 2. Pruebas del SDK Portable (SMClient) ---


async def test_client_sdk_memoria_flujo_completo():
    client = SMClient(tenant="polis_sdk", secreto_contacto="sdk-prueba-secreto-32-bytes-largo!")

    # 1. Otorgar consentimiento
    consent = await client.otorgar_consentimiento(
        actor="veedor_01",
        canal=SMCanal.CORREO,
        contacto="veedor@ciudadano.org",
    )
    assert consent.estado == SMEstadoConsentimiento.OTORGADO

    # 2. Emitir evento
    msg = await client.emitir_evento(
        tipo_evento="notificacion.general",
        actor="veedor_01",
        canal=SMCanal.CORREO,
        contacto_identificador="veedor@ciudadano.org",
        idempotencia="sdk-evt-001",
        asunto="Reporte mensual",
        cuerpo="Su reporte está listo.",
    )
    assert msg.estado == SMEstadoMensaje.PENDIENTE
    assert msg.canal == SMCanal.CORREO

    # 3. Consultar salud
    salud = await client.consultar_salud()
    assert salud.tenant == "polis_sdk"
    assert salud.pendientes >= 1


async def test_client_sdk_consentimiento_revocado_bloquea():
    client = SMClient(tenant="polis_sdk_rev", secreto_contacto="sdk-prueba-secreto-32-bytes-largo!")
    await client.revocar_consentimiento(
        actor="ciudadano_bloqueado",
        canal=SMCanal.SMS,
        contacto="+573001234567",
    )

    with pytest.raises(SMConsentimientoFaltante):
        await client.emitir_evento(
            tipo_evento="sms.alerta",
            actor="ciudadano_bloqueado",
            canal=SMCanal.SMS,
            contacto_identificador="+573001234567",
            idempotencia="sdk-evt-fail",
            cuerpo="Alerta",
        )


# --- 3. Pruebas de Persistencia Relacional (SMRepository) ---


async def test_repositorio_consentimiento_persistencia(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")
    actor = f"actor_{uuid.uuid4().hex[:8]}"
    contacto = "ciudadano@correo.gov.co"

    # Registrar otorgado
    c1 = await repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        consentido=True,
    )
    assert c1.estado == SMEstadoConsentimiento.OTORGADO

    # Verificar que existe y está activo
    activo = await repo.verificar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto_hash=c1.contacto_hash,
    )
    assert activo is True

    # Revocar consentimiento (opt-out)
    c2 = await repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        consentido=False,
    )
    assert c2.estado == SMEstadoConsentimiento.REVOCADO

    # Verificar revocado
    activo_rev = await repo.verificar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto_hash=c1.contacto_hash,
    )
    assert activo_rev is False


async def test_repositorio_procesar_evento_con_plantilla(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")
    actor = f"lider_{uuid.uuid4().hex[:8]}"
    contacto = "+573109876543"

    # Dar consentimiento previo
    await repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.WHATSAPP,
        contacto=contacto,
        consentido=True,
    )

    evento = SMEvento(
        tenant="polis",
        tipo_evento="mesa.convocatoria",
        actor=actor,
        idempotencia=f"idem-mesa-{uuid.uuid4().hex[:8]}",
        canal=SMCanal.WHATSAPP,
        contacto=SMContacto(canal=SMCanal.WHATSAPP, identificador=contacto, actor=actor),
        plantilla="sm.mesa.convocatoria",
        payload={
            "mesa_nombre": "Mesa de Seguridad Rural",
            "fecha": "2026-12-01",
            "lugar": "Centro Comunitario",
            "enlace": "https://polis.gob.co/m/123",
        },
    )

    mensaje = await repo.procesar_evento(db_session, evento)
    assert mensaje.estado == SMEstadoMensaje.PENDIENTE
    assert "Mesa de Seguridad Rural" in (mensaje.cuerpo or "")
    assert mensaje.contacto_hash == huella("polis", actor, "whatsapp", contacto)

    # Reintento con misma idempotencia debe retornar el mismo mensaje
    mensaje_reintento = await repo.procesar_evento(db_session, evento)
    assert mensaje_reintento.id == mensaje.id


async def test_repositorio_despacho_mensaje(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")
    actor = f"user_{uuid.uuid4().hex[:8]}"
    contacto_str = "user@test.gov.co"

    await repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto_str,
        consentido=True,
    )

    evento = SMEvento(
        tenant="polis",
        tipo_evento="notificacion.general",
        actor=actor,
        idempotencia=f"idem-despacho-{uuid.uuid4().hex[:8]}",
        canal=SMCanal.CORREO,
        contacto=SMContacto(canal=SMCanal.CORREO, identificador=contacto_str, actor=actor),
        asunto="Asunto directo",
        cuerpo="Cuerpo de prueba",
    )
    mensaje = await repo.procesar_evento(db_session, evento)

    contacto_obj = SMContacto(canal=SMCanal.CORREO, identificador=contacto_str, actor=actor)
    entrega = await repo.despachar_mensaje(db_session, mensaje.id, contacto=contacto_obj)

    assert entrega.estado_entrega == SMEstadoEntrega.PREPARADO
    assert entrega.intento == 1

    msg_actualizado = await repo.obtener_mensaje(db_session, mensaje.id)
    assert msg_actualizado is not None
    assert msg_actualizado.estado == SMEstadoMensaje.PENDIENTE


# --- 4. Pruebas del Worker Transaccional y Reintentos ---


async def test_worker_despacho_lote(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")
    worker = SMWorker(tenant="polis")
    actor = f"worker_actor_{uuid.uuid4().hex[:8]}"
    contacto_str = "+573009998877"

    await repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.SMS,
        contacto=contacto_str,
        consentido=True,
    )

    resolver = {
        huella("polis", actor, "sms", contacto_str): SMContacto(
            canal=SMCanal.SMS, identificador=contacto_str, actor=actor
        )
    }
    for i in range(2):
        ev = SMEvento(
            tenant="polis",
            tipo_evento="sms.aviso",
            actor=actor,
            idempotencia=f"idem-worker-{uuid.uuid4().hex[:8]}-{i}",
            canal=SMCanal.SMS,
            contacto=SMContacto(canal=SMCanal.SMS, identificador=contacto_str, actor=actor),
            cuerpo=f"Mensaje SMS de prueba {i}",
        )
        await repo.procesar_evento(db_session, ev)

    await db_session.commit()
    resumen = await worker.procesar_lote(db_session, limite=10, contactos_resolver=resolver)
    assert resumen.procesados >= 2
    assert resumen.simulados >= 2
    assert resumen.enviados == 0


async def test_worker_reintentos_y_agotamiento(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")

    class AdaptadorFallido:
        def construir(self, mensaje, contacto):
            raise RuntimeError("Falla intencional en conexión con proveedor")

    worker_fallas = SMWorker(
        tenant="polis",
        max_reintentos=2,
        adaptadores={SMCanal.CORREO: AdaptadorFallido},  # type: ignore
    )

    actor = f"fallas_actor_{uuid.uuid4().hex[:8]}"
    contacto = "error@proveedor.com"

    await repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        consentido=True,
    )

    ev = SMEvento(
        tenant="polis",
        tipo_evento="correo.falla",
        actor=actor,
        idempotencia=f"idem-falla-{uuid.uuid4().hex[:8]}",
        canal=SMCanal.CORREO,
        contacto=SMContacto(canal=SMCanal.CORREO, identificador=contacto, actor=actor),
        asunto="Falla esperada",
        cuerpo="Texto",
    )
    msg = await repo.procesar_evento(db_session, ev)
    resolver = {
        msg.contacto_hash: SMContacto(canal=SMCanal.CORREO, identificador=contacto, actor=actor),
    }

    # Pasada 1: Fallo en intento 1 -> Estado FALLIDO
    await db_session.commit()
    resumen1 = await worker_fallas.procesar_lote(db_session, limite=10, contactos_resolver=resolver)
    assert resumen1.fallidos >= 1
    msg_p1 = await repo.obtener_mensaje(db_session, msg.id)
    assert msg_p1.estado == SMEstadoMensaje.FALLIDO

    # Pasada 2: Intento 2 alcanza max_reintentos (2) -> Estado AGOTADO
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.modules.sm.models import SMMensajeRegistro

    await db_session.execute(
        update(SMMensajeRegistro)
        .where(SMMensajeRegistro.id == msg.id)
        .values(proximo_intento_en=datetime.now(UTC) - timedelta(seconds=1))
    )
    await db_session.commit()
    resumen2 = await worker_fallas.procesar_lote(db_session, limite=10, contactos_resolver=resolver)
    assert resumen2.agotados >= 1
    msg_p2 = await repo.obtener_mensaje(db_session, msg.id)
    assert msg_p2.estado == SMEstadoMensaje.AGOTADO


# --- 5. Pruebas del Puente Institucional POLIS (SMBridge) ---


async def test_bridge_polis_convocatoria_mesa(db_session: AsyncSession):
    bridge = SMBridge(tenant="polis")
    actor = f"ciudadano_mesa_{uuid.uuid4().hex[:8]}"
    contacto = "ciudadano@bogota.gov.co"

    await bridge.repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        consentido=True,
    )

    msg = await bridge.notificar_convocatoria_mesa(
        db_session,
        mesa_id="mesa-001",
        mesa_nombre="Mesa Ambiental Suba",
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        fecha="2026-11-20",
        lugar="Salón Comunal Suba",
    )
    assert msg.estado == SMEstadoMensaje.PENDIENTE
    assert "Mesa Ambiental Suba" in (msg.asunto or "")


async def test_bridge_polis_asignacion_compromiso(db_session: AsyncSession):
    bridge = SMBridge(tenant="polis")
    actor = f"funcionario_{uuid.uuid4().hex[:8]}"
    contacto = "funcionario@secretaria.gov.co"

    await bridge.repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        consentido=True,
    )

    msg = await bridge.notificar_asignacion_compromiso(
        db_session,
        compromiso_id="COMP-2026-45",
        titulo="Pavimentación carrera 7",
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        fecha_limite="2026-12-31",
        descripcion="Ejecución de obra civil priorizada",
    )
    assert msg.estado == SMEstadoMensaje.PENDIENTE
    assert "COMP-2026-45" in (msg.asunto or "")


async def test_bridge_polis_alerta_seguridad(db_session: AsyncSession):
    bridge = SMBridge(tenant="polis")
    actor = f"admin_{uuid.uuid4().hex[:8]}"
    contacto = "admin@seguridad.gov.co"

    await bridge.repo.registrar_consentimiento(
        db_session,
        actor=actor,
        canal=SMCanal.CORREO,
        contacto=contacto,
        consentido=True,
    )

    msg = await bridge.notificar_alerta_seguridad(
        db_session,
        actor=actor,
        accion="cambio_clave_maestra",
        canal=SMCanal.CORREO,
        contacto=contacto,
        hash_traza="hash_forense_sha256_mock",
    )
    assert msg.estado == SMEstadoMensaje.PENDIENTE
    assert "Alerta de Seguridad" in (msg.asunto or "")


# --- 6. Pruebas de Endpoints HTTP REST (Router /api/v1/sm) ---


def test_router_consentimiento_y_verificacion(test_client: TestClient):
    actor = f"titular_{uuid.uuid4().hex[:8]}"
    contacto = "titular@derechos.gov.co"

    resp = test_client.post(
        "/api/v1/sm/consent",
        json={
            "actor": actor,
            "canal": "correo",
            "contacto": contacto,
            "consentido": True,
            "origen": "test_suite",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["actor"] == actor
    assert data["estado"] == "otorgado"

    resp_ver = test_client.get(
        f"/api/v1/sm/consent/correo/{actor}",
        params={"contacto_hash": huella("polis", actor, "correo", contacto)},
    )
    assert resp_ver.status_code == 200
    assert resp_ver.json()["consentido"] is True
    assert "contacto_hash" not in resp_ver.json()


async def test_router_consentimiento_registra_operador(test_client: TestClient, db_session: AsyncSession):
    actor = f"operador_{uuid.uuid4().hex[:8]}"
    resp = test_client.post(
        "/api/v1/sm/consent",
        json={
            "actor": actor,
            "canal": "correo",
            "contacto": "operador@derechos.gov.co",
            "consentido": True,
        },
    )
    assert resp.status_code == 200, resp.text
    operador = await db_session.scalar(
        select(SMAuditoriaRegistro.operador).where(
            SMAuditoriaRegistro.tenant == "polis",
            SMAuditoriaRegistro.actor == actor,
            SMAuditoriaRegistro.accion == "consentimiento.registrado",
        )
    )
    assert operador is not None
    assert operador != actor
    uuid.UUID(operador)


def test_router_evento_sin_consentimiento_retorna_403(test_client: TestClient):
    actor = f"sin_consent_{uuid.uuid4().hex[:8]}"
    resp = test_client.post(
        "/api/v1/sm/events",
        json={
            "tipo_evento": "aviso.invalido",
            "actor": actor,
            "canal": "correo",
            "contacto": "no_consentido@test.org",
            "idempotencia": f"idem-403-{uuid.uuid4().hex}",
            "asunto": "Test",
            "cuerpo": "Hola",
        },
    )
    assert resp.status_code == 403
    assert "No existe consentimiento otorgado" in resp.json()["detail"]


def test_router_evento_exitoso_y_consulta(test_client: TestClient):
    actor = f"con_consent_{uuid.uuid4().hex[:8]}"
    contacto = "aprobado@test.org"

    test_client.post(
        "/api/v1/sm/consent",
        json={
            "actor": actor,
            "canal": "telegram",
            "contacto": contacto,
            "consentido": True,
        },
    )

    resp_ev = test_client.post(
        "/api/v1/sm/events",
        json={
            "tipo_evento": "telegram.alerta",
            "actor": actor,
            "canal": "telegram",
            "contacto": contacto,
            "idempotencia": f"idem-201-{uuid.uuid4().hex}",
            "asunto": "Aviso Telegram",
            "cuerpo": "Mensaje encriptado",
        },
    )
    assert resp_ev.status_code == 201
    msg_id = resp_ev.json()["id"]

    resp_get = test_client.get(f"/api/v1/sm/messages/{msg_id}")
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == msg_id
    assert resp_get.json()["estado"] == "pendiente"


def test_router_salud_sm(test_client: TestClient):
    resp = test_client.get("/api/v1/sm/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "estado" in data
    assert "pendientes" in data
    assert "enviados" in data
    assert "fallidos" in data
    assert "contacto" not in resp.text and "@" not in resp.text


def test_router_worker_run_once(test_client: TestClient):
    resp = test_client.post("/api/v1/sm/worker/run-once", json={"limite": 10})
    assert resp.status_code == 200
    data = resp.json()
    assert "procesados" in data
    assert "enviados" in data
    assert "fallidos" in data
    assert "agotados" in data


# --- 7. Calidad adicional: seguridad y consistencia ---


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("get", "/api/v1/sm/messages"),
        ("post", "/api/v1/sm/worker/run-once"),
        ("post", "/api/v1/sm/events"),
        ("post", "/api/v1/sm/consent"),
    ],
)
def test_router_exige_autenticacion(cliente_anonimo: TestClient, metodo: str, ruta: str):
    resp = getattr(cliente_anonimo, metodo)(ruta)
    assert resp.status_code in (401, 403)


async def test_worker_sin_contacto_no_simula_envio(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")
    actor = f"sinres_{uuid.uuid4().hex[:8]}"
    contacto = "sinresolver@test.gov.co"
    await repo.registrar_consentimiento(
        db_session, actor=actor, canal=SMCanal.CORREO, contacto=contacto, consentido=True
    )
    msg = await repo.procesar_evento(
        db_session,
        SMEvento(
            tenant="polis",
            tipo_evento="correo.aviso",
            actor=actor,
            idempotencia=f"idem-sinres-{uuid.uuid4().hex[:8]}",
            canal=SMCanal.CORREO,
            contacto=SMContacto(canal=SMCanal.CORREO, identificador=contacto, actor=actor),
            cuerpo="x",
        ),
    )
    # Simular ausencia de ciphertext, no ausencia del mapa legacy (ahora hay bóveda).
    from app.modules.sm.boveda import SMBovedaContactoDB

    await SMBovedaContactoDB.purgar(
        db_session, tenant="polis", actor=actor, canal=SMCanal.CORREO, contacto_hash=msg.contacto_hash
    )
    await db_session.commit()
    resumen = await SMWorker(tenant="polis").procesar_lote(db_session, limite=200)
    assert resumen.sin_contacto >= 1
    assert (await repo.obtener_mensaje(db_session, msg.id)).estado == SMEstadoMensaje.FALLIDO


async def test_idempotencia_con_datos_distintos_es_conflicto(db_session: AsyncSession):
    repo = SMRepository(tenant="polis")
    actor = f"conf_{uuid.uuid4().hex[:8]}"
    clave = f"idem-conf-{uuid.uuid4().hex[:8]}"
    await repo.registrar_consentimiento(
        db_session, actor=actor, canal=SMCanal.CORREO, contacto="a@test.gov.co", consentido=True
    )
    await repo.registrar_consentimiento(
        db_session, actor=actor, canal=SMCanal.CORREO, contacto="b@test.gov.co", consentido=True
    )

    def evento(contacto: str) -> SMEvento:
        return SMEvento(
            tenant="polis",
            tipo_evento="correo.aviso",
            actor=actor,
            idempotencia=clave,
            canal=SMCanal.CORREO,
            contacto=SMContacto(canal=SMCanal.CORREO, identificador=contacto, actor=actor),
            cuerpo="x",
        )

    await repo.procesar_evento(db_session, evento("a@test.gov.co"))
    with pytest.raises(SMIdempotenciaConflict):
        await repo.procesar_evento(db_session, evento("b@test.gov.co"))


def test_telegram_escapa_html():
    from app.modules.sm.channels import SMTelegramAdapter

    contacto = SMContacto(canal=SMCanal.TELEGRAM, identificador="12345", actor="a")
    msg = SMMensaje(
        evento_id=uuid.uuid4(),
        canal=SMCanal.TELEGRAM,
        actor="a",
        contacto_hash="h",
        cuerpo="<script>alert(1)</script>",
        idempotencia="idem-escape-1",
    )
    res = SMTelegramAdapter().construir(msg, contacto)
    assert "<script>" not in res.payload["text"]


def test_sm_ciudadano_no_puede_gestionar_ni_leer_outbox(cliente_anonimo):
    correo = f"sm-ciudadano-{uuid.uuid4().hex}@example.org"
    datos = {"correo": correo, "contrasena": "PruebaSM310Segura!", "nombres": "Prueba", "apellidos": "Ciudadano"}
    assert cliente_anonimo.post("/api/v1/identidad/registro", json=datos).status_code == 201
    login = cliente_anonimo.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": datos["contrasena"]})
    assert login.status_code == 200
    cliente_anonimo.headers.update({"Authorization": "Bearer " + login.json()["token_acceso"]})
    assert cliente_anonimo.get("/api/v1/sm/messages").status_code == 403
    assert cliente_anonimo.post("/api/v1/sm/worker/run-once", json={"limite": 1}).status_code == 403
    assert (
        cliente_anonimo.post(
            "/api/v1/sm/consent",
            json={
                "actor": "opaco",
                "canal": "correo",
                "contacto": correo,
                "consentido": True,
            },
        ).status_code
        == 403
    )


def test_sm_worker_apagado_no_despacha(test_client):
    test_client.app.state.settings.sm_worker_habilitado = False
    assert test_client.post("/api/v1/sm/worker/run-once").status_code == 409


def test_sm_salud_exige_auditoria_y_solo_agregados(cliente_anonimo, test_client):
    anonima = cliente_anonimo.get("/api/v1/sm/health")
    assert anonima.status_code in (401, 403)

    autenticada = test_client.get("/api/v1/sm/health")
    assert autenticada.status_code == 200
    assert {"simulados", "worker_ultimo_latido", "canales_degradados"}.issubset(autenticada.json())
    assert "contacto" not in autenticada.text and "@" not in autenticada.text


def test_router_consentimiento_sin_boveda_devuelve_503(test_client: TestClient):
    settings = test_client.app.state.settings
    original = settings.sm_boveda_key
    settings.sm_boveda_key = None
    try:
        resp = test_client.post(
            "/api/v1/sm/consent",
            json={
                "actor": f"sin_boveda_{uuid.uuid4().hex[:8]}",
                "canal": "correo",
                "contacto": "sin-boveda@derechos.gov.co",
                "consentido": True,
            },
        )
    finally:
        settings.sm_boveda_key = original
    assert resp.status_code == 503, resp.text
