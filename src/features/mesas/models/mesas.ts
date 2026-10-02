/**
 * POLIS — Tipos del Área de Trabajo (Mesas públicas)
 * Espejo 1:1 de los futuros esquemas Pydantic v2 del backend.
 *
 * Dinámica de una mesa de trabajo (metodología papelografo):
 *   Plenaria de apertura → acuerdos y reparto de temas
 *   → Submesas por tema (si las hay)
 *   → Cada submesa diligencia un ÁRBOL DE PROBLEMAS y/o un
 *     ÁRBOL DE SOLUCIONES sobre el papelografo.
 *
 * El árbol de problemas centra los nodos en un problema central;
 * hacia un lado las CAUSAS (¿por qué ocurre?) y hacia el otro los
 * EFECTOS (¿qué genera?). Cada causa/efecto puede ser PRIMARIA
 * (conectada directo al problema) o SECUNDARIA (derivada de una
 * primaria). El árbol de soluciones invierte la misma estructura:
 * OBJETIVO CENTRAL ← MEDIOS → FINES.
 */

export type EstadoMesa = "programada" | "en_curso" | "cerrada" | "cancelada";

/** Nivel del nodo: primario cuelga del centro; secundario cuelga de un primario */
export type NivelNodo = "primario" | "secundario";

/** Ramas posibles del papelografo */
export type RamaArbol = "causas" | "efectos" | "medios" | "fines";

/** Cuál de los dos árboles se está diligenciando */
export type ArbolKind = "problemas" | "soluciones";

/** Nodo del papelografo (causa, efecto, medio o fin) */
export interface NodoArbol {
  id: string;
  texto: string;
  /** Nodos de segundo nivel (jerarquía secundaria) que derivan de este primario */
  hijos: NodoArbol[];
  /** Secuencia de versión para control de concurrencia optimista (409/412) */
  version_seq?: number;
  /** ETag para HTTP If-Match */
  etag?: string;
}

export interface ArbolProblemas {
  /** Frase única acordada en plenaria — corazón del papelografo */
  problemaCentral: string;
  causas: NodoArbol[];
  efectos: NodoArbol[];
}

export interface ArbolSoluciones {
  objetivoCentral: string;
  medios: NodoArbol[];
  fines: NodoArbol[];
}

export interface AdjuntoMesa {
  id: string;
  nombre: string;           // "Acta firmada.pdf"
  tipo: "documento" | "imagen" | "audio" | "video" | "otro";
  mimeType: string;         // "application/pdf" | "image/jpeg" | etc.
  tamaño: number;           // bytes
  url: string;              // URL de descarga (local blob o remota)
  subidoEn: string;         // ISO timestamp
  subidoPor?: string;       // nombre del usuario
}

export interface SubMesa {
  id: string;
  nombre: string;
  /** Tema asignado en plenaria (opcional pero recomendado) */
  tema: string;
  /** Participantes que se sientan en esta submesa (opcional) */
  participantes: number | null;
  asistentesPresenciales?: number | null;  // asistentes reales al finalizar
  adjuntos?: AdjuntoMesa[];
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
  /** Secuencia de versión para control de concurrencia optimista (409/412) */
  version_seq?: number;
  /** ETag para HTTP If-Match */
  etag?: string;
}

export interface EntidadResponsable {
  id: string;          // nanoid o uuid-v4
  nombre: string;      // "Secretaría de Participación Ciudadana"
  rol: string;         // "Convocante" | "Coorganizadora" | "Aliada" | "Apoyo técnico" | string
}

export interface PersonaResponsable {
  id: string;
  nombre: string;      // "Carlos Pérez"
  cargo: string;       // "Secretario de Participación"
  entidadId?: string;  // Referencia a EntidadResponsable.id
  esFacilitador: boolean;
}

export interface MesaDeTrabajo {
  id: string;
  nombre: string;
  fecha: string; // ISO (yyyy-mm-dd)
  lugar: string;
  /** Entidad / dependencia que convoca (funcionarios responsables) - legacy */
  entidad: string;
  /** Funcionario facilitador de la dinámica - legacy */
  facilitador: string;
  totalAsistentes: number;
  asistentesPlenaaria?: number | null;  // solo quienes fueron a plenaria, no a submesas
  asistentesPlenaria?: number | null;
  /** Acuerdos y notas de la plenaria de apertura */
  plenaria: { acuerdos: string };
  submesas: SubMesa[];
  estado: EstadoMesa;
  codigoOficial?: string;
  shortcodeCiudadano?: string;
  tipoMesa?: string;
  horario?: string;
  modalidad?: string;
  sha256Acta?: string | null;
  descripcion?: string;
  dimensionOnu?: string;
  informe?: string;
  // Nuevos campos Mesa Editor Pro:
  coordenadas?: { lat: number; lng: number };
  urlMapa?: string;
  aforo?: number;
  entidades?: EntidadResponsable[];
  responsables?: PersonaResponsable[];
  adjuntos?: AdjuntoMesa[];
  conteoIndependiente?: boolean; // default: false (mismo grupo)
}

export function calcularTotalAsistentes(mesa: MesaDeTrabajo): number {
  if (mesa.submesas.length === 0) return mesa.totalAsistentes ?? 0;
  if (mesa.conteoIndependiente) {
    const sumSubmesas = mesa.submesas.reduce((acc, sm) => acc + (sm.participantes ?? 0), 0);
    const plenaria = mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria ?? 0;
    return sumSubmesas + plenaria;
  }
  // Mismo grupo (no duplicar):
  if (mesa.totalAsistentes && mesa.totalAsistentes > 0) {
    return mesa.totalAsistentes;
  }
  const plenaria = mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria ?? 0;
  const maxSub = mesa.submesas.reduce((max, sm) => Math.max(max, sm.participantes ?? 0), 0);
  const mayor = Math.max(plenaria, maxSub);
  return mayor > 0 ? mayor : (mesa.totalAsistentes ?? 0);
}

/* ---------- Metadatos de presentación ---------- */

export const ESTADO_MESA_META: Record<EstadoMesa, { label: string }> = {
  programada: { label: "Programada" },
  en_curso: { label: "En curso" },
  cerrada: { label: "Cerrada" },
  cancelada: { label: "Cancelada" },
};

export const RAMA_META: Record<
  RamaArbol,
  { label: string; singular: string; pregunta: string; colorVar: string; genero: "f" | "m" }
> = {
  causas: {
    label: "Causas",
    singular: "causa",
    pregunta: "¿Por qué ocurre?",
    colorVar: "var(--warning)",
    genero: "f",
  },
  efectos: {
    label: "Efectos",
    singular: "efecto",
    pregunta: "¿Qué genera?",
    colorVar: "var(--info)",
    genero: "m",
  },
  medios: {
    label: "Medios",
    singular: "medio",
    pregunta: "¿Con qué lo logramos?",
    colorVar: "var(--warning)",
    genero: "m",
  },
  fines: {
    label: "Fines",
    singular: "fin",
    pregunta: "¿Qué cambia cuando se logra?",
    colorVar: "var(--info)",
    genero: "m",
  },
};

/* ---------- Utilidades de dominio ---------- */

/** ID corto para nodos nuevos (cliente) */
export function uidNodo(): string {
  return `n-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Cuenta todos los nodos de una rama (primarios + secundarios) */
export function contarNodos(lista: NodoArbol[]): number {
  return lista.reduce((acc, n) => acc + 1 + contarNodos(n.hijos), 0);
}

export interface ResumenArbol {
  /** Texto del nodo central (problema u objetivo) */
  central: string;
  /** Nodos de primer nivel conectados al centro */
  primarios: number;
  /** Nodos de segundo nivel colgados de un primario */
  secundarios: number;
  total: number;
  /** Conteo total por rama (primarias + secundarias de esa rama) */
  ramaA: number;
  ramaB: number;
}

export function resumenProblemas(sub: SubMesa): ResumenArbol {
  const p = sub.arbolProblemas;
  const primarios = p.causas.length + p.efectos.length;
  const secundarios =
    p.causas.reduce((a, n) => a + n.hijos.length, 0) +
    p.efectos.reduce((a, n) => a + n.hijos.length, 0);
  return {
    central: p.problemaCentral,
    primarios,
    secundarios,
    total: primarios + secundarios,
    ramaA: contarNodos(p.causas),
    ramaB: contarNodos(p.efectos),
  };
}

export function resumenSoluciones(sub: SubMesa): ResumenArbol {
  const s = sub.arbolSoluciones;
  const primarios = s.medios.length + s.fines.length;
  const secundarios =
    s.medios.reduce((a, n) => a + n.hijos.length, 0) +
    s.fines.reduce((a, n) => a + n.hijos.length, 0);
  return {
    central: s.objetivoCentral,
    primarios,
    secundarios,
    total: primarios + secundarios,
    ramaA: contarNodos(s.medios),
    ramaB: contarNodos(s.fines),
  };
}

/** Una submesa tiene su árbol de problemas "iniciado" si ya hay problema central */
export function arbolProblemasIniciado(sub: SubMesa): boolean {
  return sub.arbolProblemas.problemaCentral.trim().length > 0;
}

/** ¿El árbol de soluciones ya fue derivado/diligenciado? */
export function solucionesExistentes(sub: SubMesa): boolean {
  const s = sub.arbolSoluciones;
  return s.objetivoCentral.trim().length > 0 || s.medios.length > 0 || s.fines.length > 0;
}

/** Etiqueta corta del estado de diligenciamiento de una submesa */
export function estadoDiligenciamiento(sub: SubMesa): {
  label: string;
  tono: "vacio" | "parcial" | "completo";
} {
  const p = resumenProblemas(sub);
  const s = resumenSoluciones(sub);
  if (p.total === 0 && s.total === 0 && !p.central) {
    return { label: "Sin diligenciar", tono: "vacio" };
  }
  if (p.central && p.ramaA > 0 && p.ramaB > 0) {
    return { label: "Árbol diligenciado", tono: "completo" };
  }
  return { label: "En diligenciamiento", tono: "parcial" };
}
