"use client";

import { create } from "zustand";

/**
 * Núcleo genérico del sistema de paneles laterales.
 * Los dominios agregan sus contratos en el punto de composición de la app.
 */
export declare const panelPropsRegistryBrand: unique symbol;
export interface PanelPropsRegistry {
  readonly [panelPropsRegistryBrand]?: never;
}

export type PanelType = keyof PanelPropsRegistry & string;

export type PanelComponentProps<T extends PanelType = PanelType> = {
  entryKey: string;
  props: PanelPropsRegistry[T];
};

export type PanelEntry<T extends PanelType> = {
  key: string;
  type: T;
  props: PanelPropsRegistry[T];
  maximized: boolean;
};

export type AnyPanelEntry = {
  [T in PanelType]: PanelEntry<T>;
}[PanelType];

interface PanelState {
  entries: AnyPanelEntry[];
  openPanel: <T extends PanelType>(type: T, props: PanelPropsRegistry[T]) => void;
  closeTop: () => void;
  closeToKey: (key: string, inclusive?: boolean) => void;
  closeAll: () => void;
  toggleMaximized: (key: string) => void;
}

let sequence = 0;
const nextKey = (type: string) => `${type}-${++sequence}-${Date.now()}`;

function createEntry<T extends PanelType>(
  type: T,
  props: PanelPropsRegistry[T],
): AnyPanelEntry {
  // The generic arguments keep `type` and `props` correlated; the mapped union
  // is not inferred by TypeScript when T itself is generic.
  return { key: nextKey(type), type, props, maximized: false } as AnyPanelEntry;
}

export const usePanelStore = create<PanelState>((set) => ({
  entries: [],

  openPanel: <T extends PanelType>(type: T, props: PanelPropsRegistry[T]) =>
    set((state) => ({
      // Conserva un máximo de cinco instancias en la pila.
      entries: [...state.entries.slice(-4), createEntry(type, props)],
    })),

  closeTop: () => set((state) => ({ entries: state.entries.slice(0, -1) })),

  closeToKey: (key, inclusive = false) =>
    set((state) => {
      const index = state.entries.findIndex((entry) => entry.key === key);
      if (index === -1) return { entries: [] };
      return { entries: state.entries.slice(0, inclusive ? index : index + 1) };
    }),

  closeAll: () => set({ entries: [] }),

  toggleMaximized: (key) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.key === key ? { ...entry, maximized: !entry.maximized } : entry,
      ),
    })),
}));

export function usePanels() {
  const openPanel = usePanelStore((state) => state.openPanel);
  const closeTop = usePanelStore((state) => state.closeTop);
  const closeAll = usePanelStore((state) => state.closeAll);
  const closeToKey = usePanelStore((state) => state.closeToKey);
  return { openPanel, closeTop, closeAll, closeToKey };
}
