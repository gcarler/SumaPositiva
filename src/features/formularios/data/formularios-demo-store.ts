"use client";
// Fixture exclusiva de pruebas y Storybook. No importar desde código de producto.
import { FORMULARIOS_MOCK, RESPUESTAS_MOCK } from "./formularios.mock";
import { generarSlug, urlFormulario } from "../services/formulario-url";
import { v4 as uuid } from "uuid";
import { create } from "zustand";
import type {
  DatosFormulario,
  Formulario,
  RespuestaCiudadana,
} from "../models/formulario";
import {
  motivoCierre,
  respuestasEfectivas,
  validarFormulario,
  validarRespuestas,
} from "../services/formulario-engine";
export type DatosRespuesta = Omit<RespuestaCiudadana, "id" | "enviadoEn"> & {
  autenticado?: boolean;
};
interface FormulariosState {
  formularios: Formulario[];
  respuestas: RespuestaCiudadana[];
  previews: Record<string, Formulario>;
  identidadAnonima: string;
  crearFormulario: (f: DatosFormulario) => Formulario;
  actualizarFormulario: (id: string, cambios: Partial<Formulario>) => void;
  eliminarFormulario: (id: string) => void;
  enviarRespuesta: (r: DatosRespuesta) => void;
  ponerPreview: (id: string, form: Formulario) => void;
  reiniciarDemo: () => void;
}
const copia = () => ({
  formularios: structuredClone(FORMULARIOS_MOCK),
  respuestas: structuredClone(RESPUESTAS_MOCK),
  previews: {},
});
const verificar = (form: Formulario) => {
  const errors = validarFormulario(form);
  if (errors.length) throw new Error(errors.join(" "));
};
// La vista previa es local. Todos los formularios del producto usan
// services/formularios-api.ts → FastAPI /constructor y /{id}/respuestas;
// este store mantiene la caché UI, no sustituye la persistencia de PostgreSQL.
export const useFormulariosDemoStore = create<FormulariosState>((set, get) => ({
  ...copia(),
  identidadAnonima: "anonimo-demo",
  crearFormulario: (datos) => {
    const ahora = new Date().toISOString();
    const slug = generarSlug(datos.titulo);
    const form: Formulario = {
      ...structuredClone(datos),
      configuracion: {
        ...structuredClone(datos.configuracion),
        slug,
        urlPublica: urlFormulario(slug),
      },
      origenDatos: "demo",
      id: uuid(),
      respuestasCount: 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    verificar(form);
    set((s) => ({ formularios: [...s.formularios, form] }));
    return form;
  },
  actualizarFormulario: (id, cambios) => {
    const actual = get().formularios.find((f) => f.id === id);
    if (!actual) throw new Error("Formulario no encontrado.");
    const siguiente = {
      ...actual,
      ...structuredClone(cambios),
      id: actual.id,
      configuracion: {
        ...actual.configuracion,
        ...cambios.configuracion,
        slug: actual.configuracion.slug,
        urlPublica: actual.configuracion.urlPublica,
      },
      creadoEn: actual.creadoEn,
      respuestasCount: actual.respuestasCount,
      actualizadoEn: new Date().toISOString(),
    };
    verificar(siguiente);
    set((s) => ({
      formularios: s.formularios.map((f) => (f.id === id ? siguiente : f)),
    }));
  },
  eliminarFormulario: (id) =>
    set((s) => ({
      formularios: s.formularios.filter((f) => f.id !== id),
      respuestas: s.respuestas.filter((r) => r.formularioId !== id),
    })),
  enviarRespuesta: (datos) => {
    const state = get();
    const form = state.formularios.find((f) => f.id === datos.formularioId);
    if (!form) throw new Error("Formulario no encontrado.");
    const anterior = state.respuestas.find(
      (r) => r.formularioId === form.id && r.sesionId === datos.sesionId,
    );
    const cierre = motivoCierre(form);
    if (
      cierre &&
      !(
        anterior &&
        form.configuracion.permitirEdicion &&
        cierre === "Se alcanzó el límite de respuestas."
      )
    )
      throw new Error(cierre);
    if (form.configuracion.requiereAutenticacion && !datos.autenticado)
      throw new Error("Inicia sesión para responder.");
    if (anterior && !form.configuracion.permitirEdicion)
      throw new Error("Ya respondiste este formulario en esta sesión.");
    const errors = validarRespuestas(form, datos.respuestas);
    if (Object.keys(errors).length)
      throw new Error(Object.values(errors).join(" "));
    const respuesta: RespuestaCiudadana = {
      id: anterior?.id ?? uuid(),
      formularioId: form.id,
      sesionId: datos.sesionId,
      respuestas: structuredClone(respuestasEfectivas(form, datos.respuestas)),
      enfoqueDiferencial: datos.enfoqueDiferencial,
      enviadoEn: new Date().toISOString(),
    };
    set((s) => ({
      respuestas: anterior
        ? s.respuestas.map((r) => (r.id === anterior.id ? respuesta : r))
        : [...s.respuestas, respuesta],
      formularios: s.formularios.map((f) =>
        f.id === form.id
          ? { ...f, respuestasCount: f.respuestasCount + (anterior ? 0 : 1) }
          : f,
      ),
    }));
  },
  ponerPreview: (id, form) =>
    set((s) => ({ previews: { ...s.previews, [id]: structuredClone(form) } })),
  reiniciarDemo: () => set({ ...copia(), identidadAnonima: "anonimo-demo" }),
}));
