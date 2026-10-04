import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  listarFuentes,
  obtenerFuente,
  obtenerKpisFuentes,
  crearFuenteRemota,
  actualizarFuenteRemota,
  eliminarFuenteRemota,
  normalizarFuenteBackend,
  type FuenteBackendResponse,
} from "./fuentes-api";
import { FUENTES_INICIALES } from "../data/fuentes-iniciales.data";

describe("Gestión remota de Fuentes de Información y Solicitudes Oficiales (EDIT-03)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("normalizarFuenteBackend", () => {
    test("mapea atributos de backend snake_case a frontend camelCase", () => {
      const backendData: FuenteBackendResponse = {
        id: "fnt-loc-01",
        codigo: "FNT-LOC-001",
        entidad: "Policía Metropolitana de Cartagena",
        nombre_fuente: "SIEDCO Estadísticas",
        tipo: "secundaria",
        ambito: "local",
        dimension_seguridad: "personal",
        periodicidad: "mensual",
        radicado_solicitud: "DIST-SEC-2026-0891",
        fecha_solicitud: "2026-01-15",
        fecha_limite_respuesta: "2026-02-15",
        estado_entrega: "entregada",
        variables_solicitadas: ["Homicidios", "Hurtos"],
        resumen_datos: "Serie histórica consolidada 2021-2025.",
        archivo_adjunto_url: "https://www.policia.gov.co",
        observaciones_calidad: "Información georreferenciada.",
        actualizado_en: "2026-03-25T14:30:00Z",
      };

      const normalizada = normalizarFuenteBackend(backendData);

      expect(normalizada.id).toBe("fnt-loc-01");
      expect(normalizada.codigo).toBe("FNT-LOC-001");
      expect(normalizada.entidad).toBe("Policía Metropolitana de Cartagena");
      expect(normalizada.nombreFuente).toBe("SIEDCO Estadísticas");
      expect(normalizada.tipo).toBe("secundaria");
      expect(normalizada.ambito).toBe("local");
      expect(normalizada.dimensionSeguridad).toBe("personal");
      expect(normalizada.radicadoSolicitud).toBe("DIST-SEC-2026-0891");
      expect(normalizada.fechaSolicitud).toBe("2026-01-15");
      expect(normalizada.fechaLimiteRespuesta).toBe("2026-02-15");
      expect(normalizada.estadoEntrega).toBe("entregada");
      expect(normalizada.variablesSolicitadas).toEqual(["Homicidios", "Hurtos"]);
      expect(normalizada.datosEntregadosResumen).toBe("Serie histórica consolidada 2021-2025.");
      expect(normalizada.archivoAdjuntoUrl).toBe("https://www.policia.gov.co");
      expect(normalizada.observacionesCalidad).toBe("Información georreferenciada.");
    });
  });

  describe("listarFuentes", () => {
    test("retorna fuentes de la API cuando la respuesta es exitosa", async () => {
      const mockList: FuenteBackendResponse[] = [
        {
          id: "fnt-test-01",
          codigo: "FNT-TEST-001",
          entidad: "Entidad Test",
          nombre_fuente: "Fuente de Prueba",
          tipo: "primaria",
          ambito: "local",
          dimension_seguridad: "personal",
          periodicidad: "mensual",
          estado_entrega: "en_termino",
          variables_solicitadas: [],
        },
      ];

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockList), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const fuentes = await listarFuentes({ ambito: "local" });
      expect(fuentes).toHaveLength(1);
      expect(fuentes[0].codigo).toBe("FNT-TEST-001");
    });

    test("aplica fallback resiliente a FUENTES_INICIALES ante desconexión", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("Network offline");
      });

      const fuentes = await listarFuentes();
      expect(fuentes).toEqual(FUENTES_INICIALES);
      expect(fuentes.length).toBe(18);
    });
  });

  describe("obtenerFuente", () => {
    test("obtiene detalle remoto de fuente", async () => {
      const mockResp: FuenteBackendResponse = {
        id: "fnt-loc-01",
        codigo: "FNT-LOC-001",
        entidad: "MECAR",
        nombre_fuente: "SIEDCO",
        tipo: "secundaria",
        ambito: "local",
        dimension_seguridad: "personal",
        periodicidad: "mensual",
        estado_entrega: "entregada",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockResp), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const fuente = await obtenerFuente("fnt-loc-01");
      expect(fuente.id).toBe("fnt-loc-01");
      expect(fuente.codigo).toBe("FNT-LOC-001");
    });

    test("aplica fallback a FUENTES_INICIALES si la API responde 404", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response("Not Found", { status: 404 });
      });

      const fuente = await obtenerFuente("fnt-loc-01");
      expect(fuente).toBeDefined();
      expect(fuente.codigo).toBe("FNT-LOC-001");
    });
  });

  describe("obtenerKpisFuentes", () => {
    test("retorna KPIs calculados por backend", async () => {
      const mockKpis = {
        total: 18,
        entregadas: 12,
        en_termino: 3,
        incompletas: 2,
        vencidas: 1,
        requerimiento_insistencia: 0,
        atencion_critica: 1,
        porcentaje_cumplimiento: 67,
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockKpis), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const kpis = await obtenerKpisFuentes();
      expect(kpis.total).toBe(18);
      expect(kpis.porcentaje_cumplimiento).toBe(67);
    });
  });

  describe("crearFuenteRemota", () => {
    test("envía POST /fuentes con radicado y estructura requerida", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: Record<string, unknown> = {};

      const mockResp: FuenteBackendResponse = {
        id: "fnt-test-qa",
        codigo: "FNT-QA-01",
        entidad: "Entidad QA",
        nombre_fuente: "Fuente QA",
        tipo: "secundaria",
        ambito: "local",
        dimension_seguridad: "ambiental",
        periodicidad: "anual",
        radicado_solicitud: "DIST-QA-2026-001",
        estado_entrega: "en_termino",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
        capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
        capturedMethod = init?.method ?? "GET";
        if (init?.body && typeof init.body === "string") {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify(mockResp), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      });

      const creada = await crearFuenteRemota({
        codigo: "FNT-QA-01",
        entidad: "Entidad QA",
        nombreFuente: "Fuente QA",
        tipo: "secundaria",
        ambito: "local",
        dimensionSeguridad: "ambiental",
        periodicidad: "anual",
        radicadoSolicitud: "DIST-QA-2026-001",
        estadoEntrega: "en_termino",
        variablesSolicitadas: ["Calidad del agua"],
      });

      expect(capturedUrl).toContain("/fuentes");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody.codigo).toBe("FNT-QA-01");
      expect(capturedBody.radicado_solicitud).toBe("DIST-QA-2026-001");
      expect(creada.codigo).toBe("FNT-QA-01");
    });
  });

  describe("actualizarFuenteRemota", () => {
    test("envía PATCH /fuentes/{id} con datos de radicado y observaciones", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: Record<string, unknown> = {};

      const mockResp: FuenteBackendResponse = {
        id: "fnt-loc-05",
        codigo: "FNT-LOC-005",
        entidad: "EPA Cartagena",
        radicado_solicitud: "DIST-INS-2026-012",
        estado_entrega: "entregada",
        resumen_datos: "Datos entregados tras requerimiento.",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
        capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
        capturedMethod = init?.method ?? "GET";
        if (init?.body && typeof init.body === "string") {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify(mockResp), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const actualizada = await actualizarFuenteRemota("fnt-loc-05", {
        radicadoSolicitud: "DIST-INS-2026-012",
        estadoEntrega: "entregada",
        datosEntregadosResumen: "Datos entregados tras requerimiento.",
      });

      expect(capturedUrl).toContain("/fuentes/fnt-loc-05");
      expect(capturedMethod).toBe("PATCH");
      expect(capturedBody.radicado_solicitud).toBe("DIST-INS-2026-012");
      expect(capturedBody.estado_entrega).toBe("entregada");
      expect(capturedBody.resumen_datos).toBe("Datos entregados tras requerimiento.");
      expect(actualizada.estadoEntrega).toBe("entregada");
    });
  });

  describe("eliminarFuenteRemota", () => {
    test("envía DELETE /fuentes/{id}", async () => {
      let capturedUrl = "";
      let capturedMethod = "";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
        capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
        capturedMethod = init?.method ?? "GET";
        return new Response(null, { status: 204 });
      });

      await eliminarFuenteRemota("fnt-test-01");
      expect(capturedUrl).toContain("/fuentes/fnt-test-01");
      expect(capturedMethod).toBe("DELETE");
    });
  });
});
