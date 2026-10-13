import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_mesa_geovisor_coordenadas_registradas_y_fallback_centroide(
    database_url: str,
    cabeceras_gestion,
    tmp_path,
):
    """Verifica que /api/v1/mesas/geovisor retorne 'coordenada_registrada' cuando
    la mesa tiene coordenadas en metadatos, y 'centroide_territorial_referencia' o null
    en su defecto, según especificación [MESA-UBIC-01].
    """
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        directorio_subidas=tmp_path,
    )
    app = create_app(settings)
    with TestClient(app) as client:
        # 1. Crear mesa con coordenadas registradas y urlMapa
        codigo_a = uuid.uuid4().hex[:8]
        resp_a = client.post(
            "/api/v1/mesas",
            headers=cabeceras_gestion,
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"UBIC-A-{codigo_a}",
                "shortcode_ciudadano": f"UA{codigo_a}",
                "nombre": "Mesa con Coordenadas Propias",
                "fecha": "2026-10-15",
                "horario": "08:00 a 12:00",
                "estado": "PROGRAMADA",
                "metadatos": {
                    "coordenadas": {"lat": 10.4215, "lng": -75.5519},
                    "urlMapa": "https://www.google.com/maps/@10.4215,-75.5519,16z",
                },
            },
        )
        assert resp_a.status_code == 201, resp_a.text
        mesa_a_id = resp_a.json()["id"]

        # 2. Crear mesa sin coordenadas (debe caer en centroide o null si no tiene territorio)
        codigo_b = uuid.uuid4().hex[:8]
        resp_b = client.post(
            "/api/v1/mesas",
            headers=cabeceras_gestion,
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"UBIC-B-{codigo_b}",
                "shortcode_ciudadano": f"UB{codigo_b}",
                "nombre": "Mesa sin Coordenadas",
                "fecha": "2026-10-16",
                "estado": "PROGRAMADA",
            },
        )
        assert resp_b.status_code == 201, resp_b.text
        mesa_b_id = resp_b.json()["id"]

        # 3. Consultar /api/v1/mesas/geovisor
        geo_resp = client.get("/api/v1/mesas/geovisor")
        assert geo_resp.status_code == 200, geo_resp.text
        items = geo_resp.json()

        item_a = next(m for m in items if m["id"] == mesa_a_id)
        assert item_a["tipo_ubicacion"] == "coordenada_registrada"
        assert item_a["latitud_referencia"] == 10.4215
        assert item_a["longitud_referencia"] == -75.5519
        assert item_a["url_mapa"] == "https://www.google.com/maps/@10.4215,-75.5519,16z"

        item_b = next(m for m in items if m["id"] == mesa_b_id)
        # Sin territorio_id ni coordenadas propias, tipo_ubicacion es null
        assert item_b["tipo_ubicacion"] in {None, "centroide_territorial_referencia"}
        assert item_b["url_mapa"] is None
