import asyncio
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from app.modules.identidad.security import obtener_hash_contrasena

pytestmark = pytest.mark.integration


def test_upgrade_conserva_usuario_previo_y_downgrade_protege_admin(database_url, monkeypatch):
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))

    async def limpiar_admins():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text("""UPDATE autenticacion.usuarios SET rol_id=(
                    SELECT id FROM autenticacion.roles WHERE codigo='ciudadano')
                    WHERE rol_id=(SELECT id FROM autenticacion.roles WHERE codigo='administrador_identidades')""")
                )
        finally:
            await engine.dispose()

    asyncio.run(limpiar_admins())
    command.downgrade(config, "0020_formularios_y_consultas")
    usuario_id = uuid.uuid4()
    correo = f"Legado-{uuid.uuid4().hex}@Example.org"
    hash_clave = obtener_hash_contrasena("ClaveLegada2026*")

    async def consulta(accion):
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                if accion == "insertar":
                    await connection.execute(
                        text("""INSERT INTO autenticacion.usuarios
                        (id, rol_id, correo, hash_contrasena, nombres, apellidos, metadatos)
                        VALUES (:id, (SELECT id FROM autenticacion.roles WHERE codigo='ciudadano'),
                        :correo, :hash, 'Usuario', 'Legado', CAST(:metadatos AS jsonb))"""),
                        {
                            "id": usuario_id,
                            "correo": correo,
                            "hash": hash_clave,
                            "metadatos": '{"legado":true}',
                        },
                    )
                elif accion == "comprobar":
                    usuario = (
                        await connection.execute(
                            text("SELECT * FROM autenticacion.usuarios WHERE id=:id"),
                            {"id": usuario_id},
                        )
                    ).one()
                    assert usuario.correo == correo and usuario.hash_contrasena == hash_clave
                    assert (
                        usuario.metadatos == {"legado": True}
                        and usuario.correo_verificado_en is None
                    )
                elif accion == "promover":
                    await connection.execute(
                        text("""UPDATE autenticacion.usuarios SET rol_id=(
                        SELECT id FROM autenticacion.roles WHERE codigo='administrador_identidades')
                        WHERE id=:id"""),
                        {"id": usuario_id},
                    )
                else:
                    await connection.execute(
                        text("DELETE FROM autenticacion.usuarios WHERE id=:id"), {"id": usuario_id}
                    )
        finally:
            await engine.dispose()

    try:
        asyncio.run(consulta("insertar"))
        command.upgrade(config, "head")
        command.check(config)
        asyncio.run(consulta("comprobar"))
        asyncio.run(consulta("promover"))
        with pytest.raises(Exception, match="Reasignar administradores"):
            command.downgrade(config, "0020_formularios_y_consultas")
        asyncio.run(consulta("comprobar"))
    finally:
        asyncio.run(consulta("eliminar"))
        command.upgrade(config, "head")
