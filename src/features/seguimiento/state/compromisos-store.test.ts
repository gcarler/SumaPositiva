import { describe, expect, test, beforeEach } from "vitest";
import {
  useCompromisosStore,
  calcularKpisSeguimiento,
  filtrarCompromisos,
} from "./compromisos-store";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

describe("Plan de Acción y Seguimiento (PAS) — Matriz de Compromisos (Hito PAS-1 / AUD-01)", () => {
  beforeEach(() => {
    useCompromisosStore.getState().restablecerCanonicos();
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

    test("computa KPIs de cumplimiento, alertas y presupuesto anual distrital", () => {
      const kpis = calcularKpisSeguimiento(COMPROMISOS_PAS_CANONICOS);

      expect(kpis.totalCompromisos).toBe(10);
      expect(kpis.compromisosEnEjecucionOCumplidos).toBe(7); // 6 en_ejecucion + 1 cumplido
      expect(kpis.compromisosEnRiesgoORetrasados).toBe(3); // 2 en_riesgo + 1 retrasado
      expect(kpis.promedioCumplimientoCuatrienal).toBe(61); // Promedio ponderado de avance
      expect(kpis.presupuestoTotalAnualCop).toBe(13400000000); // 1.2B + 1.8B + 2.0B + 1.5B + 3.0B + 0.4B + 0.95B + 1.1B + 0.85B + 0.6B = 13.4B
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
      const enRiesgo = filtrarCompromisos(COMPROMISOS_PAS_CANONICOS, {
        busqueda: "",
        entidad: "todas",
        linea: "todas",
        estado: "en_riesgo",
      });

      expect(enRiesgo.length).toBe(2); // PAS-AMB-05 y PAS-DES-08
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

  describe("Mutaciones del Store Zustand con Persistencia", () => {
    test("agrega un nuevo compromiso institucional con ID único", async () => {
      const nuevo = await useCompromisosStore.getState().agregarCompromiso({
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
        estado: "en_ejecucion",
        fecha_corte_ultimo_reporte: "2026-10-01",
      });

      expect(nuevo.id).toBeDefined();
      expect(useCompromisosStore.getState().compromisos.length).toBe(11);
      expect(useCompromisosStore.getState().getById(nuevo.id)).toBeDefined();
    });

    test("actualiza avance cuatrienal recalculando porcentaje de cumplimiento", async () => {
      const exito = await useCompromisosStore.getState().actualizarAvance("pas-001", {
        avance_cuatrienal_valor: 100,
        observacion_cualitativa: "Cobertura al 100% alcanzada en todas las zonas turísticas.",
      });

      expect(exito).toBe(true);
      const actualizado = useCompromisosStore.getState().getById("pas-001");
      expect(actualizado?.avance_cuatrienal_valor).toBe(100);
      expect(actualizado?.porcentaje_cumplimiento).toBe(100);
      expect(actualizado?.estado).toBe("cumplido");
      expect(actualizado?.metadatos?.observacion_cualitativa).toContain("Cobertura al 100%");
    });

    test("cambia el estado de un compromiso", async () => {
      const exito = await useCompromisosStore.getState().cambiarEstado("pas-005", "retrasado");
      expect(exito).toBe(true);
      expect(useCompromisosStore.getState().getById("pas-005")?.estado).toBe("retrasado");
    });

    test("elimina un compromiso del plan de acción", async () => {
      const exito = await useCompromisosStore.getState().eliminarCompromiso("pas-010");
      expect(exito).toBe(true);
      expect(useCompromisosStore.getState().compromisos.length).toBe(9);
      expect(useCompromisosStore.getState().getById("pas-010")).toBeUndefined();
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
