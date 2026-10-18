"""Pruebas del Motor de Planes de Acción DNP / SisPT y Banco de Conocimiento.

Tarea: [PA-BANCO-MOTOR-01]
Instructivo Kit Financiero DNP / MHCP · Ley 152/1994 (arts. 29 y 41) · Ley 1474/2011 (art. 74)
Validador Lingüístico DNP de Verbos Fuertes vs 16 Verbos Débiles Prohibidos.
Matriz Hoja 1 Plan_Accion + Hoja 2 Plan_Indicativo y Seguimiento Trimestral.
"""

import uuid

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.compromisos.service import CompromisosService


def test_validador_linguistico_dnp_unidad():
    """Valida la regla lingüística oficial del DNP a nivel unitario."""
    # 1. Verbos débiles prohibidos taxativamente por el DNP (16 verbos)
    verbos_prohibidos = [
        "apropiar", "asegurar", "colaborar", "consolidar", "contribuir",
        "desarrollar", "integrar", "fomentar", "fortalecer", "garantizar",
        "implementar", "impulsar", "mejorar", "movilizar", "proponer", "promover"
    ]
    for verbo in verbos_prohibidos:
        frase = (
            f"{verbo.capitalize()} las capacidades de seguridad comunitaria "
            "en barrios priorizados"
        )
        res = CompromisosService.validar_redaccion_dnp(frase, "NORMATIVA")
        assert not res.es_valida, f"Debe rechazar '{verbo}'"
        assert res.es_verbo_debil_prohibido
        assert res.verbo_detectado == verbo
        assert len(res.verbos_fuertes_sugeridos) > 0

    # 2. Palabras que no son verbos en infinitivo
    palabras_invalidas = [
        "Ruta distrital para la protección de la infancia",
        "Construcción de 50 kilómetros de vías",
        "Apoyo integral a los líderes comunitarios",
        "Plan maestro de seguridad ciudadana",
    ]
    for frase in palabras_invalidas:
        res = CompromisosService.validar_redaccion_dnp(frase, "LOGISTICA")
        assert not res.es_valida
        assert not res.es_infinitivo
        assert not res.es_verbo_debil_prohibido
        assert len(res.verbos_fuertes_sugeridos) > 0

    # 3. Verbos fuertes en infinitivo aceptados por el DNP
    verbos_fuertes = [
        ("Expedir el decreto distrital de zonas seguras", "expedir"),
        ("Instalar 85 cámaras de videovigilancia LPR", "instalar"),
        ("Diseñar el protocolo de atención médica barrial", "diseñar"),
        ("Adecuar los canales y drenajes pluviales de la Ciénaga", "adecuar"),
        ("Ejecutar 48 jornadas de diálogo y desarme voluntario", "ejecutar"),
        ("Crear el fondo rotatorio de microcréditos para comerciantes", "crear"),
        ("Adoptar el modelo de operación de las Manzanas del Cuidado", "adoptar"),
        ("Firmar convenios de cofinanciación con la Nación", "firmar"),
        ("Verificar el estado técnico de las terminales de radiocomunicación", "verificar"),
        ("Notificar las resoluciones de inspección sanitaria", "notificar"),
        ("Colocar 1.200 luminarias LED en senderos escolares", "colocar"),
        ("Identificar 120 productores agropecuarios para compras públicas", "identificar"),
    ]
    for frase, esperado in verbos_fuertes:
        res = CompromisosService.validar_redaccion_dnp(frase, "DE_GESTION")
        assert res.es_valida, f"Debe aceptar '{frase}'"
        assert res.es_infinitivo
        assert not res.es_verbo_debil_prohibido
        assert res.verbo_detectado == esperado
        assert len(res.verbos_fuertes_sugeridos) == 0


def test_banco_conocimiento_dnp_endpoint(database_url: str):
    """Verifica que el endpoint GET /plan-accion/banco-conocimiento
    retorne la estructura oficial DNP."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        resp = client.get("/api/v1/compromisos/plan-accion/banco-conocimiento")
        assert resp.status_code == 200, resp.text
        datos = resp.json()

        # 1. Marco Normativo (Ley 152/94 arts 29 y 41, Ley 1474/11 art 74, Dcto 2482/12)
        normas = {n["norma"] for n in datos["marco_normativo"]}
        assert any("Ley 152 de 1994, Art. 41" in n for n in normas)
        assert any("Ley 152 de 1994, Art. 29" in n for n in normas)
        assert any("Ley 1474 de 2011, Art. 74" in n for n in normas)

        # 2. Encadenamiento de instrumentos
        instrumentos = [i["instrumento"] for i in datos["encadenamiento_instrumentos"]]
        assert any("PDT y Plan Indicativo" in i for i in instrumentos)
        assert any("POAI" in i for i in instrumentos)
        assert any("MFMP" in i for i in instrumentos)
        assert any("Presupuesto Anual" in i for i in instrumentos)

        # 3. Ruta metodológica de 7 pasos
        pasos = datos["ruta_metodologica_7_pasos"]
        assert len(pasos) == 7
        assert pasos[0]["paso"] == 1
        assert pasos[6]["paso"] == 7
        assert "31 de Enero" in pasos[6]["nombre"]

        # 4. Regla lingüística y los 16 verbos débiles
        regla = datos["regla_linguistica_dnp"]
        assert len(regla["verbos_debiles_prohibidos"]) == 16
        assert "fortalecer" in regla["verbos_debiles_prohibidos"]
        assert "implementar" in regla["verbos_debiles_prohibidos"]
        assert "garantizar" in regla["verbos_debiles_prohibidos"]

        # 5. Taxonomías y fuentes de financiación
        assert len(datos["taxonomia_metas"]) == 3
        assert len(datos["taxonomia_actividades"]) == 4
        assert "INVERSION" in datos["catalogo_fuentes_financiacion"]
        assert "FUNCIONAMIENTO" in datos["catalogo_fuentes_financiacion"]


def test_validar_redaccion_endpoint_http(database_url: str):
    """Verifica el endpoint POST /plan-accion/validar-redaccion vía HTTP."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        # Prueba con verbo prohibido
        resp_debil = client.post(
            "/api/v1/compromisos/plan-accion/validar-redaccion",
            json={
                "descripcion_actividad": "Fortalecer la red de salud",
                "tipo_actividad": "ADMINISTRATIVA",
            },
        )
        assert resp_debil.status_code == 200
        d_debil = resp_debil.json()
        assert not d_debil["es_valida"]
        assert d_debil["es_verbo_debil_prohibido"]
        assert "fortalecer" in d_debil["verbo_detectado"]
        assert len(d_debil["verbos_fuertes_sugeridos"]) > 0

        # Prueba con verbo fuerte
        resp_fuerte = client.post(
            "/api/v1/compromisos/plan-accion/validar-redaccion",
            json={
                "descripcion_actividad": "Expedir la resolución distrital",
                "tipo_actividad": "NORMATIVA",
            },
        )
        assert resp_fuerte.status_code == 200
        d_fuerte = resp_fuerte.json()
        assert d_fuerte["es_valida"]
        assert not d_fuerte["es_verbo_debil_prohibido"]
        assert d_fuerte["verbo_detectado"] == "expedir"


def test_matriz_plan_accion_consulta_y_filtros(database_url: str):
    """Verifica la consulta de la Matriz Oficial (Hoja 1 + Hoja 2 + Resumen Ejecutivo)."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        resp = client.get("/api/v1/compromisos/plan-accion/matriz")
        assert resp.status_code == 200, resp.text
        datos = resp.json()

        resumen = datos["resumen_ejecutivo"]
        hoja_1 = datos["hoja_1_plan_accion"]
        hoja_2 = datos["hoja_2_plan_indicativo"]

        # 12 actividades ejemplares sembradas
        assert resumen["total_actividades"] >= 12
        assert len(hoja_1) >= 12
        assert len(hoja_2) >= 10
        assert resumen["avance_fisico_promedio"] > 0
        assert resumen["presupuesto_total_programado_cop"] > 0
        assert resumen["porcentaje_ejecucion_financiera"] > 0

        # Verificar semáforo de alertas
        assert "en_meta" in resumen["semaforo_alertas"]
        assert "alerta_preventiva" in resumen["semaforo_alertas"]
        assert "rezago_critico" in resumen["semaforo_alertas"]

        # Filtro por línea estratégica LE-01
        resp_le01 = client.get("/api/v1/compromisos/plan-accion/matriz?linea_codigo=LE-01")
        assert resp_le01.status_code == 200
        d_le01 = resp_le01.json()
        assert all(a["linea_estrategica_codigo"] == "LE-01" for a in d_le01["hoja_1_plan_accion"])

        # Filtro por tipo de actividad
        resp_norm = client.get("/api/v1/compromisos/plan-accion/matriz?tipo_actividad=NORMATIVA")
        assert resp_norm.status_code == 200
        d_norm = resp_norm.json()
        assert all(a["tipo_actividad"] == "NORMATIVA" for a in d_norm["hoja_1_plan_accion"])

        # Filtro por búsqueda de texto
        resp_busqueda = client.get("/api/v1/compromisos/plan-accion/matriz?busqueda=cámaras")
        assert resp_busqueda.status_code == 200
        d_busq = resp_busqueda.json()
        assert len(d_busq["hoja_1_plan_accion"]) >= 1


def test_crear_actividad_rechaza_verbo_debil(database_url: str, cabeceras_gestion):
    """Verifica que la creación de actividad rechace con HTTP 422
    si la redacción contiene un verbo débil."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app, headers=cabeceras_gestion) as client:
        payload_invalido = {
            "codigo": f"PA-TEST-{uuid.uuid4().hex[:6].upper()}",
            "vigencia": 2026,
            "compromiso_pas_codigo": "PAS-SEC-01",
            "linea_estrategica_codigo": "LE-01",
            "programa_nombre": "Programa de Convivencia",
            "entidad_responsable": "Distriseguridad",
            "lider_responsable": "Líder Técnico",
            "dependencias_articuladas": [],
            "tipo_meta": "ACTIVIDAD",
            "meta_producto_vigencia": "Meta de prueba",
            "meta_valor_vigencia": 1.0,
            "unidad_medida": "Documento",
            "codigo_bpim": "2026130010099",
            "proyecto_nombre": "Proyecto Prueba",
            "objetivo_proyecto": "Objetivo Prueba",
            "tipo_actividad": "NORMATIVA",
            # VERBO PROHIBIDO
            "descripcion_actividad": "Fortalecer la red institucional distrital de seguridad",
            "fecha_inicio": "2026-01-01",
            "fecha_terminacion": "2026-12-31",
            "categoria_recursos": "INVERSION",
            "fuente_financiacion": "SGP",
            "monto_programado_cop": 1000000.0,
        }

        resp = client.post("/api/v1/compromisos/plan-accion/actividades", json=payload_invalido)
        assert resp.status_code == 422, resp.text
        detail = resp.json()["detail"]
        assert "verbo" in str(detail).lower() or "prohibido" in str(detail).lower()


def test_flujo_creacion_y_seguimiento_trimestral(database_url: str, cabeceras_gestion):
    """Prueba ciclo completo: creación con verbo fuerte,
    actualización de avance T1-T4 y auditoría."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app, headers=cabeceras_gestion) as client:
        cod_act = f"PA-TEST-{uuid.uuid4().hex[:6].upper()}"
        payload_valido = {
            "codigo": cod_act,
            "vigencia": 2026,
            "compromiso_pas_codigo": "PAS-SEC-01",
            "linea_estrategica_codigo": "LE-01",
            "programa_nombre": "Protección de Niñez",
            "entidad_responsable": "Distriseguridad",
            "lider_responsable": "Coordinador de Protección",
            "dependencias_articuladas": ["ICBF"],
            "tipo_meta": "META_PRODUCTO",
            "meta_producto_vigencia": "Ruta de protección",
            "meta_valor_vigencia": 1.0,
            "unidad_medida": "Ruta",
            "codigo_bpim": "2026130010088",
            "proyecto_nombre": "Protección Integral",
            "objetivo_proyecto": "Erradicar vulneraciones",
            "tipo_actividad": "NORMATIVA",
            # VERBO FUERTE
            "descripcion_actividad": "Adoptar el manual distrital de inspección técnica en hoteles",
            "fecha_inicio": "2026-02-01",
            "fecha_terminacion": "2026-11-30",
            "avance_t1": 100.0,
            "avance_t2": 0.0,
            "avance_t3": 0.0,
            "avance_t4": 0.0,
            "categoria_recursos": "INVERSION",
            "fuente_financiacion": "RECURSOS_PROPIOS",
            "monto_programado_cop": 500000000.0,
            "monto_ejecutado_cop": 250000000.0,
        }

        # 1. Creación exitosa
        resp_crear = client.post("/api/v1/compromisos/plan-accion/actividades", json=payload_valido)
        assert resp_crear.status_code == 201, resp_crear.text
        creada = resp_crear.json()
        assert creada["codigo"] == cod_act
        assert creada["verbo_infinitivo"] == "adoptar"
        assert creada["porcentaje_avance_fisico"] == 100.0

        # 2. Conflicto por código duplicado
        resp_dup = client.post("/api/v1/compromisos/plan-accion/actividades", json=payload_valido)
        assert resp_dup.status_code == 409, resp_dup.text

        # 3. Actualización de seguimiento trimestral
        resp_seguimiento = client.patch(
            f"/api/v1/compromisos/plan-accion/actividades/{cod_act}/seguimiento",
            json={
                "avance_t2": 80.0,
                "monto_ejecutado_cop": 400000000.0,
                "evidencia_soporte": "Resolución de adopción publicada en gaceta.",
                "observacion_cualitativa": "Avance satisfactorio al segundo trimestre.",
            },
        )
        assert resp_seguimiento.status_code == 200, resp_seguimiento.text
        actualizada = resp_seguimiento.json()
        assert actualizada["avance_t1"] == 100.0
        assert actualizada["avance_t2"] == 80.0
        # Promedio trimestral de los trimestres reportados: (100 + 80) / 2 = 90.0
        assert actualizada["porcentaje_avance_fisico"] == 90.0
        assert actualizada["monto_ejecutado_cop"] == 400000000.0
        assert "gaceta" in actualizada["evidencia_soporte"]


def test_procesar_lote_plan_accion_cruce_hoja2_y_autocorreccion(database_url: str):
    """Verifica el endpoint POST /plan-accion/procesar-lote:
    1. Cruce automático de Hoja 2 Plan Indicativo a Hoja 1 Plan de Acción
       (Programa y Meta Producto).
    2. Exención de meta producto cuando tipo_meta == 'ACTIVIDAD' (Pág. 11 DNP).
    3. Detección de verbos débiles prohibidos por DNP y sugerencia de redacción corregida.
    4. Coherencia presupuestal (categoría de recursos vs fuentes de financiación).
    5. Dictamen oficial Consejo de Gobierno (REQUIERE_SUBSANACION_PREVIA vs APTO_CONSEJO_GOBIERNO).
    """
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        # Lote con 2 filas: 1 con verbo fuerte pero meta ACTIVIDAD, 1 con verbo débil
        lote_inicial = [
            {
                "codigo": "PA-LOTE-01",
                "compromiso_pas_codigo": "PAS-SEC-01",
                "entidad_responsable": "Secretaría del Interior y Convivencia Ciudadana",
                "lider_responsable": "Director de Seguridad",
                "tipo_meta": "ACTIVIDAD",
                "tipo_actividad": "NORMATIVA",
                "descripcion_actividad": (
                    "Expedir el decreto distrital de zonas de especial protección comunitaria"
                ),
                "categoria_recursos": "INVERSION",
                "fuente_financiacion": "RECURSOS_PROPIOS",
                "monto_programado_cop": 100000000.0,
                "monto_ejecutado_cop": 50000000.0,
                "avance_t1": 50.0,
            },
            {
                "codigo": "PA-LOTE-02",
                "compromiso_pas_codigo": "PAS-SEG-03",
                "entidad_responsable": "Distriseguridad",
                "lider_responsable": "Jefe de Operaciones",
                "tipo_meta": "META_PRODUCTO",
                "tipo_actividad": "LOGISTICA",
                "descripcion_actividad": (
                    "Fortalecer la capacidad logística de los frentes de seguridad barrial"
                ),
                "categoria_recursos": "INVERSION",
                "fuente_financiacion": "SGP_PROPOSITO_GENERAL",
                "monto_programado_cop": 200000000.0,
                "monto_ejecutado_cop": 10000000.0,
                "avance_t1": 80.0,
            },
        ]

        resp = client.post(
            "/api/v1/compromisos/plan-accion/procesar-lote",
            json={"filas": lote_inicial, "vigencia": 2026},
        )
        assert resp.status_code == 200, resp.text
        resultado = resp.json()

        assert resultado["total_filas_procesadas"] == 2
        assert resultado["filas_conformes_dnp"] == 1
        assert resultado["filas_con_observaciones"] == 1
        assert resultado["estado_dictamen_planeacion"] == "REQUIERE_SUBSANACION_PREVIA"

        f1 = resultado["filas_procesadas"][0]
        assert f1["es_conforme"] is True
        assert f1["columna_d_programa"] != ""
        assert "Pág. 11 DNP" in f1["columna_e_meta_producto"]
        assert f1["verbo_detectado"] == "expedir"
        assert f1["es_verbo_fuerte"] is True

        f2 = resultado["filas_procesadas"][1]
        assert f2["es_conforme"] is False
        assert f2["es_verbo_fuerte"] is False
        assert f2["redaccion_corregida_sugerida"] is not None
        assert f2["redaccion_corregida_sugerida"] != f2["descripcion_actividad"]
        assert any("desfase" in h.lower() for h in f2["hallazgos"])

        # Aplicar la sugerencia de corrección automática para f2 y equilibrar financiero
        lote_corregido = [
            lote_inicial[0],
            {
                **lote_inicial[1],
                "descripcion_actividad": f2["redaccion_corregida_sugerida"],
                "monto_ejecutado_cop": 160000000.0,
            },
        ]

        resp_corregido = client.post(
            "/api/v1/compromisos/plan-accion/procesar-lote",
            json={"filas": lote_corregido, "vigencia": 2026},
        )
        assert resp_corregido.status_code == 200, resp_corregido.text
        res_corr = resp_corregido.json()

        assert res_corr["total_filas_procesadas"] == 2
        assert res_corr["filas_conformes_dnp"] == 2
        assert res_corr["filas_con_observaciones"] == 0
        assert res_corr["estado_dictamen_planeacion"] == "APTO_CONSEJO_GOBIERNO"
        assert res_corr["puntaje_calidad_dnp"] == 100.0


def test_auditar_consistencia_serie_y_sentido_indicador_casos_dnp():
    """Valida auditar_consistencia_serie_y_sentido_indicador (Sección 4.2):
    - Sentido ASCENDENTE, DESCENDENTE y MANTENIMIENTO.
    - Detección de meta_regresiva según sentido y línea base vs meta.
    - Preservación estricta de 0.0 observado en T1-T4 e inconsistencia_aritmetica_trimestral.
    - Verificación de formula_documental_explicita en indicadores relativos.
    """
    from app.modules.compromisos.service import auditar_consistencia_serie_y_sentido_indicador

    # 1. Caso DESCENDENTE consistente + fórmula explícita + trimestres consistentes
    res_desc_ok = auditar_consistencia_serie_y_sentido_indicador(
        {
            "indicador": "Tasa de mortalidad infantil por 1.000 nacidos vivos",
            "unidad_medida": "Tasa",
            "linea_base": 14.5,
            "meta_cuatrienio": 9.0,
            "meta_valor_vigencia": 10.0,
            "avance_t1": 25.0,
            "avance_t2": 50.0,
            "avance_t3": None,
            "avance_t4": None,
            "porcentaje_avance_fisico": 37.5,
        }
    )
    assert res_desc_ok["sentido_indicador"] == "DESCENDENTE"
    assert res_desc_ok["meta_regresiva"] is False
    assert res_desc_ok["formula_documental_explicita"] is True
    assert res_desc_ok["inconsistencia_aritmetica_trimestral"] is False
    assert res_desc_ok["consistencia_trimestral_t1_t4"]["trimestres_reportados_count"] == 2
    assert res_desc_ok["consistencia_trimestral_t1_t4"]["trimestres_en_cero_observado_count"] == 0

    # 2. Caso DESCENDENTE con meta_regresiva (meta > línea base en pobreza/deserción)
    res_desc_reg = auditar_consistencia_serie_y_sentido_indicador(
        {
            "indicador": "Reducir porcentaje de deserción escolar oficial",
            "unidad_medida": "Porcentaje",
            "linea_base": 4.2,
            "meta_cuatrienio": 6.8,
        }
    )
    assert res_desc_reg["sentido_indicador"] == "DESCENDENTE"
    assert res_desc_reg["meta_regresiva"] is True
    assert res_desc_reg["evaluacion_linea_base_vs_meta"]["es_consistente_con_sentido"] is False
    assert res_desc_reg["formula_documental_explicita"] is False

    # 3. Caso ASCENDENTE con meta_regresiva (meta < línea base) + inconsistencia T1-T4 con 0.0
    res_asc_incons = auditar_consistencia_serie_y_sentido_indicador(
        {
            "indicador": "Cobertura de acueducto urbano (hogares conectados / total hogares)",
            "unidad_medida": "Porcentaje",
            "linea_base": 92.0,
            "meta_cuatrienio": 85.0,
            "meta_valor_vigencia": 90.0,
            "avance_t1": 0.0,
            "avance_t2": 0.0,
            "avance_t3": 0.0,
            "avance_t4": None,
            "porcentaje_avance_fisico": 75.0,
        }
    )
    assert res_asc_incons["sentido_indicador"] == "ASCENDENTE"
    assert res_asc_incons["meta_regresiva"] is True
    assert res_asc_incons["formula_documental_explicita"] is True
    assert res_asc_incons["inconsistencia_aritmetica_trimestral"] is True
    trim = res_asc_incons["consistencia_trimestral_t1_t4"]
    assert trim["avance_t1"] == 0.0
    assert trim["avance_t4"] is None
    assert trim["trimestres_reportados_count"] == 3
    assert trim["trimestres_en_cero_observado_count"] == 3
    assert trim["ceros_observados_preservados"] is True
    assert trim["suma_trimestral"] == 0.0

    # 4. Caso suma trimestral > 0 y meta_valor_vigencia > 0 pero porcentaje_avance_fisico == 0.0
    res_suma_pos_avance_cero = CompromisosService.auditar_consistencia_serie_y_sentido_indicador(
        {
            "indicador": "Mantener aulas escolares adecuadas",
            "unidad_medida": "Unidades",
            "meta_valor_vigencia": 20.0,
            "avance_t1": 5.0,
            "avance_t2": 10.0,
            "porcentaje_avance_fisico": 0.0,
        }
    )
    assert res_suma_pos_avance_cero["sentido_indicador"] == "MANTENIMIENTO"
    assert res_suma_pos_avance_cero["inconsistencia_aritmetica_trimestral"] is True
    assert res_suma_pos_avance_cero["consistencia_trimestral_t1_t4"]["suma_trimestral"] == 15.0


