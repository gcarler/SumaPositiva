import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_enfoque_etnico_salvaguardas(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Sesion anonima
        resp_sesion = client.post("/api/v1/sesion/anonima")
        token = resp_sesion.json()["token_acceso"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Obtener linea
        resp_lineas = client.get("/api/v1/politicas/lineas")
        linea_id = resp_lineas.json()[0]["id"]

        # 3. Crear territorio etnico de prueba directamente en bd
        engine = create_async_engine(database_url)
        territorio_id = str(uuid.uuid4())
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "\n                INSERT INTO geodatos.territorios \n             "
                    "   (id, codigo, nombre, tipo_territorio, es_zona_etnica, nombre_"
                    "consejo_comunitario) \n                VALUES ('"
                    f"{territorio_id}"
                    "', 'T-ETN-01', 'Comunidad de prueba', 'corregimiento', true, 'Co"
                    "nsejo Afro de Prueba')\n            "
                )
            )

        # 4. Crear propuesta vinculada a territorio etnico
        resp_prop = client.post(
            "/api/v1/aportes",
            json={
                "linea_id": linea_id,
                "territorio_id": territorio_id,
                "titulo": "Propuesta desde territorio etnico",
                "descripcion": "Verificando autodetecion de salvaguardas",
                "tipo_aporte": "propuesta",
            },
            headers=headers,
        )

        assert resp_prop.status_code == 201
        data = resp_prop.json()
        assert data["es_territorio_etnico"] is True
        assert data["requiere_consulta_previa"] is True
        assert data["ruta_etnica_diferenciada"] is True
        assert data["consejo_comunitario"] == "Consejo Afro de Prueba"

        prop_id_1 = data["id"]

        # 5. Crear propuesta con metadatos de etnia explicita (sin territorio)
        resp_prop2 = client.post(
            "/api/v1/aportes",
            json={
                "linea_id": linea_id,
                "titulo": "Propuesta de ciudadana indigena",
                "descripcion": "Verificando autodeteccion por metadatos",
                "tipo_aporte": "propuesta",
                "metadata_enfoque": {"etnia": "indigena"},
            },
            headers=headers,
        )

        assert resp_prop2.status_code == 201
        data2 = resp_prop2.json()
        assert data2["es_territorio_etnico"] is False
        assert data2["requiere_consulta_previa"] is False
        assert data2["ruta_etnica_diferenciada"] is True

        # 6. Probar filtros
        resp_filtro = client.get("/api/v1/aportes?requiere_consulta_previa=true")
        assert resp_filtro.status_code == 200
        resultados = resp_filtro.json()["elementos"]
        assert any(r["id"] == prop_id_1 for r in resultados)
        assert not any(r["id"] == data2["id"] for r in resultados)

        # 6.1 Probar filtro solo_etnicos=true
        resp_filtro_etnico = client.get("/api/v1/aportes?solo_etnicos=true")
        assert resp_filtro_etnico.status_code == 200
        resultados_etnicos = resp_filtro_etnico.json()["elementos"]
        assert any(r["id"] == prop_id_1 for r in resultados_etnicos)
        assert not any(r["id"] == data2["id"] for r in resultados_etnicos)

        # 7. Probar con territorio étnico real sembrado en Cartagena (La Boquilla)
        async with engine.connect() as conn:
            res_boq = await conn.execute(
                text(
                    "SELECT id, nombre, nombre_consejo_comunitario FROM geod"
                    "atos.territorios WHERE codigo = 'CORR-BOQUILLA' LIMIT 1"
                )
            )
            boquilla_row = res_boq.fetchone()

        if boquilla_row:
            boquilla_id = str(boquilla_row[0])
            resp_prop_boquilla = client.post(
                "/api/v1/aportes",
                json={
                    "linea_id": linea_id,
                    "territorio_id": boquilla_id,
                    "titulo": "Protección de manglares y pesca artesanal en La Boquilla",
                    ("descripcion"): (
                        "Garantía de pervivencia cultural y derechos territoriales de comunidades negras."
                    ),
                    "tipo_aporte": "propuesta",
                },
                headers=headers,
            )
            assert resp_prop_boquilla.status_code == 201
            data_boq = resp_prop_boquilla.json()
            assert data_boq["es_territorio_etnico"] is True
            assert data_boq["requiere_consulta_previa"] is True
            assert data_boq["ruta_etnica_diferenciada"] is True
            assert "La Boquilla" in (data_boq["consejo_comunitario"] or "")

        # Limpiar
        async with engine.begin() as conn:
            await conn.execute(text(f"DELETE FROM geodatos.territorios WHERE id = '{territorio_id}'"))
        await engine.dispose()
