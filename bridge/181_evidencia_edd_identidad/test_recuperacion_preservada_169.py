# Copia EDD de las seis regresiones de recuperación169; base/salidas propias181.
"""Escenarios independientes EAF. Solo la base registrada en entorno.json.

Cuatro pruebas expresan el comportamiento seguro esperado; sus fallos conservan
la reproducción del hallazgo. Ningún artefacto contiene contraseñas o tokens.
"""

import asyncio
from datetime import UTC, datetime
import hashlib
import json
import os
from pathlib import Path
import uuid

from cryptography.fernet import Fernet
from fastapi import Request
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
assert make_url(URL).database == json.loads((OUT / "entorno.json").read_text())["base"]
assert make_url(os.environ["POLIS_DATABASE_URL"]).database == make_url(URL).database

from app.core.config import Settings
from app.core.database import SessionDependency
from app.main import create_app
from app.modules.identidad import mfa as mfa_utils
from app.modules.identidad import service as service_module
from app.modules.identidad.correo import obtener_correo_identidad, token_para_correo
from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
from app.modules.identidad.security import verificar_contrasena
from app.modules.identidad.service import IdentidadService
from app.modules.identidad.router import obtener_identidad_service


def guardar(nombre, datos):
    (OUT / (nombre + ".json")).write_text(json.dumps(datos, indent=2, ensure_ascii=False, default=str) + "\n")


def settings(**extra):
    return Settings(_env_file=None, environment="test", database_url=URL, mfa_max_intentos=3, **extra)


class CorreoEnMemoria:
    def comprobar_configuracion(self):
        pass

    async def enviar(self, *args):
        raise AssertionError("Este escenario no despacha ni simula entrega de correo")


def app_con_correo(config):
    app = create_app(config)
    app.dependency_overrides[obtener_correo_identidad] = CorreoEnMemoria
    return app


def crear_cliente(client):
    datos = {"correo": f"eaf-{uuid.uuid4().hex}@example.org", "contrasena": "EafAislada2026*",
             "nombres": "Cuenta", "apellidos": "EAF"}
    registro = client.post("/api/v1/identidad/registro", json=datos)
    assert registro.status_code == 201
    login = client.post("/api/v1/identidad/login", json=datos)
    assert login.status_code == 200
    return registro.json()["id"], datos, {"Authorization": "Bearer " + login.json()["token_acceso"]}


async def consulta(sql, params=None):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            return [dict(row) for row in (await conn.execute(text(sql), params or {})).mappings().all()]
    finally:
        await engine.dispose()


def enrolar(client, headers):
    estado = client.get("/api/v1/identidad/mfa/estado", headers=headers)
    assert estado.status_code == 200
    inicio = client.post("/api/v1/identidad/mfa/iniciar", headers=headers)
    assert inicio.status_code == 200
    secreto = inicio.json()["secreto_b32"]
    guardar("contrato-mfa-respuestas-api-sanitizadas", {"estado": estado.json(),
        "inicio": {**inicio.json(), "secreto_b32": "[SECRETO_DE_PRUEBA_RETIRADO]",
                   "otpauth_uri": "[URI_CON_SECRETO_RETIRADA]", "qr_code_base64": "[QR_CON_SECRETO_RETIRADO]"},
        "nota": "Respuestas HTTP reales; valores de secreto/URI/QR sustituidos por strings, mismas claves y tipos"})
    activar = client.post("/api/v1/identidad/mfa/activar", headers=headers,
                          json={"codigo": mfa_utils.calcular_codigo_totp(secreto)})
    assert activar.status_code == 200


async def snapshot(uid):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            pid = await conn.scalar(text("SELECT pg_backend_pid()"))
            params = {"uid": uid}
            statements = {
                "usuario": "SELECT id,hash_contrasena,activo,correo_verificado_en,actualizado_en FROM autenticacion.usuarios WHERE id=:uid",
                "sesiones": "SELECT id,expira_en,revocada_en FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid ORDER BY id",
                "civicas": "SELECT id,activa,expira_en FROM participacion_ciudadana.sesiones_anonimas WHERE id IN (SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid) ORDER BY id",
                "tokens": "SELECT hash_token,proposito,usado_en,entregas,enviado_en,expira_en FROM autenticacion.tokens_accion WHERE usuario_id=:uid ORDER BY hash_token",
                "eventos": "SELECT id,accion,detalle FROM autenticacion.eventos_identidad WHERE objetivo_id=:uid ORDER BY id",
            }
            state = {name: [dict(r) for r in (await conn.execute(text(sql), params)).mappings().all()]
                     for name, sql in statements.items()}
        return pid, state
    finally:
        await engine.dispose()


@pytest.mark.parametrize("fallo", ["exito", "post_flush", "validacion", "commit_real", "cancelacion"])
def test_recuperacion_atomica_hash_sesiones_tokens_eventos(fallo, monkeypatch):
    async def run():
        config = settings()
        engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        uid = None
        gate = "eaf_commit_" + uuid.uuid4().hex[:10]
        gate_created = False
        try:
            async with sessions() as session:
                service = IdentidadService(session, config)
                email = f"eaf-atomicidad-{uuid.uuid4().hex}@example.org"
                user = await service.registrar_usuario(UsuarioCreacion(correo=email, contrasena="EafAnterior2026*",
                                                                       nombres="Atomicidad", apellidos="EAF"))
                uid = user.id
                await service.autenticar_usuario(LoginPeticion(correo=email, contrasena="EafAnterior2026*"))
                await service.solicitar_correo(email, "recuperar", CorreoEnMemoria())
                await service.solicitar_correo(email, "verificar", CorreoEnMemoria())
            pid_before, before = await snapshot(uid)
            nonce = (await consulta("SELECT nonce FROM autenticacion.tokens_accion WHERE usuario_id=:uid AND proposito='recuperar'",
                                    {"uid": uid}))[0]["nonce"]
            token = token_para_correo(nonce, config)
            if fallo == "commit_real":
                async with engine.begin() as conn:
                    await conn.execute(text(f"""CREATE TABLE autenticacion.{gate} (
                        id integer PRIMARY KEY, usuario_id uuid,
                        FOREIGN KEY(usuario_id) REFERENCES autenticacion.usuarios(id) DEFERRABLE INITIALLY DEFERRED)"""))
                gate_created = True
            async with sessions() as session:
                service = IdentidadService(session, config)
                original_event = service.repo.registrar_evento
                flushed = []

                async def evento_y_fallo(*args, **kwargs):
                    await original_event(*args, **kwargs)
                    flushed.append(True)
                    if fallo == "post_flush":
                        raise RuntimeError("Fallo EAF tras escrituras y evento efectivamente flusheados")
                    if fallo == "cancelacion":
                        raise asyncio.CancelledError()
                    if fallo == "commit_real":
                        await session.execute(text(f"INSERT INTO autenticacion.{gate}(id,usuario_id) VALUES (1,:uid)"),
                                              {"uid": uuid.uuid4()})

                monkeypatch.setattr(service.repo, "registrar_evento", evento_y_fallo)
                if fallo == "validacion":
                    cls = service_module.MensajeRespuesta

                    def respuesta_invalida(**kwargs):
                        return cls()

                    monkeypatch.setattr(service_module, "MensajeRespuesta", respuesta_invalida)
                caught = None
                try:
                    await service.consumir_token(token, "recuperar", "EafNueva2026*")
                except BaseException as exc:
                    caught = type(exc).__name__
                    expected = {"post_flush": RuntimeError, "validacion": ValidationError,
                                "commit_real": IntegrityError, "cancelacion": asyncio.CancelledError}
                    assert fallo in expected and isinstance(exc, expected[fallo])
                assert flushed, "La inyección debe ocurrir después de escrituras SQL reales"
                assert (caught is None) == (fallo == "exito")
                assert await session.scalar(text("SELECT 1")) == 1
            pid_after, after = await snapshot(uid)
            assert pid_before != pid_after
            if fallo == "exito":
                assert before != after
                assert verificar_contrasena("EafNueva2026*", after["usuario"][0]["hash_contrasena"])
                assert all(x["revocada_en"] is not None for x in after["sesiones"])
                assert all(x["usado_en"] is not None for x in after["tokens"] if x["proposito"] == "recuperar")
                assert len(after["eventos"]) == len(before["eventos"]) + 1
            else:
                assert before == after, "Hash/sesiones/tokens/cola/eventos deben volver al estado original"
            gate_rows = None
            if gate_created:
                gate_rows = (await consulta(f"SELECT count(*) total FROM autenticacion.{gate}"))[0]["total"]
                assert gate_rows == 0
            digest = lambda state: hashlib.sha256(json.dumps(state, default=str, sort_keys=True).encode()).hexdigest()
            guardar("atomicidad-recuperacion-" + fallo, {"usuario_id": str(uid), "modo": fallo,
                "excepcion": caught, "post_flush_confirmado": bool(flushed),
                "pid_observador_antes": pid_before, "pid_observador_despues": pid_after,
                "estado_antes_sha256": digest(before), "estado_despues_sha256": digest(after),
                "igualdad_completa": before == after, "filas_commit_invalido": gate_rows,
                "sesion_utilizable_despues": True,
                "conteos_antes": {k: len(v) for k,v in before.items()},
                "conteos_despues": {k: len(v) for k,v in after.items()}, "cumple": True,
                "campos_comparados": "hash/activo/verificacion/actualizado, sesiones y cívicas, tokens/cola, eventos"})
        finally:
            if gate_created:
                async with engine.begin() as conn:
                    await conn.execute(text(f"DROP TABLE autenticacion.{gate}"))
            await engine.dispose()

    asyncio.run(run())


def test_conflicto_http_commit_real_recuperacion_revierte_completo():
    config = settings()
    app = app_con_correo(config)
    gate = "eaf_http_commit_" + uuid.uuid4().hex[:10]

    async def tabla(crear):
        engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
        try:
            async with engine.begin() as conn:
                if crear:
                    await conn.execute(text(f"""CREATE TABLE autenticacion.{gate} (
                        id integer PRIMARY KEY, usuario_id uuid,
                        FOREIGN KEY(usuario_id) REFERENCES autenticacion.usuarios(id) DEFERRABLE INITIALLY DEFERRED)"""))
                else:
                    await conn.execute(text(f"DROP TABLE autenticacion.{gate}"))
        finally:
            await engine.dispose()

    with TestClient(app) as client:
        uid_str, datos, _ = crear_cliente(client)
        uid = uuid.UUID(uid_str)
        assert client.post("/api/v1/identidad/recuperacion/solicitar", json={"correo": datos["correo"]}).status_code == 200
        nonce = asyncio.run(consulta("SELECT nonce FROM autenticacion.tokens_accion WHERE usuario_id=:uid AND proposito='recuperar'",
                                    {"uid": uid}))[0]["nonce"]
        token = token_para_correo(nonce, config)
        pid_before, before = asyncio.run(snapshot(uid))
        asyncio.run(tabla(True))

        def servicio_con_fk_diferida(request: Request, session: SessionDependency):
            service = IdentidadService(session, config)
            original = service.repo.registrar_evento

            async def evento_y_fk(*args, **kwargs):
                await original(*args, **kwargs)
                await session.execute(text(f"INSERT INTO autenticacion.{gate}(id,usuario_id) VALUES (1,:uid)"),
                                      {"uid": uuid.uuid4()})

            service.repo.registrar_evento = evento_y_fk
            return service

        app.dependency_overrides[obtener_identidad_service] = servicio_con_fk_diferida
        try:
            response = client.post("/api/v1/identidad/recuperacion/confirmar",
                                   json={"token": token, "contrasena": "EafNueva2026*"})
            pid_after, after = asyncio.run(snapshot(uid))
            guardar("atomicidad-recuperacion-http-commit", {"usuario_id": uid_str, "http": response.status_code,
                "respuesta": response.json(), "igualdad_completa": before == after,
                "pid_observador_antes": pid_before, "pid_observador_despues": pid_after,
                "fallo": "FK diferida real al commit, tras flush de hash/sesiones/token/evento"})
            assert response.status_code == 409
            assert before == after and pid_before != pid_after
        finally:
            asyncio.run(tabla(False))
