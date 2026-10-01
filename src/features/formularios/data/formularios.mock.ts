import { BARRIOS_CARTAGENA } from "@/features/geovisor/data/barrios.data";
import {
  CONFIGURACION_INICIAL,
  type Formulario,
  type RespuestaCiudadana,
} from "../models/formulario";
const fecha = "2026-10-01T00:00:00.000Z";
const dimensiones = [
  "Económica",
  "Alimentaria",
  "Salud",
  "Ambiental",
  "Personal",
  "Comunitaria",
  "Política",
];
export const FORMULARIOS_MOCK: Formulario[] = [
  {
    id: "f1",
    titulo: "Diagnóstico de Seguridad en mi Barrio",
    descripcion:
      "Instrumento de prueba para conocer las condiciones de Seguridad Humana en el territorio.",
    estado: "activo",
    secciones: [
      {
        id: "territorio",
        titulo: "Datos del Territorio",
        descripcion: "Identifica el entorno de tu comunidad.",
        orden: 0,
      },
      {
        id: "experiencia",
        titulo: "Tu Experiencia",
        descripcion: "Comparte tus percepciones y experiencias de seguridad.",
        orden: 1,
      },
    ],
    preguntas: [
      {
        id: "barrio",
        tipo: "lista_desplegable",
        texto: "¿En qué barrio vives?",
        obligatoria: true,
        orden: 0,
        seccionId: "territorio",
        opciones: BARRIOS_CARTAGENA.map((b, i) => ({
          id: `barrio-${i}`,
          texto: b.barrio,
        })),
      },
      {
        id: "problema",
        tipo: "opcion_unica",
        texto: "¿Cuál es el principal problema de seguridad?",
        obligatoria: true,
        orden: 1,
        seccionId: "territorio",
        opciones: [
          { id: "violencia", texto: "Violencia" },
          { id: "hurto", texto: "Hurto" },
          { id: "escnna", texto: "ESCNNA" },
          { id: "ambiental", texto: "Ambiental" },
          { id: "otro", texto: "Otro", esOtro: true },
        ],
      },
      {
        id: "inseguridad",
        tipo: "likert",
        texto: "¿Te has sentido inseguro en el último mes?",
        obligatoria: true,
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Nunca",
        etiquetaMax: "Siempre",
        orden: 2,
        seccionId: "experiencia",
      },
      {
        id: "situacion",
        tipo: "texto_largo",
        texto: "Describe la situación de seguridad en tu barrio",
        obligatoria: false,
        validacion: { maxLongitud: 2000 },
        orden: 3,
        seccionId: "experiencia",
      },
      {
        id: "mesa",
        tipo: "opcion_unica",
        texto: "¿Has participado en alguna mesa comunitaria?",
        obligatoria: true,
        opciones: [
          { id: "si", texto: "Sí" },
          { id: "no", texto: "No" },
        ],
        orden: 4,
        seccionId: "experiencia",
      },
    ],
    configuracion: { ...CONFIGURACION_INICIAL },
    respuestasCount: 2,
    creadoEn: fecha,
    actualizadoEn: fecha,
  },
  {
    id: "f2",
    titulo: "Priorización de Líneas Estratégicas",
    descripcion:
      "Valora las siete dimensiones de Seguridad Humana y las propuestas de mayor impacto. Datos de demostración.",
    estado: "activo",
    secciones: [
      {
        id: "dimensiones",
        titulo: "Dimensiones ONU",
        descripcion:
          "Asigna una prioridad de 1 a 7 a cada dimensión (pueden repetirse valores).",
        orden: 0,
      },
      { id: "propuestas", titulo: "Propuestas de acción", orden: 1 },
    ],
    preguntas: [
      ...dimensiones.map((dimension, orden) => ({
        id: `dimension-${orden}`,
        tipo: "escala_lineal" as const,
        texto: `Prioridad de seguridad ${dimension.toLowerCase()}`,
        obligatoria: true,
        orden,
        seccionId: "dimensiones",
        escalaMin: 1,
        escalaMax: 7,
        etiquetaMin: "Baja prioridad",
        etiquetaMax: "Alta prioridad",
      })),
      {
        id: "propuesta",
        tipo: "opcion_unica",
        texto: "¿Qué propuesta tiene mayor impacto?",
        obligatoria: true,
        orden: 7,
        seccionId: "propuestas",
        opciones: [
          { id: "comunidad", texto: "Fortalecer las redes comunitarias" },
          { id: "prevencion", texto: "Prevención y acompañamiento a jóvenes" },
          { id: "entorno", texto: "Recuperar espacios públicos seguros" },
        ],
      },
      {
        id: "observaciones",
        tipo: "texto_largo",
        texto: "Observaciones adicionales",
        obligatoria: false,
        orden: 8,
        seccionId: "propuestas",
        validacion: { maxLongitud: 2000 },
      },
    ],
    configuracion: { ...CONFIGURACION_INICIAL },
    respuestasCount: 1,
    creadoEn: fecha,
    actualizadoEn: fecha,
  },
];
export const RESPUESTAS_MOCK: RespuestaCiudadana[] = [
  {
    id: "r1",
    formularioId: "f1",
    sesionId: "demo-a",
    respuestas: {
      barrio: "barrio-0",
      problema: "hurto",
      inseguridad: "4",
      situacion: "Relato ficticio de seguridad territorial.",
      mesa: "si",
    },
    enviadoEn: fecha,
    enfoqueDiferencial: "Ninguno",
  },
  {
    id: "r2",
    formularioId: "f1",
    sesionId: "demo-b",
    respuestas: {
      barrio: "barrio-1",
      problema: "ambiental",
      inseguridad: "2",
      situacion: "Ejemplo ficticio para mostrar la distribución.",
      mesa: "no",
    },
    enviadoEn: fecha,
    enfoqueDiferencial: "Ley 1448/11",
  },
  {
    id: "r3",
    formularioId: "f2",
    sesionId: "demo-c",
    respuestas: {
      ...Object.fromEntries(
        dimensiones.map((_, i) => [`dimension-${i}`, String(i + 1)]),
      ),
      propuesta: "comunidad",
      observaciones: "Datos de prueba, sin personas reales.",
    },
    enviadoEn: fecha,
    enfoqueDiferencial: "Ninguno",
  },
];
