"use client";

import { create } from "zustand";
import type {
  ArbolKind,
  EstadoMesa,
  ArbolProblemas,
  ArbolSoluciones,
  MesaDeTrabajo,
  NodoArbol,
  RamaArbol,
  SubMesa,
  EntidadResponsable,
  PersonaResponsable,
  AdjuntoMesa,
} from "@/features/mesas/models/mesas";
import { uidNodo, calcularTotalAsistentes } from "@/features/mesas/models/mesas";

/**
 * POLIS — Store del Área de Trabajo (mesas públicas + papelografo).
 * Estado cliente con mutaciones optimistas; cuando exista backend
 * FastAPI estas acciones llamarán a apiFetch y sincronizarán por
 * WebSockets para que varias submesas editen en vivo.
 */

export interface MesaInput {
  nombre: string;
  fecha: string;
  lugar: string;
  entidad?: string;
  facilitador?: string;
  totalAsistentes?: number;
  asistentesPlenaaria?: number | null;
  horario?: string;
  descripcion?: string;
  dimensionOnu?: string;
  estado?: EstadoMesa;
  tipoMesa?: string;
  codigoOficial?: string;
  shortcodeCiudadano?: string;
  informe?: string;
  coordenadas?: { lat: number; lng: number };
  urlMapa?: string;
  aforo?: number;
  entidades?: EntidadResponsable[];
  responsables?: PersonaResponsable[];
  adjuntos?: AdjuntoMesa[];
  conteoIndependiente?: boolean;
}

export interface SubMesaInput {
  /** Id asignado por el backend (si se omite, se genera uno local) */
  id?: string;
  nombre: string;
  tema: string;
  participantes: number | null;
}

interface MesasState {
  mesas: MesaDeTrabajo[];
  cargando: boolean;
  error: string | null;

  setMesas: (mesas: MesaDeTrabajo[]) => void;
  setCargando: (cargando: boolean) => void;
  setError: (error: string | null) => void;

  /* Mesa */
  crearMesa: (input: MesaInput) => MesaDeTrabajo;
  actualizarMesa: (mesaId: string, patch: Partial<MesaInput & { informe?: string }>) => void;
  setAcuerdosPlenaria: (mesaId: string, acuerdos: string) => void;
  setInformeMesa: (mesaId: string, informe: string) => void;
  setAsistentesPlenaria: (mesaId: string, cantidad: number | null) => void;
  setConteoIndependiente: (mesaId: string, conteoIndependiente: boolean) => void;
  eliminarMesa: (mesaId: string) => void;
  agregarAdjuntoMesa: (mesaId: string, adjunto: AdjuntoMesa) => void;
  eliminarAdjuntoMesa: (mesaId: string, adjuntoId: string) => void;

  /* Relatoría y Matriz de Árbol a nivel de Mesa */
  setArbolProblemasMesa: (mesaId: string, arbol: ArbolProblemas) => void;
  setArbolSolucionesMesa: (mesaId: string, arbol: ArbolSoluciones) => void;
  setModoRelatoriaMesa: (mesaId: string, modo: "narrativo" | "matriz" | "hibrido") => void;
  consolidarArbolesSubmesas: (mesaId: string) => {
    causasCopiadas: number;
    efectosCopiados: number;
    mediosCopiados: number;
    finesCopiados: number;
  };
  generarBorradorRelatoriaDesdeMatriz: (mesaId: string) => string;

  /* Submesas */
  crearSubMesa: (mesaId: string, input: SubMesaInput) => SubMesa | null;
  eliminarSubMesa: (mesaId: string, submesaId: string) => void;
  agregarAdjuntoSubMesa: (mesaId: string, subMesaId: string, adjunto: AdjuntoMesa) => void;
  eliminarAdjuntoSubMesa: (mesaId: string, subMesaId: string, adjuntoId: string) => void;

  /* Papelografo */
  setArbolProblemasSubMesa: (mesaId: string, submesaId: string, arbol: ArbolProblemas) => void;
  setArbolSolucionesSubMesa: (mesaId: string, submesaId: string, arbol: ArbolSoluciones) => void;
  setTextoCentral: (
    mesaId: string,
    submesaId: string,
    arbol: ArbolKind,
    texto: string
  ) => void;
  /** Añade un nodo primario (parentId null) o secundario; devuelve el id creado */
  agregarNodo: (
    mesaId: string,
    submesaId: string,
    arbol: ArbolKind,
    rama: RamaArbol,
    parentId: string | null
  ) => string | null;
  setTextoNodo: (
    mesaId: string,
    submesaId: string,
    arbol: ArbolKind,
    rama: RamaArbol,
    nodoId: string,
    texto: string
  ) => void;
  eliminarNodo: (
    mesaId: string,
    submesaId: string,
    arbol: ArbolKind,
    rama: RamaArbol,
    nodoId: string
  ) => void;
  /**
   * Deriva el árbol de soluciones a partir del árbol de problemas:
   * problema → objetivo central, causas → medios, efectos → fines.
   * Devuelve false si ya existe un árbol de soluciones.
   */
  derivarSoluciones: (mesaId: string, submesaId: string) => boolean;
}

/* ---------- Helpers inmutables ---------- */

function mapSubMesa(
  state: MesasState,
  mesaId: string,
  submesaId: string,
  fn: (sub: SubMesa) => SubMesa
): Pick<MesasState, "mesas"> {
  return {
    mesas: state.mesas.map((m) =>
      m.id !== mesaId
        ? m
        : { ...m, submesas: m.submesas.map((sm) => (sm.id === submesaId ? fn(sm) : sm)) }
    ),
  };
}

/** Aplica `fn` a la rama indicada del árbol correspondiente */
function mutarRama(
  sub: SubMesa,
  arbol: ArbolKind,
  rama: RamaArbol,
  fn: (lista: NodoArbol[]) => NodoArbol[]
): SubMesa {
  if (arbol === "problemas") {
    if (rama === "causas") {
      return {
        ...sub,
        arbolProblemas: { ...sub.arbolProblemas, causas: fn(sub.arbolProblemas.causas) },
      };
    }
    if (rama === "efectos") {
      return {
        ...sub,
        arbolProblemas: { ...sub.arbolProblemas, efectos: fn(sub.arbolProblemas.efectos) },
      };
    }
    return sub;
  }
  if (rama === "medios") {
    return {
      ...sub,
      arbolSoluciones: { ...sub.arbolSoluciones, medios: fn(sub.arbolSoluciones.medios) },
    };
  }
  if (rama === "fines") {
    return {
      ...sub,
      arbolSoluciones: { ...sub.arbolSoluciones, fines: fn(sub.arbolSoluciones.fines) },
    };
  }
  return sub;
}

/** Quita un nodo de la lista (funciona para nivel primario o secundario) */
function quitarNodo(lista: NodoArbol[], nodoId: string): NodoArbol[] {
  return lista
    .filter((n) => n.id !== nodoId)
    .map((n) => ({ ...n, hijos: n.hijos.filter((h) => h.id !== nodoId) }));
}

function clonarRama(lista: NodoArbol[]): NodoArbol[] {
  return lista.map((n) => ({
    ...n,
    id: uidNodo(),
    hijos: n.hijos.map((h) => ({ ...h, id: uidNodo(), hijos: [] })),
  }));
}

let mesaSeq = 100;
let subMesaSeq = 1000;

const ARBOL_PROBLEMAS_VACIO = { problemaCentral: "", causas: [], efectos: [] };
const ARBOL_SOLUCIONES_VACIO: ArbolSoluciones = { objetivoCentral: "", medios: [], fines: [] };

export const useMesasStore = create<MesasState>((set, get) => ({
  mesas: [],
  cargando: false,
  error: null,

  setMesas: (mesas) => set({ mesas, cargando: false, error: null }),
  setCargando: (cargando) => set({ cargando }),
  setError: (error) => set({ error, cargando: false }),


  /* ---------- Mesa ---------- */

  crearMesa: (input) => {
    const entidadDerivada = input.entidades?.[0]?.nombre ?? input.entidad ?? "";
    const facilitadorDerivado =
      input.responsables?.find((r) => r.esFacilitador)?.nombre ??
      input.responsables?.[0]?.nombre ??
      input.facilitador ??
      "";

    const mesa: MesaDeTrabajo = {
      id: `mesa-nueva-${++mesaSeq}`,
      ...input,
      entidad: entidadDerivada,
      facilitador: facilitadorDerivado,
      totalAsistentes: input.totalAsistentes ?? 0,
      asistentesPlenaaria: input.asistentesPlenaaria ?? null,
      asistentesPlenaria: input.asistentesPlenaaria ?? null,
      plenaria: { acuerdos: input.descripcion || "" },
      submesas: [],
      estado: input.estado || "programada",
      entidades: input.entidades ?? [],
      responsables: input.responsables ?? [],
      coordenadas: input.coordenadas,
      urlMapa: input.urlMapa,
      aforo: input.aforo,
      adjuntos: input.adjuntos ?? [],
      conteoIndependiente: input.conteoIndependiente ?? false,
    };
    set((s) => ({ mesas: [mesa, ...s.mesas] }));
    return mesa;
  },

  actualizarMesa: (mesaId, patch) =>
    set((s) => ({
      mesas: s.mesas.map((m) => {
        if (m.id !== mesaId) return m;
        const entidad =
          patch.entidades && patch.entidades.length > 0
            ? patch.entidades[0].nombre
            : (patch.entidad ?? m.entidad);
        const facilitador =
          patch.responsables && patch.responsables.length > 0
            ? (patch.responsables.find((r) => r.esFacilitador)?.nombre ??
              patch.responsables[0].nombre)
            : (patch.facilitador ?? m.facilitador);
        return {
          ...m,
          ...patch,
          entidad,
          facilitador,
        };
      }),
    })),

  setAcuerdosPlenaria: (mesaId, acuerdos) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, plenaria: { ...m.plenaria, acuerdos } } : m
      ),
    })),

  setInformeMesa: (mesaId, informe) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, informe } : m
      ),
    })),

  setAsistentesPlenaria: (mesaId, cantidad) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId
          ? {
              ...m,
              asistentesPlenaaria: cantidad,
              asistentesPlenaria: cantidad,
            }
          : m
      ),
    })),

  setConteoIndependiente: (mesaId, conteoIndependiente) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, conteoIndependiente } : m
      ),
    })),

  eliminarMesa: (mesaId) =>
    set((s) => ({ mesas: s.mesas.filter((m) => m.id !== mesaId) })),

  agregarAdjuntoMesa: (mesaId, adjunto) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId
          ? { ...m, adjuntos: [...(m.adjuntos ?? []), adjunto] }
          : m
      ),
    })),

  eliminarAdjuntoMesa: (mesaId, adjuntoId) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId
          ? { ...m, adjuntos: (m.adjuntos ?? []).filter((a) => a.id !== adjuntoId) }
          : m
      ),
    })),

  /* ---------- Relatoría y Matriz de Árbol a nivel de Mesa ---------- */

  setArbolProblemasMesa: (mesaId, arbol) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, arbolProblemas: arbol } : m
      ),
    })),

  setArbolSolucionesMesa: (mesaId, arbol) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, arbolSoluciones: arbol } : m
      ),
    })),

  setModoRelatoriaMesa: (mesaId, modo) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, modoRelatoria: modo } : m
      ),
    })),

  consolidarArbolesSubmesas: (mesaId) => {
    const mesa = get().mesas.find((m) => m.id === mesaId);
    if (!mesa || !mesa.submesas || mesa.submesas.length === 0) {
      return { causasCopiadas: 0, efectosCopiados: 0, mediosCopiados: 0, finesCopiados: 0 };
    }

    const arbolP: ArbolProblemas = mesa.arbolProblemas ?? {
      problemaCentral: mesa.nombre,
      causas: [],
      efectos: [],
    };
    const arbolS: ArbolSoluciones = mesa.arbolSoluciones ?? {
      objetivoCentral: "",
      medios: [],
      fines: [],
    };

    let causasCopiadas = 0;
    let efectosCopiados = 0;
    let mediosCopiados = 0;
    let finesCopiados = 0;

    const nuevasCausas = [...arbolP.causas];
    const nuevosEfectos = [...arbolP.efectos];
    const nuevosMedios = [...arbolS.medios];
    const nuevosFines = [...arbolS.fines];

    for (const sm of mesa.submesas) {
      // Consolidar causas
      for (const c of sm.arbolProblemas?.causas ?? []) {
        if (!nuevasCausas.some((nc) => nc.texto.trim().toLowerCase() === c.texto.trim().toLowerCase())) {
          nuevasCausas.push({
            ...c,
            id: uidNodo(),
            metadatos: {
              ...c.metadatos,
              origenSubmesaId: sm.id,
              origenSubmesaNombre: sm.nombre,
            },
            hijos: (c.hijos || []).map((h) => ({
              ...h,
              id: uidNodo(),
              metadatos: {
                ...h.metadatos,
                origenSubmesaId: sm.id,
                origenSubmesaNombre: sm.nombre,
              },
              hijos: [],
            })),
          });
          causasCopiadas++;
        }
      }
      // Consolidar efectos
      for (const e of sm.arbolProblemas?.efectos ?? []) {
        if (!nuevosEfectos.some((ne) => ne.texto.trim().toLowerCase() === e.texto.trim().toLowerCase())) {
          nuevosEfectos.push({
            ...e,
            id: uidNodo(),
            metadatos: {
              ...e.metadatos,
              origenSubmesaId: sm.id,
              origenSubmesaNombre: sm.nombre,
            },
            hijos: (e.hijos || []).map((h) => ({
              ...h,
              id: uidNodo(),
              metadatos: {
                ...h.metadatos,
                origenSubmesaId: sm.id,
                origenSubmesaNombre: sm.nombre,
              },
              hijos: [],
            })),
          });
          efectosCopiados++;
        }
      }
      // Consolidar medios
      for (const mItem of sm.arbolSoluciones?.medios ?? []) {
        if (!nuevosMedios.some((nm) => nm.texto.trim().toLowerCase() === mItem.texto.trim().toLowerCase())) {
          nuevosMedios.push({
            ...mItem,
            id: uidNodo(),
            metadatos: {
              ...mItem.metadatos,
              origenSubmesaId: sm.id,
              origenSubmesaNombre: sm.nombre,
            },
            hijos: (mItem.hijos || []).map((h) => ({
              ...h,
              id: uidNodo(),
              metadatos: {
                ...h.metadatos,
                origenSubmesaId: sm.id,
                origenSubmesaNombre: sm.nombre,
              },
              hijos: [],
            })),
          });
          mediosCopiados++;
        }
      }
      // Consolidar fines
      for (const f of sm.arbolSoluciones?.fines ?? []) {
        if (!nuevosFines.some((nf) => nf.texto.trim().toLowerCase() === f.texto.trim().toLowerCase())) {
          nuevosFines.push({
            ...f,
            id: uidNodo(),
            metadatos: {
              ...f.metadatos,
              origenSubmesaId: sm.id,
              origenSubmesaNombre: sm.nombre,
            },
            hijos: (f.hijos || []).map((h) => ({
              ...h,
              id: uidNodo(),
              metadatos: {
                ...h.metadatos,
                origenSubmesaId: sm.id,
                origenSubmesaNombre: sm.nombre,
              },
              hijos: [],
            })),
          });
          finesCopiados++;
        }
      }
    }

    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId
          ? {
              ...m,
              arbolProblemas: {
                ...arbolP,
                causas: nuevasCausas,
                efectos: nuevosEfectos,
              },
              arbolSoluciones: {
                ...arbolS,
                medios: nuevosMedios,
                fines: nuevosFines,
              },
            }
          : m
      ),
    }));

    return { causasCopiadas, efectosCopiados, mediosCopiados, finesCopiados };
  },

  generarBorradorRelatoriaDesdeMatriz: (mesaId) => {
    const mesa = get().mesas.find((m) => m.id === mesaId);
    if (!mesa) return "";

    const ap = mesa.arbolProblemas;
    const as = mesa.arbolSoluciones;
    const totalAsistentes = calcularTotalAsistentes(mesa);

    const lineas: string[] = [];
    lineas.push(`# INFORME TÉCNICO Y RELATORÍA TERRITORIAL`);
    lineas.push(`**Mesa de Trabajo:** ${mesa.nombre}`);
    lineas.push(`**Código / Referencia:** ${mesa.codigoOficial ?? mesa.id}`);
    lineas.push(`**Fecha:** ${mesa.fecha || "No registrada"} | **Lugar:** ${mesa.lugar || "No registrado"}`);
    lineas.push(`**Facilitador / Responsable:** ${mesa.facilitador || mesa.entidad}`);
    lineas.push(`**Participación Ciudadana Total:** ${totalAsistentes} asistentes registrados`);
    lineas.push("");
    lineas.push("---");
    lineas.push("");

    lineas.push(`## 1. DIAGNÓSTICO TERRITORIAL ESTRUCTURAL (ÁRBOL DE PROBLEMAS)`);
    lineas.push(
      `Conforme a la metodología DNP y CONPES de Marco Lógico, la deliberación territorial identificó el siguiente núcleo problemático y sus causas directas e indirectas:`
    );
    lineas.push("");
    const probCentral = ap?.problemaCentral?.trim() || "Definición pendiente de concertación territorial";
    lineas.push(`### 1.1 Problema Central Priorizado`);
    lineas.push(`> **${probCentral}**`);
    lineas.push("");

    lineas.push(`### 1.2 Causas Estructurales y Directas`);
    if (ap && ap.causas.length > 0) {
      for (const [idx, c] of ap.causas.entries()) {
        const crit = c.metadatos?.criticidad ? ` [Criticidad: ${c.metadatos.criticidad.toUpperCase()}]` : "";
        const dim = c.metadatos?.dimensionOnu ? ` [Dimensión: ${c.metadatos.dimensionOnu}]` : "";
        const sub = c.metadatos?.origenSubmesaNombre ? ` *(Fuente: Submesa ${c.metadatos.origenSubmesaNombre})*` : "";
        lineas.push(`${idx + 1}. **${c.texto}**${crit}${dim}${sub}`);
        if (c.hijos && c.hijos.length > 0) {
          for (const h of c.hijos) {
            lineas.push(`   - Causa secundaria: ${h.texto}`);
          }
        }
      }
    } else {
      lineas.push(`*No se han registrado causas específicas en la matriz de diagnóstico.*`);
    }
    lineas.push("");

    lineas.push(`### 1.3 Efectos e Impactos Territoriales Observados`);
    if (ap && ap.efectos.length > 0) {
      for (const [idx, e] of ap.efectos.entries()) {
        const crit = e.metadatos?.criticidad ? ` [Impacto: ${e.metadatos.criticidad.toUpperCase()}]` : "";
        const dim = e.metadatos?.dimensionOnu ? ` [Dimensión: ${e.metadatos.dimensionOnu}]` : "";
        lineas.push(`${idx + 1}. ${e.texto}${crit}${dim}`);
        if (e.hijos && e.hijos.length > 0) {
          for (const h of e.hijos) {
            lineas.push(`   - Efecto derivado: ${h.texto}`);
          }
        }
      }
    } else {
      lineas.push(`*No se han registrado efectos en el árbol de diagnóstico.*`);
    }
    lineas.push("");

    lineas.push(`## 2. MARCO ESTRATÉGICO Y OBJETIVOS DE POLÍTICA (ÁRBOL DE SOLUCIONES)`);
    lineas.push(
      `Mediante la transformación positiva del árbol de problemas, se proyectan los siguientes objetivos y vías de intervención:`
    );
    lineas.push("");
    const objCentral = as?.objetivoCentral?.trim() || "Definición de objetivo central concertado";
    lineas.push(`### 2.1 Objetivo Central de Transformación`);
    lineas.push(`> **${objCentral}**`);
    lineas.push("");

    lineas.push(`### 2.2 Medios y Acciones Priorizadas`);
    if (as && as.medios.length > 0) {
      for (const [idx, mItem] of as.medios.entries()) {
        const actor = mItem.metadatos?.actorResponsable ? ` [Responsable: ${mItem.metadatos.actorResponsable}]` : "";
        const dim = mItem.metadatos?.dimensionOnu ? ` [Dimensión: ${mItem.metadatos.dimensionOnu}]` : "";
        const sub = mItem.metadatos?.origenSubmesaNombre ? ` *(Fuente: Submesa ${mItem.metadatos.origenSubmesaNombre})*` : "";
        lineas.push(`${idx + 1}. **${mItem.texto}**${actor}${dim}${sub}`);
        if (mItem.hijos && mItem.hijos.length > 0) {
          for (const h of mItem.hijos) {
            lineas.push(`   - Medio operativo complementario: ${h.texto}`);
          }
        }
      }
    } else {
      lineas.push(`*No se han formulado medios o líneas de intervención en la matriz.*`);
    }
    lineas.push("");

    lineas.push(`### 2.3 Fines e Impactos Esperados en Seguridad Humana`);
    if (as && as.fines.length > 0) {
      for (const [idx, f] of as.fines.entries()) {
        lineas.push(`${idx + 1}. ${f.texto}`);
        if (f.hijos && f.hijos.length > 0) {
          for (const h of f.hijos) {
            lineas.push(`   - Fin superior de sostenibilidad: ${h.texto}`);
          }
        }
      }
    } else {
      lineas.push(`*No se han formulado fines en la matriz.*`);
    }
    lineas.push("");

    lineas.push(`## 3. RESUMEN DE LA MATRIZ DE MARCO LÓGICO INTEGRADA`);
    lineas.push(`| N° | Causa Raíz (Problema) | Medio Estratégico (Solución) | Impacto / Fin Esperado |`);
    lineas.push(`|---|---|---|---|`);
    const numFilas = Math.max(ap?.causas.length || 0, as?.medios.length || 0);
    if (numFilas > 0) {
      for (let i = 0; i < numFilas; i++) {
        const causa = ap?.causas[i]?.texto || "—";
        const medio = as?.medios[i]?.texto || "—";
        const fin = as?.fines[i]?.texto || ap?.efectos[i]?.texto || "—";
        lineas.push(`| ${i + 1} | ${causa.replace(/\|/g, "/")} | ${medio.replace(/\|/g, "/")} | ${fin.replace(/\|/g, "/")} |`);
      }
    } else {
      lineas.push(`| 1 | Pendiente de consolidación | Pendiente de consolidación | Pendiente de consolidación |`);
    }
    lineas.push("");

    lineas.push(`## 4. CONCLUSIONES Y ACUERDOS DE LA JORNADA`);
    lineas.push(
      mesa.plenaria?.acuerdos?.trim() ||
        "La mesa concluyó la sesión con la formulación de los compromisos consignados en la matriz."
    );

    const borradorGenerado = lineas.join("\n");
    // Actualizar informe en el store
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, informe: borradorGenerado } : m
      ),
    }));

    return borradorGenerado;
  },

  /* ---------- Submesas ---------- */

  crearSubMesa: (mesaId, input) => {
    const sub: SubMesa = {
      id: input.id ?? `sm-nueva-${++subMesaSeq}`,
      nombre: input.nombre,
      tema: input.tema,
      participantes: input.participantes,
      asistentesPresenciales: null,
      adjuntos: [],
      arbolProblemas: { ...ARBOL_PROBLEMAS_VACIO, causas: [], efectos: [] },
      arbolSoluciones: { ...ARBOL_SOLUCIONES_VACIO, medios: [], fines: [] },
    };

    let creada: SubMesa | null = null;
    set((s) => ({
      mesas: s.mesas.map((m) => {
        if (m.id !== mesaId) return m;
        creada = sub;
        return { ...m, submesas: [...m.submesas, sub] };
      }),
    }));
    return creada;
  },

  eliminarSubMesa: (mesaId, submesaId) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, submesas: m.submesas.filter((sm) => sm.id !== submesaId) } : m
      ),
    })),

  agregarAdjuntoSubMesa: (mesaId, subMesaId, adjunto) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId
          ? {
              ...m,
              submesas: m.submesas.map((sm) =>
                sm.id === subMesaId
                  ? { ...sm, adjuntos: [...(sm.adjuntos ?? []), adjunto] }
                  : sm
              ),
            }
          : m
      ),
    })),

  eliminarAdjuntoSubMesa: (mesaId, subMesaId, adjuntoId) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId
          ? {
              ...m,
              submesas: m.submesas.map((sm) =>
                sm.id === subMesaId
                  ? {
                      ...sm,
                      adjuntos: (sm.adjuntos ?? []).filter((a) => a.id !== adjuntoId),
                    }
                  : sm
              ),
            }
          : m
      ),
    })),

  /* ---------- Papelografo ---------- */

  setArbolProblemasSubMesa: (mesaId, submesaId, arbol) =>
    set((s) =>
      mapSubMesa(s, mesaId, submesaId, (sub) => ({
        ...sub,
        arbolProblemas: arbol,
      }))
    ),

  setArbolSolucionesSubMesa: (mesaId, submesaId, arbol) =>
    set((s) =>
      mapSubMesa(s, mesaId, submesaId, (sub) => ({
        ...sub,
        arbolSoluciones: arbol,
      }))
    ),

  setTextoCentral: (mesaId, submesaId, arbol, texto) =>
    set((s) =>
      mapSubMesa(s, mesaId, submesaId, (sub) => {
        if (arbol === "problemas") {
          return {
            ...sub,
            arbolProblemas: { ...sub.arbolProblemas, problemaCentral: texto },
          };
        }
        return {
          ...sub,
          arbolSoluciones: { ...sub.arbolSoluciones, objetivoCentral: texto },
        };
      })
    ),

  agregarNodo: (mesaId, submesaId, arbol, rama, parentId) => {
    const nuevoId = uidNodo();
    const nuevo: NodoArbol = { id: nuevoId, texto: "", hijos: [] };

    set((s) =>
      mapSubMesa(s, mesaId, submesaId, (sub) =>
        mutarRama(sub, arbol, rama, (lista) => {
          if (parentId === null) {
            return [...lista, nuevo];
          }
          // cuelga de un primario → jerarquía secundaria
          return lista.map((n) =>
            n.id === parentId ? { ...n, hijos: [...n.hijos, nuevo] } : n
          );
        })
      )
    );

    // si el nodo no quedó insertado (parent inexistente), no devolvemos id
    const existe = get()
      .mesas.find((m) => m.id === mesaId)
      ?.submesas.find((sm) => sm.id === submesaId);
    return existe ? nuevoId : null;
  },

  setTextoNodo: (mesaId, submesaId, arbol, rama, nodoId, texto) =>
    set((s) =>
      mapSubMesa(s, mesaId, submesaId, (sub) =>
        mutarRama(sub, arbol, rama, (lista) =>
          lista.map((n) => {
            if (n.id === nodoId) return { ...n, texto };
            return {
              ...n,
              hijos: n.hijos.map((h) => (h.id === nodoId ? { ...h, texto } : h)),
            };
          })
        )
      )
    ),

  eliminarNodo: (mesaId, submesaId, arbol, rama, nodoId) =>
    set((s) =>
      mapSubMesa(s, mesaId, submesaId, (sub) =>
        mutarRama(sub, arbol, rama, (lista) => quitarNodo(lista, nodoId))
      )
    ),

  derivarSoluciones: (mesaId, submesaId) => {
    const sub = get()
      .mesas.find((m) => m.id === mesaId)
      ?.submesas.find((sm) => sm.id === submesaId);
    if (!sub) return false;

    const s = sub.arbolSoluciones;
    const yaExiste = s.objetivoCentral.trim() || s.medios.length > 0 || s.fines.length > 0;
    if (yaExiste) return false;

    const p = sub.arbolProblemas;
    set((st) =>
      mapSubMesa(st, mesaId, submesaId, (sm) => ({
        ...sm,
        arbolSoluciones: {
          objetivoCentral: p.problemaCentral,
          medios: clonarRama(p.causas),
          fines: clonarRama(p.efectos),
        },
      }))
    );
    return true;
  },
}));

/* ---------- Selectores / hooks ---------- */

export function useMesa(mesaId: string) {
  return useMesasStore((s) => s.mesas.find((m) => m.id === mesaId));
}

export function useSubMesa(mesaId: string, submesaId: string) {
  return useMesasStore(
    (s) => s.mesas.find((m) => m.id === mesaId)?.submesas.find((sm) => sm.id === submesaId)
  );
}
