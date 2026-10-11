/**
 * POLIS — Tipos canónicos del dominio
 * Espejo 1:1 de los esquemas Pydantic v2 del backend (FastAPI).
 * Política Pública → Fases → Líneas Estratégicas → Aportes Ciudadanos
 */

export type EstadoPolitica =
  | "consulta_publica"
  | "en_deliberacion"
  | "en_revision"
  | "aprobada"
  | "implementacion";

export type TipoFase =
  | "diagnostico"
  | "formulacion"
  | "deliberacion"
  | "validacion"
  | "implementacion"
  | "seguimiento";

export type EstadoFase = "activa" | "proxima" | "completada";

export type TipoAporte = "propuesta" | "anotacion" | "pregunta";

export type Sector =
  | "movilidad"
  | "salud"
  | "educacion"
  | "ambiente"
  | "vivienda"
  | "cultura"
  | "seguridad";

export interface PoliticaPublica {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  descripcion: string;
  problema: string;
  sector: Sector;
  estado: EstadoPolitica;
  cobertura: string;
  fechaInicio: string; // ISO
  fechaCierre: string; // ISO
  participantes: number;
  fases: Fase[];
}

export interface Fase {
  id: string;
  politicaId: string;
  orden: number;
  nombre: string;
  tipo: TipoFase;
  descripcion: string;
  estado: EstadoFase;
  progreso: number; // 0–100
  lineas: LineaEstrategica[];
}

export interface LineaEstrategica {
  id: string;
  faseId: string;
  codigo: string; // p. ej. "LE-01"
  titulo: string;
  descripcion: string;
  aportes: Aporte[];
}

export interface Aporte {
  id: string;
  lineaId: string;
  tipo: TipoAporte;
  titulo: string;
  contenido: string;
  autor: string;
  /** undefined = aporte anónimo (sin datos personales asociados) */
  autorId?: string;
  /** Fotos adjuntas como dataURL comprimido (cliente) — opcional */
  fotos?: string[];
  fecha: string; // ISO
  votos: number;
  apoyado: boolean; // el usuario actual ya apoyó
  codigo_radicado?: string;
}

/* ---------- Metadatos de presentación (sin lógica de dominio) ---------- */

export const SECTOR_META: Record<Sector, { label: string }> = {
  movilidad: { label: "Movilidad" },
  salud: { label: "Salud" },
  educacion: { label: "Educación" },
  ambiente: { label: "Ambiente" },
  vivienda: { label: "Vivienda" },
  cultura: { label: "Cultura" },
  seguridad: { label: "Seguridad" },
};

export const ESTADO_META: Record<EstadoPolitica, { label: string }> = {
  consulta_publica: { label: "Consulta pública" },
  en_deliberacion: { label: "En deliberación" },
  en_revision: { label: "En revisión" },
  aprobada: { label: "Aprobada" },
  implementacion: { label: "Implementación" },
};

export const FASE_TIPO_META: Record<TipoFase, { label: string }> = {
  diagnostico: { label: "Diagnóstico" },
  formulacion: { label: "Formulación" },
  deliberacion: { label: "Deliberación" },
  validacion: { label: "Validación" },
  implementacion: { label: "Implementación" },
  seguimiento: { label: "Seguimiento" },
};

export const ESTADO_FASE_META: Record<EstadoFase, { label: string }> = {
  activa: { label: "Activa" },
  proxima: { label: "Próxima" },
  completada: { label: "Completada" },
};

export const APORTE_TIPO_META: Record<
  TipoAporte,
  { label: string; placeholderTitulo: string; placeholderContenido: string }
> = {
  propuesta: {
    label: "Propuesta",
    placeholderTitulo: "Titula tu propuesta con claridad",
    placeholderContenido:
      "Describe tu propuesta: qué problema resuelve, cómo se implementaría y qué resultado esperas para la ciudad.",
  },
  anotacion: {
    label: "Anotación",
    placeholderTitulo: "Titula tu anotación",
    placeholderContenido:
      "Añade contexto, datos o matices que enriquezcan la discusión sobre esta línea estratégica.",
  },
  pregunta: {
    label: "Pregunta",
    placeholderTitulo: "Escribe tu pregunta",
    placeholderContenido:
      "Pregunta lo que necesites aclarar sobre el alcance, el presupuesto o el impacto de esta línea.",
  },
};

/* ---------- Utilidades de dominio ---------- */

export function totalAportes(p: PoliticaPublica): number {
  return p.fases.reduce(
    (acc, f) => acc + f.lineas.reduce((a, l) => a + l.aportes.length, 0),
    0
  );
}

export function totalLineas(p: PoliticaPublica): number {
  return p.fases.reduce((acc, f) => acc + f.lineas.length, 0);
}

export function faseActiva(p: PoliticaPublica): Fase | undefined {
  return p.fases.find((f) => f.estado === "activa");
}
