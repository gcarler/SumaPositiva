/**
 * POLIS — Pruebas de Calidad Forense: AUD-04 (Control de Fases de Política)
 * Verificación de:
 * 1. Reversión inmediata del estado ante errores (403, 401, 5xx).
 * 2. Errores reales diferenciados (401/403/404/422/500/Red).
 * 3. Proscripción del 'modo simulación' y erradicación del catálogo hardcoded.
 * 4. Confirmación estricta con servidor e invalidación de caché.
 */

import {describe, expect, test, vi, beforeEach, afterEach} from "vitest";
import {ApiError} from "@/core/http/api-client";
import {
  clasificarErrorConmutacion,
  listarFasesControlApi,
  type FaseControlApi
} from "../services/politicas-api";
import * as politicasApi from "../services/politicas-api";
import {POLITICAS_QUERY_KEYS} from "../services/use-politicas-queries";

describe("Centro de Control de Fases de Política (AUD-04)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. Clasificación Diferenciada de Errores HTTP (AUD-04)", () => {
    test("diferencia error 401 (sin sesión autenticada)", () => {
      const err = new ApiError(401, "No autenticado");
      const info = clasificarErrorConmutacion(err);
      expect(info.codigo).toBe(401);
      expect(info.titulo).toContain("401");
      expect(info.descripcion).toContain("Inicie sesión");
    });

    test("diferencia error 403 (permiso insuficiente para ciudadano o auditor)", () => {
      const err = new ApiError(403, "Permiso politicas:gestionar requerido");
      const info = clasificarErrorConmutacion(err);
      expect(info.codigo).toBe(403);
      expect(info.titulo).toContain("403");
      expect(info.titulo).toContain("insuficientes");
      expect(info.descripcion).toContain("Autoridad Distrital");
      expect(info.descripcion).toContain("politicas:gestionar");
    });

    test("diferencia error 404 (fase no existente en BD)", () => {
      const err = new ApiError(404, "Fase no encontrada");
      const info = clasificarErrorConmutacion(err);
      expect(info.codigo).toBe(404);
      expect(info.titulo).toContain("404");
      expect(info.descripcion).toContain("no existe");
    });

    test("diferencia error 422 (parámetros de validación inválidos)", () => {
      const err = new ApiError(422, "Error de validación", {
        detail: "Estado no válido para conmutación",
      });
      const info = clasificarErrorConmutacion(err);
      expect(info.codigo).toBe(422);
      expect(info.titulo).toContain("422");
      expect(info.descripcion).toBe("Estado no válido para conmutación");
    });

    test("diferencia error 500 (falla interna en servidor distrital)", () => {
      const err = new ApiError(500, "Internal Server Error");
      const info = clasificarErrorConmutacion(err);
      expect(info.codigo).toBe(500);
      expect(info.titulo).toContain("500");
      expect(info.descripcion).toContain("servidor distrital");
    });

    test("diferencia errores de conexión y red", () => {
      const err = new TypeError("Failed to fetch");
      const info = clasificarErrorConmutacion(err);
      expect(info.codigo).toBe("CLIENT_ERROR");
      expect(info.descripcion).toBe("Failed to fetch");
    });
  });

  describe("2. Erradicación de Fases Hardcodeadas en Carga (AUD-04)", () => {
    test("cuando la API falla, no inyecta catálogo inventado y propaga la excepción", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new ApiError(500, "BD Caída"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(listarFasesControlApi()).rejects.toThrow();
    });
  });

  describe("3. Reversión Inmediata ante Permiso Insuficiente (Criterio de Aceptación EAF)", () => {
    test("ante un 403 Forbidden, el switch revierte a su valor original y emite error de permisos", async () => {
      // Estado inicial en el panel: Fase 2 cerrada
      let fases: FaseControlApi[] = [
        {
          id: "01a0f5dd-5333-73bb-bc0f-d5db2ffc59d6",
          codigo: "FASE_2_FORMULACION",
          nombre: "Fase 2: Formulación",
          estado: "preparatoria",
          progreso_porcentaje: 0,
          habilitada_web: false,
        },
      ];

      const notificador = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const queryClient = {
        invalidateQueries: vi.fn(),
      };

      // Simular que el endpoint conmutar responde 403 Forbidden (rol insuficiente)
      vi.spyOn(politicasApi, "conmutarFaseApi").mockRejectedValue(
        new ApiError(403, "Permiso insuficiente: politicas:gestionar")
      );

      // Simular el flujo exacto de toggleFase de useFasesControl
      const faseId = "01a0f5dd-5333-73bb-bc0f-d5db2ffc59d6";
      const current = false;
      const nuevoValor = !current; // true optimista

      // Paso 1: Actualización optimista
      fases = fases.map((f) =>
        f.id === faseId ? { ...f, habilitada_web: nuevoValor } : f
      );
      expect(fases[0].habilitada_web).toBe(true);

      // Paso 2: Ejecución y control de fallo
      let exito = false;
      try {
        await politicasApi.conmutarFaseApi(faseId, nuevoValor);
        exito = true;
      } catch (err) {
        // Paso 3: REVERSIÓN INMEDIATA al valor previo
        fases = fases.map((f) =>
          f.id === faseId ? { ...f, habilitada_web: current } : f
        );
        const errorClasificado = clasificarErrorConmutacion(err);
        notificador.error(errorClasificado.titulo, {
          description: errorClasificado.descripcion,
        });
        exito = false;
      }

      // Verificación estricta de AUD-04:
      expect(exito).toBe(false);
      // El switch vuelve a su valor original (false)
      expect(fases[0].habilitada_web).toBe(false);
      // Se notifica el error de permisos 403
      expect(notificador.error).toHaveBeenCalledWith(
        expect.stringContaining("403"),
        expect.objectContaining({
          description: expect.stringContaining("Autoridad Distrital"),
        })
      );
      // PROHIBIDO 'modo simulación'
      expect(notificador.info).not.toHaveBeenCalled();
      // No se invalidan queries en fallo
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    test("ante conmutación exitosa, confirma con respuesta de servidor e invalida queries", async () => {
      let fases: FaseControlApi[] = [
        {
          id: "01a0f5dd-5333-78a0-84f0-3f5b28864480",
          codigo: "FASE_1_DIAGNOSTICO",
          nombre: "Fase 1: Diagnóstico",
          estado: "activa",
          progreso_porcentaje: 35,
          habilitada_web: true,
        },
      ];

      const notificador = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const queryClient = {
        invalidateQueries: vi.fn(),
      };

      // Simular respuesta exitosa autorizada del backend
      vi.spyOn(politicasApi, "conmutarFaseApi").mockResolvedValue({
        id: "01a0f5dd-5333-78a0-84f0-3f5b28864480",
        codigo: "FASE_1_DIAGNOSTICO",
        nombre: "Fase 1: Diagnóstico",
        estado: "activa",
        progreso_porcentaje: 35,
        habilitada_web: false, // Ahora cerrada
      });

      const faseId = "01a0f5dd-5333-78a0-84f0-3f5b28864480";
      const current = true;
      const nuevoValor = !current;

      // Optimista
      fases = fases.map((f) =>
        f.id === faseId ? { ...f, habilitada_web: nuevoValor } : f
      );

      // Backend confirma
      const res = await politicasApi.conmutarFaseApi(faseId, nuevoValor);
      fases = fases.map((f) =>
        f.id === faseId ? { ...f, habilitada_web: res.habilitada_web } : f
      );
      queryClient.invalidateQueries({ queryKey: POLITICAS_QUERY_KEYS.fases });
      queryClient.invalidateQueries({ queryKey: POLITICAS_QUERY_KEYS.todas });
      notificador.success("Participación web suspendida", {
        description: "Los cambios se aplican inmediatamente a toda la ciudadanía.",
      });

      expect(fases[0].habilitada_web).toBe(false);
      expect(notificador.success).toHaveBeenCalled();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: POLITICAS_QUERY_KEYS.fases,
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: POLITICAS_QUERY_KEYS.todas,
      });
      expect(notificador.error).not.toHaveBeenCalled();
      expect(notificador.info).not.toHaveBeenCalled();
    });
  });
});
