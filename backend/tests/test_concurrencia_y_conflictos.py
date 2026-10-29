import asyncio
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.database import Database
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture
async def async_client(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    database = Database(settings)
    app.state.database = database
    app.state.settings = settings
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers=cabeceras_gestion,
    ) as client:
        yield client
    await database.engine.dispose()


async def crear_instrumento_y_nodo(client: AsyncClient, test_id: str):
    # 1. Crear Instrumento
    resp_inst = await client.post(
        "/api/v1/instrumentos",
        json={"tipo_instrumento": "ARBOL_PROBLEMAS", "nombre": f"Inst de Concurrencia {test_id}"},
    )
    assert resp_inst.status_code == 201
    inst_id = resp_inst.json()["id"]

    # 2. Agregar un nodo
    resp_nodo = await client.post(
        f"/api/v1/instrumentos/{inst_id}/nodos",
        json={"tipo_nodo": "PROBLEMA_CENTRAL", "contenido": "Problema Inicial"},
    )
    assert resp_nodo.status_code == 201
    return inst_id, resp_nodo.json()


async def test_control_concurrencia_optimista_etag_y_version(async_client: AsyncClient):
    test_id = uuid.uuid4().hex[:6]
    inst_id, nodo = await crear_instrumento_y_nodo(async_client, test_id)
    nodo_id = nodo["id"]
    version_actual = nodo["version_seq"]
    assert version_actual == 1

    # 1. Actualización exitosa con If-Match
    resp1 = await async_client.put(
        f"/api/v1/instrumentos/{inst_id}/nodos/{nodo_id}",
        json={"contenido": "Problema Actualizado 1"},
        headers={"If-Match": f'"{version_actual}"'},
    )
    assert resp1.status_code == 200
    nueva_version = resp1.json()["version_seq"]
    assert nueva_version == version_actual + 1
    assert resp1.headers.get("ETag") == f'"{nueva_version}"'

    # 2. Rechazo por If-Match desactualizado (Precondition Failed 412)
    resp_falla_etag = await async_client.put(
        f"/api/v1/instrumentos/{inst_id}/nodos/{nodo_id}",
        json={"contenido": "Intento con ETag viejo"},
        headers={"If-Match": f'"{version_actual}"'},
    )
    assert resp_falla_etag.status_code == 412

    # 3. Actualización exitosa con version_esperada en body
    resp2 = await async_client.put(
        f"/api/v1/instrumentos/{inst_id}/nodos/{nodo_id}",
        json={"contenido": "Problema Actualizado 2", "version_esperada": nueva_version},
    )
    assert resp2.status_code == 200
    nueva_version_2 = resp2.json()["version_seq"]
    assert nueva_version_2 == nueva_version + 1

    # 4. Rechazo por version_esperada desactualizada (Conflict 409)
    resp_falla_version = await async_client.put(
        f"/api/v1/instrumentos/{inst_id}/nodos/{nodo_id}",
        json={"contenido": "Intento con versión vieja", "version_esperada": nueva_version},
    )
    assert resp_falla_version.status_code == 409

    # 5. Conciliación: cliente lee última versión y reintenta con éxito
    resp_get = await async_client.get(f"/api/v1/instrumentos/{inst_id}/arbol")
    assert resp_get.status_code == 200
    central = resp_get.json()["nodo_central"]
    assert central["version_seq"] == nueva_version_2

    resp_conciliado = await async_client.put(
        f"/api/v1/instrumentos/{inst_id}/nodos/{nodo_id}",
        json={
            "contenido": "Problema Conciliado Exitosamente",
            "version_esperada": central["version_seq"],
        },
    )
    assert resp_conciliado.status_code == 200
    assert resp_conciliado.json()["version_seq"] == nueva_version_2 + 1


async def test_concurrencia_simultanea_multisesion(async_client: AsyncClient):
    test_id = uuid.uuid4().hex[:6]
    inst_id, nodo = await crear_instrumento_y_nodo(async_client, test_id)
    nodo_id = nodo["id"]
    version_base = nodo["version_seq"]

    # Simular 5 peticiones concurrentes desde sesiones distintas intentando actualizar la misma
    # versión
    async def peticion_actualizacion(worker_id: int):
        return await async_client.put(
            f"/api/v1/instrumentos/{inst_id}/nodos/{nodo_id}",
            json={
                "contenido": f"Edición simultánea por sesión {worker_id}",
                "version_esperada": version_base,
            },
        )

    # Lanzar 5 peticiones verdaderamente simultáneas con asyncio.gather
    respuestas = await asyncio.gather(*(peticion_actualizacion(i) for i in range(5)))

    status_codes = [r.status_code for r in respuestas]

    # Exactamente UNA petición debe ganar (200 OK) y las 4 restantes deben fallar con 409 Conflict
    assert status_codes.count(200) == 1, f"Se esperaba exactamente un 200, se obtuvo: {status_codes}"
    assert status_codes.count(409) == 4, f"Se esperaban 4 conflictos 409, se obtuvo: {status_codes}"

    # Verificar que en base de datos la versión subió a version_base + 1
    resp_arbol = await async_client.get(f"/api/v1/instrumentos/{inst_id}/arbol")
    assert resp_arbol.status_code == 200
    nodo_final = resp_arbol.json()["nodo_central"]
    assert nodo_final["version_seq"] == version_base + 1
