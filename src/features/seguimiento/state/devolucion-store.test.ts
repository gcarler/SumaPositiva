import { describe, test, expect, beforeEach } from "vitest";
import {
  useDevolucionStore,
  filtrarPropuestas,
} from "./devolucion-store";
import { PROPUESTAS_DEVOLUCION_CARTAGENA } from "../services/devolucion-api";

describe("Rendición de Cuentas y Devolución Motivada Ciudadana (Hito PAS-3)", () => {
  beforeEach(() => {
    useDevolucionStore.getState().restablecer();
  });

  describe("Proscripción Absoluta del Descarte Silencioso (Sentencia C-150 de 2015)", () => {
    test("carga exactamente las 8 propuestas comunitarias canónicas de Cartagena", () => {
      const { propuestas } = useDevolucionStore.getState();
      expect(propuestas).toHaveLength(8);

      const codigos = propuestas.map((p) => p.codigo);
      expect(codigos).toContain("PROP-POZON-01");
      expect(codigos).toContain("PROP-OLAYA-02");
      expect(codigos).toContain("PROP-MANDELA-04");
      expect(codigos).toContain("PROP-BARU-07");
    });

    test("garantiza que el 100% de las propuestas cuentan con estado explícito y razón vinculante", () => {
      const { propuestas } = useDevolucionStore.getState();

      for (const p of propuestas) {
        // Ninguna propuesta queda en estado indefinido o descartada sin razón
        expect(["INCORPORADA_TOTAL", "INCORPORADA_PARCIAL", "NO_INCORPORADA_MOTIVADA"]).toContain(
          p.estado_incorporacion
        );
        expect(p.motivacion_sustancial).toBeDefined();
        expect(p.motivacion_sustancial?.trim().length).toBeGreaterThan(20);

        if (p.estado_incorporacion === "NO_INCORPORADA_MOTIVADA") {
          expect(p.causal_descarte).toBeDefined();
          expect(p.norma_invocada).toBeDefined();
          expect(p.ruta_alternativa).toBeDefined();
        } else {
          expect(p.compromiso_pas_codigo).toBeDefined();
        }
      }
    });
  });

  describe("Consolidado Estadístico Multicanal de Cartagena", () => {
    test("computa métricas de participación y tasa de incorporación", () => {
      const { consolidado } = useDevolucionStore.getState();

      expect(consolidado.gran_total_participantes_distrital).toBe(968);
      expect(consolidado.total_canal_web).toBe(209);
      expect(consolidado.total_canal_mesas).toBe(189);
      expect(consolidado.total_canal_escenarios).toBe(570);
      expect(consolidado.total_propuestas).toBe(8);
      expect(consolidado.total_incorporadas).toBe(5);
      expect(consolidado.total_no_incorporadas).toBe(3);
      expect(consolidado.tasa_incorporacion_efectiva).toBeGreaterThanOrEqual(60);
    });
  });

  describe("Filtrado Multicriterio", () => {
    test("filtra por territorio", () => {
      const propuestas = PROPUESTAS_DEVOLUCION_CARTAGENA;

      const pozon = filtrarPropuestas(propuestas, {
        busqueda: "",
        territorio: "El Pozón",
        estado: "todos",
      });
      expect(pozon).toHaveLength(1);
      expect(pozon[0].codigo).toBe("PROP-POZON-01");

      const olaya = filtrarPropuestas(propuestas, {
        busqueda: "",
        territorio: "Olaya Herrera",
        estado: "todos",
      });
      expect(olaya).toHaveLength(1);
      expect(olaya[0].codigo).toBe("PROP-OLAYA-02");
    });

    test("filtra por estado de incorporación", () => {
      const propuestas = PROPUESTAS_DEVOLUCION_CARTAGENA;

      const noIncorporadas = filtrarPropuestas(propuestas, {
        busqueda: "",
        territorio: "todos",
        estado: "NO_INCORPORADA_MOTIVADA",
      });
      expect(noIncorporadas).toHaveLength(3);

      const incorporadasTotal = filtrarPropuestas(propuestas, {
        busqueda: "",
        territorio: "todos",
        estado: "INCORPORADA_TOTAL",
      });
      expect(incorporadasTotal).toHaveLength(4);
    });

    test("busca por texto en código, título, autor y motivación", () => {
      const propuestas = PROPUESTAS_DEVOLUCION_CARTAGENA;

      const busquedaLoot = filtrarPropuestas(propuestas, {
        busqueda: "megacárcel",
        territorio: "todos",
        estado: "todos",
      });
      expect(busquedaLoot).toHaveLength(1);
      expect(busquedaLoot[0].codigo).toBe("PROP-MANDELA-04");

      const busquedaConsulta = filtrarPropuestas(propuestas, {
        busqueda: "consulta previa",
        territorio: "todos",
        estado: "todos",
      });
      expect(busquedaConsulta).toHaveLength(1);
      expect(busquedaConsulta[0].codigo).toBe("PROP-BARU-07");
    });
  });

  describe("Evaluación con Agente IA C-150", () => {
    test("ejecuta dictamen de devolución con IA garantizando cumplimiento C-150", async () => {
      const store = useDevolucionStore.getState();

      const exito = await store.ejecutarEvaluacionIa();
      expect(exito).toBe(true);

      const state = useDevolucionStore.getState();
      expect(state.evaluandoIa).toBe(false);
      expect(state.resultadoIa).toBeDefined();
      expect(state.resultadoIa).toContain("C-150");
    });
  });
});
