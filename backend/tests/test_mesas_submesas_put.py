import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_submesa_crear_derivada_y_actualizar_put(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]
        raiz = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"PUT-{test_id}",
                "shortcode_ciudadano": f"PUT{test_id}",
                "nombre": "Mesa raiz PUT",
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert raiz.status_code == 201
        raiz_id = raiz.json()["id"]

        # El frontend solo envía nombre + metadatos: la identidad se deriva del padre.
        sub = client.post(
            f"/api/v1/mesas/{raiz_id}/submesas",
            json={"nombre": "Submesa A", "metadatos": {"tema": "Convivencia"}},
        )
        assert sub.status_code == 201, sub.text
        assert sub.json()["tipo_mesa"] == "TERRITORIAL"
        sub_id = sub.json()["id"]

        upd = client.put(
            f"/api/v1/mesas/{raiz_id}/submesas/{sub_id}",
            json={"nombre": "Submesa A editada", "metadatos": {"participantes": 12}},
        )
        assert upd.status_code == 200, upd.text
        cuerpo = upd.json()
        assert cuerpo["nombre"] == "Submesa A editada"
        assert cuerpo["metadatos"]["participantes"] == 12
        assert cuerpo["metadatos"]["tema"] == "Convivencia"  # fusión, no reemplazo

        # Persistencia real
        got = client.get(f"/api/v1/mesas/{sub_id}")
        assert got.json()["nombre"] == "Submesa A editada"

        # Submesa que no pertenece a la mesa indicada → 404
        otra = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"PUT2-{test_id}",
                "shortcode_ciudadano": f"PUTB{test_id}",
                "nombre": "Otra raiz",
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        ).json()["id"]
        ajena = client.put(
            f"/api/v1/mesas/{otra}/submesas/{sub_id}", json={"nombre": "X"}
        )
        assert ajena.status_code == 404

        # Inexistente → 404
        nada = client.put(
            f"/api/v1/mesas/{raiz_id}/submesas/{uuid.uuid4()}", json={"nombre": "X"}
        )
        assert nada.status_code == 404
