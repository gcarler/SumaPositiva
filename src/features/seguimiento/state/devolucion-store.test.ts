import { describe, test, expect, beforeEach, vi } from "vitest";
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

  describe("AUD-03: Integración de Aportes Reales y Registro de Devolución Motivada", () => {
    test("mapea y clasifica propuestas con estado SIN_RESPUESTA", () => {
      const { propuestas, totalAportes, totalRespondidos, totalPendientes } = useDevolucionStore.getState();
      expect(totalAportes).toBeGreaterThanOrEqual(8);
      expect(totalRespondidos + totalPendientes).toBe(totalAportes);
    });

    test("filtra por estado SIN_RESPUESTA correctamente", () => {
      const propuestasConSinRespuesta = [
        ...PROPUESTAS_DEVOLUCION_CARTAGENA,
        {
          id: "prop-pendiente-01",
          codigo: "PROP-PEND-01",
          titulo: "Propuesta sin respuesta aún",
          descripcion: "Descripción de propuesta pendiente",
          autor_nombre: "Ciudadano",
          territorio: "El Pozón",
          canal_origen: "web" as const,
          fecha_radicacion: "2026-03-30",
          estado_incorporacion: "SIN_RESPUESTA" as const,
        },
      ];

      const filtradas = filtrarPropuestas(propuestasConSinRespuesta, {
        busqueda: "",
        territorio: "todos",
        estado: "SIN_RESPUESTA",
      });

      expect(filtradas).toHaveLength(1);
      expect(filtradas[0].codigo).toBe("PROP-PEND-01");
    });

    test("AUD-03: mutación exitosa pasa de SIN_RESPUESTA a NO_INCORPORADA_MOTIVADA y recalcula KPIs", async () => {
      useDevolucionStore.setState({
        propuestas: [
          {
            id: "prop-test-01",
            codigo: "PROP-TEST-01",
            titulo: "Iniciativa de prueba",
            descripcion: "Descripción de prueba para devolución",
            autor_nombre: "Ciudadano",
            territorio: "La Boquilla",
            canal_origen: "web",
            fecha_radicacion: "2026-04-01",
            estado_incorporacion: "SIN_RESPUESTA",
          },
        ],
        totalAportes: 1,
        totalRespondidos: 0,
        totalPendientes: 1,
        tasaRespuestaMotivada: 0,
      });

      const store = useDevolucionStore.getState();
      const spyApi = vi.spyOn(
        await import("../services/devolucion-api"),
        "registrarDevolucionMotivadaApi"
      ).mockResolvedValueOnce({
        id: "reg-audit-01",
        tabla_afectada: "participacion_ciudadana.propuestas_ciudadanas",
        registro_id: "prop-test-01",
        accion: "DEVOLUCION_MOTIVADA",
        causal: "tecnica",
        justificacion_motivada: "Justificación motivada sustancial con más de 20 caracteres para prueba.",
        metadatos: {},
        creado_en: new Date().toISOString(),
      });

      const res = await store.registrarDevolucionMotivada("prop-test-01", {
        causal: "tecnica",
        justificacion_motivada: "Justificación motivada sustancial con más de 20 caracteres para prueba.",
      });

      expect(res.exito).toBe(true);
      const state = useDevolucionStore.getState();
      const propActualizada = state.getById("prop-test-01");
      expect(propActualizada?.estado_incorporacion).toBe("NO_INCORPORADA_MOTIVADA");
      expect(propActualizada?.causal_descarte).toBe("tecnica");
      expect(state.totalRespondidos).toBe(1);
      expect(state.totalPendientes).toBe(0);
      expect(state.tasaRespuestaMotivada).toBe(100);

      spyApi.mockRestore();
    });

    test("AUD-03: si la API falla al registrar devolución, NO muta el store, registra error y retorna false (anti-silent-fallback)", async () => {
      useDevolucionStore.setState({
        propuestas: [
          {
            id: "prop-test-fallo",
            codigo: "PROP-FALLO-01",
            titulo: "Iniciativa que fallará",
            descripcion: "Descripción para verificar no mutación",
            autor_nombre: "Ciudadano",
            territorio: "El Pozón",
            canal_origen: "web",
            fecha_radicacion: "2026-04-01",
            estado_incorporacion: "SIN_RESPUESTA",
          },
        ],
        totalAportes: 1,
        totalRespondidos: 0,
        totalPendientes: 1,
        tasaRespuestaMotivada: 0,
        error: null,
      });

      const store = useDevolucionStore.getState();
      const spyApi = vi.spyOn(
        await import("../services/devolucion-api"),
        "registrarDevolucionMotivadaApi"
      ).mockRejectedValueOnce(new Error("HTTP 403 Forbidden: Permiso insuficiente"));

      const res = await store.registrarDevolucionMotivada("prop-test-fallo", {
        causal: "juridica",
        justificacion_motivada: "Justificación motivada válida pero con rechazo de permisos en el servidor.",
      });

      expect(res.exito).toBe(false);
      expect(res.error).toContain("403 Forbidden");

      const state = useDevolucionStore.getState();
      const propSinCambio = state.getById("prop-test-fallo");
      expect(propSinCambio?.estado_incorporacion).toBe("SIN_RESPUESTA");
      expect(state.totalRespondidos).toBe(0);
      expect(state.totalPendientes).toBe(1);
      expect(state.error).toContain("403 Forbidden");

      spyApi.mockRestore();
    });
  });
});
