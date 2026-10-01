"""Submódulo de agentes especializados de IA para POLIS."""

from app.modules.ia.agentes.agente_devolucion import AgenteDevolucionMotivada
from app.modules.ia.agentes.agente_diagnostico import AgenteDiagnostico
from app.modules.ia.agentes.agente_fiscal import AgenteFiscal
from app.modules.ia.agentes.agente_juridico import AgenteJuridico

__all__ = [
    "AgenteDiagnostico",
    "AgenteJuridico",
    "AgenteFiscal",
    "AgenteDevolucionMotivada",
]
