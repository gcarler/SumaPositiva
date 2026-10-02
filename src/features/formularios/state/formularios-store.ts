"use client";
import { create } from "zustand";
import type { Formulario, RespuestaCiudadana } from "../models/formulario";
export type DatosRespuesta = Omit<RespuestaCiudadana, "id" | "enviadoEn"> & {
  autenticado?: boolean;
};
interface FormulariosState {
  formularios: Formulario[];
  respuestas: RespuestaCiudadana[];
  previews: Record<string, Formulario>;
  eliminarFormulario: (id: string) => void;
  ponerPreview: (id: string, form: Formulario) => void;
}
// Caché de datos confirmados por FastAPI/PostgreSQL. La vista previa nunca envía respuestas.
export const useFormulariosStore = create<FormulariosState>((set) => ({
  formularios: [],
  respuestas: [],
  previews: {},
  eliminarFormulario: (id) =>
    set((s) => ({
      formularios: s.formularios.filter((f) => f.id !== id),
      respuestas: s.respuestas.filter((r) => r.formularioId !== id),
    })),
  ponerPreview: (id, form) =>
    set((s) => ({ previews: { ...s.previews, [id]: structuredClone(form) } })),
}));
