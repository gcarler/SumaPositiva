import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorTopShelf } from "./geovisor-top-shelf";

describe("GeovisorTopShelf Component (GEO-DOCK-02)", () => {
  test("renderiza selectores de zona GeoJSON, capa y año, y 4 KPI chips reales", () => {
    const handleZona = vi.fn();
    const handleDelito = vi.fn();
    const handleAnio = vi.fn();
    const handleExportar = vi.fn();

    const html = renderToString(
      <GeovisorTopShelf
        zonaId="todas"
        onZonaChange={handleZona}
        delitoHurto={null}
        onDelitoChange={handleDelito}
        anioHurto={null}
        onAnioHurtoChange={handleAnio}
        onExportarPng={handleExportar}
      />
    );

    // Contenedor accesible
    expect(html).toContain('role="region"');
    expect(html).toContain('data-testid="geovisor-top-shelf"');

    // Etiquetas y selectores ciudadanos
    expect(html).toContain("Zona Territorial:");
    expect(html).toContain("Datos Estadísticos:");
    expect(html).toContain("Año:");
    expect(html).toContain("Exportar PNG");

    // 4 KPI Chips Reales
    expect(html).toContain("Total Casos Reportados");
    expect(html).toContain("Registros Estadísticos SIEDCO");
    expect(html).toContain("Perímetro Urbano");
    expect(html).toContain("Zona Rural e Insular");
    expect(html).toContain("18.242");
    expect(html).toContain("12.280");
  });
});
