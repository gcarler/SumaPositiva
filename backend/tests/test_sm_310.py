"""Aceptación 310-BK en PostgreSQL exclusivo; sin red externa ni SMTP productivo."""

from __future__ import annotations

import asyncio
import base64
import json
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.sm.boveda import SMBovedaContactoDB, SMBovedaError
from app.modules.sm.bridge import SMBridge
from app.modules.sm.contracts import SMCanal, SMContacto, SMEstadoEntrega, SMEvento
from app.modules.sm.core import SMError, SMIdempotenciaConflict
from app.modules.sm.models import (
    SMAuditoriaRegistro,
    SMConsentimientoRegistro,
    SMContactoBovedaRegistro,
    SMEntregaRegistro,
    SMEventoRegistro,
    SMMensajeRegistro,
)
from app.modules.sm.repository import SMRepository
from app.modules.sm.service_db import SMServicioDB
from app.modules.sm.transports import SMFalloTransporte, SMReciboTransporte
from app.modules.sm.worker import SMWorker

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def sm310(database_url):
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    key = os.urandom(32)
    settings = Settings(
        _env_file=None,
        database_url=database_url,
        environment="test",
        sm_boveda_key=base64.urlsafe_b64encode(key).decode(),
        sm_worker_habilitado=True,
    )
    boveda = SMBovedaContactoDB(claves={"v1": key}, key_id="v1")
    tenant = "t310_" + uuid4().hex[:20]
    try:
        yield sessions, boveda, tenant, settings
    finally:
        await engine.dispose()


def evento(tenant, *, contacto="contacto310@example.invalid", canal=SMCanal.CORREO, actor="actor-opaco"):
    return SMEvento(
        tenant=tenant,
        actor=actor,
        tipo_evento="prueba.institucional",
        canal=canal,
        contacto=SMContacto(canal=canal, actor=actor, identificador=contacto),
        cuerpo="Aviso institucional sin datos personales",
        idempotencia="sm310:" + uuid4().hex,
    )


async def encolar(sm310, ev=None):
    sessions, boveda, tenant, _ = sm310
    ev = ev or evento(tenant)
    repo = SMRepository(tenant, boveda=boveda)
    async with sessions() as session:
        async with transaction(session):
            await repo.registrar_consentimiento(
                session, actor=ev.actor, canal=ev.canal, contacto=ev.contacto.identificador, consentido=True
            )
            msg = await repo.procesar_evento(session, ev)
    return msg, ev


class TransporteControlado:
    disponible = True

    def __init__(self, *, error=None, pausa=None):
        self.error, self.pausa = error, pausa
        self.enviados = []

    async def enviar(self, preparado):
        self.enviados.append(preparado.mensaje_id)
        if self.pausa:
            await self.pausa()
        if self.error:
            raise self.error
        return SMReciboTransporte(SMEstadoEntrega.ENVIADO, "proveedor_acepto", "f" * 64)


async def test_boveda_ciphertext_nonce_aad_y_lectura_privada(sm310):
    sessions, boveda, tenant, _ = sm310
    msg, ev = await encolar(sm310)
    async with sessions() as observer:
        reg = await observer.scalar(select(SMContactoBovedaRegistro).where(SMContactoBovedaRegistro.tenant == tenant))
        inicial = reg.contacto_cifrado
        assert ev.contacto.identificador.encode() not in inicial
        assert (await boveda.resolver(observer, msg)).identificador == ev.contacto.identificador
        assert await boveda.resolver(observer, msg.model_copy(update={"tenant": "otro"})) is None
        assert await boveda.resolver(observer, msg.model_copy(update={"actor": "otro"})) is None
    async with sessions() as session:
        async with transaction(session):
            await boveda.almacenar(session, tenant=tenant, contacto=ev.contacto)
    async with sessions() as observer:
        reg = await observer.scalar(select(SMContactoBovedaRegistro).where(SMContactoBovedaRegistro.tenant == tenant))
        assert reg.contacto_cifrado != inicial
        sin_clave = SMBovedaContactoDB(claves={"v1": os.urandom(32)}, key_id="v1")
        with pytest.raises(SMBovedaError, match="autenticar"):
            await sin_clave.resolver(observer, msg)
    async with sessions() as session:
        async with transaction(session):
            reg = await session.scalar(
                select(SMContactoBovedaRegistro).where(SMContactoBovedaRegistro.tenant == tenant)
            )
            reg.contacto_cifrado = inicial[:-1] + bytes([inicial[-1] ^ 1])
    async with sessions() as observer:
        with pytest.raises(SMBovedaError, match="autenticar"):
            await boveda.resolver(observer, msg)


async def test_rotacion_recifra_sin_perdida_y_clave_vieja_no_abre(sm310):
    sessions, vieja, tenant, _ = sm310
    msg, ev = await encolar(sm310)
    nueva_key = os.urandom(32)
    nueva = SMBovedaContactoDB(claves={**vieja._claves, "v2": nueva_key}, key_id="v2")
    async with sessions() as session:
        assert await SMServicioDB(session, tenant=tenant).rotar_boveda(nueva) == 1
    async with sessions() as session:
        solo_nueva = SMBovedaContactoDB(claves={"v2": nueva_key}, key_id="v2")
        rotado = await session.get(SMMensajeRegistro, msg.id)
        actualizado = msg.model_copy(update={"contacto_hash": rotado.contacto_hash})
        assert rotado.contacto_hash != msg.contacto_hash
        assert (await solo_nueva.resolver(session, actualizado)).identificador == ev.contacto.identificador
        with pytest.raises(SMBovedaError):
            await vieja.resolver(session, actualizado)


async def test_revocacion_purga_y_bloquea_mensaje_ya_encolado(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    async with sessions() as session:
        await SMServicioDB(session, tenant=tenant, boveda=boveda).registrar_consentimiento(
            actor=ev.actor, canal=ev.canal, contacto=ev.contacto.identificador, consentido=False
        )
    transporte = TransporteControlado()
    async with sessions() as session:
        resumen = await SMWorker(
            tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte}
        ).procesar_lote(session)
    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(SMContactoBovedaRegistro)
                .where(SMContactoBovedaRegistro.tenant == tenant)
            )
            == 0
        )
        assert (await observer.get(SMMensajeRegistro, msg.id)).estado == "cancelado"
    assert resumen.cancelados == 1 and not transporte.enviados


@pytest.mark.parametrize("revocar", [False, True])
async def test_rollback_real_despues_de_flush_consentimiento_y_boveda(sm310, monkeypatch, revocar):
    sessions, boveda, tenant, _ = sm310
    ev = evento(tenant)
    if revocar:
        await encolar(sm310, ev)
    original = SMRepository.registrar_consentimiento

    async def falla(self, session, **datos):
        await original(self, session, **datos)
        raise RuntimeError("fallo posterior al flush")

    monkeypatch.setattr(SMRepository, "registrar_consentimiento", falla)
    async with sessions() as session:
        with pytest.raises(RuntimeError):
            await SMServicioDB(session, tenant=tenant, boveda=boveda).registrar_consentimiento(
                actor=ev.actor, canal=ev.canal, contacto=ev.contacto.identificador, consentido=not revocar
            )
    async with sessions() as observer:
        count = await observer.scalar(
            select(func.count()).select_from(SMContactoBovedaRegistro).where(SMContactoBovedaRegistro.tenant == tenant)
        )
        assert count == int(revocar)
        estado = await observer.scalar(
            select(SMConsentimientoRegistro.estado).where(SMConsentimientoRegistro.tenant == tenant)
        )
        assert estado == ("otorgado" if revocar else None)
        if not revocar:
            assert (
                await observer.scalar(
                    select(func.count()).select_from(SMAuditoriaRegistro).where(SMAuditoriaRegistro.tenant == tenant)
                )
                == 0
            )


async def test_consentimiento_sin_clave_no_confirma(sm310, monkeypatch):
    sessions, _, tenant, _ = sm310

    def falla(*_args, **_kwargs):
        raise SMBovedaError("sin clave")

    monkeypatch.setattr(SMBovedaContactoDB, "desde_settings", falla)
    async with sessions() as session:
        with pytest.raises(SMBovedaError):
            await SMServicioDB(session, tenant=tenant).registrar_consentimiento(
                actor="opaco", canal=SMCanal.CORREO, contacto="sinclave@example.invalid", consentido=True
            )
    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(SMConsentimientoRegistro)
                .where(SMConsentimientoRegistro.tenant == tenant)
            )
            == 0
        )


async def test_backoff_reloj_controlado_permanente_y_agotamiento(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    tiempo = [datetime.now(UTC)]
    transporte = TransporteControlado(error=SMFalloTransporte("proveedor_temporal", transitorio=True))
    worker = SMWorker(
        tenant,
        max_reintentos=2,
        settings=settings,
        resolutor=boveda,
        transportes={ev.canal: transporte},
        reloj=lambda: tiempo[0],
        jitter=lambda: 0.5,
    )
    async with sessions() as session:
        assert (await worker.procesar_lote(session)).fallidos == 1
    async with sessions() as observer:
        reg = await observer.get(SMMensajeRegistro, msg.id)
        assert reg.proximo_intento_en == tiempo[0] + timedelta(seconds=60.5)
    async with sessions() as session:
        assert (await worker.procesar_lote(session)).procesados == 0
    tiempo[0] += timedelta(seconds=61)
    async with sessions() as session:
        assert (await worker.procesar_lote(session)).agotados == 1
        assert (await worker.procesar_lote(session)).procesados == 0
    assert transporte.enviados == [msg.id, msg.id]

    msg2, _ = await encolar(sm310)
    transporte.error = SMFalloTransporte("proveedor_permanente", transitorio=False)
    async with sessions() as session:
        assert (await worker.procesar_lote(session)).fallidos == 1
        assert (await worker.procesar_lote(session)).procesados == 0
    async with sessions() as observer:
        reg = await observer.get(SMMensajeRegistro, msg2.id)
        assert reg.estado == "fallido" and not reg.reintentable and reg.proximo_intento_en is None


async def test_dos_workers_sin_duplicados_sin_transaccion_durante_envio(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    entro, liberar = asyncio.Event(), asyncio.Event()

    async def pausa():
        async with sessions() as observer:
            estado = (await observer.get(SMMensajeRegistro, msg.id)).estado
            assert estado == "encolado"  # Reclamación ya visible a otra conexión.
        entro.set()
        await liberar.wait()

    transporte = TransporteControlado(pausa=pausa)
    worker = SMWorker(tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte})

    async def procesar():
        async with sessions() as session:
            return await worker.procesar_lote(session, limite=1)

    tarea = asyncio.create_task(procesar())
    try:
        await asyncio.wait_for(entro.wait(), timeout=10)
        segundo = await asyncio.wait_for(procesar(), timeout=10)
        assert segundo.procesados == 0
    finally:
        liberar.set()
    assert (await tarea).enviados == 1
    assert transporte.enviados == [msg.id]


async def test_recupera_lease_vencido_y_no_admite_finalizacion_antigua(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    tiempo = [datetime.now(UTC)]
    transporte = TransporteControlado()
    worker = SMWorker(
        tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte}, reloj=lambda: tiempo[0]
    )
    async with sessions() as session:
        antigua = await worker._reclamar(session, set())
    tiempo[0] += timedelta(seconds=settings.sm_worker_lease_segundos + 1)
    async with sessions() as session:
        assert (await worker.procesar_lote(session)).enviados == 1
    async with sessions() as session:
        with pytest.raises(SMError, match="sustituida"):
            await worker._finalizar(session, antigua, recibo=SMReciboTransporte(SMEstadoEntrega.ENVIADO, "ok"))
    async with sessions() as observer:
        entregas = (
            await observer.scalars(
                select(SMEntregaRegistro)
                .where(SMEntregaRegistro.mensaje_id == msg.id)
                .order_by(SMEntregaRegistro.intento)
            )
        ).all()
        assert [e.estado_entrega for e in entregas] == ["incierto", "enviado"]
    assert transporte.enviados == [msg.id]


async def test_worker_simulado_y_volcado_sin_contactos_o_error_crudo(sm310, caplog):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    async with sessions() as session:
        resumen = await SMWorker(tenant, settings=settings, resolutor=boveda).procesar_lote(session)
    assert resumen.simulados == 1 and resumen.enviados == 0
    async with sessions() as observer:
        for tabla in (
            SMEventoRegistro,
            SMMensajeRegistro,
            SMEntregaRegistro,
            SMAuditoriaRegistro,
            SMConsentimientoRegistro,
        ):
            datos = (
                (
                    await observer.execute(
                        text(
                            f"SELECT row_to_json(t) FROM participacion_ciudadana.{tabla.__tablename__} t "
                            "WHERE tenant=:tenant"
                        ),
                        {"tenant": tenant},
                    )
                )
                .scalars()
                .all()
            )
            assert ev.contacto.identificador not in json.dumps(datos, default=str)
        reg = await observer.get(SMMensajeRegistro, msg.id)
        assert reg.estado == "simulado" and not reg.reintentable
    msg2, _ = await encolar(sm310)
    transporte = TransporteControlado(error=RuntimeError("password=secreto " + ev.contacto.identificador))
    async with sessions() as session:
        await SMWorker(tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte}).procesar_lote(
            session
        )
    async with sessions() as observer:
        entrega = await observer.scalar(select(SMEntregaRegistro).where(SMEntregaRegistro.mensaje_id == msg2.id))
        assert entrega.detalle == "despacho_error" and "secreto" not in json.dumps(entrega.payload)
    assert ev.contacto.identificador not in caplog.text and "password=" not in caplog.text


async def test_worker_rechaza_transaccion_ajena_y_resolutor_cruzado(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    worker = SMWorker(tenant, settings=settings, resolutor=boveda)
    async with sessions() as session:
        async with transaction(session):
            with pytest.raises(SMError, match="sesión nueva"):
                await worker.procesar_lote(session)
    equivocado = SMContacto(canal=ev.canal, actor="otro", identificador=ev.contacto.identificador)
    async with sessions() as session:
        resumen = await worker.procesar_lote(session, contactos_resolver={msg.contacto_hash: equivocado})
    assert resumen.sin_contacto == 1 and resumen.enviados == 0


async def test_bridge_outbox_rollback_despues_de_escritura_real(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    bridge = SMBridge(tenant, settings=settings)
    async with sessions() as session:
        with pytest.raises(RuntimeError, match="dominio"):
            async with transaction(session):
                await bridge.notificar_convocatoria_mesa(
                    session,
                    mesa_id="prueba310",
                    mesa_nombre="Mesa",
                    actor=ev.actor,
                    canal=ev.canal,
                    contacto=ev.contacto.identificador,
                    fecha="2026-12-01",
                    lugar="Centro institucional",
                )
                raise RuntimeError("fallo posterior de dominio")
    async with sessions() as observer:
        ids = (await observer.scalars(select(SMMensajeRegistro.id).where(SMMensajeRegistro.tenant == tenant))).all()
        assert ids == [msg.id]


async def test_idempotencia_concurrente_y_contenido_distinto(sm310):
    sessions, boveda, tenant, _ = sm310
    _, ev = await encolar(sm310)

    async def alta():
        async with sessions() as session:
            return await SMServicioDB(session, tenant=tenant, boveda=boveda).procesar_evento(ev)

    a, b = await asyncio.gather(alta(), alta())
    assert a.id == b.id
    async with sessions() as session:
        with pytest.raises(SMIdempotenciaConflict):
            await SMServicioDB(session, tenant=tenant, boveda=boveda).procesar_evento(
                ev.model_copy(update={"cuerpo": "Contenido distinto"})
            )


async def test_puente_real_herald_transaccion_misma_sombra_sin_duplicar(sm310):
    from app.modules.identidad.schemas import UsuarioCreacion
    from app.modules.identidad.service import IdentidadService
    from app.modules.notificaciones.models import NotificacionTransaccional
    from app.modules.notificaciones.service import NotificacionService

    sessions, boveda, tenant, settings = sm310
    # El hook de la aplicación usa el tenant polis. Aislar por usuario e ID del outbox.
    correo = f"sm310-{uuid4().hex}@example.org"
    async with sessions() as session:
        usuario = await IdentidadService(session, settings=settings).registrar_usuario(
            UsuarioCreacion(correo=correo, contrasena="PruebaSM310Segura!", nombres="Prueba", apellidos="Aislada")
        )
    actor = str(usuario.id)
    async with sessions() as session:
        await SMServicioDB(session, boveda=boveda).registrar_consentimiento(
            actor=actor, canal=SMCanal.CORREO, contacto=correo, consentido=True
        )
    settings = settings.model_copy(update={"sm_eventos_dominio": ["gestion_institucional"]})
    async with sessions() as session:
        async with transaction(session):
            notificacion = await NotificacionService(session, settings=settings).enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Prueba",
                rol="Prueba",
                accion="Gestión",
                detalle_accion="Evento de dominio de prueba",
            )
    async with sessions() as observer:
        msg = await observer.scalar(
            select(SMMensajeRegistro).where(SMMensajeRegistro.idempotencia == f"herald:{notificacion.id}")
        )
        assert msg and msg.metadatos["sm_modo_sombra"] == "1"
        assert correo not in json.dumps(msg.metadatos) and correo not in (msg.cuerpo or "")
        assert (await observer.get(NotificacionTransaccional, notificacion.id)).estado_envio == "pendiente"
        msg_id = msg.id
    # Resolver/transportes solo para este actor; los demás mensajes polis se excluyen
    # temporalmente por tenant distinto en el worker de prueba, sin cambiar producción.
    async with sessions() as session:
        async with transaction(session):
            reg = await session.get(SMMensajeRegistro, msg_id)
            reg.proximo_intento_en = datetime.now(UTC) + timedelta(days=1)
    # Probar atomicidad del hook real: fallo tras flush revierte Herald y SM juntos.
    ids_nuevos = []
    async with sessions() as session:
        with pytest.raises(RuntimeError):
            async with transaction(session):
                n = await NotificacionService(session, settings=settings).enviar_comprobante_gestion_interna(
                    destinatario=correo,
                    nombre_actor="Prueba",
                    rol="Prueba",
                    accion="Gestión revertida",
                    detalle_accion="Operación de prueba",
                )
                ids_nuevos.append(n.id)
                raise RuntimeError("dominio revierte")
    async with sessions() as observer:
        assert await observer.get(NotificacionTransaccional, ids_nuevos[0]) is None
        assert (
            await observer.scalar(
                select(SMMensajeRegistro.id).where(SMMensajeRegistro.idempotencia == f"herald:{ids_nuevos[0]}")
            )
            is None
        )


async def test_modo_sombra_no_invoca_transporte_ni_con_credenciales(sm310):
    sessions, boveda, tenant, settings = sm310
    ev = evento(tenant).model_copy(update={"payload": {"sm_modo_sombra": "1"}})
    await encolar(sm310, ev)
    transporte = TransporteControlado()
    async with sessions() as session:
        r = await SMWorker(
            tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte}
        ).procesar_lote(session)
    assert r.simulados == 1 and r.enviados == 0 and not transporte.enviados


async def test_caida_en_ultimo_intento_agota_sin_repetir_despacho(sm310):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    tiempo = [datetime.now(UTC)]
    transporte = TransporteControlado()
    worker = SMWorker(
        tenant,
        settings=settings,
        resolutor=boveda,
        max_reintentos=1,
        transportes={ev.canal: transporte},
        reloj=lambda: tiempo[0],
    )
    async with sessions() as session:
        await worker._reclamar(session, set())
    tiempo[0] += timedelta(seconds=settings.sm_worker_lease_segundos + 1)
    async with sessions() as session:
        assert (await worker.procesar_lote(session)).agotados == 1
    assert not transporte.enviados
    async with sessions() as observer:
        assert (await observer.get(SMMensajeRegistro, msg.id)).estado == "agotado"
        entrega = await observer.scalar(select(SMEntregaRegistro).where(SMEntregaRegistro.mensaje_id == msg.id))
        assert entrega.estado_entrega == "incierto"
        assert await observer.scalar(
            select(SMAuditoriaRegistro.id).where(
                SMAuditoriaRegistro.mensaje_id == msg.id, SMAuditoriaRegistro.accion == "worker.agotado"
            )
        )


async def test_apagado_gracioso_no_reclama_otro_mensaje(sm310):
    sessions, boveda, tenant, settings = sm310
    _, ev = await encolar(sm310)
    await encolar(sm310)
    stop = asyncio.Event()

    async def parar():
        stop.set()

    transporte = TransporteControlado(pausa=parar)
    async with sessions() as session:
        r = await SMWorker(
            tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte}
        ).procesar_lote(session, detener=stop.is_set)
    assert r.enviados == r.procesados == 1
    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(SMMensajeRegistro)
                .where(SMMensajeRegistro.tenant == tenant, SMMensajeRegistro.estado == "pendiente")
            )
            == 1
        )


async def test_fallo_persistencia_final_revierte_sin_fingir_fallo_del_proveedor(sm310, monkeypatch):
    sessions, boveda, tenant, settings = sm310
    msg, ev = await encolar(sm310)
    transporte = TransporteControlado()
    worker = SMWorker(tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte})
    async with sessions() as session:
        original = session.flush

        async def fallar_despues_de_flush(*args, **kwargs):
            finales = [
                obj
                for obj in session.identity_map.values()
                if isinstance(obj, SMMensajeRegistro) and obj.estado == "enviado"
            ]
            await original(*args, **kwargs)
            if finales:
                raise RuntimeError("fallo de persistencia posterior al envío")

        monkeypatch.setattr(session, "flush", fallar_despues_de_flush)
        with pytest.raises(RuntimeError, match="persistencia"):
            await worker.procesar_lote(session)
    assert transporte.enviados == [msg.id]
    async with sessions() as observer:
        reg = await observer.get(SMMensajeRegistro, msg.id)
        assert reg.estado == "encolado" and reg.reclamacion_token is not None
        entrega = await observer.scalar(select(SMEntregaRegistro).where(SMEntregaRegistro.mensaje_id == msg.id))
        assert entrega.estado_entrega == "en_curso"
        assert not await observer.scalar(
            select(SMAuditoriaRegistro.id).where(
                SMAuditoriaRegistro.mensaje_id == msg.id, SMAuditoriaRegistro.accion == "worker.enviado"
            )
        )


@pytest.mark.parametrize("campo", ["actor", "cuerpo", "asunto", "payload"])
async def test_pii_en_campos_libres_rechazada_antes_de_persistir(sm310, campo):
    sessions, boveda, tenant, _ = sm310
    ev = evento(tenant)
    valor = {"extra": ev.contacto.identificador} if campo == "payload" else ev.contacto.identificador
    ev = ev.model_copy(update={campo: valor})
    async with sessions() as session:
        with pytest.raises(SMError):
            await SMServicioDB(session, tenant=tenant, boveda=boveda).procesar_evento(ev)
    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count()).select_from(SMEventoRegistro).where(SMEventoRegistro.tenant == tenant)
            )
            == 0
        )


async def test_backoff_respeta_techo_configurado(sm310):
    sessions, boveda, tenant, settings = sm310
    _, ev = await encolar(sm310)
    acotados = settings.model_copy(update={"sm_worker_base_segundos": 60, "sm_worker_max_espera_segundos": 60})
    tiempo = [datetime.now(UTC)]
    transporte = TransporteControlado(error=SMFalloTransporte("proveedor_ocupado", transitorio=True))
    worker = SMWorker(
        tenant,
        settings=acotados,
        resolutor=boveda,
        transportes={ev.canal: transporte},
        reloj=lambda: tiempo[0],
    )
    async with sessions() as session:
        resumen = await worker.procesar_lote(session)
    assert resumen.fallidos == 1
    async with sessions() as observer:
        reg = await observer.scalar(select(SMMensajeRegistro).where(SMMensajeRegistro.tenant == tenant))
        assert reg.reintentable is True
        espera = (reg.proximo_intento_en - tiempo[0]).total_seconds()
    assert 60 <= espera <= 61, espera


async def test_reclamacion_vencida_no_aborta_el_lote(sm310, monkeypatch):
    sessions, boveda, tenant, settings = sm310
    _, ev = await encolar(sm310)
    await encolar(sm310)
    transporte = TransporteControlado()
    worker = SMWorker(tenant, settings=settings, resolutor=boveda, transportes={ev.canal: transporte})
    original = worker._finalizar
    fallos = 1

    async def finalizar_incierta(session, rec, **kwargs):
        nonlocal fallos
        if fallos:
            fallos -= 1
            raise SMError("Reclamación vencida o sustituida; resultado externo incierto")
        return await original(session, rec, **kwargs)

    monkeypatch.setattr(worker, "_finalizar", finalizar_incierta)
    async with sessions() as session:
        resumen = await worker.procesar_lote(session, limite=2)
    assert (resumen.procesados, resumen.fallidos, resumen.enviados) == (2, 1, 1)
    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(SMMensajeRegistro)
                .where(
                    SMMensajeRegistro.tenant == tenant,
                    SMMensajeRegistro.estado.in_(["enviado", "simulado"]),
                )
            )
            == 1
        )


def test_corte_sm_exige_sombra_previa_del_mismo_tipo():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            jwt_secret_key="x" * 32,
            sm_corte_tipos=["gestion_institucional"],
        )
    valido = Settings(
        _env_file=None,
        jwt_secret_key="x" * 32,
        sm_eventos_dominio=["gestion_institucional"],
        sm_corte_tipos=["gestion_institucional"],
    )
    assert valido.sm_corte_tipos == ["gestion_institucional"]


async def _postergar_mensajes(sm310, ids: list) -> None:
    """Aísla la cola compartida: otros tests consumen el tenant polis sin resolver
    estos contactos y los marcarían `fallido` por `sin_contacto`."""
    sessions, _, _, _ = sm310
    async with sessions() as session:
        async with transaction(session):
            await session.execute(
                update(SMMensajeRegistro)
                .where(SMMensajeRegistro.id.in_(ids))
                .values(proximo_intento_en=datetime.now(UTC) + timedelta(days=1))
            )


async def _usuario_con_consentimiento(sm310, *, consentido: bool = True) -> str:
    from app.modules.identidad.schemas import UsuarioCreacion
    from app.modules.identidad.service import IdentidadService

    sessions, boveda, _, settings = sm310
    correo = f"corte-{uuid4().hex}@example.org"
    async with sessions() as session:
        usuario = await IdentidadService(session, settings=settings).registrar_usuario(
            UsuarioCreacion(correo=correo, contrasena="PruebaCorteSM2026!", nombres="Corte", apellidos="Delegado")
        )
    if consentido:
        async with sessions() as session:
            await SMServicioDB(session, boveda=boveda).registrar_consentimiento(
                actor=str(usuario.id), canal=SMCanal.CORREO, contacto=correo, consentido=True
            )
    return correo


async def test_corte_real_delega_el_envio_y_conserva_el_contenido(sm310):
    from app.modules.notificaciones.models import NotificacionTransaccional
    from app.modules.notificaciones.service import NotificacionService
    from app.modules.notificaciones.worker import NotificacionWorker

    sessions, _, _, base = sm310
    correo = await _usuario_con_consentimiento(sm310)
    corte = base.model_copy(
        update={"sm_eventos_dominio": ["gestion_institucional"], "sm_corte_tipos": ["gestion_institucional"]}
    )
    async with sessions() as session:
        async with transaction(session):
            notificacion = await NotificacionService(session, settings=corte).enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Corte",
                rol="Prueba",
                accion="Gestión",
                detalle_accion="Contenido real de Herald",
            )
    async with sessions() as observer:
        fila = await observer.get(NotificacionTransaccional, notificacion.id)
        assert fila is not None and fila.estado_envio == "delegado"
        mensaje = await observer.scalar(
            select(SMMensajeRegistro).where(SMMensajeRegistro.idempotencia == f"herald:{notificacion.id}")
        )
        assert mensaje is not None and mensaje.estado == "pendiente"
        assert mensaje.asunto == fila.asunto[:200]
        assert mensaje.cuerpo == fila.cuerpo_html
        assert "Contenido real de Herald" in (mensaje.cuerpo or "")
        assert "sm_modo_sombra" not in mensaje.metadatos
        assert correo not in json.dumps(mensaje.metadatos) and correo not in (mensaje.cuerpo or "")
    await _postergar_mensajes(sm310, [mensaje.id])
    # Herald no vuelve a reclamar una fila delegada: SM es el único emisor.
    async with sessions() as session:
        assert await NotificacionWorker(session, corte).procesar_uno(notificacion_id=notificacion.id) is None


async def test_corte_sin_consentimiento_conserva_el_envio_en_herald(sm310):
    from app.modules.notificaciones.models import NotificacionTransaccional
    from app.modules.notificaciones.service import NotificacionService
    from app.modules.notificaciones.worker import NotificacionWorker

    sessions, _, _, base = sm310
    correo = await _usuario_con_consentimiento(sm310, consentido=False)
    corte = base.model_copy(
        update={"sm_eventos_dominio": ["gestion_institucional"], "sm_corte_tipos": ["gestion_institucional"]}
    )
    async with sessions() as session:
        async with transaction(session):
            notificacion = await NotificacionService(session, settings=corte).enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Corte",
                rol="Prueba",
                accion="Gestión",
                detalle_accion="Sin consentimiento SM",
            )
    async with sessions() as observer:
        fila = await observer.get(NotificacionTransaccional, notificacion.id)
        assert fila is not None and fila.estado_envio == "pendiente"
        assert (
            await observer.scalar(
                select(SMMensajeRegistro.id).where(SMMensajeRegistro.idempotencia == f"herald:{notificacion.id}")
            )
            is None
        )

    async def transporte_simulado(**kwargs):
        return "simulado", "sin_transporte", None

    async with sessions() as session:
        resultado = await NotificacionWorker(session, corte).procesar_uno(
            notificacion_id=notificacion.id, transporte=transporte_simulado
        )
    assert resultado is not None and resultado.estado == "simulado"


async def test_reversa_liberan_solo_las_delegadas_no_entregadas_por_sm(sm310):
    from app.modules.notificaciones.models import NotificacionTransaccional
    from app.modules.notificaciones.service import NotificacionService

    sessions, _, _, base = sm310
    correo = await _usuario_con_consentimiento(sm310)
    corte = base.model_copy(
        update={"sm_eventos_dominio": ["gestion_institucional"], "sm_corte_tipos": ["gestion_institucional"]}
    )
    async with sessions() as session:
        async with transaction(session):
            servicio = NotificacionService(session, settings=corte)
            entregada = await servicio.enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Corte",
                rol="Prueba",
                accion="Gestión",
                detalle_accion="SM ya la entregó",
            )
            pendiente = await servicio.enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Corte",
                rol="Prueba",
                accion="Gestión",
                detalle_accion="SM no la entregó",
            )
    async with sessions() as session:
        async with transaction(session):
            mensaje = await session.scalar(
                select(SMMensajeRegistro).where(SMMensajeRegistro.idempotencia == f"herald:{entregada.id}")
            )
            assert mensaje is not None
            mensaje.estado = "enviado"
            mensaje_pendiente = await session.scalar(
                select(SMMensajeRegistro).where(SMMensajeRegistro.idempotencia == f"herald:{pendiente.id}")
            )
            assert mensaje_pendiente is not None
    await _postergar_mensajes(sm310, [mensaje.id, mensaje_pendiente.id])
    reversa = base.model_copy(update={"sm_eventos_dominio": ["gestion_institucional"], "sm_corte_tipos": []})
    async with sessions() as session:
        async with transaction(session):
            resumen = await SMBridge(settings=reversa).liberar_delegadas(session)
    assert resumen["liberadas"] >= 1 and resumen["conservadas_entregadas_por_sm"] >= 1
    async with sessions() as observer:
        assert (await observer.get(NotificacionTransaccional, pendiente.id)).estado_envio == "pendiente"
        assert (await observer.get(NotificacionTransaccional, entregada.id)).estado_envio == "delegado"
    # Con el corte todavía activo, liberar no devuelve nada de ese tipo.
    async with sessions() as session:
        async with transaction(session):
            otra = await NotificacionService(session, settings=corte).enviar_comprobante_gestion_interna(
                destinatario=correo,
                nombre_actor="Corte",
                rol="Prueba",
                accion="Gestión",
                detalle_accion="Sigue delegada",
            )
    async with sessions() as session:
        async with transaction(session):
            assert await SMBridge(settings=corte).liberar_delegadas(session) == {
                "liberadas": 0,
                "conservadas_entregadas_por_sm": 0,
            }
    async with sessions() as observer:
        assert (await observer.get(NotificacionTransaccional, otra.id)).estado_envio == "delegado"
        mensaje_otra = await observer.scalar(
            select(SMMensajeRegistro).where(SMMensajeRegistro.idempotencia == f"herald:{otra.id}")
        )
        assert mensaje_otra is not None
    await _postergar_mensajes(sm310, [mensaje_otra.id])


async def test_rotacion_de_boveda_conserva_huellas_anteriores(sm310):
    sessions, boveda, tenant, _ = sm310
    msg, ev = await encolar(sm310)
    rotada = SMBovedaContactoDB(claves={"v2": os.urandom(32), **boveda._claves}, key_id="v2")
    huellas = rotada.huellas(tenant, ev.actor, ev.canal.value, ev.contacto.identificador)
    assert msg.contacto_hash in huellas and huellas[0] != msg.contacto_hash

    async with sessions() as session:
        repo = SMRepository(tenant, boveda=rotada)
        async with transaction(session):
            assert await repo.verificar_consentimiento(session, actor=ev.actor, canal=ev.canal, contacto_hashes=huellas)
            await repo.registrar_consentimiento(
                session,
                actor=ev.actor,
                canal=ev.canal,
                contacto=ev.contacto.identificador,
                consentido=False,
            )

    async with sessions() as observer:
        assert (
            await observer.scalar(
                select(func.count())
                .select_from(SMContactoBovedaRegistro)
                .where(SMContactoBovedaRegistro.tenant == tenant)
            )
            == 0
        )

    nuevo = evento(tenant, contacto="nuevo-rotacion@example.invalid", actor="actor-nuevo")
    async with sessions() as session:
        async with transaction(session):
            consentimiento = await SMRepository(tenant, boveda=rotada).registrar_consentimiento(
                session,
                actor=nuevo.actor,
                canal=nuevo.canal,
                contacto=nuevo.contacto.identificador,
                consentido=True,
            )
    assert consentimiento.contacto_hash == rotada.huella(
        tenant, nuevo.actor, nuevo.canal.value, nuevo.contacto.identificador
    )
