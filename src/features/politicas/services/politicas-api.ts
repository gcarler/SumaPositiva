/**
 * POLIS — Servicios de API para Políticas Públicas, Fases y Líneas Estratégicas
 * Conectado a los endpoints FastAPI (/api/v1/politicas).
 */

import { apiFetch, ApiError } from "@/core/http/api-client";
import type { PoliticaPublica } from "@/features/politicas/models/politicas";

export interface FaseControlApi {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  progreso_porcentaje: number;
  habilitada_web: boolean;
  total_lineas?: number;
  orden?: number;
}

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

/**
 * Consulta las fases para el panel de control.
 * Intenta primero /politicas/fases/control (requiere politicas:gestionar).
 * Si no está disponible o falta permiso, consulta /politicas/fases pública.
 * PROHIBICIÓN: No retornar nunca catálogos hardcodeados inventados (AUD-04).
 */
export async function listarFasesControlApi(): Promise<FaseControlApi[]> {
  try {
    return await apiFetch<FaseControlApi[]>("/politicas/fases/control");
  } catch (errControl) {
    try {
      const publicas = await apiFetch<FasePoliticaApi[]>("/politicas/fases");
      if (Array.isArray(publicas) && publicas.length > 0) {
        return publicas.map((f) => ({
          id: f.id,
          codigo: f.codigo,
          nombre: f.nombre,
          estado: f.estado,
          progreso_porcentaje: Number(f.progreso_porcentaje) || 0,
          habilitada_web: Boolean(
            (f.reglas_participacion as { habilitada_web?: boolean } | undefined)
              ?.habilitada_web ?? (f.estado === "activa")
          ),
          orden: f.orden,
        }));
      }
      return [];
    } catch {
      throw errControl;
    }
  }
}

/**
 * Conmuta el interruptor maestro de participación web o estado de una fase DNP.
 * Requiere rol de Autoridad Distrital (politicas:gestionar).
 * Lanza ApiError sin enmascaramiento silencioso.
 */
export async function conmutarFaseApi(
  id: string,
  habilitadaWeb: boolean,
  motivo?: string
): Promise<FaseControlApi> {
  return await apiFetch<FaseControlApi>(`/politicas/fases/${id}/conmutar`, {
    method: "PATCH",
    body: {
      habilitada_web: habilitadaWeb,
      motivo:
        motivo ??
        `Conmutación de participación web a ${habilitadaWeb ? "abierta" : "cerrada"}`,
    },
  });
}

/**
 * Clasifica pericialmente el error HTTP recibido de la API de control de fases
 * distinguiendo 401 (sin sesión), 403 (permiso insuficiente), 404 (no encontrada),
 * 422 (validación), 5xx (servidor) y fallas de conexión (AUD-04).
 */
export function clasificarErrorConmutacion(err: unknown): {
  codigo: number | string;
  titulo: string;
  descripcion: string;
} {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return {
        codigo: 401,
        titulo: "Sesión no iniciada o expirada (401)",
        descripcion:
          "Inicie sesión con una cuenta autorizada para conmutar fases del ciclo.",
      };
    }
    if (err.status === 403) {
      return {
        codigo: 403,
        titulo: "Permisos insuficientes (403)",
        descripcion:
          "Se requiere el rol de Autoridad Distrital (politicas:gestionar) para conmutar la fase.",
      };
    }
    if (err.status === 404) {
      return {
        codigo: 404,
        titulo: "Fase no encontrada (404)",
        descripcion:
          "La fase especificada no existe en la base de datos de planeación distrital.",
      };
    }
    if (err.status === 422) {
      const detalle =
        typeof err.detail === "object" && err.detail !== null && "detail" in err.detail
          ? String((err.detail as Record<string, unknown>).detail)
          : typeof err.detail === "string"
            ? err.detail
            : "Los parámetros de conmutación no son válidos.";
      return {
        codigo: 422,
        titulo: "Parámetros inválidos (422)",
        descripcion: detalle,
      };
    }
    if (err.status >= 500) {
      return {
        codigo: err.status,
        titulo: `Error interno del servidor (${err.status})`,
        descripcion:
          "El servidor distrital no pudo procesar la conmutación de la fase. Intente nuevamente más tarde.",
      };
    }
    return {
      codigo: err.status,
      titulo: `Error de operación (${err.status})`,
      descripcion:
        err.message || "No fue posible persistir el cambio en el servidor.",
    };
  }
  if (err instanceof Error) {
    return {
      codigo: "CLIENT_ERROR",
      titulo: "Error de operación",
      descripcion: err.message,
    };
  }
  return {
    codigo: "NETWORK_ERROR",
    titulo: "Error de conexión",
    descripcion:
      "No se pudo comunicar con el servidor central para persistir el cambio.",
  };
}
