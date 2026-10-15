"""Pruebas para los endpoints analíticos de hurtos (2018-2026).

Tarea: [GEO-HURTOS-01]
Valida:
1. GET /api/v1/geodatos/analitica/hurtos/resumen (con filtros de delito, año y zona).
2. GET /api/v1/geodatos/analitica/hurtos/geojson (FeatureCollection < 150 KB).
3. Inviolabilidad del censo bd_csh (37 mesas, 38 agendas, 11 fichas, 17 actores).
"""

import json
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.database import Database
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture(autouse=True)
async def seed_hurtos_test_data(database_url: str):
    """Puebla datos sintéticos mínimos de hurtos en la base aislada de pruebas polis_test."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(database_url)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT count(*) FROM geodatos.poligonos_analitica_hurtos;"))
        if (res.scalar() or 0) == 0:
            await conn.execute(
                text("""
                INSERT INTO geodatos.poligonos_analitica_hurtos 
                    (id, codigo, nombre, zona, area_km2, geometria, geometria_simplificada)
                VALUES 
                    (1, 'PERIMETRO_URBANO', 'Perímetro Urbano de Cartagena', 'URBANA', 75.34,
                     ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-75.55,10.38],[-75.50,10.38],[-75.50,10.45],[-75.55,10.45],[-75.55,10.38]]]}'), 4326),
                     ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-75.55,10.38],[-75.50,10.38],[-75.50,10.45],[-75.55,10.45],[-75.55,10.38]]]}'), 4326)),
                    (2, 'CARTAGENA_RURAL', 'Cartagena Rural e Insular', 'RURAL', 597.38,
                     ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-75.60,10.30],[-75.40,10.30],[-75.40,10.50],[-75.60,10.50],[-75.60,10.30]]]}'), 4326),
                     ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-75.60,10.30],[-75.40,10.30],[-75.40,10.50],[-75.60,10.50],[-75.60,10.30]]]}'), 4326))
                ON CONFLICT (id) DO NOTHING;
            """)
            )
            await conn.execute(
                text("""
                INSERT INTO geodatos.estadisticas_hurtos
                    (id, delito, anio, mes, dia_semana, armas_medios, clase_sitio, zona, poligono_id, cantidad)
                VALUES
                    (gen_random_uuid(), 'HURTO MOTOCICLETA', 2024, 'Enero', 'Lunes', 'SIN EMPLEO DE ARMAS', 'VIA PUBLICA', 'URBANA', 1, 10),
                    (gen_random_uuid(), 'HURTO MOTOCICLETA', 2024, 'Febrero', 'Martes', 'ARMA DE FUEGO', 'VIA PUBLICA', 'RURAL', 2, 2),
                    (gen_random_uuid(), 'HURTO RESIDENCIAS', 2023, 'Marzo', 'Miércoles', 'PALANCA', 'RESIDENCIA', 'URBANA', 1, 5),
                    (gen_random_uuid(), 'HURTO COMERCIO', 2023, 'Abril', 'Jueves', 'ARMA BLANCA', 'COMERCIAL', 'URBANA', 1, 15),
                    (gen_random_uuid(), 'HURTO COMERCIO', 2023, 'Mayo', 'Viernes', 'SIN EMPLEO DE ARMAS', 'COMERCIAL', 'RURAL', 2, 3),
                    (gen_random_uuid(), 'HURTO RESIDENCIAS', 2018, 'Enero', 'Sábado', 'LLAVE MAESTRA', 'RESIDENCIA', 'URBANA', 1, 4),
                    (gen_random_uuid(), 'HURTO MOTOCICLETA', 2025, 'Junio', 'Domingo', 'ARMA DE FUEGO', 'VIA PUBLICA', 'URBANA', 1, 8),
                    (gen_random_uuid(), 'HURTO COMERCIO', 2026, 'Julio', 'Lunes', 'CONTUNDENTES', 'COMERCIAL', 'URBANA', 1, 6);
            """)
            )
    await engine.dispose()


@pytest.fixture
async def async_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    database = Database(settings)
    app.state.database = database
    app.state.settings = settings
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    await database.engine.dispose()


async def test_resumen_hurtos_global(async_client: AsyncClient):
    """Valida el resumen analítico acumulado sin filtros."""
    resp = await async_client.get("/api/v1/geodatos/analitica/hurtos/resumen")
    assert resp.status_code == 200, f"Error {resp.status_code}: {resp.text}"
    data = resp.json()

    assert data["total_casos"] > 0
    assert len(data["serie_anual"]) == 9  # 2018 a 2026
    assert len(data["serie_mensual"]) == 12  # Enero a Diciembre
    assert len(data["top_armas"]) <= 5
    assert len(data["top_sitios"]) <= 5
    assert len(data["distribucion_zona"]) == 2  # URBANA y RURAL

    zonas = {item["zona"]: item["cantidad"] for item in data["distribucion_zona"]}
    assert "URBANA" in zonas
    assert "RURAL" in zonas
    assert zonas["URBANA"] > zonas["RURAL"]


async def test_resumen_hurtos_filtros_delito_y_anio(async_client: AsyncClient):
    """Valida filtros por delito, año y zona."""
    # Filtro por delito motocicleta
    resp_moto = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/resumen",
        params={"delito": "hurto_motocicletas", "anio": 2024},
    )
    assert resp_moto.status_code == 200
    data_moto = resp_moto.json()
    assert data_moto["delito"] == "HURTO MOTOCICLETA"
    assert data_moto["anio"] == 2024
    assert data_moto["total_casos"] > 0

    # Filtro por zona rural
    resp_rural = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/resumen",
        params={"zona": "RURAL"},
    )
    assert resp_rural.status_code == 200
    data_rural = resp_rural.json()
    assert data_rural["zona"] == "RURAL"
    assert data_rural["total_casos"] > 0


async def test_geojson_hurtos_ligero(async_client: AsyncClient):
    """Valida que el GeoJSON retorne exactamente 2 polígonos y pese menos de 150 KB."""
    resp = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/geojson",
        params={"delito": "HURTO COMERCIO", "anio": 2023},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 2

    # Validar peso del payload sin comprimir (< 150 KB)
    payload_bytes = len(json.dumps(data).encode("utf-8"))
    assert payload_bytes < 150 * 1024, f"Payload excede 150 KB: {payload_bytes / 1024:.1f} KB"

    # Validar propiedades de cada polígono
    for feat in data["features"]:
        assert feat["type"] == "Feature"
        props = feat["properties"]
        assert props["poligono_id"] in (1, 2)
        assert props["codigo"] in ("PERIMETRO_URBANO", "CARTAGENA_RURAL")
        assert props["zona"] in ("URBANA", "RURAL")
        assert props["total_casos"] >= 0
        assert "densidad_casos_km2" in props
        assert "porcentaje_total" in props
        assert len(props["top_armas"]) <= 3
        assert len(props["top_sitios"]) <= 3


async def test_explorador_registros_hurtos_paginacion_y_pivot(async_client: AsyncClient):
    """Valida la exploración tabular paginada, filtros multicriterio y pivot dinámico."""
    # 1. Consulta general sin filtros
    resp_base = await async_client.get("/api/v1/geodatos/analitica/hurtos/registros")
    assert resp_base.status_code == 200
    data_base = resp_base.json()
    assert data_base["total_registros"] == 8
    assert data_base["total_incidentes"] == 53
    assert len(data_base["registros"]) == 8
    assert len(data_base["agrupacion"]) > 0
    assert "meses" in data_base["catalogos"]
    assert "dias_semana" in data_base["catalogos"]
    assert "top_armas_medios" in data_base["catalogos"]
    assert "top_clases_sitio" in data_base["catalogos"]

    # Validar estructura de registro individual
    primer_reg = data_base["registros"][0]
    assert "id" in primer_reg
    assert "delito" in primer_reg
    assert "anio" in primer_reg
    assert "mes" in primer_reg
    assert "dia_semana" in primer_reg
    assert "zona" in primer_reg
    assert "poligono_id" in primer_reg
    assert "armas_medios" in primer_reg
    assert "clase_sitio" in primer_reg
    assert "cantidad" in primer_reg

    # 2. Paginación con limit y offset
    resp_pag1 = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/registros",
        params={"limit": 3, "offset": 0},
    )
    assert resp_pag1.status_code == 200
    data_pag1 = resp_pag1.json()
    assert data_pag1["total_registros"] == 8
    assert len(data_pag1["registros"]) == 3
    assert data_pag1["limit"] == 3
    assert data_pag1["offset"] == 0

    resp_pag2 = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/registros",
        params={"limit": 3, "offset": 3},
    )
    assert resp_pag2.status_code == 200
    data_pag2 = resp_pag2.json()
    assert len(data_pag2["registros"]) == 3
    # Los IDs de la página 1 y 2 deben ser disyuntos
    ids_p1 = {r["id"] for r in data_pag1["registros"]}
    ids_p2 = {r["id"] for r in data_pag2["registros"]}
    assert ids_p1.isdisjoint(ids_p2)

    # 3. Filtros combinados (delito, anio, zona)
    resp_filt = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/registros",
        params={"delito": "hurto_motocicletas", "anio": 2024},
    )
    assert resp_filt.status_code == 200
    data_filt = resp_filt.json()
    assert data_filt["total_registros"] == 2
    assert data_filt["total_incidentes"] == 12
    for r in data_filt["registros"]:
        assert r["delito"] == "HURTO MOTOCICLETA"
        assert r["anio"] == 2024

    # 4. Filtro por búsqueda textual (ILIKE)
    resp_busq = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/registros",
        params={"busqueda": "FUEGO"},
    )
    assert resp_busq.status_code == 200
    data_busq = resp_busq.json()
    assert data_busq["total_registros"] == 2
    for r in data_busq["registros"]:
        assert "FUEGO" in r["armas_medios"]

    # 5. Agrupación dinámica (Pivot por delito)
    resp_pivot = await async_client.get(
        "/api/v1/geodatos/analitica/hurtos/registros",
        params={"agrupar_por": "delito"},
    )
    assert resp_pivot.status_code == 200
    data_pivot = resp_pivot.json()
    delitos_agrupados = {a["categoria"] for a in data_pivot["agrupacion"]}
    assert "HURTO COMERCIO" in delitos_agrupados
    assert "HURTO MOTOCICLETA" in delitos_agrupados
    assert "HURTO RESIDENCIAS" in delitos_agrupados
    pct_total = sum(a["porcentaje"] for a in data_pivot["agrupacion"])
    assert 99.0 <= pct_total <= 101.0


async def test_inviolabilidad_censo_bd_csh():
    """Garantiza que el censo institucional de bd_csh continúe estrictamente intacto."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    # Leer URL directa de producción desde backend/.env
    env_file = Path(__file__).resolve().parents[1] / ".env"
    db_url = None
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("POLIS_DATABASE_URL="):
                db_url = line.split("=", 1)[1].strip()
                break

    if not db_url:
        db_url = "postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/bd_csh"

    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        mesas_c = (await conn.execute(text("SELECT count(*) FROM mesas_trabajo.mesas;"))).scalar()
        agendas_c = (
            await conn.execute(text("SELECT count(*) FROM mesas_trabajo.agendas;"))
        ).scalar()
        fichas_c = (
            await conn.execute(
                text("SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores;")
            )
        ).scalar()
        actores_c = (
            await conn.execute(
                text("SELECT count(*) FROM participacion_ciudadana.actores_estrategicos;")
            )
        ).scalar()

        assert mesas_c == 37, f"Censo mesas alterado: {mesas_c} != 37"
        assert agendas_c == 38, f"Censo agendas alterado: {agendas_c} != 38"
        assert fichas_c == 11, f"Censo fichas alterado: {fichas_c} != 11"
        assert actores_c == 17, f"Censo actores alterado: {actores_c} != 17"

    await engine.dispose()
