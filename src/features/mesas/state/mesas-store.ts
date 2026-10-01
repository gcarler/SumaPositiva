"use client";

import { create } from "zustand";
import { MESAS_MOCK } from "@/features/mesas/data/mesas.mock";
import type {
  ArbolKind,
  ArbolSoluciones,
  MesaDeTrabajo,
  NodoArbol,
  RamaArbol,
  SubMesa,
} from "@/features/mesas/models/mesas";
import { uidNodo } from "@/features/mesas/models/mesas";

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
  entidad: string;
  facilitador: string;
  totalAsistentes: number;
}

export interface SubMesaInput {
  nombre: string;
  tema: string;
  participantes: number | null;
}

interface MesasState {
  mesas: MesaDeTrabajo[];

  /* Mesa */
  crearMesa: (input: MesaInput) => MesaDeTrabajo;
  actualizarMesa: (mesaId: string, patch: Partial<MesaInput>) => void;
  setAcuerdosPlenaria: (mesaId: string, acuerdos: string) => void;
  eliminarMesa: (mesaId: string) => void;

  /* Submesas */
  crearSubMesa: (mesaId: string, input: SubMesaInput) => SubMesa | null;
  eliminarSubMesa: (mesaId: string, submesaId: string) => void;

  /* Papelografo */
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
  mesas: MESAS_MOCK,

  /* ---------- Mesa ---------- */

  crearMesa: (input) => {
    const mesa: MesaDeTrabajo = {
      id: `mesa-nueva-${++mesaSeq}`,
      ...input,
      plenaria: { acuerdos: "" },
      submesas: [],
      estado: "programada",
    };
    set((s) => ({ mesas: [mesa, ...s.mesas] }));
    return mesa;
  },

  actualizarMesa: (mesaId, patch) =>
    set((s) => ({
      mesas: s.mesas.map((m) => (m.id === mesaId ? { ...m, ...patch } : m)),
    })),

  setAcuerdosPlenaria: (mesaId, acuerdos) =>
    set((s) => ({
      mesas: s.mesas.map((m) =>
        m.id === mesaId ? { ...m, plenaria: { ...m.plenaria, acuerdos } } : m
      ),
    })),

  eliminarMesa: (mesaId) =>
    set((s) => ({ mesas: s.mesas.filter((m) => m.id !== mesaId) })),

  /* ---------- Submesas ---------- */

  crearSubMesa: (mesaId, input) => {
    const sub: SubMesa = {
      id: `sm-nueva-${++subMesaSeq}`,
      nombre: input.nombre,
      tema: input.tema,
      participantes: input.participantes,
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

  /* ---------- Papelografo ---------- */

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
