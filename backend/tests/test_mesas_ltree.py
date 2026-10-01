import uuid

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.mesas.service import MesaService

pytestmark = pytest.mark.anyio


async def test_mesas_ltree_jerarquia(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]
        # 1. Crear Mesa Raiz
        resp_raiz = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_id}",
                "shortcode_ciudadano": f"MT{test_id}",
                "nombre": "Mesa Territorial Centro",
                "lugar_nombre": "Plaza de la Aduana",
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert resp_raiz.status_code == 201
        mesa_raiz = resp_raiz.json()
        assert mesa_raiz["ruta_jerarquica"] == f"csh.mt{test_id}"
        raiz_id = mesa_raiz["id"]

        # 2. Crear Submesa Nivel 1
        resp_sub1 = client.post(
            f"/api/v1/mesas/{raiz_id}/submesas",
            json={
                "slug": f"seguridad_{test_id}",
                "nombre": "Mesa Tematica de Seguridad",
                "tipo_mesa": "SECTORIAL",
                "codigo_oficial": f"MT-{test_id}-SEG",
                "shortcode_ciudadano": f"MT{test_id}SEG",
                "lugar_nombre": "Alcaldia",
            },
        )
        assert resp_sub1.status_code == 201
        sub1 = resp_sub1.json()
        assert sub1["ruta_jerarquica"] == f"csh.mt{test_id}.seguridad_{test_id}"
        sub1_id = sub1["id"]

        # 3. Crear Submesa Nivel 2
        resp_sub2 = client.post(
            f"/api/v1/mesas/{sub1_id}/submesas",
            json={
                "slug": f"prevencion_{test_id}",
                "nombre": "Mesa de Prevencion",
                "tipo_mesa": "SECTORIAL",
                "codigo_oficial": f"MT-{test_id}-SEG-PREV",
                "shortcode_ciudadano": f"MT{test_id}SEGPREV",
                "lugar_nombre": "Plaza Central",
            },
        )
        assert resp_sub2.status_code == 201
        sub2 = resp_sub2.json()
        assert (
            sub2["ruta_jerarquica"] == f"csh.mt{test_id}.seguridad_{test_id}.prevencion_{test_id}"
        )

        # 4. Obtener Descendientes de la Raiz (<@)
        resp_desc_raiz = client.get(f"/api/v1/mesas/{raiz_id}/submesas")
        assert resp_desc_raiz.status_code == 200
        desc_raiz = resp_desc_raiz.json()
        # Debe incluir a Nivel 1 y Nivel 2 pero NO a si misma (2 elementos)
        assert len(desc_raiz) == 2

        # 5. Listar por ancestro_ruta via query string
        resp_filtro = client.get(f"/api/v1/mesas?ancestro_ruta=csh.mt{test_id}.seguridad_{test_id}")
        assert resp_filtro.status_code == 200
        filtro_desc = resp_filtro.json()
        assert len(filtro_desc) == 2

        # Las rutas malformadas se rechazan antes de llegar al repositorio.
        for ruta_invalida in (
            "' OR 1=1 --",
            "x'; DROP TABLE mesas_trabajo.mesas; --",
            "csh..raiz",
            "csh. etiqueta",
            "csh.área",
            "csh.\\x00",
        ):
            respuesta_invalida = client.get(
                "/api/v1/mesas", params={"ancestro_ruta": ruta_invalida}
            )
            assert respuesta_invalida.status_code == 422

        # Evitar el límite de longitud de URL de httpx y ejercer directamente el validador
        # de la aplicación con una ruta que supera el máximo permitido por ltree.
        with pytest.raises(HTTPException) as error_ruta_extensa:
            MesaService(None)._validar_ruta_ltree("a" * 65_536)
        assert error_ruta_extensa.value.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

        # 6. Filtrar por tipo_mesa
        resp_tipo = client.get("/api/v1/mesas?tipo_mesa=TERRITORIAL")
        assert resp_tipo.status_code == 200
        filtro_tipo = resp_tipo.json()
        assert len([m for m in filtro_tipo if m["id"] == raiz_id]) == 1

        # 7. Obtener mesa individual por ID
        resp_individual = client.get(f"/api/v1/mesas/{raiz_id}")
        assert resp_individual.status_code == 200
        assert resp_individual.json()["id"] == raiz_id
        assert resp_individual.json()["codigo_oficial"] == f"MT-{test_id}"
