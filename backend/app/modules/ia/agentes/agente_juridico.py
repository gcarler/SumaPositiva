"""Agente Jurídico y Constitucional para POLIS (Cartagena Seguridad Humana).

Especialista en control preventivo de constitucionalidad, competencias territoriales
(Ley 1454 de 2011 LOOT, Ley 715 de 2001 SGP, Ley 1617 de 2013), salvaguarda reforzada
de Consulta Previa (Convenio 169 OIT / SU-123 de 2018) y principio de no regresividad DESCA.
"""

from __future__ import annotations

import os

from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel

from app.modules.ia.prompts import PROMPT_SISTEMA_JURIDICO
from app.modules.ia.schemas import (
    AlertaConsultaPrevia,
    ControlRegresividadDESCA,
    EntradaJuridica,
    NivelCompetencia,
    ResultadoJuridico,
)
from app.modules.sesion.security import generar_uuidv7

# Catálogo territorial de zonas étnicas de Cartagena y subregión
ZONAS_ETNICAS_CARTAGENA = {
    ("tierrabomba"): (
        "Consejos Comunitarios de la Isla de Tierrabomba (Tierrabomba, Caño del Oro, Bocachica, Punta Arena)"
    ),
    "tierra bomba": "Consejos Comunitarios de la Isla de Tierrabomba",
    "bocachica": "Consejo Comunitario de Bocachica (Comunidad Negra)",
    "caño del oro": "Consejo Comunitario de Caño del Oro (Comunidad Negra / Víctimas)",
    "punta arena": "Consejo Comunitario de Punta Arena (Comunidad Negra)",
    "la boquilla": "Consejo Comunitario de La Boquilla (Territorio Colectivo Afrodescendiente)",
    "baru": "Consejo Comunitario de Barú (Isla de Barú)",
    "barú": "Consejo Comunitario de Barú (Isla de Barú)",
    "santa ana": "Consejo Comunitario de Santa Ana (Isla de Barú)",
    "ararca": "Consejo Comunitario de Ararca (Isla de Barú)",
    "pasacaballos": "Consejo Comunitario de Pasacaballos (Comunidades Negras)",
    "bayunca": "Comunidad Afrodescendiente e Indígena Zenú de Bayunca",
    "pontezuela": "Consejo Comunitario de Pontezuela",
    "arroyo de piedra": "Consejo Comunitario de Arroyo de Piedra",
    "arroyo grande": "Consejo Comunitario de Arroyo Grande",
    "palenque": "Consejo Comunitario de San Basilio de Palenque (Subregión de Influencia)",
    "membrillal": "Cabildo Indígena Zenú de Membrillal",
    "zenu": "Pueblo Indígena Zenú (Cabildos del Distrito de Cartagena)",
    "zenú": "Pueblo Indígena Zenú (Cabildos del Distrito de Cartagena)",
    "islas del rosario": "Comunidades Nativas del Archipiélago de Nuestra Señora del Rosario",
}

TERMINOS_COMPETENCIA_NACIONAL = [
    "codigo penal",
    "código penal",
    "penas de prision",
    "penas de prisión",
    "defensa nacional",
    "fuerzas militares",
    "tratados internacionales",
    "politica exterior",
    "aranceles",
    "puertos maritimos nacionales",
    "superintendencia",
    "fiscalia general",
    "fiscalía general",
]

TERMINOS_REGRESIVIDAD = [
    "recorte de subsidios",
    "eliminar subsidio",
    "reducir cobertura escolar",
    "cerrar centros de salud",
    "disminuir raciones",
    "recortar beneficios",
    "eliminar comedores",
    "suspender atencion",
    "suspender atención",
]


class AgenteJuridico:
    """Agente para control constitucional, competencias distritales y Consulta Previa."""

    def __init__(self) -> None:
        self.prompt_sistema = PROMPT_SISTEMA_JURIDICO
        modelo = os.getenv("POLIS_IA_MODELO", "test")
        if modelo == "test" or not os.getenv("OPENAI_API_KEY"):
            self.agent = Agent(
                TestModel(),
                system_prompt=self.prompt_sistema,
                output_type=ResultadoJuridico,
            )
        else:
            self.agent = Agent(
                modelo,
                system_prompt=self.prompt_sistema,
                output_type=ResultadoJuridico,
            )

    def evaluar_consulta_previa(self, entrada: EntradaJuridica) -> AlertaConsultaPrevia:
        """Determina la obligatoriedad de Consulta Previa bajo el Convenio 169 OIT y SU-123/18."""
        comunidades: list[str] = []
        territorios_detectados: list[str] = []

        texto_analizar = (
            f"{entrada.titulo}"
            " "
            f"{entrada.descripcion}"
            " "
            f"{' '.join(entrada.lineas_accion)}"
            " "
            f"{' '.join(entrada.territorios_afectados)}"
            " "
            f"{entrada.poblacion_objetivo}"
        ).lower()

        # Detección territorial
        for clave, nombre_comunidad in ZONAS_ETNICAS_CARTAGENA.items():
            if clave in texto_analizar:
                if clave not in territorios_detectados:
                    territorios_detectados.append(clave.capitalize())
                if nombre_comunidad not in comunidades:
                    comunidades.append(nombre_comunidad)

        # Si el usuario explícitamente marcó bandera étnica
        if entrada.es_territorio_etnico and not comunidades:
            comunidades.append("Comunidades Étnicas reconocidas en el Distrito de Cartagena")
            territorios_detectados.append("Territorio Colectivo / Asentamiento Étnico Declarado")

        requiere_consulta = len(comunidades) > 0 or entrada.es_territorio_etnico

        # Evaluar si requiere CLPI (Consentimiento Previo, Libre e Informado reforzado)
        palabras_clpi = [
            "reubicacion",
            "reubicación",
            "traslado",
            "dragado",
            "concesion",
            "concesión",
            "residuos",
            "desalojo",
        ]
        requiere_clpi = requiere_consulta and any(p in texto_analizar for p in palabras_clpi)

        if requiere_consulta:
            criterio = (
                "Se configura el criterio de afectación directa, diferenciada y e"
                "specífica conforme a las Sentencias C-030/08 y SU-123/18 de la C"
                "orte Constitucional, debido a la intervención en zonas con prese"
                "ncia y derechos territoriales de comunidades étnicas."
            )
        else:
            criterio = (
                "La política pública contiene medidas generales que no generan af"
                "ectación directa o diferenciada sobre pueblos étnicos según el e"
                "stándar jurisprudencial de la Corte Constitucional."
            )

        return AlertaConsultaPrevia(
            requiere_consulta_previa=requiere_consulta,
            comunidades_etnicas_identificadas=comunidades,
            territorios_colectivos_involucrados=territorios_detectados,
            criterio_afectacion_directa=criterio,
            requiere_clpi=requiere_clpi,
            fundamento_constitucional=(
                "Art. 93 CP (Bloque de Constitucionalidad), Convenio 169 de la OIT, "
                "Sentencias SU-123/18, SU-095/18 y C-366/11 de la Corte Constitucional."
            ),
        )

    def evaluar_no_regresividad(self, entrada: EntradaJuridica) -> ControlRegresividadDESCA:
        """Aplica el test de no regresividad en Derechos Sociales (C-038/04, C-503/14)."""
        texto_analizar = f"{entrada.titulo} {entrada.descripcion} {' '.join(entrada.lineas_accion)}".lower()
        riesgo = entrada.modifica_beneficios_existentes or any(t in texto_analizar for t in TERMINOS_REGRESIVIDAD)

        derechos: list[str] = [
            "Derecho a la Seguridad Humana",
            "Derecho a la Convivencia Pacífica",
        ]
        if "salud" in texto_analizar:
            derechos.append("Derecho a la Salud (Art. 49 CP)")
        if "educaci" in texto_analizar:
            derechos.append("Derecho a la Educación (Art. 67 CP)")
        if "agua" in texto_analizar or "saneamiento" in texto_analizar:
            derechos.append("Derecho al Agua Potable y Saneamiento Básico")

        advertencias: list[str] = []
        if riesgo:
            supera = False
            advertencias.append(
                "Presunción de inconstitucionalidad: Toda medida regresiva en der"
                "echos sociales exige justificación imperiosa y no vulneración de"
                "l núcleo esencial (Sentencia C-038 de 2004)."
            )
            advertencias.append("La administración debe demostrar que se agotaron alternativas menos lesivas.")
        else:
            supera = True
            advertencias.append(
                "La formulación orienta sus acciones a la ampliación progresiva d"
                "e derechos (principio de progresividad)."
            )

        return ControlRegresividadDESCA(
            existe_riesgo_regresividad=riesgo,
            derechos_analizados=derechos,
            supera_test_progresividad=supera,
            fundamento_jurisprudencial=(
                "Sentencias C-038 de 2004, C-503 de 2014 y C-046 de 2018 (Corte Constitucional)."
            ),
            advertencias_constitucionales=advertencias,
        )

    def analizar(self, entrada: EntradaJuridica) -> ResultadoJuridico:
        """Motor determinista de evaluación jurídica y control competencial."""
        alerta_cp = self.evaluar_consulta_previa(entrada)
        control_desca = self.evaluar_no_regresividad(entrada)
        recomendaciones: list[str] = []

        texto_completo = f"{entrada.titulo} {entrada.descripcion} {' '.join(entrada.lineas_accion)}".lower()

        # Evaluación de competencia territorial (LOOT Ley 1454 / Ley 715 / Ley 1617)
        es_nacional = any(term in texto_completo for term in TERMINOS_COMPETENCIA_NACIONAL)

        if es_nacional:
            nivel_comp = NivelCompetencia.CONCURRENTE
            fundamento = (
                "Competencia concurrente con la Nación (Ley 1454 de 2011, Art. 27"
                "). El Distrito de Cartagena carece de potestad legislativa en ma"
                "teria punitiva o de defensa nacional, pero concurre en la coordi"
                "nación operativa y dotación local."
            )
            es_distrital = False
            recomendaciones.append(
                "Ajustar las líneas de acción para circunscribirlas a la competen"
                "cia distrital de policía administrativa y convivencia, evitando "
                "invadir la reserva legal de la Nación."
            )
        else:
            nivel_comp = NivelCompetencia.DISTRITAL
            fundamento = (
                "Competencia autónoma del Distrito Turístico y Cultural de Cartagena de Indias "
                "según los Artículos 311 y 356 de la CP, Ley 1454 de 2011 (LOOT), Ley 1617 de 2013 "
                "(Estatuto de Distritos) y Ley 715 de 2001 (Distrito Certificado)."
            )
            es_distrital = True

        # Determinar acto normativo idóneo
        if alerta_cp.requiere_consulta_previa:
            recomendaciones.append(
                "ENFOQUE DIFERENCIAL ÉTNICO: Desarrollar mesas de concertación "
                "comunitaria y diálogo participativo con las comunidades étnicas "
                "identificadas en el marco del respeto a la autonomía territorial."
            )

        if not control_desca.supera_test_progresividad:
            recomendaciones.append(
                "ALERTA DESCA: Reformular las metas para garantizar que no exista"
                "n retrocesos en la garantía efectiva de derechos."
            )

        # Trámite normativo
        if len(entrada.lineas_accion) > 3 or "plurianual" in texto_completo or "acuerdo" in texto_completo:
            instrumento = (
                "Proyecto de Acuerdo Distrital ante el Concejo Distrital de Cartagena (2 debates obligatorios)"
            )
        else:
            instrumento = "Decreto Distrital expedido por el Alcalde Mayor de Cartagena de Indias"

        es_viable = control_desca.supera_test_progresividad and (
            not es_nacional or nivel_comp == NivelCompetencia.CONCURRENTE
        )

        consulta_previa = (
            "Aplica Enfoque Diferencial Étnico y Concertación Comunitaria."
            if alerta_cp.requiere_consulta_previa
            else "Aplica régimen de participación ciudadana general."
        )
        progresividad = (
            "Supera el examen de no regresividad en DESCA."
            if control_desca.supera_test_progresividad
            else "Alerta de posible regresividad en derechos sociales."
        )
        concepto = (
            "Concepto Jurídico para '"
            f"{entrada.titulo}"
            "': Nivel de competencia clasificado como "
            f"{nivel_comp.value.upper()}"
            ". "
            f"{consulta_previa}"
            " "
            f"{progresividad}"
            " Instrumento sugerido: "
            f"{instrumento}"
            "."
        )

        return ResultadoJuridico(
            evaluacion_id=generar_uuidv7(),
            politica_id=entrada.politica_id,
            es_viable=es_viable,
            nivel_competencia=nivel_comp,
            fundamento_competencia=fundamento,
            es_competencia_distrital_cartagena=es_distrital,
            alerta_consulta_previa=alerta_cp,
            control_regresividad=control_desca,
            instrumento_adopcion_recomendado=instrumento,
            recomendaciones_juridicas=recomendaciones,
            concepto_juridico_motivado=concepto,
        )
