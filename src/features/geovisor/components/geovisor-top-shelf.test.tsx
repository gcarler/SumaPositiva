import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorTopShelf } from "./geovisor-top-shelf";

describe("GeovisorTopShelf Component (GEO-DOCK-02)", () => {
  test("renderiza selectores de ámbito y variable, y 4 KPI chips", () => {
    const handleTerritorio = vi.fn();
    const handleVariable = vi.fn();
    const handleExportar = vi.fn();

    const html = renderToString(
      <GeovisorTopShelf
        territorioId="todas"
        onTerritorioChange={handleTerritorio}
        variableMapa="ish"
        onVariableChange={handleVariable}
        onExportarPng={handleExportar}
      />
    );

    // Contenedor accesible
    expect(html).toContain('role="region"');
    expect(html).toContain('data-testid="geovisor-top-shelf"');

    // Etiquetas y selectores
    expect(html).toContain("Ámbito:");
    expect(html).toContain("Variable:");
    expect(html).toContain("Exportar PNG");

    // 4 KPI Chips
    expect(html).toContain("Ciudadanos Participando");
    expect(html).toContain("Aportes Radicados");
    expect(html).toContain("Alertas SAT Activas");
    expect(html).toContain("ISH Promedio Distrital");
  });
});
