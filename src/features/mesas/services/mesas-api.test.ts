import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  actualizarMesaRemota,
  normalizarMesaBackend,
  type MesaBackendResponse,
} from "./mesas-api";

describe("Persistencia y normalización de Mesas de Trabajo (EDIT-01)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("normalizarMesaBackend", () => {
    test("mapea atributos backend con fallback semántico correcto", () => {
      const backendData: MesaBackendResponse = {
        id: "mesa-uuid-1234",
        nombre: "Mesa Territorial San Francisco",
        fecha: "2026-10-15T00:00:00Z",
        lugar_nombre: "Centro Cultural Las Palmeras",
        estado: "PROGRAMADA",
        tipo_mesa: "TERRITORIAL",
        horario: "09:00 - 13:00",
        aforo_maximo: 80,
        metadatos: {
          entidad: "Secretaría del Interior",
          facilitador: "Dra. Patricia Gómez",
          lugar: "Centro Cultural Las Palmeras",
        },
      };

      const mesa = normalizarMesaBackend(backendData);

      expect(mesa.id).toBe("mesa-uuid-1234");
      expect(mesa.nombre).toBe("Mesa Territorial San Francisco");
      expect(mesa.fecha).toBe("2026-10-15");
      expect(mesa.lugar).toBe("Centro Cultural Las Palmeras");
      expect(mesa.entidad).toBe("Secretaría del Interior");
      expect(mesa.facilitador).toBe("Dra. Patricia Gómez");
      expect(mesa.estado).toBe("programada");
      expect(mesa.tipoMesa).toBe("TERRITORIAL");
    });
  });

  describe("actualizarMesaRemota", () => {
    test("emite PATCH /mesas/{mesa_id} con la estructura esperada y normaliza respuesta", async () => {
      const mockResponse: MesaBackendResponse = {
        id: "01924567-89ab-7cde-f012-3456789abcde",
        nombre: "Mesa Territorial Actualizada",
        fecha: "2026-10-20",
        lugar_nombre: "Sede Comunal Blas de Lezo",
        horario: "08:30 - 12:30",
        aforo_maximo: 60,
        total_asistentes: 0,
        estado: "PROGRAMADA",
        tipo_mesa: "TERRITORIAL",
        metadatos: {
          entidad: "Secretaría de Participación",
          facilitador: "Dr. Andrés Morales",
        },
      };

      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: Record<string, unknown> = {};

      vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
        capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
        capturedMethod = init?.method ?? "GET";
        if (init?.body && typeof init.body === "string") {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const mesaId = "01924567-89ab-7cde-f012-3456789abcde";
      const resultado = await actualizarMesaRemota(mesaId, {
        nombre: "Mesa Territorial Actualizada",
        lugar: "Sede Comunal Blas de Lezo",
        fecha: "2026-10-20",
        horario: "08:30 - 12:30",
        aforo: 60,
        entidad: "Secretaría de Participación",
        facilitador: "Dr. Andrés Morales",
      });

      expect(capturedUrl).toContain(`/mesas/${mesaId}`);
      expect(capturedMethod).toBe("PATCH");
      expect(capturedBody.nombre).toBe("Mesa Territorial Actualizada");
      expect(capturedBody.lugar).toBe("Sede Comunal Blas de Lezo");
      expect(capturedBody.fecha).toBe("2026-10-20");
      expect(capturedBody.horario).toBe("08:30 - 12:30");
      expect(capturedBody.aforo_maximo).toBe(60);
      expect(capturedBody.entidad_responsable).toBe("Secretaría de Participación");
      expect(capturedBody.facilitador_principal).toBe("Dr. Andrés Morales");

      expect(resultado.id).toBe(mesaId);
      expect(resultado.nombre).toBe("Mesa Territorial Actualizada");
      expect(resultado.lugar).toBe("Sede Comunal Blas de Lezo");
      expect(resultado.entidad).toBe("Secretaría de Participación");
      expect(resultado.facilitador).toBe("Dr. Andrés Morales");
    });
  });
});
