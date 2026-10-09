import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  actualizarMesaRemota,
  crearMesaRemota,
  normalizarMesaBackend,
  listarMesas,
  obtenerMesa,
  type MesaBackendResponse,
} from "./mesas-api";
import { useSesionStore } from "@/features/sesion/state/session-store";

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

    test("H-11: prioriza facilitador_nombre retornado por backend", () => {
      const backendData: MesaBackendResponse = {
        id: "mesa-uuid-5678",
        nombre: "Mesa Rural Bayunca",
        facilitador_id: "usr-uuid-001",
        facilitador_nombre: "Ing. Martín Morales",
        metadatos: {
          facilitador: "Nombre Obsoleto",
        },
      };

      const mesa = normalizarMesaBackend(backendData);
      expect(mesa.facilitador).toBe("Ing. Martín Morales");
    });

    test("H-11: sin facilitador asignado no retorna el valor genérico 'Facilitador Institucional'", () => {
      const backendData: MesaBackendResponse = {
        id: "mesa-uuid-9999",
        nombre: "Mesa Sin Facilitador",
      };

      const mesa = normalizarMesaBackend(backendData);
      expect(mesa.facilitador).toBe("");
      expect(mesa.facilitador).not.toBe("Facilitador Institucional");
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

  describe("listarMesas (Hito 4 / EDIT-15)", () => {
    test("retorna colección normalizada cuando el backend responde exitosamente", async () => {
      const mockList: MesaBackendResponse[] = [
        {
          id: "m-001",
          nombre: "Mesa 1",
          fecha: "2026-10-10",
          lugar_nombre: "Coliseo",
          estado: "PROGRAMADA",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify(mockList), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const mesas = await listarMesas();
      expect(mesas).toHaveLength(1);
      expect(mesas[0].id).toBe("m-001");
      expect(mesas[0].nombre).toBe("Mesa 1");
    });

    test("retorna arreglo vacío canónico cuando el backend no tiene mesas sin activar fallback", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const mesas = await listarMesas();
      expect(mesas).toEqual([]);
    });

    test("propaga el error si la API falla sin enmascararlo con fallback silencioso", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: "Fallo de conexión interno" }), {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        });
      });

      await expect(listarMesas()).rejects.toThrow();
    });
  });

  describe("obtenerMesa (Hito 4 / EDIT-15)", () => {
    test("retorna mesa normalizada al encontrarla en el backend", async () => {
      const mockMesa: MesaBackendResponse = {
        id: "mesa-valida-01",
        nombre: "Mesa Principal",
        fecha: "2026-10-12",
        lugar_nombre: "Alcaldía Local",
        estado: "EN_DELIBERACION",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
        const url = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
        if (url.includes("/submesas")) {
          return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.includes("/acta")) {
          return new Response(JSON.stringify({ acuerdos: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockMesa), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const mesa = await obtenerMesa("mesa-valida-01");
      expect(mesa.id).toBe("mesa-valida-01");
      expect(mesa.nombre).toBe("Mesa Principal");
      expect(mesa.estado).toBe("en_curso");
    });

    test("propaga el error cuando la mesa remota no existe sin invocar fallback", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: "Mesa no encontrada" }), {
          status: 404,
          statusText: "Not Found",
          headers: { "Content-Type": "application/json" },
        });
      });

      await expect(obtenerMesa("mesa-inexistente")).rejects.toThrow();
    });
  });

  describe("crearMesaRemota (FIX-MESAS-01)", () => {
    test("inyecta Bearer token de la sesión activa, formatea fecha y genera códigos con entropía", async () => {
      useSesionStore.setState({
        sesion: {
          modo: "institucional",
          desde: "2026-10-09T00:00:00Z",
          token: "jwt-test-token-cartagena",
          sesionId: "ses-123",
          usuario: {
            id: "usr-123",
            correo: "autoridad@cartagena.gov.co",
            codigo_rol: "autoridad_distrital",
            nombres: "Alcaldía",
            apellidos: "Mayor",
            nivel_identidad: "verificada",
            permisos: ["mesas:abrir"],
            activo: true,
            correo_verificado_en: null,
          },
        },
      });

      let capturedUrl = "";
      let capturedMethod = "";
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: Record<string, unknown> = {};

      const mockResponse: MesaBackendResponse = {
        id: "01999999-aaaa-bbbb-cccc-111122223333",
        nombre: "Mesa Comunitaria Pozón",
        fecha: "2026-10-25",
        lugar_nombre: "Coliseo El Pozón",
        estado: "PROGRAMADA",
        codigo_oficial: "MT-TEST-001",
        shortcode_ciudadano: "M9999",
        tipo_mesa: "TERRITORIAL",
        metadatos: { entidad: "Secretaría del Interior" },
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
        capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
        capturedMethod = init?.method || "GET";
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            capturedHeaders = Object.fromEntries(init.headers.entries());
          } else if (Array.isArray(init.headers)) {
            capturedHeaders = Object.fromEntries(init.headers);
          } else {
            capturedHeaders = init.headers as Record<string, string>;
          }
        }
        if (init?.body && typeof init.body === "string") {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      });

      const resultado = await crearMesaRemota({
        nombre: "Mesa Comunitaria Pozón",
        entidad: "Secretaría del Interior",
        fecha: "2026-10-25",
        lugar: "Coliseo El Pozón",
        facilitador: "Dr. Roberto Casas",
        totalAsistentes: 45,
      });

      expect(capturedUrl).toContain("/mesas");
      expect(capturedMethod).toBe("POST");
      expect(capturedHeaders["Authorization"] || capturedHeaders["authorization"]).toBe("Bearer jwt-test-token-cartagena");
      expect(capturedBody.nombre).toBe("Mesa Comunitaria Pozón");
      expect(capturedBody.fecha).toBe("2026-10-25");
      expect(capturedBody.codigo_oficial).toMatch(/^MT-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(capturedBody.shortcode_ciudadano).toMatch(/^M[A-Z0-9]+$/);
      expect(resultado.id).toBe("01999999-aaaa-bbbb-cccc-111122223333");
      expect(resultado.nombre).toBe("Mesa Comunitaria Pozón");
    });

    test("envía fecha como null cuando viene vacía para cumplir contrato Pydantic de FastAPI", async () => {
      let capturedBody: Record<string, unknown> = {};

      vi.spyOn(globalThis, "fetch").mockImplementation(async (_info, init) => {
        if (init?.body && typeof init.body === "string") {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify({ id: "uuid-test", nombre: "Sin Fecha", fecha: null }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      });

      await crearMesaRemota({
        nombre: "Mesa Sin Fecha",
        entidad: "Secretaría",
        fecha: "",
        lugar: "Plaza de la Aduana",
        facilitador: "",
      });

      expect(capturedBody.fecha).toBeNull();
    });

    test("propaga errores HTTP (401, 403, 500) para captura honesta en la UI", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: "Permiso mesas:abrir denegado" }), {
          status: 403,
          statusText: "Forbidden",
          headers: { "Content-Type": "application/json" },
        });
      });

      await expect(
        crearMesaRemota({
          nombre: "Mesa No Autorizada",
          entidad: "Entidad",
          fecha: "2026-10-20",
          lugar: "Lugar",
          facilitador: "",
        })
      ).rejects.toThrow();
    });
  });
});
