"""Pruebas de verificación integral para FEAT-APOYOS-VOTO-01:
Alternancia de respaldos ciudadanos (1 ciudadano = 1 voto), consulta de mis-apoyos y retiro de apoyo.
"""

import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import Settings
from app.core.database import Database
from app.main import create_app
from app.modules.aportes.models import PropuestaCiudadana
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate
from app.modules.politicas.models import LineaEstrategica

pytestmark = pytest.mark.anyio


def test_alternar_apoyo_y_mis_apoyos_endpoint(database_url: str):
    """Verifica el ciclo completo de alternancia (toggle) de apoyos y consulta de mis-apoyos."""
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        # 0. Preparar propuesta de prueba
        async def preparar_propuesta():
            db = Database(settings)
            async with db.sessions() as s:
                res_linea = await s.execute(select(LineaEstrategica).limit(1))
                linea = res_linea.scalar_one()
                repo = AporteRepository(s)
                propuesta = await repo.crear(
                    PropuestaCiudadanaCreate(
                        linea_id=linea.id,
                        titulo="Cámaras Comunitarias Conectadas al CAD en Pozón",
                        descripcion="Implementación de monitoreo con alarmas sonoras comunitarias.",
                        tipo_aporte="propuesta",
                        autor_nombre="Junta de Acción Comunal Pozón",
                        es_anonimo=False,
                    )
                )
                await s.commit()
                return propuesta.id

        propuesta_id = asyncio.run(preparar_propuesta())

        try:
            # 1. Sesión A: emitir sesión anónima
            resp_a = client.post("/api/v1/sesion/anonima")
            assert resp_a.status_code == 201
            token_a = resp_a.json()["token_acceso"]
            headers_a = {"Authorization": f"Bearer {token_a}"}

            # 2. Sesión B: emitir sesión anónima
            resp_b = client.post("/api/v1/sesion/anonima")
            assert resp_b.status_code == 201
            token_b = resp_b.json()["token_acceso"]
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # 3. GET /mis-apoyos antes de votar -> lista vacía
            resp_mis_a0 = client.get("/api/v1/aportes/mis-apoyos", headers=headers_a)
            assert resp_mis_a0.status_code == 200
            assert resp_mis_a0.json()["propuestas_apoyadas"] == []

            # 4. Sesión A vota: POST /api/v1/aportes/{id}/apoyar -> apoyado=True, contador=1
            resp_vote1 = client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers_a)
            assert resp_vote1.status_code == 200
            data1 = resp_vote1.json()
            assert data1["apoyado"] is True
            assert data1["apoyos_contador"] == 1
            assert str(propuesta_id) == str(data1["propuesta_id"])

            # 5. Sesión A consulta /mis-apoyos -> debe contener propuesta_id
            resp_mis_a1 = client.get("/api/v1/aportes/mis-apoyos", headers=headers_a)
            assert resp_mis_a1.status_code == 200
            assert str(propuesta_id) in [str(uid) for uid in resp_mis_a1.json()["propuestas_apoyadas"]]

            # 6. Sesión B consulta /mis-apoyos -> no debe contener propuesta_id
            resp_mis_b0 = client.get("/api/v1/aportes/mis-apoyos", headers=headers_b)
            assert resp_mis_b0.status_code == 200
            assert str(propuesta_id) not in [str(uid) for uid in resp_mis_b0.json()["propuestas_apoyadas"]]

            # 7. Sesión B vota -> apoyado=True, contador=2
            resp_vote_b = client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers_b)
            assert resp_vote_b.status_code == 200
            assert resp_vote_b.json()["apoyado"] is True
            assert resp_vote_b.json()["apoyos_contador"] == 2

            # 8. Sesión A vota de nuevo (toggle / unlike) -> apoyado=False, contador=1
            resp_vote2 = client.post(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers_a)
            assert resp_vote2.status_code == 200
            data2 = resp_vote2.json()
            assert data2["apoyado"] is False
            assert data2["apoyos_contador"] == 1

            # 9. Sesión A consulta /mis-apoyos -> ya no debe tener propuesta_id
            resp_mis_a2 = client.get("/api/v1/aportes/mis-apoyos", headers=headers_a)
            assert resp_mis_a2.status_code == 200
            assert str(propuesta_id) not in [str(uid) for uid in resp_mis_a2.json()["propuestas_apoyadas"]]

            # 10. Sesión B retira apoyo explícitamente vía DELETE /api/v1/aportes/{id}/apoyar -> contador=0
            resp_del_b = client.delete(f"/api/v1/aportes/{propuesta_id}/apoyar", headers=headers_b)
            assert resp_del_b.status_code == 200
            assert resp_del_b.json()["apoyos_contador"] == 0

        finally:
            # Limpiar registro creado
            async def limpiar():
                db = Database(settings)
                async with db.sessions() as s:
                    prop = await s.get(PropuestaCiudadana, propuesta_id)
                    if prop:
                        await s.delete(prop)
                        await s.commit()

            asyncio.run(limpiar())
