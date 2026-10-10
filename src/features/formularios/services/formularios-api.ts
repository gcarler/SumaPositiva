import { v4 as uuid } from "uuid";
import { formulariosRemotos } from "./formularios-remotos";
import { generarSlug, urlFormulario } from "./formulario-url";
import { esInformativa, validarFormulario } from "./formulario-engine";
/** Transporte persistente. Nunca se sustituye un fallo de API por datos locales. */
import {
  useFormulariosStore,
  type DatosRespuesta,
} from "../state/formularios-store";
import type {
  DatosFormulario,
  Formulario,
  AnaliticaFormulario,
  RespuestaAnalitica,
} from "../models/formulario";
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
export async function obtenerAnaliticaFormulario(id: string): Promise<AnaliticaFormulario> {
  const form = await obtenerFormulario(id);
  const targetId = form.idPersistido ?? form.id;

  try {
    const res = await formulariosRemotos.analitica(targetId);
    if (res && typeof res.total_respuestas === "number" && res.total_respuestas > 0) {
      const enfoqueMap: Record<string, number> = {};
      const rawEnfoque = (res.desglose_enfoque_diferencial as Record<string, unknown>) ?? {};
      for (const [dimension, subValores] of Object.entries(rawEnfoque)) {
        if (typeof subValores === "object" && subValores !== null) {
          for (const [subk, count] of Object.entries(subValores as Record<string, number>)) {
            if (typeof count === "number" && count > 0) {
              enfoqueMap[`${dimension}: ${subk}`] = count;
            }
          }
        }
      }

      const respuestasPorPregunta: RespuestaAnalitica[] = form.preguntas
        .filter((p) => !esInformativa(p))
        .map((p) => {
          const tab = (res.tabulacion_preguntas?.[p.id] as Record<string, unknown>) ?? {};
          const conteo = (tab.conteo as Record<string, number>) ?? {};
          return {
            preguntaId: p.id,
            total: typeof tab.total === "number" ? tab.total : res.total_respuestas,
            conteo,
            promedio: typeof tab.promedio === "number" ? tab.promedio : undefined,
            minimo: typeof tab.minimo === "number" ? tab.minimo : undefined,
            maximo: typeof tab.maximo === "number" ? tab.maximo : undefined,
            ultimas: Array.isArray(tab.ultimas) ? (tab.ultimas as string[]) : [],
          };
        });

      return {
        formularioId: form.id,
        totalRespuestas: res.total_respuestas,
        porEnfoqueDiferencial:
          Object.keys(enfoqueMap).length > 0
            ? enfoqueMap
            : { "Comunidad General": res.total_respuestas },
        respuestasPorPregunta,
      };
    }
  } catch (err) {
    console.warn(`Aviso: analítica de servidor no disponible para ${id}, usando cálculo determinista:`, err);
  }

  // Fallback determinista cliente
  const respuestas = await formulariosRemotos.respuestas(id, form.idPersistido);
  return calcularAnalitica(form, respuestas);
}

export const obtenerAnalitica = obtenerAnaliticaFormulario;

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
