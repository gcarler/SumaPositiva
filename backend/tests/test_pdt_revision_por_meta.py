"""Pruebas deterministas y de integración con bd_csh para pdt_revision_por_meta.py."""

from __future__ import annotations

from typing import Any

from app.modules.compromisos.pdt_revision_por_meta import (
    CAMPOS_CONTRATO_HALLAZGO,
    DIEZ_DIMENSIONES_REVISION,
    ESTADO_BRECHA_INFO,
    ESTADO_CERO_OBSERVADO,
    ESTADO_CONTRADICCION,
    SIETE_ROLES_REVISORES,
    construir_matriz_revision_por_meta_pdt,
    obtener_especificacion_revision_por_meta,
)


def _datos_sinteticos_revision() -> dict[str, Any]:
    return {
        "total_metas_plan": 4,
        "plan_info": {
            "codigo_plan": "PDD_2024_2027",
            "periodo": "2024-2027",
            "nombre_oficial": "Cartagena, Ciudad de Derechos",
            "norma_adopcion": "Acuerdo Distrital 2024",
        },
        "lineas_por_id": {
            "LIN-01": {
                "id": "LIN-01",
                "codigo": "L1",
                "nombre": "Seguridad Humana y Salud",
                "ppi_anual_cop": {"2024": 1_000_000_000.0, "2025": 1_200_000_000.0},
            }
        },
        "actividades_pa": [
            {
                "id": "ACT-01",
                "codigo": "PA-2025-01",
                "vigencia": 2025,
                "entidad_responsable": "Departamento Administrativo Distrital de Salud",
                "programa_nombre": "Seguridad Humana y Salud",
                "meta_producto_vigencia": "Jornadas de vacunación ejecutadas",
                "codigo_bpim": "2025130010099",
                "porcentaje_avance_fisico": 95.0,
                "monto_programado_cop": 600_000_000.0,
                "monto_ejecutado_cop": 550_000_000.0,
                "evidencia_soporte": "Acta DADIS 2025-01",
            }
        ],
        "triada_por_id": {},
        "cache_evaluador": {
            "dea_scores": {
                "resultados_dmu": [
                    {
                        "dmu": "Departamento Administrativo Distrital de Salud|2025",
                        "theta_bcc": 0.32,
                    }
                ]
            },
            "nlp_coherence": {
                "similaridad_coseno": {"muestra": []},
                "alertas_mission_creep": [
                    {
                        "codigo_meta": "M-CONTRA-01",
                        "similaridad_coseno_lexica": 0.21,
                    }
                ],
            },
            "time_series_forecast": {
                "series": [
                    {
                        "indicador": ("Entidad Ejecutora: Departamento Administrativo Distrital de Salud"),
                        "ISRI": 0.65,
                        "chow": {"ruptura_estructural_significativa": True},
                    }
                ]
            },
        },
        "metas": [
            {
                "id": "META-CERO-01",
                "codigo": "M-CERO-01",
                "nombre": "Reducir tasa de mortalidad materna evitable",
                "indicador": "Tasa de mortalidad materna por 100.000 nacidos vivos",
                "unidad_medida": "Tasa",
                "linea_id": "LIN-01",
                "linea_nombre": "Seguridad Humana y Salud",
                "fuente": "pdd_2024_2027.md",
                "fila_fuente": 101,
                "dependencia": "Secretaría de Planeación",
                "meta_programada_anual": 10.0,
                "meta_ejecutada_anual": 0.0,
                "avance_fisico_pct": 0.0,
                "apropiacion_definitiva_cop": 0.0,
                "compromisos_rp_cop": 0.0,
                "datos_oficiales": {
                    "Población": "Mujeres gestantes",
                    "Línea base": "42.0",
                    "Meta del cuatrienio": "25.0",
                },
            },
            {
                "id": "META-NULO-02",
                "codigo": "M-NULO-02",
                "nombre": "Construir centros comunitarios integrales",
                "indicador": "Centros comunitarios construidos",
                "unidad_medida": None,
                "linea_id": "LIN-01",
                "linea_nombre": "Seguridad Humana y Salud",
                "fuente": "pdd_2024_2027.md",
                "fila_fuente": 202,
                "dependencia": None,
                "meta_programada_anual": None,
                "meta_ejecutada_anual": None,
                "avance_fisico_pct": None,
                "apropiacion_definitiva_cop": None,
                "compromisos_rp_cop": None,
                "datos_oficiales": {},
            },
            {
                "id": "META-CONTRA-01",
                "codigo": "M-CONTRA-01",
                "nombre": "Ampliar cobertura de vacunación infantil al 95%",
                "indicador": "Porcentaje de cobertura de vacunación",
                "unidad_medida": "Porcentaje",
                "linea_id": "LIN-01",
                "linea_nombre": "Seguridad Humana y Salud",
                "fuente": "pdd_2024_2027.md",
                "fila_fuente": 303,
                "dependencia": "Departamento Administrativo Distrital de Salud",
                "meta_programada_anual": 95.0,
                "meta_ejecutada_anual": 95.0,
                "avance_fisico_pct": 95.0,
                "apropiacion_definitiva_cop": 600_000_000.0,
                "compromisos_rp_cop": 550_000_000.0,
                "datos_oficiales": {
                    "Población": "Niños y niñas menores de 5 años",
                    "Territorio": "Localidad De la Virgen y Turística",
                    "Línea base": "82.0",
                    "Meta del cuatrienio": "95.0",
                },
            },
            {
                "id": "META-DESFASE-04",
                "codigo": "M-DESFASE-04",
                "nombre": "Dotar ambulancias medicalizadas",
                "indicador": "Ambulancias dotadas",
                "unidad_medida": "Unidades",
                "linea_id": "LIN-01",
                "linea_nombre": "Seguridad Humana y Salud",
                "fuente": "pdd_2024_2027.md",
                "fila_fuente": 404,
                "dependencia": "Secretaría General",
                "meta_programada_anual": 5.0,
                "meta_ejecutada_anual": 0.0,
                "avance_fisico_pct": 0.0,
                "apropiacion_definitiva_cop": 800_000_000.0,
                "compromisos_rp_cop": 750_000_000.0,
                "datos_oficiales": {
                    "Población": "Población distrital",
                    "Línea base": "0",
                    "Meta del cuatrienio": "5",
                },
            },
        ],
    }


def test_obtener_especificacion_revision_por_meta() -> None:
    spec = obtener_especificacion_revision_por_meta()

    dims = spec["diez_dimensiones_revision"]
    assert tuple(dims.keys()) == DIEZ_DIMENSIONES_REVISION
    assert len(dims) == 10
    for dim in dims.values():
        assert dim["dominio"] in {"FORMULACION", "EJECUCION", "RESULTADOS"}
        assert len(dim["preguntas_clave"]) >= 1
        assert len(dim["campos_auditados"]) >= 3

    roles = spec["siete_roles_revisores"]
    assert tuple(roles.keys()) == SIETE_ROLES_REVISORES
    assert len(roles) == 7

    contrato = spec["contrato_hallazgo_canonic"]
    assert tuple(contrato["campos_obligatorios"]) == CAMPOS_CONTRATO_HALLAZGO
    assert len(CAMPOS_CONTRATO_HALLAZGO) == 17


def test_preservacion_ceros_observados_vs_nulos_brecha_informacion() -> None:
    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        datos_entrada=_datos_sinteticos_revision(),
    )
    por_codigo = {m["codigo_meta"]: m for m in resultado["metas_auditadas"]}
    assert "resumen_sispt_dnp" in resultado
    assert "evaluacion_sispt_dnp" in next(iter(por_codigo.values()))

    # Meta con 0.0 observado: debe preservar exactamente 0.0 y estado CERO_OBSERVADO_VERIFICADO
    meta_cero = por_codigo["M-CERO-01"]
    ej_fis_cero = meta_cero["evaluacion_10_dimensiones"]["ejecucion_fisica"]
    ej_fin_cero = meta_cero["evaluacion_10_dimensiones"]["ejecucion_financiera"]
    assert ej_fis_cero["meta_ejecutada_anual"] == 0.0
    assert ej_fis_cero["avance_fisico_pct"] == 0.0
    assert ej_fis_cero["estado"] == ESTADO_CERO_OBSERVADO
    assert ej_fin_cero["apropiacion_definitiva_cop"] == 0.0
    assert ej_fin_cero["estado"] == ESTADO_CERO_OBSERVADO
    assert meta_cero["dictamen_7_revisores"]["conciliador_ejecucion"]["ceros_observados_preservados"] is True
    # Sentido descendente detectado para mortalidad
    assert meta_cero["evaluacion_10_dimensiones"]["formulacion"]["sentido_indicador"] == "DESCENDENTE_REDUCCION"

    # Meta con datos faltantes (None): debe quedar en BRECHA_DE_INFORMACION sin inventar score
    meta_nulo = por_codigo["M-NULO-02"]
    ej_fis_nulo = meta_nulo["evaluacion_10_dimensiones"]["ejecucion_fisica"]
    ej_fin_nulo = meta_nulo["evaluacion_10_dimensiones"]["ejecucion_financiera"]
    assert ej_fis_nulo["meta_ejecutada_anual"] is None
    assert ej_fis_nulo["avance_fisico_pct"] is None
    assert ej_fis_nulo["estado"] == ESTADO_BRECHA_INFO
    assert ej_fin_nulo["apropiacion_definitiva_cop"] is None
    assert ej_fin_nulo["estado"] == ESTADO_BRECHA_INFO


def test_revisor_contradicciones_detecta_desacuerdos_entre_motores() -> None:
    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        datos_entrada=_datos_sinteticos_revision(),
    )
    por_codigo = {m["codigo_meta"]: m for m in resultado["metas_auditadas"]}

    # Meta M-CONTRA-01 tiene avance 95% pero theta_bcc=0.32 y similaridad_coseno=0.21 (<0.45)
    meta_contra = por_codigo["M-CONTRA-01"]
    rev_contra = meta_contra["dictamen_7_revisores"]["revisor_contradicciones"]
    assert rev_contra["estado"] == ESTADO_CONTRADICCION
    assert rev_contra["total_contradicciones"] >= 2

    reglas_hallazgos = {h["regla_aplicada"] for h in meta_contra["hallazgos"]}
    assert "REGLA_CONTRADICCION_AVANCE_FISICO_VS_DEA_BCC" in reglas_hallazgos
    assert "REGLA_CONTRADICCION_PRESUPUESTO_VS_MISSION_CREEP_NLP" in reglas_hallazgos

    # Meta M-DESFASE-04 tiene gasto positivo (750M COP) y avance físico == 0.0
    meta_desfase = por_codigo["M-DESFASE-04"]
    reglas_desfase = {h["regla_aplicada"] for h in meta_desfase["hallazgos"]}
    assert "REGLA_CONTRADICCION_GASTO_POSITIVO_AVANCE_CERO" in reglas_desfase

    # Verificar que todos los hallazgos cumplen los 17 campos del contrato canónico
    for h in resultado["hallazgos_consolidados"]:
        assert set(CAMPOS_CONTRATO_HALLAZGO).issubset(set(h.keys()))


def test_no_atribucion_espurea_sin_entidad_y_separacion_dominios() -> None:
    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        datos_entrada=_datos_sinteticos_revision(),
    )
    por_codigo = {m["codigo_meta"]: m for m in resultado["metas_auditadas"]}

    # Regla H1: M-NULO-02 no tiene entidad (SIN_ATRIBUCION) -> no hereda el ISRI de DADIS
    meta_nulo = por_codigo["M-NULO-02"]
    assert meta_nulo["dependencia_responsable"] == "SIN_ATRIBUCION"
    assert meta_nulo["evaluacion_10_dimensiones"]["resultados_y_equidad"]["riesgo_isri_atribuido"] is None

    # Separación de dominios sin score global opaco
    assert "score_global" not in meta_nulo
    assert set(meta_nulo["resumen_por_dominio"].keys()) == {
        "formulacion_estado",
        "ejecucion_fisica_estado",
        "ejecucion_financiera_estado",
        "resultados_estado",
        "contradicciones_estado",
    }


def test_integracion_bd_csh_pdd_2024_2027_universo_y_trazabilidad(corpus_analitica) -> None:
    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        limit=15,
        datos_entrada=None,
    )

    assert resultado["codigo_plan"] == "PDD_2024_2027"
    assert resultado["total_metas_plan"] == 1246
    assert resultado["total_metas_filtradas"] == 1246
    assert resultado["metas_devueltas"] == 15
    assert resultado["cobertura_universo"]["truncado_aplicado"] is True

    primera = resultado["metas_auditadas"][0]
    assert tuple(primera["evaluacion_10_dimensiones"].keys()) == DIEZ_DIMENSIONES_REVISION
    assert tuple(primera["dictamen_7_revisores"].keys()) == SIETE_ROLES_REVISORES


def test_integracion_bd_csh_filtro_por_dependencia(corpus_analitica) -> None:
    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        dependencia="Secretaría de Hacienda",
        limit=25,
        datos_entrada=None,
    )

    assert resultado["total_metas_plan"] == 1246
    assert 0 < resultado["total_metas_filtradas"] < resultado["total_metas_plan"]
    assert len(resultado["metas_auditadas"]) > 0
    for meta in resultado["metas_auditadas"]:
        assert "hacienda" in meta["dependencia_responsable"].casefold()


def test_revision_por_meta_integra_consistencia_trimestral_y_meta_regresiva() -> None:
    datos = _datos_sinteticos_revision()
    datos["actividades_pa"].append(
        {
            "id": "ACT-REGRESIVA-01",
            "codigo": "PA-2025-REG",
            "vigencia": 2025,
            "entidad_responsable": "Secretaría de Educación Distrital",
            "programa_nombre": "Seguridad Humana y Salud",
            "meta_producto_vigencia": "Reducir deserción escolar anual",
            "meta_valor_vigencia": 100.0,
            "avance_t1": 0.0,
            "avance_t2": 0.0,
            "avance_t3": 0.0,
            "avance_t4": None,
            "porcentaje_avance_fisico": 60.0,
            "monto_programado_cop": 200_000_000.0,
            "monto_ejecutado_cop": 120_000_000.0,
        }
    )
    datos["metas"].append(
        {
            "id": "META-REG-TRIM-05",
            "codigo": "M-REG-TRIM-05",
            "nombre": "Reducir tasa de deserción escolar en instituciones oficiales",
            "indicador": "Tasa de deserción escolar intraanual",
            "unidad_medida": "Porcentaje",
            "linea_id": "LIN-01",
            "linea_nombre": "Seguridad Humana y Salud",
            "fuente": "pdd_2024_2027.md",
            "fila_fuente": 505,
            "dependencia": "Secretaría de Educación Distrital",
            "meta_programada_anual": 4.0,
            "meta_ejecutada_anual": 2.4,
            "avance_fisico_pct": 60.0,
            "apropiacion_definitiva_cop": 200_000_000.0,
            "compromisos_rp_cop": 120_000_000.0,
            "datos_oficiales": {
                "Población": "Estudiantes matriculados",
                "Línea base": "3.5",
                "Meta del cuatrienio": "5.8",
            },
        }
    )
    datos["total_metas_plan"] = len(datos["metas"])

    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        datos_entrada=datos,
    )
    por_codigo = {m["codigo_meta"]: m for m in resultado["metas_auditadas"]}
    meta_audit = por_codigo["M-REG-TRIM-05"]

    dim_2 = meta_audit["evaluacion_10_dimensiones"]["formulacion"]
    assert dim_2["sentido_indicador_detectado"] == "DESCENDENTE"
    assert dim_2["meta_regresiva"] is True
    assert dim_2["formula_documental_explicita"] is False

    dim_6 = meta_audit["evaluacion_10_dimensiones"]["ejecucion_fisica"]
    trim_info = dim_6["consistencia_trimestral_t1_t4"]
    assert trim_info["inconsistencia_aritmetica_trimestral"] is True
    assert trim_info["trimestres_reportados_count"] == 3
    assert trim_info["trimestres_en_cero_observado_count"] == 3
    assert trim_info["ceros_observados_preservados"] is True

    rev_form = meta_audit["dictamen_7_revisores"]["revisor_formulacion"]
    assert rev_form["meta_regresiva"] is True
    assert rev_form["sentido_indicador_detectado"] == "DESCENDENTE"

    conc_ejec = meta_audit["dictamen_7_revisores"]["conciliador_ejecucion"]
    assert conc_ejec["inconsistencia_aritmetica_trimestral"] is True
    assert conc_ejec["ceros_observados_preservados"] is True

    reglas = {h["regla_aplicada"] for h in meta_audit["hallazgos"]}
    assert "REGLA_META_REGRESIVA_VS_LINEA_BASE" in reglas
    assert "REGLA_INCONSISTENCIA_ARITMETICA_TRIMESTRAL_T1_T4" in reglas


def test_conciliar_y_poblar_vinculos_meta_pa_triada_bd_csh(corpus_analitica) -> None:
    from app.modules.compromisos.pdt_conciliador_vinculos_pa_triada import (
        TIPOS_VINCULO_CANONICOS,
        conciliar_y_poblar_vinculos_meta_pa_triada,
    )

    res = conciliar_y_poblar_vinculos_meta_pa_triada(codigo_plan=None)
    assert res["tabla"] == "seguimiento.pdd_vinculos_meta_pa_triada"
    assert res["metas_conciliadas"] >= 1647
    assert res["total_filas_en_bd"] >= 1647
    dist_plan = res["distribucion_por_plan"]
    assert dist_plan["PDD_2024_2027"] == 1246
    assert dist_plan["PDL_1_2024_2027"] + dist_plan["PDL_2_2024_2027"] + dist_plan["PDL_3_2024_2027"] == 401
    dist_tipo = res["distribucion_por_tipo_vinculo"]
    assert set(dist_tipo.keys()).issubset(set(TIPOS_VINCULO_CANONICOS.keys()))
    assert res["ceros_observados_preservados_count"] > 0


def test_matriz_revision_por_meta_expone_tipo_vinculo_y_confianza(corpus_analitica) -> None:
    from app.modules.compromisos.pdt_conciliador_vinculos_pa_triada import (
        TIPOS_VINCULO_CANONICOS,
    )

    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDD_2024_2027",
        limit=25,
        datos_entrada=None,
    )
    assert len(resultado["metas_auditadas"]) == 25
    for m in resultado["metas_auditadas"]:
        tv = m["tipo_vinculo_pa_triada"]
        sc = m["score_confianza_vinculo"]
        assert tv in TIPOS_VINCULO_CANONICOS
        assert 0.0 <= sc <= 1.0
        dims = m["evaluacion_10_dimensiones"]
        for d_key in (
            "cadena_resultados",
            "operacionalizacion",
            "viabilidad_financiera",
            "ejecucion_fisica",
            "ejecucion_financiera",
        ):
            assert dims[d_key]["tipo_vinculo_pa_triada"] == tv
            assert dims[d_key]["score_confianza_vinculo"] == sc
        rev_art = m["dictamen_7_revisores"]["revisor_articulacion"]
        assert rev_art["tipo_vinculo_pa_triada"] == tv
        assert rev_art["score_confianza_vinculo"] == sc
        assert isinstance(rev_art["es_vinculo_exacto"], bool)
        assert isinstance(rev_art["es_vinculo_inferido"], bool)


def test_matriz_revision_por_meta_plan_desarrollo_local_pdl_1(corpus_analitica) -> None:
    resultado = construir_matriz_revision_por_meta_pdt(
        codigo_plan="PDL_1_2024_2027",
        limit=20,
        datos_entrada=None,
    )
    assert resultado["codigo_plan"] == "PDL_1_2024_2027"
    assert resultado["total_metas_plan"] == 110
    assert resultado["metas_devueltas"] == 20
    primera = resultado["metas_auditadas"][0]
    assert primera["codigo_plan"] == "PDL_1_2024_2027"
    assert "tipo_vinculo_pa_triada" in primera
    assert "score_confianza_vinculo" in primera


def test_normaliza_llaves_ocr_en_planes_distritales_y_locales() -> None:
    casos = [
        (
            "PDD_2024_2027",
            {
                "Responsabl e": "Secretaría de Educación",
                "Meta del cuatrienio": "Implementar cuatro (4) estrategias",
                "Línea Base Año 2023": "0 Fuente: Secretaría de Hacienda 2023",
                "Indicador": "Número de estrategias educativas",
            },
            4.0,
            0.0,
            "Secretaría de Educación",
        ),
        (
            "PDL_1_2024_2027",
            {
                "columna_9": "LHCN",
                "columna_4": "Reducir uno (1) los eventos de seguridad",
                "columna_2": "0.78 homicidios por cada 100 mil habitantes",
            },
            1.0,
            0.78,
            "Alcaldía Local 1 — Histórica y del Caribe Norte (LHCN)",
        ),
        (
            "PDL_2_2024_2027",
            {
                "Concurrencia": "Concurrencia",
                "Meta Cuatrienio": "0,4",
                "Línea Base": "1183 casos reportados",
                "Indicador": "Tasa de casos atendidos",
            },
            0.4,
            1183.0,
            "Alcaldía Local 2 — De la Virgen y Turística",
        ),
        (
            "PDL_3_2024_2027",
            {
                "RESPONSABLE": "Industrial y de la",
                "META DEL CUATRENI O": "tres",
                "LINEA BASE": "N/D",
                "Indicador": "Porcentaje de hogares atendidos",
            },
            3.0,
            None,
            "Alcaldía Local 3 — Industrial y de la Bahía",
        ),
        (
            "PDD_2020_2023",
            {
                "Responsable": "Departamento Administrativo Distrital de Salud",
                "META DEL": "25.265",
                "LINEA BASE": "ND",
                "Unidad de medida": "Número / Unidades",
            },
            25265.0,
            None,
            "Departamento Administrativo Distrital de Salud",
        ),
    ]
    for index, (plan, official, target, baseline, responsible) in enumerate(casos):
        payload = {
            "total_metas_plan": 1,
            "plan_info": {"codigo_plan": plan, "periodo": "2024–2027"},
            "metas": [
                {
                    "id": f"ocr-{index}",
                    "codigo_plan": plan,
                    "codigo": f"OCR-{index}",
                    "nombre": "Meta oficial de prueba",
                    "indicador": official.get("Indicador", "Tasa de producto entregado"),
                    "fuente": "prueba_documental.md",
                    "dependencia": None,
                    "datos_oficiales": official,
                }
            ],
        }
        result = construir_matriz_revision_por_meta_pdt(codigo_plan=plan, datos_entrada=payload)
        evaluated = result["metas_auditadas"][0]
        formulation = evaluated["evaluacion_10_dimensiones"]["formulacion"]
        diagnosis = evaluated["evaluacion_10_dimensiones"]["diagnostico"]
        assert formulation["meta_cuatrienio_numerica"] == target, plan
        assert diagnosis["linea_base_numerica"] == baseline, plan
        if baseline is None:
            assert diagnosis["linea_base_documental"] == "ND (Sin línea base histórica)"
        else:
            assert diagnosis["linea_base_documental"] is not None
        assert evaluated["dependencia_responsable"] == responsible, plan
        assert formulation["unidad_medida"] != "BRECHA_DE_INFORMACION", plan


def test_codigo_plan_todos_revisa_universo_multiplan() -> None:
    metas = []
    for index, plan in enumerate(
        (
            "PDD_2012_2015",
            "PDD_2013_2015",
            "PDD_2016_2019",
            "PDD_2020_2023",
            "PDD_2024_2027",
            "PDL_1_2024_2027",
            "PDL_2_2024_2027",
            "PDL_3_2024_2027",
        )
    ):
        metas.append(
            {
                "id": f"todos-{index}",
                "codigo_plan": plan,
                "codigo": f"TODOS-{index}",
                "nombre": "Meta local",
                "indicador": "Número de servicios entregados",
                "datos_oficiales": {"Meta Cuatrienio": "uno"},
            }
        )
    result = construir_matriz_revision_por_meta_pdt(
        codigo_plan="TODOS",
        limit=1,
        datos_entrada={"total_metas_plan": 4637, "metas": metas},
    )
    assert result["total_metas_plan"] == 4637
    assert result["metas_devueltas"] == 8
    assert {row["codigo_plan"] for row in result["metas_auditadas"]} == set(meta["codigo_plan"] for meta in metas)
