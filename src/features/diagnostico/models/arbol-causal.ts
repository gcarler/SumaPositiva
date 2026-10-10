/**
 * POLIS — Modelos para Árbol Causal y de Objetivos (Marco Lógico Distrital)
 * Articulado con backend FastAPI (/api/v1/instrumentos y /api/v1/ia/diagnostico).
 */

export type TipoInstrumentoCausal = "ARBOL_PROBLEMAS" | "ARBOL_OBJETIVOS";
export type TipoInstrumentoMGA = TipoInstrumentoCausal;

export type EstadoInstrumentoCausal =
  | "EN_CONSTRUCCION"
  | "VALIDADO"
  | "CONVERTIDO"
  | "APROBADO";
export type EstadoInstrumentoMGA = EstadoInstrumentoCausal;

export type TipoNodoCausal =
  | "PROBLEMA_CENTRAL"
  | "CAUSA_DIRECTA"
  | "CAUSA_INDIRECTA"
  | "EFECTO_DIRECTO"
  | "EFECTO_INDIRECTO"
  | "OBJETIVO_CENTRAL"
  | "MEDIO_DIRECTO"
  | "MEDIO_INDIRECTO"
  | "FIN_DIRECTO"
  | "FIN_INDIRECTO";
export type TipoNodoMGA = TipoNodoCausal;

export interface InstrumentoCausal {
  id: string;
  tipo_instrumento: TipoInstrumentoCausal;
  nombre: string;
  descripcion: string | null;
  mesa_id: string | null;
  linea_id: string | null;
  estado: EstadoInstrumentoCausal;
  metadatos: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
  version_seq?: number;
}
export type InstrumentoMGA = InstrumentoCausal;

export interface NodoArbolCausal {
  id: string;
  tipo_nodo: TipoNodoCausal | string;
  tipo_relacion: string;
  nivel: number;
  orden: number;
  contenido: string;
  nodo_padre_id: string | null;
  nodo_origen_id?: string | null;
  metadatos?: Record<string, unknown>;
  hijos: NodoArbolCausal[];
  version_seq?: number;
  etag?: string | null;
}
export type NodoArbolMGA = NodoArbolCausal;

export interface ArbolCausalRespuesta {
  instrumento: InstrumentoCausal;
  nodo_central: NodoArbolCausal | null;
  causas_o_medios: NodoArbolCausal[];
  efectos_o_fines: NodoArbolCausal[];
  total_nodos: number;
}
export type ArbolMGARespuesta = ArbolCausalRespuesta;

export interface ValidacionSintaxisNodo {
  texto_original: string;
  cumple_sintaxis: boolean;
  tipo_nodo: TipoNodoCausal | string;
  sintaxis_esperada: string;
  texto_corregido_sugerido: string;
  observacion_metodologica: string;
}

export interface EntradaDiagnostico {
  politica_id?: string;
  titulo: string;
  problema_central: string;
  causas_directas: string[];
  causas_indirectas: string[];
  efectos_directos: string[];
  efectos_indirectos: string[];
  propuestas_ciudadanas_raw?: string[];
}

export interface ResultadoDiagnostico {
  evaluacion_id: string;
  politica_id: string;
  es_valido: boolean;
  puntaje_coherencia: number;
  analisis_sintaxis: ValidacionSintaxisNodo[];
  problema_central_optimizado: string;
  objetivo_central_derivado: string;
  arbol_problemas_estructurado: Record<string, unknown>;
  arbol_objetivos_derivado: Record<string, unknown>;
  recomendaciones_dnp: string[];
  resumen_ejecutivo: string;
}

export type TipoRelacionCausal = "CENTRAL" | "CAUSA" | "EFECTO" | "MEDIO" | "FIN";
export type TipoRelacionMGA = TipoRelacionCausal;

export interface NodoInstrumentoCrear {
  tipo_nodo: TipoNodoCausal;
  contenido: string;
  nodo_padre_id?: string | null;
  tipo_relacion?: TipoRelacionCausal | string | null;
  nivel?: number | null;
  orden?: number;
  metadatos?: Record<string, unknown>;
}

export interface NodoInstrumentoActualizar {
  contenido?: string | null;
  tipo_nodo?: TipoNodoCausal | null;
  nodo_padre_id?: string | null;
  orden?: number | null;
  metadatos?: Record<string, unknown> | null;
  version_esperada?: number | null;
  version_seq?: number | null;
}
