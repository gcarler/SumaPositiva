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


def test_mfa_intentos_fallidos_deben_persistir_y_bloquear():
    with TestClient(app_con_correo(settings())) as client:
        uid, datos, headers = crear_cliente(client)
        enrolar(client, headers)
        desafio = client.post("/api/v1/identidad/login", json=datos).json()["token_desafio_mfa"]
        estados = []
        for _ in range(7):
            response = client.post("/api/v1/identidad/mfa/verificar",
                                   json={"token_desafio": desafio, "codigo": "INVALIDO"})
            estados.append(response.status_code)
        row = asyncio.run(consulta("""SELECT intentos_fallidos, bloqueado_hasta, activo
            FROM autenticacion.usuarios_mfa WHERE usuario_id=:uid""", {"uid": uuid.UUID(uid)}))[0]
        events = asyncio.run(consulta("""SELECT accion, count(*) total FROM autenticacion.eventos_identidad
            WHERE objetivo_id=:uid AND accion IN ('mfa_fallido','mfa_bloqueo_activado') GROUP BY accion""",
                                      {"uid": uuid.UUID(uid)}))
        guardar("hallazgo-mfa-intentos", {"usuario_id": uid, "max_intentos_configurado": 3,
            "http_intentos": estados, "estado_desde_conexion_nueva": row, "eventos_fallo": events,
            "esperado": "Al tercer fallo persistir bloqueo de cuenta y rechazar siguientes con 429",
            "cumple": 429 in estados and row["bloqueado_hasta"] is not None})
        assert 429 in estados and row["bloqueado_hasta"] is not None


def test_mfa_iniciar_no_debe_desactivar_factor_activo_sin_reautenticacion():
    with TestClient(app_con_correo(settings())) as client:
        uid, datos, headers = crear_cliente(client)
        enrolar(client, headers)
        login_antes = client.post("/api/v1/identidad/login", json=datos)
        assert login_antes.json()["mfa_requerido"] is True
        reinicio = client.post("/api/v1/identidad/mfa/iniciar", headers=headers)
        login_despues = client.post("/api/v1/identidad/login", json=datos)
        row = asyncio.run(consulta("""SELECT activo, activado_en, jsonb_array_length(codigos_recuperacion) codigos
            FROM autenticacion.usuarios_mfa WHERE usuario_id=:uid""", {"uid": uuid.UUID(uid)}))[0]
        guardar("hallazgo-mfa-reinicio", {"usuario_id": uid, "login_previo_mfa": login_antes.json()["mfa_requerido"],
            "http_reinicio_sin_contrasena_ni_totp": reinicio.status_code,
            "http_login_despues": login_despues.status_code,
            "login_posterior_mfa": login_despues.json().get("mfa_requerido"),
            "login_posterior_emitio_token": bool(login_despues.json().get("token_acceso")),
            "estado_desde_conexion_nueva": row, "esperado": "Preservar el factor activo y exigir reautenticación para sustituirlo"})
        assert reinicio.status_code >= 400 and row["activo"] is True


def test_rol_con_mfa_exigido_no_debe_obtener_sesion_plena_sin_factor():
    config = settings(mfa_roles_exigidos="administrador_identidades", mfa_encryption_key=Fernet.generate_key().decode())
    with TestClient(app_con_correo(config)) as client:
        uid, datos, _ = crear_cliente(client)

        async def promover_solo_prueba():
            engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
            try:
                async with engine.begin() as conn:
                    await conn.execute(text("""UPDATE autenticacion.usuarios SET rol_id=(
                        SELECT id FROM autenticacion.roles WHERE codigo='administrador_identidades') WHERE id=:uid"""),
                                       {"uid": uuid.UUID(uid)})
            finally:
                await engine.dispose()

        asyncio.run(promover_solo_prueba())
        login = client.post("/api/v1/identidad/login", json=datos)
        body = login.json()
        headers = {"Authorization": "Bearer " + body.get("token_acceso", "")}
        estado = client.get("/api/v1/identidad/mfa/estado", headers=headers)
        directorio = client.get("/api/v1/identidad/usuarios", headers=headers)
        ambito = client.post(f"/api/v1/identidad/usuarios/{uid}/ambitos", headers=headers,
                            json={"tipo_ambito": "distrital", "identificador_territorial": "13001",
                                  "motivo": "Asignación exclusiva de prueba EAF aislada"})
        assert ambito.status_code in {200, 201}
        guardar("contrato-ambito-respuesta-api", ambito.json())
        guardar("hallazgo-mfa-rol-exigido", {"usuario_id": uid, "rol_provisionado_en_base_aislada": "administrador_identidades",
            "configuracion_mfa_roles_exigidos": config.mfa_roles_exigidos, "http_login": login.status_code,
            "emitio_token": bool(body.get("token_acceso")), "mfa_requerido_login": body.get("mfa_requerido"),
            "estado": estado.json(), "http_directorio_administrativo": directorio.status_code,
            "esperado": "Limitar acceso al enrolamiento hasta cumplir MFA exigido por rol"})
        cumple = not bool(body.get("token_acceso")) or directorio.status_code == 403
        assert cumple, "Un rol configurado con MFA exigido obtuvo sesión plena sin segundo factor"


def test_magic_link_no_debe_verificar_correo_antes_del_consumo():
    with TestClient(app_con_correo(settings())) as client:
        correo = f"eaf-magic-{uuid.uuid4().hex}@example.org"
        response = client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": correo})
        assert response.status_code == 200
        rows = asyncio.run(consulta("""SELECT u.id, u.correo_verificado_en IS NOT NULL verificado,
            t.enviado_en IS NOT NULL enviado, t.usado_en IS NOT NULL consumido, t.proposito
            FROM autenticacion.usuarios u JOIN autenticacion.tokens_accion t ON t.usuario_id=u.id
            WHERE u.correo=:correo""", {"correo": correo}))
        guardar("hallazgo-correo-magic-anticipado", {"http_solicitud": response.status_code,
            "estado_desde_conexion_nueva": rows, "correo_real_enviado": False,
            "esperado": "correo_verificado_en permanece NULL hasta consumir enlace"})
        assert rows and rows[0]["verificado"] is False


def test_magic_link_validacion_respuesta_debe_revertir_alta_cola_evento(monkeypatch):
    email = f"eaf-magic-rollback-{uuid.uuid4().hex}@example.org"
    cls = service_module.MensajeRespuesta

    def respuesta_invalida(**kwargs):
        return cls()

    monkeypatch.setattr(service_module, "MensajeRespuesta", respuesta_invalida)

    with TestClient(app_con_correo(settings()), raise_server_exceptions=False) as client:
        response = client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": email})
        assert response.status_code == 500
    rows = asyncio.run(consulta("""SELECT u.id,
        (SELECT count(*) FROM autenticacion.tokens_accion t WHERE t.usuario_id=u.id) tokens_persistidos,
        (SELECT count(*) FROM autenticacion.eventos_identidad e WHERE e.objetivo_id=u.id) eventos_persistidos
        FROM autenticacion.usuarios u WHERE u.correo=:correo""", {"correo": email}))
    guardar("hallazgo-magic-link-rollback-validacion", {"filas_antes": 0,
        "excepcion_inyectada": "ValidationError", "http": response.status_code,
        "estado_desde_conexion_nueva": rows,
        "esperado": "No deben persistir usuario, token/cola ni evento si la respuesta no valida"})
    assert rows == []


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
