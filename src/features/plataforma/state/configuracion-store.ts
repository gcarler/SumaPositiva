"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface GeovisorCentroConfig {
  latitud: string;
  longitud: string;
  zoom: string;
}

export interface ConfiguracionPlataformaState {
  resumenSemanal: boolean;
  geovisorCentro: GeovisorCentroConfig;
  setResumenSemanal: (activo: boolean) => void;
  setGeovisorCentro: (coords: Partial<GeovisorCentroConfig>) => void;
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

      setResumenSemanal: (resumenSemanal: boolean) =>
        set({ resumenSemanal }),

      setGeovisorCentro: (coords: Partial<GeovisorCentroConfig>) =>
        set((state) => ({
          geovisorCentro: {
            ...state.geovisorCentro,
            ...coords,
          },
        })),

      resetearConfiguracion: () =>
        set({
          resumenSemanal: false,
          geovisorCentro: { ...GEOVISOR_DEFAULT_CONFIG },
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
