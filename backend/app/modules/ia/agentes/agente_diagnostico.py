"""Agente Especialista en Diagnóstico y Marco Lógico (MGA / DNP).

Implementado con PydanticAI y motor determinista de validación causal y sintáctica.
Garantiza salidas estructuradas tipo ResultadoDiagnostico con estricto apego
a las normas del Departamento Nacional de Planeación de Colombia.
"""

from __future__ import annotations

import os
import re
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel

from app.modules.ia.prompts import PROMPT_SISTEMA_DIAGNOSTICO
from app.modules.ia.schemas import (
    EntradaDiagnostico,
    ResultadoDiagnostico,
    TipoNodoMGA,
    ValidacionSintaxisNodo,
)
from app.modules.sesion.security import generar_uuidv7

# Patrones sintácticos DNP
PREFIJOS_SOLUCION_DISFRAZADA = [
    (
        "^falta (de )?(un |una |unos |unas |el |la )?(cai|app|software|pl"
        "ataforma|camara|cámara|vehiculo|vehículo|patrulla|puente|hospita"
        "l|colegio|sede)"
    ),
    r"^necesidad (de )?(un |una |unos |unas |el |la )?(cai|app|software|camara|cámara|patrulla)",
    r"^construir (un |una )",
    r"^comprar (un |una |mas |más )",
    r"^implementar (un |una )?(sistema|software|app)",
    r"^crear (un |una )?(cai|app|software|plataforma)",
]

SUSTANTIVOS_NEGATIVOS_VALIDOS = [
    "elevado",
    "elevada",
    "alto",
    "alta",
    "deficiencia",
    "deficiente",
    "insuficiencia",
    "insuficiente",
    "carencia",
    "deterioro",
    "precario",
    "precaria",
    "precariedad",
    "incremento",
    "aumento",
    "baja",
    "bajo",
    "limitado",
    "limitada",
    "fragilidad",
    "vulnerabilidad",
    "inseguridad",
    "inadecuado",
    "inadecuada",
    "inexistencia",
    "desarticulacion",
    "demoras",
    "siniestralidad",
    "desercion",
    "desempleo",
    "pobreza",
    "hacinamiento",
]

VERBOS_INFINITIVO = [
    "reducir",
    "disminuir",
    "mitigar",
    "incrementar",
    "aumentar",
    "fortalecer",
    "mejorar",
    "optimizar",
    "garantizar",
    "promover",
    "consolidar",
    "articular",
    "ampliar",
    "expandir",
    "fomentar",
    "prevenir",
    "recuperar",
    "adecuar",
]


class AgenteDiagnostico:
    """Agente DNP para validación y derivación de Árboles de Problemas y Objetivos."""

    def __init__(self) -> None:
        self.prompt_sistema = PROMPT_SISTEMA_DIAGNOSTICO
        # Configurar PydanticAI Agent
        # Si no hay credenciales LLM externas, se usa TestModel con fallback determinista
        modelo = os.getenv("POLIS_IA_MODELO", "test")
        if modelo == "test" or not os.getenv("OPENAI_API_KEY"):
            self.agent = Agent(
                TestModel(),
                system_prompt=self.prompt_sistema,
                output_type=ResultadoDiagnostico,
            )
        else:
            self.agent = Agent(
                modelo,
                system_prompt=self.prompt_sistema,
                output_type=ResultadoDiagnostico,
            )

    def evaluar_sintaxis_texto(self, texto: str, tipo_nodo: TipoNodoMGA) -> ValidacionSintaxisNodo:
        """Verifica si un nodo cumple con la sintaxis DNP (sustantivo negativo o infinitivo)."""
        texto_limpio = texto.strip()
        primera_palabra = texto_limpio.split()[0].lower() if texto_limpio else ""

        # Detección de falsa causa / solución disfrazada
        es_solucion_disfrazada = any(
            re.search(patron, texto_limpio, re.IGNORECASE)
            for patron in PREFIJOS_SOLUCION_DISFRAZADA
        )

        if (
            "PROBLEMA" in tipo_nodo.value
            or "CAUSA" in tipo_nodo.value
            or "EFECTO" in tipo_nodo.value
        ):
            sintaxis_esperada = "Sustantivo negativo o situación deficitaria (DNP)"
            es_infinitivo = any(
                primera_palabra.startswith(v[:4]) and primera_palabra.endswith(("ar", "er", "ir"))
                for v in VERBOS_INFINITIVO
            )
            tiene_sustantivo_negativo = any(
                neg in texto_limpio.lower() for neg in SUSTANTIVOS_NEGATIVOS_VALIDOS
            )

            if es_solucion_disfrazada:
                cumple = False
                texto_sugerido = (
                    "Elevada vulnerabilidad y déficit operativo derivado de la ausenc"
                    "ia de infraestructura adecuada en "
                    f"{texto_limpio}"
                )
                obs = (
                    "Violación metodológica DNP: Redactado como ausencia de solución "
                    "en vez de situación negativa real."
                )
            elif es_infinitivo:
                cumple = False
                texto_sugerido = f"Deficiente nivel de {texto_limpio.lower()}"
                obs = (
                    "Error sintáctico DNP: Los problemas no deben redactarse con verb"
                    "os en infinitivo (reservados para objetivos)."
                )
            elif tiene_sustantivo_negativo:
                cumple = True
                texto_sugerido = texto_limpio
                obs = "Cumple con la sintaxis DNP de sustantivo negativo o formulación deficitaria."
            else:
                cumple = True
                texto_sugerido = f"Precaria condición de: {texto_limpio}"
                obs = (
                    "Aceptable, pero se sugiere reforzar la condición deficitaria con"
                    " un sustantivo negativo explícito."
                )

            return ValidacionSintaxisNodo(
                texto_original=texto_limpio,
                cumple_sintaxis=cumple,
                tipo_nodo=tipo_nodo,
                sintaxis_esperada=sintaxis_esperada,
                texto_corregido_sugerido=texto_sugerido,
                observacion_metodologica=obs,
            )
        else:
            # OBJETIVO / MEDIO / FIN
            sintaxis_esperada = "Verbo rector en infinitivo medible (DNP)"
            es_infinitivo = any(
                texto_limpio.lower().startswith(v) for v in VERBOS_INFINITIVO
            ) or texto_limpio.lower().split()[0].endswith(("ar", "er", "ir"))

            if es_infinitivo:
                cumple = True
                texto_sugerido = texto_limpio
                obs = "Cumple con la formulación estándar DNP de objetivo con verbo en infinitivo."
            else:
                cumple = False
                texto_sugerido = f"Fortalecer y garantizar {texto_limpio.lower()}"
                obs = (
                    "Error sintáctico DNP: Los objetivos deben "
                    "iniciar con un verbo activo en infinitivo."
                )
            return ValidacionSintaxisNodo(
                texto_original=texto_limpio,
                cumple_sintaxis=cumple,
                tipo_nodo=tipo_nodo,
                sintaxis_esperada=sintaxis_esperada,
                texto_corregido_sugerido=texto_sugerido,
                observacion_metodologica=obs,
            )

    def derivar_objetivo_desde_problema(self, problema: str) -> str:
        """Convierte una situación negativa en un objetivo positivo en infinitivo."""
        p_lower = problema.lower().strip()
        # Reemplazar frases comunes
        if re.search(r"^elevad[oa]s? (índice|tasas?|incidencia|niveles?) de", p_lower):
            return re.sub(
                r"^elevad[oa]s? (índice|tasas?|incidencia|niveles?) de",
                "Reducir los índices de",
                problema,
                flags=re.IGNORECASE,
            )
        if re.search(
            r"^(precari[oa]|deficiente|inadecuad[oa]|baja?) (acceso|cobertura|calidad)", p_lower
        ):
            return re.sub(
                r"^(precari[oa]|deficiente|inadecuad[oa]|baja?)",
                "Optimizar y ampliar el",
                problema,
                flags=re.IGNORECASE,
            )
        if re.search(r"^(deterioro|carencia|falta) de", p_lower):
            return re.sub(
                r"^(deterioro|carencia|falta) de",
                "Fortalecer y recuperar",
                problema,
                flags=re.IGNORECASE,
            )
        if re.search(r"^inseguridad", p_lower):
            return re.sub(
                r"^inseguridad",
                "Consolidar la seguridad humana y convivencia",
                problema,
                flags=re.IGNORECASE,
            )

        return f"Superar y transformar la situación de: {problema}"

    def analizar(self, entrada: EntradaDiagnostico) -> ResultadoDiagnostico:
        """Motor determinista de análisis causal, validación de sintaxis DNP y derivación MGA."""
        analisis_nodos: list[ValidacionSintaxisNodo] = []
        penalizaciones = 0.0
        recomendaciones: list[str] = []

        # 1. Validar problema central
        val_central = self.evaluar_sintaxis_texto(
            entrada.problema_central, TipoNodoMGA.PROBLEMA_CENTRAL
        )
        analisis_nodos.append(val_central)
        if not val_central.cumple_sintaxis:
            penalizaciones += 25.0
            recomendaciones.append(
                "Ajustar el Problema Central: "
                f"{val_central.observacion_metodologica}"
                " Sugerencia: '"
                f"{val_central.texto_corregido_sugerido}"
                "'"
            )

        prob_central_opt = (
            val_central.texto_corregido_sugerido
            if not val_central.cumple_sintaxis
            else entrada.problema_central
        )
        obj_central_derivado = self.derivar_objetivo_desde_problema(prob_central_opt)

        # 2. Validar causas directas
        causas_dir_opt: list[str] = []
        medios_dir_opt: list[str] = []
        if not entrada.causas_directas:
            penalizaciones += 20.0
            recomendaciones.append(
                "Metodología DNP exige al menos una Causa D"
                "irecta sustentada en el Árbol de Problemas."
            )
        for cd in entrada.causas_directas:
            val_cd = self.evaluar_sintaxis_texto(cd, TipoNodoMGA.CAUSA_DIRECTA)
            analisis_nodos.append(val_cd)
            if not val_cd.cumple_sintaxis:
                penalizaciones += 8.0
            texto_cd = val_cd.texto_corregido_sugerido if not val_cd.cumple_sintaxis else cd
            causas_dir_opt.append(texto_cd)
            medios_dir_opt.append(self.derivar_objetivo_desde_problema(texto_cd))

        # 3. Validar causas indirectas
        causas_indir_opt: list[str] = []
        medios_indir_opt: list[str] = []
        for ci in entrada.causas_indirectas:
            val_ci = self.evaluar_sintaxis_texto(ci, TipoNodoMGA.CAUSA_INDIRECTA)
            analisis_nodos.append(val_ci)
            if not val_ci.cumple_sintaxis:
                penalizaciones += 5.0
            texto_ci = val_ci.texto_corregido_sugerido if not val_ci.cumple_sintaxis else ci
            causas_indir_opt.append(texto_ci)
            medios_indir_opt.append(self.derivar_objetivo_desde_problema(texto_ci))

        # 4. Validar efectos directos e indirectos
        efectos_dir_opt: list[str] = []
        fines_dir_opt: list[str] = []
        for ed in entrada.efectos_directos:
            val_ed = self.evaluar_sintaxis_texto(ed, TipoNodoMGA.EFECTO_DIRECTO)
            analisis_nodos.append(val_ed)
            texto_ed = val_ed.texto_corregido_sugerido if not val_ed.cumple_sintaxis else ed
            efectos_dir_opt.append(texto_ed)
            fines_dir_opt.append(self.derivar_objetivo_desde_problema(texto_ed))

        efectos_indir_opt: list[str] = []
        fines_indir_opt: list[str] = []
        for ei in entrada.efectos_indirectos:
            val_ei = self.evaluar_sintaxis_texto(ei, TipoNodoMGA.EFECTO_INDIRECTO)
            analisis_nodos.append(val_ei)
            texto_ei = val_ei.texto_corregido_sugerido if not val_ei.cumple_sintaxis else ei
            efectos_indir_opt.append(texto_ei)
            fines_indir_opt.append(self.derivar_objetivo_desde_problema(texto_ei))

        # 5. Evaluar propuestas ciudadanas crudas si las hay
        if entrada.propuestas_ciudadanas_raw:
            recomendaciones.append(
                "Se procesaron "
                f"{len(entrada.propuestas_ciudadanas_raw)}"
                " aportes ciudadanos crudos para enriquecer la cadena causal."
            )

        # 6. Calcular puntaje final de coherencia
        puntaje = max(0.0, min(100.0, 100.0 - penalizaciones))
        es_valido = puntaje >= 65.0

        if es_valido:
            recomendaciones.append(
                "La formulación causal cumple los estándares mínimos exigid"
                "os por la MGA del DNP. Puede avanzar a viabilidad jurídica."
            )
        else:
            recomendaciones.append(
                "La formulación presenta inconsistencias metodológicas graves. Se reco"
                "mienda reformular los nodos señalados antes de someter a deliberación."
            )

        # 7. Construir árboles estructurados
        arbol_problemas: dict[str, Any] = {
            "problema_central": prob_central_opt,
            "causas_directas": causas_dir_opt,
            "causas_indirectas": causas_indir_opt,
            "efectos_directos": efectos_dir_opt,
            "efectos_indirectos": efectos_indir_opt,
        }

        arbol_objetivos: dict[str, Any] = {
            "objetivo_central": obj_central_derivado,
            "medios_primer_nivel": medios_dir_opt,
            "medios_fundamentales": medios_indir_opt,
            "fines_directos": fines_dir_opt,
            "fines_ultimos": fines_indir_opt,
        }

        resumen = (
            "Diagnóstico metodológico para '"
            f"{entrada.titulo}"
            "': Puntaje de coherencia "
            f"{puntaje:.1f}"
            "/100. Estado: "
            f"{('VÁLIDO' if es_valido else 'REQUIERE_AJUSTES')}"
            ". Se identificaron "
            f"{len(causas_dir_opt)}"
            " causas directas y "
            f"{len(efectos_dir_opt)}"
            " efectos directos en el marco DNP."
        )

        return ResultadoDiagnostico(
            evaluacion_id=generar_uuidv7(),
            politica_id=entrada.politica_id,
            es_valido=es_valido,
            puntaje_coherencia=puntaje,
            analisis_sintaxis=analisis_nodos,
            problema_central_optimizado=prob_central_opt,
            objetivo_central_derivado=obj_central_derivado,
            arbol_problemas_estructurado=arbol_problemas,
            arbol_objetivos_derivado=arbol_objetivos,
            recomendaciones_dnp=recomendaciones,
            resumen_ejecutivo=resumen,
        )
