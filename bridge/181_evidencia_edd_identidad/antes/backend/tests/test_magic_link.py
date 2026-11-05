"""Pruebas de integración del flujo de autenticación sin fricción con Magic Link (AUTH-OAUTH-MAGIC-01)."""

import asyncio
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.identidad.correo import obtener_correo_identidad, procesar_cola_correo


class CorreoControlado:
    def __init__(self):
        self.mensajes = []
        self.fallar = False

    def comprobar_configuracion(self):
        pass

    async def enviar(self, destinatario, proposito, token):
        if self.fallar:
            raise HTTPException(503, "Fallo controlado SMTP")
        self.mensajes.append((destinatario, proposito, token))


@pytest.fixture
def contexto(database_url):
    correo = CorreoControlado()
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        identidad_limite_ip=10000,
        identidad_limite_cuenta=1000,
    )
    app = create_app(settings)
    app.dependency_overrides[obtener_correo_identidad] = lambda: correo
    creados = []
    roles_creados = []
    with TestClient(app) as client:

        def registrar(rol="ciudadano", email=None):
            datos = {
                "correo": email or f"usuario-{uuid.uuid4().hex}@example.org",
                "contrasena": "ClavePrueba2026*",
                "nombres": "Ana",
                "apellidos": "Prueba",
            }
            respuesta = client.post("/api/v1/identidad/registro", json=datos)
            assert respuesta.status_code == 201, respuesta.text
            usuario = respuesta.json()
            creados.append(usuario["id"])
            if rol != "ciudadano":

                async def promover():
                    engine = create_async_engine(database_url)
                    try:
                        async with engine.begin() as connection:
                            await connection.execute(
                                text("""UPDATE autenticacion.usuarios
                                SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo=:rol)
                                WHERE id=:id"""),
                                {"rol": rol, "id": uuid.UUID(usuario["id"])},
                            )
                    finally:
                        await engine.dispose()

                asyncio.run(promover())
            login = client.post(
                "/api/v1/identidad/login",
                json={"correo": datos["correo"], "contrasena": datos["contrasena"]},
            )
            assert login.status_code == 200, login.text
            return usuario, {"Authorization": f"Bearer {login.json()['token_acceso']}"}, datos

        async def procesar():
            engine = create_async_engine(database_url)
            try:
                return await procesar_cola_correo(
                    async_sessionmaker(engine, expire_on_commit=False), settings, correo, maximo=20
                )
            finally:
                await engine.dispose()

        yield (
            client,
            registrar,
            correo,
            lambda: asyncio.run(procesar()),
            settings,
            creados,
            roles_creados,
        )


def test_magic_link_usuario_existente(contexto):
    client, registrar, correo, procesar, *_ = contexto
    usuario, _, datos = registrar()

    # 1. Solicitar Magic Link
    solicitud = client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": datos["correo"]})
    assert solicitud.status_code == 200
    assert "enlace de acceso" in solicitud.json()["mensaje"]

    # 2. Despachar cola de correo y capturar token
    procesar()
    assert len(correo.mensajes) > 0
    destinatario, proposito, token = correo.mensajes[-1]
    assert destinatario == datos["correo"].lower()
    assert proposito == "magic_link"
    assert token

    # 3. Confirmar Magic Link (Autenticación Directa)
    confirmacion = client.post("/api/v1/identidad/magic-link/confirmar", json={"token": token})
    assert confirmacion.status_code == 200
    cuerpo = confirmacion.json()
    assert "token_acceso" in cuerpo
    assert cuerpo["rol"] == "ciudadano"
    assert cuerpo["nivel_identidad"] == "declarada"
    assert cuerpo["usuario"]["id"] == usuario["id"]

    # 4. Probar que el token emitido permite consultar el perfil
    headers = {"Authorization": f"Bearer {cuerpo['token_acceso']}"}
    perfil = client.get("/api/v1/identidad/perfil", headers=headers)
    assert perfil.status_code == 200
    assert perfil.json()["id"] == usuario["id"]


def test_magic_link_auto_registro_ciudadano(contexto):
    client, _, correo, procesar, *_ = contexto
    correo_nuevo = f"ciudadano.nuevo.{uuid.uuid4().hex[:8]}@cartagena.gov.co"

    # 1. Solicitar Magic Link para un correo no registrado previamente
    solicitud = client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": correo_nuevo})
    assert solicitud.status_code == 200

    # 2. Despachar cola y obtener token
    procesar()
    assert len(correo.mensajes) > 0
    destinatario, proposito, token = correo.mensajes[-1]
    assert destinatario == correo_nuevo.lower()
    assert proposito == "magic_link"

    # 3. Confirmar Magic Link y verificar creación de cuenta automática
    confirmacion = client.post("/api/v1/identidad/magic-link/confirmar", json={"token": token})
    assert confirmacion.status_code == 200
    cuerpo = confirmacion.json()
    assert cuerpo["rol"] == "ciudadano"
    assert cuerpo["nivel_identidad"] == "declarada"
    assert cuerpo["usuario"]["correo"] == correo_nuevo.lower()

    # 4. Verificar acceso inmediato a sesión autenticada
    headers = {"Authorization": f"Bearer {cuerpo['token_acceso']}"}
    perfil = client.get("/api/v1/identidad/perfil", headers=headers)
    assert perfil.status_code == 200
    assert perfil.json()["correo"] == correo_nuevo.lower()


def test_magic_link_uso_unico_y_seguridad(contexto):
    client, registrar, correo, procesar, *_ = contexto
    usuario, _, datos = registrar()

    client.post("/api/v1/identidad/magic-link/solicitar", json={"correo": datos["correo"]})
    procesar()
    token = correo.mensajes[-1][2]

    # Primer consumo: exitoso
    r1 = client.post("/api/v1/identidad/magic-link/confirmar", json={"token": token})
    assert r1.status_code == 200

    # Segundo consumo con el mismo token: debe fallar por ser de uso único
    r2 = client.post("/api/v1/identidad/magic-link/confirmar", json={"token": token})
    assert r2.status_code == 400
    assert "inválido, utilizado o caducado" in r2.json()["detail"]

    # Token ficticio o manipulado (longitud válida de al menos 32 caracteres): debe fallar con 400
    r3 = client.post(
        "/api/v1/identidad/magic-link/confirmar",
        json={"token": "token_ficticio_no_existente_1234"},
    )
    assert r3.status_code == 400
