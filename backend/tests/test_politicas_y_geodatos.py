import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.geodatos.models import CapaGeovisor, Territorio
from app.modules.geodatos.schemas import CapaGeovisorRead, TerritorioRead
from app.modules.politicas.models import (
    DimensionSeguridadHumana,
    FasePolitica,
    LineaEstrategica,
)
from app.modules.politicas.schemas import (
    DimensionSeguridadHumanaRead,
    FasePoliticaRead,
    LineaEstrategicaRead,
)

pytestmark = pytest.mark.anyio


@pytest.fixture
async def session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


async def test_dimensiones_seguridad_humana_onu(session):
    """Verificar que existan las 7 dimensiones canónicas de la ONU mapeadas a Pydantic v2."""
    stmt = select(DimensionSeguridadHumana).order_by(DimensionSeguridadHumana.orden)
    result = await session.execute(stmt)
    dimensiones = list(result.scalars().all())

    assert len(dimensiones) == 7

    codigos_esperados = [
        "economica",
        "alimentaria",
        "salud",
        "ambiental",
        "personal",
        "comunitaria",
        "politica",
    ]
    codigos_obtenidos = [d.codigo for d in dimensiones]
    assert codigos_obtenidos == codigos_esperados

    # Validar serialización en esquemas Pydantic v2 en español
    for d in dimensiones:
        esquema = DimensionSeguridadHumanaRead.model_validate(d)
        assert isinstance(esquema.id, uuid.UUID)
        assert esquema.codigo in codigos_esperados
        assert esquema.nombre
        assert esquema.color_hex.startswith("#")
        assert esquema.activa is True


async def test_fases_politica_ciclo_de_vida(session):
    """Verificar las 3 fases iniciales de la política pública de Cartagena."""
    stmt = select(FasePolitica).order_by(FasePolitica.orden)
    result = await session.execute(stmt)
    fases = list(result.scalars().all())

    assert len(fases) >= 3

    fase1 = next(f for f in fases if f.codigo == "FASE_1_DIAGNOSTICO")
    assert fase1.orden == 1
    assert fase1.estado == "activa"
    assert fase1.progreso_porcentaje == Decimal("35.00")
    assert fase1.reglas_participacion.get("permite_anonimo") is True

    # Validar serialización con Pydantic v2
    esquema_fase1 = FasePoliticaRead.model_validate(fase1)
    assert esquema_fase1.codigo == "FASE_1_DIAGNOSTICO"
    assert esquema_fase1.progreso_porcentaje == Decimal("35.00")


async def test_15_territorios_distritales_con_centroides_postgis(session):
    """Verificar la malla territorial oficial de Cartagena con centroides PostGIS EPSG:4326."""
    stmt = select(Territorio).order_by(Territorio.codigo)
    result = await session.execute(stmt)
    territorios = list(result.scalars().all())

    assert len(territorios) == 15

    # 1. Distrito
    distrito = next(t for t in territorios if t.codigo == "DISTRITO-CTG")
    assert distrito.tipo_territorio == "distrito"
    assert distrito.territorio_padre_id is None
    coord_distrito = distrito.coordenadas_centroide
    # Cartagena: lon ~ -75.51 a -75.53, lat ~ 10.42
    assert -75.55 <= coord_distrito[0] <= -75.45
    assert 10.38 <= coord_distrito[1] <= 10.45

    # 2. Localidades (3)
    localidades = [t for t in territorios if t.tipo_territorio == "localidad"]
    assert len(localidades) == 3
    codigos_loc = {loc.codigo for loc in localidades}
    assert codigos_loc == {"LOC-1", "LOC-2", "LOC-3"}
    for loc in localidades:
        assert loc.territorio_padre_id == distrito.id
        assert loc.coordenadas_centroide is not None

    # 3. Corregimientos y Zonas Insulares con Enfoque Étnico (6)
    zonas_etnicas = [t for t in territorios if t.es_zona_etnica]
    assert len(zonas_etnicas) == 6
    for ze in zonas_etnicas:
        assert ze.nombre_consejo_comunitario is not None
        assert "Consejo" in ze.nombre_consejo_comunitario
        assert ze.coordenadas_centroide is not None

    # 4. Barrios representativos (5)
    barrios = [t for t in territorios if t.tipo_territorio == "barrio"]
    assert len(barrios) == 5
    codigos_barrios = {b.codigo for b in barrios}
    assert "BARRIO-OLAYA" in codigos_barrios
    assert "BARRIO-POZON" in codigos_barrios
    assert "BARRIO-MANDELA" in codigos_barrios

    # 5. Serialización con TerritorioRead
    for t in territorios:
        esquema = TerritorioRead.model_validate(t)
        assert isinstance(esquema.id, uuid.UUID)
        assert esquema.coordenadas_centroide is not None
        lon, lat = esquema.coordenadas_centroide
        assert -76.0 < lon < -75.0
        assert 10.0 < lat < 11.0


async def test_capas_geovisor(session):
    """Verificar el catálogo de capas espaciales temáticas del geovisor."""
    stmt = select(CapaGeovisor).order_by(CapaGeovisor.codigo)
    result = await session.execute(stmt)
    capas = list(result.scalars().all())

    assert len(capas) >= 4
    codigos_capas = {c.codigo for c in capas}
    assert "SAT_DEFENSORIA" in codigos_capas
    assert "CONFLICTIVIDAD_ICS" in codigos_capas
    assert "FONSET_PROYECTOS" in codigos_capas
    assert "CIENAGA_VIRGEN" in codigos_capas

    for c in capas:
        esquema = CapaGeovisorRead.model_validate(c)
        assert esquema.activa is True
        assert esquema.categoria


async def test_creacion_linea_estrategica_con_uuidv7(session):
    """Verificar inserción y generación automática de UUIDv7 en modelos de negocio."""
    # Obtener fase y dimensión existentes
    res_fase = await session.execute(select(FasePolitica).limit(1))
    fase = res_fase.scalar_one()

    res_dim = await session.execute(select(DimensionSeguridadHumana).limit(1))
    dim = res_dim.scalar_one()

    codigo_linea = f"TEST-LE-{uuid.uuid4().hex[:6]}"
    nueva_linea = LineaEstrategica(
        fase_id=fase.id,
        dimension_id=dim.id,
        codigo=codigo_linea,
        titulo="Línea de Prueba Automatizada",
        descripcion="Prueba asíncrona de inserción y relaciones SQLAlchemy 2.0",
        costo_estimado=Decimal("500000000.00"),
        fuentes_financiacion=["FONSET", "SGR"],
        entidad_lider="Secretaría del Interior y Convivencia Ciudadana",
    )
    session.add(nueva_linea)
    await session.commit()
    await session.refresh(nueva_linea)

    assert nueva_linea.id is not None
    assert isinstance(nueva_linea.id, uuid.UUID)
    assert nueva_linea.codigo == codigo_linea
    assert nueva_linea.costo_estimado == Decimal("500000000.00")

    # Serializar en Pydantic
    esquema = LineaEstrategicaRead.model_validate(nueva_linea)
    assert esquema.id == nueva_linea.id
    assert "FONSET" in esquema.fuentes_financiacion

    # Limpiar registro de prueba
    await session.delete(nueva_linea)
    await session.commit()
