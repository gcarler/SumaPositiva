import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


def test_evidencia_segura_subida_y_descarga(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    # 1. Crear una imagen con metadatos EXIF simulados
    img = Image.new("RGB", (100, 100), color="red")
    # Añadimos metadata EXIF con Pillow
    exif = img.getexif()
    exif[271] = "Make Fake Camera"  # Make
    exif[305] = "Software Tracker 1.0"

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", exif=exif)
    buffer.seek(0)
    bytes_fake = buffer.getvalue()

    with TestClient(app) as client:
        # Obtener un token de sesion anonima para autorizacion
        resp_sesion = client.post("/api/v1/sesion/anonima")
        assert resp_sesion.status_code == 201
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Subir imagen
        files = {"archivo": ("evidencia_peligrosa.jpg", bytes_fake, "image/jpeg")}
        resp_subida = client.post("/api/v1/evidencias/subir", files=files, headers=headers)

        assert resp_subida.status_code == 201
        data_subida = resp_subida.json()
        assert data_subida["despojo_exif_exitoso"] is True
        assert data_subida["tipo_mime"] == "image/jpeg"

        archivo_id = data_subida["id"]

        # 3. Descargar imagen y validar CERO EXIF
        resp_bajada = client.get(f"/api/v1/evidencias/{archivo_id}/archivo")
        assert resp_bajada.status_code == 200

        # Leemos la imagen bajada
        bajada_bytes = resp_bajada.content
        img_bajada = Image.open(io.BytesIO(bajada_bytes))

        # Pillow getexif() returns empty dict if no EXIF
        exif_bajada = img_bajada.getexif()
        assert not bool(exif_bajada), "La imagen todavia contiene datos EXIF!"


def test_evidencia_segura_rechazo_tipo_mime(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        resp_sesion = client.post("/api/v1/sesion/anonima")
        assert resp_sesion.status_code == 201
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        files = {
            "archivo": ("script_malicioso.sh", b"#!/bin/bash\necho 'hola'", "text/x-shellscript")
        }
        resp_subida = client.post("/api/v1/evidencias/subir", files=files, headers=headers)

        assert resp_subida.status_code == 415


def test_evidencia_segura_rechazo_tamano(database_url: str):
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        tamano_maximo_archivo_mb=0,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        resp_sesion = client.post("/api/v1/sesion/anonima")
        assert resp_sesion.status_code == 201
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        # Archivo que pesa mas de 0 bytes (500 KB aprox)
        bytes_fake = b"0" * 500000

        files = {"archivo": ("grande.jpg", bytes_fake, "image/jpeg")}
        resp_subida = client.post("/api/v1/evidencias/subir", files=files, headers=headers)

        assert resp_subida.status_code == 413


def test_evidencia_despojo_coordenadas_gps(database_url: str):
    """Verifica específicamente la eliminación de etiquetas GPS para proteger líderes
    comunitarios."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    # Crear imagen JPEG con bloque GPSInfo (tag 34853)
    img = Image.new("RGB", (120, 120), color="blue")
    exif = img.getexif()
    # Tag 34853 es GPSInfoIFD
    gps_ifd = exif.get_ifd(0x8825)
    gps_ifd[1] = "N"  # GPSLatitudeRef
    gps_ifd[2] = (10, 23, 59)  # 10° 23' 59" N (Cartagena de Indias)
    gps_ifd[3] = "W"  # GPSLongitudeRef
    gps_ifd[4] = (75, 30, 5)  # 75° 30' 5" W

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", exif=exif)
    bytes_con_gps = buffer.getvalue()

    with TestClient(app) as client:
        resp_sesion = client.post("/api/v1/sesion/anonima")
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        files = {"archivo": ("foto_lider_con_gps.jpg", bytes_con_gps, "image/jpeg")}
        resp_subida = client.post("/api/v1/evidencias/subir", files=files, headers=headers)
        assert resp_subida.status_code == 201

        archivo_id = resp_subida.json()["id"]
        resp_bajada = client.get(f"/api/v1/evidencias/{archivo_id}/archivo")
        assert resp_bajada.status_code == 200

        # Validar ausencia total de GPSInfo
        img_limpia = Image.open(io.BytesIO(resp_bajada.content))
        exif_limpio = img_limpia.getexif()
        assert not bool(exif_limpio), "Quedó EXIF residual!"
        gps_limpio = exif_limpio.get_ifd(0x8825)
        assert not bool(gps_limpio), "Coordenadas GPS no fueron eliminadas!"


def test_evidencia_imagen_corrupta_rechazo(database_url: str):
    """Verifica rechazo 400 Bad Request cuando el archivo declara ser imagen pero sus bytes están
    dañados."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        resp_sesion = client.post("/api/v1/sesion/anonima")
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        # Bytes aleatorios corruptos con MIME image/jpeg
        files = {"archivo": ("corrupta.jpg", b"NO_SOY_JPEG_VALIDO_1234567890", "image/jpeg")}
        resp = client.post("/api/v1/evidencias/subir", files=files, headers=headers)
        assert resp.status_code == 400
        assert "no es una imagen válida" in resp.json()["detail"]
