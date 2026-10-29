"""Proyección pública de JSON legado sin modificar sus originales privados."""

import asyncio
import json
import uuid
from contextvars import ContextVar
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.main import create_app
from app.modules.aportes.schemas import MetadataEnfoqueDiferencial, PropuestaCiudadanaRead

CONTACTO = "privado-legado215@example.org"
TELEFONO = "+573005552150"
JUSTIFICACION = "Decisión legada sintética con motivación institucional que debe conservarse exactamente."
CAMPOS_TEXTO = (
    "etnia",
    "genero",
    "ciclo_vital",
    "hecho_victimizante",
    "tipo_discapacidad",
    "organizacion_social",
)
CAMPOS_BANDERA = ("es_victima_conflicto", "situacion_discapacidad", "poblacion_campesina", "persona_cuidadora")
_ESQUEMA_AUDITORIA = ContextVar("auditoria_legado", default="auditoria")


async def forma_auditoria(connection, tabla):
    """Comparar columnas, constraints y triggers reales, incluidos FK e inmutabilidad."""
    consultas = (
        """SELECT a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,
                  pg_get_expr(d.adbin,d.adrelid)
           FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
           WHERE a.attrelid=to_regclass(:tabla) AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum""",
        """SELECT contype,pg_get_constraintdef(oid) FROM pg_constraint
           WHERE conrelid=to_regclass(:tabla) ORDER BY contype,pg_get_constraintdef(oid)""",
        """SELECT tgname,tgtype,tgenabled,tgfoid FROM pg_trigger
           WHERE tgrelid=to_regclass(:tabla) AND NOT tgisinternal ORDER BY tgname""",
    )
    return [list(await connection.execute(text(sql), {"tabla": tabla})) for sql in consultas]


@pytest.fixture
def esquema_auditoria_legado(database_url):
    """Auditoría inmutable privada por caso; nunca borrar registros institucionales."""
    assert (make_url(database_url).database or "").startswith("polis_test")
    esquema = "test_legado_aportes_" + uuid.uuid4().hex
    tabla = esquema + ".registros_auditoria"

    async def configurar():
        engine = create_async_engine(database_url, poolclass=NullPool, hide_parameters=True)
        try:
            async with engine.begin() as connection:
                originales = list(
                    (
                        await connection.execute(
                            text("SELECT to_jsonb(a) FROM auditoria.registros_auditoria a ORDER BY id")
                        )
                    ).scalars()
                )
                await connection.execute(text(f"CREATE SCHEMA {esquema}"))
                await connection.execute(
                    text(f"CREATE TABLE {tabla} (LIKE auditoria.registros_auditoria INCLUDING ALL)")
                )
                referencias = await connection.execute(
                    text("""SELECT conname,pg_get_constraintdef(oid) AS definicion FROM pg_constraint
                         WHERE conrelid='auditoria.registros_auditoria'::regclass AND contype='f'""")
                )
                for nombre, definicion in referencias:
                    await connection.execute(text(f'ALTER TABLE {tabla} ADD CONSTRAINT "{nombre}" {definicion}'))
                triggers = list(
                    (
                        await connection.execute(
                            text("""SELECT pg_get_triggerdef(oid) FROM pg_trigger
                         WHERE tgrelid='auditoria.registros_auditoria'::regclass AND NOT tgisinternal""")
                        )
                    ).scalars()
                )
                assert triggers
                for definicion in triggers:
                    assert " ON auditoria.registros_auditoria " in definicion
                    await connection.execute(
                        text(definicion.replace(" ON auditoria.registros_auditoria ", f" ON {tabla} "))
                    )
                assert await forma_auditoria(connection, tabla) == await forma_auditoria(
                    connection, "auditoria.registros_auditoria"
                )
                return originales
        finally:
            await engine.dispose()

    async def retirar(originales):
        engine = create_async_engine(database_url, poolclass=NullPool, hide_parameters=True)
        try:
            async with engine.begin() as connection:
                # RESTRICT: solo esta tabla y este esquema UUID, sin CASCADE ni cambios de triggers.
                await connection.execute(text(f"DROP TABLE {tabla}"))
                await connection.execute(text(f"DROP SCHEMA {esquema}"))
                presentes = list(
                    (
                        await connection.execute(
                            text("SELECT to_jsonb(a) FROM auditoria.registros_auditoria a ORDER BY id")
                        )
                    ).scalars()
                )
            assert presentes == originales
        finally:
            await engine.dispose()

    originales = asyncio.run(configurar())
    token = _ESQUEMA_AUDITORIA.set(esquema)
    try:
        yield esquema
    finally:
        _ESQUEMA_AUDITORIA.reset(token)
        asyncio.run(retirar(originales))


@pytest.fixture
def cliente_legado(database_url, esquema_auditoria_legado):
    settings = Settings(_env_file=None, database_url=database_url, environment="test", smtp_host="")
    with TestClient(create_app(settings), raise_server_exceptions=False) as client:
        client.app.state.database.engine.update_execution_options(
            schema_translate_map={"auditoria": esquema_auditoria_legado}
        )
        yield client


def consulta(database_url, sentencia, parametros=None, *, escritura=False):
    """Cada observación usa otra conexión física, ajena al pool de la aplicación."""

    sentencia = sentencia.replace("auditoria.registros_auditoria", _ESQUEMA_AUDITORIA.get() + ".registros_auditoria")

    async def ejecutar():
        engine = create_async_engine(database_url, poolclass=NullPool, hide_parameters=True)
        try:
            async with engine.begin() as connection:
                pid = await connection.scalar(text("SELECT pg_backend_pid()"))
                resultado = await connection.execute(text(sentencia), parametros or {})
                filas = [dict(fila) for fila in resultado.mappings()] if resultado.returns_rows else []
                assert escritura or sentencia.lstrip().upper().startswith("SELECT")
                return pid, filas
        finally:
            await engine.dispose()

    return asyncio.run(ejecutar())


def snapshot(database_url, aporte_id):
    pid, filas = consulta(
        database_url,
        """
        SELECT to_jsonb(p) AS aporte,
            (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.creado_en,a.id),'[]'::jsonb)
             FROM auditoria.registros_auditoria AS a WHERE a.registro_id=p.id) AS auditoria
        FROM participacion_ciudadana.propuestas_ciudadanas AS p WHERE p.id=CAST(:id AS uuid)
        """,
        {"id": aporte_id},
    )
    assert len(filas) == 1
    return pid, filas[0]


def crear_aporte(client):
    sesion = client.post("/api/v1/sesion/anonima")
    assert sesion.status_code == 201
    headers = {"Authorization": "Bearer " + sesion.json()["token_acceso"]}
    lineas = client.get("/api/v1/politicas/lineas")
    assert lineas.status_code == 200 and lineas.json()
    titulo = "Legado215 " + uuid.uuid4().hex
    respuesta = client.post(
        "/api/v1/aportes",
        headers=headers,
        json={
            "linea_id": lineas.json()[0]["id"],
            "titulo": titulo,
            "descripcion": "Fixture sintética de lectura pública de JSON legado",
            "correo_contacto": CONTACTO,
        },
    )
    assert respuesta.status_code == 201
    return respuesta.json()["id"], titulo, headers


def sembrar_enfoque(database_url, aporte_id, enfoque, metadatos=None, adjuntos=None):
    return consulta(
        database_url,
        """
        UPDATE participacion_ciudadana.propuestas_ciudadanas
        SET metadata_enfoque=CAST(:enfoque AS jsonb), metadatos=CAST(:metadatos AS jsonb),
            archivos_adjuntos=CAST(:adjuntos AS jsonb)
        WHERE id=CAST(:id AS uuid)
        """,
        {
            "id": aporte_id,
            "enfoque": json.dumps(enfoque),
            "metadatos": json.dumps(metadatos),
            "adjuntos": json.dumps(adjuntos),
        },
        escritura=True,
    )[0]


def sembrar_devolucion(database_url, aporte_id, metadatos, *, accion="DEVOLUCION_MOTIVADA", tabla=None):
    audit_id = str(uuid.uuid4())
    consulta(
        database_url,
        """
        INSERT INTO auditoria.registros_auditoria
            (id,tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos)
        VALUES (CAST(:id AS uuid),:tabla,CAST(:aporte AS uuid),:accion,'tecnica',:justificacion,CAST(:m AS jsonb))
        """,
        {
            "id": audit_id,
            "tabla": tabla or "participacion_ciudadana.propuestas_ciudadanas",
            "aporte": aporte_id,
            "accion": accion,
            "justificacion": JUSTIFICACION,
            "m": json.dumps(metadatos),
        },
        escritura=True,
    )
    return audit_id


def sin_privados(respuesta):
    assert CONTACTO not in respuesta.text and TELEFONO not in respuesta.text
    for clave in ("correo_contacto", "huella_hash", "sesion_id", "contacto_abierto", "destinos_privados"):
        assert clave not in respuesta.text


@pytest.mark.parametrize(
    "legado",
    [{"etnia": True}, {"es_victima_conflicto": "texto_heredado"}, {"es_victima_conflicto": None}],
    ids=["etnia_bool", "bandera_texto", "bandera_null"],
)
def test_errores203_enfoque_no_interrumpe_detalle_ni_lista(database_url, cliente_legado, legado):
    aporte_id, titulo, _ = crear_aporte(cliente_legado)
    escritor = sembrar_enfoque(database_url, aporte_id, legado)
    lector, antes = snapshot(database_url, aporte_id)
    detalle = cliente_legado.get(f"/api/v1/aportes/{aporte_id}")
    listado = cliente_legado.get("/api/v1/aportes", params={"busqueda": titulo})
    posterior, despues = snapshot(database_url, aporte_id)
    assert escritor != lector != posterior and antes == despues
    assert detalle.status_code == listado.status_code == 200
    assert listado.json()["total"] == 1 and listado.json()["elementos"] == [detalle.json()]
    assert detalle.json()["metadata_enfoque"] == MetadataEnfoqueDiferencial().model_dump()
    sin_privados(detalle)
    sin_privados(listado)


@pytest.mark.parametrize("legado", [None, False, ["legado"]], ids=["json_null", "json_false", "json_lista"])
def test_errores203_historial_preserva_decision_con_raiz_irregular(database_url, cliente_legado, legado):
    aporte_id, _, _ = crear_aporte(cliente_legado)
    audit_id = sembrar_devolucion(database_url, aporte_id, legado)
    lector, antes = snapshot(database_url, aporte_id)
    respuesta = cliente_legado.get(f"/api/v1/aportes/{aporte_id}/devolucion-razon")
    posterior, despues = snapshot(database_url, aporte_id)
    assert lector != posterior and antes == despues
    assert respuesta.status_code == 200
    assert len(respuesta.json()) == 1
    original = antes["auditoria"][0]
    esperado = {clave: valor for clave, valor in original.items() if clave not in {"metadatos", "creado_en"}}
    esperado["metadatos"] = {}
    leido = respuesta.json()[0]
    assert {clave: valor for clave, valor in leido.items() if clave != "creado_en"} == esperado
    assert datetime.fromisoformat(leido["creado_en"]) == datetime.fromisoformat(original["creado_en"])
    assert original["id"] == audit_id and original["metadatos"] == legado
    sin_privados(respuesta)


@pytest.mark.parametrize("campo", CAMPOS_TEXTO)
@pytest.mark.parametrize("valor", [True, False, 0, 1, 1.5, [], {}, ["texto"]])
def test_texto_publico_no_coacciona_tipos(campo, valor):
    datos = {campo: valor}
    proyectado = PropuestaCiudadanaRead.enfoque_publico(datos)
    assert campo not in proyectado
    assert getattr(MetadataEnfoqueDiferencial.model_validate(proyectado), campo) is None
    assert datos == {campo: valor}


@pytest.mark.parametrize("campo", CAMPOS_BANDERA)
@pytest.mark.parametrize("valor", [None, 0, 1, 0.0, 1.0, "true", "false", "1", "texto_heredado", [], {}, [True]])
def test_bandera_publica_no_infiere_desde_tipos_heredados(campo, valor):
    datos = {campo: valor}
    proyectado = PropuestaCiudadanaRead.enfoque_publico(datos)
    assert campo not in proyectado
    # False es el default técnico previo del contrato; no una interpretación del valor inválido.
    assert getattr(MetadataEnfoqueDiferencial.model_validate(proyectado), campo) is False
    assert datos == {campo: valor}


@pytest.mark.parametrize("campo", CAMPOS_TEXTO)
@pytest.mark.parametrize("valor", [None, "indigena", "texto válido"])
def test_texto_declarado_valido_se_conserva(campo, valor):
    assert PropuestaCiudadanaRead.enfoque_publico({campo: valor}) == {campo: valor}


@pytest.mark.parametrize("campo", CAMPOS_BANDERA)
@pytest.mark.parametrize("valor", [False, True])
def test_bandera_booleana_declarada_se_conserva(campo, valor):
    assert PropuestaCiudadanaRead.enfoque_publico({campo: valor}) == {campo: valor}


def test_proyeccion_aplica_limite_real_sin_truncar_y_cierra_campos_abiertos():
    limite = "á" * 250
    assert PropuestaCiudadanaRead.enfoque_publico({"organizacion_social": limite}) == {"organizacion_social": limite}
    assert PropuestaCiudadanaRead.enfoque_publico({"organizacion_social": limite + "á"}) == {}
    datos = {campo: CONTACTO if i % 2 else TELEFONO for i, campo in enumerate(CAMPOS_TEXTO)}
    datos.update(datos_adicionales={"correo_contacto": CONTACTO}, contacto_abierto=TELEFONO)
    assert PropuestaCiudadanaRead.enfoque_publico(datos) == {}
    assert PropuestaCiudadanaRead.enfoque_publico(MetadataEnfoqueDiferencial(etnia="indigena"))["etnia"] == "indigena"


RAICES = [None, False, True, 0, 1.5, "texto_heredado", [], [None, {"contacto_abierto": CONTACTO}]]
ENFOQUES_COMPLEJOS = [
    {
        "etnia": {"contacto_abierto": CONTACTO},
        "genero": [TELEFONO],
        "ciclo_vital": False,
        "es_victima_conflicto": "true",
        "situacion_discapacidad": 1,
        "poblacion_campesina": None,
        "persona_cuidadora": [],
        "hecho_victimizante": 1.5,
        "tipo_discapacidad": {},
        "organizacion_social": "a" * 251,
        "datos_adicionales": {"destinos_privados": [CONTACTO, TELEFONO]},
        "contacto_abierto": CONTACTO,
    },
    {
        "etnia": "indigena",
        "genero": "mujer",
        "es_victima_conflicto": True,
        "persona_cuidadora": False,
        "organizacion_social": "a" * 250,
        "datos_adicionales": {"contacto_abierto": CONTACTO},
    },
]


@pytest.mark.parametrize("legado", RAICES + ENFOQUES_COMPLEJOS)
def test_lectura_y_gestion_legada_conservan_json_y_permisos(database_url, cliente_legado, cabeceras_gestion, legado):
    aporte_id, titulo, anonimo = crear_aporte(cliente_legado)
    sembrar_enfoque(database_url, aporte_id, legado, legado, legado)
    lector, antes = snapshot(database_url, aporte_id)
    detalle = cliente_legado.get(f"/api/v1/aportes/{aporte_id}")
    listado = cliente_legado.get("/api/v1/aportes", params={"busqueda": titulo})
    posterior, despues = snapshot(database_url, aporte_id)
    assert lector != posterior and antes == despues
    for respuesta in (detalle, listado):
        assert respuesta.status_code == 200
        sin_privados(respuesta)
    assert listado.json()["elementos"] == [detalle.json()]
    path = f"/api/v1/aportes/{aporte_id}"
    cambio = {"titulo": titulo + " editado"}
    assert cliente_legado.patch(path, json=cambio).status_code == 401
    assert cliente_legado.patch(path, json=cambio, headers=anonimo).status_code == 403
    editado = cliente_legado.patch(path, json=cambio, headers=cabeceras_gestion)
    assert editado.status_code == 200 and editado.json()["titulo"] == cambio["titulo"]
    assert editado.json()["metadata_enfoque"] == detalle.json()["metadata_enfoque"]
    sin_privados(editado)
    _, persistido = snapshot(database_url, aporte_id)
    for campo in ("metadata_enfoque", "metadatos", "archivos_adjuntos", "correo_contacto", "huella_hash", "sesion_id"):
        assert persistido["aporte"][campo] == antes["aporte"][campo]
    assert persistido["aporte"]["titulo"] == cambio["titulo"]
    body = {
        "causal": "tecnica",
        "justificacion_motivada": JUSTIFICACION,
        "metadatos": {"canal": "web", "contacto_abierto": {"destinos_privados": [CONTACTO, TELEFONO]}},
    }
    assert cliente_legado.post(path + "/devolucion-razon", json=body).status_code == 401
    assert cliente_legado.post(path + "/devolucion-razon", json=body, headers=anonimo).status_code == 403
    devolucion = cliente_legado.post(path + "/devolucion-razon", json=body, headers=cabeceras_gestion)
    assert devolucion.status_code == 201
    assert devolucion.json()["metadatos"] == {"canal": "web"}
    sin_privados(devolucion)
    _, final = snapshot(database_url, aporte_id)
    assert final["aporte"]["metadata_enfoque"] == legado
    assert final["auditoria"][0]["metadatos"] == body["metadatos"]
    historia = cliente_legado.get(path + "/devolucion-razon")
    assert historia.status_code == 200 and historia.json() == [devolucion.json()]
    _, postlectura = snapshot(database_url, aporte_id)
    assert final == postlectura


@pytest.mark.parametrize(
    "legado",
    RAICES
    + [
        {"canal": {"contacto_abierto": CONTACTO}, "tipo_mensaje": [TELEFONO], "destinos_privados": CONTACTO},
        {"canal": "mesa", "tipo_mensaje": "audio", "destinos_privados": [CONTACTO, TELEFONO]},
    ],
)
def test_historial_raices_heterogeneas_no_omite_decisiones_ni_amplia_filtro(database_url, cliente_legado, legado):
    aporte_id, _, _ = crear_aporte(cliente_legado)
    visible = sembrar_devolucion(database_url, aporte_id, legado)
    sembrar_devolucion(database_url, aporte_id, {"destinos_privados": CONTACTO}, accion="EVENTO_PRIVADO_215")
    sembrar_devolucion(database_url, aporte_id, {"destinos_privados": CONTACTO}, tabla="otra_tabla_215")
    lector, antes = snapshot(database_url, aporte_id)
    respuesta = cliente_legado.get(f"/api/v1/aportes/{aporte_id}/devolucion-razon")
    posterior, despues = snapshot(database_url, aporte_id)
    assert lector != posterior and antes == despues
    assert respuesta.status_code == 200 and len(respuesta.json()) == 1
    original = next(fila for fila in antes["auditoria"] if fila["id"] == visible)
    for campo in ("id", "tabla_afectada", "registro_id", "accion", "usuario_id", "causal", "justificacion_motivada"):
        assert respuesta.json()[0][campo] == original[campo]
    assert datetime.fromisoformat(respuesta.json()[0]["creado_en"]) == datetime.fromisoformat(original["creado_en"])
    esperado = (
        {"canal": "mesa", "tipo_mensaje": "audio"} if isinstance(legado, dict) and legado.get("canal") == "mesa" else {}
    )
    assert respuesta.json()[0]["metadatos"] == esperado
    sin_privados(respuesta)


def test_alta_y_historial_validan_la_proyeccion_antes_del_dto(
    database_url, cliente_legado, cabeceras_gestion, monkeypatch
):
    from app.modules.auditoria.schemas import DevolucionRazonRespuesta

    aporte_id, _, _ = crear_aporte(cliente_legado)
    validar = DevolucionRazonRespuesta.model_validate
    observados = []

    def validar_proyeccion(cls, value, **kwargs):
        assert value.id is not None
        assert value.registro_id == uuid.UUID(aporte_id)
        assert value.causal == "tecnica" and value.justificacion_motivada == JUSTIFICACION
        assert value.metadatos == {"canal": "web"}
        observados.append(value.id)
        return validar(value, **kwargs)

    monkeypatch.setattr(DevolucionRazonRespuesta, "model_validate", classmethod(validar_proyeccion))
    body = {
        "causal": "tecnica",
        "justificacion_motivada": JUSTIFICACION,
        "metadatos": {"canal": "web", "contacto_abierto": CONTACTO},
    }
    path = f"/api/v1/aportes/{aporte_id}/devolucion-razon"
    creada = cliente_legado.post(path, json=body, headers=cabeceras_gestion)
    assert creada.status_code == 201
    _, antes = snapshot(database_url, aporte_id)
    assert antes["auditoria"][0]["metadatos"] == body["metadatos"]
    historia = cliente_legado.get(path)
    assert historia.status_code == 200 and historia.json() == [creada.json()]
    assert observados == [uuid.UUID(creada.json()["id"])] * 2
    _, despues = snapshot(database_url, aporte_id)
    assert antes == despues


def test_historial_mixto_conserva_todas_las_decisiones_y_orden(database_url, cliente_legado):
    aporte_id, _, _ = crear_aporte(cliente_legado)
    for valor in (None, False, ["legado"], {"canal": "web", "contacto_abierto": CONTACTO}):
        sembrar_devolucion(database_url, aporte_id, valor)
    lector, antes = snapshot(database_url, aporte_id)
    historia = cliente_legado.get(f"/api/v1/aportes/{aporte_id}/devolucion-razon")
    posterior, despues = snapshot(database_url, aporte_id)
    assert lector != posterior and antes == despues
    assert historia.status_code == 200
    assert [fila["id"] for fila in historia.json()] == [fila["id"] for fila in reversed(antes["auditoria"])]
    assert len(historia.json()) == 4
    assert [fila["metadatos"] for fila in historia.json()] == [{"canal": "web"}, {}, {}, {}]
    for leido, original in zip(historia.json(), reversed(antes["auditoria"]), strict=True):
        assert leido["causal"] == original["causal"]
        assert leido["justificacion_motivada"] == original["justificacion_motivada"]
        assert datetime.fromisoformat(leido["creado_en"]) == datetime.fromisoformat(original["creado_en"])
    sin_privados(historia)
