"""Modelos de datos Pydantic v2 en español estricto para el subsistema de Inteligencia Artificial
(POLIS).

Especialidad: Red Multi-Agente Determinista y Gobernanza del Ciclo de Vida de Políticas
Públicas.
Conforme a la metodología DNP (MGA/Marco Lógico), Bloque de Constitucionalidad (Convenio 169
OIT),
jurisprudencia de la Corte Constitucional (Sentencias C-150/15, SU-123/18, T-025/04, C-038/04)
y
régimen presupuestal y territorial colombiano (Leyes 1454/11, 715/01, 819/03, 1483/11 y
1617/13).
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.sesion.security import generar_uuidv7

# -----------------------------------------------------------------------------
# Enumeraciones Canónicas del Dominio Público y Constitucional
# -----------------------------------------------------------------------------


class NivelCompetencia(StrEnum):
    """Nivel de competencia gubernamental según Ley Orgánica 1454 de 2011 (LOOT) y Ley 715 de
    2001."""

    DISTRITAL = "distrital"
    DEPARTAMENTAL = "departamental"
    NACIONAL = "nacional"
    CONCURRENTE = "concurrente"


class CausalDevolucionTaxativa(StrEnum):
    """Causales taxativas permitidas para rechazo o no incorporación de aportes ciudadanos.

    Cumplimiento vinculante de la Sentencia C-150 de 2015 de la Corte Constitucional.
    """

    TECNICA = "tecnica"
    JURIDICA = "juridica"
    PRESUPUESTAL = "presupuestal"


class FuenteFinanciacion(StrEnum):
    """Catálogo oficial de fuentes de financiación pública en Colombia aplicables a Cartagena."""

    FONSET = "FONSET"  # Fondo Territorial de Seguridad y Convivencia (Ley 418/97 y Ley 1421)
    SGP = "SGP"  # Sistema General de Participaciones (Ley 715 de 2001 y Ley 1176 de 2007)
    SGR = "SGR"  # Sistema General de Regalías (Ley 2056 de 2020)
    ICLD = "ICLD"  # Ingresos Corrientes de Libre Destinación (Ley 617 de 2000)
    COOPERACION_INTERNACIONAL = "COOPERACION_INTERNACIONAL"
    CREDITO_PUBLICO = "CREDITO_PUBLICO"
    RECURSOS_PROPIOS = "RECURSOS_PROPIOS"


class TipoVigenciaFutura(StrEnum):
    """Clasificación de vigencias futuras según régimen presupuestal territorial."""

    NO_REQUIERE = "no_requiere"
    ORDINARIA_LEY_819 = "ordinaria_ley_819"  # Aprobadas por CONFIS dentro del cuatrienio
    EXCEPCIONAL_LEY_1483 = (
        "excepcional_ley_1483"  # Trasciende período de gobierno, requiere Concejo
    )


class RiesgoFiscal(StrEnum):
    """Nivel de riesgo o viabilidad fiscal de la política pública."""

    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"
    INVIABLE = "inviable"


class TipoNodoMGA(StrEnum):
    """Tipologías de nodos en la Metodología General Ajustada (DNP)."""

    PROBLEMA_CENTRAL = "PROBLEMA_CENTRAL"
    CAUSA_DIRECTA = "CAUSA_DIRECTA"
    CAUSA_INDIRECTA = "CAUSA_INDIRECTA"
    EFECTO_DIRECTO = "EFECTO_DIRECTO"
    EFECTO_INDIRECTO = "EFECTO_INDIRECTO"
    OBJETIVO_CENTRAL = "OBJETIVO_CENTRAL"
    MEDIO_DIRECTO = "MEDIO_DIRECTO"
    MEDIO_INDIRECTO = "MEDIO_INDIRECTO"
    FIN_DIRECTO = "FIN_DIRECTO"
    FIN_INDIRECTO = "FIN_INDIRECTO"


# -----------------------------------------------------------------------------
# Esquemas para Agente 1: Diagnóstico (MGA / Marco Lógico DNP)
# -----------------------------------------------------------------------------


class ValidacionSintaxisNodo(BaseModel):
    """Resultado del análisis sintáctico de un nodo bajo directrices DNP."""

    model_config = ConfigDict(extra="forbid")

    texto_original: str = Field(..., description="Texto original proporcionado")
    cumple_sintaxis: bool = Field(..., description="True si cumple sintaxis DNP exigida")
    tipo_nodo: TipoNodoMGA = Field(..., description="Rol del nodo dentro de la estructura")
    sintaxis_esperada: str = Field(
        ...,
        description="Sustantivo negativo para problemas, verbo en infinitivo para objetivos",
    )
    texto_corregido_sugerido: str = Field(
        ..., description="Reescritura sintáctica correcta conforme a metodología DNP"
    )
    observacion_metodologica: str = Field(
        ..., description="Explicación técnica del ajuste sintáctico o causal"
    )


class EntradaDiagnostico(BaseModel):
    """Datos de entrada para el Agente de Diagnóstico."""

    model_config = ConfigDict(extra="forbid")

    politica_id: uuid.UUID = Field(
        default_factory=generar_uuidv7,
        description="Identificador UUIDv7 de la política o instrumento",
    )
    titulo: str = Field(..., min_length=5, max_length=300, description="Título de la iniciativa")
    problema_central: str = Field(
        ..., min_length=10, description="Enunciado crudo o preliminar del problema central"
    )
    causas_directas: list[str] = Field(
        default_factory=list, description="Listado de causas directas identificadas"
    )
    causas_indirectas: list[str] = Field(
        default_factory=list, description="Listado de causas indirectas estructurales"
    )
    efectos_directos: list[str] = Field(
        default_factory=list, description="Consecuencias directas sobre la población afectada"
    )
    efectos_indirectos: list[str] = Field(
        default_factory=list, description="Efectos de largo plazo en el bienestar colectivo"
    )
    propuestas_ciudadanas_raw: list[str] = Field(
        default_factory=list, description="Ideas crudas recolectadas en mesas de trabajo o talleres"
    )


class NodoArbolEstructurado(BaseModel):
    """Representación jerárquica de un nodo de árbol de problemas u objetivos."""

    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID = Field(default_factory=generar_uuidv7)
    tipo: TipoNodoMGA
    contenido: str
    hijos: list[NodoArbolEstructurado] = Field(default_factory=list)


class ResultadoDiagnostico(BaseModel):
    """Salida estructurada y garantizada del Agente de Diagnóstico."""

    model_config = ConfigDict(extra="forbid")

    evaluacion_id: uuid.UUID = Field(
        default_factory=generar_uuidv7, description="Identificador UUIDv7 de la evaluación"
    )
    politica_id: uuid.UUID = Field(..., description="ID de la política analizada")
    es_valido: bool = Field(
        ..., description="Indica si la estructura causal cumple los estándares DNP mínimos"
    )
    puntaje_coherencia: float = Field(
        ..., ge=0.0, le=100.0, description="Puntaje de consistencia metodológica de 0 a 100"
    )
    analisis_sintaxis: list[ValidacionSintaxisNodo] = Field(
        default_factory=list,
        description="Evaluación de sintaxis DNP nodo a nodo (sustantivo negativo vs infinitivo)",
    )
    problema_central_optimizado: str = Field(
        ...,
        description="Problema central depurado bajo estándar DNP (evita soluciones disfrazadas)",
    )
    objetivo_central_derivado: str = Field(
        ..., description="Objetivo central positivo formulado en verbo infinitivo medible"
    )
    arbol_problemas_estructurado: dict[str, Any] = Field(
        ..., description="Estructura JSON jerarquizada del Árbol de Problemas"
    )
    arbol_objetivos_derivado: dict[str, Any] = Field(
        ..., description="Estructura JSON jerarquizada del Árbol de Objetivos y Medios/Fines"
    )
    recomendaciones_dnp: list[str] = Field(
        default_factory=list, description="Directrices metodológicas para el equipo formulador"
    )
    resumen_ejecutivo: str = Field(
        ..., description="Concepto técnico del diagnóstico y coherencia causal"
    )


# -----------------------------------------------------------------------------
# Esquemas para Agente 2: Jurídico (Constitucional, LOOT, SGP, Consulta Previa)
# -----------------------------------------------------------------------------


class AlertaConsultaPrevia(BaseModel):
    """Alerta y sustento de Consulta Previa obligatoria bajo Convenio 169 OIT y SU-123 de 2018."""

    model_config = ConfigDict(extra="forbid")

    requiere_consulta_previa: bool = Field(
        ..., description="Determina si es imperativa la Consulta Previa"
    )
    comunidades_etnicas_identificadas: list[str] = Field(
        default_factory=list,
        description="Comunidades negras, afrodescendientes, raizales, palenqueras o indígenas",
    )
    territorios_colectivos_involucrados: list[str] = Field(
        default_factory=list,
        description="Zonas de Cartagena identificadas (Tierrabomba, La Boquilla, Barú, etc.)",
    )
    criterio_afectacion_directa: str = Field(
        ...,
        description=(
            "Justificación según criterio de afectación directa fijado en Sentencia C-030/08"
        ),
    )
    requiere_clpi: bool = Field(
        ...,
        description="True si exige Consentimiento Previo, Libre e Informado reforzado (SU-123/18)",
    )
    fundamento_constitucional: str = Field(
        ..., description="Art. 93 CP, Convenio 169 OIT, Sentencias SU-123/18, SU-095/18 y C-366/11"
    )


class ControlRegresividadDESCA(BaseModel):
    """Verificación de no regresividad en Derechos Económicos, Sociales, Culturales y
    Ambientales."""

    model_config = ConfigDict(extra="forbid")

    existe_riesgo_regresividad: bool = Field(
        ..., description="True si la política propone disminuir coberturas o estándares previos"
    )
    derechos_analizados: list[str] = Field(
        default_factory=list, description="Derechos fundamentales y DESCA involucrados"
    )
    supera_test_progresividad: bool = Field(
        ...,
        description="True si la medida justifica plenamente la no afectación del núcleo esencial",
    )
    fundamento_jurisprudencial: str = Field(
        ..., description="Línea jurisprudencial C-038/04, C-503/14, C-046/18"
    )
    advertencias_constitucionales: list[str] = Field(
        default_factory=list, description="Puntos de alerta para salvaguardar el núcleo esencial"
    )


class EntradaJuridica(BaseModel):
    """Datos de entrada para el Agente Jurídico y Constitucional."""

    model_config = ConfigDict(extra="forbid")

    politica_id: uuid.UUID = Field(
        default_factory=generar_uuidv7, description="ID de la política pública"
    )
    titulo: str = Field(..., min_length=5, max_length=300)
    descripcion: str = Field(..., min_length=10)
    lineas_accion: list[str] = Field(..., min_length=1)
    territorios_afectados: list[str] = Field(
        default_factory=list,
        description="Localidades, corregimientos o barrios de Cartagena involucrados",
    )
    es_territorio_etnico: bool = Field(
        default=False, description="Bandera territorial de comunidades étnicas"
    )
    poblacion_objetivo: str = Field(..., description="Caracterización de la población beneficiaria")
    modifica_beneficios_existentes: bool = Field(
        default=False, description="Indica si modifica programas sociales o subsidios previos"
    )
    sector_tematico: str = Field(
        default="seguridad_humana",
        description="Sector: seguridad_humana, salud, educacion, saneamiento, movilidad",
    )


class ResultadoJuridico(BaseModel):
    """Salida estructurada y garantizada del Agente Jurídico."""

    model_config = ConfigDict(extra="forbid")

    evaluacion_id: uuid.UUID = Field(default_factory=generar_uuidv7)
    politica_id: uuid.UUID
    es_viable: bool = Field(..., description="Indica si la política es jurídicamente viable")
    nivel_competencia: NivelCompetencia = Field(
        ..., description="Nivel de gobierno titular de la competencia"
    )
    fundamento_competencia: str = Field(
        ...,
        description=(
            "Normas aplicables: Ley 1454/11 (LOOT), Ley 715/01 (SGP), Ley 1617/13 (Distritos)"
        ),
    )
    es_competencia_distrital_cartagena: bool = Field(
        ...,
        description="Indica si el Distrito de Cartagena tiene atribución directa para adoptarla",
    )
    alerta_consulta_previa: AlertaConsultaPrevia
    control_regresividad: ControlRegresividadDESCA
    instrumento_adopcion_recomendado: str = Field(
        ...,
        description=(
            "Tipo de acto normativo requerido: Acuerdo Distrital (Concejo) o Decreto Alcaldicio"
        ),
    )
    recomendaciones_juridicas: list[str] = Field(default_factory=list)
    concepto_juridico_motivado: str = Field(..., description="Dictamen jurídico motivado integral")


# -----------------------------------------------------------------------------
# Esquemas para Agente 3: Fiscal (Presupuesto, Fuentes, Vigencias Futuras)
# -----------------------------------------------------------------------------


class DesgloseFuente(BaseModel):
    """Distribución estimada por fuente de financiación pública."""

    model_config = ConfigDict(extra="forbid")

    fuente: FuenteFinanciacion
    porcentaje: Decimal = Field(..., ge=Decimal("0.0"), le=Decimal("100.0"))
    monto_estimado_cop: Decimal = Field(..., ge=Decimal("0.0"))
    base_legal: str = Field(..., description="Sustento normativo de la fuente presupuestal")
    destinacion_permitida: str = Field(
        ..., description="Restricciones legales de gasto de esta fuente"
    )


class AlertaVigenciasFuturas(BaseModel):
    """Análisis de compromisos plurianuales bajo Ley 819 de 2003 y Ley 1483 de 2011."""

    model_config = ConfigDict(extra="forbid")

    tipo_vigencia: TipoVigenciaFutura
    trasciende_periodo_gobierno: bool = Field(
        ..., description="True si el horizonte de ejecución supera el cuatrienio del Alcalde"
    )
    requiere_acuerdo_concejo: bool = Field(
        ..., description="True si exige autorización del Concejo Distrital (Ley 1483/11)"
    )
    requiere_aval_confis: bool = Field(
        ..., description="True si requiere concepto previo favorable del CONFIS Distrital"
    )
    ano_maximo_compromiso_concejo: str = Field(
        ...,
        description="Plazo legal de autorización (primer o segundo año del período de gobierno)",
    )
    fundamento_legal: str = Field(
        ..., description="Artículos aplicables de Ley 819/03 y Ley 1483/11"
    )
    condiciones_excepcionales_cumplidas: list[str] = Field(default_factory=list)


class EntradaFiscal(BaseModel):
    """Datos de entrada para el Agente Fiscal y Presupuestal."""

    model_config = ConfigDict(extra="forbid")

    politica_id: uuid.UUID = Field(
        default_factory=generar_uuidv7, description="ID de la política pública"
    )
    titulo: str = Field(..., min_length=5, max_length=300)
    costo_estimado_total_cop: Decimal = Field(
        ..., ge=Decimal("0.0"), description="Presupuesto total proyectado en pesos colombianos"
    )
    horizonte_anos: int = Field(
        default=4, ge=1, le=20, description="Horizonte temporal de la política en años"
    )
    sector_inversion: str = Field(
        default="seguridad_y_convivencia",
        description=(
            "Sector: seguridad_y_convivencia, educacion, salud, infraestructura, desarrollo_social"
        ),
    )
    fuentes_propuestas: list[str] = Field(
        default_factory=list, description="Fuentes preliminares propuestas por el formulador"
    )
    cuenta_con_declaratoria_estrategica: bool = Field(
        default=False,
        description="Aprobación previa de importancia estratégica por Consejo de Gobierno",
    )


class ResultadoFiscal(BaseModel):
    """Salida estructurada y garantizada del Agente Fiscal."""

    model_config = ConfigDict(extra="forbid")

    evaluacion_id: uuid.UUID = Field(default_factory=generar_uuidv7)
    politica_id: uuid.UUID
    es_viable: bool = Field(..., description="Determina si la propuesta es financieramente viable")
    riesgo_fiscal: RiesgoFiscal = Field(..., description="Nivel de riesgo presupuestal calificado")
    costo_total_validado_cop: Decimal = Field(..., ge=Decimal("0.0"))
    fuentes_recomendadas: list[DesgloseFuente] = Field(default_factory=list)
    alerta_vigencias_futuras: AlertaVigenciasFuturas
    consistencia_mfmp: bool = Field(
        ..., description="Consistencia demostrada con el Marco Fiscal de Mediano Plazo (Ley 819/03)"
    )
    requiere_codigo_bpin_bpit: bool = Field(
        default=True,
        description="Obligatoriedad de registro en Banco de Proyectos Distrital/Nacional",
    )
    recomendaciones_presupuestales: list[str] = Field(default_factory=list)
    dictamen_fiscal_motivado: str = Field(
        ..., description="Concepto presupuestal integral motivado"
    )


# -----------------------------------------------------------------------------
# Esquemas para Agente 4: Devolución Motivada (Sentencia C-150 de 2015)
# -----------------------------------------------------------------------------


class PropuestaParaDevolucion(BaseModel):
    """Información de un aporte o propuesta ciudadana descartada o modificada."""

    model_config = ConfigDict(extra="forbid")

    propuesta_id: uuid.UUID = Field(
        default_factory=generar_uuidv7, description="ID del aporte ciudadano"
    )
    titulo: str = Field(..., min_length=3)
    descripcion: str = Field(..., min_length=5)
    autor_nombre: str = Field(default="Ciudadano Anónimo")
    es_anonimo: bool = Field(default=True)
    territorio_nombre: str | None = Field(default=None)
    motivo_descarte_preliminar: str | None = Field(
        default=None, description="Apunte informal del formulador"
    )


class ItemDevolucionMotivada(BaseModel):
    """Ficha oficial de respuesta motivada conforme a la Sentencia C-150 de 2015."""

    model_config = ConfigDict(extra="forbid")

    devolucion_id: uuid.UUID = Field(default_factory=generar_uuidv7)
    propuesta_id: uuid.UUID
    titulo_propuesta: str
    causal_taxativa: CausalDevolucionTaxativa = Field(
        ...,
        description="Causal taxativa de descarte: 'tecnica', 'juridica' o 'presupuestal'",
    )
    fundamentacion_motivada: str = Field(
        ...,
        min_length=20,
        description=(
            "Explicación técnica, jurídica o presupuestal detallada y rigurosa. "
            "Prohibido el rechazo cosmético o silencioso conforme a C-150 de 2015."
        ),
    )
    norma_o_criterio_invocado: str = Field(
        ...,
        description="Norma o restricción metodológica concreta en la que se funda la no inclusión",
    )
    canal_o_ruta_alternativa: str = Field(
        ..., description="Orientación clara al ciudadano sobre la vía o entidad competente"
    )
    fecha_devolucion: str = Field(..., description="Marca temporal ISO-8601 del acto de devolución")

    @field_validator("fundamentacion_motivada")
    @classmethod
    def validar_longitud_sustantiva(cls, v: str) -> str:
        if len(v.strip()) < 20:
            raise ValueError(
                "La fundamentación motivada debe contener al menos 20 caracteres "
                "sustanciales para evitar el descarte silencioso proscrito por la"
                " Corte Constitucional en C-150/15."
            )
        return v.strip()


class EntradaDevolucion(BaseModel):
    """Datos de entrada para el Agente de Devolución Ciudadana Motivada."""

    model_config = ConfigDict(extra="forbid")

    politica_id: uuid.UUID = Field(
        default_factory=generar_uuidv7, description="ID de la política pública"
    )
    titulo_politica: str = Field(..., min_length=5)
    propuestas_no_incorporadas: list[PropuestaParaDevolucion] = Field(
        ..., min_length=1, description="Listado de propuestas ciudadanas excluidas o no priorizadas"
    )


class ResultadoDevolucion(BaseModel):
    """Salida estructurada y garantizada del Agente de Devolución Ciudadana Motivada."""

    model_config = ConfigDict(extra="forbid")

    evaluacion_id: uuid.UUID = Field(default_factory=generar_uuidv7)
    politica_id: uuid.UUID
    cumplimiento_c150_garantizado: bool = Field(
        default=True,
        description=(
            "Certifica que todas las propuestas cuentan con motivación sustancial y causal taxativa"
        ),
    )
    total_propuestas_evaluadas: int = Field(..., ge=0)
    total_devoluciones_emitidas: int = Field(..., ge=0)
    matriz_devolucion: list[ItemDevolucionMotivada] = Field(default_factory=list)
    resumen_pedagogico: str = Field(
        ...,
        description="Mensaje cívico y pedagógico para rendición de cuentas pública",
    )
    publicacion_obligatoria_ley_1712: bool = Field(
        default=True,
        description=(
            "Publicación preceptiva bajo Ley de Transparencia y del Derecho d"
            "e Acceso a la Información"
        ),
    )


# -----------------------------------------------------------------------------
# Esquemas para Orquestador del Grafo (PolicyLifecycleGraph)
# -----------------------------------------------------------------------------


class EntradaCicloPolitica(BaseModel):
    """Payload completo de entrada para ejecutar el grafo de ciclo de vida de política pública."""

    model_config = ConfigDict(extra="forbid")

    politica_id: uuid.UUID = Field(default_factory=generar_uuidv7)
    titulo: str = Field(..., min_length=5, max_length=300)
    descripcion: str = Field(..., min_length=10)
    sector: str = Field(default="seguridad_humana")
    problema_central: str = Field(..., min_length=10)
    causas_directas: list[str] = Field(default_factory=list)
    causas_indirectas: list[str] = Field(default_factory=list)
    efectos_directos: list[str] = Field(default_factory=list)
    efectos_indirectos: list[str] = Field(default_factory=list)
    lineas_accion: list[str] = Field(default_factory=list)
    territorios_afectados: list[str] = Field(default_factory=list)
    es_territorio_etnico: bool = Field(default=False)
    poblacion_objetivo: str = Field(default="Comunidades del Distrito de Cartagena")
    costo_estimado_total_cop: Decimal = Field(default=Decimal("1500000000.00"), ge=Decimal("0.0"))
    horizonte_anos: int = Field(default=4, ge=1, le=20)
    fuentes_propuestas: list[str] = Field(default_factory=lambda: ["FONSET", "ICLD"])
    propuestas_ciudadanas: list[PropuestaParaDevolucion] = Field(default_factory=list)
    max_iteraciones: int = Field(
        default=3, ge=1, le=5, description="Tope de refinamiento para evitar ciclos infinitos"
    )


class RespuestaCicloPolitica(BaseModel):
    """Resumen consolidado tras la ejecución determinista del grafo LangGraph."""

    model_config = ConfigDict(extra="forbid")

    politica_id: uuid.UUID
    titulo: str
    fase_final: str
    ciclo_completado_exitosamente: bool
    iteraciones_totales: int
    diagnostico_aprobado: bool
    viabilidad_juridica_aprobada: bool
    consulta_previa_requerida: bool
    viabilidad_fiscal_aprobada: bool
    deliberacion_completada: bool
    devolucion_completada: bool
    adopcion_aprobada: bool
    acto_administrativo_sugerido: str
    resultado_diagnostico: ResultadoDiagnostico | None = None
    resultado_juridico: ResultadoJuridico | None = None
    resultado_fiscal: ResultadoFiscal | None = None
    resultado_devolucion: ResultadoDevolucion | None = None
    historial_estados: list[str] = Field(default_factory=list)
    bitacora_mensajes: list[str] = Field(default_factory=list)
    errores: list[str] = Field(default_factory=list)
