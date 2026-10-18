"""Pruebas unitarias deterministas para pdt_nodos_espacial_predictivo.py [22B].

Verifica:
1. Econometría espacial en GeoPandas/Shapely (EPSG:3116, pesos Queen Voronoi + k-NN,
   I de Moran Global/Bivariado, LISA Local y Trampas Territoriales de Gestión Pública).
2. Desagregación territorial auditable de Cartagena con las 15 UCG de barrios_cartagena.json.
3. Manejo limpio de ausencia de datos espaciales sin fabricar geometrías.
4. Pronóstico de series temporales con ARIMA(1,0,0) / OLS en statsmodels e índice ISRI.
5. Prueba de ruptura estructural de Chow (corte 2024) y modelo VAR(1) macro-sectorial.
6. Matriz de Evaluación Multisectorial GBR para los 5 sectores prioritarios canónicos.
"""

from __future__ import annotations

import pytest

from app.modules.compromisos.pdt_nodos_espacial_predictivo import (
    SECTORES_PRIORITARIOS_GBR,
    ejecutar_analitica_predictiva_pdt,
    ejecutar_econometria_espacial_pdt,
    evaluar_matriz_multisectorial_gbr,
)


def test_econometria_espacial_geopandas_queen_knn_moran_lisa_y_trampas() -> None:
    """Verifica cálculo de I de Moran Global (k-NN y Queen), Moran Bivariado, LISA y
    detección de Trampas Territoriales al cruzar Coldspots con DMUs ineficientes DEA.
    """
    territories = [
        # Clúster Norte (Valores altos -> Hotspots)
        {
            "codigo": "Z-N1",
            "nombre": "Zona Norte 1",
            "lon": -75.550,
            "lat": 10.440,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 96.5,
            "inversion_per_capita_cop": 850000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        {
            "codigo": "Z-N2",
            "nombre": "Zona Norte 2",
            "lon": -75.548,
            "lat": 10.438,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 94.8,
            "inversion_per_capita_cop": 820000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        {
            "codigo": "Z-N3",
            "nombre": "Zona Norte 3",
            "lon": -75.552,
            "lat": 10.436,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 93.2,
            "inversion_per_capita_cop": 790000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        {
            "codigo": "Z-N4",
            "nombre": "Zona Norte 4",
            "lon": -75.546,
            "lat": 10.442,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 95.1,
            "inversion_per_capita_cop": 830000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        # Clúster Suroriental (Valores bajos -> Coldspots)
        {
            "codigo": "Z-S1",
            "nombre": "Zona Sur Ciénaga 1",
            "lon": -75.460,
            "lat": 10.360,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 32.0,
            "inversion_per_capita_cop": 210000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        {
            "codigo": "Z-S2",
            "nombre": "Zona Sur Ciénaga 2",
            "lon": -75.458,
            "lat": 10.358,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 29.5,
            "inversion_per_capita_cop": 195000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        {
            "codigo": "Z-S3",
            "nombre": "Zona Sur Ciénaga 3",
            "lon": -75.462,
            "lat": 10.362,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 31.2,
            "inversion_per_capita_cop": 205000.0,
            "fuente_datos": "DANE-SISBEN",
        },
        {
            "codigo": "Z-S4",
            "nombre": "Zona Sur Ciénaga 4",
            "lon": -75.456,
            "lat": 10.356,
            "nombre_indicador": "Cobertura Acueducto (%)",
            "valor": 28.4,
            "inversion_per_capita_cop": 180000.0,
            "fuente_datos": "DANE-SISBEN",
        },
    ]

    result = ejecutar_econometria_espacial_pdt(
        territory_records=territories,
        unidades_ineficientes_dea=["Secretaría de Zona Sur Ciénaga 1", "Entidad Norte Eficiente"],
        permutations=399,
    )

    assert result["estado"] == "ESTIMADO_GEOPANDAS_LISA"
    assert result["n"] == 8
    assert result["crs_origen"] == "EPSG:4326"
    assert result["crs_proyectado"] == "EPSG:3116"
    assert result["moran_global_i"] is not None and result["moran_global_i"] > 0.4
    assert result["moran_global_queen_i"] is not None
    assert result["moran_bivariado_xy"] is not None and result["moran_bivariado_xy"] > 0.3
    assert result["valor_esperado_e_i"] == pytest.approx(-1.0 / 7.0, rel=1e-4)
    assert result["p_valor_permutacion"] < 0.05
    assert result["patron_espacial_significativo"] is True
    assert len(result["lisa"]) == 8
    assert result["coldspots"] or result["coldspots_exploratorios"]
    assert all(
        row["significancia_estadistica"] in {"SIGNIFICATIVO_P_005", "EXPLORATORIO_NO_SIGNIFICATIVO"}
        for row in result["lisa"]
    )
    assert all("naturaleza_dato" in row and "sentido_indicador" in row for row in result["lisa"])
    assert result["trampas_territoriales_gestion_publica"] == [] or all(
        row["estado_vinculo"] == "VINCULO_ACREDITADO"
        for row in result["trampas_territoriales_gestion_publica"]
    )
    assert (
        result["hipotesis_trampas_territoriales"] or result["trampas_territoriales_gestion_publica"]
    )


def test_econometria_espacial_desagregacion_cartagena_ucg_barrios() -> None:
    """Verifica que cuando se entregan las 3 Localidades de Cartagena (< 15 unidades),
    el nodo desagrega y enriquece automáticamente con las 15 UCG de barrios_cartagena.json.
    """
    cartagena_base = [
        {
            "codigo": "LOC-1",
            "nombre": "Localidad 1 Histórica y del Caribe Norte",
            "lon": -75.535,
            "lat": 10.422,
            "nombre_indicador": "IPM Territorial (%)",
            "valor": 21.4,
            "fuente_datos": "geodatos.indicadores_territorio",
        },
        {
            "codigo": "LOC-2",
            "nombre": "Localidad 2 De la Virgen y Turística",
            "lon": -75.485,
            "lat": 10.408,
            "nombre_indicador": "IPM Territorial (%)",
            "valor": 45.2,
            "fuente_datos": "geodatos.indicadores_territorio",
        },
        {
            "codigo": "LOC-3",
            "nombre": "Localidad 3 Industrial y de la Bahía",
            "lon": -75.482,
            "lat": 10.368,
            "nombre_indicador": "IPM Territorial (%)",
            "valor": 33.8,
            "fuente_datos": "geodatos.indicadores_territorio",
        },
    ]

    result = ejecutar_econometria_espacial_pdt(
        territory_records=cartagena_base,
        unidades_ineficientes_dea=["Secretaría de Educación Pública"],
        permutations=199,
    )

    assert result["estado"] == "ESTIMADO_GEOPANDAS_LISA"
    assert result["desagregacion_ucg_cartagena"] is True
    assert result["n"] >= 15
    assert result["moran_global_i"] is not None
    assert len(result["lisa"]) == result["n"]
    assert any(
        item["naturaleza_dato"] == "DERIVADO_HEURISTICO"
        for item in result["indicadores_evaluados_multidimensional"]
    )
    assert all(
        row["estado_vinculo"] == "VINCULO_ACREDITADO"
        for row in result["trampas_territoriales_gestion_publica"]
    )


def test_econometria_espacial_sin_datos_retorna_pendiente() -> None:
    """Verifica que ante una lista vacía no se fabrican geometrías ni estadísticos."""
    result = ejecutar_econometria_espacial_pdt(territory_records=[], unidades_ineficientes_dea=[])
    assert result["estado"] == "PENDIENTE_GEOMETRIAS_O_INDICADORES"
    assert result["n"] == 0
    assert result["moran_global_i"] is None
    assert result["lisa"] == []
    assert result["trampas_territoriales_gestion_publica"] == []


def test_analitica_predictiva_arima_statsmodels_e_isri_alto_riesgo() -> None:
    """Verifica el ajuste ARIMA(1,0,0) con statsmodels y el cálculo del ISRI (> 0.40 activa
    la bandera 'Alto Riesgo de Incumplimiento', <= 0.40 no activa bandera).
    """
    records = []
    # Serie 1: Estancada alrededor de 42% con meta 100% -> Alto Riesgo de Incumplimiento
    stagnant_vals = [40.0, 41.2, 42.0, 41.5, 42.8, 43.1, 42.5, 43.0]
    for idx, yr in enumerate(range(2018, 2026)):
        records.append(
            {
                "indicador": "Cobertura de Saneamiento Básico Rural",
                "entidad_normalizada": "EPAC Medio Ambiente",
                "linea_estrategica": "Medio Ambiente y Agua",
                "vigencia": yr,
                "avance_estrategico_pct": stagnant_vals[idx],
                "meta_programada_anual": 95.0,
            }
        )

    # Serie 2: Crecimiento sostenido hacia 98% con meta 85% -> Bajo riesgo
    growing_vals = [72.0, 76.5, 81.0, 85.2, 89.0, 92.5, 95.8, 98.4]
    for idx, yr in enumerate(range(2018, 2026)):
        records.append(
            {
                "indicador": "Tasa de Cobertura Neta Escolar",
                "entidad_normalizada": "Secretaría de Educación",
                "linea_estrategica": "Educación Pública Incluyente",
                "vigencia": yr,
                "avance_estrategico_pct": growing_vals[idx],
                "meta_programada_anual": 85.0,
            }
        )

    result = ejecutar_analitica_predictiva_pdt(
        normalized_records=records,
        time_horizon="2024-2027",
        isri_threshold=0.40,
    )

    assert result["estado"] == "ESTIMADO"
    assert result["series_evaluadas"] >= 2
    by_ind = {item["indicador"]: item for item in result["series"]}

    high_risk = by_ind["Cobertura de Saneamiento Básico Rural"]
    assert "statsmodels" in high_risk["modelo_aplicado"]
    assert high_risk["ISRI"] > 0.40
    assert high_risk["bandera"] == "Alto Riesgo de Incumplimiento"
    assert len(high_risk["pronostico_arima_var"]["ic_95"]) == 2

    low_risk = by_ind["Tasa de Cobertura Neta Escolar"]
    assert low_risk["ISRI"] < 0.40
    assert low_risk["bandera"] is None


def test_analitica_predictiva_chow_ruptura_estructural_2024_y_var_macrosectorial() -> None:
    """Verifica que la prueba de Chow detecta una ruptura estructural en 2024 y que el
    modelo VAR(1) macro-sectorial de statsmodels genera pronósticos multivariados.
    """
    records = []
    # Serie con quiebre estructural fuerte en 2024 (2019-2023 plana ~30%, 2024-2026 salta a ~85%)
    pre_post = {
        2019: 29.5,
        2020: 30.1,
        2021: 30.4,
        2022: 29.9,
        2023: 30.2,
        2024: 82.0,
        2025: 88.5,
        2026: 94.0,
    }
    for yr, val in pre_post.items():
        records.append(
            {
                "indicador": "Km de vías secundarias intervenidas",
                "entidad_normalizada": "Secretaría de Infraestructura Vial",
                "linea_estrategica": "Infraestructura Vial y Movilidad",
                "vigencia": yr,
                "avance_estrategico_pct": val,
                "meta_programada_anual": 90.0,
            }
        )
        records.append(
            {
                "indicador": "Cobertura de inmunización infantil",
                "entidad_normalizada": "DADIS Salud Pública",
                "linea_estrategica": "Salud Pública y Bienestar",
                "vigencia": yr,
                "avance_estrategico_pct": 55.0 + (yr - 2019) * 4.2,
                "meta_programada_anual": 92.0,
            }
        )

    result = ejecutar_analitica_predictiva_pdt(
        normalized_records=records,
        time_horizon="2024-2027",
    )

    by_ind = {item["indicador"]: item for item in result["series"]}
    vial_series = by_ind["Km de vías secundarias intervenidas"]
    chow = vial_series["chow"]
    assert chow["estado"] == "ESTIMADO_STATSMODELS_OLS"
    assert chow["anio_ruptura"] == 2024
    assert chow["estadistico_f"] is not None and chow["estadistico_f"] > 10.0
    assert chow["p_valor"] is not None and chow["p_valor"] < 0.05
    assert chow["ruptura_estructural_significativa"] is True
    assert result["rupturas_estructurales_detectadas"] >= 1

    var_info = result["modelo_var_macrosectorial"]
    assert var_info["estado"] in {"ESTIMADO_VAR_STATSMODELS", "ESTIMADO_COVARIANZA_DINAMICA"}
    assert len(var_info["pronosticos_var"]) >= 2


def test_evaluar_matriz_multisectorial_gbr_cinco_sectores_canonicos() -> None:
    """Verifica la generación de la Matriz de Evaluación Multisectorial para los 5 sectores
    prioritarios bajo GBR con cruce de metas, actividades, presupuesto, DEA, NLP e ISRI.
    """
    goals = [
        {
            "nombre": "Ampliar la cobertura escolar docente en colegios oficiales",
            "indicador": "Cobertura escolar",
        },
        {
            "nombre": "Reducir la mortalidad materna en hospitales locales",
            "indicador": "Mortalidad materna",
        },
        {"nombre": "Pavimentación de carretera y movilidad vial", "indicador": "Km de vía"},
        {
            "nombre": "Asistencia técnica a productores agrícolas y campesinos",
            "indicador": "Hectárea productiva",
        },
        {
            "nombre": "Control de deforestación y saneamiento ambiental",
            "indicador": "Toneladas carbono",
        },
    ]
    activities = [
        {
            "entidad_responsable": "Sec Educación",
            "descripcion_actividad": "Dotación escolar estudiante",
        },
        {
            "entidad_responsable": "DADIS Salud",
            "descripcion_actividad": "Campaña de inmunización hospital",
        },
    ]
    normalized = [
        {
            "entidad_normalizada": "Secretaría de Educación",
            "linea_estrategica": "Educación Pública",
            "indicador": "Tasa de cobertura escolar",
            "apropiacion_definitiva_cop": 1500000000.0,
            "compromisos_rp_cop": 1350000000.0,
            "avance_estrategico_pct": 88.0,
        },
        {
            "entidad_normalizada": "DADIS Salud",
            "linea_estrategica": "Salud Pública",
            "indicador": "Cobertura de inmunización",
            "apropiacion_definitiva_cop": 900000000.0,
            "compromisos_rp_cop": 810000000.0,
            "avance_estrategico_pct": 79.5,
        },
    ]
    dea_scores = {
        "dmus": [
            {"dmu": "Secretaría de Educación", "theta_bcc": 0.94},
            {"dmu": "DADIS Salud", "theta_bcc": 0.87},
        ]
    }
    nlp_coherence = {
        "resumen_coherencia": {"similaridad_promedio": 0.68},
        "pares_evaluados": [
            {
                "meta_estrategica": "cobertura escolar docente",
                "actividad_operativa": "dotación escolar estudiante",
                "similaridad_coseno_lexica": 0.74,
            }
        ],
    }
    spatial_lisa = {"coldspots": ["UCG 6 (Localidad 2)"]}
    time_series_forecast = {
        "series": [
            {"indicador": "Tasa de cobertura escolar", "ISRI": 0.18},
            {"indicador": "Cobertura de inmunización", "ISRI": 0.52},
        ]
    }

    matrix = evaluar_matriz_multisectorial_gbr(
        goal_records=goals,
        activity_records=activities,
        normalized_records=normalized,
        dea_scores=dea_scores,
        nlp_coherence=nlp_coherence,
        spatial_lisa=spatial_lisa,
        time_series_forecast=time_series_forecast,
    )

    assert len(matrix) == 5
    sector_names = [row["sector"] for row in matrix]
    assert sector_names == [s["sector"] for s in SECTORES_PRIORITARIOS_GBR]

    by_sector = {row["sector"]: row for row in matrix}
    edu = by_sector["Educación Pública"]
    assert edu["metas_asociadas"] >= 1
    assert edu["actividades_asociadas"] >= 1
    assert edu["presupuesto_apropiado_cop"] == 1500000000.0
    assert edu["eficiencia_dea_promedio"] == pytest.approx(0.94)
    assert edu["riesgo_isri_promedio"] == pytest.approx(0.18)
    assert edu["estado_auditoria_gbr"] == "CONFORME_MONITOREADO_GBR"

    salud = by_sector["Salud Pública"]
    assert salud["riesgo_isri_promedio"] == pytest.approx(0.52)
    assert salud["estado_auditoria_gbr"] == "ALTO_RIESGO_INCUMPLIMIENTO_ISRI"


def test_econometria_espacial_geojson_geom_poligonal_queen_exacta() -> None:
    """Verifica el soporte de polígonos reales PostGIS (geojson_geom MultiPolygon),
    contigüidad Queen exacta en EPSG:3116 (incluyendo tolerancia de 15m para canales)
    y el resumen multidimensional de indicadores.
    """
    import json

    from shapely.geometry import MultiPolygon, box, mapping

    # Malla de 6 polígonos adyacentes en coordenadas de Cartagena
    base_lon, base_lat = -75.520, 10.400
    step = 0.008
    records = []
    vals_ipm = [62.0, 59.5, 58.0, 18.0, 15.5, 14.0]
    vals_inv = [1250000.0, 1310000.0, 1280000.0, 2150000.0, 2240000.0, 2310000.0]

    for idx in range(6):
        col = idx % 3
        row = idx // 3
        # Separación de ~5 metros (0.00004 grados) en fila 1 para probar tolerancia de canales (15m)
        gap = 0.00004 if row == 1 else 0.0
        minx = base_lon + col * step
        miny = base_lat + row * (step + gap)
        poly = MultiPolygon([box(minx, miny, minx + step, miny + step)])
        geojson_str = json.dumps(mapping(poly))
        cx, cy = minx + step / 2.0, miny + step / 2.0

        records.append(
            {
                "codigo": f"UCG-TEST-{idx + 1:02d}",
                "nombre": f"UCG Experimental {idx + 1}",
                "tipo_territorio": "ucg",
                "lon": cx,
                "lat": cy,
                "geojson_geom": geojson_str,
                "codigo_indicador": "IND_REZAGO_ESTRUCTURAL_IPM",
                "nombre_indicador": "Índice de Rezago Estructural y Presión Social Territorial",
                "valor": vals_ipm[idx],
                "fuente_datos": "PostGIS Test",
            }
        )
        records.append(
            {
                "codigo": f"UCG-TEST-{idx + 1:02d}",
                "nombre": f"UCG Experimental {idx + 1}",
                "tipo_territorio": "ucg",
                "lon": cx,
                "lat": cy,
                "geojson_geom": geojson_str,
                "codigo_indicador": "IND_INVERSION_PER_CAPITA_PDT_COP",
                "nombre_indicador": "Inversión Pública Territorial Estimada per Cápita",
                "valor": vals_inv[idx],
                "fuente_datos": "PostGIS Test",
            }
        )

    result = ejecutar_econometria_espacial_pdt(
        territory_records=records,
        unidades_ineficientes_dea=["Entidad UCG Experimental 5"],
        permutations=199,
    )

    assert result["estado"] == "ESTIMADO_GEOPANDAS_LISA"
    assert result["poligonos_reales_postgis"] == 6
    assert result["tolerancia_queen_canales_m"] == 15.0
    assert "ST_MultiPolygon PostGIS" in result["matriz_pesos"]
    assert len(result["indicadores_evaluados_multidimensional"]) == 2
    assert all(row["vecinos_queen"] >= 2 for row in result["lisa"])
    assert result["moran_bivariado_xy"] != 0.0


def test_postgis_bd_csh_29_territorios_multipolygon_y_116_indicadores() -> None:
    """Verifica contra bd_csh que geodatos.territorios tenga >= 29 territorios sub-distritales
    con ST_MultiPolygon (incluyendo las 15 UCGs) y >= 116 indicadores en
    geodatos.indicadores_territorio, y que ejecutar_econometria_espacial_pdt procese los
    polígonos reales y los 4 indicadores oficiales.
    """
    import asyncio

    from sqlalchemy import text
    from sqlalchemy.engine import make_url
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.core.config import Settings
    from scripts.poblar_geodatos_territorios_pdt import (
        poblar_geodatos_territorios_e_indicadores,
    )

    async def _fetch_from_postgis() -> list[dict[str, object]]:
        bd_csh_url = (
            make_url(Settings().async_database_url)
            .set(database="bd_csh")
            .render_as_string(hide_password=False)
        )
        engine = create_async_engine(bd_csh_url, pool_pre_ping=True)
        try:
            summary = await poblar_geodatos_territorios_e_indicadores(engine)
            assert summary["territorios_sub_distritales"] >= 29
            assert summary["total_ucgs"] == 15
            assert summary["total_indicadores_territorio"] >= 116
            async with engine.connect() as conn:
                counts = (
                    await conn.execute(
                        text(
                            """
                            SELECT
                                COUNT(*) FILTER (
                                    WHERE tipo_territorio <> 'distrito'
                                ) AS sub_distritales,
                                COUNT(*) FILTER (WHERE tipo_territorio = 'ucg') AS total_ucgs,
                                COUNT(*) FILTER (
                                    WHERE tipo_territorio <> 'distrito'
                                      AND ST_GeometryType(geometria) = 'ST_MultiPolygon'
                                ) AS sub_multipolygons,
                                (
                                    SELECT COUNT(*) FROM geodatos.indicadores_territorio
                                ) AS total_ind
                            FROM geodatos.territorios
                            """
                        )
                    )
                ).fetchone()
                assert counts is not None
                assert int(counts.sub_distritales) >= 29
                assert int(counts.total_ucgs) == 15
                assert int(counts.sub_multipolygons) >= 29
                assert int(counts.total_ind) >= 116

                rows = (
                    await conn.execute(
                        text(
                            """
                            SELECT t.codigo, t.nombre, t.tipo_territorio,
                                   t.poblacion_estimada,
                                   ST_X(COALESCE(t.centroide, ST_Centroid(t.geometria))) AS lon,
                                   ST_Y(COALESCE(t.centroide, ST_Centroid(t.geometria))) AS lat,
                                   ST_AsGeoJSON(
                                       ST_SimplifyPreserveTopology(t.geometria, 0.0003)
                                   ) AS geojson_geom,
                                   i.codigo_indicador,
                                   i.nombre_indicador,
                                   i.valor::float AS valor,
                                   i.anio_corte,
                                   i.fuente_datos
                            FROM geodatos.territorios t
                            JOIN geodatos.indicadores_territorio i ON i.territorio_id = t.id
                            WHERE t.tipo_territorio <> 'distrito'
                            ORDER BY t.codigo, i.codigo_indicador
                            """
                        )
                    )
                ).fetchall()
                return [dict(r._mapping) for r in rows]
        finally:
            await engine.dispose()

    records = asyncio.run(_fetch_from_postgis())
    spatial_res = ejecutar_econometria_espacial_pdt(
        territory_records=records,
        unidades_ineficientes_dea=["Secretaría de Educación Pública"],
        permutations=199,
    )
    assert spatial_res["estado"] == "ESTIMADO_GEOPANDAS_LISA"
    assert spatial_res["n"] >= 29
    assert spatial_res["poligonos_reales_postgis"] >= 29
    assert len(spatial_res["indicadores_evaluados_multidimensional"]) == 4
    codigos_eval = {
        item["codigo_indicador"] for item in spatial_res["indicadores_evaluados_multidimensional"]
    }
    assert codigos_eval == {
        "IND_DENSIDAD_PROGRAMATICA_PDT",
        "IND_INVERSION_PER_CAPITA_PDT_COP",
        "IND_AVANCE_FISICO_TERRITORIAL_PCT",
        "IND_REZAGO_ESTRUCTURAL_IPM",
    }


def test_isri_usa_sentido_opuesto_y_holdout_para_series_porcentuales(monkeypatch):
    from app.modules.compromisos import pdt_nodos_espacial_predictivo as spatial

    def fixed_forecast(years, values, final_year, use_arima=True):
        return {
            "estado": "ESTIMADO_TEST",
            "forecast": 70.0,
            "sigma": 10.0,
            "modelo_aplicado": "test",
            "aic": None,
            "bic": None,
        }

    monkeypatch.setattr(spatial, "_fit_arima_or_ols_series", fixed_forecast)
    records = []
    for year, value in zip(range(2020, 2024), (40.0, 45.0, 50.0, 55.0), strict=True):
        for indicator in ("mortalidad infantil", "cobertura educativa"):
            records.append(
                {
                    "indicador": indicator,
                    "entidad_normalizada": "Entidad prueba",
                    "vigencia": year,
                    "avance_estrategico_pct": value,
                    "meta_programada_anual": 60.0,
                }
            )
    result = ejecutar_analitica_predictiva_pdt(records, time_horizon="2024-2027")
    by_name = {item["indicador"]: item for item in result["series"]}
    mortality = by_name["mortalidad infantil"]
    coverage = by_name["cobertura educativa"]
    assert mortality["sentido_indicador"] == "REDUCCION"
    assert coverage["sentido_indicador"] == "INCREMENTO"
    assert mortality["unidad_meta"] == coverage["unidad_meta"] == "PORCENTAJE"
    assert mortality["probabilidad_cumplimiento"] < coverage["probabilidad_cumplimiento"]
    assert mortality["validacion_temporal_holdout"]["mae_holdout"] is not None
    assert "naive_last_value" in mortality["validacion_temporal_holdout"]
