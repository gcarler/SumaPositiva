"""Contrastes adicionales sobre usuarios inactivos, métricas y errores SMTP."""

from datetime import UTC, datetime, timedelta

import pytest
from app.core.transactions import transaction
from app.modules.identidad.models import Usuario
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.resumen_cli import ZONA_DISTRITAL, generar_resumen
from app.modules.notificaciones.salud import recolectar_salud
from app.modules.notificaciones.worker import NotificacionWorker
from sqlalchemy import func, select
from test_sondas_eaf_275 import (
    anyio_backend,
    notification,
    record,
    sessions,
    settings,
    user,
)

pytestmark = pytest.mark.anyio

# Importar fixtures las registra también en este módulo de pruebas aislado.
__all__ = ["anyio_backend", "sessions"]


async def test_baja_usuario_excluye_resumen_pese_a_actividad(sessions):
    identifier, email = await user(sessions, "auditor_forense")
    now = datetime.now(UTC)
    await notification(
        sessions,
        destinatario_correo=email,
        tipo_evento="gestion_institucional",
        estado_envio="enviado",
        creado_en=now,
    )
    async with sessions() as session, transaction(session):
        account = await session.get(Usuario, identifier)
        account.activo = False
        await session.flush()
    async with sessions() as session:
        recipients = await generar_resumen(
            session,
            settings(),
            fecha=now.astimezone(ZONA_DISTRITAL).date(),
            simular=False,
        )
    async with sessions() as session:
        count = await session.scalar(
            select(func.count())
            .select_from(NotificacionTransaccional)
            .where(
                NotificacionTransaccional.tipo_evento == "resumen_diario",
                NotificacionTransaccional.destinatario_correo == email,
            )
        )
    record(
        "baja_excluye_resumen",
        destinatario_excluido=email not in recipients,
        filas=count,
    )
    assert email not in recipients and count == 0


async def test_percentiles_excluyen_simulados_y_tasa_es_real(sessions):
    now = datetime.now(UTC)
    for latency in [10, 20, 100]:
        await notification(
            sessions,
            estado_envio="enviado",
            enviado_en=now,
            creado_en=now - timedelta(seconds=latency),
        )
    await notification(
        sessions,
        estado_envio="simulado",
        creado_en=now - timedelta(seconds=1000),
        simulado_en=now,
    )
    await notification(sessions, estado_envio="fallido", creado_en=now)
    async with sessions() as session:
        data = await recolectar_salud(session, settings())
    metrics = data["ultimas_24h"]
    record("metricas_percentiles", metricas=metrics)
    assert (
        metrics["enviados"] == 3
        and metrics["simulados"] == 1
        and metrics["fallidos"] == 1
    )
    assert metrics["tasa_exito"] == 0.75
    assert metrics["latencia_p50_s"] == pytest.approx(20)
    assert metrics["latencia_p95_s"] == pytest.approx(92)


async def test_error_smtp_no_persiste_mensaje_con_canario(sessions):
    identifier = await notification(
        sessions,
        estado_envio="pendiente",
        intentos=0,
        proximo_intento_en=None,
    )

    async def fail_transport(**kwargs):
        raise RuntimeError("CANARIO-EAF275-NO-ES-UNA-CLAVE-REAL")

    async with sessions() as session:
        await NotificacionWorker(session, settings()).procesar_uno(
            notificacion_id=identifier, transporte=fail_transport
        )
    async with sessions() as session:
        item = await session.get(NotificacionTransaccional, identifier)
        assert item.estado_envio == "fallido" and item.error_detalle == "RuntimeError"
    record("error_smtp", estado=item.estado_envio, error_detalle=item.error_detalle)
