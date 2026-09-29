"use client";

import { create } from "zustand";

/**
 * POLIS — Núcleo del patrón Zero-Modals
 * Un único store global controla la pila de paneles laterales.
 * Cualquier vista puede hacer push de un panel; los paneles se apilan
 * para navegación anidada (Política → Fase → Línea → Aporte).
 */

export type PanelType = "politica" | "fase" | "linea" | "aportar";

/** Props tipadas por tipo de panel — imposible abrir un panel con props inválidas */
export interface PanelPropsMap {
  politica: { politicaId: string };
  fase: { politicaId: string; faseId: string };
  linea: { politicaId: string; faseId: string; lineaId: string };
  aporte: { politicaId: string; faseId: string; lineaId: string };
}

export type PanelEntry<T extends PanelType = PanelType> = {
  /** clave única de instancia (permite dos paneles del mismo tipo si hiciera falta) */
  key: string;
  type: T;
  props: PanelPropsMap[T];
};

interface PanelState {
  entries: PanelEntry[];
  /** índice (desde el tope) del panel activo — 0 = tope */
  openPanel: <T extends PanelType>(type: T, props: PanelPropsMap[T]) => void;
  closeTop: () => void;
  /** cierra la pila hasta cierto panel (inclusive si `inclusive`), usado por breadcrumbs */
  closeToKey: (key: string, inclusive?: boolean) => void;
  closeAll: () => void;
}

let seq = 0;
const nextKey = (type: string) => `${type}-${++seq}-${Date.now()}`;

export const usePanelStore = create<PanelState>((set) => ({
  entries: [],

  openPanel: (type, props) =>
    set((s) => ({
      // límite de seguridad: máximo 5 paneles apilados
      entries: [
        ...s.entries.slice(-4),
        { key: nextKey(type), type, props } as PanelEntry,
      ],
    })),

  closeTop: () =>
    set((s) => ({ entries: s.entries.slice(0, -1) })),

  closeToKey: (key, inclusive = false) =>
    set((s) => {
      const idx = s.entries.findIndex((e) => e.key === key);
      if (idx === -1) return { entries: [] };
      return { entries: s.entries.slice(0, inclusive ? idx : idx + 1) };
    }),

  closeAll: () => set({ entries: [] }),
}));

/** Hook ergonómico para abrir paneles desde cualquier componente */
export function usePanels() {
  const openPanel = usePanelStore((s) => s.openPanel);
  const closeTop = usePanelStore((s) => s.closeTop);
  const closeAll = usePanelStore((s) => s.closeAll);
  const closeToKey = usePanelStore((s) => s.closeToKey);
  return { openPanel, closeTop, closeAll, closeToKey };
}
