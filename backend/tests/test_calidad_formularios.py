"""QA del módulo: endpoints, CRUD real, concurrencia y conservación de respuestas."""

import asyncio
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from test_reporte_geoespacial import datos, foto
from test_urls_formularios import anonimo, consultar
from test_urls_formularios import contexto as contexto_base

contexto = contexto_base


@pytest.fixture
def reporte(contexto, database_url):
    client, admin = contexto
    doc = json.loads((Path(__file__).parents[1] / "alembic/data/0031_reporte_inseguridad.json").read_text())
    doc["titulo"] = "QA geoespacial " + uuid.uuid4().hex
    r = client.post("/api/v1/formularios/constructor", headers=admin, json=doc)
    assert r.status_code == 201, r.text
    form = r.json()
    try:
        yield client, admin, form
    finally:

        async def limpiar():
            engine = create_async_engine(database_url)
            try:
                async with engine.begin() as c:
                    await c.execute(
                        text("DELETE FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id"),
                        {"id": form["id"]},
                    )
                    await c.execute(
                        text("DELETE FROM participacion_ciudadana.formularios_consulta WHERE id=:id"),
                        {"id": form["id"]},
                    )
            finally:
                await engine.dispose()

        asyncio.run(limpiar())


def ruta(form):
    return "/api/v1/formularios/" + form["id"]


@pytest.mark.parametrize("dimension", range(1, 8))
def test_registro_y_analitica_por_dimension(reporte, database_url, dimension):
    client, admin, form = reporte
    p = datos([foto()])
    p["datos_respuesta"]["P1"] = f"d{dimension}"
    p["datos_respuesta"].pop("P2-D1")
    p["datos_respuesta"][f"P2-D{dimension}"] = f"d{dimension}-1"
    p["datos_respuesta"]["intrusa"] = "No se guarda"
    p["datos_respuesta"]["P2-OCULTA"] = "No se guarda"
    r = client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p)
    assert r.status_code == 201, r.text
    fila = consultar(
        database_url,
        "SELECT datos_respuesta FROM participacion_ciudadana.respuestas_formulario WHERE id=:id",
        {"id": r.json()["id"]},
    )[0]["datos_respuesta"]
    assert len(fila["P5"]["valor"]["fotos"]) == 1
    assert "intrusa" not in fila and "P2-OCULTA" not in fila
    a = client.get(ruta(form) + "/analitica", headers=admin)
    assert a.status_code == 200, a.text
    tab = a.json()["tabulacion_preguntas"]
    assert tab["P1"]["conteos"][f"d{dimension}"] == 1
    assert tab[f"P2-D{dimension}"]["porcentajes"][f"d{dimension}-1"] == 100.0
    assert tab["P3"]["conteos"]["frecuencia-1"] == 1
    assert tab["P5"]["total_puntos"] == tab["P5"]["total_fotos"] == 1
    assert "base64" not in a.text


@pytest.mark.parametrize(
    "campo,valor",
    [
        ("P1", "falsa"),
        ("P4", "x" * 501),
        ("P5", '{"type":"Point","coordinates":[-181,10]}'),
        ("P5", '{"type":"Point","coordinates":[true,10]}'),
        ("P5", '{"tipo":"ubicacion_geografica","valor":false}'),
    ],
)
def test_respuesta_invalida_no_deja_filas(reporte, database_url, campo, valor):
    client, _, form = reporte
    p = datos()
    p["datos_respuesta"][campo] = valor
    r = client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p)
    assert r.status_code == 422, r.text
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 0
    )


def test_crud_y_conservacion(reporte, database_url):
    client, admin, form = reporte
    slug = form["configuracion"]["slug"]
    token = anonimo(client)
    r = client.post(ruta(form) + "/respuestas", headers=token, json=datos())
    assert r.status_code == 201
    assert client.post(ruta(form) + "/respuestas", headers=token, json=datos()).status_code == 409
    editado = {**form, "titulo": "Nombre actualizado", "estado": "cerrado"}
    actualizado = client.put("/api/v1/formularios/constructor/" + form["id"], headers=admin, json=editado)
    assert actualizado.status_code == 200, actualizado.text
    assert actualizado.json()["configuracion"]["slug"] == slug
    cambiado = json.loads(json.dumps(editado))
    cambiado["preguntas"][0]["tipo"] = "texto_corto"
    assert client.put("/api/v1/formularios/constructor/" + form["id"], headers=admin, json=cambiado).status_code == 409
    assert client.delete(ruta(form), headers=admin).status_code == 409
    assert client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=datos()).status_code == 400
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 1
    )


def test_delete_sin_respuestas_y_404(reporte):
    client, admin, form = reporte
    assert client.delete(ruta(form), headers=admin).status_code == 200
    assert client.get("/api/v1/formularios/publicos/" + form["configuracion"]["slug"]).status_code == 404
    assert client.delete(ruta(form), headers=admin).status_code == 404


@pytest.mark.parametrize(
    "operacion",
    ["constructor", "publicos", "privado", "respuestas", "analitica", "editar", "borrar"],
)
def test_contrato_permisos_endpoint(reporte, operacion):
    client, admin, form = reporte
    slug = form["configuracion"]["slug"]
    rutas = {
        "constructor": ("GET", "/api/v1/formularios/constructor"),
        "publicos": ("GET", "/api/v1/formularios/publicos/" + slug),
        "privado": ("GET", "/api/v1/formularios/constructor/slug/" + slug),
        "respuestas": ("GET", ruta(form) + "/respuestas"),
        "analitica": ("GET", ruta(form) + "/analitica"),
        "editar": ("PUT", "/api/v1/formularios/constructor/" + form["id"]),
        "borrar": ("DELETE", ruta(form)),
    }
    metodo, url = rutas[operacion]
    kw = {"json": form} if metodo == "PUT" else {}
    sin = client.request(metodo, url, **kw)
    assert sin.status_code == (200 if operacion == "publicos" else 401), sin.text
    limitado = client.request(metodo, url, headers=anonimo(client), **kw)
    assert limitado.status_code == (200 if operacion == "publicos" else 403), limitado.text
    autorizado = client.request(metodo, url, headers=admin, **kw)
    assert autorizado.status_code == 200, autorizado.text


@pytest.mark.parametrize("mismo_sujeto", [False, True])
def test_dos_envios_simultaneos_sin_exceder_limite(reporte, database_url, mismo_sujeto):
    client, admin, form = reporte
    form["configuracion"]["limiteRespuestas"] = 1
    assert client.put("/api/v1/formularios/constructor/" + form["id"], headers=admin, json=form).status_code == 200
    primero = anonimo(client)
    cabeceras = [primero, primero if mismo_sujeto else anonimo(client)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        resultados = list(
            pool.map(
                lambda h: client.post(ruta(form) + "/respuestas", headers=h, json=datos()).status_code,
                cabeceras,
            )
        )
    assert sorted(resultados) == [201, 409]
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 1
    )


def test_enfoque_no_admite_objetos_que_rompen_analitica(reporte):
    client, _, form = reporte
    p = datos()
    p["datos_enfoque"] = {"etnia": ["no", "válido"]}
    assert client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p).status_code == 422


@pytest.mark.parametrize("caso", ["editar", "eliminar", "commit", "cancelar"])
def test_rollback_completo_despues_de_escritura(reporte, database_url, monkeypatch, caso):
    from fastapi import HTTPException
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from app.modules.formularios.repository import FormularioRepository
    from app.modules.formularios.schemas import RespuestaFormularioCrear
    from app.modules.formularios.service import FormularioService

    client, admin, form = reporte
    if caso in ("editar", "eliminar"):
        metodo = "guardar" if caso == "editar" else "eliminar"
        original = getattr(FormularioRepository, metodo)

        async def fallar(self, *args, **kw):
            await original(self, *args, **kw)
            raise HTTPException(503, "Fallo de QA después del flush")

        monkeypatch.setattr(FormularioRepository, metodo, fallar)
        if caso == "editar":
            r = client.put(
                "/api/v1/formularios/constructor/" + form["id"],
                headers=admin,
                json={**form, "titulo": "No debe persistir"},
            )
        else:
            r = client.delete(ruta(form), headers=admin)
        assert r.status_code == 503
        assert (
            consultar(
                database_url,
                "SELECT titulo FROM participacion_ciudadana.formularios_consulta WHERE id=:id",
                {"id": form["id"]},
            )[0]["titulo"]
            == form["titulo"]
        )
    elif caso == "commit":
        token = anonimo(client)
        original = AsyncSession.commit

        async def fallar_commit(self):
            if any(type(o).__name__ == "FormularioConsulta" for o in self.identity_map.values()):
                raise RuntimeError("Fallo de QA antes del commit")
            await original(self)

        monkeypatch.setattr(AsyncSession, "commit", fallar_commit)
        with pytest.raises(RuntimeError, match="antes del commit"):
            client.post(ruta(form) + "/respuestas", headers=token, json=datos())
    else:
        sujeto = client.post("/api/v1/sesion/anonima").json()["sesion_id"]
        original = FormularioRepository.guardar_respuesta

        async def cancelar(self, *args, **kw):
            await original(self, *args, **kw)
            raise asyncio.CancelledError("Cancelación de QA tras flush")

        monkeypatch.setattr(FormularioRepository, "guardar_respuesta", cancelar)

        async def enviar_cancelado():
            engine = create_async_engine(database_url)
            try:
                async with async_sessionmaker(engine, expire_on_commit=False)() as session:
                    with pytest.raises(asyncio.CancelledError):
                        await FormularioService(session).enviar_respuesta(
                            uuid.UUID(form["id"]),
                            uuid.UUID(sujeto),
                            RespuestaFormularioCrear(**datos()),
                            es_anonimo=True,
                        )
            finally:
                await engine.dispose()

        asyncio.run(enviar_cancelado())
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 0
    )


@pytest.mark.parametrize(
    "columna,valor",
    [
        ("estado", "'INVENTADO'"),
        ("esquema_preguntas", "'{}'::jsonb"),
        ("documento_constructor", "'[]'::jsonb"),
    ],
)
def test_restricciones_sql_conservan_formulario(reporte, database_url, columna, valor):
    from sqlalchemy.exc import IntegrityError

    _, _, form = reporte

    async def escribir():
        engine = create_async_engine(database_url)
        try:
            with pytest.raises(IntegrityError):
                async with engine.begin() as c:
                    await c.execute(
                        text(f"UPDATE participacion_ciudadana.formularios_consulta SET {columna}={valor} WHERE id=:id"),
                        {"id": form["id"]},
                    )
        finally:
            await engine.dispose()

    asyncio.run(escribir())
    assert (
        consultar(
            database_url,
            "SELECT titulo FROM participacion_ciudadana.formularios_consulta WHERE id=:id",
            {"id": form["id"]},
        )[0]["titulo"]
        == form["titulo"]
    )


def test_territorio_inexistente_es_422_y_no_duplicado(reporte, database_url):
    client, _, form = reporte
    p = datos()
    p["territorio_id"] = str(uuid.uuid4())
    r = client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p)
    assert r.status_code == 422, r.text
    assert "referencia" in r.text.lower()
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 0
    )


def test_porcentaje_condicional_no_usa_el_total_del_formulario(reporte):
    client, admin, form = reporte
    for d in (1, 2):
        p = datos()
        p["datos_respuesta"]["P1"] = f"d{d}"
        p["datos_respuesta"].pop("P2-D1")
        p["datos_respuesta"][f"P2-D{d}"] = f"d{d}-1"
        assert client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p).status_code == 201
    r = client.get(ruta(form) + "/analitica", headers=admin)
    assert r.status_code == 200
    assert r.json()["total_respuestas"] == 2
    t = r.json()["tabulacion_preguntas"]
    assert t["P1"]["porcentajes"]["d1"] == 50.0
    assert t["P2-D1"]["porcentajes"]["d1-1"] == 100.0


def test_edicion_permitida_conserva_id_y_conteo(reporte):
    client, admin, form = reporte
    form["configuracion"]["permitirEdicion"] = True
    assert client.put("/api/v1/formularios/constructor/" + form["id"], headers=admin, json=form).status_code == 200
    token = anonimo(client)
    primero = client.post(ruta(form) + "/respuestas", headers=token, json=datos())
    p = datos()
    p["datos_respuesta"]["P4"] = "Corrección ciudadana"
    segundo = client.post(ruta(form) + "/respuestas", headers=token, json=p)
    assert primero.status_code == segundo.status_code == 201
    assert primero.json()["id"] == segundo.json()["id"]
    filas = client.get(ruta(form) + "/respuestas", headers=admin).json()
    assert len(filas) == 1
    assert filas[0]["datos_respuesta"]["P4"] == "Corrección ciudadana"


@pytest.mark.parametrize(
    "columna,valor",
    [
        ("datos_respuesta", "'[]'::jsonb"),
        ("datos_enfoque", "'[]'::jsonb"),
        ("evidencias", "'{}'::jsonb"),
    ],
)
def test_sql_rechaza_respuesta_con_json_incompatible(reporte, database_url, columna, valor):
    from sqlalchemy.exc import IntegrityError

    _, _, form = reporte

    async def insertar():
        engine = create_async_engine(database_url)
        try:
            with pytest.raises(IntegrityError):
                async with engine.begin() as c:
                    await c.execute(
                        text(
                            f"INSERT INTO participacion_ciudadana.respuestas_formulario "
                            f"(formulario_id, sujeto_id, {columna}) "
                            f"VALUES (:id, :sujeto, {valor})"
                        ),
                        {"id": form["id"], "sujeto": uuid.uuid4()},
                    )
        finally:
            await engine.dispose()

    asyncio.run(insertar())


def test_funcion_uuid_y_claves_unicas(database_url):
    filas = consultar(database_url, "SELECT public.generar_uuid_v7() AS id FROM generate_series(1,100)")
    ids = [f["id"] for f in filas]
    assert len(set(ids)) == 100
    assert all(i.version == 7 for i in ids)
    funcion = consultar(
        database_url,
        "SELECT prosecdef FROM pg_proc WHERE oid='public.generar_uuid_v7()'::regprocedure",
    )
    assert funcion[0]["prosecdef"] is False
    restricciones = consultar(
        database_url,
        "SELECT conname FROM pg_constraint "
        "WHERE conrelid='participacion_ciudadana.respuestas_formulario'::regclass "
        "AND contype IN ('u','f')",
    )
    assert "uq_respuesta_formulario_sujeto" in {r["conname"] for r in restricciones}
    assert len(restricciones) >= 3


def test_sql_no_borra_reportes_en_cascada(reporte, database_url):
    from sqlalchemy.exc import IntegrityError

    client, _, form = reporte
    assert client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=datos()).status_code == 201

    async def borrar():
        engine = create_async_engine(database_url)
        try:
            with pytest.raises(IntegrityError):
                async with engine.begin() as c:
                    await c.execute(
                        text("DELETE FROM participacion_ciudadana.formularios_consulta WHERE id=:id"),
                        {"id": form["id"]},
                    )
        finally:
            await engine.dispose()

    asyncio.run(borrar())
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 1
    )


@pytest.mark.migration
def test_migraciones_preservan_registros_existentes(reporte, database_url):
    from alembic.config import Config

    from alembic import command

    client, _, form = reporte
    r = client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=datos([foto()]))
    assert r.status_code == 201
    sql = "SELECT id,datos_respuesta FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id"
    antes = consultar(database_url, sql, {"id": form["id"]})
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    command.downgrade(config, "0031_reporte_inseguridad")
    assert consultar(database_url, sql, {"id": form["id"]}) == antes
    command.upgrade(config, "head")
    command.check(config)
    assert consultar(database_url, sql, {"id": form["id"]}) == antes


@pytest.mark.parametrize("defecto", ["orden", "sin_opciones", "es_otro", "rango", "dimension", "localidad", "anonimo"])
def test_constructor_rechaza_contrato_inconsistente(reporte, database_url, defecto):
    client, admin, form = reporte
    doc = json.loads(json.dumps(form))
    if defecto == "orden":
        doc["preguntas"][1]["orden"] = doc["preguntas"][0]["orden"]
    elif defecto == "sin_opciones":
        doc["preguntas"][0]["opciones"] = []
    elif defecto == "es_otro":
        doc["preguntas"][0]["opciones"][0]["esOtro"] = "false"
    elif defecto == "rango":
        doc["preguntas"][9]["validacion"] = {"minLongitud": 5, "maxLongitud": 2}
    elif defecto == "dimension":
        doc["preguntas"][10]["dimensionOrigenId"] = "inexistente"
    elif defecto == "localidad":
        doc["preguntas"][10]["localidadDestinoId"] = "inexistente"
    else:
        doc["configuracion"]["requiereAutenticacion"] = True
    antes = consultar(
        database_url,
        "SELECT documento_constructor FROM participacion_ciudadana.formularios_consulta WHERE id=:id",
        {"id": form["id"]},
    )
    r = client.put("/api/v1/formularios/constructor/" + form["id"], headers=admin, json=doc)
    assert r.status_code == 422, r.text
    assert (
        consultar(
            database_url,
            "SELECT documento_constructor FROM participacion_ciudadana.formularios_consulta WHERE id=:id",
            {"id": form["id"]},
        )
        == antes
    )


def test_metadatos_autoritativos_no_se_toman_del_cliente(reporte, database_url):
    client, admin, form = reporte
    r = client.put(
        "/api/v1/formularios/constructor/" + form["id"],
        headers=admin,
        json={
            **form,
            "id": "falso",
            "idPersistido": "falso",
            "origenDatos": "demo",
            "respuestasCount": 999,
            "creadoEn": "inventado",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == form["id"]
    assert r.json()["origenDatos"] == "api"
    assert r.json()["respuestasCount"] == 0
    doc = consultar(
        database_url,
        "SELECT documento_constructor FROM participacion_ciudadana.formularios_consulta WHERE id=:id",
        {"id": form["id"]},
    )[0]["documento_constructor"]
    assert not {
        "id",
        "idPersistido",
        "origenDatos",
        "respuestasCount",
        "creadoEn",
        "actualizadoEn",
    }.intersection(doc)


def test_foto_superior_a_cinco_mb_no_se_registra(reporte, database_url):
    import base64

    client, _, form = reporte
    fotografia = "data:image/png;base64," + base64.b64encode(b"x" * (5 * 1024 * 1024 + 1)).decode()
    r = client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=datos([fotografia]))
    assert r.status_code == 422, r.text
    assert "5 MB" in r.text
    assert (
        consultar(
            database_url,
            "SELECT count(*) AS n FROM participacion_ciudadana.respuestas_formulario WHERE formulario_id=:id",
            {"id": form["id"]},
        )[0]["n"]
        == 0
    )


def test_contrato_geografico_estructurado_se_conserva(reporte, database_url):
    client, _, form = reporte
    p = datos()
    punto = {
        "tipo": "ubicacion_geografica",
        "valor": {"lat": 10.4234, "lng": -75.5512, "barrio": "Getsemaní", "fotos": [foto()]},
    }
    p["datos_respuesta"]["P5"] = punto
    r = client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p)
    assert r.status_code == 201, r.text
    fila = consultar(
        database_url,
        "SELECT datos_respuesta FROM participacion_ciudadana.respuestas_formulario WHERE id=:id",
        {"id": r.json()["id"]},
    )[0]["datos_respuesta"]
    assert fila["P5"] == punto


@pytest.mark.parametrize("campo,valor", [("estado", "INVENTADO"), ("titulo", "   "), ("codigo", "")])
def test_crud_legado_rechaza_estado_o_identidad_vacios(contexto, campo, valor):
    client, admin = contexto
    doc = {
        "codigo": "QA-" + uuid.uuid4().hex,
        "titulo": "Consulta válida",
        "descripcion": "QA",
        "esquema_preguntas": [{"id": "p", "texto": "Pregunta", "tipo": "texto_libre"}],
    }
    doc[campo] = valor
    assert client.post("/api/v1/formularios", headers=admin, json=doc).status_code == 422


def test_evidencias_no_pueden_eludir_limites_de_pregunta(reporte):
    client, _, form = reporte
    p = datos()
    p["evidencias"] = [{"foto": foto()}] * 6
    assert client.post(ruta(form) + "/respuestas", headers=anonimo(client), json=p).status_code == 422


@pytest.mark.parametrize("respuesta", ["6", False, "fuera_de_escala"])
def test_legado_valida_escala_no_solo_campo_obligatorio(contexto, respuesta):
    client, admin = contexto
    doc = {
        "codigo": "QA-" + uuid.uuid4().hex,
        "titulo": "Consulta escala",
        "descripcion": "QA",
        "esquema_preguntas": [{"id": "p", "texto": "Pregunta", "tipo": "escala_likert"}],
    }
    f = client.post("/api/v1/formularios", headers=admin, json=doc)
    assert f.status_code == 201
    try:
        assert (
            client.post(
                "/api/v1/formularios/" + f.json()["id"] + "/respuestas",
                headers=anonimo(client),
                json={"datos_respuesta": {"p": respuesta}},
            ).status_code
            == 422
        )
    finally:
        assert client.delete("/api/v1/formularios/" + f.json()["id"], headers=admin).status_code == 200
