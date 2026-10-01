"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { POLITICAS_MOCK } from "@/features/politicas/data/politicas.mock";
import type {
  Aporte,
  EstadoPolitica,
  PoliticaPublica,
  Sector,
  TipoAporte,
} from "@/features/politicas/models/politicas";

/**
 * POLIS — Store de datos de políticas
 * Estado cliente con mutaciones optimistas (aportes, apoyos).
 * Cuando exista backend FastAPI, estas acciones llamarán a apiFetch
 * y las mutaciones se sincronizarán vía WebSockets.
 */

interface PoliticasState {
  politicas: PoliticaPublica[];

  /* Filtros de la vista explorar */
  sectorFiltro: Sector | "todos";
  estadoFiltro: EstadoPolitica | "todos";
  busqueda: string;
  setSectorFiltro: (s: Sector | "todos") => void;
  setEstadoFiltro: (s: EstadoPolitica | "todos") => void;
  setBusqueda: (q: string) => void;

  /* Mutaciones */
  crearAporte: (input: {
    politicaId: string;
    lineaId: string;
    tipo: TipoAporte;
    titulo: string;
    contenido: string;
    autor: string;
    /** undefined = anónimo */
    autorId?: string;
    /** dataURLs comprimidos en cliente */
    fotos?: string[];
  }) => Aporte | null;
  toggleApoyo: (lineaId: string, aporteId: string) => void;

}

let aporteSeq = 1000;

export const usePoliticasStore = create<PoliticasState>((set) => ({
  politicas: POLITICAS_MOCK,

  sectorFiltro: "todos",
  estadoFiltro: "todos",
  busqueda: "",
  setSectorFiltro: (sectorFiltro) => set({ sectorFiltro }),
  setEstadoFiltro: (estadoFiltro) => set({ estadoFiltro }),
  setBusqueda: (busqueda) => set({ busqueda }),

  crearAporte: ({ politicaId, lineaId, tipo, titulo, contenido, autor, autorId, fotos }) => {
    const aporte: Aporte = {
      id: `apo-nuevo-${++aporteSeq}`,
      lineaId,
      tipo,
      titulo,
      contenido,
      autor,
      autorId,
      fotos: fotos && fotos.length > 0 ? fotos : undefined,
      fecha: new Date().toISOString(),
      votos: 0,
      apoyado: false,
    };

    let created: Aporte | null = null;

    set((s) => ({
      politicas: s.politicas.map((p) => {
        if (p.id !== politicaId) return p;
        return {
          ...p,
          fases: p.fases.map((f) => ({
            ...f,
            lineas: f.lineas.map((l) => {
              if (l.id !== lineaId) return l;
              created = aporte;
              return { ...l, aportes: [aporte, ...l.aportes] };
            }),
          })),
        };
      }),
    }));

    return created;
  },

  toggleApoyo: (lineaId, aporteId) =>
    set((s) => ({
      politicas: s.politicas.map((p) => ({
        ...p,
        fases: p.fases.map((f) => ({
          ...f,
          lineas: f.lineas.map((l) => {
            if (l.id !== lineaId) return l;
            return {
              ...l,
              aportes: l.aportes.map((a) => {
                if (a.id !== aporteId) return a;
                return {
                  ...a,
                  apoyado: !a.apoyado,
                  votos: a.votos + (a.apoyado ? -1 : 1),
                };
              }),
            };
          }),
        })),
      })),
    })),

}));

/* ---------- Selectores ---------- */

export function selectPolitica(state: PoliticasState, id: string) {
  return state.politicas.find((p) => p.id === id);
}

export function usePolitica(id: string) {
  return usePoliticasStore((s) => s.politicas.find((p) => p.id === id));
}

export function useFase(politicaId: string, faseId: string) {
  return usePoliticasStore(
    (s) => s.politicas.find((p) => p.id === politicaId)?.fases.find((f) => f.id === faseId)
  );
}

export function useLinea(politicaId: string, faseId: string, lineaId: string) {
  return usePoliticasStore((s) => {
    const p = s.politicas.find((p) => p.id === politicaId);
    return p?.fases
      .find((f) => f.id === faseId)
      ?.lineas.find((l) => l.id === lineaId);
  });
}

export function usePoliticasFiltradas() {
  const politicas = usePoliticasStore((s) => s.politicas);
  const sectorFiltro = usePoliticasStore((s) => s.sectorFiltro);
  const estadoFiltro = usePoliticasStore((s) => s.estadoFiltro);
  const busqueda = usePoliticasStore((s) => s.busqueda);

  return useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return politicas.filter((p) => {
      if (sectorFiltro !== "todos" && p.sector !== sectorFiltro) return false;
      if (estadoFiltro !== "todos" && p.estado !== estadoFiltro) return false;
      if (q) {
        const haystack = `${p.titulo} ${p.resumen} ${p.problema}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [politicas, sectorFiltro, estadoFiltro, busqueda]);
}
