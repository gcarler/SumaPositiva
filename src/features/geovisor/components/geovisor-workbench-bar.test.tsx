import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorWorkbenchBar } from "./geovisor-workbench-bar";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

describe("GeovisorWorkbenchBar Component (GEO-FULL-01)", () => {
  beforeEach(() => {
    useGeovisorLayoutStore.getState().resetLayout();
  });

  test("renderiza el boton Volver al inicio enlazado a la raiz con accesibilidad", () => {
    const html = renderToString(<GeovisorWorkbenchBar />);

    // Botón Volver al inicio presente
    expect(html).toContain('data-testid="geovisor-btn-volver-inicio"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Volver al inicio"');
    expect(html).toContain("Volver al inicio");
  });

  test("renderiza la mencion discreta a fuentes oficiales para preservar atribucion", () => {
    const html = renderToString(<GeovisorWorkbenchBar />);

    expect(html).toContain("Fuentes oficiales:");
    expect(html).toContain("DANE 2025");
    expect(html).toContain("Policía Nacional / CCV");
    expect(html).toContain("Alcaldía de Cartagena");
    expect(html).toContain("Catastro Distrital");
  });

  test("renderiza los controles de vistas y conmutadores de paneles dock", () => {
    const html = renderToString(<GeovisorWorkbenchBar />);

    expect(html).toContain('data-testid="workbench-views-menu"');
    expect(html).toContain("Vistas");
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Controles de paneles del Geovisor"');
    expect(html).toContain('data-testid="dock-toggle-top"');
  });
});
