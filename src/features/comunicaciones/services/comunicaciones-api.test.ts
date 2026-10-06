import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  actualizarTareaComunicacion,
  crearTareaComunicacion,
  eliminarTareaComunicacion,
  listarTareasComunicacion,
  obtenerTareaComunicacion,
} from "./comunicaciones-api";
import type {
  TareaComunicacion,
  TareaComunicacionPayload,
} from "../models/tarea-comunicacion";

describe("Comunicaciones API Service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockTarea: TareaComunicacion = {
    id: "uuid-tc-01",
    codigo: "TC-01",
    etapa: "Etapa 1: Pre-Producción y Banco de Evidencias",
    territorio: "Sala de Redacción",
    titulo: "Alineación técnica",
    descripcion: "Guiones de entrevistas",
    entregables: "Guion oficial",
    fecha_inicio: "2026-10-06",
    fecha_fin: "2026-10-06",
    estado: "en_progreso",
    responsable: "Equipo de Comunicaciones",
    orden: 1,
    creado_en: "2026-10-06T04:00:00Z",
    actualizado_en: "2026-10-06T04:00:00Z",
  };

  test("listarTareasComunicacion consulta el endpoint y retorna colección", async () => {
    let capturedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
      capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
      return new Response(JSON.stringify([mockTarea]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const resultado = await listarTareasComunicacion({
      etapa: "Etapa 1: Pre-Producción y Banco de Evidencias",
    });

    expect(capturedUrl).toContain("/api/v1/comunicaciones/tareas");
    expect(capturedUrl).toContain("etapa=Etapa+1%3A+Pre-Producci%C3%B3n+y+Banco+de+Evidencias");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].codigo).toBe("TC-01");
  });

  test("obtenerTareaComunicacion consulta tarea por UUID", async () => {
    let capturedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
      capturedUrl = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
      return new Response(JSON.stringify(mockTarea), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const resultado = await obtenerTareaComunicacion("uuid-tc-01");
    expect(resultado.id).toBe("uuid-tc-01");
    expect(capturedUrl).toContain("/api/v1/comunicaciones/tareas/uuid-tc-01");
  });

  test("actualizarTareaComunicacion despacha PUT con payload y fechas modificadas", async () => {
    let capturedMethod = "";
    const actualizada: TareaComunicacion = {
      ...mockTarea,
      fecha_fin: "2026-10-07",
      estado: "completada",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_info, init) => {
      capturedMethod = init?.method ?? "GET";
      return new Response(JSON.stringify(actualizada), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const resultado = await actualizarTareaComunicacion("uuid-tc-01", {
      fecha_fin: "2026-10-07",
      estado: "completada",
    });

    expect(resultado.fecha_fin).toBe("2026-10-07");
    expect(resultado.estado).toBe("completada");
    expect(capturedMethod).toBe("PUT");
  });

  test("crearTareaComunicacion despacha POST con nueva tarea", async () => {
    let capturedMethod = "";
    const payload: TareaComunicacionPayload = {
      codigo: "TC-19",
      etapa: "Etapa 2: Gran Hito Inaugural",
      territorio: "Cartagena",
      titulo: "Transmisión en vivo streaming",
      descripcion: "Streaming por Facebook y YouTube",
      entregables: "Link de transmisión",
      fecha_inicio: "2026-10-15",
      fecha_fin: "2026-10-15",
      estado: "pendiente",
      responsable: "Ingeniero Audiovisual",
      orden: 19,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_info, init) => {
      capturedMethod = init?.method ?? "GET";
      return new Response(JSON.stringify({ ...payload, id: "uuid-tc-19" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const resultado = await crearTareaComunicacion(payload);
    expect(resultado.codigo).toBe("TC-19");
    expect(capturedMethod).toBe("POST");
  });

  test("eliminarTareaComunicacion despacha DELETE", async () => {
    let capturedMethod = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_info, init) => {
      capturedMethod = init?.method ?? "GET";
      return new Response(null, {
        status: 204,
      });
    });

    await expect(eliminarTareaComunicacion("uuid-tc-19")).resolves.toBeUndefined();
    expect(capturedMethod).toBe("DELETE");
  });
});
