"""Pruebas para la carga y consulta del banco multifuente oficial en el Geovisor.

Tarea: [ENCARGO-249]
Valida:
1. GET /api/v1/geodatos/capas incluye las 6 capas temáticas oficiales del banco multifuente.
2. GET /api/v1/geodatos/indicadores permite consultar y filtrar por:
   - territorio_id / codigo_territorio
   - dimension (Personal, Salud, Economica, etc.)
   - fuente_datos (DANE, Medicina Legal, ICBF, etc.)
   - anio_corte
3. GET /api/v1/geodatos/territorios/{id}/indicadores retorna los indicadores del territorio.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.core.database import Database
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture(autouse=True)
async def seed_geodatos_fuentes(database_url: str):
    """Puebla capas oficiales e indicadores sintéticos representativos en la base aislada."""
    engine = create_async_engine(database_url)
    async with engine.begin() as conn:
        # 1. Asegurar territorio DISTRITO-CTG
        res_terr = await conn.execute(text("SELECT id FROM geodatos.territorios WHERE codigo = 'DISTRITO-CTG'"))
        distrito_uuid = res_terr.scalar()
        if not distrito_uuid:
            distrito_uuid = "01a0f5dd-538e-7900-afb0-68db850f2153"
            insert_terr = text(
                "INSERT INTO geodatos.territorios (id, codigo, nombre, tipo_territorio) "
                f"VALUES ('{distrito_uuid}', 'DISTRITO-CTG', "
                "'Distrito Turístico y Cultural de Cartagena de Indias', 'distrito') "
                "ON CONFLICT (codigo) DO NOTHING;"
            )
            await conn.execute(insert_terr)

        # 2. Asegurar dimensiones
        dims_res = await conn.execute(text("SELECT codigo, id FROM motor_politicas.dimensiones_seguridad_humana"))
        dim_map = {row[0]: str(row[1]) for row in dims_res.fetchall()}

        for cod_dim, nom_dim in [
            ("personal", "Seguridad Personal"),
            ("economica", "Seguridad Económica"),
            ("salud", "Seguridad en Salud"),
            ("ambiental", "Seguridad Ambiental"),
            ("alimentaria", "Seguridad Alimentaria"),
            ("comunitaria", "Seguridad Comunitaria"),
        ]:
            if cod_dim not in dim_map:
                u = str(uuid.uuid4())
                stmt_dim = text(
                    "INSERT INTO motor_politicas.dimensiones_seguridad_humana (id, codigo, nombre) "
                    f"VALUES ('{u}', '{cod_dim}', '{nom_dim}') ON CONFLICT (codigo) DO NOTHING;"
                )
                await conn.execute(stmt_dim)

        dims_res = await conn.execute(text("SELECT codigo, id FROM motor_politicas.dimensiones_seguridad_humana"))
        dim_map = {row[0]: str(row[1]) for row in dims_res.fetchall()}

        dim_personal = dim_map.get("personal")
        dim_economica = dim_map.get("economica")
        dim_salud = dim_map.get("salud")
        dim_ambiental = dim_map.get("ambiental")
        dim_alimentaria = dim_map.get("alimentaria")
        dim_comunitaria = dim_map.get("comunitaria")

        # 3. Registrar las 6 capas oficiales
        capas_sql = text("""
        INSERT INTO geodatos.capas_geovisor (
            codigo, nombre, categoria, descripcion, tipo_geometria, color_estilo, activa
        ) VALUES 
            ('DANE_POBREZA_EMPLEO', 'DANE — Pobreza Monetaria, Multidimensional y Empleo GEIH',
             'Desarrollo Económico y Social', 'Indicadores DANE', 'Poligonos', '#2563eb', true),
            ('MEDICINA_LEGAL_VIOLENCIA', 'Medicina Legal — Violencia y Lesiones de Causa Externa (Forensis)',
             'Seguridad y Convivencia', 'Indicadores Medicina Legal', 'Poligonos', '#dc2626', true),
            ('DNP_TERRIDATA_SALUD', 'DNP TerriData — Salud Pública, Dengue y Servicios Básicos',
             'Salud y Bienestar', 'Indicadores TerriData', 'Poligonos', '#10b981', true),
            ('RUV_VICTIMAS_CONFLICTO', 'Unidad para las Víctimas — RUV, IRV e Indemnizaciones',
             'Paz y Derechos Humanos', 'Indicadores RUV', 'Poligonos', '#7c3aed', true),
            ('ICBF_PRIMERA_INFANCIA', 'ICBF — Primera Infancia, Nutrición y Bienestar Familiar',
             'Protección Integral de la Niñez', 'Indicadores ICBF', 'Poligonos', '#f59e0b', true),
            ('INS_CALIDAD_AGUA_IRCA', 'INS / SIVICAP — Calidad de Agua Potable y Ambiente (IRCA)',
             'Medio Ambiente y Salubridad', 'Indicadores INS', 'Poligonos', '#06b6d4', true)
        ON CONFLICT (codigo) DO UPDATE SET activa = true;
        """)
        await conn.execute(capas_sql)

        # 4. Poblar indicadores de prueba representativos
        indicadores_sql = text(f"""
        INSERT INTO geodatos.indicadores_territorio (
            id, territorio_id, dimension_id, codigo_indicador, nombre_indicador,
            valor, unidad_medida, nivel_riesgo, anio_corte, fuente_datos, metadatos
        ) VALUES
            (gen_random_uuid(), '{distrito_uuid}', '{dim_personal}', 'IND_FORENSIS_HOMICIDIOS_TOTAL',
             'Homicidios de Causa Externa', 412.0000, 'casos', 'alto', 2024,
             'Medicina Legal - Forensis', '{{"custodio": "Medicina Legal"}}'),
            (gen_random_uuid(), '{distrito_uuid}', '{dim_economica}', 'IND_DANE_POBREZA_MONETARIA',
             'Pobreza Monetaria Oficial', 41.1000, '%', 'alto', 2024,
             'DANE - dane_pobreza', '{{"custodio": "DANE"}}'),
            (gen_random_uuid(), '{distrito_uuid}', '{dim_salud}', 'IND_TERRIDATA_INCIDENCIA_DENGUE',
             'Incidencia de Dengue Total', 713.4000, 'Tasa por 100.000', 'alto', 2023,
             'DNP / custodios originales - dnp_terridata_13001', '{{"custodio": "DNP"}}'),
            (gen_random_uuid(), '{distrito_uuid}', '{dim_comunitaria}', 'IND_RUV_DESPLAZAMIENTO_FORZADO',
             'Víctimas de Desplazamiento Forzado', 1250.0000, 'personas', 'alto', 2024,
             'Unidad para las Víctimas / RNI - ruv', '{{"custodio": "UARIV"}}'),
            (gen_random_uuid(), '{distrito_uuid}', '{dim_alimentaria}', 'IND_DANE_SAE_FIES_HAMBRE',
             'Inseguridad Alimentaria Moderada o Grave FIES', 28.1000, '%', 'alto', 2024,
             'DANE - dane_sae_fies', '{{"custodio": "DANE"}}'),
            (gen_random_uuid(), '{distrito_uuid}', '{dim_ambiental}', 'IND_INS_IRCA_AGUA_URBANO',
             'Índice de Riesgo de Calidad del Agua Urbano', 0.8500, '%', 'bajo', 2024,
             'INS / SIVICAP - ins_calidad_agua', '{{"custodio": "INS"}}')
        ON CONFLICT (territorio_id, codigo_indicador, anio_corte) DO NOTHING;
        """)
        await conn.execute(indicadores_sql)

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


async def test_capas_geovisor_contiene_banco_oficial(async_client: AsyncClient):
    """Verifica que el catálogo de capas incluya las 6 capas del banco multifuente."""
    resp = await async_client.get("/api/v1/geodatos/capas")
    assert resp.status_code == 200
    capas = resp.json()
    codigos = {c["codigo"] for c in capas}

    capas_esperadas = {
        "DANE_POBREZA_EMPLEO",
        "MEDICINA_LEGAL_VIOLENCIA",
        "DNP_TERRIDATA_SALUD",
        "RUV_VICTIMAS_CONFLICTO",
        "ICBF_PRIMERA_INFANCIA",
        "INS_CALIDAD_AGUA_IRCA",
    }
    assert capas_esperadas.issubset(codigos), f"Faltan capas: {capas_esperadas - codigos}"


async def test_listar_indicadores_global(async_client: AsyncClient):
    """Verifica la consulta global paginada de indicadores territoriales."""
    resp = await async_client.get("/api/v1/geodatos/indicadores")
    assert resp.status_code == 200
    data = resp.json()

    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "indicadores" in data
    assert data["total"] >= 6
    assert len(data["indicadores"]) >= 6

    primer = data["indicadores"][0]
    assert "codigo_indicador" in primer
    assert "nombre_indicador" in primer
    assert "valor" in primer
    assert "unidad_medida" in primer
    assert "codigo_territorio" in primer
    assert "codigo_dimension" in primer


async def test_filtrar_indicadores_por_dimension(async_client: AsyncClient):
    """Verifica el filtrado de indicadores por dimensión de seguridad humana."""
    # Filtro por dimensión 'personal'
    resp_personal = await async_client.get("/api/v1/geodatos/indicadores", params={"dimension": "personal"})
    assert resp_personal.status_code == 200
    data_personal = resp_personal.json()
    assert data_personal["total"] >= 1
    for ind in data_personal["indicadores"]:
        assert ind["codigo_dimension"] == "personal"

    # Filtro por dimensión 'economica'
    resp_econ = await async_client.get("/api/v1/geodatos/indicadores", params={"dimension": "economica"})
    assert resp_econ.status_code == 200
    data_econ = resp_econ.json()
    assert data_econ["total"] >= 1
    for ind in data_econ["indicadores"]:
        assert ind["codigo_dimension"] == "economica"


async def test_filtrar_indicadores_por_fuente(async_client: AsyncClient):
    """Verifica el filtrado de indicadores por entidad o fuente oficial."""
    resp = await async_client.get("/api/v1/geodatos/indicadores", params={"fuente_datos": "DANE"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    for ind in data["indicadores"]:
        assert "DANE" in ind["fuente_datos"]


async def test_filtrar_indicadores_por_anio(async_client: AsyncClient):
    """Verifica el filtrado por año de corte."""
    resp = await async_client.get("/api/v1/geodatos/indicadores", params={"anio_corte": 2024})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for ind in data["indicadores"]:
        assert ind["anio_corte"] == 2024


async def test_filtrar_indicadores_por_territorio(async_client: AsyncClient):
    """Verifica el filtrado por código territorial."""
    resp = await async_client.get("/api/v1/geodatos/indicadores", params={"codigo_territorio": "DISTRITO-CTG"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 6
    for ind in data["indicadores"]:
        assert ind["codigo_territorio"] == "DISTRITO-CTG"


async def test_obtener_indicadores_territorio_especifico(async_client: AsyncClient):
    """Verifica la consulta de indicadores anidados bajo el territorio."""
    resp_terrs = await async_client.get("/api/v1/geodatos/territorios")
    assert resp_terrs.status_code == 200
    terrs = resp_terrs.json()
    distrito = next(t for t in terrs if t["codigo"] == "DISTRITO-CTG")
    distrito_uuid = distrito["id"]

    resp = await async_client.get(f"/api/v1/geodatos/territorios/{distrito_uuid}/indicadores")
    assert resp.status_code == 200
    indicadores = resp.json()
    assert isinstance(indicadores, list)
    assert len(indicadores) >= 6


async def test_filtrar_indicadores_por_busqueda(async_client: AsyncClient):
    """Verifica la búsqueda de texto en nombre o código de indicador."""
    resp = await async_client.get("/api/v1/geodatos/indicadores", params={"busqueda": "Homicidios"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for ind in data["indicadores"]:
        coincide = "homicidios" in ind["nombre_indicador"].lower() or "homicidios" in ind["codigo_indicador"].lower()
        assert coincide
