import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buscarTerritorioPorCoordenada,
  obtenerTerritorio,
  listarCapas,
} from "./geovisor-api";
import * as apiClient from "@/core/http/api-client";

describe("Georreferenciación Territorial Inversa (AUD-SYNC-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("consulta GET /geodatos/territorios/buscar-por-coordenada con lat y lon", async () => {
    const mockTerritorios = [
      {
        id: "01a0f5dd-538e-7900-afb0-68db850f2153",
        codigo: "DISTRITO-CTG",
        nombre: "Distrito Turístico y Cultural de Cartagena de Indias",
        tipo_territorio: "distrito",
        territorio_padre_id: null,
        poblacion_estimada: 1050000,
        estrato_predominante: null,
        es_zona_etnica: false,
        coordenadas_centroide: [-75.4588, 10.4634] as [number, number],
        metadatos: {},
      },
      {
        id: "01a0f5dd-5391-7c5d-b29f-c020e56d7adf",
        codigo: "LOC-1",
        nombre: "Localidad 1: Histórica y del Caribe Norte",
        tipo_territorio: "localidad",
        territorio_padre_id: "01a0f5dd-538e-7900-afb0-68db850f2153",
        poblacion_estimada: 380000,
        estrato_predominante: 3,
        es_zona_etnica: false,
        coordenadas_centroide: [-75.5943, 10.2447] as [number, number],
        metadatos: {},
      },
    ];

    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockTerritorios);

    const lat = 10.4245;
    const lon = -75.5482;
    const resultado = await buscarTerritorioPorCoordenada(lat, lon);

    expect(spy).toHaveBeenCalledWith(
      `/geodatos/territorios/buscar-por-coordenada?lon=${lon}&lat=${lat}`
    );
    expect(resultado).toHaveLength(2);
    expect(resultado[0].codigo).toBe("DISTRITO-CTG");
    expect(resultado[1].tipo_territorio).toBe("localidad");
  });

  it("captura errores de red y retorna un array vacío de manera segura", async () => {
    vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(new Error("Connection refused"));

    const resultado = await buscarTerritorioPorCoordenada(10.0, -75.0);
    expect(resultado).toEqual([]);
  });

  it("obtiene detalle de territorio por ID mediante GET /geodatos/territorios/{id}", async () => {
    const mockDetalle = {
      id: "loc-1",
      codigo: "LOC-1",
      nombre: "Localidad Histórica",
      tipo: "LOCALIDAD" as const,
      habitantes: 350000,
      area_ha: 5200,
      indicadores: [],
      propuestas_count: 42,
      descripcion: "Localidad 1",
    };

    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockDetalle);

    const resultado = await obtenerTerritorio("loc-1");
    expect(spy).toHaveBeenCalledWith("/geodatos/territorios/loc-1");
    expect(resultado.nombre).toBe("Localidad Histórica");
  });

  it("lista capas espaciales disponibles desde GET /geodatos/capas", async () => {
    const mockCapas = [
      {
        id: "capa-1",
        slug: "barrios",
        nombre: "Barrios de Cartagena",
        descripcion: "Límites barriales oficiales",
        tipo_geometria: "POLYGON" as const,
        color_hex: "#3a86ff",
        activa: true,
      },
    ];

    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockCapas);

    const resultado = await listarCapas();
    expect(spy).toHaveBeenCalledWith("/geodatos/capas");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].slug).toBe("barrios");
  });
});
