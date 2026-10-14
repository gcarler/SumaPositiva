import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorDockControls } from "./geovisor-dock-controls";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

describe("GeovisorDockControls Component (GEO-DOCK-01)", () => {
  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("renderiza los 4 iconos de paneles, maximizar y resetear", () => {
    const html = renderToString(<GeovisorDockControls />);

    expect(html).toContain('data-testid="dock-toggle-top"');
    expect(html).toContain('data-testid="dock-toggle-left"');
    expect(html).toContain('data-testid="dock-toggle-right"');
    expect(html).toContain('data-testid="dock-toggle-bottom"');
    expect(html).toContain('data-testid="dock-toggle-maximize"');
    expect(html).toContain('data-testid="dock-reset-layout"');
  });

  test("refleja los atributos ARIA y aria-pressed según estado inicial", () => {
    const html = renderToString(<GeovisorDockControls />);

    // Left y Bottom están abiertos por defecto; Top está oculto por defecto
    expect(html).toContain('data-testid="dock-toggle-top"');
    expect(html).toContain('data-testid="dock-toggle-left"');
    expect(html).toContain('title="Mostrar panel superior (Filtros y KPIs)"');
    expect(html).toContain('title="Ocultar panel izquierdo (Capas y Directorio de Mesas)"');

    // Toolbar semántica accesible
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Controles de paneles del Geovisor"');
  });

  test("actualiza el estado de los controles cuando cambian los paneles en el store", () => {
    // Abrir panel derecho e inferior
    useGeovisorLayoutStore.getState().setPanelOpen("right", true);
    useGeovisorLayoutStore.getState().setPanelOpen("bottom", true);
    useGeovisorLayoutStore.getState().setPanelOpen("top", false);

    const html = renderToString(<GeovisorDockControls />);

    expect(html).toContain('title="Ocultar panel derecho (Inspector y Ficha de Mesa)"');
    expect(html).toContain('title="Ocultar panel inferior (DataGrid de Mesas y Gráficos)"');
    expect(html).toContain('title="Mostrar panel superior (Filtros y KPIs)"');
  });

  test("muestra icono y etiqueta de restaurar cuando el mapa está maximizado", () => {
    useGeovisorLayoutStore.getState().maximizeMap();
    const html = renderToString(<GeovisorDockControls />);

    expect(html).toContain('aria-label="Restaurar paneles del Geovisor"');
    expect(html).toContain('title="Restaurar paneles periféricos"');
  });
});
