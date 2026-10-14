/**
 * POLIS — Hooks reactivos de TanStack Query para Políticas Públicas, Fases y Líneas
 */

import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  listarDimensiones,
  listarFases,
  listarLineas,
  listarPoliticas,
} from "./politicas-api";
import type {
  DimensionApi,
  FasePoliticaApi,
  LineaEstrategicaApi,
} from "./politicas-api";
import type { PoliticaPublica } from "@/features/politicas/models/politicas";

export const POLITICAS_QUERY_KEYS = {
  todas: ["politicas"] as const,
  dimensiones: ["politicas", "dimensiones"] as const,
  fases: ["politicas", "fases"] as const,
  lineas: ["politicas", "lineas"] as const,
};

export function useDimensiones(): UseQueryResult<DimensionApi[], Error> {
  return useQuery({
    queryKey: POLITICAS_QUERY_KEYS.dimensiones,
    queryFn: listarDimensiones,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useFases(): UseQueryResult<FasePoliticaApi[], Error> {
  return useQuery({
    queryKey: POLITICAS_QUERY_KEYS.fases,
    queryFn: listarFases,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLineas(): UseQueryResult<LineaEstrategicaApi[], Error> {
  return useQuery({
    queryKey: POLITICAS_QUERY_KEYS.lineas,
    queryFn: listarLineas,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCatalogoPoliticas(): UseQueryResult<PoliticaPublica[], Error> {
  return useQuery({
    queryKey: POLITICAS_QUERY_KEYS.todas,
    queryFn: listarPoliticas,
    staleTime: 1000 * 60 * 5,
  });
}

/** Alias para useCatalogoPoliticas exigido por la arquitectura */
export const usePoliticas = useCatalogoPoliticas;
