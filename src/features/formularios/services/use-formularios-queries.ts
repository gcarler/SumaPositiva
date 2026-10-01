import { useSesionStore } from "@/features/sesion/state/session-store";
import type { DatosRespuesta } from "../state/formularios-store";
import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFormulariosStore } from "../state/formularios-store";
import {
  crearFormulario,
  actualizarFormulario,
  enviarRespuesta,
} from "./formularios-api";
import type { DatosFormulario } from "../models/formulario";
import { calcularAnalitica } from "./formulario-analitica";
export const FORMULARIOS_KEYS = {
  all: ["formularios"] as const,
  detail: (id: string) => ["formularios", id] as const,
  analitica: (id: string) => ["formularios", "analitica", id] as const,
};
export function useFormularios() {
  const data = useFormulariosStore((s) => s.formularios);
  return { data, isLoading: false, error: null };
}
export function useFormularioDetalle(id: string) {
  const data = useFormulariosStore((s) =>
    s.formularios.find((f) => f.id === id),
  );
  return {
    data,
    isLoading: false,
    error: id && !data ? new Error("Formulario no encontrado.") : null,
  };
}
export function useFormularioAnalitica(id: string) {
  const { data: form, error } = useFormularioDetalle(id);
  const respuestas = useFormulariosStore((s) => s.respuestas);
  const data = useMemo(
    () => (form ? calcularAnalitica(form, respuestas) : undefined),
    [form, respuestas],
  );
  return { data, isLoading: false, error };
}
export function useGuardarFormulario() {
  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: DatosFormulario }) =>
      id ? actualizarFormulario(id, datos) : crearFormulario(datos),
  });
}
export function useEnviarRespuesta() {
  return useMutation({
    mutationFn: (datos: DatosRespuesta) => {
      const sesion = useSesionStore.getState().sesion;
      const autenticado =
        !!sesion?.usuarioId &&
        !!sesion.token &&
        !!sesion.expiraEn &&
        Date.parse(sesion.expiraEn) > Date.now();
      return enviarRespuesta({ ...datos, autenticado });
    },
  });
}
