export type TipoIndicador = "insumo" | "producto" | "resultado" | "impacto";
export type SentidoEsperado = "ascendente" | "descendente";

export interface FichaIndicador {
  id: string;
  codigo: string;
  nombre: string;
  tipo_indicador: TipoIndicador;
  linea_estrategica_id?: string | null;
  dimension_id?: string | null;
  nodo_instrumento_id?: string | null;
  definicion: string;
  metodo_calculo: string;
  unidad_medida: string;
  sentido_esperado: SentidoEsperado;
  periodicidad: string;
  linea_base_valor: string | number;
  linea_base_anio: number;
  meta_cuatrienio: string | number;
  meta_anualizada?: Record<string, unknown>;
  fuente_datos: string;
  responsable_reporte: string;
  metadatos?: Record<string, unknown>;
  valor_actual: string | number;
  porcentaje_avance: string | number;
  creado_en?: string;
  actualizado_en?: string;
}

export interface MedicionIndicadorCrear {
  periodo: string;
  fecha_corte: string; // YYYY-MM-DD
  valor_medido: number;
  observaciones?: string;
  evidencia_documental_url?: string;
  registrado_por: string;
}

export interface MedicionIndicadorRespuesta extends MedicionIndicadorCrear {
  id: string;
  indicador_id: string;
  avance_acumulado: number | string;
  creado_en: string;
  actualizado_en: string;
}

export interface FichaIndicadorCrearPayload {
  codigo: string;
  nombre: string;
  tipo_indicador: TipoIndicador;
  linea_estrategica_id?: string | null;
  dimension_id?: string | null;
  nodo_instrumento_id?: string | null;
  definicion: string;
  metodo_calculo: string;
  unidad_medida: string;
  sentido_esperado?: SentidoEsperado;
  periodicidad: string;
  linea_base_valor: number | string;
  linea_base_anio: number;
  meta_cuatrienio: number | string;
  meta_anualizada?: Record<string, unknown>;
  fuente_datos: string;
  responsable_reporte: string;
  metadatos?: Record<string, unknown>;
}

export interface FichaIndicadorActualizarPayload {
  responsable_reporte?: string | null;
  fuente_datos?: string | null;
  periodicidad?: string | null;
  metadatos?: Record<string, unknown> | null;
}

