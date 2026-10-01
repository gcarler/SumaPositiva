"use client";
import { create } from "zustand";
import type {
  DatosFormulario,
  Formulario,
  RespuestaCiudadana,
} from "../models/formulario";
import { FORMULARIOS_MOCK, RESPUESTAS_MOCK } from "../data/formularios.mock";
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
// DEMO: datos en RAM. Integrar FastAPI /api/v1/formularios, /{id}/respuestas y /{id}/analitica
// mediante services/formularios-api.ts para persistir en bd_csh, adaptando DTOs y permisos.
export const useFormulariosStore = create<FormulariosState>((set, get) => ({
  ...copia(),
  identidadAnonima: "anonimo-demo",
  crearFormulario: (datos) => {
    const ahora = new Date().toISOString();
    const form: Formulario = {
      ...structuredClone(datos),
      id: crypto.randomUUID(),
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
      id: anterior?.id ?? crypto.randomUUID(),
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
