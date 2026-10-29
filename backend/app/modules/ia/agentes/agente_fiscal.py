"""Agente Fiscal y Presupuestal para POLIS (Cartagena Seguridad Humana).

Especialista en consistencia presupuestal (Ley 819 de 2003 / MFMP), articulación
de fuentes de financiación (FONSET, SGP, SGR, ICLD) y régimen de vigencias futuras
ordinarias y excepcionales (Ley 1483 de 2011).
"""

from __future__ import annotations

import os
from decimal import Decimal

from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel

from app.modules.ia.prompts import PROMPT_SISTEMA_FISCAL
from app.modules.ia.schemas import (
    AlertaVigenciasFuturas,
    DesgloseFuente,
    EntradaFiscal,
    FuenteFinanciacion,
    ResultadoFiscal,
    RiesgoFiscal,
    TipoVigenciaFutura,
)
from app.modules.sesion.security import generar_uuidv7


class AgenteFiscal:
    """Agente para viabilidad financiera, costeo y vigencias futuras territoriales."""

    def __init__(self) -> None:
        self.prompt_sistema = PROMPT_SISTEMA_FISCAL
        modelo = os.getenv("POLIS_IA_MODELO", "test")
        if modelo == "test" or not os.getenv("OPENAI_API_KEY"):
            self.agent = Agent(
                TestModel(),
                system_prompt=self.prompt_sistema,
                output_type=ResultadoFiscal,
            )
        else:
            self.agent = Agent(
                modelo,
                system_prompt=self.prompt_sistema,
                output_type=ResultadoFiscal,
            )

    def evaluar_vigencias_futuras(self, entrada: EntradaFiscal) -> AlertaVigenciasFuturas:
        """Determina el régimen aplicable de vigencias futuras según Ley 819/03 y Ley 1483/11."""
        trasciende = entrada.horizonte_anos > 4
        condiciones: list[str] = []

        if not trasciende:
            if entrada.horizonte_anos == 1:
                tipo = TipoVigenciaFutura.NO_REQUIERE
                requiere_concejo = False
                requiere_confis = False
                ano_maximo = "N/A (Ejecución dentro de la vigencia fiscal ordinaria)"
                fundamento = "Decreto 111 de 1996 (Estatuto Orgánico del Presupuesto, principio de anualidad)."
            else:
                tipo = TipoVigenciaFutura.ORDINARIA_LEY_819
                requiere_concejo = False
                requiere_confis = True
                ano_maximo = "Durante el cuatrienio constitucional del Alcalde"
                fundamento = "Artículo 12 de la Ley 819 de 2003 (Vigencias Futuras Ordinarias Territoriales)."
                condiciones.append("El proyecto debe estar consignado en el Plan de Desarrollo Distrital.")
                condiciones.append("Requiere aval previo del CONFIS Distrital de Cartagena.")
        else:
            # Trasciende el período de gobierno: Ley 1483 de 2011
            tipo = TipoVigenciaFutura.EXCEPCIONAL_LEY_1483
            requiere_concejo = True
            requiere_confis = True
            ano_maximo = "Primer o segundo año del período de gobierno del Alcalde Mayor"
            fundamento = (
                "Artículo 1 de la Ley 1483 de 2011 (Vigencias Futuras Excepcionales para Entidades Territoriales)."
            )
            condiciones.append("El proyecto debe estar consignado en el Plan de Desarrollo Distrital.")
            condiciones.append(
                "Exige declaratoria previa de importancia estratégica aprobada por el Consejo de Gobierno."
            )
            condiciones.append("No puede exceder la capacidad de pago del Distrito (semáforos de la Ley 358 de 1997).")
            condiciones.append(
                "Requiere autorización expresa del Concejo Distrital de Cartagena mediante Acuerdo Distrital."
            )
            condiciones.append(
                "Sector estratégico elegible: Infraestructura, transporte, educación, salud o seguridad humana."
            )

        return AlertaVigenciasFuturas(
            tipo_vigencia=tipo,
            trasciende_periodo_gobierno=trasciende,
            requiere_acuerdo_concejo=requiere_concejo,
            requiere_aval_confis=requiere_confis,
            ano_maximo_compromiso_concejo=ano_maximo,
            fundamento_legal=fundamento,
            condiciones_excepcionales_cumplidas=condiciones,
        )

    def estructurar_canasta_fuentes(self, entrada: EntradaFiscal) -> list[DesgloseFuente]:
        """Diseña la canasta de fuentes óptima según el sector y normativa colombiana."""
        total = entrada.costo_estimado_total_cop
        sector = entrada.sector_inversion.lower()
        fuentes: list[DesgloseFuente] = []

        if "seguridad" in sector or "convivencia" in sector:
            # Prioridad FONSET (Ley 418/97, Ley 1421) + ICLD
            monto_fonset = total * Decimal("0.60")
            monto_icld = total * Decimal("0.40")
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.FONSET,
                    porcentaje=Decimal("60.0"),
                    monto_estimado_cop=monto_fonset,
                    base_legal=(
                        "Ley 418 de 1997, Ley 1421 de 2010 y Decreto 1066 de 2015 (Fondo Territorial de Seguridad)."
                    ),
                    destinacion_permitida=(
                        "Dotación, tecnología, movilidad policial, casas de justicia, convivencia y alertas tempranas."
                    ),
                )
            )
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.ICLD,
                    porcentaje=Decimal("40.0"),
                    monto_estimado_cop=monto_icld,
                    base_legal=("Ley 617 de 2000 (Ingresos Corrientes de Libre Destinación del Distrito)."),
                    destinacion_permitida=(
                        "Programas sociales de prevención comunitaria, gestión del riesgo e inclusión ciudadana."
                    ),
                )
            )
        elif "educaci" in sector or "salud" in sector:
            # SGP forzoso (Ley 715/01) + ICLD
            monto_sgp = total * Decimal("0.70")
            monto_icld = total * Decimal("0.30")
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.SGP,
                    porcentaje=Decimal("70.0"),
                    monto_estimado_cop=monto_sgp,
                    base_legal=("Ley 715 de 2001 y Ley 1176 de 2007 (Sistema General de Participaciones)."),
                    destinacion_permitida=(
                        "Destinación forzosa sectorial en educación formal o prestación del servicio de salud pública."
                    ),
                )
            )
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.ICLD,
                    porcentaje=Decimal("30.0"),
                    monto_estimado_cop=monto_icld,
                    base_legal="Ley 617 de 2000 (Recursos Propios Distritales).",
                    destinacion_permitida=("Infraestructura complementaria y programas territoriales de bienestar."),
                )
            )
        elif "infraestructura" in sector or "movilidad" in sector or "agua" in sector:
            # SGR (Regalías) + ICLD
            monto_sgr = total * Decimal("0.50")
            monto_icld = total * Decimal("0.30")
            monto_credito = total * Decimal("0.20")
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.SGR,
                    porcentaje=Decimal("50.0"),
                    monto_estimado_cop=monto_sgr,
                    base_legal=("Ley 2056 de 2020 (Sistema General de Regalías - Asignaciones Regionales y Directas)."),
                    destinacion_permitida=(
                        "Proyectos de inversión de impacto territorial y cierre de brechas de infraestructura."
                    ),
                )
            )
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.ICLD,
                    porcentaje=Decimal("30.0"),
                    monto_estimado_cop=monto_icld,
                    base_legal="Ley 617 de 2000 (Recursos Propios del Distrito de Cartagena).",
                    destinacion_permitida="Mantenimiento y contrapartida distrital obligatoria.",
                )
            )
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.CREDITO_PUBLICO,
                    porcentaje=Decimal("20.0"),
                    monto_estimado_cop=monto_credito,
                    base_legal=("Ley 358 de 1997 (Endeudamiento territorial con sujeción a límites de solvencia)."),
                    destinacion_permitida=("Inversión física productiva con retorno social y económico."),
                )
            )
        else:
            # Canasta general ICLD y FONSET
            monto_icld = total * Decimal("0.70")
            monto_coop = total * Decimal("0.30")
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.ICLD,
                    porcentaje=Decimal("70.0"),
                    monto_estimado_cop=monto_icld,
                    base_legal="Ley 617 de 2000.",
                    destinacion_permitida="Gasto de inversión del Distrito de Cartagena.",
                )
            )
            fuentes.append(
                DesgloseFuente(
                    fuente=FuenteFinanciacion.COOPERACION_INTERNACIONAL,
                    porcentaje=Decimal("30.0"),
                    monto_estimado_cop=monto_coop,
                    base_legal=("Mecanismos de cooperación bilateral y multilateral no reembolsable (APC Colombia)."),
                    destinacion_permitida=("Asistencia técnica, fortalecimiento institucional y derechos humanos."),
                )
            )

        return fuentes

    def analizar(self, entrada: EntradaFiscal) -> ResultadoFiscal:
        """Motor determinista de evaluación de viabilidad fiscal y vigencias futuras."""
        alerta_vf = self.evaluar_vigencias_futuras(entrada)
        fuentes = self.estructurar_canasta_fuentes(entrada)
        recomendaciones: list[str] = []

        total = entrada.costo_estimado_total_cop

        # Calificación de riesgo fiscal y consistencia
        if total <= Decimal("0.0"):
            riesgo = RiesgoFiscal.INVIABLE
            es_viable = False
            consistencia_mfmp = False
            recomendaciones.append(
                "La política pública no cuenta con costeo financiero cuanti"
                "ficable. Viola la Sentencia T-025/04 (políticas de papel)."
            )
        elif alerta_vf.tipo_vigencia == TipoVigenciaFutura.EXCEPCIONAL_LEY_1483:
            if entrada.cuenta_con_declaratoria_estrategica:
                riesgo = RiesgoFiscal.BAJO
                es_viable = True
                consistencia_mfmp = True
                recomendaciones.append(
                    "Cuenta con declaratoria estratégica previa. Tramitar Proyecto de "
                    "Acuerdo ante el Concejo Distrital en el 1er o 2do año del mandato."
                )
            else:
                riesgo = RiesgoFiscal.MEDIO
                es_viable = True
                consistencia_mfmp = True
                recomendaciones.append(
                    "Vigencias futuras excepcionales detectadas: Se requiere someter "
                    "prioritariamente a consideración del Consejo de Gobierno la decl"
                    "aratoria de importancia estratégica antes de radicar en el Conce"
                    "jo."
                )
        else:
            riesgo = RiesgoFiscal.BAJO
            es_viable = True
            consistencia_mfmp = True
            recomendaciones.append(
                "El costeo se ajusta al cuatrienio constitucional. Requiere aprob"
                "ación ordinaria por CONFIS Distrital de Cartagena."
            )

        # Registro en banco de proyectos
        recomendaciones.append(
            "Obligatoriedad de formulación MGA para asignación de código BPIN"
            " / BPIT Distrital previo a expedición de CDP/RP."
        )

        dictamen = (
            "Concepto Fiscal para '"
            f"{entrada.titulo}"
            "': Costo Total: $"
            f"{total:,.2f}"
            " COP a "
            f"{entrada.horizonte_anos}"
            " años. Riesgo Fiscal: "
            f"{riesgo.value.upper()}"
            ". Viabilidad: "
            f"{('APROBADO' if es_viable else 'RECHAZADO')}"
            ". Régimen de Vigencias Futuras: "
            f"{alerta_vf.tipo_vigencia.value}"
            ". Se proyecta canasta de financiación con "
            f"{len(fuentes)}"
            " fuentes principales."
        )

        return ResultadoFiscal(
            evaluacion_id=generar_uuidv7(),
            politica_id=entrada.politica_id,
            es_viable=es_viable,
            riesgo_fiscal=riesgo,
            costo_total_validado_cop=total,
            fuentes_recomendadas=fuentes,
            alerta_vigencias_futuras=alerta_vf,
            consistencia_mfmp=consistencia_mfmp,
            requiere_codigo_bpin_bpit=True,
            recomendaciones_presupuestales=recomendaciones,
            dictamen_fiscal_motivado=dictamen,
        )
