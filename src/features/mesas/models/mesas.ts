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

export interface NodoArbolMetadatos {
  dimensionOnu?: string;              // "Seguridad Personal", "Seguridad Ambiental", etc.
  criticidad?: "alta" | "media" | "baja"; // Nivel de impacto/prioridad territorial
  actorResponsable?: string;          // Entidad sugerida o actor comunitario (para medios/soluciones)
  origenSubmesaId?: string;           // Trazabilidad si proviene de una submesa consolidada
  origenSubmesaNombre?: string;
}

/** Nodo del papelografo (causa, efecto, medio o fin) */
export interface NodoArbol {
  id: string;
  texto: string;
  /** Nodos de segundo nivel (jerarquía secundaria) que derivan de este primario */
  hijos: NodoArbol[];
  /** Metadatos metodológicos para matriz de relatoría */
  metadatos?: NodoArbolMetadatos;
  /** Secuencia de versión para control de concurrencia optimista (409/412) */
  version_seq?: number;
  /** ETag para HTTP If-Match */
  etag?: string;
}

export interface ArbolProblemas {
  /** Frase única acordada en plenaria — corazón del papelografo */
  problemaCentral: string;
  dimensionPrincipal?: string;
  causas: NodoArbol[];
  efectos: NodoArbol[];
}

export interface ArbolSoluciones {
  objetivoCentral: string;
  medios: NodoArbol[];
  fines: NodoArbol[];
}

export type TipoNodoEstructurado =
  | "problema_central"
  | "causa_directa"
  | "causa_indirecta"
  | "efecto_directo"
  | "efecto_indirecto"
  | "medio"
  | "fin"
  | "objetivo_central";

export interface NodoArbolEstructurado {
  id: string;
  texto: string;
  tipo: TipoNodoEstructurado;
  dimensionOnu?: string;          // Ej: "Seguridad Personal", "Seguridad Ambiental", etc.
  criticidad?: "alta" | "media" | "baja";
  actorResponsable?: string;      // Dependencia o entidad sugerida
  parentId?: string;              // Para trazabilidad causa raíz -> causa directa -> problema
  mesaId?: string;
  subMesaId?: string;
}

export interface MatrizMesaData {
  problemaCentral: string;
  dimensionPrincipal?: string;
  causas: NodoArbolEstructurado[];
  efectos: NodoArbolEstructurado[];
  objetivoCentral: string;
  medios: NodoArbolEstructurado[];
  fines: NodoArbolEstructurado[];
  resumenTabular?: Array<{
    causaId: string;
    causaTexto: string;
    efectoTexto: string;
    medioTexto: string;
    finTexto: string;
    dimensionOnu: string;
  }>;
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
  matrizArbol?: MatrizMesaData;
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
  // Relatoría estructurada y matriz de árbol a nivel de mesa
  arbolProblemas?: ArbolProblemas;
  arbolSoluciones?: ArbolSoluciones;
  matrizArbol?: MatrizMesaData;
  modoRelatoria?: "narrativo" | "matriz" | "hibrido";
}

export function calcularTotalAsistentes(mesa: MesaDeTrabajo): number {
  const plenaria = mesa.asistentesPlenaaria ?? mesa.asistentesPlenaria ?? 0;
  const sumSubmesas = mesa.submesas.reduce((acc, sm) => acc + (sm.participantes ?? 0), 0);

  // 1. Viceversa: Si no hay submesas o las submesas no tienen participantes registrados
  if (mesa.submesas.length === 0 || sumSubmesas === 0) {
    if (plenaria > 0) return plenaria;
    return mesa.totalAsistentes ?? 0;
  }

  // 2. Si no se cuentan asistentes a la plenaria (plenaria = 0):
  // la cantidad de asistentes es igual a la sumatoria de las submesas
  if (plenaria === 0) {
    if (!mesa.conteoIndependiente && mesa.totalAsistentes && mesa.totalAsistentes > 0) {
      return mesa.totalAsistentes;
    }
    return sumSubmesas;
  }

  // 3. Cuando se cuentan tanto plenaria como submesas:
  if (mesa.conteoIndependiente) {
    // Modo A: Grupos distintos -> Suma plenaria + Σ submesas
    return sumSubmesas + plenaria;
  }

  // Modo B: Mismo grupo (no duplicar) -> Total manual del facilitador o grupo mayor
  if (mesa.totalAsistentes && mesa.totalAsistentes > 0) {
    return mesa.totalAsistentes;
  }
  const maxSub = mesa.submesas.reduce((max, sm) => Math.max(max, sm.participantes ?? 0), 0);
  const mayor = Math.max(plenaria, maxSub);
  return mayor > 0 ? mayor : sumSubmesas;
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

/** Convierte árboles de problemas y soluciones a la estructura normalizada para analítica de datos */
export function arbolesAMatrizEstructurada(params: {
  mesaId?: string;
  subMesaId?: string;
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
}): MatrizMesaData {
  const { mesaId, subMesaId, arbolProblemas, arbolSoluciones } = params;

  const causasEstructuradas: NodoArbolEstructurado[] = [];
  for (const c of arbolProblemas.causas) {
    causasEstructuradas.push({
      id: c.id,
      texto: c.texto,
      tipo: "causa_directa",
      dimensionOnu: c.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
      criticidad: c.metadatos?.criticidad || "media",
      actorResponsable: c.metadatos?.actorResponsable,
      mesaId,
      subMesaId,
    });
    for (const h of c.hijos || []) {
      causasEstructuradas.push({
        id: h.id,
        texto: h.texto,
        tipo: "causa_indirecta",
        dimensionOnu:
          h.metadatos?.dimensionOnu || c.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
        criticidad: h.metadatos?.criticidad || c.metadatos?.criticidad || "media",
        actorResponsable: h.metadatos?.actorResponsable,
        parentId: c.id,
        mesaId,
        subMesaId,
      });
    }
  }

  const efectosEstructurados: NodoArbolEstructurado[] = [];
  for (const e of arbolProblemas.efectos) {
    efectosEstructurados.push({
      id: e.id,
      texto: e.texto,
      tipo: "efecto_directo",
      dimensionOnu: e.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
      criticidad: e.metadatos?.criticidad || "media",
      mesaId,
      subMesaId,
    });
    for (const h of e.hijos || []) {
      efectosEstructurados.push({
        id: h.id,
        texto: h.texto,
        tipo: "efecto_indirecto",
        dimensionOnu:
          h.metadatos?.dimensionOnu || e.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
        parentId: e.id,
        mesaId,
        subMesaId,
      });
    }
  }

  const mediosEstructurados: NodoArbolEstructurado[] = [];
  for (const m of arbolSoluciones.medios) {
    mediosEstructurados.push({
      id: m.id,
      texto: m.texto,
      tipo: "medio",
      dimensionOnu: m.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
      actorResponsable: m.metadatos?.actorResponsable,
      mesaId,
      subMesaId,
    });
    for (const h of m.hijos || []) {
      mediosEstructurados.push({
        id: h.id,
        texto: h.texto,
        tipo: "medio",
        dimensionOnu:
          h.metadatos?.dimensionOnu || m.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
        actorResponsable: h.metadatos?.actorResponsable || m.metadatos?.actorResponsable,
        parentId: m.id,
        mesaId,
        subMesaId,
      });
    }
  }

  const finesEstructurados: NodoArbolEstructurado[] = [];
  for (const f of arbolSoluciones.fines) {
    finesEstructurados.push({
      id: f.id,
      texto: f.texto,
      tipo: "fin",
      dimensionOnu: f.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
      mesaId,
      subMesaId,
    });
    for (const h of f.hijos || []) {
      finesEstructurados.push({
        id: h.id,
        texto: h.texto,
        tipo: "fin",
        dimensionOnu:
          h.metadatos?.dimensionOnu || f.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal,
        parentId: f.id,
        mesaId,
        subMesaId,
      });
    }
  }

  const maxFilas = Math.max(arbolProblemas.causas.length, arbolSoluciones.medios.length);
  const resumenTabular: MatrizMesaData["resumenTabular"] = [];
  for (let i = 0; i < maxFilas; i++) {
    const c = arbolProblemas.causas[i];
    const e = arbolProblemas.efectos[i];
    const m = arbolSoluciones.medios[i];
    const f = arbolSoluciones.fines[i];
    if (c || m) {
      resumenTabular.push({
        causaId: c?.id || `m-autoid-${i}`,
        causaTexto: c?.texto || "",
        efectoTexto: e?.texto || "",
        medioTexto: m?.texto || "",
        finTexto: f?.texto || "",
        dimensionOnu:
          c?.metadatos?.dimensionOnu ||
          m?.metadatos?.dimensionOnu ||
          arbolProblemas.dimensionPrincipal ||
          "",
      });
    }
  }

  return {
    problemaCentral: arbolProblemas.problemaCentral,
    dimensionPrincipal: arbolProblemas.dimensionPrincipal,
    causas: causasEstructuradas,
    efectos: efectosEstructurados,
    objetivoCentral: arbolSoluciones.objetivoCentral,
    medios: mediosEstructurados,
    fines: finesEstructurados,
    resumenTabular,
  };
}

/** Escapa cadenas para exportación CSV segura (RFC 4180) */
function escaparCSV(valor: string | undefined | null): string {
  if (valor === undefined || valor === null) return '""';
  return `"${String(valor).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

/** Exporta matriz a formato CSV normalizado para análisis en Excel, PowerBI, Python o R */
export function generarCSVMatrizEstructurada(params: {
  mesaId: string;
  mesaNombre: string;
  localidad?: string;
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
}): string {
  const {
    mesaId,
    mesaNombre,
    localidad = "Cartagena de Indias",
    arbolProblemas,
    arbolSoluciones,
  } = params;
  const filas: string[] = [];

  // Encabezados conforme a la especificación
  filas.push(
    "mesa_id,mesa_nombre,localidad,tipo_nodo,descripcion,dimension_onu,criticidad,responsable"
  );

  // Problema Central
  if (arbolProblemas.problemaCentral.trim()) {
    filas.push(
      [
        escaparCSV(mesaId),
        escaparCSV(mesaNombre),
        escaparCSV(localidad),
        escaparCSV("problema_central"),
        escaparCSV(arbolProblemas.problemaCentral),
        escaparCSV(arbolProblemas.dimensionPrincipal || ""),
        escaparCSV("alta"),
        escaparCSV(""),
      ].join(",")
    );
  }

  // Objetivo Central
  if (arbolSoluciones.objetivoCentral.trim()) {
    filas.push(
      [
        escaparCSV(mesaId),
        escaparCSV(mesaNombre),
        escaparCSV(localidad),
        escaparCSV("objetivo_central"),
        escaparCSV(arbolSoluciones.objetivoCentral),
        escaparCSV(arbolProblemas.dimensionPrincipal || ""),
        escaparCSV(""),
        escaparCSV(""),
      ].join(",")
    );
  }

  // Causas directas e indirectas
  for (const c of arbolProblemas.causas) {
    filas.push(
      [
        escaparCSV(mesaId),
        escaparCSV(mesaNombre),
        escaparCSV(localidad),
        escaparCSV("causa_directa"),
        escaparCSV(c.texto),
        escaparCSV(c.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal || ""),
        escaparCSV(c.metadatos?.criticidad || "media"),
        escaparCSV(""),
      ].join(",")
    );
    for (const h of c.hijos || []) {
      filas.push(
        [
          escaparCSV(mesaId),
          escaparCSV(mesaNombre),
          escaparCSV(localidad),
          escaparCSV("causa_indirecta"),
          escaparCSV(h.texto),
          escaparCSV(
            h.metadatos?.dimensionOnu ||
              c.metadatos?.dimensionOnu ||
              arbolProblemas.dimensionPrincipal ||
              ""
          ),
          escaparCSV(h.metadatos?.criticidad || c.metadatos?.criticidad || "media"),
          escaparCSV(""),
        ].join(",")
      );
    }
  }

  // Efectos directos e indirectos
  for (const e of arbolProblemas.efectos) {
    filas.push(
      [
        escaparCSV(mesaId),
        escaparCSV(mesaNombre),
        escaparCSV(localidad),
        escaparCSV("efecto_directo"),
        escaparCSV(e.texto),
        escaparCSV(e.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal || ""),
        escaparCSV(e.metadatos?.criticidad || "media"),
        escaparCSV(""),
      ].join(",")
    );
    for (const h of e.hijos || []) {
      filas.push(
        [
          escaparCSV(mesaId),
          escaparCSV(mesaNombre),
          escaparCSV(localidad),
          escaparCSV("efecto_indirecto"),
          escaparCSV(h.texto),
          escaparCSV(
            h.metadatos?.dimensionOnu ||
              e.metadatos?.dimensionOnu ||
              arbolProblemas.dimensionPrincipal ||
              ""
          ),
          escaparCSV(""),
          escaparCSV(""),
        ].join(",")
      );
    }
  }

  // Medios / Acciones
  for (const m of arbolSoluciones.medios) {
    filas.push(
      [
        escaparCSV(mesaId),
        escaparCSV(mesaNombre),
        escaparCSV(localidad),
        escaparCSV("medio"),
        escaparCSV(m.texto),
        escaparCSV(m.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal || ""),
        escaparCSV(""),
        escaparCSV(m.metadatos?.actorResponsable || ""),
      ].join(",")
    );
    for (const h of m.hijos || []) {
      filas.push(
        [
          escaparCSV(mesaId),
          escaparCSV(mesaNombre),
          escaparCSV(localidad),
          escaparCSV("medio"),
          escaparCSV(h.texto),
          escaparCSV(
            h.metadatos?.dimensionOnu ||
              m.metadatos?.dimensionOnu ||
              arbolProblemas.dimensionPrincipal ||
              ""
          ),
          escaparCSV(""),
          escaparCSV(h.metadatos?.actorResponsable || m.metadatos?.actorResponsable || ""),
        ].join(",")
      );
    }
  }

  // Fines
  for (const f of arbolSoluciones.fines) {
    filas.push(
      [
        escaparCSV(mesaId),
        escaparCSV(mesaNombre),
        escaparCSV(localidad),
        escaparCSV("fin"),
        escaparCSV(f.texto),
        escaparCSV(f.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal || ""),
        escaparCSV(""),
        escaparCSV(""),
      ].join(",")
    );
    for (const h of f.hijos || []) {
      filas.push(
        [
          escaparCSV(mesaId),
          escaparCSV(mesaNombre),
          escaparCSV(localidad),
          escaparCSV("fin"),
          escaparCSV(h.texto),
          escaparCSV(
            h.metadatos?.dimensionOnu ||
              f.metadatos?.dimensionOnu ||
              arbolProblemas.dimensionPrincipal ||
              ""
          ),
          escaparCSV(""),
          escaparCSV(""),
        ].join(",")
      );
    }
  }

  return filas.join("\r\n");
}
