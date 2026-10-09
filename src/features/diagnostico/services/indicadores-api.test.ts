import { describe, expect, test, vi, afterEach } from "vitest";
import {
  normalizarFicha,
  listarFichasIndicadores,
  obtenerFichaIndicador,
  crearFichaIndicador,
  actualizarFichaIndicador,
} from "./indicadores-api";
import { INDICADORES_FALLBACK } from "../data/indicadores-fallback.data";
import { POLITICAS_MOCK } from "@/features/politicas/__fixtures__/politicas.fixture";

describe("Diagnóstico y Línea Base Cuantitativa DNP", () => {
  describe("Normalización de Fichas de Indicador", () => {
    test("Normaliza correctamente un objeto de la API backend", () => {
      const apiItem = {
        id: "ind-01-uuid",
        codigo: "IND-RES-01",
        nombre: "Tasa de Homicidios por cada 100.000 habitantes",
        tipo_indicador: "resultado",
        definicion: "Muertes violentas registradas",
        metodo_calculo: "(Homicidios / Población) * 100.000",
        unidad_medida: "Tasa",
        sentido_esperado: "descendente",
        periodicidad: "Mensual",
        linea_base_valor: "32.5000",
        linea_base_anio: 2023,
        meta_cuatrienio: "25.0000",
        fuente_datos: "Medicina Legal / Policía",
        responsable_reporte: "Observatorio del Delito",
        valor_actual: "28.7500",
        porcentaje_avance: "50.00",
      };

      const normalizado = normalizarFicha(apiItem);
      expect(normalizado.id).toBe("ind-01-uuid");
      expect(normalizado.codigo).toBe("IND-RES-01");
      expect(normalizado.tipo_indicador).toBe("resultado");
      expect(normalizado.sentido_esperado).toBe("descendente");
      expect(normalizado.linea_base_anio).toBe(2023);
      expect(normalizado.linea_base_valor).toBe("32.5000");
      expect(normalizado.porcentaje_avance).toBe("50.00");
    });

    test("Catálogo de contingencia contiene los 8 indicadores oficiales DNP", () => {
      expect(INDICADORES_FALLBACK.length).toBe(8);

      const codigos = INDICADORES_FALLBACK.map((i) => i.codigo);
      expect(codigos).toContain("IND-RES-01");
      expect(codigos).toContain("IND-RES-02");
      expect(codigos).toContain("IND-RES-03");
      expect(codigos).toContain("IND-INS-01");
      expect(codigos).toContain("IND-INS-02");
      expect(codigos).toContain("IND-PROD-01");
      expect(codigos).toContain("IND-PROD-02");
      expect(codigos).toContain("IND-PROD-03");

      // Verificar tipos
      const resultados = INDICADORES_FALLBACK.filter((i) => i.tipo_indicador === "resultado");
      expect(resultados.length).toBe(3);

      const productos = INDICADORES_FALLBACK.filter((i) => i.tipo_indicador === "producto");
      expect(productos.length).toBe(3);

      const insumos = INDICADORES_FALLBACK.filter((i) => i.tipo_indicador === "insumo");
      expect(insumos.length).toBe(2);
    });

    test("Catálogo de contingencia no contiene cifras de medición ficticias ni porcentajes inventados (AUD-14)", () => {
      for (const ind of INDICADORES_FALLBACK) {
        expect(ind.valor_actual).toBe("Sin medición");
        expect(ind.porcentaje_avance).toBe("Sin medición");
        expect(ind.valor_actual).not.toBe("28.7500");
        expect(ind.valor_actual).not.toBe("2500000000.0000");
      }
    });
  });

  describe("Hito D-0: Verificación de Purga Pericial en politicas.mock.ts", () => {
    test("No contiene vestigios de movilidad de otras ciudades", () => {
      const jsonMock = JSON.stringify(POLITICAS_MOCK);

      expect(jsonMock).not.toContain("Av. Regional");
      expect(jsonMock).not.toContain("Calle 44");
      expect(jsonMock).not.toContain("Comunas 2, 5");
      expect(jsonMock).not.toContain("Comuna 10");
      expect(jsonMock).not.toContain("corredor ferroviario");
      expect(jsonMock).not.toContain("calles escolares");
      expect(jsonMock).not.toContain("Visión Cero");
    });

    test("Contiene las 4 líneas estratégicas reales de Cartagena con sus aportes", () => {
      const politica = POLITICAS_MOCK[0];
      expect(politica).toBeDefined();

      const fase1 = politica.fases.find((f) => f.id === "fase-001-1");
      expect(fase1).toBeDefined();
      expect(fase1?.lineas.length).toBe(4);

      const titulosFase1 = fase1?.lineas.map((l) => l.titulo) ?? [];
      expect(titulosFase1.some((t) => t.includes("ESCNNA"))).toBe(true);
      expect(titulosFase1.some((t) => t.includes("Fronteras Invisibles"))).toBe(true);
      expect(titulosFase1.some((t) => t.includes("Ciénaga de la Virgen"))).toBe(true);
      expect(titulosFase1.some((t) => t.includes("Bazurto") || t.includes("Económica"))).toBe(true);

      // Cada línea de fase 1 debe tener al menos 3 aportes
      for (const linea of fase1?.lineas ?? []) {
        expect(linea.aportes.length).toBeGreaterThanOrEqual(3);
        const tipos = linea.aportes.map((a) => a.tipo);
        expect(tipos).toContain("propuesta");
        expect(tipos).toContain("anotacion");
        expect(tipos).toContain("pregunta");
      }

      const fase2 = politica.fases.find((f) => f.id === "fase-001-2");
      expect(fase2).toBeDefined();
      expect(fase2?.lineas.length).toBe(4);
    });
  });

  describe("Consumo de API y Erradicación de Fallbacks Silenciosos (H-04)", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("listarFichasIndicadores retorna datos de la API cuando responde exitosamente", async () => {
      const mockApi = [
        {
          id: "ind-test-1",
          codigo: "IND-RES-01",
          nombre: "Indicador Prueba",
          tipo_indicador: "resultado",
          linea_base_valor: "10",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockApi), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const fichas = await listarFichasIndicadores();
      expect(fichas).toHaveLength(1);
      expect(fichas[0].id).toBe("ind-test-1");
      expect(fichas[0].codigo).toBe("IND-RES-01");
    });

    test("listarFichasIndicadores devuelve arreglo vacío cuando el backend responde vacío (H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const fichas = await listarFichasIndicadores();
      expect(fichas).toEqual([]);
    });

    test("listarFichasIndicadores propaga error cuando el backend falla (H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("Fallo de conexión al backend");
      });

      await expect(listarFichasIndicadores()).rejects.toThrow("Fallo de conexión al backend");
    });

    test("obtenerFichaIndicador retorna la ficha si existe remotamente", async () => {
      const mockFicha = {
        id: "ind-01-uuid",
        codigo: "IND-RES-01",
        nombre: "Tasa de Homicidios",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockFicha), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const ficha = await obtenerFichaIndicador("ind-01-uuid");
      expect(ficha.id).toBe("ind-01-uuid");
      expect(ficha.codigo).toBe("IND-RES-01");
    });

    test("obtenerFichaIndicador propaga excepción cuando responde 404 (H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response("Not Found", { status: 404 });
      });

      await expect(obtenerFichaIndicador("ind-inexistente")).rejects.toThrow();
    });

    test("crearFichaIndicador despacha POST /indicadores/fichas y retorna la ficha creada (GAP-04)", async () => {
      const payloadNuevo = {
        codigo: "IND-PROD-09",
        nombre: "Jornadas Comunitarias Realizadas",
        tipo_indicador: "producto" as const,
        definicion: "Total de jornadas territoriales",
        metodo_calculo: "Sumatoria de jornadas",
        unidad_medida: "Jornadas",
        sentido_esperado: "ascendente" as const,
        periodicidad: "Trimestral",
        linea_base_valor: "0",
        linea_base_anio: 2026,
        meta_cuatrienio: "50",
        fuente_datos: "Secretaría del Interior",
        responsable_reporte: "Coordinación de Participación",
      };

      const respuestaBackend = {
        id: "ind-09-creado",
        ...payloadNuevo,
        creado_en: "2026-10-09T00:00:00Z",
        actualizado_en: "2026-10-09T00:00:00Z",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain("/indicadores/fichas");
        expect(init?.method).toBe("POST");
        const bodyParseado = JSON.parse(String(init?.body));
        expect(bodyParseado.codigo).toBe("IND-PROD-09");
        return new Response(JSON.stringify(respuestaBackend), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      });

      const resultado = await crearFichaIndicador(payloadNuevo);
      expect(resultado.id).toBe("ind-09-creado");
      expect(resultado.codigo).toBe("IND-PROD-09");
      expect(resultado.nombre).toBe("Jornadas Comunitarias Realizadas");
    });

    test("actualizarFichaIndicador despacha PATCH /indicadores/fichas/{id} y retorna la ficha actualizada (GAP-04)", async () => {
      const idObjetivo = "ind-09-creado";
      const actualizacion = {
        responsable_reporte: "Secretaría de Participación y Desarrollo Social",
        fuente_datos: "Sistema Distrital de Monitoreo",
        periodicidad: "Semestral",
      };

      const respuestaBackend = {
        id: idObjetivo,
        codigo: "IND-PROD-09",
        nombre: "Jornadas Comunitarias Realizadas",
        tipo_indicador: "producto",
        ...actualizacion,
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(String(url)).toContain(`/indicadores/fichas/${idObjetivo}`);
        expect(init?.method).toBe("PATCH");
        const bodyParseado = JSON.parse(String(init?.body));
        expect(bodyParseado.responsable_reporte).toBe("Secretaría de Participación y Desarrollo Social");
        return new Response(JSON.stringify(respuestaBackend), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const resultado = await actualizarFichaIndicador(idObjetivo, actualizacion);
      expect(resultado.id).toBe(idObjetivo);
      expect(resultado.responsable_reporte).toBe("Secretaría de Participación y Desarrollo Social");
      expect(resultado.periodicidad).toBe("Semestral");
    });
  });
});


