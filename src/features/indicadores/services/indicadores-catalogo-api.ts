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

/**
 * Valida estrictamente que una URL de fuente comience por el esquema seguro https://.
 * Si es NO_VERIFICADO o cualquier otro esquema, retorna false.
 */
export function esUrlHttpsSegura(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return url.trim().toLowerCase().startsWith("https://");
}

/**
 * Construye la URL canónica con parámetros de consulta para el catálogo de indicadores.
 * Omite filtros vacíos o valores comodín ('todas', 'todos').
 */
export function construirUrlCatalogoIndicadores(
  filtros?: FiltrosCatalogoIndicadores,
): string {
  const params = new URLSearchParams();
  if (filtros?.dimension && filtros.dimension !== "todas") {
    params.append("dimension", filtros.dimension);
  }
  if (filtros?.tier && filtros.tier !== "todos") {
    params.append("tier", filtros.tier);
  }
  if (filtros?.busqueda && filtros.busqueda.trim()) {
    params.append("busqueda", filtros.busqueda.trim());
  }
  const query = params.toString();
  return `/indicadores/catalogo${query ? `?${query}` : ""}`;
}

export async function obtenerCatalogoIndicadores(
  filtros?: FiltrosCatalogoIndicadores,
): Promise<CatalogoIndicadoresRespuesta> {
  const url = construirUrlCatalogoIndicadores(filtros);
  return apiFetch<CatalogoIndicadoresRespuesta>(url);
}
