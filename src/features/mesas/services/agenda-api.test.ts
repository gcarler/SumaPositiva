import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  listarAgendas,
  obtenerAgenda,
  crearAgendaRemota,
  actualizarAgendaRemota,
  normalizarAgendaBackend,
  type AgendaBackendResponse,
} from "./agenda-api";

describe("Gestión remota de Cronograma de Agendas de Mesas (EDIT-02)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("normalizarAgendaBackend", () => {
    test("mapea atributos de backend a MesaAgenda de frontend", () => {
      const backendData: AgendaBackendResponse = {
        id: "T-01",
        tipo: "territorial",
        nombre: "Mesa Territorial San Francisco",
        territorio: "Localidad Histórica y del Caribe Norte",
        lugar: "I.E. Nuestra Señora del Carmen",
        fecha: "2026-10-18T00:00:00Z",
        hora_inicio: "08:30",
        hora_fin: "12:30",
        estado: "programada",
        dimensiones_onu: ["Seguridad Humana", "Desarrollo Sostenible"],
        responsable: "Secretaría del Interior",
        observaciones: "Convocatoria comunitaria previa",
      };

      const agenda = normalizarAgendaBackend(backendData);

      expect(agenda.id).toBe("T-01");
      expect(agenda.tipo).toBe("territorial");
      expect(agenda.nombre).toBe("Mesa Territorial San Francisco");
      expect(agenda.territorio).toBe("Localidad Histórica y del Caribe Norte");
      expect(agenda.lugar).toBe("I.E. Nuestra Señora del Carmen");
      expect(agenda.fecha).toBe("2026-10-18");
      expect(agenda.horaInicio).toBe("08:30");
      expect(agenda.horaFin).toBe("12:30");
      expect(agenda.estado).toBe("programada");
      expect(agenda.dimensionesONU).toEqual(["Seguridad Humana", "Desarrollo Sostenible"]);
      expect(agenda.responsable).toBe("Secretaría del Interior");
      expect(agenda.observaciones).toBe("Convocatoria comunitaria previa");
    });
  });

  describe("listarAgendas", () => {
    test("retorna datos de la API cuando la respuesta es exitosa", async () => {
      const mockList: AgendaBackendResponse[] = [
        {
          id: "T-01",
          tipo: "territorial",
          nombre: "Mesa 1",
          territorio: "Localidad 1",
          lugar: "Colegio 1",
          fecha: "2026-10-20",
          hora_inicio: "09:00",
          hora_fin: "13:00",
          estado: "programada",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockList), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const items = await listarAgendas({ tipo: "territorial" });
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("T-01");
      expect(items[0].nombre).toBe("Mesa 1");
    });

    test("propaga excepción ante error de red o backend no disponible (H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("Network connection failed");
      });

      await expect(listarAgendas()).rejects.toThrow("Network connection failed");
    });

    test("retorna arreglo vacío si el backend devuelve lista vacía (H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const items = await listarAgendas();
      expect(items).toEqual([]);
    });
  });

  describe("obtenerAgenda", () => {
    test("retorna agenda por ID si existe remotamente", async () => {
      const mockResp: AgendaBackendResponse = {
        id: "T-02",
        tipo: "territorial",
        nombre: "Mesa 2",
        territorio: "Localidad 2",
        lugar: "Sede Comunal 2",
        fecha: "2026-10-22",
        hora_inicio: "08:00",
        hora_fin: "12:00",
        estado: "en_curso",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockResp), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const agenda = await obtenerAgenda("T-02");
      expect(agenda.id).toBe("T-02");
      expect(agenda.estado).toBe("en_curso");
    });

    test("propaga excepción cuando la API responde 404 (H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response("Not Found", { status: 404 });
      });

      await expect(obtenerAgenda("mt-001")).rejects.toThrow();
    });
  });

  describe("crearAgendaRemota", () => {
    test("envía POST /mesas/agendas con el payload esperado", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: Record<string, unknown> = {};

      const mockResp: AgendaBackendResponse = {
        id: "EXTRA-01",
        tipo: "territorial",
        nombre: "Mesa Comunitaria Extra",
        territorio: "Isla de Barú",
        lugar: "Salón Comunal Santa Ana",
        fecha: "2026-11-05",
        hora_inicio: "09:00",
        hora_fin: "13:00",
        estado: "programada",
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

      const creado = await crearAgendaRemota({
        id: "EXTRA-01",
        nombre: "Mesa Comunitaria Extra",
        territorio: "Isla de Barú",
        lugar: "Salón Comunal Santa Ana",
        fecha: "2026-11-05",
        horaInicio: "09:00",
        horaFin: "13:00",
      });

      expect(capturedUrl).toContain("/mesas/agendas");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody.id).toBe("EXTRA-01");
      expect(capturedBody.nombre).toBe("Mesa Comunitaria Extra");
      expect(capturedBody.territorio).toBe("Isla de Barú");
      expect(creado.id).toBe("EXTRA-01");
    });
  });

  describe("actualizarAgendaRemota", () => {
    test("envía PATCH /mesas/agendas/{id} con campos parciales", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: Record<string, unknown> = {};

      const mockResp: AgendaBackendResponse = {
        id: "T-01",
        tipo: "territorial",
        nombre: "Mesa Territorial San Francisco (Reprogramada)",
        lugar: "Nueva Cancha Techada",
        fecha: "2026-10-25",
        estado: "reprogramada",
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

      const actualizado = await actualizarAgendaRemota("T-01", {
        nombre: "Mesa Territorial San Francisco (Reprogramada)",
        lugar: "Nueva Cancha Techada",
        fecha: "2026-10-25",
        estado: "reprogramada",
      });

      expect(capturedUrl).toContain("/mesas/agendas/T-01");
      expect(capturedMethod).toBe("PATCH");
      expect(capturedBody.nombre).toBe("Mesa Territorial San Francisco (Reprogramada)");
      expect(capturedBody.lugar).toBe("Nueva Cancha Techada");
      expect(capturedBody.fecha).toBe("2026-10-25");
      expect(capturedBody.estado).toBe("reprogramada");
      expect(actualizado.estado).toBe("reprogramada");
    });
  });
});
