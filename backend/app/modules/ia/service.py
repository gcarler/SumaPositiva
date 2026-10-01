"""Servicio unificado de Inteligencia Artificial para POLIS.

Orquesta la invocación determinista de los 4 agentes especializados y del
grafo de ciclo de vida PolicyLifecycleGraph (LangGraph).
"""

from __future__ import annotations

from app.modules.ia.agentes.agente_devolucion import AgenteDevolucionMotivada
from app.modules.ia.agentes.agente_diagnostico import AgenteDiagnostico
from app.modules.ia.agentes.agente_fiscal import AgenteFiscal
from app.modules.ia.agentes.agente_juridico import AgenteJuridico
from app.modules.ia.grafo.orquestador import PolicyLifecycleGraph
from app.modules.ia.schemas import (
    EntradaCicloPolitica,
    EntradaDevolucion,
    EntradaDiagnostico,
    EntradaFiscal,
    EntradaJuridica,
    RespuestaCicloPolitica,
    ResultadoDevolucion,
    ResultadoDiagnostico,
    ResultadoFiscal,
    ResultadoJuridico,
)


class ServicioIA:
    """Fachada de servicios para el subsistema de agentes de IA y gobernanza de POLIS."""

    def __init__(self) -> None:
        self.agente_diagnostico = AgenteDiagnostico()
        self.agente_juridico = AgenteJuridico()
        self.agente_fiscal = AgenteFiscal()
        self.agente_devolucion = AgenteDevolucionMotivada()
        self.orquestador_ciclo = PolicyLifecycleGraph()

    def evaluar_diagnostico(self, entrada: EntradaDiagnostico) -> ResultadoDiagnostico:
        """Invoca al Agente de Diagnóstico y Marco Lógico (MGA/DNP)."""
        return self.agente_diagnostico.analizar(entrada)

    def evaluar_juridico(self, entrada: EntradaJuridica) -> ResultadoJuridico:
        """Invoca al Agente Jurídico y Constitucional (LOOT, SGP, Consulta Previa SU-123/18)."""
        return self.agente_juridico.analizar(entrada)

    def evaluar_fiscal(self, entrada: EntradaFiscal) -> ResultadoFiscal:
        """Invoca al Agente Fiscal (FONSET, SGP, SGR, ICLD, Vigencias Futuras Ley 1483/11)."""
        return self.agente_fiscal.analizar(entrada)

    def evaluar_devolucion(self, entrada: EntradaDevolucion) -> ResultadoDevolucion:
        """Invoca al Agente de Devolución Ciudadana Motivada (Sentencia C-150 de 2015)."""
        return self.agente_devolucion.analizar(entrada)

    def ejecutar_ciclo_politica(self, entrada: EntradaCicloPolitica) -> RespuestaCicloPolitica:
        """Ejecuta sincrónicamente el ciclo completo determinista con LangGraph StateGraph."""
        return self.orquestador_ciclo.ejecutar_ciclo(entrada)

    async def ejecutar_ciclo_politica_async(
        self, entrada: EntradaCicloPolitica
    ) -> RespuestaCicloPolitica:
        """Ejecuta asincrónicamente el ciclo completo determinista con LangGraph StateGraph."""
        return await self.orquestador_ciclo.ejecutar_ciclo_async(entrada)


# Instancia única para inyección de dependencias
servicio_ia = ServicioIA()


def obtener_servicio_ia() -> ServicioIA:
    """Dependency provider para FastAPI."""
    return servicio_ia
