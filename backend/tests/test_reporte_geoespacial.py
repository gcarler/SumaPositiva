"""Reporte real: evidencia geográfica, autorización y atomicidad observables."""

import base64
import json
from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image
from test_urls_formularios import anonimo, consultar
from test_urls_formularios import contexto as contexto_base

from app.modules.formularios.repository import FormularioRepository

contexto = contexto_base

ID = "4ecd649a-6764-4d62-8ddb-1bcecd342031"
RUTA = f"/api/v1/formularios/{ID}/respuestas"


def foto():
    archivo = BytesIO()
    Image.new("RGB", (2, 2)).save(archivo, format="PNG")
    return "data:image/png;base64," + base64.b64encode(archivo.getvalue()).decode()


def datos(fotos=None):
    return {
        "datos_respuesta": {
            "P1": "d1",
            "P2-D1": "d1-1",
            "P3": "frecuencia-1",
            "P5": json.dumps(
                {
                    "type": "Point",
                    "coordinates": [-75.5512, 10.4234],
                    "barrio": "Getsemaní",
                    "fotos": fotos or [],
                }
            ),
        }
    }


def filas(url):
    return consultar(
        url,
        "SELECT id, datos_respuesta FROM participacion_ciudadana.respuestas_formulario "
        "WHERE formulario_id=:id",
        {"id": ID},
    )


def test_publico_persistido_y_respuestas_privadas(contexto):
    client, admin = contexto
    r = client.get("/api/v1/formularios/publicos/reporte-inseguridad")
    assert r.status_code == 200, r.text
    assert r.json()["id"] == "reporte-ciudadano-geoespacial"
    assert r.json()["idPersistido"] == ID
    assert len(r.json()["preguntas"]) == 12
    assert client.get(RUTA).status_code == 401
    assert client.get(RUTA, headers=anonimo(client)).status_code == 403
    assert client.get(RUTA, headers=admin).status_code == 200
    assert client.post(RUTA, headers=admin, json=datos()).status_code == 403


@pytest.mark.parametrize(
    "fotos",
    [
        [foto()] * 6,
        ["data:image/png;base64,aGVsbG8="],
        ["blob:local"],
        ["data:image/svg+xml;base64,PHN2Zz4="],
    ],
)
def test_fotos_invalidas_sin_escritura(contexto, database_url, fotos):
    client, _ = contexto
    antes = filas(database_url)
    r = client.post(RUTA, headers=anonimo(client), json=datos(fotos))
    assert r.status_code == 422, r.text
    assert filas(database_url) == antes


def test_guardado_real_y_rollback_posterior_a_flush(contexto, database_url, monkeypatch):
    client, _ = contexto
    antes = filas(database_url)
    r = client.post(RUTA, headers=anonimo(client), json=datos([foto()] * 3))
    assert r.status_code == 201, r.text
    nuevas = filas(database_url)
    assert len(nuevas) == len(antes) + 1
    punto = next(f["datos_respuesta"]["P5"] for f in nuevas if str(f["id"]) == r.json()["id"])
    assert punto["tipo"] == "ubicacion_geografica"
    assert punto["valor"]["lat"] == 10.4234
    assert punto["valor"]["lng"] == -75.5512
    assert len(punto["valor"]["fotos"]) == 3
    original = FormularioRepository.guardar_respuesta

    async def fallar(self, *args, **kwargs):
        await original(self, *args, **kwargs)
        raise HTTPException(503, "Fallo controlado posterior al flush")

    monkeypatch.setattr(FormularioRepository, "guardar_respuesta", fallar)
    respuesta = client.post(RUTA, headers=anonimo(client), json=datos())
    assert respuesta.status_code == 503
    assert filas(database_url) == nuevas
    import asyncio

    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    async def limpiar():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as c:
                await c.execute(
                    text("DELETE FROM participacion_ciudadana.respuestas_formulario WHERE id=:id"),
                    {"id": r.json()["id"]},
                )
        finally:
            await engine.dispose()

    asyncio.run(limpiar())
