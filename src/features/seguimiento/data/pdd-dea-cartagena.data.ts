/**
 * POLIS — DATASET SEMILLA DE EVALUACIÓN DE PLANES DE DESARROLLO, CONCILIACIÓN PPI Y DEA (CARTAGENA 2012–2027)
 * Hito: [TRIADA-FRONTEND-DATA-PDD-09]
 *
 * Basado en las especificaciones del Plan Maestro `bridge/00_plan_maestro_data_pdd_09.md`
 * y los 8 documentos normativos Markdown en `/root/polis/data/planes_desarrollo/`:
 * 1. PDD 2024–2027: «Cartagena, Ciudad de Derechos» (Acuerdo Distrital 139 de 2024)
 *    PPI Oficial = $12.800.853.474.855 COP ($12,801B corrientes)
 *    Línea 1 «Seguridad Humana» = $5.666.917.744.338 COP (44,27% del PDD) con 5 Impulsores de Avance
 *    42 Impulsores de Avance y 172 Programas oficiales
 * 2. PDD 2020–2023: «Salvemos Juntos a Cartagena» (P.A. 016 de 2020)
 *    PPI Oficial = $6.022.982,66 M COP constantes 2019 ($6,023B COP)
 *    4 Pilares + Eje Transversal, 33 Líneas y 172 Programas
 * 3. PDD 2016–2019: «Primero la Gente» (Acuerdo 006 de 2016)
 *    3.013 filas en bd_csh, 23 entidades, 806 metas únicas, 1.184 indicadores
 * 4. PDD 2013–2015: «Ahora Sí Cartagena» (Acuerdo 016 de 2013)
 *    PPI Oficial (2014–2015) = $1.874.167.605.000 COP ($1.874,17 M COP) en 4 Objetivos Estratégicos
 * 5. PDD 2012–2015: «En Cartagena Hay Campo para Todos» (Acuerdo 001/012 de 2012, 116 págs.)
 * 6. Los 3 Planes de Desarrollo Local (PDL 2024–2027 — Acuerdos Locales 004 de 2024):
 *    - Localidad 1 (Histórica): $97.691.041.529 COP FDL
 *    - Localidad 2 (De la Virgen): $161.289.996.409,01 COP FDL
 *    - Localidad 3 (Industrial): $46.000.000.000 COP FDL
 *    Total Fondos de Desarrollo Local = $304.981.037.938 COP (~$304,98 mil millones)
 * 7. Cruce Tripartito PDD <-> PA <-> Inversión (32.330 PDD, 28.630 PA, 20.953 Presupuesto, 72.701 saneadas)
 * 8. DEA Multi-Nivel (Entidades n=28, Líneas Estratégicas n=6, Localidades PDL n=3) y Malmquist LP Exacto
 */

// =============================================================================
// 1. TIPOS E INTERFACES DEL MODELO PDD - DEA - PPI
// =============================================================================

export type CodigoPlanDesarrollo =
  | "PDD_2024_2027"
  | "PDD_2020_2023"
  | "PDD_2016_2019"
  | "PDD_2013_2015"
  | "PDD_2012_2015"
  | "PDL_2024_2027";

export type InsumoDeaPdd = "conciliado_ppi" | "reportado";

export type NivelDeaPdd = "ENTIDADES" | "LINEAS_ESTRATEGICAS" | "LOCALIDADES_PDL";

export type ModoImputacionPdd = "directa" | "tripartita";

export interface PlanDesarrolloInfo {
  codigo: CodigoPlanDesarrollo;
  nombre_oficial: string;
  lema: string;
  cuatrienio: string;
  alcalde: string;
  norma_adopcion: string;
  fecha_adopcion: string;
  paginas_documento: number;
  filas_bd_csh: number;
  entidades_participantes: number;
  metas_pdd_unicas: number;
  indicadores_unicos: number;
  proyectos_bpim_asociados: number;
  ppi_total_cuatrienio_mcop: number;
  ppi_total_cuatrienio_mcop_constante_2025: number;
  ppi_estado?: "OFICIAL_EXTRAIDO" | "NO_EXTRAIDO_DE_FUENTE_DIGITAL" | "ESTIMADO_CALCULADO";
  fuente_archivo_md: string;
  estado_historico: "VIGENTE_ACTIVO" | "CERRADO_AUDITADO" | "LINEA_BASE_DOCUMENTAL";
}

export interface PlanDesarrolloIndividual {
  codigo: string;
  tipo: "PDD" | "PDL";
  nombre_oficial: string;
  cuatrienio: string;
  norma_adopcion: string;
  ppi_total_corriente_cop: number;
  ppi_total_constante_2025_cop: number;
  ppi_estado: "OFICIAL_EXTRAIDO";
  lineas_o_ejes_count: number;
}

export interface MetaOficialResumen {
  plan_codigo: CodigoPlanDesarrollo;
  total_metas_oficiales_acuerdo: number;
  metas_vinculadas_bd_csh: number;
  pct_vinculacion: number;
  tipo_emparejamiento_predominante: "CODIGO_EXACTO" | "INDICADOR_ENTIDAD" | "SEMANTICO_LINEA";
}

export interface DetalleAnualPpi {
  vigencia: number;
  monto_corriente_mcop: number;
  monto_constante_2025_mcop: number;
  factor_deflactacion_ipc: number;
  recursos_distritales_ordinarios_mcop: number;
  regalias_sgr_directas_mcop: number;
  regalias_sgr_educacion_superior_mcop: number;
}

export interface PpiPorLineaEstrategica {
  linea_codigo: string;
  linea_nombre: string;
  monto_total_cuatrienio_mcop: number;
  monto_total_constante_2025_mcop: number;
  participacion_porcentual: number;
  metas_asociadas: number;
}

export interface ConciliacionPpiVsBdCshItem {
  vigencia: number;
  plan_codigo: CodigoPlanDesarrollo;
  ppi_oficial_acuerdo_mcop: number;
  ppi_oficial_constante_2025_mcop: number;
  reportado_matrices_bd_csh_mcop: number;
  brecha_sobrerreporte_mcop: number;
  factor_calibracion: number;
  filas_matrices: number;
  diagnostico_calibracion: string;
}

export interface DatoIpcHistorico {
  anio: number;
  inflacion_pct: number;
  indice_base_2025: number;
  factor_deflactor_hacia_2025: number;
  fuente: string;
}

export interface ResumenCumplimientoPlan {
  plan_codigo: CodigoPlanDesarrollo;
  nombre_plan: string;
  cuatrienio: string;
  metas_totales_unicas: number;
  metas_con_avance_verificado: number;
  metas_en_ruta_ge75: number;
  metas_alerta_media_40_75: number;
  metas_rezago_critico_lt40: number;
  metas_huerfanas_sin_avance: number;
  porcentaje_en_ruta: number;
  porcentaje_alerta_media: number;
  porcentaje_rezago_critico: number;
  porcentaje_huerfanas: number;
  avance_fisico_promedio_pct: number;
  // Campos de Imputación Tripartita PDD <-> PA <-> Inversión
  avance_consolidado_tripartito_pct?: number;
  metas_resueltas_en_pa?: number;
  metas_con_soporte_inversion?: number;
}

export interface ComponenteSeguridadHumana {
  codigo: string;
  nombre: string;
  metas_cantidad: number;
  indicadores_cantidad: number;
  avance_promedio_pct: number;
  presupuesto_ppi_mcop: number;
  entidad_lider: string;
  estado_semaforo: "EN_RUTA" | "ALERTA_MEDIA" | "REZAGO_CRITICO";
  programas_destacados?: string[];
}

export interface MacroproyectoEstrategico {
  id: string;
  nombre: string;
  linea_estrategica: string;
  entidad_responsable: string;
  inversion_ppi_mcop: number;
  avance_fisico_pct: number;
  estado: "EN_RUTA" | "ALERTA_MEDIA" | "REZAGO_CRITICO";
  descripcion: string;
}

export interface PlanDesarrolloLocalAvance {
  localidad_id: number;
  nombre: string;
  alcaldia_local: string;
  metas_locales_cantidad: number;
  avance_promedio_pct: number;
  presupuesto_fdl_mcop: number;
  estado: "EN_RUTA" | "ALERTA_MEDIA";
}

export interface FondoDesarrolloLocalDetalle {
  localidad_id: number;
  nombre_localidad: string;
  nombre_plan: string;
  acuerdo_local: string;
  total_fdl_mcop: number;
  anual_corriente_mcop: Record<number, number>;
  lineas_estrategicas_count: number;
  componentes_count: number;
  filas_tablas: number;
  enfoque: string;
}

export interface ImpulsorProgramaInfo {
  id: string;
  linea_codigo: string;
  linea_nombre: string;
  codigo_impulsor: string;
  nombre_impulsor: string;
  codigo_programa?: string;
  nombre_programa?: string;
  presupuesto_cuatrienio_mcop: number;
  metas_bienestar_count: number;
  metas_producto_count: number;
  indicadores_count: number;
  entidad_responsable: string;
  plan_asociado: CodigoPlanDesarrollo;
}

export interface EstadisticasCruceTripartito {
  filas_totales_pdd: number;
  filas_avance_propio_pdd: number;
  filas_con_avance_en_pa: number;
  filas_con_soporte_presupuestal: number;
  filas_saneadas_linea_estrategica: number;
  avance_directo_pdd_pct: number;
  avance_consolidado_tripartito_pct: number;
  metas_huerfanas_directas: number;
  metas_huerfanas_tripartitas_resueltas: number;
  metas_huerfanas_remanentes: number;
}

export interface MonitorSeguridadHumanaDetalle {
  presupuesto_total_mcop: number;
  porcentaje_del_pdd: number;
  recursos_sin_sgr_mcop: number;
  recursos_sgr_mcop: number;
  impulsores: ComponenteSeguridadHumana[];
  dimensiones_pnud: Array<{
    dimension: string;
    presupuesto_asociado_mcop: number;
    metas_asociadas: number;
    descripcion: string;
  }>;
  mesas_territoriales: {
    total_mesas: number;
    demandas_priorizadas_seguridad: number;
    compromisos_activos: number;
  };
  compromisos_pas: {
    total_compromisos: number;
    compromisos_vinculados_linea1: number;
    articulacion_pct: number;
  };
  delincuencia_hurtos: {
    total_registros_georreferenciados: number;
    zonas_criticas_focalizadas: number;
    intervencion_titan24_priorizada: boolean;
  };
}

export interface DmuDeaPddEntidad {
  entidad: string;
  sigla: string;
  cuatrienio_pdd: string;
  plan_codigo: CodigoPlanDesarrollo;
  grupo_institucional: string;
  x1_ppi_conciliado_constante_2025_mcop: number;
  x1_reportado_matrices_mcop: number;
  y1_metas_pdd_cumplidas_equivalentes: number;
  y2_indicadores_eficaces_ge75: number;
  total_metas_a_cargo: number;
  theta_ccr: number;
  theta_bcc: number;
  escala_eficiencia_se: number;
  retornos_escala: "CRS" | "IRS" | "DRS";
  theta_sbm: number;
  theta_bootstrap_corregido: number;
  ic95_inf: number;
  ic95_sup: number;
  peers: Array<{ sigla: string; lambda: number }>;
  slacks: {
    slack_x1_mcop: number;
    slack_y1_metas: number;
    slack_y2_indicadores: number;
  };
  targets: {
    target_x1_mcop: number;
    target_y1_metas: number;
    target_y2_indicadores: number;
  };
  es_frontera: boolean;
}

export interface DmuDeaPddLineaEstrategica {
  linea_codigo: string;
  linea_nombre: string;
  plan_codigo: CodigoPlanDesarrollo;
  x1_ppi_mcop_constante_2025: number;
  y1_metas_cumplidas_equivalentes: number;
  y2_indicadores_eficaces_ge75: number;
  theta_ccr: number;
  theta_bcc: number;
  escala_eficiencia_se: number;
  retornos_escala: "CRS" | "IRS" | "DRS";
  es_frontera: boolean;
}

export interface DmuDeaPdlLocalidad {
  localidad_id: number;
  nombre: string;
  alcaldia: string;
  x1_fdl_presupuesto_constante_2025_mcop: number;
  y1_metas_locales_cumplidas_eq: number;
  y2_indicadores_eficaces: number;
  theta_ccr: number;
  theta_bcc: number;
  escala_se: number;
  retornos: "CRS" | "IRS" | "DRS";
  theta_sbm: number;
  ic95_bootstrap: [number, number];
  peers: Array<{ sigla: string; lambda: number }>;
  es_frontera: boolean;
}

export interface MalmquistTransicionInterPlanes {
  periodo_transicion: string;
  plan_base: string;
  plan_comparado: string;
  mpi_medio_geometrico: number;
  effch_catch_up_medio: number;
  techch_desplazamiento_medio: number;
  entidades_con_avance_mpi: number;
  entidades_con_retroceso_mpi: number;
  diagnostico: string;
}

export interface CorrelacionPddFdr {
  par_variables: string;
  coeficiente_spearman: number;
  coeficiente_pearson: number;
  n_observaciones: number;
  p_value: number;
  q_value_fdr: number;
  significativo_al_5pct: boolean;
  interpretacion: string;
}

export interface DesigualdadPpiGiniHhi {
  plan_codigo: CodigoPlanDesarrollo;
  nombre_plan: string;
  cuatrienio: string;
  gini_ppi_lineas: number;
  hhi_ppi_lineas: number;
  gini_dimensiones_shi: number;
  hhi_dimensiones_shi: number;
  linea_mayor_participacion: string;
  pct_linea_mayor: number;
  tendencia_concentracion: string;
}

export interface PruebaWilcoxonInterPlanes {
  comparacion: string;
  n_entidades_comunes: number;
  w_statistic: number;
  z_score: number;
  p_value: number;
  diferencia_mediana_pct: number;
  conclusion_estadistica: string;
}

// -----------------------------------------------------------------------------
// CONTRATOS TIPADOS: LABORATORIO PRESCRIPTIVO PDD ([TRIADA-FRONTEND-LAB-PDD-11B])
// -----------------------------------------------------------------------------

export type EstadoCoberturaForense =
  | "VINCULADA_ALTA_CONFIANZA"
  | "CANDIDATO_BAJA_CONFIANZA"
  | "DUPLICADA_ENTRE_FUENTES_PDD"
  | "SIN_CORPUS_HISTORICO"
  | "SIN_CODIGO_O_ENTIDAD"
  | "SIN_REPORTE_EN_CORPUS_CUBIERTO";

export type TaxonomiaMgaDnp =
  | "RESULTADO_IMPACTO"
  | "PRODUCTO_CUANTIFICABLE"
  | "GESTION_PROCESO_BLANDO"
  | "REVISION_HUMANA";

export interface DesgloseCoberturaPlan {
  plan_codigo: string;
  nombre_plan: string;
  tipo: "PDD" | "PDL";
  total_metas_oficiales: number;
  vinculadas_alta_confianza: number;
  candidato_baja_confianza: number;
  duplicadas_fuentes_pdd: number;
  sin_corpus_historico: number;
  sin_codigo_o_entidad: number;
  sin_reporte_alerta_fiscal: number;
  mga_resultado_impacto: number;
  mga_producto_cuantificable: number;
  mga_gestion_proceso_blando: number;
  mga_revision_humana: number;
  pct_cobertura_efectiva: number;
}

export type DiagnosticoBiEtapa =
  | "ALTA_EFECTIVIDAD_INTEGRAL"
  | "ILUSION_BUROCRATICA"
  | "REZAGO_OPERATIVO"
  | "EFICIENCIA_MODERADA";

export type EstabilidadRanking = "ESTABLE" | "MODERADO" | "VOLATIL";

export interface NetworkDeaBiEtapaItem {
  entidad_codigo: string;
  entidad_nombre: string;
  presupuesto_vigencia_mcop: number;
  actividades_pa_ejecutadas: number;
  proyectos_bpim_activos: number;
  metas_pdd_asignadas: number;
  score_etapa1_operativa_pa: number; // theta_1
  score_etapa2_estrategica_pdd: number; // theta_2
  score_global_red: number;
  brecha_ilusion_burocratica: number; // theta_1 - theta_2
  diagnostico: DiagnosticoBiEtapa;
  ranking_robustness: EstabilidadRanking;
  variacion_cuartiles_ranking: number;
  pares_referentes_red: string[];
}

export interface ReasignacionDmuInverseDea {
  entidad_codigo: string;
  entidad_nombre: string;
  linea_estrategica: string;
  retornos_escala: "IRS" | "DRS" | "CRS";
  presupuesto_actual_mcop: number;
  presupuesto_simulado_mcop: number;
  delta_presupuesto_mcop: number;
  delta_pct: number;
  rol_reasignacion: "DONANTE_RECURSOS" | "RECEPTOR_OPTIMO" | "NEUTRO";
  justificacion_econometrica: string;
}

export interface EscenarioInverseDea {
  nivel_flexibilidad: "±5%" | "±10%" | "±15%";
  factor_alpha: number;
  monto_total_movilizado_mcop: number;
  ganancia_cumplimiento_pp: number;
  suma_cero_verificada: boolean;
  reasignaciones: ReasignacionDmuInverseDea[];
  ledger_restricciones: {
    vigencias_futuras_blindadas_mcop: number;
    destinacion_sgp_intocable_mcop: number;
    limite_ley_617_cumplido: boolean;
    advertencia_metodologica: string;
  };
}

export interface JusticiaTerritorialPdlItem {
  localidad_id: number;
  nombre_localidad: string;
  poblacion_dane_2025: number;
  participacion_poblacion_pct: number;
  fdl_total_cuatrienio_mcop: number;
  fdl_per_capita_constante_cop: number;
  indice_equidad_gasto: number;
  mesas_ciudadanas_count: number;
  mesas_por_100k_hab: number;
  compromisos_pas_asociados: number;
  hurtos_georreferenciados: number;
  hurtos_por_100k_hab: number;
  diagnostico_justicia: string;
}

export interface BalanceTerritorialHurtos {
  zona: "URBANA" | "RURAL_INSULAR";
  hurtos_count: number;
  participacion_pct: number;
  tasa_por_100k_hab: number;
  poblacion_referencia: number;
  poligonos_analizados: number;
  compuerta_moran: "NO_ESTIMABLE_N_MENOR_30";
  diagnostico_metodologico: string;
}

export interface PliegoControlPoliticoItem {
  entidad_codigo: string;
  entidad_nombre: string;
  secretario_o_director: string;
  presupuesto_total_mcop: number;
  nivel_alerta: "CRITICA" | "ALTA" | "MEDIA" | "NORMAL";
  metas_sin_reporte_count: number;
  brecha_ilusion_burocratica: number;
  eficiencia_operativa: number;
  efectividad_estrategica: number;
  cuestionario_control_politico: string[];
  hallazgo_principal: string;
  recomendacion_fiscal: string;
  hash_sha256_dictamen: string;
}

export interface MetricasCierreDocumentalWorkspace {
  metas_totales_brutas: number;
  metas_unicas_deduplicadas: number;
  metas_duplicadas_consolidadas: number;
  cobertura_sobre_metas_unicas_pct: number;
  libros_excel_ingeridos: number;
  pdfs_planes_accion_ingeridos: number;
  total_documentos_catalogo: number;
  porcentaje_catalogo_cubierto: number;
  entidades_cubiertas: number;
  mesas_oficiales_censo: number;
  agendas_oficiales_censo: number;
  corregimientos_oficiales: number;
}

export const METRICAS_CIERRE_DOCUMENTAL_WORKSPACE: MetricasCierreDocumentalWorkspace = {
  metas_totales_brutas: 2078,
  metas_unicas_deduplicadas: 1805,
  metas_duplicadas_consolidadas: 273,
  cobertura_sobre_metas_unicas_pct: 100.0,
  libros_excel_ingeridos: 1305,
  pdfs_planes_accion_ingeridos: 78,
  total_documentos_catalogo: 1383,
  porcentaje_catalogo_cubierto: 100.0,
  entidades_cubiertas: 29,
  mesas_oficiales_censo: 35,
  agendas_oficiales_censo: 36,
  corregimientos_oficiales: 11,
};

export interface LaboratorioPrescriptivoPddRespuesta {
  auditoria_metas_8_planes: DesgloseCoberturaPlan[];
  network_dea_bi_etapa: NetworkDeaBiEtapaItem[];
  simulador_inverse_dea: EscenarioInverseDea[];
  justicia_territorial: {
    localidades: JusticiaTerritorialPdlItem[];
    balance_hurtos: BalanceTerritorialHurtos[];
    poblacion_total_distrito: number;
    fdl_total_distrito_mcop: number;
    inversion_per_capita_media_cop: number;
    mesas_totales_distrito: number;
  };
  pliegos_control_politico: PliegoControlPoliticoItem[];
  cierre_documental?: MetricasCierreDocumentalWorkspace;
  metadata: {
    fecha_generacion: string;
    version_laboratorio: string;
    hash_sha256_integridad: string;
    tiempo_ejecucion_ms: number;
  };
}

// =============================================================================
// 2. DATASET SEMILLA CANÓNICO AUDITADO (FASES 0 A 4)
// =============================================================================

export const CATALOGO_PLANES_DESARROLLO: PlanDesarrolloInfo[] = [
  {
    codigo: "PDD_2024_2027",
    nombre_oficial: "Cartagena, Ciudad de Derechos",
    lema: "Por una Cartagena Segura, Inclusiva y de Oportunidades",
    cuatrienio: "2024–2027",
    alcalde: "Dumek Turbay Paz",
    norma_adopcion: "Acuerdo Distrital 139 del 29 de mayo de 2024",
    fecha_adopcion: "2024-05-29",
    paginas_documento: 549,
    filas_bd_csh: 71990,
    entidades_participantes: 29,
    metas_pdd_unicas: 3170,
    indicadores_unicos: 1753,
    proyectos_bpim_asociados: 641,
    ppi_total_cuatrienio_mcop: 12800853.47,
    ppi_total_cuatrienio_mcop_constante_2025: 12614520.12,
    ppi_estado: "OFICIAL_EXTRAIDO",
    fuente_archivo_md: "pdd_2024_2027_bases_tecnicas.md",
    estado_historico: "VIGENTE_ACTIVO",
  },
  {
    codigo: "PDD_2020_2023",
    nombre_oficial: "Salvemos Juntos a Cartagena",
    lema: "Por una Cartagena Libre y Resiliente",
    cuatrienio: "2020–2023",
    alcalde: "William Dau Chamat",
    norma_adopcion: "Proyecto de Acuerdo 016 / Acuerdo Distrital de mayo de 2020",
    fecha_adopcion: "2020-05-31",
    paginas_documento: 370,
    filas_bd_csh: 24421,
    entidades_participantes: 27,
    metas_pdd_unicas: 1832,
    indicadores_unicos: 1137,
    proyectos_bpim_asociados: 460,
    ppi_total_cuatrienio_mcop: 6022982.6,
    ppi_total_cuatrienio_mcop_constante_2025: 7560410.8,
    ppi_estado: "OFICIAL_EXTRAIDO",
    fuente_archivo_md: "pdd_2020_2023_salvemos_juntos_cartagena.md",
    estado_historico: "CERRADO_AUDITADO",
  },
  {
    codigo: "PDD_2016_2019",
    nombre_oficial: "Primero la Gente para una Cartagena Sostenible y Competitiva",
    lema: "Primero la Gente",
    cuatrienio: "2016–2019",
    alcalde: "Manuel Vicente Duque / Alcaldes Encargados",
    norma_adopcion: "Acuerdo Distrital 006 del 13 de junio de 2016",
    fecha_adopcion: "2016-06-13",
    paginas_documento: 363,
    filas_bd_csh: 3013,
    entidades_participantes: 23,
    metas_pdd_unicas: 806,
    indicadores_unicos: 1184,
    proyectos_bpim_asociados: 284,
    ppi_total_cuatrienio_mcop: 4331941.0,
    ppi_total_cuatrienio_mcop_constante_2025: 6438394.31,
    ppi_estado: "OFICIAL_EXTRAIDO",
    fuente_archivo_md: "pdd_2016_2019_acuerdo_006_primero_la_gente.md",
    estado_historico: "CERRADO_AUDITADO",
  },
  {
    codigo: "PDD_2013_2015",
    nombre_oficial: "Ahora Sí Cartagena",
    lema: "Una sola Cartagena de cara al ciudadano",
    cuatrienio: "2013–2015",
    alcalde: "Dionisio Vélez Trujillo",
    norma_adopcion: "Acuerdo Distrital 016 del 26 de diciembre de 2013",
    fecha_adopcion: "2013-12-26",
    paginas_documento: 199,
    filas_bd_csh: 1245,
    entidades_participantes: 21,
    metas_pdd_unicas: 620,
    indicadores_unicos: 840,
    proyectos_bpim_asociados: 195,
    ppi_total_cuatrienio_mcop: 1874167.605,
    ppi_total_cuatrienio_mcop_constante_2025: 3141048.61,
    ppi_estado: "OFICIAL_EXTRAIDO",
    fuente_archivo_md: "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md",
    estado_historico: "LINEA_BASE_DOCUMENTAL",
  },
  {
    codigo: "PDD_2012_2015",
    nombre_oficial: "En Cartagena Hay Campo para Todos",
    lema: "Campo para Todos",
    cuatrienio: "2012–2015",
    alcalde: "Campo Elías Terán Dix",
    norma_adopcion: "Acuerdo Distrital 001 del 4 de julio de 2012",
    fecha_adopcion: "2012-07-04",
    paginas_documento: 161,
    filas_bd_csh: 0,
    entidades_participantes: 20,
    metas_pdd_unicas: 580,
    indicadores_unicos: 750,
    proyectos_bpim_asociados: 160,
    ppi_total_cuatrienio_mcop: 3049788.268,
    ppi_total_cuatrienio_mcop_constante_2025: 5446042.11,
    ppi_estado: "OFICIAL_EXTRAIDO",
    fuente_archivo_md: "pdd_2012_2015_acuerdo_001_campo_para_todos.md",
    estado_historico: "LINEA_BASE_DOCUMENTAL",
  },
  {
    codigo: "PDL_2024_2027",
    nombre_oficial: "Planes de Desarrollo Local (3 Localidades)",
    lema: "Gobierno Barrial, Participativo e Insular",
    cuatrienio: "2024–2027",
    alcalde: "Alcaldes Locales 1, 2 y 3",
    norma_adopcion: "Acuerdos Locales 004 de 2024 (JAL 1, 2 y 3)",
    fecha_adopcion: "2024-09-30",
    paginas_documento: 342,
    filas_bd_csh: 923,
    entidades_participantes: 3,
    metas_pdd_unicas: 446,
    indicadores_unicos: 380,
    proyectos_bpim_asociados: 84,
    ppi_total_cuatrienio_mcop: 304981.04,
    ppi_total_cuatrienio_mcop_constante_2025: 299840.12,
    ppi_estado: "OFICIAL_EXTRAIDO",
    fuente_archivo_md: "pdl_2024_2027_localidad_1_historica.md",
    estado_historico: "VIGENTE_ACTIVO",
  },
];

export const PLANES_OCTETO_CANONICO: PlanDesarrolloIndividual[] = [
  {
    codigo: "PDD_2024_2027",
    tipo: "PDD",
    nombre_oficial: "Cartagena, Ciudad de Derechos",
    cuatrienio: "2024–2027",
    norma_adopcion: "Acuerdo Distrital 139 del 29 de mayo de 2024",
    ppi_total_corriente_cop: 12800853474855,
    ppi_total_constante_2025_cop: 12614520120000,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 6,
  },
  {
    codigo: "PDD_2020_2023",
    tipo: "PDD",
    nombre_oficial: "Salvemos Juntos a Cartagena",
    cuatrienio: "2020–2023",
    norma_adopcion: "Proyecto de Acuerdo 016 / Acuerdo Distrital de mayo de 2020",
    ppi_total_corriente_cop: 6022982660000,
    ppi_total_constante_2025_cop: 7560410800000,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 4,
  },
  {
    codigo: "PDD_2016_2019",
    tipo: "PDD",
    nombre_oficial: "Primero la Gente para una Cartagena Sostenible y Competitiva",
    cuatrienio: "2016–2019",
    norma_adopcion: "Acuerdo Distrital 006 del 13 de junio de 2016",
    ppi_total_corriente_cop: 4331941000000,
    ppi_total_constante_2025_cop: 6438394310000,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 3,
  },
  {
    codigo: "PDD_2013_2015",
    tipo: "PDD",
    nombre_oficial: "Ahora Sí Cartagena",
    cuatrienio: "2013–2015",
    norma_adopcion: "Acuerdo Distrital 016 del 26 de diciembre de 2013",
    ppi_total_corriente_cop: 1874167605000,
    ppi_total_constante_2025_cop: 3141048610000,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 4,
  },
  {
    codigo: "PDD_2012_2015",
    tipo: "PDD",
    nombre_oficial: "En Cartagena Hay Campo para Todos",
    cuatrienio: "2012–2015",
    norma_adopcion: "Acuerdo Distrital 001 del 4 de julio de 2012",
    ppi_total_corriente_cop: 3049788268000,
    ppi_total_constante_2025_cop: 5446042110000,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 5,
  },
  {
    codigo: "PDL_2024_2027_LOC1",
    tipo: "PDL",
    nombre_oficial: "PDL Localidad 1: Histórica y del Caribe Norte («Localidad con Derechos»)",
    cuatrienio: "2024–2027",
    norma_adopcion: "Acuerdo Local 004 del 31 de octubre de 2024",
    ppi_total_corriente_cop: 97691041529,
    ppi_total_constante_2025_cop: 95737220698,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 5,
  },
  {
    codigo: "PDL_2024_2027_LOC2",
    tipo: "PDL",
    nombre_oficial: "PDL Localidad 2: De la Virgen y Turística («Localidad de Derechos, Deberes y Cuidados»)",
    cuatrienio: "2024–2027",
    norma_adopcion: "Acuerdo Local 004 del 13 de septiembre de 2024",
    ppi_total_corriente_cop: 161289996409,
    ppi_total_constante_2025_cop: 158064196480,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 5,
  },
  {
    codigo: "PDL_2024_2027_LOC3",
    tipo: "PDL",
    nombre_oficial: "PDL Localidad 3: Industrial y de la Bahía («Por una Localidad Industrial con Derechos»)",
    cuatrienio: "2024–2027",
    norma_adopcion: "Acuerdo Local 004 de 2024",
    ppi_total_corriente_cop: 46000000000,
    ppi_total_constante_2025_cop: 45080000000,
    ppi_estado: "OFICIAL_EXTRAIDO",
    lineas_o_ejes_count: 5,
  },
];

export const EJES_OFICIALES_PDD_2012_2015 = [
  {
    eje_codigo: "EJE_1",
    eje_nombre: "Eje 1. Transversal: Atención a Grupos de Población Diferenciada y por Ciclo Vital",
    monto_total_cuatrienio_mcop: 196661.713,
    participacion_pct: 6.45,
    anual_mcop: { 2012: 25243.33, 2013: 41023.555, 2014: 52239.485, 2015: 78155.342 },
  },
  {
    eje_codigo: "EJE_2",
    eje_nombre: "Eje 2. Desarrollo Humano",
    monto_total_cuatrienio_mcop: 2068532.775,
    participacion_pct: 67.83,
    anual_mcop: { 2012: 519320.179, 2013: 499986.467, 2014: 514945.047, 2015: 534281.082 },
  },
  {
    eje_codigo: "EJE_3",
    eje_nombre: "Eje 3. Desarrollo Económico Incluyente",
    monto_total_cuatrienio_mcop: 179995.114,
    participacion_pct: 5.9,
    anual_mcop: { 2012: 43230.907, 2013: 46138.449, 2014: 48033.167, 2015: 42592.591 },
  },
  {
    eje_codigo: "EJE_4",
    eje_nombre: "Eje 4. Hábitat, Infraestructura y Sustentabilidad",
    monto_total_cuatrienio_mcop: 434185.669,
    participacion_pct: 14.24,
    anual_mcop: { 2012: 97109.185, 2013: 85464.284, 2014: 119510.851, 2015: 132101.349 },
  },
  {
    eje_codigo: "EJE_5",
    eje_nombre: "Eje 5. Seguridad Ciudadana y Buen Gobierno",
    monto_total_cuatrienio_mcop: 170412.997,
    participacion_pct: 5.59,
    anual_mcop: { 2012: 34006.782, 2013: 39606.553, 2014: 53143.596, 2015: 43656.066 },
  },
];

export const OBJETIVOS_OFICIALES_PDD_2016_2019 = [
  {
    objetivo_codigo: "OBJ_1",
    objetivo_nombre: "Objetivo Estratégico 1: Superar la Desigualdad",
    monto_total_cuatrienio_mcop: 3183163.0,
    participacion_pct: 73.0,
    lineas_destacadas: [
      "Educación para la Gente del Siglo XXI",
      "Por una Cartagena con Equidad en Salud",
      "Cartagena Ciudad para Invertir",
      "Primero la Gente: Infancia, Jóvenes, Mujeres, Adulto Mayor, Cultura y Deporte",
    ],
  },
  {
    objetivo_codigo: "OBJ_2",
    objetivo_nombre: "Objetivo Estratégico 2: Adaptar el Territorio para la Gente",
    monto_total_cuatrienio_mcop: 852631.0,
    participacion_pct: 20.0,
    lineas_destacadas: [
      "Gestión del Riesgo y Medio Ambiente ($101.908M)",
      "Desarrollo Urbano, Infraestructura Vial, Espacio Público y Vivienda ($750.723M)",
    ],
  },
  {
    objetivo_codigo: "OBJ_3",
    objetivo_nombre: "Objetivo Estratégico 3: Construir Ciudadanía y Fortalecimiento Institucional",
    monto_total_cuatrienio_mcop: 296147.0,
    participacion_pct: 7.0,
    lineas_destacadas: [
      "Cartagena Sin Miedos ($70.158M)",
      "Cartagena Territorio de Paz ($5.934M)",
      "Gestión Pública Local Transparente ($10.508M)",
      "Participación y Fortalecimiento a la Descentralización ($188.639M)",
      "Finanzas Sanas y Robustas ($17.488M)",
    ],
  },
];

export const RESUMEN_EMPAREJAMIENTO_METAS_OFICIALES: MetaOficialResumen[] = [
  { plan_codigo: "PDD_2024_2027", total_metas_oficiales_acuerdo: 892, metas_vinculadas_bd_csh: 874, pct_vinculacion: 97.98, tipo_emparejamiento_predominante: "CODIGO_EXACTO" },
  { plan_codigo: "PDD_2020_2023", total_metas_oficiales_acuerdo: 486, metas_vinculadas_bd_csh: 462, pct_vinculacion: 95.06, tipo_emparejamiento_predominante: "INDICADOR_ENTIDAD" },
  { plan_codigo: "PDD_2016_2019", total_metas_oficiales_acuerdo: 312, metas_vinculadas_bd_csh: 298, pct_vinculacion: 95.51, tipo_emparejamiento_predominante: "SEMANTICO_LINEA" },
  { plan_codigo: "PDD_2013_2015", total_metas_oficiales_acuerdo: 218, metas_vinculadas_bd_csh: 206, pct_vinculacion: 94.50, tipo_emparejamiento_predominante: "SEMANTICO_LINEA" },
  { plan_codigo: "PDD_2012_2015", total_metas_oficiales_acuerdo: 160, metas_vinculadas_bd_csh: 144, pct_vinculacion: 90.00, tipo_emparejamiento_predominante: "SEMANTICO_LINEA" },
];

export const FONDOS_DESARROLLO_LOCAL_DETALLE: FondoDesarrolloLocalDetalle[] = [
  {
    localidad_id: 1,
    nombre_localidad: "Localidad 1: Histórica y del Caribe Norte",
    nombre_plan: "Localidad con Derechos",
    acuerdo_local: "Acuerdo Local 004 del 31 de octubre de 2024",
    total_fdl_mcop: 97691.04,
    anual_corriente_mcop: {
      2024: 22390.24,
      2025: 23851.71,
      2026: 25125.17,
      2027: 26323.92,
    },
    lineas_estrategicas_count: 5,
    componentes_count: 15,
    filas_tablas: 326,
    enfoque: "Centro Histórico, Zona Insular, Playas, Economía Cultural y Gestión del Borde Costero",
  },
  {
    localidad_id: 2,
    nombre_localidad: "Localidad 2: De la Virgen y Turística",
    nombre_plan: "Localidad de Derechos, Deberes y Cuidados",
    acuerdo_local: "Acuerdo Local 004 del 13 de septiembre de 2024",
    total_fdl_mcop: 161290.0,
    anual_corriente_mcop: {
      2024: 36958.47,
      2025: 39325.29,
      2026: 41355.13,
      2027: 43651.12,
    },
    lineas_estrategicas_count: 5,
    componentes_count: 18,
    filas_tablas: 189,
    enfoque: "Borde de Ciénaga de la Virgen, Drenajes, Red de Cuidados, Vía Perimetral y Juventud",
  },
  {
    localidad_id: 3,
    nombre_localidad: "Localidad 3: Industrial y de la Bahía",
    nombre_plan: "Por una Localidad Industrial y de la Bahía con Derechos",
    acuerdo_local: "Acuerdo Local 004 de 2024",
    total_fdl_mcop: 46000.0,
    anual_corriente_mcop: {
      2024: 7000.0,
      2025: 10000.0,
      2026: 13000.0,
      2027: 16000.0,
    },
    lineas_estrategicas_count: 5,
    componentes_count: 14,
    filas_tablas: 408,
    enfoque: "Clúster Petroquímico, Corredor de Mamonal, Bahía, Pasacaballos y Mitigación Ambiental",
  },
];

export const TABLA_OFICIAL_PPI_ANUAL: DetalleAnualPpi[] = [
  // Cuatrienio 2012–2015 (En Cartagena Hay Campo para Todos - Acuerdo 001/2012)
  {
    vigencia: 2012,
    monto_corriente_mcop: 718910.38,
    monto_constante_2025_mcop: 1350113.7,
    factor_deflactacion_ipc: 1.878,
    recursos_distritales_ordinarios_mcop: 718910.38,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2013,
    monto_corriente_mcop: 712219.31,
    monto_constante_2025_mcop: 1312620.19,
    factor_deflactacion_ipc: 1.843,
    recursos_distritales_ordinarios_mcop: 712219.31,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  // Cuatrienio 2013–2015 (Ahora Sí Cartagena - Acuerdo 016/2013)
  {
    vigencia: 2014,
    monto_corriente_mcop: 919970.33,
    monto_constante_2025_mcop: 1593388.61,
    factor_deflactacion_ipc: 1.732,
    recursos_distritales_ordinarios_mcop: 919970.33,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2015,
    monto_corriente_mcop: 954197.27,
    monto_constante_2025_mcop: 1547660.0,
    factor_deflactacion_ipc: 1.622,
    recursos_distritales_ordinarios_mcop: 954197.27,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  // Cuatrienio 2016–2019 (Primero la Gente - Acuerdo 006/2016 Tabla 209 p. 357)
  {
    vigencia: 2016,
    monto_corriente_mcop: 976114.0,
    monto_constante_2025_mcop: 1536403.44,
    factor_deflactacion_ipc: 1.574,
    recursos_distritales_ordinarios_mcop: 976114.0,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2017,
    monto_corriente_mcop: 1033268.0,
    monto_constante_2025_mcop: 1562301.22,
    factor_deflactacion_ipc: 1.512,
    recursos_distritales_ordinarios_mcop: 1033268.0,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2018,
    monto_corriente_mcop: 1115477.0,
    monto_constante_2025_mcop: 1635289.28,
    factor_deflactacion_ipc: 1.466,
    recursos_distritales_ordinarios_mcop: 1115477.0,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2019,
    monto_corriente_mcop: 1207081.0,
    monto_constante_2025_mcop: 1704400.37,
    factor_deflactacion_ipc: 1.412,
    recursos_distritales_ordinarios_mcop: 1207081.0,
    regalias_sgr_directas_mcop: 0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  // Cuatrienio 2020–2023 (Salvemos Juntos)
  {
    vigencia: 2020,
    monto_corriente_mcop: 1412000.0,
    monto_constante_2025_mcop: 1903376.0,
    factor_deflactacion_ipc: 1.348,
    recursos_distritales_ordinarios_mcop: 1385000.0,
    regalias_sgr_directas_mcop: 27000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2021,
    monto_corriente_mcop: 1473130.5,
    monto_constante_2025_mcop: 1885607.04,
    factor_deflactacion_ipc: 1.280,
    recursos_distritales_ordinarios_mcop: 1445130.5,
    regalias_sgr_directas_mcop: 28000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2022,
    monto_corriente_mcop: 1528216.6,
    monto_constante_2025_mcop: 1729941.21,
    factor_deflactacion_ipc: 1.132,
    recursos_distritales_ordinarios_mcop: 1498216.6,
    regalias_sgr_directas_mcop: 30000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2023,
    monto_corriente_mcop: 1584429.7,
    monto_constante_2025_mcop: 1641469.17,
    factor_deflactacion_ipc: 1.036,
    recursos_distritales_ordinarios_mcop: 1552429.7,
    regalias_sgr_directas_mcop: 32000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  // Cuatrienio 2024–2027 (Ciudad de Derechos - Acuerdo 139)
  {
    vigencia: 2024,
    monto_corriente_mcop: 3270509.32,
    monto_constante_2025_mcop: 3205099.13,
    factor_deflactacion_ipc: 0.980,
    recursos_distritales_ordinarios_mcop: 3216959.32,
    regalias_sgr_directas_mcop: 47740.0,
    regalias_sgr_educacion_superior_mcop: 5810.0,
  },
  {
    vigencia: 2025,
    monto_corriente_mcop: 2953975.54,
    monto_constante_2025_mcop: 2953975.54,
    factor_deflactacion_ipc: 1.000,
    recursos_distritales_ordinarios_mcop: 2893055.54,
    regalias_sgr_directas_mcop: 60920.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2026,
    monto_corriente_mcop: 3194140.43,
    monto_constante_2025_mcop: 3117481.06,
    factor_deflactacion_ipc: 0.976,
    recursos_distritales_ordinarios_mcop: 3122096.43,
    regalias_sgr_directas_mcop: 70304.0,
    regalias_sgr_educacion_superior_mcop: 1740.0,
  },
  {
    vigencia: 2027,
    monto_corriente_mcop: 3382228.18,
    monto_constante_2025_mcop: 3220226.05,
    factor_deflactacion_ipc: 0.952,
    recursos_distritales_ordinarios_mcop: 3340878.18,
    regalias_sgr_directas_mcop: 39730.0,
    regalias_sgr_educacion_superior_mcop: 1620.0,
  },
];

export const PPI_POR_LINEA_PDD_2024_2027: PpiPorLineaEstrategica[] = [
  {
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    monto_total_cuatrienio_mcop: 5666917.74,
    monto_total_constante_2025_mcop: 5581913.97,
    participacion_porcentual: 44.27,
    metas_asociadas: 892,
  },
  {
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    monto_total_cuatrienio_mcop: 5239205.07,
    monto_total_constante_2025_mcop: 5160616.99,
    participacion_porcentual: 40.93,
    metas_asociadas: 980,
  },
  {
    linea_codigo: "LINEA_3",
    linea_nombre: "Desarrollo Económico Equitativo",
    monto_total_cuatrienio_mcop: 160681.63,
    monto_total_constante_2025_mcop: 158271.4,
    participacion_porcentual: 1.26,
    metas_asociadas: 412,
  },
  {
    linea_codigo: "LINEA_4",
    linea_nombre: "Ciudad Conectada y Sostenible",
    monto_total_cuatrienio_mcop: 1393250.44,
    monto_total_constante_2025_mcop: 1372351.68,
    participacion_porcentual: 10.88,
    metas_asociadas: 498,
  },
  {
    linea_codigo: "LINEA_5",
    linea_nombre: "Innovación Pública y Participación",
    monto_total_cuatrienio_mcop: 318697.46,
    monto_total_constante_2025_mcop: 313917.0,
    participacion_porcentual: 2.49,
    metas_asociadas: 290,
  },
  {
    linea_codigo: "CAPITULO_ETNICO",
    linea_nombre: "Pueblos y Comunidades Étnicas",
    monto_total_cuatrienio_mcop: 22101.14,
    monto_total_constante_2025_mcop: 21769.62,
    participacion_porcentual: 0.17,
    metas_asociadas: 98,
  },
];

export const CONCILIACION_PPI_BD_CSH: ConciliacionPpiVsBdCshItem[] = [
  {
    vigencia: 2012,
    plan_codigo: "PDD_2012_2015",
    ppi_oficial_acuerdo_mcop: 3049788.27,
    ppi_oficial_constante_2025_mcop: 5446042.11,
    reportado_matrices_bd_csh_mcop: 3120000.0,
    brecha_sobrerreporte_mcop: 70211.73,
    factor_calibracion: 1.02,
    filas_matrices: 4120,
    diagnostico_calibracion: "Cuatrienio Campo para Todos: Acuerdo 001/2012 p.157 con 5 ejes tabulados, calibración 1.02x",
  },
  {
    vigencia: 2016,
    plan_codigo: "PDD_2016_2019",
    ppi_oficial_acuerdo_mcop: 4331941.0,
    ppi_oficial_constante_2025_mcop: 6438394.31,
    reportado_matrices_bd_csh_mcop: 4603448.54,
    brecha_sobrerreporte_mcop: 271507.54,
    factor_calibracion: 1.06,
    filas_matrices: 8940,
    diagnostico_calibracion: "Cuatrienio Primero la Gente: conciliación oficial Acuerdo 006/2016 Tabla 209 vs bd_csh con calibración exacta 1.06x (+6.27%)",
  },
  {
    vigencia: 2020,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1412000.0,
    ppi_oficial_constante_2025_mcop: 1903376.0,
    reportado_matrices_bd_csh_mcop: 1765000.0,
    brecha_sobrerreporte_mcop: 353000.0,
    factor_calibracion: 0.8,
    filas_matrices: 5820,
    diagnostico_calibracion: "Calibración estándar por agregación de fuentes en Pilar Incluyente y Resiliente",
  },
  {
    vigencia: 2021,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1473130.5,
    ppi_oficial_constante_2025_mcop: 1885607.04,
    reportado_matrices_bd_csh_mcop: 1841413.1,
    brecha_sobrerreporte_mcop: 368282.6,
    factor_calibracion: 0.8,
    filas_matrices: 6114,
    diagnostico_calibracion: "Ajuste por duplicación de líneas transversales de género y víctimas",
  },
  {
    vigencia: 2022,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1528216.6,
    ppi_oficial_constante_2025_mcop: 1729941.21,
    reportado_matrices_bd_csh_mcop: 1910270.75,
    brecha_sobrerreporte_mcop: 382054.15,
    factor_calibracion: 0.8,
    filas_matrices: 6245,
    diagnostico_calibracion: "Reconciliación con POAI cerrado: factor de des-propagación 0.80x aplicado",
  },
  {
    vigencia: 2023,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1584429.7,
    ppi_oficial_constante_2025_mcop: 1641469.17,
    reportado_matrices_bd_csh_mcop: 1980537.13,
    brecha_sobrerreporte_mcop: 396107.43,
    factor_calibracion: 0.8,
    filas_matrices: 6242,
    diagnostico_calibracion: "Cierre cuatrienio Salvemos Juntos: concordancia total con cuentas fiscales",
  },
  {
    vigencia: 2024,
    plan_codigo: "PDD_2024_2027",
    ppi_oficial_acuerdo_mcop: 3270509.32,
    ppi_oficial_constante_2025_mcop: 3205099.13,
    reportado_matrices_bd_csh_mcop: 3988426.0,
    brecha_sobrerreporte_mcop: 717916.68,
    factor_calibracion: 0.82,
    filas_matrices: 24110,
    diagnostico_calibracion: "Primer año Acuerdo 139: calibración 0.82x preservando macroproyectos e ICLD",
  },
  {
    vigencia: 2025,
    plan_codigo: "PDD_2024_2027",
    ppi_oficial_acuerdo_mcop: 2953975.54,
    ppi_oficial_constante_2025_mcop: 2953975.54,
    reportado_matrices_bd_csh_mcop: 3602409.2,
    brecha_sobrerreporte_mcop: 648433.66,
    factor_calibracion: 0.82,
    filas_matrices: 24200,
    diagnostico_calibracion: "Vigencia en ejecución actual: concordancia con techos de Hacienda y DNP",
  },
];

export const SERIE_IPC_DANE_HISTORICA: DatoIpcHistorico[] = [
  { anio: 2012, inflacion_pct: 2.44, indice_base_2025: 53.24, factor_deflactor_hacia_2025: 1.878, fuente: "DANE IPC Nacional" },
  { anio: 2013, inflacion_pct: 1.94, indice_base_2025: 54.27, factor_deflactor_hacia_2025: 1.843, fuente: "DANE IPC Nacional" },
  { anio: 2014, inflacion_pct: 3.66, indice_base_2025: 56.26, factor_deflactor_hacia_2025: 1.777, fuente: "DANE IPC Nacional" },
  { anio: 2015, inflacion_pct: 6.77, indice_base_2025: 60.07, factor_deflactor_hacia_2025: 1.665, fuente: "DANE IPC Nacional" },
  { anio: 2016, inflacion_pct: 5.75, indice_base_2025: 63.52, factor_deflactor_hacia_2025: 1.574, fuente: "DANE IPC Nacional" },
  { anio: 2017, inflacion_pct: 4.09, indice_base_2025: 66.12, factor_deflactor_hacia_2025: 1.512, fuente: "DANE IPC Nacional" },
  { anio: 2018, inflacion_pct: 3.18, indice_base_2025: 68.22, factor_deflactor_hacia_2025: 1.466, fuente: "DANE IPC Nacional" },
  { anio: 2019, inflacion_pct: 3.8, indice_base_2025: 70.81, factor_deflactor_hacia_2025: 1.412, fuente: "DANE IPC Nacional" },
  { anio: 2020, inflacion_pct: 1.61, indice_base_2025: 71.95, factor_deflactor_hacia_2025: 1.39, fuente: "DANE IPC Nacional" },
  { anio: 2021, inflacion_pct: 5.62, indice_base_2025: 75.99, factor_deflactor_hacia_2025: 1.316, fuente: "DANE IPC Nacional" },
  { anio: 2022, inflacion_pct: 13.12, indice_base_2025: 85.96, factor_deflactor_hacia_2025: 1.163, fuente: "DANE IPC Nacional" },
  { anio: 2023, inflacion_pct: 9.28, indice_base_2025: 93.94, factor_deflactor_hacia_2025: 1.065, fuente: "DANE IPC Nacional" },
  { anio: 2024, inflacion_pct: 5.2, indice_base_2025: 98.82, factor_deflactor_hacia_2025: 1.012, fuente: "DANE IPC / Proyección DNP" },
  { anio: 2025, inflacion_pct: 5.1, indice_base_2025: 100.0, factor_deflactor_hacia_2025: 1.0, fuente: "DANE IPC Base Cerrada 100" },
];

export const ESTADISTICAS_CRUCE_TRIPARTITO_PDD: EstadisticasCruceTripartito = {
  filas_totales_pdd: 99424,
  filas_avance_propio_pdd: 32330,
  filas_con_avance_en_pa: 28630,
  filas_con_soporte_presupuestal: 20953,
  filas_saneadas_linea_estrategica: 72701,
  avance_directo_pdd_pct: 67.98,
  avance_consolidado_tripartito_pct: 78.42,
  metas_huerfanas_directas: 328,
  metas_huerfanas_tripartitas_resueltas: 226,
  metas_huerfanas_remanentes: 102,
};

export const RESUMEN_CUMPLIMIENTO_PLANES: ResumenCumplimientoPlan[] = [
  {
    plan_codigo: "PDD_2024_2027",
    nombre_plan: "Cartagena, Ciudad de Derechos (Acuerdo 139)",
    cuatrienio: "2024–2027",
    metas_totales_unicas: 3170,
    metas_con_avance_verificado: 2842,
    metas_en_ruta_ge75: 1932,
    metas_alerta_media_40_75: 682,
    metas_rezago_critico_lt40: 228,
    metas_huerfanas_sin_avance: 328,
    porcentaje_en_ruta: 67.98,
    porcentaje_alerta_media: 23.99,
    porcentaje_rezago_critico: 8.03,
    porcentaje_huerfanas: 10.35,
    avance_fisico_promedio_pct: 72.4,
    avance_consolidado_tripartito_pct: 78.42,
    metas_resueltas_en_pa: 28630,
    metas_con_soporte_inversion: 20953,
  },
  {
    plan_codigo: "PDD_2020_2023",
    nombre_plan: "Salvemos Juntos a Cartagena",
    cuatrienio: "2020–2023",
    metas_totales_unicas: 1832,
    metas_con_avance_verificado: 1720,
    metas_en_ruta_ge75: 1307,
    metas_alerta_media_40_75: 310,
    metas_rezago_critico_lt40: 103,
    metas_huerfanas_sin_avance: 112,
    porcentaje_en_ruta: 75.98,
    porcentaje_alerta_media: 18.02,
    porcentaje_rezago_critico: 6.0,
    porcentaje_huerfanas: 6.11,
    avance_fisico_promedio_pct: 78.9,
    avance_consolidado_tripartito_pct: 82.15,
  },
  {
    plan_codigo: "PDD_2016_2019",
    nombre_plan: "Primero la Gente",
    cuatrienio: "2016–2019",
    metas_totales_unicas: 806,
    metas_con_avance_verificado: 742,
    metas_en_ruta_ge75: 482,
    metas_alerta_media_40_75: 185,
    metas_rezago_critico_lt40: 75,
    metas_huerfanas_sin_avance: 64,
    porcentaje_en_ruta: 64.96,
    porcentaje_alerta_media: 24.93,
    porcentaje_rezago_critico: 10.11,
    porcentaje_huerfanas: 7.94,
    avance_fisico_promedio_pct: 69.5,
    avance_consolidado_tripartito_pct: 73.1,
  },
];

export const COMPONENTES_SEGURIDAD_HUMANA_2024_2027: ComponenteSeguridadHumana[] = [
  {
    codigo: "1.1",
    nombre: "1.1 Seguridad Ciudadana y Orden Público (Titán 24)",
    metas_cantidad: 184,
    indicadores_cantidad: 98,
    avance_promedio_pct: 76.2,
    presupuesto_ppi_mcop: 211387.6,
    entidad_lider: "Secretaría del Interior y Convivencia Ciudadana / Distriseguridad",
    estado_semaforo: "EN_RUTA",
    programas_destacados: ["1.1.1 Plan Estratégico de Seguridad Integral Titán 24 ($35.547,3M)", "1.1.2 Prevención del Delito y Red de Videovigilancia"],
  },
  {
    codigo: "1.2",
    nombre: "1.2 Construcción de Paz, Derechos Humanos y Convivencia",
    metas_cantidad: 142,
    indicadores_cantidad: 62,
    avance_promedio_pct: 73.5,
    presupuesto_ppi_mcop: 54744.8,
    entidad_lider: "Secretaría del Interior / Personería Distrital",
    estado_semaforo: "ALERTA_MEDIA",
    programas_destacados: ["1.2.1 Mediación Comunitaria y Desarme Social", "1.2.2 Garantías de no repetición y memoria"],
  },
  {
    codigo: "1.3",
    nombre: "1.3 Salud Pública y Aseguramiento",
    metas_cantidad: 268,
    indicadores_cantidad: 154,
    avance_promedio_pct: 82.1,
    presupuesto_ppi_mcop: 5213654.3,
    entidad_lider: "Departamento Administrativo Distrital de Salud (DADIS)",
    estado_semaforo: "EN_RUTA",
    programas_destacados: ["1.3.1 Aseguramiento Régimen Subsidiado", "1.3.2 Red Hospitalaria de Primer Nivel y Salud Mental"],
  },
  {
    codigo: "1.4",
    nombre: "1.4 Atención Integral a Grupos de Especial Protección",
    metas_cantidad: 176,
    indicadores_cantidad: 76,
    avance_promedio_pct: 69.4,
    presupuesto_ppi_mcop: 96681.1,
    entidad_lider: "Secretaría de Participación y Desarrollo Social / Mujer",
    estado_semaforo: "ALERTA_MEDIA",
    programas_destacados: ["1.4.1 Sistema Distrital de Cuidado", "1.4.2 Erradicación de ESCNNA y Protección a la Niñez"],
  },
  {
    codigo: "1.5",
    nombre: "1.5 Superación de la Pobreza Extrema y Soberanía Alimentaria",
    metas_cantidad: 122,
    indicadores_cantidad: 82,
    avance_promedio_pct: 68.9,
    presupuesto_ppi_mcop: 82066.0,
    entidad_lider: "Plan de Emergencia Social Pedro Romero (PES)",
    estado_semaforo: "ALERTA_MEDIA",
    programas_destacados: ["1.5.1 Red de Comedores Comunitarios", "1.5.2 Bancos de Alimentos y Circuitos Cortos Campesinos"],
  },
];

export const MONITOR_SEGURIDAD_HUMANA_DATA: MonitorSeguridadHumanaDetalle = {
  presupuesto_total_mcop: 5666917.74,
  porcentaje_del_pdd: 44.27,
  recursos_sin_sgr_mcop: 5658533.74,
  recursos_sgr_mcop: 8384.0,
  impulsores: COMPONENTES_SEGURIDAD_HUMANA_2024_2027,
  dimensiones_pnud: [
    { dimension: "Económica", presupuesto_asociado_mcop: 182000.0, metas_asociadas: 78, descripcion: "Ingresos dignos, microcrédito popular en Bazurto y empleo juvenil" },
    { dimension: "Alimentaria", presupuesto_asociado_mcop: 82066.0, metas_asociadas: 64, descripcion: "Soberanía nutricional, comedores comunitarios y compras campesinas" },
    { dimension: "Salud", presupuesto_asociado_mcop: 5213654.26, metas_asociadas: 285, descripcion: "Aseguramiento universal, infraestructura hospitalaria y salud mental" },
    { dimension: "Ambiental", presupuesto_asociado_mcop: 45000.0, metas_asociadas: 42, descripcion: "Protección contra riesgos climáticos, drenajes pluviales y rondas hídricas" },
    { dimension: "Personal", presupuesto_asociado_mcop: 211387.6, metas_asociadas: 184, descripcion: "Plan Titán 24, reducción de homicidios, videovigilancia y erradicación de ESCNNA" },
    { dimension: "Comunitaria", presupuesto_asociado_mcop: 54744.8, metas_asociadas: 126, descripcion: "Paz urbana, desarme social, mediación de conflictos barriales y convivencia" },
    { dimension: "Política", presupuesto_asociado_mcop: 96681.1, metas_asociadas: 98, descripcion: "Protección a grupos étnicos, mujeres cuidadoras, infancia y víctimas" },
    { dimension: "Digital", presupuesto_asociado_mcop: 28000.0, metas_asociadas: 15, descripcion: "Conectividad barrial segura, telemedicina y ciberseguridad distrital" },
  ],
  mesas_territoriales: {
    total_mesas: 35,
    demandas_priorizadas_seguridad: 142,
    compromisos_activos: 89,
  },
  compromisos_pas: {
    total_compromisos: 10,
    compromisos_vinculados_linea1: 8,
    articulacion_pct: 80.0,
  },
  delincuencia_hurtos: {
    total_registros_georreferenciados: 12280,
    zonas_criticas_focalizadas: 48,
    intervencion_titan24_priorizada: true,
  },
};

export const ARBOL_PROGRAMATICO_PDD_2024_2027: ImpulsorProgramaInfo[] = [
  // Línea 1: Seguridad Humana
  {
    id: "IMP_1_1",
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    codigo_impulsor: "1.1",
    nombre_impulsor: "Seguridad Ciudadana y Orden Público",
    codigo_programa: "1.1.1",
    nombre_programa: "Plan Estratégico de Seguridad Integral Titán 24",
    presupuesto_cuatrienio_mcop: 35547.29,
    metas_bienestar_count: 14,
    metas_producto_count: 48,
    indicadores_count: 32,
    entidad_responsable: "Distriseguridad",
    plan_asociado: "PDD_2024_2027",
  },
  {
    id: "IMP_1_2",
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    codigo_impulsor: "1.2",
    nombre_impulsor: "Construcción de Paz, Derechos Humanos y Convivencia",
    codigo_programa: "1.2.1",
    nombre_programa: "Mediación Comunitaria y Justicia Barrial",
    presupuesto_cuatrienio_mcop: 24100.0,
    metas_bienestar_count: 8,
    metas_producto_count: 36,
    indicadores_count: 22,
    entidad_responsable: "Secretaría del Interior",
    plan_asociado: "PDD_2024_2027",
  },
  {
    id: "IMP_1_3",
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    codigo_impulsor: "1.3",
    nombre_impulsor: "Salud Pública y Aseguramiento",
    codigo_programa: "1.3.1",
    nombre_programa: "Acceso y Continuidad del Régimen Subsidiado",
    presupuesto_cuatrienio_mcop: 5213654.3,
    metas_bienestar_count: 24,
    metas_producto_count: 112,
    indicadores_count: 88,
    entidad_responsable: "DADIS",
    plan_asociado: "PDD_2024_2027",
  },
  {
    id: "IMP_1_4",
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    codigo_impulsor: "1.4",
    nombre_impulsor: "Atención Integral a Grupos de Especial Protección",
    codigo_programa: "1.4.1",
    nombre_programa: "Red Distrital de Manzanas del Cuidado",
    presupuesto_cuatrienio_mcop: 48200.0,
    metas_bienestar_count: 12,
    metas_producto_count: 52,
    indicadores_count: 38,
    entidad_responsable: "Participación Social / Mujer",
    plan_asociado: "PDD_2024_2027",
  },
  {
    id: "IMP_1_5",
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    codigo_impulsor: "1.5",
    nombre_impulsor: "Superación de la Pobreza Extrema y Soberanía Alimentaria",
    codigo_programa: "1.5.1",
    nombre_programa: "Cartagena sin Hambre y Nutrición Integral",
    presupuesto_cuatrienio_mcop: 82066.0,
    metas_bienestar_count: 16,
    metas_producto_count: 64,
    indicadores_count: 46,
    entidad_responsable: "PES Pedro Romero",
    plan_asociado: "PDD_2024_2027",
  },
  // Línea 2: Vida Digna
  {
    id: "IMP_2_1",
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    codigo_impulsor: "2.1",
    nombre_impulsor: "Educación de Calidad y Primera Infancia",
    codigo_programa: "2.1.1",
    nombre_programa: "Infraestructura Escolar y Bilingüismo",
    presupuesto_cuatrienio_mcop: 2150000.0,
    metas_bienestar_count: 22,
    metas_producto_count: 98,
    indicadores_count: 74,
    entidad_responsable: "Secretaría de Educación",
    plan_asociado: "PDD_2024_2027",
  },
  {
    id: "IMP_2_2",
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    codigo_impulsor: "2.2",
    nombre_impulsor: "Acceso a Servicios Básicos y Agua Potable",
    codigo_programa: "2.2.1",
    nombre_programa: "Cobertura de Acueducto y Alcantarillado Insular",
    presupuesto_cuatrienio_mcop: 1420000.0,
    metas_bienestar_count: 18,
    metas_producto_count: 72,
    indicadores_count: 54,
    entidad_responsable: "Secretaría General / Servicios Públicos",
    plan_asociado: "PDD_2024_2027",
  },
  {
    id: "IMP_2_3",
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    codigo_impulsor: "2.3",
    nombre_impulsor: "Vivienda Digna y Hábitat Resiliente",
    codigo_programa: "2.3.1",
    nombre_programa: "Mejoramiento Integral de Barrios y Titulación",
    presupuesto_cuatrienio_mcop: 985000.0,
    metas_bienestar_count: 14,
    metas_producto_count: 60,
    indicadores_count: 42,
    entidad_responsable: "Corvivienda",
    plan_asociado: "PDD_2024_2027",
  },
  // Línea 3: Desarrollo Económico Equitativo
  {
    id: "IMP_3_1",
    linea_codigo: "LINEA_3",
    linea_nombre: "Desarrollo Económico Equitativo",
    codigo_impulsor: "3.1",
    nombre_impulsor: "Competitividad, Empleo Juvenil e Innovación",
    codigo_programa: "3.1.1",
    nombre_programa: "Economía Popular y Microcrédito no Extorsivo",
    presupuesto_cuatrienio_mcop: 82000.0,
    metas_bienestar_count: 10,
    metas_producto_count: 44,
    indicadores_count: 32,
    entidad_responsable: "Secretaría de Hacienda / Desarrollo Económico",
    plan_asociado: "PDD_2024_2027",
  },
  // Línea 4: Ciudad Conectada y Sostenible
  {
    id: "IMP_4_1",
    linea_codigo: "LINEA_4",
    linea_nombre: "Ciudad Conectada y Sostenible",
    codigo_impulsor: "4.1",
    nombre_impulsor: "Ordenamiento Territorial Alrededor del Agua",
    codigo_programa: "4.1.1",
    nombre_programa: "Plan Maestro de Drenajes Pluviales y Protección Costera",
    presupuesto_cuatrienio_mcop: 520000.0,
    metas_bienestar_count: 15,
    metas_producto_count: 68,
    indicadores_count: 50,
    entidad_responsable: "Secretaría de Infraestructura",
    plan_asociado: "PDD_2024_2027",
  },
  // Línea 5: Innovación Pública
  {
    id: "IMP_5_1",
    linea_codigo: "LINEA_5",
    linea_nombre: "Innovación Pública y Participación",
    codigo_impulsor: "5.1",
    nombre_impulsor: "Transparencia, Gobierno Abierto y Transformación Digital",
    codigo_programa: "5.1.1",
    nombre_programa: "Modernización Institucional y Datos Abiertos",
    presupuesto_cuatrienio_mcop: 185000.0,
    metas_bienestar_count: 12,
    metas_producto_count: 48,
    indicadores_count: 36,
    entidad_responsable: "Secretaría de Planeación / Informática",
    plan_asociado: "PDD_2024_2027",
  },
  // Capítulo 6: Étnico
  {
    id: "IMP_6_1",
    linea_codigo: "CAPITULO_ETNICO",
    linea_nombre: "Pueblos y Comunidades Étnicas",
    codigo_impulsor: "6.1",
    nombre_impulsor: "Salvaguarda y Desarrollo Autónomo Étnico",
    codigo_programa: "6.1.1",
    nombre_programa: "Planes de Vida y Fortalecimiento de Consejos Comunitarios",
    presupuesto_cuatrienio_mcop: 22101.14,
    metas_bienestar_count: 8,
    metas_producto_count: 32,
    indicadores_count: 24,
    entidad_responsable: "Dirección de Asuntos Étnicos",
    plan_asociado: "PDD_2024_2027",
  },
];

export const MACROPROYECTOS_ESTRATEGICOS_2024_2027: MacroproyectoEstrategico[] = [
  {
    id: "MACRO_01",
    nombre: "Malecón del Mar",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura / Distriseguridad",
    inversion_ppi_mcop: 185000.0,
    avance_fisico_pct: 38.5,
    estado: "ALERTA_MEDIA",
    descripcion: "Corredor turístico, ambiental y de protección costera de 7 km de frente marino.",
  },
  {
    id: "MACRO_02",
    nombre: "Plan Maestro de Drenajes Pluviales",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura",
    inversion_ppi_mcop: 320000.0,
    avance_fisico_pct: 24.2,
    estado: "REZAGO_CRITICO",
    descripcion: "Canalización y mitigación de inundaciones en cuencas de la Virgen y Emiliano Alcalá.",
  },
  {
    id: "MACRO_03",
    nombre: "Parque Distrital Ciénaga de la Virgen",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Establecimiento Público Ambiental (EPA)",
    inversion_ppi_mcop: 95000.0,
    avance_fisico_pct: 42.0,
    estado: "ALERTA_MEDIA",
    descripcion: "Restauración ecológica del borde lagunar, ciclorruta perimetral y ecoparques.",
  },
  {
    id: "MACRO_04",
    nombre: "Terminación Vía Perimetral",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura",
    inversion_ppi_mcop: 240000.0,
    avance_fisico_pct: 31.8,
    estado: "REZAGO_CRITICO",
    descripcion: "Conexión vial y de drenaje cerrando el anillo sur-oriental de la ciudad.",
  },
  {
    id: "MACRO_05",
    nombre: "Distrito Creativo y Cultural",
    linea_estrategica: "Línea 2: Vida Digna",
    entidad_responsable: "Instituto de Patrimonio y Cultura (IPCC)",
    inversion_ppi_mcop: 45000.0,
    avance_fisico_pct: 68.0,
    estado: "EN_RUTA",
    descripcion: "Clúster de economías culturales y preservación del patrimonio material e inmaterial.",
  },
  {
    id: "MACRO_06",
    nombre: "Nueva Cárcel Distrital de Cartagena",
    linea_estrategica: "Línea 1: Seguridad Humana",
    entidad_responsable: "Secretaría del Interior",
    inversion_ppi_mcop: 110000.0,
    avance_fisico_pct: 28.5,
    estado: "REZAGO_CRITICO",
    descripcion: "Centro penitenciario moderno con enfoque de derechos humanos y resocialización.",
  },
  {
    id: "MACRO_07",
    nombre: "Puente Benjamín Herrera y Puente Angola",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura",
    inversion_ppi_mcop: 38000.0,
    avance_fisico_pct: 72.0,
    estado: "EN_RUTA",
    descripcion: "Interconexión y alivio vehicular entre Manga, Getsemaní y la zona sur.",
  },
  {
    id: "MACRO_08",
    nombre: "Intercambiador Vial La Carola / El Pozón",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura",
    inversion_ppi_mcop: 82000.0,
    avance_fisico_pct: 34.0,
    estado: "REZAGO_CRITICO",
    descripcion: "Solución a nudo vial de acceso en la Troncal de Occidente.",
  },
  {
    id: "MACRO_09",
    nombre: "Hospital de San José de los Campanos",
    linea_estrategica: "Línea 1: Seguridad Humana",
    entidad_responsable: "DADIS",
    inversion_ppi_mcop: 65000.0,
    avance_fisico_pct: 88.5,
    estado: "EN_RUTA",
    descripcion: "Dotación y apertura de nodo asistencial de segundo nivel en el suroccidente.",
  },
  {
    id: "MACRO_10",
    nombre: "Centro de Alto Rendimiento Deportivo IDER",
    linea_estrategica: "Línea 2: Vida Digna",
    entidad_responsable: "Instituto Distrital de Deporte y Recreación (IDER)",
    inversion_ppi_mcop: 52000.0,
    avance_fisico_pct: 54.0,
    estado: "ALERTA_MEDIA",
    descripcion: "Modernización de pistas, coliseos y semilleros para atletas de alto rendimiento.",
  },
  {
    id: "MACRO_11",
    nombre: "Avenida Bicentenario y Quinta Avenida de Manga",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura",
    inversion_ppi_mcop: 175000.0,
    avance_fisico_pct: 22.0,
    estado: "REZAGO_CRITICO",
    descripcion: "Ampliación de capacidad portuaria y descongestión de tráfico pesado.",
  },
  {
    id: "MACRO_12",
    nombre: "Parque Metropolitano Chambacú",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Gerencia de Espacio Público / EPA",
    inversion_ppi_mcop: 32000.0,
    avance_fisico_pct: 78.0,
    estado: "EN_RUTA",
    descripcion: "Pulmón verde urbano integrado al Parque Espíritu del Manglar.",
  },
  {
    id: "MACRO_13",
    nombre: "Sistema de Transporte Inteligente SITM Transcaribe",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Transcaribe S.A.",
    inversion_ppi_mcop: 89000.0,
    avance_fisico_pct: 61.5,
    estado: "ALERTA_MEDIA",
    descripcion: "Flota a gas/eléctrica, telemetría y ampliación de rutas alimentadoras.",
  },
  {
    id: "MACRO_14",
    nombre: "Manzanas del Cuidado San Francisco y El Pozón",
    linea_estrategica: "Línea 1: Seguridad Humana",
    entidad_responsable: "Secretaría de Desarrollo Social",
    inversion_ppi_mcop: 24000.0,
    avance_fisico_pct: 84.0,
    estado: "EN_RUTA",
    descripcion: "Servicios de relevo a cuidadoras, lavandería pública y guarderías comunitarias.",
  },
  {
    id: "MACRO_15",
    nombre: "Revitalización del Mercado de Bazurto",
    linea_estrategica: "Línea 3: Desarrollo Económico Equitativo",
    entidad_responsable: "Secretaría General / Hacienda",
    inversion_ppi_mcop: 115000.0,
    avance_fisico_pct: 29.0,
    estado: "REZAGO_CRITICO",
    descripcion: "Saneamiento higiénico, reubicación de minoristas y formalización crediticia.",
  },
  {
    id: "MACRO_16",
    nombre: "Red Cívica de Seguridad y Videovigilancia IA",
    linea_estrategica: "Línea 1: Seguridad Humana",
    entidad_responsable: "Distriseguridad",
    inversion_ppi_mcop: 78000.0,
    avance_fisico_pct: 83.4,
    estado: "EN_RUTA",
    descripcion: "Cámaras con reconocimiento facial, alarmas comunitarias e interoperabilidad.",
  },
  {
    id: "MACRO_17",
    nombre: "Muelle Fluvial La Bodeguita y Transporte Acuático",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Corpoturismo / Transcaribe",
    inversion_ppi_mcop: 42000.0,
    avance_fisico_pct: 62.0,
    estado: "ALERTA_MEDIA",
    descripcion: "Embarcaderos turísticos y sistema público acuático en la bahía de Cartagena.",
  },
  {
    id: "MACRO_18",
    nombre: "Programa Hambre Cero y Comedores Comunitarios",
    linea_estrategica: "Línea 1: Seguridad Humana",
    entidad_responsable: "Plan de Emergencia Social (PES)",
    inversion_ppi_mcop: 125000.0,
    avance_fisico_pct: 89.2,
    estado: "EN_RUTA",
    descripcion: "Soberanía alimentaria y 100 comedores en zonas de pobreza extrema.",
  },
  {
    id: "MACRO_19",
    nombre: "Hub de Innovación y Ciberseguridad Distrital",
    linea_estrategica: "Línea 5: Innovación Pública y Participación",
    entidad_responsable: "Oficina Asesora de Informática",
    inversion_ppi_mcop: 28000.0,
    avance_fisico_pct: 74.0,
    estado: "EN_RUTA",
    descripcion: "Transformación digital gubernamental, interoperabilidad de datos y seguridad.",
  },
];

export const PLANES_DESARROLLO_LOCAL_AVANCE: PlanDesarrolloLocalAvance[] = [
  {
    localidad_id: 1,
    nombre: "Localidad 1: Histórica y del Caribe Norte",
    alcaldia_local: "Alcaldía Local Histórica",
    metas_locales_cantidad: 142,
    avance_promedio_pct: 74.2,
    presupuesto_fdl_mcop: 97691.04,
    estado: "EN_RUTA",
  },
  {
    localidad_id: 2,
    nombre: "Localidad 2: De la Virgen y Turística",
    alcaldia_local: "Alcaldía Local de la Virgen",
    metas_locales_cantidad: 156,
    avance_promedio_pct: 68.5,
    presupuesto_fdl_mcop: 161290.0,
    estado: "ALERTA_MEDIA",
  },
  {
    localidad_id: 3,
    nombre: "Localidad 3: Industrial y de la Bahía",
    alcaldia_local: "Alcaldía Local Industrial",
    metas_locales_cantidad: 148,
    avance_promedio_pct: 71.8,
    presupuesto_fdl_mcop: 46000.0,
    estado: "EN_RUTA",
  },
];

// =============================================================================
// DOMINIO A: FRONTERA DEA ENTIDADES (n = 28 DMUs para PDD 2024–2027)
// =============================================================================

export const DMUS_DEA_PDD_ENTIDADES: DmuDeaPddEntidad[] = [
  {
    entidad: "Secretaría de Educación Distrital",
    sigla: "SED",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 1854200.0,
    x1_reportado_matrices_mcop: 2261220.0,
    y1_metas_pdd_cumplidas_equivalentes: 312.4,
    y2_indicadores_eficaces_ge75: 184,
    total_metas_a_cargo: 395,
    theta_ccr: 0.942,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.942,
    retornos_escala: "DRS",
    theta_sbm: 0.935,
    theta_bootstrap_corregido: 0.978,
    ic95_inf: 0.925,
    ic95_sup: 1.0,
    peers: [{ sigla: "SED", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 1854200.0, target_y1_metas: 312.4, target_y2_indicadores: 184 },
    es_frontera: true,
  },
  {
    entidad: "Departamento Administrativo Distrital de Salud",
    sigla: "DADIS",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 2412000.0,
    x1_reportado_matrices_mcop: 2941460.0,
    y1_metas_pdd_cumplidas_equivalentes: 234.0,
    y2_indicadores_eficaces_ge75: 126,
    total_metas_a_cargo: 285,
    theta_ccr: 0.915,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.915,
    retornos_escala: "DRS",
    theta_sbm: 0.898,
    theta_bootstrap_corregido: 0.962,
    ic95_inf: 0.895,
    ic95_sup: 1.0,
    peers: [{ sigla: "DADIS", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 2412000.0, target_y1_metas: 234.0, target_y2_indicadores: 126 },
    es_frontera: true,
  },
  {
    entidad: "Secretaría del Interior y Convivencia",
    sigla: "INTERIOR",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 548200.0,
    x1_reportado_matrices_mcop: 668804.0,
    y1_metas_pdd_cumplidas_equivalentes: 147.8,
    y2_indicadores_eficaces_ge75: 74,
    total_metas_a_cargo: 194,
    theta_ccr: 0.812,
    theta_bcc: 0.865,
    escala_eficiencia_se: 0.939,
    retornos_escala: "IRS",
    theta_sbm: 0.795,
    theta_bootstrap_corregido: 0.835,
    ic95_inf: 0.782,
    ic95_sup: 0.892,
    peers: [{ sigla: "SED", lambda: 0.18 }, { sigla: "CORPOTURISMO", lambda: 0.42 }, { sigla: "EPA", lambda: 0.4 }],
    slacks: { slack_x1_mcop: 42100.0, slack_y1_metas: 18.2, slack_y2_indicadores: 11 },
    targets: { target_x1_mcop: 506100.0, target_y1_metas: 166.0, target_y2_indicadores: 85 },
    es_frontera: false,
  },
  {
    entidad: "Establecimiento Público Ambiental",
    sigla: "EPA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 95400.0,
    x1_reportado_matrices_mcop: 116388.0,
    y1_metas_pdd_cumplidas_equivalentes: 84.5,
    y2_indicadores_eficaces_ge75: 48,
    total_metas_a_cargo: 98,
    theta_ccr: 0.985,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.985,
    retornos_escala: "CRS",
    theta_sbm: 0.98,
    theta_bootstrap_corregido: 0.988,
    ic95_inf: 0.95,
    ic95_sup: 1.0,
    peers: [{ sigla: "EPA", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 95400.0, target_y1_metas: 84.5, target_y2_indicadores: 48 },
    es_frontera: true,
  },
  {
    entidad: "Corporación de Turismo Cartagena",
    sigla: "CORPOTURISMO",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 48500.0,
    x1_reportado_matrices_mcop: 59170.0,
    y1_metas_pdd_cumplidas_equivalentes: 62.4,
    y2_indicadores_eficaces_ge75: 38,
    total_metas_a_cargo: 72,
    theta_ccr: 1.0,
    theta_bcc: 1.0,
    escala_eficiencia_se: 1.0,
    retornos_escala: "CRS",
    theta_sbm: 1.0,
    theta_bootstrap_corregido: 0.995,
    ic95_inf: 0.982,
    ic95_sup: 1.0,
    peers: [{ sigla: "CORPOTURISMO", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 48500.0, target_y1_metas: 62.4, target_y2_indicadores: 38 },
    es_frontera: true,
  },
  {
    entidad: "Instituto de Deporte y Recreación",
    sigla: "IDER",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 112000.0,
    x1_reportado_matrices_mcop: 136640.0,
    y1_metas_pdd_cumplidas_equivalentes: 88.2,
    y2_indicadores_eficaces_ge75: 46,
    total_metas_a_cargo: 118,
    theta_ccr: 0.884,
    theta_bcc: 0.925,
    escala_eficiencia_se: 0.956,
    retornos_escala: "IRS",
    theta_sbm: 0.862,
    theta_bootstrap_corregido: 0.898,
    ic95_inf: 0.845,
    ic95_sup: 0.952,
    peers: [{ sigla: "EPA", lambda: 0.72 }, { sigla: "CORPOTURISMO", lambda: 0.28 }],
    slacks: { slack_x1_mcop: 11400.0, slack_y1_metas: 12.4, slack_y2_indicadores: 8 },
    targets: { target_x1_mcop: 100600.0, target_y1_metas: 100.6, target_y2_indicadores: 54 },
    es_frontera: false,
  },
  {
    entidad: "Instituto de Patrimonio y Cultura",
    sigla: "IPCC",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 76400.0,
    x1_reportado_matrices_mcop: 93208.0,
    y1_metas_pdd_cumplidas_equivalentes: 74.0,
    y2_indicadores_eficaces_ge75: 42,
    total_metas_a_cargo: 88,
    theta_ccr: 0.932,
    theta_bcc: 0.975,
    escala_eficiencia_se: 0.956,
    retornos_escala: "IRS",
    theta_sbm: 0.918,
    theta_bootstrap_corregido: 0.945,
    ic95_inf: 0.9,
    ic95_sup: 0.99,
    peers: [{ sigla: "CORPOTURISMO", lambda: 0.85 }, { sigla: "EPA", lambda: 0.15 }],
    slacks: { slack_x1_mcop: 4200.0, slack_y1_metas: 6.2, slack_y2_indicadores: 4 },
    targets: { target_x1_mcop: 72200.0, target_y1_metas: 80.2, target_y2_indicadores: 46 },
    es_frontera: false,
  },
  {
    entidad: "Secretaría de Infraestructura",
    sigla: "INFRAESTRUCTURA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 1120000.0,
    x1_reportado_matrices_mcop: 1366400.0,
    y1_metas_pdd_cumplidas_equivalentes: 165.2,
    y2_indicadores_eficaces_ge75: 72,
    total_metas_a_cargo: 245,
    theta_ccr: 0.692,
    theta_bcc: 0.742,
    escala_eficiencia_se: 0.933,
    retornos_escala: "DRS",
    theta_sbm: 0.665,
    theta_bootstrap_corregido: 0.712,
    ic95_inf: 0.655,
    ic95_sup: 0.772,
    peers: [{ sigla: "SED", lambda: 0.45 }, { sigla: "EPA", lambda: 0.55 }],
    slacks: { slack_x1_mcop: 142000.0, slack_y1_metas: 34.5, slack_y2_indicadores: 18 },
    targets: { target_x1_mcop: 978000.0, target_y1_metas: 199.7, target_y2_indicadores: 90 },
    es_frontera: false,
  },
  {
    entidad: "Plan de Emergencia Social Pedro Romero",
    sigla: "PES",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 82066.0,
    x1_reportado_matrices_mcop: 100120.52,
    y1_metas_pdd_cumplidas_equivalentes: 84.1,
    y2_indicadores_eficaces_ge75: 48,
    total_metas_a_cargo: 122,
    theta_ccr: 0.954,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.954,
    retornos_escala: "CRS",
    theta_sbm: 0.942,
    theta_bootstrap_corregido: 0.985,
    ic95_inf: 0.938,
    ic95_sup: 1.0,
    peers: [{ sigla: "PES", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 82066.0, target_y1_metas: 84.1, target_y2_indicadores: 48 },
    es_frontera: true,
  },
  {
    entidad: "Distriseguridad",
    sigla: "DISTRISEGURIDAD",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 125000.0,
    x1_reportado_matrices_mcop: 152500.0,
    y1_metas_pdd_cumplidas_equivalentes: 92.4,
    y2_indicadores_eficaces_ge75: 54,
    total_metas_a_cargo: 115,
    theta_ccr: 0.912,
    theta_bcc: 0.965,
    escala_eficiencia_se: 0.945,
    retornos_escala: "IRS",
    theta_sbm: 0.895,
    theta_bootstrap_corregido: 0.935,
    ic95_inf: 0.885,
    ic95_sup: 0.985,
    peers: [{ sigla: "EPA", lambda: 0.65 }, { sigla: "CORPOTURISMO", lambda: 0.35 }],
    slacks: { slack_x1_mcop: 8200.0, slack_y1_metas: 8.5, slack_y2_indicadores: 6 },
    targets: { target_x1_mcop: 116800.0, target_y1_metas: 100.9, target_y2_indicadores: 60 },
    es_frontera: false,
  },
  {
    entidad: "Fondo de Vivienda de Interés Social (Corvivienda)",
    sigla: "CORVIVIENDA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 284000.0,
    x1_reportado_matrices_mcop: 346480.0,
    y1_metas_pdd_cumplidas_equivalentes: 112.5,
    y2_indicadores_eficaces_ge75: 58,
    total_metas_a_cargo: 168,
    theta_ccr: 0.785,
    theta_bcc: 0.835,
    escala_eficiencia_se: 0.94,
    retornos_escala: "IRS",
    theta_sbm: 0.765,
    theta_bootstrap_corregido: 0.805,
    ic95_inf: 0.75,
    ic95_sup: 0.865,
    peers: [{ sigla: "EPA", lambda: 0.45 }, { sigla: "SED", lambda: 0.55 }],
    slacks: { slack_x1_mcop: 24000.0, slack_y1_metas: 16.0, slack_y2_indicadores: 10 },
    targets: { target_x1_mcop: 260000.0, target_y1_metas: 128.5, target_y2_indicadores: 68 },
    es_frontera: false,
  },
  {
    entidad: "Departamento Administrativo de Tránsito y Transporte",
    sigla: "DATT",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 98000.0,
    x1_reportado_matrices_mcop: 119560.0,
    y1_metas_pdd_cumplidas_equivalentes: 78.4,
    y2_indicadores_eficaces_ge75: 42,
    total_metas_a_cargo: 105,
    theta_ccr: 0.842,
    theta_bcc: 0.892,
    escala_eficiencia_se: 0.944,
    retornos_escala: "IRS",
    theta_sbm: 0.825,
    theta_bootstrap_corregido: 0.865,
    ic95_inf: 0.81,
    ic95_sup: 0.925,
    peers: [{ sigla: "CORPOTURISMO", lambda: 0.6 }, { sigla: "EPA", lambda: 0.4 }],
    slacks: { slack_x1_mcop: 9500.0, slack_y1_metas: 9.2, slack_y2_indicadores: 5 },
    targets: { target_x1_mcop: 88500.0, target_y1_metas: 87.6, target_y2_indicadores: 47 },
    es_frontera: false,
  },
  {
    entidad: "Secretaría de Hacienda Distrital",
    sigla: "HACIENDA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 142000.0,
    x1_reportado_matrices_mcop: 173240.0,
    y1_metas_pdd_cumplidas_equivalentes: 124.0,
    y2_indicadores_eficaces_ge75: 68,
    total_metas_a_cargo: 148,
    theta_ccr: 0.965,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.965,
    retornos_escala: "CRS",
    theta_sbm: 0.952,
    theta_bootstrap_corregido: 0.985,
    ic95_inf: 0.94,
    ic95_sup: 1.0,
    peers: [{ sigla: "HACIENDA", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 142000.0, target_y1_metas: 124.0, target_y2_indicadores: 68 },
    es_frontera: true,
  },
  {
    entidad: "Secretaría de Participación y Desarrollo Social",
    sigla: "PARTICIPACION",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 320000.0,
    x1_reportado_matrices_mcop: 390400.0,
    y1_metas_pdd_cumplidas_equivalentes: 168.5,
    y2_indicadores_eficaces_ge75: 84,
    total_metas_a_cargo: 220,
    theta_ccr: 0.852,
    theta_bcc: 0.905,
    escala_eficiencia_se: 0.941,
    retornos_escala: "IRS",
    theta_sbm: 0.835,
    theta_bootstrap_corregido: 0.875,
    ic95_inf: 0.82,
    ic95_sup: 0.935,
    peers: [{ sigla: "SED", lambda: 0.35 }, { sigla: "EPA", lambda: 0.65 }],
    slacks: { slack_x1_mcop: 22000.0, slack_y1_metas: 18.5, slack_y2_indicadores: 10 },
    targets: { target_x1_mcop: 298000.0, target_y1_metas: 187.0, target_y2_indicadores: 94 },
    es_frontera: false,
  },
  {
    entidad: "Secretaría de Planeación Distrital",
    sigla: "PLANEACION",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 115000.0,
    x1_reportado_matrices_mcop: 140300.0,
    y1_metas_pdd_cumplidas_equivalentes: 135.0,
    y2_indicadores_eficaces_ge75: 78,
    total_metas_a_cargo: 154,
    theta_ccr: 0.985,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.985,
    retornos_escala: "CRS",
    theta_sbm: 0.978,
    theta_bootstrap_corregido: 0.992,
    ic95_inf: 0.965,
    ic95_sup: 1.0,
    peers: [{ sigla: "PLANEACION", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 115000.0, target_y1_metas: 135.0, target_y2_indicadores: 78 },
    es_frontera: true,
  },
  {
    entidad: "Secretaría General Distrital",
    sigla: "GENERAL",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 245000.0,
    x1_reportado_matrices_mcop: 298900.0,
    y1_metas_pdd_cumplidas_equivalentes: 142.0,
    y2_indicadores_eficaces_ge75: 70,
    total_metas_a_cargo: 180,
    theta_ccr: 0.825,
    theta_bcc: 0.88,
    escala_eficiencia_se: 0.938,
    retornos_escala: "IRS",
    theta_sbm: 0.805,
    theta_bootstrap_corregido: 0.845,
    ic95_inf: 0.795,
    ic95_sup: 0.91,
    peers: [{ sigla: "HACIENDA", lambda: 0.5 }, { sigla: "PLANEACION", lambda: 0.5 }],
    slacks: { slack_x1_mcop: 18500.0, slack_y1_metas: 14.0, slack_y2_indicadores: 8 },
    targets: { target_x1_mcop: 226500.0, target_y1_metas: 156.0, target_y2_indicadores: 78 },
    es_frontera: false,
  },
  {
    entidad: "Oficina para la Gestión del Riesgo (OAGRD)",
    sigla: "GESTION_RIESGO",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 68000.0,
    x1_reportado_matrices_mcop: 82960.0,
    y1_metas_pdd_cumplidas_equivalentes: 58.4,
    y2_indicadores_eficaces_ge75: 32,
    total_metas_a_cargo: 75,
    theta_ccr: 0.895,
    theta_bcc: 0.945,
    escala_eficiencia_se: 0.947,
    retornos_escala: "IRS",
    theta_sbm: 0.875,
    theta_bootstrap_corregido: 0.915,
    ic95_inf: 0.86,
    ic95_sup: 0.97,
    peers: [{ sigla: "CORPOTURISMO", lambda: 0.4 }, { sigla: "EPA", lambda: 0.6 }],
    slacks: { slack_x1_mcop: 4500.0, slack_y1_metas: 5.5, slack_y2_indicadores: 4 },
    targets: { target_x1_mcop: 63500.0, target_y1_metas: 63.9, target_y2_indicadores: 36 },
    es_frontera: false,
  },
  {
    entidad: "Escuela de Gobierno y Liderazgo",
    sigla: "ESCUELA_GOBIERNO",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 24500.0,
    x1_reportado_matrices_mcop: 29890.0,
    y1_metas_pdd_cumplidas_equivalentes: 38.0,
    y2_indicadores_eficaces_ge75: 22,
    total_metas_a_cargo: 46,
    theta_ccr: 0.945,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.945,
    retornos_escala: "IRS",
    theta_sbm: 0.932,
    theta_bootstrap_corregido: 0.975,
    ic95_inf: 0.92,
    ic95_sup: 1.0,
    peers: [{ sigla: "ESCUELA_GOBIERNO", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 24500.0, target_y1_metas: 38.0, target_y2_indicadores: 22 },
    es_frontera: true,
  },
  {
    entidad: "Gerencia de Espacio Público y Movilidad",
    sigla: "ESPACIO_PUBLICO",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 42000.0,
    x1_reportado_matrices_mcop: 51240.0,
    y1_metas_pdd_cumplidas_equivalentes: 48.0,
    y2_indicadores_eficaces_ge75: 28,
    total_metas_a_cargo: 62,
    theta_ccr: 0.885,
    theta_bcc: 0.935,
    escala_eficiencia_se: 0.947,
    retornos_escala: "IRS",
    theta_sbm: 0.865,
    theta_bootstrap_corregido: 0.905,
    ic95_inf: 0.85,
    ic95_sup: 0.96,
    peers: [{ sigla: "CORPOTURISMO", lambda: 0.8 }, { sigla: "EPA", lambda: 0.2 }],
    slacks: { slack_x1_mcop: 3200.0, slack_y1_metas: 4.8, slack_y2_indicadores: 3 },
    targets: { target_x1_mcop: 38800.0, target_y1_metas: 52.8, target_y2_indicadores: 31 },
    es_frontera: false,
  },
  {
    entidad: "Departamento de Valorización Distrital",
    sigla: "VALORIZACION",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 18500.0,
    x1_reportado_matrices_mcop: 22570.0,
    y1_metas_pdd_cumplidas_equivalentes: 24.0,
    y2_indicadores_eficaces_ge75: 14,
    total_metas_a_cargo: 32,
    theta_ccr: 0.875,
    theta_bcc: 0.92,
    escala_eficiencia_se: 0.951,
    retornos_escala: "IRS",
    theta_sbm: 0.85,
    theta_bootstrap_corregido: 0.89,
    ic95_inf: 0.835,
    ic95_sup: 0.945,
    peers: [{ sigla: "ESCUELA_GOBIERNO", lambda: 0.7 }, { sigla: "CORPOTURISMO", lambda: 0.3 }],
    slacks: { slack_x1_mcop: 1800.0, slack_y1_metas: 2.8, slack_y2_indicadores: 2 },
    targets: { target_x1_mcop: 16700.0, target_y1_metas: 26.8, target_y2_indicadores: 16 },
    es_frontera: false,
  },
  {
    entidad: "Cuerpo Oficial de Bomberos de Cartagena",
    sigla: "BOMBEROS",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 32000.0,
    x1_reportado_matrices_mcop: 39040.0,
    y1_metas_pdd_cumplidas_equivalentes: 36.5,
    y2_indicadores_eficaces_ge75: 20,
    total_metas_a_cargo: 45,
    theta_ccr: 0.925,
    theta_bcc: 0.98,
    escala_eficiencia_se: 0.944,
    retornos_escala: "IRS",
    theta_sbm: 0.905,
    theta_bootstrap_corregido: 0.95,
    ic95_inf: 0.91,
    ic95_sup: 0.995,
    peers: [{ sigla: "CORPOTURISMO", lambda: 0.5 }, { sigla: "ESCUELA_GOBIERNO", lambda: 0.5 }],
    slacks: { slack_x1_mcop: 1500.0, slack_y1_metas: 2.5, slack_y2_indicadores: 2 },
    targets: { target_x1_mcop: 30500.0, target_y1_metas: 39.0, target_y2_indicadores: 22 },
    es_frontera: false,
  },
  {
    entidad: "Alcaldía Local Histórica y del Caribe Norte",
    sigla: "ALHCN",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "ALCALDIAS_LOCALES",
    x1_ppi_conciliado_constante_2025_mcop: 95800.0,
    x1_reportado_matrices_mcop: 116876.0,
    y1_metas_pdd_cumplidas_equivalentes: 105.4,
    y2_indicadores_eficaces_ge75: 54,
    total_metas_a_cargo: 142,
    theta_ccr: 0.912,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.912,
    retornos_escala: "IRS",
    theta_sbm: 0.895,
    theta_bootstrap_corregido: 0.965,
    ic95_inf: 0.915,
    ic95_sup: 1.0,
    peers: [{ sigla: "ALHCN", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 95800.0, target_y1_metas: 105.4, target_y2_indicadores: 54 },
    es_frontera: true,
  },
  {
    entidad: "Alcaldía Local de la Virgen y Turística",
    sigla: "ALVT",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "ALCALDIAS_LOCALES",
    x1_ppi_conciliado_constante_2025_mcop: 158200.0,
    x1_reportado_matrices_mcop: 193004.0,
    y1_metas_pdd_cumplidas_equivalentes: 112.0,
    y2_indicadores_eficaces_ge75: 58,
    total_metas_a_cargo: 156,
    theta_ccr: 0.845,
    theta_bcc: 0.91,
    escala_eficiencia_se: 0.929,
    retornos_escala: "DRS",
    theta_sbm: 0.82,
    theta_bootstrap_corregido: 0.875,
    ic95_inf: 0.815,
    ic95_sup: 0.935,
    peers: [{ sigla: "ALHCN", lambda: 0.65 }, { sigla: "ALIB", lambda: 0.35 }],
    slacks: { slack_x1_mcop: 14500.0, slack_y1_metas: 15.0, slack_y2_indicadores: 8 },
    targets: { target_x1_mcop: 143700.0, target_y1_metas: 127.0, target_y2_indicadores: 66 },
    es_frontera: false,
  },
  {
    entidad: "Alcaldía Local Industrial y de la Bahía",
    sigla: "ALIB",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "ALCALDIAS_LOCALES",
    x1_ppi_conciliado_constante_2025_mcop: 45200.0,
    x1_reportado_matrices_mcop: 55144.0,
    y1_metas_pdd_cumplidas_equivalentes: 98.6,
    y2_indicadores_eficaces_ge75: 48,
    total_metas_a_cargo: 148,
    theta_ccr: 0.965,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.965,
    retornos_escala: "CRS",
    theta_sbm: 0.948,
    theta_bootstrap_corregido: 0.985,
    ic95_inf: 0.945,
    ic95_sup: 1.0,
    peers: [{ sigla: "ALIB", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 45200.0, target_y1_metas: 98.6, target_y2_indicadores: 48 },
    es_frontera: true,
  },
  {
    entidad: "Transcaribe S.A.",
    sigla: "TRANSCARIBE",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 148000.0,
    x1_reportado_matrices_mcop: 180560.0,
    y1_metas_pdd_cumplidas_equivalentes: 88.0,
    y2_indicadores_eficaces_ge75: 44,
    total_metas_a_cargo: 110,
    theta_ccr: 0.815,
    theta_bcc: 0.875,
    escala_eficiencia_se: 0.931,
    retornos_escala: "IRS",
    theta_sbm: 0.795,
    theta_bootstrap_corregido: 0.84,
    ic95_inf: 0.785,
    ic95_sup: 0.898,
    peers: [{ sigla: "SED", lambda: 0.25 }, { sigla: "EPA", lambda: 0.75 }],
    slacks: { slack_x1_mcop: 12500.0, slack_y1_metas: 10.5, slack_y2_indicadores: 6 },
    targets: { target_x1_mcop: 135500.0, target_y1_metas: 98.5, target_y2_indicadores: 50 },
    es_frontera: false,
  },
  {
    entidad: "Institución Universitaria Mayor de Cartagena",
    sigla: "COLEGIO_MAYOR",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 38000.0,
    x1_reportado_matrices_mcop: 46360.0,
    y1_metas_pdd_cumplidas_equivalentes: 42.0,
    y2_indicadores_eficaces_ge75: 24,
    total_metas_a_cargo: 52,
    theta_ccr: 0.935,
    theta_bcc: 0.985,
    escala_eficiencia_se: 0.949,
    retornos_escala: "IRS",
    theta_sbm: 0.915,
    theta_bootstrap_corregido: 0.955,
    ic95_inf: 0.91,
    ic95_sup: 1.0,
    peers: [{ sigla: "ESCUELA_GOBIERNO", lambda: 0.6 }, { sigla: "CORPOTURISMO", lambda: 0.4 }],
    slacks: { slack_x1_mcop: 1800.0, slack_y1_metas: 3.2, slack_y2_indicadores: 2 },
    targets: { target_x1_mcop: 36200.0, target_y1_metas: 45.2, target_y2_indicadores: 26 },
    es_frontera: false,
  },
  {
    entidad: "Fondo Territorial de Pensiones",
    sigla: "FONDO_PENSIONES",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 28000.0,
    x1_reportado_matrices_mcop: 34160.0,
    y1_metas_pdd_cumplidas_equivalentes: 32.0,
    y2_indicadores_eficaces_ge75: 18,
    total_metas_a_cargo: 38,
    theta_ccr: 0.952,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.952,
    retornos_escala: "CRS",
    theta_sbm: 0.94,
    theta_bootstrap_corregido: 0.98,
    ic95_inf: 0.935,
    ic95_sup: 1.0,
    peers: [{ sigla: "FONDO_PENSIONES", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 28000.0, target_y1_metas: 32.0, target_y2_indicadores: 18 },
    es_frontera: true,
  },
  {
    entidad: "Unidad Municipal de Asistencia Técnica Agropecuaria",
    sigla: "UMATA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 18500.0,
    x1_reportado_matrices_mcop: 22570.0,
    y1_metas_pdd_cumplidas_equivalentes: 26.5,
    y2_indicadores_eficaces_ge75: 16,
    total_metas_a_cargo: 34,
    theta_ccr: 0.92,
    theta_bcc: 0.97,
    escala_eficiencia_se: 0.948,
    retornos_escala: "IRS",
    theta_sbm: 0.902,
    theta_bootstrap_corregido: 0.94,
    ic95_inf: 0.89,
    ic95_sup: 0.99,
    peers: [{ sigla: "ESCUELA_GOBIERNO", lambda: 0.5 }, { sigla: "CORPOTURISMO", lambda: 0.5 }],
    slacks: { slack_x1_mcop: 1200.0, slack_y1_metas: 2.2, slack_y2_indicadores: 2 },
    targets: { target_x1_mcop: 17300.0, target_y1_metas: 28.7, target_y2_indicadores: 18 },
    es_frontera: false,
  },
];

// =============================================================================
// DOMINIO B: FRONTERA DEA LÍNEAS ESTRATÉGICAS
// =============================================================================

export const DMUS_DEA_PDD_LINEAS_ESTRATEGICAS: DmuDeaPddLineaEstrategica[] = [
  {
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 5581913.97,
    y1_metas_cumplidas_equivalentes: 684.2,
    y2_indicadores_eficaces_ge75: 412,
    theta_ccr: 0.885,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.885,
    retornos_escala: "DRS",
    es_frontera: true,
  },
  {
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 5160616.99,
    y1_metas_cumplidas_equivalentes: 712.5,
    y2_indicadores_eficaces_ge75: 448,
    theta_ccr: 0.842,
    theta_bcc: 0.915,
    escala_eficiencia_se: 0.92,
    retornos_escala: "DRS",
    es_frontera: false,
  },
  {
    linea_codigo: "LINEA_3",
    linea_nombre: "Desarrollo Económico Equitativo",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 158271.4,
    y1_metas_cumplidas_equivalentes: 314.1,
    y2_indicadores_eficaces_ge75: 185,
    theta_ccr: 0.724,
    theta_bcc: 0.764,
    escala_eficiencia_se: 0.948,
    retornos_escala: "IRS",
    es_frontera: false,
  },
  {
    linea_codigo: "LINEA_4",
    linea_nombre: "Ciudad Conectada y Sostenible",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 1372351.68,
    y1_metas_cumplidas_equivalentes: 298.8,
    y2_indicadores_eficaces_ge75: 164,
    theta_ccr: 0.651,
    theta_bcc: 0.692,
    escala_eficiencia_se: 0.941,
    retornos_escala: "IRS",
    es_frontera: false,
  },
  {
    linea_codigo: "LINEA_5",
    linea_nombre: "Innovación Pública y Participación",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 313917.0,
    y1_metas_cumplidas_equivalentes: 242.0,
    y2_indicadores_eficaces_ge75: 148,
    theta_ccr: 0.798,
    theta_bcc: 0.84,
    escala_eficiencia_se: 0.95,
    retornos_escala: "IRS",
    es_frontera: false,
  },
  {
    linea_codigo: "CAPITULO_ETNICO",
    linea_nombre: "Pueblos y Comunidades Étnicas",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 21769.62,
    y1_metas_cumplidas_equivalentes: 55.3,
    y2_indicadores_eficaces_ge75: 32,
    theta_ccr: 0.92,
    theta_bcc: 1.0,
    escala_eficiencia_se: 0.92,
    retornos_escala: "CRS",
    es_frontera: true,
  },
];

// =============================================================================
// DOMINIO C: FRONTERA DEA PLANES DE DESARROLLO LOCAL (LOCALIDADES 1, 2 Y 3)
// =============================================================================

export const FRONTERA_DEA_PDL_LOCALIDADES: DmuDeaPdlLocalidad[] = [
  {
    localidad_id: 1,
    nombre: "Localidad 1: Histórica y del Caribe Norte",
    alcaldia: "Alcaldía Local Histórica",
    x1_fdl_presupuesto_constante_2025_mcop: 95800.0,
    y1_metas_locales_cumplidas_eq: 105.4,
    y2_indicadores_eficaces: 54,
    theta_ccr: 0.912,
    theta_bcc: 1.0,
    escala_se: 0.912,
    retornos: "IRS",
    theta_sbm: 0.895,
    ic95_bootstrap: [0.88, 1.0],
    peers: [{ sigla: "ALHCN", lambda: 1.0 }],
    es_frontera: true,
  },
  {
    localidad_id: 2,
    nombre: "Localidad 2: De la Virgen y Turística",
    alcaldia: "Alcaldía Local de la Virgen",
    x1_fdl_presupuesto_constante_2025_mcop: 158200.0,
    y1_metas_locales_cumplidas_eq: 112.0,
    y2_indicadores_eficaces: 58,
    theta_ccr: 0.845,
    theta_bcc: 0.91,
    escala_se: 0.929,
    retornos: "DRS",
    theta_sbm: 0.82,
    ic95_bootstrap: [0.805, 0.942],
    peers: [{ sigla: "ALHCN", lambda: 0.65 }, { sigla: "ALIB", lambda: 0.35 }],
    es_frontera: false,
  },
  {
    localidad_id: 3,
    nombre: "Localidad 3: Industrial y de la Bahía",
    alcaldia: "Alcaldía Local Industrial",
    x1_fdl_presupuesto_constante_2025_mcop: 45200.0,
    y1_metas_locales_cumplidas_eq: 98.6,
    y2_indicadores_eficaces: 48,
    theta_ccr: 0.965,
    theta_bcc: 1.0,
    escala_se: 0.965,
    retornos: "CRS",
    theta_sbm: 0.948,
    ic95_bootstrap: [0.93, 1.0],
    peers: [{ sigla: "ALIB", lambda: 1.0 }],
    es_frontera: true,
  },
];

// =============================================================================
// ECONOMETRÍA, MALMQUIST, FDR, GINI/HHI Y WILCOXON
// =============================================================================

export const MALMQUIST_INTER_PLANES_DATA: MalmquistTransicionInterPlanes[] = [
  {
    periodo_transicion: "PDD 2016–2019 → PDD 2020–2023",
    plan_base: "Primero la Gente",
    plan_comparado: "Salvemos Juntos a Cartagena",
    mpi_medio_geometrico: 1.042,
    effch_catch_up_medio: 1.025,
    techch_desplazamiento_medio: 1.017,
    entidades_con_avance_mpi: 18,
    entidades_con_retroceso_mpi: 5,
    diagnostico: "Ganancia de productividad del 4,2% inter-gobierno impulsada en 60% por convergencia técnica interna (EFFCH)",
  },
  {
    periodo_transicion: "PDD 2020–2023 → PDD 2024–2027",
    plan_base: "Salvemos Juntos a Cartagena",
    plan_comparado: "Cartagena, Ciudad de Derechos",
    mpi_medio_geometrico: 1.058,
    effch_catch_up_medio: 1.031,
    techch_desplazamiento_medio: 1.026,
    entidades_con_avance_mpi: 22,
    entidades_con_retroceso_mpi: 4,
    diagnostico: "Aceleración al 5,8% de ganancia de productividad impulsada por mayor escala de inversión y articulación institucional",
  },
  {
    periodo_transicion: "ACUMULADO 2016–2027 (Sexenio Extendido)",
    plan_base: "Primero la Gente (2016)",
    plan_comparado: "Ciudad de Derechos (2027)",
    mpi_medio_geometrico: 1.05,
    effch_catch_up_medio: 1.028,
    techch_desplazamiento_medio: 1.021,
    entidades_con_avance_mpi: 23,
    entidades_con_retroceso_mpi: 3,
    diagnostico: "Crecimiento acumulado sostenido promedio del 5,0% anual compuesto en eficiencia de cumplimiento de metas PDD",
  },
];

export const CORRELACIONES_PDD_FDR_DATA: CorrelacionPddFdr[] = [
  {
    par_variables: "Asignación PPI (X1) vs. Metas PDD Cumplidas (Y1)",
    coeficiente_spearman: 0.684,
    coeficiente_pearson: 0.712,
    n_observaciones: 28,
    p_value: 0.00004,
    q_value_fdr: 0.0002,
    significativo_al_5pct: true,
    interpretacion: "Fuerte correlación positiva: el presupuesto asignado en el PPI predice el volumen físico de metas alcanzadas.",
  },
  {
    par_variables: "Articulación Plan Acción Anual vs. Eficiencia DEA PDD (θ_BCC)",
    coeficiente_spearman: 0.542,
    coeficiente_pearson: 0.568,
    n_observaciones: 28,
    p_value: 0.0012,
    q_value_fdr: 0.0024,
    significativo_al_5pct: true,
    interpretacion: "Las dependencias que alinean sus planes de acción anuales con el PDD logran 54% mayor eficiencia en frontera DEA.",
  },
  {
    par_variables: "Continuidad Proyectos BPIM vs. Metas Cumplidas",
    coeficiente_spearman: 0.618,
    coeficiente_pearson: 0.645,
    n_observaciones: 28,
    p_value: 0.0003,
    q_value_fdr: 0.0008,
    significativo_al_5pct: true,
    interpretacion: "La radicación y maduración continua de proyectos en banco BPIM impulsa la eficacia de los indicadores de producto.",
  },
  {
    par_variables: "% Verbo Débil DNP (reunionitis) vs. Avance PDD",
    coeficiente_spearman: -0.492,
    coeficiente_pearson: -0.518,
    n_observaciones: 28,
    p_value: 0.0035,
    q_value_fdr: 0.0052,
    significativo_al_5pct: true,
    interpretacion: "Impacto adverso significativo: mayor formulación con verbos ambiguos reduce el avance físico real de las metas.",
  },
  {
    par_variables: "Factor Sobrerreporte Matrices vs. Holguras Slacks DEA",
    coeficiente_spearman: 0.465,
    coeficiente_pearson: 0.482,
    n_observaciones: 28,
    p_value: 0.0068,
    q_value_fdr: 0.0085,
    significativo_al_5pct: true,
    interpretacion: "Las matrices de seguimiento con mayor duplicidad documental presentan mayores holguras presupuestales en la frontera.",
  },
];

export const DESIGUALDAD_PPI_GINI_HHI: DesigualdadPpiGiniHhi[] = [
  {
    plan_codigo: "PDD_2016_2019",
    nombre_plan: "Primero la Gente",
    cuatrienio: "2016–2019",
    gini_ppi_lineas: 0.582,
    hhi_ppi_lineas: 2140,
    gini_dimensiones_shi: 0.598,
    hhi_dimensiones_shi: 2310,
    linea_mayor_participacion: "Infraestructura y Vías",
    pct_linea_mayor: 42.5,
    tendencia_concentracion: "Alta concentración presupuestal en obras civiles tradicionales",
  },
  {
    plan_codigo: "PDD_2020_2023",
    nombre_plan: "Salvemos Juntos a Cartagena",
    cuatrienio: "2020–2023",
    gini_ppi_lineas: 0.546,
    hhi_ppi_lineas: 1980,
    gini_dimensiones_shi: 0.562,
    hhi_dimensiones_shi: 2120,
    linea_mayor_participacion: "Pilar Incluyente (Salud y Educación)",
    pct_linea_mayor: 41.0,
    tendencia_concentracion: "Reducción moderada de la desigualdad presupuestal hacia gasto social",
  },
  {
    plan_codigo: "PDD_2024_2027",
    nombre_plan: "Cartagena, Ciudad de Derechos (Acuerdo 139)",
    cuatrienio: "2024–2027",
    gini_ppi_lineas: 0.512,
    hhi_ppi_lineas: 1810,
    gini_dimensiones_shi: 0.528,
    hhi_dimensiones_shi: 1940,
    linea_mayor_participacion: "Línea 1: Seguridad Humana",
    pct_linea_mayor: 44.27,
    tendencia_concentracion: "Menor desigualdad histórica (Gini 0.512, HHI 1.810) con equilibrio entre Vida Digna y Seguridad Humana",
  },
];

export const PRUEBAS_WILCOXON_INTER_PLANES: PruebaWilcoxonInterPlanes[] = [
  {
    comparacion: "PDD 2016–2019 vs. PDD 2020–2023",
    n_entidades_comunes: 23,
    w_statistic: 68.0,
    z_score: -2.48,
    p_value: 0.0131,
    diferencia_mediana_pct: 6.8,
    conclusion_estadistica: "Rechaza H0 (p = 0.0131 < 0.05): la eficiencia técnica mediana de cumplimiento aumentó significativamente.",
  },
  {
    comparacion: "PDD 2020–2023 vs. PDD 2024–2027",
    n_entidades_comunes: 26,
    w_statistic: 54.5,
    z_score: -2.89,
    p_value: 0.0038,
    diferencia_mediana_pct: 7.4,
    conclusion_estadistica: "Rechaza H0 al 99% (p = 0.0038 < 0.01): cambio estructural positivo en la capacidad de ejecución de metas.",
  },
];

// =============================================================================
// 3. RESPUESTAS Y GETTERS LOCALES RESILIENTES
// =============================================================================

export interface CatalogoYConciliacionPpiRespuesta {
  catalogo_planes: PlanDesarrolloInfo[];
  tabla_ppi_anual: DetalleAnualPpi[];
  lineas_estrategicas_ppi: PpiPorLineaEstrategica[];
  conciliacion_ppi: ConciliacionPpiVsBdCshItem[];
  serie_ipc: DatoIpcHistorico[];
  fondos_desarrollo_local: FondoDesarrolloLocalDetalle[];
}

export interface CumplimientoMetasPddRespuesta {
  resumen_planes: ResumenCumplimientoPlan[];
  componentes_seguridad_humana: ComponenteSeguridadHumana[];
  macroproyectos: MacroproyectoEstrategico[];
  planes_locales: PlanDesarrolloLocalAvance[];
  cruce_tripartito: EstadisticasCruceTripartito;
  filtro_aplicado?: { plan?: string; linea?: string; entidad?: string; imputacion?: ModoImputacionPdd };
}

export interface FronteraDeaPddRespuesta {
  plan_evaluado: CodigoPlanDesarrollo;
  insumo_utilizado: InsumoDeaPdd;
  nivel_evaluado: NivelDeaPdd;
  ranking_entidades: DmuDeaPddEntidad[];
  ranking_lineas_estrategicas: DmuDeaPddLineaEstrategica[];
  ranking_localidades_pdl: DmuDeaPdlLocalidad[];
  eficiencia_media_bcc_entidades: number;
  eficiencia_media_ccr_entidades: number;
  entidades_en_frontera_cantidad: number;
  entidades_rezagadas_cantidad: number;
}

export interface EconometriaComparadaPddRespuesta {
  malmquist_inter_planes: MalmquistTransicionInterPlanes[];
  correlaciones_fdr: CorrelacionPddFdr[];
  desigualdad_gini_hhi: DesigualdadPpiGiniHhi[];
  pruebas_wilcoxon: PruebaWilcoxonInterPlanes[];
}

export interface ExploradorProgramasYSeguridadHumanaRespuesta {
  fondos_locales: FondoDesarrolloLocalDetalle[];
  arbol_impulsores_programas: ImpulsorProgramaInfo[];
  cruce_tripartito: EstadisticasCruceTripartito;
  monitor_seguridad_humana: MonitorSeguridadHumanaDetalle;
  frontera_multi_nivel: {
    nivel_activo: NivelDeaPdd;
    entidades: DmuDeaPddEntidad[];
    lineas: DmuDeaPddLineaEstrategica[];
    localidades: DmuDeaPdlLocalidad[];
  };
}

export interface ResumenEjecutivoPddDeaRespuesta {
  catalogo: CatalogoYConciliacionPpiRespuesta;
  cumplimiento: CumplimientoMetasPddRespuesta;
  frontera: FronteraDeaPddRespuesta;
  econometria: EconometriaComparadaPddRespuesta;
  explorador: ExploradorProgramasYSeguridadHumanaRespuesta;
  laboratorio_prescriptivo?: LaboratorioPrescriptivoPddRespuesta;
  fecha_generacion: string;
  version_motor: string;
}

export function obtenerCatalogoYConciliacionPpiLocal(): CatalogoYConciliacionPpiRespuesta {
  return {
    catalogo_planes: CATALOGO_PLANES_DESARROLLO,
    tabla_ppi_anual: TABLA_OFICIAL_PPI_ANUAL,
    lineas_estrategicas_ppi: PPI_POR_LINEA_PDD_2024_2027,
    conciliacion_ppi: CONCILIACION_PPI_BD_CSH,
    serie_ipc: SERIE_IPC_DANE_HISTORICA,
    fondos_desarrollo_local: FONDOS_DESARROLLO_LOCAL_DETALLE,
  };
}

export function obtenerCumplimientoMetasPddLocal(params?: {
  plan?: string;
  linea?: string;
  entidad?: string;
  imputacion?: ModoImputacionPdd;
}): CumplimientoMetasPddRespuesta {
  let macroproyectos = [...MACROPROYECTOS_ESTRATEGICOS_2024_2027];
  if (params?.linea && params.linea !== "TODAS") {
    macroproyectos = macroproyectos.filter((m) =>
      m.linea_estrategica.toLowerCase().includes(params.linea!.toLowerCase())
    );
  }
  if (params?.entidad && params.entidad !== "TODAS") {
    macroproyectos = macroproyectos.filter((m) =>
      m.entidad_responsable.toLowerCase().includes(params.entidad!.toLowerCase())
    );
  }

  return {
    resumen_planes: RESUMEN_CUMPLIMIENTO_PLANES,
    componentes_seguridad_humana: COMPONENTES_SEGURIDAD_HUMANA_2024_2027,
    macroproyectos,
    planes_locales: PLANES_DESARROLLO_LOCAL_AVANCE,
    cruce_tripartito: ESTADISTICAS_CRUCE_TRIPARTITO_PDD,
    filtro_aplicado: params,
  };
}

export function obtenerFronteraDeaPddLocal(params?: {
  plan?: string;
  insumo?: InsumoDeaPdd;
  nivel?: NivelDeaPdd;
}): FronteraDeaPddRespuesta {
  const plan: CodigoPlanDesarrollo =
    (params?.plan as CodigoPlanDesarrollo) || "PDD_2024_2027";
  const insumo: InsumoDeaPdd = params?.insumo || "conciliado_ppi";
  const nivel: NivelDeaPdd = params?.nivel || "ENTIDADES";

  const entidades = DMUS_DEA_PDD_ENTIDADES.filter((d) => d.plan_codigo === plan);
  const ranking = entidades.length > 0 ? entidades : DMUS_DEA_PDD_ENTIDADES;

  const sumBcc = ranking.reduce((acc, d) => acc + d.theta_bcc, 0);
  const sumCcr = ranking.reduce((acc, d) => acc + d.theta_ccr, 0);
  const n = ranking.length;

  return {
    plan_evaluado: plan,
    insumo_utilizado: insumo,
    nivel_evaluado: nivel,
    ranking_entidades: ranking,
    ranking_lineas_estrategicas: DMUS_DEA_PDD_LINEAS_ESTRATEGICAS,
    ranking_localidades_pdl: FRONTERA_DEA_PDL_LOCALIDADES,
    eficiencia_media_bcc_entidades: n > 0 ? Number((sumBcc / n).toFixed(3)) : 0.885,
    eficiencia_media_ccr_entidades: n > 0 ? Number((sumCcr / n).toFixed(3)) : 0.824,
    entidades_en_frontera_cantidad: ranking.filter((d) => d.es_frontera).length,
    entidades_rezagadas_cantidad: ranking.filter((d) => d.theta_bcc < 0.8).length,
  };
}

export function obtenerEconometriaComparadaPddLocal(): EconometriaComparadaPddRespuesta {
  return {
    malmquist_inter_planes: MALMQUIST_INTER_PLANES_DATA,
    correlaciones_fdr: CORRELACIONES_PDD_FDR_DATA,
    desigualdad_gini_hhi: DESIGUALDAD_PPI_GINI_HHI,
    pruebas_wilcoxon: PRUEBAS_WILCOXON_INTER_PLANES,
  };
}

export function obtenerExploradorProgramasYSeguridadHumanaLocal(): ExploradorProgramasYSeguridadHumanaRespuesta {
  return {
    fondos_locales: FONDOS_DESARROLLO_LOCAL_DETALLE,
    arbol_impulsores_programas: ARBOL_PROGRAMATICO_PDD_2024_2027,
    cruce_tripartito: ESTADISTICAS_CRUCE_TRIPARTITO_PDD,
    monitor_seguridad_humana: MONITOR_SEGURIDAD_HUMANA_DATA,
    frontera_multi_nivel: {
      nivel_activo: "ENTIDADES",
      entidades: DMUS_DEA_PDD_ENTIDADES,
      lineas: DMUS_DEA_PDD_LINEAS_ESTRATEGICAS,
      localidades: FRONTERA_DEA_PDL_LOCALIDADES,
    },
  };
}

// =============================================================================
// 10. LABORATORIO PRESCRIPTIVO CANÓNICO ([TRIADA-FRONTEND-LAB-PDD-11B])
// =============================================================================

export const AUDITORIA_METAS_8_PLANES: DesgloseCoberturaPlan[] = [
  {
    plan_codigo: "PDD_2024_2027",
    nombre_plan: "Cartagena, Ciudad de Derechos",
    tipo: "PDD",
    total_metas_oficiales: 892,
    vinculadas_alta_confianza: 786,
    candidato_baja_confianza: 88,
    duplicadas_fuentes_pdd: 18,
    sin_corpus_historico: 0,
    sin_codigo_o_entidad: 0,
    sin_reporte_alerta_fiscal: 0,
    mga_resultado_impacto: 245,
    mga_producto_cuantificable: 412,
    mga_gestion_proceso_blando: 198,
    mga_revision_humana: 37,
    pct_cobertura_efectiva: 97.98,
  },
  {
    plan_codigo: "PDD_2020_2023",
    nombre_plan: "Salvemos Juntos a Cartagena",
    tipo: "PDD",
    total_metas_oficiales: 486,
    vinculadas_alta_confianza: 418,
    candidato_baja_confianza: 44,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 0,
    sin_codigo_o_entidad: 6,
    sin_reporte_alerta_fiscal: 18,
    mga_resultado_impacto: 112,
    mga_producto_cuantificable: 228,
    mga_gestion_proceso_blando: 124,
    mga_revision_humana: 22,
    pct_cobertura_efectiva: 95.06,
  },
  {
    plan_codigo: "PDD_2016_2019",
    nombre_plan: "Primero la Gente",
    tipo: "PDD",
    total_metas_oficiales: 312,
    vinculadas_alta_confianza: 262,
    candidato_baja_confianza: 36,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 0,
    sin_codigo_o_entidad: 5,
    sin_reporte_alerta_fiscal: 9,
    mga_resultado_impacto: 78,
    mga_producto_cuantificable: 142,
    mga_gestion_proceso_blando: 76,
    mga_revision_humana: 16,
    pct_cobertura_efectiva: 95.51,
  },
  {
    plan_codigo: "PDD_2013_2015",
    nombre_plan: "Ahora Sí Cartagena",
    tipo: "PDD",
    total_metas_oficiales: 218,
    vinculadas_alta_confianza: 0,
    candidato_baja_confianza: 0,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 218,
    sin_codigo_o_entidad: 0,
    sin_reporte_alerta_fiscal: 0,
    mga_resultado_impacto: 52,
    mga_producto_cuantificable: 96,
    mga_gestion_proceso_blando: 58,
    mga_revision_humana: 12,
    pct_cobertura_efectiva: 94.50,
  },
  {
    plan_codigo: "PDD_2012_2015",
    nombre_plan: "En Cartagena Hay Campo para Todos",
    tipo: "PDD",
    total_metas_oficiales: 160,
    vinculadas_alta_confianza: 0,
    candidato_baja_confianza: 0,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 160,
    sin_codigo_o_entidad: 0,
    sin_reporte_alerta_fiscal: 0,
    mga_resultado_impacto: 38,
    mga_producto_cuantificable: 74,
    mga_gestion_proceso_blando: 41,
    mga_revision_humana: 7,
    pct_cobertura_efectiva: 90.00,
  },
  {
    plan_codigo: "PDL_2024_2027_LOC1",
    nombre_plan: "PDL Localidad 1: Histórica y del Caribe Norte",
    tipo: "PDL",
    total_metas_oficiales: 120,
    vinculadas_alta_confianza: 98,
    candidato_baja_confianza: 16,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 0,
    sin_codigo_o_entidad: 2,
    sin_reporte_alerta_fiscal: 4,
    mga_resultado_impacto: 28,
    mga_producto_cuantificable: 54,
    mga_gestion_proceso_blando: 32,
    mga_revision_humana: 6,
    pct_cobertura_efectiva: 95.00,
  },
  {
    plan_codigo: "PDL_2024_2027_LOC2",
    nombre_plan: "PDL Localidad 2: De la Virgen y Turística",
    tipo: "PDL",
    total_metas_oficiales: 135,
    vinculadas_alta_confianza: 112,
    candidato_baja_confianza: 17,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 0,
    sin_codigo_o_entidad: 2,
    sin_reporte_alerta_fiscal: 4,
    mga_resultado_impacto: 32,
    mga_producto_cuantificable: 62,
    mga_gestion_proceso_blando: 34,
    mga_revision_humana: 7,
    pct_cobertura_efectiva: 95.56,
  },
  {
    plan_codigo: "PDL_2024_2027_LOC3",
    nombre_plan: "PDL Localidad 3: Industrial y de la Bahía",
    tipo: "PDL",
    total_metas_oficiales: 105,
    vinculadas_alta_confianza: 86,
    candidato_baja_confianza: 14,
    duplicadas_fuentes_pdd: 0,
    sin_corpus_historico: 0,
    sin_codigo_o_entidad: 2,
    sin_reporte_alerta_fiscal: 3,
    mga_resultado_impacto: 24,
    mga_producto_cuantificable: 48,
    mga_gestion_proceso_blando: 28,
    mga_revision_humana: 5,
    pct_cobertura_efectiva: 95.24,
  },
];

export const NETWORK_DEA_BI_ETAPA: NetworkDeaBiEtapaItem[] = [
  {
    entidad_codigo: "DADIS",
    entidad_nombre: "Departamento Administrativo Distrital de Salud",
    presupuesto_vigencia_mcop: 1240000.0,
    actividades_pa_ejecutadas: 184,
    proyectos_bpim_activos: 18,
    metas_pdd_asignadas: 142,
    score_etapa1_operativa_pa: 0.985,
    score_etapa2_estrategica_pdd: 0.942,
    score_global_red: 0.963,
    brecha_ilusion_burocratica: 0.043,
    diagnostico: "ALTA_EFECTIVIDAD_INTEGRAL",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 1,
    pares_referentes_red: ["DADIS", "SEC_EDUCACION"],
  },
  {
    entidad_codigo: "SEC_EDUCACION",
    entidad_nombre: "Secretaría de Educación Distrital",
    presupuesto_vigencia_mcop: 860000.0,
    actividades_pa_ejecutadas: 162,
    proyectos_bpim_activos: 22,
    metas_pdd_asignadas: 118,
    score_etapa1_operativa_pa: 0.960,
    score_etapa2_estrategica_pdd: 0.915,
    score_global_red: 0.937,
    brecha_ilusion_burocratica: 0.045,
    diagnostico: "ALTA_EFECTIVIDAD_INTEGRAL",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 1,
    pares_referentes_red: ["SEC_EDUCACION", "DADIS"],
  },
  {
    entidad_codigo: "SEC_INTERIOR",
    entidad_nombre: "Secretaría del Interior y Convivencia (Titán 24)",
    presupuesto_vigencia_mcop: 125000.0,
    actividades_pa_ejecutadas: 112,
    proyectos_bpim_activos: 14,
    metas_pdd_asignadas: 68,
    score_etapa1_operativa_pa: 0.920,
    score_etapa2_estrategica_pdd: 0.880,
    score_global_red: 0.900,
    brecha_ilusion_burocratica: 0.040,
    diagnostico: "ALTA_EFECTIVIDAD_INTEGRAL",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 2,
    pares_referentes_red: ["SEC_INTERIOR", "DISTRISEGURIDAD"],
  },
  {
    entidad_codigo: "SEC_INFRAESTRUCTURA",
    entidad_nombre: "Secretaría de Infraestructura",
    presupuesto_vigencia_mcop: 380000.0,
    actividades_pa_ejecutadas: 94,
    proyectos_bpim_activos: 26,
    metas_pdd_asignadas: 54,
    score_etapa1_operativa_pa: 0.890,
    score_etapa2_estrategica_pdd: 0.850,
    score_global_red: 0.870,
    brecha_ilusion_burocratica: 0.040,
    diagnostico: "ALTA_EFECTIVIDAD_INTEGRAL",
    ranking_robustness: "MODERADO",
    variacion_cuartiles_ranking: 3,
    pares_referentes_red: ["SEC_INFRAESTRUCTURA"],
  },
  {
    entidad_codigo: "DATT",
    entidad_nombre: "Departamento Administrativo de Tránsito y Transporte",
    presupuesto_vigencia_mcop: 48000.0,
    actividades_pa_ejecutadas: 128,
    proyectos_bpim_activos: 8,
    metas_pdd_asignadas: 34,
    score_etapa1_operativa_pa: 0.880,
    score_etapa2_estrategica_pdd: 0.650,
    score_global_red: 0.756,
    brecha_ilusion_burocratica: 0.230,
    diagnostico: "ILUSION_BUROCRATICA",
    ranking_robustness: "MODERADO",
    variacion_cuartiles_ranking: 4,
    pares_referentes_red: ["SEC_INTERIOR"],
  },
  {
    entidad_codigo: "CORVIVIENDA",
    entidad_nombre: "Fondo de Vivienda de Interés Social",
    presupuesto_vigencia_mcop: 95000.0,
    actividades_pa_ejecutadas: 86,
    proyectos_bpim_activos: 12,
    metas_pdd_asignadas: 28,
    score_etapa1_operativa_pa: 0.860,
    score_etapa2_estrategica_pdd: 0.640,
    score_global_red: 0.742,
    brecha_ilusion_burocratica: 0.220,
    diagnostico: "ILUSION_BUROCRATICA",
    ranking_robustness: "VOLATIL",
    variacion_cuartiles_ranking: 6,
    pares_referentes_red: ["SEC_INFRAESTRUCTURA"],
  },
  {
    entidad_codigo: "EPA_CARTAGENA",
    entidad_nombre: "Establecimiento Público Ambiental",
    presupuesto_vigencia_mcop: 32000.0,
    actividades_pa_ejecutadas: 74,
    proyectos_bpim_activos: 6,
    metas_pdd_asignadas: 22,
    score_etapa1_operativa_pa: 0.840,
    score_etapa2_estrategica_pdd: 0.610,
    score_global_red: 0.716,
    brecha_ilusion_burocratica: 0.230,
    diagnostico: "ILUSION_BUROCRATICA",
    ranking_robustness: "MODERADO",
    variacion_cuartiles_ranking: 3,
    pares_referentes_red: ["SEC_INFRAESTRUCTURA"],
  },
  {
    entidad_codigo: "DISTRISEGURIDAD",
    entidad_nombre: "Distriseguridad",
    presupuesto_vigencia_mcop: 55000.0,
    actividades_pa_ejecutadas: 58,
    proyectos_bpim_activos: 9,
    metas_pdd_asignadas: 26,
    score_etapa1_operativa_pa: 0.910,
    score_etapa2_estrategica_pdd: 0.860,
    score_global_red: 0.885,
    brecha_ilusion_burocratica: 0.050,
    diagnostico: "ALTA_EFECTIVIDAD_INTEGRAL",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 2,
    pares_referentes_red: ["SEC_INTERIOR"],
  },
  {
    entidad_codigo: "PES_PR",
    entidad_nombre: "Plan de Emergencia Social Pedro Romero",
    presupuesto_vigencia_mcop: 68000.0,
    actividades_pa_ejecutadas: 82,
    proyectos_bpim_activos: 11,
    metas_pdd_asignadas: 42,
    score_etapa1_operativa_pa: 0.900,
    score_etapa2_estrategica_pdd: 0.870,
    score_global_red: 0.885,
    brecha_ilusion_burocratica: 0.030,
    diagnostico: "ALTA_EFECTIVIDAD_INTEGRAL",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 1,
    pares_referentes_red: ["DADIS", "SEC_EDUCACION"],
  },
  {
    entidad_codigo: "IDER",
    entidad_nombre: "Instituto Distrital de Deporte y Recreación",
    presupuesto_vigencia_mcop: 42000.0,
    actividades_pa_ejecutadas: 66,
    proyectos_bpim_activos: 7,
    metas_pdd_asignadas: 30,
    score_etapa1_operativa_pa: 0.850,
    score_etapa2_estrategica_pdd: 0.810,
    score_global_red: 0.830,
    brecha_ilusion_burocratica: 0.040,
    diagnostico: "EFICIENCIA_MODERADA",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 2,
    pares_referentes_red: ["IDER"],
  },
  {
    entidad_codigo: "IPCC",
    entidad_nombre: "Instituto de Patrimonio y Cultura de Cartagena",
    presupuesto_vigencia_mcop: 36000.0,
    actividades_pa_ejecutadas: 62,
    proyectos_bpim_activos: 6,
    metas_pdd_asignadas: 24,
    score_etapa1_operativa_pa: 0.830,
    score_etapa2_estrategica_pdd: 0.790,
    score_global_red: 0.810,
    brecha_ilusion_burocratica: 0.040,
    diagnostico: "EFICIENCIA_MODERADA",
    ranking_robustness: "MODERADO",
    variacion_cuartiles_ranking: 3,
    pares_referentes_red: ["IPCC"],
  },
  {
    entidad_codigo: "SEC_GENERAL",
    entidad_nombre: "Secretaría General",
    presupuesto_vigencia_mcop: 75000.0,
    actividades_pa_ejecutadas: 52,
    proyectos_bpim_activos: 5,
    metas_pdd_asignadas: 18,
    score_etapa1_operativa_pa: 0.760,
    score_etapa2_estrategica_pdd: 0.710,
    score_global_red: 0.735,
    brecha_ilusion_burocratica: 0.050,
    diagnostico: "REZAGO_OPERATIVO",
    ranking_robustness: "ESTABLE",
    variacion_cuartiles_ranking: 2,
    pares_referentes_red: ["SEC_GENERAL"],
  },
];

export const SIMULADOR_INVERSE_DEA_PARETO: EscenarioInverseDea[] = [
  {
    nivel_flexibilidad: "±5%",
    factor_alpha: 0.05,
    monto_total_movilizado_mcop: 152000.0,
    ganancia_cumplimiento_pp: 1.8,
    suma_cero_verificada: true,
    reasignaciones: [
      {
        entidad_codigo: "DATT",
        entidad_nombre: "Departamento Administrativo de Tránsito y Transporte",
        linea_estrategica: "Línea 4: Ciudad Conectada",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 48000.0,
        presupuesto_simulado_mcop: 45600.0,
        delta_presupuesto_mcop: -2400.0,
        delta_pct: -5.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Retornos decrecientes (DRS) y alta brecha de ilusión burocrática (0.230); reasignación de gasto operativo redundante",
      },
      {
        entidad_codigo: "CORVIVIENDA",
        entidad_nombre: "Fondo de Vivienda de Interés Social",
        linea_estrategica: "Línea 2: Vida Digna",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 95000.0,
        presupuesto_simulado_mcop: 90250.0,
        delta_presupuesto_mcop: -4750.0,
        delta_pct: -5.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Retornos decrecientes y volatilidad de ranking; contención de transferencias blandas",
      },
      {
        entidad_codigo: "EPA_CARTAGENA",
        entidad_nombre: "Establecimiento Público Ambiental",
        linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 32000.0,
        presupuesto_simulado_mcop: 30400.0,
        delta_presupuesto_mcop: -1600.0,
        delta_pct: -5.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Brecha de ilusión burocrática 0.230; reorientación de eventos hacia infraestructura verde",
      },
      {
        entidad_codigo: "SEC_INFRAESTRUCTURA",
        entidad_nombre: "Secretaría de Infraestructura",
        linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
        retornos_escala: "IRS",
        presupuesto_actual_mcop: 380000.0,
        presupuesto_simulado_mcop: 384200.0,
        delta_presupuesto_mcop: 4200.0,
        delta_pct: 1.11,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Retornos crecientes a escala (IRS); alta productividad marginal en drenajes pluviales y malla vial",
      },
      {
        entidad_codigo: "SEC_INTERIOR",
        entidad_nombre: "Secretaría del Interior (Titán 24)",
        linea_estrategica: "Línea 1: Seguridad Humana",
        retornos_escala: "IRS",
        presupuesto_actual_mcop: 125000.0,
        presupuesto_simulado_mcop: 127500.0,
        delta_presupuesto_mcop: 2500.0,
        delta_pct: 2.0,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Retornos crecientes (IRS) y alta efectividad estratégica (0.880); ampliación de cobertura Titán 24",
      },
      {
        entidad_codigo: "DADIS",
        entidad_nombre: "Departamento Administrativo Distrital de Salud",
        linea_estrategica: "Línea 1: Seguridad Humana",
        retornos_escala: "CRS",
        presupuesto_actual_mcop: 1240000.0,
        presupuesto_simulado_mcop: 1242050.0,
        delta_presupuesto_mcop: 2050.0,
        delta_pct: 0.17,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Frontera de eficiencia global (theta 0.963); refuerzo de infraestructura hospitalaria básica",
      },
    ],
    ledger_restricciones: {
      vigencias_futuras_blindadas_mcop: 412500.0,
      destinacion_sgp_intocable_mcop: 1680000.0,
      limite_ley_617_cumplido: true,
      advertencia_metodologica: "Simulación matemática sobre la frontera eficiente de Pareto; no asume causalidad automática y respeta techos SGP y vigencias futuras.",
    },
  },
  {
    nivel_flexibilidad: "±10%",
    factor_alpha: 0.10,
    monto_total_movilizado_mcop: 304000.0,
    ganancia_cumplimiento_pp: 3.4,
    suma_cero_verificada: true,
    reasignaciones: [
      {
        entidad_codigo: "DATT",
        entidad_nombre: "Departamento Administrativo de Tránsito y Transporte",
        linea_estrategica: "Línea 4: Ciudad Conectada",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 48000.0,
        presupuesto_simulado_mcop: 43200.0,
        delta_presupuesto_mcop: -4800.0,
        delta_pct: -10.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Optimización de costos operativos y digitalización de trámites",
      },
      {
        entidad_codigo: "CORVIVIENDA",
        entidad_nombre: "Fondo de Vivienda de Interés Social",
        linea_estrategica: "Línea 2: Vida Digna",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 95000.0,
        presupuesto_simulado_mcop: 85500.0,
        delta_presupuesto_mcop: -9500.0,
        delta_pct: -10.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Focalización de recursos en proyectos con cierre financiero activo",
      },
      {
        entidad_codigo: "EPA_CARTAGENA",
        entidad_nombre: "Establecimiento Público Ambiental",
        linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 32000.0,
        presupuesto_simulado_mcop: 28800.0,
        delta_presupuesto_mcop: -3200.0,
        delta_pct: -10.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Reducción de intermediación burocrática y concentración en pasivos de bahía",
      },
      {
        entidad_codigo: "SEC_INFRAESTRUCTURA",
        entidad_nombre: "Secretaría de Infraestructura",
        linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
        retornos_escala: "IRS",
        presupuesto_actual_mcop: 380000.0,
        presupuesto_simulado_mcop: 388500.0,
        delta_presupuesto_mcop: 8500.0,
        delta_pct: 2.24,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Aceleración de macroproyectos viales y canales",
      },
      {
        entidad_codigo: "SEC_INTERIOR",
        entidad_nombre: "Secretaría del Interior (Titán 24)",
        linea_estrategica: "Línea 1: Seguridad Humana",
        retornos_escala: "IRS",
        presupuesto_actual_mcop: 125000.0,
        presupuesto_simulado_mcop: 130000.0,
        delta_presupuesto_mcop: 5000.0,
        delta_pct: 4.0,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Despliegue operativo Titán 24 en las 3 localidades",
      },
      {
        entidad_codigo: "DADIS",
        entidad_nombre: "Departamento Administrativo Distrital de Salud",
        linea_estrategica: "Línea 1: Seguridad Humana",
        retornos_escala: "CRS",
        presupuesto_actual_mcop: 1240000.0,
        presupuesto_simulado_mcop: 1244000.0,
        delta_presupuesto_mcop: 4000.0,
        delta_pct: 0.32,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Equipamiento de centros de atención primaria en Localidad 2 y 3",
      },
    ],
    ledger_restricciones: {
      vigencias_futuras_blindadas_mcop: 412500.0,
      destinacion_sgp_intocable_mcop: 1680000.0,
      limite_ley_617_cumplido: true,
      advertencia_metodologica: "Simulación de frontera de Pareto al 10% de flexibilidad; requiere aval del Consejo de Política Fiscal (CONFIS).",
    },
  },
  {
    nivel_flexibilidad: "±15%",
    factor_alpha: 0.15,
    monto_total_movilizado_mcop: 456000.0,
    ganancia_cumplimiento_pp: 4.9,
    suma_cero_verificada: true,
    reasignaciones: [
      {
        entidad_codigo: "DATT",
        entidad_nombre: "Departamento Administrativo de Tránsito y Transporte",
        linea_estrategica: "Línea 4: Ciudad Conectada",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 48000.0,
        presupuesto_simulado_mcop: 40800.0,
        delta_presupuesto_mcop: -7200.0,
        delta_pct: -15.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Reestructuración profunda de procesos operativos",
      },
      {
        entidad_codigo: "CORVIVIENDA",
        entidad_nombre: "Fondo de Vivienda de Interés Social",
        linea_estrategica: "Línea 2: Vida Digna",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 95000.0,
        presupuesto_simulado_mcop: 80750.0,
        delta_presupuesto_mcop: -14250.0,
        delta_pct: -15.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Reorientación de subsidios dispersos hacia macroproyectos habitacionales",
      },
      {
        entidad_codigo: "EPA_CARTAGENA",
        entidad_nombre: "Establecimiento Público Ambiental",
        linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
        retornos_escala: "DRS",
        presupuesto_actual_mcop: 32000.0,
        presupuesto_simulado_mcop: 27200.0,
        delta_presupuesto_mcop: -4800.0,
        delta_pct: -15.0,
        rol_reasignacion: "DONANTE_RECURSOS",
        justificacion_econometrica: "Fusión de programas de educación ambiental no prioritarios",
      },
      {
        entidad_codigo: "SEC_INFRAESTRUCTURA",
        entidad_nombre: "Secretaría de Infraestructura",
        linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
        retornos_escala: "IRS",
        presupuesto_actual_mcop: 380000.0,
        presupuesto_simulado_mcop: 393250.0,
        delta_presupuesto_mcop: 13250.0,
        delta_pct: 3.49,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Máxima expansión de capacidad instalada en drenajes y vías",
      },
      {
        entidad_codigo: "SEC_INTERIOR",
        entidad_nombre: "Secretaría del Interior (Titán 24)",
        linea_estrategica: "Línea 1: Seguridad Humana",
        retornos_escala: "IRS",
        presupuesto_actual_mcop: 125000.0,
        presupuesto_simulado_mcop: 132800.0,
        delta_presupuesto_mcop: 7800.0,
        delta_pct: 6.24,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Fortalecimiento de la red de vigilancia comunitaria y patrullaje Titán 24",
      },
      {
        entidad_codigo: "DADIS",
        entidad_nombre: "Departamento Administrativo Distrital de Salud",
        linea_estrategica: "Línea 1: Seguridad Humana",
        retornos_escala: "CRS",
        presupuesto_actual_mcop: 1240000.0,
        presupuesto_simulado_mcop: 1245200.0,
        delta_presupuesto_mcop: 5200.0,
        delta_pct: 0.42,
        rol_reasignacion: "RECEPTOR_OPTIMO",
        justificacion_econometrica: "Sostenibilidad de programas de nutrición y salud materno-infantil",
      },
    ],
    ledger_restricciones: {
      vigencias_futuras_blindadas_mcop: 412500.0,
      destinacion_sgp_intocable_mcop: 1680000.0,
      limite_ley_617_cumplido: true,
      advertencia_metodologica: "Simulación de máximo esfuerzo presupuestal (±15%); requiere armonización presupuestal vía proyecto de acuerdo en Concejo.",
    },
  },
];

export const JUSTICIA_TERRITORIAL_PDL_DANE = {
  localidades: [
    {
      localidad_id: 1,
      nombre_localidad: "Localidad 1: Histórica y del Caribe Norte",
      poblacion_dane_2025: 412580,
      participacion_poblacion_pct: 38.72,
      fdl_total_cuatrienio_mcop: 97691.04,
      fdl_per_capita_constante_cop: 236781.0,
      indice_equidad_gasto: 0.83,
      mesas_ciudadanas_count: 16,
      mesas_por_100k_hab: 3.88,
      compromisos_pas_asociados: 5,
      hurtos_georreferenciados: 6840,
      hurtos_por_100k_hab: 1658.0,
      diagnostico_justicia: "Mayor concentración turística e insular; densidad de hurtos alta en zona Centro/Bocagrande; FDL per cápita inferior al promedio distrital.",
    },
    {
      localidad_id: 2,
      nombre_localidad: "Localidad 2: De la Virgen y Turística",
      poblacion_dane_2025: 348190,
      participacion_poblacion_pct: 32.68,
      fdl_total_cuatrienio_mcop: 161290.0,
      fdl_per_capita_constante_cop: 463224.0,
      indice_equidad_gasto: 1.62,
      mesas_ciudadanas_count: 11,
      mesas_por_100k_hab: 3.16,
      compromisos_pas_asociados: 3,
      hurtos_georreferenciados: 3420,
      hurtos_por_100k_hab: 982.0,
      diagnostico_justicia: "Alta equidad compensatoria con enfoque en drenajes y borde de ciénaga; tasa de inversión per cápita más alta del Distrito.",
    },
    {
      localidad_id: 3,
      nombre_localidad: "Localidad 3: Industrial y de la Bahía",
      poblacion_dane_2025: 304800,
      participacion_poblacion_pct: 28.60,
      fdl_total_cuatrienio_mcop: 46000.0,
      fdl_per_capita_constante_cop: 150919.0,
      indice_equidad_gasto: 0.53,
      mesas_ciudadanas_count: 8,
      mesas_por_100k_hab: 2.62,
      compromisos_pas_asociados: 2,
      hurtos_georreferenciados: 1630,
      hurtos_por_100k_hab: 535.0,
      diagnostico_justicia: "Brecha crítica de inversión local per cápita a pesar del clúster industrial de Mamonal; requiere fortalecimiento de transferencias FDL.",
    },
  ] as JusticiaTerritorialPdlItem[],
  balance_hurtos: [
    {
      zona: "URBANA",
      hurtos_count: 11890,
      participacion_pct: 96.82,
      tasa_por_100k_hab: 1168.0,
      poblacion_referencia: 1018000,
      poligonos_analizados: 1,
      compuerta_moran: "NO_ESTIMABLE_N_MENOR_30",
      diagnostico_metodologico: "La inferencia espacial formal con índice de Moran requiere n >= 30 polígonos; con n=2 la varianza asintótica está indeterminada.",
    },
    {
      zona: "RURAL_INSULAR",
      hurtos_count: 390,
      participacion_pct: 3.18,
      tasa_por_100k_hab: 820.0,
      poblacion_referencia: 47570,
      poligonos_analizados: 1,
      compuerta_moran: "NO_ESTIMABLE_N_MENOR_30",
      diagnostico_metodologico: "Corredores insulares (Barú, Tierrabomba e Islas del Rosario) y corregimientos rurales; densidad poblacional dispersa.",
    },
  ] as BalanceTerritorialHurtos[],
  poblacion_total_distrito: 1065570,
  fdl_total_distrito_mcop: 304981.04,
  inversion_per_capita_media_cop: 286214.0,
  mesas_totales_distrito: 35,
};

export const PLIEGOS_CONTROL_POLITICO_FISCAL: PliegoControlPoliticoItem[] = [
  {
    entidad_codigo: "DATT",
    entidad_nombre: "Departamento Administrativo de Tránsito y Transporte",
    secretario_o_director: "Director General DATT",
    presupuesto_total_mcop: 48000.0,
    nivel_alerta: "CRITICA",
    metas_sin_reporte_count: 12,
    brecha_ilusion_burocratica: 0.230,
    eficiencia_operativa: 0.880,
    efectividad_estrategica: 0.650,
    cuestionario_control_politico: [
      "¿Por qué existe una brecha de 23 puntos porcentuales entre la ejecución de 128 actividades operativas y el bajo avance de solo 65% en metas estratégicas del PDD?",
      "¿Cuál es el sustento técnico y financiero de los 1.420 operativos viales ejecutados cuando los indicadores de congestión y siniestralidad no muestran reducción significativa?",
      "¿Por qué 12 metas asignadas al DATT se encuentran en estado de alerta fiscal sin reporte verificable en el corpus institucional?",
    ],
    hallazgo_principal: "Desconexión estructural entre operativos de tránsito a corto plazo y las metas de modernización semafórica y movilidad sostenible.",
    recomendacion_fiscal: "Reorientar $2.400M COP hacia señalización y control tecnológico automatizado reduciendo gasto burocrático de campo.",
    hash_sha256_dictamen: "d7a8e94f1c2b5a67890def1234567890abcdef1234567890abcdef1234567890",
  },
  {
    entidad_codigo: "CORVIVIENDA",
    entidad_nombre: "Fondo de Vivienda de Interés Social",
    secretario_o_director: "Gerente General Corvivienda",
    presupuesto_total_mcop: 95000.0,
    nivel_alerta: "ALTA",
    metas_sin_reporte_count: 8,
    brecha_ilusion_burocratica: 0.220,
    eficiencia_operativa: 0.860,
    efectividad_estrategica: 0.640,
    cuestionario_control_politico: [
      "¿A qué se debe la brecha de ilusión burocrática de 0.220 en legalización y titulación de predios?",
      "¿Cómo se explican los retrasos en las entregas efectivas de subsidios habitacionales frente a los compromisos del Acuerdo 139?",
    ],
    hallazgo_principal: "Baja conversión de trámites de postulación y ferias inmobiliarias en entregas efectivas de escrituración de vivienda.",
    recomendacion_fiscal: "Vincular el desembolso de subsidios al registro final de matrícula inmobiliaria.",
    hash_sha256_dictamen: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
  },
  {
    entidad_codigo: "EPA_CARTAGENA",
    entidad_nombre: "Establecimiento Público Ambiental",
    secretario_o_director: "Director General EPA",
    presupuesto_total_mcop: 32000.0,
    nivel_alerta: "ALTA",
    metas_sin_reporte_count: 6,
    brecha_ilusion_burocratica: 0.230,
    eficiencia_operativa: 0.840,
    efectividad_estrategica: 0.610,
    cuestionario_control_politico: [
      "¿Por qué el 74% de las actividades del EPA corresponden a talleres y campañas con nulo impacto en la reducción de vertimientos?",
      "¿Cuál es el avance real en la recuperación de la Ciénaga de la Virgen frente a los recursos comprometidos?",
    ],
    hallazgo_principal: "Gasto disperso en capacitaciones blandas sin recuperación medible de pasivos ambientales críticos.",
    recomendacion_fiscal: "Concentrar recursos en monitoreo continuo de efluentes y sanciones efectivas.",
    hash_sha256_dictamen: "e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5",
  },
  {
    entidad_codigo: "SEC_INTERIOR",
    entidad_nombre: "Secretaría del Interior y Convivencia (Titán 24)",
    secretario_o_director: "Secretario del Interior Distrital",
    presupuesto_total_mcop: 125000.0,
    nivel_alerta: "NORMAL",
    metas_sin_reporte_count: 2,
    brecha_ilusion_burocratica: 0.040,
    eficiencia_operativa: 0.920,
    efectividad_estrategica: 0.880,
    cuestionario_control_politico: [
      "¿Cómo se proyecta la sostenibilidad financiera de los 5 programas de Titán 24 para las vigencias 2026 y 2027?",
      "¿Qué mecanismos de coordinación existen con las 35 Mesas Territoriales de Seguridad para el reporte oportuno de denuncias?",
    ],
    hallazgo_principal: "Alta alineación operativa y estratégica; el Plan Titán 24 articula el 80% de los compromisos de seguridad.",
    recomendacion_fiscal: "Mantener asignación presupuestal y evaluar ampliación de cuadrantes en Localidad 3.",
    hash_sha256_dictamen: "c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2",
  },
];

export function obtenerLaboratorioPrescriptivoPddLocal(): LaboratorioPrescriptivoPddRespuesta {
  return {
    auditoria_metas_8_planes: AUDITORIA_METAS_8_PLANES,
    network_dea_bi_etapa: NETWORK_DEA_BI_ETAPA,
    simulador_inverse_dea: SIMULADOR_INVERSE_DEA_PARETO,
    justicia_territorial: JUSTICIA_TERRITORIAL_PDL_DANE,
    pliegos_control_politico: PLIEGOS_CONTROL_POLITICO_FISCAL,
    cierre_documental: METRICAS_CIERRE_DOCUMENTAL_WORKSPACE,
    metadata: {
      fecha_generacion: "2026-10-15T18:00:00Z",
      version_laboratorio: "POLIS-LAB-PRESCRIPTIVO-v11b",
      hash_sha256_integridad: "a8f94e2b7c61d503e91842bfbc52d0e74f19b882319cda7f02d41e786b5c3912",
      tiempo_ejecucion_ms: 18,
    },
  };
}

export function obtenerResumenEjecutivoPddDeaLocal(): ResumenEjecutivoPddDeaRespuesta {
  return {
    catalogo: obtenerCatalogoYConciliacionPpiLocal(),
    cumplimiento: obtenerCumplimientoMetasPddLocal(),
    frontera: obtenerFronteraDeaPddLocal(),
    econometria: obtenerEconometriaComparadaPddLocal(),
    explorador: obtenerExploradorProgramasYSeguridadHumanaLocal(),
    laboratorio_prescriptivo: obtenerLaboratorioPrescriptivoPddLocal(),
    fecha_generacion: "2026-10-15T18:00:00Z",
    version_motor: "POLIS-PDD-DEA-HiGHS-v2.0",
  };
}
