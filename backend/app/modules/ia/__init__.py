"""Módulo de Inteligencia Artificial y Red Multi-Agente Determinista para POLIS.

Orquestador: PolicyLifecycleGraph (LangGraph StateGraph).
Agentes Especializados con PydanticAI:
- AgenteDiagnostico: Marco Lógico y MGA (DNP).
- AgenteJuridico: Control constitucional, LOOT (Ley 1454/11), SGP (Ley 715/01) y Consulta
Previa (SU-123/18).
- AgenteFiscal: Viabilidad financiera, fuentes (FONSET, SGP, SGR, ICLD) y Vigencias Futuras
(Ley 1483/11).
- AgenteDevolucionMotivada: Deber de respuesta motivada y proscripción de descarte silencioso
(Sentencia C-150/15).
"""

from app.modules.ia.agentes import (
    AgenteDevolucionMotivada,
    AgenteDiagnostico,
    AgenteFiscal,
    AgenteJuridico,
)
from app.modules.ia.grafo import EstadoCicloPolitica, PolicyLifecycleGraph
from app.modules.ia.router import limpiar_cache_tasa_ia, router
from app.modules.ia.service import ServicioIA, obtener_servicio_ia

__all__ = [
    "AgenteDiagnostico",
    "AgenteJuridico",
    "AgenteFiscal",
    "AgenteDevolucionMotivada",
    "PolicyLifecycleGraph",
    "EstadoCicloPolitica",
    "ServicioIA",
    "obtener_servicio_ia",
    "router",
    "limpiar_cache_tasa_ia",
]
