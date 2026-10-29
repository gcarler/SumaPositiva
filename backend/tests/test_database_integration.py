import asyncio
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.integration


@pytest.mark.migration
def test_migrations_and_readiness_on_postgres(database_url, monkeypatch):
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    command.check(config)

    async def reasignar_admins_de_prueba() -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text("""
                        UPDATE autenticacion.usuarios
                        SET rol_id = (SELECT id FROM autenticacion.roles WHERE codigo='ciudadano')
                        WHERE rol_id = (
                            SELECT id FROM autenticacion.roles
                            WHERE codigo='administrador_identidades'
                        )
                    """)
                )
        finally:
            await engine.dispose()

    # Este ensayo reconstruye solo la base dedicada de migraciones; nunca
    # reutiliza ni degrada cuentas/contactos creados por otras pruebas.
    asyncio.run(reasignar_admins_de_prueba())
    # Simular registros anteriores a la corrección de integridad.
    command.downgrade(config, "0015_poligonos_geovisor")
    mesa_id = uuid.uuid4()
    mesa_con_slug_id = uuid.uuid4()

    async def comprobar_mesas(*, preparar: bool) -> None:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as connection:
                if preparar:
                    await connection.execute(
                        text("""
                            INSERT INTO mesas_trabajo.mesas
                                (id, ruta_jerarquica, tipo_mesa, codigo_oficial,
                                 shortcode_ciudadano, nombre, slug, aforo_maximo,
                                 total_asistentes)
                            VALUES
                                (:id, 'prueba.legada', 'BARRIAL', :codigo, :codigo,
                                 'Mesa legada', NULL, NULL, NULL),
                                (:otro_id, 'prueba.conservada', 'BARRIAL', :otro_codigo,
                                 :otro_codigo, 'Mesa conservada', 'slug-conservado', 20, 3)
                        """),
                        {
                            "id": mesa_id,
                            "otro_id": mesa_con_slug_id,
                            "codigo": str(mesa_id),
                            "otro_codigo": str(mesa_con_slug_id),
                        },
                    )
                    await connection.execute(
                        text("""
                            INSERT INTO mesas_trabajo.participantes_mesa
                                (mesa_id, sujeto_id, nombre_completo)
                            VALUES (:id, :sujeto, 'Participante existente')
                        """),
                        {"id": mesa_id, "sujeto": str(uuid.uuid4())},
                    )
                else:
                    result = await connection.execute(
                        text("""
                            SELECT id, slug, aforo_maximo, total_asistentes
                            FROM mesas_trabajo.mesas WHERE id IN (:id, :otro_id)
                        """),
                        {"id": mesa_id, "otro_id": mesa_con_slug_id},
                    )
                    rows = {row.id: row for row in result}
                    assert rows[mesa_id].slug == f"mesa-{mesa_id}"
                    assert rows[mesa_id].aforo_maximo == 0
                    assert rows[mesa_id].total_asistentes == 1
                    assert rows[mesa_con_slug_id].slug == "slug-conservado"
                    assert rows[mesa_con_slug_id].aforo_maximo == 20
                    assert rows[mesa_con_slug_id].total_asistentes == 3
        finally:
            await engine.dispose()

    asyncio.run(comprobar_mesas(preparar=True))
    command.upgrade(config, "head")
    asyncio.run(comprobar_mesas(preparar=False))
    command.check(config)
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/v1/health/ready").status_code == 200
        asyncio.run(reasignar_admins_de_prueba())
        command.downgrade(config, "base")
        response = client.get("/api/v1/health/ready")
        assert response.status_code == 503
        assert response.json()["migrations"] == "pending"
        command.upgrade(config, "head")
        command.upgrade(config, "head")
        command.check(config)
        response = client.get("/api/v1/health/ready")
        assert response.status_code == 200
        assert response.json()["extensions"] == "ok"
