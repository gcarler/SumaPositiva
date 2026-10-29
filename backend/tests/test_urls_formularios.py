"""URLs compartibles: persistencia real, estados públicos y rollback completo."""

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.formularios.repository import FormularioRepository


def consultar(url, sql, parametros=None):
    async def leer():
        engine = create_async_engine(url, hide_parameters=True)
        try:
            async with engine.connect() as c:
                return (await c.execute(text(sql), parametros or {})).mappings().all()
        finally:
            await engine.dispose()

    return asyncio.run(leer())


@pytest.fixture
def contexto(database_url, provisionar_usuario_sync):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings)) as client:
        correo = f"url-{uuid.uuid4().hex}@example.org"
        clave = "ClavePruebaFormulario2026*"
        creado = provisionar_usuario_sync(
            client,
            {
                "correo": correo,
                "contrasena": clave,
                "nombres": "Admin",
                "apellidos": "QA",
                "codigo_rol": "administrador_identidades",
            },
        )
        login = client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": clave})
        assert login.status_code == 200
        assert {"formularios:leer", "formularios:gestionar"} <= set(login.json()["permisos"])
        try:
            yield client, {"Authorization": "Bearer " + login.json()["token_acceso"]}
        finally:

            async def limpiar():
                engine = create_async_engine(database_url)
                try:
                    async with engine.begin() as c:
                        await c.execute(
                            text(
                                "UPDATE autenticacion.usuarios SET activo=false, rol_id="
                                "(SELECT id FROM autenticacion.roles WHERE codigo='ciudadano') "
                                "WHERE id=:id"
                            ),
                            {"id": uuid.UUID(creado.json()["id"])},
                        )
                finally:
                    await engine.dispose()

            asyncio.run(limpiar())


def documento(estado="activo"):
    return {
        "titulo": "Diagnóstico geográfico de prueba",
        "descripcion": "Solo QA",
        "estado": estado,
        "secciones": [],
        "preguntas": [
            {
                "id": "detalle",
                "tipo": "texto_corto",
                "texto": "Describe",
                "orden": 0,
                "obligatoria": True,
            },
            {
                "id": "punto",
                "tipo": "ubicacion_geografica",
                "texto": "Ubicación",
                "orden": 1,
                "obligatoria": True,
            },
        ],
        "configuracion": {},
    }


def anonimo(client):
    r = client.post("/api/v1/sesion/anonima")
    assert r.status_code == 201, r.text
    return {"Authorization": "Bearer " + r.json()["token_acceso"]}


def respuesta():
    return {
        "datos_respuesta": {
            "detalle": "Falta alumbrado",
            "punto": '{"type":"Point","coordinates":[-75.5144,10.391]}',
        }
    }


def test_creacion_publica_persistida_unica_y_estable(contexto, database_url):
    client, headers = contexto
    assert client.post("/api/v1/formularios/constructor", json=documento()).status_code == 401
    a = client.post("/api/v1/formularios/constructor", json=documento(), headers=headers)
    b = client.post("/api/v1/formularios/constructor", json=documento(), headers=headers)
    assert a.status_code == b.status_code == 201, a.text
    form, otro = a.json(), b.json()
    slug = form["configuracion"]["slug"]
    assert slug != otro["configuracion"]["slug"]
    assert slug.startswith("diagnostico-geografico-de-prueba-")
    assert client.get(f"/api/v1/formularios/publicos/{slug}").json()["id"] == form["id"]
    editado = {**form, "titulo": "Título cambiado"}
    r = client.put(f"/api/v1/formularios/constructor/{form['id']}", json=editado, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["configuracion"]["slug"] == slug
    persistido = consultar(
        database_url,
        "SELECT slug, documento_constructor FROM participacion_ciudadana.formularios_consulta WHERE id=:id",
        {"id": uuid.UUID(form["id"])},
    )
    assert persistido[0]["documento_constructor"]["titulo"] == "Título cambiado"
    assert client.get("/api/v1/formularios/publicos/no-existe").status_code == 404
    assert client.get("/api/v1/formularios/constructor").status_code == 401


def test_borrador_no_expuesto_publicacion_y_cierre(contexto):
    client, headers = contexto
    r = client.post("/api/v1/formularios/constructor", json=documento("borrador"), headers=headers)
    assert r.status_code == 201, r.text
    form = r.json()
    slug, id = form["configuracion"]["slug"], form["id"]
    publico = f"/api/v1/formularios/publicos/{slug}"
    assert client.get(publico).status_code == 403
    assert client.get(f"/api/v1/formularios/{id}").status_code == 403
    assert all(f["id"] != id for f in client.get("/api/v1/formularios/publicos").json())
    assert all(f["id"] != id for f in client.get("/api/v1/formularios").json())
    assert client.get(f"/api/v1/formularios/constructor/slug/{slug}", headers=headers).status_code == 200
    assert (
        client.post(f"/api/v1/formularios/{id}/respuestas", json=respuesta(), headers=anonimo(client)).status_code
        == 400
    )
    form["estado"] = "activo"
    assert client.put(f"/api/v1/formularios/constructor/{id}", json=form, headers=headers).status_code == 200
    assert client.get(publico).status_code == 200
    form["estado"] = "cerrado"
    assert client.put(f"/api/v1/formularios/constructor/{id}", json=form, headers=headers).status_code == 200
    assert (
        client.post(f"/api/v1/formularios/{id}/respuestas", json=respuesta(), headers=anonimo(client)).status_code
        == 400
    )


def test_respuesta_sin_login_validada_y_persistida(contexto, database_url):
    client, headers = contexto
    form = client.post("/api/v1/formularios/constructor", json=documento(), headers=headers).json()
    ruta = f"/api/v1/formularios/{form['id']}/respuestas"
    assert client.post(ruta, json=respuesta()).status_code == 401
    token = anonimo(client)
    invalida = respuesta()
    invalida["datos_respuesta"]["punto"] = '{"type":"Point","coordinates":[-75,99]}'
    assert client.post(ruta, json=invalida, headers=token).status_code == 422
    r = client.post(ruta, json=respuesta(), headers=token)
    assert r.status_code == 201, r.text
    assert client.post(ruta, json=respuesta(), headers=token).status_code == 409
    filas = consultar(
        database_url,
        "SELECT datos_respuesta FROM participacion_ciudadana.respuestas_formulario WHERE id=:id",
        {"id": uuid.UUID(r.json()["id"])},
    )
    assert filas[0]["datos_respuesta"] == respuesta()["datos_respuesta"]
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=headers).status_code == 200


def test_cupo_atomico_con_respuestas_concurrentes(contexto):
    client, headers = contexto
    doc = documento()
    doc["configuracion"] = {"limiteRespuestas": 1}
    form = client.post("/api/v1/formularios/constructor", json=doc, headers=headers).json()
    tokens = [anonimo(client), anonimo(client)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        estados = list(
            pool.map(
                lambda token: (
                    client.post(
                        f"/api/v1/formularios/{form['id']}/respuestas",
                        json=respuesta(),
                        headers=token,
                    ).status_code
                ),
                tokens,
            )
        )
    assert sorted(estados) == [201, 409]


def test_rollback_constructor_despues_escritura(contexto, database_url, monkeypatch):
    client, headers = contexto
    antes = consultar(database_url, "SELECT count(*) total FROM participacion_ciudadana.formularios_consulta")
    original = FormularioRepository.guardar

    async def fallar(self, form):
        await original(self, form)
        raise RuntimeError("Fallo posterior a escritura real")

    monkeypatch.setattr(FormularioRepository, "guardar", fallar)
    with pytest.raises(RuntimeError, match="Fallo posterior"):
        client.post("/api/v1/formularios/constructor", json=documento(), headers=headers)
    assert consultar(database_url, "SELECT count(*) total FROM participacion_ciudadana.formularios_consulta") == antes


def test_ocultas_y_saltos_excluyen_datos_y_obligatorias():
    from app.modules.formularios.constructor_validation import validar_respuestas

    doc = {
        "secciones": [{"id": "a", "orden": 0}, {"id": "b", "orden": 1}, {"id": "c", "orden": 2}],
        "preguntas": [
            {
                "id": "inicio",
                "texto": "Inicio",
                "tipo": "texto_corto",
                "orden": 0,
                "seccionId": "a",
            },
            {
                "id": "salto",
                "texto": "Salto",
                "tipo": "texto_corto",
                "orden": 1,
                "seccionId": "a",
                "logica": [
                    {
                        "accion": "ir_a_seccion",
                        "operador": "igual",
                        "preguntaOrigenId": "inicio",
                        "valor": "saltar",
                        "seccionDestinoId": "c",
                    }
                ],
            },
            {
                "id": "omitida",
                "texto": "Omitida",
                "tipo": "texto_corto",
                "orden": 2,
                "seccionId": "b",
                "obligatoria": True,
            },
            {
                "id": "oculta",
                "texto": "Oculta",
                "tipo": "texto_corto",
                "orden": 3,
                "seccionId": "c",
                "obligatoria": True,
                "logica": [
                    {
                        "accion": "mostrar",
                        "operador": "igual",
                        "preguntaOrigenId": "inicio",
                        "valor": "mostrar",
                    }
                ],
            },
            {
                "id": "final",
                "texto": "Final",
                "tipo": "texto_corto",
                "orden": 4,
                "seccionId": "c",
                "obligatoria": True,
            },
        ],
    }
    assert validar_respuestas(
        doc,
        {
            "inicio": "saltar",
            "final": "Visible",
            "oculta": "inyectado",
            "omitida": "inyectado",
            "intrusa": "inyectado",
        },
    ) == {"inicio": "saltar", "final": "Visible"}


@pytest.mark.parametrize(
    "tipo,config,valido,invalido",
    [
        ("numero", {"paso": 0.5, "validacion": {"minValor": 0}}, "1.5", "1.3"),
        ("likert", {"escalaMin": 1, "escalaMax": 5}, "3", "6"),
        ("escala_lineal", {"escalaMin": 0, "escalaMax": 10}, "8", "NaN"),
        ("fecha", {}, "2026-10-02", "20261002"),
        ("hora", {}, "23:59", "24:01"),
        ("texto_corto", {"validacion": {"patron": "^[A-Z]+$"}}, "POLIS", "123"),
        ("texto_largo", {"validacion": {"minLongitud": 2, "maxLongitud": 4}}, "abc", "a"),
        ("opcion_unica", {"opciones": [{"id": "a", "texto": "A"}]}, "a", "b"),
        ("lista_desplegable", {"opciones": [{"id": "a", "texto": "A"}]}, "a", "b"),
        ("opcion_multiple", {"opciones": [{"id": "a", "texto": "A"}]}, ["a"], ["a", "a"]),
        (
            "carga_archivo",
            {"tiposArchivo": "pdf"},
            '{"nombre":"a.pdf","tipo":"application/pdf","bytes":3,"contenido":"data:application/pdf;base64,YWJj"}',
            '{"nombre":"a.pdf","tipo":"application/pdf","bytes":4,"contenido":"data:application/pdf;base64,YWJj"}',
        ),
    ],
)
def test_validaciones_servidor(tipo, config, valido, invalido):
    from fastapi import HTTPException

    from app.modules.formularios.constructor_validation import validar_respuestas

    doc = {
        "secciones": [],
        "preguntas": [
            {
                "id": "p",
                "texto": "Pregunta",
                "orden": 0,
                "tipo": tipo,
                "obligatoria": True,
                **config,
            }
        ],
    }
    assert validar_respuestas(doc, {"p": valido}) == {"p": valido}
    with pytest.raises(HTTPException) as e:
        validar_respuestas(doc, {"p": invalido})
    assert e.value.status_code == 422


def test_respuesta_rollback_tras_flush(contexto, database_url, monkeypatch):
    client, headers = contexto
    form = client.post("/api/v1/formularios/constructor", json=documento(), headers=headers).json()
    original = FormularioRepository.guardar_respuesta

    async def fallo(self, datos):
        await original(self, datos)
        raise RuntimeError("Fallo después del flush de respuesta")

    monkeypatch.setattr(FormularioRepository, "guardar_respuesta", fallo)
    with pytest.raises(RuntimeError, match="después del flush"):
        client.post(
            f"/api/v1/formularios/{form['id']}/respuestas",
            headers=anonimo(client),
            json=respuesta(),
        )
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS total FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": uuid.UUID(form["id"])},
        )[0]["total"]
        == 0
    )


def test_sesion_sin_permiso_no_gestiona_formularios(contexto):
    client, _ = contexto
    headers = anonimo(client)
    assert client.get("/api/v1/formularios/constructor", headers=headers).status_code == 403
    assert client.post("/api/v1/formularios/constructor", json=documento(), headers=headers).status_code == 403
