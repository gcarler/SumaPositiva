import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_apoyos_unicos_flujo(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Sesion Anonima 1
        resp_sesion1 = client.post("/api/v1/sesion/anonima")
        token_s1 = resp_sesion1.json()["token_acceso"]
        headers_s1 = {"Authorization": f"Bearer {token_s1}"}

        # 2. Sesion Anonima 2
        resp_sesion2 = client.post("/api/v1/sesion/anonima")
        token_s2 = resp_sesion2.json()["token_acceso"]
        headers_s2 = {"Authorization": f"Bearer {token_s2}"}

        # Crear propuesta con S1
        resp_lineas = client.get("/api/v1/politicas/lineas")
        linea_id = resp_lineas.json()[0]["id"]

        resp_prop = client.post(
            "/api/v1/aportes",
            json={
                "linea_id": linea_id,
                "titulo": "Propuesta Apoyos",
                "descripcion": "Verificando el sistema de votos",
                "tipo_aporte": "propuesta",
            },
            headers=headers_s1,
        )
        assert resp_prop.status_code == 201
        aporte_id = resp_prop.json()["id"]

        # El creador no apoya automáticamente, apoyos_contador debe ser 0
        assert resp_prop.json()["apoyos_contador"] == 0

        # 3. Primer apoyo por S1
        resp_apoyo1 = client.post(f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_s1)
        assert resp_apoyo1.status_code == 200
        assert resp_apoyo1.json()["apoyos_contador"] == 1

        # 4. Segundo apoyo por S1 (Debe fallar)
        resp_apoyo1_dup = client.post(f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_s1)
        assert resp_apoyo1_dup.status_code == 409

        # 5. Apoyo por S2 (Debe pasar)
        resp_apoyo2 = client.post(f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_s2)
        assert resp_apoyo2.status_code == 200
        assert resp_apoyo2.json()["apoyos_contador"] == 2

        # 5.1 Apoyo por Usuario Autenticado
        correo_usuario = f"ciudadano_{uuid.uuid4().hex[:6]}@cartagena.gov.co"
        resp_reg = client.post(
            "/api/v1/identidad/registro",
            json={
                "correo": correo_usuario,
                "contrasena": "ClaveSegura123*",
                "nombres": "Pedro",
                "apellidos": "Heredia",
            },
        )
        assert resp_reg.status_code == 201

        resp_login = client.post(
            "/api/v1/identidad/login",
            json={
                "correo": correo_usuario,
                "contrasena": "ClaveSegura123*",
            },
        )
        assert resp_login.status_code == 200
        token_usuario = resp_login.json()["token_acceso"]
        headers_usuario = {"Authorization": f"Bearer {token_usuario}"}

        resp_apoyo3 = client.post(f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_usuario)
        assert resp_apoyo3.status_code == 200
        assert resp_apoyo3.json()["apoyos_contador"] == 3

        # 5.2 Segundo apoyo por el mismo usuario autenticado -> 409 Conflict
        resp_apoyo3_dup = client.post(
            f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_usuario
        )
        assert resp_apoyo3_dup.status_code == 409

        # 6. Intento directo en BD (Duplicado S2)
        engine = create_async_engine(database_url)
        sujeto_id_s2 = resp_sesion2.json()["sesion_id"]
        async with engine.begin() as conn:
            try:
                await conn.execute(
                    text(f"""
                    INSERT INTO participacion_ciudadana.apoyos_propuestas 
                    (propuesta_id, sujeto_id, tipo_sujeto) 
                    VALUES ('{aporte_id}', '{sujeto_id_s2}', 'sesion_anonima')
                """)
                )
                raise AssertionError("Debería fallar por UNIQUE constraint")
            except Exception as e:
                assert "unique" in str(e).lower()

        # Verificar UUIDv7 en apoyos_propuestas en conexión limpia
        async with engine.connect() as conn:
            res_apoyos = await conn.execute(
                text(
                    "\n                SELECT id FROM participacion_ciudadana.apoyos_p"
                    "ropuestas WHERE propuesta_id = '"
                    f"{aporte_id}"
                    "' LIMIT 1\n            "
                )
            )
            fila = res_apoyos.fetchone()
            assert fila is not None
            apoyo_uuid = uuid.UUID(str(fila[0]))
            assert apoyo_uuid.version == 7

        await engine.dispose()
