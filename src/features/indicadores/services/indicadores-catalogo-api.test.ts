import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  construirUrlCatalogoIndicadores,
  esUrlHttpsSegura,
  obtenerCatalogoIndicadores,
} from "./indicadores-catalogo-api";
import * as apiClient from "@/core/http/api-client";

describe("Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("esUrlHttpsSegura (N-6: Validación estricta de esquema seguro)", () => {
    test("retorna true únicamente para URLs que inician con https://", () => {
      expect(esUrlHttpsSegura("https://www.dane.gov.co/indicadores")).toBe(true);
      expect(esUrlHttpsSegura("https://datos.gov.co/resource/abc")).toBe(true);
      expect(esUrlHttpsSegura("HTTPS://TERRIDATA.DNP.GOV.CO")).toBe(true);
    });

    test("retorna false para NO_VERIFICADO, http no seguro o entradas inválidas", () => {
      expect(esUrlHttpsSegura("NO_VERIFICADO")).toBe(false);
      expect(esUrlHttpsSegura("http://inseguro.gov.co")).toBe(false);
      expect(esUrlHttpsSegura("javascript:alert(1)")).toBe(false);
      expect(esUrlHttpsSegura("ftp://servidor.com")).toBe(false);
      expect(esUrlHttpsSegura("")).toBe(false);
      expect(esUrlHttpsSegura(null)).toBe(false);
      expect(esUrlHttpsSegura(undefined)).toBe(false);
    });
  });

  describe("construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros)", () => {
    test("retorna endpoint base sin parámetros cuando filtros no se proveen o están vacíos", () => {
      expect(construirUrlCatalogoIndicadores()).toBe("/indicadores/catalogo");
      expect(construirUrlCatalogoIndicadores({})).toBe("/indicadores/catalogo");
    });

    test("omite comodines como 'todas', 'todos' y cadenas en blanco", () => {
      expect(
        construirUrlCatalogoIndicadores({
          dimension: "todas",
          tier: "todos",
          busqueda: "   ",
        }),
      ).toBe("/indicadores/catalogo");
    });

    test("construye URL con parámetro dimension individual", () => {
      expect(
        construirUrlCatalogoIndicadores({ dimension: "SALUD" }),
      ).toBe("/indicadores/catalogo?dimension=SALUD");
    });

    test("construye URL con parámetro tier individual", () => {
      expect(
        construirUrlCatalogoIndicadores({ tier: "A" }),
      ).toBe("/indicadores/catalogo?tier=A");
    });

    test("construye URL con parámetro busqueda individual", () => {
      expect(
        construirUrlCatalogoIndicadores({ busqueda: "tasa homicidios" }),
      ).toBe("/indicadores/catalogo?busqueda=tasa+homicidios");
    });

    test("combina múltiples parámetros simultáneos con codificación adecuada", () => {
      const url = construirUrlCatalogoIndicadores({
        dimension: "PERS",
        tier: "C",
        busqueda: "hurto calificado",
      });
      expect(url).toBe(
        "/indicadores/catalogo?dimension=PERS&tier=C&busqueda=hurto+calificado",
      );
    });
  });

  describe("obtenerCatalogoIndicadores (B-2: Consumo de cliente apiFetch)", () => {
    test("invoca apiFetch con la URL construida a partir de los filtros", async () => {
      const respuestaMock = {
        total: 1,
        archivo_sha256: "abc123sha",
        indicadores: [
          {
            codigo: "SALUD_004",
            nombre: "Inseguridad alimentaria moderada o grave",
            dimension: "SALUD",
            definicion: "Porcentaje de hogares con inseguridad alimentaria",
            formula: "Hogares con escala FIES / Total hogares * 100",
            numerador: "Hogares con FIES afirmativo",
            denominador: "Total hogares de Cartagena",
            unidad: "Porcentaje (%)",
            tipo_territorio_fuente: "Municipal",
            periodicidad: "Anual",
            tipo_periodo: "Año calendario",
            fuente: "DANE - Encuesta Nacional de Calidad de Vida",
            url_fuente: "https://www.dane.gov.co",
            custodio: "DANE",
            licencia: "Open Data DANE",
            anio_base: "2024",
            interpretacion: "A mayor porcentaje, mayor vulnerabilidad nutricional",
            riesgo_metodologico: "Estimación por muestreo con error de diseño",
            tier: "A",
            estado: "no_publicable",
          },
        ],
      };

      const spy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(respuestaMock);

      const resultado = await obtenerCatalogoIndicadores({
        dimension: "SALUD",
        tier: "A",
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        "/indicadores/catalogo?dimension=SALUD&tier=A",
      );
      expect(resultado).toEqual(respuestaMock);
      expect(resultado.total).toBe(1);
      expect(resultado.indicadores[0].codigo).toBe("SALUD_004");
    });
  });
});
