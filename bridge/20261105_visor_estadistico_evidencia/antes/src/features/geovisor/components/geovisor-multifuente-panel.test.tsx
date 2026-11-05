import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeovisorMultifuentePanel } from "./geovisor-multifuente-panel";

describe("GeovisorMultifuentePanel Component (GEO-FUENTES-01)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  test("renderiza el panel con título del Banco Multifuente y las 7 dimensiones", () => {
    const mockDatos = {
      total: 2449,
      limit: 30,
      offset: 0,
      indicadores: [
        {
          id: "ind-1",
          territorio_id: "01a0f5dd-538e-7900-afb0-68db850f2153",
          codigo_indicador: "IND_DANE_POBREZA_MONETARIA",
          nombre_indicador: "Pobreza Monetaria Cartagena",
          valor: 34.6,
          unidad_medida: "%",
          nivel_riesgo: "alto",
          anio_corte: 2025,
          fuente_datos: "DANE - Pobreza Monetaria",
          metadatos: {
            url_fuente: "https://www.dane.gov.co",
            nota_origen: "Cifras oficiales DANE 2025",
          },
          codigo_territorio: "DISTRITO-CTG",
          nombre_territorio: "Distrito de Cartagena",
          codigo_dimension: "economica",
          nombre_dimension: "Seguridad Económica",
        },
      ],
    };

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <GeovisorMultifuentePanel datosIniciales={mockDatos} />
      </QueryClientProvider>
    );

    // Encabezado y total
    expect(html).toContain("Banco Multifuente de Seguridad Humana");
    expect(html).toContain("2.449");
    expect(html).toContain("indicadores encontrados");

    // Dimensiones en chips
    expect(html).toContain("Seguridad Personal");
    expect(html).toContain("Seguridad Comunitaria");
    expect(html).toContain("Seguridad Económica");
    expect(html).toContain("Seguridad Ambiental");
    expect(html).toContain("Seguridad en Salud");
    expect(html).toContain("Seguridad Alimentaria");
    expect(html).toContain("Seguridad Política");

    // Tarjeta del indicador
    expect(html).toContain("Pobreza Monetaria Cartagena");
    expect(html).toContain("34,6");
    expect(html).toContain("%");
    expect(html).toContain("Alto");
    expect(html).toContain("DANE");
    expect(html).toContain("https://www.dane.gov.co");
  });

  test("renderiza estado de carga cuando isLoading es true", () => {
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <GeovisorMultifuentePanel cargandoInicial={true} />
      </QueryClientProvider>
    );

    expect(html).toContain("Consultando banco de fuentes oficial...");
  });
});
