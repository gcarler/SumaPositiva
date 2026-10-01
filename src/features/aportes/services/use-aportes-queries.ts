/**
 * POLIS — Hooks reactivos de TanStack Query para Aportes Ciudadanos y Sesión
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  asegurarSesionActiva,
  crearAporte,
  listarAportes,
  respaldarAporte,
} from "./aportes-api";
import type {
  FiltrosAportes,
  PropuestaCiudadanaCreate,
  PropuestaCiudadanaRead,
  PropuestasPaginadasRead,
  SesionAnonimaRespuesta,
} from "./aportes-api";

export type {
  FiltrosAportes,
  PropuestaCiudadanaCreate,
  PropuestaCiudadanaRead,
  PropuestasPaginadasRead,
  SesionAnonimaRespuesta,
};

export const APORTES_QUERY_KEY = ["aportes"] as const;
export const SESION_QUERY_KEY = ["sesion-activa"] as const;

/**
 * Hook para inicializar y mantener activa la sesión cívica anónima.
 */
export function useSesionAnonima(): UseQueryResult<string, Error> {
  return useQuery({
    queryKey: SESION_QUERY_KEY,
    queryFn: asegurarSesionActiva,
    staleTime: 1000 * 60 * 60, // 1 hora
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook reactivo para consultar aportes ciudadanos con filtros y paginación.
 */
export function useAportes(
  filtros: FiltrosAportes = {}
): UseQueryResult<PropuestasPaginadasRead, Error> {
  return useQuery({
    queryKey: [...APORTES_QUERY_KEY, filtros] as const,
    queryFn: () => listarAportes(filtros),
    staleTime: 1000 * 30, // 30 segundos
  });
}

/**
 * Hook de mutación para publicar un nuevo aporte con invalidación automática de caché.
 */
export function useCrearAporte(): UseMutationResult<
  PropuestaCiudadanaRead,
  Error,
  PropuestaCiudadanaCreate
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: PropuestaCiudadanaCreate) => crearAporte(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APORTES_QUERY_KEY });
    },
  });
}

/**
 * Hook de mutación para registrar un respaldo ciudadano (apoyo/voto).
 */
export function useRespaldarAporte(): UseMutationResult<
  PropuestaCiudadanaRead,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aporteId: string) => respaldarAporte(aporteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APORTES_QUERY_KEY });
    },
  });
}
