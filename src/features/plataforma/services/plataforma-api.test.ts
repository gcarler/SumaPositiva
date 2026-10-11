import { describe, it, expect, vi, beforeEach } from "vitest";
import { plataformaApi } from "./plataforma-api";
import * as apiClient from "@/core/http/api-client";

describe("Telemetría Forense SQL - plataformaApi (OPS-FORENSIC-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("consulta GET /health/database/queries con parámetros por defecto", async () => {
    const mockRespuesta = {
      status: "ok",
      timestamp: "2026-10-11T22:45:00Z",
      total_queries_recorded: 2350,
      cache_hit_ratio_pct: 99.85,
      top_queries: [
        {
          query: "SELECT count(*) FROM mesas_trabajo.mesas",
          calls: 1540,
          total_ms: 120.5,
          mean_ms: 0.08,
          rows: 1540,
          hit_ratio_pct: 99.9,
        },
      ],
    };

    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockRespuesta);

    const resultado = await plataformaApi.telemetriaSql();

    expect(spy).toHaveBeenCalledWith(
      "/health/database/queries?limite=10&ordenar_por=tiempo_total"
    );
    expect(resultado.status).toBe("ok");
    expect(resultado.total_queries_recorded).toBe(2350);
    expect(resultado.cache_hit_ratio_pct).toBe(99.85);
    expect(resultado.top_queries).toHaveLength(1);
    expect(resultado.top_queries[0].query).toBe(
      "SELECT count(*) FROM mesas_trabajo.mesas"
    );
    expect(resultado.top_queries[0].calls).toBe(1540);
  });

  it("permite especificar límite y criterio de ordenación personalizado", async () => {
    const mockRespuesta = {
      status: "ok",
      timestamp: "2026-10-11T22:45:00Z",
      total_queries_recorded: 1800,
      cache_hit_ratio_pct: 99.4,
      top_queries: [],
    };

    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(mockRespuesta);

    const resultado = await plataformaApi.telemetriaSql(5, "llamadas");

    expect(spy).toHaveBeenCalledWith(
      "/health/database/queries?limite=5&ordenar_por=llamadas"
    );
    expect(resultado.top_queries).toEqual([]);
  });

  it("valida y rechaza respuestas que no cumplan el contrato Zod", async () => {
    vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce({
      status: "estado_invalido",
      total_queries_recorded: "no_es_numero",
    });

    await expect(plataformaApi.telemetriaSql()).rejects.toThrow();
  });
});
