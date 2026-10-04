import { describe, expect, test, beforeEach } from "vitest";
import { useFuentesStore } from "./fuentes-store";
import { FUENTES_INICIALES as FIXTURES_FUENTES } from "../__fixtures__/fuentes-iniciales.fixture";

describe("Fuentes Store & Metrics (EDIT-03b / AUD-14)", () => {
  beforeEach(() => {
    useFuentesStore.getState().resetearFuentes();
  });

  test("Inicia con catálogo vacío en producción conforme a la regla de cero datos fabricados", () => {
    const { fuentes } = useFuentesStore.getState();
    expect(fuentes).toHaveLength(0);

    // Los datos simulados de demostración residen exclusivamente en __fixtures__
    expect(FIXTURES_FUENTES).toHaveLength(18);
  });

  test("Actualiza el estado y datos de una fuente", async () => {
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

  test("Agrega una nueva fuente al catálogo", async () => {
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
