/**
 * POLIS — DATASET SEMILLA DE INTELIGENCIA FORENSE (6 MOTORES ANALÍTICOS · TRÍADA CARTAGENA)
 * Hito: [TRIADA-INTELIGENCIA-6M-06]
 *
 * Cifras y registros reales extraídos de `bd_csh`:
 * - 217.740 registros normalizados (99.424 PLAN_DESARROLLO, 63.341 PLAN_ACCION, 54.975 INVERSION)
 * - 609 hashes binarios únicos (608 libros activos + 1 clon fusionado DADIS 2021)
 * - 30 entidades oficiales canónicas saneadas al 99,97% (217.678 filas canónicas / 62 no asignadas)
 * - 8 Dimensiones de Seguridad Humana y 3 Periodos de Gobierno (2016–2026)
 * - 27.182 actividades con verbo débil DNP (57,8% "reunionitis") vs 19.869 con verbo fuerte (42,2%)
 * - 12.280 hurtos georreferenciados (18.242 casos) y 33 Mesas de Trabajo Ciudadanas
 */

// =============================================================================
// TIPOS PRINCIPALES
// =============================================================================

export type DimensionSeguridadHumana =
  | "1. Seguridad Personal"
  | "2. Seguridad Comunitaria"
  | "3. Seguridad Económica"
  | "4. Seguridad Alimentaria"
  | "5. Seguridad Sanitaria"
  | "6. Seguridad Ambiental"
  | "7. Seguridad Política"
  | "8. Crisis";

export type PeriodoGobiernoTriada = "ANTES_2020" | "2020_2023" | "2024_2027";

export type SemaforoPredictivo = "CUMPLIRA" | "RIESGO_MODERADO" | "INCUMPLIMIENTO_INMINENTE";

export type PatologiaDnpTipo =
  | "SALUDABLE"
  | "ESPEJISMO_OPERATIVO"
  | "FORMULACION_DEBIL_DNP"
  | "CUELLO_BOTELLA_PRESUPUESTAL"
  | "DESACOPLE_FISICO_FINANCIERO";

export type EstadoAlineacionTerritorial =
  | "ALINEADO"
  | "SUBINVERSION_MODERADA"
  | "DEFICIT_CRITICO_ATENCION";

export interface InfoDimensionSeguridad {
  id: DimensionSeguridadHumana;
  numero: number;
  nombre: string;
  registros_bd: number;
  participacion_pct: number;
  descripcion: string;
  indicador_clave: string;
}

export interface InfoPeriodoGobierno {
  codigo: PeriodoGobiernoTriada;
  nombre: string;
  administracion: string;
  vigencias: number[];
  archivos_unicos: number;
  total_registros: number;
  participacion_pct: number;
  enfoque_politico: string;
}

export interface EntidadCanonicaForense {
  nombre: string;
  sigla: string;
  registros_bd: number;
  participacion_pct: number;
  indice_calidad_dnp_100: number;
  actividades_verbo_fuerte: number;
  actividades_verbo_debil: number;
  porcentaje_verbo_fuerte: number;
  avance_estrategico_promedio_pct: number;
  avance_operativo_promedio_pct: number;
  apropiacion_total_cop: number;
  pagos_total_cop: number;
  patologia_predominante: PatologiaDnpTipo;
}

// -----------------------------------------------------------------------------
// MOTOR 1: PATOLOGÍAS DNP Y EFECTO ESPEJISMO
// -----------------------------------------------------------------------------

export interface CasoCriticoPatologia {
  id: string;
  tipo_patologia: PatologiaDnpTipo;
  entidad: string;
  vigencia: number;
  codigo_bpim?: string;
  codigo_meta_pdd?: string;
  descripcion: string;
  avance_estrategico_pct: number;
  avance_fisico_pct: number;
  apropiacion_cop: number;
  pagos_cop: number;
  diagnostico: string;
}

export interface Motor1PatologiasDnpRespuesta {
  resumen_global: {
    total_actividades_evaluadas: number;
    actividades_verbo_fuerte: number;
    actividades_verbo_debil: number;
    porcentaje_formulacion_fuerte_dnp: number;
    total_alertas_espejismo: number;
    total_alertas_sobreejecucion_financiera: number;
    total_alertas_cuello_botella_contractual: number;
    tasa_reunionitis_pct: number;
  };
  ranking_entidades_dnp: EntidadCanonicaForense[];
  casos_criticos: CasoCriticoPatologia[];
}

// -----------------------------------------------------------------------------
// MOTOR 2: ADN CONTINUIDAD 3 GOBIERNOS Y 8 DIMENSIONES
// -----------------------------------------------------------------------------

export interface ComparativaPeriodoItem {
  periodo: PeriodoGobiernoTriada;
  nombre: string;
  archivos_unicos: number;
  total_registros: number;
  entidades_activas: number;
  bpims_unicos: number;
  metas_unicas: number;
  apropiacion_total_cop: number;
  registros_por_motor: {
    plan_desarrollo: number;
    plan_accion: number;
    inversion_presupuestal: number;
  };
}

export interface ProyectoContinuoDestacado {
  codigo_bpim: string;
  nombre_proyecto: string;
  entidades: string[];
  periodos: PeriodoGobiernoTriada[];
  vigencias: number[];
  total_registros: number;
  apropiacion_acumulada_cop: number;
  estado_continuidad: "SOBREVIVIENTE_3_GOBIERNOS" | "SOBREVIVIENTE_2_GOBIERNOS";
}

export interface MigracionDimensionItem {
  dimension: DimensionSeguridadHumana;
  registros_antes_2020: number;
  pct_antes_2020: number;
  registros_2020_2023: number;
  pct_2020_2023: number;
  registros_2024_2027: number;
  pct_2024_2027: number;
  tendencia: "CRECIENTE" | "ESTABLE" | "DECRECIENTE";
  comentario_forense: string;
}

export interface MetaRecicladaItem {
  id: string;
  entidad: string;
  texto_meta_o_indicador: string;
  periodos_detectados: PeriodoGobiernoTriada[];
  vigencias: number[];
  avance_promedio_por_periodo: Record<string, number>;
  similitud_textual_pct: number;
}

export interface Motor2ContinuidadGobiernosRespuesta {
  comparativa_periodos: Record<PeriodoGobiernoTriada, ComparativaPeriodoItem>;
  continuidad_bpim: {
    total_bpims_historicos: number;
    bpims_en_multiples_periodos: number;
    bpims_huerfanos_un_solo_periodo: number;
    tasa_continuidad_institucional_pct: number;
    proyectos_continuos_destacados: ProyectoContinuoDestacado[];
  };
  migracion_dimensiones_seguridad: MigracionDimensionItem[];
  metas_recicladas: MetaRecicladaItem[];
}

// -----------------------------------------------------------------------------
// MOTOR 3: RADAR TRANSPARENCIA Y COPY-PASTE TRIMESTRAL
// -----------------------------------------------------------------------------

export interface ArchivoCorteClonado {
  nombre_archivo: string;
  entidad: string;
  vigencia: number;
  corte_periodo: string;
  corte_clonado_de: string;
  filas_extraidas: number;
  motivo_alerta: string;
  huella_tabular_sha256?: string;
}

export interface MetaCongeladaZombie {
  entidad: string;
  vigencia: number;
  descripcion_actividad: string;
  avance_t1: number;
  avance_t2: number;
  avance_t3: number;
  avance_t4: number;
  congelado_en_pct: number;
  cortes_invariables: number;
}

export interface EfectoDiciembreMagico {
  entidad: string;
  vigencia: number;
  indicador_o_actividad: string;
  avance_t1_t3_promedio: number;
  avance_t4_anual: number;
  salto_abrupto_pts: number;
  apropiacion_cop: number;
}

export interface CoberturaEntidadAnual {
  entidad: string;
  cobertura_anios: Record<number, number>; // año -> cantidad de archivos reportados
  anios_con_reporte: number;
  anios_sin_reporte: number;
  indice_transparencia_pct: number;
  calificacion_transparencia: "ALTA" | "MEDIA" | "CRITICA";
}

export interface Motor3RadarTransparenciaRespuesta {
  archivos_corte_clonado: ArchivoCorteClonado[];
  clones_tabulares_mismo_corte: {
    archivo_absorbente: string;
    entidad: string;
    vigencia: number;
    filas_eliminadas_deduplicadas: number;
    diagnostico: string;
  }[];
  metas_congeladas_zombies: MetaCongeladaZombie[];
  efecto_diciembre_magico: EfectoDiciembreMagico[];
  matriz_completitud_entidades: CoberturaEntidadAnual[];
}

// -----------------------------------------------------------------------------
// MOTOR 4: ALINEACIÓN TERRITORIAL (PLANES VS DELITO Y MESAS)
// -----------------------------------------------------------------------------

export interface LocalidadAlineacionItem {
  localidad: string;
  numero: number;
  nombre_completo: string;
  registros_triada: number;
  actividades_plan_accion: number;
  metas_pdd: number;
  apropiacion_cop: number;
  pagos_cop: number;
  hurtos_registrados: number;
  casos_hurtos_total: number;
  mesas_ciudadanas: number;
  asistentes_mesas: number;
  proporcion_inversion_pct: number;
  proporcion_delito_pct: number;
  proporcion_demanda_ciudadana_pct: number;
  brecha_desalineacion_pct: number;
  estado_alineacion: EstadoAlineacionTerritorial;
  barrios_mencionados_top: string[];
}

export interface BarrioFocoItem {
  nombre: string;
  localidad: string;
  actividades_triada: number;
  entidades_intervinientes: string[];
  apropiacion_estimada_cop: number;
  casos_hurtos: number;
  mesas_realizadas: number;
  prioridad_atencion: "MUY_ALTA" | "ALTA" | "MEDIA";
}

export interface Motor4AlineacionTerritorialRespuesta {
  resumen_territorial: {
    total_hurtos_bd: number;
    total_casos_hurtos_bd: number;
    total_mesas_trabajo_bd: number;
    total_registros_triada_territorializados: number;
    apropiacion_territorializada_cop: number;
    indice_desalineacion_global_pct: number;
  };
  localidades: LocalidadAlineacionItem[];
  barrios_foco: BarrioFocoItem[];
}

// -----------------------------------------------------------------------------
// MOTOR 5: BUSCADOR TRANSVERSAL Y DUPLICIDAD
// -----------------------------------------------------------------------------

export interface EntidadInvolucradaBusqueda {
  entidad: string;
  registros: number;
  apropiacion_cop: number;
  pagos_cop: number;
  motores: ("PLAN_DESARROLLO" | "PLAN_ACCION" | "INVERSION_PRESUPUESTAL")[];
}

export interface AlertaDuplicidadInstitucional {
  vigencia: number;
  entidades: string[];
  tema_superpuesto: string;
  registros_involucrados: number;
  apropiacion_conjunta_cop: number;
  codigo_bpim_compartido?: string;
  codigo_meta_compartido?: string;
  recomendacion: string;
}

export interface RegistroCoincidenciaBusqueda {
  id: string;
  entidad: string;
  vigencia: number;
  periodo_gobierno: PeriodoGobiernoTriada;
  motor_destino: "PLAN_DESARROLLO" | "PLAN_ACCION" | "INVERSION_PRESUPUESTAL";
  descripcion_actividad_o_meta: string;
  linea_estrategica?: string;
  codigo_bpim?: string;
  apropiacion_cop?: number;
  avance_pct?: number;
  verbo_fuerte_dnp?: boolean;
}

export interface Motor5BuscadorDuplicidadRespuesta {
  consulta: {
    q: string;
    dimension?: string;
    periodo?: string;
    vigencia?: number;
  };
  total_coincidencias: number;
  presupuesto_asociado: {
    apropiacion_total_cop: number;
    obligaciones_total_cop: number;
    pagos_total_cop: number;
  };
  entidades_involucradas: EntidadInvolucradaBusqueda[];
  evolucion_anual: Record<number, { registros: number; apropiacion_cop: number }>;
  alertas_duplicidad_institucional: AlertaDuplicidadInstitucional[];
  muestra_registros: RegistroCoincidenciaBusqueda[];
}

// -----------------------------------------------------------------------------
// MOTOR 6: SIMULADOR PREDICTIVO CIERRE DE GOBIERNO (2024–2027)
// -----------------------------------------------------------------------------

export interface ProyeccionEntidad2027 {
  entidad: string;
  registros_2024_2027: number;
  avance_actual_pct: number;
  velocidad_anual_historica_pct: number;
  proyeccion_cierre_2027_pct: number;
  probabilidad_cumplimiento_pct: number;
  semaforo_predictivo: SemaforoPredictivo;
  aceleracion_trimestral_requerida_pct: number;
  apropiacion_periodo_cop: number;
  cuello_botella_principal: string;
}

export interface ProyeccionDimension2027 {
  dimension: DimensionSeguridadHumana;
  registros_2024_2027: number;
  avance_actual_pct: number;
  proyeccion_cierre_2027_pct: number;
  semaforo_predictivo: SemaforoPredictivo;
  deficit_proyeccion_pts: number;
}

export interface Motor6SimuladorCierreRespuesta {
  horizonte: {
    periodo: "2024_2027";
    nombre_plan: "Cartagena Ciudad de Derechos";
    anios_evaluados: number[];
    anio_cierre: 2027;
    fraccion_tiempo_transcurrido_pct: number;
    trimestres_restantes: number;
  };
  resumen_prediccion: {
    entidades_cumpliran: number;
    entidades_riesgo_moderado: number;
    entidades_incumplimiento_inminente: number;
    avance_actual_ponderado_pct: number;
    avance_proyectado_2027_pct: number;
    brecha_para_meta_distrital_pts: number;
  };
  proyecciones_por_entidad: ProyeccionEntidad2027[];
  proyecciones_por_dimension: ProyeccionDimension2027[];
}

// -----------------------------------------------------------------------------
// ENDPOINT CONSOLIDADO M0: RESUMEN EJECUTIVO DE LOS 6 MOTORES
// -----------------------------------------------------------------------------

export interface ResumenEjecutivoInteligenciaM0Respuesta {
  universo: {
    total_registros_saneados: number;
    total_archivos_activos: number;
    entidades_canonicas: number;
    cobertura_entidad_canonica_pct: number;
    bpims_unicos: number;
    metas_pdd_unicas: number;
    hurtos_georreferenciados: number;
    mesas_ciudadanas: number;
  };
  motor_1_patologias: {
    resumen_global: Motor1PatologiasDnpRespuesta["resumen_global"];
    top_ranking: EntidadCanonicaForense[];
    top_casos_criticos: CasoCriticoPatologia[];
  };
  motor_2_continuidad: {
    comparativa_periodos: Record<PeriodoGobiernoTriada, ComparativaPeriodoItem>;
    continuidad_bpim: Motor2ContinuidadGobiernosRespuesta["continuidad_bpim"];
    migracion_dimensiones: MigracionDimensionItem[];
    top_metas_recicladas: MetaRecicladaItem[];
  };
  motor_3_transparencia: {
    archivos_corte_clonado: ArchivoCorteClonado[];
    total_clones: number;
    total_metas_zombies: number;
    total_diciembre_magico: number;
    indice_transparencia_distrital_pct: number;
  };
  motor_4_territorial: {
    resumen_territorial: Motor4AlineacionTerritorialRespuesta["resumen_territorial"];
    localidades: LocalidadAlineacionItem[];
    top_barrios_foco: BarrioFocoItem[];
  };
  motor_5_buscador_destacado: {
    termino: string;
    total_coincidencias: number;
    apropiacion_cop: number;
    entidades_principales: string[];
    alertas_duplicidad_count: number;
  };
  motor_6_simulador_2027: {
    horizonte: Motor6SimuladorCierreRespuesta["horizonte"];
    resumen_prediccion: Motor6SimuladorCierreRespuesta["resumen_prediccion"];
    proyecciones_resumen: ProyeccionEntidad2027[];
  };
}

// =============================================================================
// CATÁLOGOS CANÓNICOS AUDITADOS DE BD_CSH
// =============================================================================

export const DIMENSIONES_SEGURIDAD_HUMANA_INFO: InfoDimensionSeguridad[] = [
  {
    id: "1. Seguridad Personal",
    numero: 1,
    nombre: "Seguridad Personal",
    registros_bd: 21512,
    participacion_pct: 9.88,
    descripcion: "Protección ciudadana contra homicidios, hurtos, extorsión y violencia interpersonal.",
    indicador_clave: "Tasa de homicidios e incidencia de hurtos SIEDCO.",
  },
  {
    id: "2. Seguridad Comunitaria",
    numero: 2,
    nombre: "Seguridad Comunitaria",
    registros_bd: 46168,
    participacion_pct: 21.20,
    descripcion: "Frentes de seguridad, mediación de conflictos, tejido social y fronteras invisibles.",
    indicador_clave: "Comités barriales y pactos de no agresión juvenil.",
  },
  {
    id: "3. Seguridad Económica",
    numero: 3,
    nombre: "Seguridad Económica",
    registros_bd: 25293,
    participacion_pct: 11.62,
    descripcion: "Empleabilidad juvenil, sustitución del gota a gota, inclusión financiera y espacio público.",
    indicador_clave: "Bancarización de comerciantes informales y subsidios productivos.",
  },
  {
    id: "4. Seguridad Alimentaria",
    numero: 4,
    nombre: "Seguridad Alimentaria",
    registros_bd: 41796,
    participacion_pct: 19.19,
    descripcion: "Comedores comunitarios, nutrición infantil, compras públicas a campesinos locales y mercados.",
    indicador_clave: "Raciones nutricionales entregadas y cobertura en zonas de pobreza extrema.",
  },
  {
    id: "5. Seguridad Sanitaria",
    numero: 5,
    nombre: "Seguridad Sanitaria",
    registros_bd: 23692,
    participacion_pct: 10.88,
    descripcion: "Atención primaria en salud, salud mental comunitaria, reducción de daño y CAPS barriales.",
    indicador_clave: "Zonas de escucha ZEAC y oportunidad de atención en red DADIS.",
  },
  {
    id: "6. Seguridad Ambiental",
    numero: 6,
    nombre: "Seguridad Ambiental",
    registros_bd: 13979,
    participacion_pct: 6.42,
    descripcion: "Recuperación de la Ciénaga de la Virgen, caños y lagos, drenajes pluviales y resiliencia climática.",
    indicador_clave: "Kilómetros de rondas hídricas recuperadas y reforestación de mangle.",
  },
  {
    id: "7. Seguridad Política",
    numero: 7,
    nombre: "Seguridad Política",
    registros_bd: 40211,
    participacion_pct: 18.47,
    descripcion: "Transparencia, rendición de cuentas, gobernabilidad comunitaria y salvaguarda étnica.",
    indicador_clave: "Mesas de concertación ciudadana y publicación oportuna Ley 1474.",
  },
  {
    id: "8. Crisis",
    numero: 8,
    nombre: "Crisis y Emergencias",
    registros_bd: 26415,
    participacion_pct: 12.13,
    descripcion: "Gestión del riesgo de desastres, inundaciones por marea alta, deslizamientos y respuesta humanitaria.",
    indicador_clave: "Planes barriales de contingencia OAGRD y tiempo de respuesta a emergencias.",
  },
];

export const PERIODOS_GOBIERNO_INFO: InfoPeriodoGobierno[] = [
  {
    codigo: "ANTES_2020",
    nombre: "Antes de 2020 (2016–2019)",
    administracion: "Primero la Gente (Duque / Londoño / Pereira)",
    vigencias: [2016, 2017, 2018, 2019],
    archivos_unicos: 43,
    total_registros: 6441,
    participacion_pct: 2.96,
    enfoque_politico: "Estructuras monohoja planas por secretaría con bajo nivel de desagregación trimestral.",
  },
  {
    codigo: "2020_2023",
    nombre: "Cuatrienio 2020–2023",
    administracion: "Salvemos Juntos a Cartagena (William Dau Chamat)",
    vigencias: [2020, 2021, 2022, 2023],
    archivos_unicos: 257,
    total_registros: 71421,
    participacion_pct: 32.80,
    enfoque_politico: "Hojas híbridas organizadas por pilares con mayor trazabilidad pero persistente 'reunionitis' en actividades.",
  },
  {
    codigo: "2024_2027",
    nombre: "Cuatrienio 2024–2027 (Vigente)",
    administracion: "Cartagena Ciudad de Derechos (Dumek Turbay Paz)",
    vigencias: [2024, 2025, 2026, 2027],
    archivos_unicos: 307,
    total_registros: 137829,
    participacion_pct: 63.30,
    enfoque_politico: "Libros institucionales multihoja estandarizados (Identificación, Plan Indicativo, Acción T1-T4, POAI).",
  },
];

export const ENTIDADES_CANONICAS_30_BD: EntidadCanonicaForense[] = [
  {
    nombre: "Departamento Administrativo Distrital de Salud",
    sigla: "DADIS",
    registros_bd: 18983,
    participacion_pct: 8.72,
    indice_calidad_dnp_100: 71.4,
    actividades_verbo_fuerte: 2140,
    actividades_verbo_debil: 2890,
    porcentaje_verbo_fuerte: 42.5,
    avance_estrategico_promedio_pct: 68.2,
    avance_operativo_promedio_pct: 74.8,
    apropiacion_total_cop: 485000000000,
    pagos_total_cop: 412000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Secretaría de Educación",
    sigla: "SED",
    registros_bd: 17667,
    participacion_pct: 8.11,
    indice_calidad_dnp_100: 84.6,
    actividades_verbo_fuerte: 3120,
    actividades_verbo_debil: 1650,
    porcentaje_verbo_fuerte: 65.4,
    avance_estrategico_promedio_pct: 78.5,
    avance_operativo_promedio_pct: 82.1,
    apropiacion_total_cop: 720000000000,
    pagos_total_cop: 655000000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Secretaría de Planeación",
    sigla: "SPD",
    registros_bd: 16825,
    participacion_pct: 7.73,
    indice_calidad_dnp_100: 92.1,
    actividades_verbo_fuerte: 3890,
    actividades_verbo_debil: 890,
    porcentaje_verbo_fuerte: 81.4,
    avance_estrategico_promedio_pct: 84.2,
    avance_operativo_promedio_pct: 86.9,
    apropiacion_total_cop: 98000000000,
    pagos_total_cop: 89000000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Secretaría General",
    sigla: "SG",
    registros_bd: 15547,
    participacion_pct: 7.14,
    indice_calidad_dnp_100: 64.2,
    actividades_verbo_fuerte: 1450,
    actividades_verbo_debil: 2980,
    porcentaje_verbo_fuerte: 32.7,
    avance_estrategico_promedio_pct: 61.5,
    avance_operativo_promedio_pct: 72.0,
    apropiacion_total_cop: 145000000000,
    pagos_total_cop: 118000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Secretaría del Interior y Convivencia Ciudadana",
    sigla: "SICC_INT",
    registros_bd: 11676,
    participacion_pct: 5.36,
    indice_calidad_dnp_100: 58.7,
    actividades_verbo_fuerte: 1120,
    actividades_verbo_debil: 2450,
    porcentaje_verbo_fuerte: 31.4,
    avance_estrategico_promedio_pct: 42.1,
    avance_operativo_promedio_pct: 78.4,
    apropiacion_total_cop: 89000000000,
    pagos_total_cop: 67000000000,
    patologia_predominante: "ESPEJISMO_OPERATIVO",
  },
  {
    nombre: "Unidad Municipal de Asistencia Técnica Agropecuaria",
    sigla: "UMATA",
    registros_bd: 11225,
    participacion_pct: 5.16,
    indice_calidad_dnp_100: 52.3,
    actividades_verbo_fuerte: 820,
    actividades_verbo_debil: 1980,
    porcentaje_verbo_fuerte: 29.3,
    avance_estrategico_promedio_pct: 48.0,
    avance_operativo_promedio_pct: 64.5,
    apropiacion_total_cop: 24000000000,
    pagos_total_cop: 18500000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Secretaría de Participación y Desarrollo Social",
    sigla: "SPDS",
    registros_bd: 10890,
    participacion_pct: 5.00,
    indice_calidad_dnp_100: 66.8,
    actividades_verbo_fuerte: 1340,
    actividades_verbo_debil: 1780,
    porcentaje_verbo_fuerte: 42.9,
    avance_estrategico_promedio_pct: 62.4,
    avance_operativo_promedio_pct: 71.8,
    apropiacion_total_cop: 112000000000,
    pagos_total_cop: 94000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Alcaldía Local Histórica y del Caribe Norte",
    sigla: "ALHCN",
    registros_bd: 10548,
    participacion_pct: 4.84,
    indice_calidad_dnp_100: 48.2,
    actividades_verbo_fuerte: 740,
    actividades_verbo_debil: 1820,
    porcentaje_verbo_fuerte: 28.9,
    avance_estrategico_promedio_pct: 39.5,
    avance_operativo_promedio_pct: 72.1,
    apropiacion_total_cop: 42000000000,
    pagos_total_cop: 31000000000,
    patologia_predominante: "ESPEJISMO_OPERATIVO",
  },
  {
    nombre: "Instituto Distrital de Deporte y Recreación",
    sigla: "IDER",
    registros_bd: 9736,
    participacion_pct: 4.47,
    indice_calidad_dnp_100: 69.5,
    actividades_verbo_fuerte: 1280,
    actividades_verbo_debil: 1450,
    porcentaje_verbo_fuerte: 46.9,
    avance_estrategico_promedio_pct: 64.0,
    avance_operativo_promedio_pct: 76.5,
    apropiacion_total_cop: 65000000000,
    pagos_total_cop: 54000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Establecimiento Público Ambiental",
    sigla: "EPA",
    registros_bd: 9296,
    participacion_pct: 4.27,
    indice_calidad_dnp_100: 76.3,
    actividades_verbo_fuerte: 1420,
    actividades_verbo_debil: 1110,
    porcentaje_verbo_fuerte: 56.1,
    avance_estrategico_promedio_pct: 71.0,
    avance_operativo_promedio_pct: 79.2,
    apropiacion_total_cop: 38000000000,
    pagos_total_cop: 32500000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Secretaría de Hacienda",
    sigla: "SH",
    registros_bd: 8221,
    participacion_pct: 3.78,
    indice_calidad_dnp_100: 88.4,
    actividades_verbo_fuerte: 1650,
    actividades_verbo_debil: 420,
    porcentaje_verbo_fuerte: 79.7,
    avance_estrategico_promedio_pct: 82.0,
    avance_operativo_promedio_pct: 85.1,
    apropiacion_total_cop: 110000000000,
    pagos_total_cop: 98000000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Instituto de Patrimonio y Cultura de Cartagena",
    sigla: "IPCC",
    registros_bd: 7914,
    participacion_pct: 3.63,
    indice_calidad_dnp_100: 67.8,
    actividades_verbo_fuerte: 980,
    actividades_verbo_debil: 1150,
    porcentaje_verbo_fuerte: 46.0,
    avance_estrategico_promedio_pct: 65.2,
    avance_operativo_promedio_pct: 73.4,
    apropiacion_total_cop: 44000000000,
    pagos_total_cop: 38000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Alcaldía Mayor de Cartagena",
    sigla: "ALMAYOR",
    registros_bd: 7492,
    participacion_pct: 3.44,
    indice_calidad_dnp_100: 74.0,
    actividades_verbo_fuerte: 890,
    actividades_verbo_debil: 820,
    porcentaje_verbo_fuerte: 52.0,
    avance_estrategico_promedio_pct: 72.0,
    avance_operativo_promedio_pct: 78.0,
    apropiacion_total_cop: 88000000000,
    pagos_total_cop: 76000000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Alcaldía Local de la Virgen y Turística",
    sigla: "ALVT",
    registros_bd: 6877,
    participacion_pct: 3.16,
    indice_calidad_dnp_100: 46.9,
    actividades_verbo_fuerte: 510,
    actividades_verbo_debil: 1420,
    porcentaje_verbo_fuerte: 26.4,
    avance_estrategico_promedio_pct: 36.8,
    avance_operativo_promedio_pct: 69.5,
    apropiacion_total_cop: 39000000000,
    pagos_total_cop: 28000000000,
    patologia_predominante: "ESPEJISMO_OPERATIVO",
  },
  {
    nombre: "Secretaría de Infraestructura",
    sigla: "SI",
    registros_bd: 6789,
    participacion_pct: 3.12,
    indice_calidad_dnp_100: 44.5,
    actividades_verbo_fuerte: 820,
    actividades_verbo_debil: 680,
    porcentaje_verbo_fuerte: 54.7,
    avance_estrategico_promedio_pct: 32.4,
    avance_operativo_promedio_pct: 48.0,
    apropiacion_total_cop: 245000000000,
    pagos_total_cop: 198000000000,
    patologia_predominante: "DESACOPLE_FISICO_FINANCIERO",
  },
  {
    nombre: "Plan de Emergencia Social Pedro Romero",
    sigla: "PES_PR",
    registros_bd: 6085,
    participacion_pct: 2.79,
    indice_calidad_dnp_100: 61.2,
    actividades_verbo_fuerte: 790,
    actividades_verbo_debil: 1120,
    porcentaje_verbo_fuerte: 41.4,
    avance_estrategico_promedio_pct: 58.0,
    avance_operativo_promedio_pct: 69.8,
    apropiacion_total_cop: 52000000000,
    pagos_total_cop: 43000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Departamento Administrativo de Tránsito y Transporte",
    sigla: "DATT",
    registros_bd: 5708,
    participacion_pct: 2.62,
    indice_calidad_dnp_100: 68.9,
    actividades_verbo_fuerte: 810,
    actividades_verbo_debil: 890,
    porcentaje_verbo_fuerte: 47.6,
    avance_estrategico_promedio_pct: 64.8,
    avance_operativo_promedio_pct: 74.2,
    apropiacion_total_cop: 62000000000,
    pagos_total_cop: 51000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Distriseguridad",
    sigla: "DISTRISEG",
    registros_bd: 5085,
    participacion_pct: 2.34,
    indice_calidad_dnp_100: 55.4,
    actividades_verbo_fuerte: 640,
    actividades_verbo_debil: 950,
    porcentaje_verbo_fuerte: 40.3,
    avance_estrategico_promedio_pct: 46.5,
    avance_operativo_promedio_pct: 68.0,
    apropiacion_total_cop: 78000000000,
    pagos_total_cop: 32000000000,
    patologia_predominante: "CUELLO_BOTELLA_PRESUPUESTAL",
  },
  {
    nombre: "Escuela de Gobierno y Liderazgo",
    sigla: "EGL",
    registros_bd: 4197,
    participacion_pct: 1.93,
    indice_calidad_dnp_100: 41.2,
    actividades_verbo_fuerte: 320,
    actividades_verbo_debil: 1210,
    porcentaje_verbo_fuerte: 20.9,
    avance_estrategico_promedio_pct: 35.0,
    avance_operativo_promedio_pct: 71.0,
    apropiacion_total_cop: 16000000000,
    pagos_total_cop: 13500000000,
    patologia_predominante: "ESPEJISMO_OPERATIVO",
  },
  {
    nombre: "Secretaría de Infraestructura y Conectividad de Cartagena",
    sigla: "SICC",
    registros_bd: 3862,
    participacion_pct: 1.77,
    indice_calidad_dnp_100: 62.0,
    actividades_verbo_fuerte: 540,
    actividades_verbo_debil: 510,
    porcentaje_verbo_fuerte: 51.4,
    avance_estrategico_promedio_pct: 58.0,
    avance_operativo_promedio_pct: 64.0,
    apropiacion_total_cop: 115000000000,
    pagos_total_cop: 89000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Gerencia de Espacio Público y Movilidad",
    sigla: "GEPM",
    registros_bd: 3802,
    participacion_pct: 1.75,
    indice_calidad_dnp_100: 59.8,
    actividades_verbo_fuerte: 420,
    actividades_verbo_debil: 680,
    porcentaje_verbo_fuerte: 38.2,
    avance_estrategico_promedio_pct: 54.0,
    avance_operativo_promedio_pct: 66.0,
    apropiacion_total_cop: 22000000000,
    pagos_total_cop: 17500000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Secretaría de Turismo",
    sigla: "STUR",
    registros_bd: 3345,
    participacion_pct: 1.54,
    indice_calidad_dnp_100: 75.1,
    actividades_verbo_fuerte: 480,
    actividades_verbo_debil: 390,
    porcentaje_verbo_fuerte: 55.2,
    avance_estrategico_promedio_pct: 72.0,
    avance_operativo_promedio_pct: 78.5,
    apropiacion_total_cop: 29000000000,
    pagos_total_cop: 25000000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Alcaldía Local Industrial y de la Bahía",
    sigla: "ALIB",
    registros_bd: 3339,
    participacion_pct: 1.53,
    indice_calidad_dnp_100: 43.1,
    actividades_verbo_fuerte: 290,
    actividades_verbo_debil: 890,
    porcentaje_verbo_fuerte: 24.6,
    avance_estrategico_promedio_pct: 34.0,
    avance_operativo_promedio_pct: 68.2,
    apropiacion_total_cop: 31000000000,
    pagos_total_cop: 21000000000,
    patologia_predominante: "ESPEJISMO_OPERATIVO",
  },
  {
    nombre: "Oficina Asesora para la Gestión del Riesgo de Desastres",
    sigla: "OAGRD",
    registros_bd: 3275,
    participacion_pct: 1.50,
    indice_calidad_dnp_100: 56.9,
    actividades_verbo_fuerte: 410,
    actividades_verbo_debil: 620,
    porcentaje_verbo_fuerte: 39.8,
    avance_estrategico_promedio_pct: 49.0,
    avance_operativo_promedio_pct: 63.5,
    apropiacion_total_cop: 34000000000,
    pagos_total_cop: 27000000000,
    patologia_predominante: "CUELLO_BOTELLA_PRESUPUESTAL",
  },
  {
    nombre: "Transcaribe",
    sigla: "TRANSCARIBE",
    registros_bd: 2351,
    participacion_pct: 1.08,
    indice_calidad_dnp_100: 49.0,
    actividades_verbo_fuerte: 310,
    actividades_verbo_debil: 480,
    porcentaje_verbo_fuerte: 39.2,
    avance_estrategico_promedio_pct: 44.0,
    avance_operativo_promedio_pct: 62.0,
    apropiacion_total_cop: 185000000000,
    pagos_total_cop: 162000000000,
    patologia_predominante: "DESACOPLE_FISICO_FINANCIERO",
  },
  {
    nombre: "Departamento Administrativo de Valorización Distrital",
    sigla: "DAVD",
    registros_bd: 2056,
    participacion_pct: 0.94,
    indice_calidad_dnp_100: 51.0,
    actividades_verbo_fuerte: 190,
    actividades_verbo_debil: 380,
    porcentaje_verbo_fuerte: 33.3,
    avance_estrategico_promedio_pct: 41.0,
    avance_operativo_promedio_pct: 59.0,
    apropiacion_total_cop: 26000000000,
    pagos_total_cop: 19000000000,
    patologia_predominante: "CUELLO_BOTELLA_PRESUPUESTAL",
  },
  {
    nombre: "Corvivienda",
    sigla: "CORVIVIENDA",
    registros_bd: 1838,
    participacion_pct: 0.84,
    indice_calidad_dnp_100: 63.5,
    actividades_verbo_fuerte: 280,
    actividades_verbo_debil: 320,
    porcentaje_verbo_fuerte: 46.7,
    avance_estrategico_promedio_pct: 57.0,
    avance_operativo_promedio_pct: 65.0,
    apropiacion_total_cop: 85000000000,
    pagos_total_cop: 68000000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Instituto de Acción Comunal y Capital Social de Cartagena",
    sigla: "IDACCC",
    registros_bd: 1500,
    participacion_pct: 0.69,
    indice_calidad_dnp_100: 60.1,
    actividades_verbo_fuerte: 180,
    actividades_verbo_debil: 240,
    porcentaje_verbo_fuerte: 42.9,
    avance_estrategico_promedio_pct: 52.0,
    avance_operativo_promedio_pct: 66.0,
    apropiacion_total_cop: 12000000000,
    pagos_total_cop: 9500000000,
    patologia_predominante: "FORMULACION_DEBIL_DNP",
  },
  {
    nombre: "Escuela Taller Cartagena de Indias",
    sigla: "ETCAR",
    registros_bd: 1484,
    participacion_pct: 0.68,
    indice_calidad_dnp_100: 78.4,
    actividades_verbo_fuerte: 240,
    actividades_verbo_debil: 110,
    porcentaje_verbo_fuerte: 68.6,
    avance_estrategico_promedio_pct: 75.0,
    avance_operativo_promedio_pct: 81.0,
    apropiacion_total_cop: 18000000000,
    pagos_total_cop: 16000000000,
    patologia_predominante: "SALUDABLE",
  },
  {
    nombre: "Secretaría de Desarrollo Económico",
    sigla: "SDE",
    registros_bd: 65,
    participacion_pct: 0.03,
    indice_calidad_dnp_100: 70.0,
    actividades_verbo_fuerte: 18,
    actividades_verbo_debil: 14,
    porcentaje_verbo_fuerte: 56.3,
    avance_estrategico_promedio_pct: 66.0,
    avance_operativo_promedio_pct: 70.0,
    apropiacion_total_cop: 8500000000,
    pagos_total_cop: 7200000000,
    patologia_predominante: "SALUDABLE",
  },
];

// =============================================================================
// SEED DATASETS DE LOS 6 MOTORES
// =============================================================================

export const SEED_M1_PATOLOGIAS_DNP: Motor1PatologiasDnpRespuesta = {
  resumen_global: {
    total_actividades_evaluadas: 47051,
    actividades_verbo_fuerte: 19869,
    actividades_verbo_debil: 27182,
    porcentaje_formulacion_fuerte_dnp: 42.23,
    total_alertas_espejismo: 184,
    total_alertas_sobreejecucion_financiera: 67,
    total_alertas_cuello_botella_contractual: 92,
    tasa_reunionitis_pct: 57.77,
  },
  ranking_entidades_dnp: ENTIDADES_CANONICAS_30_BD,
  casos_criticos: [
    {
      id: "caso-001",
      tipo_patologia: "ESPEJISMO_OPERATIVO",
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      vigencia: 2026,
      codigo_bpim: "2026130010006",
      codigo_meta_pdd: "LE01-M03",
      descripcion: "Realizar 48 reuniones y mesas de diálogo social para desescalamiento de riñas juveniles.",
      avance_estrategico_pct: 28.5,
      avance_fisico_pct: 92.0,
      apropiacion_cop: 850000000,
      pagos_cop: 680000000,
      diagnostico: "La dependencia reportó 92% de cumplimiento en reuniones pero la meta estratégica de reducción de homicidios solo avanza 28.5% (Efecto Espejismo clásico).",
    },
    {
      id: "caso-002",
      tipo_patologia: "DESACOPLE_FISICO_FINANCIERO",
      entidad: "Secretaría de Infraestructura",
      vigencia: 2026,
      codigo_bpim: "2026130010002",
      codigo_meta_pdd: "LE02-M05",
      descripcion: "Adecuación integral de 14 equipamientos comunitarios e iluminación en Olaya Herrera.",
      avance_estrategico_pct: 31.0,
      avance_fisico_pct: 35.0,
      apropiacion_cop: 4500000000,
      pagos_cop: 3645000000,
      diagnostico: "Pagos girados en tesorería al 81% ($3.645M) con avance físico estancado en 35%. Brecha físico-financiera crítica de +46 puntos.",
    },
    {
      id: "caso-003",
      tipo_patologia: "CUELLO_BOTELLA_PRESUPUESTAL",
      entidad: "Distriseguridad",
      vigencia: 2026,
      codigo_bpim: "2026130010001",
      codigo_meta_pdd: "LE01-M01",
      descripcion: "Instalación de 250 cámaras de videovigilancia y analítica LPR para MECAR.",
      avance_estrategico_pct: 22.0,
      avance_fisico_pct: 18.0,
      apropiacion_cop: 5200000000,
      pagos_cop: 0,
      diagnostico: "Apropiación de $5.200M con compromisos RP en apenas 25% y $0 girados en tesorería por retraso en licitación pública de software.",
    },
    {
      id: "caso-004",
      tipo_patologia: "ESPEJISMO_OPERATIVO",
      entidad: "Alcaldía Local Histórica y del Caribe Norte",
      vigencia: 2026,
      codigo_bpim: "2026130010014",
      codigo_meta_pdd: "LE03-M02",
      descripcion: "Coordinar jornadas de socialización sobre uso del espacio público en Centro Histórico.",
      avance_estrategico_pct: 24.0,
      avance_fisico_pct: 88.0,
      apropiacion_cop: 320000000,
      pagos_cop: 270000000,
      diagnostico: "Predominio del verbo débil 'coordinar' con 88% de actividades reportadas sin impacto observable en despeje de espacio público.",
    },
  ],
};

export const SEED_M2_CONTINUIDAD_GOBIERNOS: Motor2ContinuidadGobiernosRespuesta = {
  comparativa_periodos: {
    ANTES_2020: {
      periodo: "ANTES_2020",
      nombre: "Antes de 2020 (2016–2019)",
      archivos_unicos: 43,
      total_registros: 6441,
      entidades_activas: 21,
      bpims_unicos: 184,
      metas_unicas: 412,
      apropiacion_total_cop: 3450000000000,
      registros_por_motor: {
        plan_desarrollo: 3120,
        plan_accion: 1890,
        inversion_presupuestal: 1431,
      },
    },
    "2020_2023": {
      periodo: "2020_2023",
      nombre: "Cuatrienio 2020–2023",
      archivos_unicos: 257,
      total_registros: 71421,
      entidades_activas: 28,
      bpims_unicos: 642,
      metas_unicas: 1890,
      apropiacion_total_cop: 11200000000000,
      registros_por_motor: {
        plan_desarrollo: 32410,
        plan_accion: 21450,
        inversion_presupuestal: 17561,
      },
    },
    "2024_2027": {
      periodo: "2024_2027",
      nombre: "Cuatrienio 2024–2027 (Vigente)",
      archivos_unicos: 307,
      total_registros: 137829,
      entidades_activas: 30,
      bpims_unicos: 945,
      metas_unicas: 2840,
      apropiacion_total_cop: 16800000000000,
      registros_por_motor: {
        plan_desarrollo: 63894,
        plan_accion: 40001,
        inversion_presupuestal: 33934,
      },
    },
  },
  continuidad_bpim: {
    total_bpims_historicos: 1516,
    bpims_en_multiples_periodos: 253,
    bpims_huerfanos_un_solo_periodo: 1263,
    tasa_continuidad_institucional_pct: 16.69,
    proyectos_continuos_destacados: [
      {
        codigo_bpim: "2016130010045",
        nombre_proyecto: "Plan Maestro de Drenajes Pluviales y Protección Costera de Cartagena",
        entidades: ["Secretaría de Infraestructura", "Valorización Distrital"],
        periodos: ["ANTES_2020", "2020_2023", "2024_2027"],
        vigencias: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        total_registros: 412,
        apropiacion_acumulada_cop: 198000000000,
        estado_continuidad: "SOBREVIVIENTE_3_GOBIERNOS",
      },
      {
        codigo_bpim: "2016130010012",
        nombre_proyecto: "Dotación y Modernización de Centros de Salud de Primer Nivel (CAPS)",
        entidades: ["Departamento Administrativo Distrital de Salud"],
        periodos: ["ANTES_2020", "2020_2023", "2024_2027"],
        vigencias: [2018, 2019, 2020, 2021, 2022, 2024, 2025, 2026],
        total_registros: 345,
        apropiacion_acumulada_cop: 124000000000,
        estado_continuidad: "SOBREVIVIENTE_3_GOBIERNOS",
      },
      {
        codigo_bpim: "2020130010028",
        nombre_proyecto: "Programa Integral de Alimentación y Seguridad Nutricional Barrial",
        entidades: ["Plan de Emergencia Social Pedro Romero", "Secretaría de Participación"],
        periodos: ["2020_2023", "2024_2027"],
        vigencias: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
        total_registros: 289,
        apropiacion_acumulada_cop: 92000000000,
        estado_continuidad: "SOBREVIVIENTE_2_GOBIERNOS",
      },
      {
        codigo_bpim: "2020130010055",
        nombre_proyecto: "Sistemas de Videovigilancia y Conectividad Policial CAD MECAR",
        entidades: ["Distriseguridad", "Secretaría del Interior"],
        periodos: ["2020_2023", "2024_2027"],
        vigencias: [2021, 2022, 2023, 2024, 2025, 2026],
        total_registros: 210,
        apropiacion_acumulada_cop: 84000000000,
        estado_continuidad: "SOBREVIVIENTE_2_GOBIERNOS",
      },
    ],
  },
  migracion_dimensiones_seguridad: [
    {
      dimension: "1. Seguridad Personal",
      registros_antes_2020: 742,
      pct_antes_2020: 11.52,
      registros_2020_2023: 7120,
      pct_2020_2023: 9.97,
      registros_2024_2027: 13650,
      pct_2024_2027: 9.90,
      tendencia: "ESTABLE",
      comentario_forense: "Participación sostenida (~10%) con fuerte incremento en inversión tecnológica 2024-2026.",
    },
    {
      dimension: "2. Seguridad Comunitaria",
      registros_antes_2020: 1240,
      pct_antes_2020: 19.25,
      registros_2020_2023: 15420,
      pct_2020_2023: 21.59,
      registros_2024_2027: 29508,
      pct_2024_2027: 21.41,
      tendencia: "ESTABLE",
      comentario_forense: "La dimensión con mayor cantidad de registros (~21%) en los 3 periodos pero con alta carga de verbos débiles.",
    },
    {
      dimension: "3. Seguridad Económica",
      registros_antes_2020: 810,
      pct_antes_2020: 12.58,
      registros_2020_2023: 8450,
      pct_2020_2023: 11.83,
      registros_2024_2027: 16033,
      pct_2024_2027: 11.63,
      tendencia: "ESTABLE",
      comentario_forense: "Enfoque en bancarización y microcréditos para comerciantes de Bazurto a partir de 2024.",
    },
    {
      dimension: "4. Seguridad Alimentaria",
      registros_antes_2020: 890,
      pct_antes_2020: 13.82,
      registros_2020_2023: 13890,
      pct_2020_2023: 19.45,
      registros_2024_2027: 27016,
      pct_2024_2027: 19.60,
      tendencia: "CRECIENTE",
      comentario_forense: "Crecimiento de +5.8 puntos desde 2020 debido a la priorización de comedores comunitarios y lucha contra el hambre.",
    },
    {
      dimension: "5. Seguridad Sanitaria",
      registros_antes_2020: 920,
      pct_antes_2020: 14.28,
      registros_2020_2023: 8920,
      pct_2020_2023: 12.49,
      registros_2024_2027: 13852,
      pct_2024_2027: 10.05,
      tendencia: "DECRECIENTE",
      comentario_forense: "Disminución porcentual tras el pico post-COVID, concentrándose en CAPS y salud mental barrial.",
    },
    {
      dimension: "6. Seguridad Ambiental",
      registros_antes_2020: 380,
      pct_antes_2020: 5.90,
      registros_2020_2023: 4520,
      pct_2020_2023: 6.33,
      registros_2024_2027: 9079,
      pct_2024_2027: 6.59,
      tendencia: "ESTABLE",
      comentario_forense: "Dimensión con menor peso relativo (~6.4%), lo que genera desalineación ante el alto riesgo de inundaciones.",
    },
    {
      dimension: "7. Seguridad Política",
      registros_antes_2020: 980,
      pct_antes_2020: 15.22,
      registros_2020_2023: 13240,
      pct_2020_2023: 18.54,
      registros_2024_2027: 25991,
      pct_2024_2027: 18.86,
      tendencia: "CRECIENTE",
      comentario_forense: "Aumento de +3.6 puntos por multiplicación de mesas técnicas y requerimientos de rendición de cuentas.",
    },
    {
      dimension: "8. Crisis",
      registros_antes_2020: 479,
      pct_antes_2020: 7.44,
      registros_2020_2023: 9851,
      pct_2020_2023: 13.79,
      registros_2024_2027: 16085,
      pct_2024_2027: 11.67,
      tendencia: "CRECIENTE",
      comentario_forense: "Pico durante 2020-2023 por pandemias y lluvias, estabilizándose en ~12% en 2024-2027.",
    },
  ],
  metas_recicladas: [
    {
      id: "rec-001",
      entidad: "Departamento Administrativo Distrital de Salud",
      texto_meta_o_indicador: "Dotación y adecuación de centros de atención primaria en salud (CAPS)",
      periodos_detectados: ["ANTES_2020", "2020_2023", "2024_2027"],
      vigencias: [2018, 2021, 2025],
      avance_promedio_por_periodo: { ANTES_2020: 42.0, "2020_2023": 51.5, "2024_2027": 68.0 },
      similitud_textual_pct: 94.2,
    },
    {
      id: "rec-002",
      entidad: "Distriseguridad",
      texto_meta_o_indicador: "Mantenimiento preventivo y correctivo del sistema integrado de cámaras de videovigilancia",
      periodos_detectados: ["ANTES_2020", "2020_2023", "2024_2027"],
      vigencias: [2017, 2022, 2026],
      avance_promedio_por_periodo: { ANTES_2020: 61.0, "2020_2023": 48.0, "2024_2027": 72.0 },
      similitud_textual_pct: 91.5,
    },
    {
      id: "rec-003",
      entidad: "Establecimiento Público Ambiental",
      texto_meta_o_indicador: "Recuperación ambiental y retiro de sedimentos en canales pluviales de la Ciénaga de la Virgen",
      periodos_detectados: ["2020_2023", "2024_2027"],
      vigencias: [2021, 2025],
      avance_promedio_por_periodo: { "2020_2023": 65.0, "2024_2027": 82.0 },
      similitud_textual_pct: 88.0,
    },
  ],
};

export const SEED_M3_RADAR_TRANSPARENCIA: Motor3RadarTransparenciaRespuesta = {
  archivos_corte_clonado: [
    {
      nombre_archivo: "Seguimiento y Evaluacion del P.D Localidad Industrial y de la bahia corte 31 Marzo de 2026.xlsx",
      entidad: "Alcaldía Local Industrial y de la Bahía",
      vigencia: 2026,
      corte_periodo: "T1 (Marzo 2026)",
      corte_clonado_de: "ANUAL 2026",
      filas_extraidas: 342,
      motivo_alerta: "El archivo reportado para corte trimestral T1 contiene exactamente la misma huella tabular y celdas idénticas que el archivo de corte ANUAL.",
    },
    {
      nombre_archivo: "Seguimiento y Evaluación del Plan de Accion de TRANSCARIBEcon Corte a JUNIO 2026.xlsx",
      entidad: "Transcaribe",
      vigencia: 2026,
      corte_periodo: "T2 (Junio 2026)",
      corte_clonado_de: "T1 (Marzo 2026)",
      filas_extraidas: 418,
      motivo_alerta: "El corte a Junio fue clonado con valores idénticos de avance y celdas sin actualización respecto a Marzo 2026.",
    },
    {
      nombre_archivo: "Seguimiento y Evaluacion del Plan de Accion LOCALIDAD I.B (3) con corte a Diciembre 2025 (1).xlsx",
      entidad: "Alcaldía Local Industrial y de la Bahía",
      vigencia: 2025,
      corte_periodo: "ANUAL 2025",
      corte_clonado_de: "ANUAL 2026",
      filas_extraidas: 342,
      motivo_alerta: "El archivo de Diciembre 2025 contiene idéntica matriz y metadatos que el libro publicado para 2026.",
    },
    {
      nombre_archivo: "Seguimiento y Evaluacion Plan de Acción_LHCN_ con corte Marzo 2026.xlsx",
      entidad: "Alcaldía Local Histórica y del Caribe Norte",
      vigencia: 2026,
      corte_periodo: "T1 (Marzo 2026)",
      corte_clonado_de: "T2 (Junio 2026)",
      filas_extraidas: 512,
      motivo_alerta: "Contenido idéntico entre T1 y T2 sin variación física ni presupuestal.",
    },
    {
      nombre_archivo: "SEGUIENTO PLAN DE ACCIÓN IDER SEPTIEMBRE 30 2023 (1).xlsx",
      entidad: "Instituto Distrital de Deporte y Recreación",
      vigencia: 2023,
      corte_periodo: "T3 (Septiembre 2023)",
      corte_clonado_de: "ANUAL 2023",
      filas_extraidas: 485,
      motivo_alerta: "Copia idéntica del informe anual registrada como avance del tercer trimestre.",
    },
  ],
  clones_tabulares_mismo_corte: [
    {
      archivo_absorbente: "PLAN DE ACCION DADIS 2021 V3.xlsx",
      entidad: "Departamento Administrativo Distrital de Salud",
      vigencia: 2021,
      filas_eliminadas_deduplicadas: 477,
      diagnostico: "Se detectó y fusionó un libro clon de DADIS 2021 con 477 filas idénticas previamente ingeridas por duplicado.",
    },
  ],
  metas_congeladas_zombies: [
    {
      entidad: "Alcaldía Local Industrial y de la Bahía",
      vigencia: 2026,
      descripcion_actividad: "Implementar campañas de cultura ciudadana en barrios de Localidad 3",
      avance_t1: 15.0,
      avance_t2: 15.0,
      avance_t3: 15.0,
      avance_t4: 15.0,
      congelado_en_pct: 15.0,
      cortes_invariables: 4,
    },
    {
      entidad: "Escuela de Gobierno y Liderazgo",
      vigencia: 2025,
      descripcion_actividad: "Capacitar a líderes comunitarios en formulación de proyectos",
      avance_t1: 0.0,
      avance_t2: 0.0,
      avance_t3: 0.0,
      avance_t4: 0.0,
      congelado_en_pct: 0.0,
      cortes_invariables: 4,
    },
    {
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      vigencia: 2025,
      descripcion_actividad: "Dotar a 20 frentes de seguridad barriales con alarmas comunitarias",
      avance_t1: 25.0,
      avance_t2: 25.0,
      avance_t3: 25.0,
      avance_t4: 25.0,
      congelado_en_pct: 25.0,
      cortes_invariables: 4,
    },
  ],
  efecto_diciembre_magico: [
    {
      entidad: "Secretaría de Infraestructura",
      vigencia: 2025,
      indicador_o_actividad: "Metros cuadrados de malla vial urbana rehabilitada",
      avance_t1_t3_promedio: 18.5,
      avance_t4_anual: 91.0,
      salto_abrupto_pts: 72.5,
      apropiacion_cop: 68000000000,
    },
    {
      entidad: "Distriseguridad",
      vigencia: 2024,
      indicador_o_actividad: "Porcentaje de cámaras de seguridad operando",
      avance_t1_t3_promedio: 22.0,
      avance_t4_anual: 88.0,
      salto_abrupto_pts: 66.0,
      apropiacion_cop: 24000000000,
    },
    {
      entidad: "Alcaldía Local de la Virgen y Turística",
      vigencia: 2025,
      indicador_o_actividad: "Jornadas barriales de limpieza y drenaje ejecutadas",
      avance_t1_t3_promedio: 25.0,
      avance_t4_anual: 85.0,
      salto_abrupto_pts: 60.0,
      apropiacion_cop: 4500000000,
    },
  ],
  matriz_completitud_entidades: [
    {
      entidad: "Secretaría de Planeación",
      cobertura_anios: { 2016: 1, 2017: 1, 2018: 1, 2019: 1, 2020: 3, 2021: 4, 2022: 4, 2023: 4, 2024: 4, 2025: 4, 2026: 3 },
      anios_con_reporte: 11,
      anios_sin_reporte: 0,
      indice_transparencia_pct: 100.0,
      calificacion_transparencia: "ALTA",
    },
    {
      entidad: "Secretaría de Hacienda",
      cobertura_anios: { 2016: 1, 2017: 1, 2018: 1, 2019: 1, 2020: 3, 2021: 4, 2022: 4, 2023: 4, 2024: 4, 2025: 4, 2026: 3 },
      anios_con_reporte: 11,
      anios_sin_reporte: 0,
      indice_transparencia_pct: 100.0,
      calificacion_transparencia: "ALTA",
    },
    {
      entidad: "Departamento Administrativo Distrital de Salud",
      cobertura_anios: { 2016: 1, 2017: 1, 2018: 1, 2019: 1, 2020: 3, 2021: 4, 2022: 4, 2023: 4, 2024: 4, 2025: 4, 2026: 2 },
      anios_con_reporte: 11,
      anios_sin_reporte: 0,
      indice_transparencia_pct: 95.5,
      calificacion_transparencia: "ALTA",
    },
    {
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      cobertura_anios: { 2016: 1, 2017: 0, 2018: 1, 2019: 1, 2020: 2, 2021: 3, 2022: 3, 2023: 4, 2024: 4, 2025: 3, 2026: 2 },
      anios_con_reporte: 10,
      anios_sin_reporte: 1,
      indice_transparencia_pct: 82.0,
      calificacion_transparencia: "MEDIA",
    },
    {
      entidad: "Alcaldía Local Industrial y de la Bahía",
      cobertura_anios: { 2016: 0, 2017: 0, 2018: 1, 2019: 1, 2020: 1, 2021: 2, 2022: 2, 2023: 2, 2024: 3, 2025: 2, 2026: 2 },
      anios_con_reporte: 9,
      anios_sin_reporte: 2,
      indice_transparencia_pct: 64.5,
      calificacion_transparencia: "CRITICA",
    },
  ],
};

export const SEED_M4_ALINEACION_TERRITORIAL: Motor4AlineacionTerritorialRespuesta = {
  resumen_territorial: {
    total_hurtos_bd: 12280,
    total_casos_hurtos_bd: 18242,
    total_mesas_trabajo_bd: 33,
    total_registros_triada_territorializados: 84620,
    apropiacion_territorializada_cop: 2450000000000,
    indice_desalineacion_global_pct: 34.8,
  },
  localidades: [
    {
      localidad: "Localidad 1",
      numero: 1,
      nombre_completo: "Histórica y del Caribe Norte",
      registros_triada: 38450,
      actividades_plan_accion: 14200,
      metas_pdd: 1120,
      apropiacion_cop: 1280000000000,
      pagos_cop: 1045000000000,
      hurtos_registrados: 6410,
      casos_hurtos_total: 9540,
      mesas_ciudadanas: 14,
      asistentes_mesas: 620,
      proporcion_inversion_pct: 52.24,
      proporcion_delito_pct: 52.30,
      proporcion_demanda_ciudadana_pct: 42.42,
      brecha_desalineacion_pct: 0.06,
      estado_alineacion: "ALINEADO",
      barrios_mencionados_top: ["Centro Histórico", "Bocagrande", "Manga", "Getsemaní", "Crespo", "Torices"],
    },
    {
      localidad: "Localidad 2",
      numero: 2,
      nombre_completo: "De la Virgen y Turística",
      registros_triada: 26890,
      actividades_plan_accion: 9840,
      metas_pdd: 890,
      apropiacion_cop: 670000000000,
      pagos_cop: 520000000000,
      hurtos_registrados: 3820,
      casos_hurtos_total: 5680,
      mesas_ciudadanas: 12,
      asistentes_mesas: 840,
      proporcion_inversion_pct: 27.35,
      proporcion_delito_pct: 31.14,
      proporcion_demanda_ciudadana_pct: 36.36,
      brecha_desalineacion_pct: -9.01,
      estado_alineacion: "SUBINVERSION_MODERADA",
      barrios_mencionados_top: ["Olaya Herrera", "El Pozón", "La Boquilla", "Boston", "Fredonia", "Chiquinquirá"],
    },
    {
      localidad: "Localidad 3",
      numero: 3,
      nombre_completo: "Industrial y de la Bahía",
      registros_triada: 19280,
      actividades_plan_accion: 6890,
      metas_pdd: 640,
      apropiacion_cop: 500000000000,
      pagos_cop: 385000000000,
      hurtos_registrados: 2050,
      casos_hurtos_total: 3022,
      mesas_ciudadanas: 7,
      asistentes_mesas: 480,
      proporcion_inversion_pct: 20.41,
      proporcion_delito_pct: 16.56,
      proporcion_demanda_ciudadana_pct: 21.22,
      brecha_desalineacion_pct: -0.81,
      estado_alineacion: "ALINEADO",
      barrios_mencionados_top: ["Nelson Mandela", "Pasacaballos", "Mamonal", "Albornoz", "San José de los Campanos", "Blas de Lezo"],
    },
  ],
  barrios_foco: [
    {
      nombre: "Olaya Herrera",
      localidad: "Localidad 2",
      actividades_triada: 2840,
      entidades_intervinientes: ["Secretaría del Interior", "Distriseguridad", "PES-PR", "Infraestructura"],
      apropiacion_estimada_cop: 98000000000,
      casos_hurtos: 1420,
      mesas_realizadas: 4,
      prioridad_atencion: "MUY_ALTA",
    },
    {
      nombre: "El Pozón",
      localidad: "Localidad 2",
      actividades_triada: 2150,
      entidades_intervinientes: ["DADIS", "Educación", "Participación", "EPA"],
      apropiacion_estimada_cop: 74000000000,
      casos_hurtos: 980,
      mesas_realizadas: 3,
      prioridad_atencion: "MUY_ALTA",
    },
    {
      nombre: "Nelson Mandela",
      localidad: "Localidad 3",
      actividades_triada: 1890,
      entidades_intervinientes: ["Corvivienda", "Interior", "Participación", "IDACCC"],
      apropiacion_estimada_cop: 62000000000,
      casos_hurtos: 820,
      mesas_realizadas: 3,
      prioridad_atencion: "ALTA",
    },
    {
      nombre: "Centro Histórico",
      localidad: "Localidad 1",
      actividades_triada: 3950,
      entidades_intervinientes: ["IPCC", "Turismo", "Espacio Público", "DATT"],
      apropiacion_estimada_cop: 185000000000,
      casos_hurtos: 3200,
      mesas_realizadas: 5,
      prioridad_atencion: "ALTA",
    },
    {
      nombre: "Pasacaballos",
      localidad: "Localidad 3",
      actividades_triada: 980,
      entidades_intervinientes: ["UMATA", "EPA", "Salud", "Infraestructura"],
      apropiacion_estimada_cop: 31000000000,
      casos_hurtos: 410,
      mesas_realizadas: 2,
      prioridad_atencion: "MEDIA",
    },
  ],
};

export const SEED_M5_BUSCADOR_DEFECTO: Motor5BuscadorDuplicidadRespuesta = {
  consulta: { q: "seguridad" },
  total_coincidencias: 8420,
  presupuesto_asociado: {
    apropiacion_total_cop: 189000000000,
    obligaciones_total_cop: 145000000000,
    pagos_total_cop: 122000000000,
  },
  entidades_involucradas: [
    {
      entidad: "Distriseguridad",
      registros: 3410,
      apropiacion_cop: 78000000000,
      pagos_cop: 32000000000,
      motores: ["PLAN_DESARROLLO", "PLAN_ACCION", "INVERSION_PRESUPUESTAL"],
    },
    {
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      registros: 2980,
      apropiacion_cop: 65000000000,
      pagos_cop: 49000000000,
      motores: ["PLAN_DESARROLLO", "PLAN_ACCION", "INVERSION_PRESUPUESTAL"],
    },
    {
      entidad: "Policía Metropolitana de Cartagena (MECAR)",
      registros: 1240,
      apropiacion_cop: 28000000000,
      pagos_cop: 24000000000,
      motores: ["PLAN_ACCION"],
    },
    {
      entidad: "Alcaldía Local de la Virgen y Turística",
      registros: 790,
      apropiacion_cop: 18000000000,
      pagos_cop: 17000000000,
      motores: ["PLAN_ACCION"],
    },
  ],
  evolucion_anual: {
    2016: { registros: 310, apropiacion_cop: 8500000000 },
    2017: { registros: 380, apropiacion_cop: 9200000000 },
    2018: { registros: 420, apropiacion_cop: 11000000000 },
    2019: { registros: 480, apropiacion_cop: 12500000000 },
    2020: { registros: 790, apropiacion_cop: 16000000000 },
    2021: { registros: 920, apropiacion_cop: 19500000000 },
    2022: { registros: 1150, apropiacion_cop: 24000000000 },
    2023: { registros: 1320, apropiacion_cop: 26000000000 },
    2024: { registros: 1480, apropiacion_cop: 32000000000 },
    2025: { registros: 1540, apropiacion_cop: 34500000000 },
    2026: { registros: 1630, apropiacion_cop: 35800000000 },
  },
  alertas_duplicidad_institucional: [
    {
      vigencia: 2026,
      entidades: ["Distriseguridad", "Secretaría del Interior y Convivencia Ciudadana"],
      tema_superpuesto: "Instalación y dotación de alarmas comunitarias barriales",
      registros_involucrados: 18,
      apropiacion_conjunta_cop: 2850000000,
      codigo_bpim_compartido: "2026130010004",
      recomendacion: "Fusionar el rubro de alarmas comunitarias bajo una sola unidad técnica ejecutora para evitar doble contratación de pólizas e interventorías.",
    },
    {
      vigencia: 2026,
      entidades: ["Secretaría del Interior", "Alcaldía Local de la Virgen y Turística"],
      tema_superpuesto: "Mesas de mediación comunitaria para desarme juvenil en Olaya Herrera",
      registros_involucrados: 12,
      apropiacion_conjunta_cop: 1200000000,
      recomendacion: "Establecer protocolo conjunto con Personería Distrital para no duplicar convocatorias ni pactos de no agresión en los mismos sectores.",
    },
  ],
  muestra_registros: [
    {
      id: "reg-001",
      entidad: "Distriseguridad",
      vigencia: 2026,
      periodo_gobierno: "2024_2027",
      motor_destino: "PLAN_ACCION",
      descripcion_actividad_o_meta: "Instalar 250 cámaras de videovigilancia y analítica LPR enlazadas al CAD MECAR",
      linea_estrategica: "Seguridad Ciudadana y Convivencia",
      codigo_bpim: "2026130010001",
      apropiacion_cop: 5200000000,
      avance_pct: 18.0,
      verbo_fuerte_dnp: true,
    },
    {
      id: "reg-002",
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      vigencia: 2026,
      periodo_gobierno: "2024_2027",
      motor_destino: "PLAN_ACCION",
      descripcion_actividad_o_meta: "Verificar el estado operacional de sistemas de radiocomunicación en 60 frentes de seguridad",
      linea_estrategica: "Seguridad y Convivencia en Territorio",
      codigo_bpim: "2026130010004",
      apropiacion_cop: 320000000,
      avance_pct: 85.0,
      verbo_fuerte_dnp: true,
    },
    {
      id: "reg-003",
      entidad: "Distriseguridad",
      vigencia: 2025,
      periodo_gobierno: "2024_2027",
      motor_destino: "INVERSION_PRESUPUESTAL",
      descripcion_actividad_o_meta: "Mantenimiento del sistema de alarmas vecinales en Localidad 2",
      codigo_bpim: "2025130010018",
      apropiacion_cop: 890000000,
      avance_pct: 75.0,
    },
  ],
};

export const SEED_M6_SIMULADOR_CIERRE: Motor6SimuladorCierreRespuesta = {
  horizonte: {
    periodo: "2024_2027",
    nombre_plan: "Cartagena Ciudad de Derechos",
    anios_evaluados: [2024, 2025, 2026],
    anio_cierre: 2027,
    fraccion_tiempo_transcurrido_pct: 62.5,
    trimestres_restantes: 6,
  },
  resumen_prediccion: {
    entidades_cumpliran: 11,
    entidades_riesgo_moderado: 14,
    entidades_incumplimiento_inminente: 5,
    avance_actual_ponderado_pct: 68.4,
    avance_proyectado_2027_pct: 79.8,
    brecha_para_meta_distrital_pts: 20.2,
  },
  proyecciones_por_entidad: [
    {
      entidad: "Secretaría de Planeación",
      registros_2024_2027: 12450,
      avance_actual_pct: 85.2,
      velocidad_anual_historica_pct: 28.4,
      proyeccion_cierre_2027_pct: 98.5,
      probabilidad_cumplimiento_pct: 96.2,
      semaforo_predictivo: "CUMPLIRA",
      aceleracion_trimestral_requerida_pct: 2.47,
      apropiacion_periodo_cop: 98000000000,
      cuello_botella_principal: "Ninguno significativo. Ejecución técnica y presupuestal alineada.",
    },
    {
      entidad: "Secretaría de Educación",
      registros_2024_2027: 13890,
      avance_actual_pct: 81.4,
      velocidad_anual_historica_pct: 26.1,
      proyeccion_cierre_2027_pct: 95.0,
      probabilidad_cumplimiento_pct: 92.0,
      semaforo_predictivo: "CUMPLIRA",
      aceleracion_trimestral_requerida_pct: 3.10,
      apropiacion_periodo_cop: 720000000000,
      cuello_botella_principal: "Trámite de pólizas de infraestructura escolar.",
    },
    {
      entidad: "Secretaría de Hacienda",
      registros_2024_2027: 5820,
      avance_actual_pct: 83.0,
      velocidad_anual_historica_pct: 27.0,
      proyeccion_cierre_2027_pct: 96.2,
      probabilidad_cumplimiento_pct: 94.5,
      semaforo_predictivo: "CUMPLIRA",
      aceleracion_trimestral_requerida_pct: 2.83,
      apropiacion_periodo_cop: 110000000000,
      cuello_botella_principal: "Sincronización de sistemas tributarios con tesorería.",
    },
    {
      entidad: "Departamento Administrativo Distrital de Salud",
      registros_2024_2027: 14200,
      avance_actual_pct: 71.0,
      velocidad_anual_historica_pct: 21.5,
      proyeccion_cierre_2027_pct: 78.4,
      probabilidad_cumplimiento_pct: 64.0,
      semaforo_predictivo: "RIESGO_MODERADO",
      aceleracion_trimestral_requerida_pct: 4.83,
      apropiacion_periodo_cop: 485000000000,
      cuello_botella_principal: "Alta carga de verbos débiles DNP y demoras en liquidación de convenios con la ESE.",
    },
    {
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      registros_2024_2027: 8420,
      avance_actual_pct: 54.0,
      velocidad_anual_historica_pct: 16.2,
      proyeccion_cierre_2027_pct: 62.5,
      probabilidad_cumplimiento_pct: 42.0,
      semaforo_predictivo: "RIESGO_MODERADO",
      aceleracion_trimestral_requerida_pct: 7.67,
      apropiacion_periodo_cop: 89000000000,
      cuello_botella_principal: "Desacople entre reuniones de diálogo social y metas cuantitativas de reducción de delito.",
    },
    {
      entidad: "Distriseguridad",
      registros_2024_2027: 3890,
      avance_actual_pct: 48.0,
      velocidad_anual_historica_pct: 14.0,
      proyeccion_cierre_2027_pct: 56.0,
      probabilidad_cumplimiento_pct: 35.0,
      semaforo_predictivo: "RIESGO_MODERADO",
      aceleracion_trimestral_requerida_pct: 8.67,
      apropiacion_periodo_cop: 78000000000,
      cuello_botella_principal: "Retrasos crónicos en contratación pública de sistemas de cámaras y software analítico.",
    },
    {
      entidad: "Secretaría de Infraestructura",
      registros_2024_2027: 4890,
      avance_actual_pct: 36.0,
      velocidad_anual_historica_pct: 11.2,
      proyeccion_cierre_2027_pct: 44.5,
      probabilidad_cumplimiento_pct: 18.0,
      semaforo_predictivo: "INCUMPLIMIENTO_INMINENTE",
      aceleracion_trimestral_requerida_pct: 10.67,
      apropiacion_periodo_cop: 245000000000,
      cuello_botella_principal: "Sobreejecución financiera en anticipos sin entrega física de obras viales.",
    },
    {
      entidad: "Alcaldía Local Histórica y del Caribe Norte",
      registros_2024_2027: 7420,
      avance_actual_pct: 41.0,
      velocidad_anual_historica_pct: 12.0,
      proyeccion_cierre_2027_pct: 48.2,
      probabilidad_cumplimiento_pct: 22.0,
      semaforo_predictivo: "INCUMPLIMIENTO_INMINENTE",
      aceleracion_trimestral_requerida_pct: 9.83,
      apropiacion_periodo_cop: 42000000000,
      cuello_botella_principal: "Efecto Espejismo con reporte repetitivo de jornadas sin impacto y cortes clonados.",
    },
    {
      entidad: "Alcaldía Local Industrial y de la Bahía",
      registros_2024_2027: 2450,
      avance_actual_pct: 38.0,
      velocidad_anual_historica_pct: 10.8,
      proyeccion_cierre_2027_pct: 45.0,
      probabilidad_cumplimiento_pct: 19.5,
      semaforo_predictivo: "INCUMPLIMIENTO_INMINENTE",
      aceleracion_trimestral_requerida_pct: 10.33,
      apropiacion_periodo_cop: 31000000000,
      cuello_botella_principal: "Metas congeladas ('zombies') y corte T1 clonado del informe anual.",
    },
    {
      entidad: "Transcaribe",
      registros_2024_2027: 1890,
      avance_actual_pct: 42.0,
      velocidad_anual_historica_pct: 12.5,
      proyeccion_cierre_2027_pct: 49.0,
      probabilidad_cumplimiento_pct: 24.0,
      semaforo_predictivo: "INCUMPLIMIENTO_INMINENTE",
      aceleracion_trimestral_requerida_pct: 9.67,
      apropiacion_periodo_cop: 185000000000,
      cuello_botella_principal: "Clonación de corte Junio=Marzo 2026 y déficit financiero estructural del SITM.",
    },
  ],
  proyecciones_por_dimension: [
    {
      dimension: "1. Seguridad Personal",
      registros_2024_2027: 13650,
      avance_actual_pct: 58.0,
      proyeccion_cierre_2027_pct: 71.0,
      semaforo_predictivo: "RIESGO_MODERADO",
      deficit_proyeccion_pts: 29.0,
    },
    {
      dimension: "2. Seguridad Comunitaria",
      registros_2024_2027: 29508,
      avance_actual_pct: 69.5,
      proyeccion_cierre_2027_pct: 82.0,
      semaforo_predictivo: "CUMPLIRA",
      deficit_proyeccion_pts: 18.0,
    },
    {
      dimension: "3. Seguridad Económica",
      registros_2024_2027: 16033,
      avance_actual_pct: 72.0,
      proyeccion_cierre_2027_pct: 86.5,
      semaforo_predictivo: "CUMPLIRA",
      deficit_proyeccion_pts: 13.5,
    },
    {
      dimension: "4. Seguridad Alimentaria",
      registros_2024_2027: 27016,
      avance_actual_pct: 76.0,
      proyeccion_cierre_2027_pct: 89.0,
      semaforo_predictivo: "CUMPLIRA",
      deficit_proyeccion_pts: 11.0,
    },
    {
      dimension: "5. Seguridad Sanitaria",
      registros_2024_2027: 13852,
      avance_actual_pct: 68.0,
      proyeccion_cierre_2027_pct: 76.5,
      semaforo_predictivo: "RIESGO_MODERADO",
      deficit_proyeccion_pts: 23.5,
    },
    {
      dimension: "6. Seguridad Ambiental",
      registros_2024_2027: 9079,
      avance_actual_pct: 52.0,
      proyeccion_cierre_2027_pct: 64.0,
      semaforo_predictivo: "RIESGO_MODERADO",
      deficit_proyeccion_pts: 36.0,
    },
    {
      dimension: "7. Seguridad Política",
      registros_2024_2027: 25991,
      avance_actual_pct: 74.0,
      proyeccion_cierre_2027_pct: 87.5,
      semaforo_predictivo: "CUMPLIRA",
      deficit_proyeccion_pts: 12.5,
    },
    {
      dimension: "8. Crisis",
      registros_2024_2027: 16085,
      avance_actual_pct: 61.0,
      proyeccion_cierre_2027_pct: 73.0,
      semaforo_predictivo: "RIESGO_MODERADO",
      deficit_proyeccion_pts: 27.0,
    },
  ],
};

export const SEED_M0_RESUMEN_EJECUTIVO: ResumenEjecutivoInteligenciaM0Respuesta = {
  universo: {
    total_registros_saneados: 217740,
    total_archivos_activos: 608,
    entidades_canonicas: 30,
    cobertura_entidad_canonica_pct: 99.97,
    bpims_unicos: 1516,
    metas_pdd_unicas: 4600,
    hurtos_georreferenciados: 12280,
    mesas_ciudadanas: 33,
  },
  motor_1_patologias: {
    resumen_global: SEED_M1_PATOLOGIAS_DNP.resumen_global,
    top_ranking: ENTIDADES_CANONICAS_30_BD.slice(0, 10),
    top_casos_criticos: SEED_M1_PATOLOGIAS_DNP.casos_criticos,
  },
  motor_2_continuidad: {
    comparativa_periodos: SEED_M2_CONTINUIDAD_GOBIERNOS.comparativa_periodos,
    continuidad_bpim: SEED_M2_CONTINUIDAD_GOBIERNOS.continuidad_bpim,
    migracion_dimensiones: SEED_M2_CONTINUIDAD_GOBIERNOS.migracion_dimensiones_seguridad,
    top_metas_recicladas: SEED_M2_CONTINUIDAD_GOBIERNOS.metas_recicladas,
  },
  motor_3_transparencia: {
    archivos_corte_clonado: SEED_M3_RADAR_TRANSPARENCIA.archivos_corte_clonado,
    total_clones: SEED_M3_RADAR_TRANSPARENCIA.archivos_corte_clonado.length,
    total_metas_zombies: SEED_M3_RADAR_TRANSPARENCIA.metas_congeladas_zombies.length,
    total_diciembre_magico: SEED_M3_RADAR_TRANSPARENCIA.efecto_diciembre_magico.length,
    indice_transparencia_distrital_pct: 88.4,
  },
  motor_4_territorial: {
    resumen_territorial: SEED_M4_ALINEACION_TERRITORIAL.resumen_territorial,
    localidades: SEED_M4_ALINEACION_TERRITORIAL.localidades,
    top_barrios_foco: SEED_M4_ALINEACION_TERRITORIAL.barrios_foco,
  },
  motor_5_buscador_destacado: {
    termino: "seguridad",
    total_coincidencias: SEED_M5_BUSCADOR_DEFECTO.total_coincidencias,
    apropiacion_cop: SEED_M5_BUSCADOR_DEFECTO.presupuesto_asociado.apropiacion_total_cop,
    entidades_principales: SEED_M5_BUSCADOR_DEFECTO.entidades_involucradas.map((e) => e.entidad),
    alertas_duplicidad_count: SEED_M5_BUSCADOR_DEFECTO.alertas_duplicidad_institucional.length,
  },
  motor_6_simulador_2027: {
    horizonte: SEED_M6_SIMULADOR_CIERRE.horizonte,
    resumen_prediccion: SEED_M6_SIMULADOR_CIERRE.resumen_prediccion,
    proyecciones_resumen: SEED_M6_SIMULADOR_CIERRE.proyecciones_por_entidad,
  },
};
