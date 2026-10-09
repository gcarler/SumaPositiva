import { describe, expect, test, beforeEach } from "vitest";
import {
  useConfiguracionPlataformaStore,
  GEOVISOR_DEFAULT_CONFIG,
} from "./configuracion-store";

// Asegurar mock de Storage para entorno Node/Bun si no existe nativo
if (typeof globalThis.localStorage === "undefined") {
  const memoria = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => memoria.get(key) ?? null,
    setItem: (key: string, value: string) => memoria.set(key, String(value)),
    removeItem: (key: string) => memoria.delete(key),
    clear: () => memoria.clear(),
    key: (index: number) => Array.from(memoria.keys())[index] ?? null,
    length: memoria.size,
  } as Storage;
}

describe("Store de Configuración Persistente de Plataforma (GAP-12)", () => {
  beforeEach(() => {
    useConfiguracionPlataformaStore.getState().resetearConfiguracion();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  test("inicia con los valores canónicos por defecto", () => {
    const state = useConfiguracionPlataformaStore.getState();
    expect(state.resumenSemanal).toBe(false);
    expect(state.geovisorCentro).toEqual(GEOVISOR_DEFAULT_CONFIG);
  });

  test("permite conmutar la preferencia de resumen semanal", () => {
    useConfiguracionPlataformaStore.getState().setResumenSemanal(true);
    expect(useConfiguracionPlataformaStore.getState().resumenSemanal).toBe(true);

    useConfiguracionPlataformaStore.getState().setResumenSemanal(false);
    expect(useConfiguracionPlataformaStore.getState().resumenSemanal).toBe(false);
  });

  test("permite actualizar parcialmente las coordenadas de referencia del geovisor", () => {
    useConfiguracionPlataformaStore.getState().setGeovisorCentro({
      latitud: "10.4245",
      zoom: "15",
    });

    const centro = useConfiguracionPlataformaStore.getState().geovisorCentro;
    expect(centro.latitud).toBe("10.4245");
    expect(centro.zoom).toBe("15");
    expect(centro.longitud).toBe(GEOVISOR_DEFAULT_CONFIG.longitud);
  });

  test("restablece la configuración original con resetearConfiguracion", () => {
    useConfiguracionPlataformaStore.getState().setResumenSemanal(true);
    useConfiguracionPlataformaStore.getState().setGeovisorCentro({
      latitud: "11.0000",
      longitud: "-74.0000",
      zoom: "18",
    });

    useConfiguracionPlataformaStore.getState().resetearConfiguracion();

    const state = useConfiguracionPlataformaStore.getState();
    expect(state.resumenSemanal).toBe(false);
    expect(state.geovisorCentro).toEqual(GEOVISOR_DEFAULT_CONFIG);
  });
});
