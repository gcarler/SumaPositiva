"""Orquestador central del ciclo de vida de la política pública (LangGraph).

Implementa PolicyLifecycleGraph como un StateGraph determinista, sin ciclos infinitos,
con control estricto de transiciones y confluencia de los 4 agentes especializados.
"""

from __future__ import annotations

import uuid

from langgraph.graph import END, START, StateGraph

from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.ia.grafo.estado import EstadoCicloPolitica
from app.modules.ia.grafo.nodos import (
    nodo_consolidacion_adopcion,
    nodo_deliberacion_consulta,
    nodo_devolucion_motivada,
    nodo_diagnostico,
    nodo_viabilidad_fiscal,
    nodo_viabilidad_juridica,
)
from app.modules.ia.grafo.transiciones import (
    ruta_tras_diagnostico,
    ruta_tras_viabilidad_fiscal,
    ruta_tras_viabilidad_juridica,
)
from app.modules.ia.schemas import (
    EntradaCicloPolitica,
    RespuestaCicloPolitica,
    ResultadoDevolucion,
    ResultadoDiagnostico,
    ResultadoFiscal,
    ResultadoJuridico,
)


class PolicyLifecycleGraph:
    """Orquestador LangGraph StateGraph para el ciclo completo de políticas en Cartagena."""

    def __init__(self) -> None:
        self.workflow = self._construir_grafo()
        self.app = self.workflow.compile()

    def _construir_grafo(self) -> StateGraph:
        """Construye la topología del grafo con sus 6 nodos y transiciones condicionales."""
        builder = StateGraph(EstadoCicloPolitica)

        # 1. Registrar nodos ejecutores
        builder.add_node("diagnostico", nodo_diagnostico)
        builder.add_node("viabilidad_juridica", nodo_viabilidad_juridica)
        builder.add_node("viabilidad_fiscal", nodo_viabilidad_fiscal)
        builder.add_node("deliberacion_consulta", nodo_deliberacion_consulta)
        builder.add_node("devolucion_motivada", nodo_devolucion_motivada)
        builder.add_node("consolidacion_adopcion", nodo_consolidacion_adopcion)

        # 2. Conectar inicio
        builder.add_edge(START, "diagnostico")

        # 3. Transiciones condicionales con control de iteraciones
        builder.add_conditional_edges(
            "diagnostico",
            ruta_tras_diagnostico,
            {
                "viabilidad_juridica": "viabilidad_juridica",
                "diagnostico": "diagnostico",
                "devolucion_motivada": "devolucion_motivada",
            },
        )

        builder.add_conditional_edges(
            "viabilidad_juridica",
            ruta_tras_viabilidad_juridica,
            {
                "viabilidad_fiscal": "viabilidad_fiscal",
                "viabilidad_juridica": "viabilidad_juridica",
                "devolucion_motivada": "devolucion_motivada",
            },
        )

        builder.add_conditional_edges(
            "viabilidad_fiscal",
            ruta_tras_viabilidad_fiscal,
            {
                "deliberacion_consulta": "deliberacion_consulta",
                "viabilidad_fiscal": "viabilidad_fiscal",
                "devolucion_motivada": "devolucion_motivada",
            },
        )

        # 4. Transiciones lineales convergentes
        builder.add_edge("deliberacion_consulta", "devolucion_motivada")
        builder.add_edge("devolucion_motivada", "consolidacion_adopcion")
        builder.add_edge("consolidacion_adopcion", END)

        return builder

    def inicializar_estado(
        self, entrada: EntradaCicloPolitica, *, corte: ContextoCorte | None = None
    ) -> EstadoCicloPolitica:
        """Prepara el estado inicial tipado para el flujo del grafo."""
        propuestas_serializadas = [p.model_dump(mode="json") for p in entrada.propuestas_ciudadanas]

        return {
            "politica_id": str(entrada.politica_id),
            "run_id": str(corte.run_id) if corte is not None else None,
            "corte": corte.referencia() if corte is not None else None,
            "titulo": entrada.titulo,
            "descripcion": entrada.descripcion,
            "sector": entrada.sector,
            "fase_actual": "inicio",
            "problema_central": entrada.problema_central,
            "causas_directas": entrada.causas_directas,
            "causas_indirectas": entrada.causas_indirectas,
            "efectos_directos": entrada.efectos_directos,
            "efectos_indirectos": entrada.efectos_indirectos,
            "lineas_accion": entrada.lineas_accion,
            "territorios_afectados": entrada.territorios_afectados,
            "es_territorio_etnico": entrada.es_territorio_etnico,
            "poblacion_objetivo": entrada.poblacion_objetivo,
            "costo_estimado_total_cop": str(entrada.costo_estimado_total_cop),
            "horizonte_anos": entrada.horizonte_anos,
            "fuentes_propuestas": entrada.fuentes_propuestas,
            "propuestas_ciudadanas": propuestas_serializadas,
            "resultado_diagnostico": None,
            "resultado_juridico": None,
            "resultado_fiscal": None,
            "resultado_devolucion": None,
            "diagnostico_aprobado": False,
            "viabilidad_juridica_aprobada": False,
            "consulta_previa_requerida": False,
            "viabilidad_fiscal_aprobada": False,
            "deliberacion_completada": False,
            "devolucion_completada": False,
            "adopcion_aprobada": False,
            "ciclo_completado_exitosamente": False,
            "acto_administrativo_sugerido": "Pendiente de dictamen",
            "iteracion_diagnostico": 0,
            "iteracion_juridica": 0,
            "iteracion_fiscal": 0,
            "iteracion_total": 0,
            "max_iteraciones": entrada.max_iteraciones,
            "historial_estados": ["inicio"],
            "bitacora_mensajes": [f"[SISTEMA] Iniciando ciclo de política pública: '{entrada.titulo}'"],
            "errores": [],
        }

    def ejecutar_ciclo(
        self, entrada: EntradaCicloPolitica, *, corte: ContextoCorte | None = None
    ) -> RespuestaCicloPolitica:
        """Ejecuta sincrónicamente el StateGraph completo determinista."""
        estado_inicial = self.inicializar_estado(entrada, corte=corte)
        estado_final = self.app.invoke(estado_inicial)
        return self._transformar_respuesta(estado_final)

    async def ejecutar_ciclo_async(
        self, entrada: EntradaCicloPolitica, *, corte: ContextoCorte | None = None
    ) -> RespuestaCicloPolitica:
        """Ejecuta asincrónicamente el StateGraph completo."""
        estado_inicial = self.inicializar_estado(entrada, corte=corte)
        estado_final = await self.app.ainvoke(estado_inicial)
        return self._transformar_respuesta(estado_final)

    def _transformar_respuesta(self, estado: EstadoCicloPolitica) -> RespuestaCicloPolitica:
        """Mapea el TypedDict a la estructura Pydantic v2 validada."""
        res_diag = (
            ResultadoDiagnostico.model_validate(estado["resultado_diagnostico"])
            if estado.get("resultado_diagnostico")
            else None
        )
        res_jur = (
            ResultadoJuridico.model_validate(estado["resultado_juridico"]) if estado.get("resultado_juridico") else None
        )
        res_fisc = (
            ResultadoFiscal.model_validate(estado["resultado_fiscal"]) if estado.get("resultado_fiscal") else None
        )
        res_dev = (
            ResultadoDevolucion.model_validate(estado["resultado_devolucion"])
            if estado.get("resultado_devolucion")
            else None
        )

        return RespuestaCicloPolitica(
            politica_id=uuid.UUID(estado["politica_id"]),
            run_id=uuid.UUID(estado["run_id"]) if estado.get("run_id") else None,
            corte=estado.get("corte"),
            alcance_corte=(
                "REFERENCIA_VERIFICADA_PROPUESTA_NO_CONCILIADA_CON_FUENTES"
                if estado.get("corte")
                else "EVALUACION_DE_PROPUESTA_INDEPENDIENTE"
            ),
            titulo=estado["titulo"],
            fase_final=estado["fase_actual"],
            ciclo_completado_exitosamente=estado["ciclo_completado_exitosamente"],
            iteraciones_totales=estado["iteracion_total"],
            diagnostico_aprobado=estado["diagnostico_aprobado"],
            viabilidad_juridica_aprobada=estado["viabilidad_juridica_aprobada"],
            consulta_previa_requerida=estado["consulta_previa_requerida"],
            viabilidad_fiscal_aprobada=estado["viabilidad_fiscal_aprobada"],
            deliberacion_completada=estado["deliberacion_completada"],
            devolucion_completada=estado["devolucion_completada"],
            adopcion_aprobada=estado["adopcion_aprobada"],
            acto_administrativo_sugerido=estado["acto_administrativo_sugerido"],
            resultado_diagnostico=res_diag,
            resultado_juridico=res_jur,
            resultado_fiscal=res_fisc,
            resultado_devolucion=res_dev,
            historial_estados=estado["historial_estados"],
            bitacora_mensajes=estado["bitacora_mensajes"],
            errores=estado["errores"],
        )
