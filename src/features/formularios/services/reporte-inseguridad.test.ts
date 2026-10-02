import { describe, expect, test } from "vitest";
import { FORMULARIO_REPORTE_INSEGURIDAD as form } from "../data/reporte-inseguridad";
import {
  preguntasVisibles,
  validarRespuestas,
  respuestasEfectivas,
} from "./formulario-engine";
import { useFormulariosStore } from "../state/formularios-store";
describe("Reporte ciudadano y caché persistente", () => {
  test("el producto inicia sin datos ficticios", () => {
    expect(useFormulariosStore.getState().formularios).toEqual([]);
    expect(useFormulariosStore.getState().respuestas).toEqual([]);
  });
  test.each(["d1", "d2", "d3", "d4", "d5", "d6", "d7"])(
    "solo exige la subcategoría de %s",
    (dimension) => {
      const visibles = preguntasVisibles(form, { P1: dimension });
      expect(visibles).toHaveLength(6);
      expect(visibles.filter((p) => p.id.startsWith("P2-"))).toHaveLength(1);
      const id = `P2-${dimension.toUpperCase()}`;
      const respuestas = {
        P1: dimension,
        [id]: `${dimension}-1`,
        P3: "frecuencia-1",
        P5: JSON.stringify({
          type: "Point",
          coordinates: [-75.5512, 10.4234],
          fotos: [],
        }),
        "P2-INVISIBLE": "descartar",
      };
      expect(validarRespuestas(form, respuestas)).toEqual({});
      expect(respuestasEfectivas(form, respuestas)).not.toHaveProperty(
        "P2-INVISIBLE",
      );
    },
  );
  test("fotos sin punto y descripción excesiva no se aceptan", () => {
    expect(
      validarRespuestas(form, {
        P1: "d1",
        "P2-D1": "d1-1",
        P3: "frecuencia-1",
        P4: "x".repeat(501),
        P5: JSON.stringify({ type: "Point", coordinates: ["", ""], fotos: [] }),
      }),
    ).toHaveProperty("P5");
  });
});
