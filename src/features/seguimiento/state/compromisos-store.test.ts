import { describe, expect, test, beforeEach, vi } from "vitest";
import {
  useCompromisosStore,
  calcularKpisSeguimiento,
  filtrarCompromisos,
} from "./compromisos-store";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";
import type { EstadoCompromiso } from "../models/compromiso";
import * as compromisosApi from "../services/compromisos-api";

describe("Plan de Acción y Seguimiento (PAS) — Matriz de Compromisos (Hito PAS-1 / AUD-01)", () => {
  beforeEach(() => {
    useCompromisosStore.getState().restablecerCanonicos();
    vi.restoreAllMocks();
  });

  describe("Catálogo Canónico y KPIs Cuatrienales", () => {
    test("carga exactamente los 10 compromisos institucionales estructurados para Cartagena", () => {
      const state = useCompromisosStore.getState();
      expect(state.compromisos.length).toBe(10);

      const codigos = state.compromisos.map((c) => c.codigo);
      expect(codigos).toContain("PAS-SEC-01");
      expect(codigos).toContain("PAS-JUV-02");
      expect(codigos).toContain("PAS-SEG-03");
      expect(codigos).toContain("PAS-ALUM-04");
      expect(codigos).toContain("PAS-AMB-05");
      expect(codigos).toContain("PAS-POL-06");
      expect(codigos).toContain("PAS-CUID-07");
      expect(codigos).toContain("PAS-DES-08");
      expect(codigos).toContain("PAS-BAZ-09");
      expect(codigos).toContain("PAS-ETN-10");
    });

    test("los compromisos canónicos llevan metadatos de propuesta no validada y sin atribución falsa al Decreto 037 (OBS-11)", () => {
      const state = useCompromisosStore.getState();
      for (const comp of state.compromisos) {
        expect(comp.metadatos?.fuente).toContain("Catálogo propuesto por el equipo");
        expect(comp.metadatos?.fuente).toContain("no proviene del Decreto 037");
        expect(comp.metadatos?.meta_validada).toBe(false);
      }
    });

    test("computa KPIs de cumplimiento, alertas y presupuesto anual distrital", () => {
      const kpis = calcularKpisSeguimiento(COMPROMISOS_PAS_CANONICOS);

      expect(kpis.totalCompromisos).toBe(10);
      expect(kpis.compromisosConReporte).toBe(0);
      expect(kpis.compromisosSinReporte).toBe(10);
      expect(kpis.compromisosEnEjecucionOCumplidos).toBe(0);
      expect(kpis.compromisosEnRiesgoORetrasados).toBe(0);
      expect(kpis.promedioCumplimientoCuatrienal).toBeNull();
      expect(kpis.presupuestoTotalAnualCop).toBe(0);
    });

    test("computa promedio y conteos correctamente cuando existen compromisos con reporte real", () => {
      const conReportes = [
        ...COMPROMISOS_PAS_CANONICOS.slice(0, 2).map((c, i) => ({
          ...c,
          avance_cuatrienal_valor: (i + 1) * 50,
          porcentaje_cumplimiento: i === 0 ? 50 : 80,
          presupuesto_anual_cop: 1000000000,
          estado: (i === 0 ? "en_ejecucion" : "cumplido") as EstadoCompromiso,
        })),
        ...COMPROMISOS_PAS_CANONICOS.slice(2),
      ];

      const kpis = calcularKpisSeguimiento(conReportes);
      expect(kpis.totalCompromisos).toBe(10);
      expect(kpis.compromisosConReporte).toBe(2);
      expect(kpis.compromisosSinReporte).toBe(8);
      expect(kpis.compromisosEnEjecucionOCumplidos).toBe(2);
      expect(kpis.promedioCumplimientoCuatrienal).toBe(65); // (50 + 80) / 2
      expect(kpis.presupuestoTotalAnualCop).toBe(2000000000);
    });

    test("carga compromisos reactivamente desde el servicio de backend", async () => {
      await useCompromisosStore.getState().cargarCompromisos();
      const state = useCompromisosStore.getState();
      expect(state.compromisos.length).toBeGreaterThanOrEqual(10);
      expect(state.cargando).toBe(false);
    });
  });

  describe("Filtrado Multicriterio", () => {
    test("filtra por Entidad Responsable", () => {
      const filtrados = filtrarCompromisos(COMPROMISOS_PAS_CANONICOS, {
        busqueda: "",
        entidad: "Distriseguridad",
        linea: "todas",
        estado: "todos",
      });

      expect(filtrados.length).toBe(2);
      expect(filtrados.every((c) => c.entidad_responsable === "Distriseguridad")).toBe(true);
    });

    test("filtra por Línea Estratégica", () => {
      const filtrados = filtrarCompromisos(COMPROMISOS_PAS_CANONICOS, {
        busqueda: "",
        entidad: "todas",
        linea: "LE-01",
        estado: "todos",
      });

      expect(filtrados.length).toBe(4); // PAS-SEC-01, PAS-SEG-03, PAS-ALUM-04, PAS-POL-06
    });

    test("filtra por Estado de Cumplimiento", () => {
      const sinReporte = filtrarCompromisos(COMPROMISOS_PAS_CANONICOS, {
        busqueda: "",
        entidad: "todas",
        linea: "todas",
        estado: "sin_reporte",
      });

      expect(sinReporte.length).toBe(10);
    });

    test("busca por texto en código, nombre, entidad y descripción de meta", () => {
      const busquedaLpr = filtrarCompromisos(COMPROMISOS_PAS_CANONICOS, {
        busqueda: "LPR",
        entidad: "todas",
        linea: "todas",
        estado: "todos",
      });
      expect(busquedaLpr.length).toBe(1);
      expect(busquedaLpr[0].codigo).toBe("PAS-SEG-03");

      const busquedaBazurto = filtrarCompromisos(COMPROMISOS_PAS_CANONICOS, {
        busqueda: "Bazurto",
        entidad: "todas",
        linea: "todas",
        estado: "todos",
      });
      expect(busquedaBazurto.length).toBe(1);
      expect(busquedaBazurto[0].codigo).toBe("PAS-BAZ-09");
    });
  });

  describe("Control de Fallos y No Mutación Silenciosa (OBS-01)", () => {
    test("si PATCH /avance falla en backend, no altera el store, registra error y devuelve false", async () => {
      const spy = vi
        .spyOn(compromisosApi, "actualizarAvanceCompromisoApi")
        .mockRejectedValueOnce(new Error("403 Forbidden: No autorizado para gestionar compromisos"));

      const original = useCompromisosStore.getState().getById("pas-001");
      const avanceOriginal = original?.avance_cuatrienal_valor;
      const estadoOriginal = original?.estado;

      const exito = await useCompromisosStore.getState().actualizarAvance("pas-001", {
        avance_cuatrienal_valor: 999,
        estado: "cumplido",
      });

      expect(exito).toBe(false);
      expect(useCompromisosStore.getState().error).toContain("403 Forbidden");

      // Verificar que el estado del store NO mutó
      const noMutado = useCompromisosStore.getState().getById("pas-001");
      expect(noMutado?.avance_cuatrienal_valor).toBe(avanceOriginal);
      expect(noMutado?.estado).toBe(estadoOriginal);

      spy.mockRestore();
    });

    test("si POST /compromisos falla en backend, no agrega elemento, registra error y devuelve null", async () => {
      const spy = vi
        .spyOn(compromisosApi, "crearCompromisoApi")
        .mockRejectedValueOnce(new Error("500 Internal Server Error"));

      const longitudInicial = useCompromisosStore.getState().compromisos.length;

      const resultado = await useCompromisosStore.getState().agregarCompromiso({
        codigo: "PAS-FAIL-01",
        nombre: "Compromiso Fallido",
        descripcion: "No debe crearse",
        entidad_responsable: "Distriseguridad",
        linea_estrategica_codigo: "LE-01",
        alternativa_mga_codigo: "ALT-SEG-06",
        indicador_asociado_codigo: "IND-PROD-01",
        meta_cuatrienal_descripcion: "Meta",
        meta_cuatrienal_valor: 10,
        unidad_medida: "U",
        avance_cuatrienal_valor: 0,
        porcentaje_cumplimiento: 0,
        presupuesto_anual_cop: 0,
        vigencias_programadas: [2026],
        estado: "programado",
        fecha_corte_ultimo_reporte: "2026-10-01",
      });

      expect(resultado).toBeNull();
      expect(useCompromisosStore.getState().error).toContain("500 Internal Server Error");
      expect(useCompromisosStore.getState().compromisos.length).toBe(longitudInicial);

      spy.mockRestore();
    });

    test("si DELETE /compromisos falla en backend, no elimina el elemento y devuelve false", async () => {
      const spy = vi
        .spyOn(compromisosApi, "eliminarCompromisoApi")
        .mockRejectedValueOnce(new Error("403 Forbidden"));

      const exito = await useCompromisosStore.getState().eliminarCompromiso("pas-001");

      expect(exito).toBe(false);
      expect(useCompromisosStore.getState().error).toContain("403 Forbidden");
      expect(useCompromisosStore.getState().getById("pas-001")).toBeDefined();

      spy.mockRestore();
    });
  });

  describe("Mutaciones Exitosas del Store", () => {
    test("agrega un nuevo compromiso cuando el backend responde satisfactoriamente", async () => {
      const fakeCompromiso = {
        id: "pas-uuid-12345",
        codigo: "PAS-TEST-99",
        nombre: "Compromiso de Prueba",
        descripcion: "Descripción de prueba",
        entidad_responsable: "IDER",
        linea_estrategica_codigo: "LE-02",
        alternativa_mga_codigo: "ALT-CONV-02",
        indicador_asociado_codigo: "IND-PROD-99",
        meta_cuatrienal_descripcion: "Realizar 10 eventos",
        meta_cuatrienal_valor: 10,
        unidad_medida: "Eventos",
        avance_cuatrienal_valor: 2,
        porcentaje_cumplimiento: 20,
        presupuesto_anual_cop: 250000000,
        vigencias_programadas: [2026],
        estado: "en_ejecucion" as const,
        fecha_corte_ultimo_reporte: "2026-10-01",
      };

      const spy = vi
        .spyOn(compromisosApi, "crearCompromisoApi")
        .mockResolvedValueOnce(fakeCompromiso);

      const nuevo = await useCompromisosStore.getState().agregarCompromiso(fakeCompromiso);

      expect(nuevo).not.toBeNull();
      expect(nuevo?.id).toBe("pas-uuid-12345");
      expect(useCompromisosStore.getState().compromisos.length).toBe(11);
      expect(useCompromisosStore.getState().getById("pas-uuid-12345")).toBeDefined();

      spy.mockRestore();
    });

    test("actualiza avance cuatrienal cuando el backend responde satisfactoriamente", async () => {
      const original = useCompromisosStore.getState().getById("pas-001")!;
      const fakeActualizado = {
        ...original,
        avance_cuatrienal_valor: 100,
        porcentaje_cumplimiento: 100,
        estado: "cumplido" as const,
        metadatos: {
          ...original.metadatos,
          observacion_cualitativa: "Cobertura al 100% alcanzada en todas las zonas turísticas.",
        },
      };

      const spy = vi
        .spyOn(compromisosApi, "actualizarAvanceCompromisoApi")
        .mockResolvedValueOnce(fakeActualizado);

      const exito = await useCompromisosStore.getState().actualizarAvance("pas-001", {
        avance_cuatrienal_valor: 100,
        observacion_cualitativa: "Cobertura al 100% alcanzada en todas las zonas turísticas.",
      });

      expect(exito).toBe(true);
      const actualizado = useCompromisosStore.getState().getById("pas-001");
      expect(actualizado?.avance_cuatrienal_valor).toBe(100);
      expect(actualizado?.porcentaje_cumplimiento).toBe(100);
      expect(actualizado?.estado).toBe("cumplido");

      spy.mockRestore();
    });

    test("gestiona filtros y restablece valores iniciales", () => {
      useCompromisosStore.getState().setFiltros({
        busqueda: "ESCNNA",
        estado: "en_ejecucion",
      });

      expect(useCompromisosStore.getState().filtros.busqueda).toBe("ESCNNA");
      expect(useCompromisosStore.getState().filtros.estado).toBe("en_ejecucion");

      useCompromisosStore.getState().limpiarFiltros();
      expect(useCompromisosStore.getState().filtros.busqueda).toBe("");
      expect(useCompromisosStore.getState().filtros.estado).toBe("todos");
    });
  });
});
