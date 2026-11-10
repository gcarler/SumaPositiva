"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface GeovisorCentroConfig {
  latitud: string;
  longitud: string;
  zoom: string;
}

export const SIDEBAR_ANCHO_DEFAULT = 272;
export const SIDEBAR_ANCHO_MIN = 200;
export const SIDEBAR_ANCHO_MAX = 420;

export const MODULOS_EXPANDIDOS_DEFAULT: Record<string, boolean> = {
  dashboard: true,
  mesas: true,
  seguimiento: true,
};

export interface ConfiguracionPlataformaState {
  resumenSemanal: boolean;
  geovisorCentro: GeovisorCentroConfig;
  sidebarColapsado: boolean;
  sidebarAncho: number;
  modulosExpandidos: Record<string, boolean>;
  subvistaPlataforma: Record<string, string>;
  panelPendiente: { id: string; props?: Record<string, unknown> } | null;
  setResumenSemanal: (activo: boolean) => void;
  setGeovisorCentro: (coords: Partial<GeovisorCentroConfig>) => void;
  setSidebarColapsado: (sidebarColapsado: boolean) => void;
  toggleSidebarColapsado: () => void;
  setSidebarAncho: (ancho: number) => void;
  resetSidebarAncho: () => void;
  toggleModuloExpandido: (id: string) => void;
  setModuloExpandido: (id: string, expandido: boolean) => void;
  setSubvistaModulo: (moduloId: string, subvista: string) => void;
  setPanelPendiente: (panel: { id: string; props?: Record<string, unknown> } | null) => void;
  resetearConfiguracion: () => void;
}

export const GEOVISOR_DEFAULT_CONFIG: GeovisorCentroConfig = {
  latitud: "10.3997",
  longitud: "-75.5144",
  zoom: "13",
};

const storageFallback = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useConfiguracionPlataformaStore = create<ConfiguracionPlataformaState>()(
  persist(
    (set) => ({
      resumenSemanal: false,
      geovisorCentro: { ...GEOVISOR_DEFAULT_CONFIG },
      sidebarColapsado: false,
      sidebarAncho: SIDEBAR_ANCHO_DEFAULT,
      modulosExpandidos: { ...MODULOS_EXPANDIDOS_DEFAULT },
      subvistaPlataforma: {},
      panelPendiente: null,

      setResumenSemanal: (resumenSemanal: boolean) =>
        set({ resumenSemanal }),

      setGeovisorCentro: (coords: Partial<GeovisorCentroConfig>) =>
        set((state) => ({
          geovisorCentro: {
            ...state.geovisorCentro,
            ...coords,
          },
        })),

      setSidebarColapsado: (sidebarColapsado: boolean) =>
        set({ sidebarColapsado }),

      toggleSidebarColapsado: () =>
        set((state) => ({ sidebarColapsado: !state.sidebarColapsado })),

      setSidebarAncho: (ancho: number) =>
        set({
          sidebarAncho: Math.min(
            SIDEBAR_ANCHO_MAX,
            Math.max(SIDEBAR_ANCHO_MIN, Math.round(ancho))
          ),
        }),

      resetSidebarAncho: () =>
        set({
          sidebarAncho: SIDEBAR_ANCHO_DEFAULT,
          sidebarColapsado: false,
        }),

      toggleModuloExpandido: (id: string) =>
        set((state) => ({
          modulosExpandidos: {
            ...state.modulosExpandidos,
            [id]: !state.modulosExpandidos[id],
          },
        })),

      setModuloExpandido: (id: string, expandido: boolean) =>
        set((state) => ({
          modulosExpandidos: {
            ...state.modulosExpandidos,
            [id]: expandido,
          },
        })),

      setSubvistaModulo: (moduloId: string, subvista: string) =>
        set((state) => ({
          subvistaPlataforma: {
            ...state.subvistaPlataforma,
            [moduloId]: subvista,
          },
        })),

      setPanelPendiente: (panel: { id: string; props?: Record<string, unknown> } | null) =>
        set({ panelPendiente: panel }),

      resetearConfiguracion: () =>
        set({
          resumenSemanal: false,
          geovisorCentro: { ...GEOVISOR_DEFAULT_CONFIG },
          sidebarColapsado: false,
          sidebarAncho: SIDEBAR_ANCHO_DEFAULT,
          modulosExpandidos: { ...MODULOS_EXPANDIDOS_DEFAULT },
          subvistaPlataforma: {},
          panelPendiente: null,
        }),
    }),
    {
      name: "polis-configuracion-parametros",
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
