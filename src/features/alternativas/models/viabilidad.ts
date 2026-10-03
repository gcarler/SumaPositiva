export type NivelCompetencia =
  | "distrital"
  | "concurrente"
  | "departamental"
  | "nacional"
  | "no_determinada";

export type RiesgoFiscal = "bajo" | "medio" | "alto" | "inviable";

export type TipoVigenciaFutura = "ordinaria" | "excepcional" | "no_aplica";

export type VeredictoViabilidad =
  | "VIABLE"
  | "VIABLE CON CONDICIONES"
  | "INVIABLE";

export interface AlertaConsultaPrevia {
  requiere_consulta_previa: boolean;
  comunidades_etnicas_identificadas: string[];
  territorios_colectivos_involucrados: string[];
  criterio_afectacion_directa: string;
  requiere_clpi: boolean;
  fundamento_constitucional: string;
}

export interface ControlRegresividadDESCA {
  existe_riesgo_regresividad: boolean;
  derechos_analizados: string[];
  supera_test_progresividad: boolean;
  fundamento_jurisprudencial: string;
  advertencias_constitucionales: string[];
}

export interface EntradaJuridica {
  politica_id: string;
  titulo: string;
  descripcion: string;
  lineas_accion: string[];
  territorios_afectados: string[];
  es_territorio_etnico: boolean;
  poblacion_objetivo: string;
  modifica_beneficios_existentes: boolean;
  sector_tematico: string;
}

export interface ResultadoJuridico {
  evaluacion_id: string;
  politica_id: string;
  es_viable: boolean;
  nivel_competencia: NivelCompetencia;
  fundamento_competencia: string;
  es_competencia_distrital_cartagena: boolean;
  alerta_consulta_previa: AlertaConsultaPrevia;
  control_regresividad: ControlRegresividadDESCA;
  instrumento_adopcion_recomendado: string;
  recomendaciones_juridicas: string[];
  concepto_juridico_motivado: string;
}

export interface DesgloseFuente {
  fuente: string;
  porcentaje: number;
  monto_estimado_cop: number;
  base_legal: string;
  destinacion_permitida: string;
}

export interface AlertaVigenciasFuturas {
  tipo_vigencia: TipoVigenciaFutura;
  trasciende_periodo_gobierno: boolean;
  requiere_acuerdo_concejo: boolean;
  requiere_aval_confis: boolean;
  ano_maximo_compromiso_concejo: string;
  fundamento_legal: string;
  condiciones_excepcionales_cumplidas: string[];
}

export interface EntradaFiscal {
  politica_id: string;
  titulo: string;
  costo_estimado_total_cop: number;
  horizonte_anos: number;
  sector_inversion: string;
  fuentes_propuestas: string[];
  cuenta_con_declaratoria_estrategica: boolean;
}

export interface ResultadoFiscal {
  evaluacion_id: string;
  politica_id: string;
  es_viable: boolean;
  riesgo_fiscal: RiesgoFiscal;
  costo_total_validado_cop: number;
  fuentes_recomendadas: DesgloseFuente[];
  alerta_vigencias_futuras: AlertaVigenciasFuturas;
  consistencia_mfmp: boolean;
  requiere_codigo_bpin_bpit: boolean;
  recomendaciones_presupuestales: string[];
  dictamen_fiscal_motivado: string;
}

export interface EvaluacionViabilidadIntegral {
  alternativaId: string;
  codigoAlternativa: string;
  nombreAlternativa: string;
  fechaEvaluacion: string;
  veredictoConsolidado: VeredictoViabilidad;
  juridico: ResultadoJuridico;
  fiscal: ResultadoFiscal;
}
