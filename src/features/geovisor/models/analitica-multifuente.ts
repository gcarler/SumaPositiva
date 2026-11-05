export interface FiltrosAnaliticaMultifuente {
  codigo_territorio?: string;
  fuente_datos?: string;
  dimension?: string;
  anio_desde?: number;
  anio_hasta?: number;
  busqueda?: string;
  incluir_ediciones_previas?: boolean;
}

export interface OpcionAnalitica {
  id: string;
  nombre: string;
  total: number;
}

export interface SerieMultifuenteResumen {
  id: string;
  codigo_indicador: string;
  nombre: string;
  fuente: string;
  unidad: string;
  territorio_id: string;
  codigo_territorio: string;
  territorio: string;
  escala: string;
  dimension: string | null;
  subtipo: string;
  total: number;
  anios: number[];
  advertencias: string[];
}

export interface PuntoMultifuente {
  observacion_id: string;
  anio: number;
  valor: number | null;
  valor_original: string;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  tipo_periodo: string;
  completo: boolean | null;
  provisional: boolean;
  url_fuente: string | null;
  sha256: string | null;
  fecha_extraccion: string | null;
  referencia: string | null;
  nota: string | null;
  estado_validacion: string | null;
  estado_publicacion: string | null;
  universo: string | null;
  metodo: string | null;
  advertencias: string[];
}

export interface SerieMultifuenteDetalle {
  resumen: SerieMultifuenteResumen;
  puntos: PuntoMultifuente[];
  minimo: number | null;
  maximo: number | null;
  mediana: number | null;
  variacion_interanual_pct: number | null;
  motivo_variacion: string;
}

export interface ComparacionMultifuente {
  serie_x: string;
  serie_y: string;
  pares: {
    anio: number;
    x: number;
    y: number;
    observacion_x: string;
    observacion_y: string;
    elegible: boolean;
    motivos: string[];
  }[];
  anios_sin_pareja: number[];
  muestra_total: number;
  muestra_elegible: number;
  pearson: number | null;
  spearman: number | null;
  estado: string;
  motivos: string[];
  interpretacion: string;
}

export interface AnaliticaMultifuente {
  version_metodo: string;
  consulta_sha256: string;
  total_observaciones: number;
  observaciones_excluidas: number;
  fuentes: OpcionAnalitica[];
  territorios: OpcionAnalitica[];
  dimensiones: OpcionAnalitica[];
  anios: number[];
  cobertura_fuentes: OpcionAnalitica[];
  series: SerieMultifuenteResumen[];
  serie: SerieMultifuenteDetalle | null;
  serie_comparada: SerieMultifuenteDetalle | null;
  comparacion: ComparacionMultifuente | null;
  advertencias: string[];
}
