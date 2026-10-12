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
    expect(html).toContain("Ámbito:");
    expect(html).toContain("Variable:");

    // Dock izquierdo (Capas y Directorio)
    expect(html).toContain('data-testid="geovisor-left-dock"');
    expect(html).toContain("Capas &amp; Leyenda");

    // Dock derecho (Inspector y BI)
    expect(html).toContain('data-testid="geovisor-right-dock"');
    expect(html).toContain("Ficha Técnica");

    // Dock inferior (DataGrid y Gráficos)
    expect(html).toContain('data-testid="geovisor-bottom-dock"');
    expect(html).toContain("DataGrid de Mesas");

    // Footer institucional de metadatos
    expect(html).toContain("POLIS SIG Studio • 4 Paneles Acoplados");
    expect(html).toContain("Fuentes oficiales: DANE 2025");
  });
});
