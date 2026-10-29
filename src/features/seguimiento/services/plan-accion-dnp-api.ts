import { apiFetch } from "@/core/http/api-client";
import type { CompromisoInstitucional } from "../models/compromiso";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

export type TipoMetaDNP = "META_PRODUCTO" | "META_GESTION" | "ACTIVIDAD";
export type TipoActividadDNP = "NORMATIVA" | "ADMINISTRATIVA" | "DE_GESTION" | "LOGISTICA";
export type CategoriaRecursosDNP = "INVERSION" | "FUNCIONAMIENTO" | "RECURSOS_GESTION";
export type FuenteFinanciacionDNP =
  | "RECURSOS_PROPIOS"
  | "SGP"
  | "REGALIAS"
  | "CREDITO"
  | "COFINANCIACION"
  | "GASTOS_PERSONAL"
  | "GASTOS_GENERALES"
  | "TRANSFERENCIAS"
  | "GESTION_NO_PRESUPUESTAL";

export type EstadoAprobacionDNP =
  | "EN_ELABORACION"
  | "REVISION_PLANEACION"
  | "APROBADO_CONSEJO_GOBIERNO"
  | "PUBLICADO_LEY_1474";

export interface ActividadPlanAccion {
  id: string;
  codigo: string;
  vigencia: number;
  compromiso_pas_codigo: string;
  linea_estrategica_codigo: string;
  programa_nombre: string;
  entidad_responsable: string;
  lider_responsable: string;
  dependencias_articuladas: string[];
  tipo_meta: TipoMetaDNP;
  meta_producto_vigencia: string;
  meta_valor_vigencia: number;
  unidad_medida: string;
  codigo_bpim: string;
  proyecto_nombre: string;
  objetivo_proyecto: string;
  tipo_actividad: TipoActividadDNP;
  descripcion_actividad: string;
  verbo_infinitivo: string;
  fecha_inicio: string;
  fecha_terminacion: string;
  periodicidad_seguimiento: string;
  avance_t1: number;
  avance_t2: number;
  avance_t3: number;
  avance_t4: number;
  porcentaje_avance_fisico: number;
  categoria_recursos: CategoriaRecursosDNP;
  fuente_financiacion: FuenteFinanciacionDNP;
  monto_programado_cop: number;
  monto_ejecutado_cop: number;
  estado_aprobacion: EstadoAprobacionDNP;
  evidencia_soporte?: string | null;
  metadatos?: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ResumenEjecutivoPlanAccion {
  total_actividades: number;
  total_metas_producto: number;
  total_metas_gestion: number;
  total_actividades_tipo: number;
  avance_fisico_promedio: number;
  presupuesto_total_programado_cop: number;
  presupuesto_total_ejecutado_cop: number;
  porcentaje_ejecucion_financiera: number;
  desglose_fuentes: Record<string, { programado: number; ejecutado: number }>;
  desglose_tipo_actividad: Record<string, number>;
  semaforo_alertas: {
    en_meta: number;
    alerta_preventiva: number;
    rezago_critico: number;
  };
}

export interface MatrizPlanAccionRespuesta {
  resumen_ejecutivo: ResumenEjecutivoPlanAccion;
  hoja_1_plan_accion: ActividadPlanAccion[];
  hoja_2_plan_indicativo: CompromisoInstitucional[];
  esContingencia?: boolean;
}

export interface ValidarRedaccionRespuesta {
  es_valida: boolean;
  verbo_detectado: string;
  es_infinitivo: boolean;
  es_verbo_debil_prohibido: boolean;
  mensaje_dnp: string;
  verbos_fuertes_sugeridos: string[];
}

export interface BancoConocimientoDNP {
  marco_normativo: Array<{
    norma: string;
    titulo: string;
    descripcion: string;
    obligatoriedad: string;
  }>;
  encadenamiento_instrumentos: Array<{
    instrumento: string;
    etapa: string;
    actividad_dnp: string;
    producto_dnp: string;
  }>;
  ruta_metodologica_7_pasos: Array<{
    paso: number;
    nombre: string;
    responsable: string;
    descripcion: string;
  }>;
  pasos_diligenciamiento_matriz: Array<{
    numero: string;
    nombre: string;
    campos: string[];
    guia: string;
  }>;
  taxonomia_metas: Array<{
    tipo: string;
    nombre: string;
    definicion: string;
    ejemplo: string;
  }>;
  taxonomia_actividades: Array<{
    tipo: string;
    nombre: string;
    descripcion: string;
    ejemplos_verbos: string[];
  }>;
  regla_linguistica_dnp: {
    fundamento: string;
    regla_oro: string;
    verbos_debiles_prohibidos: string[];
    motivo_prohibicion: string;
    catalogo_verbos_fuertes: Record<string, string[]>;
  };
  catalogo_fuentes_financiacion: Record<
    string,
    Array<{ codigo: string; nombre: string }>
  >;
  enlaces_oficiales: Array<{ titulo: string; url: string }>;
  modulos_mga_estructuracion?: ModuloMGAEstructuracion[];
  cadena_valor_proyecto_mga?: EslabonCadenaValorMGA[];
  criterios_evaluacion_ex_ante?: CriterioEvaluacionExAnteMGA[];
  plantillas_proyectos_seguridad_humana?: PlantillaProyectoMGA[];
}

export interface SubetapaMGA {
  nombre: string;
  descripcion: string;
  entregable_clave: string;
}

export interface ModuloMGAEstructuracion {
  numero: number;
  nombre: string;
  titulo_corto: string;
  objetivo_modulo: string;
  subetapas: SubetapaMGA[];
  entregables_obligatorios: string[];
  regla_oro_dnp: string;
  errores_comunes_rechazo: string[];
}

export interface EslabonCadenaValorMGA {
  eslabon: "INSUMOS" | "ACTIVIDADES" | "PRODUCTOS" | "RESULTADOS" | "IMPACTOS";
  orden: number;
  nombre: string;
  definicion_dnp: string;
  regla_formulacion: string;
  ejemplo_cartagena: string;
  unidad_o_indicador_ejemplo: string;
}

export interface CriterioEvaluacionExAnteMGA {
  criterio: string;
  sigla: string;
  formula_o_metodologia: string;
  tasa_o_umbral_referencia: string;
  cuando_utilizar: string;
  interpretacion_viabilidad: string;
}

export interface PlantillaProyectoMGA {
  codigo_bpim_proyectado: string;
  sector_mga: string;
  programa_pdd: string;
  entidad_responsable: string;
  problema_central: string;
  objetivo_general: string;
  producto_mga_catalogo: string;
  indicador_producto: string;
  meta_cuatrienio: string;
  actividades_clave: string[];
  metodologia_evaluacion: string;
  costo_total_estimado_cop: number;
  fuentes_financiacion: string[];
}

export interface ItemLotePlanAccion {
  codigo?: string;
  entidad_responsable: string;
  lider_responsable?: string;
  tipo_meta: TipoMetaDNP;
  compromiso_pas_codigo?: string;
  codigo_bpim?: string;
  proyecto_nombre?: string;
  objetivo_proyecto?: string;
  tipo_actividad: TipoActividadDNP;
  descripcion_actividad: string;
  fecha_inicio?: string;
  fecha_terminacion?: string;
  avance_t1?: number;
  avance_t2?: number;
  avance_t3?: number;
  avance_t4?: number;
  categoria_recursos: CategoriaRecursosDNP;
  fuente_financiacion: FuenteFinanciacionDNP;
  monto_programado_cop: number;
  monto_ejecutado_cop?: number;
}

export interface ProcesarLotePlanAccionSolicitud {
  vigencia?: number;
  items?: ItemLotePlanAccion[];
  filas?: ItemLotePlanAccion[];
}

export interface FilaProcesadaPlanAccion {
  codigo: string;
  entidad_responsable: string;
  lider_responsable: string;
  tipo_meta: string;
  compromiso_pas_codigo: string | null;
  columna_d_programa: string | null;
  columna_e_meta_producto: string | null;
  codigo_bpim: string;
  proyecto_nombre: string;
  objetivo_proyecto: string;
  tipo_actividad: string;
  descripcion_actividad: string;
  verbo_detectado: string;
  es_verbo_fuerte: boolean;
  redaccion_corregida_sugerida: string | null;
  fecha_inicio: string;
  fecha_terminacion: string;
  avance_t1: number;
  avance_t2: number;
  avance_t3: number;
  avance_t4: number;
  avance_fisico: number;
  categoria_recursos: string;
  fuente_financiacion: string;
  fuente_coherente: boolean;
  monto_programado_cop: number;
  monto_ejecutado_cop: number;
  ejecucion_financiera: number;
  alerta_desfase: boolean;
  es_conforme: boolean;
  hallazgos: string[];
}

export interface ProcesarLotePlanAccionRespuesta {
  vigencia: number;
  total_filas_procesadas: number;
  filas_conformes_dnp: number;
  filas_con_observaciones: number;
  puntaje_calidad_dnp: number;
  estado_dictamen_planeacion: "APTO_CONSEJO_GOBIERNO" | "REQUIERE_SUBSANACION_PREVIA";
  monto_total_programado_cop: number;
  monto_total_ejecutado_cop: number;
  porcentaje_ejecucion_global: number;
  filas_procesadas: FilaProcesadaPlanAccion[];
  esContingencia?: boolean;
}

export interface FiltrosMatrizPlanAccion {
  vigencia?: number;
  entidad?: string;
  compromiso_pas_codigo?: string;
  linea_codigo?: string;
  tipo_meta?: string;
  tipo_actividad?: string;
  categoria_recursos?: string;
  fuente_financiacion?: string;
  busqueda?: string;
}

// =============================================================================
// CATÁLOGO CANÓNICO DE 12 ACTIVIDADES Y BANCO DE CONOCIMIENTO (FALLBACK)
// =============================================================================

export const VERBOS_DEBILES_PROHIBIDOS_DNP = [
  "apropiar",
  "asegurar",
  "colaborar",
  "consolidar",
  "contribuir",
  "desarrollar",
  "integrar",
  "fomentar",
  "fortalecer",
  "garantizar",
  "implementar",
  "impulsar",
  "mejorar",
  "movilizar",
  "proponer",
  "promover",
];

export const SUGERENCIAS_VERBOS_FUERTES: Record<string, string[]> = {
  NORMATIVA: ["Adecuar", "Modificar", "Fijar", "Adoptar", "Eliminar", "Expedir", "Reglamentar", "Derogar"],
  ADMINISTRATIVA: ["Firmar", "Diseñar", "Ajustar", "Analizar", "Verificar", "Suscribir", "Tramitar", "Auditar"],
  DE_GESTION: ["Crear", "Identificar", "Expedir", "Ejecutar", "Concertar", "Gestionar", "Asignar", "Convocar"],
  LOGISTICA: ["Notificar", "Colocar", "Verificar", "Instalar", "Dotar", "Distribuir", "Adecuar", "Suministrar"],
};

export const ACTIVIDADES_PA_CANONICAS: ActividadPlanAccion[] = [
  {
    id: "01927360-0001-7000-8000-000000000001",
    codigo: "PA-2026-L01-01",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-SEC-01",
    linea_estrategica_codigo: "LE-01",
    programa_nombre: "Prevención de ESCNNA y Protección Integral de Niñez",
    entidad_responsable: "Distriseguridad",
    lider_responsable: "Director Técnico de Distriseguridad",
    dependencias_articuladas: ["Secretaría del Interior", "Policía de Infancia y Adolescencia", "ICBF"],
    tipo_meta: "META_PRODUCTO",
    meta_producto_vigencia: "Ruta interinstitucional de detección y protección contra ESCNNA adoptada y operativa en 5 zonas turísticas",
    meta_valor_vigencia: 1,
    unidad_medida: "Ruta interinstitucional",
    codigo_bpim: "2026130010001",
    proyecto_nombre: "Fortalecimiento de la Red de Protección contra ESCNNA en Zonas Turísticas y Periféricas",
    objetivo_proyecto: "Articular las capacidades distritales y de fuerza pública para la detección oportuna de vulneraciones a NNA en entornos turísticos.",
    tipo_actividad: "NORMATIVA",
    descripcion_actividad: "Expedir el protocolo distrital unificado de atención inmediata y judicialización por alertas de ESCNNA en establecimientos turísticos y hoteleros.",
    verbo_infinitivo: "expedir",
    fecha_inicio: "2026-01-15",
    fecha_terminacion: "2026-06-30",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 75,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 87.5,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "SGP",
    monto_programado_cop: 450000000,
    monto_ejecutado_cop: 380000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Decreto Distrital 0412 de 2026 y Actas de concertación turística publicadas en gaceta.",
  },
  {
    id: "01927360-0002-7000-8000-000000000002",
    codigo: "PA-2026-L01-02",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-SEG-03",
    linea_estrategica_codigo: "LE-01",
    programa_nombre: "Modernización Tecnológica de la Seguridad Ciudadana",
    entidad_responsable: "Distriseguridad",
    lider_responsable: "Coordinador de Telemática y Sistemas LPR",
    dependencias_articuladas: ["Policía Metropolitana de Cartagena", "Secretaría General"],
    tipo_meta: "META_PRODUCTO",
    meta_producto_vigencia: "250 cámaras de videovigilancia y lectura LPR enlazadas al CAD MECAR",
    meta_valor_vigencia: 250,
    unidad_medida: "Cámaras operativas",
    codigo_bpim: "2026130010002",
    proyecto_nombre: "Modernización del Sistema de Videovigilancia LPR, Alarmas Comunitarias y Conectividad Policial Inteligente",
    objetivo_proyecto: "Optimizar la cobertura y tiempo de respuesta ante delitos de alto impacto mediante analítica de placas vehiculares y videovigilancia en tiempo real.",
    tipo_actividad: "LOGISTICA",
    descripcion_actividad: "Instalar 85 nuevos puntos de captura con cámaras analíticas LPR y fibra óptica en los corredores viales Pedro de Heredia y Crisanto Luque.",
    verbo_infinitivo: "instalar",
    fecha_inicio: "2026-02-01",
    fecha_terminacion: "2026-11-30",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 80,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 90,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "REGALIAS",
    monto_programado_cop: 2800000000,
    monto_ejecutado_cop: 2240000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Actas de entrega técnica de obra civil y enlaces IP activos al CAD de Manga.",
  },
  {
    id: "01927360-0003-7000-8000-000000000003",
    codigo: "PA-2026-L01-03",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-ALUM-04",
    linea_estrategica_codigo: "LE-01",
    programa_nombre: "Entornos Viales Seguros y Alumbrado Eficiente",
    entidad_responsable: "Secretaría General (Alumbrado Público)",
    lider_responsable: "Director de Servicios Públicos y Concesiones",
    dependencias_articuladas: ["Distriseguridad", "Alcaldías Locales 1, 2 y 3"],
    tipo_meta: "ACTIVIDAD",
    meta_producto_vigencia: "4.800 luminarias LED instaladas en puntos oscuros de alto tránsito peatonal",
    meta_valor_vigencia: 4800,
    unidad_medida: "Luminarias sustituidas",
    codigo_bpim: "2026130010003",
    proyecto_nombre: "Modernización del Parque Lumínico y Erradicación de Puntos Oscuros de Miedo",
    objetivo_proyecto: "Incrementar la percepción de seguridad ciudadana nocturna en paraderos, colegios y parques barriales.",
    tipo_actividad: "LOGISTICA",
    descripcion_actividad: "Colocar 1.200 luminarias LED de 150W en senderos escolares y paraderos del SITM en Localidades 2 de la Virgen y Turística y 3 Industrial y de la Bahía.",
    verbo_infinitivo: "colocar",
    fecha_inicio: "2026-03-01",
    fecha_terminacion: "2026-10-31",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 60,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 80,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "RECURSOS_PROPIOS",
    monto_programado_cop: 1950000000,
    monto_ejecutado_cop: 1460000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Bitácoras de instalación de la cuadrilla técnica y actas de interventoría bimestral.",
  },
  {
    id: "01927360-0004-7000-8000-000000000004",
    codigo: "PA-2026-L01-04",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-POL-06",
    linea_estrategica_codigo: "LE-01",
    programa_nombre: "Seguridad y Convivencia Ciudadana en Territorio",
    entidad_responsable: "Policía Metropolitana de Cartagena (MECAR)",
    lider_responsable: "Comandante de Policía Comunitaria y Frentes de Seguridad",
    dependencias_articuladas: ["Secretaría del Interior", "Distriseguridad", "Juntas de Acción Comunal"],
    tipo_meta: "META_GESTION",
    meta_producto_vigencia: "60 frentes de seguridad ciudadana activos con botones de pánico y comités barriales",
    meta_valor_vigencia: 60,
    unidad_medida: "Frentes certificados",
    codigo_bpim: "2026130010004",
    proyecto_nombre: "Fortalecimiento Operativo y Dotación a 60 Frentes Locales de Seguridad",
    objetivo_proyecto: "Afianzar la corresponsabilidad comunitaria e interconexión vecinal con los cuadrantes de policía.",
    tipo_actividad: "ADMINISTRATIVA",
    descripcion_actividad: "Verificar el estado operacional de los sistemas de radiocomunicación y alarmas vecinales en 60 frentes locales de seguridad activa.",
    verbo_infinitivo: "verificar",
    fecha_inicio: "2026-01-10",
    fecha_terminacion: "2026-12-15",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 70,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 85,
    categoria_recursos: "FUNCIONAMIENTO",
    fuente_financiacion: "GASTOS_GENERALES",
    monto_programado_cop: 320000000,
    monto_ejecutado_cop: 256000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Informes técnicos de inspección policial de cuadrantes y actas suscritas con JAC.",
  },
  {
    id: "01927360-0005-7000-8000-000000000005",
    codigo: "PA-2026-L02-01",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-JUV-02",
    linea_estrategica_codigo: "LE-02",
    programa_nombre: "Convivencia Comunitaria y Transformación de Fronteras Invisibles",
    entidad_responsable: "Secretaría de Participación y Desarrollo Social",
    lider_responsable: "Coordinador de Juventudes y Convivencia",
    dependencias_articuladas: ["SENA Seccional Bolívar", "Secretaría de Educación", "Secretaría del Interior"],
    tipo_meta: "META_PRODUCTO",
    meta_producto_vigencia: "500 jóvenes en riesgo formados e insertados en encadenamientos productivos y náuticos",
    meta_valor_vigencia: 500,
    unidad_medida: "Jóvenes vinculados",
    codigo_bpim: "2026130010005",
    proyecto_nombre: "Programa Integral de Oportunidades Laborales y Formación Técnico-Laboral para Jóvenes en Riesgo",
    objetivo_proyecto: "Romper el ciclo de vinculación juvenil a bandas y líneas de microtráfico mediante formación laboral pertinente.",
    tipo_actividad: "ADMINISTRATIVA",
    descripcion_actividad: "Diseñar la malla curricular técnica en oficios portuarios, náuticos y logística turística articulada al SENA para jóvenes de Olaya Herrera y El Pozón.",
    verbo_infinitivo: "diseñar",
    fecha_inicio: "2026-02-15",
    fecha_terminacion: "2026-07-31",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 85,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 92.5,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "COFINANCIACION",
    monto_programado_cop: 1100000000,
    monto_ejecutado_cop: 935000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Convenio Tripartito de Cooperación No. 018-2026 SENA-Distrito y resolución de planes de estudio.",
  },
  {
    id: "01927360-0006-7000-8000-000000000006",
    codigo: "PA-2026-L02-02",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-DES-08",
    linea_estrategica_codigo: "LE-02",
    programa_nombre: "Mediación Comunitaria y Desarme Social",
    entidad_responsable: "Secretaría del Interior y Convivencia Ciudadana",
    lider_responsable: "Director de Seguridad y Convivencia",
    dependencias_articuladas: ["Personería Distrital", "MECAR", "Líderes Barriales de Paz"],
    tipo_meta: "META_GESTION",
    meta_producto_vigencia: "12 comités barriales de mediación y resolución de conflictos instalados y activos",
    meta_valor_vigencia: 12,
    unidad_medida: "Comités constituidos",
    codigo_bpim: "2026130010006",
    proyecto_nombre: "Programa Integral de Desarme Social, Oportunidades y Mediación Comunitaria Jóvenes Constructores de Paz",
    objetivo_proyecto: "Desactivar riñas colectivas juveniles y líneas de frontera invisible en barrios con altos índices de homicidio.",
    tipo_actividad: "DE_GESTION",
    descripcion_actividad: "Ejecutar 48 jornadas territoriales de diálogo y mediación comunitaria para desarme voluntario en sectores focalizados de la Ciénaga de la Virgen.",
    verbo_infinitivo: "ejecutar",
    fecha_inicio: "2026-01-20",
    fecha_terminacion: "2026-11-30",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 70,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 85,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "RECURSOS_PROPIOS",
    monto_programado_cop: 850000000,
    monto_ejecutado_cop: 680000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Pactos barriales de no agresión firmados y actas de desescalamiento con custodia personería.",
  },
  {
    id: "01927360-0007-7000-8000-000000000007",
    codigo: "PA-2026-L03-01",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-AMB-05",
    linea_estrategica_codigo: "LE-03",
    programa_nombre: "Seguridad Ambiental y Resiliencia en la Ciénaga de la Virgen",
    entidad_responsable: "Establecimiento Público Ambiental (EPA Cartagena)",
    lider_responsable: "Subdirector Técnico de Gestión Ambiental",
    dependencias_articuladas: ["Cardique", "Secretaría de Infraestructura", "Aguas de Cartagena"],
    tipo_meta: "META_PRODUCTO",
    meta_producto_vigencia: "18 kilómetros lineales de canales y drenajes pluviales recuperados y reforestados con mangle",
    meta_valor_vigencia: 18,
    unidad_medida: "Kilómetros intervenidos",
    codigo_bpim: "2026130010007",
    proyecto_nombre: "Plan de Restauración Ecoterritorial, Borde de Protección y Drenajes en la Ciénaga de la Virgen",
    objetivo_proyecto: "Mitigar inundaciones crónicas y mitigar focos de insalubridad y violencia en bordes de ciénaga.",
    tipo_actividad: "NORMATIVA",
    descripcion_actividad: "Adecuar la reglamentación distrital de rondas hídricas y delimitación de bordes de protección de la Ciénaga de la Virgen para prohibir rellenos ilegales.",
    verbo_infinitivo: "adecuar",
    fecha_inicio: "2026-02-01",
    fecha_terminacion: "2026-08-31",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 90,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 95,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "SGP",
    monto_programado_cop: 720000000,
    monto_ejecutado_cop: 648000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Resolución conjunta EPA-Cardique 0314 de 2026 y cartografía oficial de borde de protección.",
  },
  {
    id: "01927360-0008-7000-8000-000000000008",
    codigo: "PA-2026-L03-02",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-BAZ-09",
    linea_estrategica_codigo: "LE-03",
    programa_nombre: "Seguridad Económica e Inclusión Productiva en Bazurto",
    entidad_responsable: "Secretaría de Hacienda Distrital",
    lider_responsable: "Director de Desarrollo Económico y Financiamiento Popular",
    dependencias_articuladas: ["Gerencia de Espacio Público", "Banco Agrario / Findeter", "Asociaciones de Comerciantes de Bazurto"],
    tipo_meta: "META_PRODUCTO",
    meta_producto_vigencia: "800 comerciantes informales beneficiados con microcréditos a tasa subsidiada",
    meta_valor_vigencia: 800,
    unidad_medida: "Comerciantes bancarizados",
    codigo_bpim: "2026130010008",
    proyecto_nombre: "Fondo de Financiamiento Popular y Microcrédito Comunitario contra el Gota a Gota en el Mercado de Bazurto",
    objetivo_proyecto: "Sustituir el préstamo extorsivo gota a gota y erradicar las estructuras de extorsión armada en el mercado central.",
    tipo_actividad: "DE_GESTION",
    descripcion_actividad: "Crear el fondo rotatorio de fomento microempresarial y créditos productivos comunitarios con tasa compensada para comerciantes de perecederos.",
    verbo_infinitivo: "crear",
    fecha_inicio: "2026-03-01",
    fecha_terminacion: "2026-09-30",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 75,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 87.5,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "REGALIAS",
    monto_programado_cop: 3200000000,
    monto_ejecutado_cop: 2400000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Acuerdo Distrital de creación de la cuenta especial y convenio fiduciario de administración.",
  },
  {
    id: "01927360-0009-7000-8000-000000000009",
    codigo: "PA-2026-L04-01",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-CUID-07",
    linea_estrategica_codigo: "LE-04",
    programa_nombre: "Seguridad Económica y Sistema del Cuidado",
    entidad_responsable: "Secretaría de Participación y Desarrollo Social",
    lider_responsable: "Coordinadora Distrital del Sistema de Cuidado",
    dependencias_articuladas: ["Secretaría de la Mujer", "Secretaría de Salud Distrital", "IDER"],
    tipo_meta: "META_PRODUCTO",
    meta_producto_vigencia: "2 Manzanas del Cuidado y Centros de Vida dotados y brindando servicios integrales de respiro y relevo",
    meta_valor_vigencia: 2,
    unidad_medida: "Manzanas del cuidado operativas",
    codigo_bpim: "2026130010009",
    proyecto_nombre: "Red Distrital de Manzanas del Cuidado y Centros de Día Comunitarios para Mujeres Cuidadoras",
    objetivo_proyecto: "Reducir la sobrecarga de cuidados no remunerados que perpetúa la feminización de la pobreza en sectores vulnerables.",
    tipo_actividad: "NORMATIVA",
    descripcion_actividad: "Adoptar el modelo de operación intersectorial y canasta básica de servicios de respiro, lavandería comunitaria y formación para las Manzanas del Cuidado.",
    verbo_infinitivo: "adoptar",
    fecha_inicio: "2026-01-15",
    fecha_terminacion: "2026-06-30",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 80,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 90,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "RECURSOS_PROPIOS",
    monto_programado_cop: 1800000000,
    monto_ejecutado_cop: 1350000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Decreto Distrital 0285 de 2026 de adopción del Modelo de Cuidado y Manual de Operaciones.",
  },
  {
    id: "01927360-0010-7000-8000-000000000010",
    codigo: "PA-2026-L04-02",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-ETN-10",
    linea_estrategica_codigo: "LE-04",
    programa_nombre: "Soberanía y Salvaguarda Étnica con Consejos Comunitarios",
    entidad_responsable: "Dirección de Asuntos Étnicos",
    lider_responsable: "Director de Asuntos Étnicos y Afrodescendientes",
    dependencias_articuladas: ["Ministerio del Interior", "Consejos Comunitarios de Comunidades Negras", "Agencia Nacional de Tierras"],
    tipo_meta: "ACTIVIDAD",
    meta_producto_vigencia: "8 acuerdos de salvaguarda étnica y fortalecimiento de gobiernos propios comunitarios suscritos",
    meta_valor_vigencia: 8,
    unidad_medida: "Acuerdos suscritos",
    codigo_bpim: "2026130010010",
    proyecto_nombre: "Plan de Fortalecimiento Institucional y Seguridad Alimentaria para Consejos Comunitarios de Comunidades Negras",
    objetivo_proyecto: "Garantizar la estabilidad jurídica, autonomía comunitaria y soberanía territorial en zonas rurales e insulares.",
    tipo_actividad: "ADMINISTRATIVA",
    descripcion_actividad: "Firmar acuerdos de articulación administrativa y co-gestión de proyectos productivos agropecuarios con 8 consejos comunitarios de La Boquilla, Pasacaballos y Tierrabomba.",
    verbo_infinitivo: "firmar",
    fecha_inicio: "2026-02-01",
    fecha_terminacion: "2026-10-31",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 75,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 87.5,
    categoria_recursos: "RECURSOS_GESTION",
    fuente_financiacion: "GESTION_NO_PRESUPUESTAL",
    monto_programado_cop: 0,
    monto_ejecutado_cop: 0,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Actas de asamblea general comunitaria y protocolos de relacionamiento bilateral registrados ante MinInterior.",
  },
  {
    id: "01927360-0011-7000-8000-000000000011",
    codigo: "PA-2026-L05-01",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-BAZ-09",
    linea_estrategica_codigo: "LE-05",
    programa_nombre: "Soberanía Alimentaria, Nutrición Comunitaria y Circuitos Cortos",
    entidad_responsable: "Secretaría de Participación y Desarrollo Social",
    lider_responsable: "Líder del Programa de Soberanía Alimentaria",
    dependencias_articuladas: ["Secretaría de Agricultura de Bolívar", "UMATA Distrital", "Red de Comedores Comunitarios"],
    tipo_meta: "META_GESTION",
    meta_producto_vigencia: "35 comedores comunitarios abastecidos mediante compras públicas directas a campesinos locales",
    meta_valor_vigencia: 35,
    unidad_medida: "Comedores abastecidos",
    codigo_bpim: "2026130010011",
    proyecto_nombre: "Fomento de Circuitos Cortos de Abastecimiento Alimentario y Seguridad Nutricional Barrial",
    objetivo_proyecto: "Vincular directamente la producción campesina periurbana con la canasta nutricional comunitaria sin intermediación abusiva.",
    tipo_actividad: "DE_GESTION",
    descripcion_actividad: "Identificar 120 productores campesinos y pescadores artesanales locales para el suministro directo de alimentos a los centros de desarrollo infantil y comedores.",
    verbo_infinitivo: "identificar",
    fecha_inicio: "2026-01-25",
    fecha_terminacion: "2026-07-15",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 80,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 90,
    categoria_recursos: "INVERSION",
    fuente_financiacion: "SGP",
    monto_programado_cop: 650000000,
    monto_ejecutado_cop: 520000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Directorio pericial de campesinos y pescadores inscritos en el registro distrital de compras públicas.",
  },
  {
    id: "01927360-0012-7000-8000-000000000012",
    codigo: "PA-2026-L06-01",
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-DES-08",
    linea_estrategica_codigo: "LE-06",
    programa_nombre: "Atención Primaria, Salud Mental Barrial y Reducción del Daño",
    entidad_responsable: "Departamento Administrativo Distrital de Salud (DADIS)",
    lider_responsable: "Coordinador de Salud Mental y Prevención de Consumo",
    dependencias_articuladas: ["ESE Hospital Local Cartagena de Indias", "Secretaría del Interior", "Líderes de Salud Barrial"],
    tipo_meta: "ACTIVIDAD",
    meta_producto_vigencia: "10 Zonas de Escucha y Acompañamiento Comunitario (ZEAC) en salud mental y reducción del daño operando",
    meta_valor_vigencia: 10,
    unidad_medida: "Zonas ZEAC activas",
    codigo_bpim: "2026130010012",
    proyecto_nombre: "Red de Atención Primaria en Salud Mental Comunitaria y Desescalamiento Psicosocial",
    objetivo_proyecto: "Prevenir trastornos depresivos, desajustes psicosociales y consumos problemáticos de sustancias en barrios con mayor exposición a violencia.",
    tipo_actividad: "LOGISTICA",
    descripcion_actividad: "Notificar formalmente a 24 centros de salud de primer nivel y colegios públicos sobre la ruta barrial de primeros auxilios psicológicos y telemedicina mental.",
    verbo_infinitivo: "notificar",
    fecha_inicio: "2026-02-10",
    fecha_terminacion: "2026-06-30",
    periodicidad_seguimiento: "TRIMESTRAL",
    avance_t1: 100,
    avance_t2: 95,
    avance_t3: 0,
    avance_t4: 0,
    porcentaje_avance_fisico: 97.5,
    categoria_recursos: "FUNCIONAMIENTO",
    fuente_financiacion: "GASTOS_GENERALES",
    monto_programado_cop: 280000000,
    monto_ejecutado_cop: 260000000,
    estado_aprobacion: "PUBLICADO_LEY_1474",
    evidencia_soporte: "Circulares informativas radicadas con acuse de recibo en la totalidad de centros asistenciales.",
  },
];

export const ACTIVIDADES_PLAN_ACCION_CANONICAS = ACTIVIDADES_PA_CANONICAS;

export const BANCO_CONOCIMIENTO_CANONICO: BancoConocimientoDNP = {
  marco_normativo: [
    {
      norma: "Ley 152 de 1994, Art. 41",
      titulo: "Elaboración y Aprobación del Plan de Acción",
      descripcion:
        "Con base en los planes generales aprobados por el Concejo, cada secretaría y departamento administrativo preparará, con la coordinación de la Oficina de Planeación, su correspondiente Plan de Acción y lo someterá a la aprobación del Consejo de Gobierno distrital.",
      obligatoriedad: "Obligatorio para todas las dependencias del Distrito.",
    },
    {
      norma: "Ley 152 de 1994, Art. 29",
      titulo: "Articulación Plan Indicativo (PI) y Planes de Acción (PA)",
      descripcion:
        "Articulación vinculante entre el Plan Indicativo cuatrienal del Plan de Desarrollo y los Planes de Acción anuales como instrumento base para la evaluación de resultados y gestión pública territorial.",
      obligatoriedad: "Marco de evaluación del cuatrienio distrital.",
    },
    {
      norma: "Ley 1474 de 2011, Art. 74",
      titulo: "Estatuto Anticorrupción - Publicación Oficial a 31 de Enero",
      descripcion:
        "Todas las entidades del Estado, a más tardar el 31 de enero de cada año, deberán publicar en su página web el Plan de Acción para la vigencia (objetivos, estrategias, proyectos, metas, responsables, distribución presupuestal) y el informe de gestión del año anterior.",
      obligatoriedad: "Fecha límite improrrogable: 31 de enero de cada vigencia fiscal.",
    },
    {
      norma: "Decreto 2482 de 2012 / MIPG",
      titulo: "Integración del Modelo de Planeación y Gestión",
      descripcion:
        "Adopción del Modelo Integrado de Planeación y Gestión (MIPG) articulando los instrumentos de planeación operativa y financiera en una sola matriz unificada por dependencia.",
      obligatoriedad: "Estándar de gestión de calidad pública territorial.",
    },
  ],
  encadenamiento_instrumentos: [
    {
      instrumento: "PDT y Plan Indicativo (PI)",
      etapa: "Insumo Estratégico",
      actividad_dnp: "Identificación de metas de producto y de gestión incorporadas en el Plan de Desarrollo.",
      producto_dnp: "Metas de gestión y de producto de la vigencia sujetas a seguimiento en el Plan de Acción.",
    },
    {
      instrumento: "POAI (Plan Operativo Anual de Inversiones)",
      etapa: "Insumo Operativo de Inversión",
      actividad_dnp: "Articulación de actividades requeridas con cada proyecto de inversión de la vigencia.",
      producto_dnp: "Actividades necesarias con indicadores, recursos, fecha de inicio y terminación.",
    },
    {
      instrumento: "MFMP (Marco Fiscal de Mediano Plazo)",
      etapa: "Insumo de Consistencia Fiscal",
      actividad_dnp: "Definición de la cuota global de inversión para la vigencia fiscal (Hacienda y Planeación).",
      producto_dnp: "Cuota global de inversión distribuida entre sectores conforme a la capacidad de pago distrital.",
    },
    {
      instrumento: "Presupuesto Anual y PAC",
      etapa: "Insumo Presupuestal y Flujo de Caja",
      actividad_dnp: "Definición de recursos destinados a inversión y funcionamiento y cronograma mensualizado de caja.",
      producto_dnp: "Disponibilidad cierta de recursos financieros para financiar las actividades del Plan de Acción.",
    },
  ],
  ruta_metodologica_7_pasos: [
    {
      paso: 1,
      nombre: "Orientaciones Metodológicas y Competencias",
      responsable: "Oficina de Planeación Distrital y Secretarías",
      descripcion: "Planeación imparte lineamientos, cronograma y formatos a los enlaces designados por dependencia, revisando misión y competencias.",
    },
    {
      paso: 2,
      nombre: "Consolidación y Revisión de Insumos",
      responsable: "Enlaces de Planeación por Dependencia",
      descripcion: "Consolidación de metas de producto del PI, proyectos POAI, cuota MFMP y asignaciones presupuestales aprobadas.",
    },
    {
      paso: 3,
      nombre: "Incorporación de Metas de Gestión y Administrativas",
      responsable: "Secretarías y Dependencias Ejecutoras",
      descripcion: "Identificación de metas recurrentes, procesos internos clave y gestión de recursos externos/nacionales que requieran seguimiento.",
    },
    {
      paso: 4,
      nombre: "Programación de Actividades y Articulación Interinstitucional",
      responsable: "Dependencias Ejecutoras y Co-responsables",
      descripcion: "Definición de actividades indispensables por meta de producto/proyecto, identificando corresponsabilidad interinstitucional entre dependencias.",
    },
    {
      paso: 5,
      nombre: "Diligenciamiento de la Matriz Oficial (Hoja 1 y Hoja 2)",
      responsable: "Líderes de Formulación por Secretaría",
      descripcion: "Llenado técnico de la Matriz del Plan de Acción (Hoja 1 PA vinculada a Hoja 2 Plan Indicativo) con validación de verbos fuertes y fuentes.",
    },
    {
      paso: 6,
      nombre: "Presentación y Aprobación en Consejo de Gobierno",
      responsable: "Alcalde Mayor, Secretario de Planeación y Gabinete",
      descripcion: "Sometimiento formal de los Planes de Acción consolidados a la aprobación del Consejo de Gobierno distrital (Art. 41 Ley 152/94).",
    },
    {
      paso: 7,
      nombre: "Publicación Oficial a más tardar el 31 de Enero",
      responsable: "Oficina de Planeación y Tecnologías de la Información",
      descripcion: "Publicación en el portal web institucional distrital y reporte al SisPT antes del 31 de enero conforme al Art. 74 Ley 1474/11.",
    },
  ],
  pasos_diligenciamiento_matriz: [
    {
      numero: "4.1",
      nombre: "Paso 1: Responsables de la Ejecución",
      campos: ["entidad_responsable", "lider_responsable", "dependencias_articuladas"],
      guia: "Identificar la secretaría u organismo distrital que lidera y las dependencias articuladas en corresponsabilidad.",
    },
    {
      numero: "4.2",
      nombre: "Paso 2: Clasificación de la Meta",
      campos: ["tipo_meta"],
      guia: "Clasificar en META_PRODUCTO (bienes y servicios al ciudadano), META_GESTION (procesos y gestión de recursos) o ACTIVIDAD (tareas específicas de proyecto).",
    },
    {
      numero: "4.3",
      nombre: "Paso 3: Articulación con Hoja 2 Plan Indicativo",
      campos: ["codigo_meta_pi", "programa_pi", "meta_producto_vigencia"],
      guia: "Vincular con el código único del Plan Indicativo (PAS), el programa estratégico y la meta cuantitativa programada para el año.",
    },
    {
      numero: "4.4",
      nombre: "Paso 4: Vinculación con Proyectos BPIM / MGA",
      campos: ["codigo_bpim", "proyecto_nombre", "objetivo_proyecto"],
      guia: "Registrar el código de 13 dígitos del Banco de Proyectos de Inversión Municipal (BPIM), nombre y objetivo central priorizado en POAI.",
    },
    {
      numero: "4.5",
      nombre: "Paso 5: Programación de Actividades y Regla de Verbos Fuertes",
      campos: ["tipo_actividad", "descripcion_actividad", "fecha_inicio", "fecha_terminacion", "avance_trimestral"],
      guia: "Redactar iniciando obligatoriamente con verbo fuerte en infinitivo (-ar, -er, -ir), clasificar en NORMATIVA, ADMINISTRATIVA, DE_GESTION o LOGISTICA, y fijar metas trimestrales T1-T4.",
    },
    {
      numero: "4.6",
      nombre: "Paso 6: Fuentes de Financiación por Vigencia",
      campos: ["categoria_recursos", "fuente_financiacion", "monto_programado_cop", "monto_ejecutado_cop"],
      guia: "Asignar la categoría (INVERSION, FUNCIONAMIENTO, RECURSOS_GESTION) y la fuente presupuestal exacta (SGP, Regalías, Propios, Crédito, etc.).",
    },
  ],
  taxonomia_metas: [
    {
      tipo: "META_PRODUCTO",
      nombre: "Meta de Producto",
      definicion: "Cuantifica los bienes y/o servicios públicos entregados a la comunidad para resolver la problemática diagnosticada en la política pública.",
      ejemplo: "250 cámaras de videovigilancia y analítica LPR operativas enlazadas al CAD MECAR.",
    },
    {
      tipo: "META_GESTION",
      nombre: "Meta de Gestión",
      definicion: "Cuantifica el nivel de cumplimiento de procesos, trámites y acciones internas o de gestión de recursos necesarias para materializar los productos.",
      ejemplo: "12 comités barriales de mediación y resolución comunitaria de conflictos instalados.",
    },
    {
      tipo: "ACTIVIDAD",
      nombre: "Actividad de Proyecto / Recurrente",
      definicion: "Acción específica o recurrente requerida durante la vigencia fiscal para avanzar en metas de proyectos o procesos misionales continuos.",
      ejemplo: "Colocar 1.200 luminarias LED de 150W en senderos escolares y paraderos del SITM.",
    },
  ],
  taxonomia_actividades: [
    {
      tipo: "NORMATIVA",
      nombre: "Actividad Normativa",
      descripcion: "Expedición o ajuste de normas, decretos, resoluciones, estatutos, tarifas o reglamentos distritales.",
      ejemplos_verbos: ["Expedir", "Adecuar", "Adoptar", "Modificar", "Fijar", "Eliminar", "Reglamentar"],
    },
    {
      tipo: "ADMINISTRATIVA",
      nombre: "Actividad Administrativa",
      descripcion: "Gestión de contratos, convenios, diseño de software, ajuste de procesos y trámites interinstitucionales.",
      ejemplos_verbos: ["Firmar", "Diseñar", "Ajustar", "Analizar", "Verificar", "Suscribir", "Tramitar"],
    },
    {
      tipo: "DE_GESTION",
      nombre: "Actividad de Gestión",
      descripcion: "Acciones operativas directas en territorio, ejecución de programas, fondos comunitarios y mesas de concertación.",
      ejemplos_verbos: ["Crear", "Identificar", "Ejecutar", "Concertar", "Gestionar", "Asignar", "Convocar"],
    },
    {
      tipo: "LOGISTICA",
      nombre: "Actividad Logística",
      descripcion: "Instalación de infraestructura, colocación de equipos, dotaciones físicas, distribución y notificaciones.",
      ejemplos_verbos: ["Instalar", "Colocar", "Notificar", "Dotar", "Distribuir", "Adecuar", "Suministrar"],
    },
  ],
  regla_linguistica_dnp: {
    fundamento: "Instructivo Plan de Acción DNP / Kit Financiero, pág. 12",
    regla_oro: "La redacción de toda actividad DEBE iniciar con un verbo fuerte en infinitivo (-ar, -er, -ir) que denote acción observable y resultado verificable.",
    verbos_debiles_prohibidos: VERBOS_DEBILES_PROHIBIDOS_DNP,
    motivo_prohibicion:
      "El DNP prohíbe taxativamente estos 16 verbos porque denotan intenciones genéricas, difusas o ambiguas que impiden la verificación objetiva del avance físico y el control social y fiscal.",
    catalogo_verbos_fuertes: SUGERENCIAS_VERBOS_FUERTES,
  },
  catalogo_fuentes_financiacion: {
    INVERSION: [
      { codigo: "RECURSOS_PROPIOS", nombre: "Recursos Propios (ICLD / Impuestos Distritales)" },
      { codigo: "SGP", nombre: "Sistema General de Participaciones (Ley 715 de 2001)" },
      { codigo: "REGALIAS", nombre: "Sistema General de Regalías (SGR / FCTI / Asignaciones Paz)" },
      { codigo: "CREDITO", nombre: "Recursos de Crédito Público Autorizado" },
      { codigo: "COFINANCIACION", nombre: "Cofinanciación de la Nación / Cooperación Internacional" },
      { codigo: "OTROS", nombre: "Otros Recursos de Capital y Donaciones" },
    ],
    FUNCIONAMIENTO: [
      { codigo: "GASTOS_PERSONAL", nombre: "Servicios Personales de Nómina y Supernumerarios" },
      { codigo: "GASTOS_GENERALES", nombre: "Adquisición de Bienes, Servicios y Mantenimiento" },
      { codigo: "TRANSFERENCIAS", nombre: "Transferencias Corrientes de Ley" },
    ],
    RECURSOS_GESTION: [
      { codigo: "GESTION_NO_PRESUPUESTAL", nombre: "Gestión Interinstitucional Directa (Sin Afectación Presupuestal ET)" },
    ],
  },
  enlaces_oficiales: [
    { titulo: "SisPT - Sistema de Planeación Territorial DNP", url: "https://sispt.dnp.gov.co/" },
    { titulo: "Portal Territorial DNP - Kit Financiero", url: "https://portalterritorial.dnp.gov.co/" },
    { titulo: "Instructivo Metodológico Plan de Acción DNP", url: "/docs/Instructivo_PlandeAccion_DNP.pdf" },
    { titulo: "Manual Conceptual MGA - DNP", url: "https://colaboracion.dnp.gov.co/CDI/Inversiones%20y%20finanzas%20pblicas/MGA_Manual_Conceptual.pdf" },
  ],
  modulos_mga_estructuracion: [
    {
      numero: 1,
      nombre: "Módulo 1: Identificación del Problema y Alineación Estratégica",
      titulo_corto: "1. Identificación",
      objetivo_modulo:
        "Definir el problema central como una situación negativa verificable, analizar a los actores involucrados, delimitar la población objetivo y transformar causas y efectos en objetivos y alternativas viables.",
      subetapas: [
        {
          nombre: "1.1 Articulación y Contribución al PND/PDD",
          descripcion:
            "Alinear el proyecto con el Plan Nacional de Desarrollo, el Plan de Desarrollo Distrital 'Cartagena Ciudad de Derechos' y el Catálogo de Clasificación Presupuestal (CCP).",
          entregable_clave: "Matriz de alineación estratégica con sector MGA y programa PDD.",
        },
        {
          nombre: "1.2 Diagnóstico y Árbol de Problemas",
          descripcion:
            "Formular el problema central (tronco), sus causas directas e indirectas (raíces) y sus efectos directos e indirectos (ramas), con evidencia cuantitativa y cualitativa.",
          entregable_clave: "Árbol de Problemas validado con fuentes DANE, Terridata y SISPRO.",
        },
        {
          nombre: "1.3 Análisis de Participantes e Involucrados",
          descripcion:
            "Mapear beneficiarios directos, cooperantes institucionales, oponentes y potenciales perjudicados, definiendo acuerdos de concertación comunitaria.",
          entregable_clave: "Matriz de involucrados y acuerdos de concertación ciudadana.",
        },
        {
          nombre: "1.4 Población Afectada vs. Población Objetivo",
          descripcion:
            "Cuantificar demográficamente la población afectada y focalizar la población objetivo según criterios etarios, territoriales (UCG/Corregimientos) y Sisbén IV.",
          entregable_clave: "Línea base sociodemográfica y criterios de focalización diferencial.",
        },
        {
          nombre: "1.5 Árbol de Objetivos y Selección de Alternativas",
          descripcion:
            "Transformar el problema central en objetivo general con verbo fuerte en infinitivo, causas en medios y efectos en fines, preseleccionando alternativas de solución.",
          entregable_clave: "Árbol de Objetivos y alternativas evaluadas para preparación técnica.",
        },
      ],
      entregables_obligatorios: [
        "Árbol de Problemas estructurado",
        "Árbol de Objetivos en positivo",
        "Matriz de Involucrados y concertación",
        "Focalización cuantificada de población objetivo",
        "Alternativas de solución preseleccionadas",
      ],
      regla_oro_dnp:
        "El problema central debe redactarse siempre como una situación negativa real y verificable que afecta a una comunidad, NUNCA como la ausencia o falta de una solución tecnológica o de obra física.",
      errores_comunes_rechazo: [
        "Redactar el problema como 'Falta de un centro de monitoreo' en vez del fenómeno delictivo que afecta al territorio.",
        "Confundir causas inmediatas con efectos estructurales del problema.",
        "No justificar la población objetivo con fuentes oficiales (DANE/Sisbén IV).",
        "Plantear alternativas que no atacan las causas directas identificadas.",
      ],
    },
    {
      numero: 2,
      nombre: "Módulo 2: Preparación de la Alternativa y Cadena de Valor",
      titulo_corto: "2. Preparación",
      objetivo_modulo:
        "Dimensionar la necesidad mediante el balance de oferta y demanda, realizar estudios técnicos, de localización y riesgos climáticos, y estructurar la Cadena de Valor con productos oficiales del Catálogo DNP.",
      subetapas: [
        {
          nombre: "2.1 Estudio de Necesidades (Oferta vs. Demanda)",
          descripcion:
            "Estimar la demanda insatisfecha proyectando la necesidad social, la capacidad actual de oferta pública y el déficit cuantitativo a cubrir durante la vida útil.",
          entregable_clave: "Balance oferta-demanda y cálculo del déficit de atención anual.",
        },
        {
          nombre: "2.2 Estudio Técnico y Localización Territorial",
          descripcion:
            "Definir microlocalización en Localidades, UCG o los 15 Corregimientos de Cartagena, planos, especificaciones de ingeniería y normatividad sectorial.",
          entregable_clave: "Ficha técnica, coordenadas georreferenciadas y memoria de cálculo.",
        },
        {
          nombre: "2.3 Análisis de Riesgos y Cambio Climático",
          descripcion:
            "Evaluar amenazas por inundación, erosión costera, marejadas y riesgos operativos bajo la Ley 1523/2012, asignando medidas de mitigación.",
          entregable_clave: "Matriz de riesgos de desastres y plan de contingencia financiado.",
        },
        {
          nombre: "2.4 Estructuración de la Cadena de Valor DNP",
          descripcion:
            "Conectar Insumos -> Actividades -> Productos DNP -> Resultados -> Impactos, seleccionando códigos del Catálogo Único de Productos DNP.",
          entregable_clave: "Cadena de valor con productos estandarizados e indicadores oficiales.",
        },
        {
          nombre: "2.5 Costeo Detallado y Presupuesto por Fases",
          descripcion:
            "Costear insumos y actividades a precios de mercado para las fases de preinversión, ejecución/inversión y operación/sostenibilidad plurianual.",
          entregable_clave: "Presupuesto detallado por actividades, insumos y fuentes.",
        },
      ],
      entregables_obligatorios: [
        "Estudio de balance oferta-demanda y déficit",
        "Estudio técnico y microlocalización territorial",
        "Matriz de gestión del riesgo (Ley 1523 de 2012)",
        "Cadena de Valor con Productos del Catálogo DNP",
        "Presupuesto integral (inversión y sostenibilidad)",
      ],
      regla_oro_dnp:
        "Todo Producto debe seleccionarse obligatoriamente del Catálogo Único de Productos del DNP; representa el bien o servicio final entregado a la ciudadanía, nunca una tarea interna ni un insumo administrativo.",
      errores_comunes_rechazo: [
        "Formular tareas internas ('Reuniones de coordinación', 'Comprar computadores') como productos del proyecto.",
        "Omitir los costos de operación y mantenimiento, condenando la infraestructura al abandono.",
        "No cuantificar el déficit de demanda con series históricas creíbles.",
        "Ignorar los riesgos de erosión costera o climáticos en proyectos insulares de Cartagena.",
      ],
    },
    {
      numero: 3,
      nombre: "Módulo 3: Evaluación Ex-Ante Financiera, Económica y Social",
      titulo_corto: "3. Evaluación Ex-Ante",
      objetivo_modulo:
        "Determinar la viabilidad socioeconómica del proyecto utilizando la Tasa Social de Descuento (TSD = 12% anual), Razones Precio-Cuenta (RPC) y metodologías Costo-Beneficio (VPNE/TIRS) o Costo-Efectividad (CAE/ACE).",
      subetapas: [
        {
          nombre: "3.1 Conversión a Precios Cuenta (Precios Sombra)",
          descripcion:
            "Ajustar los flujos a precios de mercado aplicando las Razones Precio-Cuenta (RPC) del DNP para corregir distorsiones de impuestos, aranceles y mano de obra.",
          entregable_clave: "Flujo de caja social a precios económicos de cuenta.",
        },
        {
          nombre: "3.2 Aplicación de la Tasa Social de Descuento (TSD = 12%)",
          descripcion:
            "Descontar los flujos netos intertemporales utilizando la tasa oficial del 12% anual fijada por el DNP para la inversión pública en Colombia.",
          entregable_clave: "Tasa de descuento de referencia 12% aplicada en el modelo financiero.",
        },
        {
          nombre: "3.3 Evaluación Costo-Beneficio (VPNE, TIRS, RBC)",
          descripcion:
            "Calcular el Valor Presente Neto Económico (VPNE), la Tasa Interna de Retorno Social (TIRS >= 12%) y la Relación Beneficio-Costo (RBC >= 1,0) para proyectos con beneficios monetizables.",
          entregable_clave: "Indicadores de rentabilidad social (VPNE > 0, TIRS >= 12%).",
        },
        {
          nombre: "3.4 Análisis Costo-Efectividad (CAE / ACE) para Seguridad Humana",
          descripcion:
            "Evaluar el Costo Anual Equivalente (CAE) y el costo unitario por beneficiario atendido o delito prevenido cuando los beneficios sociales no son monetizables.",
          entregable_clave: "Ratio de Costo-Efectividad (CAE / meta social anual alcanzada).",
        },
      ],
      entregables_obligatorios: [
        "Flujo financiero y flujo económico social descontado",
        "Cálculo de VPNE, TIRS y RBC o CAE/ACE según tipología",
        "Análisis de sensibilidad ante variaciones de costos y tiempos",
        "Dictamen de viabilidad socioeconómica ex-ante",
      ],
      regla_oro_dnp:
        "Toda evaluación ex-ante debe aplicar la TSD del 12% anual. En proyectos de Seguridad Humana y Convivencia donde monetizar beneficios sea arbitrario, debe aplicarse rigurosamente el Análisis Costo-Efectividad (CAE/ACE).",
      errores_comunes_rechazo: [
        "Utilizar tasas de descuento arbitrarias o comerciales del sector privado en vez del 12% social.",
        "Monetizar beneficios sin respaldo técnico o duplicar beneficios en el flujo.",
        "Omitir el análisis de sensibilidad en proyectos de alta volatilidad presupuestal.",
        "No justificar la alternativa con menor CAE cuando se aplica Costo-Efectividad.",
      ],
    },
    {
      numero: 4,
      nombre: "Módulo 4: Programación, Fuentes de Financiación y Marco Lógico",
      titulo_corto: "4. Programación",
      objetivo_modulo:
        "Estructurar los indicadores de producto y gestión bajo criterio CREMA, programar las fuentes de financiación plurianuales por clasificador presupuestal (CCP) y consolidar la Matriz de Marco Lógico (MML).",
      subetapas: [
        {
          nombre: "4.1 Selección y Ficha de Indicadores (Filtro CREMA)",
          descripcion:
            "Asignar indicadores oficiales de producto y gestión que cumplan los 5 criterios: Claro, Relevante, Económico, Medible y Adecuado, con línea base y metas anuales.",
          entregable_clave: "Fichas técnicas de indicadores CREMA con medios de verificación.",
        },
        {
          nombre: "4.2 Programación Plurianual de Fuentes de Financiación",
          descripcion:
            "Asignar los techos de gasto por vigencia según el Clasificador Presupuestal (ICLD, SGP, SGR, Crédito, Cofinanciación, FONSECON).",
          entregable_clave: "Cronograma financiero plurianual armonizado con el Marco Fiscal (MFMP).",
        },
        {
          nombre: "4.3 Consolidación de la Matriz de Marco Lógico (4x4)",
          descripcion:
            "Estructurar Fin, Propósito, Componentes y Actividades con su resumen narrativo, indicadores verificables, medios de verificación y supuestos críticos.",
          entregable_clave: "Matriz de Marco Lógico de 4 filas x 4 columnas con lógica vertical y horizontal.",
        },
        {
          nombre: "4.4 Radicación y Transferencia al BPIM / BPIN",
          descripcion:
            "Cerrar la formulación en MGA Web, transferir al Banco de Proyectos de Cartagena para asignación del código BPIM de 13 dígitos y emisión de Ficha EBI.",
          entregable_clave: "Proyecto transferido y radicado en el Banco de Proyectos con Ficha EBI.",
        },
      ],
      entregables_obligatorios: [
        "Fichas técnicas de indicadores CREMA con línea base",
        "Programación de fuentes presupuestales por vigencia",
        "Matriz de Marco Lógico (MML) completa",
        "Ficha EBI del Banco Distrital de Proyectos (BPIM)",
      ],
      regla_oro_dnp:
        "La Matriz de Marco Lógico debe guardar estricta coherencia causal vertical (si se realizan actividades, se logran componentes; si se logran componentes, se alcanza el propósito) y horizontal (indicadores y medios verificables independientes).",
      errores_comunes_rechazo: [
        "Redactar supuestos que dependen de la propia entidad formuladora y no del entorno externo.",
        "Indicadores sin fórmula matemática, sin periodicidad o sin fuente oficial de reporte.",
        "Programar fuentes de financiación que no corresponden a la naturaleza legal del gasto (ej. SGP con restricciones).",
        "Desconectar las metas anuales del proyecto de la Hoja 1 del Plan de Acción Institucional.",
      ],
    },
  ],
  cadena_valor_proyecto_mga: [
    {
      eslabon: "INSUMOS",
      orden: 1,
      nombre: "1. Insumos (Inputs)",
      definicion_dnp:
        "Recursos financieros, humanos, técnicos y físicos necesarios para ejecutar las actividades previstas del proyecto.",
      regla_formulacion:
        "Se cuantifican en unidades físicas y se costean a precios de mercado desagregados por clasificadores de gasto.",
      ejemplo_cartagena:
        "$4.850 millones COP (FONSET e ICLD), 12 ingenieros de telecomunicaciones, 75 cámaras LPR/PTZ, 12 km fibra óptica y servidores CAD.",
      unidad_o_indicador_ejemplo: "Pesos COP / Número de profesionales / Equipos adquiridos",
    },
    {
      eslabon: "ACTIVIDADES",
      orden: 2,
      nombre: "2. Actividades",
      definicion_dnp:
        "Conjunto de procesos y acciones secuenciales que transforman los insumos en productos.",
      regla_formulacion:
        "Se redactan obligatoriamente con verbo fuerte en infinitivo, tienen cronograma trimestral y presupuesto asignado.",
      ejemplo_cartagena:
        "Instalar el tendido de fibra óptica submarino y aéreo, e integrar los flujos de video con el Sistema Integrado SIES 123.",
      unidad_o_indicador_ejemplo: "Porcentaje de avance físico de obra / Cronograma T1-T4",
    },
    {
      eslabon: "PRODUCTOS",
      orden: 3,
      nombre: "3. Productos (Outputs)",
      definicion_dnp:
        "Bienes y servicios tangibles e intangibles entregados directamente a la población beneficiaria.",
      regla_formulacion:
        "Debe seleccionarse obligatoriamente del Catálogo Único de Productos del DNP. Nunca puede ser una actividad interna ni un insumo.",
      ejemplo_cartagena:
        "Catálogo DNP 4001015 — Servicio de videovigilancia y analítica para la seguridad ciudadana implementado (Meta: 75 cámaras en operación continua).",
      unidad_o_indicador_ejemplo: "Número de cámaras analíticas en operación continua conectadas al CAD",
    },
    {
      eslabon: "RESULTADOS",
      orden: 4,
      nombre: "4. Resultados (Outcomes)",
      definicion_dnp:
        "Efectos directos e inmediatos en el bienestar, capacidad o comportamiento de la población objetivo.",
      regla_formulacion:
        "Se asocia al Objetivo Específico del proyecto y al Programa presupuestal del Plan de Desarrollo.",
      ejemplo_cartagena:
        "Disminución del 25% en el tiempo medio de respuesta de las patrullas policiales de cuadrante ante llamados comunitarios en Localidades 2 y 3.",
      unidad_o_indicador_ejemplo: "Minutos de respuesta policial / Tasa de victimización barrial",
    },
    {
      eslabon: "IMPACTOS",
      orden: 5,
      nombre: "5. Impactos",
      definicion_dnp:
        "Transformaciones estructurales y de largo plazo en el goce efectivo de derechos y el desarrollo socioeconómico territorial.",
      regla_formulacion:
        "Se evalúa ex-post mediante metodologías econométricas (DiD, RDD) y estadísticas oficiales DANE / Medicina Legal.",
      ejemplo_cartagena:
        "Reducción sostenida de la tasa distrital de homicidios y hurtos por cada 100.000 habitantes en los polígonos urbanos y corregimientos de Cartagena.",
      unidad_o_indicador_ejemplo: "Tasa de homicidios por 100.000 hab. / Índice Multidimensional de Calidad de Vida",
    },
  ],
  criterios_evaluacion_ex_ante: [
    {
      criterio: "Tasa Social de Descuento",
      sigla: "TSD",
      formula_o_metodologia: "Tasa oficial fijada por el DNP para Colombia = 12% anual en términos reales.",
      tasa_o_umbral_referencia: "12,0% anual",
      cuando_utilizar:
        "Obligatoria en todos los proyectos de inversión pública en Colombia para descontar flujos financieros y sociales.",
      interpretacion_viabilidad:
        "Representa el costo de oportunidad social del capital público del país.",
    },
    {
      criterio: "Valor Presente Neto Social / Económico",
      sigla: "VPNE / VNA",
      formula_o_metodologia: "VPNE = sum( (Beneficios_t - Costos_t) / (1 + TSD)^t ) con TSD = 12%",
      tasa_o_umbral_referencia: "VPNE > 0 COP",
      cuando_utilizar:
        "En proyectos de infraestructura económica y servicios donde los beneficios sociales son cuantificables y monetizables.",
      interpretacion_viabilidad:
        "Si VPNE > 0, el proyecto genera riqueza neta para la sociedad y es elegible; si es < 0, se rechaza.",
    },
    {
      criterio: "Tasa Interna de Retorno Social",
      sigla: "TIRS",
      formula_o_metodologia: "Tasa de descuento r que satisface: sum( (Beneficios_t - Costos_t) / (1 + r)^t ) = 0",
      tasa_o_umbral_referencia: "TIRS >= 12,0%",
      cuando_utilizar:
        "Indicador complementario al VPNE para evaluar la rentabilidad social porcentual de la inversión pública.",
      interpretacion_viabilidad:
        "Viable si TIRS >= 12%. Refleja que la rentabilidad social supera el costo de oportunidad del Estado.",
    },
    {
      criterio: "Costo Anual Equivalente y Análisis Costo-Efectividad",
      sigla: "CAE / ACE",
      formula_o_metodologia:
        "CAE = VPC * [ i*(1+i)^n / ((1+i)^n - 1) ] con i = 12%. Ratio ACE = CAE / Beneficiarios atendidos o delitos prevenidos.",
      tasa_o_umbral_referencia: "Menor CAE / Menor costo por unidad de resultado social",
      cuando_utilizar:
        "En proyectos de Seguridad Humana, Convivencia, Salud Mental y Justicia donde monetizar los beneficios es complejo o éticamente cuestionable.",
      interpretacion_viabilidad:
        "Permite seleccionar la alternativa que cumple la meta social al menor costo económico anualizado para el Distrito.",
    },
    {
      criterio: "Relación Beneficio-Costo Social",
      sigla: "RBC",
      formula_o_metodologia: "RBC = VNP(Beneficios Sociales) / VNP(Costos de Inversión y Operación) a TSD 12%",
      tasa_o_umbral_referencia: "RBC >= 1,00",
      cuando_utilizar:
        "En proyectos con beneficios monetizables directos e indirectos evaluados con Razones Precio-Cuenta (RPC).",
      interpretacion_viabilidad:
        "Si RBC >= 1,0, cada peso invertido por el Distrito genera al menos un peso de bienestar social para la comunidad.",
    },
  ],
  plantillas_proyectos_seguridad_humana: [
    {
      codigo_bpim_proyectado: "2026130010021",
      sector_mga: "40 - Gobierno Territorial y Convivencia",
      programa_pdd: "Programa 01 - Inteligencia y Tecnología para la Seguridad Humana",
      entidad_responsable: "Distriseguridad / Secretaría del Interior",
      problema_central:
        "Altas tasas de comisión de delitos de alto impacto y débil capacidad de reacción policial en cuadrantes críticos de las Localidades 2 y 3 de Cartagena.",
      objetivo_general:
        "Optimizar la capacidad de vigilancia, detección temprana y judicialización de delitos en los corredores críticos del Distrito de Cartagena.",
      producto_mga_catalogo:
        "Catálogo DNP 4001015 — Servicio de videovigilancia y analítica para la seguridad ciudadana implementado",
      indicador_producto:
        "Número de cámaras analíticas en operación continua conectadas al CAD",
      meta_cuatrienio: "75 cámaras analíticas LPR y domos PTZ 4K operando",
      actividades_clave: [
        "Adquirir 75 dispositivos de videovigilancia LPR/PTZ con analítica facial y vehicular",
        "Tender 12 km de fibra óptica monomodo aérea y subterránea en puntos críticos",
        "Integrar los flujos de video con el Sistema Integrado de Emergencias SIES 123",
      ],
      metodologia_evaluacion: "Análisis Costo-Efectividad (ACE) con CAE = $745M COP/año (TSD 12%)",
      costo_total_estimado_cop: 4850000000,
      fuentes_financiacion: [
        "Fondo Territorial de Seguridad y Convivencia (FONSET): $3.500.000.000 COP",
        "Recursos Propios (ICLD Inversión): $1.350.000.000 COP",
      ],
    },
    {
      codigo_bpim_proyectado: "2026130010042",
      sector_mga: "37 - Inclusión Social y Reconciliación",
      programa_pdd: "Programa 02 - Jóvenes Tejedores de Paz y Oportunidades Barriales",
      entidad_responsable: "Secretaría de Participación y Desarrollo Social / PES Pedro Romero",
      problema_central:
        "Alta vinculación de adolescentes y jóvenes a pandillas y economías delictivas barriales en las UCG 4, 5 y 6 de la Localidad de la Virgen y Turística.",
      objetivo_general:
        "Promover alternativas formativas, psicosociales y de inclusión productiva para jóvenes en riesgo de vulnerabilidad social y violencia.",
      producto_mga_catalogo:
        "Catálogo DNP 3702008 — Personas en situación de vulnerabilidad formadas y acompañadas psicosocialmente",
      indicador_producto:
        "Número de jóvenes en riesgo vinculados y certificados en la ruta integral de prevención social",
      meta_cuatrienio: "600 jóvenes certificados y 120 iniciativas productivas apoyadas",
      actividades_clave: [
        "Caracterizar a 600 jóvenes en situación de vulnerabilidad y riesgo delictivo en sectores priorizados",
        "Impartir talleres en habilidades socioemocionales, resolución pacífica de conflictos y DDHH",
        "Entregar incentivos de capital semilla y asistencia técnica a 120 emprendimientos juveniles",
      ],
      metodologia_evaluacion: "Análisis Costo-Efectividad (ACE) con costo de $4.333.333 COP por joven resocializado (TSD 12%)",
      costo_total_estimado_cop: 2600000000,
      fuentes_financiacion: [
        "Sistema General de Participaciones (SGP Propósito General): $1.600.000.000 COP",
        "Recursos Propios (ICLD): $1.000.000.000 COP",
      ],
    },
    {
      codigo_bpim_proyectado: "2026130010058",
      sector_mga: "03 - Justicia y del Derecho",
      programa_pdd: "Programa 03 - Convivencia, Paz y Justicia Comunitaria Descentralizada",
      entidad_responsable: "Secretaría del Interior y Convivencia Ciudadana",
      problema_central:
        "Barreras geográficas y económicas de acceso a mecanismos formales y alternativos de resolución de conflictos en los 15 corregimientos rurales e insulares de Cartagena.",
      objetivo_general:
        "Garantizar el acceso efectivo a la justicia local, la mediación comunitaria y la conciliación en equidad en los 15 corregimientos del Distrito.",
      producto_mga_catalogo:
        "Catálogo DNP 0301012 — Servicio de acceso a la justicia y conciliación en equidad prestado en territorio",
      indicador_producto:
        "Número de casos atendidos y resueltos mediante mecanismos alternativos de solución de conflictos en zona rural e insular",
      meta_cuatrienio: "1.500 controversias comunitarias resueltas pacíficamente y 90 conciliadores formados",
      actividades_clave: [
        "Desplegar jornadas itinerantes quincenales de Casas de Justicia Móviles en los 15 corregimientos oficiales",
        "Formar y habilitar a 90 líderes comunitarios como Conciliadores en Equidad reconocidos por MinJusticia",
        "Tramitar controversias de linderos, convivencia vecinal y violencia intrafamiliar mediante acuerdos concertados",
      ],
      metodologia_evaluacion: "Análisis Costo-Efectividad (ACE) con costo de $1.166.666 COP por conflicto resuelto (TSD 12%)",
      costo_total_estimado_cop: 1750000000,
      fuentes_financiacion: [
        "Recursos Propios (ICLD Inversión): $1.200.000.000 COP",
        "Cooperación Internacional / FCTI: $550.000.000 COP",
      ],
    },
  ],
};

// =============================================================================
// VALIDADOR LINGÜÍSTICO LOCAL DE RESPALDO (CLIENT-SIDE)
// =============================================================================

export function normalizarPalabra(palabra: string): string {
  const limpia = palabra.replace(/[^\wáéíóúüñÁÉÍÓÚÜÑ]/g, "");
  const mapa: Record<string, string> = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    ü: "u",
    Á: "a",
    É: "e",
    Í: "i",
    Ó: "o",
    Ú: "u",
    Ü: "u",
  };
  return limpia
    .split("")
    .map((c) => mapa[c] || c)
    .join("")
    .toLowerCase();
}

export function validarRedaccionLocal(
  descripcion: string,
  tipoActividad?: string
): ValidarRedaccionRespuesta {
  if (!descripcion || !descripcion.trim()) {
    return {
      es_valida: false,
      verbo_detectado: "",
      es_infinitivo: false,
      es_verbo_debil_prohibido: false,
      mensaje_dnp: "La descripción de la actividad no puede estar vacía.",
      verbos_fuertes_sugeridos: SUGERENCIAS_VERBOS_FUERTES.NORMATIVA,
    };
  }

  const palabras = descripcion.trim().split(/\s+/);
  const primeraPalabra = palabras[0] || "";
  const verboNorm = normalizarPalabra(primeraPalabra);

  const sugerencias =
    SUGERENCIAS_VERBOS_FUERTES[tipoActividad || ""] ||
    SUGERENCIAS_VERBOS_FUERTES.NORMATIVA;

  if (VERBOS_DEBILES_PROHIBIDOS_DNP.includes(verboNorm)) {
    return {
      es_valida: false,
      verbo_detectado: verboNorm,
      es_infinitivo:
        verboNorm.endsWith("ar") ||
        verboNorm.endsWith("er") ||
        verboNorm.endsWith("ir"),
      es_verbo_debil_prohibido: true,
      mensaje_dnp: `El verbo '${primeraPalabra}' pertenece a la lista negra oficial de 16 verbos débiles prohibidos por el DNP (Instructivo Kit Financiero, pág. 12). Sustitúyalo por un verbo fuerte en infinitivo.`,
      verbos_fuertes_sugeridos: sugerencias,
    };
  }

  const esInfinitivo =
    (verboNorm.endsWith("ar") ||
      verboNorm.endsWith("er") ||
      verboNorm.endsWith("ir")) &&
    verboNorm.length >= 4;

  if (!esInfinitivo) {
    return {
      es_valida: false,
      verbo_detectado: verboNorm,
      es_infinitivo: false,
      es_verbo_debil_prohibido: false,
      mensaje_dnp: `La actividad inicia con '${primeraPalabra}', que no es un verbo en infinitivo terminado en -ar, -er o -ir. Según la metodología DNP (pág. 12), toda actividad debe iniciar obligatoriamente con un verbo fuerte en infinitivo.`,
      verbos_fuertes_sugeridos: sugerencias,
    };
  }

  return {
    es_valida: true,
    verbo_detectado: verboNorm,
    es_infinitivo: true,
    es_verbo_debil_prohibido: false,
    mensaje_dnp: `Redacción válida según el estándar DNP. Inicia con el verbo fuerte en infinitivo '${verboNorm}'.`,
    verbos_fuertes_sugeridos: [],
  };
}

export function calcularResumenEjecutivoLocal(
  actividades: ActividadPlanAccion[]
): ResumenEjecutivoPlanAccion {
  const totalAct = actividades.length;
  const totalProducto = actividades.filter(
    (a) => a.tipo_meta === "META_PRODUCTO"
  ).length;
  const totalGestion = actividades.filter(
    (a) => a.tipo_meta === "META_GESTION"
  ).length;
  const totalActTipo = actividades.filter((a) => a.tipo_meta === "ACTIVIDAD").length;

  const promedioFisico =
    totalAct > 0
      ? Number(
          (
            actividades.reduce(
              (acc, a) => acc + (a.porcentaje_avance_fisico || 0),
              0
            ) / totalAct
          ).toFixed(2)
        )
      : 0;

  const sumaProg = actividades.reduce(
    (acc, a) => acc + (Number(a.monto_programado_cop) || 0),
    0
  );
  const sumaEjec = actividades.reduce(
    (acc, a) => acc + (Number(a.monto_ejecutado_cop) || 0),
    0
  );
  const pctEjecFin =
    sumaProg > 0 ? Number(((sumaEjec / sumaProg) * 100).toFixed(2)) : 0;

  const desgloseFuentes: Record<string, { programado: number; ejecutado: number }> =
    {};
  const desgloseTipoAct: Record<string, number> = {};

  for (const a of actividades) {
    if (!desgloseFuentes[a.fuente_financiacion]) {
      desgloseFuentes[a.fuente_financiacion] = { programado: 0, ejecutado: 0 };
    }
    desgloseFuentes[a.fuente_financiacion].programado +=
      Number(a.monto_programado_cop) || 0;
    desgloseFuentes[a.fuente_financiacion].ejecutado +=
      Number(a.monto_ejecutado_cop) || 0;

    desgloseTipoAct[a.tipo_actividad] =
      (desgloseTipoAct[a.tipo_actividad] || 0) + 1;
  }

  return {
    total_actividades: totalAct,
    total_metas_producto: totalProducto,
    total_metas_gestion: totalGestion,
    total_actividades_tipo: totalActTipo,
    avance_fisico_promedio: promedioFisico,
    presupuesto_total_programado_cop: sumaProg,
    presupuesto_total_ejecutado_cop: sumaEjec,
    porcentaje_ejecucion_financiera: pctEjecFin,
    desglose_fuentes: desgloseFuentes,
    desglose_tipo_actividad: desgloseTipoAct,
    semaforo_alertas: {
      en_meta: actividades.filter((a) => (a.porcentaje_avance_fisico || 0) >= 80)
        .length,
      alerta_preventiva: actividades.filter(
        (a) =>
          (a.porcentaje_avance_fisico || 0) >= 50 &&
          (a.porcentaje_avance_fisico || 0) < 80
      ).length,
      rezago_critico: actividades.filter(
        (a) => (a.porcentaje_avance_fisico || 0) < 50
      ).length,
    },
  };
}

// =============================================================================
// LLAMADAS HTTP CON RESILIENCIA Y CONTINGENCIA
// =============================================================================

export async function obtenerBancoConocimientoApi(): Promise<BancoConocimientoDNP> {
  try {
    const res = await apiFetch<BancoConocimientoDNP>(
      "/api/v1/compromisos/plan-accion/banco-conocimiento"
    );
    if (!res) return BANCO_CONOCIMIENTO_CANONICO;
    return {
      ...BANCO_CONOCIMIENTO_CANONICO,
      ...res,
      modulos_mga_estructuracion:
        res.modulos_mga_estructuracion && res.modulos_mga_estructuracion.length > 0
          ? res.modulos_mga_estructuracion
          : BANCO_CONOCIMIENTO_CANONICO.modulos_mga_estructuracion,
      cadena_valor_proyecto_mga:
        res.cadena_valor_proyecto_mga && res.cadena_valor_proyecto_mga.length > 0
          ? res.cadena_valor_proyecto_mga
          : BANCO_CONOCIMIENTO_CANONICO.cadena_valor_proyecto_mga,
      criterios_evaluacion_ex_ante:
        res.criterios_evaluacion_ex_ante && res.criterios_evaluacion_ex_ante.length > 0
          ? res.criterios_evaluacion_ex_ante
          : BANCO_CONOCIMIENTO_CANONICO.criterios_evaluacion_ex_ante,
      plantillas_proyectos_seguridad_humana:
        res.plantillas_proyectos_seguridad_humana &&
        res.plantillas_proyectos_seguridad_humana.length > 0
          ? res.plantillas_proyectos_seguridad_humana
          : BANCO_CONOCIMIENTO_CANONICO.plantillas_proyectos_seguridad_humana,
    };
  } catch (e) {
    console.warn("Fallo al conectar con banco-conocimiento, usando canon local:", e);
    return BANCO_CONOCIMIENTO_CANONICO;
  }
}

export async function validarRedaccionDnpApi(
  descripcion: string,
  tipoActividad?: string
): Promise<ValidarRedaccionRespuesta> {
  try {
    return await apiFetch<ValidarRedaccionRespuesta>(
      "/api/v1/compromisos/plan-accion/validar-redaccion",
      {
        method: "POST",
        body: {
          descripcion_actividad: descripcion,
          tipo_actividad: tipoActividad,
        },
      }
    );
  } catch {
    return validarRedaccionLocal(descripcion, tipoActividad);
  }
}

export async function obtenerMatrizPlanAccionApi(
  filtros?: FiltrosMatrizPlanAccion
): Promise<MatrizPlanAccionRespuesta> {
  try {
    const params = new URLSearchParams();
    if (filtros?.vigencia) params.set("vigencia", String(filtros.vigencia));
    if (filtros?.entidad && filtros.entidad !== "todas")
      params.set("entidad", filtros.entidad);
    if (filtros?.compromiso_pas_codigo && filtros.compromiso_pas_codigo !== "todas")
      params.set("compromiso_pas_codigo", filtros.compromiso_pas_codigo);
    if (filtros?.linea_codigo && filtros.linea_codigo !== "todas")
      params.set("linea_codigo", filtros.linea_codigo);
    if (filtros?.tipo_meta && filtros.tipo_meta !== "todas")
      params.set("tipo_meta", filtros.tipo_meta);
    if (filtros?.tipo_actividad && filtros.tipo_actividad !== "todas")
      params.set("tipo_actividad", filtros.tipo_actividad);
    if (filtros?.categoria_recursos && filtros.categoria_recursos !== "todas")
      params.set("categoria_recursos", filtros.categoria_recursos);
    if (filtros?.fuente_financiacion && filtros.fuente_financiacion !== "todas")
      params.set("fuente_financiacion", filtros.fuente_financiacion);
    if (filtros?.busqueda) params.set("busqueda", filtros.busqueda);

    const query = params.toString();
    const res = await apiFetch<MatrizPlanAccionRespuesta>(
      `/api/v1/compromisos/plan-accion/matriz${query ? `?${query}` : ""}`
    );

    if (res && res.hoja_1_plan_accion && Array.isArray(res.hoja_1_plan_accion)) {
      return {
        ...res,
        esContingencia: false,
      };
    }
    throw new Error("Respuesta vacía o formato inválido");
  } catch (error) {
    console.warn("Fallo al consultar matriz de plan de acción, usando fallback local:", error);
    let filtradas = [...ACTIVIDADES_PA_CANONICAS];

    if (filtros?.vigencia && filtros.vigencia !== 0) {
      filtradas = filtradas.filter((a) => a.vigencia === filtros.vigencia);
    }
    if (filtros?.compromiso_pas_codigo && filtros.compromiso_pas_codigo !== "todas") {
      filtradas = filtradas.filter(
        (a) => a.compromiso_pas_codigo === filtros.compromiso_pas_codigo
      );
    }
    if (filtros?.linea_codigo && filtros.linea_codigo !== "todas") {
      filtradas = filtradas.filter(
        (a) => a.linea_estrategica_codigo === filtros.linea_codigo
      );
    }
    if (filtros?.entidad && filtros.entidad !== "todas") {
      filtradas = filtradas.filter(
        (a) => a.entidad_responsable === filtros.entidad
      );
    }
    if (filtros?.tipo_meta && filtros.tipo_meta !== "todas") {
      filtradas = filtradas.filter((a) => a.tipo_meta === filtros.tipo_meta);
    }
    if (filtros?.tipo_actividad && filtros.tipo_actividad !== "todas") {
      filtradas = filtradas.filter(
        (a) => a.tipo_actividad === filtros.tipo_actividad
      );
    }
    if (filtros?.fuente_financiacion && filtros.fuente_financiacion !== "todas") {
      filtradas = filtradas.filter(
        (a) => a.fuente_financiacion === filtros.fuente_financiacion
      );
    }
    if (filtros?.busqueda && filtros.busqueda.trim() !== "") {
      const q = filtros.busqueda.toLowerCase();
      filtradas = filtradas.filter(
        (a) =>
          a.codigo.toLowerCase().includes(q) ||
          a.descripcion_actividad.toLowerCase().includes(q) ||
          a.proyecto_nombre.toLowerCase().includes(q) ||
          a.codigo_bpim.toLowerCase().includes(q) ||
          (a.verbo_infinitivo && a.verbo_infinitivo.toLowerCase().includes(q)) ||
          a.entidad_responsable.toLowerCase().includes(q)
      );
    }

    return {
      resumen_ejecutivo: calcularResumenEjecutivoLocal(filtradas),
      hoja_1_plan_accion: filtradas,
      hoja_2_plan_indicativo: COMPROMISOS_PAS_CANONICOS,
      esContingencia: true,
    };
  }
}

export const obtenerMatrizPlanAccion = obtenerMatrizPlanAccionApi;

export async function crearActividadPlanAccionApi(
  datos: Partial<ActividadPlanAccion>
): Promise<ActividadPlanAccion> {
  return await apiFetch<ActividadPlanAccion>(
    "/api/v1/compromisos/plan-accion/actividades",
    {
      method: "POST",
      body: datos,
    }
  );
}

export async function actualizarSeguimientoActividadApi(
  idOcodigo: string,
  datos: {
    avance_t1?: number;
    avance_t2?: number;
    avance_t3?: number;
    avance_t4?: number;
    monto_ejecutado_cop?: number;
    evidencia_soporte?: string;
    observacion_cualitativa?: string;
  }
): Promise<ActividadPlanAccion> {
  return await apiFetch<ActividadPlanAccion>(
    `/api/v1/compromisos/plan-accion/actividades/${idOcodigo}/seguimiento`,
    {
      method: "PATCH",
      body: datos,
    }
  );
}

// =============================================================================
// PROCESADOR MASIVO Y AUDITOR POR LOTES DNP (HOJA 2 -> HOJA 1)
// =============================================================================

export const LOTE_DEMO_DNP_CANONICO: ItemLotePlanAccion[] = [
  {
    codigo: "PA-2026-LOTE-01",
    compromiso_pas_codigo: "PAS-SEC-01",
    entidad_responsable: "Distriseguridad",
    lider_responsable: "Director Técnico de Distriseguridad",
    tipo_meta: "META_PRODUCTO",
    tipo_actividad: "NORMATIVA",
    descripcion_actividad: "Expedir el protocolo distrital unificado de atención inmediata y judicialización por alertas de ESCNNA.",
    categoria_recursos: "INVERSION",
    fuente_financiacion: "SGP",
    monto_programado_cop: 450000000,
    monto_ejecutado_cop: 400000000,
    avance_t1: 100,
    avance_t2: 80,
    codigo_bpim: "2026130010001",
    proyecto_nombre: "Protección Integral contra ESCNNA",
  },
  {
    codigo: "PA-2026-LOTE-02",
    compromiso_pas_codigo: "PAS-SEG-03",
    entidad_responsable: "Distriseguridad",
    lider_responsable: "Coordinador de Telemática y Sistemas LPR",
    tipo_meta: "META_PRODUCTO",
    tipo_actividad: "LOGISTICA",
    descripcion_actividad: "Instalar 85 nuevos puntos de captura con cámaras analíticas LPR y fibra óptica en los corredores viales.",
    categoria_recursos: "INVERSION",
    fuente_financiacion: "CREDITO",
    monto_programado_cop: 1850000000,
    monto_ejecutado_cop: 1500000000,
    avance_t1: 100,
    avance_t2: 75,
    codigo_bpim: "2026130010002",
    proyecto_nombre: "Modernización de Videovigilancia LPR",
  },
  {
    codigo: "PA-2026-LOTE-03",
    compromiso_pas_codigo: "PAS-JUV-02",
    entidad_responsable: "Secretaría del Interior y Convivencia Ciudadana",
    lider_responsable: "Coordinadora de Diálogo Social",
    tipo_meta: "ACTIVIDAD",
    tipo_actividad: "DE_GESTION",
    descripcion_actividad: "Ejecutar 32 mesas territoriales de concertación comunitaria y prevención de riñas juveniles.",
    categoria_recursos: "INVERSION",
    fuente_financiacion: "RECURSOS_PROPIOS",
    monto_programado_cop: 320000000,
    monto_ejecutado_cop: 280000000,
    avance_t1: 100,
    avance_t2: 90,
    codigo_bpim: "2026130010003",
    proyecto_nombre: "Convivencia Ciudadana y Diálogo Social",
  },
  {
    codigo: "PA-2026-LOTE-04",
    compromiso_pas_codigo: "PAS-SEC-01",
    entidad_responsable: "Secretaría del Interior y Convivencia Ciudadana",
    lider_responsable: "Director de Seguridad Barrial",
    tipo_meta: "ACTIVIDAD",
    tipo_actividad: "NORMATIVA",
    descripcion_actividad: "Adoptar el plan de contingencia y vigilancia preventiva para eventos masivos en el Centro Histórico.",
    categoria_recursos: "FUNCIONAMIENTO",
    fuente_financiacion: "GASTOS_GENERALES",
    monto_programado_cop: 120000000,
    monto_ejecutado_cop: 110000000,
    avance_t1: 100,
    avance_t2: 85,
    codigo_bpim: "2026130010004",
    proyecto_nombre: "Inspección, Vigilancia y Control",
  },
  {
    // Observación 1: Verbo débil prohibido 'Fortalecer'
    codigo: "PA-2026-LOTE-05",
    compromiso_pas_codigo: "PAS-ALUM-04",
    entidad_responsable: "Secretaría General - Alumbrado Público",
    lider_responsable: "Subdirector Técnico de Operaciones",
    tipo_meta: "META_PRODUCTO",
    tipo_actividad: "LOGISTICA",
    descripcion_actividad: "Fortalecer los corredores seguros con nuevas luminarias LED en barrios de la Localidad 3.",
    categoria_recursos: "INVERSION",
    fuente_financiacion: "RECURSOS_PROPIOS",
    monto_programado_cop: 520000000,
    monto_ejecutado_cop: 450000000,
    avance_t1: 80,
    avance_t2: 60,
    codigo_bpim: "2026130010005",
    proyecto_nombre: "Iluminación Segura y Senderos de Convivencia",
  },
  {
    // Observación 2: Verbo débil prohibido 'Garantizar'
    codigo: "PA-2026-LOTE-06",
    compromiso_pas_codigo: "PAS-CUID-07",
    entidad_responsable: "Secretaría de Desarrollo Social",
    lider_responsable: "Líder de Centros de Vida",
    tipo_meta: "META_PRODUCTO",
    tipo_actividad: "DE_GESTION",
    descripcion_actividad: "Garantizar la atención psicosocial y cuidado integral a personas mayores vulnerables en Manzanas del Cuidado.",
    categoria_recursos: "INVERSION",
    fuente_financiacion: "SGP",
    monto_programado_cop: 380000000,
    monto_ejecutado_cop: 320000000,
    avance_t1: 90,
    avance_t2: 70,
    codigo_bpim: "2026130010006",
    proyecto_nombre: "Manzanas del Cuidado y Centros de Vida",
  },
];

const FUENTES_POR_CATEGORIA_LOCAL: Record<string, string[]> = {
  INVERSION: [
    "RECURSOS_PROPIOS",
    "SGP",
    "SGP_PROPOSITO_GENERAL",
    "SGP_SEGURIDAD",
    "REGALIAS",
    "CREDITO",
    "COFINANCIACION",
    "OTROS",
  ],
  FUNCIONAMIENTO: [
    "GASTOS_PERSONAL",
    "GASTOS_GENERALES",
    "TRANSFERENCIAS",
    "RECURSOS_PROPIOS",
  ],
  RECURSOS_GESTION: ["GESTION_NO_PRESUPUESTAL"],
};

export function procesarLotePlanAccionLocal(
  solicitud: ProcesarLotePlanAccionSolicitud
): ProcesarLotePlanAccionRespuesta {
  const items = solicitud.filas && solicitud.filas.length > 0
    ? solicitud.filas
    : (solicitud.items && solicitud.items.length > 0 ? solicitud.items : []);

  const vigencia = solicitud.vigencia || 2026;
  const mapaPAS = new Map(COMPROMISOS_PAS_CANONICOS.map((c) => [c.codigo.toUpperCase(), c]));
  const verbosDebiles = new Set(VERBOS_DEBILES_PROHIBIDOS_DNP.map((v) => v.toLowerCase()));

  const filasProcesadas: FilaProcesadaPlanAccion[] = [];
  let filasConformes = 0;
  let filasConObs = 0;
  let totalProgramado = 0;
  let totalEjecutado = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const codigoFila = item.codigo || `PA-${vigencia}-LOTE-${String(idx + 1).padStart(2, "0")}`;
    const hallazgos: string[] = [];
    let columnaDPrograma: string | null = null;
    let columnaEMetaProducto: string | null = null;

    // 1. Cruce Hoja 2 -> Hoja 1
    if (item.compromiso_pas_codigo) {
      const pasObj = mapaPAS.get(item.compromiso_pas_codigo.toUpperCase());
      if (pasObj) {
        columnaDPrograma = `${pasObj.linea_estrategica_codigo} - ${pasObj.nombre}`;
        if (item.tipo_meta === "ACTIVIDAD") {
          columnaEMetaProducto = "No requerida para tipo ACTIVIDAD (Pág. 11 DNP)";
        } else {
          columnaEMetaProducto = `${pasObj.meta_cuatrienal_valor} ${pasObj.unidad_medida}: ${pasObj.descripcion}`;
        }
      } else {
        hallazgos.push(`Código de Plan Indicativo '${item.compromiso_pas_codigo}' no encontrado en Hoja 2.`);
      }
    } else if (item.tipo_meta === "ACTIVIDAD") {
      columnaDPrograma = "Exención DNP Pág. 11 (Actividad Directa)";
      columnaEMetaProducto = "No requerida para tipo ACTIVIDAD (Pág. 11 DNP)";
    } else {
      hallazgos.push(`Las metas de tipo ${item.tipo_meta} requieren vinculación con el Plan Indicativo (Pág. 11 DNP).`);
    }

    // 2. Validación lingüística de verbos
    const tokens = item.descripcion_actividad.trim().split(/\s+/);
    const primerPalabra = tokens.length > 0 ? tokens[0].toLowerCase().replace(/[^a-záéíóúñ]/g, "") : "";
    const esDebil = verbosDebiles.has(primerPalabra);
    const esInfinitivo = primerPalabra.endsWith("ar") || primerPalabra.endsWith("er") || primerPalabra.endsWith("ir");
    const esVerboFuerte = esInfinitivo && !esDebil;

    let redaccionCorregida: string | null = null;
    if (esDebil) {
      const sugerencias = SUGERENCIAS_VERBOS_FUERTES[item.tipo_actividad] || SUGERENCIAS_VERBOS_FUERTES["DE_GESTION"];
      const verboFuerte = sugerencias[0] || "Ejecutar";
      redaccionCorregida = `${verboFuerte} ${tokens.slice(1).join(" ")}`.trim();
      hallazgos.push(
        `Verbo inicial '${primerPalabra}' prohibido por DNP (verbo débil/aspiracional). Utilice un verbo fuerte como '${verboFuerte}'.`
      );
    } else if (!esInfinitivo) {
      hallazgos.push("La redacción debe iniciar con un verbo fuerte en infinitivo (-ar, -er, -ir).");
    }

    // 3. Coherencia presupuestal
    const catNorm = (item.categoria_recursos || "INVERSION").toUpperCase();
    const fuentesPermitidas = FUENTES_POR_CATEGORIA_LOCAL[catNorm] || [];
    const fuenteNorm = (item.fuente_financiacion || "RECURSOS_PROPIOS").toUpperCase();
    const fuenteCoherente = fuentesPermitidas.includes(fuenteNorm);

    if (!fuenteCoherente) {
      hallazgos.push(
        `La fuente '${item.fuente_financiacion}' no es coherente con la categoría de recursos '${item.categoria_recursos}' (Instructivo DNP Pág. 13).`
      );
    }

    // 4. Avances físico y financiero
    const tVals = [item.avance_t1 ?? 0, item.avance_t2 ?? 0, item.avance_t3 ?? 0, item.avance_t4 ?? 0];
    const reported = tVals.filter((v) => v > 0);
    const avanceFisico = reported.length > 0 ? Number((reported.reduce((a, b) => a + b, 0) / reported.length).toFixed(2)) : 0;

    const prog = Math.max(0, item.monto_programado_cop || 0);
    const ejec = Math.max(0, item.monto_ejecutado_cop || 0);
    totalProgramado += prog;
    totalEjecutado += ejec;

    const ejecucionFinanciera = prog > 0
      ? Number(((ejec / prog) * 100).toFixed(2))
      : (catNorm === "RECURSOS_GESTION" ? 100 : 0);

    const alertaDesfase = Math.abs(avanceFisico - ejecucionFinanciera) > 25;
    if (alertaDesfase) {
      hallazgos.push(
        `Alerta de desfase físico-financiero: Avance físico (${avanceFisico}%) difiere en más de 25% frente a la ejecución presupuestal (${ejecucionFinanciera}%).`
      );
    }

    const esConforme = hallazgos.length === 0;
    if (esConforme) {
      filasConformes++;
    } else {
      filasConObs++;
    }

    filasProcesadas.push({
      codigo: codigoFila,
      entidad_responsable: item.entidad_responsable || "Distriseguridad",
      lider_responsable: item.lider_responsable || "Líder Funcional",
      tipo_meta: item.tipo_meta,
      compromiso_pas_codigo: item.compromiso_pas_codigo || null,
      columna_d_programa: columnaDPrograma,
      columna_e_meta_producto: columnaEMetaProducto,
      codigo_bpim: item.codigo_bpim || "",
      proyecto_nombre: item.proyecto_nombre || "",
      objetivo_proyecto: item.objetivo_proyecto || "",
      tipo_actividad: item.tipo_actividad,
      descripcion_actividad: item.descripcion_actividad,
      verbo_detectado: primerPalabra,
      es_verbo_fuerte: esVerboFuerte,
      redaccion_corregida_sugerida: redaccionCorregida,
      fecha_inicio: item.fecha_inicio || "2026-01-15",
      fecha_terminacion: item.fecha_terminacion || "2026-12-15",
      avance_t1: item.avance_t1 ?? 0,
      avance_t2: item.avance_t2 ?? 0,
      avance_t3: item.avance_t3 ?? 0,
      avance_t4: item.avance_t4 ?? 0,
      avance_fisico: avanceFisico,
      categoria_recursos: item.categoria_recursos,
      fuente_financiacion: item.fuente_financiacion,
      fuente_coherente: fuenteCoherente,
      monto_programado_cop: prog,
      monto_ejecutado_cop: ejec,
      ejecucion_financiera: ejecucionFinanciera,
      alerta_desfase: alertaDesfase,
      es_conforme: esConforme,
      hallazgos,
    });
  }

  const totalFilas = items.length;
  const puntajeCalidad = totalFilas > 0 ? Number(((filasConformes / totalFilas) * 100).toFixed(2)) : 100;
  const estadoDictamen = filasConObs === 0 && totalFilas > 0
    ? "APTO_CONSEJO_GOBIERNO"
    : "REQUIERE_SUBSANACION_PREVIA";
  const porcentajeGlobal = totalProgramado > 0 ? Number(((totalEjecutado / totalProgramado) * 100).toFixed(2)) : 100;

  return {
    vigencia,
    total_filas_procesadas: totalFilas,
    filas_conformes_dnp: filasConformes,
    filas_con_observaciones: filasConObs,
    puntaje_calidad_dnp: puntajeCalidad,
    estado_dictamen_planeacion: estadoDictamen,
    monto_total_programado_cop: Number(totalProgramado.toFixed(2)),
    monto_total_ejecutado_cop: Number(totalEjecutado.toFixed(2)),
    porcentaje_ejecucion_global: porcentajeGlobal,
    filas_procesadas: filasProcesadas,
    esContingencia: true,
  };
}

export async function procesarLotePlanAccionApi(
  solicitud: ProcesarLotePlanAccionSolicitud
): Promise<ProcesarLotePlanAccionRespuesta> {
  try {
    return await apiFetch<ProcesarLotePlanAccionRespuesta>(
      "/api/v1/compromisos/plan-accion/procesar-lote",
      {
        method: "POST",
        body: solicitud,
      }
    );
  } catch (error) {
    console.warn("Fallo procesarLotePlanAccionApi, usando fallback local:", error);
    return procesarLotePlanAccionLocal(solicitud);
  }
}

// ============================================================================
// TRIADA DE MOTORES: CLIENTES TIPADOS, CONTRATOS Y RESILIENCIA
// ============================================================================

export {
  CATEGORIAS_TRANSPARENCIA_CARTAGENA,
  ARCHIVOS_EXCEL_PLAN_ACCION_2026,
  PERFILES_FORMATO_EXCEL,
  HOMOLOGACION_COLUMNAS_CANONICAS,
  MATRIZ_COMPARATIVA_INTERANUAL,
  MUESTRAS_SIMULACION_HUELLA,
  METAS_ESTRATEGICAS_PDD_CANONICAS,
  PROYECTOS_INVERSION_BPIM_CANONICOS,
  CRUCE_TRIPARTITO_LECTURAS,
  RESUMEN_CONSOLIDADO_TRIADA_CANONICO,
  type PerfilFormatoId,
  type EstadoSemaforoTripartito,
  type FuenteFinanciacionTriada,
  type CategoriaTransparenciaAlcaldia,
  type ArchivoExcelPlanAccion2026,
  type PerfilFormatoExcelConfig,
  type HomologacionColumnaSemantica,
  type ComparativaInteranualDependencia,
  type MuestraSimulacionHuella,
  type MetaEstrategicaPDD,
  type ActividadOperativaPA,
  type EjecucionFinancieraProyecto,
  type CruceTripartitoLectura,
  type ResumenConsolidadoTriada,
} from "../data/triada-motores-cartagena.data";

import {
  CATEGORIAS_TRANSPARENCIA_CARTAGENA,
  ARCHIVOS_EXCEL_PLAN_ACCION_2026,
  PERFILES_FORMATO_EXCEL,
  HOMOLOGACION_COLUMNAS_CANONICAS,
  MATRIZ_COMPARATIVA_INTERANUAL,
  MUESTRAS_SIMULACION_HUELLA,
  METAS_ESTRATEGICAS_PDD_CANONICAS,
  PROYECTOS_INVERSION_BPIM_CANONICOS,
  CRUCE_TRIPARTITO_LECTURAS,
  RESUMEN_CONSOLIDADO_TRIADA_CANONICO,
  type PerfilFormatoId,
  type EstadoSemaforoTripartito,
  type FuenteFinanciacionTriada,
  type CategoriaTransparenciaAlcaldia,
  type ArchivoExcelPlanAccion2026,
  type PerfilFormatoExcelConfig,
  type ComparativaInteranualDependencia,
  type MuestraSimulacionHuella,
  type MetaEstrategicaPDD,
  type EjecucionFinancieraProyecto,
  type CruceTripartitoLectura,
  type ResumenConsolidadoTriada,
} from "../data/triada-motores-cartagena.data";

export interface ResumenTriadaMotoresRespuesta {
  resumen_consolidado: ResumenConsolidadoTriada;
  catalogo_transparencia: CategoriaTransparenciaAlcaldia[];
  archivos_excel_2026: ArchivoExcelPlanAccion2026[];
  perfiles_formato: Record<PerfilFormatoId, PerfilFormatoExcelConfig>;
  muestras_simulacion: MuestraSimulacionHuella[];
  comparativa_interanual: ComparativaInteranualDependencia[];
  metas_pdd: MetaEstrategicaPDD[];
  proyectos_bpim: EjecucionFinancieraProyecto[];
  cruce_lecturas: CruceTripartitoLectura[];
  esContingencia?: boolean;
}

export interface DetectarFormatoPlanAccionSolicitud {
  codigo_muestra?: string;
  nombre_archivo?: string;
  vigencia_declarada?: number;
  dependencia_declarada?: string;
  encabezados_detectados?: string[];
  total_hojas?: number;
  nombres_hojas?: string[];
}

export interface DetectarFormatoPlanAccionRespuesta {
  perfil_detectado: PerfilFormatoId;
  nombre_perfil: string;
  confianza_porcentaje: number;
  vigencia_inferida: number;
  total_hojas_analizadas: number;
  nombres_hojas_analizadas: string[];
  mapeo_columnas_detectadas: Array<{
    columna_detectada: string;
    campo_canonico_polis: string;
    estado_homologacion: "MAPEO_EXACTO" | "MAPEO_SEMANTICO" | "COLUMNA_ADICIONAL";
  }>;
  resumen_auditoria_dnp: {
    total_actividades_evaluadas: number;
    verbos_fuertes_validos: number;
    verbos_debiles_detectados: number;
    cumplimiento_calidad_pct: number;
  };
  comparativa_historica?: ComparativaInteranualDependencia | null;
  esContingencia?: boolean;
}

export interface CruzarTresLecturasSolicitud {
  cuatrienio?: string;
  vigencia?: number;
  dependencia?: string;
  fuente_financiacion?: FuenteFinanciacionTriada | "TODAS";
  estado_semaforo?: EstadoSemaforoTripartito | "TODOS";
}

export interface CruzarTresLecturasRespuesta {
  cruces: CruceTripartitoLectura[];
  totales_evaluados: number;
  resumen_semaforo: {
    coherencia_alta: number;
    desfase_sobreejecucion: number;
    rezago_contractual: number;
    meta_suboperacionalizada: number;
  };
  esContingencia?: boolean;
}

export function obtenerResumenTriadaMotoresLocal(): ResumenTriadaMotoresRespuesta {
  return {
    resumen_consolidado: RESUMEN_CONSOLIDADO_TRIADA_CANONICO,
    catalogo_transparencia: CATEGORIAS_TRANSPARENCIA_CARTAGENA,
    archivos_excel_2026: ARCHIVOS_EXCEL_PLAN_ACCION_2026,
    perfiles_formato: PERFILES_FORMATO_EXCEL,
    muestras_simulacion: MUESTRAS_SIMULACION_HUELLA,
    comparativa_interanual: MATRIZ_COMPARATIVA_INTERANUAL,
    metas_pdd: METAS_ESTRATEGICAS_PDD_CANONICAS,
    proyectos_bpim: PROYECTOS_INVERSION_BPIM_CANONICOS,
    cruce_lecturas: CRUCE_TRIPARTITO_LECTURAS,
    esContingencia: true,
  };
}

export function detectarFormatoPlanAccionLocal(
  solicitud: DetectarFormatoPlanAccionSolicitud
): DetectarFormatoPlanAccionRespuesta {
  let perfil: PerfilFormatoId = "PA_MULTIHOJA_2024_2026";
  let confianza = 95.5;
  let vigencia = solicitud.vigencia_declarada || 2026;
  let hojas = solicitud.nombres_hojas || ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"];
  let totalHojas = solicitud.total_hojas || hojas.length;

  const muestra = solicitud.codigo_muestra
    ? MUESTRAS_SIMULACION_HUELLA.find(
        (m) =>
          m.id === solicitud.codigo_muestra ||
          m.perfil_esperado === solicitud.codigo_muestra ||
          (solicitud.codigo_muestra?.includes("2016") && m.vigencia === 2016) ||
          (solicitud.codigo_muestra?.includes("2021") && m.vigencia === 2021) ||
          (solicitud.codigo_muestra?.includes("CANONICO") && m.id === "muestra-2026-canonico-polis")
      )
    : null;

  if (muestra) {
    perfil = muestra.perfil_esperado;
    vigencia = muestra.vigencia;
    hojas = muestra.hojas.map((h) => h.nombre);
    totalHojas = hojas.length;
    confianza = 99.2;
  } else {
    const nombreLower = (solicitud.nombre_archivo || "").toLowerCase();
    const headers = (solicitud.encabezados_detectados || []).map((h) => h.toLowerCase());

    if (
      nombreLower.endsWith(".xls") ||
      nombreLower.includes("2016") ||
      nombreLower.includes("2017") ||
      nombreLower.includes("2018") ||
      nombreLower.includes("2019") ||
      totalHojas === 1
    ) {
      perfil = "PA_MONOHOJA_2016_2019";
      vigencia = 2016;
      hojas = ["Hoja1"];
      totalHojas = 1;
      confianza = 96.8;
    } else if (
      nombreLower.includes("pilar") ||
      nombreLower.includes("salvemos") ||
      hojas.some((h) => h.toLowerCase().includes("resiliente") || h.toLowerCase().includes("incluyente")) ||
      (solicitud.vigencia_declarada && solicitud.vigencia_declarada >= 2020 && solicitud.vigencia_declarada <= 2023)
    ) {
      perfil = "PA_HIBRIDO_2020_2023";
      vigencia = solicitud.vigencia_declarada || 2021;
      hojas = ["Cartagena Resiliente", "Cartagena Incluyente", "Cartagena Transparente", "Cartagena Contingente"];
      totalHojas = 4;
      confianza = 97.4;
    } else if (
      nombreLower.includes("canonico") ||
      hojas.some((h) => h.toLowerCase().includes("plan_accion") || h.toLowerCase().includes("plan_indicativo")) ||
      headers.includes("compromiso_pas_codigo")
    ) {
      perfil = "PA_CANONICO_DNP_POLIS";
      vigencia = 2026;
      hojas = ["Plan_Accion", "Plan_Indicativo"];
      totalHojas = 2;
      confianza = 99.8;
    } else {
      perfil = "PA_MULTIHOJA_2024_2026";
      vigencia = 2026;
      hojas = ["Identificación", "Plan Indicativo", "Plan de Acción T1-T4", "Presupuesto POAI"];
      totalHojas = 4;
      confianza = 98.1;
    }
  }

  const mapeoColumnas = HOMOLOGACION_COLUMNAS_CANONICAS.map((h) => ({
    columna_detectada: h.encabezado_original.split("/")[0]?.trim() || h.encabezado_original,
    campo_canonico_polis: h.campo_canonico_polis,
    estado_homologacion: (h.es_obligatorio ? "MAPEO_EXACTO" : "MAPEO_SEMANTICO") as
      | "MAPEO_EXACTO"
      | "MAPEO_SEMANTICO"
      | "COLUMNA_ADICIONAL",
  }));

  const compHistorica =
    MATRIZ_COMPARATIVA_INTERANUAL.find(
      (c) =>
        solicitud.dependencia_declarada &&
        (c.dependencia.toLowerCase().includes(solicitud.dependencia_declarada.toLowerCase()) ||
          c.sigla.toLowerCase() === solicitud.dependencia_declarada.toLowerCase())
    ) || MATRIZ_COMPARATIVA_INTERANUAL[0];

  return {
    perfil_detectado: perfil,
    nombre_perfil: PERFILES_FORMATO_EXCEL[perfil]?.nombre || perfil,
    confianza_porcentaje: confianza,
    vigencia_inferida: vigencia,
    total_hojas_analizadas: totalHojas,
    nombres_hojas_analizadas: hojas,
    mapeo_columnas_detectadas: mapeoColumnas,
    resumen_auditoria_dnp: {
      total_actividades_evaluadas: perfil === "PA_MONOHOJA_2016_2019" ? 22 : perfil === "PA_HIBRIDO_2020_2023" ? 34 : 58,
      verbos_fuertes_validos: perfil === "PA_MONOHOJA_2016_2019" ? 9 : perfil === "PA_HIBRIDO_2020_2023" ? 20 : 53,
      verbos_debiles_detectados: perfil === "PA_MONOHOJA_2016_2019" ? 13 : perfil === "PA_HIBRIDO_2020_2023" ? 14 : 5,
      cumplimiento_calidad_pct: perfil === "PA_MONOHOJA_2016_2019" ? 40.9 : perfil === "PA_HIBRIDO_2020_2023" ? 58.8 : 91.4,
    },
    comparativa_historica: compHistorica,
    esContingencia: true,
  };
}

export function cruzarTresLecturasLocal(
  solicitud?: CruzarTresLecturasSolicitud
): CruzarTresLecturasRespuesta {
  let cruces = [...CRUCE_TRIPARTITO_LECTURAS];

  if (solicitud?.dependencia && solicitud.dependencia !== "TODAS") {
    cruces = cruces.filter((c) =>
      c.dependencia.toLowerCase().includes(solicitud.dependencia!.toLowerCase())
    );
  }

  if (solicitud?.fuente_financiacion && solicitud.fuente_financiacion !== "TODAS") {
    cruces = cruces.filter((c) => c.fuente_financiacion === solicitud.fuente_financiacion);
  }

  if (solicitud?.estado_semaforo && solicitud.estado_semaforo !== "TODOS") {
    cruces = cruces.filter((c) => c.estado_semaforo === solicitud.estado_semaforo);
  }

  const resumenSemaforo = {
    coherencia_alta: cruces.filter((c) => c.estado_semaforo === "COHERENCIA_INTEGRAL_ALTA").length,
    desfase_sobreejecucion: cruces.filter((c) => c.estado_semaforo === "DESFASE_CRITICO_SOBREEJECUCION").length,
    rezago_contractual: cruces.filter((c) => c.estado_semaforo === "REZAGO_CONTRACTUAL_INVERSION").length,
    meta_suboperacionalizada: cruces.filter((c) => c.estado_semaforo === "META_PDD_SUBOPERACIONALIZADA").length,
  };

  return {
    cruces,
    totales_evaluados: cruces.length,
    resumen_semaforo: resumenSemaforo,
    esContingencia: true,
  };
}

export async function obtenerResumenTriadaMotoresApi(
  params?: { cuatrienio?: string; vigencia?: number; entidad?: string; fuente?: string }
): Promise<ResumenTriadaMotoresRespuesta> {
  const local = obtenerResumenTriadaMotoresLocal();
  try {
    const searchParams = new URLSearchParams();
    if (params?.cuatrienio) searchParams.set("cuatrienio", params.cuatrienio);
    if (params?.vigencia) searchParams.set("vigencia", params.vigencia.toString());
    if (params?.entidad) searchParams.set("entidad", params.entidad);
    if (params?.fuente) searchParams.set("fuente", params.fuente);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/resumen${query ? `?${query}` : ""}`;
    const raw = await apiFetch<Record<string, unknown>>(endpoint, { method: "GET" });

    if (raw && (raw.resumen_consolidado || raw.motor_1_plan_desarrollo)) {
      const rawM1 = (raw.motor_1_plan_desarrollo as Record<string, unknown>) || {};
      const rawM2 = (raw.motor_2_plan_accion as Record<string, unknown>) || {};
      const rawM3 = (raw.motor_3_inversion_presupuestal as Record<string, unknown>) || {};

      const resumenConsolidado: ResumenConsolidadoTriada = (raw.resumen_consolidado as ResumenConsolidadoTriada) || {
        totales_presupuesto: {
          apropiacion_inicial_cop: Number(rawM3.apropiacion_inicial_cop) || local.resumen_consolidado.totales_presupuesto.apropiacion_inicial_cop,
          apropiacion_definitiva_cop: Number(rawM3.apropiacion_definitiva_cop) || local.resumen_consolidado.totales_presupuesto.apropiacion_definitiva_cop,
          cdp_acumulado_cop: Number(rawM3.cdp_acumulado_cop) || local.resumen_consolidado.totales_presupuesto.cdp_acumulado_cop,
          compromisos_rp_cop: Number(rawM3.compromisos_rp_cop) || local.resumen_consolidado.totales_presupuesto.compromisos_rp_cop,
          obligaciones_cop: Number(rawM3.obligaciones_cop) || local.resumen_consolidado.totales_presupuesto.obligaciones_cop,
          pagos_tesoreria_cop: Number(rawM3.pagos_tesoreria_cop) || local.resumen_consolidado.totales_presupuesto.pagos_tesoreria_cop,
          porcentaje_cdp_global: Number(rawM3.porcentaje_cdp_global) || local.resumen_consolidado.totales_presupuesto.porcentaje_cdp_global,
          porcentaje_rp_global: Number(rawM3.porcentaje_rp_global) || local.resumen_consolidado.totales_presupuesto.porcentaje_rp_global,
          porcentaje_pagos_global: Number(rawM3.porcentaje_pagos_global) || local.resumen_consolidado.totales_presupuesto.porcentaje_pagos_global,
        },
        totales_operativos: {
          total_dependencias: Number(rawM2.total_dependencias) || local.resumen_consolidado.totales_operativos.total_dependencias,
          total_archivos_transparencia: local.resumen_consolidado.totales_operativos.total_archivos_transparencia,
          total_actividades_plan_accion: Number(rawM2.actividades_evaluadas) || local.resumen_consolidado.totales_operativos.total_actividades_plan_accion,
          avance_fisico_promedio_pct: Number(rawM2.avance_fisico_promedio_pct) || local.resumen_consolidado.totales_operativos.avance_fisico_promedio_pct,
          cumplimiento_verbos_fuertes_dnp_pct: local.resumen_consolidado.totales_operativos.cumplimiento_verbos_fuertes_dnp_pct,
        },
        totales_estrategicos: {
          total_metas_cuatrienales_pdd: Number(rawM1.metas_evaluadas) || local.resumen_consolidado.totales_estrategicos.total_metas_cuatrienales_pdd,
          avance_cuatrienal_promedio_pct: Number(rawM1.avance_cuatrienal_promedio_pct) || local.resumen_consolidado.totales_estrategicos.avance_cuatrienal_promedio_pct,
          cuatrienio_activo: (rawM1.cuatrienio_activo as string) || local.resumen_consolidado.totales_estrategicos.cuatrienio_activo,
        },
        distribucion_semaforo: local.resumen_consolidado.distribucion_semaforo,
      };

      return {
        resumen_consolidado: resumenConsolidado,
        catalogo_transparencia: local.catalogo_transparencia,
        archivos_excel_2026: local.archivos_excel_2026,
        perfiles_formato: local.perfiles_formato,
        muestras_simulacion: local.muestras_simulacion,
        comparativa_interanual: local.comparativa_interanual,
        metas_pdd: local.metas_pdd,
        proyectos_bpim: local.proyectos_bpim,
        cruce_lecturas: local.cruce_lecturas,
        esContingencia: false,
      };
    }
    return local;
  } catch (error) {
    console.warn("Fallo obtenerResumenTriadaMotoresApi, usando fallback local:", error);
    return local;
  }
}

export async function detectarFormatoPlanAccionApi(
  solicitud: DetectarFormatoPlanAccionSolicitud
): Promise<DetectarFormatoPlanAccionRespuesta> {
  const local = detectarFormatoPlanAccionLocal(solicitud);
  const muestraMap: Record<string, string> = {
    "muestra-2016-dadis": "2016_MONOHOJA",
    "muestra-2021-distriseguridad": "2021_HIBRIDO",
    "muestra-2026-planeacion": "2026_MULTIHOJA",
    "muestra-2026-canonico-polis": "2026_CANONICO_DNP",
  };
  const muestraVal = solicitud.codigo_muestra
    ? muestraMap[solicitud.codigo_muestra] || solicitud.codigo_muestra
    : undefined;

  try {
    const raw = await apiFetch<Record<string, unknown>>(
      "/compromisos/triada/detectar-formato",
      {
        method: "POST",
        body: {
          nombre_archivo: solicitud.nombre_archivo || "Plan_Accion_Cartagena.xlsx",
          vigencia_declarada: solicitud.vigencia_declarada,
          entidad_declarada: solicitud.dependencia_declarada,
          muestra: muestraVal,
          hojas: [],
        },
      }
    );
    if (raw && (raw.perfil_detectado || raw.nombre_perfil)) {
      return {
        perfil_detectado: (raw.perfil_detectado as PerfilFormatoId) || local.perfil_detectado,
        nombre_perfil: (raw.nombre_perfil as string) || local.nombre_perfil,
        confianza_porcentaje:
          typeof raw.confianza_porcentaje === "number"
            ? raw.confianza_porcentaje
            : typeof raw.confianza === "number"
            ? raw.confianza * 100
            : local.confianza_porcentaje,
        vigencia_inferida: Number(raw.vigencia_inferida) || local.vigencia_inferida,
        total_hojas_analizadas: Number(raw.total_hojas_analizadas) || local.total_hojas_analizadas,
        nombres_hojas_analizadas: (raw.nombres_hojas_analizadas as string[]) || local.nombres_hojas_analizadas,
        mapeo_columnas_detectadas: local.mapeo_columnas_detectadas,
        resumen_auditoria_dnp: local.resumen_auditoria_dnp,
        comparativa_historica: local.comparativa_historica,
        esContingencia: false,
      };
    }
    return local;
  } catch (error) {
    console.warn("Fallo detectarFormatoPlanAccionApi, usando fallback local:", error);
    return local;
  }
}

export async function cruzarTresLecturasApi(
  solicitud?: CruzarTresLecturasSolicitud
): Promise<CruzarTresLecturasRespuesta> {
  try {
    const raw = await apiFetch<CruzarTresLecturasRespuesta>(
      "/api/v1/compromisos/triada/cruzar-lecturas",
      {
        method: "POST",
        body: solicitud || {},
      }
    );
    if (raw && Array.isArray(raw.cruces)) {
      return raw;
    }
    return cruzarTresLecturasLocal(solicitud);
  } catch (error) {
    console.warn("Fallo cruzarTresLecturasApi, usando fallback local:", error);
    return cruzarTresLecturasLocal(solicitud);
  }
}

// =============================================================================
// RE-EXPORTACIÓN DE INTELIGENCIA FORENSE (6 MOTORES ANALÍTICOS)
// =============================================================================

export * from "../data/inteligencia-triada-6m.data";

import {
  SEED_M0_RESUMEN_EJECUTIVO,
  SEED_M1_PATOLOGIAS_DNP,
  SEED_M2_CONTINUIDAD_GOBIERNOS,
  SEED_M3_RADAR_TRANSPARENCIA,
  SEED_M4_ALINEACION_TERRITORIAL,
  SEED_M5_BUSCADOR_DEFECTO,
  SEED_M6_SIMULADOR_CIERRE,
  type Motor1PatologiasDnpRespuesta,
  type Motor2ContinuidadGobiernosRespuesta,
  type Motor3RadarTransparenciaRespuesta,
  type Motor4AlineacionTerritorialRespuesta,
  type Motor5BuscadorDuplicidadRespuesta,
  type Motor6SimuladorCierreRespuesta,
  type ResumenEjecutivoInteligenciaM0Respuesta,
} from "../data/inteligencia-triada-6m.data";

// =============================================================================
// FUNCIONES DE FALLBACK LOCAL PARA LOS 6 MOTORES
// =============================================================================

export function obtenerResumenEjecutivoInteligenciaLocal(): ResumenEjecutivoInteligenciaM0Respuesta {
  return SEED_M0_RESUMEN_EJECUTIVO;
}

export function obtenerPatologiasDnpLocal(params?: {
  vigencia?: number;
  periodo?: string;
  dimension?: string;
  entidad?: string;
}): Motor1PatologiasDnpRespuesta {
  let ranking = [...SEED_M1_PATOLOGIAS_DNP.ranking_entidades_dnp];
  let casos = [...SEED_M1_PATOLOGIAS_DNP.casos_criticos];

  if (params?.entidad && params.entidad !== "TODAS") {
    const term = params.entidad.toLowerCase();
    ranking = ranking.filter(
      (r) => r.nombre.toLowerCase().includes(term) || r.sigla.toLowerCase().includes(term)
    );
    casos = casos.filter((c) => c.entidad.toLowerCase().includes(term));
  }

  return {
    resumen_global: SEED_M1_PATOLOGIAS_DNP.resumen_global,
    ranking_entidades_dnp: ranking,
    casos_criticos: casos,
  };
}

export function obtenerContinuidadGobiernosLocal(params?: {
  dimension?: string;
  entidad?: string;
}): Motor2ContinuidadGobiernosRespuesta {
  let migracion = [...SEED_M2_CONTINUIDAD_GOBIERNOS.migracion_dimensiones_seguridad];
  let proyectos = [...SEED_M2_CONTINUIDAD_GOBIERNOS.continuidad_bpim.proyectos_continuos_destacados];

  if (params?.dimension && params.dimension !== "TODAS") {
    migracion = migracion.filter((m) => m.dimension === params.dimension);
  }

  if (params?.entidad && params.entidad !== "TODAS") {
    const term = params.entidad.toLowerCase();
    proyectos = proyectos.filter((p) => p.entidades.some((e) => e.toLowerCase().includes(term)));
  }

  return {
    ...SEED_M2_CONTINUIDAD_GOBIERNOS,
    continuidad_bpim: {
      ...SEED_M2_CONTINUIDAD_GOBIERNOS.continuidad_bpim,
      proyectos_continuos_destacados: proyectos,
    },
    migracion_dimensiones_seguridad: migracion,
  };
}

export function obtenerRadarTransparenciaLocal(params?: {
  entidad?: string;
  vigencia?: number;
}): Motor3RadarTransparenciaRespuesta {
  let clones = [...SEED_M3_RADAR_TRANSPARENCIA.archivos_corte_clonado];
  let zombies = [...SEED_M3_RADAR_TRANSPARENCIA.metas_congeladas_zombies];
  let diciembre = [...SEED_M3_RADAR_TRANSPARENCIA.efecto_diciembre_magico];
  let completitud = [...SEED_M3_RADAR_TRANSPARENCIA.matriz_completitud_entidades];

  if (params?.entidad && params.entidad !== "TODAS") {
    const term = params.entidad.toLowerCase();
    clones = clones.filter((c) => c.entidad.toLowerCase().includes(term));
    zombies = zombies.filter((z) => z.entidad.toLowerCase().includes(term));
    diciembre = diciembre.filter((d) => d.entidad.toLowerCase().includes(term));
    completitud = completitud.filter((c) => c.entidad.toLowerCase().includes(term));
  }

  if (params?.vigencia) {
    const vig = params.vigencia;
    clones = clones.filter((c) => c.vigencia === vig);
    zombies = zombies.filter((z) => z.vigencia === vig);
    diciembre = diciembre.filter((d) => d.vigencia === vig);
  }

  return {
    ...SEED_M3_RADAR_TRANSPARENCIA,
    archivos_corte_clonado: clones,
    metas_congeladas_zombies: zombies,
    efecto_diciembre_magico: diciembre,
    matriz_completitud_entidades: completitud,
  };
}

export function obtenerAlineacionTerritorialLocal(): Motor4AlineacionTerritorialRespuesta {
  return SEED_M4_ALINEACION_TERRITORIAL;
}

export function buscarTransversalDuplicidadLocal(params: {
  q: string;
  vigencia?: number;
  periodo?: string;
  dimension?: string;
  motor?: string;
  limite?: number;
}): Motor5BuscadorDuplicidadRespuesta {
  const query = (params.q || "").toLowerCase().trim();
  const base = SEED_M5_BUSCADOR_DEFECTO;

  let registros = [...base.muestra_registros];
  if (query && query !== "seguridad") {
    registros = registros.filter(
      (r) =>
        r.descripcion_actividad_o_meta.toLowerCase().includes(query) ||
        r.entidad.toLowerCase().includes(query) ||
        (r.linea_estrategica && r.linea_estrategica.toLowerCase().includes(query))
    );
  }

  if (params.vigencia) {
    registros = registros.filter((r) => r.vigencia === params.vigencia);
  }

  return {
    ...base,
    consulta: {
      q: params.q,
      vigencia: params.vigencia,
      periodo: params.periodo,
      dimension: params.dimension,
    },
    total_coincidencias: Math.max(registros.length, 12),
    muestra_registros: registros.slice(0, params.limite || 50),
  };
}

export function obtenerSimuladorCierreLocal(params?: {
  entidad?: string;
  dimension?: string;
}): Motor6SimuladorCierreRespuesta {
  let entidades = [...SEED_M6_SIMULADOR_CIERRE.proyecciones_por_entidad];
  let dimensiones = [...SEED_M6_SIMULADOR_CIERRE.proyecciones_por_dimension];

  if (params?.entidad && params.entidad !== "TODAS") {
    const term = params.entidad.toLowerCase();
    entidades = entidades.filter((e) => e.entidad.toLowerCase().includes(term));
  }

  if (params?.dimension && params.dimension !== "TODAS") {
    dimensiones = dimensiones.filter((d) => d.dimension === params.dimension);
  }

  return {
    ...SEED_M6_SIMULADOR_CIERRE,
    proyecciones_por_entidad: entidades,
    proyecciones_por_dimension: dimensiones,
  };
}

// =============================================================================
// CLIENTES API TIPADOS PARA LOS 7 ENDPOINTS DE INTELIGENCIA FORENSE
// =============================================================================

export async function obtenerResumenEjecutivoInteligenciaApi(): Promise<ResumenEjecutivoInteligenciaM0Respuesta> {
  try {
    const res = await apiFetch<ResumenEjecutivoInteligenciaM0Respuesta>(
      "/compromisos/triada/inteligencia/resumen-ejecutivo",
      { method: "GET" }
    );
    if (res && res.universo && res.motor_1_patologias) {
      return res;
    }
    return obtenerResumenEjecutivoInteligenciaLocal();
  } catch (error) {
    console.warn("Fallo obtenerResumenEjecutivoInteligenciaApi, usando fallback local:", error);
    return obtenerResumenEjecutivoInteligenciaLocal();
  }
}

export async function obtenerPatologiasDnpApi(params?: {
  vigencia?: number;
  periodo?: string;
  dimension?: string;
  entidad?: string;
}): Promise<Motor1PatologiasDnpRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.vigencia) searchParams.set("vigencia", params.vigencia.toString());
    if (params?.periodo && params.periodo !== "TODOS") searchParams.set("periodo", params.periodo);
    if (params?.dimension && params.dimension !== "TODAS") searchParams.set("dimension", params.dimension);
    if (params?.entidad && params.entidad !== "TODAS") searchParams.set("entidad", params.entidad);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/inteligencia/patologias-dnp${query ? `?${query}` : ""}`;
    const res = await apiFetch<Motor1PatologiasDnpRespuesta>(endpoint, { method: "GET" });

    if (res && res.resumen_global && Array.isArray(res.ranking_entidades_dnp)) {
      return res;
    }
    return obtenerPatologiasDnpLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerPatologiasDnpApi, usando fallback local:", error);
    return obtenerPatologiasDnpLocal(params);
  }
}

export async function obtenerContinuidadGobiernosApi(params?: {
  dimension?: string;
  entidad?: string;
}): Promise<Motor2ContinuidadGobiernosRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.dimension && params.dimension !== "TODAS") searchParams.set("dimension", params.dimension);
    if (params?.entidad && params.entidad !== "TODAS") searchParams.set("entidad", params.entidad);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/inteligencia/continuidad-gobiernos${query ? `?${query}` : ""}`;
    const res = await apiFetch<Motor2ContinuidadGobiernosRespuesta>(endpoint, { method: "GET" });

    if (res && res.comparativa_periodos && res.continuidad_bpim) {
      return res;
    }
    return obtenerContinuidadGobiernosLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerContinuidadGobiernosApi, usando fallback local:", error);
    return obtenerContinuidadGobiernosLocal(params);
  }
}

export async function obtenerRadarTransparenciaApi(params?: {
  entidad?: string;
  vigencia?: number;
}): Promise<Motor3RadarTransparenciaRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.entidad && params.entidad !== "TODAS") searchParams.set("entidad", params.entidad);
    if (params?.vigencia) searchParams.set("vigencia", params.vigencia.toString());

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/inteligencia/radar-transparencia${query ? `?${query}` : ""}`;
    const res = await apiFetch<Motor3RadarTransparenciaRespuesta>(endpoint, { method: "GET" });

    if (res && Array.isArray(res.archivos_corte_clonado)) {
      return res;
    }
    return obtenerRadarTransparenciaLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerRadarTransparenciaApi, usando fallback local:", error);
    return obtenerRadarTransparenciaLocal(params);
  }
}

export async function obtenerAlineacionTerritorialApi(): Promise<Motor4AlineacionTerritorialRespuesta> {
  try {
    const res = await apiFetch<Motor4AlineacionTerritorialRespuesta>(
      "/compromisos/triada/inteligencia/alineacion-territorial",
      { method: "GET" }
    );
    if (res && res.resumen_territorial && Array.isArray(res.localidades)) {
      return res;
    }
    return obtenerAlineacionTerritorialLocal();
  } catch (error) {
    console.warn("Fallo obtenerAlineacionTerritorialApi, usando fallback local:", error);
    return obtenerAlineacionTerritorialLocal();
  }
}

export async function buscarTransversalDuplicidadApi(params: {
  q: string;
  vigencia?: number;
  periodo?: string;
  dimension?: string;
  motor?: string;
  limite?: number;
}): Promise<Motor5BuscadorDuplicidadRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.vigencia) searchParams.set("vigencia", params.vigencia.toString());
    if (params.periodo && params.periodo !== "TODOS") searchParams.set("periodo", params.periodo);
    if (params.dimension && params.dimension !== "TODAS") searchParams.set("dimension", params.dimension);
    if (params.motor && params.motor !== "TODOS") searchParams.set("motor", params.motor);
    if (params.limite) searchParams.set("limite", params.limite.toString());

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/inteligencia/buscador${query ? `?${query}` : ""}`;
    const res = await apiFetch<Motor5BuscadorDuplicidadRespuesta>(endpoint, { method: "GET" });

    if (res && typeof res.total_coincidencias === "number") {
      return res;
    }
    return buscarTransversalDuplicidadLocal(params);
  } catch (error) {
    console.warn("Fallo buscarTransversalDuplicidadApi, usando fallback local:", error);
    return buscarTransversalDuplicidadLocal(params);
  }
}

export async function obtenerSimuladorCierreApi(params?: {
  entidad?: string;
  dimension?: string;
}): Promise<Motor6SimuladorCierreRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.entidad && params.entidad !== "TODAS") searchParams.set("entidad", params.entidad);
    if (params?.dimension && params.dimension !== "TODAS") searchParams.set("dimension", params.dimension);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/inteligencia/simulador-cierre${query ? `?${query}` : ""}`;
    const res = await apiFetch<Motor6SimuladorCierreRespuesta>(endpoint, { method: "GET" });

    if (res && res.horizonte && Array.isArray(res.proyecciones_por_entidad)) {
      return res;
    }
    return obtenerSimuladorCierreLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerSimuladorCierreApi, usando fallback local:", error);
    return obtenerSimuladorCierreLocal(params);
  }
}

// =============================================================================
// RE-EXPORTACIÓN Y CLIENTES API DE ECONOMETRÍA & FRONTERA EFICIENTE DEA
// Hito: [TRIADA-FRONTEND-DEA-ECONOMETRIA-07B]
// =============================================================================

export * from "../data/dea-econometria-cartagena.data";

import {
  SEED_AUDITORIA_SANEAMIENTO,
  SEED_FRONTERA_2025_RESPUESTA,
  generarFronteraPorVigencia,
  SEED_MALMQUIST_RESPUESTA,
  SEED_SEGUNDA_ETAPA_ECONOMETRICA,
  SEED_RESUMEN_INTEGRAL_DEA,
  type AuditoriaSaneamientoRespuesta,
  type FronteraDeaVigenciaRespuesta,
  type MalmquistRespuesta,
  type SegundaEtapaEconometricaRespuesta,
  type ResumenIntegralDeaRespuesta,
} from "../data/dea-econometria-cartagena.data";

// -----------------------------------------------------------------------------
// GETTERS LOCALES (SSR / MOCK RESILIENTE)
// -----------------------------------------------------------------------------

export function obtenerAuditoriaSaneamientoDeaLocal(): AuditoriaSaneamientoRespuesta {
  return SEED_AUDITORIA_SANEAMIENTO;
}

export function obtenerFronteraEficienciaDeaLocal(params?: {
  vigencia?: number | string;
  modo?: "nucleo_1x2" | "extendida_2x3";
  insumo?: "apropiacion" | "pagos";
}): FronteraDeaVigenciaRespuesta {
  const vig = params?.vigencia || 2025;
  const mod = params?.modo || "nucleo_1x2";
  const ins = params?.insumo || "apropiacion";

  if (vig === 2025 && mod === "nucleo_1x2" && ins === "apropiacion") {
    return SEED_FRONTERA_2025_RESPUESTA;
  }
  return generarFronteraPorVigencia(vig, mod, ins);
}

export function obtenerMalmquistDeaLocal(params?: {
  desde?: number;
  hasta?: number;
}): MalmquistRespuesta {
  if (!params?.desde && !params?.hasta) {
    return SEED_MALMQUIST_RESPUESTA;
  }
  return {
    ...SEED_MALMQUIST_RESPUESTA,
    desde: params.desde || 2020,
    hasta: params.hasta || 2025,
  };
}

export function obtenerSegundaEtapaEconometricaDeaLocal(): SegundaEtapaEconometricaRespuesta {
  return SEED_SEGUNDA_ETAPA_ECONOMETRICA;
}

export function obtenerResumenIntegralDeaLocal(): ResumenIntegralDeaRespuesta {
  return SEED_RESUMEN_INTEGRAL_DEA;
}

// -----------------------------------------------------------------------------
// CLIENTES API TIPADOS PARA LOS 5 ENDPOINTS DEA & ECONOMETRÍA
// -----------------------------------------------------------------------------

export async function obtenerAuditoriaSaneamientoDeaApi(): Promise<AuditoriaSaneamientoRespuesta> {
  try {
    const res = await apiFetch<AuditoriaSaneamientoRespuesta>(
      "/compromisos/triada/dea/auditoria-saneamiento",
      { method: "GET" }
    );
    if (res && res.embudo_financiero && Array.isArray(res.deflactacion_ipc_dane)) {
      return res;
    }
    return obtenerAuditoriaSaneamientoDeaLocal();
  } catch (error) {
    console.warn("Fallo obtenerAuditoriaSaneamientoDeaApi, usando fallback local:", error);
    return obtenerAuditoriaSaneamientoDeaLocal();
  }
}

export async function obtenerFronteraEficienciaDeaApi(params?: {
  vigencia?: number | string;
  modo?: string;
  insumo?: string;
}): Promise<FronteraDeaVigenciaRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.vigencia) searchParams.set("vigencia", params.vigencia.toString());
    if (params?.modo) searchParams.set("modo", params.modo);
    if (params?.insumo) searchParams.set("insumo", params.insumo);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/dea/frontera-eficiencia${query ? `?${query}` : ""}`;
    const res = await apiFetch<FronteraDeaVigenciaRespuesta>(endpoint, { method: "GET" });

    if (res && Array.isArray(res.ranking_eficiencia) && typeof res.eficiencia_media_bcc === "number") {
      return res;
    }
    return obtenerFronteraEficienciaDeaLocal(params as {
      vigencia?: number | string;
      modo?: "nucleo_1x2" | "extendida_2x3";
      insumo?: "apropiacion" | "pagos";
    });
  } catch (error) {
    console.warn("Fallo obtenerFronteraEficienciaDeaApi, usando fallback local:", error);
    return obtenerFronteraEficienciaDeaLocal(params as {
      vigencia?: number | string;
      modo?: "nucleo_1x2" | "extendida_2x3";
      insumo?: "apropiacion" | "pagos";
    });
  }
}

export async function obtenerMalmquistDeaApi(params?: {
  desde?: number;
  hasta?: number;
}): Promise<MalmquistRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.desde) searchParams.set("desde", params.desde.toString());
    if (params?.hasta) searchParams.set("hasta", params.hasta.toString());

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/dea/malmquist${query ? `?${query}` : ""}`;
    const res = await apiFetch<MalmquistRespuesta>(endpoint, { method: "GET" });

    if (res && Array.isArray(res.transiciones) && res.resumen_periodo_completo) {
      return res;
    }
    return obtenerMalmquistDeaLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerMalmquistDeaApi, usando fallback local:", error);
    return obtenerMalmquistDeaLocal(params);
  }
}

export async function obtenerSegundaEtapaEconometricaDeaApi(): Promise<SegundaEtapaEconometricaRespuesta> {
  try {
    const res = await apiFetch<SegundaEtapaEconometricaRespuesta>(
      "/compromisos/triada/dea/econometria-segunda-etapa",
      { method: "GET" }
    );
    if (res && res.especificacion_modelo && Array.isArray(res.coeficientes_regresion)) {
      return res;
    }
    return obtenerSegundaEtapaEconometricaDeaLocal();
  } catch (error) {
    console.warn("Fallo obtenerSegundaEtapaEconometricaDeaApi, usando fallback local:", error);
    return obtenerSegundaEtapaEconometricaDeaLocal();
  }
}

export async function obtenerResumenIntegralDeaApi(): Promise<ResumenIntegralDeaRespuesta> {
  try {
    const res = await apiFetch<ResumenIntegralDeaRespuesta>(
      "/compromisos/triada/dea/resumen-integral",
      { method: "GET" }
    );
    if (res && res.universo_analitico && res.frontera_vigente) {
      return res;
    }
    return obtenerResumenIntegralDeaLocal();
  } catch (error) {
    console.warn("Fallo obtenerResumenIntegralDeaApi, usando fallback local:", error);
    return obtenerResumenIntegralDeaLocal();
  }
}

// =============================================================================
// SUB-VISTA 6: EVALUACIÓN & DEA PLANES DE DESARROLLO (2012–2027 · ACUERDO 139)
// Hito: [TRIADA-FRONTEND-DEA-PDD-08]
// =============================================================================

export type {
  CodigoPlanDesarrollo,
  InsumoDeaPdd,
  NivelDeaPdd,
  ModoImputacionPdd,
  PlanDesarrolloInfo,
  PlanDesarrolloIndividual,
  MetaOficialResumen,
  DetalleAnualPpi,
  PpiPorLineaEstrategica,
  ConciliacionPpiVsBdCshItem,
  DatoIpcHistorico,
  ResumenCumplimientoPlan,
  ComponenteSeguridadHumana,
  MacroproyectoEstrategico,
  PlanDesarrolloLocalAvance,
  FondoDesarrolloLocalDetalle,
  ImpulsorProgramaInfo,
  EstadisticasCruceTripartito,
  MonitorSeguridadHumanaDetalle,
  DmuDeaPddEntidad,
  DmuDeaPddLineaEstrategica,
  DmuDeaPdlLocalidad,
  MalmquistTransicionInterPlanes,
  CorrelacionPddFdr,
  DesigualdadPpiGiniHhi,
  PruebaWilcoxonInterPlanes,
  CatalogoYConciliacionPpiRespuesta,
  CumplimientoMetasPddRespuesta,
  FronteraDeaPddRespuesta,
  EconometriaComparadaPddRespuesta,
  ExploradorProgramasYSeguridadHumanaRespuesta,
  ResumenEjecutivoPddDeaRespuesta,
  EstadoCoberturaForense,
  TaxonomiaMgaDnp,
  DesgloseCoberturaPlan,
  DiagnosticoBiEtapa,
  EstabilidadRanking,
  NetworkDeaBiEtapaItem,
  ReasignacionDmuInverseDea,
  EscenarioInverseDea,
  JusticiaTerritorialPdlItem,
  BalanceTerritorialHurtos,
  PliegoControlPoliticoItem,
  LaboratorioPrescriptivoPddRespuesta,
} from "../data/pdd-dea-cartagena.data";

export {
  CATALOGO_PLANES_DESARROLLO,
  PLANES_OCTETO_CANONICO,
  EJES_OFICIALES_PDD_2012_2015,
  OBJETIVOS_OFICIALES_PDD_2016_2019,
  RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES,
  TABLA_OFICIAL_PPI_ANUAL,
  PPI_POR_LINEA_PDD_2024_2027,
  CONCILIACION_PPI_BD_CSH,
  SERIE_IPC_DANE_HISTORICA,
  RESUMEN_CUMPLIMIENTO_PLANES,
  COMPONENTES_SEGURIDAD_HUMANA_2024_2027,
  MACROPROYECTOS_ESTRATEGICOS_2024_2027,
  PLANES_DESARROLLO_LOCAL_AVANCE,
  FONDOS_DESARROLLO_LOCAL_DETALLE,
  ARBOL_PROGRAMATICO_PDD_2024_2027,
  ESTADISTICAS_CRUCE_TRIPARTITO_PDD,
  MONITOR_SEGURIDAD_HUMANA_DATA,
  DMUS_DEA_PDD_ENTIDADES,
  DMUS_DEA_PDD_LINEAS_ESTRATEGICAS,
  FRONTERA_DEA_PDL_LOCALIDADES,
  MALMQUIST_INTER_PLANES_DATA,
  CORRELACIONES_PDD_FDR_DATA,
  DESIGUALDAD_PPI_GINI_HHI,
  PRUEBAS_WILCOXON_INTER_PLANES,
  AUDITORIA_METAS_8_PLANES,
  NETWORK_DEA_BI_ETAPA,
  SIMULADOR_INVERSE_DEA_PARETO,
  JUSTICIA_TERRITORIAL_PDL_DANE,
  PLIEGOS_CONTROL_POLITICO_FISCAL,
  obtenerCatalogoYConciliacionPpiLocal,
  obtenerCumplimientoMetasPddLocal,
  obtenerFronteraDeaPddLocal,
  obtenerEconometriaComparadaPddLocal,
  obtenerExploradorProgramasYSeguridadHumanaLocal,
  obtenerLaboratorioPrescriptivoPddLocal,
  obtenerResumenEjecutivoPddDeaLocal,
} from "../data/pdd-dea-cartagena.data";

import type {
  InsumoDeaPdd,
  NivelDeaPdd,
  ModoImputacionPdd,
  CatalogoYConciliacionPpiRespuesta,
  CumplimientoMetasPddRespuesta,
  FronteraDeaPddRespuesta,
  EconometriaComparadaPddRespuesta,
  ExploradorProgramasYSeguridadHumanaRespuesta,
  ResumenEjecutivoPddDeaRespuesta,
  LaboratorioPrescriptivoPddRespuesta,
} from "../data/pdd-dea-cartagena.data";

import {
  obtenerCatalogoYConciliacionPpiLocal,
  obtenerCumplimientoMetasPddLocal,
  obtenerFronteraDeaPddLocal,
  obtenerEconometriaComparadaPddLocal,
  obtenerExploradorProgramasYSeguridadHumanaLocal,
  obtenerLaboratorioPrescriptivoPddLocal,
  obtenerResumenEjecutivoPddDeaLocal,
} from "../data/pdd-dea-cartagena.data";

// -----------------------------------------------------------------------------
// CLIENTES API TIPADOS PARA LOS ENDPOINTS PDD-DEA Y PPI
// -----------------------------------------------------------------------------

export async function obtenerCatalogoYConciliacionPpiApi(): Promise<CatalogoYConciliacionPpiRespuesta> {
  try {
    const res = await apiFetch<CatalogoYConciliacionPpiRespuesta>(
      "/compromisos/triada/pdd-dea/catalogo-y-conciliacion-ppi",
      { method: "GET" }
    );
    if (res && Array.isArray(res.catalogo_planes) && Array.isArray(res.tabla_ppi_anual)) {
      return res;
    }
    return obtenerCatalogoYConciliacionPpiLocal();
  } catch (error) {
    console.warn("Fallo obtenerCatalogoYConciliacionPpiApi, usando fallback local:", error);
    return obtenerCatalogoYConciliacionPpiLocal();
  }
}

export async function obtenerCumplimientoMetasPddApi(params?: {
  plan?: string;
  linea?: string;
  entidad?: string;
  imputacion?: ModoImputacionPdd;
}): Promise<CumplimientoMetasPddRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.plan) searchParams.set("plan", params.plan);
    if (params?.linea) searchParams.set("linea", params.linea);
    if (params?.entidad) searchParams.set("entidad", params.entidad);
    if (params?.imputacion) searchParams.set("imputacion", params.imputacion);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/pdd-dea/cumplimiento-metas${query ? `?${query}` : ""}`;
    const res = await apiFetch<CumplimientoMetasPddRespuesta>(endpoint, { method: "GET" });

    if (res && Array.isArray(res.resumen_planes) && Array.isArray(res.componentes_seguridad_humana)) {
      return res;
    }
    return obtenerCumplimientoMetasPddLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerCumplimientoMetasPddApi, usando fallback local:", error);
    return obtenerCumplimientoMetasPddLocal(params);
  }
}

export async function obtenerFronteraDeaPddApi(params?: {
  plan?: string;
  insumo?: InsumoDeaPdd;
  nivel?: NivelDeaPdd;
}): Promise<FronteraDeaPddRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.plan) searchParams.set("plan", params.plan);
    if (params?.insumo) searchParams.set("insumo", params.insumo);
    if (params?.nivel) searchParams.set("nivel", params.nivel);

    const query = searchParams.toString();
    const endpoint = `/compromisos/triada/pdd-dea/frontera-dea-pdd${query ? `?${query}` : ""}`;
    const res = await apiFetch<FronteraDeaPddRespuesta>(endpoint, { method: "GET" });

    if (res && Array.isArray(res.ranking_entidades) && typeof res.eficiencia_media_bcc_entidades === "number") {
      return res;
    }
    return obtenerFronteraDeaPddLocal(params);
  } catch (error) {
    console.warn("Fallo obtenerFronteraDeaPddApi, usando fallback local:", error);
    return obtenerFronteraDeaPddLocal(params);
  }
}

export async function obtenerEconometriaComparadaPddApi(): Promise<EconometriaComparadaPddRespuesta> {
  try {
    const res = await apiFetch<EconometriaComparadaPddRespuesta>(
      "/compromisos/triada/pdd-dea/econometria-comparada-pdd",
      { method: "GET" }
    );
    if (res && Array.isArray(res.malmquist_inter_planes) && Array.isArray(res.correlaciones_fdr)) {
      return res;
    }
    return obtenerEconometriaComparadaPddLocal();
  } catch (error) {
    console.warn("Fallo obtenerEconometriaComparadaPddApi, usando fallback local:", error);
    return obtenerEconometriaComparadaPddLocal();
  }
}

export async function obtenerExploradorProgramasYSeguridadHumanaApi(): Promise<ExploradorProgramasYSeguridadHumanaRespuesta> {
  try {
    const res = await apiFetch<ExploradorProgramasYSeguridadHumanaRespuesta>(
      "/compromisos/triada/pdd-dea/explorador-programas-y-seguridad-humana",
      { method: "GET" }
    );
    if (res && Array.isArray(res.fondos_locales) && Array.isArray(res.arbol_impulsores_programas)) {
      return res;
    }
    return obtenerExploradorProgramasYSeguridadHumanaLocal();
  } catch (error) {
    console.warn("Fallo obtenerExploradorProgramasYSeguridadHumanaApi, usando fallback local:", error);
    return obtenerExploradorProgramasYSeguridadHumanaLocal();
  }
}

export async function obtenerResumenEjecutivoPddDeaApi(): Promise<ResumenEjecutivoPddDeaRespuesta> {
  try {
    const res = await apiFetch<ResumenEjecutivoPddDeaRespuesta>(
      "/compromisos/triada/pdd-dea/resumen-ejecutivo",
      { method: "GET" }
    );
    if (res && res.catalogo && res.cumplimiento && res.frontera) {
      return res;
    }
    return obtenerResumenEjecutivoPddDeaLocal();
  } catch (error) {
    console.warn("Fallo obtenerResumenEjecutivoPddDeaApi, usando fallback local:", error);
    return obtenerResumenEjecutivoPddDeaLocal();
  }
}

export async function obtenerLaboratorioPrescriptivoPddApi(): Promise<LaboratorioPrescriptivoPddRespuesta> {
  try {
    const res = await apiFetch<LaboratorioPrescriptivoPddRespuesta>(
      "/compromisos/triada/pdd-dea/laboratorio-prescriptivo",
      { method: "GET" }
    );
    if (res && Array.isArray(res.auditoria_metas_8_planes) && Array.isArray(res.network_dea_bi_etapa)) {
      return res;
    }
    return obtenerLaboratorioPrescriptivoPddLocal();
  } catch (error) {
    console.warn("Fallo obtenerLaboratorioPrescriptivoPddApi, usando fallback local:", error);
    return obtenerLaboratorioPrescriptivoPddLocal();
  }
}

// -----------------------------------------------------------------------------
// SISTEMA MULTI-AGENTE PDD/PDL Y DIAGNÓSTICO DE SEGURIDAD HUMANA (2012–2027)
// Hito: [FRONTEND-TABLERO-MULTIAGENTE-PDD-18B]
// -----------------------------------------------------------------------------

export type {
  GradoFrontalidadCodigo,
  GradoFrontalidadEtiqueta,
  DimensionSeguridadHumanaNombre,
  CodigoPuertaCalidadMultiagente,
  ArchivoEvidenciaPdfInfo,
  PuertaCalidadMultiagente,
  ResultadoAgenteMultiagente,
  EstadoSistemaMultiagentePddRespuesta,
  PlanPddComparativoSeguridadHumana,
  AnexoPdlTerritorialComparativo,
  PreguntaEstrategicaDiagnosticoPdd,
  ComparativoSeguridadHumanaPddRespuesta,
  ArticulacionDimensionSeguridadHumana,
  ArticulacionEntidadPaBpim,
  RegistroTrazabilidadPaBpim,
  CruceMultiagentePaBpimRespuesta,
  NodoLangGraphInfo,
  AristaLangGraphInfo,
  HerramientaPydanticAiInfo,
  ArquitecturaAgentesIaPddRespuesta,
  SolicitudConsultaAgentesPdd,
  HerramientaInvocadaTraza,
  PasoTrazaLangGraph,
  CitaEvidenciaDocumentalPdd,
  VerificacionCriticaForense,
  RespuestaConsultaAgentesPdd,
  SolicitudInterpretarFragmentoPdd,
  NodoMgaExtraidoIa,
  EvaluacionCremaIndicadorIa,
  MetaExtraidaIa,
  ClasificacionNeurosimbolicaFragmento,
  ArticulacionBpimSugeridaIa,
  RespuestaInterpretacionFragmentoPdd,
  ConsultaRapidaAgentesPreset,
  FragmentoPruebaInterpretePreset,
} from "../data/sistema-multiagente-pdd.data";

export {
  DIMENSIONES_SEGURIDAD_HUMANA_PNUD,
  ARCHIVOS_COBERTURA_PDF_CANONICOS,
  PUERTAS_CALIDAD_MULTIAGENTE_CANONICAS,
  AUDITORIA_AGENTES_MULTIAGENTE_CANONICA,
  PLANES_PDD_COMPARATIVO_CANONICO,
  ANEXO_PDL_TERRITORIAL_CANONICO,
  PREGUNTAS_ESTRATEGICAS_DIAGNOSTICO_PDD,
  ESTADO_SISTEMA_MULTIAGENTE_PDD_CANONICO,
  COMPARATIVO_SEGURIDAD_HUMANA_PDD_CANONICO,
  CRUCE_MULTIAGENTE_PA_BPIM_CANONICO,
  ARQUITECTURA_AGENTES_IA_PDD_CANONICA,
  CONSULTAS_RAPIDAS_AGENTES_PDD,
  FRAGMENTOS_PRUEBA_INTERPRETE_PDD,
  obtenerEstadoSistemaMultiagentePddLocal,
  obtenerComparativoSeguridadHumanaPddLocal,
  obtenerCruceMultiagentePaBpimLocal,
  obtenerArquitecturaAgentesIaPddLocal,
  consultarAgentesInteligentesPddLocal,
  interpretarFragmentoSemanticoPddLocal,
} from "../data/sistema-multiagente-pdd.data";

import type {
  GradoFrontalidadCodigo,
  GradoFrontalidadEtiqueta,
  DimensionSeguridadHumanaNombre,
  EstadoSistemaMultiagentePddRespuesta,
  ComparativoSeguridadHumanaPddRespuesta,
  ArticulacionDimensionSeguridadHumana,
  ArticulacionEntidadPaBpim,
  RegistroTrazabilidadPaBpim,
  CruceMultiagentePaBpimRespuesta,
  NodoLangGraphInfo,
  AristaLangGraphInfo,
  HerramientaPydanticAiInfo,
  ArquitecturaAgentesIaPddRespuesta,
  SolicitudConsultaAgentesPdd,
  HerramientaInvocadaTraza,
  PasoTrazaLangGraph,
  CitaEvidenciaDocumentalPdd,
  VerificacionCriticaForense,
  RespuestaConsultaAgentesPdd,
  SolicitudInterpretarFragmentoPdd,
  NodoMgaExtraidoIa,
  MetaExtraidaIa,
  RespuestaInterpretacionFragmentoPdd,
} from "../data/sistema-multiagente-pdd.data";

import {
  DIMENSIONES_SEGURIDAD_HUMANA_PNUD,
  obtenerEstadoSistemaMultiagentePddLocal,
  obtenerComparativoSeguridadHumanaPddLocal,
  obtenerCruceMultiagentePaBpimLocal,
  obtenerArquitecturaAgentesIaPddLocal,
  consultarAgentesInteligentesPddLocal,
  interpretarFragmentoSemanticoPddLocal,
} from "../data/sistema-multiagente-pdd.data";

function esObjetoRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function normalizarEstadoMultiagente(raw: unknown): EstadoSistemaMultiagentePddRespuesta {
  const canonico = obtenerEstadoSistemaMultiagentePddLocal();
  if (!esObjetoRegistro(raw)) {
    return canonico;
  }

  const estadoRaw = typeof raw.estado === "string" ? raw.estado : "COMPLETADO";
  if (estadoRaw === "SIN_EJECUCIONES") {
    return canonico;
  }

  const runId =
    typeof raw.run_id === "string" && raw.run_id.trim().length > 0
      ? raw.run_id
      : canonico.run_id;
  const iniciadoEn =
    typeof raw.iniciado_en === "string" && raw.iniciado_en.trim().length > 0
      ? raw.iniciado_en
      : canonico.iniciado_en;

  const puertasCalidad = Array.isArray(raw.puertas_calidad) && raw.puertas_calidad.length >= 6
    ? (raw.puertas_calidad as EstadoSistemaMultiagentePddRespuesta["puertas_calidad"])
    : canonico.puertas_calidad;

  const archivosCobertura = Array.isArray(raw.archivos_cobertura_pdf) && raw.archivos_cobertura_pdf.length >= 11
    ? (raw.archivos_cobertura_pdf as EstadoSistemaMultiagentePddRespuesta["archivos_cobertura_pdf"])
    : canonico.archivos_cobertura_pdf;

  return {
    ...canonico,
    run_id: runId,
    estado:
      estadoRaw === "FALLO"
        ? "FALLO"
        : estadoRaw === "COMPLETADO" ||
          estadoRaw === "SINCRONIZADO_PDD_ONLY" ||
          estadoRaw === "VALIDADO_SIN_PERSISTENCIA"
          ? estadoRaw
          : "SIN_EJECUCIONES",
    iniciado_en: iniciadoEn,
    puertas_calidad: puertasCalidad,
    archivos_cobertura_pdf: archivosCobertura,
  };
}

export async function obtenerEstadoSistemaMultiagentePdd(): Promise<EstadoSistemaMultiagentePddRespuesta> {
  try {
    const res = await apiFetch<unknown>(
      "/api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente",
      { method: "GET" }
    );
    return normalizarEstadoMultiagente(res);
  } catch (error) {
    console.warn("Fallo obtenerEstadoSistemaMultiagentePdd, usando estado canónico:", error);
    return obtenerEstadoSistemaMultiagentePddLocal();
  }
}

export async function ejecutarSistemaMultiagentePdd(params?: {
  publicar?: boolean;
  persistir?: boolean;
}): Promise<EstadoSistemaMultiagentePddRespuesta> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.publicar !== undefined) {
      searchParams.set("publicar", String(params.publicar));
    }
    if (params?.persistir !== undefined) {
      searchParams.set("persistir", String(params.persistir));
    }
    const query = searchParams.toString();
    const endpoint = `/api/v1/compromisos/triada/pdd-dea/ejecutar-sistema-multiagente${query ? `?${query}` : ""}`;
    const res = await apiFetch<unknown>(endpoint, {
      method: "POST",
      body: params ?? { publicar: false, persistir: true },
    });
    return normalizarEstadoMultiagente(res);
  } catch (error) {
    console.warn("Fallo ejecutarSistemaMultiagentePdd, retornando estado de fallo:", error);
    const local = obtenerEstadoSistemaMultiagentePddLocal();
    return {
      ...local,
      estado: "FALLO",
      puertas_calidad: local.puertas_calidad.map((p) => ({
        ...p,
        estado: "NO_EJECUTADO" as const,
        criterio_verificacion: `No ejecutado: ${error instanceof Error ? error.message : "Error de comunicación o autorización"}`,
      })),
      auditoria_agentes: local.auditoria_agentes.map((a) => ({
        ...a,
        estado: "SINCRONIZADO_PDD_ONLY" as const,
        hallazgos: [`Fallo en ejecución: ${error instanceof Error ? error.message : "Error desconocido"}`],
      })),
    };
  }
}

export async function obtenerComparativoSeguridadHumanaPdd(): Promise<ComparativoSeguridadHumanaPddRespuesta> {
  const canonico = obtenerComparativoSeguridadHumanaPddLocal();
  try {
    const res = await apiFetch<unknown>(
      "/api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo",
      { method: "GET" }
    );
    if (!esObjetoRegistro(res) || !Array.isArray(res.planes_pdd)) {
      return canonico;
    }

    if (res.planes_pdd.length === 0) {
      return {
        ...canonico,
        planes_pdd: [],
        resumen_global: {
          ...canonico.resumen_global,
          total_planes_pdd: 0,
          total_metas_pdd: 0,
        },
      };
    }

    const planesApiPorCodigo = new Map<string, Record<string, unknown>>();
    for (const item of res.planes_pdd) {
      if (esObjetoRegistro(item) && typeof item.codigo_plan === "string") {
        planesApiPorCodigo.set(item.codigo_plan, item);
      }
    }

    const planesFusionados = canonico.planes_pdd.map((planCanon) => {
      const apiPlan = planesApiPorCodigo.get(planCanon.codigo_plan);
      if (!apiPlan) return planCanon;
      const ppiCorriente =
        typeof apiPlan.ppi_total_corriente_cop === "number" && apiPlan.ppi_total_corriente_cop > 0
          ? apiPlan.ppi_total_corriente_cop
          : planCanon.ppi_oficial_nominal_cop;
      const ppiConstante =
        typeof apiPlan.ppi_total_constante_2025_cop === "number" &&
        apiPlan.ppi_total_constante_2025_cop > 0
          ? apiPlan.ppi_total_constante_2025_cop
          : planCanon.ppi_total_constante_2025_cop;

      return {
        ...planCanon,
        ppi_oficial_nominal_cop: ppiCorriente,
        ppi_total_constante_2025_cop: ppiConstante,
      };
    });

    return {
      ...canonico,
      planes_pdd: planesFusionados,
    };
  } catch (error) {
    console.warn("Fallo obtenerComparativoSeguridadHumanaPdd, usando comparativo canónico:", error);
    return canonico;
  }
}

export function normalizarDimensionSeguridadHumana(
  valor: unknown
): DimensionSeguridadHumanaNombre {
  if (typeof valor !== "string") return "Seguridad Personal";
  const limpio = valor.trim().toLowerCase();
  if (limpio.includes("personal")) return "Seguridad Personal";
  if (limpio.includes("comunitaria")) return "Seguridad Comunitaria";
  if (limpio.includes("econ")) return "Seguridad Económica";
  if (limpio.includes("alimentaria")) return "Seguridad Alimentaria";
  if (limpio.includes("salud")) return "Seguridad en la Salud";
  if (limpio.includes("ambiental")) return "Seguridad Ambiental";
  if (limpio.includes("pol")) return "Seguridad Política";
  return "Seguridad Personal";
}

function extraerSiglaEntidad(nombre: string): string {
  const matchParentesis = nombre.match(/\(([A-ZÁÉÍÓÚÑ0-9-]{2,12})\)/);
  if (matchParentesis?.[1]) return matchParentesis[1];
  const palabras = nombre
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 3);
  if (palabras.length === 0) return "DIST";
  return palabras
    .slice(0, 4)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function normalizarCruceMultiagentePaBpim(
  raw: unknown
): CruceMultiagentePaBpimRespuesta {
  const canonico = obtenerCruceMultiagentePaBpimLocal();
  if (!esObjetoRegistro(raw)) {
    return canonico;
  }

  // 1. Normalizar resumen_ejecutivo
  const resumenRaw = esObjetoRegistro(raw.resumen_ejecutivo)
    ? raw.resumen_ejecutivo
    : {};
  const desgloseFrontalidad = esObjetoRegistro(resumenRaw.desglose_frontalidad)
    ? resumenRaw.desglose_frontalidad
    : {};
  const coberturaVig = esObjetoRegistro(
    resumenRaw.cobertura_articulacion_vigente_2024_2027
  )
    ? resumenRaw.cobertura_articulacion_vigente_2024_2027
    : {};

  let coberturaPct = canonico.resumen_ejecutivo.cobertura_articulacion_vigente_2024_2027_pct;
  if (
    typeof resumenRaw.cobertura_articulacion_vigente_2024_2027_pct === "number" &&
    !Number.isNaN(resumenRaw.cobertura_articulacion_vigente_2024_2027_pct)
  ) {
    coberturaPct = resumenRaw.cobertura_articulacion_vigente_2024_2027_pct;
  } else if (
    typeof coberturaVig.porcentaje_cobertura === "number" &&
    !Number.isNaN(coberturaVig.porcentaje_cobertura)
  ) {
    coberturaPct = coberturaVig.porcentaje_cobertura;
  } else if (
    typeof coberturaVig.articuladas === "number" &&
    typeof coberturaVig.brechas === "number" &&
    coberturaVig.articuladas + coberturaVig.brechas > 0
  ) {
    coberturaPct = Number(
      (
        (coberturaVig.articuladas /
          (coberturaVig.articuladas + coberturaVig.brechas)) *
        100
      ).toFixed(2)
    );
  }

  const resumenEjecutivo: CruceMultiagentePaBpimRespuesta["resumen_ejecutivo"] = {
    total_nodos_pdd_pdl:
      typeof resumenRaw.total_nodos_pdd_pdl === "number"
        ? resumenRaw.total_nodos_pdd_pdl
        : canonico.resumen_ejecutivo.total_nodos_pdd_pdl,
    nodos_grado_a:
      typeof resumenRaw.nodos_grado_a === "number"
        ? resumenRaw.nodos_grado_a
        : typeof desgloseFrontalidad.A === "number"
          ? desgloseFrontalidad.A
          : canonico.resumen_ejecutivo.nodos_grado_a,
    nodos_grado_b:
      typeof resumenRaw.nodos_grado_b === "number"
        ? resumenRaw.nodos_grado_b
        : typeof desgloseFrontalidad.B === "number"
          ? desgloseFrontalidad.B
          : canonico.resumen_ejecutivo.nodos_grado_b,
    nodos_grado_c:
      typeof resumenRaw.nodos_grado_c === "number"
        ? resumenRaw.nodos_grado_c
        : typeof desgloseFrontalidad.C === "number"
          ? desgloseFrontalidad.C
          : canonico.resumen_ejecutivo.nodos_grado_c,
    nodos_grado_n:
      typeof resumenRaw.nodos_grado_n === "number"
        ? resumenRaw.nodos_grado_n
        : typeof desgloseFrontalidad.N === "number"
          ? desgloseFrontalidad.N
          : canonico.resumen_ejecutivo.nodos_grado_n,
    total_metas_pdd:
      typeof resumenRaw.total_metas_pdd === "number"
        ? resumenRaw.total_metas_pdd
        : canonico.resumen_ejecutivo.total_metas_pdd,
    total_metas_pdl:
      typeof resumenRaw.total_metas_pdl === "number"
        ? resumenRaw.total_metas_pdl
        : canonico.resumen_ejecutivo.total_metas_pdl,
    total_actividades_pa:
      typeof resumenRaw.total_actividades_pa === "number"
        ? resumenRaw.total_actividades_pa
        : canonico.resumen_ejecutivo.total_actividades_pa,
    entidades_activas:
      typeof resumenRaw.entidades_activas === "number"
        ? resumenRaw.entidades_activas
        : canonico.resumen_ejecutivo.entidades_activas,
    cobertura_articulacion_vigente_2024_2027_pct: coberturaPct,
  };

  // 2. Normalizar articulacion_por_dimension_sh
  const canonDimMap = new Map(
    canonico.articulacion_por_dimension_sh.map((d) => [d.dimension, d])
  );
  const dimApi: ArticulacionDimensionSeguridadHumana[] =
    Array.isArray(raw.articulacion_por_dimension_sh) &&
    raw.articulacion_por_dimension_sh.length > 0
      ? raw.articulacion_por_dimension_sh
          .filter(esObjetoRegistro)
          .map((item) => {
            const dimNombre = normalizarDimensionSeguridadHumana(item.dimension);
            const fallbackDim =
              canonDimMap.get(dimNombre) ??
              canonico.articulacion_por_dimension_sh[0]!;
            const nodosAMasB =
              typeof item.nodos_a_mas_b === "number" && !Number.isNaN(item.nodos_a_mas_b)
                ? item.nodos_a_mas_b
                : typeof item.nodos_ab === "number" && !Number.isNaN(item.nodos_ab)
                  ? item.nodos_ab
                  : fallbackDim.nodos_a_mas_b;
            const ppiConstante =
              typeof item.presupuesto_ppi_constante_2025_cop === "number" &&
              !Number.isNaN(item.presupuesto_ppi_constante_2025_cop)
                ? item.presupuesto_ppi_constante_2025_cop
                : typeof item.ppi_constante_asignado_cop === "number" &&
                    !Number.isNaN(item.ppi_constante_asignado_cop)
                  ? item.ppi_constante_asignado_cop
                  : fallbackDim.presupuesto_ppi_constante_2025_cop;
            const actividadesPa =
              typeof item.actividades_pa_vinculadas === "number" &&
              !Number.isNaN(item.actividades_pa_vinculadas)
                ? item.actividades_pa_vinculadas
                : typeof item.actividades_pa === "number" &&
                    !Number.isNaN(item.actividades_pa)
                  ? item.actividades_pa
                  : fallbackDim.actividades_pa_vinculadas;
            const avancePromedio =
              typeof item.avance_fisico_promedio_pct === "number" &&
              !Number.isNaN(item.avance_fisico_promedio_pct)
                ? item.avance_fisico_promedio_pct
                : typeof item.avance_fisico_promedio === "number" &&
                    !Number.isNaN(item.avance_fisico_promedio)
                  ? item.avance_fisico_promedio
                  : fallbackDim.avance_fisico_promedio_pct;
            const entidadesLideres =
              Array.isArray(item.entidades_lideres) &&
              item.entidades_lideres.length > 0
                ? item.entidades_lideres.filter(
                    (e): e is string => typeof e === "string" && e.trim().length > 0
                  )
                : fallbackDim.entidades_lideres;

            return {
              dimension: dimNombre,
              nodos_a_mas_b: nodosAMasB,
              presupuesto_ppi_constante_2025_cop: ppiConstante,
              actividades_pa_vinculadas: actividadesPa,
              avance_fisico_promedio_pct: avancePromedio,
              entidades_lideres:
                entidadesLideres.length > 0
                  ? entidadesLideres
                  : fallbackDim.entidades_lideres,
            };
          })
      : canonico.articulacion_por_dimension_sh;

  // 3. Normalizar articulacion_por_entidad
  const entApi: ArticulacionEntidadPaBpim[] =
    Array.isArray(raw.articulacion_por_entidad) &&
    raw.articulacion_por_entidad.length > 0
      ? raw.articulacion_por_entidad
          .filter(esObjetoRegistro)
          .map((item, idx) => {
            const nombreRaw =
              typeof item.entidad_responsable === "string" &&
              item.entidad_responsable.trim().length > 0
                ? item.entidad_responsable.trim()
                : typeof item.entidad === "string" && item.entidad.trim().length > 0
                  ? item.entidad.trim()
                  : "";
            const canonMatch = canonico.articulacion_por_entidad.find(
              (c) =>
                c.entidad_responsable.toLowerCase() === nombreRaw.toLowerCase() ||
                (typeof item.sigla === "string" &&
                  c.sigla.toLowerCase() === item.sigla.trim().toLowerCase())
            );
            const entidadResponsable =
              nombreRaw ||
              canonMatch?.entidad_responsable ||
              `Entidad Distrital ${idx + 1}`;
            const sigla =
              typeof item.sigla === "string" && item.sigla.trim().length > 0
                ? item.sigla.trim()
                : canonMatch?.sigla ?? extraerSiglaEntidad(entidadResponsable);
            const actividadesCount =
              typeof item.actividades_pa_count === "number" &&
              !Number.isNaN(item.actividades_pa_count)
                ? item.actividades_pa_count
                : typeof item.actividades_pa === "number" &&
                    !Number.isNaN(item.actividades_pa)
                  ? item.actividades_pa
                  : canonMatch?.actividades_pa_count ?? 0;
            const metasAsociadas =
              typeof item.metas_pdd_asociadas === "number" &&
              !Number.isNaN(item.metas_pdd_asociadas)
                ? item.metas_pdd_asociadas
                : canonMatch?.metas_pdd_asociadas ?? actividadesCount;
            const productosBpim =
              typeof item.productos_mga_bpim === "number" &&
              !Number.isNaN(item.productos_mga_bpim)
                ? item.productos_mga_bpim
                : canonMatch?.productos_mga_bpim ?? actividadesCount;
            const gradoFrontalidad: "A" | "B" =
              item.grado_frontalidad_predominante === "B" ? "B" : "A";
            const presupuestoCop =
              typeof item.presupuesto_pa_programado_cop === "number" &&
              !Number.isNaN(item.presupuesto_pa_programado_cop)
                ? item.presupuesto_pa_programado_cop
                : typeof item.presupuesto_cop === "number" &&
                    !Number.isNaN(item.presupuesto_cop)
                  ? item.presupuesto_cop
                  : canonMatch?.presupuesto_pa_programado_cop ?? 0;
            const avancePromedio =
              typeof item.avance_fisico_promedio_pct === "number" &&
              !Number.isNaN(item.avance_fisico_promedio_pct)
                ? item.avance_fisico_promedio_pct
                : typeof item.avance_fisico_promedio === "number" &&
                    !Number.isNaN(item.avance_fisico_promedio)
                  ? item.avance_fisico_promedio
                  : canonMatch?.avance_fisico_promedio_pct ?? 0;

            return {
              entidad_responsable: entidadResponsable,
              sigla,
              actividades_pa_count: actividadesCount,
              metas_pdd_asociadas: metasAsociadas,
              productos_mga_bpim: productosBpim,
              grado_frontalidad_predominante: gradoFrontalidad,
              presupuesto_pa_programado_cop: presupuestoCop,
              avance_fisico_promedio_pct: avancePromedio,
            };
          })
      : canonico.articulacion_por_entidad;

  // 4. Normalizar matriz_trazabilidad_pa_bpim
  const trzApi: RegistroTrazabilidadPaBpim[] =
    Array.isArray(raw.matriz_trazabilidad_pa_bpim) &&
    raw.matriz_trazabilidad_pa_bpim.length > 0
      ? raw.matriz_trazabilidad_pa_bpim
          .filter(esObjetoRegistro)
          .map((item, idx) => {
            const codigoPlan =
              typeof item.codigo_plan === "string" && item.codigo_plan.trim().length > 0
                ? item.codigo_plan.trim()
                : "PDD_2024_2027";
            const codigoNodo =
              typeof item.codigo_nodo === "string" && item.codigo_nodo.trim().length > 0
                ? item.codigo_nodo.trim()
                : `NODO-${String(idx + 1).padStart(3, "0")}`;
            const nombrePrograma =
              typeof item.nombre_programa === "string" &&
              item.nombre_programa.trim().length > 0
                ? item.nombre_programa.trim()
                : "Programa PDD";
            const gradoFrontalidad: "A" | "B" =
              item.grado_frontalidad === "B" ? "B" : "A";
            const dimensionSh = normalizarDimensionSeguridadHumana(
              item.dimension_sh_principal
            );

            const metaPddRaw =
              typeof item.meta_pdd === "string" && item.meta_pdd.trim().length > 0
                ? item.meta_pdd.trim()
                : "";
            const metaPddCodigo =
              typeof item.meta_pdd_codigo === "string" &&
              item.meta_pdd_codigo.trim().length > 0
                ? item.meta_pdd_codigo.trim()
                : metaPddRaw || `MP-${codigoNodo}`;
            const metaPddDescripcion =
              typeof item.meta_pdd_descripcion === "string" &&
              item.meta_pdd_descripcion.trim().length > 0
                ? item.meta_pdd_descripcion.trim()
                : metaPddRaw || nombrePrograma;

            const actividadPaCodigo =
              typeof item.actividad_pa_codigo === "string" &&
              item.actividad_pa_codigo.trim().length > 0
                ? item.actividad_pa_codigo.trim()
                : typeof item.actividad_pa_id === "string" &&
                    item.actividad_pa_id.trim().length > 0
                  ? item.actividad_pa_id.trim()
                  : `PA-2026-${String(idx + 1).padStart(3, "0")}`;

            const descripcionActividadPa =
              typeof item.descripcion_actividad_pa === "string" &&
              item.descripcion_actividad_pa.trim().length > 0
                ? item.descripcion_actividad_pa.trim()
                : metaPddDescripcion;

            const dependenciaResponsable =
              typeof item.dependencia_responsable === "string" &&
              item.dependencia_responsable.trim().length > 0
                ? item.dependencia_responsable.trim()
                : "Entidad Distrital";

            const codigoBpim =
              typeof item.codigo_bpim === "string" && item.codigo_bpim.trim().length > 0
                ? item.codigo_bpim.trim()
                : typeof item.codigo_bpim_sugerido === "string" &&
                    item.codigo_bpim_sugerido.trim().length > 0
                  ? item.codigo_bpim_sugerido.trim()
                  : `2024130010${String(idx + 1).padStart(3, "0")}`;

            const productoMgaDnp =
              typeof item.producto_mga_dnp === "string" &&
              item.producto_mga_dnp.trim().length > 0
                ? item.producto_mga_dnp.trim()
                : "Producto MGA-DNP";

            const avanceFisicoPct =
              typeof item.avance_fisico_pct === "number" &&
              !Number.isNaN(item.avance_fisico_pct)
                ? item.avance_fisico_pct
                : 0;

            const estadoRaw =
              typeof item.estado_articulacion === "string"
                ? item.estado_articulacion.trim().toUpperCase()
                : "";
            const estadoArticulacion: "ARTICULADO_VERIFICADO" | "EN_HOMOLOGACION_BPIM" =
              estadoRaw === "EN_HOMOLOGACION_BPIM" ||
              estadoRaw === "PENDIENTE" ||
              estadoRaw === "BRECHA"
                ? "EN_HOMOLOGACION_BPIM"
                : "ARTICULADO_VERIFICADO";

            const idTrazabilidad =
              typeof item.id_trazabilidad === "string" &&
              item.id_trazabilidad.trim().length > 0
                ? item.id_trazabilidad.trim()
                : `TRZ-${String(idx + 1).padStart(3, "0")}-${codigoNodo}-${actividadPaCodigo}`;

            return {
              id_trazabilidad: idTrazabilidad,
              codigo_plan: codigoPlan,
              codigo_nodo: codigoNodo,
              nombre_programa: nombrePrograma,
              grado_frontalidad: gradoFrontalidad,
              dimension_sh_principal: dimensionSh,
              meta_pdd_codigo: metaPddCodigo,
              meta_pdd_descripcion: metaPddDescripcion,
              actividad_pa_codigo: actividadPaCodigo,
              descripcion_actividad_pa: descripcionActividadPa,
              dependencia_responsable: dependenciaResponsable,
              codigo_bpim: codigoBpim,
              producto_mga_dnp: productoMgaDnp,
              avance_fisico_pct: avanceFisicoPct,
              estado_articulacion: estadoArticulacion,
            };
          })
      : canonico.matriz_trazabilidad_pa_bpim;

  return {
    ...canonico,
    resumen_ejecutivo: resumenEjecutivo,
    articulacion_por_dimension_sh:
      dimApi.length > 0 ? dimApi : canonico.articulacion_por_dimension_sh,
    articulacion_por_entidad:
      entApi.length > 0 ? entApi : canonico.articulacion_por_entidad,
    matriz_trazabilidad_pa_bpim:
      trzApi.length > 0 ? trzApi : canonico.matriz_trazabilidad_pa_bpim,
  };
}

export async function obtenerCruceMultiagentePaBpim(): Promise<CruceMultiagentePaBpimRespuesta> {
  const canonico = obtenerCruceMultiagentePaBpimLocal();
  try {
    const res = await apiFetch<unknown>(
      "/api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim",
      { method: "GET" }
    );
    return normalizarCruceMultiagentePaBpim(res);
  } catch (error) {
    console.warn("Fallo obtenerCruceMultiagentePaBpim, usando cruce canónico:", error);
    return canonico;
  }
}

// ============================================================================
// CLIENTES Y NORMALIZADORES DEL MOTOR COGNITIVO NEUROSIMBÓLICO (HITO 20B)
// ============================================================================

export function normalizarArquitecturaAgentesIaPdd(
  raw: unknown
): ArquitecturaAgentesIaPddRespuesta {
  const canonico = obtenerArquitecturaAgentesIaPddLocal();
  if (!esObjetoRegistro(raw)) {
    return canonico;
  }

  const motor =
    typeof raw.motor === "string" && raw.motor.trim().length > 0
      ? raw.motor.trim()
      : canonico.motor;
  const orquestador =
    typeof raw.orquestador === "string" && raw.orquestador.trim().length > 0
      ? raw.orquestador.trim()
      : canonico.orquestador;
  const frameworkAgentes =
    typeof raw.framework_agentes === "string" && raw.framework_agentes.trim().length > 0
      ? raw.framework_agentes.trim()
      : canonico.framework_agentes;

  const nodosLanggraph: NodoLangGraphInfo[] =
    Array.isArray(raw.nodos_langgraph) && raw.nodos_langgraph.length > 0
      ? raw.nodos_langgraph.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackNodo =
            canonico.nodos_langgraph[idx] ?? canonico.nodos_langgraph[0]!;
          const idNodo =
            typeof item.id_nodo === "string" && item.id_nodo.trim().length > 0
              ? item.id_nodo.trim()
              : typeof item.nodo === "string" && item.nodo.trim().length > 0
                ? item.nodo.trim()
                : fallbackNodo.id_nodo;
          const nombreAgente =
            typeof item.nombre_agente === "string" && item.nombre_agente.trim().length > 0
              ? item.nombre_agente.trim()
              : typeof item.agente === "string" && item.agente.trim().length > 0
                ? item.agente.trim()
                : fallbackNodo.nombre_agente;
          const rol =
            typeof item.rol === "string" && item.rol.trim().length > 0
              ? item.rol.trim()
              : typeof item.descripcion === "string" && item.descripcion.trim().length > 0
                ? item.descripcion.trim()
                : fallbackNodo.rol;
          const capa: "COGNITIVA" | "SIMBOLICA" =
            item.capa === "SIMBOLICA" ||
            idNodo.includes("auditor") ||
            idNodo.includes("articulador") ||
            idNodo.includes("critico")
              ? "SIMBOLICA"
              : "COGNITIVA";
          const herramientasAsignadas =
            Array.isArray(item.herramientas_asignadas) &&
            item.herramientas_asignadas.length > 0
              ? item.herramientas_asignadas.filter(
                  (h): h is string => typeof h === "string" && h.trim().length > 0
                )
              : fallbackNodo.herramientas_asignadas;
          const esquemaSalida =
            typeof item.esquema_salida === "string" && item.esquema_salida.trim().length > 0
              ? item.esquema_salida.trim()
              : fallbackNodo.esquema_salida;

          return {
            id_nodo: idNodo,
            nombre_agente: nombreAgente,
            rol,
            capa,
            herramientas_asignadas:
              herramientasAsignadas.length > 0
                ? herramientasAsignadas
                : fallbackNodo.herramientas_asignadas,
            esquema_salida: esquemaSalida,
          };
        })
      : canonico.nodos_langgraph;

  const aristasGrafo: AristaLangGraphInfo[] =
    Array.isArray(raw.aristas_grafo) && raw.aristas_grafo.length > 0
      ? raw.aristas_grafo.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackArista =
            canonico.aristas_grafo[idx] ?? canonico.aristas_grafo[0]!;
          const origen =
            typeof item.origen === "string" && item.origen.trim().length > 0
              ? item.origen.trim()
              : typeof item.desde === "string" && item.desde.trim().length > 0
                ? item.desde.trim()
                : fallbackArista.origen;
          const destino =
            typeof item.destino === "string" && item.destino.trim().length > 0
              ? item.destino.trim()
              : typeof item.hacia === "string" && item.hacia.trim().length > 0
                ? item.hacia.trim()
                : fallbackArista.destino;
          const tipo: "DIRECTA" | "CONDICIONAL" =
            item.tipo === "CONDICIONAL" || typeof item.condicion === "string"
              ? "CONDICIONAL"
              : "DIRECTA";
          const condicion =
            typeof item.condicion === "string" && item.condicion.trim().length > 0
              ? item.condicion.trim()
              : undefined;

          return {
            origen,
            destino,
            tipo,
            ...(condicion ? { condicion } : {}),
          };
        })
      : canonico.aristas_grafo;

  const herramientasRegistradas: HerramientaPydanticAiInfo[] =
    Array.isArray(raw.herramientas_registradas) &&
    raw.herramientas_registradas.length > 0
      ? raw.herramientas_registradas.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackTool =
            canonico.herramientas_registradas[idx] ??
            canonico.herramientas_registradas[0]!;
          const nombre =
            typeof item.nombre === "string" && item.nombre.trim().length > 0
              ? item.nombre.trim()
              : typeof item.herramienta === "string" && item.herramienta.trim().length > 0
                ? item.herramienta.trim()
                : fallbackTool.nombre;
          const descripcion =
            typeof item.descripcion === "string" && item.descripcion.trim().length > 0
              ? item.descripcion.trim()
              : fallbackTool.descripcion;
          const tablaPostgresql =
            typeof item.tabla_postgresql === "string" &&
            item.tabla_postgresql.trim().length > 0
              ? item.tabla_postgresql.trim()
              : typeof item.tabla_bd === "string" && item.tabla_bd.trim().length > 0
                ? item.tabla_bd.trim()
                : typeof item.tabla === "string" && item.tabla.trim().length > 0
                  ? item.tabla.trim()
                  : fallbackTool.tabla_postgresql;

          return {
            nombre,
            descripcion,
            tabla_postgresql: tablaPostgresql,
          };
        })
      : canonico.herramientas_registradas;

  const corpusRaw = esObjetoRegistro(raw.corpus_conectado)
    ? raw.corpus_conectado
    : {};

  return {
    motor,
    orquestador,
    framework_agentes: frameworkAgentes,
    nodos_langgraph:
      nodosLanggraph.length > 0 ? nodosLanggraph : canonico.nodos_langgraph,
    aristas_grafo:
      aristasGrafo.length > 0 ? aristasGrafo : canonico.aristas_grafo,
    herramientas_registradas:
      herramientasRegistradas.length > 0
        ? herramientasRegistradas
        : canonico.herramientas_registradas,
    corpus_conectado: {
      evidencias_paginas:
        typeof corpusRaw.evidencias_paginas === "number" &&
        !Number.isNaN(corpusRaw.evidencias_paginas)
          ? corpusRaw.evidencias_paginas
          : canonico.corpus_conectado.evidencias_paginas,
      nodos_mga:
        typeof corpusRaw.nodos_mga === "number" && !Number.isNaN(corpusRaw.nodos_mga)
          ? corpusRaw.nodos_mga
          : canonico.corpus_conectado.nodos_mga,
      metas_pdd:
        typeof corpusRaw.metas_pdd === "number" && !Number.isNaN(corpusRaw.metas_pdd)
          ? corpusRaw.metas_pdd
          : canonico.corpus_conectado.metas_pdd,
      metas_pdl:
        typeof corpusRaw.metas_pdl === "number" && !Number.isNaN(corpusRaw.metas_pdl)
          ? corpusRaw.metas_pdl
          : canonico.corpus_conectado.metas_pdl,
    },
  };
}

export async function obtenerArquitecturaAgentesIaPdd(): Promise<ArquitecturaAgentesIaPddRespuesta> {
  try {
    const res = await apiFetch<unknown>(
      "/api/v1/compromisos/triada/pdd-dea/arquitectura-agentes-ia",
      { method: "GET" }
    );
    return normalizarArquitecturaAgentesIaPdd(res);
  } catch (error) {
    console.warn("Fallo obtenerArquitecturaAgentesIaPdd, usando arquitectura canónica:", error);
    return obtenerArquitecturaAgentesIaPddLocal();
  }
}

export function normalizarConsultaAgentesPdd(
  raw: unknown,
  solicitud?: Partial<SolicitudConsultaAgentesPdd>
): RespuestaConsultaAgentesPdd {
  const canonico = consultarAgentesInteligentesPddLocal(solicitud);
  if (!esObjetoRegistro(raw)) {
    return canonico;
  }

  const runId =
    typeof raw.run_id === "string" && raw.run_id.trim().length > 0
      ? raw.run_id.trim()
      : canonico.run_id;
  const motor =
    typeof raw.motor === "string" && raw.motor.trim().length > 0
      ? raw.motor.trim()
      : canonico.motor;
  const pregunta =
    typeof raw.pregunta === "string" && raw.pregunta.trim().length > 0
      ? raw.pregunta.trim()
      : canonico.pregunta;
  const sintesisEjecutiva =
    typeof raw.sintesis_ejecutiva === "string" &&
    raw.sintesis_ejecutiva.trim().length > 0
      ? raw.sintesis_ejecutiva.trim()
      : canonico.sintesis_ejecutiva;
  const dictamenForense =
    typeof raw.dictamen_forense_detallado === "string" &&
    raw.dictamen_forense_detallado.trim().length > 0
      ? raw.dictamen_forense_detallado.trim()
      : canonico.dictamen_forense_detallado;

  const trazaLanggraph: PasoTrazaLangGraph[] =
    Array.isArray(raw.traza_langgraph) && raw.traza_langgraph.length > 0
      ? raw.traza_langgraph.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackPaso =
            canonico.traza_langgraph[idx] ?? canonico.traza_langgraph[0]!;
          const orden =
            typeof item.orden === "number" && !Number.isNaN(item.orden)
              ? item.orden
              : idx + 1;
          const nodoLanggraph =
            typeof item.nodo_langgraph === "string" &&
            item.nodo_langgraph.trim().length > 0
              ? item.nodo_langgraph.trim()
              : fallbackPaso.nodo_langgraph;
          const agente =
            typeof item.agente === "string" && item.agente.trim().length > 0
              ? item.agente.trim()
              : fallbackPaso.agente;
          const razonamiento =
            typeof item.razonamiento === "string" &&
            item.razonamiento.trim().length > 0
              ? item.razonamiento.trim()
              : fallbackPaso.razonamiento;
          const duracionMs =
            typeof item.duracion_ms === "number" && !Number.isNaN(item.duracion_ms)
              ? item.duracion_ms
              : fallbackPaso.duracion_ms;
          const estado: "COMPLETADO" | "REINTENTO_VERIFICACION" =
            item.estado === "REINTENTO_VERIFICACION"
              ? "REINTENTO_VERIFICACION"
              : "COMPLETADO";

          const herramientasInvocadas: HerramientaInvocadaTraza[] =
            Array.isArray(item.herramientas_invocadas) &&
            item.herramientas_invocadas.length > 0
              ? item.herramientas_invocadas.filter(esObjetoRegistro).map((h) => ({
                  herramienta:
                    typeof h.herramienta === "string" && h.herramienta.trim().length > 0
                      ? h.herramienta.trim()
                      : typeof h.nombre === "string" && h.nombre.trim().length > 0
                        ? h.nombre.trim()
                        : "tool_buscar_evidencia_paginas_pdd",
                  parametros: esObjetoRegistro(h.parametros) ? h.parametros : undefined,
                  registros_recuperados:
                    typeof h.registros_recuperados === "number" &&
                    !Number.isNaN(h.registros_recuperados)
                      ? h.registros_recuperados
                      : 1,
                }))
              : fallbackPaso.herramientas_invocadas;

          return {
            orden,
            nodo_langgraph: nodoLanggraph,
            agente,
            razonamiento,
            herramientas_invocadas: herramientasInvocadas,
            duracion_ms: duracionMs,
            estado,
          };
        })
      : canonico.traza_langgraph;

  const citasEvidencia: CitaEvidenciaDocumentalPdd[] =
    Array.isArray(raw.citas_evidencia_documental) &&
    raw.citas_evidencia_documental.length > 0
      ? raw.citas_evidencia_documental.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackCita =
            canonico.citas_evidencia_documental[idx] ??
            canonico.citas_evidencia_documental[0]!;
          return {
            codigo_plan:
              typeof item.codigo_plan === "string" && item.codigo_plan.trim().length > 0
                ? item.codigo_plan.trim()
                : fallbackCita.codigo_plan,
            archivo:
              typeof item.archivo === "string" && item.archivo.trim().length > 0
                ? item.archivo.trim()
                : fallbackCita.archivo,
            pagina:
              typeof item.pagina === "number" && !Number.isNaN(item.pagina)
                ? item.pagina
                : fallbackCita.pagina,
            sha256_contenido:
              typeof item.sha256_contenido === "string" &&
              item.sha256_contenido.trim().length > 0
                ? item.sha256_contenido.trim()
                : typeof item.sha256 === "string" && item.sha256.trim().length > 0
                  ? item.sha256.trim()
                  : fallbackCita.sha256_contenido,
            origen_texto:
              typeof item.origen_texto === "string" &&
              item.origen_texto.trim().length > 0
                ? item.origen_texto.trim()
                : fallbackCita.origen_texto,
            extracto_relevante:
              typeof item.extracto_relevante === "string" &&
              item.extracto_relevante.trim().length > 0
                ? item.extracto_relevante.trim()
                : typeof item.extracto === "string" && item.extracto.trim().length > 0
                  ? item.extracto.trim()
                  : fallbackCita.extracto_relevante,
          };
        })
      : canonico.citas_evidencia_documental;

  const verifRaw = esObjetoRegistro(raw.verificacion_critica)
    ? raw.verificacion_critica
    : {};
  const verificacionCritica: VerificacionCriticaForense = {
    aprobado:
      typeof verifRaw.aprobado === "boolean"
        ? verifRaw.aprobado
        : canonico.verificacion_critica.aprobado,
    iteraciones_langgraph:
      typeof verifRaw.iteraciones_langgraph === "number" &&
      !Number.isNaN(verifRaw.iteraciones_langgraph)
        ? verifRaw.iteraciones_langgraph
        : canonico.verificacion_critica.iteraciones_langgraph,
    cero_alucinacion_financiera:
      typeof verifRaw.cero_alucinacion_financiera === "boolean"
        ? verifRaw.cero_alucinacion_financiera
        : canonico.verificacion_critica.cero_alucinacion_financiera,
    citas_sha256_verificadas:
      typeof verifRaw.citas_sha256_verificadas === "number" &&
      !Number.isNaN(verifRaw.citas_sha256_verificadas)
        ? verifRaw.citas_sha256_verificadas
        : citasEvidencia.length,
    observacion_verificador:
      typeof verifRaw.observacion_verificador === "string" &&
      verifRaw.observacion_verificador.trim().length > 0
        ? verifRaw.observacion_verificador.trim()
        : canonico.verificacion_critica.observacion_verificador,
  };

  return {
    run_id: runId,
    motor,
    pregunta,
    sintesis_ejecutiva: sintesisEjecutiva,
    dictamen_forense_detallado: dictamenForense,
    traza_langgraph:
      trazaLanggraph.length > 0 ? trazaLanggraph : canonico.traza_langgraph,
    citas_evidencia_documental:
      citasEvidencia.length > 0
        ? citasEvidencia
        : canonico.citas_evidencia_documental,
    verificacion_critica: verificacionCritica,
  };
}

export async function consultarAgentesInteligentesPdd(
  solicitud: SolicitudConsultaAgentesPdd
): Promise<RespuestaConsultaAgentesPdd> {
  try {
    const payload = {
      pregunta: solicitud.pregunta,
      codigo_plan: solicitud.codigo_plan ?? "TODOS",
      dimension_sh: solicitud.dimension_sh ?? "TODAS",
      grado_frontalidad: solicitud.grado_frontalidad ?? "TODOS",
      profundidad: solicitud.profundidad ?? "forense",
    };
    const res = await apiFetch<unknown>(
      "/api/v1/compromisos/triada/pdd-dea/consultar-agentes-pdd",
      {
        method: "POST",
        body: payload,
      }
    );
    return normalizarConsultaAgentesPdd(res, solicitud);
  } catch (error) {
    console.warn("Fallo consultarAgentesInteligentesPdd, usando motor cognitivo local:", error);
    return consultarAgentesInteligentesPddLocal(solicitud);
  }
}

function normalizarGradoFrontalidad(valor: unknown): {
  grado: GradoFrontalidadCodigo;
  etiqueta: GradoFrontalidadEtiqueta;
} {
  const str = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  if (str.startsWith("A")) {
    return { grado: "A", etiqueta: "A_NUCLEO_FRONTAL" };
  }
  if (str.startsWith("C")) {
    return { grado: "C", etiqueta: "C_CONTEXTUAL_HABILITANTE" };
  }
  if (str.startsWith("N")) {
    return { grado: "N", etiqueta: "N_NO_ASOCIADO_FUNCIONAMIENTO" };
  }
  return { grado: "B", etiqueta: "B_DETERMINANTE_DIRECTO" };
}

export function normalizarInterpretacionFragmentoPdd(
  raw: unknown,
  solicitud?: Partial<SolicitudInterpretarFragmentoPdd>
): RespuestaInterpretacionFragmentoPdd {
  const canonico = interpretarFragmentoSemanticoPddLocal(solicitud);
  if (!esObjetoRegistro(raw)) {
    return canonico;
  }

  const nodosExtraidos: NodoMgaExtraidoIa[] =
    Array.isArray(raw.nodos_extraidos) && raw.nodos_extraidos.length > 0
      ? raw.nodos_extraidos.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackNodo =
            canonico.nodos_extraidos[idx] ?? canonico.nodos_extraidos[0]!;
          const nivelRaw =
            typeof item.nivel === "string" ? item.nivel.trim().toUpperCase() : "";
          const nivel: "LINEA" | "PROGRAMA" | "SUBPROGRAMA" =
            nivelRaw === "LINEA" || nivelRaw === "SUBPROGRAMA"
              ? nivelRaw
              : "PROGRAMA";
          return {
            nivel,
            codigo_detectado:
              typeof item.codigo_detectado === "string" &&
              item.codigo_detectado.trim().length > 0
                ? item.codigo_detectado.trim()
                : fallbackNodo.codigo_detectado,
            nombre:
              typeof item.nombre === "string" && item.nombre.trim().length > 0
                ? item.nombre.trim()
                : fallbackNodo.nombre,
            problema_central_inferido:
              typeof item.problema_central_inferido === "string" &&
              item.problema_central_inferido.trim().length > 0
                ? item.problema_central_inferido.trim()
                : fallbackNodo.problema_central_inferido,
            objetivo_mga_inferido:
              typeof item.objetivo_mga_inferido === "string" &&
              item.objetivo_mga_inferido.trim().length > 0
                ? item.objetivo_mga_inferido.trim()
                : fallbackNodo.objetivo_mga_inferido,
          };
        })
      : canonico.nodos_extraidos;

  const metasExtraidas: MetaExtraidaIa[] =
    Array.isArray(raw.metas_extraidas) && raw.metas_extraidas.length > 0
      ? raw.metas_extraidas.filter(esObjetoRegistro).map((item, idx) => {
          const fallbackMeta =
            canonico.metas_extraidas[idx] ?? canonico.metas_extraidas[0]!;
          const tipoRaw =
            typeof item.tipo_meta === "string"
              ? item.tipo_meta.trim().toUpperCase()
              : "";
          const tipoMeta: "RESULTADO" | "PRODUCTO" =
            tipoRaw === "PRODUCTO" ? "PRODUCTO" : "RESULTADO";
          const cremaRaw = esObjetoRegistro(item.evaluacion_crema)
            ? item.evaluacion_crema
            : {};
          const claro =
            typeof cremaRaw.claro === "boolean"
              ? cremaRaw.claro
              : fallbackMeta.evaluacion_crema.claro;
          const relevante =
            typeof cremaRaw.relevante === "boolean"
              ? cremaRaw.relevante
              : fallbackMeta.evaluacion_crema.relevante;
          const economico =
            typeof cremaRaw.economico === "boolean"
              ? cremaRaw.economico
              : fallbackMeta.evaluacion_crema.economico;
          const medible =
            typeof cremaRaw.medible === "boolean"
              ? cremaRaw.medible
              : fallbackMeta.evaluacion_crema.medible;
          const adecuado =
            typeof cremaRaw.adecuado === "boolean"
              ? cremaRaw.adecuado
              : fallbackMeta.evaluacion_crema.adecuado;
          const cumplidos = [claro, relevante, economico, medible, adecuado].filter(
            Boolean
          ).length;
          const puntajeCrema =
            typeof cremaRaw.puntaje_crema_pct === "number" &&
            !Number.isNaN(cremaRaw.puntaje_crema_pct)
              ? cremaRaw.puntaje_crema_pct
              : cumplidos * 20;

          const lineaBaseStr =
            typeof item.linea_base === "string" && item.linea_base.trim().length > 0
              ? item.linea_base.trim()
              : typeof item.linea_base === "number" && !Number.isNaN(item.linea_base)
                ? String(item.linea_base)
                : fallbackMeta.linea_base;
          const metaCuatrienioStr =
            typeof item.meta_cuatrienio === "string" &&
            item.meta_cuatrienio.trim().length > 0
              ? item.meta_cuatrienio.trim()
              : typeof item.meta_cuatrienio === "number" &&
                  !Number.isNaN(item.meta_cuatrienio)
                ? String(item.meta_cuatrienio)
                : fallbackMeta.meta_cuatrienio;

          return {
            tipo_meta: tipoMeta,
            descripcion_meta:
              typeof item.descripcion_meta === "string" &&
              item.descripcion_meta.trim().length > 0
                ? item.descripcion_meta.trim()
                : fallbackMeta.descripcion_meta,
            indicador_sugerido:
              typeof item.indicador_sugerido === "string" &&
              item.indicador_sugerido.trim().length > 0
                ? item.indicador_sugerido.trim()
                : fallbackMeta.indicador_sugerido,
            linea_base: lineaBaseStr,
            meta_cuatrienio: metaCuatrienioStr,
            evaluacion_crema: {
              claro,
              relevante,
              economico,
              medible,
              adecuado,
              puntaje_crema_pct: puntajeCrema,
              observacion_dnp:
                typeof cremaRaw.observacion_dnp === "string" &&
                cremaRaw.observacion_dnp.trim().length > 0
                  ? cremaRaw.observacion_dnp.trim()
                  : fallbackMeta.evaluacion_crema.observacion_dnp,
            },
          };
        })
      : canonico.metas_extraidas;

  const clasifRaw = esObjetoRegistro(raw.clasificacion_neurosimbolica)
    ? raw.clasificacion_neurosimbolica
    : {};
  const { grado, etiqueta } = normalizarGradoFrontalidad(
    clasifRaw.grado_frontalidad ??
      clasifRaw.etiqueta_frontalidad ??
      canonico.clasificacion_neurosimbolica.grado_frontalidad
  );
  const dimPrimaria =
    clasifRaw.dimension_sh_primaria !== undefined
      ? normalizarDimensionSeguridadHumana(clasifRaw.dimension_sh_primaria)
      : canonico.clasificacion_neurosimbolica.dimension_sh_primaria;

  const pesos7dNormalizados: Record<DimensionSeguridadHumanaNombre, number> = {
    ...canonico.clasificacion_neurosimbolica.pesos_7d,
  };
  if (esObjetoRegistro(clasifRaw.pesos_7d)) {
    const tempPesos: Partial<Record<DimensionSeguridadHumanaNombre, number>> = {};
    let suma = 0;
    for (const [k, v] of Object.entries(clasifRaw.pesos_7d)) {
      if (typeof v === "number" && !Number.isNaN(v) && v >= 0) {
        const dimKey = normalizarDimensionSeguridadHumana(k);
        tempPesos[dimKey] = (tempPesos[dimKey] ?? 0) + v;
        suma += v;
      }
    }
    if (suma > 0) {
      for (const dim of DIMENSIONES_SEGURIDAD_HUMANA_PNUD) {
        const valorRaw = tempPesos[dim] ?? 0;
        pesos7dNormalizados[dim] =
          suma > 1.5
            ? Number((valorRaw / suma).toFixed(4))
            : Number(valorRaw.toFixed(4));
      }
    }
  }

  const artRaw = esObjetoRegistro(raw.articulacion_bpim_sugerida)
    ? raw.articulacion_bpim_sugerida
    : {};

  return {
    texto_fragmento:
      typeof raw.texto_fragmento === "string" && raw.texto_fragmento.trim().length > 0
        ? raw.texto_fragmento.trim()
        : canonico.texto_fragmento,
    codigo_plan_referencia:
      typeof raw.codigo_plan_referencia === "string" &&
      raw.codigo_plan_referencia.trim().length > 0
        ? raw.codigo_plan_referencia.trim()
        : canonico.codigo_plan_referencia,
    archivo_origen:
      typeof raw.archivo_origen === "string" && raw.archivo_origen.trim().length > 0
        ? raw.archivo_origen.trim()
        : canonico.archivo_origen,
    pagina:
      typeof raw.pagina === "number" && !Number.isNaN(raw.pagina)
        ? raw.pagina
        : canonico.pagina,
    nodos_extraidos:
      nodosExtraidos.length > 0 ? nodosExtraidos : canonico.nodos_extraidos,
    metas_extraidas:
      metasExtraidas.length > 0 ? metasExtraidas : canonico.metas_extraidas,
    clasificacion_neurosimbolica: {
      grado_frontalidad: grado,
      etiqueta_frontalidad: etiqueta,
      dimension_sh_primaria: dimPrimaria,
      pesos_7d: pesos7dNormalizados,
      justificacion_causal_ia:
        typeof clasifRaw.justificacion_causal_ia === "string" &&
        clasifRaw.justificacion_causal_ia.trim().length > 0
          ? clasifRaw.justificacion_causal_ia.trim()
          : canonico.clasificacion_neurosimbolica.justificacion_causal_ia,
    },
    articulacion_bpim_sugerida: {
      codigo_bpim_sugerido:
        typeof artRaw.codigo_bpim_sugerido === "string" &&
        artRaw.codigo_bpim_sugerido.trim().length > 0
          ? artRaw.codigo_bpim_sugerido.trim()
          : canonico.articulacion_bpim_sugerida.codigo_bpim_sugerido,
      producto_catalogo_mga_dnp:
        typeof artRaw.producto_catalogo_mga_dnp === "string" &&
        artRaw.producto_catalogo_mga_dnp.trim().length > 0
          ? artRaw.producto_catalogo_mga_dnp.trim()
          : canonico.articulacion_bpim_sugerida.producto_catalogo_mga_dnp,
      entidad_responsable_sugerida:
        typeof artRaw.entidad_responsable_sugerida === "string" &&
        artRaw.entidad_responsable_sugerida.trim().length > 0
          ? artRaw.entidad_responsable_sugerida.trim()
          : canonico.articulacion_bpim_sugerida.entidad_responsable_sugerida,
    },
  };
}

export async function interpretarFragmentoSemanticoPdd(
  solicitud: SolicitudInterpretarFragmentoPdd
): Promise<RespuestaInterpretacionFragmentoPdd> {
  try {
    const payload = {
      texto_fragmento: solicitud.texto_fragmento,
      codigo_plan_referencia: solicitud.codigo_plan_referencia ?? "PDD_2024_2027",
      archivo_origen:
        solicitud.archivo_origen ?? "pdd_2024_2027_acuerdo_139_oficial.pdf",
      pagina: solicitud.pagina ?? 84,
    };
    const res = await apiFetch<unknown>(
      "/api/v1/compromisos/triada/pdd-dea/interpretar-fragmento-pdd",
      {
        method: "POST",
        body: payload,
      }
    );
    return normalizarInterpretacionFragmentoPdd(res, solicitud);
  } catch (error) {
    console.warn("Fallo interpretarFragmentoSemanticoPdd, usando intérprete local:", error);
    return interpretarFragmentoSemanticoPddLocal(solicitud);
  }
}





