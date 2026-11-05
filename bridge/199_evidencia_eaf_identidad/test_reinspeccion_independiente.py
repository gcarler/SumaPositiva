"""Probes EAF199 propios sobre las fuentes congeladas181 y datos nuevos.

No importa guiones ni configuración de bases de auditorías previas. Los secretos
de cuentas sintéticas, TOTP, HMAC y tokens permanecen solo en memoria.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
import hashlib
import json
import os
from pathlib import Path
import threading
from types import SimpleNamespace
import uuid

from cryptography.fernet import Fernet
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

OUT = Path(__file__).resolve().parent
URL = os.environ["POLIS_TEST_DATABASE_URL"]
assert make_url(URL).database == json.loads((OUT / "base.json").read_text())["database"]
assert make_url(os.environ["POLIS_DATABASE_URL"]).database == make_url(URL).database

from app.core.config import Settings
from app.core.database import SessionDependency
from app.main import create_app
from app.modules.identidad import mfa as mfa_utils
from app.modules.identidad import service as service_module
from app.modules.identidad.correo import obtener_correo_identidad, token_para_correo
from app.modules.identidad.models import UsuarioMfa
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.router import obtener_identidad_service
from app.modules.identidad.schemas import LoginPeticion, MfaVerificarPeticion, UsuarioCreacion
from app.modules.identidad.security import crear_token_acceso, verificar_contrasena
from app.modules.identidad.service import IdentidadService


def guardar(nombre, datos):
    path = OUT / ("eaf-" + nombre + ".json")
    assert not path.exists(), "Se preservan las iteraciones previas"
    path.write_text(json.dumps(datos, indent=2, ensure_ascii=False, default=str) + "\n")


def digest(data):
    return hashlib.sha256(json.dumps(data, default=str, sort_keys=True).encode()).hexdigest()


def settings(**extra):
    return Settings(_env_file=None, environment="test", database_url=URL, **extra)


class CorreoEnMemoria:
    def comprobar_configuracion(self):
        pass

    async def enviar(self, *args):
        raise AssertionError("Este probe no despacha correo")


def app_con_correo(config):
    app = create_app(config)
    app.dependency_overrides[obtener_correo_identidad] = CorreoEnMemoria
    return app


async def consulta(sql, params=None, escribir=False):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() if escribir else engine.connect() as conn:
            result = await conn.execute(text(sql), params or {})
            return [dict(row) for row in result.mappings().all()] if result.returns_rows else []
    finally:
        await engine.dispose()


def sql(statement, params=None, escribir=False):
    return asyncio.run(consulta(statement, params, escribir))


async def snapshot(uid):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    statements = {
        "usuario": "SELECT * FROM autenticacion.usuarios WHERE id=:uid ORDER BY id",
        "sesiones": "SELECT * FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid ORDER BY id",
        "civicas": "SELECT * FROM participacion_ciudadana.sesiones_anonimas WHERE id IN (SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid) ORDER BY id",
        "tokens": "SELECT * FROM autenticacion.tokens_accion WHERE usuario_id=:uid ORDER BY hash_token",
        "eventos": "SELECT * FROM autenticacion.eventos_identidad WHERE objetivo_id=:uid ORDER BY id",
        "mfa": "SELECT * FROM autenticacion.usuarios_mfa WHERE usuario_id=:uid ORDER BY id",
    }
    try:
        async with engine.connect() as conn:
            pid = await conn.scalar(text("SELECT pg_backend_pid()"))
            state = {name: [dict(row) for row in (await conn.execute(text(stmt), {"uid": uid})).mappings().all()]
                     for name, stmt in statements.items()}
        return pid, state
    finally:
        await engine.dispose()


@pytest.fixture
def ctx(request):
    config = settings(mfa_roles_exigidos="administrador_identidades", mfa_max_intentos=3,
                      mfa_encryption_key=Fernet.generate_key().decode())
    app = app_con_correo(config)
    own = set()
    anonymous = set()
    with TestClient(app, raise_server_exceptions=False) as client:
        context = SimpleNamespace(config=config, app=app, client=client, own=own, anonymous=anonymous)
        try:
            yield context
        finally:
            ids = sql("SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=ANY(CAST(:ids AS uuid[]))",
                      {"ids": list(own)})
            sql("DELETE FROM autenticacion.usuarios WHERE id=ANY(CAST(:ids AS uuid[]))", {"ids": list(own)}, True)
            civic_ids = [r["id"] for r in ids] + list(anonymous)
            sql("DELETE FROM participacion_ciudadana.sesiones_anonimas WHERE id=ANY(CAST(:ids AS uuid[]))",
                {"ids": civic_ids}, True)
            remain = sql("SELECT count(*) n FROM autenticacion.usuarios WHERE id=ANY(CAST(:ids AS uuid[]))",
                         {"ids": list(own)})[0]["n"]
            assert remain == 0
            guardar("limpieza-" + request.node.name.replace("/", "_"),
                    {"cuentas_propias": len(own), "civicas_propias": len(civic_ids), "cuentas_restantes": remain,
                     "eventos_append_only_conservados": True})


def headers(access):
    return {"Authorization": "Bearer " + access["token_acceso"]}


def login(ctx, datos):
    response = ctx.client.post("/api/v1/identidad/login", json=datos)
    assert response.status_code == 200
    return response.json()


def cuenta(ctx, rol="administrador_identidades"):
    datos = {"correo": f"eaf199-{uuid.uuid4().hex}@example.org", "contrasena": "EafReinspeccion2026*",
             "nombres": "Reinspección", "apellidos": "EAF"}
    response = ctx.client.post("/api/v1/identidad/registro", json=datos)
    assert response.status_code == 201
    uid = uuid.UUID(response.json()["id"])
    ctx.own.add(uid)
    antigua = login(ctx, datos)
    if rol != "ciudadano":
        sql("UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo=:rol) WHERE id=:uid",
            {"rol": rol, "uid": uid}, True)
    return uid, datos, antigua


def enrolar(ctx, access):
    response = ctx.client.post("/api/v1/identidad/mfa/iniciar", headers=headers(access))
    assert response.status_code == 200
    secret = response.json()["secreto_b32"]
    response = ctx.client.post("/api/v1/identidad/mfa/activar", headers=headers(access),
                               json={"codigo": mfa_utils.calcular_codigo_totp(secret)})
    assert response.status_code == 200
    return secret, response.json()["codigos_recuperacion"]


def magic_token(ctx, uid):
    nonce = sql("SELECT nonce FROM autenticacion.tokens_accion WHERE usuario_id=:uid AND proposito='magic_link' AND usado_en IS NULL ORDER BY expira_en DESC LIMIT 1",
                {"uid": uid})[0]["nonce"]
    return token_para_correo(nonce, ctx.config)


@pytest.mark.parametrize("metodo", ["password", "magic", "google"])
def test_limitada_restriccion_real_y_excepciones_propias(ctx, monkeypatch, metodo):
    uid, datos, antigua = cuenta(ctx)
    if metodo == "password":
        limitada = login(ctx, datos)
    elif metodo == "magic":
        response = ctx.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": datos["correo"]})
        assert response.status_code == 200
        response = ctx.client.post("/api/v1/identidad/magic-link/confirmar", json={"token": magic_token(ctx, uid)})
        assert response.status_code == 200
        limitada = response.json()
    else:
        monkeypatch.setattr(IdentidadService, "_verificar_google_token", lambda self, token: {
            "sub": str(uid), "email": datos["correo"], "email_verified": True, "hd": "example.org"})
        response = ctx.client.post("/api/v1/identidad/oauth/google", json={"id_token": "proveedor_controlado_eaf199"})
        assert response.status_code == 200
        limitada = response.json()
    assert limitada["permisos"] == limitada["usuario"]["permisos"] == []
    assert limitada["mfa_enrolamiento_requerido"] and not limitada["mfa_requerido"]
    own = ctx.client.get("/api/v1/identidad/perfil?usuario_id=" + str(uuid.uuid4()), headers=headers(limitada))
    assert own.status_code == 200 and uuid.UUID(own.json()["id"]) == uid and own.json()["permisos"] == []
    prohibited = [
        ("GET", "/identidad/usuarios", None), ("GET", "/identidad/roles", None),
        ("GET", "/identidad/eventos", None), ("GET", "/identidad/permisos", None),
        ("GET", "/identidad/sesiones", None), ("DELETE", "/identidad/sesiones", None),
        ("PATCH", "/identidad/perfil", {"nombres": "Cambio", "apellidos": "Prohibido"}),
        ("POST", "/identidad/correo/solicitar", None),
        ("POST", "/identidad/mfa/desactivar", {"contrasena": datos["contrasena"]}),
        ("POST", "/identidad/mfa/recuperacion/regenerar", {"codigo": "INVALIDO"}),
        ("GET", "/sesion/verificar", None),
    ]
    statuses = [ctx.client.request(method, "/api/v1" + route, headers=headers(limitada), json=body).status_code
                for method, route, body in prohibited]
    assert statuses == [403] * len(prohibited)
    assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(antigua)).status_code == 403
    state = ctx.client.get("/api/v1/identidad/mfa/estado", headers=headers(limitada))
    assert state.status_code == 200 and not state.json()["sesion_verificada"]
    _, codes = enrolar(ctx, limitada)
    assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(limitada)).status_code == 200
    assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(antigua)).status_code == 403
    challenge = login(ctx, datos)
    assert challenge["mfa_requerido"] and not bool(challenge["token_acceso"])
    full = ctx.client.post("/api/v1/identidad/mfa/verificar", json={"token_desafio": challenge["token_desafio_mfa"], "codigo": codes[0]})
    assert full.status_code == 200
    assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(full.json())).status_code == 200
    replay = ctx.client.post("/api/v1/identidad/mfa/verificar", json={"token_desafio": challenge["token_desafio_mfa"], "codigo": codes[0]})
    assert replay.status_code == 401
    logout = ctx.client.post("/api/v1/identidad/logout", headers=headers(antigua))
    assert logout.status_code == 200
    assert ctx.client.get("/api/v1/identidad/mfa/estado", headers=headers(antigua)).status_code == 401
    guardar("limitada-" + metodo, {"metodo": metodo, "permisos_token_y_perfil_vacios": True,
        "operaciones_prohibidas_http": statuses, "activacion_habilita_solo_sesion_actual": True,
        "verificacion_mfa": 200, "replay_recuperacion": replay.status_code, "logout_propio": 200})


def test_http_concurrente_fallos_mfa_confirman_bloqueo_unico(ctx):
    uid, datos, antigua = cuenta(ctx)
    enrolar(ctx, antigua)
    challenge = login(ctx, datos)["token_desafio_mfa"]
    barrier = threading.Barrier(8)

    def attempt(_):
        barrier.wait(timeout=10)
        return ctx.client.post("/api/v1/identidad/mfa/verificar",
                               json={"token_desafio": challenge, "codigo": "INVALIDO"}).status_code

    with ThreadPoolExecutor(max_workers=8) as executor:
        statuses = list(executor.map(attempt, range(8)))
    pid, state = asyncio.run(snapshot(uid))
    actions = [x["accion"] for x in state["eventos"]]
    block = state["mfa"][0]["bloqueado_hasta"]
    assert sorted(statuses) == [401, 401, 429, 429, 429, 429, 429, 429]
    assert block is not None and block > datetime.now(UTC)
    assert actions.count("mfa_fallido") == 2 and actions.count("mfa_bloqueo_activado") == 1
    guardar("mfa-http-concurrente", {"http": statuses, "max_intentos": 3, "fallos": 2, "bloqueos": 1,
        "bloqueo_vigente_desde_conexion_nueva": True, "pid_observador": pid, "estado_sha256": digest(state)})


def test_replay_acreditacion_cuenta_sesion_version_y_claims(ctx):
    uid1, datos1, one = cuenta(ctx)
    pending = login(ctx, datos1)
    enrolar(ctx, one)
    sid1 = sql("SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid ORDER BY creada_en LIMIT 1", {"uid": uid1})[0]["id"]
    sid_pending = sql("SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid ORDER BY creada_en DESC LIMIT 1", {"uid": uid1})[0]["id"]
    metadata1 = sql("SELECT metadatos FROM participacion_ciudadana.sesiones_anonimas WHERE id=:sid", {"sid": sid1})[0]["metadatos"]
    assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(one)).status_code == 200
    sql("UPDATE participacion_ciudadana.sesiones_anonimas SET metadatos=CAST(:meta AS jsonb) WHERE id=:sid",
        {"meta": json.dumps(metadata1), "sid": sid_pending}, True)
    copied_same_user = ctx.client.get("/api/v1/identidad/usuarios", headers=headers(pending)).status_code
    assert copied_same_user == 403
    forged = crear_token_acceso(uid1, "administrador_identidades", "declarada", ["usuarios:leer"],
                               sesion_id=sid_pending, settings=ctx.config)
    forged_claims = ctx.client.get("/api/v1/identidad/usuarios", headers={"Authorization": "Bearer " + forged}).status_code
    assert forged_claims == 403
    uid2, _, two = cuenta(ctx)
    enrolar(ctx, two)
    sid2 = sql("SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid ORDER BY creada_en LIMIT 1", {"uid": uid2})[0]["id"]
    sql("UPDATE participacion_ciudadana.sesiones_anonimas SET metadatos=CAST(:meta AS jsonb) WHERE id=:sid",
        {"meta": json.dumps(metadata1), "sid": sid2}, True)
    copied_other_user = ctx.client.get("/api/v1/identidad/usuarios", headers=headers(two)).status_code
    assert copied_other_user == 403
    wrong_owner = crear_token_acceso(uid2, "administrador_identidades", "declarada", ["usuarios:leer"],
                                    sesion_id=sid1, settings=ctx.config)
    assert ctx.client.get("/api/v1/identidad/usuarios", headers={"Authorization": "Bearer " + wrong_owner}).status_code == 401
    factor = sql("SELECT * FROM autenticacion.usuarios_mfa WHERE usuario_id=:uid", {"uid": uid1})[0]
    results = {}
    for field, changed in [("id", uuid.uuid4()), ("activado_en", factor["activado_en"] + timedelta(seconds=1)),
                           ("secreto_cifrado", mfa_utils.cifrar_secreto_totp(mfa_utils.generar_secreto_totp(), ctx.config))]:
        sql(f"UPDATE autenticacion.usuarios_mfa SET {field}=:changed WHERE usuario_id=:uid", {"changed": changed, "uid": uid1}, True)
        results[field] = ctx.client.get("/api/v1/identidad/usuarios", headers=headers(one)).status_code
        sql(f"UPDATE autenticacion.usuarios_mfa SET {field}=:changed WHERE usuario_id=:uid", {"changed": factor[field], "uid": uid1}, True)
        assert results[field] == 403
        assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(one)).status_code == 200
    old_salt = ctx.config.ip_salt
    ctx.config.ip_salt = "sal_rotada_exclusiva_de_esta_prueba_199"
    rotated = ctx.client.get("/api/v1/identidad/usuarios", headers=headers(one)).status_code
    ctx.config.ip_salt = old_salt
    assert rotated == 403
    anon = ctx.client.post("/api/v1/sesion/anonima").json()
    anon_id = uuid.UUID(anon["sesion_id"])
    ctx.anonymous.add(anon_id)
    sql("UPDATE participacion_ciudadana.sesiones_anonimas SET metadatos=CAST(:meta AS jsonb) WHERE id=:sid",
        {"meta": json.dumps(metadata1), "sid": anon_id}, True)
    assert ctx.client.get("/api/v1/identidad/usuarios", headers=headers(anon)).status_code == 403
    guardar("replay-acreditacion", {"misma_cuenta_otra_sesion": copied_same_user,
        "claims_privilegiados_sin_prueba": forged_claims, "otra_cuenta": copied_other_user,
        "session_owner_incorrecto": 401, "versiones_factor": results, "sal_rotada": rotated, "anonimo": 403,
        "limite": "Manipulación de filas sintéticas simula replay; no se afirma capacidad externa de modificar esas filas"})


@pytest.mark.parametrize("existente", [False, True])
@pytest.mark.parametrize("fallo", ["exito", "post_flush", "validacion", "commit_real", "cancelacion"])
def test_magic_atomicidad_independiente(ctx, monkeypatch, existente, fallo):
    email = f"eaf199-magic-{uuid.uuid4().hex}@example.org"
    uid = cuenta(ctx, "ciudadano")[0] if existente else uuid.uuid4()
    if existente:
        email = sql("SELECT correo FROM autenticacion.usuarios WHERE id=:uid", {"uid": uid})[0]["correo"]
    known = []
    gate = "eaf199_magic_" + uuid.uuid4().hex[:8]

    async def run():
        nonlocal uid
        engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
        created = False
        try:
            pid_before, before = await snapshot(uid)
            if fallo == "commit_real":
                async with engine.begin() as conn:
                    await conn.execute(text(f"CREATE TABLE autenticacion.{gate}(id int, UNIQUE(id) DEFERRABLE INITIALLY DEFERRED)"))
                created = True
            async with async_sessionmaker(engine, expire_on_commit=False)() as session:
                service = IdentidadService(session, ctx.config)
                create_user = service.repo.crear_usuario_externo
                create_token = service.repo.crear_token
                commit = session.commit

                async def capture_user(*args, **kwargs):
                    nonlocal uid
                    user = await create_user(*args, **kwargs)
                    uid = user.id
                    known.append(uid)
                    ctx.own.add(uid)
                    return user

                async def token_flush(*args, **kwargs):
                    await create_token(*args, **kwargs)
                    if fallo == "post_flush":
                        raise RuntimeError("Fallo EAF tras flush real del token")
                    if fallo == "cancelacion":
                        raise asyncio.CancelledError()

                async def commit_real():
                    await session.execute(text(f"INSERT INTO autenticacion.{gate}(id) VALUES (1),(1)"))
                    return await commit()

                monkeypatch.setattr(service.repo, "crear_usuario_externo", capture_user)
                monkeypatch.setattr(service.repo, "crear_token", token_flush)
                if fallo == "commit_real":
                    monkeypatch.setattr(session, "commit", commit_real)
                if fallo == "validacion":
                    cls = service_module.MensajeRespuesta
                    monkeypatch.setattr(service_module, "MensajeRespuesta", lambda **kwargs: cls())
                caught = None
                try:
                    await service.solicitar_magic_link(email, CorreoEnMemoria())
                except BaseException as error:
                    caught = type(error).__name__
                    expected = {"post_flush": RuntimeError, "validacion": ValidationError,
                                "commit_real": IntegrityError, "cancelacion": asyncio.CancelledError}
                    assert fallo in expected and isinstance(error, expected[fallo])
                assert (caught is None) == (fallo == "exito")
                assert await session.scalar(text("SELECT 1")) == 1
            pid_after, after = await snapshot(uid)
            assert pid_before != pid_after
            same = before == after
            if fallo == "exito":
                assert not same
                assert len(after["tokens"]) == len(before["tokens"]) + 1
                assert len(after["eventos"]) == len(before["eventos"]) + 1
                assert after["usuario"][0]["correo_verificado_en"] is None
            else:
                assert same, "Rollback incluye los eventos consultados directamente por UUID, aunque desaparezca el usuario"
            gate_count = None
            if created:
                gate_count = (await consulta(f"SELECT count(*) n FROM autenticacion.{gate}"))[0]["n"]
                assert gate_count == 0
            guardar(f"magic-atomicidad-{existente}-{fallo}", {"existente": existente, "fallo": fallo,
                "excepcion": caught, "pid_antes": pid_before, "pid_despues": pid_after,
                "estado_antes_sha256": digest(before), "estado_despues_sha256": digest(after),
                "igualdad_completa": same, "conteos_despues": {k: len(v) for k,v in after.items()},
                "filas_restriccion_commit": gate_count, "sesion_utilizable": True,
                "eventos_consultados_por_uuid_sin_depender_de_usuario_existente": True})
        finally:
            if created:
                async with engine.begin() as conn:
                    await conn.execute(text(f"DROP TABLE autenticacion.{gate}"))
            await engine.dispose()

    asyncio.run(run())


@pytest.mark.parametrize("valido", [False, True])
@pytest.mark.parametrize("fallo", ["post_flush", "commit_real", "cancelacion"])
def test_unidad_mfa_exitosa_o_denegada_revierte_si_falla(ctx, monkeypatch, valido, fallo):
    _unidad_mfa(ctx, monkeypatch, valido, fallo)


def test_validacion_mfa_exitosa_revierte_sesion_y_acreditacion(ctx, monkeypatch):
    _unidad_mfa(ctx, monkeypatch, True, "validacion")


def _unidad_mfa(ctx, monkeypatch, valido, fallo):
    uid, datos, initial = cuenta(ctx)
    _, codes = enrolar(ctx, initial)
    challenge = login(ctx, datos)["token_desafio_mfa"]
    gate = "eaf199_mfa_" + uuid.uuid4().hex[:8]

    async def run():
        engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
        created = False
        try:
            pid_before, before = await snapshot(uid)
            if fallo == "commit_real":
                async with engine.begin() as conn:
                    await conn.execute(text(f"CREATE TABLE autenticacion.{gate}(id int, UNIQUE(id) DEFERRABLE INITIALLY DEFERRED)"))
                created = True
            async with async_sessionmaker(engine, expire_on_commit=False)() as session:
                service = IdentidadService(session, ctx.config)
                commit = session.commit

                async def interrupted_commit():
                    if fallo == "post_flush":
                        raise RuntimeError("Fallo EAF tras todos los flush del caso de uso")
                    if fallo == "cancelacion":
                        raise asyncio.CancelledError()
                    await session.execute(text(f"INSERT INTO autenticacion.{gate}(id) VALUES (1),(1)"))
                    return await commit()

                if fallo != "validacion":
                    monkeypatch.setattr(session, "commit", interrupted_commit)
                else:
                    cls = service_module.TokenRespuesta
                    monkeypatch.setattr(service_module, "TokenRespuesta", lambda **kwargs: cls())
                caught = None
                try:
                    await service.verificar_desafio_mfa(MfaVerificarPeticion(
                        token_desafio=challenge, codigo=codes[0] if valido else "INVALIDO"))
                except BaseException as error:
                    caught = type(error).__name__
                    expected = {"post_flush": RuntimeError, "validacion": ValidationError,
                                "commit_real": IntegrityError, "cancelacion": asyncio.CancelledError}
                    assert isinstance(error, expected[fallo])
                assert caught is not None
                assert await session.scalar(text("SELECT 1")) == 1
            pid_after, after = await snapshot(uid)
            same = before == after
            assert same and pid_before != pid_after
            guardar(f"mfa-unidad-{valido}-{fallo}", {"codigo_valido": valido, "fallo": fallo,
                "excepcion": caught, "pid_antes": pid_before, "pid_despues": pid_after,
                "estado_antes_sha256": digest(before), "estado_despues_sha256": digest(after),
                "igualdad_completa": same, "sesion_utilizable": True,
                "campos": "Usuario/hash, sesiones/cívicas y acreditación, cola/tokens, factor/contador/códigos y eventos"})
        finally:
            if created:
                async with engine.begin() as conn:
                    await conn.execute(text(f"DROP TABLE autenticacion.{gate}"))
            await engine.dispose()

    asyncio.run(run())
