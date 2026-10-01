import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture
def test_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def test_evidencias_despojo_exif_y_gps(test_client: TestClient):
    """Demuestra eliminación 100% efectiva de EXIF y tags GPS sintéticos para protección de
    líderes."""  # 1. Crear imagen con metadatos EXIF y coordenadas GPS de Cartagena de Indias
    img = Image.new("RGB", (150, 150), color="green")
    exif = img.getexif()
    exif[271] = "Camara Comunitaria Pro"
    exif[272] = "Modelo Seguridad Lider"

    # Bloque GPSInfo (0x8825 = 34853)
    gps_ifd = exif.get_ifd(0x8825)
    gps_ifd[1] = "N"
    gps_ifd[2] = (10, 23, 59)  # 10° 23' 59" N
    gps_ifd[3] = "W"
    gps_ifd[4] = (75, 30, 5)  # 75° 30' 5" W

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", exif=exif)
    bytes_con_exif = buffer.getvalue()

    # 2. Sesión cívica para autenticación
    resp_sesion = test_client.post("/api/v1/sesion/anonima")
    assert resp_sesion.status_code == 201
    token = resp_sesion.json()["token_acceso"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Subir evidencia fotográfica
    files = {"archivo": ("evidencia_territorial_cartagena.jpg", bytes_con_exif, "image/jpeg")}
    resp_subida = test_client.post("/api/v1/evidencias/subir", files=files, headers=headers)
    assert resp_subida.status_code == 201

    data = resp_subida.json()
    assert data["exif_despojado"] is True
    assert data["tipo_mime"] == "image/jpeg"
    assert len(data["hash_sha256"]) == 64
    assert data["nombre_archivo_original"] == "evidencia_territorial_cartagena.jpg"

    evidencia_id = data["id"]

    # 4. Descargar imagen y validar CERO EXIF residual
    resp_descarga = test_client.get(f"/api/v1/evidencias/{evidencia_id}/archivo")
    assert resp_descarga.status_code == 200
    assert resp_descarga.headers["content-type"] == "image/jpeg"

    img_sanitizada = Image.open(io.BytesIO(resp_descarga.content))
    exif_sanitizado = img_sanitizada.getexif()
    assert len(exif_sanitizado) == 0, f"Quedaron etiquetas EXIF: {dict(exif_sanitizado)}"

    # Validar que no exista bloque GPSInfo
    gps_sanitizado = exif_sanitizado.get_ifd(0x8825)
    assert len(gps_sanitizado) == 0, "Las coordenadas GPS siguen presentes en el archivo!"


def test_evidencias_rechazo_tipo_mime_no_autorizado(test_client: TestClient):
    """Rechaza tipos de archivo maliciosos o extensiones no autorizadas."""
    resp_sesion = test_client.post("/api/v1/sesion/anonima")
    token = resp_sesion.json()["token_acceso"]
    headers = {"Authorization": f"Bearer {token}"}

    # Intento de subir script
    files = {"archivo": ("exploit.sh", b"#!/bin/bash\necho pwned", "text/x-shellscript")}
    resp = test_client.post("/api/v1/evidencias/subir", files=files, headers=headers)
    assert resp.status_code == 415
    assert "Tipo de archivo no permitido" in resp.json()["detail"]


def test_evidencias_rechazo_limite_tamano(database_url: str):
    """Rechaza archivos que superen el límite de tamaño permitido."""
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        tamano_maximo_archivo_mb=0,  # 0 MB para forzar el límite de tamaño
    )
    app = create_app(settings)
    with TestClient(app) as client:
        resp_sesion = client.post("/api/v1/sesion/anonima")
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        # Archivo que pesa 100 KB (supera 0 MB)
        bytes_grandes = b"0" * 102400
        files = {"archivo": ("pesado.jpg", bytes_grandes, "image/jpeg")}
        resp = client.post("/api/v1/evidencias/subir", files=files, headers=headers)
        assert resp.status_code == 413
        assert "excede el tamaño máximo" in resp.json()["detail"]


def test_evidencias_persistencia_bd_csh(test_client: TestClient):
    """Comprueba la persistencia física del registro en la tabla bd_csh."""
    # 1. Crear imagen PNG limpia
    img = Image.new("RGBA", (80, 80), color=(255, 100, 50, 255))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    bytes_png = buffer.getvalue()

    resp_sesion = test_client.post("/api/v1/sesion/anonima")
    token = resp_sesion.json()["token_acceso"]
    headers = {"Authorization": f"Bearer {token}"}

    files = {"archivo": ("mapa_comunitario.png", bytes_png, "image/png")}
    resp_subida = test_client.post("/api/v1/evidencias/subir", files=files, headers=headers)
    assert resp_subida.status_code == 201
    evidencia_id = resp_subida.json()["id"]

    # 2. Consultar endpoint de metadatos GET /api/v1/evidencias/{id}
    resp_meta = test_client.get(f"/api/v1/evidencias/{evidencia_id}")
    assert resp_meta.status_code == 200
    meta = resp_meta.json()
    assert meta["id"] == evidencia_id
    assert meta["tipo_mime"] == "image/png"
    assert meta["exif_despojado"] is True
    assert meta["nombre_archivo_original"] == "mapa_comunitario.png"
    assert "creado_en" in meta


def test_evidencias_imagen_corrupta_rechazo(test_client: TestClient):
    """Rechaza con 400 Bad Request cuando los bytes están corruptos."""
    resp_sesion = test_client.post("/api/v1/sesion/anonima")
    token = resp_sesion.json()["token_acceso"]
    headers = {"Authorization": f"Bearer {token}"}

    files = {"archivo": ("falsa_foto.jpg", b"BYTES_CORRUPTOS_NO_ES_IMAGEN", "image/jpeg")}
    resp = test_client.post("/api/v1/evidencias/subir", files=files, headers=headers)
    assert resp.status_code == 400
    assert "no es una imagen válida" in resp.json()["detail"]
