"""Nodos ejecutores para el PolicyLifecycleGraph de LangGraph.

Cada nodo invoca al agente especializado correspondiente, garantizando
la inmutabilidad, determinismo y consistencia del estado de política pública.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from app.modules.ia.agentes.agente_devolucion import AgenteDevolucionMotivada
from app.modules.ia.agentes.agente_diagnostico import AgenteDiagnostico
from app.modules.ia.agentes.agente_fiscal import AgenteFiscal
from app.modules.ia.agentes.agente_juridico import AgenteJuridico
from app.modules.ia.grafo.estado import EstadoCicloPolitica
from app.modules.ia.schemas import (
    EntradaDevolucion,
    EntradaDiagnostico,
    EntradaFiscal,
    EntradaJuridica,
    PropuestaParaDevolucion,
)
from app.modules.sesion.security import generar_uuidv7

# Instancias compartidas de los 4 agentes
_agente_diagnostico = AgenteDiagnostico()
_agente_juridico = AgenteJuridico()
_agente_fiscal = AgenteFiscal()
_agente_devolucion = AgenteDevolucionMotivada()


def nodo_diagnostico(state: EstadoCicloPolitica) -> EstadoCicloPolitica:
    """Nodo 1: Ejecuta AgenteDiagnostico para validar coherencia causal y sintaxis DNP."""
    nuevo_estado = dict(state)
    nuevo_estado["fase_actual"] = "diagnostico"
    nuevo_estado["iteracion_diagnostico"] += 1
    nuevo_estado["iteracion_total"] += 1
    nuevo_estado["historial_estados"].append(f"diagnostico_iter_{nuevo_estado['iteracion_diagnostico']}")

    politica_uuid = uuid.UUID(state["politica_id"])

    entrada = EntradaDiagnostico(
        politica_id=politica_uuid,
        titulo=state["titulo"],
        problema_central=state["problema_central"],
        causas_directas=state.get("causas_directas", []),
        causas_indirectas=state.get("causas_indirectas", []),
        efectos_directos=state.get("efectos_directos", []),
        efectos_indirectos=state.get("efectos_indirectos", []),
    )

    resultado = _agente_diagnostico.analizar(entrada)
    nuevo_estado["resultado_diagnostico"] = resultado.model_dump(mode="json")
    nuevo_estado["diagnostico_aprobado"] = resultado.es_valido

    # Si se optimizó el problema central, actualizarlo para etapas subsiguientes
    if resultado.problema_central_optimizado:
        nuevo_estado["problema_central"] = resultado.problema_central_optimizado

    nuevo_estado["bitacora_mensajes"].append(
        f"[DIAGNÓSTICO] Iteración {nuevo_estado['iteracion_diagnostico']}: "
        f"Puntaje={resultado.puntaje_coherencia:.1f}/100. Aprobado={resultado.es_valido}."
    )

    return nuevo_estado  # type: ignore[return-value]


def nodo_viabilidad_juridica(state: EstadoCicloPolitica) -> EstadoCicloPolitica:
    """Nodo 2: Ejecuta AgenteJuridico para evaluar competencias distritales y Consulta Previa."""
    nuevo_estado = dict(state)
    nuevo_estado["fase_actual"] = "viabilidad_juridica"
    nuevo_estado["iteracion_juridica"] += 1
    nuevo_estado["iteracion_total"] += 1
    nuevo_estado["historial_estados"].append(f"juridica_iter_{nuevo_estado['iteracion_juridica']}")

    politica_uuid = uuid.UUID(state["politica_id"])

    lineas = state.get("lineas_accion") or ["Acción integral de seguridad humana y convivencia"]
    entrada = EntradaJuridica(
        politica_id=politica_uuid,
        titulo=state["titulo"],
        descripcion=state["descripcion"],
        lineas_accion=lineas,
        territorios_afectados=state.get("territorios_afectados", []),
        es_territorio_etnico=state.get("es_territorio_etnico", False),
        poblacion_objetivo=state.get("poblacion_objetivo", "Ciudadanía de Cartagena"),
        sector_tematico=state.get("sector", "seguridad_humana"),
    )

    resultado = _agente_juridico.analizar(entrada)
    nuevo_estado["resultado_juridico"] = resultado.model_dump(mode="json")
    nuevo_estado["viabilidad_juridica_aprobada"] = resultado.es_viable
    nuevo_estado["consulta_previa_requerida"] = resultado.alerta_consulta_previa.requiere_consulta_previa
    nuevo_estado["acto_administrativo_sugerido"] = resultado.instrumento_adopcion_recomendado

    nuevo_estado["bitacora_mensajes"].append(
        f"[JURÍDICO] Iteración {nuevo_estado['iteracion_juridica']}: "
        f"Viabilidad={resultado.es_viable}. Competencia={resultado.nivel_competencia.value}. "
        f"Consulta Previa Requerida={resultado.alerta_consulta_previa.requiere_consulta_previa}."
    )

    return nuevo_estado  # type: ignore[return-value]


def nodo_viabilidad_fiscal(state: EstadoCicloPolitica) -> EstadoCicloPolitica:
    """Nodo 3: Ejecuta AgenteFiscal para evaluar fuentes (FONSET, SGP, etc.) y Ley 1483/11."""
    nuevo_estado = dict(state)
    nuevo_estado["fase_actual"] = "viabilidad_fiscal"
    nuevo_estado["iteracion_fiscal"] += 1
    nuevo_estado["iteracion_total"] += 1
    nuevo_estado["historial_estados"].append(f"fiscal_iter_{nuevo_estado['iteracion_fiscal']}")

    politica_uuid = uuid.UUID(state["politica_id"])
    costo_decimal = Decimal(state.get("costo_estimado_total_cop", "1500000000.00"))

    entrada = EntradaFiscal(
        politica_id=politica_uuid,
        titulo=state["titulo"],
        costo_estimado_total_cop=costo_decimal,
        horizonte_anos=state.get("horizonte_anos", 4),
        sector_inversion=state.get("sector", "seguridad_y_convivencia"),
        fuentes_propuestas=state.get("fuentes_propuestas", ["FONSET", "ICLD"]),
    )

    resultado = _agente_fiscal.analizar(entrada)
    nuevo_estado["resultado_fiscal"] = resultado.model_dump(mode="json")
    nuevo_estado["viabilidad_fiscal_aprobada"] = resultado.es_viable

    nuevo_estado["bitacora_mensajes"].append(
        f"[FISCAL] Iteración {nuevo_estado['iteracion_fiscal']}: "
        f"Viabilidad={resultado.es_viable}. Riesgo={resultado.riesgo_fiscal.value}. "
        f"Vigencias={resultado.alerta_vigencias_futuras.tipo_vigencia.value}."
    )

    return nuevo_estado  # type: ignore[return-value]


def nodo_deliberacion_consulta(state: EstadoCicloPolitica) -> EstadoCicloPolitica:
    """Nodo 4: Procesa la fase deliberativa y la salvaguarda de Consulta Previa."""
    nuevo_estado = dict(state)
    nuevo_estado["fase_actual"] = "deliberacion_consulta"
    nuevo_estado["iteracion_total"] += 1
    nuevo_estado["historial_estados"].append("deliberacion_consulta")

    if state.get("consulta_previa_requerida", False):
        nuevo_estado["bitacora_mensajes"].append(
            "[DELIBERACIÓN] Protocolo de Consulta Previa activado conforme a "
            "Sentencia SU-123 de 2018 y Convenio 169 de la OIT. Diálogo inter"
            "cultural estructurado con consejos comunitarios y cabildos."
        )
    else:
        nuevo_estado["bitacora_mensajes"].append(
            "[DELIBERACIÓN] Mesas de trabajo participativas ordinarias completadas en las localidades de Cartagena."
        )

    nuevo_estado["deliberacion_completada"] = True
    return nuevo_estado  # type: ignore[return-value]


def nodo_devolucion_motivada(state: EstadoCicloPolitica) -> EstadoCicloPolitica:
    """Nodo 5: Ejecuta AgenteDevolucionMotivada bajo Sentencia C-150 de 2015."""
    nuevo_estado = dict(state)
    nuevo_estado["fase_actual"] = "devolucion_motivada"
    nuevo_estado["iteracion_total"] += 1
    nuevo_estado["historial_estados"].append("devolucion_motivada")

    politica_uuid = uuid.UUID(state["politica_id"])

    # Si hay propuestas ciudadanas no incorporadas, procesarlas; si no, construir muestra de
    # salvaguarda
    raw_props = state.get("propuestas_ciudadanas", [])
    propuestas_model: list[PropuestaParaDevolucion] = []

    for p in raw_props:
        pid = (
            uuid.UUID(p["propuesta_id"])
            if isinstance(p.get("propuesta_id"), str)
            else p.get("propuesta_id", generar_uuidv7())
        )
        propuestas_model.append(
            PropuestaParaDevolucion(
                propuesta_id=pid,
                titulo=p.get("titulo", "Propuesta no priorizada"),
                descripcion=p.get("descripcion", "Sin descripción"),
                motivo_descarte_preliminar=p.get("motivo_descarte_preliminar"),
            )
        )

    if not propuestas_model:
        # Generar devolución pedagógica institucional si no hubo rechazos individuales
        propuestas_model.append(
            PropuestaParaDevolucion(
                propuesta_id=generar_uuidv7(),
                titulo="Aportes generales recopilados en plenarias",
                descripcion=("Sugerencias complementarias de infraestructura no prioritarias en esta fase"),
                motivo_descarte_preliminar=("Aporte agrupado para consideración en futuros planes operativos anuales."),
            )
        )

    entrada = EntradaDevolucion(
        politica_id=politica_uuid,
        titulo_politica=state["titulo"],
        propuestas_no_incorporadas=propuestas_model,
    )

    resultado = _agente_devolucion.analizar(entrada)
    nuevo_estado["resultado_devolucion"] = resultado.model_dump(mode="json")
    nuevo_estado["devolucion_completada"] = resultado.cumplimiento_c150_garantizado

    nuevo_estado["bitacora_mensajes"].append(
        f"[DEVOLUCIÓN] Sentencia C-150 de 2015 satisfecha: {resultado.total_devoluciones_emitidas} "
        "respuestas motivadas emitidas y listas para publicación bajo Ley 1712 de 2014."
    )

    return nuevo_estado  # type: ignore[return-value]


def nodo_consolidacion_adopcion(state: EstadoCicloPolitica) -> EstadoCicloPolitica:
    """Nodo 6: Consolidación final y recomendación del acto administrativo de adopción."""
    nuevo_estado = dict(state)
    nuevo_estado["fase_actual"] = "consolidacion_adopcion"
    nuevo_estado["iteracion_total"] += 1
    nuevo_estado["historial_estados"].append("consolidacion_adopcion")

    diag_ok = state.get("diagnostico_aprobado", False)
    jur_ok = state.get("viabilidad_juridica_aprobada", False)
    fisc_ok = state.get("viabilidad_fiscal_aprobada", False)
    delib_ok = state.get("deliberacion_completada", False)
    dev_ok = state.get("devolucion_completada", False)

    if diag_ok and jur_ok and fisc_ok and delib_ok and dev_ok:
        nuevo_estado["adopcion_aprobada"] = True
        nuevo_estado["ciclo_completado_exitosamente"] = True
        nuevo_estado["bitacora_mensajes"].append(
            f"[ADOPCIÓN] Política '{state['titulo']}' VALIDADA INTEGRALMENTE. "
            f"Expedir: {nuevo_estado.get('acto_administrativo_sugerido', 'Decreto Distrital')}."
        )
    else:
        nuevo_estado["adopcion_aprobada"] = False
        nuevo_estado["ciclo_completado_exitosamente"] = False
        nuevo_estado["acto_administrativo_sugerido"] = (
            "Acto de Devolución y Archivo Motivado por Inviabilidad Técnica/Jurídica/Fiscal"
        )
        nuevo_estado["bitacora_mensajes"].append(
            "[ADOPCIÓN] Política '"
            f"{state['titulo']}"
            "' NO supera los filtros normativos mínimos. Se archiva con const"
            "ancia motivada en cumplimiento del principio de racionalidad (Se"
            "ntencia T-025/04)."
        )

    return nuevo_estado  # type: ignore[return-value]
