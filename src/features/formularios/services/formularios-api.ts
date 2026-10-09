import { v4 as uuid } from "uuid";
import { formulariosRemotos } from "./formularios-remotos";
import { generarSlug, urlFormulario } from "./formulario-url";
import { validarFormulario } from "./formulario-engine";
/** Transporte persistente. Nunca se sustituye un fallo de API por datos locales. */
import {
  useFormulariosStore,
  type DatosRespuesta,
} from "../state/formularios-store";
import type { DatosFormulario, Formulario } from "../models/formulario";
import { calcularAnalitica } from "./formulario-analitica";
export async function listarFormularios() {
  return formulariosRemotos.listar();
}
export async function obtenerFormulario(id: string) {
  const store = useFormulariosStore.getState();
  const coincidenciaLocal = store.formularios.find(
    (f) => f.id === id || f.idPersistido === id || f.configuracion.slug === id
  );
  if (coincidenciaLocal) return coincidenciaLocal;

  // Resiliencia en frío (GAP-06): consultar backend e hidratar store
  try {
    const remotos = await formulariosRemotos.listar();
    if (Array.isArray(remotos) && remotos.length > 0) {
      useFormulariosStore.setState({ formularios: remotos });
      const coincidenciaRemota = remotos.find(
        (f) => f.id === id || f.idPersistido === id || f.configuracion.slug === id
      );
      if (coincidenciaRemota) return coincidenciaRemota;
    }
  } catch {
    // Si falla listar, intentar fallback de formulario público/individual
  }

  // Fallback: resolver formulario público o por slug
  try {
    const publico = await formulariosRemotos.publico(id);
    if (publico) {
      useFormulariosStore.setState((s) => ({
        formularios: s.formularios.some((f) => f.id === publico.id)
          ? s.formularios
          : [...s.formularios, publico],
      }));
      return publico;
    }
  } catch {
    // Si tampoco resuelve público, arrojar excepción definitiva
  }

  throw new Error("Formulario no encontrado.");
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
  return calcularAnalitica(
    form,
    await formulariosRemotos.respuestas(id, form.idPersistido),
  );
}
export async function enviarRespuesta(data: DatosRespuesta) {
  const form = await obtenerFormulario(data.formularioId);
  await formulariosRemotos.enviar(
    form,
    data.respuestas,
    data.enfoqueDiferencial,
  );
}

export async function eliminarFormulario(id: string) {
  const form = await obtenerFormulario(id);
  await formulariosRemotos.eliminar(form.idPersistido ?? id);
  useFormulariosStore.getState().eliminarFormulario(id);
}
