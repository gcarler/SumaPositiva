/**
 * POLIS — Modelos de Devolución Ciudadana Motivada y Rendición de Cuentas
 * Fundamento: Sentencia C-150 de 2015 de la Corte Constitucional (deber de motivación sustancial y proscripción del descarte silencioso)
 * Ley Estatutaria 1757 de 2015 de Participación Ciudadana y Decreto Distrital 037/2026.
 */

export type EstadoIncorporacion =
  | "INCORPORADA_TOTAL"
  | "INCORPORADA_PARCIAL"
  | "NO_INCORPORADA_MOTIVADA"
  | "SIN_RESPUESTA";

export type CausalDescarteTaxativa =
  | "INCOMPETENCIA_LEGAL_LOOT"
  | "RESTRICCION_FISCAL_MFMP"
  | "REQUERIMIENTO_CONSULTA_PREVIA"
  | "DUPLICIDAD_PROGRAMATICA"
  | "INCOMPATIBILIDAD_NORMATIVA"
  | "tecnica"
  | "juridica"
  | "presupuestal";

export interface PropuestaDevolucion {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  autor_nombre: string;
  territorio: string;
  canal_origen: "web" | "mesas" | "escenarios";
  fecha_radicacion: string;
  estado_incorporacion: EstadoIncorporacion;
  compromiso_pas_codigo?: string;
  compromiso_pas_nombre?: string;
  causal_descarte?: CausalDescarteTaxativa;
  motivacion_sustancial?: string;
  norma_invocada?: string;
  ruta_alternativa?: string;
  metadatos?: Record<string, unknown>;
}

export interface ConsolidadoParticipacionData {
  gran_total_participantes_distrital: number;
  participantes_unicos_identificados: number;
  total_canal_web: number;
  total_canal_mesas: number;
  total_canal_escenarios: number;
  porcentaje_canal_web: number;
  porcentaje_canal_mesas: number;
  porcentaje_canal_escenarios: number;
  desglose_territorial_agregado: Array<{
    territorio: string;
    codigo: string;
    total_participacion: number;
  }>;
  tasa_incorporacion_efectiva: number;
  total_propuestas: number;
  total_incorporadas: number;
  total_no_incorporadas: number;
  fecha_corte?: string;
}

export const CAUSALES_DESCARTE_INFO: Record<
  CausalDescarteTaxativa,
  {
    label: string;
    norma: string;
    canalSugerido: string;
    descripcion: string;
  }
> = {
  INCOMPETENCIA_LEGAL_LOOT: {
    label: "Incompetencia Legal LOOT",
    norma: "Artículos 286 y 287 C.P. y Ley Orgánica 1454 de 2011 (LOOT)",
    canalSugerido: "Congreso de la República / Ministerio de Justicia (trámite legislativo nacional)",
    descripcion: "La propuesta corresponde a reserva de ley o competencia exclusiva del orden nacional, desbordando el marco competencial del Distrito de Cartagena.",
  },
  RESTRICCION_FISCAL_MFMP: {
    label: "Restricción Fiscal MFMP",
    norma: "Ley 819 de 2003 (Marco Fiscal de Mediano Plazo) y Decreto 111 de 1996",
    canalSugerido: "Secretaría de Hacienda Distrital / Presupuesto Participativo vigencia siguiente",
    descripcion: "Supera el techo de gasto o endeudamiento fijado en el MFMP sin fuente de ingreso tributaria o transferencia que compense el impacto fiscal.",
  },
  REQUERIMIENTO_CONSULTA_PREVIA: {
    label: "Requiere Consulta Previa",
    norma: "Convenio 169 de la OIT, Ley 70 de 1993 y Sentencia SU-123 de 2018",
    canalSugerido: "Dirección de Asuntos Étnicos / Mesa Permanente de Concertación Afrocolombiana e Indígena",
    descripcion: "Afecta directamente territorios colectivos o comunidades étnicas certificadas por MinInterior, requiriendo protocolo de consulta previa.",
  },
  DUPLICIDAD_PROGRAMATICA: {
    label: "Duplicidad Programática",
    norma: "Metodología General Ajustada (MGA) y Principio de Eficiencia Administrativa (Ley 489/98)",
    canalSugerido: "Programa Distrital en ejecución correspondiente",
    descripcion: "El objeto y población objetivo de la iniciativa ya se encuentra cubierto por un programa o compromiso vigente del Distrito.",
  },
  INCOMPATIBILIDAD_NORMATIVA: {
    label: "Incompatibilidad Normativa",
    norma: "Código Nacional de Seguridad y Convivencia Ciudadana (Ley 1801/16)",
    canalSugerido: "Mesa Técnica de Co-diseño Institucional",
    descripcion: "Plantea medidas incompatibles con garantías constitucionales de derechos humanos o normas de orden público.",
  },
  tecnica: {
    label: "Inconsistencia Técnica / Metodológica",
    norma: "Metodología General Ajustada (MGA) y Lineamientos DNP",
    canalSugerido: "Mesa Técnica de Co-diseño Institucional",
    descripcion: "La propuesta presenta inconsistencias metodológicas o de viabilidad técnica que impiden su adopción directa.",
  },
  juridica: {
    label: "Incompetencia Legal / Restricción Jurídica",
    norma: "Artículos 286 y 287 C.P. y Ley 1454 de 2011 (LOOT)",
    canalSugerido: "Secretaría del Interior y Convivencia Ciudadana",
    descripcion: "La iniciativa desborda el marco de competencias legales asignadas al Distrito de Cartagena de Indias.",
  },
  presupuestal: {
    label: "Restricción Presupuestal / Fiscal",
    norma: "Ley 819 de 2003 (Marco Fiscal de Mediano Plazo) y Decreto 111/96",
    canalSugerido: "Secretaría de Hacienda Distrital / Presupuesto Participativo",
    descripcion: "Supera el techo presupuestal distrital o carece de fuente de financiación compatible con el MFMP.",
  },
};

export const ESTADOS_INCORPORACION_INFO: Record<
  EstadoIncorporacion,
  {
    label: string;
    badgeVariant: "success" | "warning" | "destructive" | "secondary";
    colorClase: string;
    descripcion: string;
  }
> = {
  INCORPORADA_TOTAL: {
    label: "Incorporada Total",
    badgeVariant: "success",
    colorClase: "text-success bg-success-soft border-success/30",
    descripcion: "Acogida íntegramente en las metas cuatrienales del Plan de Acción y Seguimiento.",
  },
  INCORPORADA_PARCIAL: {
    label: "Incorporada Parcial",
    badgeVariant: "warning",
    colorClase: "text-warning bg-warning-soft border-warning/30",
    descripcion: "Acogida en sus aspectos esenciales con readecuación técnica y presupuestal.",
  },
  NO_INCORPORADA_MOTIVADA: {
    label: "No Incorporada Motivada",
    badgeVariant: "destructive",
    colorClase: "text-danger bg-danger-soft border-danger/30",
    descripcion: "No incorporada con motivación sustancial y causal jurídica expresa (Sentencia C-150/15).",
  },
  SIN_RESPUESTA: {
    label: "Sin Respuesta (Pendiente)",
    badgeVariant: "secondary",
    colorClase: "text-text-muted bg-surface-2 border-border",
    descripcion: "Propuesta ciudadana radicada pendiente de respuesta institucional conforme a la Sentencia C-150/15.",
  },
};
