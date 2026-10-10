import { describe, it, expect, vi, beforeEach } from "vitest";
import { ejecutarCicloPoliticaIA } from "./politicas-api";
import * as apiClient from "@/core/http/api-client";

describe("Orquestador Multi-Agente del Ciclo de Vida de Política (AUD-SYNC-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("despacha POST a /ia/ciclo-politica con payload estructurado y retorna veredicto del grafo", async () => {
    const respuestaMock = {
      politica_id: "test-uuid-001",
      titulo: "Seguridad Humana Cartagena",
      fase_final: "consolidacion_adopcion",
      ciclo_completado_exitosamente: true,
      iteraciones_totales: 1,
      diagnostico_aprobado: true,
      viabilidad_juridica_aprobada: true,
      consulta_previa_requerida: false,
      viabilidad_fiscal_aprobada: true,
      deliberacion_completada: true,
      devolucion_completada: true,
      adopcion_aprobada: true,
      acto_administrativo_sugerido: "Decreto Distrital",
      resultado_diagnostico: {
        resumen_ejecutivo: "Diagnóstico causal coherente",
        coherencia_causal_porcentaje: 98.0,
      },
      historial_estados: ["diagnostico", "consolidacion_adopcion"],
      bitacora_mensajes: ["Convergencia a END completada"],
      errores: [],
    };

    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValueOnce(respuestaMock);

    const resultado = await ejecutarCicloPoliticaIA({
      titulo: "Seguridad Humana Cartagena",
      descripcion: "Estrategia integral de seguridad humana y convivencia",
      problema_central: "Inseguridad y baja cohesión comunitaria",
      lineas_accion: ["Luminarias tácticas", "Frentes ciudadanos"],
    });

    expect(spy).toHaveBeenCalledWith(
      "/ia/ciclo-politica",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          titulo: "Seguridad Humana Cartagena",
          problema_central: "Inseguridad y baja cohesión comunitaria",
          sector: "seguridad_humana",
        }),
      })
    );
    expect(resultado.ciclo_completado_exitosamente).toBe(true);
    expect(resultado.fase_final).toBe("consolidacion_adopcion");
  });

  it("activa fallback determinista si la API no está disponible o rechaza sin sesión", async () => {
    vi.spyOn(apiClient, "apiFetch").mockRejectedValueOnce(new Error("Network Error"));

    const resultado = await ejecutarCicloPoliticaIA({
      titulo: "Política Contingencia",
      descripcion: "Prueba de contingencia determinista",
      problema_central: "Conflictividad social",
      es_territorio_etnico: true,
    });

    expect(resultado.ciclo_completado_exitosamente).toBe(true);
    expect(resultado.consulta_previa_requerida).toBe(true);
    expect(resultado.historial_estados).toContain("consolidacion_adopcion");
    expect(resultado.resultado_juridico?.es_viable_juridicamente).toBe(true);
  });
});
