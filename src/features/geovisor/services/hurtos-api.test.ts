import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  obtenerResumenHurtos,
  obtenerPoligonosHurtosGeojson,
  explorarRegistrosHurtos,
  normalizarDelitoParam,
  type ResumenHurtosResponse,
  type HurtosFeatureCollection,
  type ExploradorHurtosResponse,
  type SerieTemporalItem,
} from "./hurtos-api";
import * as apiClient from "@/core/http/api-client";

describe("Servicio de Analítica de Hurtos (GEO-HURTOS-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("normalizarDelitoParam", () => {
    it("normaliza variantes de delitos a los valores canónicos", () => {
      expect(normalizarDelitoParam("moto")).toBe("HURTO MOTOCICLETA");
      expect(normalizarDelitoParam("hurto_motocicletas")).toBe("HURTO MOTOCICLETA");
      expect(normalizarDelitoParam("residencias")).toBe("HURTO RESIDENCIAS");
      expect(normalizarDelitoParam("hurto_comercio")).toBe("HURTO COMERCIO");
      expect(normalizarDelitoParam("TODOS")).toBeUndefined();
      expect(normalizarDelitoParam(null)).toBeUndefined();
    });
  });

  describe("obtenerResumenHurtos", () => {
    it("consulta sin parámetros para resumen global 2018-2026", async () => {
      const mockResumen: ResumenHurtosResponse = {
        total_casos: 18242,
        delito: null,
        anio: null,
        zona: null,
        serie_anual: [
          { etiqueta: "2018", cantidad: 2000, porcentaje: 11.0 },
          { etiqueta: "2024", cantidad: 2062, porcentaje: 11.3 },
        ],
        serie_mensual: [
          { etiqueta: "Enero", cantidad: 150, porcentaje: 8.3 },
        ],
        top_armas: [
          { categoria: "SIN EMPLEO DE ARMAS", cantidad: 9944, porcentaje: 54.5 },
        ],
        top_sitios: [
          { categoria: "VIAS PUBLICAS", cantidad: 9321, porcentaje: 51.1 },
        ],
        distribucion_zona: [
          { zona: "URBANA", cantidad: 17798, porcentaje: 97.6 },
          { zona: "RURAL", cantidad: 444, porcentaje: 2.4 },
        ],
      };

      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockResumen);

      const res = await obtenerResumenHurtos();
      expect(spy).toHaveBeenCalledWith("/geodatos/analitica/hurtos/resumen");
      expect(res.total_casos).toBe(18242);
      expect(res.distribucion_zona).toHaveLength(2);
    });

    it("aplica filtros de delito, año y zona en la query string", async () => {
      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce({
        total_casos: 665,
        delito: "HURTO MOTOCICLETA",
        anio: 2024,
        zona: "URBANA",
        serie_anual: [],
        serie_mensual: [],
        top_armas: [],
        top_sitios: [],
        distribucion_zona: [],
      });

      await obtenerResumenHurtos({
        delito: "hurto_motocicletas",
        anio: 2024,
        zona: "URBANA",
      });

      expect(spy).toHaveBeenCalledWith(
        "/geodatos/analitica/hurtos/resumen?delito=HURTO+MOTOCICLETA&anio=2024&zona=URBANA"
      );
    });

    it("normaliza respuestas con periodo pero sin etiqueta ni porcentaje (GEO-FIX-CONSOLE-01)", async () => {
      const rawResumen = {
        total_casos: 2062,
        serie_anual: [
          { periodo: "2024", cantidad: 2062 } as unknown as SerieTemporalItem,
        ],
        serie_mensual: [
          { periodo: "Enero", cantidad: 180 } as unknown as SerieTemporalItem,
        ],
        top_armas: [
          { categoria: "ARMA DE FUEGO", cantidad: 1000, porcentaje: 48.5 },
        ],
        top_sitios: [
          { categoria: "VIAS PUBLICAS", cantidad: 900, porcentaje: 43.6 },
        ],
        distribucion_zona: [],
      };

      vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(rawResumen);

      const res = await obtenerResumenHurtos();
      expect(res.serie_anual[0].etiqueta).toBe("2024");
      expect(res.serie_anual[0].periodo).toBe("2024");
      expect(res.serie_anual[0].porcentaje).toBe(0);
      expect(res.serie_mensual[0].etiqueta).toBe("Enero");
      expect(res.serie_mensual[0].periodo).toBe("Enero");
    });
  });

  describe("obtenerPoligonosHurtosGeojson", () => {
    it("consulta el FeatureCollection ligero (< 150 KB) con polígonos analíticos", async () => {
      const mockGeojson: HurtosFeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: 1,
            geometry: { type: "MultiPolygon", coordinates: [] },
            properties: {
              poligono_id: 1,
              codigo: "PERIMETRO_URBANO",
              nombre: "Perímetro Urbano",
              zona: "URBANA",
              area_km2: 75.3,
              total_casos: 17798,
              densidad_casos_km2: 236.4,
              porcentaje_total: 97.6,
              top_armas: [{ arma: "SIN EMPLEO DE ARMAS", cantidad: 9800, porcentaje: 55.0 }],
              top_sitios: [{ sitio: "VIAS PUBLICAS", cantidad: 9100, porcentaje: 51.1 }],
            },
          },
          {
            type: "Feature",
            id: 2,
            geometry: { type: "MultiPolygon", coordinates: [] },
            properties: {
              poligono_id: 2,
              codigo: "CARTAGENA_RURAL",
              nombre: "Zona Rural e Insular",
              zona: "RURAL",
              area_km2: 597.4,
              total_casos: 444,
              densidad_casos_km2: 0.74,
              porcentaje_total: 2.4,
              top_armas: [{ arma: "ARMA DE FUEGO", cantidad: 200, porcentaje: 45.0 }],
              top_sitios: [{ sitio: "VIAS PUBLICAS", cantidad: 221, porcentaje: 49.8 }],
            },
          },
        ],
      };

      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockGeojson);

      const res = await obtenerPoligonosHurtosGeojson({ delito: "comercio", anio: 2023 });
      expect(spy).toHaveBeenCalledWith(
        "/geodatos/analitica/hurtos/geojson?delito=HURTO+COMERCIO&anio=2023"
      );
      expect(res.features).toHaveLength(2);
      expect(res.features[0].properties.codigo).toBe("PERIMETRO_URBANO");
    });
  });

  describe("explorarRegistrosHurtos", () => {
    it("construye los query params correctamente con filtros y paginación", async () => {
      const mockResp: ExploradorHurtosResponse = {
        total_registros: 12280,
        total_incidentes: 18242,
        limit: 25,
        offset: 50,
        registros: [],
        agrupacion: [
          { categoria: "SIN EMPLEO DE ARMAS", registros: 5000, incidentes: 7000, porcentaje: 50.0 },
        ],
        catalogos: {
          meses: ["ENERO"],
          dias_semana: ["LUNES"],
          top_armas_medios: ["ARMA DE FUEGO"],
          top_clases_sitio: ["VIA PUBLICA"],
        },
      };

      const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockResp);

      const res = await explorarRegistrosHurtos({
        delito: "hurto_motocicletas",
        anio: 2024,
        mes: "ENERO",
        zona: "URBANA",
        armas_medios: "ARMA DE FUEGO",
        clase_sitio: "VIA PUBLICA",
        dia_semana: "LUNES",
        busqueda: "centro",
        agrupar_por: "delito",
        limit: 25,
        offset: 50,
      });

      expect(spy).toHaveBeenCalledWith(
        "/geodatos/analitica/hurtos/registros?delito=HURTO+MOTOCICLETA&anio=2024&mes=ENERO&zona=URBANA&armas_medios=ARMA+DE+FUEGO&clase_sitio=VIA+PUBLICA&dia_semana=LUNES&busqueda=centro&agrupar_por=delito&limit=25&offset=50"
      );
      expect(res.total_registros).toBe(12280);
      expect(res.agrupacion).toHaveLength(1);
    });

    it("retorna fallback estructurado cuando apiFetch falla", async () => {
      vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(new Error("Network Error"));

      const res = await explorarRegistrosHurtos();
      expect(res.total_registros).toBe(12280);
      expect(res.total_incidentes).toBe(18242);
      expect(res.registros.length).toBeGreaterThan(0);
      expect(res.agrupacion.length).toBeGreaterThan(0);
    });
  });
});

