import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  crearFormulario,
  actualizarFormulario,
  enviarRespuesta,
  eliminarFormulario,
  obtenerFormulario,
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

test("obtenerFormulario resuelve formulario localmente si existe en el store", async () => {
  const form = {
    ...formularioVacio(),
    id: "form-local-01",
    titulo: "Formulario Local",
    preguntas,
    origenDatos: "api" as const,
  };
  useFormulariosStore.setState({ formularios: [form] });
  const spyListar = vi.spyOn(formulariosRemotos, "listar");

  const obtenido = await obtenerFormulario("form-local-01");
  expect(obtenido.id).toBe("form-local-01");
  expect(spyListar).not.toHaveBeenCalled();
});

test("obtenerFormulario consulta formulariosRemotos.listar() e hidrata el store en arranque en frío (GAP-06)", async () => {
  useFormulariosStore.setState({ formularios: [] });
  const formRemoto = {
    ...formularioVacio(),
    id: "form-remoto-frio",
    idPersistido: "uuid-persistido-frio",
    titulo: "Formulario Remoto en Frío",
    preguntas,
    origenDatos: "api" as const,
  };

  vi.spyOn(formulariosRemotos, "listar").mockResolvedValue([formRemoto]);

  const obtenido = await obtenerFormulario("form-remoto-frio");
  expect(obtenido.id).toBe("form-remoto-frio");
  // Verificar que el store fue hidratado
  expect(useFormulariosStore.getState().formularios).toEqual([formRemoto]);
});

test("obtenerFormulario recurre a formulariosRemotos.publico() si no está en listar (GAP-06)", async () => {
  useFormulariosStore.setState({ formularios: [] });
  const formPublico = {
    ...formularioVacio(),
    id: "form-publico-slug",
    titulo: "Formulario Público Ciudadano",
    preguntas,
    configuracion: {
      ...formularioVacio().configuracion,
      slug: "consulta-ciudadana-centro",
    },
    origenDatos: "api" as const,
  };

  vi.spyOn(formulariosRemotos, "listar").mockResolvedValue([]);
  vi.spyOn(formulariosRemotos, "publico").mockResolvedValue(formPublico);

  const obtenido = await obtenerFormulario("consulta-ciudadana-centro");
  expect(obtenido.configuracion.slug).toBe("consulta-ciudadana-centro");
  // Verificar que el store incluyó el formulario público
  expect(useFormulariosStore.getState().formularios).toContainEqual(formPublico);
});

test("obtenerFormulario arroja excepción si no se encuentra en store ni backend", async () => {
  useFormulariosStore.setState({ formularios: [] });
  vi.spyOn(formulariosRemotos, "listar").mockResolvedValue([]);
  vi.spyOn(formulariosRemotos, "publico").mockRejectedValue(new Error("No encontrado"));

  await expect(obtenerFormulario("inexistente-total")).rejects.toThrow("Formulario no encontrado.");
});

