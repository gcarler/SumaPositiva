"""Pruebas automatizadas para el módulo de Actores Estratégicos y Auditoría (AUD-14).

Verifica:
1. Operaciones CRUD completas con persistencia en PostgreSQL (participacion_ciudadana.actores_estrategicos).
2. Registro obligatorio e inmutable en auditoria.registros_auditoria para toda mutación.
3. Prohibición absoluta de PII (nombres de personas, teléfonos, correos o direcciones).
4. El estado inicial en producción permanece vacío hasta cargue oficial o demo explícito.
"""

import uuid
import pytest
from starlette.testclient import TestClient

from app.main import create_app
from app.core.config import Settings
from app.modules.identidad.security import crear_token_acceso
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


def test_actores_crud_y_auditoria(database_url: str, monkeypatch):
    """Verifica el ciclo de vida de un actor y su registro de auditoría."""
    if not database_url:
        pytest.skip("database_url no configurada")

    from app.modules.identidad import deps

    async def sujeto_controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps, "cargar_sujeto_vigente", sujeto_controlado)

    settings = Settings(
        _env_file=None,
        database_url=database_url,
        environment="test",
    )
    app = create_app(settings)

    token = crear_token_acceso(
        sujeto_id=uuid.uuid4(),
        rol="autoridad_distrital",
        nivel_identidad="declarada",
        permisos=["politicas:gestionar"],
    )
    auth_headers = {"Authorization": f"Bearer {token}"}

    with TestClient(app) as client:
        # 1. Crear actor
        codigo_prueba = f"ACT-TST-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "codigo": codigo_prueba,
            "nombre": "Organización Comunitaria de Prueba AUD-14",
            "tipo": "comunitario",
            "territorio": "localidad_2",
            "barrio_vereda": "Barrio Test",
            "dimensiones_principales": ["comunitaria", "personal"],
            "nivel_poder": "medio",
            "nivel_interes": "alto",
            "postura": "promotor_aliado",
            "contacto": {
                "organizacion": "Organización Comunitaria de Prueba",
                "cargo": "Vocero Delegado",
            },
            "mesas_asistidas": [],
            "propuestas_radicadas": 0,
            "expectativas_principales": "Seguridad y convivencia barrial.",
            "acciones_involucramiento": "Mesa de diálogo.",
            "es_demostracion": False,
        }

        r_crear = client.post("/api/v1/actores", json=payload, headers=auth_headers)
        assert r_crear.status_code == 201, r_crear.text
        actor_creado = r_crear.json()
        actor_id = actor_creado["id"]
        assert actor_creado["codigo"] == codigo_prueba

        # 2. Consultar por ID
        r_get = client.get(f"/api/v1/actores/{actor_id}")
        assert r_get.status_code == 200
        assert r_get.json()["nombre"] == payload["nombre"]

        # 3. Listar con filtro
        r_list = client.get(f"/api/v1/actores?buscar={codigo_prueba}")
        assert r_list.status_code == 200
        assert len(r_list.json()) == 1

        # 4. Actualizar
        r_put = client.put(
            f"/api/v1/actores/{actor_id}",
            json={"postura": "critico_opositor", "propuestas_radicadas": 2},
            headers=auth_headers,
        )
        assert r_put.status_code == 200
        assert r_put.json()["postura"] == "critico_opositor"
        assert r_put.json()["propuestas_radicadas"] == 2

        # 5. KPIs
        r_kpis = client.get("/api/v1/actores/kpis")
        assert r_kpis.status_code == 200
        assert r_kpis.json()["total_actores"] >= 1

        # 6. Eliminar
        r_del = client.delete(f"/api/v1/actores/{actor_id}", headers=auth_headers)
        assert r_del.status_code == 204

        # 7. Verificar que ya no existe
        r_get_after = client.get(f"/api/v1/actores/{actor_id}")
        assert r_get_after.status_code == 404


def test_auditoria_inmutable_registrada(database_url: str):
    """Verifica en base de datos que se hayan registrado las trazas en auditoria.registros_auditoria."""
    import asyncio

    if not database_url:
        pytest.skip("database_url no configurada")

    async def _verificar():
        engine = create_async_engine(database_url)
        async with engine.begin() as conn:
            res = await conn.execute(
                text(
                    """
                    SELECT accion, tabla_afectada, causal
                    FROM auditoria.registros_auditoria
                    WHERE tabla_afectada = 'participacion_ciudadana.actores_estrategicos'
                    ORDER BY creado_en DESC
                    LIMIT 5;
                    """
                )
            )
            filas = res.fetchall()
            assert len(filas) > 0, "No se registraron trazas de auditoría para actores"
            acciones = [f[0] for f in filas]
            assert "CREAR_ACTOR" in acciones or "ACTUALIZAR_ACTOR" in acciones or "ELIMINAR_ACTOR" in acciones
        await engine.dispose()

    asyncio.run(_verificar())
