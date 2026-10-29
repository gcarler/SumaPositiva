"""Pruebas de integridad forense y proscripción de datos fabricados (OBS-02 / OBS-04).

Mandato EAF:
- Prohibición absoluta de procedencia falsa, funcionarios ficticios y URLs inventadas.
- Toda medición de demostración DEBE tener es_demostracion=True, registrado_por='DATOS DE DEMOSTRACIÓN' y sin URLs.
- Las mediciones reales no pueden contener URLs ficticias no verificadas.
- Ejecución síncrona mediante asyncio.run sin depender del plugin pytest-asyncio (OBS-04).
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

NOMBRES_FICTICIOS_PROHIBIDOS = {
    "Ing. Carlos Mendoza (Secotic)",
    "My. Laura Vega (Distriseguridad)",
    "Ing. Andrés Gómez (Secretaría General)",
    "Dra. Patricia Herrera (Secretaría de Participación)",
    "Dr. Roberto Paternina (Observatorio del Delito)",
    "Analista Juan",
    "Analista Maria",
}


def test_base_de_datos_no_contiene_mediciones_fabricadas(database_url: str):
    """Verifica que la base de datos no contenga mediciones con funcionarios ficticios o URLs no verificables."""

    async def verificar():
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as conn:
                result = await conn.execute(
                    text("""
                        SELECT id, indicador_id, periodo, registrado_por, evidencia_documental_url, es_demostracion
                        FROM indicadores.mediciones_indicador;
                    """)
                )
                filas = result.fetchall()

                for fila in filas:
                    _id, _ind_id, _per, registrado_por, evidencia_url, es_demo = fila

                    # 1. Prohibido nombres ficticios o de procedencia falsa
                    assert registrado_por not in NOMBRES_FICTICIOS_PROHIBIDOS, (
                        f"Violación OBS-02: Se detectó autor ficticio '{registrado_por}' en medición {_id}"
                    )

                    # 2. Si es demo, debe cumplir estrictamente las reglas
                    if es_demo:
                        assert registrado_por == "DATOS DE DEMOSTRACIÓN", (
                            f"Medición demo {_id} debe tener registrado_por='DATOS DE DEMOSTRACIÓN',"
                            f" no '{registrado_por}'"
                        )
                        assert evidencia_url is None or evidencia_url == "", (
                            f"Medición demo {_id} no puede tener URL de evidencia: {evidencia_url}"
                        )
                    else:
                        # 3. Si no es demo, no puede tener URLs fabricadas
                        if evidencia_url:
                            assert not evidencia_url.startswith("https://cartagena.gov.co/"), (
                                f"Violación OBS-02: URL inventada bajo dominio oficial en {_id}: {evidencia_url}"
                            )
        finally:
            await engine.dispose()

    asyncio.run(verificar())


def test_fichas_tecnicas_sin_medicion_real_muestran_cero_avance(database_url: str):
    """Verifica que las fichas técnicas sin mediciones reales verificadas tengan valor_actual=0 y avance=0."""

    async def verificar():
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as conn:
                result = await conn.execute(
                    text("""
                        SELECT f.codigo, f.valor_actual, f.porcentaje_avance, count(m.id) as total_mediciones
                        FROM indicadores.fichas_tecnicas_indicadores f
                        LEFT JOIN indicadores.mediciones_indicador m ON m.indicador_id = f.id
                        GROUP BY f.id, f.codigo, f.valor_actual, f.porcentaje_avance;
                    """)
                )
                fichas = result.fetchall()
                for codigo, val, avance, total_m in fichas:
                    if total_m == 0:
                        assert float(val) == 0.0, f"Ficha {codigo} sin mediciones debe tener valor_actual=0"
                        assert float(avance) == 0.0, f"Ficha {codigo} sin mediciones debe tener porcentaje_avance=0"
        finally:
            await engine.dispose()

    asyncio.run(verificar())
