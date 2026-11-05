import { apiFetch } from "@/core/http/api-client";

export interface CatalogoIndicador {
  codigo: string;
  nombre: string;
  dimension: string;
  definicion: string;
  formula: string;
  numerador: string;
  denominador: string;
  unidad: string;
  tipo_territorio_fuente: string;
  periodicidad: string;
  tipo_periodo: string;
  fuente: string;
  url_fuente: string;
  custodio: string;
  licencia: string;
  anio_base: string;
  interpretacion: string;
  riesgo_metodologico: string;
  tier: string;
  estado: string;
}

export interface CatalogoIndicadoresRespuesta {
  total: number;
  archivo_sha256: string;
  indicadores: CatalogoIndicador[];
}

export interface FiltrosCatalogoIndicadores {
  dimension?: string;
  tier?: string;
  busqueda?: string;
}

export async function obtenerCatalogoIndicadores(
  filtros?: FiltrosCatalogoIndicadores,
): Promise<CatalogoIndicadoresRespuesta> {
  const params = new URLSearchParams();
  if (filtros?.dimension) params.append("dimension", filtros.dimension);
  if (filtros?.tier) params.append("tier", filtros.tier);
  if (filtros?.busqueda) params.append("busqueda", filtros.busqueda);
  const query = params.toString();
  return apiFetch<CatalogoIndicadoresRespuesta>(
    `/indicadores/catalogo${query ? `?${query}` : ""}`,
  );
}
