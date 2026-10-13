import { describe, test, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MesaEditorPanel } from "./mesa-editor-panel";
import {
  parsearCoordenadasUrl,
  parsearTextoCoordenadas,
} from "@/features/mesas/lib/coordenadas-parser";

describe("MesaEditorPanel — Simplificación de Coordenadas [MESA-UBIC-02]", () => {
  test("1. Verifica que no existan los campos separados Latitud/Longitud individual y sí exista el campo unificado", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <MesaEditorPanel
          entryKey="mesa-editor-test"
          props={{}}
        />
      </QueryClientProvider>
    );

    // Campos separados eliminados
    expect(html).not.toContain('id="mesa-lat"');
    expect(html).not.toContain("Latitud individual");
    expect(html).not.toContain('id="mesa-lng"');
    expect(html).not.toContain("Longitud individual");

    // Campo unificado presente
    expect(html).toContain('id="mesa-coords-planas"');
    expect(html).toContain("3. Coordenadas (Latitud, Longitud)");
    expect(html).toContain("Escribe o pega Latitud y Longitud separadas por coma o espacio");
  });

  test("2. Verifica que enlaces de Google Maps con %2C, /maps/place/ y /maps/search/ extraen coordenadas correctamente", () => {
    // URL con coma codificada %2C
    const urlEncoded = "https://www.google.com/maps/search/?api=1&query=10.39972%2C-75.51444";
    const coordsEncoded = parsearCoordenadasUrl(urlEncoded);
    expect(coordsEncoded).not.toBeNull();
    expect(coordsEncoded?.lat).toBeCloseTo(10.39972, 4);
    expect(coordsEncoded?.lng).toBeCloseTo(-75.51444, 4);

    // URL con ruta directa /maps/place/lat,lng
    const urlPlace = "https://www.google.com/maps/place/10.39972,-75.51444";
    const coordsPlace = parsearCoordenadasUrl(urlPlace);
    expect(coordsPlace).not.toBeNull();
    expect(coordsPlace?.lat).toBeCloseTo(10.39972, 4);
    expect(coordsPlace?.lng).toBeCloseTo(-75.51444, 4);

    // URL con ruta /maps/search/lat,lng
    const urlSearch = "https://www.google.com/maps/search/10.39972,-75.51444";
    const coordsSearch = parsearCoordenadasUrl(urlSearch);
    expect(coordsSearch).not.toBeNull();
    expect(coordsSearch?.lat).toBeCloseTo(10.39972, 4);
    expect(coordsSearch?.lng).toBeCloseTo(-75.51444, 4);
  });

  test("3. Verifica que pegar una URL o coordenadas planas en el campo de texto extrae las coordenadas", () => {
    // Coordenadas planas estándar
    const coordsPlanas = parsearTextoCoordenadas("10.39972, -75.51444");
    expect(coordsPlanas).not.toBeNull();
    expect(coordsPlanas?.lat).toBeCloseTo(10.39972, 4);
    expect(coordsPlanas?.lng).toBeCloseTo(-75.51444, 4);

    // Pegar URL en el campo de texto de coordenadas por error
    const coordsDesdeUrl = parsearTextoCoordenadas("https://www.google.com/maps/@10.39972,-75.51444,17z");
    expect(coordsDesdeUrl).not.toBeNull();
    expect(coordsDesdeUrl?.lat).toBeCloseTo(10.39972, 4);
    expect(coordsDesdeUrl?.lng).toBeCloseTo(-75.51444, 4);
  });

  test("4. Renderiza botón Limpiar cuando existen coordenadas cargadas", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <MesaEditorPanel
          entryKey="mesa-editor-test-coords"
          props={{}}
        />
      </QueryClientProvider>
    );

    // En estado inicial sin coordenadas no muestra botón Limpiar
    expect(html).toContain('placeholder="10.39972, -75.51444"');
  });
});
