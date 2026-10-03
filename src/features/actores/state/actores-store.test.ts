import { describe, expect, test, beforeEach } from "vitest";
import { calcularCuadrante, useActoresStore } from "./actores-store";
import type { NivelInteres, NivelPoder } from "../models/actor";

describe("Actores Store & Matriz de Involucramiento", () => {
  beforeEach(() => {
    useActoresStore.getState().resetearActores();
  });

  describe("Cálculo de Cuadrante de la Matriz 2x2", () => {
    test("Clasifica correctamente los 4 cuadrantes metodológicos", () => {
      // Cuadrante 1: Alto Poder / Alto Interés -> Aliados Clave
      expect(calcularCuadrante("alto", "alto")).toBe("aliados_clave");

      // Cuadrante 2: Alto Poder / Medio o Bajo Interés -> Incidencia Estratégica
      expect(calcularCuadrante("alto", "medio")).toBe("incidencia_estrategica");
      expect(calcularCuadrante("alto", "bajo")).toBe("incidencia_estrategica");

      // Cuadrante 3: Medio o Bajo Poder / Alto Interés -> Base Social
      expect(calcularCuadrante("medio", "alto")).toBe("base_social");
      expect(calcularCuadrante("bajo", "alto")).toBe("base_social");

      // Cuadrante 4: Medio o Bajo Poder / Medio o Bajo Interés -> Monitoreo
      expect(calcularCuadrante("medio", "medio")).toBe("monitoreo");
      expect(calcularCuadrante("medio", "bajo")).toBe("monitoreo");
      expect(calcularCuadrante("bajo", "medio")).toBe("monitoreo");
      expect(calcularCuadrante("bajo", "bajo")).toBe("monitoreo");
    });
  });

  describe("Catálogo Inicial de Cartagena", () => {
    test("Carga al menos 16 actores reales y representativos del Distrito", () => {
      const { actores } = useActoresStore.getState();
      expect(actores.length).toBeGreaterThanOrEqual(16);

      // Verificación de entidades y organizaciones clave de Cartagena
      const codigos = actores.map((a) => a.codigo);
      expect(codigos).toContain("ACT-COM-001"); // ASOJAC Localidad 2
      expect(codigos).toContain("ACT-COM-002"); // La Boquilla (Ley 70)
      expect(codigos).toContain("ACT-INS-001"); // MECAR
      expect(codigos).toContain("ACT-INS-003"); // Personería Distrital
      expect(codigos).toContain("ACT-SOC-001"); // Mesa Distrital de Víctimas
      expect(codigos).toContain("ACT-GRE-001"); // Consejo Gremial de Bolívar
      expect(codigos).toContain("ACT-ACA-003"); // Cartagena Cómo Vamos
      expect(codigos).toContain("ACT-COOP-001"); // PNUD Caribe

      // Verificar que todos los actores tengan contacto y dimensiones válidas
      for (const actor of actores) {
        expect(actor.nombre).toBeTruthy();
        expect(actor.contacto.nombreLider).toBeTruthy();
        expect(actor.dimensionesPrincipales.length).toBeGreaterThan(0);
        expect(["alto", "medio", "bajo"]).toContain(actor.nivelPoder);
        expect(["alto", "medio", "bajo"]).toContain(actor.nivelInteres);
      }
    });
  });

  describe("Mutaciones del Store", () => {
    test("Agrega un nuevo actor con datos completos", () => {
      const store = useActoresStore.getState();
      const totalInicial = store.actores.length;

      store.agregarActor({
        codigo: "ACT-TEST-001",
        nombre: "Veeduría Ciudadana Bahía de Cartagena",
        tipo: "sociedad_civil",
        territorio: "localidad_3",
        barrioVereda: "Manga / Bocagrande",
        dimensionesPrincipales: ["ambiental", "politica"],
        nivelPoder: "medio",
        nivelInteres: "alto",
        postura: "critico_opositor",
        contacto: {
          nombreLider: "Ing. Carlos Mendoza",
          cargo: "Director Ejecutivo",
          organizacion: "Veeduría Bahía",
          email: "contacto@veeduriabahia.org",
        },
        expectativasPrincipales: "Transparencia en dragado y control ambiental.",
        accionesInvolucramiento: "Mesa técnica ambiental periódica.",
      });

      const { actores } = useActoresStore.getState();
      expect(actores.length).toBe(totalInicial + 1);

      const nuevo = actores[0];
      expect(nuevo.codigo).toBe("ACT-TEST-001");
      expect(nuevo.id).toMatch(/^act-/);
      expect(nuevo.actualizadoEn).toBeTruthy();
      expect(calcularCuadrante(nuevo.nivelPoder, nuevo.nivelInteres)).toBe("base_social");
    });

    test("Actualiza los datos y clasificación de un actor existente", () => {
      const store = useActoresStore.getState();
      const actorId = "act-ins-01"; // MECAR

      store.actualizarActor(actorId, {
        nivelInteres: "alto",
        postura: "promotor_aliado",
        expectativasPrincipales: "Integración de cámaras distritales CAD 123.",
      });

      const actualizado = useActoresStore.getState().getById(actorId);
      expect(actualizado).toBeDefined();
      expect(actualizado?.nivelInteres).toBe("alto");
      expect(actualizado?.postura).toBe("promotor_aliado");
      expect(actualizado?.expectativasPrincipales).toContain("CAD 123");
      // Con poder alto e interés alto ahora es aliado clave
      expect(calcularCuadrante(actualizado!.nivelPoder, actualizado!.nivelInteres)).toBe("aliados_clave");
    });

    test("Elimina un actor correctamente", () => {
      const store = useActoresStore.getState();
      const totalInicial = store.actores.length;
      const targetId = "act-coop-02"; // ACNUR

      store.eliminarActor(targetId);
      const { actores } = useActoresStore.getState();
      expect(actores.length).toBe(totalInicial - 1);
      expect(actores.find((a) => a.id === targetId)).toBeUndefined();
    });
  });

  describe("Filtros y Búsqueda", () => {
    test("Modifica y restablece los filtros del catálogo", () => {
      const store = useActoresStore.getState();

      store.setFiltros({
        busqueda: "boquilla",
        tipo: "comunitario",
        territorio: "rural_insular",
        cuadrante: "aliados_clave",
      });

      const filtros = useActoresStore.getState().filtros;
      expect(filtros.busqueda).toBe("boquilla");
      expect(filtros.tipo).toBe("comunitario");
      expect(filtros.territorio).toBe("rural_insular");
      expect(filtros.cuadrante).toBe("aliados_clave");

      store.limpiarFiltros();
      const limpios = useActoresStore.getState().filtros;
      expect(limpios.busqueda).toBe("");
      expect(limpios.tipo).toBe("todos");
      expect(limpios.territorio).toBe("todos");
      expect(limpios.postura).toBe("todos");
      expect(limpios.cuadrante).toBe("todos");
      expect(limpios.dimension).toBe("todas");
    });
  });
});
