import { describe, expect, test, beforeEach, vi, afterEach } from "vitest";
import { useFuentesStore } from "./fuentes-store";
import { FUENTES_INICIALES as FIXTURES_FUENTES } from "../__fixtures__/fuentes-iniciales.fixture";

describe("Fuentes Store & Metrics (EDIT-03b / AUD-14 / H-04)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    useFuentesStore.getState().resetearFuentes();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("Inicia con catálogo vacío en producción conforme a la regla de cero datos fabricados", () => {
    const { fuentes } = useFuentesStore.getState();
    expect(fuentes).toHaveLength(0);

    // Los datos simulados de demostración residen exclusivamente en __fixtures__
    expect(FIXTURES_FUENTES).toHaveLength(18);
  });

  test("Actualiza el estado y datos de una fuente cuando la API responde", async () => {
    const mockCreada = {
      id: "fnt-test-004",
      codigo: "FNT-LOC-004",
      entidad: "Distriseguridad",
      nombre_fuente: "Línea 123 y Monitoreo",
      tipo: "primaria",
      ambito: "local",
      dimension_seguridad: "crisis",
      periodicidad: "mensual",
      estado_entrega: "por_solicitar",
      variables_solicitadas: ["Llamadas 123"],
    };

    const mockActualizada = {
      ...mockCreada,
      radicado_solicitud: "DIST-MOD-2026-999",
      estado_entrega: "en_termino",
      resumen_datos: "Base de datos CAD 123 requerida",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
      const url = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
      if (url.includes("/fuentes/fnt-test-004")) {
        return new Response(JSON.stringify(mockActualizada), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(mockCreada), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const store = useFuentesStore.getState();

    // 1. Agregar una fuente institucional
    const creada = await store.agregarFuente({
      codigo: "FNT-LOC-004",
      entidad: "Distriseguridad",
      nombreFuente: "Línea 123 y Monitoreo",
      tipo: "primaria",
      ambito: "local",
      dimensionSeguridad: "crisis",
      periodicidad: "mensual",
      estadoEntrega: "por_solicitar",
      variablesSolicitadas: ["Llamadas 123"],
    });

    // 2. Actualizar radicado formal
    await store.actualizarFuente(creada.id, {
      radicadoSolicitud: "DIST-MOD-2026-999",
      estadoEntrega: "en_termino",
      datosEntregadosResumen: "Base de datos CAD 123 requerida",
    });

    const actualizada = useFuentesStore.getState().getById(creada.id);
    expect(actualizada?.radicadoSolicitud).toBe("DIST-MOD-2026-999");
    expect(actualizada?.estadoEntrega).toBe("en_termino");
    expect(actualizada?.datosEntregadosResumen).toContain("Base de datos CAD 123");
  });

  test("Revierte mutación optimista ante error en backend (H-04)", async () => {
    const mockCreada = {
      id: "fnt-test-rev",
      codigo: "FNT-REV-001",
      entidad: "Entidad Reversión",
      nombre_fuente: "Fuente Reversión",
      tipo: "primaria",
      ambito: "local",
      dimension_seguridad: "personal",
      periodicidad: "mensual",
      estado_entrega: "por_solicitar",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
      const url = typeof info === "string" ? info : info instanceof Request ? info.url : info.toString();
      if (url.includes("/fuentes/fnt-test-rev")) {
        throw new Error("Fallo de red al actualizar");
      }
      return new Response(JSON.stringify(mockCreada), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const store = useFuentesStore.getState();
    const creada = await store.agregarFuente({
      codigo: "FNT-REV-001",
      entidad: "Entidad Reversión",
      nombreFuente: "Fuente Reversión",
      tipo: "primaria",
      ambito: "local",
      dimensionSeguridad: "personal",
      periodicidad: "mensual",
      estadoEntrega: "por_solicitar",
      variablesSolicitadas: [],
    });

    expect(store.getById("fnt-test-rev")?.estadoEntrega).toBe("por_solicitar");

    // Intentar actualizar y verificar que revierte el estado
    await expect(
      store.actualizarFuente(creada.id, { estadoEntrega: "entregada" })
    ).rejects.toThrow("Fallo de red al actualizar");

    expect(useFuentesStore.getState().getById("fnt-test-rev")?.estadoEntrega).toBe("por_solicitar");
  });

  test("Permite filtrar por ámbito, estado y búsqueda de texto", () => {
    const store = useFuentesStore.getState();

    store.setFiltros({ ambito: "internacional" });
    expect(useFuentesStore.getState().filtros.ambito).toBe("internacional");

    store.setFiltros({ busqueda: "dane" });
    expect(useFuentesStore.getState().filtros.busqueda).toBe("dane");

    store.limpiarFiltros();
    const filtrosLimpios = useFuentesStore.getState().filtros;
    expect(filtrosLimpios.busqueda).toBe("");
    expect(filtrosLimpios.ambito).toBe("todos");
    expect(filtrosLimpios.estado).toBe("todos");
  });

  test("Agrega una nueva fuente al catálogo cuando la API confirma la persistencia", async () => {
    const mockCreada = {
      id: "fnt-nueva-001-id",
      codigo: "FNT-NUEVA-001",
      entidad: "Entidad de Prueba Distrital",
      nombre_fuente: "Registro de Prueba",
      tipo: "primaria",
      ambito: "local",
      dimension_seguridad: "personal",
      periodicidad: "mensual",
      estado_entrega: "por_solicitar",
      variables_solicitadas: ["Variable A", "Variable B"],
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify(mockCreada), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const store = useFuentesStore.getState();
    const totalInicial = store.fuentes.length;

    await store.agregarFuente({
      codigo: "FNT-NUEVA-001",
      entidad: "Entidad de Prueba Distrital",
      nombreFuente: "Registro de Prueba",
      tipo: "primaria",
      ambito: "local",
      dimensionSeguridad: "personal",
      periodicidad: "mensual",
      estadoEntrega: "por_solicitar",
      variablesSolicitadas: ["Variable A", "Variable B"],
    });

    const fuentesActuales = useFuentesStore.getState().fuentes;
    expect(fuentesActuales.length).toBe(totalInicial + 1);
    expect(fuentesActuales[0].codigo).toBe("FNT-NUEVA-001");
  });
});
