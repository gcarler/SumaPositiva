import { formulariosRemotos } from "./formularios-remotos";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type { DatosRespuesta } from "../state/formularios-store";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormulariosStore } from "../state/formularios-store";
import {
  crearFormulario,
  actualizarFormulario,
  enviarRespuesta,
  obtenerAnaliticaFormulario,
} from "./formularios-api";
import type { DatosFormulario } from "../models/formulario";

export const FORMULARIOS_KEYS = {
  all: ["formularios"] as const,
  detail: (id: string) => ["formularios", id] as const,
  analitica: (id: string) => ["formularios", "analitica", id] as const,
};
export function useFormularios() {
  const data = useFormulariosStore((s) => s.formularios);
  const sesion = useSesionStore((s) => s.sesion);
  const remoto = useQuery({
    queryKey: FORMULARIOS_KEYS.all,
    queryFn: formulariosRemotos.listar,
    enabled: !!sesion?.usuarioId,
  });
  useEffect(() => {
    if (remoto.data)
      useFormulariosStore.setState(() => ({
        formularios: remoto.data!,
      }));
  }, [remoto.data]);
  return { data, isLoading: remoto.isFetching, error: remoto.error };
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
  const remoto = useQuery({
    queryKey: FORMULARIOS_KEYS.analitica(id),
    queryFn: () => obtenerAnaliticaFormulario(id),
    enabled: !!form,
  });
  return { data: remoto.data, isLoading: remoto.isFetching, error: error ?? remoto.error };
}
export function useGuardarFormulario() {
  const cache = useQueryClient();
  return useMutation({
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: FORMULARIOS_KEYS.all }),
    mutationFn: ({ id, datos }: { id?: string; datos: DatosFormulario }) =>
      id ? actualizarFormulario(id, datos) : crearFormulario(datos),
  });
}
export function useEnviarRespuesta() {
  const cache = useQueryClient();
  return useMutation({
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: FORMULARIOS_KEYS.all }),
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
