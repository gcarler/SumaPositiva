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
    expect(state.sidebarColapsado).toBe(false);
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

  test("permite conmutar y fijar el estado colapsado del sidebar para modo compacto", () => {
    expect(useConfiguracionPlataformaStore.getState().sidebarColapsado).toBe(false);

    useConfiguracionPlataformaStore.getState().toggleSidebarColapsado();
    expect(useConfiguracionPlataformaStore.getState().sidebarColapsado).toBe(true);

    useConfiguracionPlataformaStore.getState().toggleSidebarColapsado();
    expect(useConfiguracionPlataformaStore.getState().sidebarColapsado).toBe(false);

    useConfiguracionPlataformaStore.getState().setSidebarColapsado(true);
    expect(useConfiguracionPlataformaStore.getState().sidebarColapsado).toBe(true);
  });

  test("permite ajustar y acotar el ancho del sidebar entre 200 y 420px (Encargo 323)", () => {
    const store = useConfiguracionPlataformaStore.getState();
    expect(store.sidebarAncho).toBe(272);

    store.setSidebarAncho(320);
    expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(320);

    // Clamping mínimo
    store.setSidebarAncho(150);
    expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(200);

    // Clamping máximo
    store.setSidebarAncho(500);
    expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(420);

    store.resetSidebarAncho();
    expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(272);
    expect(useConfiguracionPlataformaStore.getState().sidebarColapsado).toBe(false);
  });

  test("gestiona módulos expandidos y subvistas de módulos", () => {
    const store = useConfiguracionPlataformaStore.getState();
    expect(store.modulosExpandidos.dashboard).toBe(true);

    store.toggleModuloExpandido("dashboard");
    expect(useConfiguracionPlataformaStore.getState().modulosExpandidos.dashboard).toBe(false);

    store.setModuloExpandido("proyectos", true);
    expect(useConfiguracionPlataformaStore.getState().modulosExpandidos.proyectos).toBe(true);

    store.setSubvistaModulo("seguimiento", "matriz_compromisos");
    expect(useConfiguracionPlataformaStore.getState().subvistaPlataforma.seguimiento).toBe(
      "matriz_compromisos"
    );

    store.setPanelPendiente({ id: "mesa-editor", props: { mesa: null } });
    expect(useConfiguracionPlataformaStore.getState().panelPendiente).toEqual({
      id: "mesa-editor",
      props: { mesa: null },
    });
  });

  test("restablece la configuración original con resetearConfiguracion", () => {
    useConfiguracionPlataformaStore.getState().setResumenSemanal(true);
    useConfiguracionPlataformaStore.getState().setSidebarColapsado(true);
    useConfiguracionPlataformaStore.getState().setGeovisorCentro({
      latitud: "11.0000",
      longitud: "-74.0000",
      zoom: "18",
    });

    useConfiguracionPlataformaStore.getState().resetearConfiguracion();

    const state = useConfiguracionPlataformaStore.getState();
    expect(state.resumenSemanal).toBe(false);
    expect(state.sidebarColapsado).toBe(false);
    expect(state.geovisorCentro).toEqual(GEOVISOR_DEFAULT_CONFIG);
  });
});
