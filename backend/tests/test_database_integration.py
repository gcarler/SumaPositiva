import asyncio
import os
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.integration


def test_migrations_and_readiness_on_postgres(monkeypatch):
    database_url = os.getenv("POLIS_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva de pruebas")
    if not (make_url(database_url).database or "").startswith("polis_test"):
        pytest.fail("La base de pruebas debe llamarse polis_test o comenzar por polis_test")

    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    command.check(config)
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
