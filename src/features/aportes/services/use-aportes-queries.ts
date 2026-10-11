/**
 * POLIS — Hooks reactivos de TanStack Query para Aportes Ciudadanos y Sesión
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  alternarApoyoAporte,
  asegurarSesionActiva,
  crearAporte,
  listarAportes,
  obtenerMisApoyos,
  respaldarAporte,
} from "./aportes-api";
import type {
  FiltrosAportes,
  MisApoyosRespuesta,
  PropuestaCiudadanaCreate,
  PropuestaCiudadanaRead,
  PropuestasPaginadasRead,
  RespuestaToggleApoyo,
  SesionAnonimaRespuesta,
} from "./aportes-api";

export type {
  FiltrosAportes,
  MisApoyosRespuesta,
  PropuestaCiudadanaCreate,
  PropuestaCiudadanaRead,
  PropuestasPaginadasRead,
  RespuestaToggleApoyo,
  SesionAnonimaRespuesta,
};

export const APORTES_QUERY_KEY = ["aportes"] as const;
export const SESION_QUERY_KEY = ["sesion-activa"] as const;
export const MIS_APOYOS_QUERY_KEY = ["mis-apoyos"] as const;

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
 * Hook reactivo para consultar las propuestas respaldadas por la sesión actual.
 */
export function useMisApoyos(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: MIS_APOYOS_QUERY_KEY,
    queryFn: obtenerMisApoyos,
    staleTime: 1000 * 60, // 1 minuto
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
 * Mantenido por retrocompatibilidad.
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
      queryClient.invalidateQueries({ queryKey: MIS_APOYOS_QUERY_KEY });
    },
  });
}

/**
 * Hook de mutación para alternar el respaldo ciudadano (apoyar / des-apoyar)
 * con mutación optimista instantánea tanto sobre ['mis-apoyos'] como sobre ['aportes'].
 */
export function useToggleApoyo(): UseMutationResult<
  RespuestaToggleApoyo,
  Error,
  string,
  {
    previousMisApoyos?: string[];
    previousAportes?: [readonly unknown[], PropuestasPaginadasRead | undefined][];
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aporteId: string) => alternarApoyoAporte(aporteId),
    onMutate: async (aporteId: string) => {
      // 1. Cancelar queries salientes para evitar colisiones
      await queryClient.cancelQueries({ queryKey: MIS_APOYOS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: APORTES_QUERY_KEY });

      // 2. Snapshot del estado previo de mis-apoyos
      const previousMisApoyos =
        queryClient.getQueryData<string[]>(MIS_APOYOS_QUERY_KEY) ?? [];
      const yaApoyado = previousMisApoyos.includes(aporteId);

      // 3. Mutación optimista en ['mis-apoyos']
      queryClient.setQueryData<string[]>(MIS_APOYOS_QUERY_KEY, (prev = []) => {
        return yaApoyado
          ? prev.filter((id) => id !== aporteId)
          : [...prev, aporteId];
      });

      // 4. Snapshot y mutación optimista en todas las queries de ['aportes']
      const previousAportes = queryClient.getQueriesData<PropuestasPaginadasRead>({
        queryKey: APORTES_QUERY_KEY,
      });

      queryClient.setQueriesData<PropuestasPaginadasRead>(
        { queryKey: APORTES_QUERY_KEY },
        (old) => {
          if (!old?.elementos) return old;
          const delta = yaApoyado ? -1 : 1;
          return {
            ...old,
            elementos: old.elementos.map((el) => {
              if (el.id !== aporteId) return el;
              return {
                ...el,
                apoyos_contador: Math.max(0, (el.apoyos_contador ?? 0) + delta),
              };
            }),
          };
        }
      );

      return { previousMisApoyos, previousAportes };
    },
    onError: (_err, _aporteId, context) => {
      // Rollback a snapshots previos en caso de error
      if (context?.previousMisApoyos) {
        queryClient.setQueryData(MIS_APOYOS_QUERY_KEY, context.previousMisApoyos);
      }
      if (context?.previousAportes) {
        context.previousAportes.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      // Re-sincronizar con el backend
      queryClient.invalidateQueries({ queryKey: MIS_APOYOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: APORTES_QUERY_KEY });
    },
  });
}
