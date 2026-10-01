"""Regresión: permisos migrados reales, sin conceder privilegios en mocks de UI."""

import asyncio
import json
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command, op
from app.core.config import Settings
from app.main import create_app

REVISION = "0028_formularios_admin"
ANTERIOR = "0026_fotos_mes_vigilancia"
PERMISOS = {"formularios:leer", "formularios:gestionar"}


def consultar(url, consulta, parametros=None):
    async def leer():
        engine = create_async_engine(url, hide_parameters=True)
        try:
            async with engine.connect() as connection:
                return (await connection.execute(text(consulta), parametros or {})).mappings().all()
        finally:
            await engine.dispose()

    return asyncio.run(leer())


def roles(url):
    return {
        r["codigo"]: r["permisos"]
        for r in consultar(url, "SELECT codigo, permisos FROM autenticacion.roles")
    }


@pytest.fixture
def migracion_anterior(database_url):
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.downgrade(config, ANTERIOR)
    original = roles(database_url)["administrador_identidades"]
    try:
        yield config
    finally:

        async def restaurar():
            engine = create_async_engine(database_url, hide_parameters=True)
            try:
                async with engine.begin() as c:
                    await c.execute(
                        text("""UPDATE autenticacion.roles SET permisos=CAST(:permisos AS jsonb)
                        WHERE codigo='administrador_identidades'"""),
                        {"permisos": json.dumps(original)},
                    )
            finally:
                await engine.dispose()

        asyncio.run(restaurar())
        command.upgrade(config, "head")


def test_migracion_permiso_real_preserva_roles_y_es_idempotente(database_url, migracion_anterior):
    antes = roles(database_url)
    command.upgrade(migracion_anterior, REVISION)
    despues = roles(database_url)
    assert set(despues["administrador_identidades"]) == (
        set(antes["administrador_identidades"]) | PERMISOS
    )
    for rol in antes.keys() - {"administrador_identidades"}:
        assert despues[rol] == antes[rol]
    eventos = consultar(
        database_url,
        f"""SELECT id FROM autenticacion.eventos_identidad
        WHERE accion='permiso_sistema_agregado' AND detalle->>'revision'='{REVISION}'""",
    )
    assert len(eventos) >= 2
    command.upgrade(migracion_anterior, REVISION)
    assert (
        consultar(
            database_url,
            f"""SELECT id FROM autenticacion.eventos_identidad
        WHERE accion='permiso_sistema_agregado' AND detalle->>'revision'='{REVISION}'""",
        )
        == eventos
    )
    command.downgrade(migracion_anterior, ANTERIOR)
    assert roles(database_url) == antes


def test_migracion_rollback_permiso_y_evento(database_url, migracion_anterior, monkeypatch):
    antes = roles(database_url)
    eventos = consultar(
        database_url, "SELECT count(*) AS total FROM autenticacion.eventos_identidad"
    )
    original = op.execute

    def fallar(sql, *args, **kwargs):
        original(sql, *args, **kwargs)
        if "permiso_sistema_agregado" in str(sql):
            raise RuntimeError("Fallo controlado después de escribir permiso y evento")

    with monkeypatch.context() as patch:
        patch.setattr(op, "execute", fallar)
        with pytest.raises(RuntimeError, match="Fallo controlado"):
            command.upgrade(migracion_anterior, REVISION)
    assert roles(database_url) == antes
    assert (
        consultar(database_url, "SELECT count(*) AS total FROM autenticacion.eventos_identidad")
        == eventos
    )
    assert (
        consultar(database_url, "SELECT version_num FROM alembic_version")[0]["version_num"]
        == ANTERIOR
    )


def test_admin_crea_formulario_con_permisos_migrados_y_rechaza_sin_acceso(
    database_url, provisionar_usuario_sync
):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    usuarios_creados = []
    with TestClient(create_app(settings)) as client:

        def login(rol):
            correo = f"forms-{uuid.uuid4().hex}@example.org"
            contrasena = "ClavePruebaFormulario2026*"
            registro = provisionar_usuario_sync(
                client,
                {
                    "correo": correo,
                    "contrasena": contrasena,
                    "nombres": "Formulario",
                    "apellidos": "Prueba",
                    "codigo_rol": rol,
                },
            )
            assert registro.status_code == 201
            usuarios_creados.append(registro.json()["id"])
            respuesta = client.post(
                "/api/v1/identidad/login", json={"correo": correo, "contrasena": contrasena}
            )
            assert respuesta.status_code == 200
            return respuesta.json()

        try:
            admin = login("administrador_identidades")
            assert PERMISOS <= set(admin["permisos"])
            headers = {"Authorization": f"Bearer {admin['token_acceso']}"}
            codigo = f"QA-ADMIN-{uuid.uuid4().hex}"
            datos = {
                "codigo": codigo,
                "titulo": "Formulario creado por admin",
                "descripcion": "Prueba exclusiva de permisos reales",
                "estado": "BORRADOR",
                "esquema_preguntas": [
                    {"id": "p1", "tipo": "texto_libre", "texto": "Describe el punto"}
                ],
            }
            assert client.post("/api/v1/formularios", json=datos).status_code == 401
            for rol in ("ciudadano", "auditor_forense"):
                acceso = login(rol)
                assert (
                    client.post(
                        "/api/v1/formularios",
                        json=datos,
                        headers={"Authorization": f"Bearer {acceso['token_acceso']}"},
                    ).status_code
                    == 403
                )
            creado = client.post("/api/v1/formularios", headers=headers, json=datos)
            assert creado.status_code == 201, creado.text
            persistido = consultar(
                database_url,
                "SELECT titulo FROM participacion_ciudadana.formularios_consulta "
                "WHERE codigo=:codigo",
                {"codigo": codigo},
            )
            assert persistido[0]["titulo"] == datos["titulo"]
        finally:

            async def desactivar_cuentas_prueba():
                engine = create_async_engine(database_url, hide_parameters=True)
                try:
                    async with engine.begin() as connection:
                        for usuario_id in usuarios_creados:
                            await connection.execute(
                                text("UPDATE autenticacion.usuarios SET activo=false WHERE id=:id"),
                                {"id": uuid.UUID(usuario_id)},
                            )
                finally:
                    await engine.dispose()

            asyncio.run(desactivar_cuentas_prueba())
