"""Flujos reales de identidad, revocación, administración, correo y rollback."""

import asyncio
import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.identidad.correo import obtener_correo_identidad, procesar_cola_correo
from app.modules.identidad.models import EventoIdentidad, TokenAccion, Usuario
from app.modules.identidad.schemas import UsuarioCreacion, UsuarioLectura
from app.modules.identidad.service import IdentidadService


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

    async def limpiar():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                for usuario_id in creados:
                    await connection.execute(
                        text("DELETE FROM autenticacion.usuarios WHERE id=:id"),
                        {"id": uuid.UUID(usuario_id)},
                    )
                for codigo in roles_creados:
                    await connection.execute(
                        text("DELETE FROM autenticacion.roles WHERE codigo=:codigo"),
                        {"codigo": codigo},
                    )
        finally:
            await engine.dispose()

    asyncio.run(limpiar())


def test_login_perfil_y_logout_revoca_en_servidor(contexto):
    client, registrar, *_ = contexto
    usuario, headers, datos = registrar()
    respuesta = client.get("/api/v1/identidad/perfil", headers=headers)
    assert respuesta.json()["id"] == usuario["id"]
    assert "hash_contrasena" not in respuesta.text
    assert client.post("/api/v1/identidad/logout", headers=headers).status_code == 200
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 401
    assert client.post("/api/v1/identidad/login", json=datos).status_code == 200


def test_sesiones_ajenas_y_cerrar_todas(contexto):
    client, registrar, *_ = contexto
    _, headers, datos = registrar()
    _, ajeno, _ = registrar()
    segunda = client.post("/api/v1/identidad/login", json=datos).json()
    sesiones = client.get("/api/v1/identidad/sesiones", headers=headers).json()
    assert len(sesiones) == 2 and sum(s["actual"] for s in sesiones) == 1
    id_ajeno = client.get("/api/v1/identidad/sesiones", headers=ajeno).json()[0]["id"]
    assert (
        client.delete(f"/api/v1/identidad/sesiones/{id_ajeno}", headers=headers).status_code == 404
    )
    assert client.delete("/api/v1/identidad/sesiones", headers=headers).status_code == 200
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 401
    assert (
        client.get(
            "/api/v1/identidad/perfil",
            headers={"Authorization": f"Bearer {segunda['token_acceso']}"},
        ).status_code
        == 401
    )
    assert client.get("/api/v1/identidad/perfil", headers=ajeno).status_code == 200


def test_cambiar_contrasena_revoca_y_exige_actual(contexto):
    client, registrar, *_ = contexto
    _, headers, datos = registrar()
    ruta = "/api/v1/identidad/contrasena"
    assert (
        client.post(
            ruta,
            headers=headers,
            json={"contrasena_actual": "errada", "contrasena": "NuevaClave2026*"},
        ).status_code
        == 400
    )
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 200
    assert (
        client.post(
            ruta,
            headers=headers,
            json={"contrasena_actual": datos["contrasena"], "contrasena": "NuevaClave2026*"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 401
    assert client.post("/api/v1/identidad/login", json=datos).status_code == 401
    assert (
        client.post(
            "/api/v1/identidad/login", json={**datos, "contrasena": "NuevaClave2026*"}
        ).status_code
        == 200
    )


def test_verificacion_correo_uso_unico_y_separacion_de_proposito(contexto):
    client, registrar, correo, procesar, *_ = contexto
    _, headers, _ = registrar()
    response = client.post("/api/v1/identidad/correo/solicitar", headers=headers)
    assert response.status_code == 200 and "token" not in response.text
    assert not correo.mensajes
    procesar()
    token = correo.mensajes[-1][2]
    assert (
        client.post(
            "/api/v1/identidad/recuperacion/confirmar",
            json={"token": token, "contrasena": "NuevaClave2026*"},
        ).status_code
        == 400
    )
    assert (
        client.post("/api/v1/identidad/correo/confirmar", json={"token": token}).status_code == 200
    )
    assert (
        client.post("/api/v1/identidad/correo/confirmar", json={"token": token}).status_code == 400
    )
    perfil = client.get("/api/v1/identidad/perfil", headers=headers).json()
    assert perfil["correo_verificado_en"]
    assert perfil["codigo_rol"] == "ciudadano" and perfil["nivel_identidad"] == "declarada"


def test_recuperacion_generica_hash_y_revocacion(contexto, database_url):
    client, registrar, correo, procesar, *_ = contexto
    usuario, headers, datos = registrar()
    conocido = client.post(
        "/api/v1/identidad/recuperacion/solicitar", json={"correo": datos["correo"]}
    )
    desconocido = client.post(
        "/api/v1/identidad/recuperacion/solicitar", json={"correo": "inexistente@example.org"}
    )
    assert conocido.status_code == desconocido.status_code == 200
    assert conocido.json() == desconocido.json()
    procesar()
    token = correo.mensajes[-1][2]

    async def observar():
        engine = create_async_engine(database_url)
        try:
            async with async_sessionmaker(engine)() as session:
                registro = await session.get(
                    TokenAccion, hashlib.sha256(token.encode()).hexdigest()
                )
                assert registro.usuario_id == uuid.UUID(usuario["id"])
                assert token not in str(registro.__dict__)
        finally:
            await engine.dispose()

    asyncio.run(observar())
    body = {"token": token, "contrasena": "NuevaClave2026*"}
    assert client.post("/api/v1/identidad/recuperacion/confirmar", json=body).status_code == 200
    assert client.post("/api/v1/identidad/recuperacion/confirmar", json=body).status_code == 400
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 401
    assert client.post("/api/v1/identidad/login", json=datos).status_code == 401


def test_cola_correo_retry_y_caducidad(contexto, database_url):
    client, registrar, correo, procesar, *_ = contexto
    _, _, datos = registrar()
    client.post("/api/v1/identidad/recuperacion/solicitar", json={"correo": datos["correo"]})
    correo.fallar = True
    procesar()
    assert not correo.mensajes
    correo.fallar = False
    # La misma solicitud pendiente se entrega al recuperar el transporte.
    procesar()
    token = correo.mensajes[-1][2]

    async def vencer():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text(
                        "UPDATE autenticacion.tokens_accion SET expira_en=:exp "
                        "WHERE hash_token=:hash"
                    ),
                    {
                        "exp": datetime.now(UTC) - timedelta(minutes=1),
                        "hash": hashlib.sha256(token.encode()).hexdigest(),
                    },
                )
        finally:
            await engine.dispose()

    asyncio.run(vencer())
    assert (
        client.post(
            "/api/v1/identidad/recuperacion/confirmar",
            json={"token": token, "contrasena": "NuevaClave2026*"},
        ).status_code
        == 400
    )


def test_admin_creacion_asignacion_desactivacion_y_ultimo_admin(contexto):
    client, registrar, _, _, _, creados, _ = contexto
    admin, headers, _ = registrar("administrador_identidades")
    ciudadano, ciudadano_headers, _ = registrar()
    assert client.get("/api/v1/identidad/usuarios", headers=ciudadano_headers).status_code == 403
    listado = client.get("/api/v1/identidad/usuarios?limite=1", headers=headers).json()
    assert len(listado["elementos"]) == 1 and listado["total"] >= 2
    nuevo = client.post(
        "/api/v1/identidad/usuarios",
        headers=headers,
        json={
            "correo": f"institucional-{uuid.uuid4().hex}@example.org",
            "contrasena": "ClavePrueba2026*",
            "nombres": "Carlos",
            "apellidos": "Institucional",
            "codigo_rol": "facilitador_mesa",
            "motivo": "Asignación autorizada de prueba",
        },
    )
    assert nuevo.status_code == 201, nuevo.text
    creados.append(nuevo.json()["id"])
    editar = {
        "nombres": "Ana",
        "apellidos": "Prueba",
        "codigo_rol": "facilitador_mesa",
        "activo": True,
        "motivo": "Asignación autorizada de prueba",
    }
    response = client.patch(
        f"/api/v1/identidad/usuarios/{ciudadano['id']}", headers=headers, json=editar
    )
    assert response.status_code == 200, response.text
    assert response.json()["codigo_rol"] == "facilitador_mesa"
    assert client.get("/api/v1/identidad/perfil", headers=ciudadano_headers).status_code == 401
    ultimo = client.patch(
        f"/api/v1/identidad/usuarios/{admin['id']}",
        headers=headers,
        json={**editar, "activo": False},
    )
    assert ultimo.status_code == 409
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 200


def test_roles_personalizados_permisos_vigentes_y_proteccion(contexto):
    client, registrar, _, _, _, _, roles_creados = contexto
    _, admin_headers, _ = registrar("administrador_identidades")
    codigo = f"operador_{uuid.uuid4().hex[:12]}"
    datos = {
        "codigo": codigo,
        "nombre": "Operador de prueba",
        "permisos": [
            "usuarios:leer",
            "formularios:leer",
            "formularios:gestionar",
            "geovisor:leer",
            "contenido:leer",
            "configuracion:gestionar",
        ],
        "motivo": "Configuración autorizada de prueba",
    }
    crear = client.post("/api/v1/identidad/roles", headers=admin_headers, json=datos)
    assert crear.status_code == 201, crear.text
    assert set(datos["permisos"]).issubset(crear.json()["permisos"])
    roles_creados.append(codigo)
    usuario, headers, _ = registrar(codigo)
    assert client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 200
    cambio = client.patch(
        f"/api/v1/identidad/roles/{codigo}", headers=admin_headers, json={**datos, "permisos": []}
    )
    assert cambio.status_code == 200
    # El JWT aún conserva usuarios:leer; el servidor toma el permiso actual del rol.
    assert client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 403
    assert (
        client.delete(
            f"/api/v1/identidad/roles/{codigo}?motivo=Prueba%20de%20eliminacion",
            headers=admin_headers,
        ).status_code
        == 409
    )
    assert (
        client.patch(
            "/api/v1/identidad/roles/ciudadano", headers=admin_headers, json=datos
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/identidad/roles",
            headers=admin_headers,
            json={**datos, "codigo": codigo + "x", "permisos": ["inventado:permitir"]},
        ).status_code
        == 422
    )
    assert client.get("/api/v1/identidad/perfil", headers=headers).json()["id"] == usuario["id"]


def test_auditor_consulta_sin_administrar(contexto):
    client, registrar, *_ = contexto
    _, headers, _ = registrar("auditor_forense")
    assert client.get("/api/v1/identidad/usuarios", headers=headers).status_code == 200
    assert client.get("/api/v1/identidad/eventos", headers=headers).status_code == 200
    assert client.post("/api/v1/identidad/roles", headers=headers, json={}).status_code == 403
    assert client.post("/api/v1/identidad/usuarios", headers=headers, json={}).status_code == 403


def test_normalizacion_correo_y_limite_bytes(contexto):
    client, registrar, *_ = contexto
    _, _, datos = registrar()
    assert (
        client.post(
            "/api/v1/identidad/registro", json={**datos, "correo": datos["correo"].upper()}
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/identidad/login", json={**datos, "correo": datos["correo"].upper()}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/identidad/registro", json={**datos, "contrasena": "😀" * 20}
        ).status_code
        == 422
    )


def test_jwt_caducado_malformado_y_no_persistido(contexto):
    client, registrar, _, _, settings, *_ = contexto
    _, headers, _ = registrar()
    token = headers["Authorization"].split()[1]
    payload = jwt.decode(token, options={"verify_signature": False})
    for cambios in [
        {"exp": datetime.now(UTC) - timedelta(seconds=10)},
        {"sub": "invalido"},
        {"jti": str(uuid.uuid4())},
        {"typ": "otro"},
    ]:
        modificado = jwt.encode(
            {**payload, **cambios}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )
        assert (
            client.get(
                "/api/v1/identidad/perfil", headers={"Authorization": f"Bearer {modificado}"}
            ).status_code
            == 401
        )


def test_limite_login_persistente_y_smtp_no_configurado(database_url):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        identidad_limite_cuenta=2,
        identidad_limite_ip=10000,
    )
    correo = f"limite-{uuid.uuid4().hex}@example.org"
    with TestClient(create_app(settings)) as client:
        for _ in range(2):
            assert (
                client.post(
                    "/api/v1/identidad/login", json={"correo": correo, "contrasena": "invalida"}
                ).status_code
                == 401
            )
        response = client.post(
            "/api/v1/identidad/login", json={"correo": correo, "contrasena": "invalida"}
        )
        assert response.status_code == 429 and response.headers["Retry-After"]
        assert (
            client.post(
                "/api/v1/identidad/recuperacion/solicitar", json={"correo": correo}
            ).status_code
            == 503
        )


@pytest.mark.anyio
async def test_registro_rollback_respuesta_y_evento(database_url, monkeypatch):
    engine = create_async_engine(database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    datos = UsuarioCreacion(
        correo=f"rollback-{uuid.uuid4().hex}@example.org",
        contrasena="ClavePrueba2026*",
        nombres="Fallo",
        apellidos="Controlado",
    )

    ids = []

    def fallar(usuario, *args, **kwargs):
        ids.append(usuario.id)
        raise ValueError("fallo de respuesta controlado")

    monkeypatch.setattr(UsuarioLectura, "model_validate", fallar)
    try:
        async with sessions() as session:
            with pytest.raises(ValueError, match="fallo de respuesta"):
                await IdentidadService(session).registrar_usuario(datos)
        async with sessions() as observador:
            assert (
                await observador.scalar(select(Usuario).where(Usuario.correo == str(datos.correo)))
                is None
            )
            assert ids
            assert not (
                await observador.scalars(
                    select(EventoIdentidad).where(EventoIdentidad.objetivo_id == ids[0])
                )
            ).all()
    finally:
        await engine.dispose()


def test_desactivacion_revoca_y_no_admite_login(contexto):
    client, registrar, *_ = contexto
    _, admin_headers, _ = registrar("administrador_identidades")
    usuario, headers, datos = registrar()
    respuesta = client.patch(
        f"/api/v1/identidad/usuarios/{usuario['id']}",
        headers=admin_headers,
        json={
            "nombres": "Ana",
            "apellidos": "Prueba",
            "codigo_rol": "ciudadano",
            "activo": False,
            "motivo": "Desactivación administrativa de prueba",
        },
    )
    assert respuesta.status_code == 200
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 401
    assert client.post("/api/v1/identidad/login", json=datos).status_code == 403


def test_delegacion_no_escalona_a_administrador(contexto):
    client, registrar, _, _, _, _, roles_creados = contexto
    _, admin_headers, _ = registrar("administrador_identidades")
    codigo = f"delegado_{uuid.uuid4().hex[:12]}"
    respuesta = client.post(
        "/api/v1/identidad/roles",
        headers=admin_headers,
        json={
            "codigo": codigo,
            "nombre": "Gestión delegada",
            "permisos": ["usuarios:leer", "usuarios:gestionar"],
            "motivo": "Delegación limitada para prueba",
        },
    )
    assert respuesta.status_code == 201
    roles_creados.append(codigo)
    _, headers, _ = registrar(codigo)
    assert (
        client.post(
            "/api/v1/identidad/usuarios",
            headers=headers,
            json={
                "correo": f"escalamiento-{uuid.uuid4().hex}@example.org",
                "contrasena": "ClavePrueba2026*",
                "nombres": "Prueba",
                "apellidos": "Escalamiento",
                "codigo_rol": "administrador_identidades",
                "motivo": "Escalamiento no autorizado de prueba",
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/identidad/usuarios",
            headers=headers,
            json={
                "correo": f"escalamiento-{uuid.uuid4().hex}@example.org",
                "contrasena": "ClavePrueba2026*",
                "nombres": "Prueba",
                "apellidos": "Escalamiento",
                "codigo_rol": "autoridad_distrital",
                "motivo": "Escalamiento no autorizado de prueba",
            },
        ).status_code
        == 403
    )


def test_correo_sin_secretos_en_eventos_y_append_only(contexto, database_url):
    from sqlalchemy.exc import DBAPIError

    client, registrar, correo, procesar, *_ = contexto
    usuario, headers, _ = registrar("auditor_forense")
    client.post("/api/v1/identidad/correo/solicitar", headers=headers)
    procesar()
    eventos = client.get("/api/v1/identidad/eventos", headers=headers)
    assert eventos.status_code == 200
    assert correo.mensajes[-1][2] not in eventos.text
    assert "hash_contrasena" not in eventos.text and "token_acceso" not in eventos.text

    async def alterar():
        engine = create_async_engine(database_url)
        try:
            with pytest.raises(DBAPIError, match="append-only"):
                async with engine.begin() as connection:
                    await connection.execute(
                        text("DELETE FROM autenticacion.eventos_identidad WHERE objetivo_id=:id"),
                        {"id": uuid.UUID(usuario["id"])},
                    )
        finally:
            await engine.dispose()

    asyncio.run(alterar())


def test_sesion_registrada_participa_en_api_civica(contexto):
    client, registrar, *_ = contexto
    _, headers, _ = registrar()
    # El mismo login satisface las dependencias de sesión cívica; no exige otro token.
    respuesta = client.get("/api/v1/sesion/verificar", headers=headers)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["es_anonimo"] is False
    client.post("/api/v1/identidad/logout", headers=headers)
    assert client.get("/api/v1/sesion/verificar", headers=headers).status_code == 401


def test_consumo_concurrente_token_solo_una_vez(contexto, database_url):
    client, registrar, correo, procesar, *_ = contexto
    _, headers, _ = registrar()
    client.post("/api/v1/identidad/correo/solicitar", headers=headers)
    procesar()
    token = correo.mensajes[-1][2]

    async def ejecutar():
        engine = create_async_engine(database_url)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def confirmar():
            async with sessions() as session:
                try:
                    await IdentidadService(session).consumir_token(token, "verificar")
                    return 200
                except HTTPException as error:
                    return error.status_code

        try:
            assert sorted(await asyncio.gather(confirmar(), confirmar())) == [200, 400]
        finally:
            await engine.dispose()

    asyncio.run(ejecutar())


def test_login_rollback_incluye_sesion_civica_y_evento(contexto, database_url, monkeypatch):
    from app.modules.identidad import service as modulo
    from app.modules.identidad.models import SesionUsuario
    from app.modules.identidad.schemas import LoginPeticion
    from app.modules.sesion.models import SesionAnonima

    _, registrar, *_ = contexto
    usuario, _, datos = registrar()

    async def ejecutar():
        engine = create_async_engine(database_url)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def contar(session):
            from sqlalchemy import func

            return [
                await session.scalar(select(func.count()).select_from(modelo))
                for modelo in [SesionUsuario, SesionAnonima, EventoIdentidad]
            ]

        def fallar(*args, **kwargs):
            raise ValueError("Respuesta fallida después de persistir")

        try:
            async with sessions() as observador:
                antes = await contar(observador)
            monkeypatch.setattr(modulo, "TokenRespuesta", fallar)
            async with sessions() as session:
                with pytest.raises(ValueError, match="Respuesta fallida"):
                    await IdentidadService(session).autenticar_usuario(
                        LoginPeticion.model_validate(datos)
                    )
            async with sessions() as observador:
                assert await contar(observador) == antes
                assert await observador.get(Usuario, uuid.UUID(usuario["id"])) is not None
        finally:
            await engine.dispose()

    asyncio.run(ejecutar())


def test_configuracion_insegura_no_habilita_identidad_en_produccion():
    from app.modules.identidad.security import crear_token_acceso

    # Literal inseguro retirado por OBS-13 / AUD-11
    with pytest.raises(HTTPException) as error:
        crear_token_acceso(
            uuid.uuid4(),
            "ciudadano",
            "declarada",
            [],
            settings=Settings(
                _env_file=None,
                environment="production",
                jwt_secret_key="polis_secreto_super_seguro_cartagena_2026",
            ),
        )
    assert error.value.status_code == 503

    # Clave que inicia con plantilla cambiar_por_
    with pytest.raises(HTTPException) as error_plantilla:
        crear_token_acceso(
            uuid.uuid4(),
            "ciudadano",
            "declarada",
            [],
            settings=Settings(
                _env_file=None,
                environment="production",
                jwt_secret_key="cambiar_por_un_secreto_aleatorio_32bytes",
            ),
        )
    assert error_plantilla.value.status_code == 503

    # Salt insegura en producción
    with pytest.raises(HTTPException) as error_salt:
        crear_token_acceso(
            uuid.uuid4(),
            "ciudadano",
            "declarada",
            [],
            settings=Settings(
                _env_file=None,
                environment="production",
                jwt_secret_key="clave_valida_pero_salt_insegura_32b!",
                ip_salt="polis_salt_habeas_data_2026",
            ),
        )
    assert error_salt.value.status_code == 503


def test_ultimo_administrador_protegido_con_ediciones_concurrentes(contexto, database_url):
    from app.modules.identidad.schemas import UsuarioAdministrado
    from app.modules.identidad.security import decodificar_token_acceso

    _, registrar, *_ = contexto
    uno, cabeceras_uno, _ = registrar("administrador_identidades")
    dos, cabeceras_dos, _ = registrar("administrador_identidades")

    async def ejecutar():
        engine = create_async_engine(database_url)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def desactivar(usuario, cabeceras):
            actor = decodificar_token_acceso(cabeceras["Authorization"].split()[1])
            async with sessions() as session:
                try:
                    await IdentidadService(session).editar_usuario(
                        uuid.UUID(usuario["id"]),
                        UsuarioAdministrado(
                            nombres="Ana",
                            apellidos="Prueba",
                            activo=False,
                            codigo_rol="administrador_identidades",
                            motivo="Desactivación concurrente de prueba",
                        ),
                        actor,
                    )
                    return 200
                except HTTPException as error:
                    return error.status_code

        try:
            assert sorted(
                await asyncio.gather(desactivar(uno, cabeceras_uno), desactivar(dos, cabeceras_dos))
            ) == [200, 409]
            async with engine.connect() as connection:
                assert (
                    await connection.scalar(
                        text("""SELECT count(*) FROM autenticacion.usuarios u
                    JOIN autenticacion.roles r ON r.id=u.rol_id
                    WHERE u.activo AND r.codigo='administrador_identidades'""")
                    )
                    == 1
                )
        finally:
            await engine.dispose()

    asyncio.run(ejecutar())


def test_cambiar_clave_rollback_conserva_hash_y_sesiones(contexto, database_url, monkeypatch):
    from app.modules.identidad import service as modulo
    from app.modules.identidad.models import SesionUsuario
    from app.modules.identidad.schemas import CambiarContrasena
    from app.modules.identidad.security import decodificar_token_acceso, verificar_contrasena

    client, registrar, *_ = contexto
    usuario, headers, datos = registrar()
    actor = decodificar_token_acceso(headers["Authorization"].split()[1])

    def fallar(*args, **kwargs):
        raise ValueError("Fallo después de cambiar la contraseña")

    async def ejecutar():
        engine = create_async_engine(database_url)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            monkeypatch.setattr(modulo, "MensajeRespuesta", fallar)
            async with sessions() as session:
                with pytest.raises(ValueError, match="Fallo después"):
                    await IdentidadService(session).cambiar_contrasena(
                        CambiarContrasena(
                            contrasena_actual=datos["contrasena"], contrasena="NuevaClave2026*"
                        ),
                        actor,
                    )
            async with sessions() as observador:
                cuenta = await observador.get(Usuario, uuid.UUID(usuario["id"]))
                assert verificar_contrasena(datos["contrasena"], cuenta.hash_contrasena)
                sesion = await observador.get(SesionUsuario, actor.sesion_id)
                assert sesion.revocada_en is None
        finally:
            await engine.dispose()

    asyncio.run(ejecutar())
    assert client.get("/api/v1/identidad/perfil", headers=headers).status_code == 200


def test_bootstrap_primer_admin_sin_promover_cuentas(database_url):
    from app.modules.identidad.bootstrap import crear_administrador

    datos = UsuarioCreacion(
        correo=f"bootstrap-{uuid.uuid4().hex}@example.org",
        nombres="Admin",
        apellidos="Inicial",
        contrasena="ClavePrueba2026*",
    )
    settings = Settings(_env_file=None, environment="test", database_url=database_url)

    async def ejecutar():
        usuario_id = None
        try:
            usuario_id = await crear_administrador(
                datos, "Alta inicial autorizada de prueba", settings
            )
            with pytest.raises(ValueError, match="Ya existe un administrador"):
                await crear_administrador(datos, "Segunda alta rechazada de prueba", settings)
        finally:
            if usuario_id:
                engine = create_async_engine(database_url)
                try:
                    async with engine.begin() as connection:
                        await connection.execute(
                            text("DELETE FROM autenticacion.usuarios WHERE id=:id"),
                            {"id": usuario_id},
                        )
                finally:
                    await engine.dispose()

    asyncio.run(ejecutar())


def test_transporte_smtp_tls_y_enlace_en_fragmento(monkeypatch):
    from unittest.mock import MagicMock

    from app.modules.identidad.correo import CorreoIdentidad

    smtp = MagicMock()
    smtp.__enter__.return_value = smtp
    monkeypatch.setattr("app.modules.identidad.correo.smtplib.SMTP", lambda *a, **k: smtp)
    settings = Settings(
        _env_file=None,
        smtp_host="smtp.example.org",
        smtp_usuario="usuario-prueba",
        smtp_contrasena="clave-prueba",
        identidad_url_publica="https://polis.example.org",
    )
    asyncio.run(CorreoIdentidad(settings).enviar("ana@example.org", "recuperar", "token-de-prueba"))
    smtp.starttls.assert_called_once()
    smtp.login.assert_called_once_with("usuario-prueba", "clave-prueba")
    mensaje = smtp.send_message.call_args.args[0]
    assert (
        "https://polis.example.org#accion=recuperar&token=token-de-prueba" in mensaje.get_content()
    )
