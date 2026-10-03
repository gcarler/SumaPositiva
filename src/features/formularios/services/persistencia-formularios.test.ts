import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  crearFormulario,
  actualizarFormulario,
  enviarRespuesta,
  eliminarFormulario,
} from "./formularios-api";
import { formulariosRemotos } from "./formularios-remotos";
import { useFormulariosStore } from "../state/formularios-store";
import { formularioVacio } from "../models/formulario";
const preguntas = [
  {
    id: "p",
    texto: "Propuesta",
    tipo: "texto_corto" as const,
    obligatoria: false,
    orden: 0,
  },
];
beforeEach(() =>
  useFormulariosStore.setState({
    formularios: [],
    respuestas: [],
    previews: {},
  }),
);
afterEach(() => {
  vi.restoreAllMocks();
  useFormulariosStore.setState({
    formularios: [],
    respuestas: [],
    previews: {},
  });
});
test("un fallo al crear no inventa un formulario local", async () => {
  vi.spyOn(formulariosRemotos, "crear").mockRejectedValue(
    new Error("API no disponible"),
  );
  await expect(
    crearFormulario({
      ...formularioVacio(),
      titulo: "Consulta real",
      preguntas,
    }),
  ).rejects.toThrow("API no disponible");
  expect(useFormulariosStore.getState().formularios).toEqual([]);
});
test("editar, responder y eliminar requieren confirmación de la API incluso para un registro antiguo", async () => {
  const form = {
    ...formularioVacio(),
    id: "antiguo",
    titulo: "Consulta",
    preguntas,
    origenDatos: "demo" as const,
  };
  useFormulariosStore.setState({ formularios: [form] });
  vi.spyOn(formulariosRemotos, "actualizar").mockRejectedValue(
    new Error("Fallo persistencia"),
  );
  vi.spyOn(formulariosRemotos, "enviar").mockRejectedValue(
    new Error("Fallo persistencia"),
  );
  vi.spyOn(formulariosRemotos, "eliminar").mockRejectedValue(
    new Error("Fallo persistencia"),
  );
  await expect(
    actualizarFormulario(form.id, { titulo: "Cambio" }),
  ).rejects.toThrow("Fallo persistencia");
  await expect(
    enviarRespuesta({ formularioId: form.id, respuestas: {} }),
  ).rejects.toThrow("Fallo persistencia");
  await expect(eliminarFormulario(form.id)).rejects.toThrow(
    "Fallo persistencia",
  );
  expect(useFormulariosStore.getState().formularios).toEqual([form]);
  expect(useFormulariosStore.getState().respuestas).toEqual([]);
});
