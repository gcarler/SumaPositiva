"""Estado canónico del ciclo de vida de la política pública para LangGraph StateGraph.

Spanish-First, fuertemente tipado, auditable y con control estricto de iteraciones
para garantizar determinismo y proscripción de bucles infinitos.
"""

from __future__ import annotations

from typing import Any, TypedDict


class EstadoCicloPolitica(TypedDict):
    """Estado compartido a través de todos los nodos del StateGraph de LangGraph."""

    politica_id: str
    run_id: str | None
    corte: dict[str, str] | None
    titulo: str
    descripcion: str
    sector: str
    fase_actual: str

    # Entradas de las distintas etapas
    problema_central: str
    causas_directas: list[str]
    causas_indirectas: list[str]
    efectos_directos: list[str]
    efectos_indirectos: list[str]
    lineas_accion: list[str]
    territorios_afectados: list[str]
    es_territorio_etnico: bool
    poblacion_objetivo: str
    costo_estimado_total_cop: str  # Serializado en string para compatibilidad de estado
    horizonte_anos: int
    fuentes_propuestas: list[str]
    propuestas_ciudadanas: list[dict[str, Any]]

    # Salidas estructuradas de los 4 agentes especializados
    resultado_diagnostico: dict[str, Any] | None
    resultado_juridico: dict[str, Any] | None
    resultado_fiscal: dict[str, Any] | None
    resultado_devolucion: dict[str, Any] | None

    # Banderas booleanas de gobernanza
    diagnostico_aprobado: bool
    viabilidad_juridica_aprobada: bool
    consulta_previa_requerida: bool
    viabilidad_fiscal_aprobada: bool
    deliberacion_completada: bool
    devolucion_completada: bool
    adopcion_aprobada: bool
    ciclo_completado_exitosamente: bool

    # Acto administrativo consolidado
    acto_administrativo_sugerido: str

    # Control estricto de iteraciones para evitar ciclos infinitos
    iteracion_diagnostico: int
    iteracion_juridica: int
    iteracion_fiscal: int
    iteracion_total: int
    max_iteraciones: int

    # Auditoría, trazabilidad y bitácora
    historial_estados: list[str]
    bitacora_mensajes: list[str]
    errores: list[str]
