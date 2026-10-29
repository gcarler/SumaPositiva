"""Persistencia y controles de acceso del módulo editorial de Noticias."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.noticias.models import Noticia
from app.modules.noticias.schemas import NoticiaEntrada
from app.modules.noticias.service import NoticiasService


@pytest.fixture
def clients(database_url, cabeceras_gestion):
    from app.core.config import Settings
    from app.main import create_app

    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings), headers=cabeceras_gestion) as gestor:
        with TestClient(create_app(settings)) as publico:
            yield gestor, publico


def payload(**changes):
    result = {
        "titulo": "Avance de seguridad humana en Cartagena",
        "resumen": "Un resumen editorial suficientemente descriptivo.",
        "contenido": "## Avance\n\nContenido editorial institucional para publicación.",
        "categoria": "avance_politica",
        "autor": "Secretaría de Planeación Distrital",
        "estado": "publicada",
        "destacada": True,
        "orden_prioridad": 1,
        "etiquetas": ["cartagena", "participacion"],
    }
    return result | changes


def test_gestion_noticias_persiste_y_separa_borradores(clients):
    gestor, publico = clients
    respuesta = gestor.post("/api/v1/noticias/gestion", json=payload())
    assert respuesta.status_code == 201, respuesta.text
    creada = respuesta.json()
    assert creada["estado"] == "publicada"
    assert any(item["id"] == creada["id"] for item in publico.get("/api/v1/noticias").json())

    borrador = gestor.post(
        "/api/v1/noticias/gestion",
        json=payload(titulo="Borrador reservado de la plataforma", estado="borrador", destacada=False),
    )
    assert borrador.status_code == 201, borrador.text
    assert all(item["id"] != borrador.json()["id"] for item in publico.get("/api/v1/noticias").json())

    actualizada = gestor.put(
        f"/api/v1/noticias/gestion/{creada['id']}",
        json=payload(titulo="Noticia revisada para producción", estado="archivada", destacada=False),
    )
    assert actualizada.status_code == 200, actualizada.text
    assert actualizada.json()["estado"] == "archivada"
    assert actualizada.json()["slug"] == creada["slug"]
    assert publico.get(f"/api/v1/noticias/{creada['slug']}").status_code == 404


@pytest.mark.integration
@pytest.mark.anyio
async def test_noticia_creada_se_observa_en_otra_sesion(database_url):
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            creada = await NoticiasService(session).crear(NoticiaEntrada(**payload()))
        async with sessions() as otra_sesion:
            persistida = await otra_sesion.get(Noticia, creada.id)
            assert persistida is not None
            assert persistida.titulo == creada.titulo
    finally:
        await engine.dispose()


@pytest.mark.integration
@pytest.mark.anyio
async def test_fallo_despues_del_flush_revierte_noticia(database_url):
    engine = create_async_engine(database_url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    entidad_id = None
    try:
        async with sessions() as session:
            service = NoticiasService(session)
            guardar_real = service.repository.guardar

            async def guardar_y_fallar(noticia):
                nonlocal entidad_id
                await guardar_real(noticia)
                entidad_id = noticia.id
                raise RuntimeError("fallo inyectado tras escritura SQL efectiva")

            service.repository.guardar = guardar_y_fallar
            with pytest.raises(RuntimeError, match="escritura SQL efectiva"):
                await service.crear(NoticiaEntrada(**payload()))

        assert entidad_id is not None
        async with sessions() as verificacion:
            assert await verificacion.get(Noticia, entidad_id) is None
    finally:
        await engine.dispose()
