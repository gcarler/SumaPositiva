"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DockPanelId = "top" | "left" | "right" | "bottom";

export const DOCK_PANEL_IDS: readonly DockPanelId[] = ["top", "left", "right", "bottom"];

/** Vistas (pestañas) que pueden alojarse en cualquiera de los 4 paneles acoplados. */
export type GeovisorViewId =
  | "filtros"
  | "capas"
  | "mesas"
  | "ficha"
  | "territorio"
  | "datagrid"
  | "graficos"
  | "hurtos"
  | "fuentes";

export const GEOVISOR_VIEW_IDS: readonly GeovisorViewId[] = [
  "filtros",
  "capas",
  "mesas",
  "ficha",
  "territorio",
  "datagrid",
  "graficos",
  "hurtos",
  "fuentes",
];

export type DockTabs = Record<DockPanelId, GeovisorViewId[]>;
export type DockActiveTab = Record<DockPanelId, GeovisorViewId | null>;

export const DEFAULT_DOCK_TABS: DockTabs = {
  top: ["filtros"],
  left: ["capas"],
  right: [],
  bottom: ["hurtos"],
};

export const DEFAULT_DOCK_ACTIVE: DockActiveTab = {
  top: "filtros",
  left: "capas",
  right: null,
  bottom: "hurtos",
};

/** Límites (en %) de cada panel respecto a su grupo; también usados al expandir un panel. */
export const DOCK_LIMITS: Record<DockPanelId, { min: number; max: number }> = {
  top: { min: 8, max: 30 },
  left: { min: 14, max: 50 },
  right: { min: 16, max: 50 },
  bottom: { min: 12, max: 60 },
};

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
  /** Vistas acopladas (pestañas) por panel, en orden. */
  tabs: DockTabs;
  /** Pestaña activa de cada panel. */
  activeTab: DockActiveTab;
  /** Panel expandido a su tamaño máximo (como "maximizar panel" de VS Code). */
  expandedDock: DockPanelId | null;
  togglePanel: (panelId: DockPanelId) => void;
  setPanelOpen: (panelId: DockPanelId, open: boolean) => void;
  setPanelSize: (panelId: DockPanelId, size: number) => void;
  maximizeMap: () => void;
  resetLayout: () => void;
  setActiveView: (panelId: DockPanelId, viewId: GeovisorViewId) => void;
  /** Muestra una vista: la activa donde esté acoplada o la acopla en `panelId` / su panel original. */
  openView: (viewId: GeovisorViewId, panelId?: DockPanelId) => void;
  /** Quita una vista de su panel (se puede volver a abrir desde el menú Vistas). */
  closeView: (viewId: GeovisorViewId) => void;
  /** Mueve una vista a otro panel (o la reordena dentro del mismo). */
  moveView: (viewId: GeovisorViewId, panelId: DockPanelId, index?: number) => void;
  toggleDockExpanded: (panelId: DockPanelId) => void;
}

export function findViewDock(tabs: DockTabs, viewId: GeovisorViewId): DockPanelId | null {
  return DOCK_PANEL_IDS.find((d) => tabs[d].includes(viewId)) ?? null;
}

export function defaultDockForView(viewId: GeovisorViewId): DockPanelId {
  if (viewId === "hurtos" || viewId === "datagrid" || viewId === "graficos" || viewId === "fuentes") return "bottom";
  if (viewId === "ficha" || viewId === "territorio") return "right";
  if (viewId === "capas" || viewId === "mesas") return "left";
  return "top";
}

function cloneTabs(tabs: DockTabs): DockTabs {
  return { top: [...tabs.top], left: [...tabs.left], right: [...tabs.right], bottom: [...tabs.bottom] };
}

/** Normaliza una configuración persistida: sin ids desconocidos ni duplicados. */
export function sanitizeDockTabs(raw: unknown): DockTabs {
  const out: DockTabs = { top: [], left: [], right: [], bottom: [] };
  if (!raw || typeof raw !== "object") return cloneTabs(DEFAULT_DOCK_TABS);
  const seen = new Set<string>();
  for (const dock of DOCK_PANEL_IDS) {
    const list = (raw as Record<string, unknown>)[dock];
    if (!Array.isArray(list)) continue;
    for (const id of list) {
      if (typeof id === "string" && (GEOVISOR_VIEW_IDS as readonly string[]).includes(id) && !seen.has(id)) {
        seen.add(id);
        out[dock].push(id as GeovisorViewId);
      }
    }
  }
  return out;
}

function sanitizeActive(raw: unknown, tabs: DockTabs): DockActiveTab {
  const out = {} as DockActiveTab;
  for (const dock of DOCK_PANEL_IDS) {
    const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>)[dock] : null;
    out[dock] =
      typeof candidate === "string" && (tabs[dock] as string[]).includes(candidate)
        ? (candidate as GeovisorViewId)
        : (tabs[dock][0] ?? null);
  }
  return out;
}

export const DEFAULT_DOCK_SIZES: DockPanelSizes = {
  top: 16,
  left: 22,
  right: 24,
  bottom: 28,
};

export const DEFAULT_DOCK_VISIBILITY: DockPanelVisibility = {
  topOpen: false,
  leftOpen: true,
  rightOpen: false,
  bottomOpen: true,
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
      tabs: cloneTabs(DEFAULT_DOCK_TABS),
      activeTab: { ...DEFAULT_DOCK_ACTIVE },
      expandedDock: null,

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
          tabs: cloneTabs(DEFAULT_DOCK_TABS),
          activeTab: { ...DEFAULT_DOCK_ACTIVE },
          expandedDock: null,
        });
      },

      setActiveView: (panelId, viewId) => {
        set((state) =>
          state.tabs[panelId].includes(viewId)
            ? { activeTab: { ...state.activeTab, [panelId]: viewId } }
            : state
        );
      },

      openView: (viewId, panelId) => {
        set((state) => {
          const current = findViewDock(state.tabs, viewId);
          const target = current ?? panelId ?? defaultDockForView(viewId);
          const tabs = cloneTabs(state.tabs);
          if (!current) tabs[target].push(viewId);
          const openKey = `${target}Open` as const;
          return {
            tabs,
            activeTab: { ...state.activeTab, [target]: viewId },
            [openKey]: true,
            isMaximized: false,
          };
        });
      },

      closeView: (viewId) => {
        set((state) => {
          const dock = findViewDock(state.tabs, viewId);
          if (!dock) return state;
          const tabs = cloneTabs(state.tabs);
          const idx = tabs[dock].indexOf(viewId);
          tabs[dock].splice(idx, 1);
          const wasActive = state.activeTab[dock] === viewId;
          const nextActive = wasActive
            ? (tabs[dock][Math.min(idx, tabs[dock].length - 1)] ?? null)
            : state.activeTab[dock];
          return {
            tabs,
            activeTab: { ...state.activeTab, [dock]: nextActive },
            ...(tabs[dock].length === 0
              ? {
                  [`${dock}Open`]: false,
                  expandedDock: state.expandedDock === dock ? null : state.expandedDock,
                }
              : {}),
          };
        });
      },

      moveView: (viewId, panelId, index) => {
        set((state) => {
          const source = findViewDock(state.tabs, viewId);
          const tabs = cloneTabs(state.tabs);
          if (source) {
            tabs[source].splice(tabs[source].indexOf(viewId), 1);
          }
          const at = index === undefined ? tabs[panelId].length : Math.max(0, Math.min(index, tabs[panelId].length));
          tabs[panelId].splice(at, 0, viewId);
          const activeTab = { ...state.activeTab, [panelId]: viewId };
          const extra: Partial<GeovisorLayoutState> = {};
          if (source && source !== panelId) {
            activeTab[source] =
              state.activeTab[source] === viewId ? (tabs[source][0] ?? null) : state.activeTab[source];
            if (tabs[source].length === 0) {
              (extra as Record<string, unknown>)[`${source}Open`] = false;
              if (state.expandedDock === source) extra.expandedDock = null;
            }
          }
          return {
            tabs,
            activeTab,
            [`${panelId}Open`]: true,
            isMaximized: false,
            ...extra,
          };
        });
      },

      toggleDockExpanded: (panelId) => {
        set((state) => ({
          expandedDock: state.expandedDock === panelId ? null : panelId,
          [`${panelId}Open`]: true,
          isMaximized: false,
        }));
      },
    }),
    {
      name: "polis_geovisor_layout",
      version: 4,
      migrate: (persisted, version) => {
        if (typeof version === "number" && version < 4) {
          return {
            ...DEFAULT_DOCK_VISIBILITY,
            sizes: { ...DEFAULT_DOCK_SIZES },
            isMaximized: false,
            previousOpenState: null,
            tabs: cloneTabs(DEFAULT_DOCK_TABS),
            activeTab: { ...DEFAULT_DOCK_ACTIVE },
            expandedDock: null,
          } as GeovisorLayoutState;
        }
        return persisted as GeovisorLayoutState;
      },
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<GeovisorLayoutState>;
        const hasTabs = saved.tabs !== undefined;
        const tabs = hasTabs ? sanitizeDockTabs(saved.tabs) : cloneTabs(DEFAULT_DOCK_TABS);
        if (!findViewDock(tabs, "hurtos")) {
          tabs.bottom.unshift("hurtos");
        }
        return {
          ...current,
          ...saved,
          tabs,
          activeTab: sanitizeActive(saved.activeTab, tabs),
          expandedDock: null,
        };
      },
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
