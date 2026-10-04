import { describe, expect, test, vi } from "vitest";
import {
  normalizarFuente,
  normalizarAsignacion,
  calcularKpisPresupuesto,
  calcularResumenDesdeAsignaciones,
  listarFuentesFinanciacion,
  listarAsignacionesPresupuestales,
  crearAsignacionPresupuestal,
} from "./presupuesto-api";
import {
  FUENTES_FINANCIACION_FALLBACK,
  ASIGNACIONES_FALLBACK,
} from "../models/presupuesto";

describe("Costeo Presupuestal y Asignación de Fuentes MGA (Hito F-3)", () => {
  describe("Normalización de Modelos Presupuestales", () => {
    test("normaliza fuentes de financiación preservando tipado y metadatos", () => {
      const raw = {
        id: "test-fuente-1",
        codigo: "FONSET",
        nombre: "Fondo Territorial de Seguridad",
        tipo_fuente: "TRIBUTARIA_DESTINACION_ESPECIFICA",
        base_legal: "Ley 418 de 1997",
        activa: true,
        metadatos: { sector: "seguridad" },
      };

      const normalizada = normalizarFuente(raw);
      expect(normalizada.id).toBe("test-fuente-1");
      expect(normalizada.codigo).toBe("FONSET");
      expect(normalizada.nombre).toBe("Fondo Territorial de Seguridad");
      expect(normalizada.base_legal).toBe("Ley 418 de 1997");
      expect(normalizada.activa).toBe(true);
      expect(normalizada.metadatos?.sector).toBe("seguridad");
    });

    test("normaliza asignaciones presupuestales enlazando la fuente correspondiente", () => {
      const fuentesMap = new Map(
        FUENTES_FINANCIACION_FALLBACK.map((f) => [f.id, f])
      );
      const raw = {
        id: "asig-test-1",
        fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
        monto_estimado: "4500000000.00",
        anio_vigencia: 2027,
        es_vigencia_futura: true,
        tipo_vigencia_futura: "Excepcional",
        codigo_bpin: "BPIN-2026-CTG-9999",
        justificacion: "Intervención de seguridad turística",
        metadatos: { alternativa_codigo: "ALT-ESCNNA-01" },
      };

      const asig = normalizarAsignacion(raw, fuentesMap);
      expect(asig.id).toBe("asig-test-1");
      expect(asig.fuente_codigo).toBe("FONSET");
      expect(asig.monto_estimado).toBe(4500000000);
      expect(asig.anio_vigencia).toBe(2027);
      expect(asig.es_vigencia_futura).toBe(true);
      expect(asig.tipo_vigencia_futura).toBe("Excepcional");
      expect(asig.codigo_bpin).toBe("BPIN-2026-CTG-9999");
      expect(asig.metadatos?.alternativa_codigo).toBe("ALT-ESCNNA-01");
    });
  });

  describe("Cálculo de KPIs y Resumen Financiero", () => {
    test("calcula KPIs presupuestales distritales (FONSET, SGP/SGR y Vigencias Futuras)", () => {
      const kpis = calcularKpisPresupuesto(ASIGNACIONES_FALLBACK);

      expect(kpis.conteoAsignaciones).toBe(6);
      expect(kpis.totalAsignado).toBe(21400000000); // 2.5B + 3.2B + 6B + 1.8B + 2.9B + 5B = 21.4B
      expect(kpis.totalFonset).toBe(10700000000); // 2.5B + 3.2B + 5.0B = 10.7B
      expect(kpis.totalSgpSgr).toBe(10700000000); // 6.0B (SGR) + 1.8B (SGP) + 2.9B (SGR) = 10.7B
      expect(kpis.totalVigenciasFuturas).toBe(8900000000); // 6.0B (SGR 2027) + 2.9B (SGR 2027) = 8.9B
    });

    test("genera distribución plurianual y por fuente en resumen de costeo", () => {
      const resumen = calcularResumenDesdeAsignaciones(ASIGNACIONES_FALLBACK);

      expect(Number(resumen.total_asignado)).toBe(21400000000);
      expect(resumen.por_fuente.length).toBeGreaterThanOrEqual(3);
      expect(resumen.por_vigencia.length).toBe(2);

      const vig2026 = resumen.por_vigencia.find((v) => v.vigencia === 2026);
      const vig2027 = resumen.por_vigencia.find((v) => v.vigencia === 2027);

      expect(vig2026?.total).toBe(12500000000); // 2.5 + 3.2 + 1.8 + 5.0 = 12.5B
      expect(vig2027?.total).toBe(8900000000); // 6.0 + 2.9 = 8.9B
    });
  });

  describe("Servicio y Métodos Asíncronos", () => {
    test("listarFuentesFinanciacion retorna las 5 fuentes oficiales o fallback", async () => {
      const fuentes = await listarFuentesFinanciacion();
      expect(Array.isArray(fuentes)).toBe(true);
      expect(fuentes.length).toBeGreaterThanOrEqual(5);

      const fonset = fuentes.find((f) => f.codigo === "FONSET");
      expect(fonset).toBeDefined();
      expect(fonset?.base_legal).toContain("Ley 418 de 1997");
    });

    test("listarAsignacionesPresupuestales retorna asignaciones enlazadas", async () => {
      const asignaciones = await listarAsignacionesPresupuestales();
      expect(Array.isArray(asignaciones)).toBe(true);
      expect(asignaciones.length).toBeGreaterThan(0);
    });

    test("crearAsignacionPresupuestal genera registro válido y consistente", async () => {
      const nueva = await crearAsignacionPresupuestal({
        fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
        monto_estimado: 750000000,
        anio_vigencia: 2026,
        es_vigencia_futura: false,
        codigo_bpin: "BPIN-2026-CTG-TEST",
        justificacion: "Prueba unitaria de asignación",
        metadatos: { test: true },
      });

      expect(nueva.id).toBeDefined();
      expect(nueva.monto_estimado).toBe(750000000);
      expect(nueva.codigo_bpin).toBe("BPIN-2026-CTG-TEST");
      expect(nueva.es_vigencia_futura).toBe(false);
    });

    test("listarFuentesFinanciacion consume exitosamente la API real cuando el backend responde 200", async () => {
      const mockFuentes = [
        {
          id: "f-01",
          codigo: "FONSET",
          nombre: "Fondo Territorial de Seguridad",
          sigla: "FONSET",
          tipo: "fondo_especial",
          base_legal: "Ley 418 de 1997",
          es_especifica_seguridad: true,
          activa: true,
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockFuentes), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const resultado = await listarFuentesFinanciacion();
      expect(fetchSpy).toHaveBeenCalled();
      expect(resultado.length).toBe(1);
      expect(resultado[0].codigo).toBe("FONSET");
      fetchSpy.mockRestore();
    });

    test("crearAsignacionPresupuestal persiste vía POST cuando el backend responde 201", async () => {
      const mockRespuesta = {
        id: "asig-123",
        fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
        monto_estimado: 500000000,
        anio_vigencia: 2026,
        es_vigencia_futura: false,
        codigo_bpin: "BPIN-2026-REAL",
        justificacion: "Asignación real confirmada",
        metadatos: {},
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockRespuesta), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const creada = await crearAsignacionPresupuestal({
        fuente_financiacion_id: "01a0f7ce-31fe-791b-8076-412a21d6544f",
        monto_estimado: 500000000,
        anio_vigencia: 2026,
        es_vigencia_futura: false,
        codigo_bpin: "BPIN-2026-REAL",
        justificacion: "Asignación real confirmada",
      });

      expect(fetchSpy).toHaveBeenCalled();
      expect(creada.id).toBe("asig-123");
      expect(creada.codigo_bpin).toBe("BPIN-2026-REAL");
      fetchSpy.mockRestore();
    });
  });
});
