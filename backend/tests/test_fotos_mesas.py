import io
import uuid

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


def imagen_png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (16, 16), color=(20, 120, 80)).save(buffer, format="PNG")
    return buffer.getvalue()


async def test_foto_mesa_pendiente_no_es_publica_hasta_moderacion(
    database_url: str,
    cabeceras_gestion,
    monkeypatch,
    tmp_path,
):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        directorio_subidas=tmp_path,
    )
    app = create_app(settings)
    with TestClient(app) as client:
        token_response = client.post("/api/v1/sesion/anonima")
        assert token_response.status_code == 201
        token = {"Authorization": f"Bearer {token_response.json()['token_acceso']}"}
        codigo = uuid.uuid4().hex[:10]
        mesa_response = client.post(
            "/api/v1/mesas",
            headers=cabeceras_gestion,
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"FOTO-{codigo}",
                "shortcode_ciudadano": f"FOTO{codigo}",
                "nombre": "Mesa foto de prueba",
                "fecha": "2026-10-01",
                "horario": "09:30 a 12:00",
                "territorio_id": None,
                "estado": "PROGRAMADA",
            },
        )
        assert mesa_response.status_code == 201, mesa_response.text
        mesa_id = mesa_response.json()["id"]

        endpoint = f"/api/v1/mesas/{mesa_id}/fotos"
        respuesta_sin_permiso = client.post(
            endpoint,
            headers=token,
            files={"archivo": ("mesa.png", imagen_png(), "image/png")},
            data={"autorizacion_imagen": "true"},
        )
        assert respuesta_sin_permiso.status_code == 403
        assert not list(tmp_path.iterdir())

        respuesta_falta_autorizacion = client.post(
            endpoint,
            headers=cabeceras_gestion,
            files={"archivo": ("mesa.png", imagen_png(), "image/png")},
            data={"autorizacion_imagen": "false"},
        )
        assert respuesta_falta_autorizacion.status_code == 422
        assert not list(tmp_path.iterdir())

        datos_foto = {"archivo": ("mesa.png", imagen_png(), "image/png")}
        subida = client.post(
            endpoint,
            headers=cabeceras_gestion,
            files=datos_foto,
            data={"autorizacion_imagen": "true"},
        )
        assert subida.status_code == 201, subida.text
        foto_id = subida.json()["id"]
        ruta = next(tmp_path.iterdir())
        assert ruta.exists()

        listado_publico = client.get("/api/v1/mesas/geovisor")
        assert listado_publico.status_code == 200, listado_publico.text
        mesa_publica = next(item for item in listado_publico.json() if item["id"] == mesa_id)
        assert mesa_publica["realizada"] is False
        assert mesa_publica["horario"] == "09:30 a 12:00"
        assert mesa_publica["fotos"] == []
        acceso_publico_pendiente = client.get(f"/api/v1/mesas/fotos/{foto_id}/revision/archivo")
        assert acceso_publico_pendiente.status_code == 401

        cola = client.get("/api/v1/mesas/fotos/pendientes", headers=cabeceras_gestion)
        assert cola.status_code == 200, cola.text
        entrada = next(item for item in cola.json() if item["id"] == foto_id)
        assert entrada["mesa_id"] == mesa_id
        assert "/mesas/fotos/" in entrada["archivo_revision_url"]

        revisar = client.post(
            f"/api/v1/mesas/fotos/{foto_id}/revision",
            headers=cabeceras_gestion,
            json={"estado": "APROBADA", "observacion": "Consentimiento y contenido revisados"},
        )
        assert revisar.status_code == 200, revisar.text

        mesa_aprobada = next(
            item for item in client.get("/api/v1/mesas/geovisor").json() if item["id"] == mesa_id
        )
        assert len(mesa_aprobada["fotos"]) == 1
        foto_url = mesa_aprobada["fotos"][0]["archivo_url"]
        descarga = client.get(foto_url)
        assert descarga.status_code == 200
        assert descarga.headers["content-type"] == "image/png"

        segunda_revision = client.post(
            f"/api/v1/mesas/fotos/{foto_id}/revision",
            headers=cabeceras_gestion,
            json={"estado": "RECHAZADA"},
        )
        assert segunda_revision.status_code == 409


async def test_fallo_tras_insertar_evidencia_revierte_y_compensa_archivo(
    database_url: str,
    cabeceras_gestion,
    monkeypatch,
    tmp_path,
):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        directorio_subidas=tmp_path,
    )
    app = create_app(settings)
    from app.modules.evidencia.repository import EvidenciaRepository

    original = EvidenciaRepository.guardar_foto_mesa

    async def fallar_despues_de_flush(self, foto):
        await original(self, foto)
        raise ValueError("fallo simulado después del flush de la asociación")

    monkeypatch.setattr(EvidenciaRepository, "guardar_foto_mesa", fallar_despues_de_flush)
    with TestClient(app, raise_server_exceptions=False) as client:
        codigo = uuid.uuid4().hex[:10]
        mesa_response = client.post(
            "/api/v1/mesas",
            headers=cabeceras_gestion,
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"ROLLBACK-{codigo}",
                "shortcode_ciudadano": f"RB{codigo}",
                "nombre": "Mesa para rollback de foto",
            },
        )
        assert mesa_response.status_code == 201, mesa_response.text
        mesa_id = mesa_response.json()["id"]
        nombre_archivo = f"mesa-{codigo}.png"
        subida = client.post(
            f"/api/v1/mesas/{mesa_id}/fotos",
            headers=cabeceras_gestion,
            files={"archivo": (nombre_archivo, imagen_png(), "image/png")},
            data={"autorizacion_imagen": "true"},
        )
        assert subida.status_code == 500
        assert not list(tmp_path.iterdir())

    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as connection:
            assert await connection.scalar(
                text("SELECT count(*) FROM participacion_ciudadana.evidencias_multimedia WHERE nombre_archivo_original = :nombre"),
                {"nombre": nombre_archivo},
            ) == 0
            assert await connection.scalar(
                text("SELECT count(*) FROM mesas_trabajo.fotos_mesa AS foto JOIN mesas_trabajo.mesas AS mesa ON mesa.id = foto.mesa_id WHERE mesa.id = :mesa_id"),
                {"mesa_id": uuid.UUID(mesa_id)},
            ) == 0
    finally:
        await engine.dispose()
