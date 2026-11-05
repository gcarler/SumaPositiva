import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/core/http/api-client";
import type { AnaliticaMultifuente, FiltrosAnaliticaMultifuente } from "../models/analitica-multifuente";
import { useGeovisorAnaliticaStore } from "../state/geovisor-analitica-store";

export function consultarAnaliticaMultifuente(
  filtros: FiltrosAnaliticaMultifuente,
  seleccion: { serieX: string | null; serieY: string | null; observacionId: string | null },
): Promise<AnaliticaMultifuente> {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  if (seleccion.serieX) parametros.set("serie_x", seleccion.serieX);
  if (seleccion.serieY) parametros.set("serie_y", seleccion.serieY);
  if (seleccion.observacionId) parametros.set("observacion_id", seleccion.observacionId);
  return apiFetch<AnaliticaMultifuente>(`/geodatos/analitica/multifuente?${parametros.toString()}`);
}

export function useAnaliticaMultifuente(habilitada = true) {
  const filtros = useGeovisorAnaliticaStore((s) => s.filtros);
  const serieX = useGeovisorAnaliticaStore((s) => s.serieX);
  const serieY = useGeovisorAnaliticaStore((s) => s.serieY);
  const observacionId = useGeovisorAnaliticaStore((s) => s.observacionId);
  return useQuery({
    queryKey: ["geovisor", "analitica-multifuente", filtros, serieX, serieY, observacionId],
    queryFn: () => consultarAnaliticaMultifuente(filtros, { serieX, serieY, observacionId }),
    enabled: habilitada,
    staleTime: 60_000,
    retry: 1,
  });
}
