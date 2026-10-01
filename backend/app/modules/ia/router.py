"""Enrutador de endpoints FastAPI para el subsistema de IA de POLIS (/api/v1/ia).

Permite consultar los 4 agentes especializados y disparar el ciclo de vida
completo gobernado por LangGraph y PydanticAI.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status

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
from app.modules.ia.service import ServicioIA, obtener_servicio_ia
from app.modules.identidad.deps import requerir_permiso

router = APIRouter(prefix="/ia", tags=["Inteligencia Artificial y Gobernanza Multi-Agente"])


@router.post(
    "/diagnostico",
    response_model=ResultadoDiagnostico,
    status_code=status.HTTP_200_OK,
    summary="Evaluar diagnóstico y árbol de problemas bajo metodología DNP / MGA",
    dependencies=[Depends(requerir_permiso("ia:analizar", nivel_minimo="declarada"))],
)
def evaluar_diagnostico_endpoint(
    entrada: EntradaDiagnostico,
    servicio: Annotated[ServicioIA, Depends(obtener_servicio_ia)],
) -> ResultadoDiagnostico:
    """Evalúa la sintaxis DNP, consistencia causal y deriva el árbol de objetivos."""
    return servicio.evaluar_diagnostico(entrada)


@router.post(
    "/juridico",
    response_model=ResultadoJuridico,
    status_code=status.HTTP_200_OK,
    summary="Control constitucional, competencias territoriales y salvaguarda de Consulta Previa",
    dependencies=[Depends(requerir_permiso("ia:analizar", nivel_minimo="declarada"))],
)
def evaluar_juridico_endpoint(
    entrada: EntradaJuridica,
    servicio: Annotated[ServicioIA, Depends(obtener_servicio_ia)],
) -> ResultadoJuridico:
    """Evalúa competencias bajo Ley 1454/11 y Ley 715/01, activa alerta de Consulta Previa
    (SU-123/18) y no regresividad DESCA."""
    return servicio.evaluar_juridico(entrada)


@router.post(
    "/fiscal",
    response_model=ResultadoFiscal,
    status_code=status.HTTP_200_OK,
    summary="Viabilidad presupuestal, fuentes (FONSET, SGP, SGR, ICLD) y Vigencias Futuras",
    dependencies=[Depends(requerir_permiso("ia:analizar", nivel_minimo="declarada"))],
)
def evaluar_fiscal_endpoint(
    entrada: EntradaFiscal,
    servicio: Annotated[ServicioIA, Depends(obtener_servicio_ia)],
) -> ResultadoFiscal:
    """Evalúa la sostenibilidad financiera frente al MFMP (Ley 819/03) y clasifica vigencias
    futuras (Ley 1483/11)."""
    return servicio.evaluar_fiscal(entrada)


@router.post(
    "/devolucion",
    response_model=ResultadoDevolucion,
    status_code=status.HTTP_200_OK,
    summary="Generar respuestas motivadas bajo causal taxativa (Sentencia C-150 de 2015)",
    dependencies=[Depends(requerir_permiso("ia:analizar", nivel_minimo="declarada"))],
)
def evaluar_devolucion_endpoint(
    entrada: EntradaDevolucion,
    servicio: Annotated[ServicioIA, Depends(obtener_servicio_ia)],
) -> ResultadoDevolucion:
    """Proscribe el descarte silencioso y emite matriz de devolución ciudadana motivada con
    fundamento explícito."""
    return servicio.evaluar_devolucion(entrada)


@router.post(
    "/ciclo-politica",
    response_model=RespuestaCicloPolitica,
    status_code=status.HTTP_200_OK,
    summary="Ejecutar el orquestador PolicyLifecycleGraph completo con LangGraph StateGraph",
    dependencies=[Depends(requerir_permiso("ia:analizar", nivel_minimo="declarada"))],
)
async def ejecutar_ciclo_politica_endpoint(
    entrada: EntradaCicloPolitica,
    servicio: Annotated[ServicioIA, Depends(obtener_servicio_ia)],
) -> RespuestaCicloPolitica:
    """Ejecuta los 6 nodos deterministas del ciclo de vida de política pública garantizando
    convergencia a END."""
    return await servicio.ejecutar_ciclo_politica_async(entrada)
