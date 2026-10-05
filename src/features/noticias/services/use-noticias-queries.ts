import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NoticiaInput } from "../models/noticia";
import {
  actualizarNoticia,
  crearNoticia,
  eliminarNoticia,
  listarNoticiasGestion,
  listarNoticiasPublicas,
  obtenerNoticiaGestion,
  obtenerNoticiaPublica,
} from "./noticias-api";

export const NOTICIAS_KEYS = {
  all: ["noticias"] as const,
  publicas: ["noticias", "publicas"] as const,
  gestion: ["noticias", "gestion"] as const,
  detalle: (id: string) => ["noticias", "gestion", id] as const,
};

export function useNoticiasPublicas() {
  return useQuery({ queryKey: NOTICIAS_KEYS.publicas, queryFn: listarNoticiasPublicas });
}

export function useNoticiasGestion(enabled = true) {
  return useQuery({ queryKey: NOTICIAS_KEYS.gestion, queryFn: listarNoticiasGestion, enabled });
}

export function useNoticiaGestion(id: string, esEditor = true) {
  return useQuery({
    queryKey: NOTICIAS_KEYS.detalle(id),
    queryFn: () => esEditor ? obtenerNoticiaGestion(id) : obtenerNoticiaPublica(id),
    enabled: Boolean(id),
  });
}

export function useGuardarNoticia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: NoticiaInput }) =>
      id ? actualizarNoticia(id, datos) : crearNoticia(datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTICIAS_KEYS.all }),
  });
}

export function useEliminarNoticia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarNoticia,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTICIAS_KEYS.all }),
  });
}
