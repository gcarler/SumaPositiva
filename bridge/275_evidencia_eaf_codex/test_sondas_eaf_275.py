"""Pruebas independientes; únicamente polis_test_eaf_275_codex_probes.

Los casos de defectos afirman el comportamiento exigido, por lo que fallan
con el snapshot auditado. No se alteran código ni pruebas del implementador.
"""

import asyncio
import json
import os
import uuid
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest
from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.identidad.models import Rol, Usuario
from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
from app.modules.identidad.service import IdentidadService
from app.modules.notificaciones.models import HeraldLatido, NotificacionTransaccional
from app.modules.notificaciones.resumen_cli import generar_resumen
from app.modules.notificaciones.salud import escribir_latido, recolectar_salud
from app.modules.notificaciones.service import NotificacionService
from app.modules.notificaciones.worker import MAX_INTENTOS, NotificacionWorker
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

E = Path(__file__).resolve().parent
pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def sessions():
    url = os.environ["POLIS_TEST_DATABASE_URL"]
    assert url.rsplit("/", 1)[-1] == "polis_test_eaf_275_codex_probes"
    engine = create_async_engine(url, poolclass=NullPool, hide_parameters=True)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        assert (
            await conn.scalar(text("SELECT current_database()"))
            == "polis_test_eaf_275_codex_probes"
        )
        await conn.execute(
            text("DELETE FROM participacion_ciudadana.notificaciones_transaccionales")
        )
        await conn.execute(text("DELETE FROM participacion_ciudadana.herald_latido"))
    try:
        yield factory
    finally:
        await engine.dispose()


def record(case, **values):
    with (E / "sondas.jsonl").open("a") as output:
        output.write(
            json.dumps({"case": case, **values}, default=str, ensure_ascii=False) + "\n"
        )


def settings(**kwargs):
    return Settings(_env_file=None, environment="test", **kwargs)


async def notification(sessions, **overrides):
    fields = {
        "codigo_radicado": "EAF275-" + uuid.uuid4().hex[:16],
        "destinatario_correo": "auditoria@example.org",
        "tipo_evento": "registro_bienvenida",
        "asunto": "Fixture EAF 275",
        "cuerpo_html": "<p>Fixture sin datos reales</p>",
        "estado_envio": "fallido",
        "intentos": MAX_INTENTOS,
        "error_detalle": "SMTPServerDisconnected",
        "proximo_intento_en": datetime.now(UTC) + timedelta(minutes=30),
    }
    fields.update(overrides)
    async with sessions() as session, transaction(session):
        item = NotificacionTransaccional(**fields)
        session.add(item)
        await session.flush()
        return item.id


async def user(sessions, role="autoridad_distrital"):
    email = f"eaf275-{uuid.uuid4().hex}@example.org"
    async with sessions() as session:
        result = await IdentidadService(session, settings=settings()).registrar_usuario(
            UsuarioCreacion(
                correo=email,
                contrasena="FixtureEaf275*2026",
                nombres="Fixture",
                apellidos="Independiente",
            )
        )
        async with transaction(session):
            item = await session.get(Usuario, result.id)
            item.rol_id = await session.scalar(select(Rol.id).where(Rol.codigo == role))
            item.correo_verificado_en = datetime.now(UTC)
            await session.flush()
        return result.id, email


async def state(sessions, identifier):
    async with sessions() as session:
        item = await session.get(NotificacionTransaccional, identifier)
        n = await session.scalar(
            select(func.count())
            .select_from(RegistroAuditoria)
            .where(
                RegistroAuditoria.registro_id == identifier,
                RegistroAuditoria.accion == "REINTENTO_MANUAL_HERALD",
            )
        )
        return {
            "estado": item.estado_envio,
            "intentos": item.intentos,
            "error": item.error_detalle,
            "proximo": item.proximo_intento_en,
            "auditorias": n,
        }


async def test_contrato_permisos_sesiones_reales_y_revocacion(sessions):
    identifiers = {}
    tokens = {}
    for role in [
        "ciudadano",
        "auditor_forense",
        "autoridad_distrital",
        "administrador_identidades",
    ]:
        identifier, email = await user(sessions, role)
        identifiers[role] = identifier
        async with sessions() as session:
            result = await IdentidadService(
                session, settings=settings()
            ).autenticar_usuario(
                LoginPeticion(correo=email, contrasena="FixtureEaf275*2026")
            )
            tokens[role] = result.token_acceso
    target = await notification(sessions)
    cfg = settings(
        smtp_host="smtp.fixture-privada.invalid",
        smtp_usuario="usuario-smtp-fixture",
        smtp_contrasena="clave-smtp-fixture",
    )
    app = create_app(cfg)
    observed = {}
    with TestClient(app) as client:
        for role, token in [("anonimo", None), *tokens.items()]:
            headers = {"Authorization": "Bearer " + token} if token else {}
            observed[role] = {
                "salud": client.get(
                    "/api/v1/notificaciones/salud", headers=headers
                ).status_code,
                "reintento": client.post(
                    f"/api/v1/notificaciones/{target}/reintentar", headers=headers
                ).status_code,
            }
        response = client.get(
            "/api/v1/notificaciones/salud",
            headers={"Authorization": "Bearer " + tokens["auditor_forense"]},
        )
        for value in [cfg.smtp_host, cfg.smtp_usuario, cfg.smtp_contrasena]:
            assert value not in response.text
        public = client.get("/api/v1/health/herald")
        assert public.status_code == 200 and set(public.json()) == {"estado", "motivos"}
        async with sessions() as session, transaction(session):
            item = await session.get(Usuario, identifiers["auditor_forense"])
            item.activo = False
            await session.flush()
        revoked = client.get(
            "/api/v1/notificaciones/salud",
            headers={"Authorization": "Bearer " + tokens["auditor_forense"]},
        ).status_code
    record(
        "permisos_reales", observed=observed, revocado=revoked, publico=public.json()
    )
    assert observed["anonimo"] == {"salud": 401, "reintento": 401}
    assert observed["ciudadano"] == {"salud": 403, "reintento": 403}
    assert observed["auditor_forense"] == {"salud": 200, "reintento": 403}
    # Autoridad posee salud pero no usuarios:gestionar; administrador sí reintenta.
    assert observed["autoridad_distrital"]["reintento"] == 403
    assert observed["administrador_identidades"]["reintento"] == 200
    assert revoked == 401


async def test_reintento_exito_auditado_desde_otra_conexion(sessions):
    actor, _ = await user(sessions)
    identifier = await notification(sessions)
    async with sessions() as session:
        await NotificacionService(session, settings=settings()).reintentar_manual(
            identifier, SimpleNamespace(sujeto_id=actor)
        )
    actual = await state(sessions, identifier)
    async with sessions() as session:
        audit = (
            await session.execute(
                select(RegistroAuditoria).where(
                    RegistroAuditoria.registro_id == identifier
                )
            )
        ).scalar_one()
        assert (
            audit.usuario_id == actor
            and audit.metadatos["intentos_previos"] == MAX_INTENTOS
        )
    record("retry_exito", estado=actual)
    assert actual == {
        "estado": "pendiente",
        "intentos": 0,
        "error": None,
        "proximo": None,
        "auditorias": 1,
    }


@pytest.mark.parametrize(
    "scenario", ["auditoria_flush", "commit", "cancelacion", "validacion"]
)
async def test_reintento_rollback_real(sessions, monkeypatch, scenario):
    actor, _ = await user(sessions)
    identifier = await notification(sessions)
    raised = False
    async with sessions() as session:
        original_flush = session.flush
        original_commit = session.commit

        async def flush(*args, **kwargs):
            await original_flush(*args, **kwargs)
            if scenario == "validacion":
                raise ValueError("EAF-fallo-validacion-posterior-a-flush")
            if scenario == "cancelacion":
                raise asyncio.CancelledError("EAF-cancelacion-posterior-a-flush")

        async def fail_commit():
            raise RuntimeError("EAF-fallo-commit")

        if scenario == "auditoria_flush":
            # Trigger real tras el primer UPDATE, en esta base aislada.
            async with sessions() as admin, transaction(admin):
                await admin.execute(
                    text(
                        "CREATE OR REPLACE FUNCTION public.eaf275_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.accion='REINTENTO_MANUAL_HERALD' THEN RAISE EXCEPTION 'EAF275-fallo-auditoria'; END IF; RETURN NEW; END $$"
                    )
                )
                await admin.execute(
                    text(
                        "CREATE TRIGGER eaf275_audit_fail BEFORE INSERT ON auditoria.registros_auditoria FOR EACH ROW EXECUTE FUNCTION public.eaf275_audit_fail()"
                    )
                )
        elif scenario == "commit":
            monkeypatch.setattr(session, "commit", fail_commit)
        else:
            monkeypatch.setattr(session, "flush", flush)
        try:
            await NotificacionService(session, settings=settings()).reintentar_manual(
                identifier, SimpleNamespace(sujeto_id=actor)
            )
        except (DBAPIError, RuntimeError, ValueError, asyncio.CancelledError):
            raised = True
        finally:
            monkeypatch.setattr(session, "flush", original_flush)
            monkeypatch.setattr(session, "commit", original_commit)
            if scenario == "auditoria_flush":
                async with sessions() as admin, transaction(admin):
                    await admin.execute(
                        text(
                            "DROP TRIGGER eaf275_audit_fail ON auditoria.registros_auditoria"
                        )
                    )
                    await admin.execute(
                        text("DROP FUNCTION public.eaf275_audit_fail()")
                    )
        assert await session.scalar(text("SELECT 1")) == 1
    actual = await state(sessions, identifier)
    record("retry_rollback_" + scenario, excepcion_propagada=raised, estado=actual)
    assert raised
    assert actual["estado"] == "fallido" and actual["intentos"] == MAX_INTENTOS
    assert (
        actual["error"] == "SMTPServerDisconnected"
        and actual["proximo"] is not None
        and actual["auditorias"] == 0
    )


async def test_reintento_concurrente_solo_un_actor_confirma(sessions):
    actor, _ = await user(sessions)
    identifier = await notification(sessions)

    async def attempt():
        async with sessions() as session:
            try:
                await NotificacionService(
                    session, settings=settings()
                ).reintentar_manual(identifier, SimpleNamespace(sujeto_id=actor))
                return 200
            except HTTPException as error:
                return error.status_code

    results = await asyncio.gather(attempt(), attempt())
    current = await state(sessions, identifier)
    record("retry_carrera", resultados=results, estado=current)
    assert sorted(results) == [200, 409] and current["auditorias"] == 1


async def test_latido_falla_sql_y_entrega_posterior_continua(sessions):
    identifier = await notification(
        sessions, estado_envio="pendiente", intentos=0, proximo_intento_en=None
    )
    async with sessions() as session, transaction(session):
        await session.execute(
            text(
                "ALTER TABLE participacion_ciudadana.herald_latido RENAME TO eaf275_latido_oculto"
            )
        )
    try:
        async with sessions() as session:
            await escribir_latido(session, {})
        async with sessions() as session:
            result = await NotificacionWorker(session, settings()).procesar_uno(
                notificacion_id=identifier
            )
            assert result.estado == "simulado"
    finally:
        async with sessions() as session, transaction(session):
            await session.execute(
                text(
                    "ALTER TABLE participacion_ciudadana.eaf275_latido_oculto RENAME TO herald_latido"
                )
            )
    async with sessions() as session:
        await escribir_latido(session, {})
    async with sessions() as session:
        item = await session.get(HeraldLatido, 1)
        assert item.ultimo_ciclo["procesados"] == 0
    record(
        "latido_fallo_real", entrega_posterior="simulado", ciclo_vacio=item.ultimo_ciclo
    )


async def test_antiguedad_usa_pendiente_mas_antiguo(sessions):
    now = datetime.now(UTC)
    await notification(
        sessions,
        estado_envio="pendiente",
        intentos=0,
        creado_en=now - timedelta(minutes=31),
    )
    await notification(
        sessions,
        estado_envio="pendiente",
        intentos=0,
        creado_en=now - timedelta(seconds=2),
    )
    async with sessions() as session:
        await escribir_latido(session, {})
    async with sessions() as session:
        data = await recolectar_salud(session, settings(smtp_host="fixture.invalid"))
    record(
        "antiguedad_cola",
        estado=data["estado"],
        cola=data["cola"],
        motivos=data["motivos"],
        esperado_minimo_segundos=1800,
    )
    assert data["cola"]["mas_antiguo_segundos"] >= 1800
    assert data["estado"] == "degradado"


async def test_resumen_07h_incluye_todas_las_acciones_ultimas_24h(sessions):
    identifier, email = await user(sessions, "auditor_forense")
    # Timer 31/10 a las 07:00 CO: la acción de ayer 15:00 está dentro de 24 h.
    await notification(
        sessions,
        destinatario_correo=email,
        tipo_evento="gestion_institucional",
        asunto="POLIS: ACCION-AYER-15H",
        estado_envio="enviado",
        creado_en=datetime(2026, 10, 30, 20, 0, tzinfo=UTC),
    )
    await notification(
        sessions,
        destinatario_correo=email,
        tipo_evento="gestion_institucional",
        asunto="POLIS: ACCION-HOY-06H",
        estado_envio="enviado",
        creado_en=datetime(2026, 10, 31, 11, 0, tzinfo=UTC),
    )
    async with sessions() as session:
        await generar_resumen(
            session, settings(), fecha=date(2026, 10, 31), simular=False
        )
    async with sessions() as session:
        item = (
            await session.execute(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.tipo_evento == "resumen_diario",
                    NotificacionTransaccional.destinatario_correo == email,
                )
            )
        ).scalar_one()
    record(
        "resumen_07h_ventana",
        asunto=item.asunto,
        incluye_ayer="ACCION-AYER-15H" in item.cuerpo_html,
        incluye_hoy="ACCION-HOY-06H" in item.cuerpo_html,
    )
    assert "ACCION-AYER-15H" in item.cuerpo_html
    assert "ACCION-HOY-06H" in item.cuerpo_html


async def test_resumen_posterior_07h_no_desaparece_en_ambos_dias(sessions):
    _, email = await user(sessions, "auditor_forense")
    await notification(
        sessions,
        destinatario_correo=email,
        tipo_evento="gestion_institucional",
        asunto="POLIS: ANTES-07H",
        estado_envio="enviado",
        creado_en=datetime(2026, 10, 31, 11, 0, tzinfo=UTC),
    )
    async with sessions() as session:
        await generar_resumen(
            session, settings(), fecha=date(2026, 10, 31), simular=False
        )
    # La actividad llega tras el primer resumen del 31.
    await notification(
        sessions,
        destinatario_correo=email,
        tipo_evento="gestion_institucional",
        asunto="POLIS: DESPUES-07H",
        estado_envio="enviado",
        creado_en=datetime(2026, 10, 31, 20, 0, tzinfo=UTC),
    )
    async with sessions() as session:
        await generar_resumen(
            session, settings(), fecha=date(2026, 10, 31), simular=False
        )
        await generar_resumen(
            session, settings(), fecha=date(2026, 11, 1), simular=False
        )
    async with sessions() as session:
        rows = (
            await session.scalars(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.tipo_evento == "resumen_diario",
                    NotificacionTransaccional.destinatario_correo == email,
                )
            )
        ).all()
    included = any("DESPUES-07H" in row.cuerpo_html for row in rows)
    record("resumen_post_07h", resumenes=len(rows), actividad_incluida=included)
    assert included


async def test_idempotencia_concurrente_diez_invocaciones(sessions):
    async def enqueue():
        async with sessions() as session, transaction(session):
            item = await NotificacionService(
                session, settings=settings()
            ).enviar_resumen_diario(
                destinatario="carrera-eaf275@example.org",
                nombre_funcionario="Fixture",
                fecha_iso="2026-10-31",
                fecha_legible="31/10/2026",
                acciones=["Accion"],
                pendientes=[],
            )
            return item is not None

    results = await asyncio.gather(*(enqueue() for _ in range(10)))
    async with sessions() as session:
        n = await session.scalar(
            select(func.count())
            .select_from(NotificacionTransaccional)
            .where(NotificacionTransaccional.tipo_evento == "resumen_diario")
        )
    record("resumen_10_concurrentes", ganadores=sum(results), filas=n)
    assert sum(results) == n == 1
