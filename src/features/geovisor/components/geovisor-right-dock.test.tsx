import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorRightDock } from "./geovisor-right-dock";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";

const MOCK_MESA: MesaGeovisor = {
  id: "mesa-01",
  nombre: "Mesa 01 — El Pozón",
  fecha: "2026-06-15",
  horario: "09:00 - 12:00",
  estado: "ACTA_CONCERTADA",
  realizada: true,
  total_asistentes: 52,
  territorio_id: "loc-2",
  territorio_nombre: "Localidad 2 — De la Virgen y Turística",
  territorio_codigo: "loc-2",
  longitud_referencia: -75.48,
  latitud_referencia: 10.40,
  tipo_ubicacion: "centroide_territorial_referencia",
  fotos: [
    {
      id: "foto-1",
      archivo_url: "/images/mesa1.webp",
      descripcion: "Asamblea El Pozón",
    },
  ],
  aforo: 60,
  codigo_oficial: "MSH-01",
  shortcode_ciudadano: "POZON-01",
};

describe("GeovisorRightDock Component (GEO-DOCK-02)", () => {
  test("renderiza estado vacío cuando no hay mesa seleccionada", () => {
    const handleCerrar = vi.fn();
    const handleSelectTerritorio = vi.fn();

    const html = renderToString(
      <GeovisorRightDock
        mesaSeleccionada={null}
        onCerrarMesa={handleCerrar}
        territorioId="todas"
        onSelectTerritorio={handleSelectTerritorio}
        variableMapa="ish"
      />
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('data-testid="geovisor-right-dock"');
    expect(html).toContain("Ninguna mesa seleccionada");
    expect(html).toContain("Ficha Técnica");
    expect(html).toContain("Territorio &amp; BI");
  });

  test("renderiza la ficha técnica completa cuando hay una mesa seleccionada", () => {
    const handleCerrar = vi.fn();
    const handleAbrirPanel = vi.fn();
    const handleSelectTerritorio = vi.fn();

    const html = renderToString(
      <GeovisorRightDock
        mesaSeleccionada={MOCK_MESA}
        onCerrarMesa={handleCerrar}
        onAbrirPanelMesa={handleAbrirPanel}
        territorioId="loc-2"
        onSelectTerritorio={handleSelectTerritorio}
        variableMapa="ish"
      />
    );

    expect(html).toContain("MESA-01");
    expect(html).toContain("Mesa 01 — El Pozón");
    expect(html).toContain("52");
    expect(html).toContain("participantes");
    expect(html).toContain("Ver acta viva y papelógrafo");
    expect(html).toContain("Concertación Comunitaria");
    expect(html).toContain("Evidencia Territorial");
  });
});
