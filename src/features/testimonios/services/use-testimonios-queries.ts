import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearTestimonio,
  listarTestimoniosGestion,
  listarTestimoniosPublicos,
  moderarTestimonio,
  obtenerResumenTestimonios,
  obtenerTestimonioPorId,
} from "./testimonios-api";
import type {
  TestimonioCrearPeticion,
  TestimonioModeracionPeticion,
} from "../models/testimonio";

export const TESTIMONIOS_KEYS = {
  all: ["testimonios"] as const,
  publicos: (filtros?: { territorioId?: string | null; dimensionId?: string | null; destacados?: boolean }) =>
    ["testimonios", "publicos", filtros] as const,
  resumen: ["testimonios", "resumen"] as const,
  gestion: (filtros?: { estado?: string | null; territorioId?: string | null }) =>
    ["testimonios", "gestion", filtros] as const,
  detalle: (id: string) => ["testimonios", "detalle", id] as const,
};

export function useTestimoniosPublicos(filtros?: {
  territorioId?: string | null;
  dimensionId?: string | null;
  destacados?: boolean;
}) {
  return useQuery({
    queryKey: TESTIMONIOS_KEYS.publicos(filtros),
    queryFn: () => listarTestimoniosPublicos(filtros),
    staleTime: 1000 * 60 * 2,
  });
}

export function useResumenTestimonios() {
  return useQuery({
    queryKey: TESTIMONIOS_KEYS.resumen,
    queryFn: () => obtenerResumenTestimonios(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTestimonioDetalle(id: string) {
  return useQuery({
    queryKey: TESTIMONIOS_KEYS.detalle(id),
    queryFn: () => obtenerTestimonioPorId(id),
    enabled: Boolean(id),
  });
}

export function useTestimoniosGestion(filtros?: {
  estado?: string | null;
  territorioId?: string | null;
}) {
  return useQuery({
    queryKey: TESTIMONIOS_KEYS.gestion(filtros),
    queryFn: () => listarTestimoniosGestion(filtros),
    staleTime: 1000 * 30,
  });
}

export function useCrearTestimonio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: TestimonioCrearPeticion) => crearTestimonio(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TESTIMONIOS_KEYS.all });
    },
  });
}

export function useModerarTestimonio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      moderacion,
    }: {
      id: string;
      moderacion: TestimonioModeracionPeticion;
    }) => moderarTestimonio(id, moderacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TESTIMONIOS_KEYS.all });
    },
  });
}
