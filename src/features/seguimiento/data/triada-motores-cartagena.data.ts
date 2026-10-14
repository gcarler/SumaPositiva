/**
 * DATASET CANÓNICO DE LA TRIADA DE MOTORES DE PLANEACIÓN Y HACIENDA DISTRITAL
 * Cartagena de Indias (2016–2026)
 *
 * Articulación de:
 * 1. Motor 1 — Plan de Desarrollo (Lectura Estratégica Cuatrienal)
 * 2. Motor 2 — Plan de Acción Multiformato (Lectura Operativa Anual/Trimestral — Cat. 4.3)
 * 3. Motor 3 — Inversión y Ejecución Presupuestal (Lectura Financiera — Cat. 4.1, 4.2, 4.4)
 * 4. Cruce de las 3 Lecturas (Semáforo de Coherencia Físico-Financiera-Estratégica)
 * 5. Catálogo Oficial de cartagena.gov.co/transparencia con los 23 archivos Excel 2026
 *
 * Base Legal: Ley 152/1994, Ley 1474/2011 Art. 74, Ley 1712/2014, Decreto 1082/2015.
 */

// ============================================================================
// 1. TIPOS Y CONTRATOS DE DATOS DE LA TRIADA
// ============================================================================

export type PerfilFormatoId =
  | "PA_MONOHOJA_2016_2019"
  | "PA_HIBRIDO_2020_2023"
  | "PA_MULTIHOJA_2024_2026"
  | "PA_CANONICO_DNP_POLIS";

export type EstadoSemaforoTripartito =
  | "COHERENCIA_INTEGRAL_ALTA"
  | "DESFASE_CRITICO_SOBREEJECUCION"
  | "REZAGO_CONTRACTUAL_INVERSION"
  | "META_PDD_SUBOPERACIONALIZADA";

export type FuenteFinanciacionTriada =
  | "ICLD"
  | "SGP"
  | "FONSET"
  | "REGALIAS"
  | "CREDITO"
  | "RECURSOS_PROPIOS";

export interface CategoriaTransparenciaAlcaldia {
  codigo: "4.1" | "4.2" | "4.3" | "4.4";
  titulo: "Presupuesto General" | "Ejecución Presupuestal" | "Plan de Acción" | "Proyectos de Inversión";
  url_portal: string;
  categoria_id: number;
  descripcion: string;
  frecuencia_actualizacion: string;
  normativa_soporte: string;
  total_documentos_detectados: number;
}

export interface ArchivoExcelPlanAccion2026 {
  id: string;
  nombre_archivo: string;
  dependencia: string;
  sigla: string;
  extension: ".xls" | ".xlsx";
  perfil_formato: PerfilFormatoId;
  total_hojas: number;
  nombres_hojas: string[];
  total_actividades_detectadas: number;
  estado_normalizacion: "NORMALIZADO_100" | "EN_CONVERSION_LEGACY" | "VALIDADO_CANONICO";
  tamanio_kb: number;
  fecha_publicacion: string;
  url_descarga_simulada: string;
  requiere_bypass_cloudflare: boolean;
  cortes_trimestrales_disponibles: Array<"T1_MARZO" | "T2_JUNIO" | "T3_SEPTIEMBRE" | "T4_DICIEMBRE">;
}

export interface PerfilFormatoExcelConfig {
  id: PerfilFormatoId;
  nombre: string;
  vigencias_aplicables: number[];
  periodo_historico: string;
  plan_desarrollo_asociado: string;
  descripcion_estructura: string;
  estructura_hojas: string;
  columnas_originales_tipicas: string[];
  fortalezas: string[];
  limitaciones_historicas: string[];
  nivel_complejidad_extraccion: "BAJA" | "MEDIA" | "ALTA" | "ESTANDARIZADA";
}

export interface HomologacionColumnaSemantica {
  encabezado_original: string;
  campo_canonico_polis: string;
  descripcion_campo: string;
  es_obligatorio: boolean;
  tipo_dato: "TEXTO" | "NUMERO" | "PORCENTAJE" | "MONEDA_COP" | "FECHA";
}

export interface ComparativaInteranualDependencia {
  dependencia: string;
  sigla: string;
  eje_tematico: string;
  v2016: {
    vigencia: 2016;
    formato_origen: PerfilFormatoId;
    total_metas_actividades: number;
    presupuesto_asignado_cop: number;
    avance_fisico_pct: number;
    calidad_redaccion_dnp_pct: number;
    observacion_historica: string;
  };
  v2020: {
    vigencia: 2020;
    formato_origen: PerfilFormatoId;
    total_metas_actividades: number;
    presupuesto_asignado_cop: number;
    avance_fisico_pct: number;
    calidad_redaccion_dnp_pct: number;
    observacion_historica: string;
  };
  v2026: {
    vigencia: 2026;
    formato_origen: PerfilFormatoId;
    total_metas_actividades: number;
    presupuesto_asignado_cop: number;
    avance_fisico_pct: number;
    calidad_redaccion_dnp_pct: number;
    observacion_historica: string;
  };
}

export interface MuestraSimulacionHuella {
  id: string;
  titulo_muestra: string;
  perfil_esperado: PerfilFormatoId;
  vigencia: number;
  dependencia: string;
  nombre_archivo: string;
  hojas: Array<{
    nombre: string;
    encabezados: string[];
    filas_ejemplo: Array<Record<string, string | number>>;
  }>;
}

export interface MetaEstrategicaPDD {
  codigo: string;
  cuatrienio: string;
  nombre_pdd: string;
  linea_estrategica: string;
  programa_mga: string;
  indicador_resultado: string;
  linea_base: number;
  meta_cuatrienal: number;
  unidad_medida: string;
  avance_cuatrienal_pct: number;
}

export interface ActividadOperativaPA {
  codigo: string;
  vigencia: number;
  dependencia: string;
  descripcion_actividad: string;
  verbo_infinitivo: string;
  calidad_dnp: "VERBO_FUERTE_VALIDO" | "VERBO_DEBIL_SUBSANADO" | "EN_REVISION";
  programado_anual: number;
  avance_t1: number;
  avance_t2: number;
  avance_t3: number;
  avance_t4: number;
  avance_fisico_anual_pct: number;
  formato_origen: PerfilFormatoId;
}

export interface EjecucionFinancieraProyecto {
  codigo_bpim: string;
  nombre_proyecto: string;
  dependencia: string;
  fuente_principal: FuenteFinanciacionTriada;
  apropiacion_inicial_cop: number;
  apropiacion_definitiva_cop: number;
  cdp_acumulado_cop: number;
  compromisos_rp_cop: number;
  obligaciones_cop: number;
  pagos_tesoreria_cop: number;
  porcentaje_cdp: number;
  porcentaje_rp: number;
  porcentaje_giro: number;
}

export interface CruceTripartitoLectura {
  id: string;
  dependencia: string;
  codigo_pdd: string;
  meta_pdd_titulo: string;
  codigo_pa: string;
  actividad_pa_descripcion: string;
  codigo_bpim: string;
  proyecto_bpim_nombre: string;
  fuente_financiacion: FuenteFinanciacionTriada;
  // Métricas de las 3 lecturas:
  avance_estrategico_pdd_pct: number;     // Motor 1: Estratégico Cuatrienal
  avance_operativo_pa_pct: number;          // Motor 2: Operativo Anual/Trimestral
  ejecucion_financiera_rp_pct: number;      // Motor 3: Financiero (Compromisos RP)
  giro_pagos_pct: number;                   // Motor 3: Pagos efectivos
  // Análisis pericial:
  brecha_fisico_financiera_pts: number;    // ejecucion_financiera_rp_pct - avance_operativo_pa_pct
  indice_coherencia_tripartita: number;     // 0 a 100
  estado_semaforo: EstadoSemaforoTripartito;
  hallazgo_forense: string;
  recomendacion_tecnica: string;
}

export interface ResumenConsolidadoTriada {
  totales_presupuesto: {
    apropiacion_inicial_cop: number;
    apropiacion_definitiva_cop: number;
    cdp_acumulado_cop: number;
    compromisos_rp_cop: number;
    obligaciones_cop: number;
    pagos_tesoreria_cop: number;
    porcentaje_cdp_global: number;
    porcentaje_rp_global: number;
    porcentaje_pagos_global: number;
  };
  totales_operativos: {
    total_dependencias: number;
    total_archivos_transparencia: number;
    total_actividades_plan_accion: number;
    avance_fisico_promedio_pct: number;
    cumplimiento_verbos_fuertes_dnp_pct: number;
  };
  totales_estrategicos: {
    total_metas_cuatrienales_pdd: number;
    avance_cuatrienal_promedio_pct: number;
    cuatrienio_activo: string;
  };
  distribucion_semaforo: {
    coherencia_alta: number;
    desfase_sobreejecucion: number;
    rezago_contractual: number;
    meta_suboperacionalizada: number;
  };
}

// ============================================================================
// 2. CATÁLOGO OFICIAL DE TRANSPARENCIA CARTAGENA (SECCIÓN 4)
// ============================================================================

export const CATEGORIAS_TRANSPARENCIA_CARTAGENA: CategoriaTransparenciaAlcaldia[] = [
  {
    codigo: "4.1",
    titulo: "Presupuesto General",
    url_portal: "https://www.cartagena.gov.co/Transparencia/Planeación?categoria=50",
    categoria_id: 50,
    descripcion:
      "Presupuesto general de ingresos, gastos e inversión aprobado por el Concejo Distrital, decretos de liquidación y POAI anualizado de Cartagena de Indias.",
    frecuencia_actualizacion: "Anual y modificaciones mensuales",
    normativa_soporte: "Ley 111 de 1996 · Decreto 111/96 · Acuerdo Distrital de Presupuesto",
    total_documentos_detectados: 18,
  },
  {
    codigo: "4.2",
    titulo: "Ejecución Presupuestal",
    url_portal: "https://www.cartagena.gov.co/Transparencia/Planeación?categoria=51",
    categoria_id: 51,
    descripcion:
      "Informes periódicos de ejecución presupuestal de ingresos y gastos, cortes de tesorería, estados de tesorería y cuentas por pagar del Distrito.",
    frecuencia_actualizacion: "Mensual acumulada",
    normativa_soporte: "Ley 1712 de 2014 Art. 9 Lit. e · Resolución 1519 de 2020 MinTIC",
    total_documentos_detectados: 48,
  },
  {
    codigo: "4.3",
    titulo: "Plan de Acción",
    url_portal: "https://www.cartagena.gov.co/Transparencia/Planeación?categoria=52",
    categoria_id: 52,
    descripcion:
      "Planes de acción institucionales por dependencia distrital, seguimiento trimestral T1-T4 y articulación con el Plan Indicativo cuatrienal.",
    frecuencia_actualizacion: "Trimestral obligatorio",
    normativa_soporte: "Ley 1474 de 2011 Art. 74 · Ley 152 de 1994 Art. 41 · Decreto 612 de 2018",
    total_documentos_detectados: 23,
  },
  {
    codigo: "4.4",
    titulo: "Proyectos de Inversión",
    url_portal: "https://www.cartagena.gov.co/Transparencia/Planeación?categoria=53",
    categoria_id: 53,
    descripcion:
      "Banco de Programas y Proyectos de Inversión Municipal (BPIM) con códigos BPIN registrados, fuentes de financiación y fichas de seguimiento.",
    frecuencia_actualizacion: "Trimestral y por radicación MGA",
    normativa_soporte: "Ley 152 de 1994 Art. 49 · Metodología General Ajustada (MGA) DNP",
    total_documentos_detectados: 142,
  },
];

export const ARCHIVOS_EXCEL_PLAN_ACCION_2026: ArchivoExcelPlanAccion2026[] = [
  {
    id: "pa-2026-dadis",
    nombre_archivo: "DADIS.xls",
    dependencia: "Departamento Administrativo Distrital de Salud (DADIS)",
    sigla: "DADIS",
    extension: ".xls",
    perfil_formato: "PA_MONOHOJA_2016_2019",
    total_hojas: 1,
    nombres_hojas: ["Hoja1"],
    total_actividades_detectadas: 84,
    estado_normalizacion: "EN_CONVERSION_LEGACY",
    tamanio_kb: 420,
    fecha_publicacion: "2026-02-15",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/DADIS.xls",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-hacienda",
    nombre_archivo: "SECRETARIA DE HACIENDA.xlsx",
    dependencia: "Secretaría de Hacienda Distrital",
    sigla: "HACIENDA",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 62,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 780,
    fecha_publicacion: "2026-02-20",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/SECRETARIA%20DE%20HACIENDA.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO", "T3_SEPTIEMBRE"],
  },
  {
    id: "pa-2026-planeacion",
    nombre_archivo: "SECRETARÍA DE PLANEACION.xlsx",
    dependencia: "Secretaría de Planeación Distrital",
    sigla: "PLANEACION",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 95,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 920,
    fecha_publicacion: "2026-01-30",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/SECRETAR%C3%8DA%20DE%20PLANEACION.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-educacion",
    nombre_archivo: "SEC_EDUCACION.xlsx",
    dependencia: "Secretaría de Educación Distrital",
    sigla: "EDUCACION",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 110,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 1150,
    fecha_publicacion: "2026-02-12",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/SEC_EDUCACION.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-datt",
    nombre_archivo: "DATT.xlsx",
    dependencia: "Departamento Administrativo de Tránsito y Transporte (DATT)",
    sigla: "DATT",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 48,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 640,
    fecha_publicacion: "2026-02-18",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/DATT.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-infraestructura",
    nombre_archivo: "INFRAESTRUCTURA.xlsx",
    dependencia: "Secretaría de Infraestructura",
    sigla: "INFRAESTRUCTURA",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 56,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 730,
    fecha_publicacion: "2026-02-22",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/INFRAESTRUCTURA.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-ider",
    nombre_archivo: "IDER.xlsx",
    dependencia: "Instituto Distrital de Deporte y Recreación (IDER)",
    sigla: "IDER",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 42,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 590,
    fecha_publicacion: "2026-02-14",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/IDER.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-ipcc",
    nombre_archivo: "IPCC.xlsx",
    dependencia: "Instituto de Patrimonio y Cultura de Cartagena (IPCC)",
    sigla: "IPCC",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 38,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 510,
    fecha_publicacion: "2026-02-16",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/IPCC.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-corvivienda",
    nombre_archivo: "CORVIVIENDA.xlsx",
    dependencia: "Fondo de Vivienda de Interés Social y Reforma Urbana Distrital (CORVIVIENDA)",
    sigla: "CORVIVIENDA",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 35,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 480,
    fecha_publicacion: "2026-02-25",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/CORVIVIENDA.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-transcaribe",
    nombre_archivo: "TRANSCARIBE.xlsx",
    dependencia: "Transcaribe S.A. Sistema Integrado de Transporte Masivo",
    sigla: "TRANSCARIBE",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 29,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 440,
    fecha_publicacion: "2026-02-20",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/TRANSCARIBE.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-epa",
    nombre_archivo: "EPA.xlsx",
    dependencia: "Establecimiento Público Ambiental Cartagena (EPA)",
    sigla: "EPA",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 44,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 610,
    fecha_publicacion: "2026-02-10",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/EPA.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-distriseguridad",
    nombre_archivo: "DISTRISEGURIDAD.xlsx",
    dependencia: "Fondo Territorial de Seguridad y Convivencia Ciudadana (DISTRISEGURIDAD)",
    sigla: "DISTRISEGURIDAD",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 32,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 520,
    fecha_publicacion: "2026-01-28",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/DISTRISEGURIDAD.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-escuela-gobierno",
    nombre_archivo: "ESCUELA DE GOBERNO.xlsx",
    dependencia: "Escuela de Gobierno y Liderazgo",
    sigla: "ESCUELA_GOBIERNO",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 24,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 390,
    fecha_publicacion: "2026-02-05",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/ESCUELA%20DE%20GOBERNO.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-espacio-publico",
    nombre_archivo: "GERENCIA DE ESPACIO PUBLICO.xlsx",
    dependencia: "Gerencia de Espacio Público y Movilidad",
    sigla: "ESPACIO_PUBLICO",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 28,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 450,
    fecha_publicacion: "2026-02-17",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/GERENCIA%20DE%20ESPACIO%20PUBLICO.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-idaccc",
    nombre_archivo: "IDACCC.xlsx",
    dependencia: "Instituto Distrital de Acción Comunal y Participación Ciudadana (IDACCC)",
    sigla: "IDACCC",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 26,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 410,
    fecha_publicacion: "2026-02-19",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/IDACCC.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-oagr",
    nombre_archivo: "OAGR.xlsx",
    dependencia: "Oficina Asesora para la Gestión del Riesgo de Desastres (OAGRD)",
    sigla: "OAGRD",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 31,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 490,
    fecha_publicacion: "2026-02-08",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/OAGR.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-pes",
    nombre_archivo: "PES-PR.xlsx",
    dependencia: "Plan de Emergencia Social Pedro Romero (PES-PR)",
    sigla: "PES_PR",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 40,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 610,
    fecha_publicacion: "2026-02-11",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/PES-PR.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-general",
    nombre_archivo: "SECRETARIA GENERAL.xlsx",
    dependencia: "Secretaría General de la Alcaldía",
    sigla: "SEC_GENERAL",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 45,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 660,
    fecha_publicacion: "2026-02-02",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/SECRETARIA%20GENERAL.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-sicc",
    nombre_archivo: "SICC.xlsx",
    dependencia: "Secretaría del Interior y Convivencia Ciudadana (SICC)",
    sigla: "INTERIOR",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 58,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 790,
    fecha_publicacion: "2026-01-25",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/SICC.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO", "T3_SEPTIEMBRE"],
  },
  {
    id: "pa-2026-spds-umata",
    nombre_archivo: "SPDS - UMATA.xlsx",
    dependencia: "Secretaría de Participación y Desarrollo Social / UMATA",
    sigla: "SPDS_UMATA",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 36,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 530,
    fecha_publicacion: "2026-02-15",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/SPDS%20-%20UMATA.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-turismo",
    nombre_archivo: "TURISMO.xlsx",
    dependencia: "Corporación Turismo Cartagena de Indias (Corpoturismo)",
    sigla: "TURISMO",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 30,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 470,
    fecha_publicacion: "2026-02-09",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/TURISMO.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-umayor",
    nombre_archivo: "UMAYOR.xlsx",
    dependencia: "Institución Universitaria Mayor de Cartagena (UMAYOR)",
    sigla: "UMAYOR",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 27,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 430,
    fecha_publicacion: "2026-02-13",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/UMAYOR.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
  {
    id: "pa-2026-valorizacion",
    nombre_archivo: "VALORIZACION.xlsx",
    dependencia: "Departamento Administrativo de Valorización Distrital",
    sigla: "VALORIZACION",
    extension: ".xlsx",
    perfil_formato: "PA_MULTIHOJA_2024_2026",
    total_hojas: 4,
    nombres_hojas: ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"],
    total_actividades_detectadas: 22,
    estado_normalizacion: "NORMALIZADO_100",
    tamanio_kb: 380,
    fecha_publicacion: "2026-02-18",
    url_descarga_simulada: "https://www.cartagena.gov.co/sites/default/files/transparencia/documentos/planes-accion-2026/VALORIZACION.xlsx",
    requiere_bypass_cloudflare: true,
    cortes_trimestrales_disponibles: ["T1_MARZO", "T2_JUNIO"],
  },
];

// ============================================================================
// 3. LOS 4 PERFILES POLIMÓRFICOS DE FORMATOS EXCEL (2016–2026)
// ============================================================================

export const PERFILES_FORMATO_EXCEL: Record<PerfilFormatoId, PerfilFormatoExcelConfig> = {
  PA_MONOHOJA_2016_2019: {
    id: "PA_MONOHOJA_2016_2019",
    nombre: "Plan de Acción Monohoja (2016–2019 Primero la Gente)",
    vigencias_aplicables: [2016, 2017, 2018, 2019],
    periodo_historico: "Alcaldía 2016–2019",
    plan_desarrollo_asociado: "Primero la Gente para una Cartagena Sostenible y Competitiva",
    descripcion_estructura:
      "Una sola hoja de cálculo plana por cada entidad distrital. Filas combinadas de objetivos generales, metas anuales y presupuesto global sin desagregación trimestral T1-T4.",
    estructura_hojas: "1 hoja única ('Hoja1' o el nombre de la dependencia)",
    columnas_originales_tipicas: [
      "Dependencia Responsable",
      "Objetivo General / Eje",
      "Meta Vigencia",
      "Indicador de Gestión",
      "Programado Anual",
      "Ejecutado Anual",
      "Presupuesto Asignado ($)",
      "Presupuesto Ejecutado ($)",
    ],
    fortalezas: [
      "Simplicidad de llenado por los funcionarios",
      "Menor propensión a fórmulas rotas entre hojas",
    ],
    limitaciones_historicas: [
      "Sin seguimiento trimestral T1-T4 (imposible medir rezago temprano)",
      "No articula con el Plan Indicativo ni códigos BPIM de inversión",
      "Mezcla metas de producto con actividades rutinarias de funcionamiento",
    ],
    nivel_complejidad_extraccion: "MEDIA",
  },
  PA_HIBRIDO_2020_2023: {
    id: "PA_HIBRIDO_2020_2023",
    nombre: "Plan de Acción Híbrido por Pilar (2020–2023 Salvemos Juntos a Cartagena)",
    vigencias_aplicables: [2020, 2021, 2022, 2023],
    periodo_historico: "Alcaldía 2020–2023",
    plan_desarrollo_asociado: "Salvemos Juntos a Cartagena por una Ciudad Incluyente y Resiliente",
    descripcion_estructura:
      "Libro con múltiples hojas organizadas por cada uno de los pilares del Plan de Desarrollo. Columnas de seguimiento semestral y trimestral parcial.",
    estructura_hojas: "4 hojas ('Cartagena Incluyente', 'Cartagena Resiliente', 'Cartagena Contingente', 'Cartagena Transparente')",
    columnas_originales_tipicas: [
      "Pilar Estratégico",
      "Línea de Acción",
      "Programa MGA",
      "Código Meta PDD",
      "Actividad Operativa",
      "Unidad de Medida",
      "Meta Programada",
      "Avance Semestre 1",
      "Avance Semestre 2",
      "Total Ejecutado",
      "Fuente Financiación",
      "Recursos Asignados COP",
    ],
    fortalezas: [
      "Agrupación por líneas políticas del Plan de Desarrollo",
      "Incorpora fuentes de financiación",
    ],
    limitaciones_historicas: [
      "Estructuras dispares entre las 4 hojas del mismo libro",
      "Formatos no normalizados entre secretarías centrales y descentralizadas",
      "Uso frecuente de verbos débiles ('apoyar', 'gestionar', 'coordinar')",
    ],
    nivel_complejidad_extraccion: "ALTA",
  },
  PA_MULTIHOJA_2024_2026: {
    id: "PA_MULTIHOJA_2024_2026",
    nombre: "Plan de Acción Multihoja Institucional (2024–2026 Cartagena Ciudad de Derechos)",
    vigencias_aplicables: [2024, 2025, 2026, 2027],
    periodo_historico: "Alcaldía 2024–2027",
    plan_desarrollo_asociado: "Cartagena Ciudad de Derechos",
    descripcion_estructura:
      "Libro institucional completo con separación formal de la Ficha Institucional, el Plan Indicativo cuatrienal, el Plan de Acción con entregas trimestrales T1-T4 y la ejecución presupuestal POAI.",
    estructura_hojas: "4 a 5 hojas ('Identificación', 'Plan Indicativo', 'Plan de Acción T1-T4', 'Presupuesto POAI')",
    columnas_originales_tipicas: [
      "Línea Estratégica",
      "Programa MGA",
      "Código BPIM",
      "Proyecto de Inversión",
      "Actividad Operativa",
      "Verbo Infinitivo",
      "Meta Anual",
      "Programado T1",
      "Programado T2",
      "Programado T3",
      "Programado T4",
      "Ejecutado T1",
      "Ejecutado T2",
      "Ejecutado T3",
      "Ejecutado T4",
      "Avance Físico (%)",
      "Fuente Recursos",
      "Presupuesto COP",
      "Compromisos RP COP",
      "Pagos COP",
    ],
    fortalezas: [
      "Desglose trimestral T1-T4 riguroso",
      "Articula metas cuatrienales con actividades operativas anuales",
      "Incluye códigos de proyectos de inversión BPIM",
    ],
    limitaciones_historicas: [
      "Complejidad de validación por dependencia",
      "Algunas entidades aún suben archivos antiguos con extensión .xls",
    ],
    nivel_complejidad_extraccion: "MEDIA",
  },
  PA_CANONICO_DNP_POLIS: {
    id: "PA_CANONICO_DNP_POLIS",
    nombre: "Plantilla Dual Canónica DNP / SisPT (POLIS)",
    vigencias_aplicables: [2026],
    periodo_historico: "Estándar Oficial DNP Ley 152/94 y Ley 1474/11",
    plan_desarrollo_asociado: "Plan Estratégico Distrital de Seguridad Humana / PDD Vigente",
    descripcion_estructura:
      "Formato estandarizado al 100% en 2 hojas enlazadas por llave foránea: Hoja 1 Plan_Accion (operativa T1-T4) y Hoja 2 Plan_Indicativo (metas cuatrienales), con validador de verbos fuertes en infinitivo.",
    estructura_hojas: "2 hojas obligatorias ('Hoja 1: Plan_Accion', 'Hoja 2: Plan_Indicativo')",
    columnas_originales_tipicas: [
      "código_actividad",
      "vigencia",
      "compromiso_pas_codigo",
      "linea_estrategica_codigo",
      "dependencia_responsable",
      "tipo_meta",
      "unidad_medida",
      "codigo_bpim",
      "descripcion_actividad",
      "verbo_infinitivo",
      "avance_t1",
      "avance_t2",
      "avance_t3",
      "avance_t4",
      "fuente_financiacion",
      "monto_programado_cop",
      "monto_ejecutado_cop",
    ],
    fortalezas: [
      "Estructura 100% limpia y validada por el Banco de Conocimiento DNP",
      "Cruce automatizado en 1 clic entre Hoja 2 y Hoja 1",
      "Auditoría de verbos débiles DNP incorporada",
    ],
    limitaciones_historicas: [
      "Requiere capacitación previa a los equipos de planeación sectorial",
    ],
    nivel_complejidad_extraccion: "ESTANDARIZADA",
  },
};

// ============================================================================
// 4. DICCIONARIO DE HOMOLOGACIÓN SEMÁNTICA DE COLUMNAS
// ============================================================================

export const HOMOLOGACION_COLUMNAS_CANONICAS: HomologacionColumnaSemantica[] = [
  {
    encabezado_original: "Dependencia / Secretaría / Entidad / Organismo",
    campo_canonico_polis: "dependencia_responsable",
    descripcion_campo: "Nombre o sigla oficial de la dependencia distrital ejecutora",
    es_obligatorio: true,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Línea Estratégica / Eje / Pilar / Dimensión",
    campo_canonico_polis: "linea_estrategica_codigo",
    descripcion_campo: "Eje estructurante del Plan de Desarrollo Distrital",
    es_obligatorio: true,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Código Meta PDD / Meta Indicativo / Llave Plan",
    campo_canonico_polis: "codigo_meta_pdd",
    descripcion_campo: "Código alfanumérico que vincula con el Plan Indicativo cuatrienal",
    es_obligatorio: true,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Código BPIM / BPIN / Código Proyecto Inversión",
    campo_canonico_polis: "codigo_bpim",
    descripcion_campo: "Código del proyecto de inversión en el Banco Distrital de Programas y Proyectos",
    es_obligatorio: false,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Actividad / Descripción Actividad / Tarea Operativa",
    campo_canonico_polis: "descripcion_actividad",
    descripcion_campo: "Acción concreta y verificable a ejecutar durante la vigencia",
    es_obligatorio: true,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Verbo / Verbo Rector / Acción Principal",
    campo_canonico_polis: "verbo_infinitivo",
    descripcion_campo: "Verbo fuerte en infinitivo auditado según el estándar DNP",
    es_obligatorio: true,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Meta Programada Anual / Meta 2026 / Programado Vigencia",
    campo_canonico_polis: "meta_programada_anual",
    descripcion_campo: "Magnitud física programada a entregar en el año",
    es_obligatorio: true,
    tipo_dato: "NUMERO",
  },
  {
    encabezado_original: "Avance T1 / Programado T1 / Trimestre 1 / Semestre 1",
    campo_canonico_polis: "avance_t1",
    descripcion_campo: "Entrega física alcanzada al corte de marzo",
    es_obligatorio: false,
    tipo_dato: "NUMERO",
  },
  {
    encabezado_original: "Avance T2 / Programado T2 / Trimestre 2 / Semestre 2",
    campo_canonico_polis: "avance_t2",
    descripcion_campo: "Entrega física alcanzada al corte de junio",
    es_obligatorio: false,
    tipo_dato: "NUMERO",
  },
  {
    encabezado_original: "Avance T3 / Programado T3 / Trimestre 3",
    campo_canonico_polis: "avance_t3",
    descripcion_campo: "Entrega física alcanzada al corte de septiembre",
    es_obligatorio: false,
    tipo_dato: "NUMERO",
  },
  {
    encabezado_original: "Avance T4 / Programado T4 / Trimestre 4",
    campo_canonico_polis: "avance_t4",
    descripcion_campo: "Entrega física alcanzada al corte de diciembre",
    es_obligatorio: false,
    tipo_dato: "NUMERO",
  },
  {
    encabezado_original: "Avance Físico (%) / % Ejecución Física / Cumplimiento",
    campo_canonico_polis: "porcentaje_avance_fisico",
    descripcion_campo: "Porcentaje ponderado de cumplimiento de la meta física",
    es_obligatorio: true,
    tipo_dato: "PORCENTAJE",
  },
  {
    encabezado_original: "Fuente / Fuente Financiación / Recursos",
    campo_canonico_polis: "fuente_financiacion",
    descripcion_campo: "Origen presupuestal de los recursos (ICLD, SGP, FONSET, Regalías, etc.)",
    es_obligatorio: true,
    tipo_dato: "TEXTO",
  },
  {
    encabezado_original: "Presupuesto Programado / Asignación POAI / Apropiación",
    campo_canonico_polis: "monto_programado_cop",
    descripcion_campo: "Valor presupuestal asignado en pesos colombianos (COP)",
    es_obligatorio: true,
    tipo_dato: "MONEDA_COP",
  },
  {
    encabezado_original: "Presupuesto Ejecutado / Compromisos RP / Girado",
    campo_canonico_polis: "monto_ejecutado_cop",
    descripcion_campo: "Valor ejecutado contractualmente en pesos colombianos (COP)",
    es_obligatorio: true,
    tipo_dato: "MONEDA_COP",
  },
];

// ============================================================================
// 5. MATRIZ COMPARATIVA INTERANUAL ESTANDARIZADA (2016 vs. 2020 vs. 2026)
// ============================================================================

export const MATRIZ_COMPARATIVA_INTERANUAL: ComparativaInteranualDependencia[] = [
  {
    dependencia: "Secretaría del Interior y Convivencia Ciudadana",
    sigla: "INTERIOR",
    eje_tematico: "Seguridad Ciudadana, Convivencia y Orden Público",
    v2016: {
      vigencia: 2016,
      formato_origen: "PA_MONOHOJA_2016_2019",
      total_metas_actividades: 22,
      presupuesto_asignado_cop: 18450000000,
      avance_fisico_pct: 64.2,
      calidad_redaccion_dnp_pct: 42.0,
      observacion_historica: "Hoja única en .xls. Múltiples actividades con verbos débiles ('apoyar', 'gestionar').",
    },
    v2020: {
      vigencia: 2020,
      formato_origen: "PA_HIBRIDO_2020_2023",
      total_metas_actividades: 34,
      presupuesto_asignado_cop: 24800000000,
      avance_fisico_pct: 71.8,
      calidad_redaccion_dnp_pct: 58.5,
      observacion_historica: "Formato por pilares en Salvemos Juntos a Cartagena. Incorporó cortes semestrales.",
    },
    v2026: {
      vigencia: 2026,
      formato_origen: "PA_MULTIHOJA_2024_2026",
      total_metas_actividades: 58,
      presupuesto_asignado_cop: 46200000000,
      avance_fisico_pct: 82.4,
      calidad_redaccion_dnp_pct: 91.2,
      observacion_historica: "Libro multihoja con seguimiento trimestral T1-T4 articulado con BPIM y FONSET.",
    },
  },
  {
    dependencia: "Fondo Territorial de Seguridad (DISTRISEGURIDAD)",
    sigla: "DISTRISEGURIDAD",
    eje_tematico: "Tecnología, Cámaras de Seguridad y Dotación Policial",
    v2016: {
      vigencia: 2016,
      formato_origen: "PA_MONOHOJA_2016_2019",
      total_metas_actividades: 14,
      presupuesto_asignado_cop: 12100000000,
      avance_fisico_pct: 58.0,
      calidad_redaccion_dnp_pct: 35.0,
      observacion_historica: "Formato plano monohoja sin desagregación de mantenimiento preventivo de cámaras.",
    },
    v2020: {
      vigencia: 2020,
      formato_origen: "PA_HIBRIDO_2020_2023",
      total_metas_actividades: 20,
      presupuesto_asignado_cop: 19500000000,
      avance_fisico_pct: 68.4,
      calidad_redaccion_dnp_pct: 60.0,
      observacion_historica: "Pestaña de Cartagena Resiliente. Inclusión de proyectos de radiocomunicaciones.",
    },
    v2026: {
      vigencia: 2026,
      formato_origen: "PA_MULTIHOJA_2024_2026",
      total_metas_actividades: 32,
      presupuesto_asignado_cop: 38400000000,
      avance_fisico_pct: 85.0,
      calidad_redaccion_dnp_pct: 94.0,
      observacion_historica: "Multihoja con proyectos BPIM de analítica predictiva de delitos y expansión CAD.",
    },
  },
  {
    dependencia: "Departamento Administrativo Distrital de Salud (DADIS)",
    sigla: "DADIS",
    eje_tematico: "Salud Pública, Vigilancia Epidemiológica y Aseguramiento",
    v2016: {
      vigencia: 2016,
      formato_origen: "PA_MONOHOJA_2016_2019",
      total_metas_actividades: 45,
      presupuesto_asignado_cop: 185000000000,
      avance_fisico_pct: 72.1,
      calidad_redaccion_dnp_pct: 48.0,
      observacion_historica: "Hoja plana .xls con 84 líneas agregadas sin trazabilidad por centros de salud.",
    },
    v2020: {
      vigencia: 2020,
      formato_origen: "PA_HIBRIDO_2020_2023",
      total_metas_actividades: 62,
      presupuesto_asignado_cop: 240000000000,
      avance_fisico_pct: 79.5,
      calidad_redaccion_dnp_pct: 66.0,
      observacion_historica: "Adaptación por contingencia COVID-19 en pilar Cartagena Contingente.",
    },
    v2026: {
      vigencia: 2026,
      formato_origen: "PA_MULTIHOJA_2024_2026",
      total_metas_actividades: 84,
      presupuesto_asignado_cop: 320000000000,
      avance_fisico_pct: 80.5,
      calidad_redaccion_dnp_pct: 88.0,
      observacion_historica: "Archivo publicado en Transparencia como DADIS.xls normalizado al estándar canónico.",
    },
  },
  {
    dependencia: "Secretaría de Infraestructura",
    sigla: "INFRAESTRUCTURA",
    eje_tematico: "Malla Vial, Puentes, Drenajes Pluviales y Alumbrado Público",
    v2016: {
      vigencia: 2016,
      formato_origen: "PA_MONOHOJA_2016_2019",
      total_metas_actividades: 19,
      presupuesto_asignado_cop: 78000000000,
      avance_fisico_pct: 54.0,
      calidad_redaccion_dnp_pct: 40.0,
      observacion_historica: "Contratos de obra pública sin correlación trimestral con planes de contingencia.",
    },
    v2020: {
      vigencia: 2020,
      formato_origen: "PA_HIBRIDO_2020_2023",
      total_metas_actividades: 28,
      presupuesto_asignado_cop: 110000000000,
      avance_fisico_pct: 62.0,
      calidad_redaccion_dnp_pct: 64.0,
      observacion_historica: "Hojas separadas en Cartagena Resiliente. Rezago en drenajes pluviales.",
    },
    v2026: {
      vigencia: 2026,
      formato_origen: "PA_MULTIHOJA_2024_2026",
      total_metas_actividades: 56,
      presupuesto_asignado_cop: 285000000000,
      avance_fisico_pct: 78.5,
      calidad_redaccion_dnp_pct: 92.5,
      observacion_historica: "Multihoja con proyectos estratégicos de la Perimetral de la Ciénaga y vías barriales.",
    },
  },
  {
    dependencia: "Secretaría de Educación Distrital",
    sigla: "EDUCACION",
    eje_tematico: "Calidad Educativa, Cobertura, PAE e Infraestructura Escolar",
    v2016: {
      vigencia: 2016,
      formato_origen: "PA_MONOHOJA_2016_2019",
      total_metas_actividades: 38,
      presupuesto_asignado_cop: 310000000000,
      avance_fisico_pct: 75.0,
      calidad_redaccion_dnp_pct: 52.0,
      observacion_historica: "Hoja simple con macro-metas agregadas de matrícula y alimentación escolar.",
    },
    v2020: {
      vigencia: 2020,
      formato_origen: "PA_HIBRIDO_2020_2023",
      total_metas_actividades: 54,
      presupuesto_asignado_cop: 410000000000,
      avance_fisico_pct: 81.0,
      calidad_redaccion_dnp_pct: 70.0,
      observacion_historica: "Pilar Cartagena Incluyente. Énfasis en conectividad y guías pedagógicas.",
    },
    v2026: {
      vigencia: 2026,
      formato_origen: "PA_MULTIHOJA_2024_2026",
      total_metas_actividades: 110,
      presupuesto_asignado_cop: 650000000000,
      avance_fisico_pct: 88.0,
      calidad_redaccion_dnp_pct: 95.0,
      observacion_historica: "Libro institucional multihoja con 110 actividades desagregadas por sedes oficiales.",
    },
  },
];

// ============================================================================
// 6. MUESTRAS PRECONFIGURADAS PARA EL SIMULADOR DE HUELLA (SCHEMA FINGERPRINTING)
// ============================================================================

export const MUESTRAS_SIMULACION_HUELLA: MuestraSimulacionHuella[] = [
  {
    id: "muestra-2016-dadis",
    titulo_muestra: "1. 2016 Monohoja Legacy (DADIS)",
    perfil_esperado: "PA_MONOHOJA_2016_2019",
    vigencia: 2016,
    dependencia: "DADIS - Salud Distrital",
    nombre_archivo: "DADIS_Plan_Accion_2016.xls",
    hojas: [
      {
        nombre: "Hoja1",
        encabezados: [
          "Dependencia",
          "Objetivo General",
          "Meta 2016",
          "Indicador",
          "Programado",
          "Ejecutado",
          "Presupuesto Asignado ($)",
          "Presupuesto Ejecutado ($)",
        ],
        filas_ejemplo: [
          {
            Dependencia: "DADIS",
            "Objetivo General": "Fortalecer la vigilancia epidemiológica distrital",
            "Meta 2016": "Inspeccionar 45 IPS públicas y privadas",
            Indicador: "IPS inspeccionadas",
            Programado: 45,
            Ejecutado: 38,
            "Presupuesto Asignado ($)": 850000000,
            "Presupuesto Ejecutado ($)": 720000000,
          },
          {
            Dependencia: "DADIS",
            "Objetivo General": "Apoyar la vacunación en zonas insulares",
            "Meta 2016": "Aplicar 12.000 dosis biológicas",
            Indicador: "Dosis aplicadas",
            Programado: 12000,
            Ejecutado: 10450,
            "Presupuesto Asignado ($)": 1200000000,
            "Presupuesto Ejecutado ($)": 1150000000,
          },
        ],
      },
    ],
  },
  {
    id: "muestra-2021-distriseguridad",
    titulo_muestra: "2. 2021 Híbrido por Pilar (Salvemos Juntos)",
    perfil_esperado: "PA_HIBRIDO_2020_2023",
    vigencia: 2021,
    dependencia: "Fondo Territorial DISTRISEGURIDAD",
    nombre_archivo: "DISTRISEGURIDAD_Pilar_Resiliente_2021.xlsx",
    hojas: [
      {
        nombre: "Cartagena Resiliente",
        encabezados: [
          "Pilar",
          "Línea de Acción",
          "Código Meta PDD",
          "Actividad Operativa",
          "Meta Programada",
          "Avance Semestre 1",
          "Avance Semestre 2",
          "Total Ejecutado",
          "Fuente Financiación",
          "Recursos Asignados COP",
        ],
        filas_ejemplo: [
          {
            Pilar: "Cartagena Resiliente",
            "Línea de Acción": "Seguridad Tecnológica y Monitoreo",
            "Código Meta PDD": "PDD20-L2-M04",
            "Actividad Operativa": "Adquirir 85 cámaras de videovigilancia domo PTZ",
            "Meta Programada": 85,
            "Avance Semestre 1": 40,
            "Avance Semestre 2": 45,
            "Total Ejecutado": 85,
            "Fuente Financiación": "FONSET",
            "Recursos Asignados COP": 3200000000,
          },
          {
            Pilar: "Cartagena Resiliente",
            "Línea de Acción": "Movilidad Segura para la Fuerza Pública",
            "Código Meta PDD": "PDD20-L2-M05",
            "Actividad Operativa": "Suministrar 30 motocicletas uniformadas a la Policía",
            "Meta Programada": 30,
            "Avance Semestre 1": 15,
            "Avance Semestre 2": 15,
            "Total Ejecutado": 30,
            "Fuente Financiación": "FONSET",
            "Recursos Asignados COP": 1150000000,
          },
        ],
      },
      {
        nombre: "Cartagena Incluyente",
        encabezados: ["Pilar", "Línea de Acción", "Código Meta PDD", "Actividad Operativa", "Meta Programada"],
        filas_ejemplo: [],
      },
      {
        nombre: "Cartagena Transparente",
        encabezados: ["Pilar", "Línea de Acción", "Código Meta PDD", "Actividad Operativa", "Meta Programada"],
        filas_ejemplo: [],
      },
    ],
  },
  {
    id: "muestra-2026-planeacion",
    titulo_muestra: "3. 2026 Multihoja Oficial (Transparencia Cartagena)",
    perfil_esperado: "PA_MULTIHOJA_2024_2026",
    vigencia: 2026,
    dependencia: "Secretaría de Planeación Distrital",
    nombre_archivo: "SECRETARÍA DE PLANEACION.xlsx",
    hojas: [
      {
        nombre: "Identificación",
        encabezados: ["Parámetro", "Valor", "Observaciones"],
        filas_ejemplo: [
          { Parámetro: "Entidad", Valor: "Secretaría de Planeación Distrital", Observaciones: "Despacho Central" },
          { Parámetro: "Vigencia", Valor: 2026, Observaciones: "Aprobado por Consejo de Gobierno" },
        ],
      },
      {
        nombre: "Plan Indicativo",
        encabezados: ["Código Meta PDD", "Línea Estratégica", "Programa", "Meta Cuatrienal", "Meta 2026"],
        filas_ejemplo: [
          {
            "Código Meta PDD": "PDD24-L5-M01",
            "Línea Estratégica": "Gobernanza y Transparencia",
            Programa: "Planificación Integral del Territorio",
            "Meta Cuatrienal": 1,
            "Meta 2026": 0.5,
          },
        ],
      },
      {
        nombre: "Plan de Acción T1-T4",
        encabezados: [
          "Línea Estratégica",
          "Código BPIM",
          "Actividad Operativa",
          "Verbo Infinitivo",
          "Programado T1",
          "Programado T2",
          "Programado T3",
          "Programado T4",
          "Ejecutado T1",
          "Ejecutado T2",
          "Avance Físico (%)",
          "Fuente Recursos",
          "Presupuesto COP",
        ],
        filas_ejemplo: [
          {
            "Línea Estratégica": "Gobernanza y Transparencia",
            "Código BPIM": "BPIM-2026-089",
            "Actividad Operativa": "Actualizar el Plan de Ordenamiento Territorial (POT) de Cartagena",
            "Verbo Infinitivo": "Actualizar",
            "Programado T1": 0.25,
            "Programado T2": 0.25,
            "Programado T3": 0.25,
            "Programado T4": 0.25,
            "Ejecutado T1": 0.25,
            "Ejecutado T2": 0.24,
            "Avance Físico (%)": 98.0,
            "Fuente Recursos": "ICLD",
            "Presupuesto COP": 4500000000,
          },
        ],
      },
      {
        nombre: "Presupuesto POAI",
        encabezados: ["Código BPIM", "Proyecto Inversión", "Apropiación Inicial", "Compromisos RP", "Pagos"],
        filas_ejemplo: [
          {
            "Código BPIM": "BPIM-2026-089",
            "Proyecto Inversión": "Actualización técnica participativa del POT de Cartagena",
            "Apropiación Inicial": 4500000000,
            "Compromisos RP": 3950000000,
            Pagos: 2600000000,
          },
        ],
      },
    ],
  },
  {
    id: "muestra-2026-canonico-polis",
    titulo_muestra: "4. 2026 Canónico Dual DNP / SisPT (POLIS)",
    perfil_esperado: "PA_CANONICO_DNP_POLIS",
    vigencia: 2026,
    dependencia: "Secretaría del Interior y Convivencia Ciudadana",
    nombre_archivo: "Plan_Accion_Canonico_DNP_Interior_2026.xlsx",
    hojas: [
      {
        nombre: "Plan_Accion",
        encabezados: [
          "codigo_actividad",
          "compromiso_pas_codigo",
          "linea_estrategica_codigo",
          "dependencia_responsable",
          "descripcion_actividad",
          "verbo_infinitivo",
          "avance_t1",
          "avance_t2",
          "avance_t3",
          "avance_t4",
          "porcentaje_avance_fisico",
          "fuente_financiacion",
          "monto_programado_cop",
          "monto_ejecutado_cop",
        ],
        filas_ejemplo: [
          {
            codigo_actividad: "PA-2026-INT-001",
            compromiso_pas_codigo: "PAS-SEC-001",
            linea_estrategica_codigo: "L1_SEGURIDAD_HUMANA",
            dependencia_responsable: "Secretaría del Interior",
            descripcion_actividad: "Fortalecer los 15 Comités Barriales de Convivencia y Seguridad en Localidad 2",
            verbo_infinitivo: "Fortalecer",
            avance_t1: 15,
            avance_t2: 15,
            avance_t3: 0,
            avance_t4: 0,
            porcentaje_avance_fisico: 100.0,
            fuente_financiacion: "FONSET",
            monto_programado_cop: 1800000000,
            monto_ejecutado_cop: 1750000000,
          },
        ],
      },
      {
        nombre: "Plan_Indicativo",
        encabezados: [
          "codigo_compromiso",
          "linea_estrategica",
          "programa",
          "meta_cuatrienal",
          "linea_base",
          "unidad_medida",
        ],
        filas_ejemplo: [
          {
            codigo_compromiso: "PAS-SEC-001",
            linea_estrategica: "L1_SEGURIDAD_HUMANA",
            programa: "Convivencia Ciudadana y Mediación Comunitaria",
            meta_cuatrienal: 60,
            linea_base: 15,
            unidad_medida: "Comités Operativos",
          },
        ],
      },
    ],
  },
];

// ============================================================================
// 7. LOS 3 MOTORES ARTICULADOS Y EL CRUCE TRIPARTITO DE LECTURAS
// ============================================================================

export const METAS_ESTRATEGICAS_PDD_CANONICAS: MetaEstrategicaPDD[] = [
  {
    codigo: "PDD24-L1-M01",
    cuatrienio: "2024–2027",
    nombre_pdd: "Cartagena Ciudad de Derechos",
    linea_estrategica: "Línea 1: Seguridad Integral y Justicia Cercana",
    programa_mga: "Protección a la Vida y Prevención Social del Delito",
    indicador_resultado: "Tasa de homicidios por cada 100.000 habitantes",
    linea_base: 33.8,
    meta_cuatrienal: 22.0,
    unidad_medida: "Tasa por 100k hab",
    avance_cuatrienal_pct: 68.5,
  },
  {
    codigo: "PDD24-L1-M02",
    cuatrienio: "2024–2027",
    nombre_pdd: "Cartagena Ciudad de Derechos",
    linea_estrategica: "Línea 1: Seguridad Integral y Justicia Cercana",
    programa_mga: "Tecnología y Monitoreo Urbano Inteligente",
    indicador_resultado: "Cámaras de seguridad conectadas y operativas en el CAD",
    linea_base: 320,
    meta_cuatrienal: 850,
    unidad_medida: "Cámaras operativas",
    avance_cuatrienal_pct: 82.0,
  },
  {
    codigo: "PDD24-L2-M03",
    cuatrienio: "2024–2027",
    nombre_pdd: "Cartagena Ciudad de Derechos",
    linea_estrategica: "Línea 2: Desarrollo Social e Inclusión",
    programa_mga: "Erradicación de la Pobreza Extrema Pedro Romero",
    indicador_resultado: "Familias superando la línea de pobreza extrema",
    linea_base: 45000,
    meta_cuatrienal: 70000,
    unidad_medida: "Familias focalizadas",
    avance_cuatrienal_pct: 61.0,
  },
  {
    codigo: "PDD24-L3-M04",
    cuatrienio: "2024–2027",
    nombre_pdd: "Cartagena Ciudad de Derechos",
    linea_estrategica: "Línea 3: Infraestructura, Hábitat y Servicios",
    programa_mga: "Rehabilitación de la Malla Vial y Movilidad Inclusiva",
    indicador_resultado: "Kilómetros carril de malla vial rehabilitados",
    linea_base: 45,
    meta_cuatrienal: 180,
    unidad_medida: "Km-carril",
    avance_cuatrienal_pct: 74.0,
  },
  {
    codigo: "PDD24-L4-M05",
    cuatrienio: "2024–2027",
    nombre_pdd: "Cartagena Ciudad de Derechos",
    linea_estrategica: "Línea 4: Educación de Calidad y Primera Infancia",
    programa_mga: "Infraestructura Educativa Dignificada y PAE",
    indicador_resultado: "Estudiantes con cobertura alimentaria PAE y aulas dignas",
    linea_base: 95000,
    meta_cuatrienal: 135000,
    unidad_medida: "Estudiantes atendidos",
    avance_cuatrienal_pct: 89.0,
  },
];

export const PROYECTOS_INVERSION_BPIM_CANONICOS: EjecucionFinancieraProyecto[] = [
  {
    codigo_bpim: "BPIM-2026-001",
    nombre_proyecto: "Fortalecimiento de la Plataforma de Videovigilancia y Centros de Atención Inmediata en Cartagena",
    dependencia: "DISTRISEGURIDAD",
    fuente_principal: "FONSET",
    apropiacion_inicial_cop: 24500000000,
    apropiacion_definitiva_cop: 28200000000,
    cdp_acumulado_cop: 26500000000,
    compromisos_rp_cop: 23265000000,
    obligaciones_cop: 19800000000,
    pagos_tesoreria_cop: 18100000000,
    porcentaje_cdp: 94.0,
    porcentaje_rp: 82.5,
    porcentaje_giro: 64.2,
  },
  {
    codigo_bpim: "BPIM-2026-002",
    nombre_proyecto: "Mantenimiento y Adecuación Locativa de Equipamientos Comunitarios y Casas de Justicia",
    dependencia: "Secretaría del Interior",
    fuente_principal: "ICLD",
    apropiacion_inicial_cop: 14200000000,
    apropiacion_definitiva_cop: 16800000000,
    cdp_acumulado_cop: 16500000000,
    compromisos_rp_cop: 15792000000,
    obligaciones_cop: 11200000000,
    pagos_tesoreria_cop: 9800000000,
    porcentaje_cdp: 98.2,
    porcentaje_rp: 94.0,
    porcentaje_giro: 58.3,
  },
  {
    codigo_bpim: "BPIM-2026-003",
    nombre_proyecto: "Dotación Tecnológica y Alarmas Comunitarias para Frentes de Seguridad Barrial",
    dependencia: "Secretaría del Interior",
    fuente_principal: "FONSET",
    apropiacion_inicial_cop: 9800000000,
    apropiacion_definitiva_cop: 11200000000,
    cdp_acumulado_cop: 7200000000,
    compromisos_rp_cop: 3136000000,
    obligaciones_cop: 2400000000,
    pagos_tesoreria_cop: 2100000000,
    porcentaje_cdp: 64.3,
    porcentaje_rp: 28.0,
    porcentaje_giro: 18.8,
  },
  {
    codigo_bpim: "BPIM-2026-004",
    nombre_proyecto: "Intervención de Puntos Críticos y Prevención Social del Hurto a Comerciantes y Familias",
    dependencia: "DISTRISEGURIDAD / INTERIOR",
    fuente_principal: "RECURSOS_PROPIOS",
    apropiacion_inicial_cop: 18500000000,
    apropiacion_definitiva_cop: 19800000000,
    cdp_acumulado_cop: 15400000000,
    compromisos_rp_cop: 13860000000,
    obligaciones_cop: 10200000000,
    pagos_tesoreria_cop: 8900000000,
    porcentaje_cdp: 77.8,
    porcentaje_rp: 70.0,
    porcentaje_giro: 45.0,
  },
  {
    codigo_bpim: "BPIM-2026-005",
    nombre_proyecto: "Rehabilitación Prioritaria de la Malla Vial Urbana en Localidades 1, 2 y 3 de Cartagena",
    dependencia: "Secretaría de Infraestructura",
    fuente_principal: "CREDITO",
    apropiacion_inicial_cop: 125000000000,
    apropiacion_definitiva_cop: 142000000000,
    cdp_acumulado_cop: 138000000000,
    compromisos_rp_cop: 122120000000,
    obligaciones_cop: 98000000000,
    pagos_tesoreria_cop: 89000000000,
    porcentaje_cdp: 97.2,
    porcentaje_rp: 86.0,
    porcentaje_giro: 62.7,
  },
  {
    codigo_bpim: "BPIM-2026-006",
    nombre_proyecto: "Suministro Oportuno del Programa de Alimentación Escolar (PAE) Oficial de Cartagena",
    dependencia: "Secretaría de Educación",
    fuente_principal: "SGP",
    apropiacion_inicial_cop: 86000000000,
    apropiacion_definitiva_cop: 94000000000,
    cdp_acumulado_cop: 93500000000,
    compromisos_rp_cop: 89300000000,
    obligaciones_cop: 82000000000,
    pagos_tesoreria_cop: 76000000000,
    porcentaje_cdp: 99.5,
    porcentaje_rp: 95.0,
    porcentaje_giro: 80.9,
  },
];

export const CRUCE_TRIPARTITO_LECTURAS: CruceTripartitoLectura[] = [
  {
    id: "cruce-001",
    dependencia: "DISTRISEGURIDAD",
    codigo_pdd: "PDD24-L1-M02",
    meta_pdd_titulo: "Cámaras de seguridad conectadas y operativas en el CAD Distrital",
    codigo_pa: "PA-2026-DST-001",
    actividad_pa_descripcion: "Instalar y poner en marcha 250 nuevas cámaras analíticas en puntos críticos de Cartagena",
    codigo_bpim: "BPIM-2026-001",
    proyecto_bpim_nombre: "Fortalecimiento de la Plataforma de Videovigilancia y CAI",
    fuente_financiacion: "FONSET",
    avance_estrategico_pdd_pct: 82.0,
    avance_operativo_pa_pct: 80.0,
    ejecucion_financiera_rp_pct: 82.5,
    giro_pagos_pct: 64.2,
    brecha_fisico_financiera_pts: 2.5,
    indice_coherencia_tripartita: 96.5,
    estado_semaforo: "COHERENCIA_INTEGRAL_ALTA",
    hallazgo_forense:
      "Alineación ejemplar entre la meta estratégica cuatrienal, las entregas operativas T1-T2 y los compromisos presupuestales (RP 82.5% vs Físico 80.0%).",
    recomendacion_tecnica:
      "Mantener el cronograma de interventoría para asegurar el giro efectivo del 35.8% restante conforme a entregas de obra en T3 y T4.",
  },
  {
    id: "cruce-002",
    dependencia: "Secretaría del Interior",
    codigo_pdd: "PDD24-L1-M01",
    meta_pdd_titulo: "Dotación y adecuación de equipamientos de justicia y comisarías de familia",
    codigo_pa: "PA-2026-INT-004",
    actividad_pa_descripcion: "Readecuar 6 Casas de Justicia y Comisarías para atención de víctimas de violencia",
    codigo_bpim: "BPIM-2026-002",
    proyecto_bpim_nombre: "Mantenimiento y Adecuación Locativa de Equipamientos Comunitarios",
    fuente_financiacion: "ICLD",
    avance_estrategico_pdd_pct: 52.0,
    avance_operativo_pa_pct: 48.0,
    ejecucion_financiera_rp_pct: 94.0,
    giro_pagos_pct: 58.3,
    brecha_fisico_financiera_pts: 46.0,
    indice_coherencia_tripartita: 42.0,
    estado_semaforo: "DESFASE_CRITICO_SOBREEJECUCION",
    hallazgo_forense:
      "ALERTA ROJA: Sobreejecución financiera acelerada (RP al 94.0%) con apenas un 48.0% de avance físico verificado en el Plan de Acción (Brecha de +46.0 puntos).",
    recomendacion_tecnica:
      "Ordenar auditoría inmediata de actas de recibo parcial de obra y suspender pagos adicionales hasta nivelar el avance físico certificado.",
  },
  {
    id: "cruce-003",
    dependencia: "Secretaría del Interior",
    codigo_pdd: "PDD24-L1-M02",
    meta_pdd_titulo: "Frentes de seguridad comunitaria barriales dotados con alarmas",
    codigo_pa: "PA-2026-INT-008",
    actividad_pa_descripcion: "Capacitar e instalar pulsadores de alarma en 80 frentes de seguridad de barrios priorizados",
    codigo_bpim: "BPIM-2026-003",
    proyecto_bpim_nombre: "Dotación Tecnológica y Alarmas Comunitarias para Frentes de Seguridad",
    fuente_financiacion: "FONSET",
    avance_estrategico_pdd_pct: 60.0,
    avance_operativo_pa_pct: 65.0,
    ejecucion_financiera_rp_pct: 28.0,
    giro_pagos_pct: 18.8,
    brecha_fisico_financiera_pts: -37.0,
    indice_coherencia_tripartita: 55.0,
    estado_semaforo: "REZAGO_CONTRACTUAL_INVERSION",
    hallazgo_forense:
      "ALERTA AMARILLA: Cuello de botella en la contratación pública. El equipo comunitario ha ejecutado el 65.0% de capacitaciones pero la licitación de equipos solo tiene RP del 28.0%.",
    recomendacion_tecnica:
      "Urgir a la Dirección Administrativa de Contratación la agilización de la orden de compra en Colombia Compra Eficiente para no desmotivar a los frentes barriales.",
  },
  {
    id: "cruce-004",
    dependencia: "DISTRISEGURIDAD / INTERIOR",
    codigo_pdd: "PDD24-L1-M01",
    meta_pdd_titulo: "Reducción de la extorsión y delitos contra comerciantes y residentes",
    codigo_pa: "PA-2026-DST-009",
    actividad_pa_descripcion: "Coordinar mesas de seguridad con gremios y comerciantes del Centro Histórico y Bazurto",
    codigo_bpim: "BPIM-2026-004",
    proyecto_bpim_nombre: "Intervención de Puntos Críticos y Prevención Social del Hurto",
    fuente_financiacion: "RECURSOS_PROPIOS",
    avance_estrategico_pdd_pct: 35.0,
    avance_operativo_pa_pct: 32.0,
    ejecucion_financiera_rp_pct: 70.0,
    giro_pagos_pct: 45.0,
    brecha_fisico_financiera_pts: 38.0,
    indice_coherencia_tripartita: 48.0,
    estado_semaforo: "META_PDD_SUBOPERACIONALIZADA",
    hallazgo_forense:
      "ALERTA NARANJA: Meta estratégica prioritaria del PDD (Tasa de extorsión/hurto) suboperacionalizada con actividades puramente de gestión ('coordinar') sin entregas tangibles.",
    recomendacion_tecnica:
      "Reformular la actividad en el Plan de Acción hacia verbos fuertes DNP ('Instalar botones de pánico', 'Desplegar cuadrantes motorizados') y reasignar saldo presupuestal.",
  },
  {
    id: "cruce-005",
    dependencia: "Secretaría de Infraestructura",
    codigo_pdd: "PDD24-L3-M04",
    meta_pdd_titulo: "Malla vial urbana rehabilitada y conectividad de vías barriales",
    codigo_pa: "PA-2026-INF-001",
    actividad_pa_descripcion: "Pavimentar 35 km-carril de vías prioritarias en Olaya Herrera, Pozón y San Fernando",
    codigo_bpim: "BPIM-2026-005",
    proyecto_bpim_nombre: "Rehabilitación Prioritaria de la Malla Vial Urbana",
    fuente_financiacion: "CREDITO",
    avance_estrategico_pdd_pct: 74.0,
    avance_operativo_pa_pct: 78.0,
    ejecucion_financiera_rp_pct: 86.0,
    giro_pagos_pct: 62.7,
    brecha_fisico_financiera_pts: 8.0,
    indice_coherencia_tripartita: 91.0,
    estado_semaforo: "COHERENCIA_INTEGRAL_ALTA",
    hallazgo_forense:
      "Coherencia técnico-financiera adecuada dentro del margen de anticipos y retenciones de garantía de obra civil pública.",
    recomendacion_tecnica:
      "Monitorear ensayos de laboratorio de mezclas asfálticas antes de autorizar actas de entrega final en T3.",
  },
  {
    id: "cruce-006",
    dependencia: "Secretaría de Educación",
    codigo_pdd: "PDD24-L4-M05",
    meta_pdd_titulo: "Cobertura y continuidad del Programa de Alimentación Escolar (PAE)",
    codigo_pa: "PA-2026-EDU-002",
    actividad_pa_descripcion: "Entregar 106.000 raciones alimentarias diarias en 120 sedes educativas oficiales",
    codigo_bpim: "BPIM-2026-006",
    proyecto_bpim_nombre: "Suministro Oportuno del Programa PAE Oficial",
    fuente_financiacion: "SGP",
    avance_estrategico_pdd_pct: 89.0,
    avance_operativo_pa_pct: 92.0,
    ejecucion_financiera_rp_pct: 95.0,
    giro_pagos_pct: 80.9,
    brecha_fisico_financiera_pts: 3.0,
    indice_coherencia_tripartita: 98.0,
    estado_semaforo: "COHERENCIA_INTEGRAL_ALTA",
    hallazgo_forense:
      "Alta coherencia operativa y financiera. Entrega ininterrumpida de raciones verificada por veedurías ciudadanas y personería distrital.",
    recomendacion_tecnica:
      "Asegurar la vigencia futura para la licitación del PAE 2027 a partir del mes de octubre.",
  },
];

export const RESUMEN_CONSOLIDADO_TRIADA_CANONICO: ResumenConsolidadoTriada = {
  totales_presupuesto: {
    apropiacion_inicial_cop: 3450000000000,
    apropiacion_definitiva_cop: 3820000000000,
    cdp_acumulado_cop: 3310000000000,
    compromisos_rp_cop: 2980000000000,
    obligaciones_cop: 2450000000000,
    pagos_tesoreria_cop: 2180000000000,
    porcentaje_cdp_global: 86.6,
    porcentaje_rp_global: 78.0,
    porcentaje_pagos_global: 57.1,
  },
  totales_operativos: {
    total_dependencias: 23,
    total_archivos_transparencia: 23,
    total_actividades_plan_accion: 994,
    avance_fisico_promedio_pct: 79.4,
    cumplimiento_verbos_fuertes_dnp_pct: 88.6,
  },
  totales_estrategicos: {
    total_metas_cuatrienales_pdd: 312,
    avance_cuatrienal_promedio_pct: 72.8,
    cuatrienio_activo: "2024–2027 Cartagena Ciudad de Derechos",
  },
  distribucion_semaforo: {
    coherencia_alta: 3,
    desfase_sobreejecucion: 1,
    rezago_contractual: 1,
    meta_suboperacionalizada: 1,
  },
};
