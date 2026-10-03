import { describe, expect, test, beforeEach } from "vitest";
import { useFuentesStore } from "./fuentes-store";

describe("Fuentes Store & Metrics", () => {
  beforeEach(() => {
    useFuentesStore.getState().resetearFuentes();
  });

  test("Carga las fuentes iniciales correctamente", () => {
    const { fuentes } = useFuentesStore.getState();
    expect(fuentes.length).toBeGreaterThanOrEqual(18);

    const mecar = fuentes.find((f) => f.codigo === "FNT-LOC-001");
    expect(mecar).toBeDefined();
    expect(mecar?.entidad).toContain("MECAR");
    expect(mecar?.estadoEntrega).toBe("entregada");
  });

  test("Actualiza el estado y datos de una fuente", () => {
    const store = useFuentesStore.getState();
    const id = "fnt-loc-04"; // Distriseguridad

    store.actualizarFuente(id, {
      radicadoSolicitud: "DIST-MOD-2026-999",
      estadoEntrega: "entregada",
      datosEntregadosResumen: "Base de datos CAD 123 entregada completa",
    });

    const actualizada = useFuentesStore.getState().getById(id);
    expect(actualizada?.radicadoSolicitud).toBe("DIST-MOD-2026-999");
    expect(actualizada?.estadoEntrega).toBe("entregada");
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

  test("Agrega una nueva fuente al catálogo", () => {
    const store = useFuentesStore.getState();
    const totalInicial = store.fuentes.length;

    store.agregarFuente({
      codigo: "FNT-NUEVA-001",
      entidad: "Entidad de Prueba Distrital",
      nombreFuente: "Registro de Prueba",
      tipo: "primaria",
      ambito: "local",
      dimensionSeguridad: "personal",
      periodicidad: "mensual",
      estadoEntrega: "en_termino",
      variablesSolicitadas: ["Variable A", "Variable B"],
    });

    const fuentesActuales = useFuentesStore.getState().fuentes;
    expect(fuentesActuales.length).toBe(totalInicial + 1);
    expect(fuentesActuales[0].codigo).toBe("FNT-NUEVA-001");
  });
});
