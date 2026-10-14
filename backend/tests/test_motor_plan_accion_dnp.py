"""Pruebas del Motor de Planes de Acción DNP / SisPT y Banco de Conocimiento.

Tarea: [PA-BANCO-MOTOR-01]
Instructivo Kit Financiero DNP / MHCP · Ley 152/1994 (arts. 29 y 41) · Ley 1474/2011 (art. 74)
Validador Lingüístico DNP de Verbos Fuertes vs 16 Verbos Débiles Prohibidos.
Matriz Hoja 1 Plan_Accion + Hoja 2 Plan_Indicativo y Seguimiento Trimestral.
"""

import uuid
import pytest
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
        frase = f"{verbo.capitalize()} las capacidades de seguridad comunitaria en barrios priorizados"
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
    """Verifica que el endpoint GET /plan-accion/banco-conocimiento retorne la estructura oficial DNP."""
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
            json={"descripcion_actividad": "Fortalecer la red de salud", "tipo_actividad": "ADMINISTRATIVA"},
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
            json={"descripcion_actividad": "Expedir la resolución distrital", "tipo_actividad": "NORMATIVA"},
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
    """Verifica que la creación de actividad rechace con HTTP 422 si la redacción contiene un verbo débil."""
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
            "descripcion_actividad": "Fortalecer la red institucional distrital de seguridad",  # VERBO PROHIBIDO
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
    """Prueba ciclo completo: creación con verbo fuerte, actualización de avance T1-T4 y auditoría."""
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
            "descripcion_actividad": "Adoptar el manual distrital de inspección técnica en hoteles",  # VERBO FUERTE
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
