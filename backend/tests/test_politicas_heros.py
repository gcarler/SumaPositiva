import io
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.identidad.deps import obtener_sujeto_autenticado
from app.modules.identidad.schemas import SujetoAutenticadoContexto

pytestmark = pytest.mark.anyio


@pytest.fixture(autouse=True)
def aislar_entorno_heros(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Aísla el archivo de persistencia y directorio de subida a un directorio temporal privado.

    Garantiza que ningún test toque ni borre el archivo real de producción
    (/root/polis/data/heros_config.json) ni escriba en public/images/hero/.
    """
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    archivo_config = data_dir / "heros_config.json"

    monkeypatch.setattr(
        "app.modules.politicas.router._ruta_archivo_heros",
        lambda: archivo_config,
    )
    monkeypatch.setattr(
        "app.modules.politicas.router._obtener_directorio_raiz",
        lambda: tmp_path,
    )
    yield tmp_path


def test_obtener_heros_config_publico():
    """Verifica que GET /api/v1/politicas/heros sea público y devuelva la configuración oficial."""
    settings = Settings(_env_file=None, environment="test")
    app = create_app(settings)

    with TestClient(app) as client:
        res = client.get("/api/v1/politicas/heros")
        assert res.status_code == 200
        data = res.json()
        assert "slides" in data
        assert len(data["slides"]) >= 5
        assert data["opacidad"] == 80
        assert data["modoCarrusel"] is True
        assert "catalogoImagenes" in data
        assert len(data["catalogoImagenes"]) >= 5
        assert data.get("heroImageId") == "asamblea-claustro"


def test_actualizar_heros_config_roundtrip():
    """Verifica que PUT /api/v1/politicas/heros actualice las diapositivas y configuración."""
    settings = Settings(_env_file=None, environment="test")
    app = create_app(settings)

    sujeto_admin = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="administrador_identidades",
        nivel_identidad="verificada",
        permisos=["configuracion:gestionar", "politicas:gestionar"],
        es_anonimo=False,
    )
    app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto_admin

    with TestClient(app) as client:
        res_orig = client.get("/api/v1/politicas/heros")
        data = res_orig.json()

        nueva_slide = {
            "id": "hero-nuevo-test-01",
            "titulo": "Encuentro de Juventud y Cultura de Paz",
            "subtitulo": "Espacio comunitario deliberativo en Getsemaní.",
            "enfoque": "Juventud y Convivencia",
            "imagenFondo": "/images/hero/hero-custom-test.webp",
            "ubicacionReal": "Plaza de la Trinidad — Getsemaní",
            "altura": "fullscreen",
            "badgeTexto": "Juventud y Paz",
            "activa": True,
            "heroImageId": "marco-logico",
        }
        payload = {
            "slides": [data["slides"][0], nueva_slide],
            "catalogoImagenes": data["catalogoImagenes"],
            "opacidad": 85,
            "modoCarrusel": True,
            "intervaloSegundos": 5,
            "heroImageId": "marco-logico",
            "pageImages": {"barrio": "hero-nuevo-test-01"},
        }

        put_res = client.put(
            "/api/v1/politicas/heros",
            json=payload,
            headers={"Authorization": "Bearer fake_token"},
        )
        assert put_res.status_code == 200
        actualizado = put_res.json()
        assert len(actualizado["slides"]) == 2
        assert actualizado["slides"][1]["id"] == "hero-nuevo-test-01"
        assert actualizado["opacidad"] == 85
        assert actualizado["intervaloSegundos"] == 5
        assert actualizado["heroImageId"] == "marco-logico"

        get_res2 = client.get("/api/v1/politicas/heros")
        assert get_res2.status_code == 200
        data2 = get_res2.json()
        assert len(data2["slides"]) == 2
        assert data2["slides"][1]["titulo"] == "Encuentro de Juventud y Cultura de Paz"
        assert data2["heroImageId"] == "marco-logico"

        # Validar que slides vacíos (cero fotos) sea admitido para retícula institucional
        payload_vacio = {
            **payload,
            "slides": [],
            "catalogoImagenes": [
                {
                    "id": "ninguna",
                    "titulo": "Solo Retícula Institucional",
                    "descripcion": "Fondo minimalista",
                    "archivo": "",
                    "thumbnail": "",
                    "enfoque": "Minimalista",
                    "habilitada": False,
                    "heroImageId": "ninguna",
                }
            ],
            "pageImages": {},
        }
        res_cero_fotos = client.put(
            "/api/v1/politicas/heros",
            json=payload_vacio,
            headers={"Authorization": "Bearer fake_token"},
        )
        assert res_cero_fotos.status_code == 200
        cero_data = res_cero_fotos.json()
        assert cero_data["slides"] == []
        assert len(cero_data["catalogoImagenes"]) == 1
        assert cero_data["catalogoImagenes"][0]["habilitada"] is False
        assert cero_data["catalogoImagenes"][0]["heroImageId"] == "ninguna"
        assert cero_data["pageImages"] == {}

        get_res3 = client.get("/api/v1/politicas/heros")
        assert get_res3.status_code == 200
        data3 = get_res3.json()
        assert data3["slides"] == []
        assert len(data3["catalogoImagenes"]) == 1
        assert data3["catalogoImagenes"][0]["habilitada"] is False


def test_actualizar_heros_config_autenticacion_y_roles():
    """Verifica 401 si no hay token y 403 si el rol no es autorizado."""
    settings = Settings(_env_file=None, environment="test")
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Sin credenciales -> 401 Unauthorized
        res_sin_token = client.put(
            "/api/v1/politicas/heros",
            json={"slides": []},
        )
        assert res_sin_token.status_code == 401

    # 2. Con rol no autorizado (ej: ciudadano) -> 403 Forbidden
    sujeto_ciudadano = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="ciudadano",
        nivel_identidad="declarada",
        permisos=["aportes:crear"],
        es_anonimo=False,
    )
    app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto_ciudadano

    with TestClient(app) as client:
        res_rol_invalido = client.put(
            "/api/v1/politicas/heros",
            json={"slides": []},
            headers={"Authorization": "Bearer token_ciudadano"},
        )
        assert res_rol_invalido.status_code == 403


def test_subir_imagen_hero_seguridad_y_carga():
    """Verifica que POST /api/v1/politicas/heros/subir-imagen exija autenticación y rol."""
    settings = Settings(_env_file=None, environment="test")
    app = create_app(settings)

    contenido_mock = b"\x89PNG\r\n\x1a\nfake_image_bytes"
    archivos = {"archivo": ("test_foto.png", io.BytesIO(contenido_mock), "image/png")}

    with TestClient(app) as client:
        # 1. Sin token -> 401
        res_sin_token = client.post(
            "/api/v1/politicas/heros/subir-imagen",
            files=archivos,
        )
        assert res_sin_token.status_code == 401

    # 2. Con rol no autorizado -> 403
    sujeto_ciudadano = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="ciudadano",
        nivel_identidad="declarada",
        permisos=["aportes:crear"],
        es_anonimo=False,
    )
    app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto_ciudadano

    with TestClient(app) as client:
        archivos_2 = {"archivo": ("test_foto.png", io.BytesIO(contenido_mock), "image/png")}
        res_rol_invalido = client.post(
            "/api/v1/politicas/heros/subir-imagen",
            files=archivos_2,
            headers={"Authorization": "Bearer token_ciudadano"},
        )
        assert res_rol_invalido.status_code == 403

    # 3. Con rol autorizado -> 200 y archivo guardado en sandbox
    sujeto_autoridad = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="autoridad_distrital",
        nivel_identidad="verificada",
        permisos=["politicas:gestionar"],
        es_anonimo=False,
    )
    app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto_autoridad

    with TestClient(app) as client:
        archivos_3 = {"archivo": ("test_foto.png", io.BytesIO(contenido_mock), "image/png")}
        res_ok = client.post(
            "/api/v1/politicas/heros/subir-imagen",
            files=archivos_3,
            headers={"Authorization": "Bearer token_autoridad"},
        )
        assert res_ok.status_code == 200
        data = res_ok.json()
        assert "url" in data
        assert data["url"].startswith("/images/hero/hero-custom-")
        assert "nombre" in data
