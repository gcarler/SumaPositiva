import { describe, test, expect, beforeEach } from "vitest";
import {
  useGeovisorLayoutStore,
  DEFAULT_DOCK_SIZES,
  DEFAULT_DOCK_VISIBILITY,
} from "./geovisor-layout-store";

describe("GeovisorLayoutStore (GEO-DOCK-01)", () => {
  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("inicia con los valores de visibilidad y tamaños balanceados por defecto", () => {
    const state = useGeovisorLayoutStore.getState();

    expect(state.topOpen).toBe(false);
    expect(state.leftOpen).toBe(true);
    expect(state.rightOpen).toBe(false);
    expect(state.bottomOpen).toBe(true);
    expect(state.isMaximized).toBe(false);

    expect(state.sizes.top).toBe(16);
    expect(state.sizes.left).toBe(22);
    expect(state.sizes.right).toBe(24);
    expect(state.sizes.bottom).toBe(28);
  });

  test("permite alternar la visibilidad de cada panel con togglePanel", () => {
    // Top está cerrado inicialmente -> debe abrirse
    useGeovisorLayoutStore.getState().togglePanel("top");
    expect(useGeovisorLayoutStore.getState().topOpen).toBe(true);

    // Left está abierto inicialmente -> debe cerrarse
    useGeovisorLayoutStore.getState().togglePanel("left");
    expect(useGeovisorLayoutStore.getState().leftOpen).toBe(false);

    // Right está cerrado inicialmente -> debe abrirse
    useGeovisorLayoutStore.getState().togglePanel("right");
    expect(useGeovisorLayoutStore.getState().rightOpen).toBe(true);

    // Bottom está abierto inicialmente -> debe cerrarse
    useGeovisorLayoutStore.getState().togglePanel("bottom");
    expect(useGeovisorLayoutStore.getState().bottomOpen).toBe(false);
  });

  test("permite establecer explícitamente el estado de un panel con setPanelOpen", () => {
    useGeovisorLayoutStore.getState().setPanelOpen("right", true);
    expect(useGeovisorLayoutStore.getState().rightOpen).toBe(true);

    useGeovisorLayoutStore.getState().setPanelOpen("top", true);
    expect(useGeovisorLayoutStore.getState().topOpen).toBe(true);
  });

  test("permite calibrar el tamaño porcentual y acota dentro de rangos seguros", () => {
    useGeovisorLayoutStore.getState().setPanelSize("left", 32);
    expect(useGeovisorLayoutStore.getState().sizes.left).toBe(32);

    // Valor inferior extremo acotado a 5%
    useGeovisorLayoutStore.getState().setPanelSize("left", 2);
    expect(useGeovisorLayoutStore.getState().sizes.left).toBe(5);

    // Valor superior extremo acotado a 65%
    useGeovisorLayoutStore.getState().setPanelSize("left", 90);
    expect(useGeovisorLayoutStore.getState().sizes.left).toBe(65);
  });

  test("maximizeMap colapsa todos los paneles y restaura el estado previo en la siguiente invocación", () => {
    // Estado inicial: left y bottom abiertos, top y right cerrados
    expect(useGeovisorLayoutStore.getState().topOpen).toBe(false);
    expect(useGeovisorLayoutStore.getState().leftOpen).toBe(true);
    expect(useGeovisorLayoutStore.getState().bottomOpen).toBe(true);

    // Maximizar mapa
    useGeovisorLayoutStore.getState().maximizeMap();
    const maximizado = useGeovisorLayoutStore.getState();
    expect(maximizado.topOpen).toBe(false);
    expect(maximizado.leftOpen).toBe(false);
    expect(maximizado.rightOpen).toBe(false);
    expect(maximizado.bottomOpen).toBe(false);
    expect(maximizado.isMaximized).toBe(true);

    // Restaurar mapa
    useGeovisorLayoutStore.getState().maximizeMap();
    const restaurado = useGeovisorLayoutStore.getState();
    expect(restaurado.topOpen).toBe(false);
    expect(restaurado.leftOpen).toBe(true);
    expect(restaurado.rightOpen).toBe(false);
    expect(restaurado.bottomOpen).toBe(true);
    expect(restaurado.isMaximized).toBe(false);
  });

  test("abrir manualmente un panel desactiva el estado isMaximized", () => {
    useGeovisorLayoutStore.getState().maximizeMap();
    expect(useGeovisorLayoutStore.getState().isMaximized).toBe(true);

    // Abrir panel derecho
    useGeovisorLayoutStore.getState().togglePanel("right");
    expect(useGeovisorLayoutStore.getState().rightOpen).toBe(true);
    expect(useGeovisorLayoutStore.getState().isMaximized).toBe(false);
  });

  test("resetLayout restaura los valores por defecto iniciales", () => {
    useGeovisorLayoutStore.getState().setPanelOpen("right", true);
    useGeovisorLayoutStore.getState().setPanelOpen("bottom", true);
    useGeovisorLayoutStore.getState().setPanelSize("left", 40);

    useGeovisorLayoutStore.getState().resetLayout();
    const reset = useGeovisorLayoutStore.getState();

    expect(reset.topOpen).toBe(DEFAULT_DOCK_VISIBILITY.topOpen);
    expect(reset.leftOpen).toBe(DEFAULT_DOCK_VISIBILITY.leftOpen);
    expect(reset.rightOpen).toBe(DEFAULT_DOCK_VISIBILITY.rightOpen);
    expect(reset.bottomOpen).toBe(DEFAULT_DOCK_VISIBILITY.bottomOpen);
    expect(reset.sizes).toEqual(DEFAULT_DOCK_SIZES);
    expect(reset.isMaximized).toBe(false);
  });
});
