"""Inbox real: acuse durable, idempotencia, concurrencia y recuperación sin Meta."""

import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.canales.models import WhatsAppInbox
from app.modules.canales.repository import WhatsAppInboxRepository
from app.modules.canales.schemas import WhatsAppWebhookPayload
from app.modules.canales.service import CanalWhatsAppService

pytestmark = pytest.mark.anyio


@pytest.fixture
async def sesiones(database_url):
    engine = create_async_engine(database_url, poolclass=NullPool, hide_parameters=True)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


def lote(*textos):
    cuenta = "edd-" + uuid.uuid4().hex
    return WhatsAppWebhookPayload.model_validate(
        {
            "entry": [
                {
                    "id": cuenta,
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "573005554433",
                                        "id": f"{cuenta}-{i}",
                                        "type": "text",
                                        "text": {"body": texto},
                                    }
                                    for i, texto in enumerate(textos)
                                ],
                                "contacts": [{"wa_id": "573005554433", "profile": {"name": "Participante sintético"}}],
                            }
                        }
                    ],
                }
            ]
        }
    )


async def filas(sesiones, payload):
    async with sesiones() as observador:
        return list(
            (
                await observador.scalars(
                    select(WhatsAppInbox)
                    .where(WhatsAppInbox.cuenta_proveedor == payload.entry[0].id + ":")
                    .order_by(WhatsAppInbox.mensaje_externo_id)
                )
            ).all()
        )


async def test_lote_valido_corto_valido_reentrega_y_resultados_individuales(sesiones):
    payload = lote("Propuesta válida primera de la comunidad", "x", "Propuesta válida posterior al mensaje inválido")
    async with sesiones() as session:
        servicio = CanalWhatsAppService(session)
        recepcion = await servicio.procesar_webhook_meta(payload)
        assert recepcion.mensajes_nuevos == recepcion.mensajes_recibidos == 3
        recibidos = await filas(sesiones, payload)
        assert len(recibidos) == 3 and all(f.propuesta_id is None and f.estado == "pendiente" for f in recibidos)
        resultados = [await servicio.procesar_inbox_uno(recepcion_id=f.id) for f in recibidos]
        assert [r.estado for r in resultados] == ["procesado", "rechazado", "procesado"]
        assert resultados[1].error_codigo == "payload_no_admisible"
        radicados = {r.codigo_radicado for r in resultados if r.codigo_radicado}
        assert len(radicados) == 2
        repetida = await servicio.procesar_webhook_meta(payload)
        assert repetida.mensajes_nuevos == 0 and repetida.mensajes_repetidos == 3
        assert all([await servicio.procesar_inbox_uno(recepcion_id=f.id) is None for f in recibidos])
        confirmados = await filas(sesiones, payload)
        assert {f.resultado["codigo_radicado"] for f in confirmados if f.resultado} == radicados
        assert "573005554433" not in json.dumps([r.model_dump(mode="json") for r in resultados])


async def test_recepcion_y_procesamiento_concurrentes_mismo_id(sesiones):
    payload = lote("Identificador estable bajo reentrega concurrente")

    async def recibir():
        async with sesiones() as session:
            return await CanalWhatsAppService(session).procesar_webhook_meta(payload)

    recibidos = await asyncio.gather(recibir(), recibir())
    assert sorted(r.mensajes_nuevos for r in recibidos) == [0, 1]
    registros = await filas(sesiones, payload)
    assert len(registros) == 1

    async def procesar():
        async with sesiones() as session:
            return await CanalWhatsAppService(session).procesar_inbox_uno(recepcion_id=registros[0].id)

    resultados = await asyncio.gather(procesar(), procesar())
    assert sum(r is not None for r in resultados) == 1
    registro = (await filas(sesiones, payload))[0]
    assert registro.estado == "procesado" and registro.intentos == 1 and registro.propuesta_id is not None


async def test_colision_de_contenido_no_sobrescribe_ni_confirma_prefijo(sesiones):
    payload = lote("Contenido original que ya fue recibido")
    async with sesiones() as session:
        servicio = CanalWhatsAppService(session)
        await servicio.procesar_webhook_meta(payload)
        original = (await filas(sesiones, payload))[0]
        otro = payload.model_copy(deep=True)
        otro.entry[0].changes[0].value.messages[0].text.body = "Contenido distinto bajo el mismo identificador"
        previo = otro.entry[0].changes[0].value.messages[0].model_copy(deep=True)
        previo.id += "-nuevo"
        otro.entry[0].changes[0].value.messages.insert(0, previo)
        with pytest.raises(HTTPException) as error:
            await servicio.procesar_webhook_meta(otro)
        assert error.value.status_code == 409
        posteriores = await filas(sesiones, payload)
        assert len(posteriores) == 1
        assert posteriores[0].payload == original.payload and posteriores[0].contenido_hash == original.contenido_hash


@pytest.mark.parametrize("fallo", ["flush", "validation", "cancel", "commit"])
async def test_inbox_recepcion_rollback_completo(sesiones, monkeypatch, fallo):
    payload = lote("Primer mensaje recibido", "Segundo mensaje recibido")
    original = WhatsAppInboxRepository.recibir
    escritos = []

    async def inyectar(self, **kwargs):
        resultado = await original(self, **kwargs)
        escritos.append(resultado[0].id)
        if len(escritos) == 2:
            if fallo == "flush":
                raise RuntimeError("Fallo tras SQL de inbox")
            if fallo == "cancel":
                raise asyncio.CancelledError()
            if fallo == "commit":
                await self.session.execute(
                    text(
                        "CREATE TEMP TABLE edd_inbox_commit(v int UNIQUE DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP"
                    )
                )
                await self.session.execute(text("INSERT INTO edd_inbox_commit VALUES(1),(1)"))
        return resultado

    monkeypatch.setattr(WhatsAppInboxRepository, "recibir", inyectar)
    if fallo == "validation":
        import app.modules.canales.service as modulo

        modelo = modulo.WhatsAppRecepcionRespuesta
        monkeypatch.setattr(
            modulo, "WhatsAppRecepcionRespuesta", lambda **kwargs: modelo(mensajes_recibidos="inválido")
        )
    esperado = {
        "flush": RuntimeError,
        "validation": ValidationError,
        "cancel": asyncio.CancelledError,
        "commit": IntegrityError,
    }[fallo]
    async with sesiones() as session:
        with pytest.raises(esperado):
            await CanalWhatsAppService(session).procesar_webhook_meta(payload)
        assert len(escritos) == 2 and not session.in_transaction()
        assert await session.scalar(text("SELECT 1")) == 1
    assert await filas(sesiones, payload) == []


async def test_inbox_fallo_post_flush_y_recuperacion_posterior(sesiones, monkeypatch):
    payload = lote("Aporte válido con fallo transitorio", "Aporte válido posterior sin bloqueo")
    async with sesiones() as session:
        servicio = CanalWhatsAppService(session)
        await servicio.procesar_webhook_meta(payload)
        recibidos = await filas(sesiones, payload)
        radicar = servicio._radicar_mensaje
        creados = []

        async def fallo_posterior(*args, **kwargs):
            respuesta = await radicar(*args, **kwargs)
            creados.append(respuesta.propuesta_id)
            raise RuntimeError("Fallo tras aporte y notificación")

        monkeypatch.setattr(servicio, "_radicar_mensaje", fallo_posterior)
        fallo = await servicio.procesar_inbox_uno(recepcion_id=recibidos[0].id)
        assert fallo.estado == "error" and fallo.intentos == 1
        async with sesiones() as observador:
            assert (
                await observador.scalar(
                    text("SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id"),
                    {"id": creados[0]},
                )
                == 0
            )
        monkeypatch.setattr(servicio, "_radicar_mensaje", radicar)
        posterior = await servicio.procesar_inbox_uno(recepcion_id=recibidos[1].id)
        assert posterior.estado == "procesado"
        async with sesiones() as cambio, transaction(cambio):
            registro = await cambio.get(WhatsAppInbox, recibidos[0].id)
            registro.proximo_intento_en = datetime.now(UTC) - timedelta(seconds=1)
        recuperado = await servicio.procesar_inbox_uno(recepcion_id=recibidos[0].id)
        assert recuperado.estado == "procesado" and recuperado.intentos == 2
        assert await servicio.procesar_inbox_uno(recepcion_id=recibidos[0].id) is None
        assert all(f.estado == "procesado" for f in await filas(sesiones, payload))


def test_webhook_firma_configuracion_acuse_y_simulacion(database_url):
    settings = Settings(
        _env_file=None,
        database_url=database_url,
        environment="test",
        whatsapp_habilitado=True,
        whatsapp_app_secret="clave-local-aislada",
        whatsapp_verify_token="token-local-aislado",
    )
    payload = lote("Acuse HTTP de recepción sin prometer radicación")
    cuerpo = payload.model_dump_json(by_alias=True).encode()
    firma = "sha256=" + hmac.new(settings.whatsapp_app_secret.encode(), cuerpo, hashlib.sha256).hexdigest()
    with TestClient(create_app(settings)) as cliente:
        assert (
            cliente.post(
                "/api/v1/canales/whatsapp/webhook", content=cuerpo, headers={"Content-Type": "application/json"}
            ).status_code
            == 401
        )
        assert (
            cliente.post(
                "/api/v1/canales/whatsapp/webhook",
                content=cuerpo,
                headers={"Content-Type": "application/json", "X-Hub-Signature-256": "sha256=falsa"},
            ).status_code
            == 401
        )
        respuesta = cliente.post(
            "/api/v1/canales/whatsapp/webhook",
            content=cuerpo,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": firma,
            },
        )
        assert respuesta.status_code == 200
        assert respuesta.json()["mensajes_nuevos"] == 1 and "radicados" not in respuesta.json()
        assert (
            cliente.get(
                "/api/v1/canales/whatsapp/webhook",
                params={
                    "hub.mode": "subscribe",
                    "hub.verify_token": settings.whatsapp_verify_token,
                    "hub.challenge": "123",
                },
            ).text
            == "123"
        )
    deshabilitado = settings.model_copy(update={"whatsapp_habilitado": False})
    with TestClient(create_app(deshabilitado)) as cliente:
        assert (
            cliente.post("/api/v1/canales/whatsapp/webhook", json=payload.model_dump(by_alias=True)).status_code == 503
        )
        assert cliente.get("/api/v1/canales/whatsapp/webhook").status_code == 503
    # El contrato del endpoint impide la ruta de simulación en el entorno productivo.
    app = create_app(settings.model_copy(update={"environment": "production"}))
    with TestClient(app) as cliente:
        assert (
            cliente.post(
                "/api/v1/canales/whatsapp/simular",
                json={"telefono_remitente": "573005554433", "texto_mensaje": "Simulación local deshabilitada"},
            ).status_code
            == 403
        )


@pytest.mark.parametrize("fallo", ["validation", "cancel", "commit"])
async def test_inbox_proceso_fallido_conserva_intencion_y_recupera(sesiones, monkeypatch, fallo):
    from app.modules.canales.schemas import WhatsAppIngestaRespuesta

    payload = lote("Radicación transaccional recuperable tras fallo")
    async with sesiones() as session:
        servicio = CanalWhatsAppService(session)
        await servicio.procesar_webhook_meta(payload)
        recepcion = (await filas(sesiones, payload))[0]
        original = servicio._radicar_mensaje
        escritos = []

        async def fallar(*args, **kwargs):
            respuesta = await original(*args, **kwargs)
            escritos.append(respuesta.propuesta_id)
            if fallo == "cancel":
                raise asyncio.CancelledError()
            if fallo == "validation":
                return WhatsAppIngestaRespuesta.model_validate({"propuesta_id": None})
            await session.execute(
                text("CREATE TEMP TABLE edd_proceso_commit(v int UNIQUE DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP")
            )
            await session.execute(text("INSERT INTO edd_proceso_commit VALUES(1),(1)"))
            return respuesta

        monkeypatch.setattr(servicio, "_radicar_mensaje", fallar)
        if fallo == "cancel":
            with pytest.raises(asyncio.CancelledError):
                await servicio.procesar_inbox_uno(recepcion_id=recepcion.id)
        else:
            resultado = await servicio.procesar_inbox_uno(recepcion_id=recepcion.id)
            assert resultado.estado == "error"
        assert not session.in_transaction()
        async with sesiones() as observador:
            assert (
                await observador.scalar(
                    text("SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id"),
                    {"id": escritos[0]},
                )
                == 0
            )
            registro = await observador.get(WhatsAppInbox, recepcion.id)
            assert registro.propuesta_id is None and registro.resultado is None and registro.intentos == 1
        monkeypatch.setattr(servicio, "_radicar_mensaje", original)
        async with sesiones() as cambio, transaction(cambio):
            registro = await cambio.get(WhatsAppInbox, recepcion.id)
            registro.proximo_intento_en = datetime.now(UTC) - timedelta(seconds=1)
            registro.reclamo_vence_en = datetime.now(UTC) - timedelta(seconds=1)
        recuperado = await servicio.procesar_inbox_uno(recepcion_id=recepcion.id)
        assert recuperado.estado == "procesado" and recuperado.intentos == 2
        assert await servicio.procesar_inbox_uno(recepcion_id=recepcion.id) is None


async def test_inbox_flush_invisible_hasta_commit_desde_otra_conexion(sesiones, monkeypatch):
    payload = lote("Recepción durable atómica sin publicar el flush")
    original = WhatsAppInboxRepository.recibir
    pids = []

    async def observar(self, **kwargs):
        registro, nuevo = await original(self, **kwargs)
        pids.append(await self.session.scalar(text("SELECT pg_backend_pid()")))
        async with sesiones() as observador:
            pid = await observador.scalar(text("SELECT pg_backend_pid()"))
            assert pid != pids[-1]
            assert await observador.get(WhatsAppInbox, registro.id) is None
        return registro, nuevo

    monkeypatch.setattr(WhatsAppInboxRepository, "recibir", observar)
    async with sesiones() as session:
        respuesta = await CanalWhatsAppService(session).procesar_webhook_meta(payload)
        assert respuesta.mensajes_nuevos == 1
    assert len(await filas(sesiones, payload)) == 1 and pids
