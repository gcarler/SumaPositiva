"""Pruebas de Normalización Canónica OCR de las 4,637 metas (8 planes 2012-2027)
y Conciliación Universal de Vínculos con Cruce Hermano de los 3 Motores (Fase [32B]).
"""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.pdt_conciliador_vinculos_pa_triada import (
    _resolver_url_bd_csh,
    _to_float_preserve_zero,
)
from app.modules.compromisos.pdt_normalizador_canonico_metas import (
    PLANES_8_CARTAGENA,
    extraer_valor_numerico_linea_base,
    extraer_valor_numerico_meta,
    normalizar_meta_oficial_ocr,
)

CONTEOS_CANONICOS_8_PLANES: dict[str, int] = {
    "PDD_2012_2015": 469,
    "PDD_2013_2015": 676,
    "PDD_2016_2019": 898,
    "PDD_2020_2023": 947,
    "PDD_2024_2027": 1246,
    "PDL_1_2024_2027": 110,
    "PDL_2_2024_2027": 89,
    "PDL_3_2024_2027": 202,
}


def test_parser_numerico_ocr_metas_y_linea_base() -> None:
    """Verifica extracción numérica de paréntesis, comas, miles, ceros con fuente y palabras."""
    assert extraer_valor_numerico_meta("Implementar cuatro (4) estrategias") == pytest.approx(4.0)
    assert extraer_valor_numerico_meta("Asistir cien (100) empresas") == pytest.approx(100.0)
    assert extraer_valor_numerico_linea_base(
        "0 Fuente: Secretaría de Hacienda 2023"
    ) == pytest.approx(0.0)
    assert extraer_valor_numerico_meta("Disminuir a 0,4 la tasa") == pytest.approx(0.4)
    assert extraer_valor_numerico_linea_base(
        "0.78 homicidios por cada 100 mil habitantes en la Localidad FUENTE: Policía"
    ) == pytest.approx(0.78)
    assert extraer_valor_numerico_linea_base(
        "1183 casos de embarazos en adolescentes de 10-19 años en la Localidad FUENTE: DADIS"
    ) == pytest.approx(1183.0)
    assert extraer_valor_numerico_meta("25.265") == pytest.approx(25265.0)
    assert extraer_valor_numerico_linea_base("ND") is None
    assert extraer_valor_numerico_linea_base("N/D") is None


def test_normalizar_meta_oficial_ocr_llaves_fragmentadas_pdl() -> None:
    """Verifica el rescate de llaves OCR fragmentadas en PDL 1, PDL 2 y PDL 3."""
    pdl1 = normalizar_meta_oficial_ocr(
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "codigo_plan": "PDL_1_2024_2027",
            "codigo": None,
            "nombre": "Formación para el trabajo",
            "indicador": "Personas formadas",
            "unidad_medida": None,
            "fila_fuente": 12,
            "datos_oficiales": {
                "columna_2": "0 Fuente: Secretaría de Hacienda 2023",
                "columna_4": "Asistir cien (100) empresas",
                "columna_9": "LHCN",
            },
        }
    )
    assert pdl1["codigo"] == "M-0012"
    assert "Alcaldía Local 1" in pdl1["responsable_canonico"]
    assert pdl1["linea_base_numerica"] == pytest.approx(0.0)
    assert pdl1["meta_cuatrienio_numerica"] == pytest.approx(100.0)

    pdl3 = normalizar_meta_oficial_ocr(
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "codigo_plan": "PDL_3_2024_2027",
            "codigo": "",
            "nombre": "Campañas viales",
            "indicador": "Número de campañas",
            "unidad_medida": "",
            "fila_fuente": 7,
            "datos_oficiales": {
                "LINEA BASE": "ND",
                "RESPONSABL E": "Industrial y de la",
                "META DEL CUATRENI O": "Implementar cuatro (4) estrategias",
            },
        }
    )
    assert pdl3["codigo"] == "M-0007"
    assert pdl3["responsable_canonico"] == "Alcaldía Local 3 — Industrial y de la Bahía"
    assert pdl3["linea_base_numerica"] is None
    assert pdl3["meta_cuatrienio_numerica"] == pytest.approx(4.0)


def test_pdd_metas_oficiales_4637_normalizadas_en_8_planes_bd_csh() -> None:
    """Verifica que las 4,637 metas en seguimiento.pdd_metas_oficiales estén 100% normalizadas."""

    async def _check() -> None:
        engine = create_async_engine(_resolver_url_bd_csh())
        try:
            async with engine.connect() as conn:
                rows = (
                    (
                        await conn.execute(
                            text(
                                """
                        SELECT codigo_plan,
                               COUNT(*) AS total,
                               SUM(CASE WHEN COALESCE(codigo, '') = ''
                                   THEN 1 ELSE 0 END) AS sin_codigo,
                               SUM(CASE WHEN COALESCE(unidad_medida, '') = ''
                                   THEN 1 ELSE 0 END) AS sin_unidad,
                               SUM(CASE WHEN datos_oficiales ? '_canonico_normalizado'
                                   THEN 1 ELSE 0 END) AS con_canonico,
                               SUM(CASE WHEN COALESCE(datos_oficiales->>'responsable', '') <> ''
                                   THEN 1 ELSE 0 END) AS con_responsable
                        FROM seguimiento.pdd_metas_oficiales
                            GROUP BY codigo_plan
                            ORDER BY codigo_plan
                            """
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
        finally:
            await engine.dispose()

        por_plan = {str(r["codigo_plan"]): dict(r) for r in rows}
        assert set(por_plan.keys()) == set(PLANES_8_CARTAGENA)
        assert sum(r["total"] for r in por_plan.values()) == 4637
        for plan, esperado in CONTEOS_CANONICOS_8_PLANES.items():
            info = por_plan[plan]
            assert info["total"] == esperado
            assert info["sin_codigo"] == 0
            assert info["sin_unidad"] == 0
            assert info["con_canonico"] == esperado
            assert info["con_responsable"] == esperado

    asyncio.run(_check())


def test_pdd_vinculos_meta_pa_triada_4637_filas_en_8_planes_bd_csh() -> None:
    """Verifica que pdd_vinculos_meta_pa_triada contenga las 4,637 metas de los 8 planes."""

    async def _check() -> None:
        engine = create_async_engine(_resolver_url_bd_csh())
        try:
            async with engine.connect() as conn:
                rows = (
                    (
                        await conn.execute(
                            text(
                                """
                        SELECT codigo_plan,
                               COUNT(*) AS total,
                               SUM(CASE WHEN apropiacion_definitiva_cop IS NOT NULL
                                   THEN 1 ELSE 0 END) AS con_aprop,
                               SUM(CASE WHEN avance_fisico_pct IS NOT NULL
                                   THEN 1 ELSE 0 END) AS con_avance,
                               SUM(CASE WHEN (evidencia_cruce->>'cruce_hermano_motores')::boolean
                                   IS TRUE THEN 1 ELSE 0 END) AS con_cruce_hermano
                        FROM seguimiento.pdd_vinculos_meta_pa_triada
                            GROUP BY codigo_plan
                            ORDER BY codigo_plan
                            """
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
        finally:
            await engine.dispose()

        por_plan = {str(r["codigo_plan"]): dict(r) for r in rows}
        assert set(por_plan.keys()) == set(PLANES_8_CARTAGENA)
        assert sum(r["total"] for r in por_plan.values()) == 4637
        for plan, esperado in CONTEOS_CANONICOS_8_PLANES.items():
            assert por_plan[plan]["total"] == esperado

        # El cruce hermano de los 3 motores debe elevar la cobertura financiera y física
        assert por_plan["PDD_2024_2027"]["con_aprop"] >= 900
        assert por_plan["PDD_2024_2027"]["con_avance"] >= 900
        assert por_plan["PDD_2020_2023"]["con_aprop"] >= 700
        assert por_plan["PDD_2020_2023"]["con_avance"] >= 700
        assert sum(r["con_cruce_hermano"] for r in por_plan.values()) >= 1500

    asyncio.run(_check())


def test_preservacion_estricta_ceros_observados_vs_none_en_8_planes() -> None:
    """Verifica que los ceros observados (0.0) se preserven sin confundirse con None."""
    assert _to_float_preserve_zero(0) == 0.0
    assert _to_float_preserve_zero("0.0") == 0.0
    assert _to_float_preserve_zero("0,00%") == 0.0
    assert _to_float_preserve_zero(None) is None
    assert _to_float_preserve_zero("ND") is None

    async def _check_db_zeros() -> None:
        engine = create_async_engine(_resolver_url_bd_csh())
        try:
            async with engine.connect() as conn:
                zeros_count = (
                    await conn.execute(
                        text(
                            """
                        SELECT COUNT(*)
                        FROM seguimiento.pdd_vinculos_meta_pa_triada
                        WHERE ceros_observados_preservados IS TRUE
                        """
                        )
                    )
                ).scalar()
        finally:
            await engine.dispose()
        assert int(zeros_count or 0) > 0

    asyncio.run(_check_db_zeros())
