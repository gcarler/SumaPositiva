/**
 * POLIS — Servicios de API para Políticas Públicas, Fases y Líneas Estratégicas
 * Conectado a los endpoints FastAPI (/api/v1/politicas).
 */

import { apiFetch } from "@/core/http/api-client";
import type { PoliticaPublica } from "@/features/politicas/models/politicas";

export interface DimensionApi {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  color_hex: string;
  icono: string;
  orden: number;
  activa: boolean;
  metadatos?: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
}

export interface FasePoliticaApi {
  id: string;
  orden: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  progreso_porcentaje: number | string;
  fecha_inicio?: string | null;
  fecha_cierre?: string | null;
  reglas_participacion?: Record<string, unknown>;
  metadatos?: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
}

export interface LineaEstrategicaApi {
  id: string;
  fase_id: string;
  dimension_id?: string | null;
  codigo: string;
  titulo: string;
  descripcion: string;
  problema_abordado?: string | null;
  objetivo_especifico?: string | null;
  costo_estimado: number | string;
  fuentes_financiacion: string[];
  entidad_lider: string;
  entidades_coresponsables?: string[];
  orden?: number;
  activa: boolean;
  metadatos?: Record<string, unknown>;
  creado_en?: string;
  actualizado_en?: string;
}

/**
 * Consulta las 7 dimensiones canónicas de la Seguridad Humana (ONU).
 */
export async function listarDimensiones(): Promise<DimensionApi[]> {
  try {
    return await apiFetch<DimensionApi[]>("/politicas/dimensiones");
  } catch {
    // Retorno de contingencia si el subenrutador aún no expone la ruta pública
    return [];
  }
}

/**
 * Consulta las fases configuradas del ciclo de política pública.
 */
export async function listarFases(): Promise<FasePoliticaApi[]> {
  try {
    return await apiFetch<FasePoliticaApi[]>("/politicas/fases");
  } catch {
    return [];
  }
}

/**
 * Consulta las líneas estratégicas activas desde FastAPI.
 */
export async function listarLineas(): Promise<LineaEstrategicaApi[]> {
  try {
    return await apiFetch<LineaEstrategicaApi[]>("/politicas/lineas");
  } catch {
    return [];
  }
}

/**
 * Consulta el catálogo de políticas públicas vigentes.
 */
export async function listarPoliticas(): Promise<PoliticaPublica[]> {
  try {
    return await apiFetch<PoliticaPublica[]>("/politicas");
  } catch {
    return [];
  }
}
