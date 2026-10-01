"""Funciones de transición condicional determinista para el StateGraph de LangGraph.

Garantizan el control estricto de flujo, la proscripción de ciclos infinitos
y la convergencia segura a END en un número máximo finito de pasos (cota <= 3).
"""

from __future__ import annotations

from typing import Literal

from app.modules.ia.grafo.estado import EstadoCicloPolitica


def ruta_tras_diagnostico(
    state: EstadoCicloPolitica,
) -> Literal["viabilidad_juridica", "diagnostico", "devolucion_motivada"]:
    """Evalúa si el diagnóstico fue aprobado o si debe reintentarse bajo cota de iteración."""
    if state.get("diagnostico_aprobado", False):
        return "viabilidad_juridica"

    # Si no fue aprobado, verificar si quedan iteraciones de ajuste
    iter_actual = state.get("iteracion_diagnostico", 1)
    max_iter = state.get("max_iteraciones", 3)

    if iter_actual < max_iter:
        return "diagnostico"

    # Cota alcanzada: no ciclar indefinidamente, derivar a devolución motivada
    return "devolucion_motivada"


def ruta_tras_viabilidad_juridica(
    state: EstadoCicloPolitica,
) -> Literal["viabilidad_fiscal", "viabilidad_juridica", "devolucion_motivada"]:
    """Evalúa la viabilidad jurídica bajo cota estricta de refinamiento."""
    if state.get("viabilidad_juridica_aprobada", False):
        return "viabilidad_fiscal"

    iter_actual = state.get("iteracion_juridica", 1)
    max_iter = state.get("max_iteraciones", 3)

    if iter_actual < max_iter:
        return "viabilidad_juridica"

    return "devolucion_motivada"


def ruta_tras_viabilidad_fiscal(
    state: EstadoCicloPolitica,
) -> Literal["deliberacion_consulta", "viabilidad_fiscal", "devolucion_motivada"]:
    """Evalúa la viabilidad presupuestal bajo cota estricta de refinamiento."""
    if state.get("viabilidad_fiscal_aprobada", False):
        return "deliberacion_consulta"

    iter_actual = state.get("iteracion_fiscal", 1)
    max_iter = state.get("max_iteraciones", 3)

    if iter_actual < max_iter:
        return "viabilidad_fiscal"

    return "devolucion_motivada"
