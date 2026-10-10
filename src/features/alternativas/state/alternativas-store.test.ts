import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import {
  calcularKPIsAlternativas,
  filtrarAlternativas,
  useAlternativasStore,
  FILTROS_DEFECTO_ALTERNATIVAS,
} from "./alternativas-store";
import { ALTERNATIVAS_CANONICAS } from "../data/alternativas-canonicas.data";

describe("Banco Distrital de Alternativas de Solución — Cartagena (Hito F-1 & EDIT-09)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    useAlternativasStore.getState().resetearAlternativas();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Catálogo Canónico Oficial y KPIs", () => {
    test("carga exactamente las 8 iniciativas oficiales de Cartagena", () => {
      const { alternativas } = useAlternativasStore.getState();
      expect(alternativas.length).toBe(8);

      const codigos = alternativas.map((a) => a.codigo);
      expect(codigos).toContain("ALT-ESCNNA-01");
      expect(codigos).toContain("ALT-CONV-02");
      expect(codigos).toContain("ALT-AMB-03");
      expect(codigos).toContain("ALT-CUID-04");
      expect(codigos).toContain("ALT-INS-05");
      expect(codigos).toContain("ALT-SEG-06");
      expect(codigos).toContain("ALT-ECON-07");
      expect(codigos).toContain("ALT-ETN-08");
    });

    test("computa KPIs de financiamiento distrital y salvaguarda étnica", () => {
      const { alternativas } = useAlternativasStore.getState();
      const kpis = calcularKPIsAlternativas(alternativas);

      expect(kpis.total).toBe(8);
      // Suma total esperada: 4.500 + 6.200 + 12.000 + 3.800 + 2.900 + 8.500 + 3.500 + 2.400 = 43.800M COP
      expect(kpis.inversionTotalCOP).toBe(43800000000);
      // Viables o Priorizadas (3 priorizadas + 3 viables = 6)
      expect(kpis.viablesOPriorizadas).toBe(6);
      // Enfoque Étnico Ley 70/93 (ALT-INS-05 y ALT-ETN-08)
      expect(kpis.conEnfoqueEtnico).toBe(2);
      expect(kpis.promedioHorizonte).toBeGreaterThan(0);
    });
  });

  describe("Filtrado Multicriterio", () => {
    test("filtra por Sector de Inversión", () => {
      const alternativas = ALTERNATIVAS_CANONICAS;
      const filtradas = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        sector: "proteccion_nna",
      });
      expect(filtradas.length).toBe(1);
      expect(filtradas[0].codigo).toBe("ALT-ESCNNA-01");
    });

    test("filtra por Línea Estratégica", () => {
      const alternativas = ALTERNATIVAS_CANONICAS;
      const filtradas = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        linea: "LE-01",
      });
      // LE-01: ALT-CONV-02 y ALT-SEG-06
      expect(filtradas.length).toBe(2);
      const codigos = filtradas.map((a) => a.codigo);
      expect(codigos).toContain("ALT-CONV-02");
      expect(codigos).toContain("ALT-SEG-06");
    });

    test("filtra por Estado de Viabilidad", () => {
      const alternativas = ALTERNATIVAS_CANONICAS;
      const priorizadas = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        estado: "priorizada",
      });
      expect(priorizadas.length).toBe(3);
    });

    test("filtra por Enfoque Étnico (Ley 70 de 1993 y Consulta Previa)", () => {
      const alternativas = ALTERNATIVAS_CANONICAS;
      const etnicos = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        enfoqueEtnico: "solo_etnicos",
      });
      expect(etnicos.length).toBe(2);
      expect(etnicos.every((a) => a.requiere_consulta_previa)).toBe(true);
    });

    test("busca por texto en código, nombre, territorio y objetivos", () => {
      const alternativas = ALTERNATIVAS_CANONICAS;

      const porBarrio = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        busqueda: "Bazurto",
      });
      expect(porBarrio.length).toBe(1);
      expect(porBarrio[0].codigo).toBe("ALT-ECON-07");

      const porCienaga = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        busqueda: "Ciénaga",
      });
      expect(porCienaga.length).toBe(1);
      expect(porCienaga[0].codigo).toBe("ALT-AMB-03");

      const porCodigo = filtrarAlternativas(alternativas, {
        ...FILTROS_DEFECTO_ALTERNATIVAS,
        busqueda: "ALT-INS-05",
      });
      expect(porCodigo.length).toBe(1);
    });
  });

  describe("Carga y Contingencia Asíncrona (EDIT-09)", () => {
    test("cargarAlternativas actualiza el estado desde backend con esContingencia=false", async () => {
      const mockItems = [
        {
          id: "01a0f810-e5ca-7001-a001-000000000001",
          codigo: "ALT-ESCNNA-01",
          nombre: "Ruta Distrital Segura",
          descripcion: "Prevención",
          sector: "proteccion_nna",
          costo_estimado_cop: 4500000000,
          horizonte_anios: 4,
          estado: "priorizada",
          requiere_consulta_previa: false,
          poblacion_objetivo_estimada: 14500,
          creado_en: "2026-10-01T10:00:00Z",
          actualizado_en: "2026-10-04T12:00:00Z",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockItems), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await useAlternativasStore.getState().cargarAlternativas();

      const estado = useAlternativasStore.getState();
      expect(estado.alternativas).toHaveLength(1);
      expect(estado.alternativas[0].codigo).toBe("ALT-ESCNNA-01");
      expect(estado.esContingencia).toBe(false);
      expect(estado.cargando).toBe(false);
      expect(estado.error).toBeNull();
    });

    test("cargarAlternativas conmuta a catálogo local y esContingencia=true ante fallo de red", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(() => {
        throw new Error("Conexión rehusada");
      });

      await useAlternativasStore.getState().cargarAlternativas();

      const estado = useAlternativasStore.getState();
      expect(estado.alternativas).toEqual(ALTERNATIVAS_CANONICAS);
      expect(estado.esContingencia).toBe(true);
      expect(estado.cargando).toBe(false);
    });
  });

  describe("Mutaciones del Store Zustand con Persistencia Real (EDIT-09)", () => {
    test("agrega una nueva alternativa de solución con persistencia remota", async () => {
      const mockCreado = {
        id: "01a0f810-e5ca-7001-a001-000000000099",
        codigo: "ALT-TEST-99",
        nombre: "Iniciativa de Prueba Comunitaria",
        descripcion: "Descripción técnica de prueba pericial para el store.",
        sector: "seguridad_convivencia",
        linea_estrategica_codigo: "LE-01",
        dimension_codigo: "comunitaria",
        costo_estimado_cop: 1000000000,
        horizonte_anios: 2,
        estado: "en_formulacion",
        requiere_consulta_previa: false,
        poblacion_objetivo_estimada: 5000,
        creado_en: "2026-10-04T12:00:00Z",
        actualizado_en: "2026-10-04T12:00:00Z",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockCreado), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const nuevoId = await useAlternativasStore.getState().agregarAlternativa({
        codigo: "ALT-TEST-99",
        nombre: "Iniciativa de Prueba Comunitaria",
        descripcion: "Descripción técnica de prueba pericial para el store.",
        sector: "seguridad_convivencia",
        linea_estrategica_codigo: "LE-01",
        dimension_id: "comunitaria",
        objetivo_central_mga: "Objetivo de prueba.",
        territorio_cobertura: "Localidad 1",
        poblacion_objetivo_estimada: 5000,
        costo_estimado_cop: 1000000000,
        horizonte_anios: 2,
        fuentes_financiacion_sugeridas: ["FONSET"],
        estado: "en_formulacion",
        requiere_consulta_previa: false,
      });

      expect(nuevoId).toBe("01a0f810-e5ca-7001-a001-000000000099");
      const actual = useAlternativasStore.getState().getById("01a0f810-e5ca-7001-a001-000000000099");
      expect(actual).toBeDefined();
      expect(actual?.codigo).toBe("ALT-TEST-99");
      expect(useAlternativasStore.getState().alternativas.length).toBe(9);
    });

    test("anti-silent-fallback: previene mutación local si la persistencia remota falla al agregar", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(() => {
        throw new Error("HTTP 500: Error interno de base de datos");
      });

      const res = await useAlternativasStore.getState().agregarAlternativa({
        codigo: "ALT-FAIL-01",
        nombre: "Iniciativa Fallida",
        descripcion: "No debe mutar store",
        sector: "seguridad_convivencia",
        linea_estrategica_codigo: "LE-01",
        dimension_id: "comunitaria",
        objetivo_central_mga: "Objetivo",
        territorio_cobertura: "Cartagena",
        poblacion_objetivo_estimada: 100,
        costo_estimado_cop: 100000,
        horizonte_anios: 1,
        fuentes_financiacion_sugeridas: [],
        estado: "en_formulacion",
        requiere_consulta_previa: false,
      });

      expect(res).toBeNull();
      expect(useAlternativasStore.getState().alternativas.length).toBe(8);
      expect(useAlternativasStore.getState().error).toBeDefined();
      expect(useAlternativasStore.getState().getById("ALT-FAIL-01")).toBeUndefined();
    });

    test("actualiza datos de una iniciativa existente con persistencia", async () => {
      const store = useAlternativasStore.getState();
      const idObjetivo = "alt-01a0f810-e5ca-7001-a001-000000000001";

      const mockActualizado = {
        id: idObjetivo,
        codigo: "ALT-ESCNNA-01",
        nombre: "Ruta Distrital Segura",
        descripcion: "",
        sector: "proteccion_nna",
        costo_estimado_cop: 5000000000,
        horizonte_anios: 5,
        estado: "priorizada",
        requiere_consulta_previa: false,
        creado_en: "2026-10-01T10:00:00Z",
        actualizado_en: "2026-10-04T12:00:00Z",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockActualizado), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const exito = await store.actualizarAlternativa(idObjetivo, {
        costo_estimado_cop: 5000000000,
        horizonte_anios: 5,
      });

      expect(exito).toBe(true);
      const modificado = useAlternativasStore.getState().getById(idObjetivo);
      expect(modificado?.costo_estimado_cop).toBe(5000000000);
      expect(modificado?.horizonte_anios).toBe(5);
    });

    test("cambia el estado de viabilidad de una alternativa", async () => {
      const store = useAlternativasStore.getState();
      const idObjetivo = "alt-01a0f810-e5ca-7001-a001-000000000005"; // ALT-INS-05 (requiere_ajustes)

      const mockActualizado = {
        id: idObjetivo,
        codigo: "ALT-INS-05",
        nombre: "Centro de Formación Tecnológica",
        descripcion: "",
        sector: "educacion_cultura",
        costo_estimado_cop: 2900000000,
        horizonte_anios: 4,
        estado: "viable",
        requiere_consulta_previa: true,
        creado_en: "2026-10-01T10:00:00Z",
        actualizado_en: "2026-10-04T12:00:00Z",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockActualizado), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const exito = await store.cambiarEstado(idObjetivo, "viable");
      expect(exito).toBe(true);

      const modificado = useAlternativasStore.getState().getById(idObjetivo);
      expect(modificado?.estado).toBe("viable");
    });

    test("elimina una alternativa del banco distrital", async () => {
      const store = useAlternativasStore.getState();
      const idObjetivo = "alt-01a0f810-e5ca-7001-a001-000000000008";

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const exito = await store.eliminarAlternativa(idObjetivo);
      expect(exito).toBe(true);
      expect(useAlternativasStore.getState().alternativas.length).toBe(7);
      expect(useAlternativasStore.getState().getById(idObjetivo)).toBeUndefined();
    });

    test("anti-silent-fallback: previene eliminación si el backend retorna 409 por dependencias", async () => {
      const store = useAlternativasStore.getState();
      const idObjetivo = "alt-01a0f810-e5ca-7001-a001-000000000001";

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "No se puede eliminar la alternativa: está vinculada a 2 compromiso(s) del Plan de Acción y Seguimiento (PAS).",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        )
      );

      const exito = await store.eliminarAlternativa(idObjetivo);
      expect(exito).toBe(false);
      // El estado debe conservar el elemento
      expect(useAlternativasStore.getState().alternativas.length).toBe(8);
      expect(useAlternativasStore.getState().getById(idObjetivo)).toBeDefined();
      expect(useAlternativasStore.getState().error).toContain("vinculada");
    });

    test("gestiona filtros y limpieza de estado", () => {
      const store = useAlternativasStore.getState();

      store.setFiltros({ busqueda: "juventud", sector: "seguridad_convivencia" });
      expect(useAlternativasStore.getState().filtros.busqueda).toBe("juventud");
      expect(useAlternativasStore.getState().filtros.sector).toBe("seguridad_convivencia");

      store.limpiarFiltros();
      expect(useAlternativasStore.getState().filtros).toEqual(FILTROS_DEFECTO_ALTERNATIVAS);
    });
  });
});
