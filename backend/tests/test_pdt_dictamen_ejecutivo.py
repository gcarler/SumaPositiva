"""Pruebas de cobertura PPI plurianual y dictamen ejecutivo PDT."""

import asyncio

from shapely.geometry import Polygon

from app.modules.compromisos import pdt_ai_evaluator_graph as evaluator
from app.modules.compromisos import pdt_dictamen_ejecutivo as dictamen
from app.modules.compromisos import router


def test_ppi_desagregado_cubre_2012_2027_y_prioriza_apropiacion_observada():
    plans = [
        {
            "codigo_plan": "PDD_2012_2015",
            "ppi_anual_cop": {str(y): 100 + y for y in range(2012, 2016)},
        },
        {
            "codigo_plan": "PDD_2013_2015",
            "ppi_anual_cop": {str(y): 200 + y for y in range(2013, 2016)},
        },
        {
            "codigo_plan": "PDD_2016_2019",
            "ppi_anual_cop": {str(y): 300 + y for y in range(2016, 2020)},
        },
        {
            "codigo_plan": "PDD_2020_2023",
            "ppi_anual_cop": {str(y): 400 + y for y in range(2020, 2024)},
        },
        {
            "codigo_plan": "PDD_2024_2027",
            "ppi_anual_cop": {str(y): 500 + y for y in range(2024, 2028)},
        },
    ]
    state = evaluator._build_state(
        {
            "plans": plans,
            "documents": [],
            "nodes": [],
            "goals": [],
            "activities": [],
            "normalized": [
                {
                    "entidad_normalizada": "Secretaría de Salud",
                    "vigencia": 2022,
                    "apropiacion_definitiva_cop": 900,
                    "meta_programada_anual": 4,
                    "meta_ejecutada_anual": 3,
                }
            ],
            "territories": [],
        },
        "Cartagena",
        "2012-2027",
        "ppi-test",
    )
    by_year = {}
    for row in state["df_financial"]:
        by_year.setdefault(row["vigencia"], []).append(row)
    assert set(range(2012, 2028)) <= set(by_year)
    assert all(row["origen_insumo"] == "ppi_oficial_desagregado_pdd" for row in by_year[2012])
    assert any(row["origen_insumo"] == "apropiacion_definitiva_cop" for row in by_year[2022])
    assert not any(row["origen_insumo"] == "ppi_oficial_desagregado_pdd" for row in by_year[2022])
    assert all(
        "proxy de estructura" in row["fuente_producto"]
        for row in state["df_outputs"]
        if row.get("codigo_plan")
    )


def test_geodataframe_uses_postgis_geojson_polygon():
    polygon = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
    frame = evaluator._to_geodataframe(
        [
            {
                "nombre": "territorio",
                "lon": 0.5,
                "lat": 0.5,
                "geojson_geom": polygon.__geo_interface__,
            }
        ]
    )
    assert frame.crs.to_string() == "EPSG:4326"
    assert frame.geometry.iloc[0].geom_type == "Polygon"


def test_dictamen_incluye_dependencias_sectores_y_markdown():
    report = dictamen.generar_dictamen_ejecutivo_pdt(
        {
            "jurisdiction": "Cartagena",
            "time_horizon": "2024-2027",
            "dea_scores": {
                "modelo": "DEA CCR/BCC",
                "resultados_dmu": [
                    {
                        "dmu": "Secretaría de Salud|2024",
                        "theta_ccr": 0.8,
                        "theta_bcc": 0.9,
                        "SE_o": 0.89,
                        "rendimientos_escala": "IRS",
                        "slacks": {"insumos": [2], "productos": [0]},
                    }
                ],
                "bias_corrected": {
                    "por_dmu": {"Secretaría de Salud|2024": {"ic_95_pct": [0.7, 0.9]}}
                },
                "malmquist": {"pares": []},
            },
            "nlp_coherence": {
                "similaridad_coseno": {"pares_evaluados": 1, "promedio": 0.4},
                "alertas_mission_creep": [
                    {"dependencias": ["Secretaría de Salud"], "actividad_operativa": "Actividad"}
                ],
                "sectores": [],
            },
            "spatial_lisa": {
                "trampas_territoriales_gestion_publica": [{"unidad_dmu": "Secretaría de Salud"}]
            },
            "time_series_forecast": {
                "series": [
                    {"ISRI": 0.5, "entidad": "Secretaría de Salud", "chow": {"estado": "ESTIMADO"}}
                ]
            },
        },
        dependencia="Salud",
        sector="Educación",
    )
    assert report["dictamenes_dependencias"][0]["dependencia"] == "Secretaría de Salud"
    assert report["dictamenes_dependencias"][0]["indicadores_isri_mayor_040"]
    assert "# Dictamen pericial ejecutivo PDT" in report["informe_markdown"]
    assert [row["sector"] for row in report["sintesis_sectores"]] == ["Educación Pública"]


def test_dictamen_endpoint_is_registered_and_returns_schema(monkeypatch):
    async def execute(_db, force_refresh=False):
        assert force_refresh is False
        return {"jurisdiction": "Cartagena", "dea_scores": {"resultados_dmu": []}}

    monkeypatch.setattr(router, "_cargar_pdt_ai_evaluator_fns", lambda: (None, execute, None))
    result = asyncio.run(
        router.pdt_ai_evaluator_dictamen_ejecutivo(
            object(), dependencia=None, sector=None, force_refresh=False
        )
    )
    assert result["resumen_ejecutivo"].startswith("Dictamen PDT para Cartagena")
    route_paths = {route.path for route in router.router.routes}
    assert any(
        path.endswith("/triada/pdd-dea/pdt-ai-evaluator/dictamen-ejecutivo") for path in route_paths
    )


def test_isri_sin_entidad_no_se_asigna_a_todas_las_dependencias():
    diagnostic = {
        "jurisdiction": "Cartagena",
        "dea_scores": {
            "resultados_dmu": [
                {"dmu": "Secretaría de Salud|2024", "theta_bcc": 0.8},
                {"dmu": "Secretaría de Educación|2024", "theta_bcc": 0.9},
            ]
        },
        "time_series_forecast": {
            "series": [
                {"indicador": "cobertura", "ISRI": 0.8},
                {"indicador": "Entidad Ejecutora: Secretaría de Salud", "ISRI": 0.7},
            ]
        },
    }
    report = dictamen.generar_dictamen_ejecutivo_pdt(diagnostic)
    assert report["total_indicadores_isri_sin_atribucion"] == 1
    assert report["indicadores_isri_sin_atribucion"][0]["indicador"] == "cobertura"
    by_dependency = {row["dependencia"]: row for row in report["dictamenes_dependencias"]}
    salud = next(row for key, row in by_dependency.items() if "salud" in key.casefold())
    educacion = next(row for key, row in by_dependency.items() if "educación" in key.casefold())
    assert len(salud["indicadores_isri_mayor_040"]) == 1
    assert educacion["indicadores_isri_mayor_040"] == []


def test_hoshin_kanri_routes_registered_and_dynamic_functions_called(monkeypatch):
    async def specification():
        return {"version": "test"}

    async def matrix(db, codigo_plan=None, sector=None, dependencia=None, force_refresh=False):
        return {
            "plan": codigo_plan,
            "sector": sector,
            "dependencia": dependencia,
            "refresh": force_refresh,
        }

    monkeypatch.setattr(router, "_cargar_hoshin_kanri_fns", lambda: (specification, matrix))

    async def execute(db, force_refresh=False):
        assert force_refresh is True
        return {"fresh": True}

    monkeypatch.setattr(router, "_cargar_pdt_ai_evaluator_fns", lambda: (None, execute, None))
    spec = asyncio.run(router.pdt_hoshin_kanri_especificacion())
    table = asyncio.run(
        router.pdt_hoshin_kanri_matriz_x(
            object(),
            codigo_plan="PDD_2024_2027",
            sector="Salud",
            dependencia=None,
            force_refresh=True,
        )
    )
    paths = {route.path for route in router.router.routes}
    assert spec == {"version": "test"}
    assert table["plan"] == "PDD_2024_2027" and table["refresh"] is True
    assert any(path.endswith("/hoshin-kanri/especificacion") for path in paths)
    assert any(path.endswith("/hoshin-kanri/matriz-x") for path in paths)
