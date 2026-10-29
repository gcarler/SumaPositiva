import { describe, expect, test } from "vitest";
import {
  ESTADOS_CANONICOS,
  ESTADOS_CANONICOS_ORDER,
  MODULOS_PROYECTOS,
  MODULOS_PROYECTOS_ORDER,
  esModuloProyectos,
} from "./actividad-proyecto";

/** El contrato del modelo es la referencia compartida con el backend. */
describe("Modelo de actividad unificada de Proyectos", () => {
  test("cada módulo dueño tiene etiqueta y ruta de plataforma en la app", () => {
    for (const id of MODULOS_PROYECTOS_ORDER) {
      expect(MODULOS_PROYECTOS[id].label).toBeTruthy();
      expect(MODULOS_PROYECTOS[id].rutaPlataforma).toMatch(/^\/plataforma\//);
    }
    // Los módulos fuente siguen existiendo como vistas nativas editables.
    expect(MODULOS_PROYECTOS.comunicaciones.rutaPlataforma).toBe("/plataforma/comunicaciones");
    // Plan de Acción dejó de ser fuente de Proyectos: solo queda en su módulo nativo.
    expect(MODULOS_PROYECTOS_ORDER).not.toContain("plan_accion");
  });

  test("la guarda acepta solo módulos catalogados y descarta fuentes retiradas", () => {
    expect(esModuloProyectos("comunicaciones")).toBe(true);
    expect(esModuloProyectos("mesas")).toBe(true);
    expect(esModuloProyectos("formularios")).toBe(true);
    // Fuente retirada del agregado (gestión vive en Seguimiento).
    expect(esModuloProyectos("plan_accion")).toBe(false);
    expect(esModuloProyectos("")).toBe(false);
  });

  test("el vocabulario canónico es completo y sin duplicados", () => {
    for (const estado of ESTADOS_CANONICOS_ORDER) {
      expect(ESTADOS_CANONICOS[estado].label).toBeTruthy();
      expect(ESTADOS_CANONICOS[estado].tone).toBeTruthy();
    }
    expect(new Set(ESTADOS_CANONICOS_ORDER).size).toBe(ESTADOS_CANONICOS_ORDER.length);
  });
});
