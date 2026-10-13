import { describe, test, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SelectorUbicacionMesa } from "./selector-ubicacion-mesa";

describe("SelectorUbicacionMesa Component [MESA-UBIC-01]", () => {
  test("renderiza el mapa accesible con rol application y controles accesibles", () => {
    const html = renderToString(
      <SelectorUbicacionMesa
        coordenadas={null}
        onChange={() => {}}
      />
    );

    expect(html).toContain('data-testid="selector-ubicacion-mesa"');
    expect(html).toContain('role="application"');
    expect(html).toContain('aria-label="Mapa interactivo para seleccionar la ubicación de la mesa de trabajo"');
    expect(html).toContain('aria-label="Acercar mapa"');
    expect(html).toContain('aria-label="Alejar mapa"');
    expect(html).toContain('aria-label="Centrar mapa en Cartagena"');
    expect(html).toContain("Cartagena");
    expect(html).toContain("Haz clic en el mapa para marcar el punto de encuentro");
  });

  test("renderiza las coordenadas seleccionadas y boton Limpiar cuando existen coordenadas", () => {
    const html = renderToString(
      <SelectorUbicacionMesa
        coordenadas={{ lat: 10.39972, lng: -75.51444 }}
        onChange={() => {}}
      />
    );

    expect(html).toContain("10.39972, -75.51444");
    expect(html).toContain('aria-label="Limpiar punto seleccionado"');
    expect(html).toContain("Limpiar");
  });

  test("no muestra boton Limpiar en modo soloLectura", () => {
    const html = renderToString(
      <SelectorUbicacionMesa
        coordenadas={{ lat: 10.4215, lng: -75.5519 }}
        onChange={() => {}}
        soloLectura={true}
      />
    );

    expect(html).toContain("10.42150, -75.55190");
    expect(html).not.toContain('aria-label="Limpiar punto seleccionado"');
  });
});
