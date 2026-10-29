"""Pruebas de persistencia, lógica de negocio y endpoints para aportes ciudadanos."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import (
    MetadataEnfoqueDiferencial,
    PropuestaCiudadanaCreate,
    PropuestaCiudadanaRead,
)
from app.modules.aportes.service import AporteService
from app.modules.geodatos.models import Territorio
from app.modules.politicas.models import (
    DimensionSeguridadHumana,
    FasePolitica,
    LineaEstrategica,
)

pytestmark = pytest.mark.anyio


@pytest.fixture
async def session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


@pytest.fixture
async def datos_contexto(session):
    """Obtiene o crea una línea estratégica, dimensión y territorio para asociar aportes."""
    # Fase
    res_fase = await session.execute(select(FasePolitica).limit(1))
    fase = res_fase.scalar_one()

    # Dimensión
    res_dim = await session.execute(
        select(DimensionSeguridadHumana).where(DimensionSeguridadHumana.codigo == "comunitaria")
    )
    dim = res_dim.scalar_one_or_none()
    if not dim:
        res_dim = await session.execute(select(DimensionSeguridadHumana).limit(1))
        dim = res_dim.scalar_one()

    # Territorio (Barrio Olaya o primero)
    res_ter = await session.execute(select(Territorio).where(Territorio.codigo == "BARRIO-OLAYA"))
    territorio = res_ter.scalar_one_or_none()
    if not territorio:
        res_ter = await session.execute(select(Territorio).limit(1))
        territorio = res_ter.scalar_one()

    # Línea Estratégica
    res_linea = await session.execute(select(LineaEstrategica).limit(1))
    linea = res_linea.scalar_one_or_none()
    if not linea:
        linea = LineaEstrategica(
            fase_id=fase.id,
            dimension_id=dim.id,
            codigo=f"LE-APORTE-{uuid.uuid4().hex[:6]}",
            titulo="Línea de Participación y Convivencia",
            descripcion="Línea para recepción de aportes ciudadanos",
        )
        session.add(linea)
        await session.commit()
        await session.refresh(linea)

    return {
        "linea_id": linea.id,
        "dimension_id": dim.id,
        "territorio_id": territorio.id,
    }


async def test_persistencia_propuesta_con_enfoque_diferencial_y_uuidv7(session, datos_contexto):
    """Verifica la persistencia en participacion_ciudadana.propuestas_ciudadanas."""
    repo = AporteRepository(session)

    meta_enfoque = MetadataEnfoqueDiferencial(
        etnia="afrocolombiano_negro",
        genero="mujer",
        ciclo_vital="juventud",
        es_victima_conflicto=True,
        hecho_victimizante="desplazamiento forzado",
        situacion_discapacidad=False,
        poblacion_campesina=False,
        persona_cuidadora=True,
        organizacion_social="Colectivo Juvenil Afro de Olaya Herrera",
    )

    datos = PropuestaCiudadanaCreate(
        linea_id=datos_contexto["linea_id"],
        dimension_id=datos_contexto["dimension_id"],
        territorio_id=datos_contexto["territorio_id"],
        tipo_aporte="propuesta",
        titulo="Centro Comunitario de Cuidado y Formación Digital para Jóvenes",
        descripcion=(
            "Proponemos la adecuación de un espacio seguro en el sector Rafael Núñez "
            "con computadores y conectividad para jóvenes cuidadores y madres cabeza de hogar."
        ),
        autor_nombre="Lideresa Comunitaria",
        es_anonimo=False,
        metadata_enfoque=meta_enfoque,
    )

    propuesta = await repo.crear(datos)

    assert propuesta.id is not None
    assert isinstance(propuesta.id, uuid.UUID)
    assert propuesta.activo is True
    assert propuesta.estado == "publicado"
    assert propuesta.apoyos_contador == 0
    assert propuesta.metadata_enfoque["etnia"] == "afrocolombiano_negro"
    assert propuesta.metadata_enfoque["es_victima_conflicto"] is True
    assert propuesta.linea_id == datos_contexto["linea_id"]
    assert propuesta.dimension_id == datos_contexto["dimension_id"]
    assert propuesta.territorio_id == datos_contexto["territorio_id"]

    # Validación Pydantic v2
    esquema = PropuestaCiudadanaRead.model_validate(propuesta)
    assert esquema.id == propuesta.id
    assert esquema.metadata_enfoque.es_victima_conflicto is True
    assert esquema.metadata_enfoque.genero == "mujer"

    # Limpiar registro
    await session.delete(propuesta)
    await session.commit()


async def test_soft_delete_y_soporte_activo(session, datos_contexto):
    """Verifica que la bandera activo maneje correctamente el soft-delete."""
    repo = AporteRepository(session)
    service = AporteService(repo)

    datos = PropuestaCiudadanaCreate(
        linea_id=datos_contexto["linea_id"],
        titulo="Alerta Temprana de Inundación en el Canal Ricaurte",
        descripcion="El taponamiento por sedimentación genera riesgo inminente en lluvias.",
        tipo_aporte="alerta_comunitaria",
        metadata_enfoque=MetadataEnfoqueDiferencial(etnia="mestizo_ninguno"),
    )

    propuesta_read = await service.crear_propuesta(datos)
    propuesta_id = propuesta_read.id

    # Verificar que aparece en listados activos
    total, elementos = await repo.listar(solo_activos=True)
    ids_activos = [p.id for p in elementos]
    assert propuesta_id in ids_activos

    # Desactivar (soft-delete)
    await service.desactivar_propuesta(propuesta_id)

    # Verificar que NO aparece en solo_activos=True
    total_despues, elementos_despues = await repo.listar(solo_activos=True)
    ids_despues = [p.id for p in elementos_despues]
    assert propuesta_id not in ids_despues

    # Verificar que SÍ aparece cuando solo_activos=False
    total_todos, elementos_todos = await repo.listar(solo_activos=False)
    ids_todos = [p.id for p in elementos_todos]
    assert propuesta_id in ids_todos

    # Limpiar
    propuesta_db = await repo.obtener_por_id(propuesta_id, incluir_inactivos=True)
    if propuesta_db:
        await session.delete(propuesta_db)
        await session.commit()


async def test_filtros_dimension_territorio_y_enfoque(session, datos_contexto):
    """Verifica filtros por dimensión, territorio y enfoque diferencial."""
    repo = AporteRepository(session)

    # Propuesta 1: Étnica Afro con dimensión
    p1 = await repo.crear(
        PropuestaCiudadanaCreate(
            linea_id=datos_contexto["linea_id"],
            dimension_id=datos_contexto["dimension_id"],
            territorio_id=datos_contexto["territorio_id"],
            tipo_aporte="propuesta",
            titulo="Preservación de Tradición Oral y Medicina Ancestral",
            descripcion="Creación de semillero de saberes ancestrales en la comunidad.",
            metadata_enfoque=MetadataEnfoqueDiferencial(
                etnia="afrocolombiano_negro",
                es_victima_conflicto=False,
            ),
        )
    )

    # Propuesta 2: Sin dimensión ni territorio, enfoque víctimas
    p2 = await repo.crear(
        PropuestaCiudadanaCreate(
            linea_id=datos_contexto["linea_id"],
            dimension_id=None,
            territorio_id=None,
            tipo_aporte="observacion",
            titulo="Garantías de Retorno Digno y Reparación Integral",
            descripcion="Atención prioritaria a familias desplazadas en reasentamientos.",
            metadata_enfoque=MetadataEnfoqueDiferencial(
                etnia="mestizo_ninguno",
                es_victima_conflicto=True,
            ),
        )
    )

    # Filtrar por dimensión
    _, dim_filtradas = await repo.listar(dimension_id=datos_contexto["dimension_id"])
    ids_dim = [p.id for p in dim_filtradas]
    assert p1.id in ids_dim
    assert p2.id not in ids_dim

    # Filtrar por grupo étnico afro
    _, etnia_filtradas = await repo.listar(grupo_etnico="afrocolombiano_negro")
    ids_etnia = [p.id for p in etnia_filtradas]
    assert p1.id in ids_etnia
    assert p2.id not in ids_etnia

    # Respaldar aporte
    p1_apoyada = await repo.sumar_apoyo(p1.id)
    assert p1_apoyada is not None
    assert p1_apoyada.apoyos_contador == 1

    # Limpiar registros
    await session.delete(p1)
    await session.delete(p2)
    await session.commit()


def test_api_endpoints_aportes_ciclo_completo(database_url: str, cabeceras_gestion):
    """Prueba de integración HTTP completa sobre /api/v1/aportes."""
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
    )
    app = create_app(settings)

    with TestClient(app) as client:
        # Obtener un territorio o dimensión para la prueba
        payload_inicial = {
            "linea_id": str(uuid.uuid4()),  # Simulado
            "titulo": "Implementación de Iluminación Fotovoltaica en Caminos Rurales",
            "descripcion": (
                "Instalar postes solares autónomos para mejorar la seguridad nocturna "
                "de las mujeres y trabajadores rurales en los accesos al corregimiento."
            ),
            "tipo_aporte": "propuesta",
            "autor_nombre": "Colectivo Comunitario",
            "es_anonimo": False,
            "metadata_enfoque": {
                "etnia": "palenquero",
                "genero": "mujer",
                "ciclo_vital": "adultez",
                "es_victima_conflicto": False,
                "poblacion_campesina": True,
            },
        }

        # Primero obtener una línea estratégica válida de la base de datos
        import asyncio

        from app.core.database import Database

        async def obtener_linea_valida():
            db = Database(settings)
            async with db.sessions() as s:
                res = await s.execute(select(LineaEstrategica).limit(1))
                linea = res.scalar_one_or_none()
                dim = await s.execute(select(DimensionSeguridadHumana).limit(1))
                dim_obj = dim.scalar_one_or_none()
                ter = await s.execute(select(Territorio).limit(1))
                ter_obj = ter.scalar_one_or_none()
                return linea.id, dim_obj.id if dim_obj else None, ter_obj.id if ter_obj else None

        linea_id, dim_id, ter_id = asyncio.run(obtener_linea_valida())
        payload_inicial["linea_id"] = str(linea_id)
        if dim_id:
            payload_inicial["dimension_id"] = str(dim_id)
        if ter_id:
            payload_inicial["territorio_id"] = str(ter_id)

        # 0. Verificar rechazo 401 sin sesión cívica obligatoria
        resp_sin_sesion = client.post("/api/v1/aportes", json=payload_inicial)
        assert resp_sin_sesion.status_code == 401

        # 1. Emitir sesión anónima firmada POST /api/v1/sesion/anonima
        resp_sesion = client.post("/api/v1/sesion/anonima")
        assert resp_sesion.status_code == 201
        data_sesion = resp_sesion.json()
        assert "token_acceso" in data_sesion
        assert "sesion_id" in data_sesion
        assert "huella_hash" in data_sesion
        token = data_sesion["token_acceso"]
        headers_sesion = {"Authorization": f"Bearer {token}"}

        # 2. POST /api/v1/aportes con token de sesión firmado
        resp_post = client.post("/api/v1/aportes", json=payload_inicial, headers=headers_sesion)
        assert resp_post.status_code == 201, resp_post.text
        data_post = resp_post.json()
        aporte_id = data_post["id"]
        assert data_post["titulo"] == payload_inicial["titulo"]
        assert data_post["metadata_enfoque"]["poblacion_campesina"] is True
        assert data_post["metadata_enfoque"]["etnia"] == "palenquero"
        assert data_post["activo"] is True
        # La trazabilidad se conserva privada, fuera de la respuesta pública.
        assert "sesion_id" not in data_post and "huella_hash" not in data_post

        async def comprobar_trazabilidad_privada():
            from sqlalchemy import text

            db = Database(settings)
            try:
                async with db.sessions() as session:
                    fila = (
                        await session.execute(
                            text(
                                "SELECT sesion_id,huella_hash FROM participacion_ciudadana.propuestas_ciudadanas "
                                "WHERE id=CAST(:id AS uuid)"
                            ),
                            {"id": aporte_id},
                        )
                    ).one()
                    assert str(fila.sesion_id) == data_sesion["sesion_id"]
                    assert fila.huella_hash == data_sesion["huella_hash"]
            finally:
                await db.engine.dispose()

        asyncio.run(comprobar_trazabilidad_privada())

        # 2. GET /api/v1/aportes (Paginado)
        resp_get = client.get("/api/v1/aportes?limite=10&desplazamiento=0")
        assert resp_get.status_code == 200
        data_pag = resp_get.json()
        assert "total" in data_pag
        assert "elementos" in data_pag
        assert data_pag["total"] >= 1
        assert any(e["id"] == aporte_id for e in data_pag["elementos"])

        # 3. GET /api/v1/aportes con filtro diferencial
        resp_filtro = client.get("/api/v1/aportes?grupo_etnico=palenquero")
        assert resp_filtro.status_code == 200
        data_filtro = resp_filtro.json()
        assert any(e["id"] == aporte_id for e in data_filtro["elementos"])

        # 4. POST /api/v1/aportes/{id}/apoyar
        resp_apoyo = client.post(f"/api/v1/aportes/{aporte_id}/apoyar", headers=headers_sesion)
        assert resp_apoyo.status_code == 200
        data_apoyo = resp_apoyo.json()
        assert data_apoyo["apoyos_contador"] == 1

        # 5. GET /api/v1/aportes/{id}
        resp_detalle = client.get(f"/api/v1/aportes/{aporte_id}")
        assert resp_detalle.status_code == 200
        assert resp_detalle.json()["id"] == aporte_id

        # 6. DELETE /api/v1/aportes/{id} (Soft-delete)
        resp_del = client.delete(f"/api/v1/aportes/{aporte_id}", headers=cabeceras_gestion)
        assert resp_del.status_code == 204

        # 7. Verificar que el aporte desactivado ya no se encuentra vía GET por ID
        resp_not_found = client.get(f"/api/v1/aportes/{aporte_id}")
        assert resp_not_found.status_code == 404
