import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  FichaIndicador,
  MedicionIndicadorCrear,
  MedicionIndicadorRespuesta,
} from "../models/indicador";
import { INDICADORES_FALLBACK } from "../data/indicadores-fallback.data";

export function normalizarFicha(item: Record<string, unknown>): FichaIndicador {
  return {
    id: String(item.id ?? ""),
    codigo: String(item.codigo ?? ""),
    nombre: String(item.nombre ?? ""),
    tipo_indicador: (item.tipo_indicador as FichaIndicador["tipo_indicador"]) ?? "resultado",
    linea_estrategica_id: item.linea_estrategica_id ? String(item.linea_estrategica_id) : null,
    dimension_id: item.dimension_id ? String(item.dimension_id) : null,
    nodo_instrumento_id: item.nodo_instrumento_id ? String(item.nodo_instrumento_id) : null,
    definicion: String(item.definicion ?? ""),
    metodo_calculo: String(item.metodo_calculo ?? ""),
    unidad_medida: String(item.unidad_medida ?? ""),
    sentido_esperado: (item.sentido_esperado as FichaIndicador["sentido_esperado"]) ?? "ascendente",
    periodicidad: String(item.periodicidad ?? "Anual"),
    linea_base_valor: item.linea_base_valor !== undefined ? String(item.linea_base_valor) : "0",
    linea_base_anio: Number(item.linea_base_anio ?? 2023),
    meta_cuatrienio: item.meta_cuatrienio !== undefined ? String(item.meta_cuatrienio) : "0",
    meta_anualizada: (item.meta_anualizada as Record<string, unknown>) ?? {},
    fuente_datos: String(item.fuente_datos ?? "Distrito de Cartagena"),
    responsable_reporte: String(item.responsable_reporte ?? "Secretaría del Interior"),
    metadatos: (item.metadatos as Record<string, unknown>) ?? {},
    valor_actual: item.valor_actual !== undefined ? String(item.valor_actual) : "0",
    porcentaje_avance: item.porcentaje_avance !== undefined ? String(item.porcentaje_avance) : "0",
    creado_en: item.creado_en ? String(item.creado_en) : undefined,
    actualizado_en: item.actualizado_en ? String(item.actualizado_en) : undefined,
  };
}

export async function listarFichasIndicadores(): Promise<FichaIndicador[]> {
  try {
    const raw = await apiFetch<Record<string, unknown>[]>("/indicadores/fichas");
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(normalizarFicha);
    }
    return INDICADORES_FALLBACK;
  } catch (error) {
    console.warn("Fallo al consultar /api/v1/indicadores/fichas, utilizando catálogo fallback:", error);
    return INDICADORES_FALLBACK;
  }
}

export async function obtenerFichaIndicador(id: string): Promise<FichaIndicador | undefined> {
  try {
    const raw = await apiFetch<Record<string, unknown>>(`/indicadores/fichas/${id}`);
    if (raw && raw.id) {
      return normalizarFicha(raw);
    }
  } catch (error) {
    console.warn(`Fallo al consultar ficha ${id}:`, error);
  }
  return INDICADORES_FALLBACK.find((f) => f.id === id);
}

export async function registrarMedicionIndicador(
  fichaId: string,
  datos: MedicionIndicadorCrear
): Promise<MedicionIndicadorRespuesta> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return await apiFetch<MedicionIndicadorRespuesta>(
    `/indicadores/fichas/${fichaId}/mediciones`,
    {
      method: "POST",
      body: datos,
      headers,
    }
  );
}
