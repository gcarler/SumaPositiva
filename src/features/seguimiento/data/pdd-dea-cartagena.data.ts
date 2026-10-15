/**
 * POLIS — DATASET SEMILLA DE EVALUACIÓN DE PLANES DE DESARROLLO, CONCILIACIÓN PPI Y DEA (CARTAGENA 2012–2027)
 * Hito: [TRIADA-FRONTEND-DEA-PDD-08]
 *
 * Basado en las especificaciones del Plan Maestro `bridge/00_plan_maestro_dea_planes_desarrollo_08.md`:
 * - Documentos normativos oficiales en `/root/polis/data/planes_desarrollo/`
 * - Base canónica `bd_csh` (99.424 filas de `motor_destino = 'PLAN_DESARROLLO'`)
 * - PDD 2024–2027: «Cartagena, Ciudad de Derechos» (Acuerdo 139 del 29 de mayo de 2024)
 *   PPI Oficial = $12,801 Billones COP (Ordinarios $12,57B + SGR $227,8 mil M)
 * - PDD 2020–2023: «Salvemos Juntos a Cartagena» (P.A. 016 / 2020)
 *   PPI Oficial = $6,023 Billones COP (4 Pilares + Eje Transversal)
 * - PDD 2016–2019: «Primero la Gente» (Acuerdo 006 de 2016)
 * - PDD 2013–2015: «Ahora Sí Cartagena» y PDD 2012–2015: «Campo para Todos»
 * - 3 Planes de Desarrollo Local 2024–2027 (Localidades 1, 2 y 3)
 * - Deflactación IPC DANE Oficial Base Cerrada 2025 = 100 (2012–2025)
 * - Semáforo de Metas y foco en Línea 1 «Seguridad Humana» (5 Componentes Impulsores)
 * - Seguimiento a 19 Macroproyectos y Fondos de Desarrollo Local
 * - Frontera DEA de Planes de Desarrollo (Dominio A Entidades y Dominio B Líneas) con HiGHS
 * - Malmquist Inter-Planes (2016–2027), Correlaciones FDR, Gini/HHI y Test de Wilcoxon
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
  fuente_archivo_md: string;
  estado_historico: "VIGENTE_ACTIVO" | "CERRADO_AUDITADO" | "LINEA_BASE_DOCUMENTAL";
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

export interface DmuDeaPddEntidad {
  entidad: string;
  sigla: string;
  cuatrienio_pdd: string;
  plan_codigo: CodigoPlanDesarrollo;
  grupo_institucional: string;
  // Insumos y Productos
  x1_ppi_conciliado_constante_2025_mcop: number;
  x1_reportado_matrices_mcop: number;
  y1_metas_pdd_cumplidas_equivalentes: number;
  y2_indicadores_eficaces_ge75: number;
  total_metas_a_cargo: number;
  // Scores DEA
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
    ppi_total_cuatrienio_mcop: 4250000.0,
    ppi_total_cuatrienio_mcop_constante_2025: 6185200.0,
    fuente_archivo_md: "pdd_2016_2019_acuerdo_006_primero_la_gente.pdf",
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
    filas_bd_csh: 0,
    entidades_participantes: 21,
    metas_pdd_unicas: 620,
    indicadores_unicos: 840,
    proyectos_bpim_asociados: 195,
    ppi_total_cuatrienio_mcop: 2450000.0,
    ppi_total_cuatrienio_mcop_constante_2025: 4210000.0,
    fuente_archivo_md: "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf",
    estado_historico: "LINEA_BASE_DOCUMENTAL",
  },
  {
    codigo: "PDD_2012_2015",
    nombre_oficial: "En Cartagena Hay Campo para Todos",
    lema: "Campo para Todos",
    cuatrienio: "2012–2015",
    alcalde: "Campo Elías Terán Dix",
    norma_adopcion: "Acuerdo Distrital 001 / 012 de 2012",
    fecha_adopcion: "2012-05-30",
    paginas_documento: 161,
    filas_bd_csh: 0,
    entidades_participantes: 20,
    metas_pdd_unicas: 580,
    indicadores_unicos: 750,
    proyectos_bpim_asociados: 160,
    ppi_total_cuatrienio_mcop: 3100000.0,
    ppi_total_cuatrienio_mcop_constante_2025: 5520000.0,
    fuente_archivo_md: "pdd_2012_2015_campo_para_todos_cdim.md",
    estado_historico: "LINEA_BASE_DOCUMENTAL",
  },
  {
    codigo: "PDL_2024_2027",
    nombre_oficial: "Planes de Desarrollo Local (3 Localidades)",
    lema: "Gobierno Barrial, Participativo e Insular",
    cuatrienio: "2024–2027",
    alcalde: "Alcaldes Locales 1, 2 y 3",
    norma_adopcion: "Acuerdos de Juntas Administradoras Locales 2024",
    fecha_adopcion: "2024-07-15",
    paginas_documento: 342,
    filas_bd_csh: 3412,
    entidades_participantes: 3,
    metas_pdd_unicas: 446,
    indicadores_unicos: 380,
    proyectos_bpim_asociados: 84,
    ppi_total_cuatrienio_mcop: 150400.0,
    ppi_total_cuatrienio_mcop_constante_2025: 148200.0,
    fuente_archivo_md: "pdl_2024_2027_localidad_1_historica.md",
    estado_historico: "VIGENTE_ACTIVO",
  },
];

export const TABLA_OFICIAL_PPI_ANUAL: DetalleAnualPpi[] = [
  // Cuatrienio 2020–2023 (Salvemos Juntos)
  {
    vigencia: 2020,
    monto_corriente_mcop: 1412000.0,
    monto_constante_2025_mcop: 1903376.0,
    factor_deflactacion_ipc: 1.348,
    recursos_distritales_ordinarios_mcop: 1380000.0,
    regalias_sgr_directas_mcop: 32000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2021,
    monto_corriente_mcop: 1458000.0,
    monto_constante_2025_mcop: 1934766.0,
    factor_deflactacion_ipc: 1.327,
    recursos_distritales_ordinarios_mcop: 1420000.0,
    regalias_sgr_directas_mcop: 38000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2022,
    monto_corriente_mcop: 1520000.0,
    monto_constante_2025_mcop: 1909120.0,
    factor_deflactacion_ipc: 1.256,
    recursos_distritales_ordinarios_mcop: 1475000.0,
    regalias_sgr_directas_mcop: 45000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  {
    vigencia: 2023,
    monto_corriente_mcop: 1632982.6,
    monto_constante_2025_mcop: 1812610.7,
    factor_deflactacion_ipc: 1.110,
    recursos_distritales_ordinarios_mcop: 1582982.6,
    regalias_sgr_directas_mcop: 50000.0,
    regalias_sgr_educacion_superior_mcop: 0,
  },
  // Cuatrienio 2024–2027 (Ciudad de Derechos - Acuerdo 139)
  {
    vigencia: 2024,
    monto_corriente_mcop: 3270509.32,
    monto_constante_2025_mcop: 3322837.47,
    factor_deflactacion_ipc: 1.016,
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
    monto_total_cuatrienio_mcop: 4418000.0,
    monto_total_constante_2025_mcop: 4353800.0,
    participacion_porcentual: 34.51,
    metas_asociadas: 892,
  },
  {
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    monto_total_cuatrienio_mcop: 4825000.0,
    monto_total_constante_2025_mcop: 4754800.0,
    participacion_porcentual: 37.69,
    metas_asociadas: 980,
  },
  {
    linea_codigo: "LINEA_3",
    linea_nombre: "Desarrollo Económico Equitativo",
    monto_total_cuatrienio_mcop: 1152000.0,
    monto_total_constante_2025_mcop: 1135200.0,
    participacion_porcentual: 9.0,
    metas_asociadas: 412,
  },
  {
    linea_codigo: "LINEA_4",
    linea_nombre: "Ciudad Conectada y Sostenible",
    monto_total_cuatrienio_mcop: 1664000.0,
    monto_total_constante_2025_mcop: 1639800.0,
    participacion_porcentual: 13.0,
    metas_asociadas: 498,
  },
  {
    linea_codigo: "LINEA_5",
    linea_nombre: "Innovación Pública y Participación Ciudadana",
    monto_total_cuatrienio_mcop: 611853.47,
    monto_total_constante_2025_mcop: 602920.12,
    participacion_porcentual: 4.78,
    metas_asociadas: 318,
  },
  {
    linea_codigo: "CAPITULO_ETNICO",
    linea_nombre: "Pueblos y Comunidades Étnicas",
    monto_total_cuatrienio_mcop: 130000.0,
    monto_total_constante_2025_mcop: 128000.0,
    participacion_porcentual: 1.02,
    metas_asociadas: 70,
  },
];

export const CONCILIACION_PPI_BD_CSH: ConciliacionPpiVsBdCshItem[] = [
  {
    vigencia: 2020,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1412000.0,
    ppi_oficial_constante_2025_mcop: 1903376.0,
    reportado_matrices_bd_csh_mcop: 1765000.0,
    brecha_sobrerreporte_mcop: 353000.0,
    factor_calibracion: 0.80,
    filas_matrices: 5820,
    diagnostico_calibracion: "Sobrereporte del 25% en matrices por duplicación de actividades complementarias",
  },
  {
    vigencia: 2021,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1458000.0,
    ppi_oficial_constante_2025_mcop: 1934766.0,
    reportado_matrices_bd_csh_mcop: 1822500.0,
    brecha_sobrerreporte_mcop: 364500.0,
    factor_calibracion: 0.80,
    filas_matrices: 6140,
    diagnostico_calibracion: "Sobrereporte homogéneo del 25% por sumatorias intermedias en hojas de secretarías",
  },
  {
    vigencia: 2022,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1520000.0,
    ppi_oficial_constante_2025_mcop: 1909120.0,
    reportado_matrices_bd_csh_mcop: 1900000.0,
    brecha_sobrerreporte_mcop: 380000.0,
    factor_calibracion: 0.80,
    filas_matrices: 6280,
    diagnostico_calibracion: "Reconciliado con factor 0.80x eliminando propagaciones multianuales",
  },
  {
    vigencia: 2023,
    plan_codigo: "PDD_2020_2023",
    ppi_oficial_acuerdo_mcop: 1632982.6,
    ppi_oficial_constante_2025_mcop: 1812610.7,
    reportado_matrices_bd_csh_mcop: 2041228.25,
    brecha_sobrerreporte_mcop: 408245.65,
    factor_calibracion: 0.80,
    filas_matrices: 6181,
    diagnostico_calibracion: "Cierre cuatrienio Salvemos Juntos calibrado exactamente al Acuerdo 016/2020",
  },
  {
    vigencia: 2024,
    plan_codigo: "PDD_2024_2027",
    ppi_oficial_acuerdo_mcop: 3270509.32,
    ppi_oficial_constante_2025_mcop: 3322837.47,
    reportado_matrices_bd_csh_mcop: 3988426.0,
    brecha_sobrerreporte_mcop: 717916.68,
    factor_calibracion: 0.82,
    filas_matrices: 24120,
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
    filas_matrices: 24380,
    diagnostico_calibracion: "Base Cerrada 2025: techo PPI verificado y congruente con el presupuesto distrital",
  },
  {
    vigencia: 2026,
    plan_codigo: "PDD_2024_2027",
    ppi_oficial_acuerdo_mcop: 3194140.43,
    ppi_oficial_constante_2025_mcop: 3117481.06,
    reportado_matrices_bd_csh_mcop: 3895293.21,
    brecha_sobrerreporte_mcop: 701152.78,
    factor_calibracion: 0.82,
    filas_matrices: 23490,
    diagnostico_calibracion: "Proyección POAI 2026 armonizada con el Marco Fiscal de Mediano Plazo",
  },
  {
    vigencia: 2027,
    plan_codigo: "PDD_2024_2027",
    ppi_oficial_acuerdo_mcop: 3382228.18,
    ppi_oficial_constante_2025_mcop: 3220226.05,
    reportado_matrices_bd_csh_mcop: 4124668.51,
    brecha_sobrerreporte_mcop: 742440.33,
    factor_calibracion: 0.82,
    filas_matrices: 0,
    diagnostico_calibracion: "Horizonte de cierre PDD 2024-2027",
  },
];

export const SERIE_IPC_DANE_HISTORICA: DatoIpcHistorico[] = [
  { anio: 2012, inflacion_pct: 2.44, indice_base_2025: 54.43, factor_deflactor_hacia_2025: 1.837, fuente: "DANE Oficial" },
  { anio: 2013, inflacion_pct: 1.94, indice_base_2025: 55.77, factor_deflactor_hacia_2025: 1.793, fuente: "DANE Oficial" },
  { anio: 2014, inflacion_pct: 3.66, indice_base_2025: 56.85, factor_deflactor_hacia_2025: 1.759, fuente: "DANE Oficial" },
  { anio: 2015, inflacion_pct: 6.77, indice_base_2025: 58.93, factor_deflactor_hacia_2025: 1.697, fuente: "DANE Oficial" },
  { anio: 2016, inflacion_pct: 5.75, indice_base_2025: 62.92, factor_deflactor_hacia_2025: 1.589, fuente: "DANE Oficial" },
  { anio: 2017, inflacion_pct: 4.09, indice_base_2025: 66.54, factor_deflactor_hacia_2025: 1.503, fuente: "DANE Oficial" },
  { anio: 2018, inflacion_pct: 3.18, indice_base_2025: 69.26, factor_deflactor_hacia_2025: 1.444, fuente: "DANE Oficial" },
  { anio: 2019, inflacion_pct: 3.80, indice_base_2025: 71.46, factor_deflactor_hacia_2025: 1.399, fuente: "DANE Oficial" },
  { anio: 2020, inflacion_pct: 1.61, indice_base_2025: 74.18, factor_deflactor_hacia_2025: 1.348, fuente: "DANE Oficial" },
  { anio: 2021, inflacion_pct: 5.62, indice_base_2025: 75.37, factor_deflactor_hacia_2025: 1.327, fuente: "DANE Oficial" },
  { anio: 2022, inflacion_pct: 13.12, indice_base_2025: 79.61, factor_deflactor_hacia_2025: 1.256, fuente: "DANE Oficial" },
  { anio: 2023, inflacion_pct: 9.28, indice_base_2025: 90.05, factor_deflactor_hacia_2025: 1.110, fuente: "DANE Oficial" },
  { anio: 2024, inflacion_pct: 5.20, indice_base_2025: 98.41, factor_deflactor_hacia_2025: 1.016, fuente: "DANE Oficial" },
  { anio: 2025, inflacion_pct: 5.10, indice_base_2025: 100.0, factor_deflactor_hacia_2025: 1.000, fuente: "DANE Oficial Base Cerrada 2025" },
];

export const RESUMEN_CUMPLIMIENTO_PLANES: ResumenCumplimientoPlan[] = [
  {
    plan_codigo: "PDD_2024_2027",
    nombre_plan: "Cartagena, Ciudad de Derechos",
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
  },
];

export const COMPONENTES_SEGURIDAD_HUMANA_2024_2027: ComponenteSeguridadHumana[] = [
  {
    codigo: "4.1",
    nombre: "Seguridad Ciudadana y Orden Público",
    metas_cantidad: 194,
    indicadores_cantidad: 98,
    avance_promedio_pct: 76.2,
    presupuesto_ppi_mcop: 548200.0,
    entidad_lider: "Secretaría del Interior y Convivencia Ciudadana",
    estado_semaforo: "EN_RUTA",
  },
  {
    codigo: "4.2",
    nombre: "Construcción de Paz, Derechos Humanos y Convivencia",
    metas_cantidad: 126,
    indicadores_cantidad: 62,
    avance_promedio_pct: 73.5,
    presupuesto_ppi_mcop: 184600.0,
    entidad_lider: "Secretaría del Interior / Plan de Emergencia Social (PES)",
    estado_semaforo: "ALERTA_MEDIA",
  },
  {
    codigo: "4.3",
    nombre: "Salud Pública y Aseguramiento",
    metas_cantidad: 285,
    indicadores_cantidad: 154,
    avance_promedio_pct: 82.1,
    presupuesto_ppi_mcop: 2412000.0,
    entidad_lider: "Departamento Administrativo Distrital de Salud (DADIS)",
    estado_semaforo: "EN_RUTA",
  },
  {
    codigo: "4.4",
    nombre: "Atención Integral a Grupos de Especial Protección",
    metas_cantidad: 142,
    indicadores_cantidad: 76,
    avance_promedio_pct: 69.4,
    presupuesto_ppi_mcop: 421500.0,
    entidad_lider: "Secretaría de Desarrollo Social",
    estado_semaforo: "ALERTA_MEDIA",
  },
  {
    codigo: "4.5",
    nombre: "Superación de la Pobreza Extrema y Soberanía Alimentaria",
    metas_cantidad: 145,
    indicadores_cantidad: 82,
    avance_promedio_pct: 68.9,
    presupuesto_ppi_mcop: 851700.0,
    entidad_lider: "Plan de Emergencia Social Pedro Romero (PES)",
    estado_semaforo: "ALERTA_MEDIA",
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
    nombre: "Puente Angola y Conectividad Vial",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Secretaría de Infraestructura",
    inversion_ppi_mcop: 62000.0,
    avance_fisico_pct: 78.4,
    estado: "EN_RUTA",
    descripcion: "Desembotellamiento de barrios populares y arterias de interconexión urbana.",
  },
  {
    id: "MACRO_08",
    nombre: "Ciudad Hospitalaria y Centros de Salud (CAPs)",
    linea_estrategica: "Línea 1: Seguridad Humana",
    entidad_responsable: "DADIS",
    inversion_ppi_mcop: 215000.0,
    avance_fisico_pct: 81.2,
    estado: "EN_RUTA",
    descripcion: "Red primaria de atención médica resolutiva y terminación de centros inconclusos.",
  },
  {
    id: "MACRO_09",
    nombre: "Acueducto y Alcantarillado Zona Insular",
    linea_estrategica: "Línea 2: Vida Digna",
    entidad_responsable: "Secretaría General / Aguas de Cartagena",
    inversion_ppi_mcop: 135000.0,
    avance_fisico_pct: 45.0,
    estado: "ALERTA_MEDIA",
    descripcion: "Agua potable continua para Tierra Bomba, Barú y comunidades de la zona insular.",
  },
  {
    id: "MACRO_10",
    nombre: "Sistema Inteligente de Transporte y Chatarrización Transcaribe",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "Transcaribe S.A. / DATT",
    inversion_ppi_mcop: 190000.0,
    avance_fisico_pct: 71.5,
    estado: "EN_RUTA",
    descripcion: "Renovación de flota con buses eléctricos y optimización de frecuencias.",
  },
  {
    id: "MACRO_11",
    nombre: "Corredores Verdes y Reforestación Urbana",
    linea_estrategica: "Línea 4: Ciudad Conectada y Sostenible",
    entidad_responsable: "EPA Cartagena",
    inversion_ppi_mcop: 48000.0,
    avance_fisico_pct: 64.2,
    estado: "EN_RUTA",
    descripcion: "Siembra de 100.000 árboles nativos y microclimas urbanos contra islas de calor.",
  },
  {
    id: "MACRO_12",
    nombre: "Titulación Masiva de Predios y Regularización",
    linea_estrategica: "Línea 2: Vida Digna",
    entidad_responsable: "Corvivienda",
    inversion_ppi_mcop: 32000.0,
    avance_fisico_pct: 85.0,
    estado: "EN_RUTA",
    descripcion: "Entrega de títulos de propiedad jurídica a familias vulnerables.",
  },
  {
    id: "MACRO_13",
    nombre: "Megacolegios y Ambientes de Aprendizaje Dignos",
    linea_estrategica: "Línea 2: Vida Digna",
    entidad_responsable: "Secretaría de Educación Distrital (SED)",
    inversion_ppi_mcop: 310000.0,
    avance_fisico_pct: 79.1,
    estado: "EN_RUTA",
    descripcion: "Construcción y dotación tecnológica de 6 megacolegios y comedores escolares.",
  },
  {
    id: "MACRO_14",
    nombre: "Central de Abastos y Mercados Sectoriales",
    linea_estrategica: "Línea 3: Desarrollo Económico Equitativo",
    entidad_responsable: "Secretaría de Hacienda / Apoyo Logístico",
    inversion_ppi_mcop: 160000.0,
    avance_fisico_pct: 35.0,
    estado: "REZAGO_CRITICO",
    descripcion: "Reubicación de Bazurto y creación de centros de abastecimiento modernos.",
  },
  {
    id: "MACRO_15",
    nombre: "Centro de Alto Rendimiento Deportivo",
    linea_estrategica: "Línea 2: Vida Digna",
    entidad_responsable: "IDER",
    inversion_ppi_mcop: 54000.0,
    avance_fisico_pct: 58.0,
    estado: "ALERTA_MEDIA",
    descripcion: "Complejo de entrenamiento biomecánico y preparación atlética para jóvenes.",
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
    presupuesto_fdl_mcop: 48200.0,
    estado: "EN_RUTA",
  },
  {
    localidad_id: 2,
    nombre: "Localidad 2: De la Virgen y Turística",
    alcaldia_local: "Alcaldía Local de la Virgen",
    metas_locales_cantidad: 156,
    avance_promedio_pct: 68.5,
    presupuesto_fdl_mcop: 52400.0,
    estado: "ALERTA_MEDIA",
  },
  {
    localidad_id: 3,
    nombre: "Localidad 3: Industrial y de la Bahía",
    alcaldia_local: "Alcaldía Local Industrial",
    metas_locales_cantidad: 148,
    avance_promedio_pct: 71.8,
    presupuesto_fdl_mcop: 49800.0,
    estado: "EN_RUTA",
  },
];

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
    theta_bcc: 1.000,
    escala_eficiencia_se: 0.942,
    retornos_escala: "DRS",
    theta_sbm: 0.935,
    theta_bootstrap_corregido: 0.978,
    ic95_inf: 0.925,
    ic95_sup: 1.000,
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
    theta_bcc: 1.000,
    escala_eficiencia_se: 0.915,
    retornos_escala: "DRS",
    theta_sbm: 0.898,
    theta_bootstrap_corregido: 0.962,
    ic95_inf: 0.895,
    ic95_sup: 1.000,
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
    peers: [{ sigla: "SED", lambda: 0.18 }, { sigla: "CORPOTURISMO", lambda: 0.42 }, { sigla: "EPA", lambda: 0.40 }],
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
    x1_ppi_conciliado_constante_2025_mcop: 112500.0,
    x1_reportado_matrices_mcop: 137250.0,
    y1_metas_pdd_cumplidas_equivalentes: 92.4,
    y2_indicadores_eficaces_ge75: 58,
    total_metas_a_cargo: 110,
    theta_ccr: 0.985,
    theta_bcc: 1.000,
    escala_eficiencia_se: 0.985,
    retornos_escala: "CRS",
    theta_sbm: 0.978,
    theta_bootstrap_corregido: 0.988,
    ic95_inf: 0.952,
    ic95_sup: 1.000,
    peers: [{ sigla: "EPA", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 112500.0, target_y1_metas: 92.4, target_y2_indicadores: 58 },
    es_frontera: true,
  },
  {
    entidad: "Corporación de Turismo Cartagena",
    sigla: "CORPOTURISMO",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 65400.0,
    x1_reportado_matrices_mcop: 79788.0,
    y1_metas_pdd_cumplidas_equivalentes: 68.2,
    y2_indicadores_eficaces_ge75: 44,
    total_metas_a_cargo: 78,
    theta_ccr: 1.000,
    theta_bcc: 1.000,
    escala_eficiencia_se: 1.000,
    retornos_escala: "CRS",
    theta_sbm: 1.000,
    theta_bootstrap_corregido: 0.992,
    ic95_inf: 0.965,
    ic95_sup: 1.000,
    peers: [{ sigla: "CORPOTURISMO", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 65400.0, target_y1_metas: 68.2, target_y2_indicadores: 44 },
    es_frontera: true,
  },
  {
    entidad: "Instituto de Deporte y Recreación",
    sigla: "IDER",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 89400.0,
    x1_reportado_matrices_mcop: 109068.0,
    y1_metas_pdd_cumplidas_equivalentes: 76.5,
    y2_indicadores_eficaces_ge75: 51,
    total_metas_a_cargo: 92,
    theta_ccr: 0.920,
    theta_bcc: 1.000,
    escala_eficiencia_se: 0.920,
    retornos_escala: "IRS",
    theta_sbm: 0.908,
    theta_bootstrap_corregido: 0.971,
    ic95_inf: 0.912,
    ic95_sup: 1.000,
    peers: [{ sigla: "IDER", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 89400.0, target_y1_metas: 76.5, target_y2_indicadores: 51 },
    es_frontera: true,
  },
  {
    entidad: "Instituto de Patrimonio y Cultura",
    sigla: "IPCC",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 72100.0,
    x1_reportado_matrices_mcop: 87962.0,
    y1_metas_pdd_cumplidas_equivalentes: 64.0,
    y2_indicadores_eficaces_ge75: 42,
    total_metas_a_cargo: 80,
    theta_ccr: 0.884,
    theta_bcc: 1.000,
    escala_eficiencia_se: 0.884,
    retornos_escala: "IRS",
    theta_sbm: 0.872,
    theta_bootstrap_corregido: 0.954,
    ic95_inf: 0.898,
    ic95_sup: 1.000,
    peers: [{ sigla: "IPCC", lambda: 1.0 }],
    slacks: { slack_x1_mcop: 0, slack_y1_metas: 0, slack_y2_indicadores: 0 },
    targets: { target_x1_mcop: 72100.0, target_y1_metas: 64.0, target_y2_indicadores: 42 },
    es_frontera: true,
  },
  {
    entidad: "Secretaría de Infraestructura",
    sigla: "INFRAESTRUCTURA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 1120000.0,
    x1_reportado_matrices_mcop: 1365853.0,
    y1_metas_pdd_cumplidas_equivalentes: 124.5,
    y2_indicadores_eficaces_ge75: 68,
    total_metas_a_cargo: 210,
    theta_ccr: 0.642,
    theta_bcc: 0.725,
    escala_eficiencia_se: 0.886,
    retornos_escala: "DRS",
    theta_sbm: 0.618,
    theta_bootstrap_corregido: 0.692,
    ic95_inf: 0.625,
    ic95_sup: 0.760,
    peers: [{ sigla: "SED", lambda: 0.35 }, { sigla: "EPA", lambda: 0.65 }],
    slacks: { slack_x1_mcop: 198000.0, slack_y1_metas: 42.0, slack_y2_indicadores: 24 },
    targets: { target_x1_mcop: 922000.0, target_y1_metas: 166.5, target_y2_indicadores: 92 },
    es_frontera: false,
  },
  {
    entidad: "Plan de Emergencia Social (PES)",
    sigla: "PES",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 851700.0,
    x1_reportado_matrices_mcop: 1038658.0,
    y1_metas_pdd_cumplidas_equivalentes: 99.8,
    y2_indicadores_eficaces_ge75: 56,
    total_metas_a_cargo: 145,
    theta_ccr: 0.698,
    theta_bcc: 0.762,
    escala_eficiencia_se: 0.916,
    retornos_escala: "IRS",
    theta_sbm: 0.684,
    theta_bootstrap_corregido: 0.732,
    ic95_inf: 0.675,
    ic95_sup: 0.795,
    peers: [{ sigla: "DADIS", lambda: 0.22 }, { sigla: "EPA", lambda: 0.58 }, { sigla: "CORPOTURISMO", lambda: 0.20 }],
    slacks: { slack_x1_mcop: 82000.0, slack_y1_metas: 21.4, slack_y2_indicadores: 14 },
    targets: { target_x1_mcop: 769700.0, target_y1_metas: 121.2, target_y2_indicadores: 70 },
    es_frontera: false,
  },
  {
    entidad: "Distriseguridad",
    sigla: "DISTRISEGURIDAD",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 78000.0,
    x1_reportado_matrices_mcop: 95121.0,
    y1_metas_pdd_cumplidas_equivalentes: 65.1,
    y2_indicadores_eficaces_ge75: 41,
    total_metas_a_cargo: 78,
    theta_ccr: 0.852,
    theta_bcc: 0.894,
    escala_eficiencia_se: 0.953,
    retornos_escala: "IRS",
    theta_sbm: 0.838,
    theta_bootstrap_corregido: 0.865,
    ic95_inf: 0.810,
    ic95_sup: 0.924,
    peers: [{ sigla: "CORPOTURISMO", lambda: 0.65 }, { sigla: "EPA", lambda: 0.35 }],
    slacks: { slack_x1_mcop: 8500.0, slack_y1_metas: 7.2, slack_y2_indicadores: 5 },
    targets: { target_x1_mcop: 69500.0, target_y1_metas: 72.3, target_y2_indicadores: 46 },
    es_frontera: false,
  },
  {
    entidad: "Fondo de Vivienda de Interés Social (Corvivienda)",
    sigla: "CORVIVIENDA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 145000.0,
    x1_reportado_matrices_mcop: 176829.0,
    y1_metas_pdd_cumplidas_equivalentes: 88.0,
    y2_indicadores_eficaces_ge75: 48,
    total_metas_a_cargo: 112,
    theta_ccr: 0.772,
    theta_bcc: 0.814,
    escala_eficiencia_se: 0.948,
    retornos_escala: "IRS",
    theta_sbm: 0.755,
    theta_bootstrap_corregido: 0.785,
    ic95_inf: 0.730,
    ic95_sup: 0.845,
    peers: [{ sigla: "EPA", lambda: 0.50 }, { sigla: "IDER", lambda: 0.50 }],
    slacks: { slack_x1_mcop: 18200.0, slack_y1_metas: 12.5, slack_y2_indicadores: 8 },
    targets: { target_x1_mcop: 126800.0, target_y1_metas: 100.5, target_y2_indicadores: 56 },
    es_frontera: false,
  },
  {
    entidad: "Departamento Administrativo de Tránsito y Transporte",
    sigla: "DATT",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "DESCENTRALIZADAS_Y_AUTORIDADES",
    x1_ppi_conciliado_constante_2025_mcop: 98000.0,
    x1_reportado_matrices_mcop: 119512.0,
    y1_metas_pdd_cumplidas_equivalentes: 71.0,
    y2_indicadores_eficaces_ge75: 39,
    total_metas_a_cargo: 96,
    theta_ccr: 0.745,
    theta_bcc: 0.792,
    escala_eficiencia_se: 0.941,
    retornos_escala: "IRS",
    theta_sbm: 0.728,
    theta_bootstrap_corregido: 0.764,
    ic95_inf: 0.710,
    ic95_sup: 0.822,
    peers: [{ sigla: "EPA", lambda: 0.45 }, { sigla: "IDER", lambda: 0.55 }],
    slacks: { slack_x1_mcop: 12500.0, slack_y1_metas: 11.0, slack_y2_indicadores: 7 },
    targets: { target_x1_mcop: 85500.0, target_y1_metas: 82.0, target_y2_indicadores: 46 },
    es_frontera: false,
  },
  {
    entidad: "Secretaría de Hacienda Distrital",
    sigla: "HACIENDA",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 184000.0,
    x1_reportado_matrices_mcop: 224390.0,
    y1_metas_pdd_cumplidas_equivalentes: 112.0,
    y2_indicadores_eficaces_ge75: 64,
    total_metas_a_cargo: 135,
    theta_ccr: 0.824,
    theta_bcc: 0.875,
    escala_eficiencia_se: 0.942,
    retornos_escala: "IRS",
    theta_sbm: 0.810,
    theta_bootstrap_corregido: 0.848,
    ic95_inf: 0.795,
    ic95_sup: 0.905,
    peers: [{ sigla: "EPA", lambda: 0.60 }, { sigla: "CORPOTURISMO", lambda: 0.40 }],
    slacks: { slack_x1_mcop: 15400.0, slack_y1_metas: 9.8, slack_y2_indicadores: 6 },
    targets: { target_x1_mcop: 168600.0, target_y1_metas: 121.8, target_y2_indicadores: 70 },
    es_frontera: false,
  },
  {
    entidad: "Secretaría de Participación y Desarrollo Social",
    sigla: "PARTICIPACION",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 421500.0,
    x1_reportado_matrices_mcop: 514024.0,
    y1_metas_pdd_cumplidas_equivalentes: 98.5,
    y2_indicadores_eficaces_ge75: 53,
    total_metas_a_cargo: 142,
    theta_ccr: 0.685,
    theta_bcc: 0.742,
    escala_eficiencia_se: 0.923,
    retornos_escala: "IRS",
    theta_sbm: 0.665,
    theta_bootstrap_corregido: 0.715,
    ic95_inf: 0.655,
    ic95_sup: 0.778,
    peers: [{ sigla: "DADIS", lambda: 0.15 }, { sigla: "EPA", lambda: 0.50 }, { sigla: "IDER", lambda: 0.35 }],
    slacks: { slack_x1_mcop: 48000.0, slack_y1_metas: 18.0, slack_y2_indicadores: 12 },
    targets: { target_x1_mcop: 373500.0, target_y1_metas: 116.5, target_y2_indicadores: 65 },
    es_frontera: false,
  },
  {
    entidad: "Secretaría de Planeación Distrital",
    sigla: "PLANEACION",
    cuatrienio_pdd: "2024–2027",
    plan_codigo: "PDD_2024_2027",
    grupo_institucional: "SECTOR_CENTRAL_RECTOR",
    x1_ppi_conciliado_constante_2025_mcop: 142000.0,
    x1_reportado_matrices_mcop: 173170.0,
    y1_metas_pdd_cumplidas_equivalentes: 118.0,
    y2_indicadores_eficaces_ge75: 72,
    total_metas_a_cargo: 138,
    theta_ccr: 0.892,
    theta_bcc: 0.934,
    escala_eficiencia_se: 0.955,
    retornos_escala: "IRS",
    theta_sbm: 0.880,
    theta_bootstrap_corregido: 0.910,
    ic95_inf: 0.865,
    ic95_sup: 0.962,
    peers: [{ sigla: "EPA", lambda: 0.70 }, { sigla: "CORPOTURISMO", lambda: 0.30 }],
    slacks: { slack_x1_mcop: 6200.0, slack_y1_metas: 4.5, slack_y2_indicadores: 3 },
    targets: { target_x1_mcop: 135800.0, target_y1_metas: 122.5, target_y2_indicadores: 75 },
    es_frontera: false,
  },
];

export const DMUS_DEA_PDD_LINEAS_ESTRATEGICAS: DmuDeaPddLineaEstrategica[] = [
  {
    linea_codigo: "LINEA_1",
    linea_nombre: "Seguridad Humana",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 4353800.0,
    y1_metas_cumplidas_equivalentes: 667.2,
    y2_indicadores_eficaces_ge75: 382,
    theta_ccr: 0.842,
    theta_bcc: 0.885,
    escala_eficiencia_se: 0.951,
    retornos_escala: "DRS",
    es_frontera: false,
  },
  {
    linea_codigo: "LINEA_2",
    linea_nombre: "Vida Digna",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 4754800.0,
    y1_metas_cumplidas_equivalentes: 754.6,
    y2_indicadores_eficaces_ge75: 442,
    theta_ccr: 0.875,
    theta_bcc: 0.912,
    escala_eficiencia_se: 0.959,
    retornos_escala: "DRS",
    es_frontera: false,
  },
  {
    linea_codigo: "LINEA_3",
    linea_nombre: "Desarrollo Económico Equitativo",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 1135200.0,
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
    x1_ppi_mcop_constante_2025: 1639800.0,
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
    x1_ppi_mcop_constante_2025: 602920.12,
    y1_metas_cumplidas_equivalentes: 242.0,
    y2_indicadores_eficaces_ge75: 148,
    theta_ccr: 0.798,
    theta_bcc: 0.840,
    escala_eficiencia_se: 0.950,
    retornos_escala: "IRS",
    es_frontera: false,
  },
  {
    linea_codigo: "CAPITULO_ETNICO",
    linea_nombre: "Pueblos y Comunidades Étnicas",
    plan_codigo: "PDD_2024_2027",
    x1_ppi_mcop_constante_2025: 128000.0,
    y1_metas_cumplidas_equivalentes: 55.3,
    y2_indicadores_eficaces_ge75: 32,
    theta_ccr: 0.920,
    theta_bcc: 1.000,
    escala_eficiencia_se: 0.920,
    retornos_escala: "CRS",
    es_frontera: true,
  },
];

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
    mpi_medio_geometrico: 1.050,
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
    linea_mayor_participacion: "Línea 2: Vida Digna",
    pct_linea_mayor: 37.69,
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
// 3. FUNCIONES DE APOYO Y FILTRADO LOCAL RESILIENTE
// =============================================================================

export interface CatalogoYConciliacionPpiRespuesta {
  catalogo_planes: PlanDesarrolloInfo[];
  tabla_ppi_anual: DetalleAnualPpi[];
  lineas_estrategicas_ppi: PpiPorLineaEstrategica[];
  conciliacion_ppi: ConciliacionPpiVsBdCshItem[];
  serie_ipc: DatoIpcHistorico[];
}

export interface CumplimientoMetasPddRespuesta {
  resumen_planes: ResumenCumplimientoPlan[];
  componentes_seguridad_humana: ComponenteSeguridadHumana[];
  macroproyectos: MacroproyectoEstrategico[];
  planes_locales: PlanDesarrolloLocalAvance[];
  filtro_aplicado?: { plan?: string; linea?: string; entidad?: string };
}

export interface FronteraDeaPddRespuesta {
  plan_evaluado: CodigoPlanDesarrollo;
  insumo_utilizado: InsumoDeaPdd;
  ranking_entidades: DmuDeaPddEntidad[];
  ranking_lineas_estrategicas: DmuDeaPddLineaEstrategica[];
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

export interface ResumenEjecutivoPddDeaRespuesta {
  catalogo: CatalogoYConciliacionPpiRespuesta;
  cumplimiento: CumplimientoMetasPddRespuesta;
  frontera: FronteraDeaPddRespuesta;
  econometria: EconometriaComparadaPddRespuesta;
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
  };
}

export function obtenerCumplimientoMetasPddLocal(params?: {
  plan?: string;
  linea?: string;
  entidad?: string;
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
    filtro_aplicado: params,
  };
}

export function obtenerFronteraDeaPddLocal(params?: {
  plan?: string;
  insumo?: InsumoDeaPdd;
}): FronteraDeaPddRespuesta {
  const plan: CodigoPlanDesarrollo =
    (params?.plan as CodigoPlanDesarrollo) || "PDD_2024_2027";
  const insumo: InsumoDeaPdd = params?.insumo || "conciliado_ppi";

  const entidades = DMUS_DEA_PDD_ENTIDADES.filter((d) => d.plan_codigo === plan);
  const ranking = entidades.length > 0 ? entidades : DMUS_DEA_PDD_ENTIDADES;

  const sumBcc = ranking.reduce((acc, d) => acc + d.theta_bcc, 0);
  const sumCcr = ranking.reduce((acc, d) => acc + d.theta_ccr, 0);
  const n = ranking.length;

  return {
    plan_evaluado: plan,
    insumo_utilizado: insumo,
    ranking_entidades: ranking,
    ranking_lineas_estrategicas: DMUS_DEA_PDD_LINEAS_ESTRATEGICAS,
    eficiencia_media_bcc_entidades: n > 0 ? Number((sumBcc / n).toFixed(3)) : 0.885,
    eficiencia_media_ccr_entidades: n > 0 ? Number((sumCcr / n).toFixed(3)) : 0.824,
    entidades_en_frontera_cantidad: ranking.filter((d) => d.es_frontera).length,
    entidades_rezagadas_cantidad: ranking.filter((d) => d.theta_bcc < 0.80).length,
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

export function obtenerResumenEjecutivoPddDeaLocal(): ResumenEjecutivoPddDeaRespuesta {
  return {
    catalogo: obtenerCatalogoYConciliacionPpiLocal(),
    cumplimiento: obtenerCumplimientoMetasPddLocal(),
    frontera: obtenerFronteraDeaPddLocal(),
    econometria: obtenerEconometriaComparadaPddLocal(),
    fecha_generacion: "2026-10-15T12:00:00Z",
    version_motor: "POLIS-PDD-DEA-HiGHS-v1.0",
  };
}
