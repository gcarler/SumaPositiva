import { useQuery } from "@tanstack/react-query";

import {
  obtenerCatalogoIndicadores,
  type FiltrosCatalogoIndicadores,
} from "./indicadores-catalogo-api";

export const clavesCatalogoIndicadores = {
  todo: ["indicadores", "catalogo"] as const,
  lista: (filtros: FiltrosCatalogoIndicadores) =>
    [
      "indicadores",
      "catalogo",
      filtros.dimension ?? "todas",
      filtros.tier ?? "todos",
      filtros.busqueda ?? "",
    ] as const,
};

export function useCatalogoIndicadores(filtros: FiltrosCatalogoIndicadores = {}) {
  return useQuery({
    queryKey: clavesCatalogoIndicadores.lista(filtros),
    queryFn: () => obtenerCatalogoIndicadores(filtros),
    staleTime: 60_000,
    retry: 1,
  });
}
