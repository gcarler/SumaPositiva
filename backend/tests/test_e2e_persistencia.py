"""Pruebas Extremo a Extremo (E2E) de Persistencia de Aportes Ciudadanos."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.aportes.models import PropuestaCiudadana
from app.modules.geodatos.models import Territorio
from app.modules.politicas.models import DimensionSeguridadHumana, LineaEstrategica

pytestmark = pytest.mark.anyio


async def test_e2e_flujo_completo_persistencia_aporte(database_url: str):
    """
    Simula el ciclo completo desde la UI:
    1. Obtener token de sesión.
    2. Consultar catálogo de políticas y territorios (simulado con DB directamente para
    encontrar IDs).
    3. Publicar aporte ciudadano.
    4. Verificar en base de datos.
    5. Simular reinicio de conexión.
    6. Consultar y apoyar el aporte desde la API.
    """
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    # b) Consultar dimensiones y líneas estratégicas (y territorios)
    # Lo hacemos con SQLAlchemy para asegurar que existen datos válidos.
    engine = create_async_engine(database_url, pool_pre_ping=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as db_session:
        # Extraer IDs reales para las FK
        res_linea = await db_session.execute(select(LineaEstrategica).limit(1))
        linea = res_linea.scalar_one_or_none()
        assert linea is not None, "Debe existir al menos una línea estratégica"

        res_dim = await db_session.execute(select(DimensionSeguridadHumana).limit(1))
        dim = res_dim.scalar_one_or_none()

        res_ter = await db_session.execute(select(Territorio).limit(1))
        ter = res_ter.scalar_one_or_none()

    # a) Emitir sesión anónima
    with TestClient(app) as client:
        resp_sesion = client.post("/api/v1/sesion/anonima")
        assert resp_sesion.status_code == 201
        token = resp_sesion.json()["token_acceso"]
        headers_auth = {"Authorization": f"Bearer {token}"}

        # c) Publicar aporte ciudadano con enfoque diferencial
        payload_aporte = {
            "linea_id": str(linea.id),
            "titulo": "Implementación E2E Persistencia Segura",
            "descripcion": "Verificación de persistencia tras reinicio de servicios.",
            "tipo_aporte": "propuesta",
            "autor_nombre": "Ciudadano Tester E2E",
            "es_anonimo": True,
            "metadata_enfoque": {
                "etnia": "indigena",
                "genero": "no_binario",
                "situacion_discapacidad": True,
                "poblacion_campesina": True,
            },
        }
        if dim:
            payload_aporte["dimension_id"] = str(dim.id)
        if ter:
            payload_aporte["territorio_id"] = str(ter.id)

        resp_crear = client.post("/api/v1/aportes", json=payload_aporte, headers=headers_auth)
        assert resp_crear.status_code == 201, resp_crear.text
        data_aporte = resp_crear.json()
        aporte_id = data_aporte["id"]
        assert data_aporte["apoyos_contador"] == 0

    # d) Verificar persistencia física en PostgreSQL
    async with async_session() as db_session:
        res_aporte = await db_session.execute(
            select(PropuestaCiudadana).where(PropuestaCiudadana.id == uuid.UUID(aporte_id))
        )
        aporte_db = res_aporte.scalar_one_or_none()
        assert aporte_db is not None
        assert str(aporte_db.linea_id) == str(linea.id)
        assert aporte_db.tipo_aporte == "propuesta"
        assert aporte_db.metadata_enfoque["situacion_discapacidad"] is True

    # e) Simular reinicio de servicios
    # Cerramos el engine completamente para simular que el servicio se cayó y reinició
    await engine.dispose()

    # Creamos un nuevo engine y app (o simplemente el TestClient levantará nuevas conexiones)
    nuevo_engine = create_async_engine(database_url, pool_pre_ping=True)
    nuevos_settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app_reiniciada = create_app(nuevos_settings)

    with TestClient(app_reiniciada) as client:
        # Consultar vía API después del reinicio
        resp_lista = client.get("/api/v1/aportes?limite=100")
        assert resp_lista.status_code == 200
        assert any(str(a["id"]) == aporte_id for a in resp_lista.json()["elementos"])

        resp_detalle = client.get(f"/api/v1/aportes/{aporte_id}")
        assert resp_detalle.status_code == 200
        data_detalle = resp_detalle.json()
        assert data_detalle["id"] == aporte_id
        assert data_detalle["metadata_enfoque"]["etnia"] == "indigena"

        # f) Emitir un respaldo/apoyo y verificar incremento del contador
        resp_apoyo = client.post(f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_auth)
        assert resp_apoyo.status_code == 200
        data_apoyado = resp_apoyo.json()
        assert data_apoyado["apoyos_contador"] == 1

        # Verificamos consultando nuevamente
        resp_detalle_final = client.get(f"/api/v1/aportes/{aporte_id}")
        assert resp_detalle_final.json()["apoyos_contador"] == 1

    # Limpieza final
    async_session_nueva = async_sessionmaker(nuevo_engine, expire_on_commit=False)
    async with async_session_nueva() as db_session:
        aporte_para_borrar = await db_session.get(PropuestaCiudadana, uuid.UUID(aporte_id))
        if aporte_para_borrar:
            await db_session.delete(aporte_para_borrar)
            await db_session.commit()

    await nuevo_engine.dispose()
