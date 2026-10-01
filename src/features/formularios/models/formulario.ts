export type TipoPregunta = "texto_corto" | "texto_largo" | "opcion_unica" | "opcion_multiple" | "likert";

export interface OpcionRespuesta {
  id: string;
  texto: string;
}

export interface PreguntaFormulario {
  id: string;
  tipo: TipoPregunta;
  texto: string;
  obligatoria: boolean;
  opciones?: OpcionRespuesta[];
  enfoqueDiferencial?: boolean;
}

export interface Formulario {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "borrador" | "activo" | "cerrado";
  preguntas: PreguntaFormulario[];
  respuestasCount: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface RespuestaAnalitica {
  preguntaId: string;
  conteo: Record<string, number>; // Para opciones únicas o múltiples: { "opcion_1": 15, "opcion_2": 8 }
  promedioLikert?: number;
}

export interface AnaliticaFormulario {
  formularioId: string;
  totalRespuestas: number;
  porEnfoqueDiferencial: Record<string, number>; // Ej: { "Ley 1448/11": 120, "Ninguno": 300 }
  respuestasPorPregunta: RespuestaAnalitica[];
}
