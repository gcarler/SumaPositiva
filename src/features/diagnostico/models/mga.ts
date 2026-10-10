/**
 * POLIS — Modelos para Árbol de Problemas y Objetivos (Marco Lógico)
 * Articulado con backend FastAPI (/api/v1/instrumentos y /api/v1/ia/diagnostico).
 */

export type TipoInstrumentoMGA = "ARBOL_PROBLEMAS" | "ARBOL_OBJETIVOS";

export type EstadoInstrumentoMGA =
  | "EN_CONSTRUCCION"
  | "VALIDADO"
  | "CONVERTIDO"
  | "APROBADO";

export type TipoNodoMGA =
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

export interface InstrumentoMGA {
  id: string;
  tipo_instrumento: TipoInstrumentoMGA;
  nombre: string;
  descripcion: string | null;
  mesa_id: string | null;
  linea_id: string | null;
  estado: EstadoInstrumentoMGA;
  metadatos: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
  version_seq?: number;
}

export interface NodoArbolMGA {
  id: string;
  tipo_nodo: TipoNodoMGA | string;
  tipo_relacion: string;
  nivel: number;
  orden: number;
  contenido: string;
  nodo_padre_id: string | null;
  nodo_origen_id?: string | null;
  metadatos?: Record<string, unknown>;
  hijos: NodoArbolMGA[];
  version_seq?: number;
  etag?: string | null;
}

export interface ArbolMGARespuesta {
  instrumento: InstrumentoMGA;
  nodo_central: NodoArbolMGA | null;
  causas_o_medios: NodoArbolMGA[];
  efectos_o_fines: NodoArbolMGA[];
  total_nodos: number;
}

export interface ValidacionSintaxisNodo {
  texto_original: string;
  cumple_sintaxis: boolean;
  tipo_nodo: TipoNodoMGA | string;
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

export type TipoRelacionMGA = "CENTRAL" | "CAUSA" | "EFECTO" | "MEDIO" | "FIN";

export interface NodoInstrumentoCrear {
  tipo_nodo: TipoNodoMGA;
  contenido: string;
  nodo_padre_id?: string | null;
  tipo_relacion?: TipoRelacionMGA | string | null;
  nivel?: number | null;
  orden?: number;
  metadatos?: Record<string, unknown>;
}

export interface NodoInstrumentoActualizar {
  contenido?: string | null;
  tipo_nodo?: TipoNodoMGA | null;
  nodo_padre_id?: string | null;
  orden?: number | null;
  metadatos?: Record<string, unknown> | null;
  version_esperada?: number | null;
  version_seq?: number | null;
}

