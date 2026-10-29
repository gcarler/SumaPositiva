"""CRUD jerárquico, referencias y atomicidad observados en PostgreSQL aislado."""

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from test_urls_formularios import consultar
from test_urls_formularios import contexto as contexto_base

from app.modules.politicas.repository import LineaRepository

contexto = contexto_base


def escribir(url, sql, parametros):
    async def ejecutar():
        engine = create_async_engine(url)
        try:
            async with engine.begin() as conn:
                await conn.execute(text(sql), parametros)
        finally:
            await engine.dispose()

    asyncio.run(ejecutar())


@pytest.fixture
def linea(contexto, database_url):
    client, headers = contexto
    dimensiones = client.get("/api/v1/politicas/dimensiones").json()
    fases = client.get("/api/v1/politicas/fases").json()
    codigo = "LE-" + str(uuid.uuid4().int)[:18]
    datos = {
        "fase_id": fases[0]["id"],
        "dimension_id": dimensiones[0]["id"],
        "codigo": codigo,
        "titulo": "Línea QA",
        "descripcion": "Solo en polis_test",
        "entidad_lider": "Secretaría de Planeación",
        "costo_estimado": "123456.78",
        "fuentes_financiacion": ["FONSET", "SGR"],
        "metadatos": {"otro": "conservar"},
        "sublineas": [
            {
                "codigo": codigo + ".1",
                "titulo": "Proyecto QA",
                "descripcion": "Intervención",
                "meta_cuatrienal": "100 hogares",
                "indicador_nombre": "Hogares atendidos",
                "actor_coresponsable": "DADIS",
            }
        ],
    }
    ids = []
    try:
        yield client, headers, datos, ids
    finally:
        for id in ids:
            escribir(
                database_url,
                "DELETE FROM motor_instrumentos.instrumentos WHERE linea_id=:id",
                {"id": uuid.UUID(id)},
            )
            escribir(
                database_url,
                "DELETE FROM motor_politicas.lineas_estrategicas WHERE id=:id",
                {"id": uuid.UUID(id)},
            )


def crear(linea):
    client, headers, datos, ids = linea
    resp = client.post("/api/v1/politicas/lineas", json=datos, headers=headers)
    assert resp.status_code == 201, resp.text
    ids.append(resp.json()["id"])
    return resp.json()


def test_crud_metadatos_y_persistencia(linea, database_url):
    item = crear(linea)
    client, headers, datos, _ = linea
    row = consultar(
        database_url,
        "SELECT metadatos, costo_estimado FROM motor_politicas.lineas_estrategicas WHERE id=:id",
        {"id": uuid.UUID(item["id"])},
    )[0]
    assert row["metadatos"]["sublineas"] == datos["sublineas"]
    assert str(row["costo_estimado"]) == "123456.78"
    escribir(
        database_url,
        "UPDATE motor_politicas.lineas_estrategicas SET orden=8, "
        "entidades_coresponsables=ARRAY['Entidad histórica'] WHERE id=:id",
        {"id": uuid.UUID(item["id"])},
    )
    datos = {**datos, "titulo": "Editada", "metadatos": {}, "activa": False}
    resp = client.put(f"/api/v1/politicas/lineas/{item['id']}", json=datos, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["metadatos"]["otro"] == "conservar"
    assert resp.json()["orden"] == 8
    assert resp.json()["entidades_coresponsables"] == ["Entidad histórica"]
    assert item["id"] in [
        elemento["id"] for elemento in client.get("/api/v1/politicas/lineas/gestion", headers=headers).json()
    ]
    assert item["id"] not in [elemento["id"] for elemento in client.get("/api/v1/politicas/lineas").json()]
    assert client.delete(f"/api/v1/politicas/lineas/{item['id']}", headers=headers).status_code == 200
    assert not consultar(
        database_url,
        "SELECT id FROM motor_politicas.lineas_estrategicas WHERE id=:id",
        {"id": uuid.UUID(item["id"])},
    )
    assert client.delete(f"/api/v1/politicas/lineas/{item['id']}", headers=headers).status_code == 404


@pytest.mark.parametrize(
    "defecto",
    [
        "dimension_null",
        "dimension_inexistente",
        "fase_inexistente",
        "titulo_vacio",
        "codigo_invalido",
        "hijo_ajeno",
        "hijo_duplicado",
        "costo_negativo",
        "costo_excesivo",
        "fuentes_vacias",
        "metadatos_sublineas",
    ],
)
def test_rechazo_sin_escritura(linea, database_url, defecto):
    client, headers, datos, _ = linea
    if defecto == "dimension_null":
        datos["dimension_id"] = None
    if defecto == "dimension_inexistente":
        datos["dimension_id"] = str(uuid.uuid4())
    if defecto == "fase_inexistente":
        datos["fase_id"] = str(uuid.uuid4())
    if defecto == "titulo_vacio":
        datos["titulo"] = "  "
    if defecto == "codigo_invalido":
        datos["codigo"] = "abc"
    if defecto == "hijo_ajeno":
        datos["sublineas"][0]["codigo"] = "LE-99.1"
    if defecto == "hijo_duplicado":
        datos["sublineas"].append(dict(datos["sublineas"][0]))
    if defecto == "costo_negativo":
        datos["costo_estimado"] = "-1"
    if defecto == "costo_excesivo":
        datos["costo_estimado"] = "10000000000000000"
    if defecto == "fuentes_vacias":
        datos["fuentes_financiacion"] = []
    if defecto == "metadatos_sublineas":
        datos["metadatos"]["sublineas"] = []
    assert client.post("/api/v1/politicas/lineas", json=datos, headers=headers).status_code == 422
    assert not consultar(
        database_url,
        "SELECT id FROM motor_politicas.lineas_estrategicas WHERE codigo=:codigo",
        {"codigo": datos["codigo"]},
    )


@pytest.mark.parametrize(
    "tabla,campo,sql",
    [
        (
            "motor_instrumentos.instrumentos",
            "linea_id",
            """
            INSERT INTO motor_instrumentos.instrumentos (linea_id, tipo_instrumento, nombre)
            VALUES (:id, 'MARCO_LOGICO', 'QA')
            """,
        ),
        (
            "participacion_ciudadana.propuestas_ciudadanas",
            "linea_id",
            """
            INSERT INTO participacion_ciudadana.propuestas_ciudadanas (linea_id, titulo,
            descripcion, tipo_aporte) VALUES (:id, 'QA', 'QA', 'propuesta')
            """,
        ),
        (
            "mesas_trabajo.mesas",
            "linea_id",
            """
            INSERT INTO mesas_trabajo.mesas (linea_id, ruta_jerarquica, tipo_mesa,
            codigo_oficial, shortcode_ciudadano, slug, nombre) VALUES (:id, 'qa',
            'PLENARIA', :codigo, :codigo, :codigo, 'QA')
            """,
        ),
        (
            "indicadores.fichas_tecnicas_indicadores",
            "linea_estrategica_id",
            """
            INSERT INTO indicadores.fichas_tecnicas_indicadores (linea_estrategica_id,
            codigo, nombre, tipo_indicador, definicion, metodo_calculo, unidad_medida,
            periodicidad, linea_base_valor, linea_base_anio, meta_cuatrienio, fuente_datos,
            responsable_reporte) VALUES (:id, :codigo, 'QA', 'producto', 'QA', 'QA',
            'unidad', 'anual', 0, 2026, 100, 'QA', 'QA')
            """,
        ),
        (
            "presupuesto.asignaciones_presupuestales",
            "linea_estrategica_id",
            """
            INSERT INTO presupuesto.asignaciones_presupuestales (linea_estrategica_id,
            fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion) SELECT
            :id, id, 100, 2026, 'QA' FROM presupuesto.fuentes_financiacion LIMIT 1
            """,
        ),
    ],
)
def test_bloqueo_registro_set_null(linea, database_url, tabla, campo, sql):
    item = crear(linea)
    client, headers, _, _ = linea
    parametros = {"id": uuid.UUID(item["id"]), "codigo": uuid.uuid4().hex}
    try:
        escribir(database_url, sql, parametros)
        assert consultar(database_url, f"SELECT {campo} FROM {tabla} WHERE {campo}=:id", parametros)
        assert client.delete(f"/api/v1/politicas/lineas/{item['id']}", headers=headers).status_code == 409
        assert consultar(database_url, f"SELECT {campo} FROM {tabla} WHERE {campo}=:id", parametros)
    finally:
        escribir(database_url, f"DELETE FROM {tabla} WHERE {campo}=:id", parametros)


@pytest.mark.parametrize("operacion", ["crear", "editar", "eliminar"])
def test_rollback_despues_flush(linea, database_url, monkeypatch, operacion):
    client, headers, datos, _ = linea
    item = crear(linea) if operacion != "crear" else None
    original = LineaRepository.eliminar if operacion == "eliminar" else LineaRepository.guardar

    async def fallar(self, objeto):
        await original(self, objeto)
        raise RuntimeError("Fallo QA después de flush")

    monkeypatch.setattr(LineaRepository, "eliminar" if operacion == "eliminar" else "guardar", fallar)
    with pytest.raises(RuntimeError, match="Fallo QA"):
        if operacion == "crear":
            client.post("/api/v1/politicas/lineas", json=datos, headers=headers)
        elif operacion == "editar":
            client.put(
                f"/api/v1/politicas/lineas/{item['id']}",
                json={**datos, "titulo": "Debe revertir"},
                headers=headers,
            )
        else:
            client.delete(f"/api/v1/politicas/lineas/{item['id']}", headers=headers)
    rows = consultar(
        database_url,
        "SELECT titulo FROM motor_politicas.lineas_estrategicas WHERE codigo=:codigo",
        {"codigo": datos["codigo"]},
    )
    assert not rows if operacion == "crear" else rows[0]["titulo"] == "Línea QA"


def test_codigos_concurrentes_unicos_por_fase(linea, database_url):
    client, headers, datos, ids = linea

    def enviar(_):
        return client.post("/api/v1/politicas/lineas", json=datos, headers=headers)

    with ThreadPoolExecutor(max_workers=2) as pool:
        resultados = list(pool.map(enviar, range(2)))
    ids.extend(r.json()["id"] for r in resultados if r.status_code == 201)
    assert sorted(r.status_code for r in resultados) == [201, 409]
    assert (
        len(
            consultar(
                database_url,
                "SELECT id FROM motor_politicas.lineas_estrategicas WHERE codigo=:codigo",
                {"codigo": datos["codigo"]},
            )
        )
        == 1
    )


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", "/lineas"),
        ("PUT", "/lineas/00000000-0000-0000-0000-000000000001"),
        ("DELETE", "/lineas/00000000-0000-0000-0000-000000000001"),
        ("GET", "/lineas/gestion"),
    ],
)
def test_permisos_reales(linea, method, path):
    client, headers, datos, _ = linea
    ruta = "/api/v1/politicas" + path
    assert client.request(method, ruta, json=datos if method in ("POST", "PUT") else None).status_code == 401
    anon = client.post("/api/v1/sesion/anonima").json()
    assert (
        client.request(
            method,
            ruta,
            json=datos if method in ("POST", "PUT") else None,
            headers={"Authorization": "Bearer " + anon["token_acceso"]},
        ).status_code
        == 403
    )


@pytest.mark.parametrize("caso", ["commit", "cancelacion"])
def test_rollback_fallo_commit_y_cancelacion(linea, database_url, monkeypatch, caso):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.modules.politicas.schemas import LineaEstrategicaUpdate
    from app.modules.politicas.service import LineaService

    item = crear(linea)
    datos = LineaEstrategicaUpdate.model_validate({**linea[2], "titulo": "Debe revertir"})
    if caso == "commit":

        async def fallar_commit(self):
            raise RuntimeError("Fallo QA commit")

        monkeypatch.setattr(AsyncSession, "commit", fallar_commit)
    else:
        original = LineaRepository.guardar

        async def cancelar(self, objeto):
            await original(self, objeto)
            raise asyncio.CancelledError()

        monkeypatch.setattr(LineaRepository, "guardar", cancelar)

    async def ejecutar():
        engine = create_async_engine(database_url)
        try:
            async with async_sessionmaker(engine, expire_on_commit=False)() as session:
                await LineaService(session).guardar(datos, uuid.UUID(item["id"]))
        finally:
            await engine.dispose()

    with pytest.raises(RuntimeError if caso == "commit" else asyncio.CancelledError):
        asyncio.run(ejecutar())
    assert (
        consultar(
            database_url,
            "SELECT titulo FROM motor_politicas.lineas_estrategicas WHERE id=:id",
            {"id": uuid.UUID(item["id"])},
        )[0]["titulo"]
        == "Línea QA"
    )


def test_auditor_real_solo_lectura(linea, database_url, provisionar_usuario_sync):
    client, _, datos, _ = linea
    correo = f"auditor-lineas-{uuid.uuid4().hex}@example.org"
    clave = "ClavePruebaLineas2026*"
    usuario = provisionar_usuario_sync(
        client,
        {
            "correo": correo,
            "contrasena": clave,
            "nombres": "Auditor",
            "apellidos": "QA",
            "codigo_rol": "auditor_forense",
        },
    )
    try:
        login = client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": clave})
        assert login.status_code == 200
        headers = {"Authorization": "Bearer " + login.json()["token_acceso"]}
        assert client.get("/api/v1/politicas/lineas/gestion", headers=headers).status_code == 200
        assert client.post("/api/v1/politicas/lineas", json=datos, headers=headers).status_code == 403
        id = str(uuid.uuid4())
        assert client.put(f"/api/v1/politicas/lineas/{id}", json=datos, headers=headers).status_code == 403
        assert client.delete(f"/api/v1/politicas/lineas/{id}", headers=headers).status_code == 403
    finally:
        escribir(
            database_url,
            "UPDATE autenticacion.usuarios SET activo=false WHERE id=:id",
            {"id": uuid.UUID(usuario.json()["id"])},
        )
