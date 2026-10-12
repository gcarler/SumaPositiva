import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorBottomDock } from "./geovisor-bottom-dock";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";

const MOCK_MESAS: MesaGeovisor[] = [
  {
    id: "mesa-01",
    nombre: "Mesa 01 — El Pozón",
    fecha: "2026-06-15",
    horario: "09:00 - 12:00",
    estado: "ACTA_CONCERTADA",
    realizada: true,
    total_asistentes: 52,
    territorio_id: "loc-2",
    territorio_nombre: "Localidad 2",
    territorio_codigo: "loc-2",
    longitud_referencia: -75.48,
    latitud_referencia: 10.40,
    tipo_ubicacion: "centroide_territorial_referencia",
    fotos: [],
    aforo: 60,
    codigo_oficial: "MSH-01",
    shortcode_ciudadano: "POZON-01",
  },
  {
    id: "mesa-02",
    nombre: "Mesa 02 — Nelson Mandela",
    fecha: "2026-07-20",
    horario: "14:00 - 17:00",
    estado: "PROGRAMADA",
    realizada: false,
    total_asistentes: 0,
    territorio_id: "loc-3",
    territorio_nombre: "Localidad 3",
    territorio_codigo: "loc-3",
    longitud_referencia: -75.50,
    latitud_referencia: 10.38,
    tipo_ubicacion: "centroide_territorial_referencia",
    fotos: [],
    aforo: 50,
    codigo_oficial: "MSH-02",
    shortcode_ciudadano: "MANDELA-02",
  },
];

describe("GeovisorBottomDock Component (GEO-DOCK-02)", () => {
  test("renderiza la consola inferior con DataGrid de mesas por defecto", () => {
    const handleSeleccionarMesa = vi.fn();
    const handleTerritorioChange = vi.fn();
    const handleVariableChange = vi.fn();

    const html = renderToString(
      <GeovisorBottomDock
        mesas={MOCK_MESAS}
        mesaSeleccionadaId="mesa-01"
        onSeleccionarMesa={handleSeleccionarMesa}
        territorioId="todas"
        onTerritorioChange={handleTerritorioChange}
        variableMapa="ish"
        onVariableChange={handleVariableChange}
      />
    );

    // Contenedor accesible
    expect(html).toContain('role="region"');
    expect(html).toContain('data-testid="geovisor-bottom-dock"');

    // Pestañas
    expect(html).toContain("DataGrid de Mesas");
    expect(html).toContain("Gráficos Estadísticos");

    // Badges de estado en la cabecera
    expect(html).toContain("Consola Analítica");
    expect(html).toContain("Realizadas");
    expect(html).toContain("Programadas");

    // Elementos del DataGrid
    expect(html).toContain("Mesa 01 — El Pozón");
  });

  test("renderiza los gráficos estadísticos cuando la pestaña activa es graficos", () => {
    const handleSeleccionarMesa = vi.fn();
    const handleTerritorioChange = vi.fn();
    const handleVariableChange = vi.fn();

    const html = renderToString(
      <GeovisorBottomDock
        mesas={MOCK_MESAS}
        mesaSeleccionadaId="mesa-01"
        onSeleccionarMesa={handleSeleccionarMesa}
        territorioId="todas"
        onTerritorioChange={handleTerritorioChange}
        variableMapa="ish"
        onVariableChange={handleVariableChange}
        defaultTab="graficos"
      />
    );

    expect(html).toContain("DataGrid de Mesas");
    expect(html).toContain("Gráficos Estadísticos");
    expect(html).toContain("Radar de siete dimensiones");
  });
});
