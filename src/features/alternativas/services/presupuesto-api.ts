import { apiFetch } from "@/core/http/api-client";
import type {
  FuenteFinanciacion,
  AsignacionPresupuestal,
  AsignacionPresupuestalCrear,
  ResumenCosteo,
  KpisPresupuesto,
} from "../models/presupuesto";

/** Mapa rápido de fuentes para asociar nombres y códigos en normalización */
const FUENTES_MAP_DEFAULT = new Map<string, FuenteFinanciacion>();

export function normalizarFuente(item: Record<string, unknown>): FuenteFinanciacion {
  return {
    id: String(item.id ?? ""),
    codigo: String(item.codigo ?? "ICLD"),
    nombre: String(item.nombre ?? "Fuente sin denominación"),
    tipo_fuente: String(item.tipo_fuente ?? "RECURSOS_PROPIOS"),
    base_legal: String(item.base_legal ?? "Normativa Distrital"),
    descripcion: item.descripcion ? String(item.descripcion) : undefined,
    activa: Boolean(item.activa ?? true),
    metadatos: (item.metadatos as Record<string, unknown>) ?? {},
    creado_en: item.creado_en ? String(item.creado_en) : undefined,
    actualizado_en: item.actualizado_en ? String(item.actualizado_en) : undefined,
  };
}

export function normalizarAsignacion(
  item: Record<string, unknown>,
  fuentesMap: Map<string, FuenteFinanciacion> = FUENTES_MAP_DEFAULT
): AsignacionPresupuestal {
  const fuenteId = String(item.fuente_financiacion_id ?? "");
  const fuente = fuentesMap.get(fuenteId);

  const montoRaw = item.monto_estimado;
  const monto = typeof montoRaw === "number" ? montoRaw : Number(montoRaw ?? 0);

  return {
    id: String(item.id ?? `asig-${Date.now()}`),
    fuente_financiacion_id: fuenteId,
    fuente_nombre: fuente?.nombre ?? (item.fuente_nombre ? String(item.fuente_nombre) : "Fuente Distrital"),
    fuente_codigo: fuente?.codigo ?? (item.fuente_codigo ? String(item.fuente_codigo) : "DIST"),
    linea_estrategica_id: item.linea_estrategica_id ? String(item.linea_estrategica_id) : null,
    nodo_instrumento_id: item.nodo_instrumento_id ? String(item.nodo_instrumento_id) : null,
    monto_estimado: isNaN(monto) ? 0 : monto,
    anio_vigencia: Number(item.anio_vigencia ?? 2026),
    es_vigencia_futura: Boolean(item.es_vigencia_futura ?? false),
    tipo_vigencia_futura: item.tipo_vigencia_futura
      ? (String(item.tipo_vigencia_futura) as AsignacionPresupuestal["tipo_vigencia_futura"])
      : null,
    codigo_bpin: item.codigo_bpin ? String(item.codigo_bpin) : null,
    justificacion: String(item.justificacion ?? ""),
    metadatos: (item.metadatos as AsignacionPresupuestal["metadatos"]) ?? {},
    creado_en: item.creado_en ? String(item.creado_en) : undefined,
    actualizado_en: item.actualizado_en ? String(item.actualizado_en) : undefined,
  };
}

/**
 * Consulta el catálogo de fuentes de financiación oficiales desde el backend FastAPI
 * (/api/v1/presupuesto/fuentes). Backend es la fuente de verdad (H-04).
 */
export async function listarFuentesFinanciacion(): Promise<FuenteFinanciacion[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/presupuesto/fuentes");
  if (Array.isArray(raw)) {
    return raw.map(normalizarFuente);
  }
  return [];
}

/**
 * Lista las asignaciones presupuestales vigentes desde el backend FastAPI
 * (/api/v1/presupuesto/asignaciones). Backend es la fuente de verdad (H-04).
 */
export async function listarAsignacionesPresupuestales(): Promise<AsignacionPresupuestal[]> {
  const fuentes = await listarFuentesFinanciacion();
  const fuentesMap = new Map(fuentes.map((f) => [f.id, f]));

  const raw = await apiFetch<Record<string, unknown>[]>("/presupuesto/asignaciones");
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizarAsignacion(item, fuentesMap));
  }
  return [];
}

/**
 * Obtiene el resumen consolidado de costeo por fuente y vigencia
 * (/api/v1/presupuesto/resumen-costeo). Erradicado fallback calculado sobre datos estáticos (H-04).
 */
export async function obtenerResumenCosteo(): Promise<ResumenCosteo> {
  const raw = await apiFetch<Record<string, unknown>>("/presupuesto/resumen-costeo");
  if (raw && raw.total_asignado !== undefined) {
    return {
      total_asignado: Number(raw.total_asignado),
      por_fuente: Array.isArray(raw.por_fuente)
        ? (raw.por_fuente as Array<{ fuente: string; total: number }>)
        : [],
      por_vigencia: Array.isArray(raw.por_vigencia)
        ? (raw.por_vigencia as Array<{ vigencia: number; total: number }>)
        : [],
    };
  }
  throw new Error("Respuesta inválida al consultar resumen de costeo");
}

/**
 * Registra una nueva asignación presupuestal en el backend FastAPI
 * (/api/v1/presupuesto/asignaciones). Erradicada creación simulada en memoria (H-04).
 */
export async function crearAsignacionPresupuestal(
  datos: AsignacionPresupuestalCrear
): Promise<AsignacionPresupuestal> {
  const res = await apiFetch<Record<string, unknown>>("/presupuesto/asignaciones", {
    method: "POST",
    body: {
      fuente_financiacion_id: datos.fuente_financiacion_id,
      linea_estrategica_id: datos.linea_estrategica_id ?? null,
      nodo_instrumento_id: datos.nodo_instrumento_id ?? null,
      monto_estimado: datos.monto_estimado,
      anio_vigencia: datos.anio_vigencia,
      es_vigencia_futura: datos.es_vigencia_futura,
      tipo_vigencia_futura: datos.tipo_vigencia_futura ?? null,
      codigo_bpin: datos.codigo_bpin ?? null,
      justificacion: datos.justificacion,
      metadatos: datos.metadatos ?? {},
    },
  });

  return normalizarAsignacion(res);
}

/**
 * Calcula los indicadores KPI del tablero presupuestal distrital
 */
export function calcularKpisPresupuesto(
  asignaciones: AsignacionPresupuestal[]
): KpisPresupuesto {
  let totalAsignado = 0;
  let totalFonset = 0;
  let totalSgpSgr = 0;
  let totalVigenciasFuturas = 0;

  for (const asig of asignaciones) {
    const monto = typeof asig.monto_estimado === "number"
      ? asig.monto_estimado
      : Number(asig.monto_estimado ?? 0);

    totalAsignado += monto;

    const cod = asig.fuente_codigo?.toUpperCase() ?? "";
    const fid = asig.fuente_financiacion_id;

    if (cod === "FONSET" || fid === "01a0f7ce-31fe-791b-8076-412a21d6544f") {
      totalFonset += monto;
    } else if (
      cod.includes("SGP") ||
      cod.includes("SGR") ||
      fid === "01a0f7ce-3200-7f51-9005-b10e3532f9d7" ||
      fid === "01a0f7ce-3200-76be-b76f-27fade529af2"
    ) {
      totalSgpSgr += monto;
    }

    if (asig.es_vigencia_futura) {
      totalVigenciasFuturas += monto;
    }
  }

  return {
    totalAsignado,
    totalFonset,
    totalSgpSgr,
    totalVigenciasFuturas,
    conteoAsignaciones: asignaciones.length,
  };
}

/**
 * Función auxiliar para calcular el resumen de costeo en ausencia de backend
 */
export function calcularResumenDesdeAsignaciones(
  asignaciones: AsignacionPresupuestal[]
): ResumenCosteo {
  let totalGeneral = 0;
  const mapaFuentes: Record<string, number> = {};
  const mapaVigencias: Record<number, number> = {};

  for (const asig of asignaciones) {
    const monto = typeof asig.monto_estimado === "number"
      ? asig.monto_estimado
      : Number(asig.monto_estimado ?? 0);

    totalGeneral += monto;

    const nombreFuente = asig.fuente_nombre ?? "Otras Fuentes";
    mapaFuentes[nombreFuente] = (mapaFuentes[nombreFuente] ?? 0) + monto;

    const anio = asig.anio_vigencia ?? 2026;
    mapaVigencias[anio] = (mapaVigencias[anio] ?? 0) + monto;
  }

  return {
    total_asignado: totalGeneral,
    por_fuente: Object.entries(mapaFuentes).map(([fuente, total]) => ({
      fuente,
      total,
    })),
    por_vigencia: Object.entries(mapaVigencias).map(([vigencia, total]) => ({
      vigencia: Number(vigencia),
      total,
    })),
  };
}
