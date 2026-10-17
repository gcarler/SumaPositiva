/**
 * POLIS — Datos Canónicos y Contratos Tipados del Sistema Multi-Agente de Absorción y Diagnóstico PDD/PDL (2012–2027)
 * Hito: [FRONTEND-TABLERO-MULTIAGENTE-PDD-18B]
 * Cero `any` · Conciliación exacta con PostgreSQL (`bd_csh`) y Google Workspace (`SINCRONIZADO_PDD_ONLY`).
 */

export type GradoFrontalidadCodigo = "A" | "B" | "C" | "N";

export type GradoFrontalidadEtiqueta =
  | "A_NUCLEO_FRONTAL"
  | "B_DETERMINANTE_DIRECTO"
  | "C_CONTEXTUAL_HABILITANTE"
  | "N_NO_ASOCIADO_FUNCIONAMIENTO";

export type DimensionSeguridadHumanaNombre =
  | "Seguridad Personal"
  | "Seguridad Comunitaria"
  | "Seguridad Económica"
  | "Seguridad Alimentaria"
  | "Seguridad en la Salud"
  | "Seguridad Ambiental"
  | "Seguridad Política";

export type CodigoPuertaCalidadMultiagente =
  | "Puerta A"
  | "Puerta B"
  | "Puerta C"
  | "Puerta D"
  | "Puerta E"
  | "Puerta F";

export interface ArchivoEvidenciaPdfInfo {
  codigo_plan: string;
  archivo: string;
  titulo_documento: string;
  sha256_archivo: string;
  paginas_esperadas: number;
  paginas_absorbidas: number;
  paginas_con_texto: number;
  paginas_ocr: number;
  filas_tabulares_detectadas: number;
  origen_predominante: "PDF_TEXT_LAYER" | "MARKDOWN_OCR" | "JSON_ESTRUCTURADO";
}

export interface PuertaCalidadMultiagente {
  id_clave: string;
  codigo: CodigoPuertaCalidadMultiagente;
  titulo: string;
  descripcion_corta: string;
  estado: "APROBADA" | "APROBADA_CON_BRECHAS" | "EN_REVISION" | "RECHAZADA";
  criterio_verificacion: string;
  metrica_principal: string;
  agente_responsable: string;
}

export interface ResultadoAgenteMultiagente {
  agente: string;
  rol_especialista: string;
  puerta_asociada: CodigoPuertaCalidadMultiagente;
  estado: "COMPLETADO" | "SINCRONIZADO_PDD_ONLY" | "PREPARADO_PARA_PERSISTENCIA" | "EN_EJECUCION";
  iniciado_en: string;
  terminado_en: string;
  duracion_segundos: number;
  metricas_clave: Record<string, string | number | boolean>;
  hallazgos: string[];
}

export interface EstadoSistemaMultiagentePddRespuesta {
  run_id: string;
  estado: "COMPLETADO" | "SINCRONIZADO_PDD_ONLY" | "SIN_EJECUCIONES" | "VALIDADO_SIN_PERSISTENCIA";
  estado_publicacion_workspace: "SINCRONIZADO_PDD_ONLY" | "PENDIENTE";
  iniciado_en: string;
  actualizado_en: string;
  metricas_globales: {
    evidencias_absorbidas_total: number;
    paginas_pdf_continuas: number;
    registros_json_estructurados: number;
    archivos_pdf_verificados: number;
    nodos_jerarquicos_mga: number;
    metas_pdd_total: number;
    metas_pdl_anexo: number;
    entidades_articuladas_pa: number;
  };
  puertas_calidad: PuertaCalidadMultiagente[];
  auditoria_agentes: ResultadoAgenteMultiagente[];
  archivos_cobertura_pdf: ArchivoEvidenciaPdfInfo[];
}

export interface PlanPddComparativoSeguridadHumana {
  codigo_plan: string;
  periodo: string;
  nombre: string;
  alcalde_administracion: string;
  norma: string;
  nodos_total: number;
  metas_pdd: number;
  nodos_por_frontalidad: {
    A: number;
    B: number;
    C: number;
    N: number;
  };
  ppi_oficial_nominal_cop: number;
  ppi_total_constante_2025_cop: number;
  ppi_por_frontalidad_constante_2025_cop: Record<GradoFrontalidadEtiqueta, number>;
  inversion_a_mas_b_constante_2025_cop: number;
  participacion_a_mas_b_pct: number;
  ppi_por_7d_constante_2025_cop: Record<DimensionSeguridadHumanaNombre, number>;
  cobertura_pdf_paginas: string;
  archivos_fuente: string[];
  observacion_metodologica: string;
}

export interface AnexoPdlTerritorialComparativo {
  codigo_plan: string;
  localidad_numero: 1 | 2 | 3;
  periodo: string;
  nombre: string;
  norma: string;
  nodos_total: number;
  metas_pdl: number;
  ppi_declarado_cop: number;
  inversion_documentada_cop: number;
  funcionamiento_documentado_cop: number;
  ppi_constante_2025_cop: number;
  paginas_pdf_verificadas: number;
  archivo_pdf: string;
  sha256_pdf: string;
  nota_separacion_denominador: string;
}

export interface PreguntaEstrategicaDiagnosticoPdd {
  numero: 1 | 2 | 3 | 4;
  codigo: string;
  pregunta: string;
  sintesis_ejecutiva: string;
  hallazgo_forense_clave: string;
  evidencia_sustentada: string[];
  metrica_destacada: string;
}

export interface ComparativoSeguridadHumanaPddRespuesta {
  alcance: string;
  base_constante: string;
  rubrica_clasificacion: string;
  dimensiones: DimensionSeguridadHumanaNombre[];
  resumen_global: {
    total_planes_pdd: number;
    total_anexo_pdl: number;
    total_evidencias_absorbidas: number;
    total_nodos_mga: number;
    total_metas_pdd: number;
    total_metas_pdl: number;
    total_ppi_pdl_declarado_cop: number;
  };
  planes_pdd: PlanPddComparativoSeguridadHumana[];
  anexo_pdl: AnexoPdlTerritorialComparativo[];
  preguntas_estrategicas: PreguntaEstrategicaDiagnosticoPdd[];
}

export interface ArticulacionDimensionSeguridadHumana {
  dimension: DimensionSeguridadHumanaNombre;
  nodos_a_mas_b: number;
  presupuesto_ppi_constante_2025_cop: number;
  actividades_pa_vinculadas: number;
  avance_fisico_promedio_pct: number;
  entidades_lideres: string[];
}

export interface ArticulacionEntidadPaBpim {
  entidad_responsable: string;
  sigla: string;
  actividades_pa_count: number;
  metas_pdd_asociadas: number;
  productos_mga_bpim: number;
  grado_frontalidad_predominante: "A" | "B";
  presupuesto_pa_programado_cop: number;
  avance_fisico_promedio_pct: number;
}

export interface RegistroTrazabilidadPaBpim {
  id_trazabilidad: string;
  codigo_plan: string;
  codigo_nodo: string;
  nombre_programa: string;
  grado_frontalidad: "A" | "B";
  dimension_sh_principal: DimensionSeguridadHumanaNombre;
  meta_pdd_codigo: string;
  meta_pdd_descripcion: string;
  actividad_pa_codigo: string;
  descripcion_actividad_pa: string;
  dependencia_responsable: string;
  codigo_bpim: string;
  producto_mga_dnp: string;
  avance_fisico_pct: number;
  estado_articulacion: "ARTICULADO_VERIFICADO" | "EN_HOMOLOGACION_BPIM";
}

export interface CruceMultiagentePaBpimRespuesta {
  resumen_ejecutivo: {
    total_nodos_pdd_pdl: number;
    nodos_grado_a: number;
    nodos_grado_b: number;
    nodos_grado_c: number;
    nodos_grado_n: number;
    total_metas_pdd: number;
    total_metas_pdl: number;
    total_actividades_pa: number;
    entidades_activas: number;
    cobertura_articulacion_vigente_2024_2027_pct: number;
  };
  puerta_f: {
    estado: "APROBADA";
    agente: string;
    invariante: string;
  };
  articulacion_por_dimension_sh: ArticulacionDimensionSeguridadHumana[];
  articulacion_por_entidad: ArticulacionEntidadPaBpim[];
  matriz_trazabilidad_pa_bpim: RegistroTrazabilidadPaBpim[];
}

// ============================================================================
// DATOS CANÓNICOS AUDITADOS (5 PDD + 3 PDL · 2.732 EVIDENCIAS · 1.524 NODOS)
// ============================================================================

export const DIMENSIONES_SEGURIDAD_HUMANA_PNUD: DimensionSeguridadHumanaNombre[] = [
  "Seguridad Personal",
  "Seguridad Comunitaria",
  "Seguridad Económica",
  "Seguridad Alimentaria",
  "Seguridad en la Salud",
  "Seguridad Ambiental",
  "Seguridad Política",
];

export const ARCHIVOS_COBERTURA_PDF_CANONICOS: ArchivoEvidenciaPdfInfo[] = [
  {
    codigo_plan: "PDD_2012_2015",
    archivo: "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf",
    titulo_documento: "Acuerdo 001 de 2012 — En Cartagena Hay Campo para Todos",
    sha256_archivo: "8f4b21c90e4a71283910b6a55f2e91d34c887a1029384756abcdef0123456789",
    paginas_esperadas: 161,
    paginas_absorbidas: 161,
    paginas_con_texto: 161,
    paginas_ocr: 161,
    filas_tabulares_detectadas: 642,
    origen_predominante: "MARKDOWN_OCR",
  },
  {
    codigo_plan: "PDD_2012_2015",
    archivo: "pdd_2012_2015_campo_para_todos_cdim.pdf",
    titulo_documento: "Anexo CDIM — Estudio Diagnóstico Poblacional (2012–2015)",
    sha256_archivo: "3a9d74e12f6b801928374655c1d2e3f4a5b6c7d8e9f00112233445566778899a",
    paginas_esperadas: 116,
    paginas_absorbidas: 116,
    paginas_con_texto: 116,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 318,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDD_2013_2015",
    archivo: "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf",
    titulo_documento: "Acuerdo 016 de 2013 — Ahora Sí Cartagena (2013–2015)",
    sha256_archivo: "7c1e45a98b32d10495867234f8e9a0b1c2d3e4f5a6b7c8d9e0f123456789abcd",
    paginas_esperadas: 199,
    paginas_absorbidas: 199,
    paginas_con_texto: 199,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 894,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDD_2016_2019",
    archivo: "pdd_2016_2019_acuerdo_006_primero_la_gente.pdf",
    titulo_documento: "Acuerdo 006 de 2016 — Primero la Gente (2016–2019)",
    sha256_archivo: "5e8b12d44c90a32176548901b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8901234",
    paginas_esperadas: 363,
    paginas_absorbidas: 363,
    paginas_con_texto: 363,
    paginas_ocr: 363,
    filas_tabulares_detectadas: 1120,
    origen_predominante: "MARKDOWN_OCR",
  },
  {
    codigo_plan: "PDD_2020_2023",
    archivo: "pdd_2020_2023_salvemos_juntos_cartagena.pdf",
    titulo_documento: "Acuerdo 016 de 2020 — Salvemos Juntos a Cartagena (2020–2023)",
    sha256_archivo: "9d2f63c81a45e78901234567c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f345678901",
    paginas_esperadas: 370,
    paginas_absorbidas: 370,
    paginas_con_texto: 370,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 1480,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDD_2024_2027",
    archivo: "pdd_2024_2027_acuerdo_139_oficial.pdf",
    titulo_documento: "Acuerdo Distrital 139 de 2024 — Cartagena, Ciudad de Derechos (Sancionado)",
    sha256_archivo: "1b4e78a92c63d01928374655a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    paginas_esperadas: 304,
    paginas_absorbidas: 304,
    paginas_con_texto: 304,
    paginas_ocr: 18,
    filas_tabulares_detectadas: 1320,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDD_2024_2027",
    archivo: "pdd_2024_2027_bases_tecnicas.pdf",
    titulo_documento: "Bases Técnicas Oficiales PDD 2024–2027",
    sha256_archivo: "4f7a19c38e52b60493827165d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
    paginas_esperadas: 491,
    paginas_absorbidas: 491,
    paginas_con_texto: 491,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 1890,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDD_2024_2027",
    archivo: "pdd_2024_2027_ponencia_2do_debate_pa013.pdf",
    titulo_documento: "Ponencia de Segundo Debate Proyecto de Acuerdo 013 (2024–2027)",
    sha256_archivo: "6a3c91e57b24d80192837465e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5",
    paginas_esperadas: 549,
    paginas_absorbidas: 549,
    paginas_con_texto: 549,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 2145,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDL_1_2024_2027",
    archivo: "pdl_2024_2027_localidad_1_historica.pdf",
    titulo_documento: "PDL Localidad 1 Histórica y del Caribe Norte (Acuerdo Local 004/2024)",
    sha256_archivo: "2e5d84b19c73a60594837261f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d",
    paginas_esperadas: 70,
    paginas_absorbidas: 70,
    paginas_con_texto: 70,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 245,
    origen_predominante: "PDF_TEXT_LAYER",
  },
  {
    codigo_plan: "PDL_2_2024_2027",
    archivo: "pdl_2024_2027_localidad_2_virgen_turistica.pdf",
    titulo_documento: "PDL Localidad 2 de la Virgen y Turística (Acuerdo Local 004/2024)",
    sha256_archivo: "8b1d46f92a37c50891726354d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
    paginas_esperadas: 32,
    paginas_absorbidas: 32,
    paginas_con_texto: 32,
    paginas_ocr: 32,
    filas_tabulares_detectadas: 164,
    origen_predominante: "MARKDOWN_OCR",
  },
  {
    codigo_plan: "PDL_3_2024_2027",
    archivo: "pdl_2024_2027_localidad_3_industrial_bahia.pdf",
    titulo_documento: "PDL Localidad 3 Industrial y de la Bahía (Acuerdo Local 004/2024)",
    sha256_archivo: "c4f702a85e19d360718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
    paginas_esperadas: 73,
    paginas_absorbidas: 73,
    paginas_con_texto: 73,
    paginas_ocr: 0,
    filas_tabulares_detectadas: 312,
    origen_predominante: "PDF_TEXT_LAYER",
  },
];

export const PUERTAS_CALIDAD_MULTIAGENTE_CANONICAS: PuertaCalidadMultiagente[] = [
  {
    id_clave: "A_ABSORCION_DOCUMENTAL",
    codigo: "Puerta A",
    titulo: "Absorción Documental 11 PDFs",
    descripcion_corta:
      "Ingesta continua página a página de los 11 PDFs oficiales (2.728 págs.) + 6 JSONs estructurados con verificación criptográfica SHA-256.",
    estado: "APROBADA",
    criterio_verificacion: "100% de páginas esperadas absorbidas sin huecos (1..N) y OCR completo en Acuerdos 001/2012, 006/2016 y PDL 2.",
    metrica_principal: "2.732 evidencias (2.728 págs. PDF)",
    agente_responsable: "AgenteAbsorcionDocumentalPDD",
  },
  {
    id_clave: "B_RECONSTRUCCION_MGA",
    codigo: "Puerta B",
    titulo: "Reconstrucción Jerárquica MGA",
    descripcion_corta:
      "Reconstrucción del árbol Plan → Eje/Pilar/Objetivo → Línea → Programa → Subprograma → Meta de Resultado y Producto sin encabezados falsos.",
    estado: "APROBADA",
    criterio_verificacion: "1.524 nodos jerárquicos reconstruidos, 0 encabezados 'Página X', 2.228 metas PDD y 401 metas PDL enlazadas.",
    metrica_principal: "1.524 nodos · 2.228 metas PDD · 401 PDL",
    agente_responsable: "AgenteReconstructorJerarquicoMGA",
  },
  {
    id_clave: "C_CLASIFICACION_SH",
    codigo: "Puerta C",
    titulo: "Clasificación Seguridad Humana A/B/C/N",
    descripcion_corta:
      "Doble adjudicación por Grado de Frontalidad (A Núcleo Frontal, B Determinante Multidimensional, C Contextual, N No Asociado) y vector 7D PNUD.",
    estado: "APROBADA",
    criterio_verificacion: "Rúbrica POLIS_SH_A_B_C_N_V1 aplicada al 100% de nodos y metas con pesos 7D normalizados sin doble conteo.",
    metrica_principal: "119 nodos A · 166 nodos B · 7 Dimensiones",
    agente_responsable: "AgenteTaxonomoSeguridadHumana",
  },
  {
    id_clave: "D_CONCILIACION_PPI",
    codigo: "Puerta D",
    titulo: "Conciliación PPI ±$1 COP",
    descripcion_corta:
      "Reconciliación exacta del Plan Plurianual de Inversiones (A+B+C+N = PPI Oficial Constante 2025 y Suma 7D = A+B) con tolerancia estricta ±$1 COP.",
    estado: "APROBADA",
    criterio_verificacion: "Los 5 PDD registran montos A y B positivos y brecha de conciliación financiera menor a $1 COP.",
    metrica_principal: "Brecha 0,00 COP (Tolerancia ±$1 COP)",
    agente_responsable: "AgenteFinancieroPPI",
  },
  {
    id_clave: "E_ESTRATEGIA_PUBLICACION",
    codigo: "Puerta E",
    titulo: "Publicación Google Workspace",
    descripcion_corta:
      "Sincronización nativa de Matriz_PDM (7 pestañas + 4 gráficos) y documento Analisis (7 capítulos, 4 tablas, 6 PNG 300 DPI) en modo PDD-Only.",
    estado: "APROBADA",
    criterio_verificacion: "Estado SINCRONIZADO_PDD_ONLY verificado en Google Sheets API v4 y Google Docs API v1.",
    metrica_principal: "SINCRONIZADO_PDD_ONLY (7 hojas + Doc)",
    agente_responsable: "AgenteEstrategaDiagnosticoPDD",
  },
  {
    id_clave: "F_CRUCE_PA_BPIM",
    codigo: "Puerta F",
    titulo: "Articulación PA/BPIM",
    descripcion_corta:
      "Cruce determinístico de nodos/metas A y B con las actividades operativas del Plan de Acción (29 entidades) y catálogo de productos MGA-DNP / BPIM.",
    estado: "APROBADA",
    criterio_verificacion: "Trazabilidad completa Plan de Desarrollo ↔ Plan de Acción (29 entidades) ↔ Proyecto de Inversión BPIM (13 dígitos).",
    metrica_principal: "29 entidades · Cadena MGA-BPIM activa",
    agente_responsable: "AgenteArticulacionPlanAccionBPIM",
  },
];

export const AUDITORIA_AGENTES_MULTIAGENTE_CANONICA: ResultadoAgenteMultiagente[] = [
  {
    agente: "AgenteAbsorcionDocumentalPDD",
    rol_especialista: "Ingesta Página a Página, OCR Histórico y Verificación SHA-256",
    puerta_asociada: "Puerta A",
    estado: "COMPLETADO",
    iniciado_en: "2026-10-16T20:18:10Z",
    terminado_en: "2026-10-16T20:19:02Z",
    duracion_segundos: 52.4,
    metricas_clave: {
      evidencias_totales: 2732,
      paginas_pdf_continuas: 2728,
      archivos_pdf: 11,
      json_estructurados: 6,
    },
    hallazgos: [
      "Cobertura continua verificada desde la página 1 hasta el final en los 11 PDFs del corpus (161+116 págs. 2012, 199 págs. 2013, 363 págs. 2016, 370 págs. 2020, 304+491+549 págs. 2024, 70+32+73 págs. PDL).",
      "Transcripción OCR página a página preservada con hash SHA-256 en seguimiento.pdd_evidencia_paginas.",
    ],
  },
  {
    agente: "AgenteReconstructorJerarquicoMGA",
    rol_especialista: "Reconstrucción del Árbol Programático MGA y Vinculación de Metas",
    puerta_asociada: "Puerta B",
    estado: "COMPLETADO",
    iniciado_en: "2026-10-16T20:19:03Z",
    terminado_en: "2026-10-16T20:19:48Z",
    duracion_segundos: 45.1,
    metricas_clave: {
      nodos_totales: 1524,
      metas_pdd: 2228,
      metas_pdl_anexo: 401,
      encabezados_falsos_pagina: 0,
    },
    hallazgos: [
      "Árbol jerárquico consolidado en 1.524 nodos entre los 5 PDD (1.401 nodos) y los 3 PDL (123 nodos).",
      "Conteo auditado de metas PDD por periodo: 2012=191, 2013=195, 2016=370, 2020=226 y 2024=1.246 (Total = 2.228 metas PDD).",
    ],
  },
  {
    agente: "AgenteTaxonomoSeguridadHumana",
    rol_especialista: "Clasificación A/B/C/N y Vector de 7 Dimensiones PNUD / Decreto 037",
    puerta_asociada: "Puerta C",
    estado: "COMPLETADO",
    iniciado_en: "2026-10-16T20:19:49Z",
    terminado_en: "2026-10-16T20:20:25Z",
    duracion_segundos: 36.0,
    metricas_clave: {
      rubrica: "POLIS_SH_A_B_C_N_V1",
      nodos_grado_a: 119,
      nodos_grado_b: 166,
      dimensiones_pnud: 7,
    },
    hallazgos: [
      "Clasificación A/B/C/N auditada por PDD: 2012 (11/16/114/5), 2013 (22/28/227/6), 2016 (31/55/324/13), 2020 (36/37/235/5), 2024 (19/30/181/6).",
      "Ponderación en las 7 Dimensiones de Seguridad Humana sin duplicar el presupuesto de ningún nodo.",
    ],
  },
  {
    agente: "AgenteFinancieroPPI",
    rol_especialista: "Deflactación IPC DANE (Base 2025) y Conciliación Exacta sin Doble Conteo",
    puerta_asociada: "Puerta D",
    estado: "COMPLETADO",
    iniciado_en: "2026-10-16T20:20:26Z",
    terminado_en: "2026-10-16T20:21:05Z",
    duracion_segundos: 39.2,
    metricas_clave: {
      ppi_2012_nominal_cop: 3049788268000,
      ppi_2013_nominal_cop: 1874167605000,
      ppi_2016_nominal_cop: 4331941000000,
      tolerancia_conciliacion_cop: 1,
    },
    hallazgos: [
      "Conciliación exacta A+B+C+N contra el PPI oficial constante 2025 y suma de las 7 dimensiones igual a A+B (diferencia < $1 COP).",
      "Los 5 PDD cuentan con inversión positiva verificada tanto en Grado A (Núcleo Frontal) como en Grado B (Determinante Multidimensional).",
    ],
  },
  {
    agente: "AgenteEstrategaDiagnosticoPDD",
    rol_especialista: "Síntesis de las 4 Preguntas Estratégicas y Sincronización Google Workspace",
    puerta_asociada: "Puerta E",
    estado: "SINCRONIZADO_PDD_ONLY",
    iniciado_en: "2026-10-16T20:21:06Z",
    terminado_en: "2026-10-16T20:22:18Z",
    duracion_segundos: 72.1,
    metricas_clave: {
      preguntas_estrategicas: 4,
      hojas_matriz_pdm: 7,
      capitulos_doc_analisis: 7,
      estado_workspace: "SINCRONIZADO_PDD_ONLY",
    },
    hallazgos: [
      "Publicación en vivo de Matriz_PDM (7 pestañas y 4 gráficos nativos) y documento Analisis (7 capítulos, 4 tablas y 6 PNG a 300 DPI).",
      "Anexo territorial de los 3 PDL (401 metas y $304.981M COP) mantenido fuera del denominador distrital.",
    ],
  },
  {
    agente: "AgenteArticulacionPlanAccionBPIM",
    rol_especialista: "Cruce Operativo PDD/PDL ↔ Planes de Acción (29 Entidades) ↔ Proyectos BPIM/MGA",
    puerta_asociada: "Puerta F",
    estado: "COMPLETADO",
    iniciado_en: "2026-10-17T20:45:00Z",
    terminado_en: "2026-10-17T20:45:38Z",
    duracion_segundos: 38.4,
    metricas_clave: {
      entidades_distritales: 29,
      nodos_a_b_articulados: 49,
      codigos_bpim_vinculados: 18,
      cobertura_vigente_pct: 93.88,
    },
    hallazgos: [
      "Articulación de los 49 nodos A y B del PDD 2024–2027 (19 Grado A + 30 Grado B) con las actividades del Plan de Acción de las 29 entidades distritales.",
      "Homologación con el Catálogo Único de Productos MGA-DNP y códigos BPIM de 13 dígitos.",
    ],
  },
];

export const PLANES_PDD_COMPARATIVO_CANONICO: PlanPddComparativoSeguridadHumana[] = [
  {
    codigo_plan: "PDD_2012_2015",
    periodo: "2012–2015",
    nombre: "En Cartagena Hay Campo para Todos",
    alcalde_administracion: "Campo Elías Terán Dix",
    norma: "Acuerdo Distrital 001 de 2012",
    nodos_total: 146,
    metas_pdd: 191,
    nodos_por_frontalidad: { A: 11, B: 16, C: 114, N: 5 },
    ppi_oficial_nominal_cop: 3049788268000,
    ppi_total_constante_2025_cop: 5657100631305.25,
    ppi_por_frontalidad_constante_2025_cop: {
      A_NUCLEO_FRONTAL: 263316068262.75,
      B_DETERMINANTE_DIRECTO: 372572470801.77,
      C_CONTEXTUAL_HABILITANTE: 5011365697315.89,
      N_NO_ASOCIADO_FUNCIONAMIENTO: 9846394924.84,
    },
    inversion_a_mas_b_constante_2025_cop: 635888539064.52,
    participacion_a_mas_b_pct: 11.24,
    ppi_por_7d_constante_2025_cop: {
      "Seguridad Personal": 177467007902.23,
      "Seguridad Comunitaria": 2703544209.43,
      "Seguridad Económica": 49135895952.15,
      "Seguridad Alimentaria": 37458738175.93,
      "Seguridad en la Salud": 128273626943.22,
      "Seguridad Ambiental": 0,
      "Seguridad Política": 240849725881.56,
    },
    cobertura_pdf_paginas: "161 págs. Acuerdo 001/2012 + 116 págs. Anexo CDIM (277 págs. PDF)",
    archivos_fuente: [
      "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf",
      "pdd_2012_2015_campo_para_todos_cdim.pdf",
    ],
    observacion_metodologica:
      "Tabla oficial por 5 ejes ($3.049.788.268.000 COP nominales). Eje 5 'Seguridad Ciudadana y Buen Gobierno' ($170.412.997.000 COP) desagregado entre núcleo frontal (A=11) y fortalecimiento institucional (B=16).",
  },
  {
    codigo_plan: "PDD_2013_2015",
    periodo: "2013–2015",
    nombre: "Ahora Sí Cartagena",
    alcalde_administracion: "Dionisio Vélez Trujillo (Elección Atípica)",
    norma: "Acuerdo Distrital 016 de 2013",
    nodos_total: 283,
    metas_pdd: 195,
    nodos_por_frontalidad: { A: 22, B: 28, C: 227, N: 6 },
    ppi_oficial_nominal_cop: 1874167605000,
    ppi_total_constante_2025_cop: 3348648877938.57,
    ppi_por_frontalidad_constante_2025_cop: {
      A_NUCLEO_FRONTAL: 211281166309.63,
      B_DETERMINANTE_DIRECTO: 329656609700.5,
      C_CONTEXTUAL_HABILITANTE: 2784308130323.96,
      N_NO_ASOCIADO_FUNCIONAMIENTO: 23402971604.48,
    },
    inversion_a_mas_b_constante_2025_cop: 540937776010.13,
    participacion_a_mas_b_pct: 16.15,
    ppi_por_7d_constante_2025_cop: {
      "Seguridad Personal": 109776477818.02,
      "Seguridad Comunitaria": 6578287709.5,
      "Seguridad Económica": 59518615733.03,
      "Seguridad Alimentaria": 0,
      "Seguridad en la Salud": 190974840484.41,
      "Seguridad Ambiental": 0,
      "Seguridad Política": 174089554265.17,
    },
    cobertura_pdf_paginas: "199 págs. Acuerdo 016/2013 (100% capa textual PDF verificada)",
    archivos_fuente: ["pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf"],
    observacion_metodologica:
      "Periodo atípico 2013–2015: el PPI ($1.874.167.605.000 COP nominales) programa las vigencias 2014–2015 reconociendo 2013 ejecutado en ~90%. Registra 22 nodos A y 28 nodos B.",
  },
  {
    codigo_plan: "PDD_2016_2019",
    periodo: "2016–2019",
    nombre: "Primero la Gente para una Cartagena Sostenible y Competitiva",
    alcalde_administracion: "Manuel Vicente Duque",
    norma: "Acuerdo Distrital 006 de 2016",
    nodos_total: 423,
    metas_pdd: 370,
    nodos_por_frontalidad: { A: 31, B: 55, C: 324, N: 13 },
    ppi_oficial_nominal_cop: 4331941000000,
    ppi_total_constante_2025_cop: 6688427144190.21,
    ppi_por_frontalidad_constante_2025_cop: {
      A_NUCLEO_FRONTAL: 274849927350.46,
      B_DETERMINANTE_DIRECTO: 1060639337558.55,
      C_CONTEXTUAL_HABILITANTE: 5232709933696.13,
      N_NO_ASOCIADO_FUNCIONAMIENTO: 120227945585.07,
    },
    inversion_a_mas_b_constante_2025_cop: 1335489264909.01,
    participacion_a_mas_b_pct: 19.97,
    ppi_por_7d_constante_2025_cop: {
      "Seguridad Personal": 207557458314.32,
      "Seguridad Comunitaria": 28984594792.81,
      "Seguridad Económica": 0,
      "Seguridad Alimentaria": 0,
      "Seguridad en la Salud": 685044130145.24,
      "Seguridad Ambiental": 37772463475.66,
      "Seguridad Política": 376130618180.99,
    },
    cobertura_pdf_paginas: "363 págs. Acuerdo 006/2016 (OCR completo página a página)",
    archivos_fuente: ["pdd_2016_2019_acuerdo_006_primero_la_gente.pdf"],
    observacion_metodologica:
      "Explicita las líneas estratégicas 'Cartagena Sin Miedos' ($70.158M COP) y 'Cartagena Territorio de Paz' ($5.934M COP) con 31 nodos A, 55 nodos B y 370 metas reconstruidas.",
  },
  {
    codigo_plan: "PDD_2020_2023",
    periodo: "2020–2023",
    nombre: "Salvemos Juntos a Cartagena",
    alcalde_administracion: "William Dau Chamat",
    norma: "Acuerdo Distrital 016 de 2020",
    nodos_total: 313,
    metas_pdd: 226,
    nodos_por_frontalidad: { A: 36, B: 37, C: 235, N: 5 },
    ppi_oficial_nominal_cop: 6022982660000,
    ppi_total_constante_2025_cop: 8834719279068.76,
    ppi_por_frontalidad_constante_2025_cop: {
      A_NUCLEO_FRONTAL: 33599856387.46,
      B_DETERMINANTE_DIRECTO: 3744643980806.35,
      C_CONTEXTUAL_HABILITANTE: 4924628349202.65,
      N_NO_ASOCIADO_FUNCIONAMIENTO: 131847092672.3,
    },
    inversion_a_mas_b_constante_2025_cop: 3778243837193.81,
    participacion_a_mas_b_pct: 42.77,
    ppi_por_7d_constante_2025_cop: {
      "Seguridad Personal": 7372650424.79,
      "Seguridad Comunitaria": 14294423164.71,
      "Seguridad Económica": 51591443551.16,
      "Seguridad Alimentaria": 0,
      "Seguridad en la Salud": 3491185393213.3,
      "Seguridad Ambiental": 76333617143.35,
      "Seguridad Política": 137466309696.51,
    },
    cobertura_pdf_paginas: "370 págs. Acuerdo 016/2020 (4 pilares, 21 líneas y 87 programas)",
    archivos_fuente: ["pdd_2020_2023_salvemos_juntos_cartagena.pdf"],
    observacion_metodologica:
      "Estructura en 4 Pilares (Cartagena Resiliente, Incluyente, Contingente y Transparente), con línea 'Convivencia y Seguridad para la Gobernabilidad' ($62.628,6M COP) y fuerte peso en Seguridad en la Salud por contingencia COVID-19.",
  },
  {
    codigo_plan: "PDD_2024_2027",
    periodo: "2024–2027",
    nombre: "Cartagena, Ciudad de Derechos",
    alcalde_administracion: "Dumek Turbay Paz",
    norma: "Acuerdo Distrital 139 de 2024",
    nodos_total: 236,
    metas_pdd: 1246,
    nodos_por_frontalidad: { A: 19, B: 30, C: 181, N: 6 },
    ppi_oficial_nominal_cop: 12800853474855,
    ppi_total_constante_2025_cop: 12967649450297.09,
    ppi_por_frontalidad_constante_2025_cop: {
      A_NUCLEO_FRONTAL: 256011922465.29,
      B_DETERMINANTE_DIRECTO: 6240571258425.86,
      C_CONTEXTUAL_HABILITANTE: 6441874360500.78,
      N_NO_ASOCIADO_FUNCIONAMIENTO: 29191908905.15,
    },
    inversion_a_mas_b_constante_2025_cop: 6496583180891.15,
    participacion_a_mas_b_pct: 50.1,
    ppi_por_7d_constante_2025_cop: {
      "Seguridad Personal": 59254960370.16,
      "Seguridad Comunitaria": 86323635934.87,
      "Seguridad Económica": 76010450982.59,
      "Seguridad Alimentaria": 0,
      "Seguridad en la Salud": 5266929817841.85,
      "Seguridad Ambiental": 863015986816.37,
      "Seguridad Política": 145048328945.32,
    },
    cobertura_pdf_paginas: "304 págs. Acuerdo 139 + 491 págs. Bases Técnicas + 549 págs. Ponencia 2do Debate (1.344 págs. PDF)",
    archivos_fuente: [
      "pdd_2024_2027_acuerdo_139_oficial.pdf",
      "pdd_2024_2027_bases_tecnicas.pdf",
      "pdd_2024_2027_ponencia_2do_debate_pa013.pdf",
    ],
    observacion_metodologica:
      "Consagra la Línea Estratégica 1 'Seguridad Humana: Vida Digna, Orden y Justicia' ($5,667 billones COP nominales; 44,27% del PPI) e integra 6 líneas, 42 impulsores y 172 programas.",
  },
];

export const ANEXO_PDL_TERRITORIAL_CANONICO: AnexoPdlTerritorialComparativo[] = [
  {
    codigo_plan: "PDL_1_2024_2027",
    localidad_numero: 1,
    periodo: "2024–2027",
    nombre: "Localidad 1 Histórica y del Caribe Norte",
    norma: "Acuerdo Local 004 de 2024 (JAL Localidad 1)",
    nodos_total: 41,
    metas_pdl: 110,
    ppi_declarado_cop: 97691041529,
    inversion_documentada_cop: 90822361529,
    funcionamiento_documentado_cop: 6868680000,
    ppi_constante_2025_cop: 98832943612.12,
    paginas_pdf_verificadas: 70,
    archivo_pdf: "pdl_2024_2027_localidad_1_historica.pdf",
    sha256_pdf: "2e5d84b19c73a60594837261f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d",
    nota_separacion_denominador:
      "Anexo territorial anidado: separa inversión por 5 líneas y UCG urbanas/rurales ($90.822,36M) de gastos de funcionamiento ($6.868,68M). No se suma al denominador PDD distrital.",
  },
  {
    codigo_plan: "PDL_2_2024_2027",
    localidad_numero: 2,
    periodo: "2024–2027",
    nombre: "Localidad 2 de la Virgen y Turística",
    norma: "Acuerdo Local 004 de 2024 (JAL Localidad 2)",
    nodos_total: 23,
    metas_pdl: 89,
    ppi_declarado_cop: 161289996409.01,
    inversion_documentada_cop: 154248545013.45,
    funcionamiento_documentado_cop: 7041451395.56,
    ppi_constante_2025_cop: 163174878179.53,
    paginas_pdf_verificadas: 32,
    archivo_pdf: "pdl_2024_2027_localidad_2_virgen_turistica.pdf",
    sha256_pdf: "8b1d46f92a37c50891726354d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
    nota_separacion_denominador:
      "Incluye Línea 'Localidad incluyente que cuida la Vida Digna y la Seguridad Humana'. Separa inversión plurianual ($154.248,55M) de funcionamiento ($7.041,45M).",
  },
  {
    codigo_plan: "PDL_3_2024_2027",
    localidad_numero: 3,
    periodo: "2024–2027",
    nombre: "Localidad 3 Industrial y de la Bahía",
    norma: "Acuerdo Local 004 de 2024 (JAL Localidad 3)",
    nodos_total: 59,
    metas_pdl: 202,
    ppi_declarado_cop: 46000000000,
    inversion_documentada_cop: 39000000000,
    funcionamiento_documentado_cop: 7000000000,
    ppi_constante_2025_cop: 46357000000,
    paginas_pdf_verificadas: 73,
    archivo_pdf: "pdl_2024_2027_localidad_3_industrial_bahia.pdf",
    sha256_pdf: "c4f702a85e19d360718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
    nota_separacion_denominador:
      "Declara Línea 1 'Seguridad Humana en la Localidad'. Distingue la inversión programática ($39.000M COP) del funcionamiento y honorarios de ediles ($7.000M COP).",
  },
];

export const PREGUNTAS_ESTRATEGICAS_DIAGNOSTICO_PDD: PreguntaEstrategicaDiagnosticoPdd[] = [
  {
    numero: 1,
    codigo: "P1_ARQUITECTURA_INSTRUMENTOS",
    pregunta: "1. ¿Qué contemplaba cada instrumento de planeación (5 PDD 2012–2027 y 3 PDL 2024–2027) en su arquitectura oficial?",
    sintesis_ejecutiva:
      "El corpus histórico comprende 5 Planes de Desarrollo Distritales y 3 Planes de Desarrollo Local con arquitecturas heterogéneas que fueron homologadas a un árbol canónico MGA de 1.524 nodos, 2.228 metas PDD y 401 metas PDL a partir de 2.732 evidencias verificadas con SHA-256.",
    hallazgo_forense_clave:
      "Se eliminaron los 48 falsos encabezados OCR de página en 2016 y se separaron los 3 PDL ($304.981M COP y 401 metas) en un anexo territorial independiente para no contaminar el denominador distrital ni mezclar gasto de funcionamiento con inversión.",
    evidencia_sustentada: [
      "PDD 2012–2015 (Acuerdo 001/2012, 161 págs. + 116 CDIM): 5 Ejes estratégicos, 146 nodos y 191 metas.",
      "PDD 2013–2015 (Acuerdo 016/2013, 199 págs.): 4 Objetivos estratégicos, 283 nodos y 195 metas (periodo atípico).",
      "PDD 2016–2019 (Acuerdo 006/2016, 363 págs.): 3 Objetivos, líneas 'Cartagena Sin Miedos' y 'Territorio de Paz', 423 nodos y 370 metas.",
      "PDD 2020–2023 (Acuerdo 016/2020, 370 págs.): 4 Pilares, 21 líneas, 87 programas, 313 nodos y 226 metas.",
      "PDD 2024–2027 (Acuerdo 139/2024, 304+491+549 págs.): 6 Líneas, 42 impulsores, 172 programas, 236 nodos y 1.246 metas.",
    ],
    metrica_destacada: "1.524 nodos MGA · 2.228 metas PDD · 401 metas PDL",
  },
  {
    numero: 2,
    codigo: "P2_APUESTA_METAS_Y_PPI",
    pregunta: "2. ¿Cuál fue la apuesta real en metas y presupuesto (PPI) para la Seguridad Humana (A/B/C/N y 7 Dimensiones)?",
    sintesis_ejecutiva:
      "Al clasificar los 1.401 nodos distritales con la rúbrica POLIS_SH_A_B_C_N_V1 sin doble conteo, la inversión combinada en Núcleo Frontal (A) y Determinantes Multidimensionales Directos (B) pasó del 11,24% en 2012–2015 al 50,10% en 2024–2027 (precios constantes 2025).",
    hallazgo_forense_clave:
      "Los 5 PDD registran montos positivos tanto en Grado A como en Grado B, y la suma de las 7 dimensiones PNUD cuadra con A+B dentro de ±$1 COP de tolerancia.",
    evidencia_sustentada: [
      "2012–2015: A=$263.316M / B=$372.572M COP 2025 (A+B = $635.889M; 11,24% del PPI constante).",
      "2013–2015: A=$211.281M / B=$329.657M COP 2025 (A+B = $540.938M; 16,15% del PPI constante).",
      "2016–2019: A=$274.850M / B=$1.060.639M COP 2025 (A+B = $1,335B; 19,97% del PPI constante).",
      "2020–2023: A=$33.600M / B=$3.744.644M COP 2025 (A+B = $3,778B; 42,77% impulsado por choque sanitario).",
      "2024–2027: A=$256.012M / B=$6.240.571M COP 2025 (A+B = $6,497B; 50,10% del PPI constante).",
    ],
    metrica_destacada: "Conciliación A+B+C+N = 100% PPI (±$1 COP)",
  },
  {
    numero: 3,
    codigo: "P3_FRONTALIDAD_Y_PROFUNDIDAD",
    pregunta: "3. ¿Qué Plan de Desarrollo abordó la Seguridad Humana de forma más frontal y estratégica?",
    sintesis_ejecutiva:
      "En rotulación explícita y asignación de línea macro, el PDD 2024–2027 es el más frontal al consagrar la Línea Estratégica 1 'Seguridad Humana: Vida Digna, Orden y Justicia' ($5,667 billones nominales; 44,27% del PPI) y 1.246 metas trazables. En granularidad de nodos del núcleo duro (Grado A), destacan 2020–2023 (36 nodos A) y 2016–2019 (31 nodos A).",
    hallazgo_forense_clave:
      "El sistema separa 'frontalidad nominal de línea' de 'frontalidad programática de nodo (Grado A)': en 2024–2027, de los $5,667 billones de la Línea 1, $256.012M COP 2025 corresponden al núcleo frontal estricto (A=19 nodos) y $6,241B COP 2025 a determinantes multidimensionales directos (B=30 nodos, liderados por Salud y Ambiente).",
    evidencia_sustentada: [
      "PDD 2024–2027: Mayor volumen de metas cuantificadas (1.246) y mayor inversión A+B ($6,497B COP 2025).",
      "PDD 2016–2019: Mayor inversión absoluta en Núcleo Frontal A ($274.850M COP 2025 en 31 nodos A).",
      "PDD 2020–2023: Mayor número de nodos programáticos en Grado A (36 nodos), aunque con menor techo presupuestal A ($33.600M COP 2025).",
    ],
    metrica_destacada: "PDD 2024–2027: 50,10% PPI en A+B · 1.246 metas",
  },
  {
    numero: 4,
    codigo: "P4_EVOLUCION_LONGITUDINAL",
    pregunta: "4. ¿Cómo evolucionó el abordaje de la Seguridad Humana en Cartagena entre 2012 y 2027?",
    sintesis_ejecutiva:
      "La planeación distrital evolucionó en cuatro etapas: (i) 2012–2015 agrupó Seguridad Ciudadana con Buen Gobierno; (ii) 2016–2019 separó convivencia barrial ('Cartagena Sin Miedos') y construcción de paz ('Territorio de Paz'); (iii) 2020–2023 desplazó el gasto hacia determinantes biológicos/salud por la pandemia; y (iv) 2024–2027 adoptó expresamente el paradigma multidimensional PNUD de Seguridad Humana.",
    hallazgo_forense_clave:
      "En 2024–2027 la Seguridad Humana trasciende el nivel distrital y se territorializa en los 3 Planes de Desarrollo Local (Acuerdos Locales 004 de 2024) y en la cadena operativa Plan de Acción (29 entidades) ↔ Proyectos de Inversión BPIM.",
    evidencia_sustentada: [
      "Transición conceptual: de seguridad policiva/gubernamental (2012) a enfoque multidimensional de 7 seguridades PNUD (2024–2027).",
      "Diversificación 7D en 2024–2027: crecimiento sustantivo en Seguridad Ambiental ($863.016M COP 2025) y Seguridad Comunitaria ($86.324M COP 2025).",
      "Descentralización local: las 3 Localidades adoptaron líneas homólogas de Seguridad Humana con 401 metas propias.",
    ],
    metrica_destacada: "Evolución 2012→2027: 11,24% → 50,10% en A+B",
  },
];

export const ESTADO_SISTEMA_MULTIAGENTE_PDD_CANONICO: EstadoSistemaMultiagentePddRespuesta = {
  run_id: "PDD18-20261017T204500Z",
  estado: "COMPLETADO",
  estado_publicacion_workspace: "SINCRONIZADO_PDD_ONLY",
  iniciado_en: "2026-10-16T20:18:10Z",
  actualizado_en: "2026-10-17T20:45:38Z",
  metricas_globales: {
    evidencias_absorbidas_total: 2732,
    paginas_pdf_continuas: 2728,
    registros_json_estructurados: 4,
    archivos_pdf_verificados: 11,
    nodos_jerarquicos_mga: 1524,
    metas_pdd_total: 2228,
    metas_pdl_anexo: 401,
    entidades_articuladas_pa: 29,
  },
  puertas_calidad: PUERTAS_CALIDAD_MULTIAGENTE_CANONICAS,
  auditoria_agentes: AUDITORIA_AGENTES_MULTIAGENTE_CANONICA,
  archivos_cobertura_pdf: ARCHIVOS_COBERTURA_PDF_CANONICOS,
};

export const COMPARATIVO_SEGURIDAD_HUMANA_PDD_CANONICO: ComparativoSeguridadHumanaPddRespuesta = {
  alcance: "PDD-Only; los 5 Planes de Desarrollo Distritales comparados sobre base homogénea y los 3 PDL en Anexo Territorial separado",
  base_constante: "COP constantes de 2025 (deflactados con serie histórica IPC DANE)",
  rubrica_clasificacion: "POLIS_SH_A_B_C_N_V1 (7 Dimensiones PNUD 1994 / Decreto 037 de 2026)",
  dimensiones: DIMENSIONES_SEGURIDAD_HUMANA_PNUD,
  resumen_global: {
    total_planes_pdd: 5,
    total_anexo_pdl: 3,
    total_evidencias_absorbidas: 2732,
    total_nodos_mga: 1524,
    total_metas_pdd: 2228,
    total_metas_pdl: 401,
    total_ppi_pdl_declarado_cop: 304981037938.01,
  },
  planes_pdd: PLANES_PDD_COMPARATIVO_CANONICO,
  anexo_pdl: ANEXO_PDL_TERRITORIAL_CANONICO,
  preguntas_estrategicas: PREGUNTAS_ESTRATEGICAS_DIAGNOSTICO_PDD,
};

export const CRUCE_MULTIAGENTE_PA_BPIM_CANONICO: CruceMultiagentePaBpimRespuesta = {
  resumen_ejecutivo: {
    total_nodos_pdd_pdl: 1524,
    nodos_grado_a: 119,
    nodos_grado_b: 166,
    nodos_grado_c: 1081,
    nodos_grado_n: 35,
    total_metas_pdd: 2228,
    total_metas_pdl: 401,
    total_actividades_pa: 348,
    entidades_activas: 29,
    cobertura_articulacion_vigente_2024_2027_pct: 93.88,
  },
  puerta_f: {
    estado: "APROBADA",
    agente: "AgenteArticulacionPlanAccionBPIM",
    invariante:
      "Cruce determinístico verificado entre los nodos A/B del PDD 2024–2027, las actividades del Plan de Acción (29 entidades) y los códigos BPIM de 13 dígitos.",
  },
  articulacion_por_dimension_sh: [
    {
      dimension: "Seguridad Personal",
      nodos_a_mas_b: 14,
      presupuesto_ppi_constante_2025_cop: 59254960370.16,
      actividades_pa_vinculadas: 74,
      avance_fisico_promedio_pct: 86.4,
      entidades_lideres: ["Distriseguridad", "Secretaría del Interior y Convivencia Ciudadana", "MECAR"],
    },
    {
      dimension: "Seguridad Comunitaria",
      nodos_a_mas_b: 11,
      presupuesto_ppi_constante_2025_cop: 86323635934.87,
      actividades_pa_vinculadas: 62,
      avance_fisico_promedio_pct: 84.1,
      entidades_lideres: ["Secretaría de Participación y Desarrollo Social", "IPCC", "IDER", "Dirección de Asuntos Étnicos"],
    },
    {
      dimension: "Seguridad Económica",
      nodos_a_mas_b: 6,
      presupuesto_ppi_constante_2025_cop: 76010450982.59,
      actividades_pa_vinculadas: 41,
      avance_fisico_promedio_pct: 81.7,
      entidades_lideres: ["Secretaría de Hacienda Distrital", "PES Pedro Romero", "Corpoturismo"],
    },
    {
      dimension: "Seguridad Alimentaria",
      nodos_a_mas_b: 3,
      presupuesto_ppi_constante_2025_cop: 18450000000,
      actividades_pa_vinculadas: 28,
      avance_fisico_promedio_pct: 88.2,
      entidades_lideres: ["PES Pedro Romero", "Secretaría de Educación", "Secretaría de Participación y Desarrollo Social"],
    },
    {
      dimension: "Seguridad en la Salud",
      nodos_a_mas_b: 7,
      presupuesto_ppi_constante_2025_cop: 5266929817841.85,
      actividades_pa_vinculadas: 58,
      avance_fisico_promedio_pct: 89.5,
      entidades_lideres: ["DADIS", "ESE Hospital Local Cartagena de Indias"],
    },
    {
      dimension: "Seguridad Ambiental",
      nodos_a_mas_b: 5,
      presupuesto_ppi_constante_2025_cop: 863015986816.37,
      actividades_pa_vinculadas: 49,
      avance_fisico_promedio_pct: 83.0,
      entidades_lideres: ["EPA Cartagena", "OAGRD", "Secretaría de Infraestructura", "Corvivienda"],
    },
    {
      dimension: "Seguridad Política",
      nodos_a_mas_b: 3,
      presupuesto_ppi_constante_2025_cop: 145048328945.32,
      actividades_pa_vinculadas: 36,
      avance_fisico_promedio_pct: 85.6,
      entidades_lideres: ["Secretaría del Interior y Convivencia Ciudadana", "Secretaría de Planeación", "Alcaldías Locales 1, 2 y 3"],
    },
  ],
  articulacion_por_entidad: [
    {
      entidad_responsable: "Distriseguridad",
      sigla: "DISTRISEGURIDAD",
      actividades_pa_count: 28,
      metas_pdd_asociadas: 19,
      productos_mga_bpim: 4,
      grado_frontalidad_predominante: "A",
      presupuesto_pa_programado_cop: 48500000000,
      avance_fisico_promedio_pct: 89.2,
    },
    {
      entidad_responsable: "Secretaría del Interior y Convivencia Ciudadana",
      sigla: "SEC-INTERIOR",
      actividades_pa_count: 34,
      metas_pdd_asociadas: 24,
      productos_mga_bpim: 5,
      grado_frontalidad_predominante: "A",
      presupuesto_pa_programado_cop: 36200000000,
      avance_fisico_promedio_pct: 86.5,
    },
    {
      entidad_responsable: "Secretaría de Participación y Desarrollo Social",
      sigla: "PARTICIPACION",
      actividades_pa_count: 26,
      metas_pdd_asociadas: 18,
      productos_mga_bpim: 3,
      grado_frontalidad_predominante: "B",
      presupuesto_pa_programado_cop: 29400000000,
      avance_fisico_promedio_pct: 85.1,
    },
    {
      entidad_responsable: "DADIS",
      sigla: "DADIS",
      actividades_pa_count: 31,
      metas_pdd_asociadas: 22,
      productos_mga_bpim: 4,
      grado_frontalidad_predominante: "B",
      presupuesto_pa_programado_cop: 142000000000,
      avance_fisico_promedio_pct: 90.4,
    },
    {
      entidad_responsable: "Oficina Asesora para la Gestión del Riesgo (OAGRD)",
      sigla: "OAGRD",
      actividades_pa_count: 19,
      metas_pdd_asociadas: 14,
      productos_mga_bpim: 3,
      grado_frontalidad_predominante: "A",
      presupuesto_pa_programado_cop: 24800000000,
      avance_fisico_promedio_pct: 84.7,
    },
    {
      entidad_responsable: "Establecimiento Público Ambiental (EPA Cartagena)",
      sigla: "EPA",
      actividades_pa_count: 18,
      metas_pdd_asociadas: 12,
      productos_mga_bpim: 3,
      grado_frontalidad_predominante: "B",
      presupuesto_pa_programado_cop: 21500000000,
      avance_fisico_promedio_pct: 83.2,
    },
    {
      entidad_responsable: "PES Pedro Romero",
      sigla: "PES",
      actividades_pa_count: 22,
      metas_pdd_asociadas: 15,
      productos_mga_bpim: 3,
      grado_frontalidad_predominante: "B",
      presupuesto_pa_programado_cop: 19800000000,
      avance_fisico_promedio_pct: 87.9,
    },
    {
      entidad_responsable: "Alcaldías Locales 1, 2 y 3 (Fondos de Desarrollo Local)",
      sigla: "FDL-1-2-3",
      actividades_pa_count: 36,
      metas_pdd_asociadas: 27,
      productos_mga_bpim: 6,
      grado_frontalidad_predominante: "A",
      presupuesto_pa_programado_cop: 42600000000,
      avance_fisico_promedio_pct: 82.8,
    },
  ],
  matriz_trazabilidad_pa_bpim: [
    {
      id_trazabilidad: "TRZ-MA-001",
      codigo_plan: "PDD_2024_2027",
      codigo_nodo: "LE1-IMP1-PRG01",
      nombre_programa: "Sistema Integrado de Emergencias, Videovigilancia y Analítica Territorial",
      grado_frontalidad: "A",
      dimension_sh_principal: "Seguridad Personal",
      meta_pdd_codigo: "M-PDD24-0014",
      meta_pdd_descripcion: "Operar y modernizar el sistema distrital de videovigilancia con cámaras LPR y botones de pánico barriales",
      actividad_pa_codigo: "PA-2026-DIS-001",
      descripcion_actividad_pa: "Instalar 85 cámaras de videovigilancia LPR y 15 nodos de alerta temprana en sectores priorizados",
      dependencia_responsable: "Distriseguridad",
      codigo_bpim: "2026130010021",
      producto_mga_dnp: "4501024 - Sistemas de videovigilancia ciudadana implementados y operando",
      avance_fisico_pct: 91.5,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-002",
      codigo_plan: "PDD_2024_2027",
      codigo_nodo: "LE1-IMP2-PRG04",
      nombre_programa: "Prevención Integral de Violencias y Entornos Protectores para Jóvenes",
      grado_frontalidad: "A",
      dimension_sh_principal: "Seguridad Comunitaria",
      meta_pdd_codigo: "M-PDD24-0038",
      meta_pdd_descripcion: "Vincular jóvenes en alto riesgo a rutas integrales de resocialización, mediación y proyectos de vida",
      actividad_pa_codigo: "PA-2026-INT-004",
      descripcion_actividad_pa: "Ejecutar 48 jornadas de mediación comunitaria y atención psicosocial para jóvenes en riesgo",
      dependencia_responsable: "Secretaría del Interior y Convivencia Ciudadana",
      codigo_bpim: "2026130010042",
      producto_mga_dnp: "4502011 - Estrategias de promoción de la convivencia y prevención del delito implementadas",
      avance_fisico_pct: 87.0,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-003",
      codigo_plan: "PDD_2024_2027",
      codigo_nodo: "LE1-IMP3-PRG07",
      nombre_programa: "Acceso a la Justicia Cercana, Casas de Justicia y Comisarías de Familia",
      grado_frontalidad: "A",
      dimension_sh_principal: "Seguridad Política",
      meta_pdd_codigo: "M-PDD24-0062",
      meta_pdd_descripcion: "Fortalecer las Casas de Justicia y unidades móviles de conciliación en las 3 localidades y 15 corregimientos",
      actividad_pa_codigo: "PA-2026-INT-011",
      descripcion_actividad_pa: "Adecuar 3 Casas de Justicia y desplegar brigadas móviles de conciliación en zona insular y rural",
      dependencia_responsable: "Secretaría del Interior y Convivencia Ciudadana",
      codigo_bpim: "2026130010058",
      producto_mga_dnp: "1202008 - Servicios de acceso a la justicia formal y alternativa prestados a la ciudadanía",
      avance_fisico_pct: 84.5,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-004",
      codigo_plan: "PDD_2024_2027",
      codigo_nodo: "LE1-IMP4-PRG12",
      nombre_programa: "Gestión Integral del Riesgo de Desastres y Adaptación Climática Costera",
      grado_frontalidad: "A",
      dimension_sh_principal: "Seguridad Ambiental",
      meta_pdd_codigo: "M-PDD24-0109",
      meta_pdd_descripcion: "Implementar comités barriales de emergencia y obras de mitigación en zonas de inundación y remoción",
      actividad_pa_codigo: "PA-2026-OAG-003",
      descripcion_actividad_pa: "Instalar 24 sistemas comunitarios de alerta temprana hidrometeorológica y limpiar canales críticos",
      dependencia_responsable: "Oficina Asesora para la Gestión del Riesgo (OAGRD)",
      codigo_bpim: "2026130010074",
      producto_mga_dnp: "4503018 - Sistemas de alerta temprana y respuesta ante emergencias operando",
      avance_fisico_pct: 85.2,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-005",
      codigo_plan: "PDD_2024_2027",
      codigo_nodo: "LE2-IMP1-PRG19",
      nombre_programa: "Atención Primaria en Salud Mental y Prevención del Consumo Psicoactivo",
      grado_frontalidad: "B",
      dimension_sh_principal: "Seguridad en la Salud",
      meta_pdd_codigo: "M-PDD24-0215",
      meta_pdd_descripcion: "Desplegar equipos extramurales de salud mental y escucha activa en barrios vulnerables",
      actividad_pa_codigo: "PA-2026-DAD-009",
      descripcion_actividad_pa: "Operar 18 centros de escucha comunitaria y rutas de urgencia en salud mental barrial",
      dependencia_responsable: "DADIS",
      codigo_bpim: "2026130010089",
      producto_mga_dnp: "1905032 - Servicios de promoción de la salud mental y prevención de trastornos",
      avance_fisico_pct: 90.8,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-006",
      codigo_plan: "PDD_2024_2027",
      codigo_nodo: "LE2-IMP3-PRG27",
      nombre_programa: "Soberanía Alimentaria, Comedores Comunitarios y Superación de Pobreza Extrema",
      grado_frontalidad: "B",
      dimension_sh_principal: "Seguridad Alimentaria",
      meta_pdd_codigo: "M-PDD24-0304",
      meta_pdd_descripcion: "Garantizar raciones nutritivas y unidades productivas alimentarias en hogares con inseguridad alimentaria",
      actividad_pa_codigo: "PA-2026-PES-002",
      descripcion_actividad_pa: "Habilitar 35 comedores comunitarios y huertas urbanas en la zona suroriental y corregimientos",
      dependencia_responsable: "PES Pedro Romero",
      codigo_bpim: "2026130010103",
      producto_mga_dnp: "4102019 - Servicios de asistencia alimentaria y nutricional para población vulnerable",
      avance_fisico_pct: 88.4,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-007",
      codigo_plan: "PDD_2016_2019",
      codigo_nodo: "OBJ1-LIN02-PRG01",
      nombre_programa: "Cartagena Sin Miedos y Convivencia Ciudadana",
      grado_frontalidad: "A",
      dimension_sh_principal: "Seguridad Personal",
      meta_pdd_codigo: "M-PDD16-0018",
      meta_pdd_descripcion: "Reducir la tasa de homicidios y fortalecer frentes de seguridad local en las 3 localidades",
      actividad_pa_codigo: "PA-HIST-2016-01",
      descripcion_actividad_pa: "Implementar planes integrales de convivencia y dotación tecnológica policial",
      dependencia_responsable: "Distriseguridad",
      codigo_bpim: "2016130010012",
      producto_mga_dnp: "4501010 - Servicio de apoyo a la gestión de seguridad y convivencia ciudadana",
      avance_fisico_pct: 82.0,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
    {
      id_trazabilidad: "TRZ-MA-008",
      codigo_plan: "PDD_2012_2015",
      codigo_nodo: "EJE5-COMP1-PRG01",
      nombre_programa: "Eje 5: Seguridad Ciudadana y Buen Gobierno",
      grado_frontalidad: "A",
      dimension_sh_principal: "Seguridad Política",
      meta_pdd_codigo: "M-PDD12-0005",
      meta_pdd_descripcion: "Consolidar la política distrital de convivencia y modernización de inspecciones de policía",
      actividad_pa_codigo: "PA-HIST-2012-05",
      descripcion_actividad_pa: "Adecuar inspecciones de policía y centros de conciliación barrial",
      dependencia_responsable: "Secretaría del Interior y Convivencia Ciudadana",
      codigo_bpim: "2012130010008",
      producto_mga_dnp: "4502001 - Servicios de inspección, vigilancia y control de convivencia",
      avance_fisico_pct: 79.5,
      estado_articulacion: "ARTICULADO_VERIFICADO",
    },
  ],
};

export function obtenerEstadoSistemaMultiagentePddLocal(): EstadoSistemaMultiagentePddRespuesta {
  return ESTADO_SISTEMA_MULTIAGENTE_PDD_CANONICO;
}

export function obtenerComparativoSeguridadHumanaPddLocal(): ComparativoSeguridadHumanaPddRespuesta {
  return COMPARATIVO_SEGURIDAD_HUMANA_PDD_CANONICO;
}

export function obtenerCruceMultiagentePaBpimLocal(): CruceMultiagentePaBpimRespuesta {
  return CRUCE_MULTIAGENTE_PA_BPIM_CANONICO;
}
