import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buscarTerritorioPorCoordenada,
  obtenerTerritorio,
  listarCapas,
  estandarizarDireccion,
  obtenerIsocronas,
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

  describe("Normalizador Inteligente de Direcciones (GEO-PROC-01)", () => {
    it("envía solicitud POST /geodatos/estandarizar-direccion con dirección estructurada", async () => {
      const mockRespuesta = {
        direccion_original: "Calle 30 # 25-10 Pie de la Popa",
        direccion_normalizada: "CL 30 # 25-10, Pie de la Popa",
        tipo_via: "Calle",
        numero_principal: "30",
        numero_secundario: "25-10",
        sector_o_barrio: "Pie de la Popa",
        territorio_id: "018f4a3b-mock-id",
        coordenadas_aproximadas: {
          latitud: 10.4167,
          longitud: -75.5333,
        },
        confianza: 0.95,
      };

      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockRespuesta);

      const resultado = await estandarizarDireccion("Calle 30 # 25-10 Pie de la Popa");

      expect(spy).toHaveBeenCalledWith("/geodatos/estandarizar-direccion", {
        method: "POST",
        body: JSON.stringify({ direccion_raw: "Calle 30 # 25-10 Pie de la Popa" }),
      });
      expect(resultado).toEqual(mockRespuesta);
      expect(resultado?.direccion_normalizada).toBe("CL 30 # 25-10, Pie de la Popa");
      expect(resultado?.coordenadas_aproximadas?.latitud).toBe(10.4167);
    });

    it("retorna null de forma segura ante cadenas vacías sin invocar a la API", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch");

      const resultado1 = await estandarizarDireccion("");
      const resultado2 = await estandarizarDireccion("   ");

      expect(resultado1).toBeNull();
      expect(resultado2).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    });

    it("captura errores de red y retorna null defensivamente", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(new Error("Network Error"));

      const resultado = await estandarizarDireccion("Pozón sector 1ro de Mayo");
      expect(resultado).toBeNull();
    });
  });

  describe("Isócronas de Accesibilidad y Ruteo de Seguridad (GEO-PROC-02)", () => {
    it("consulta GET /geodatos/isocronas con latitud, longitud y parámetros de ruteo", async () => {
      const mockIsocronas = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-75.49, 10.41],
                  [-75.49, 10.42],
                  [-75.48, 10.42],
                  [-75.49, 10.41],
                ],
              ],
            },
            properties: {
              minutos: 5,
              modo: "pie" as const,
              radio_metros: 375.0,
              nodo_cercano: {
                nombre: "CAI Olaya Herrera",
                tipo: "seguridad",
                distancia_metros: 208.5,
              },
            },
          },
        ],
      };

      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockIsocronas);

      const resultado = await obtenerIsocronas({
        lat: 10.4141,
        lon: -75.4922,
        modo: "pie",
        minutos: "5,10,15",
      });

      expect(spy).toHaveBeenCalledWith(
        "/geodatos/isocronas?lat=10.4141&lon=-75.4922&modo=pie&minutos=5%2C10%2C15"
      );
      expect(resultado?.type).toBe("FeatureCollection");
      expect(resultado?.features).toHaveLength(1);
      expect(resultado?.features[0].properties.minutos).toBe(5);
      expect(resultado?.features[0].properties.nodo_cercano?.nombre).toBe("CAI Olaya Herrera");
    });

    it("captura errores de red y retorna null de forma segura", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(new Error("Timeout"));

      const resultado = await obtenerIsocronas({ lat: 10.4, lon: -75.5 });
      expect(resultado).toBeNull();
    });
  });
});
