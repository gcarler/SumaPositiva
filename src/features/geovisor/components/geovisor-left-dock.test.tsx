import { describe, test, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GeovisorLeftDock } from "./geovisor-left-dock";
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

describe("GeovisorLeftDock Component (GEO-DOCK-02)", () => {
  const defaultCapas = {
    localidades: true,
    corregimientos: true,
    barrios: true,
    puntos: true,
    etiquetas: true,
    isocronas: false,
  };

  test("renderiza el panel izquierdo con pestaña de Capas y Leyenda activa por defecto", () => {
    const handleToggleCapa = vi.fn();
    const handleSelectMesa = vi.fn();
    const handleLocalizar = vi.fn();

    const html = renderToString(
      <GeovisorLeftDock
        capas={defaultCapas}
        onToggleCapa={handleToggleCapa}
        variableMapa="ish"
        mesas={MOCK_MESAS}
        mesaSeleccionadaId="mesa-01"
        onSelectMesa={handleSelectMesa}
        onLocalizarEnMapa={handleLocalizar}
      />
    );

    // Contenedor accesible
    expect(html).toContain('role="region"');
    expect(html).toContain('data-testid="geovisor-left-dock"');

    // Pestañas
    expect(html).toContain("Capas &amp; Leyenda");
    expect(html).toContain("Mesas");

    // Controles de capas
    expect(html).toContain("Control de Capas SIG");
    expect(html).toContain("Localidades (3)");
    expect(html).toContain("Barrios Catastrales (217)");
  });

  test("renderiza el directorio de mesas cuando la pestaña activa es mesas", () => {
    const handleToggleCapa = vi.fn();
    const handleSelectMesa = vi.fn();
    const handleLocalizar = vi.fn();

    const html = renderToString(
      <GeovisorLeftDock
        capas={defaultCapas}
        onToggleCapa={handleToggleCapa}
        variableMapa="ish"
        mesas={MOCK_MESAS}
        mesaSeleccionadaId="mesa-01"
        onSelectMesa={handleSelectMesa}
        onLocalizarEnMapa={handleLocalizar}
        defaultTab="mesas"
      />
    );

    // Directorio de mesas
    expect(html).toContain("Buscar mesa o barrio…");
    expect(html).toContain("Mesa 01 — El Pozón");
    expect(html).toContain("Ubicar en Mapa");
    expect(html).toContain("Realizadas");
    expect(html).toContain("Programadas");
  });
});
