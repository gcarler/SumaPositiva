"""Suite de pruebas exhaustivas para la Red Multi-Agente de IA y PolicyLifecycleGraph (POLIS).

Verifica:
1. AgenteDiagnostico: MGA, sintaxis DNP (sustantivo negativo vs infinitivo), soluciones
disfrazadas, árboles derivados.
2. AgenteJuridico: Ley 1454/11, Ley 715/01, Consulta Previa en zonas étnicas de Cartagena
(SU-123/18), no regresividad DESCA.
3. AgenteFiscal: FONSET, SGP, SGR, ICLD, Vigencias Futuras (Ley 1483/11 vs Ley 819/03),
consistencia MFMP.
4. AgenteDevolucionMotivada: Cumplimiento imperativo Sentencia C-150/15, causales taxativas,
motivación sustancial.
5. PolicyLifecycleGraph (LangGraph): Orquestador determinista, control de iteraciones (max=3),
proscripción de bucles infinitos.
6. Endpoints FastAPI: Pruebas de integración HTTP en /api/v1/ia/*.
"""

import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.ia.agentes import (
    AgenteDevolucionMotivada,
    AgenteDiagnostico,
    AgenteFiscal,
    AgenteJuridico,
)
from app.modules.ia.grafo import PolicyLifecycleGraph
from app.modules.ia.schemas import (
    CausalDevolucionTaxativa,
    EntradaCicloPolitica,
    EntradaDevolucion,
    EntradaDiagnostico,
    EntradaFiscal,
    EntradaJuridica,
    FuenteFinanciacion,
    NivelCompetencia,
    PropuestaParaDevolucion,
    RiesgoFiscal,
    TipoVigenciaFutura,
)

pytestmark = pytest.mark.anyio


# =============================================================================
# 1. Pruebas de AgenteDiagnostico (Marco Lógico y MGA - DNP)
# =============================================================================


def test_diagnostico_formulacion_valida():
    """Valida un árbol de problemas formulado con sustantivos negativos estándar DNP."""
    agente = AgenteDiagnostico()
    entrada = EntradaDiagnostico(
        titulo="Seguridad en Entornos Escolares de Cartagena",
        problema_central="Elevada incidencia de violencia y microtráfico en entornos escolares",
        causas_directas=[
            "Deficiente vigilancia preventiva y comunitaria",
            "Carencia de programas de uso productivo del tiempo libre",
        ],
        causas_indirectas=[
            "Precaria articulación entre colegios y cuadrantes de policía",
            "Deterioro de la infraestructura deportiva barrial",
        ],
        efectos_directos=[
            "Deserción escolar temprana de adolescentes",
        ],
        efectos_indirectos=[
            "Incremento en los índices de delincuencia juvenil territorial",
        ],
    )

    resultado = agente.analizar(entrada)

    assert resultado.es_valido is True
    assert resultado.puntaje_coherencia >= 80.0
    assert (
        "reducir" in resultado.objetivo_central_derivado.lower()
        or "consolidar" in resultado.objetivo_central_derivado.lower()
    )
    assert len(resultado.arbol_problemas_estructurado["causas_directas"]) == 2
    assert len(resultado.arbol_objetivos_derivado["medios_primer_nivel"]) == 2
    assert len(resultado.recomendaciones_dnp) > 0


def test_diagnostico_detecta_solucion_disfrazada_y_corrige():
    """Verifica que el decálogo contra 'soluciones disfrazadas de problema' penalice y corrija."""
    agente = AgenteDiagnostico()
    entrada = EntradaDiagnostico(
        titulo="Iniciativa de Seguridad",
        problema_central="Falta un CAI de policia",
        causas_directas=[],
    )

    resultado = agente.analizar(entrada)

    # Debe ser penalizado severamente
    assert resultado.es_valido is False
    assert resultado.puntaje_coherencia < 65.0
    # Verifica que el análisis sintáctico detectó la violación metodológica
    val_central = resultado.analisis_sintaxis[0]
    assert val_central.cumple_sintaxis is False
    assert (
        "solución" in val_central.observacion_metodologica.lower()
        or "dnp" in val_central.observacion_metodologica.lower()
    )
    # Verifica que el problema central optimizado ya no es la solución disfrazada cruda
    assert (
        "vulnerabilidad" in resultado.problema_central_optimizado.lower()
        or "déficit" in resultado.problema_central_optimizado.lower()
    )


# =============================================================================
# 2. Pruebas de AgenteJuridico (Constitucional, LOOT, SGP, Consulta Previa)
# =============================================================================


def test_juridico_alerta_consulta_previa_comunidades_cartagena():
    """Valida la activación obligatoria de Consulta Previa en territorios étnicos de Cartagena
    (SU-123/18)."""
    agente = AgenteJuridico()
    entrada = EntradaJuridica(
        titulo="Plan de Seguridad y Protección en Tierrabomba y La Boquilla",
        descripcion="Intervención integral de convivencia y gestión comunitaria",
        lineas_accion=[
            "Dotación de equipos de comunicación comunitaria",
            "Mesa de mediación pacífica y justicia ancestral",
        ],
        territorios_afectados=["Tierrabomba", "La Boquilla"],
        poblacion_objetivo="Comunidades Afrodescendientes de Tierrabomba y La Boquilla",
        es_territorio_etnico=True,
    )

    resultado = agente.analizar(entrada)

    assert resultado.es_viable is True
    assert resultado.nivel_competencia == NivelCompetencia.DISTRITAL
    assert resultado.es_competencia_distrital_cartagena is True
    # Salvaguarda vinculante de Consulta Previa
    alerta_cp = resultado.alerta_consulta_previa
    assert alerta_cp.requiere_consulta_previa is True
    assert any("Tierrabomba" in c for c in alerta_cp.comunidades_etnicas_identificadas)
    assert any("La Boquilla" in c for c in alerta_cp.comunidades_etnicas_identificadas)
    assert "SU-123/18" in alerta_cp.fundamento_constitucional
    assert "Convenio 169" in alerta_cp.fundamento_constitucional


def test_juridico_control_no_regresividad_desca():
    """Aplica el test de presunción de inconstitucionalidad ante medidas regresivas (C-038/04)."""
    agente = AgenteJuridico()
    entrada = EntradaJuridica(
        titulo="Reestructuración de Centros de Salud",
        descripcion=(
            "Ajuste operativo que contempla recorte de subsidios y cierre de puestos de salud"
        ),
        lineas_accion=["Cerrar centros de salud periféricos para concentrar recursos"],
        poblacion_objetivo="Población vulnerable",
        modifica_beneficios_existentes=True,
    )

    resultado = agente.analizar(entrada)

    assert resultado.control_regresividad.existe_riesgo_regresividad is True
    assert resultado.control_regresividad.supera_test_progresividad is False
    assert resultado.es_viable is False
    assert any(
        "C-038" in adv for adv in resultado.control_regresividad.advertencias_constitucionales
    )


# =============================================================================
# 3. Pruebas de AgenteFiscal (FONSET, SGP, SGR, ICLD, Ley 1483/11)
# =============================================================================


def test_fiscal_fonset_y_vigencias_futuras_excepcionales():
    """Valida la canasta de fuentes con FONSET y la detección de Vigencias Futuras Ley 1483/11."""
    agente = AgenteFiscal()
    entrada = EntradaFiscal(
        titulo="Política Pública Decenal de Convivencia y Seguridad Humana de Cartagena",
        costo_estimado_total_cop=Decimal("8000000000.00"),
        horizonte_anos=10,  # Trasciende período de 4 años del Alcalde
        sector_inversion="seguridad_y_convivencia",
        fuentes_propuestas=["FONSET", "ICLD"],
        cuenta_con_declaratoria_estrategica=True,
    )

    resultado = agente.analizar(entrada)

    assert resultado.es_viable is True
    assert resultado.riesgo_fiscal == RiesgoFiscal.BAJO
    # Control Ley 1483 de 2011
    alerta_vf = resultado.alerta_vigencias_futuras
    assert alerta_vf.tipo_vigencia == TipoVigenciaFutura.EXCEPCIONAL_LEY_1483
    assert alerta_vf.trasciende_periodo_gobierno is True
    assert alerta_vf.requiere_acuerdo_concejo is True
    assert "Ley 1483 de 2011" in alerta_vf.fundamento_legal

    # Fuentes asignadas: FONSET debe estar presente
    fuentes_nombres = [f.fuente for f in resultado.fuentes_recomendadas]
    assert FuenteFinanciacion.FONSET in fuentes_nombres
    assert FuenteFinanciacion.ICLD in fuentes_nombres


def test_fiscal_rechazo_politica_de_papel():
    """Verifica que políticas sin costeo sean declaradas INVIABLES conforme a la Sentencia
    T-025/04."""
    agente = AgenteFiscal()
    entrada = EntradaFiscal(
        titulo="Política de Papel sin Presupuesto",
        costo_estimado_total_cop=Decimal("0.00"),
        horizonte_anos=4,
    )

    resultado = agente.analizar(entrada)

    assert resultado.es_viable is False
    assert resultado.riesgo_fiscal == RiesgoFiscal.INVIABLE
    assert resultado.consistencia_mfmp is False
    assert any("T-025/04" in rec for rec in resultado.recomendaciones_presupuestales)


# =============================================================================
# 4. Pruebas de AgenteDevolucionMotivada (Sentencia C-150 de 2015)
# =============================================================================


def test_devolucion_cumplimiento_taxativo_c150():
    """Valida la proscripción del descarte silencioso y la fundamentación sustancial."""
    agente = AgenteDevolucionMotivada()
    p1 = PropuestaParaDevolucion(
        titulo="Cadena perpetua para atracadores",
        descripcion="Implementar pena de prisión de por vida sin beneficios en Cartagena",
    )
    p2 = PropuestaParaDevolucion(
        titulo="Construir un helipuerto en cada barrio",
        descripcion="Exigir presupuesto para helipuertos comunales",
        motivo_descarte_preliminar=(
            "Costo exorbitante que desborda el Marco Fiscal de Mediano Plazo"
        ),
    )

    entrada = EntradaDevolucion(
        titulo_politica="Seguridad y Convivencia",
        propuestas_no_incorporadas=[p1, p2],
    )

    resultado = agente.analizar(entrada)

    assert resultado.cumplimiento_c150_garantizado is True
    assert resultado.total_devoluciones_emitidas == 2
    assert len(resultado.matriz_devolucion) == 2

    item_juridico = resultado.matriz_devolucion[0]
    assert item_juridico.causal_taxativa == CausalDevolucionTaxativa.JURIDICA
    assert len(item_juridico.fundamentacion_motivada) >= 20
    assert (
        "Ley 1454" in item_juridico.fundamentacion_motivada
        or "reserva de ley" in item_juridico.fundamentacion_motivada
    )

    item_presupuestal = resultado.matriz_devolucion[1]
    assert item_presupuestal.causal_taxativa == CausalDevolucionTaxativa.PRESUPUESTAL
    assert len(item_presupuestal.fundamentacion_motivada) >= 20
    assert "Ley 819 de 2003" in item_presupuestal.norma_o_criterio_invocado


# =============================================================================
# 5. Pruebas del Orquestador PolicyLifecycleGraph (LangGraph StateGraph)
# =============================================================================


def test_grafo_orquestador_ejecucion_completa_exitosa():
    """Ejecuta el ciclo de vida completo con convergencia determinista a consolidación y
    adopción."""
    orquestador = PolicyLifecycleGraph()
    politica_id = uuid.uuid4()

    entrada = EntradaCicloPolitica(
        politica_id=politica_id,
        titulo="Política Pública de Seguridad Humana de Cartagena 2026-2036",
        descripcion=(
            "Estrategia intersectorial para la convivencia pacífica y el desarrollo humano integral"
        ),
        sector="seguridad_humana",
        problema_central=(
            "Elevada conflictividad comunitaria e insuficiencia de mecanismos de mediacion"
        ),
        causas_directas=["Precaria presencia de centros de mediacion pacifica"],
        efectos_directos=["Deterioro de la seguridad ciudadana barrial"],
        lineas_accion=["Red Distrital de Mediación Comunitaria y Casas de Justicia"],
        territorios_afectados=["Barú", "Tierrabomba"],
        es_territorio_etnico=True,
        poblacion_objetivo="Comunidades de la Bahía y territorio insular de Cartagena",
        costo_estimado_total_cop=Decimal("3500000000.00"),
        horizonte_anos=4,
        fuentes_propuestas=["FONSET", "ICLD"],
        propuestas_ciudadanas=[
            PropuestaParaDevolucion(
                titulo="Cárceles privadas flotantes",
                descripcion="Construir barcazas carcelarias privadas",
            )
        ],
        max_iteraciones=3,
    )

    respuesta = orquestador.ejecutar_ciclo(entrada)

    assert respuesta.ciclo_completado_exitosamente is True
    assert respuesta.fase_final == "consolidacion_adopcion"
    assert respuesta.adopcion_aprobada is True
    assert respuesta.diagnostico_aprobado is True
    assert respuesta.viabilidad_juridica_aprobada is True
    assert respuesta.consulta_previa_requerida is True  # Por Barú y Tierrabomba
    assert respuesta.viabilidad_fiscal_aprobada is True
    assert respuesta.deliberacion_completada is True
    assert respuesta.devolucion_completada is True
    assert respuesta.resultado_diagnostico is not None
    assert respuesta.resultado_juridico is not None
    assert respuesta.resultado_fiscal is not None
    assert respuesta.resultado_devolucion is not None
    assert len(respuesta.resultado_devolucion.matriz_devolucion) == 1
    # Verifica que el historial de estados progresó de inicio a consolidacion
    assert "inicio" in respuesta.historial_estados
    assert "consolidacion_adopcion" in respuesta.historial_estados


def test_grafo_orquestador_sin_bucles_infinitos_y_convergencia_en_fallo():
    "Verifica que ante una propuesta inviable el grafo converja a END sin ciclar indefinidamente."
    orquestador = PolicyLifecycleGraph()

    entrada = EntradaCicloPolitica(
        titulo="Iniciativa Inviable",
        descripcion="Propuesta que viola principios fiscales y metodológicos",
        problema_central="Falta un CAI de policia",
        causas_directas=[],
        costo_estimado_total_cop=Decimal("0.00"),  # Costo 0 es inviable fiscalmente
        max_iteraciones=3,
    )

    respuesta = orquestador.ejecutar_ciclo(entrada)

    # Debe converger de forma determinista
    assert respuesta.ciclo_completado_exitosamente is False
    assert respuesta.fase_final == "consolidacion_adopcion"
    assert respuesta.adopcion_aprobada is False
    # La cota de iteraciones impidió ciclo infinito
    assert respuesta.iteraciones_totales <= 12
    assert "Acto de Devolución y Archivo Motivado" in respuesta.acto_administrativo_sugerido


# =============================================================================
# 6. Pruebas de Endpoints HTTP (/api/v1/ia/*)
# =============================================================================


async def test_endpoints_api_ia_integracion(monkeypatch):
    """Verifica que todos los endpoints HTTP de la red multi-agente respondan 200 OK con JSON
    válido."""
    from app.modules.identidad.security import crear_token_acceso

    token = crear_token_acceso(
        sujeto_id=uuid.uuid4(),
        rol="facilitador_mesa",
        nivel_identidad="declarada",
        permisos=["ia:analizar"],
    )
    # Prueba HTTP de orquestación; la persistencia de sesiones se prueba en identidad.
    from app.modules.identidad import deps

    async def sujeto_controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps, "cargar_sujeto_vigente", sujeto_controlado)
    settings = Settings(_env_file=None, environment="test")
    app = create_app(settings)

    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        # 1. Endpoint Diagnóstico
        resp_diag = client.post(
            "/api/v1/ia/diagnostico",
            json={
                "titulo": "Prueba Diagnóstico",
                ("problema_central"): (
                    "Elevada conflictividad en la Localidad de la Virgen y Turística"
                ),
                "causas_directas": ["Déficit de equipamientos culturales"],
            },
        )
        assert resp_diag.status_code == 200
        data_diag = resp_diag.json()
        assert data_diag["es_valido"] is True
        assert "evaluacion_id" in data_diag

        # 2. Endpoint Jurídico
        resp_jur = client.post(
            "/api/v1/ia/juridico",
            json={
                "titulo": "Prueba Jurídica Bocachica",
                "descripcion": "Intervención en territorio insular de Bocachica",
                "lineas_accion": ["Convivencia comunitaria"],
                "territorios_afectados": ["Bocachica"],
                "poblacion_objetivo": "Comunidades Negras de Bocachica",
                "es_territorio_etnico": True,
            },
        )
        assert resp_jur.status_code == 200
        data_jur = resp_jur.json()
        assert data_jur["es_viable"] is True
        assert data_jur["alerta_consulta_previa"]["requiere_consulta_previa"] is True

        # 3. Endpoint Fiscal
        resp_fisc = client.post(
            "/api/v1/ia/fiscal",
            json={
                "titulo": "Plan de Seguridad Cartagena",
                "costo_estimado_total_cop": "2000000000.00",
                "horizonte_anos": 4,
                "sector_inversion": "seguridad_y_convivencia",
                "fuentes_propuestas": ["FONSET"],
            },
        )
        assert resp_fisc.status_code == 200
        data_fisc = resp_fisc.json()
        assert data_fisc["es_viable"] is True
        assert data_fisc["alerta_vigencias_futuras"]["tipo_vigencia"] == "ordinaria_ley_819"

        # 4. Endpoint Devolución
        resp_dev = client.post(
            "/api/v1/ia/devolucion",
            json={
                "titulo_politica": "Política de Convivencia",
                "propuestas_no_incorporadas": [
                    {
                        "titulo": "Pena capital para ladrones",
                        "descripcion": "Establecer la pena de muerte en el distrito",
                    }
                ],
            },
        )
        assert resp_dev.status_code == 200
        data_dev = resp_dev.json()
        assert data_dev["cumplimiento_c150_garantizado"] is True
        assert data_dev["matriz_devolucion"][0]["causal_taxativa"] == "juridica"

        # 5. Endpoint Ciclo Completo
        resp_ciclo = client.post(
            "/api/v1/ia/ciclo-politica",
            json={
                "titulo": "Ciclo Integral de Seguridad Humana",
                "descripcion": "Estrategia integral comunitaria y territorial",
                "problema_central": "Elevada inseguridad en barrios vulnerables",
                "causas_directas": ["Déficit de alumbrado y presencia institucional"],
                "lineas_accion": ["Instalación de luminarias y rondas preventivas"],
                "costo_estimado_total_cop": "1500000000.00",
                "horizonte_anos": 4,
            },
        )
        assert resp_ciclo.status_code == 200
        data_ciclo = resp_ciclo.json()
        assert data_ciclo["ciclo_completado_exitosamente"] is True
        assert data_ciclo["fase_final"] == "consolidacion_adopcion"
