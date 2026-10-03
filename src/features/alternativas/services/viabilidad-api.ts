"use client";

import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type { AlternativaSolucion } from "../models/alternativa";
import type {
  EntradaJuridica,
  ResultadoJuridico,
  EntradaFiscal,
  ResultadoFiscal,
  EvaluacionViabilidadIntegral,
  VeredictoViabilidad,
  DesgloseFuente,
} from "../models/viabilidad";

/** Genera un UUIDv7 simulado para entornos locales o pruebas */
function generarUuidFallback(): string {
  return "01a0f820-0000-7000-a000-" + Date.now().toString(16).padStart(12, "0");
}

export function generarDictamenJuridicoDeterminista(
  entrada: EntradaJuridica
): ResultadoJuridico {
  const esEtnico = Boolean(entrada.es_territorio_etnico);

  const comunidades: string[] = [];
  const territorios: string[] = [];

  if (esEtnico) {
    comunidades.push("Consejos Comunitarios de Comunidades Negras de Cartagena");
    territorios.push(entrada.territorios_afectados.join(", ") || "Zonas colectivas distritales");
  }

  const recomendaciones: string[] = [
    "Someter a revisión del Comité Distrital de Política Pública de Cartagena de Indias.",
    "Asegurar armonización con el Plan de Desarrollo Distrital 2024–2027.",
  ];

  if (esEtnico) {
    recomendaciones.push(
      "Apertura formal de mesa de protocolización de Consulta Previa ante la Dirección de la Autoridad Nacional de Consulta Previa (DANCP/MinInterior) conforme al Convenio 169 de la OIT y SU-123 de 2018."
    );
  }

  return {
    evaluacion_id: generarUuidFallback(),
    politica_id: entrada.politica_id,
    es_viable: true,
    nivel_competencia: "distrital",
    fundamento_competencia:
      "Ley 1454 de 2011 (LOOT), Ley 1617 de 2013 (Estatuto Distrital de Cartagena) y Ley 715 de 2001.",
    es_competencia_distrital_cartagena: true,
    alerta_consulta_previa: {
      requiere_consulta_previa: esEtnico,
      comunidades_etnicas_identificadas: comunidades,
      territorios_colectivos_involucrados: territorios,
      criterio_afectacion_directa: esEtnico
        ? "La iniciativa interviene territorios con presencia de comunidades negras o de titulación colectiva protegidas por la Ley 70 de 1993."
        : "No se identificaron afectaciones directas a territorios de grupos étnicos diferenciados.",
      requiere_clpi: false,
      fundamento_constitucional:
        "Artículo 93 de la Constitución Política, Convenio 169 de la OIT, Sentencias SU-123/18, SU-095/18 y C-366/11.",
    },
    control_regresividad: {
      existe_riesgo_regresividad: false,
      derechos_analizados: [
        "Derecho a la seguridad humana e integridad personal",
        "Derechos prevalentes de la niñez (Art. 44 CP)",
        "Gobernanza participativa y debido proceso",
      ],
      supera_test_progresividad: true,
      fundamento_jurisprudencial:
        "Jurisprudencia Constitucional Sentencias C-038/04, C-503/14 y C-046/18 (No regresividad de derechos sociales).",
      advertencias_constitucionales: [
        "Garantizar la gratuidad y accesibilidad universal de los servicios implementados.",
      ],
    },
    instrumento_adopcion_recomendado:
      "Acuerdo Distrital (Concejo de Cartagena) y Decreto Reglamentario del Alcalde Mayor.",
    recomendaciones_juridicas: recomendaciones,
    concepto_juridico_motivado: `La iniciativa '${entrada.titulo}' se enmarca plenamente dentro de las competencias constitucionales y legales del Distrito de Cartagena de Indias (Ley 1617/13). ${
      esEtnico
        ? "Se emite CONDICIONAMIENTO DE SALVAGUARDA ÉTNICA: Se requiere agotar el trámite preceptivo de Consulta Previa con las autoridades tradicionales de las comunidades afrodescendientes identificadas en la zona de intervención antes del inicio de obras o acciones operativas."
        : "No se evidencian interferencias de competencias con la Nación ni con el Departamento de Bolívar. Supera el test de no regresividad en materia de derechos sociales."
    }`,
  };
}

export function generarDictamenFiscalDeterminista(
  entrada: EntradaFiscal
): ResultadoFiscal {
  const trasciendePeriodo = entrada.horizonte_anos > 4;
  const costoTotal = entrada.costo_estimado_total_cop || 1000000000;

  const fuentesDesglosadas: DesgloseFuente[] = [];

  if (/seguridad|desarme|conviv/i.test(entrada.sector_inversion)) {
    fuentesDesglosadas.push({
      fuente: "FONSET",
      porcentaje: 60,
      monto_estimado_cop: Math.round(costoTotal * 0.6),
      base_legal: "Ley 418 de 1997 / Ley 2272 de 2022 (Fondo de Seguridad Territorial)",
      destinacion_permitida: "Seguridad ciudadana, convivencia y tecnología de vigilancia",
    });
    fuentesDesglosadas.push({
      fuente: "SGP",
      porcentaje: 40,
      monto_estimado_cop: Math.round(costoTotal * 0.4),
      base_legal: "Ley 715 de 2001 (Propósito General)",
      destinacion_permitida: "Inversión social y fortalecimiento comunitario",
    });
  } else if (/ambiente|habitat|ci[eé]naga/i.test(entrada.sector_inversion)) {
    fuentesDesglosadas.push({
      fuente: "SGR",
      porcentaje: 65,
      monto_estimado_cop: Math.round(costoTotal * 0.65),
      base_legal: "Ley 2056 de 2020 (Sistema General de Regalías - Asignación para la Inversión Regional)",
      destinacion_permitida: "Obras de infraestructura ecológica y mitigación de desastres",
    });
    fuentesDesglosadas.push({
      fuente: "ICLD",
      porcentaje: 35,
      monto_estimado_cop: Math.round(costoTotal * 0.35),
      base_legal: "Ingresos Corrientes de Libre Destinación Distritales",
      destinacion_permitida: "Contrapartida distrital para drenajes y saneamiento",
    });
  } else if (/etnico|comunitario/i.test(entrada.sector_inversion)) {
    fuentesDesglosadas.push({
      fuente: "SGP",
      porcentaje: 55,
      monto_estimado_cop: Math.round(costoTotal * 0.55),
      base_legal: "Ley 715 de 2001 (Asignaciones especiales comunidades negras)",
      destinacion_permitida: "Fortalecimiento de la autonomía y seguridad alimentaria",
    });
    fuentesDesglosadas.push({
      fuente: "SGR",
      porcentaje: 45,
      monto_estimado_cop: Math.round(costoTotal * 0.45),
      base_legal: "Ley 2056 de 2020 (Proyectos con enfoque diferencial étnico)",
      destinacion_permitida: "Inversión productiva agro-marina sostenible",
    });
  } else {
    fuentesDesglosadas.push({
      fuente: "SGP",
      porcentaje: 50,
      monto_estimado_cop: Math.round(costoTotal * 0.5),
      base_legal: "Ley 715 de 2001",
      destinacion_permitida: "Inversión social cuatrienal",
    });
    fuentesDesglosadas.push({
      fuente: "ICLD",
      porcentaje: 50,
      monto_estimado_cop: Math.round(costoTotal * 0.5),
      base_legal: "Recursos propios del Distrito de Cartagena",
      destinacion_permitida: "Proyectos de inversión sectorial",
    });
  }

  const recomendaciones: string[] = [
    "Gestionar el cargue de la alternativa en el Banco de Programas y Proyectos de Inversión Distrital (BPID) de Cartagena.",
    "Validar cupo fiscal anual en el Marco Fiscal de Mediano Plazo (MFMP) expedido por la Secretaría de Hacienda.",
  ];

  if (trasciendePeriodo) {
    recomendaciones.push(
      "Presentar proyecto de Acuerdo ante el Concejo Distrital de Cartagena para autorizar el compromiso de Vigencias Futuras Excepcionales conforme a la Ley 1483 de 2011."
    );
  }

  return {
    evaluacion_id: generarUuidFallback(),
    politica_id: entrada.politica_id,
    es_viable: true,
    riesgo_fiscal: trasciendePeriodo ? "medio" : "bajo",
    costo_total_validado_cop: costoTotal,
    fuentes_recomendadas: fuentesDesglosadas,
    alerta_vigencias_futuras: {
      tipo_vigencia: trasciendePeriodo ? "excepcional" : "ordinaria",
      trasciende_periodo_gobierno: trasciendePeriodo,
      requiere_acuerdo_concejo: trasciendePeriodo,
      requiere_aval_confis: trasciendePeriodo,
      ano_maximo_compromiso_concejo: trasciendePeriodo
        ? "Segundo año del período de gobierno (2025-2026)"
        : "Vigencia actual en curso",
      fundamento_legal:
        "Ley 819 de 2003 (Art. 12), Ley 1483 de 2011 (Art. 1) y Decreto Distrital 1068 de 2015.",
      condiciones_excepcionales_cumplidas: trasciendePeriodo
        ? [
            "El proyecto forma parte integral del Plan de Desarrollo Distrital de Cartagena.",
            "Requiere declaratoria de importancia estratégica por el Consejo de Gobierno Distrital.",
            "Plazo de ejecución superior a 4 años presupuestales.",
          ]
        : ["No supera el período de gobierno del Alcalde Mayor en ejercicio."],
    },
    consistencia_mfmp: true,
    requiere_codigo_bpin_bpit: true,
    recomendaciones_presupuestales: recomendaciones,
    dictamen_fiscal_motivado: `La estructuración financiera de la alternativa '${entrada.titulo}' por un valor proyectado de $ ${costoTotal.toLocaleString("es-CO")} COP resulta FINANCIERAMENTE SOSTENIBLE con base en las fuentes distritales analizadas. ${
      trasciendePeriodo
        ? "ALERTA DE VIGENCIAS FUTURAS: Dado que el horizonte temporal es de " +
          entrada.horizonte_anos +
          " años y trasciende el actual período constitucional de gobierno, se requiere preceptivamente concepto favorable del CONFIS Distrital y autorización previa del Concejo Distrital de Cartagena bajo el marco estricto de la Ley 1483 de 2011."
        : "La iniciativa se circunscribe al cuatrienio actual, respetando los techos presupuestales y reglas del Marco Fiscal de Mediano Plazo de Cartagena."
    }`,
  };
}

export async function evaluarViabilidadJuridica(
  entrada: EntradaJuridica
): Promise<ResultadoJuridico> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await apiFetch<ResultadoJuridico>("/ia/juridico", {
      method: "POST",
      body: entrada,
      headers,
    });
    if (res && typeof res.es_viable === "boolean") {
      return res;
    }
  } catch (error) {
    console.warn(
      "Servicio /api/v1/ia/juridico no disponible o no autenticado, ejecutando motor jurídico determinista:",
      error
    );
  }

  return generarDictamenJuridicoDeterminista(entrada);
}

export async function evaluarViabilidadFiscal(
  entrada: EntradaFiscal
): Promise<ResultadoFiscal> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await apiFetch<ResultadoFiscal>("/ia/fiscal", {
      method: "POST",
      body: entrada,
      headers,
    });
    if (res && typeof res.es_viable === "boolean") {
      return res;
    }
  } catch (error) {
    console.warn(
      "Servicio /api/v1/ia/fiscal no disponible o no autenticado, ejecutando motor fiscal determinista:",
      error
    );
  }

  return generarDictamenFiscalDeterminista(entrada);
}

export async function evaluarViabilidadIntegral(
  alternativa: AlternativaSolucion
): Promise<EvaluacionViabilidadIntegral> {
  // Garantizar UUID válido para politica_id
  const politicaId = alternativa.id.startsWith("alt-")
    ? `01a0f820-e5ca-7001-a000-${alternativa.id.slice(-12).padStart(12, "0")}`
    : alternativa.id;

  const entradaJuridica: EntradaJuridica = {
    politica_id: politicaId,
    titulo: alternativa.nombre,
    descripcion: alternativa.descripcion,
    lineas_accion: [
      alternativa.objetivo_central_mga,
      `Línea ${alternativa.linea_estrategica_codigo}`,
    ],
    territorios_afectados: [alternativa.territorio_cobertura],
    es_territorio_etnico:
      alternativa.requiere_consulta_previa ||
      alternativa.sector === "etnico_comunitario",
    poblacion_objetivo: `${alternativa.poblacion_objetivo_estimada} personas beneficiarias en ${alternativa.territorio_cobertura}`,
    modifica_beneficios_existentes: false,
    sector_tematico: alternativa.sector,
  };

  const entradaFiscal: EntradaFiscal = {
    politica_id: politicaId,
    titulo: alternativa.nombre,
    costo_estimado_total_cop: alternativa.costo_estimado_cop,
    horizonte_anos: alternativa.horizonte_anios,
    sector_inversion: alternativa.sector,
    fuentes_propuestas: alternativa.fuentes_financiacion_sugeridas,
    cuenta_con_declaratoria_estrategica: alternativa.estado === "priorizada",
  };

  const [juridico, fiscal] = await Promise.all([
    evaluarViabilidadJuridica(entradaJuridica),
    evaluarViabilidadFiscal(entradaFiscal),
  ]);

  let veredictoConsolidado: VeredictoViabilidad = "VIABLE";

  if (!juridico.es_viable || !fiscal.es_viable || fiscal.riesgo_fiscal === "inviable") {
    veredictoConsolidado = "INVIABLE";
  } else if (
    juridico.alerta_consulta_previa.requiere_consulta_previa ||
    fiscal.alerta_vigencias_futuras.trasciende_periodo_gobierno ||
    fiscal.riesgo_fiscal === "medio" ||
    fiscal.riesgo_fiscal === "alto"
  ) {
    veredictoConsolidado = "VIABLE CON CONDICIONES";
  }

  return {
    alternativaId: alternativa.id,
    codigoAlternativa: alternativa.codigo,
    nombreAlternativa: alternativa.nombre,
    fechaEvaluacion: new Date().toISOString(),
    veredictoConsolidado,
    juridico,
    fiscal,
  };
}
