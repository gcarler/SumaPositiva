import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  useDevolucionStore,
  filtrarPropuestas,
} from "./devolucion-store";
import {
  PROPUESTAS_DEVOLUCION_CARTAGENA,
  CONSOLIDADO_PARTICIPACION_VACIO,
  CONSOLIDADO_PARTICIPACION_DEMO_FIXTURE,
  mapearAporteAPropuesta,
  type AporteBackend,
} from "../services/devolucion-api";

describe("Rendición de Cuentas y Devolución Motivada Ciudadana (Hito PAS-3 / AUD-03)", () => {
  beforeEach(() => {
    useDevolucionStore.getState().restablecer();
  });

  describe("Fixture Canónico de Devolución (Storybook / Pruebas)", () => {
    test("contiene exactamente las 8 propuestas comunitarias estructuradas de Cartagena", () => {
      expect(PROPUESTAS_DEVOLUCION_CARTAGENA).toHaveLength(8);

      const codigos = PROPUESTAS_DEVOLUCION_CARTAGENA.map((p) => p.codigo);
      expect(codigos).toContain("PROP-POZON-01");
      expect(codigos).toContain("PROP-OLAYA-02");
      expect(codigos).toContain("PROP-MANDELA-04");
      expect(codigos).toContain("PROP-BARU-07");
    });

    test("garantiza que el 100% de las propuestas del fixture cuentan con estado explícito y razón vinculante", () => {
      for (const p of PROPUESTAS_DEVOLUCION_CARTAGENA) {
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

  describe("Consolidado Estadístico Multicanal de Cartagena (OBS-07)", () => {
    test("el fixture de demostración contiene las métricas del piloto", () => {
      expect(CONSOLIDADO_PARTICIPACION_DEMO_FIXTURE.gran_total_participantes_distrital).toBe(968);
      expect(CONSOLIDADO_PARTICIPACION_DEMO_FIXTURE.total_canal_web).toBe(209);
      expect(CONSOLIDADO_PARTICIPACION_DEMO_FIXTURE.total_canal_mesas).toBe(189);
      expect(CONSOLIDADO_PARTICIPACION_DEMO_FIXTURE.total_canal_escenarios).toBe(570);
    });

    test("OBS-07: CONSOLIDADO_PARTICIPACION_VACIO no contiene cifras codificadas ni desglose inventado", () => {
      expect(CONSOLIDADO_PARTICIPACION_VACIO.gran_total_participantes_distrital).toBe(0);
      expect(CONSOLIDADO_PARTICIPACION_VACIO.participantes_unicos_identificados).toBe(0);
      expect(CONSOLIDADO_PARTICIPACION_VACIO.total_canal_web).toBe(0);
      expect(CONSOLIDADO_PARTICIPACION_VACIO.total_canal_mesas).toBe(0);
      expect(CONSOLIDADO_PARTICIPACION_VACIO.total_canal_escenarios).toBe(0);
      expect(CONSOLIDADO_PARTICIPACION_VACIO.desglose_territorial_agregado).toEqual([]);
    });

    test("OBS-07: estado inicial y restablecer inician con consolidado vacío (0s), sin inyectar 968", () => {
      useDevolucionStore.getState().restablecer();
      const state = useDevolucionStore.getState();
      expect(state.consolidado.gran_total_participantes_distrital).toBe(0);
      expect(state.consolidado.total_canal_web).toBe(0);
      expect(state.consolidado.desglose_territorial_agregado).toHaveLength(0);
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

  describe("OBS-05: Proscripción Absoluta de Cifras Ficticias y Estado Inicial Vacío", () => {
    test("estado inicial del store es lista vacía, 0 aportes, tasa 0% y cargando=true (OBS-05)", () => {
      useDevolucionStore.getState().restablecer();
      const state = useDevolucionStore.getState();

      expect(state.propuestas).toHaveLength(0);
      expect(state.totalAportes).toBe(0);
      expect(state.totalRespondidos).toBe(0);
      expect(state.totalPendientes).toBe(0);
      expect(state.tasaRespuestaMotivada).toBe(0);
      expect(state.esContingencia).toBe(false);
      expect(state.error).toBeNull();
    });

    test("ante fallo de conexión en cargarDatos, establece lista vacía, tasa 0% y error explícito sin inyectar datos ficticios (OBS-05)", async () => {
      const spyApi = vi.spyOn(
        await import("../services/devolucion-api"),
        "listarAportesReales"
      ).mockResolvedValueOnce({
        propuestas: [],
        total: 0,
        respondidos: 0,
        pendientes: 0,
        tasaRespuesta: 0,
        esContingencia: true,
        origen: "contingencia",
      });

      const store = useDevolucionStore.getState();
      await store.cargarDatos();

      const state = useDevolucionStore.getState();
      expect(state.propuestas).toHaveLength(0);
      expect(state.totalAportes).toBe(0);
      expect(state.totalRespondidos).toBe(0);
      expect(state.totalPendientes).toBe(0);
      expect(state.tasaRespuestaMotivada).toBe(0);
      expect(state.esContingencia).toBe(true);
      expect(state.error).toContain("Sin conexión");
      expect(state.cargando).toBe(false);

      spyApi.mockRestore();
    });

    test("restablecer devuelve el store a lista vacía y 0 en todas las cifras (OBS-05)", () => {
      useDevolucionStore.setState({
        propuestas: PROPUESTAS_DEVOLUCION_CARTAGENA,
        totalAportes: 8,
        totalRespondidos: 5,
        totalPendientes: 3,
        tasaRespuestaMotivada: 62.5,
      });

      useDevolucionStore.getState().restablecer();

      const state = useDevolucionStore.getState();
      expect(state.propuestas).toHaveLength(0);
      expect(state.totalAportes).toBe(0);
      expect(state.totalRespondidos).toBe(0);
      expect(state.totalPendientes).toBe(0);
      expect(state.tasaRespuestaMotivada).toBe(0);
    });
  });

  describe("OBS-06: Prohibición de Asumir Causal Técnica si Falta en Metadatos", () => {
    test("mapearAporteAPropuesta asigna 'no_registrada' y no inventa 'tecnica' cuando un aporte rechazado carece de causal (OBS-06)", () => {
      const aporteRechazadoSinCausal: AporteBackend = {
        id: "01a0f7c7-73b0-73e5-a155-bbbadca96658",
        tipo_aporte: "propuesta",
        titulo: "Propuesta de Seguridad en Barú",
        descripcion: "Instalación de cámaras y patrullajes marítimos en corregimientos insulares.",
        autor_nombre: "Líder Comunitario",
        es_anonimo: false,
        estado: "rechazado",
        activo: true,
        apoyos_contador: 12,
        territorio_nombre: "Isla de Barú",
        metadatos: {}, // Sin causal en metadatos
        creado_en: "2026-03-20T10:00:00Z",
        actualizado_en: "2026-03-25T12:00:00Z",
      };

      const propuesta = mapearAporteAPropuesta(aporteRechazadoSinCausal);

      expect(propuesta.estado_incorporacion).toBe("NO_INCORPORADA_MOTIVADA");
      // OBS-06: PROHIBIDO inventar "tecnica"
      expect(propuesta.causal_descarte).toBe("no_registrada");
      expect(propuesta.causal_descarte).not.toBe("tecnica");
      expect(propuesta.motivacion_sustancial).toBe("Causal no registrada");
    });

    test("mapearAporteAPropuesta preserva la causal explícita cuando sí está presente en metadatos", () => {
      const aporteConCausalExplicita: AporteBackend = {
        id: "01a0f7c7-73b0-73e5-a155-bbbadca96659",
        tipo_aporte: "propuesta",
        titulo: "Reforma al Código Penal en Cartagena",
        descripcion: "Modificación de penas privativas de la libertad.",
        autor_nombre: "Colectivo Jurídico",
        es_anonimo: false,
        estado: "rechazado",
        activo: true,
        apoyos_contador: 5,
        territorio_nombre: "Centro Histórico",
        metadatos: {
          causal: "juridica",
          justificacion_motivada: "La materia penal corresponde a reserva de ley estatutaria y competencia exclusiva del Congreso.",
        },
        creado_en: "2026-03-20T10:00:00Z",
        actualizado_en: "2026-03-25T12:00:00Z",
      };

      const propuesta = mapearAporteAPropuesta(aporteConCausalExplicita);

      expect(propuesta.estado_incorporacion).toBe("NO_INCORPORADA_MOTIVADA");
      expect(propuesta.causal_descarte).toBe("juridica");
      expect(propuesta.motivacion_sustancial).toContain("reserva de ley estatutaria");
    });
  });

  describe("AUD-03: Integración de Aportes Reales y Registro de Devolución Motivada", () => {
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
