import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeovisorHurtosPanel } from "./geovisor-hurtos-panel";

describe("GeovisorHurtosPanel Component (GEO-HURTOS-01)", () => {
  test("renderiza el panel analítico de hurtos con títulos, badges y KPIs", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <GeovisorHurtosPanel
          delitoSeleccionado="hurto_motocicletas"
          onDelitoChange={vi.fn()}
          anioSeleccionado={2024}
          onAnioChange={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="geovisor-hurtos-panel"');
    expect(html).toContain("Analítica Espacial de Hurtos SIEDCO");
    expect(html).toContain("2018–2026");
    expect(html).toContain("12.280 registros georreferenciados");

    // Selectores
    expect(html).toContain("Tipo de Delito");
    expect(html).toContain("Periodo / Año");
    expect(html).toContain("Ámbito Territorial");

    // KPI Titles
    expect(html).toContain("Total Incidentes");
    expect(html).toContain("Perímetro Urbano");
    expect(html).toContain("Zona Rural / Insular");
    expect(html).toContain("Modalidad Predominante");

    // Charts Titles
    expect(html).toContain("Evolución Histórica Anual (2018–2026)");
    expect(html).toContain("Distribución Mensual");
    expect(html).toContain("Top 5 Modalidades / Armas Empleadas");
    expect(html).toContain("Top 5 Clases de Sitio de Ocurrencia");
  });
});
