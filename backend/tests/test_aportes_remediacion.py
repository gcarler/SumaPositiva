"""Regresiones EDD de aportes: transacciones reales y remediación de hallazgos171.

Las verificaciones observan conexiones físicas diferentes; no emiten dictamen EDD.
Las 35 variantes de atomicidad adaptan los escenarios públicos del evaluador171.
"""

import asyncio
import os
import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate, PropuestaCiudadanaRead, PropuestaCiudadanaUpdate
from app.modules.aportes.service import AporteService
from app.modules.auditoria.schemas import DevolucionRazonCrear, DevolucionRazonRespuesta
from app.modules.identidad.schemas import SujetoAutenticadoContexto

pytestmark = [pytest.mark.anyio, pytest.mark.usefixtures("database_url")]


@pytest.fixture
def anyio_backend():
    return "asyncio"


def factory():
    engine = create_async_engine(os.environ["POLIS_TEST_DATABASE_URL"], poolclass=NullPool, hide_parameters=True)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def line_id():
    engine, sessions = factory()
    try:
        async with sessions() as session:
            assert (
                await session.scalar(text("SELECT current_database()"))
                == make_url(os.environ["POLIS_TEST_DATABASE_URL"]).database
            )
            value = await session.scalar(text("SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1"))
            if value is None:
                async with transaction(session):
                    value = await session.scalar(
                        text("""
                        INSERT INTO motor_politicas.lineas_estrategicas
                            (fase_id, dimension_id, codigo, titulo, descripcion)
                        SELECT fase.id, dim.id, 'EDD-APORTES-171', 'Contexto EDD exclusivo', 'Datos sintéticos'
                        FROM motor_politicas.fases_politica fase
                        CROSS JOIN motor_politicas.dimensiones_seguridad_humana dim
                        ORDER BY fase.codigo, dim.codigo LIMIT 1 RETURNING id
                    """)
                    )
            assert value is not None
            return value
    finally:
        await engine.dispose()


def subject():
    return SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(), rol="ciudadano_anonimo", nivel_identidad="anonima", permisos=[], es_anonimo=True
    )


async def snapshot(proposal_id):
    engine, sessions = factory()
    try:
        async with sessions() as observer:
            pid = await observer.scalar(text("SELECT pg_backend_pid()"))
            row = (
                (
                    await observer.execute(
                        text("""
                SELECT id, codigo_radicado, titulo, estado, activo, apoyos_contador
                FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id
            """),
                        {"id": proposal_id},
                    )
                )
                .mappings()
                .first()
            )
            if row is None:
                return pid, None
            result = dict(row)
            result["supports"] = (
                await observer.execute(
                    text("""
                SELECT sujeto_id, tipo_sujeto FROM participacion_ciudadana.apoyos_propuestas
                WHERE propuesta_id=:id ORDER BY sujeto_id
            """),
                    {"id": proposal_id},
                )
            ).all()
            result["audits"] = await observer.scalar(
                text("SELECT count(*) FROM auditoria.registros_auditoria WHERE registro_id=:id"), {"id": proposal_id}
            )
            result["notifications"] = await observer.scalar(
                text(
                    "SELECT count(*) FROM participacion_ciudadana.notificaciones_transaccionales "
                    "WHERE codigo_radicado=:rad"
                ),
                {"rad": row["codigo_radicado"]},
            )
            return pid, result
    finally:
        await engine.dispose()


async def commit_failure(session):
    await session.execute(
        text("CREATE TEMP TABLE edd_deferred (v integer UNIQUE DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP")
    )
    await session.execute(text("INSERT INTO edd_deferred VALUES (1), (1)"))


async def prepare_case(session, case):
    repo = AporteRepository(session)
    service = AporteService(repo, Settings(_env_file=None))
    data = PropuestaCiudadanaCreate(
        linea_id=await line_id(),
        titulo="EDD " + uuid.uuid4().hex,
        descripcion="Aporte sintético de remediación",
        correo_contacto="cola-edd@example.org",
    )
    actor = subject()
    proposal_id = None
    if case != "crear":
        proposal_id = (await service.crear_propuesta(data)).id
        if case == "retirar":
            await service.apoyar_propuesta(proposal_id, actor)

    async def operation():
        if case == "crear":
            return await service.crear_propuesta(data)
        if case == "actualizar":
            return await service.actualizar_propuesta(
                proposal_id, PropuestaCiudadanaUpdate(titulo="Título cambiado EDD", estado="en_revision")
            )
        if case == "desactivar":
            return await service.desactivar_propuesta(proposal_id)
        if case == "apoyar":
            return await service.apoyar_propuesta(proposal_id, actor)
        if case == "alternar":
            return await service.alternar_apoyo(proposal_id, actor)
        if case == "retirar":
            return await service.retirar_apoyo(proposal_id, actor)
        return await service.registrar_devolucion_motivada(
            proposal_id,
            DevolucionRazonCrear(
                causal="tecnica", justificacion_motivada="Justificación técnica sintética para la auditoría EDD"
            ),
            actor,
        )

    return repo, proposal_id, operation


CASES = ["crear", "actualizar", "desactivar", "apoyar", "alternar", "retirar", "devolver"]


@pytest.mark.parametrize("case", CASES)
async def test_success_from_another_connection(case, monkeypatch):
    engine, sessions = factory()
    try:
        async with sessions() as session:
            repo, proposal_id, operation = await prepare_case(session, case)
            writer = await session.scalar(text("SELECT pg_backend_pid()"))
            commits = []
            original = session.commit

            async def counted_commit():
                commits.append(True)
                await original()

            monkeypatch.setattr(session, "commit", counted_commit)
            result = await operation()
            proposal_id = proposal_id or result.id
            assert len(commits) == 1
            reader, stored = await snapshot(proposal_id)
            assert reader != writer and stored is not None
            if case in {"apoyar", "alternar"}:
                assert len(stored["supports"]) == stored["apoyos_contador"] == 1
            if case == "retirar":
                assert len(stored["supports"]) == stored["apoyos_contador"] == 0
            if case == "devolver":
                assert stored["estado"] == "rechazado" and stored["audits"] == 1
            if case == "desactivar":
                assert stored["activo"] is False
            if case == "actualizar":
                assert stored["estado"] == "en_revision"
    finally:
        await engine.dispose()


FAILURES = [
    (case, stage)
    for case in CASES
    for stage in ("post_flush", "commit", "cancel", "validation")
    if not (case == "desactivar" and stage == "validation")
]


@pytest.mark.parametrize("case,stage", FAILURES)
async def test_complete_rollback_real_database(case, stage, monkeypatch):
    engine, sessions = factory()
    try:
        async with sessions() as session:
            repo, proposal_id, operation = await prepare_case(session, case)
            _, baseline = await snapshot(proposal_id)
            writer = await session.scalar(text("SELECT pg_backend_pid()"))
            flushed = []
            ids = []
            original_flush = session.flush

            async def injected_flush(*args, **kwargs):
                pending = list(session.new)
                await original_flush(*args, **kwargs)
                if not flushed:
                    flushed.append(True)
                    ids.extend(obj.id for obj in pending if obj.__class__.__name__ == "PropuestaCiudadana")
                    if stage == "post_flush":
                        raise RuntimeError("EDD after SQL flush")
                    if stage == "cancel":
                        raise asyncio.CancelledError()
                    if stage == "commit":
                        await commit_failure(session)

            monkeypatch.setattr(session, "flush", injected_flush)
            if stage == "validation":
                response = DevolucionRazonRespuesta if case == "devolver" else PropuestaCiudadanaRead
                if case == "alternar":
                    import app.modules.aportes.service as service_module

                    original_response = service_module.RespuestaToggleApoyo

                    def invalid_response(**kwargs):
                        return original_response(**{**kwargs, "apoyos_contador": "invalid"})

                    monkeypatch.setattr(service_module, "RespuestaToggleApoyo", invalid_response)
                else:
                    original_response = response.model_validate

                    def invalid_response(cls, value):
                        assert value.id is not None
                        return original_response({"id": None})

                    monkeypatch.setattr(response, "model_validate", classmethod(invalid_response))
            expected = {
                "post_flush": RuntimeError,
                "cancel": asyncio.CancelledError,
                "commit": IntegrityError,
                "validation": ValidationError,
            }[stage]
            with pytest.raises(expected):
                await operation()
            assert flushed and not session.in_transaction()
            assert await session.scalar(text("SELECT 1")) == 1
            await session.rollback()
            proposal_id = proposal_id or ids[0]
            reader, stored = await snapshot(proposal_id)
            assert writer != reader and stored == baseline
    finally:
        await engine.dispose()


async def test_repository_flush_is_not_commit():
    engine, sessions = factory()
    try:
        async with sessions() as session:
            obj = await AporteRepository(session).crear(
                PropuestaCiudadanaCreate(
                    linea_id=await line_id(),
                    titulo="EDD flush sin commit",
                    descripcion="Se observa desde otra conexión",
                )
            )
            pid = await session.scalar(text("SELECT pg_backend_pid()"))
            reader, before = await snapshot(obj.id)
            assert before is None and pid != reader
            await session.rollback()
            _, after = await snapshot(obj.id)
            assert after is None
    finally:
        await engine.dispose()


@pytest.mark.parametrize("caso", ["crear", "actualizar"])
@pytest.mark.parametrize("fallo", ["post_flush", "commit", "cancel", "validation"])
async def test_outbox_rollback_nunca_invoca_smtp(caso, fallo, monkeypatch):
    import app.modules.notificaciones.correo as correo
    from app.modules.notificaciones.models import NotificacionTransaccional

    capturas = []
    monkeypatch.setattr(correo.smtplib, "SMTP", lambda *args, **kwargs: capturas.append(args))
    engine, sessions = factory()
    try:
        async with sessions() as session:
            servicio = AporteService(
                AporteRepository(session), Settings(_env_file=None, smtp_host="captura.invalid", smtp_tls=False)
            )
            datos = PropuestaCiudadanaCreate(
                linea_id=await line_id(),
                titulo="Outbox " + uuid.uuid4().hex,
                descripcion="Intención durable sin efecto SMTP durante el caso",
                correo_contacto="privado@example.org",
            )
            propuesta_id = None
            if caso == "actualizar":
                propuesta_id = (await servicio.crear_propuesta(datos)).id
            _, antes = await snapshot(propuesta_id)
            original = session.flush
            creados, escritos = [], []

            async def fallo_tras_intencion(*args, **kwargs):
                pendientes = list(session.new)
                await original(*args, **kwargs)
                creados.extend(obj.id for obj in pendientes if obj.__class__.__name__ == "PropuestaCiudadana")
                if any(isinstance(obj, NotificacionTransaccional) for obj in pendientes) and not escritos:
                    escritos.append(True)
                    if fallo == "post_flush":
                        raise RuntimeError("Fallo después de insertar intención")
                    if fallo == "cancel":
                        raise asyncio.CancelledError()
                    if fallo == "commit":
                        await commit_failure(session)

            monkeypatch.setattr(session, "flush", fallo_tras_intencion)
            if fallo == "validation":
                validar = PropuestaCiudadanaRead.model_validate
                monkeypatch.setattr(
                    PropuestaCiudadanaRead, "model_validate", classmethod(lambda cls, value: validar({"id": None}))
                )
            esperado = {
                "post_flush": RuntimeError,
                "commit": IntegrityError,
                "cancel": asyncio.CancelledError,
                "validation": ValidationError,
            }[fallo]
            with pytest.raises(esperado):
                if caso == "crear":
                    await servicio.crear_propuesta(datos)
                else:
                    await servicio.actualizar_propuesta(propuesta_id, PropuestaCiudadanaUpdate(estado="en_revision"))
            assert escritos and not capturas and not session.in_transaction()
            _, despues = await snapshot(propuesta_id or creados[0])
            assert despues == antes
    finally:
        await engine.dispose()


async def encolar(session):
    from sqlalchemy import select

    from app.modules.notificaciones.models import NotificacionTransaccional

    propuesta = await AporteService(AporteRepository(session)).crear_propuesta(
        PropuestaCiudadanaCreate(
            linea_id=await line_id(),
            titulo="Worker " + uuid.uuid4().hex,
            descripcion="Entrega con consumidor separado",
            correo_contacto="destino@example.org",
        )
    )
    notificacion_id = await session.scalar(
        select(NotificacionTransaccional.id).where(
            NotificacionTransaccional.codigo_radicado == propuesta.codigo_radicado
        )
    )
    await session.rollback()
    return propuesta.id, notificacion_id


async def test_outbox_solo_confirmado_y_retry_identificable():
    from datetime import timedelta

    from app.modules.notificaciones.models import NotificacionTransaccional
    from app.modules.notificaciones.worker import NotificacionWorker

    engine, sessions = factory()
    try:
        async with sessions() as session:
            propuesta_id, notificacion_id = await encolar(session)
            ids = []

            async def transporte(**kwargs):
                ids.append(kwargs["identificador_mensaje"])
                async with sessions() as observador:
                    assert await observador.get(NotificacionTransaccional, notificacion_id) is not None
                    _, estado = await snapshot(propuesta_id)
                    assert estado["notifications"] == 1
                if len(ids) == 1:
                    raise RuntimeError("Fallo local de proveedor")
                return "simulado", None, None

            worker = NotificacionWorker(session, Settings(_env_file=None, smtp_host=""))
            fallo = await worker.procesar_uno(transporte=transporte, notificacion_id=notificacion_id)
            assert fallo.estado == "fallido" and fallo.intentos == 1
            assert await worker.procesar_uno(transporte=transporte, notificacion_id=notificacion_id) is None
            async with sessions() as cambio, transaction(cambio):
                fila = await cambio.get(NotificacionTransaccional, notificacion_id)
                fila.proximo_intento_en = datetime.now(UTC) - timedelta(seconds=1)
            exito = await worker.procesar_uno(transporte=transporte, notificacion_id=notificacion_id)
            assert exito.estado == "simulado" and exito.intentos == 2 and ids[0] == ids[1]
            async with sessions() as observador:
                fila = await observador.get(NotificacionTransaccional, notificacion_id)
                assert fila.enviado_en is None and fila.simulado_en is not None and fila.reclamo_token is None
    finally:
        await engine.dispose()


async def test_outbox_dos_workers_una_reclamacion_y_lease_recuperable():
    from datetime import timedelta

    from app.modules.notificaciones.models import NotificacionTransaccional
    from app.modules.notificaciones.worker import NotificacionWorker

    engine, sessions = factory()
    try:
        async with sessions() as primera, sessions() as segunda:
            _, notificacion_id = await encolar(primera)
            inicio, liberar = asyncio.Event(), asyncio.Event()
            capturas = []

            async def lento(**kwargs):
                capturas.append(kwargs["identificador_mensaje"])
                inicio.set()
                await liberar.wait()
                return "simulado", None, None

            tarea = asyncio.create_task(
                NotificacionWorker(primera, Settings()).procesar_uno(transporte=lento, notificacion_id=notificacion_id)
            )
            await asyncio.wait_for(inicio.wait(), 10)
            assert (
                await NotificacionWorker(segunda, Settings()).procesar_uno(
                    transporte=lento, notificacion_id=notificacion_id
                )
                is None
            )
            # Simula caída/reclamación vencida tras una posible aceptación del proveedor.
            async with sessions() as cambio, transaction(cambio):
                fila = await cambio.get(NotificacionTransaccional, notificacion_id)
                fila.reclamo_vence_en = datetime.now(UTC) - timedelta(seconds=1)

            async def recuperado(**kwargs):
                capturas.append(kwargs["identificador_mensaje"])
                return "simulado", None, None

            resultado = await NotificacionWorker(segunda, Settings()).procesar_uno(
                transporte=recuperado, notificacion_id=notificacion_id
            )
            liberar.set()
            anterior = await tarea
            assert anterior.estado == "reclamo_perdido" and resultado.intentos == 2
            assert len(capturas) == 2 and capturas[0] == capturas[1]
    finally:
        await engine.dispose()


def configuracion_http(database_url):
    return Settings(_env_file=None, database_url=database_url, environment="test", smtp_host="")


def sesion_civica(client):
    respuesta = client.post("/api/v1/sesion/anonima")
    assert respuesta.status_code == 201
    return {"Authorization": "Bearer " + respuesta.json()["token_acceso"]}


@pytest.mark.parametrize("estado", ["en_revision", "rechazado", "incorporado"])
def test_alta_ciudadana_no_admite_decisiones_institucionales(database_url, estado):
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(configuracion_http(database_url))) as client:
        datos = {
            "linea_id": str(asyncio.run(line_id())),
            "titulo": "Alta prohibida " + uuid.uuid4().hex,
            "descripcion": "La recepción no decide institucionalmente",
            "estado": estado,
        }
        headers = sesion_civica(client)
        respuesta = client.post("/api/v1/aportes", json=datos, headers=headers)
        assert respuesta.status_code == 422
        assert client.get("/api/v1/aportes", params={"busqueda": datos["titulo"]}).json()["total"] == 0


def test_privacidad_publica_incluye_json_heredado_y_devolucion(database_url, cabeceras_gestion):
    import json

    from fastapi.testclient import TestClient

    from app.main import create_app

    privado = "contacto-secreto@example.org"
    telefono = "+573007654321"
    with TestClient(create_app(configuracion_http(database_url))) as client:
        datos = {
            "linea_id": str(asyncio.run(line_id())),
            "titulo": "Privacidad " + uuid.uuid4().hex,
            "descripcion": "El contacto no forma parte del texto público",
            "correo_contacto": privado,
            "metadatos": {"canal": "web", "anidado": [{"destino": privado, "telefono": telefono}]},
            "metadata_enfoque": {"etnia": "indigena", "datos_adicionales": {"contacto": privado}, "extra": telefono},
            "archivos_adjuntos": [{"correo": privado, "telefono": telefono}],
        }
        respuesta = client.post("/api/v1/aportes", json=datos, headers=sesion_civica(client))
        assert respuesta.status_code == 201
        propuesta_id = respuesta.json()["id"]
        assert privado not in respuesta.text and telefono not in respuesta.text

        async def insertar_herencia():
            engine, sessions = factory()
            try:
                async with sessions() as session, transaction(session):
                    await session.execute(
                        text("""
                        UPDATE participacion_ciudadana.propuestas_ciudadanas
                        SET metadatos=metadatos || CAST(:privado AS jsonb)
                        WHERE id=CAST(:id AS uuid)
                    """),
                        {
                            "id": propuesta_id,
                            "privado": json.dumps({"correo_contacto": privado, "destinos": [telefono]}),
                        },
                    )
            finally:
                await engine.dispose()

        asyncio.run(insertar_herencia())
        editar = client.patch(
            f"/api/v1/aportes/{propuesta_id}", json={"estado": "en_revision"}, headers=cabeceras_gestion
        )
        assert editar.status_code == 200
        devolver = client.post(
            f"/api/v1/aportes/{propuesta_id}/devolucion-razon",
            headers=cabeceras_gestion,
            json={
                "causal": "tecnica",
                "justificacion_motivada": "Razón técnica pública suficientemente detallada",
                "metadatos": {"contacto": {"correo": privado, "telefono": telefono}},
            },
        )
        assert devolver.status_code == 201
        lecturas = [
            respuesta,
            editar,
            devolver,
            client.get(f"/api/v1/aportes/{propuesta_id}"),
            client.get("/api/v1/aportes", params={"busqueda": datos["titulo"]}),
            client.get(f"/api/v1/aportes/{propuesta_id}/devolucion-razon"),
        ]
        for lectura in lecturas:
            assert lectura.status_code in {200, 201}
            assert privado not in lectura.text and telefono not in lectura.text
            assert "huella_hash" not in lectura.text and "sesion_id" not in lectura.text

        async def persistencia_privada():
            engine, sessions = factory()
            try:
                async with sessions() as session:
                    fila = (
                        await session.execute(
                            text("""
                        SELECT correo_contacto,metadatos FROM participacion_ciudadana.propuestas_ciudadanas
                        WHERE id=CAST(:id AS uuid)
                    """),
                            {"id": propuesta_id},
                        )
                    ).one()
                    assert fila.correo_contacto == privado and fila.metadatos["correo_contacto"] == privado
            finally:
                await engine.dispose()

        asyncio.run(persistencia_privada())


def registrar_dos_logins(client):
    correo = "cuenta-apoyos-" + uuid.uuid4().hex + "@example.org"
    peticion = {"correo": correo, "contrasena": "ApoyosSeguros2026*", "nombres": "Cuenta", "apellidos": "Única"}
    cuenta = client.post("/api/v1/identidad/registro", json=peticion)
    assert cuenta.status_code == 201
    logins = [
        client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": peticion["contrasena"]})
        for _ in range(2)
    ]
    assert all(login.status_code == 200 for login in logins)
    return uuid.UUID(cuenta.json()["id"]), [
        {"Authorization": "Bearer " + login.json()["token_acceso"]} for login in logins
    ]


def test_dos_logins_una_cuenta_consulta_toggle_retiro_y_revocacion(database_url):
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(configuracion_http(database_url))) as client:
        usuario_id, headers = registrar_dos_logins(client)
        propuesta = client.post(
            "/api/v1/aportes",
            headers=headers[0],
            json={
                "linea_id": str(asyncio.run(line_id())),
                "titulo": "Principal estable " + uuid.uuid4().hex,
                "descripcion": "Dos sesiones pertenecen a la misma cuenta",
            },
        )
        assert propuesta.status_code == 201
        propuesta_id = propuesta.json()["id"]
        assert client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers[0]).json()["apoyado"] is True
        assert (
            propuesta_id in client.get("/api/v1/aportes/mis-apoyos", headers=headers[1]).json()["propuestas_apoyadas"]
        )
        segundo = client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers[1])
        assert segundo.status_code == 200 and segundo.json()["apoyado"] is False
        assert segundo.json()["apoyos_contador"] == 0
        assert client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers[1]).json()["apoyado"] is True
        _, almacenado = asyncio.run(snapshot(uuid.UUID(propuesta_id)))
        assert almacenado["supports"] == [(usuario_id, "usuario")]
        assert (
            client.delete(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers[0]).json()["apoyos_contador"] == 0
        )
        assert client.post("/api/v1/identidad/logout", headers=headers[0]).status_code == 200
        assert client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers[0]).status_code == 401

        async def desactivar_cuenta():
            engine, sessions = factory()
            try:
                async with sessions() as session, transaction(session):
                    await session.execute(
                        text("UPDATE autenticacion.usuarios SET activo=false WHERE id=:id"), {"id": usuario_id}
                    )
            finally:
                await engine.dispose()

        asyncio.run(desactivar_cuenta())
        assert client.get("/api/v1/aportes/mis-apoyos", headers=headers[1]).status_code == 401
        assert client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers[1]).status_code == 401


def test_concurrencia_http_toggle_y_devolucion(database_url, cabeceras_gestion, monkeypatch):
    import threading
    from concurrent.futures import ThreadPoolExecutor

    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(configuracion_http(database_url))) as client:
        usuario_id, sesiones = registrar_dos_logins(client)
        respuesta = client.post(
            "/api/v1/aportes",
            headers=sesiones[0],
            json={
                "linea_id": str(asyncio.run(line_id())),
                "titulo": "Concurrencia " + uuid.uuid4().hex,
                "descripcion": "Dos peticiones usan conexiones independientes",
            },
        )
        assert respuesta.status_code == 201
        propuesta_id = respuesta.json()["id"]
        barrera = threading.Barrier(2)
        pids = []
        original = AporteRepository.obtener_por_id

        async def sincronizar_antes_lock(self, *args, **kwargs):
            if kwargs.get("bloquear"):
                pids.append(await self.session.scalar(text("SELECT pg_backend_pid()")))
                await asyncio.to_thread(barrera.wait, 10)
            return await original(self, *args, **kwargs)

        monkeypatch.setattr(AporteRepository, "obtener_por_id", sincronizar_antes_lock)

        def apoyar(headers):
            return client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers)

        with ThreadPoolExecutor(max_workers=2) as pool:
            resultados = list(pool.map(apoyar, sesiones))
        assert [r.status_code for r in resultados] == [200, 200]
        assert {r.json()["apoyado"] for r in resultados} == {True, False}
        assert len(set(pids)) == 2
        _, almacenado = asyncio.run(snapshot(uuid.UUID(propuesta_id)))
        assert almacenado["apoyos_contador"] == 0 and almacenado["supports"] == []
        barrera = threading.Barrier(2)
        pids.clear()

        def devolver(causal):
            return client.post(
                f"/api/v1/aportes/{propuesta_id}/devolucion-razon",
                headers=cabeceras_gestion,
                json={
                    "causal": causal,
                    "justificacion_motivada": "Decisión técnica motivada en concurrencia autorizada",
                },
            )

        with ThreadPoolExecutor(max_workers=2) as pool:
            resultados = list(pool.map(devolver, ["tecnica", "presupuestal"]))
        assert sorted(r.status_code for r in resultados) == [201, 400]
        assert len(set(pids)) == 2
        _, almacenado = asyncio.run(snapshot(uuid.UUID(propuesta_id)))
        assert almacenado["estado"] == "rechazado" and almacenado["audits"] == 1


async def test_metadata_check_tipo_sujeto_coincide_con_restriccion_efectiva():
    from sqlalchemy import CheckConstraint

    from app.modules.aportes.models import ApoyoPropuesta

    declarado = next(c for c in ApoyoPropuesta.__table__.constraints if isinstance(c, CheckConstraint))
    assert declarado.name == "chk_tipo_sujeto"
    assert str(declarado.sqltext) == "tipo_sujeto IN ('usuario', 'sesion_anonima')"
    engine, sessions = factory()
    try:
        async with sessions() as session:
            fila = (
                await session.execute(
                    text("""
                SELECT pg_get_constraintdef(oid) AS definicion,convalidated
                FROM pg_constraint WHERE conname='chk_tipo_sujeto'
                AND conrelid='participacion_ciudadana.apoyos_propuestas'::regclass
            """)
                )
            ).one()
            assert fila.convalidated
            assert "'usuario'" in fila.definicion and "'sesion_anonima'" in fila.definicion
            propuesta = await AporteService(AporteRepository(session)).crear_propuesta(
                PropuestaCiudadanaCreate(
                    linea_id=await line_id(),
                    titulo="Restricción efectiva " + uuid.uuid4().hex,
                    descripcion="El catálogo y la escritura aplican la misma condición",
                )
            )
            with pytest.raises(IntegrityError, match="chk_tipo_sujeto"):
                async with transaction(session):
                    session.add(
                        ApoyoPropuesta(propuesta_id=propuesta.id, sujeto_id=uuid.uuid4(), tipo_sujeto="cuenta_falsa")
                    )
            _, almacenado = await snapshot(propuesta.id)
            assert almacenado["apoyos_contador"] == 0 and almacenado["supports"] == []
    finally:
        await engine.dispose()


async def test_contexto_anonimo_no_se_convierte_en_cuenta_por_afirmacion_del_cliente():
    from types import SimpleNamespace

    from fastapi import HTTPException

    engine, sessions = factory()
    try:
        async with sessions() as session:
            propuesta = await AporteService(AporteRepository(session)).crear_propuesta(
                PropuestaCiudadanaCreate(
                    linea_id=await line_id(),
                    titulo="Contexto falsificado " + uuid.uuid4().hex,
                    descripcion="Un UUID sin sesión registrada no acredita una cuenta",
                )
            )
            falso = SimpleNamespace(sesion_id=uuid.uuid4(), sujeto_id=uuid.uuid4(), es_anonimo=False)
            with pytest.raises(HTTPException) as error:
                await AporteService(AporteRepository(session)).alternar_apoyo(propuesta.id, falso)
            assert error.value.status_code == 401
            _, almacenado = await snapshot(propuesta.id)
            assert almacenado["apoyos_contador"] == 0
    finally:
        await engine.dispose()
