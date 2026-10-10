import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mapearAlternativaDesdeApi,
  mapearAlternativaHaciaPayload,
  listarAlternativasApi,
  obtenerAlternativaApi,
  crearAlternativaApi,
  actualizarAlternativaApi,
  eliminarAlternativaApi,
  type AlternativaApiRespuesta,
} from "./alternativas-api";
import { ALTERNATIVAS_CANONICAS } from "../data/alternativas-canonicas.data";

describe("Alternativas de Solución API Service (EDIT-09)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Transformación y Mapeo de DTOs", () => {
    it("mapearAlternativaDesdeApi transforma correctamente la respuesta de FastAPI", () => {
      const apiDto: AlternativaApiRespuesta = {
        id: "01a0f810-e5ca-7001-a001-000000000001",
        codigo: "ALT-ESCNNA-01",
        nombre: "Ruta Distrital Segura",
        descripcion: "Prevención de ESCNNA",
        sector: "proteccion_nna",
        linea_estrategica_codigo: "LE-02",
        dimension_codigo: "personal",
        costo_estimado_cop: "4500000000.00",
        horizonte_anios: 4,
        estado: "priorizada",
        requiere_consulta_previa: false,
        territorio_cobertura: "Centro Histórico",
        poblacion_objetivo_estimada: 14500,
        objetivo_central: "Erradicar la explotación sexual comercial",
        fuentes_financiacion_sugeridas: ["FONSET", "SGP"],
        metadatos: { marco: "Ley 679" },
        creado_en: "2026-10-01T10:00:00Z",
        actualizado_en: "2026-10-04T12:00:00Z",
      };

      const resultado = mapearAlternativaDesdeApi(apiDto);
      expect(resultado.id).toBe("01a0f810-e5ca-7001-a001-000000000001");
      expect(resultado.codigo).toBe("ALT-ESCNNA-01");
      expect(resultado.sector).toBe("proteccion_nna");
      expect(resultado.costo_estimado_cop).toBe(4500000000);
      expect(resultado.dimension_id).toBe("personal");
      expect(resultado.objetivo_central_mga).toBe("Erradicar la explotación sexual comercial");
      expect(resultado.fuentes_financiacion_sugeridas).toEqual(["FONSET", "SGP"]);
      expect(resultado.requiere_consulta_previa).toBe(false);
    });

    it("mapearAlternativaHaciaPayload empaqueta correctamente campos para backend", () => {
      const payload = mapearAlternativaHaciaPayload({
        codigo: "ALT-TEST-01",
        nombre: "Iniciativa de Prueba",
        sector: "seguridad_convivencia",
        dimension_id: "comunitaria",
        objetivo_central_mga: "Objetivo de convivencia",
        costo_estimado_cop: 500000000,
        requiere_consulta_previa: true,
      });

      expect(payload.codigo).toBe("ALT-TEST-01");
      expect(payload.nombre).toBe("Iniciativa de Prueba");
      expect(payload.sector).toBe("seguridad_convivencia");
      expect(payload.dimension_codigo).toBe("comunitaria");
      expect(payload.objetivo_central).toBe("Objetivo de convivencia");
      expect(payload.costo_estimado_cop).toBe(500000000);
      expect(payload.requiere_consulta_previa).toBe(true);
    });
  });

  describe("Operaciones HTTP contra Backend", () => {
    it("listarAlternativasApi invoca /alternativas y retorna con esContingencia=false", async () => {
      const mockDatos: AlternativaApiRespuesta[] = [
        {
          id: "01a0f810-e5ca-7001-a001-000000000001",
          codigo: "ALT-ESCNNA-01",
          nombre: "Ruta Distrital Segura",
          descripcion: "",
          sector: "proteccion_nna",
          costo_estimado_cop: 4500000000,
          horizonte_anios: 4,
          estado: "priorizada",
          requiere_consulta_previa: false,
          poblacion_objetivo_estimada: 14500,
          creado_en: "2026-10-01T10:00:00Z",
          actualizado_en: "2026-10-04T12:00:00Z",
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockDatos), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await listarAlternativasApi({ sector: "proteccion_nna" });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/alternativas?sector=proteccion_nna"),
        expect.anything()
      );
      expect(res.esContingencia).toBe(false);
      expect(res.datos).toHaveLength(1);
      expect(res.datos[0].codigo).toBe("ALT-ESCNNA-01");
    });

    it("listarAlternativasApi conmuta a modo contingencia ante fallo de red", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(() => {
        throw new Error("Network Error - Connection Refused");
      });

      const res = await listarAlternativasApi();
      expect(res.esContingencia).toBe(true);
      expect(res.datos).toEqual(ALTERNATIVAS_CANONICAS);
    });

    it("obtenerAlternativaApi consulta iniciativa por código", async () => {
      const mockItem: AlternativaApiRespuesta = {
        id: "01a0f810-e5ca-7001-a001-000000000001",
        codigo: "ALT-ESCNNA-01",
        nombre: "Ruta Distrital Segura",
        descripcion: "",
        sector: "proteccion_nna",
        costo_estimado_cop: 4500000000,
        horizonte_anios: 4,
        estado: "priorizada",
        requiere_consulta_previa: false,
        poblacion_objetivo_estimada: 14500,
        creado_en: "2026-10-01T10:00:00Z",
        actualizado_en: "2026-10-04T12:00:00Z",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockItem), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await obtenerAlternativaApi("ALT-ESCNNA-01");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/alternativas/ALT-ESCNNA-01"),
        expect.anything()
      );
      expect(res.codigo).toBe("ALT-ESCNNA-01");
    });

    it("crearAlternativaApi despacha POST /alternativas", async () => {
      const mockCreado: AlternativaApiRespuesta = {
        id: "01a0f810-e5ca-7001-a001-000000000099",
        codigo: "ALT-NUEVA-99",
        nombre: "Nueva Alternativa",
        descripcion: "Detalle",
        sector: "seguridad_convivencia",
        costo_estimado_cop: 100000000,
        horizonte_anios: 3,
        estado: "en_formulacion",
        requiere_consulta_previa: false,
        poblacion_objetivo_estimada: 500,
        creado_en: "2026-10-04T13:00:00Z",
        actualizado_en: "2026-10-04T13:00:00Z",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockCreado), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await crearAlternativaApi({
        codigo: "ALT-NUEVA-99",
        nombre: "Nueva Alternativa",
        descripcion: "Detalle",
        sector: "seguridad_convivencia",
        linea_estrategica_codigo: "LE-01",
        dimension_id: "personal",
        objetivo_central_mga: "Objetivo",
        territorio_cobertura: "UCG 1",
        poblacion_objetivo_estimada: 500,
        costo_estimado_cop: 100000000,
        horizonte_anios: 3,
        fuentes_financiacion_sugeridas: ["FONSET"],
        estado: "en_formulacion",
        requiere_consulta_previa: false,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/alternativas"),
        expect.objectContaining({ method: "POST" })
      );
      expect(res.id).toBe("01a0f810-e5ca-7001-a001-000000000099");
    });

    it("actualizarAlternativaApi despacha PATCH /alternativas/{id}", async () => {
      const mockActualizado: AlternativaApiRespuesta = {
        id: "01a0f810-e5ca-7001-a001-000000000001",
        codigo: "ALT-ESCNNA-01",
        nombre: "Ruta Distrital Actualizada",
        descripcion: "",
        sector: "proteccion_nna",
        costo_estimado_cop: 4900000000,
        horizonte_anios: 4,
        estado: "viable",
        requiere_consulta_previa: false,
        poblacion_objetivo_estimada: 14500,
        creado_en: "2026-10-01T10:00:00Z",
        actualizado_en: "2026-10-04T13:30:00Z",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockActualizado), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await actualizarAlternativaApi(
        "01a0f810-e5ca-7001-a001-000000000001",
        { nombre: "Ruta Distrital Actualizada", estado: "viable" },
        "Ajuste técnico"
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/alternativas/01a0f810-e5ca-7001-a001-000000000001"),
        expect.objectContaining({ method: "PATCH" })
      );
      expect(res.nombre).toBe("Ruta Distrital Actualizada");
      expect(res.estado).toBe("viable");
    });

    it("eliminarAlternativaApi despacha DELETE /alternativas/{id}", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const res = await eliminarAlternativaApi("01a0f810-e5ca-7001-a001-000000000001");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/alternativas/01a0f810-e5ca-7001-a001-000000000001"),
        expect.objectContaining({ method: "DELETE" })
      );
      expect(res).toBe(true);
    });
  });
});
