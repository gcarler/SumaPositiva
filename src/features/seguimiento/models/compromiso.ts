/**
 * POLIS — Modelos de Datos del Plan de Acción y Seguimiento (PAS)
 * Conforme con Metodología DNP / CONPES, Sistema SINERGIA y MIPG.
 * Fase de Plan de Acción y Seguimiento (Hito PAS-1)
 */

export type EstadoCompromiso =
  | "sin_reporte"
  | "programado"
  | "en_ejecucion"
  | "cumplido"
  | "en_riesgo"
  | "retrasado";

export interface CompromisoInstitucional {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  entidad_responsable: string;
  linea_estrategica_codigo: string;
  alternativa_mga_codigo: string;
  indicador_asociado_codigo: string;
  meta_cuatrienal_descripcion: string;
  meta_cuatrienal_valor: number;
  unidad_medida: string;
  avance_cuatrienal_valor: number | null;
  porcentaje_cumplimiento: number | null; // null si no tiene reporte
  presupuesto_anual_cop: number | null;
  vigencias_programadas: number[];
  estado: EstadoCompromiso;
  fecha_corte_ultimo_reporte: string | null;
  metadatos?: {
    fuente?: string;
    meta_validada?: boolean;
    alerta_fuente?: string;
    es_demostracion?: boolean;
    responsable_cargo?: string;
    bpin_relacionado?: string;
    observacion_cualitativa?: string;
    url_evidencia?: string;
    fuente_financiamiento?: string;
    [key: string]: unknown;
  };
}

export interface CompromisoActualizarAvance {
  avance_cuatrienal_valor?: number | null;
  estado?: EstadoCompromiso;
  fecha_corte_ultimo_reporte?: string | null;
  observacion_cualitativa?: string;
  url_evidencia?: string;
}

export interface KpisSeguimiento {
  totalCompromisos: number;
  compromisosConReporte: number;
  compromisosSinReporte: number;
  compromisosEnEjecucionOCumplidos: number;
  compromisosEnRiesgoORetrasados: number;
  promedioCumplimientoCuatrienal: number | null;
  presupuestoTotalAnualCop: number;
}

export const ESTADOS_COMPROMISO: Record<
  EstadoCompromiso,
  {
    label: string;
    colorClase: string;
    badgeClase: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "ember";
    descripcion: string;
  }
> = {
  sin_reporte: {
    label: "Sin reporte",
    colorClase: "text-text-muted",
    badgeClase: "text-text-muted bg-surface-2 border-border",
    badgeVariant: "outline",
    descripcion: "Compromiso programático sin reporte de ejecución verificado a la fecha.",
  },
  cumplido: {
    label: "Cumplido",
    colorClase: "text-success",
    badgeClase: "text-success bg-success/10 border-success/20",
    badgeVariant: "success",
    descripcion: "Meta cuatrienal o del período alcanzada al 100% con evidencias radicadas.",
  },
  en_ejecucion: {
    label: "En Ejecución",
    colorClase: "text-accent",
    badgeClase: "text-accent bg-accent/10 border-accent/20",
    badgeVariant: "info",
    descripcion: "Actividades operativas en curso dentro de los cronogramas programados.",
  },
  programado: {
    label: "Programado",
    colorClase: "text-text-muted",
    badgeClase: "text-text-secondary bg-surface-2 border-border",
    badgeVariant: "secondary",
    descripcion: "Compromiso institucional estructurado para ejecución en la vigencia.",
  },
  en_riesgo: {
    label: "En Riesgo",
    colorClase: "text-warning",
    badgeClase: "text-warning bg-warning/10 border-warning/20",
    badgeVariant: "warning",
    descripcion: "Desviación del cronograma o rezago presupuestal con riesgo de incumplimiento.",
  },
  retrasado: {
    label: "Retrasado",
    colorClase: "text-danger",
    badgeClase: "text-danger bg-danger/10 border-danger/20",
    badgeVariant: "destructive",
    descripcion: "Incumplimiento crítico de hitos físicos o financieros que exige plan de choque.",
  },
};

export const ENTIDADES_DISTRITALES_CARTAGENA = [
  "Secretaría del Interior y Convivencia Ciudadana",
  "Distriseguridad",
  "Secretaría de Participación y Desarrollo Social",
  "Secretaría General (Alumbrado Público)",
  "Establecimiento Público Ambiental (EPA Cartagena)",
  "Oficina Asesora de Gestión del Riesgo (OAGRD)",
  "Policía Metropolitana de Cartagena (MECAR)",
  "Departamento Administrativo Distrital de Salud (DADIS)",
  "Secretaría de Hacienda Distrital",
  "Dirección de Asuntos Étnicos",
  "Secretaría de Educación Distrital",
  "Instituto Distrital de Deporte y Recreación (IDER)",
] as const;
