import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorWorkspaceLayout } from "./geovisor-workspace-layout";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

describe("GeovisorWorkspaceLayout Component (GEO-DOCK-01)", () => {
  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("renderiza el contenedor principal con semántica accesible y test ID", () => {
    const html = renderToString(
      <GeovisorWorkspaceLayout
        centerSlot={<div data-testid="test-map-canvas">Mapa Test</div>}
      />
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Espacio de trabajo cartográfico y analítico de POLIS"');
    expect(html).toContain('data-testid="geovisor-workspace-layout"');
    expect(html).toContain('data-testid="test-map-canvas"');
    expect(html).toContain("Mapa Test");
  });

  test("el slot central (lienzo OpenLayers) siempre se renderiza y nunca se omite", () => {
    const html = renderToString(
      <GeovisorWorkspaceLayout
        topSlot={<div>Filtros Top</div>}
        leftSlot={<div>Capas Left</div>}
        centerSlot={<div id="map-root">Canvas OpenLayers Activo</div>}
        rightSlot={<div>Inspector Right</div>}
        bottomSlot={<div>Consola Bottom</div>}
      />
    );

    expect(html).toContain('id="map-root"');
    expect(html).toContain("Canvas OpenLayers Activo");
    expect(html).toContain('data-dock-panel="center"');
  });

  test("refleja el estado por defecto del store: top y left activos, right y bottom colapsados", () => {
    const html = renderToString(
      <GeovisorWorkspaceLayout
        topSlot={<div>Contenido Superior</div>}
        leftSlot={<div>Contenido Izquierdo</div>}
        centerSlot={<div>Mapa Central</div>}
        rightSlot={<div>Contenido Derecho</div>}
        bottomSlot={<div>Contenido Inferior</div>}
      />
    );

    // Top activo (defaultSize 18)
    expect(html).toContain('id="dock-panel-top"');
    expect(html).toContain('data-panel-size="18.0"');

    // Left activo (defaultSize 24)
    expect(html).toContain('id="dock-panel-left"');
    expect(html).toContain('data-panel-size="24.0"');

    // Right colapsado (defaultSize 0.0)
    expect(html).toContain('id="dock-panel-right"');
    expect(html).toContain('data-panel-size="0.0"');

    // Bottom colapsado (defaultSize 0.0)
    expect(html).toContain('id="dock-panel-bottom"');
    expect(html).toContain('data-panel-size="0.0"');

    // Separadores de paneles cerrados deben tener clase hidden
    expect(html).toContain('data-dock-handle="right"');
    expect(html).toContain('data-dock-handle="bottom"');
  });

  test("actualiza el dimensionamiento cuando se activan los paneles derecho e inferior en el store", () => {
    const store = useGeovisorLayoutStore.getState();
    store.togglePanel("right");
    store.togglePanel("bottom");

    const html = renderToString(
      <GeovisorWorkspaceLayout
        topSlot={<div>Contenido Superior</div>}
        leftSlot={<div>Contenido Izquierdo</div>}
        centerSlot={<div>Mapa Central</div>}
        rightSlot={<div>Contenido Derecho</div>}
        bottomSlot={<div>Contenido Inferior</div>}
      />
    );

    // Right y Bottom ahora activos con sus tamaños configurados
    expect(html).toContain('id="dock-panel-right"');
    expect(html).toContain('data-panel-size="26.0"');

    expect(html).toContain('id="dock-panel-bottom"');
    expect(html).toContain('data-panel-size="20.0"');
  });

  test("maximizar mapa colapsa los 4 paneles a tamaño 0.0 mientras preserva el mapa central", () => {
    const store = useGeovisorLayoutStore.getState();
    store.maximizeMap();

    const html = renderToString(
      <GeovisorWorkspaceLayout
        topSlot={<div>Contenido Superior</div>}
        leftSlot={<div>Contenido Izquierdo</div>}
        centerSlot={<div id="map-inmortal">Canvas Intacto</div>}
        rightSlot={<div>Contenido Derecho</div>}
        bottomSlot={<div>Contenido Inferior</div>}
      />
    );

    // Los 4 paneles colapsados a 0.0
    expect(html).toContain('id="dock-panel-top"');
    expect(html).toContain('data-panel-size="0.0"');

    expect(html).toContain('id="dock-panel-left"');
    expect(html).toContain('data-panel-size="0.0"');

    expect(html).toContain('id="dock-panel-right"');
    expect(html).toContain('data-panel-size="0.0"');

    expect(html).toContain('id="dock-panel-bottom"');
    expect(html).toContain('data-panel-size="0.0"');

    // El mapa central sigue presente y con su slot
    expect(html).toContain('id="map-inmortal"');
    expect(html).toContain("Canvas Intacto");
  });

  test("restablecer layout vuelve a colocar los tamaños y visibilidad por defecto", () => {
    const store = useGeovisorLayoutStore.getState();
    store.maximizeMap();
    store.resetLayout();

    const html = renderToString(
      <GeovisorWorkspaceLayout
        topSlot={<div>Contenido Superior</div>}
        leftSlot={<div>Contenido Izquierdo</div>}
        centerSlot={<div>Mapa Central</div>}
        rightSlot={<div>Contenido Derecho</div>}
        bottomSlot={<div>Contenido Inferior</div>}
      />
    );

    expect(html).toContain('data-panel-size="18.0"'); // Top
    expect(html).toContain('data-panel-size="24.0"'); // Left
  });

  test("maneja slots ausentes sin fallar y mantiene los paneles colapsados", () => {
    const html = renderToString(
      <GeovisorWorkspaceLayout
        centerSlot={<div>Solo Mapa</div>}
      />
    );

    // Sin topSlot ni leftSlot provistos, deben colapsarse a 0.0
    expect(html).toContain('id="dock-panel-top"');
    expect(html).toContain('data-panel-size="0.0"');
    expect(html).toContain('id="dock-panel-left"');
    expect(html).toContain('data-panel-size="0.0"');
    expect(html).toContain("Solo Mapa");
  });

  test("el contenedor del workspace ocupa altura completa (h-dvh) sin restriccion max-h", () => {
    const html = renderToString(
      <GeovisorWorkspaceLayout
        centerSlot={<div>Mapa Fullscreen</div>}
      />
    );

    // Debe contener h-dvh para ocupar la totalidad del viewport dinámico
    expect(html).toContain("h-dvh");
    expect(html).toContain("w-full");

    // No debe contener max-h-[960px] ni redondeos exteriores
    expect(html).not.toContain("max-h-[960px]");
    expect(html).not.toContain("rounded-2xl");
  });
});
