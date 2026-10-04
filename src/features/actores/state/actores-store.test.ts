import { describe, expect, test, beforeEach, vi } from "vitest";
import { calcularCuadrante, useActoresStore } from "./actores-store";
import type { ActorEstrategico } from "../models/actor";

describe("Actores Store & Matriz de Involucramiento (AUD-14)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  describe("Estado Inicial Limpio y Libre de PII (AUD-14)", () => {
    test("Inicia estrictamente vacío sin datos personales ni actores simulados", () => {
      const { actores } = useActoresStore.getState();
      expect(actores).toEqual([]);
      expect(actores.length).toBe(0);
    });
  });

  describe("Mutaciones y Persistencia con API", () => {
    test("Carga actores desde el backend exitosamente", async () => {
      const mockActores: ActorEstrategico[] = [
        {
          id: "act-tst-01",
          codigo: "ACT-DEMO-01",
          nombre: "Organización Comunitaria Demo",
          tipo: "comunitario",
          territorio: "localidad_2",
          dimensionesPrincipales: ["comunitaria", "personal"],
          nivelPoder: "medio",
          nivelInteres: "alto",
          postura: "promotor_aliado",
          contacto: {
            organizacion: "Organización Comunitaria Demo",
            cargo: "Vocero",
          },
          expectativasPrincipales: "Convivencia barrial",
          accionesInvolucramiento: "Mesa de diálogo",
          es_demostracion: true,
          actualizadoEn: new Date().toISOString(),
        },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockActores), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await useActoresStore.getState().cargarActores();
      const { actores } = useActoresStore.getState();
      expect(actores.length).toBe(1);
      expect(actores[0].codigo).toBe("ACT-DEMO-01");
      expect(actores[0].es_demostracion).toBe(true);
    });

    test("Ante fallo del backend al listar actores, propaga error y no inyecta catálogo estático (OBS-27 / H-04)", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network Error - Connection Refused"));

      await useActoresStore.getState().cargarActores();
      const state = useActoresStore.getState();
      expect(state.actores).toEqual([]);
      expect(state.error).toContain("Network Error");
      expect(state.cargando).toBe(false);
    });

    test("Agrega un nuevo actor tras respuesta exitosa de API", async () => {
      const nuevoMock = {
        id: "act-01a0f820-0001",
        codigo: "ACT-TEST-001",
        nombre: "Veeduría Ciudadana de Cartagena",
        tipo: "sociedad_civil",
        territorio: "localidad_3",
        dimensiones_principales: ["ambiental", "politica"],
        nivel_poder: "medio",
        nivel_interes: "alto",
        postura: "critico_opositor",
        contacto: {
          organizacion: "Veeduría Ciudadana",
          cargo: "Director Delegado",
        },
        expectativas_principales: "Control social participativo.",
        acciones_involucramiento: "Mesa técnica periódica.",
        es_demostracion: false,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(nuevoMock), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const ok = await useActoresStore.getState().agregarActor({
        codigo: "ACT-TEST-001",
        nombre: "Veeduría Ciudadana de Cartagena",
        tipo: "sociedad_civil",
        territorio: "localidad_3",
        dimensionesPrincipales: ["ambiental", "politica"],
        nivelPoder: "medio",
        nivelInteres: "alto",
        postura: "critico_opositor",
        contacto: {
          organizacion: "Veeduría Ciudadana",
          cargo: "Director Delegado",
        },
        expectativasPrincipales: "Control social participativo.",
        accionesInvolucramiento: "Mesa técnica periódica.",
      });

      expect(ok).toBe(true);
      const { actores } = useActoresStore.getState();
      expect(actores.length).toBe(1);
      expect(actores[0].codigo).toBe("ACT-TEST-001");
      expect(calcularCuadrante(actores[0].nivelPoder, actores[0].nivelInteres)).toBe("base_social");
    });
  });

  describe("Filtros y Búsqueda", () => {
    test("Modifica y restablece los filtros del catálogo", () => {
      const store = useActoresStore.getState();

      store.setFiltros({
        busqueda: "veeduria",
        tipo: "sociedad_civil",
        territorio: "localidad_3",
        cuadrante: "aliados_clave",
      });

      const filtros = useActoresStore.getState().filtros;
      expect(filtros.busqueda).toBe("veeduria");
      expect(filtros.tipo).toBe("sociedad_civil");
      expect(filtros.territorio).toBe("localidad_3");
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
