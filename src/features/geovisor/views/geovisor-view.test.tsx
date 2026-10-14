import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeovisorView } from "./geovisor-view";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

describe("GeovisorView Component (GEO-DOCK-02)", () => {
  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("ensambla el espacio de trabajo con los 4 paneles acoplados y el lienzo central", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <GeovisorView />
      </QueryClientProvider>
    );

    // Workspace container presente
    expect(html).toContain('data-testid="geovisor-workspace-layout"');

    // Dock superior (Top Shelf)
    expect(html).toContain('data-testid="geovisor-top-shelf"');
    expect(html).toContain("Zona GeoJSON:");
    expect(html).toContain("Capa GeoJSON:");

    // Dock izquierdo (Capas GeoJSON)
    expect(html).toContain('data-testid="geovisor-dock-host-left"');
    expect(html).toContain("Capas");

    // Dock derecho (Inspector y BI)
    expect(html).toContain('data-testid="geovisor-dock-host-right"');

    // Dock inferior (Analítica de Hurtos SIEDCO)
    expect(html).toContain('data-testid="geovisor-dock-host-bottom"');
    expect(html).toContain("Hurtos");
    expect(html).toContain('data-testid="geovisor-dock-host-top"');
    // Workbench bar y controles
    expect(html).toContain('data-testid="geovisor-workbench-bar"');
    expect(html).toContain('data-testid="geovisor-btn-volver-inicio"');
    expect(html).toContain("Volver al inicio");

    // Atribución de fuentes oficiales en la barra permanente
    expect(html).toContain("Fuentes oficiales: DANE 2025");

    // Sin contenedor fluid ni márgenes restrictivos
    expect(html).not.toContain("container-fluid");
  });
});
