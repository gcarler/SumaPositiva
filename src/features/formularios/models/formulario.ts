export type TipoPregunta =
  | "texto_corto"
  | "texto_largo"
  | "opcion_unica"
  | "opcion_multiple"
  | "lista_desplegable"
  | "likert"
  | "escala_lineal"
  | "fecha"
  | "hora"
  | "numero"
  | "carga_archivo"
  | "seccion"
  | "descripcion";

export const TIPOS_PREGUNTA: Record<TipoPregunta, string> = {
  texto_corto: "Texto corto",
  texto_largo: "Texto largo",
  opcion_unica: "Opción única",
  opcion_multiple: "Opción múltiple",
  lista_desplegable: "Lista desplegable",
  likert: "Likert",
  escala_lineal: "Escala lineal",
  fecha: "Fecha",
  hora: "Hora",
  numero: "Número",
  carga_archivo: "Archivo",
  seccion: "Sección",
  descripcion: "Descripción",
};
export interface OpcionRespuesta {
  id: string;
  texto: string;
  esOtro?: boolean;
}
export interface ValidacionCampo {
  obligatoria?: boolean;
  minLongitud?: number;
  maxLongitud?: number;
  minValor?: number;
  maxValor?: number;
  patron?: string;
  mensajeError?: string;
}
export interface LogicaCondicional {
  preguntaOrigenId: string;
  operador: "igual" | "no_igual" | "contiene" | "mayor_que" | "menor_que";
  valor: string;
  accion: "mostrar" | "ocultar" | "ir_a_seccion";
  preguntaDestinoId?: string;
  seccionDestinoId?: string;
}
export interface PreguntaFormulario {
  id: string;
  tipo: TipoPregunta;
  texto: string;
  descripcion?: string;
  placeholder?: string;
  imagenUrl?: string;
  obligatoria: boolean;
  opciones?: OpcionRespuesta[];
  opcionesAleatorias?: boolean;
  validacion?: ValidacionCampo;
  logica?: LogicaCondicional[];
  escalaMin?: number;
  escalaMax?: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
  paso?: number;
  tiposArchivo?: "imagen" | "pdf" | "cualquiera";
  enfoqueDiferencial?: boolean;
  orden: number;
  seccionId?: string;
}
export interface SeccionFormulario {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
}
export interface ConfiguracionFormulario {
  mensajeConfirmacion: string;
  limiteRespuestas?: number;
  fechaCierre?: string;
  permitirEdicion: boolean;
  requiereAutenticacion: boolean;
  mostrarBarraProgreso: boolean;
  ordenAleatorio: boolean;
}
export interface Formulario {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "borrador" | "activo" | "cerrado";
  secciones: SeccionFormulario[];
  preguntas: PreguntaFormulario[];
  configuracion: ConfiguracionFormulario;
  respuestasCount: number;
  creadoEn: string;
  actualizadoEn: string;
}
export type ValoresRespuesta = Record<string, string | string[]>;
export interface RespuestaCiudadana {
  id: string;
  formularioId: string;
  sesionId?: string;
  respuestas: ValoresRespuesta;
  enviadoEn: string;
  enfoqueDiferencial?: string;
}
export interface ArchivoRespuesta {
  nombre: string;
  tipo: string;
  bytes: number;
  contenido: string;
}
export interface RespuestaAnalitica {
  preguntaId: string;
  conteo: Record<string, number>;
  total: number;
  promedioLikert?: number;
  promedio?: number;
  minimo?: number;
  maximo?: number;
  ultimas: string[];
}
export interface AnaliticaFormulario {
  formularioId: string;
  totalRespuestas: number;
  porEnfoqueDiferencial: Record<string, number>;
  respuestasPorPregunta: RespuestaAnalitica[];
}
export const CONFIGURACION_INICIAL: ConfiguracionFormulario = {
  mensajeConfirmacion:
    "Gracias por participar. Tu respuesta de prueba ha sido recibida.",
  permitirEdicion: false,
  requiereAutenticacion: false,
  mostrarBarraProgreso: true,
  ordenAleatorio: false,
};
export type DatosFormulario = Omit<
  Formulario,
  "id" | "creadoEn" | "actualizadoEn" | "respuestasCount"
>;
export function formularioVacio(): Formulario {
  return {
    id: "nuevo",
    titulo: "",
    descripcion: "",
    estado: "borrador",
    secciones: [],
    preguntas: [],
    configuracion: { ...CONFIGURACION_INICIAL },
    respuestasCount: 0,
    creadoEn: "",
    actualizadoEn: "",
  };
}
