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

  test("renderiza el acceso a la procedencia y metodo de cada serie", () => {
    const html = renderToString(<GeovisorWorkbenchBar />);

    expect(html).toContain("Fuentes y método:");
    expect(html).toContain("procedencia");
    expect(html).toContain("cada serie");
    expect(html).toContain("Gráficos");
    expect(html).toContain("Sistema de Estadística y Análisis Territorial");
  });

  test("renderiza los controles de vistas y conmutadores de paneles dock", () => {
    const html = renderToString(<GeovisorWorkbenchBar />);

    expect(html).toContain('data-testid="workbench-views-menu"');
    expect(html).toContain("Vistas");
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Controles de paneles del Geovisor"');
    expect(html).toContain('data-testid="dock-toggle-top"');
  });

  test("renderiza el acceso a gráficos y el control del panel superior sin cifras fijas", () => {
    const htmlInicial = renderToString(<GeovisorWorkbenchBar />);

    // El acceso abre análisis con datos reales y evita un total desactualizado.
    expect(htmlInicial).toContain('data-testid="workbench-btn-gestor-geojson"');
    const accesoGraficas = htmlInicial.match(
      /<button[^>]*data-testid="workbench-btn-gestor-geojson"[\s\S]*?<\/button>/,
    )?.[0];
    expect(accesoGraficas).toContain("Gráficas y Comparación");
    expect(accesoGraficas).toContain(
      'title="Abrir gráficas y comparación de fuentes"',
    );
    expect(htmlInicial).not.toContain("12.280 registros");

    // Botón Mostrar Panel Superior cuando topOpen es false por defecto
    expect(htmlInicial).toContain(
      'data-testid="workbench-btn-toggle-top-panel"',
    );
    expect(htmlInicial).toContain("Mostrar Panel Superior");

    // Al abrir el panel superior, el botón conmuta a Ocultar Panel Superior
    useGeovisorLayoutStore.getState().setPanelOpen("top", true);
    const htmlAbierto = renderToString(<GeovisorWorkbenchBar />);
    expect(htmlAbierto).toContain("Ocultar Panel Superior");
  });
});
test("permite ocultar el mapa y pasar a solo analitica", () => {
  useGeovisorLayoutStore.getState().setCenterOpen(true);

  const htmlVisible = renderToString(<GeovisorWorkbenchBar />);
  expect(htmlVisible).toContain(
    'data-testid="workbench-btn-toggle-center-panel"',
  );
  expect(htmlVisible).toContain("Solo analitica");
  expect(useGeovisorLayoutStore.getState().centerOpen).toBe(true);

  useGeovisorLayoutStore.getState().setCenterOpen(false);
  const htmlOculto = renderToString(<GeovisorWorkbenchBar />);
  expect(htmlOculto).toContain("Mostrar mapa");
});
