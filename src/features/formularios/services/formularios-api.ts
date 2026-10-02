import { v4 as uuid } from "uuid";
import { formulariosRemotos } from "./formularios-remotos";
import { generarSlug, urlFormulario } from "./formulario-url";
import { validarFormulario } from "./formulario-engine";
/** Ejemplos aislados y transporte persistente. Nunca se sustituye un fallo de API por mocks. */
import {
  useFormulariosStore,
  type DatosRespuesta,
} from "../state/formularios-store";
import type { DatosFormulario, Formulario } from "../models/formulario";
import { calcularAnalitica } from "./formulario-analitica";
export async function listarFormularios() {
  return useFormulariosStore.getState().formularios;
}
export async function obtenerFormulario(id: string) {
  const form = useFormulariosStore
    .getState()
    .formularios.find((f) => f.id === id);
  if (!form) throw new Error("Formulario no encontrado.");
  return form;
}
export async function crearFormulario(data: DatosFormulario) {
  const slug = generarSlug(data.titulo);
  const ahora = new Date().toISOString();
  const form: Formulario = {
    ...structuredClone(data),
    id: uuid(),
    configuracion: {
      ...data.configuracion,
      slug,
      urlPublica: urlFormulario(slug),
    },
    respuestasCount: 0,
    creadoEn: ahora,
    actualizadoEn: ahora,
    origenDatos: "api",
  };
  if (form.estado === "activo" && form.configuracion.requiereAutenticacion)
    throw new Error(
      "Los formularios publicados son públicos: desactiva el requisito de autenticación.",
    );
  const errores = validarFormulario(form);
  if (errores.length) throw new Error(errores.join(" "));
  const guardado = await formulariosRemotos.crear(form);
  useFormulariosStore.setState((s) => ({
    formularios: [...s.formularios, guardado],
  }));
  return guardado;
}
export async function actualizarFormulario(
  id: string,
  data: Partial<Formulario>,
) {
  const actual = await obtenerFormulario(id);
  if (actual.origenDatos !== "api") {
    useFormulariosStore.getState().actualizarFormulario(id, data);
    return obtenerFormulario(id);
  }
  const siguiente = {
    ...actual,
    ...structuredClone(data),
    id: actual.id,
    configuracion: {
      ...actual.configuracion,
      ...data.configuracion,
      slug: actual.configuracion.slug,
      urlPublica: actual.configuracion.urlPublica,
    },
  };
  if (
    siguiente.estado === "activo" &&
    siguiente.configuracion.requiereAutenticacion
  )
    throw new Error(
      "Los formularios publicados son públicos: desactiva el requisito de autenticación.",
    );
  const errores = validarFormulario(siguiente);
  if (errores.length) throw new Error(errores.join(" "));
  const guardado = await formulariosRemotos.actualizar(siguiente);
  useFormulariosStore.setState((s) => ({
    formularios: s.formularios.map((f) => (f.id === id ? guardado : f)),
  }));
  return guardado;
}
export async function obtenerAnalitica(id: string) {
  const form = await obtenerFormulario(id);
  return calcularAnalitica(form, useFormulariosStore.getState().respuestas);
}
export async function enviarRespuesta(data: DatosRespuesta) {
  const form = await obtenerFormulario(data.formularioId);
  if (form.origenDatos === "api") {
    await formulariosRemotos.enviar(
      form,
      data.respuestas,
      data.enfoqueDiferencial,
    );
    return;
  }
  useFormulariosStore.getState().enviarRespuesta(data);
}

export async function eliminarFormulario(id: string) {
  const form = await obtenerFormulario(id);
  if (form.origenDatos === "api") await formulariosRemotos.eliminar(id);
  useFormulariosStore.getState().eliminarFormulario(id);
}
