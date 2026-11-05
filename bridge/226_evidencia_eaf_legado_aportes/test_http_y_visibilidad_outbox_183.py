"""Comprobación adicional EDD por HTTP y reclamación invisible antes de commit."""

import asyncio
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

URL = os.environ["POLIS_TEST_DATABASE_URL"]
assert make_url(URL).database == os.environ["POLIS_EAF_DATABASE"]
assert make_url(URL).database.startswith("polis_test_eaf_legado_r3_20261026_")

from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate
from app.modules.notificaciones.service import NotificacionService
from app.modules.notificaciones.worker import NotificacionWorker


def factory():
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def linea():
    engine, sesiones = factory()
    try:
        async with sesiones() as session:
            return await session.scalar(
                text("SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1")
            )
    finally:
        await engine.dispose()


def test_http_commit_real_409_y_peticion_posterior_201(monkeypatch):
    from app.modules.notificaciones import correo

    capturas = []
    monkeypatch.setattr(
        correo.smtplib, "SMTP", lambda *args, **kwargs: capturas.append(args)
    )
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=URL,
        smtp_host="captura-local.invalid",
        smtp_tls=False,
    )
    original = AporteRepository.crear
    escritos = []

    async def fallar_commit(self, *args, **kwargs):
        aporte = await original(self, *args, **kwargs)
        escritos.append((aporte.id, aporte.codigo_radicado))
        await self.session.execute(
            text(
                "CREATE TEMP TABLE edd_http_commit(v int UNIQUE DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP"
            )
        )
        await self.session.execute(text("INSERT INTO edd_http_commit VALUES(1),(1)"))
        return aporte

    async def observar(aporte_id, radicado):
        engine, sesiones = factory()
        try:
            async with sesiones() as session:
                propuesta = await session.scalar(
                    text(
                        "SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id"
                    ),
                    {"id": aporte_id},
                )
                intenciones = await session.scalar(
                    text(
                        "SELECT count(*) FROM participacion_ciudadana.notificaciones_transaccionales WHERE codigo_radicado=:rad"
                    ),
                    {"rad": radicado},
                )
                return propuesta, intenciones
        finally:
            await engine.dispose()

    with TestClient(create_app(settings), raise_server_exceptions=False) as cliente:
        sesion = cliente.post("/api/v1/sesion/anonima")
        assert sesion.status_code == 201
        headers = {"Authorization": "Bearer " + sesion.json()["token_acceso"]}
        datos = {
            "linea_id": str(asyncio.run(linea())),
            "titulo": "EDD HTTP " + uuid.uuid4().hex,
            "descripcion": "Commit real rechazado y recuperación de la siguiente petición",
            "correo_contacto": "privado-http@example.org",
        }
        monkeypatch.setattr(AporteRepository, "crear", fallar_commit)
        rechazo = cliente.post("/api/v1/aportes", headers=headers, json=datos)
        assert rechazo.status_code == 409
        assert asyncio.run(observar(*escritos[0])) == (0, 0) and capturas == []
        monkeypatch.setattr(AporteRepository, "crear", original)
        recuperacion = cliente.post("/api/v1/aportes", headers=headers, json=datos)
        assert recuperacion.status_code == 201
        resultado = recuperacion.json()
        assert asyncio.run(
            observar(uuid.UUID(resultado["id"]), resultado["codigo_radicado"])
        ) == (1, 1)
        assert capturas == [] and datos["correo_contacto"] not in recuperacion.text


def test_worker_no_reclama_intencion_no_confirmada():
    async def ejecutar():
        engine, sesiones = factory()
        capturas = []
        try:
            async with sesiones() as escritor:
                pid = await escritor.scalar(text("SELECT pg_backend_pid()"))
                async with transaction(escritor):
                    aporte = await AporteRepository(escritor).crear(
                        PropuestaCiudadanaCreate(
                            linea_id=await linea(),
                            titulo="Intención no confirmada " + uuid.uuid4().hex,
                            descripcion="El consumidor no ve la intención pendiente de commit",
                        )
                    )
                    notif = await NotificacionService(
                        escritor
                    ).enviar_constancia_radicacion(
                        destinatario="privado-worker@example.org",
                        radicado=aporte.codigo_radicado,
                        titulo=aporte.titulo,
                        descripcion=aporte.descripcion,
                        autor=aporte.autor_nombre,
                    )
                    async with sesiones() as observador:
                        assert (
                            await observador.scalar(text("SELECT pg_backend_pid()"))
                            != pid
                        )
                        worker = NotificacionWorker(
                            observador, Settings(_env_file=None, smtp_host="")
                        )

                        async def transporte(**kwargs):
                            capturas.append(kwargs["identificador_mensaje"])
                            return "simulado", None, None

                        assert (
                            await worker.procesar_uno(
                                notificacion_id=notif.id, transporte=transporte
                            )
                            is None
                        )
                        assert capturas == []
                async with sesiones() as observador:
                    resultado = await NotificacionWorker(
                        observador, Settings(_env_file=None, smtp_host="")
                    ).procesar_uno(notificacion_id=notif.id, transporte=transporte)
                    assert (
                        resultado.estado == "simulado"
                        and resultado.intentos == 1
                        and len(capturas) == 1
                    )
        finally:
            await engine.dispose()

    asyncio.run(ejecutar())
