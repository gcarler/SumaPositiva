import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorDockHost } from "./geovisor-dock-host";
import { GeovisorWorkbenchBar } from "./geovisor-workbench-bar";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

const render = (id: string) => <div data-testid={`contenido-${id}`}>Vista {id}</div>;

describe("GeovisorDockHost", () => {
  beforeEach(() => useGeovisorLayoutStore.getState().resetLayout());

  test("muestra una pestaña por vista del panel y solo monta la activa", () => {
    useGeovisorLayoutStore.getState().openView("mesas", "left");
    const html = renderToString(<GeovisorDockHost dock="left" renderView={render} />);
    expect(html).toContain('data-testid="dock-tab-capas"');
    expect(html).toContain('data-testid="dock-tab-mesas"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Capas &amp; Leyenda");
    expect(html).toContain("Directorio de Mesas");
    expect(html).toContain('data-testid="contenido-mesas"');
    expect(html).not.toContain('data-testid="contenido-capas"');
  });

  test("cada pestaña es arrastrable y tiene botón de cierre accesible", () => {
    const html = renderToString(<GeovisorDockHost dock="bottom" renderView={render} />);
    expect(html).toContain('draggable="true"');
    expect(html).toContain('aria-label="Cerrar vista Analítica de Hurtos (2018–2026)"');
    expect(html).toContain('data-testid="dock-expand-bottom"');
    expect(html).toContain('data-testid="dock-menu-bottom"');
  });

  test("un panel sin vistas muestra el estado vacío", () => {
    useGeovisorLayoutStore.getState().moveView("filtros", "left");
    const html = renderToString(<GeovisorDockHost dock="top" renderView={render} />);
    expect(html).toContain('data-testid="dock-empty-top"');
    expect(html).toContain("vacío");
  });

  test("refleja el panel con vistas reubicadas", () => {
    useGeovisorLayoutStore.getState().moveView("graficos", "right");
    const html = renderToString(<GeovisorDockHost dock="right" renderView={render} />);
    expect(html).toContain('data-testid="dock-tab-graficos"');
  });
});

describe("GeovisorWorkbenchBar", () => {
  test("incluye el menú Vistas y los controles de los 4 paneles", () => {
    const html = renderToString(<GeovisorWorkbenchBar />);
    expect(html).toContain('data-testid="workbench-views-menu"');
    expect(html).toContain('data-testid="dock-toggle-top"');
    expect(html).toContain('data-testid="dock-toggle-bottom"');
  });
});
