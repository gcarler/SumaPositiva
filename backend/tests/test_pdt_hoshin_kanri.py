"""Pruebas unitarias e integración para el motor Hoshin Kanri (Matriz X, FAIR y Catchball)."""

from __future__ import annotations

from typing import Any

from app.modules.compromisos.pdt_hoshin_kanri import (
    NIVEL_DEBIL,
    NIVEL_FUERTE,
    NIVEL_MEDIA,
    SEMAFORO_AMARILLO,
    SEMAFORO_ROJO,
    SEMAFORO_VERDE,
    SIMBOLO_DEBIL,
    SIMBOLO_FUERTE,
    SIMBOLO_MEDIA,
    clasificar_correlacion_este_sur,
    clasificar_correlacion_simbolo,
    clasificar_semaforo_bowling_chart,
    construir_matriz_x_hoshin_kanri_pdt,
    obtener_especificacion_hoshin_kanri_pdt,
)


def _payload_sintetico_hoshin() -> dict[str, Any]:
    return {
        "motor": "PDT-AI-EVALUATOR",
        "jurisdiction": "Distrito Turístico y Cultural de Cartagena de Indias",
        "time_horizon": "2024-2027",
        "total_budget": 4_000_000_000_000.0,
        "trazabilidad_fuentes": {
            "seguimiento.pdd_lineas_y_programas": 120,
            "seguimiento.pdd_metas_oficiales": 450,
            "seguimiento.actividades_plan_accion": 80,
            "seguimiento.registros_triada_normalizados": 1500,
            "geodatos.territorios_con_indicadores": 116,
        },
        "dea_scores": {
            "resultados_dmu": [
                {
                    "dmu": "Secretaría de Educación|2024",
                    "theta_ccr": 0.85,
                    "theta_bcc": 0.90,
                    "SE_o": 0.9444,
                    "rendimientos_escala": "IRS",
                    "slacks": {"insumos": [0.0], "productos": [0.0, 0.0]},
                },
                {
                    "dmu": "Secretaría de Salud|2024",
                    "theta_ccr": 0.55,
                    "theta_bcc": 0.65,
                    "SE_o": 0.8461,
                    "rendimientos_escala": "DRS",
                    "slacks": {"insumos": [10.0], "productos": [0.0, 1.5]},
                },
                {
                    "dmu": "Secretaría de Infraestructura|2025",
                    "theta_ccr": 0.25,
                    "theta_bcc": 0.35,
                    "SE_o": 0.7143,
                    "rendimientos_escala": "IRS",
                    "slacks": {"insumos": [50.0], "productos": [2.0, 3.0]},
                },
            ],
            "malmquist": {
                "pares": [
                    {
                        "unidad": "Secretaría de Educación",
                        "periodo_t": 2024,
                        "periodo_t1": 2025,
                        "Techch": 1.04,
                        "Pech": 1.02,
                        "MPI": 1.0608,
                    }
                ]
            },
        },
        "nlp_coherence": {
            "similaridad_coseno": {
                "pares_evaluados": 30,
                "promedio": 0.58,
                "muestra": [
                    {
                        "codigo_plan": "PDD_2024_2027",
                        "codigo_meta": "ME.01",
                        "meta_estrategica": (
                            "Ampliar cobertura educativa preescolar y media técnica"
                        ),
                        "actividad_operativa": (
                            "Dotación y mejoramiento de aulas escolares oficiales"
                        ),
                        "dependencias": ["Secretaría de Educación"],
                        "similaridad_coseno_lexica": 0.78,
                    },
                    {
                        "codigo_plan": "PDD_2024_2027",
                        "codigo_meta": "MS.02",
                        "meta_estrategica": (
                            "Reducir mortalidad materna y fortalecer atención primaria"
                        ),
                        "actividad_operativa": "Jornadas preventivas de salud familiar en barrios",
                        "dependencias": ["Secretaría de Salud"],
                        "similaridad_coseno_lexica": 0.54,
                    },
                    {
                        "codigo_plan": "PDD_2024_2027",
                        "codigo_meta": "MI.03",
                        "meta_estrategica": "Rehabilitar malla vial arterial y puentes urbanos",
                        "actividad_operativa": "Suministro de papelería y apoyo logístico menor",
                        "dependencias": ["Secretaría de Infraestructura"],
                        "similaridad_coseno_lexica": 0.22,
                    },
                ],
            },
            "alertas_mission_creep": [
                {
                    "codigo_plan": "PDD_2024_2027",
                    "codigo_meta": "MI.03",
                    "meta_estrategica": "Rehabilitar malla vial arterial y puentes urbanos",
                    "actividad_operativa": "Suministro de papelería y apoyo logístico menor",
                    "dependencias": ["Secretaría de Infraestructura"],
                    "similaridad_coseno_lexica": 0.22,
                }
            ],
        },
        "spatial_lisa": {
            "poligonos_reales_postgis": 29,
            "coldspots": ["Centro Histórico y San Diego"],
            "trampas_territoriales_gestion_publica": [
                {
                    "unidad_dmu": "Secretaría de Infraestructura|2025",
                    "coldspot_asociado": "Centro Histórico y San Diego",
                    "alerta": "Trampa Territorial de Gestión Pública",
                }
            ],
        },
        "time_series_forecast": {
            "series": [
                {
                    "indicador": "Entidad Ejecutora: Secretaría de Educación",
                    "serie": [{"vigencia": 2024, "valor": 88.0}, {"vigencia": 2025, "valor": 91.0}],
                    "pronostico_arima_var": {"vigencia": 2027, "valor": 93.0},
                    "meta_cuatrienio": 100.0,
                    "ISRI": 0.15,
                    "chow": {"ruptura_estructural_significativa": False},
                },
                {
                    "indicador": "Entidad Ejecutora: Secretaría de Salud",
                    "serie": [{"vigencia": 2024, "valor": 70.0}, {"vigencia": 2025, "valor": 74.0}],
                    "pronostico_arima_var": {"vigencia": 2027, "valor": 76.0},
                    "meta_cuatrienio": 100.0,
                    "ISRI": 0.32,
                    "chow": {"ruptura_estructural_significativa": False},
                },
                {
                    "indicador": "Entidad Ejecutora: Secretaría de Infraestructura",
                    "serie": [{"vigencia": 2024, "valor": 40.0}, {"vigencia": 2025, "valor": 35.0}],
                    "pronostico_arima_var": {"vigencia": 2027, "valor": 32.0},
                    "meta_cuatrienio": 100.0,
                    "ISRI": 0.75,
                    "chow": {"ruptura_estructural_significativa": True},
                },
            ]
        },
        "evaluacion_multisectorial": [
            {
                "sector": "Educación Pública",
                "indicadores_mir": ["Tasa de cobertura neta"],
                "metas_asociadas": 120,
                "presupuesto_apropiado_cop": 1_200_000_000_000.0,
                "presupuesto_ejecutado_cop": 1_050_000_000_000.0,
                "avance_fisico_promedio_pct": 89.0,
                "riesgo_isri_promedio": 0.15,
                "estado_auditoria_gbr": "EN_META",
            },
            {
                "sector": "Salud Pública",
                "indicadores_mir": ["Cobertura vacunación"],
                "metas_asociadas": 95,
                "presupuesto_apropiado_cop": 950_000_000_000.0,
                "presupuesto_ejecutado_cop": 760_000_000_000.0,
                "avance_fisico_promedio_pct": 74.0,
                "riesgo_isri_promedio": 0.32,
                "estado_auditoria_gbr": "SEGUIMIENTO_PREVENTIVO",
            },
            {
                "sector": "Infraestructura Vial",
                "indicadores_mir": ["Km carril rehabilitados"],
                "metas_asociadas": 60,
                "presupuesto_apropiado_cop": 800_000_000_000.0,
                "presupuesto_ejecutado_cop": 320_000_000_000.0,
                "avance_fisico_promedio_pct": 35.0,
                "riesgo_isri_promedio": 0.75,
                "estado_auditoria_gbr": "ALTO_RIESGO_INCUMPLIMIENTO_ISRI",
            },
        ],
    }


def test_obtener_especificacion_hoshin_kanri_pdt() -> None:
    spec = obtener_especificacion_hoshin_kanri_pdt()

    # 1. Marco FAIR
    assert set(spec["marco_fair"].keys()) == {"Focus", "Alignment", "Integration", "Review"}
    for dim in spec["marco_fair"].values():
        assert "traduccion_gbr_dnp" in dim
        assert len(dim["metricas_pdt_ai_evaluator"]) >= 2

    # 2. Estructura Matriz X (4 cuadrantes y 4 esquinas)
    cuadrantes = spec["estructura_matriz_x"]["cuadrantes"]
    assert set(cuadrantes.keys()) == {
        "sur_objetivos_ruptura",
        "oeste_objetivos_anuales",
        "norte_prioridades_proyectos_bpim",
        "este_kpis_y_responsables",
    }
    esquinas = spec["estructura_matriz_x"]["matrices_correlacion_esquinas"]
    assert set(esquinas.keys()) == {"sur_oeste", "oeste_norte", "norte_este", "este_sur"}
    simbologia = spec["estructura_matriz_x"]["simbologia_estandar"]
    assert set(simbologia.keys()) == {SIMBOLO_FUERTE, SIMBOLO_MEDIA, SIMBOLO_DEBIL}

    # 3. Gobernanza operativa y 7 pasos
    assert "catchball_nemawashi" in spec["gobernanza_operativa"]
    assert "bowling_charts_pdca" in spec["gobernanza_operativa"]
    assert len(spec["ciclo_7_pasos"]) == 7
    assert [p["paso"] for p in spec["ciclo_7_pasos"]] == [1, 2, 3, 4, 5, 6, 7]

    # 4. Comparativa SMART vs OKR vs Hoshin Kanri
    comparativa = spec["comparativa_enfoques"]
    dimensiones = {fila["dimension"] for fila in comparativa}
    assert dimensiones == {"Cadencia", "Ambición", "Alineación", "Propósito"}
    for fila in comparativa:
        assert fila["SMART_Tradicional"]
        assert fila["OKRs"]
        assert fila["Hoshin_Kanri_Matriz_X"]


def test_clasificacion_simbologia_cuatro_esquinas() -> None:
    # Esquina Oeste-Norte (NLP Coseno: >= 0.65 ●, [0.45, 0.65) ○, < 0.45 △)
    assert clasificar_correlacion_simbolo(0.72, 0.65, 0.45) == (SIMBOLO_FUERTE, NIVEL_FUERTE)
    assert clasificar_correlacion_simbolo(0.50, 0.65, 0.45) == (SIMBOLO_MEDIA, NIVEL_MEDIA)
    assert clasificar_correlacion_simbolo(0.30, 0.65, 0.45) == (SIMBOLO_DEBIL, NIVEL_DEBIL)

    # Esquina Norte-Este (DEA theta_bcc: >= 0.80 ●, [0.50, 0.80) ○, < 0.50 △)
    assert clasificar_correlacion_simbolo(0.85, 0.80, 0.50) == (SIMBOLO_FUERTE, NIVEL_FUERTE)
    assert clasificar_correlacion_simbolo(0.65, 0.80, 0.50) == (SIMBOLO_MEDIA, NIVEL_MEDIA)
    assert clasificar_correlacion_simbolo(0.42, 0.80, 0.50) == (SIMBOLO_DEBIL, NIVEL_DEBIL)

    # Esquina Este-Sur (ISRI y Coldspots LISA)
    assert clasificar_correlacion_este_sur(0.18, en_coldspot_o_trampa=False) == (
        SIMBOLO_FUERTE,
        NIVEL_FUERTE,
        0.82,
    )
    assert clasificar_correlacion_este_sur(0.32, en_coldspot_o_trampa=False) == (
        SIMBOLO_MEDIA,
        NIVEL_MEDIA,
        0.68,
    )
    assert clasificar_correlacion_este_sur(0.55, en_coldspot_o_trampa=False) == (
        SIMBOLO_DEBIL,
        NIVEL_DEBIL,
        0.45,
    )
    # Aunque ISRI sea bajo, estar en Trampa Territorial fuerza alerta △
    assert clasificar_correlacion_este_sur(0.15, en_coldspot_o_trampa=True)[0] == SIMBOLO_DEBIL


def test_semaforo_bowling_charts_pdca() -> None:
    assert clasificar_semaforo_bowling_chart(90.0, 0.15) == SEMAFORO_VERDE
    assert clasificar_semaforo_bowling_chart(72.0, 0.20) == SEMAFORO_AMARILLO
    assert clasificar_semaforo_bowling_chart(88.0, 0.35) == SEMAFORO_AMARILLO
    assert clasificar_semaforo_bowling_chart(55.0, 0.20) == SEMAFORO_ROJO
    assert clasificar_semaforo_bowling_chart(85.0, 0.60) == SEMAFORO_ROJO


def test_construir_matriz_x_con_payload_sintetico() -> None:
    diag = _payload_sintetico_hoshin()
    resultado = construir_matriz_x_hoshin_kanri_pdt(diagnostico=diag)

    # Evaluación FAIR
    fair = resultado["evaluacion_fair"]
    for key in (
        "focus_score",
        "alignment_score",
        "integration_score",
        "review_score",
        "fair_global_index",
    ):
        assert 0.0 <= fair[key] <= 100.0

    # 4 cuadrantes y 4 esquinas
    mx = resultado["matriz_x"]
    assert len(mx["cuadrante_sur_objetivos_ruptura"]) >= 3
    assert len(mx["cuadrante_oeste_objetivos_anuales"]) >= 2
    assert len(mx["cuadrante_norte_proyectos_clave"]) == 3
    assert len(mx["cuadrante_este_kpis_responsables"]) == 3

    esquinas = mx["matrices_correlacion_esquinas"]
    simbolos_on = {item["simbolo"] for item in esquinas["oeste_norte_anual_vs_proyectos"]}
    assert simbolos_on == {SIMBOLO_FUERTE, SIMBOLO_MEDIA, SIMBOLO_DEBIL}

    simbolos_ne = {
        item["simbolo"] for item in esquinas["norte_este_proyectos_vs_kpis_responsables"]
    }
    assert simbolos_ne == {SIMBOLO_FUERTE, SIMBOLO_MEDIA, SIMBOLO_DEBIL}

    simbolos_es = {item["simbolo"] for item in esquinas["este_sur_kpis_vs_ruptura_territorial"]}
    assert simbolos_es == {SIMBOLO_FUERTE, SIMBOLO_MEDIA, SIMBOLO_DEBIL}

    # Bowling Charts con los 3 colores del semáforo PDCA
    colores_bc = {bc["color_semaforo"] for bc in resultado["bowling_charts"]}
    assert colores_bc == {SEMAFORO_VERDE, SEMAFORO_AMARILLO, SEMAFORO_ROJO}
    for bc in resultado["bowling_charts"]:
        assert set(bc["accion_correctiva_pdca"].keys()) == {"Plan", "Do", "Check", "Act"}

    # Sesiones Catchball para las dependencias con brecha (Salud e Infraestructura)
    deps_catchball = {s["dependencia"] for s in resultado["catchball_sesiones"]}
    assert "Secretaría de Infraestructura" in deps_catchball
    assert "Secretaría de Salud" in deps_catchball
    assert "Secretaría de Educación" not in deps_catchball

    # 7 pasos
    assert len(resultado["ciclo_7_pasos_estado"]) == 7


def test_construir_matriz_x_desde_cache_real_cartagena() -> None:
    resultado = construir_matriz_x_hoshin_kanri_pdt(diagnostico=None)

    assert "Cartagena" in resultado["jurisdiction"]
    assert resultado["evaluacion_fair"]["fair_global_index"] > 0.0

    mx = resultado["matriz_x"]
    assert len(mx["cuadrante_sur_objetivos_ruptura"]) >= 5
    assert len(mx["cuadrante_oeste_objetivos_anuales"]) >= 5
    assert len(mx["cuadrante_norte_proyectos_clave"]) >= 5
    assert len(mx["cuadrante_este_kpis_responsables"]) >= 10

    esquinas = mx["matrices_correlacion_esquinas"]
    for key in (
        "sur_oeste_ruptura_vs_anual",
        "oeste_norte_anual_vs_proyectos",
        "norte_este_proyectos_vs_kpis_responsables",
        "este_sur_kpis_vs_ruptura_territorial",
    ):
        assert len(esquinas[key]) > 0
        for link in esquinas[key]:
            assert link["simbolo"] in {SIMBOLO_FUERTE, SIMBOLO_MEDIA, SIMBOLO_DEBIL}

    assert len(resultado["bowling_charts"]) > 0
    assert len(resultado["catchball_sesiones"]) > 0
    assert len(resultado["ciclo_7_pasos_estado"]) == 7


def test_filtros_por_dependencia_y_sector_cache_real() -> None:
    filtrado = construir_matriz_x_hoshin_kanri_pdt(
        diagnostico=None,
        codigo_plan="PDD_2012_2015",
        sector="Educación Pública",
        dependencia="Secretaría de Educación",
    )

    assert filtrado["filtros_aplicados"]["sector"] == "Educación Pública"
    assert filtrado["filtros_aplicados"]["dependencia"] == "Secretaría de Educación"

    sectores_sur = [
        item["sector_gbr"]
        for item in filtrado["matriz_x"]["cuadrante_sur_objetivos_ruptura"]
        if item["tipo"] == "SECTOR_PRIORITARIO_GBR"
    ]
    assert sectores_sur == ["Educación Pública"]

    deps_este = [
        item["dependencia_responsable"]
        for item in filtrado["matriz_x"]["cuadrante_este_kpis_responsables"]
    ]
    assert deps_este == ["Secretaría de Educación"]
    assert len(filtrado["catchball_sesiones"]) == 1
    assert filtrado["catchball_sesiones"][0]["dependencia"] == "Secretaría de Educación"
