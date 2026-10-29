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
        assert sub2["ruta_jerarquica"] == f"csh.mt{test_id}.seguridad_{test_id}.prevencion_{test_id}"

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
            respuesta_invalida = client.get("/api/v1/mesas", params={"ancestro_ruta": ruta_invalida})
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


async def test_actualizar_mesa_persistencia(database_url: str, cabeceras_gestion):
    """EDIT-01: Verifica persistencia remota de edición de metadatos de mesas en PostgreSQL."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        # 1. Crear mesa inicial
        resp_crear = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": f"MT-{test_id}-EDIT",
                "shortcode_ciudadano": f"MT{test_id}E",
                "nombre": "Mesa Territorial Original",
                "lugar_nombre": "Colegio Mayor de Bolivar",
                "fecha": "2026-10-10",
                "horario": "08:00 - 12:00",
                "aforo_maximo": 50,
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert resp_crear.status_code == 201
        mesa = resp_crear.json()
        mesa_id = mesa["id"]

        # 2. Actualizar metadatos mediante PATCH
        datos_actualizacion = {
            "nombre": "Mesa Territorial San Francisco - Movilidad y Convivencia",
            "lugar": "Centro Cultural Las Palmeras, Salon Comunal",
            "fecha": "2026-10-15",
            "horario": "09:00 - 13:00",
            "aforo_esperado": 85,
            "entidad_responsable": "Secretaria del Interior y Convivencia",
            "facilitador_principal": "Dra. Patricia Gomez",
            "modalidad": "HIBRIDA_DIGITAL",
        }

        resp_patch = client.patch(f"/api/v1/mesas/{mesa_id}", json=datos_actualizacion)
        assert resp_patch.status_code == 200
        mesa_actualizada = resp_patch.json()

        assert mesa_actualizada["id"] == mesa_id
        assert mesa_actualizada["nombre"] == "Mesa Territorial San Francisco - Movilidad y Convivencia"
        assert mesa_actualizada["lugar_nombre"] == "Centro Cultural Las Palmeras, Salon Comunal"
        assert mesa_actualizada["fecha"] == "2026-10-15"
        assert mesa_actualizada["horario"] == "09:00 - 13:00"
        assert mesa_actualizada["aforo_maximo"] == 85
        assert mesa_actualizada["modalidad"] == "HIBRIDA_DIGITAL"
        assert mesa_actualizada["metadatos"]["entidad"] == "Secretaria del Interior y Convivencia"
        assert mesa_actualizada["metadatos"]["facilitador"] == "Dra. Patricia Gomez"
        assert mesa_actualizada["metadatos"]["lugar"] == "Centro Cultural Las Palmeras, Salon Comunal"

        # 3. Verificar persistencia tras recarga mediante GET directo a BD
        resp_get = client.get(f"/api/v1/mesas/{mesa_id}")
        assert resp_get.status_code == 200
        mesa_persistida = resp_get.json()

        assert mesa_persistida["nombre"] == "Mesa Territorial San Francisco - Movilidad y Convivencia"
        assert mesa_persistida["lugar_nombre"] == "Centro Cultural Las Palmeras, Salon Comunal"
        assert mesa_persistida["fecha"] == "2026-10-15"
        assert mesa_persistida["horario"] == "09:00 - 13:00"
        assert mesa_persistida["aforo_maximo"] == 85
        assert mesa_persistida["modalidad"] == "HIBRIDA_DIGITAL"
        assert mesa_persistida["metadatos"]["entidad"] == "Secretaria del Interior y Convivencia"
        assert mesa_persistida["metadatos"]["facilitador"] == "Dra. Patricia Gomez"

        # 4. Manejo de errores: 404 si la mesa no existe
        random_id = str(uuid.uuid4())
        resp_404 = client.patch(f"/api/v1/mesas/{random_id}", json={"nombre": "No existe"})
        assert resp_404.status_code == 404
        assert "no encontrada" in resp_404.json()["detail"].lower()
