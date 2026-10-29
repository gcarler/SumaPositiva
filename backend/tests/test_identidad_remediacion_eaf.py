"""Regresiones EDD de los escenarios EAF169 con PostgreSQL y observadores nuevos."""

import asyncio
import hashlib
import json
import os
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.core.database import SessionDependency
from app.main import create_app
from app.modules.identidad import mfa as mfa_utils
from app.modules.identidad import service as service_module
from app.modules.identidad.correo import obtener_correo_identidad, token_para_correo
from app.modules.identidad.router import obtener_identidad_service
from app.modules.identidad.schemas import MfaCodigoPeticion, MfaVerificarPeticion
from app.modules.identidad.security import crear_token_acceso, decodificar_token_acceso
from app.modules.identidad.service import IdentidadService


class CorreoLocal:
    def comprobar_configuracion(self):
        pass

    async def enviar(self, *args):
        raise AssertionError("La solicitud debe persistir la cola sin entregar correo")


def evidencia(nombre, datos):
    destino = os.environ.get("POLIS_EDD_EVIDENCIA_DIR")
    if destino:
        (Path(destino) / f"regresion-{nombre}.json").write_text(
            json.dumps(datos, indent=2, default=str, ensure_ascii=False) + "\n"
        )


async def consultar(url, sql, parametros=None, *, escribir=False):
    engine = create_async_engine(url, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() if escribir else engine.connect() as conn:
            resultado = await conn.execute(text(sql), parametros or {})
            return [dict(fila) for fila in resultado.mappings()] if resultado.returns_rows else []
    finally:
        await engine.dispose()


def sql(contexto, sentencia, parametros=None, *, escribir=False):
    return asyncio.run(consultar(contexto.url, sentencia, parametros, escribir=escribir))


def digest(valor):
    return hashlib.sha256(json.dumps(valor, sort_keys=True, default=str).encode()).hexdigest()


async def snapshot(url, correo):
    """Incluye hash/sesiones/cola/eventos/factor; los secretos solo como digest."""
    engine = create_async_engine(url, poolclass=NullPool, hide_parameters=True)
    consultas = {
        "usuario": "SELECT * FROM autenticacion.usuarios WHERE correo=:correo ORDER BY id",
        "sesiones": "SELECT * FROM autenticacion.sesiones_usuario WHERE usuario_id IN "
        "(SELECT id FROM autenticacion.usuarios WHERE correo=:correo) ORDER BY id",
        "civicas": "SELECT * FROM participacion_ciudadana.sesiones_anonimas WHERE id IN "
        "(SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id IN "
        "(SELECT id FROM autenticacion.usuarios WHERE correo=:correo)) ORDER BY id",
        "tokens": "SELECT * FROM autenticacion.tokens_accion WHERE usuario_id IN "
        "(SELECT id FROM autenticacion.usuarios WHERE correo=:correo) ORDER BY hash_token",
        "eventos": "SELECT * FROM autenticacion.eventos_identidad WHERE objetivo_id IN "
        "(SELECT id FROM autenticacion.usuarios WHERE correo=:correo) ORDER BY id",
        "mfa": "SELECT * FROM autenticacion.usuarios_mfa WHERE usuario_id IN "
        "(SELECT id FROM autenticacion.usuarios WHERE correo=:correo) ORDER BY id",
    }
    try:
        async with engine.connect() as conn:
            pid = await conn.scalar(text("SELECT pg_backend_pid()"))
            estado = {}
            for nombre, consulta in consultas.items():
                filas = [dict(fila) for fila in (await conn.execute(text(consulta), {"correo": correo})).mappings()]
                for fila in filas:
                    for campo in ("hash_contrasena", "secreto_cifrado", "codigos_recuperacion", "hash_token", "nonce"):
                        if campo in fila:
                            fila[campo] = digest(fila[campo])
                    if nombre == "civicas":
                        fila["metadatos"] = digest(fila["metadatos"])
                estado[nombre] = filas
            return pid, estado
    finally:
        await engine.dispose()


@pytest.fixture
def contexto(database_url, request):
    config = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        mfa_max_intentos=3,
        mfa_roles_exigidos="administrador_identidades",
        mfa_encryption_key=Fernet.generate_key().decode(),
        identidad_limite_cuenta=1000,
        identidad_limite_ip=10000,
    )
    app = create_app(config)
    app.dependency_overrides[obtener_correo_identidad] = CorreoLocal
    with TestClient(app) as cliente:
        contexto = SimpleNamespace(
            url=database_url, config=config, app=app, client=cliente, correos=set(), civicas=set()
        )
        try:
            yield contexto
        finally:
            asyncio.run(limpiar_datos_propios(contexto, request.node.name))


def correo_nuevo(contexto, tipo="identidad"):
    correo = f"edd-{tipo}-{uuid.uuid4().hex}@example.org"
    contexto.correos.add(correo)
    return correo


async def limpiar_datos_propios(contexto, nombre):
    """Solo UUID/correos generados por esta fixture; conserva eventos inmutables."""
    engine = create_async_engine(contexto.url, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() as conn:
            sesiones = list(
                await conn.scalars(
                    text(
                        "SELECT s.id FROM autenticacion.sesiones_usuario s "
                        "JOIN autenticacion.usuarios u ON u.id=s.usuario_id "
                        "WHERE u.correo=ANY(CAST(:correos AS text[]))"
                    ),
                    {"correos": sorted(contexto.correos)},
                )
            )
            await conn.execute(
                text("DELETE FROM autenticacion.usuarios WHERE correo=ANY(CAST(:correos AS text[]))"),
                {"correos": sorted(contexto.correos)},
            )
            ids_civicos = list(set(sesiones) | contexto.civicas)
            await conn.execute(
                text("DELETE FROM participacion_ciudadana.sesiones_anonimas WHERE id=ANY(CAST(:ids AS uuid[]))"),
                {"ids": ids_civicos},
            )
        restantes = await consultar(
            contexto.url,
            "SELECT count(*) usuarios FROM autenticacion.usuarios WHERE correo=ANY(CAST(:correos AS text[]))",
            {"correos": sorted(contexto.correos)},
        )
        assert restantes[0]["usuarios"] == 0
        evidencia(
            "limpieza-" + re.sub(r"[^A-Za-z0-9_-]", "_", nombre),
            {
                "correos_propios": len(contexto.correos),
                "sesiones_propias": len(ids_civicos),
                "usuarios_restantes": 0,
                "eventos_inmutables_conservados": True,
            },
        )
    finally:
        await engine.dispose()


def cuenta(contexto, *, rol="ciudadano"):
    datos = {
        "correo": correo_nuevo(contexto),
        "contrasena": "EddPrueba2026*",
        "nombres": "Prueba",
        "apellidos": "Identidad",
    }
    registro = contexto.client.post("/api/v1/identidad/registro", json=datos)
    assert registro.status_code == 201
    uid = registro.json()["id"]
    inicial = acceso(contexto, datos)
    if rol != "ciudadano":
        sql(
            contexto,
            "UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo=:rol) "
            "WHERE id=:uid",
            {"rol": rol, "uid": uuid.UUID(uid)},
            escribir=True,
        )
    return uid, datos, inicial


def acceso(contexto, datos):
    resultado = contexto.client.post("/api/v1/identidad/login", json=datos)
    assert resultado.status_code == 200
    return resultado.json()


def cabeceras(respuesta):
    return {"Authorization": "Bearer " + respuesta["token_acceso"]}


def enrolar(contexto, headers):
    inicio = contexto.client.post("/api/v1/identidad/mfa/iniciar", headers=headers)
    assert inicio.status_code == 200
    secreto = inicio.json()["secreto_b32"]
    resultado = contexto.client.post(
        "/api/v1/identidad/mfa/activar",
        headers=headers,
        json={"codigo": mfa_utils.calcular_codigo_totp(secreto)},
    )
    assert resultado.status_code == 200
    return secreto, resultado.json()["codigos_recuperacion"]


def ultimo_token(contexto, correo, proposito="magic_link"):
    fila = sql(
        contexto,
        "SELECT nonce FROM autenticacion.tokens_accion t JOIN autenticacion.usuarios u ON u.id=t.usuario_id "
        "WHERE u.correo=:correo AND t.proposito=:proposito AND t.usado_en IS NULL ORDER BY t.expira_en DESC LIMIT 1",
        {"correo": correo, "proposito": proposito},
    )[0]
    return token_para_correo(fila["nonce"], contexto.config)


def verificar(contexto, desafio, codigo):
    return contexto.client.post("/api/v1/identidad/mfa/verificar", json={"token_desafio": desafio, "codigo": codigo})


def test_mfa_intentos_durables_y_bloqueo_entre_conexiones(contexto):
    uid, datos, inicial = cuenta(contexto)
    enrolar(contexto, cabeceras(inicial))
    desafio = acceso(contexto, datos)["token_desafio_mfa"]
    respuestas = []
    observaciones = []
    for intento in range(7):
        respuestas.append(verificar(contexto, desafio, "INVALIDO").status_code)
        if intento < 2:
            pid, estado = asyncio.run(snapshot(contexto.url, datos["correo"]))
            assert estado["mfa"][0]["intentos_fallidos"] == intento + 1
            assert estado["mfa"][0]["bloqueado_hasta"] is None
            observaciones.append({"pid": pid, "intentos": intento + 1, "http": respuestas[-1]})
    assert respuestas == [401, 401, 429, 429, 429, 429, 429]
    pid, estado = asyncio.run(snapshot(contexto.url, datos["correo"]))
    assert estado["mfa"][0]["bloqueado_hasta"] > datetime.now(UTC)
    acciones = [fila["accion"] for fila in estado["eventos"]]
    assert acciones.count("mfa_fallido") == 2
    assert acciones.count("mfa_bloqueo_activado") == 1
    assert len(estado["sesiones"]) == 1
    evidencia(
        "mfa-intentos",
        {
            "usuario": uid,
            "http": respuestas,
            "pid_observador": pid,
            "primeras_denegaciones_durables": observaciones,
            "estado": digest(estado),
        },
    )


def test_mfa_intentos_concurrentes_serializan_estado_actual(contexto):
    _, datos, inicial = cuenta(contexto)
    enrolar(contexto, cabeceras(inicial))
    desafio = acceso(contexto, datos)["token_desafio_mfa"]

    async def ejecutar():
        engine = create_async_engine(contexto.url, poolclass=NullPool, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def intento():
            async with sessions() as session:
                try:
                    await IdentidadService(session, contexto.config).verificar_desafio_mfa(
                        MfaVerificarPeticion(token_desafio=desafio, codigo="INVALIDO")
                    )
                except HTTPException as error:
                    return error.status_code
                raise AssertionError("Un código inválido nunca emite sesión")

        try:
            return await asyncio.gather(*(intento() for _ in range(8)))
        finally:
            await engine.dispose()

    estados = asyncio.run(ejecutar())
    assert sorted(estados) == [401, 401, 429, 429, 429, 429, 429, 429]
    _, estado = asyncio.run(snapshot(contexto.url, datos["correo"]))
    assert estado["mfa"][0]["bloqueado_hasta"] > datetime.now(UTC)
    acciones = [fila["accion"] for fila in estado["eventos"]]
    assert acciones.count("mfa_fallido") == 2 and acciones.count("mfa_bloqueo_activado") == 1
    evidencia("mfa-concurrencia", {"http": estados, "estado": digest(estado)})


def test_reinicio_y_reactivacion_no_sustituyen_factor_activo(contexto):
    _, datos, inicial = cuenta(contexto)
    headers = cabeceras(inicial)
    secreto, _ = enrolar(contexto, headers)
    pid_antes, antes = asyncio.run(snapshot(contexto.url, datos["correo"]))
    inicio = contexto.client.post("/api/v1/identidad/mfa/iniciar", headers=headers)
    activar = contexto.client.post(
        "/api/v1/identidad/mfa/activar", headers=headers, json={"codigo": mfa_utils.calcular_codigo_totp(secreto)}
    )
    pid_despues, despues = asyncio.run(snapshot(contexto.url, datos["correo"]))
    assert inicio.status_code == activar.status_code == 409
    assert digest(antes) == digest(despues)
    assert pid_antes != pid_despues
    login = acceso(contexto, datos)
    assert login["mfa_requerido"] and not login["token_acceso"]
    evidencia("factor-preservado", {"http": [inicio.status_code, activar.status_code], "igualdad": True})


@pytest.mark.parametrize("metodo", ["password", "magic", "google"])
def test_rol_exigido_limita_cada_login_y_conserva_enrolamiento(contexto, monkeypatch, metodo):
    uid, datos, antigua = cuenta(contexto, rol="administrador_identidades")
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(antigua)).status_code == 403
    if metodo == "password":
        limitada = acceso(contexto, datos)
    elif metodo == "magic":
        assert (
            contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": datos["correo"]}).status_code
            == 200
        )
        respuesta = contexto.client.post(
            "/api/v1/identidad/magic-link/confirmar", json={"token": ultimo_token(contexto, datos["correo"])}
        )
        assert respuesta.status_code == 200
        limitada = respuesta.json()
    else:
        monkeypatch.setattr(
            IdentidadService,
            "_verificar_google_token",
            lambda self, token: {"sub": uid, "email": datos["correo"], "email_verified": True, "hd": "example.org"},
        )
        respuesta = contexto.client.post("/api/v1/identidad/oauth/google", json={"id_token": "google_controlado"})
        assert respuesta.status_code == 200
        limitada = respuesta.json()

    assert limitada["token_acceso"] and limitada["mfa_enrolamiento_requerido"]
    assert limitada["mfa_requerido"] is False and limitada["token_desafio_mfa"] is None
    assert limitada["permisos"] == limitada["usuario"]["permisos"] == []
    headers = cabeceras(limitada)
    assert contexto.client.get("/api/v1/identidad/perfil", headers=headers).json()["permisos"] == []
    for ruta in ("/api/v1/identidad/usuarios", "/api/v1/identidad/permisos", "/api/v1/sesion/verificar"):
        assert contexto.client.get(ruta, headers=headers).status_code == 403
    estado = contexto.client.get("/api/v1/identidad/mfa/estado", headers=headers)
    assert estado.json()["exigido_por_rol"] and not estado.json()["sesion_verificada"]
    _, codigos = enrolar(contexto, headers)
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 200
    assert contexto.client.get("/api/v1/sesion/verificar", headers=headers).status_code == 200
    assert contexto.client.get("/api/v1/identidad/mfa/estado", headers=headers).json()["sesion_verificada"]
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(antigua)).status_code == 403
    assert (
        contexto.client.post(
            "/api/v1/identidad/mfa/desactivar", headers=headers, json={"contrasena": datos["contrasena"]}
        ).status_code
        == 403
    )
    desafio = acceso(contexto, datos)
    assert desafio["mfa_requerido"] and not desafio["token_acceso"]
    completa = verificar(contexto, desafio["token_desafio_mfa"], codigos[0])
    assert completa.status_code == 200
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(completa.json())).status_code == 200
    assert contexto.client.post("/api/v1/identidad/logout", headers=cabeceras(antigua)).status_code == 200
    assert contexto.client.get("/api/v1/identidad/mfa/estado", headers=cabeceras(antigua)).status_code == 401
    evidencia("rol-" + metodo, {"sesion_limitada": True, "enrolamiento": True, "sesion_paralela_restringida": True})


def test_acreditacion_no_se_copia_a_otra_sesion_ni_a_anonimo(contexto):
    uid, datos, antigua = cuenta(contexto, rol="administrador_identidades")
    limitada = acceso(contexto, datos)
    enrolar(contexto, cabeceras(limitada))
    sesiones = sql(
        contexto,
        "SELECT s.id, c.metadatos FROM autenticacion.sesiones_usuario s "
        "JOIN participacion_ciudadana.sesiones_anonimas c ON c.id=s.id WHERE s.usuario_id=:uid ORDER BY s.creada_en",
        {"uid": uuid.UUID(uid)},
    )
    sql(
        contexto,
        "UPDATE participacion_ciudadana.sesiones_anonimas SET metadatos=CAST(:meta AS jsonb) WHERE id=:id",
        {"meta": json.dumps(sesiones[-1]["metadatos"]), "id": sesiones[0]["id"]},
        escribir=True,
    )
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(antigua)).status_code == 403
    anonimo = contexto.client.post("/api/v1/sesion/anonima").json()
    contexto.civicas.add(uuid.UUID(anonimo["sesion_id"]))
    sql(
        contexto,
        "UPDATE participacion_ciudadana.sesiones_anonimas SET metadatos=CAST(:meta AS jsonb) WHERE id=:id",
        {"meta": json.dumps(sesiones[-1]["metadatos"]), "id": uuid.UUID(anonimo["sesion_id"])},
        escribir=True,
    )
    falso = crear_token_acceso(
        uuid.UUID(uid),
        "administrador_identidades",
        "declarada",
        ["usuarios:leer"],
        sesion_id=uuid.UUID(anonimo["sesion_id"]),
        settings=contexto.config,
    )
    assert (
        contexto.client.get("/api/v1/identidad/usuarios", headers={"Authorization": "Bearer " + falso}).status_code
        == 401
    )
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(anonimo)).status_code == 403


@pytest.mark.parametrize("cambio", ["secreto", "activacion", "desactivacion"])
def test_sesion_acreditada_revalida_factor_y_politica_actual(contexto, cambio):
    uid, datos, _ = cuenta(contexto, rol="administrador_identidades")
    headers = cabeceras(acceso(contexto, datos))
    enrolar(contexto, headers)
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 200
    if cambio == "secreto":
        sql(
            contexto,
            "UPDATE autenticacion.usuarios_mfa SET secreto_cifrado=:nuevo WHERE usuario_id=:uid",
            {
                "uid": uuid.UUID(uid),
                "nuevo": mfa_utils.cifrar_secreto_totp(mfa_utils.generar_secreto_totp(), contexto.config),
            },
            escribir=True,
        )
    elif cambio == "activacion":
        sql(
            contexto,
            "UPDATE autenticacion.usuarios_mfa SET activado_en=activado_en + interval '1 second' WHERE usuario_id=:uid",
            {"uid": uuid.UUID(uid)},
            escribir=True,
        )
    else:
        contexto.config.mfa_roles_exigidos = ""
        assert (
            contexto.client.post(
                "/api/v1/identidad/mfa/desactivar", headers=headers, json={"contrasena": datos["contrasena"]}
            ).status_code
            == 200
        )
        assert contexto.client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 200
        contexto.config.mfa_roles_exigidos = " administrador_identidades "
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 403
    estado = contexto.client.get("/api/v1/identidad/mfa/estado", headers=headers)
    assert estado.status_code == 200 and not estado.json()["sesion_verificada"]


def test_exigir_mfa_despues_de_emitir_sesion_aplica_sin_confiar_en_claims(contexto):
    contexto.config.mfa_roles_exigidos = ""
    _, datos, _ = cuenta(contexto, rol="administrador_identidades")
    primera = acceso(contexto, datos)
    segunda = acceso(contexto, datos)
    assert primera["permisos"] and not primera["mfa_enrolamiento_requerido"]
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(primera)).status_code == 200
    contexto.config.mfa_roles_exigidos = "administrador_identidades"
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(primera)).status_code == 403
    enrolar(contexto, cabeceras(primera))
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(primera)).status_code == 200
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(segunda)).status_code == 403
    contexto.config.mfa_roles_exigidos = ""
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(segunda)).status_code == 200
    contexto.config.mfa_roles_exigidos = "administrador_identidades"
    assert contexto.client.get("/api/v1/identidad/usuarios", headers=cabeceras(segunda)).status_code == 403


def test_activacion_concurrente_solo_acredita_sesion_que_presento_primer_totp(contexto):
    _, datos, primera = cuenta(contexto, rol="administrador_identidades")
    segunda = acceso(contexto, datos)
    inicio = contexto.client.post("/api/v1/identidad/mfa/iniciar", headers=cabeceras(primera))
    assert inicio.status_code == 200
    codigo = mfa_utils.calcular_codigo_totp(inicio.json()["secreto_b32"])

    async def ejecutar():
        engine = create_async_engine(contexto.url, poolclass=NullPool, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def intento(acceso_previo):
            actor = decodificar_token_acceso(acceso_previo["token_acceso"], contexto.config)
            async with sessions() as session:
                try:
                    await IdentidadService(session, contexto.config).activar_mfa(
                        MfaCodigoPeticion(codigo=codigo), actor
                    )
                    return 200
                except HTTPException as error:
                    return error.status_code

        try:
            return await asyncio.gather(intento(primera), intento(segunda))
        finally:
            await engine.dispose()

    estados = asyncio.run(ejecutar())
    assert sorted(estados) == [200, 409]
    verificadas = [
        contexto.client.get("/api/v1/identidad/mfa/estado", headers=cabeceras(acceso_previo)).json()[
            "sesion_verificada"
        ]
        for acceso_previo in (primera, segunda)
    ]
    assert verificadas == [estado == 200 for estado in estados]
    _, estado = asyncio.run(snapshot(contexto.url, datos["correo"]))
    assert [fila["accion"] for fila in estado["eventos"]].count("mfa_activado") == 1
    evidencia("activacion-concurrente", {"http": estados, "sesiones_acreditadas": verificadas})


def test_magic_correo_pendiente_y_consumo_unico_con_proposito_y_caducidad(contexto):
    correo = correo_nuevo(contexto, "magic")
    assert contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": correo}).status_code == 200
    _, antes = asyncio.run(snapshot(contexto.url, correo))
    assert antes["usuario"][0]["correo_verificado_en"] is None
    assert antes["tokens"][0]["enviado_en"] is antes["tokens"][0]["usado_en"] is None
    assert contexto.client.post("/api/v1/identidad/recuperacion/solicitar", json={"correo": correo}).status_code == 200
    ajeno = ultimo_token(contexto, correo, "recuperar")
    assert contexto.client.post("/api/v1/identidad/magic-link/confirmar", json={"token": ajeno}).status_code == 400
    token_expirado = ultimo_token(contexto, correo)
    sql(
        contexto,
        "UPDATE autenticacion.tokens_accion SET expira_en=:fecha WHERE hash_token=:hash",
        {
            "fecha": datetime.now(UTC) - timedelta(minutes=1),
            "hash": hashlib.sha256(token_expirado.encode()).hexdigest(),
        },
        escribir=True,
    )
    assert (
        contexto.client.post("/api/v1/identidad/magic-link/confirmar", json={"token": token_expirado}).status_code
        == 400
    )
    _, pendiente = asyncio.run(snapshot(contexto.url, correo))
    assert pendiente["usuario"][0]["correo_verificado_en"] is None
    assert contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": correo}).status_code == 200
    token = ultimo_token(contexto, correo)

    async def consumir():
        engine = create_async_engine(contexto.url, poolclass=NullPool, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def intento():
            async with sessions() as session:
                try:
                    await IdentidadService(session, contexto.config).consumir_magic_link(token)
                    return 200
                except HTTPException as error:
                    return error.status_code

        try:
            return await asyncio.gather(intento(), intento())
        finally:
            await engine.dispose()

    assert sorted(asyncio.run(consumir())) == [200, 400]
    _, despues = asyncio.run(snapshot(contexto.url, correo))
    assert despues["usuario"][0]["correo_verificado_en"] is not None
    assert len(despues["sesiones"]) == 1
    evidencia("magic-verificacion", {"verificado_antes": False, "verificado_despues": True, "consumos": [200, 400]})


def test_magic_respuesta_uniforme_inactiva_y_limites(contexto):
    uid, datos, _ = cuenta(contexto)
    nueva = contexto.client.post(
        "/api/v1/identidad/magic-link/solicitar", json={"correo": correo_nuevo(contexto, "nueva")}
    )
    existente = contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": datos["correo"]})
    sql(
        contexto, "UPDATE autenticacion.usuarios SET activo=false WHERE id=:uid", {"uid": uuid.UUID(uid)}, escribir=True
    )
    _, antes = asyncio.run(snapshot(contexto.url, datos["correo"]))
    inactiva = contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": datos["correo"]})
    _, despues = asyncio.run(snapshot(contexto.url, datos["correo"]))
    assert nueva.status_code == existente.status_code == inactiva.status_code == 200
    assert nueva.json() == existente.json() == inactiva.json()
    assert digest(antes) == digest(despues)
    contexto.config.identidad_limite_cuenta = 1
    limitada = correo_nuevo(contexto, "limite")
    assert contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": limitada}).status_code == 200
    assert contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": limitada}).status_code == 429


@pytest.mark.parametrize("existente", [False, True])
@pytest.mark.parametrize("fallo", ["exito", "post_flush", "validacion", "commit", "cancelacion"])
def test_magic_atomicidad_completa(contexto, monkeypatch, existente, fallo):
    correo = cuenta(contexto)[1]["correo"] if existente else correo_nuevo(contexto, "atomicidad")
    asyncio.run(comprobar_atomicidad(contexto, monkeypatch, correo, fallo))


async def comprobar_atomicidad(contexto, monkeypatch, correo, fallo, *, desafio=None, codigo=None):
    from sqlalchemy.exc import IntegrityError

    engine = create_async_engine(contexto.url, poolclass=NullPool, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    tabla = "edd_identidad_commit_" + uuid.uuid4().hex
    creada = False
    pid_antes, antes = await snapshot(contexto.url, correo)
    try:
        if fallo == "commit":
            async with engine.begin() as conn:
                await conn.execute(
                    text(f"CREATE TABLE public.{tabla}(valor integer UNIQUE DEFERRABLE INITIALLY DEFERRED)")
                )
            creada = True
        async with sessions() as session:
            servicio = IdentidadService(session, contexto.config)
            operacion = "acreditar_mfa_sesion" if codigo and codigo != "INVALIDO" else "registrar_evento"
            original = getattr(servicio.repo, operacion)
            flushed = []

            async def despues_de_flush(*args, **kwargs):
                resultado = await original(*args, **kwargs)
                flushed.append(True)
                if fallo == "post_flush":
                    raise RuntimeError("Fallo EDD después de flush real")
                if fallo == "cancelacion":
                    raise asyncio.CancelledError()
                if fallo == "commit":
                    await session.execute(text(f"INSERT INTO public.{tabla} VALUES (1),(1)"))
                return resultado

            monkeypatch.setattr(servicio.repo, operacion, despues_de_flush)
            if fallo == "validacion":
                nombre = "TokenRespuesta" if desafio else "MensajeRespuesta"
                clase = getattr(service_module, nombre)
                monkeypatch.setattr(service_module, nombre, lambda **kwargs: clase())
            esperada = {
                "post_flush": RuntimeError,
                "validacion": ValidationError,
                "commit": IntegrityError,
                "cancelacion": asyncio.CancelledError,
            }
            if desafio:
                llamada = servicio.verificar_desafio_mfa(MfaVerificarPeticion(token_desafio=desafio, codigo=codigo))
            else:
                llamada = servicio.solicitar_magic_link(correo, CorreoLocal())
            if fallo == "exito":
                await llamada
            else:
                with pytest.raises(esperada[fallo]):
                    await llamada
            assert flushed
            assert await session.scalar(text("SELECT 1")) == 1
        pid_despues, despues = await snapshot(contexto.url, correo)
        assert pid_antes != pid_despues
        if fallo == "exito":
            assert digest(antes) != digest(despues)
            assert len(despues["tokens"]) == len(antes["tokens"]) + 1
        else:
            assert digest(antes) == digest(despues), "La unidad debe revertir íntegramente desde otra conexión"
        evidencia(
            ("mfa-" if desafio else "magic-") + fallo + ("-previa" if antes["usuario"] else "-nueva"),
            {
                "antes": digest(antes),
                "despues": digest(despues),
                "igualdad": fallo != "exito",
                "pid_antes": pid_antes,
                "pid_despues": pid_despues,
                "post_flush": True,
                "sesion_utilizable": True,
            },
        )
    finally:
        if creada:
            async with engine.begin() as conn:
                assert await conn.scalar(text(f"SELECT count(*) FROM public.{tabla}")) == 0
                await conn.execute(text(f"DROP TABLE public.{tabla}"))
        await engine.dispose()


@pytest.mark.parametrize("valido", [False, True])
@pytest.mark.parametrize("fallo", ["post_flush", "commit", "cancelacion"])
def test_mfa_fallo_de_unidad_revierte_contadores_recuperacion_sesiones_eventos(contexto, monkeypatch, valido, fallo):
    _, datos, inicial = cuenta(contexto)
    _, codigos = enrolar(contexto, cabeceras(inicial))
    desafio = acceso(contexto, datos)["token_desafio_mfa"]
    asyncio.run(
        comprobar_atomicidad(
            contexto, monkeypatch, datos["correo"], fallo, desafio=desafio, codigo=codigos[0] if valido else "INVALIDO"
        )
    )


def test_mfa_validacion_revierte_codigo_recuperacion_y_sesion(contexto, monkeypatch):
    _, datos, inicial = cuenta(contexto)
    _, codigos = enrolar(contexto, cabeceras(inicial))
    desafio = acceso(contexto, datos)["token_desafio_mfa"]
    asyncio.run(
        comprobar_atomicidad(contexto, monkeypatch, datos["correo"], "validacion", desafio=desafio, codigo=codigos[0])
    )


def test_magic_conflicto_http_commit_real_revierte_todo(contexto):
    correo = correo_nuevo(contexto, "http-commit")
    tabla = "edd_http_commit_" + uuid.uuid4().hex
    sql(contexto, f"CREATE TABLE public.{tabla}(valor integer UNIQUE DEFERRABLE INITIALLY DEFERRED)", escribir=True)
    pid_antes, antes = asyncio.run(snapshot(contexto.url, correo))

    def con_conflicto(session: SessionDependency):
        servicio = IdentidadService(session, contexto.config)
        original = servicio.repo.registrar_evento

        async def evento_y_conflicto(*args, **kwargs):
            await original(*args, **kwargs)
            await session.execute(text(f"INSERT INTO public.{tabla} VALUES (1),(1)"))

        servicio.repo.registrar_evento = evento_y_conflicto
        return servicio

    contexto.app.dependency_overrides[obtener_identidad_service] = con_conflicto
    try:
        respuesta = contexto.client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": correo})
        pid_despues, despues = asyncio.run(snapshot(contexto.url, correo))
        assert respuesta.status_code == 409
        assert digest(antes) == digest(despues) and pid_antes != pid_despues
        evidencia(
            "magic-http-commit", {"http": 409, "igualdad": True, "pid_antes": pid_antes, "pid_despues": pid_despues}
        )
    finally:
        sql(contexto, f"DROP TABLE public.{tabla}", escribir=True)


def test_magic_error_http_validacion_revierte_usuario_cola_y_evento(database_url, monkeypatch):
    correo = f"edd-http-validacion-{uuid.uuid4().hex}@example.org"
    clase = service_module.MensajeRespuesta
    config = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(config)
    app.dependency_overrides[obtener_correo_identidad] = CorreoLocal
    pid_antes, antes = asyncio.run(snapshot(database_url, correo))
    monkeypatch.setattr(service_module, "MensajeRespuesta", lambda **kwargs: clase())
    with TestClient(app, raise_server_exceptions=False) as cliente:
        respuesta = cliente.post("/api/v1/identidad/magic-link/solicitar", json={"correo": correo})
    pid_despues, despues = asyncio.run(snapshot(database_url, correo))
    assert respuesta.status_code == 500
    assert digest(antes) == digest(despues) and pid_antes != pid_despues
    evidencia("magic-http-validacion", {"http": 500, "igualdad": True, "usuario_token_evento_ausentes": True})
