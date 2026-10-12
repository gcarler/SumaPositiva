"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DockPanelId = "top" | "left" | "right" | "bottom";

export interface DockPanelSizes {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface DockPanelVisibility {
  topOpen: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
}

export interface GeovisorLayoutState extends DockPanelVisibility {
  sizes: DockPanelSizes;
  isMaximized: boolean;
  previousOpenState: DockPanelVisibility | null;
  togglePanel: (panelId: DockPanelId) => void;
  setPanelOpen: (panelId: DockPanelId, open: boolean) => void;
  setPanelSize: (panelId: DockPanelId, size: number) => void;
  maximizeMap: () => void;
  resetLayout: () => void;
}

export const DEFAULT_DOCK_SIZES: DockPanelSizes = {
  top: 14,
  left: 24,
  right: 26,
  bottom: 30,
};

export const DEFAULT_DOCK_VISIBILITY: DockPanelVisibility = {
  topOpen: true,
  leftOpen: true,
  rightOpen: false,
  bottomOpen: false,
};

const storageFallback = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useGeovisorLayoutStore = create<GeovisorLayoutState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_DOCK_VISIBILITY,
      sizes: { ...DEFAULT_DOCK_SIZES },
      isMaximized: false,
      previousOpenState: null,

      togglePanel: (panelId: DockPanelId) => {
        const key = `${panelId}Open` as const;
        set((state) => {
          const nextVal = !state[key];
          return {
            [key]: nextVal,
            // Si el usuario abre manualmente un panel, ya no estamos en modo maximizado pantalla limpia
            isMaximized: nextVal ? false : state.isMaximized,
          };
        });
      },

      setPanelOpen: (panelId: DockPanelId, open: boolean) => {
        const key = `${panelId}Open` as const;
        set((state) => ({
          [key]: open,
          isMaximized: open ? false : state.isMaximized,
        }));
      },

      setPanelSize: (panelId: DockPanelId, size: number) => {
        set((state) => ({
          sizes: {
            ...state.sizes,
            [panelId]: Math.max(5, Math.min(65, Math.round(size))),
          },
        }));
      },

      maximizeMap: () => {
        const state = get();
        const algunAbierto =
          state.topOpen || state.leftOpen || state.rightOpen || state.bottomOpen;

        if (state.isMaximized || !algunAbierto) {
          // Restaurar disposición previa
          const restore = state.previousOpenState ?? DEFAULT_DOCK_VISIBILITY;
          set({
            topOpen: restore.topOpen,
            leftOpen: restore.leftOpen,
            rightOpen: restore.rightOpen,
            bottomOpen: restore.bottomOpen,
            isMaximized: false,
            previousOpenState: null,
          });
        } else {
          // Guardar estado actual y cerrar todos los paneles para maximizar el canvas
          set({
            previousOpenState: {
              topOpen: state.topOpen,
              leftOpen: state.leftOpen,
              rightOpen: state.rightOpen,
              bottomOpen: state.bottomOpen,
            },
            topOpen: false,
            leftOpen: false,
            rightOpen: false,
            bottomOpen: false,
            isMaximized: true,
          });
        }
      },

      resetLayout: () => {
        set({
          ...DEFAULT_DOCK_VISIBILITY,
          sizes: { ...DEFAULT_DOCK_SIZES },
          isMaximized: false,
          previousOpenState: null,
        });
      },
    }),
    {
      name: "polis_geovisor_layout",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage;
        }
        if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
          return globalThis.localStorage as Storage;
        }
        return storageFallback;
      }),
    }
  )
);
