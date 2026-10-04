import { apiFetch } from "@/core/http/api-client";
import {
  type AmbitoFuente,
  type EstadoEntrega,
  type FuenteInformacion,
  type ResponsableContacto,
  type TipoFuente,
} from "../models/fuente";

export interface FuenteBackendResponse {
  id: string;
  codigo: string;
  entidad: string;
  nombre_fuente?: string;
  nombreFuente?: string;
  tipo?: string;
  ambito?: string;
  dimension_seguridad?: string;
  dimensionSeguridad?: string;
  periodicidad?: string;
  radicado_solicitud?: string | null;
  radicadoSolicitud?: string | null;
  fecha_solicitud?: string | null;
  fechaSolicitud?: string | null;
  fecha_limite_respuesta?: string | null;
  fechaLimiteRespuesta?: string | null;
  estado_entrega?: string;
  estadoEntrega?: string;
  variables_solicitadas?: string[];
  variablesSolicitadas?: string[];
  resumen_datos?: string | null;
  datosEntregadosResumen?: string | null;
  archivo_adjunto_url?: string | null;
  archivoAdjuntoUrl?: string | null;
  responsable_contacto?: ResponsableContacto;
  responsableContacto?: ResponsableContacto;
  observaciones_calidad?: string | null;
  observacionesCalidad?: string | null;
  actualizado_por?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  actualizadoEn?: string;
}

export interface KpisFuentesBackend {
  total: number;
  entregadas: number;
  en_termino: number;
  incompletas: number;
  vencidas: number;
  requerimiento_insistencia: number;
  atencion_critica: number;
  porcentaje_cumplimiento: number;
}

export function normalizarFuenteBackend(raw: FuenteBackendResponse): FuenteInformacion {
  const tipo = (raw.tipo || "secundaria") as TipoFuente;
  const ambito = (raw.ambito || "local") as AmbitoFuente;
  const estadoEntrega = (raw.estado_entrega || raw.estadoEntrega || "en_termino") as EstadoEntrega;
  const periodicidad = (raw.periodicidad || "mensual") as FuenteInformacion["periodicidad"];

  return {
    id: raw.id,
    codigo: raw.codigo,
    entidad: raw.entidad,
    nombreFuente: raw.nombre_fuente || raw.nombreFuente || raw.codigo,
    tipo,
    ambito,
    dimensionSeguridad: raw.dimension_seguridad || raw.dimensionSeguridad || "personal",
    periodicidad,
    radicadoSolicitud: raw.radicado_solicitud || raw.radicadoSolicitud || undefined,
    fechaSolicitud: raw.fecha_solicitud || raw.fechaSolicitud || undefined,
    fechaLimiteRespuesta: raw.fecha_limite_respuesta || raw.fechaLimiteRespuesta || undefined,
    estadoEntrega,
    variablesSolicitadas: raw.variables_solicitadas || raw.variablesSolicitadas || [],
    datosEntregadosResumen: raw.resumen_datos || raw.datosEntregadosResumen || undefined,
    archivoAdjuntoUrl: raw.archivo_adjunto_url || raw.archivoAdjuntoUrl || undefined,
    responsableContacto: raw.responsable_contacto || raw.responsableContacto || undefined,
    observacionesCalidad: raw.observaciones_calidad || raw.observacionesCalidad || undefined,
    actualizadoEn: raw.actualizado_en || raw.actualizadoEn || new Date().toISOString(),
  };
}

/**
 * Consulta el catálogo de fuentes oficiales de información en PostgreSQL.
 * Backend es la fuente de verdad (FastAPI /api/v1/fuentes). Erradicado fallback silencioso (H-04).
 */
export async function listarFuentes(filtros?: {
  ambito?: string;
  estado?: string;
  dimension?: string;
  tipo?: string;
  busqueda?: string;
}): Promise<FuenteInformacion[]> {
  const params = new URLSearchParams();
  if (filtros?.ambito && filtros.ambito !== "todos") params.set("ambito", filtros.ambito);
  if (filtros?.estado && filtros.estado !== "todos") params.set("estado", filtros.estado);
  if (filtros?.dimension && filtros.dimension !== "todas") params.set("dimension", filtros.dimension);
  if (filtros?.tipo && filtros.tipo !== "todos") params.set("tipo", filtros.tipo);
  if (filtros?.busqueda) params.set("buscar", filtros.busqueda.trim());

  const query = params.toString() ? `?${params.toString()}` : "";
  const resp = await apiFetch<FuenteBackendResponse[]>(`/fuentes${query}`);
  if (Array.isArray(resp)) {
    return resp.map(normalizarFuenteBackend);
  }
  return [];
}

/**
 * Obtiene el detalle de una fuente por su ID desde PostgreSQL.
 * Erradicado fallback silencioso (H-04).
 */
export async function obtenerFuente(fuenteId: string): Promise<FuenteInformacion> {
  const resp = await apiFetch<FuenteBackendResponse>(`/fuentes/${fuenteId}`);
  if (resp && resp.id) {
    return normalizarFuenteBackend(resp);
  }
  throw new Error(`Fuente ${fuenteId} no encontrada`);
}

/**
 * Consulta las métricas y KPIs de cumplimiento de fuentes en backend.
 * Erradicado fallback calculado en cliente (H-04).
 */
export async function obtenerKpisFuentes(): Promise<KpisFuentesBackend> {
  const resp = await apiFetch<KpisFuentesBackend>("/fuentes/kpis");
  if (resp && typeof resp.total === "number") {
    return resp;
  }
  throw new Error("No fue posible obtener los KPIs de fuentes desde el servidor");
}

/**
 * Radica una nueva solicitud oficial de información (POST /api/v1/fuentes).
 */
export async function crearFuenteRemota(
  datos: Omit<FuenteInformacion, "id" | "actualizadoEn"> & { id?: string }
): Promise<FuenteInformacion> {
  const body = {
    id: datos.id,
    codigo: datos.codigo,
    entidad: datos.entidad,
    nombre_fuente: datos.nombreFuente,
    tipo: datos.tipo,
    ambito: datos.ambito,
    dimension_seguridad: datos.dimensionSeguridad,
    periodicidad: datos.periodicidad,
    radicado_solicitud: datos.radicadoSolicitud,
    fecha_solicitud: datos.fechaSolicitud,
    fecha_limite_respuesta: datos.fechaLimiteRespuesta,
    estado_entrega: datos.estadoEntrega,
    variables_solicitadas: datos.variablesSolicitadas,
    resumen_datos: datos.datosEntregadosResumen,
    archivo_adjunto_url: datos.archivoAdjuntoUrl,
    responsable_contacto: datos.responsableContacto,
    observaciones_calidad: datos.observacionesCalidad,
  };

  const resp = await apiFetch<FuenteBackendResponse>("/fuentes", {
    method: "POST",
    body,
  });
  return normalizarFuenteBackend(resp);
}

/**
 * Actualiza los datos de radicado, respuesta o estado de una fuente (PATCH /api/v1/fuentes/{id}).
 */
export async function actualizarFuenteRemota(
  fuenteId: string,
  datos: Partial<FuenteInformacion>
): Promise<FuenteInformacion> {
  const body: Record<string, unknown> = {};

  if (datos.codigo !== undefined) body.codigo = datos.codigo;
  if (datos.entidad !== undefined) body.entidad = datos.entidad;
  if (datos.nombreFuente !== undefined) body.nombre_fuente = datos.nombreFuente;
  if (datos.tipo !== undefined) body.tipo = datos.tipo;
  if (datos.ambito !== undefined) body.ambito = datos.ambito;
  if (datos.dimensionSeguridad !== undefined) body.dimension_seguridad = datos.dimensionSeguridad;
  if (datos.periodicidad !== undefined) body.periodicidad = datos.periodicidad;
  if (datos.radicadoSolicitud !== undefined) body.radicado_solicitud = datos.radicadoSolicitud;
  if (datos.fechaSolicitud !== undefined) body.fecha_solicitud = datos.fechaSolicitud;
  if (datos.fechaLimiteRespuesta !== undefined) body.fecha_limite_respuesta = datos.fechaLimiteRespuesta;
  if (datos.estadoEntrega !== undefined) body.estado_entrega = datos.estadoEntrega;
  if (datos.variablesSolicitadas !== undefined) body.variables_solicitadas = datos.variablesSolicitadas;
  if (datos.datosEntregadosResumen !== undefined) body.resumen_datos = datos.datosEntregadosResumen;
  if (datos.archivoAdjuntoUrl !== undefined) body.archivo_adjunto_url = datos.archivoAdjuntoUrl;
  if (datos.responsableContacto !== undefined) body.responsable_contacto = datos.responsableContacto;
  if (datos.observacionesCalidad !== undefined) body.observaciones_calidad = datos.observacionesCalidad;

  const resp = await apiFetch<FuenteBackendResponse>(`/fuentes/${fuenteId}`, {
    method: "PATCH",
    body,
  });
  return normalizarFuenteBackend(resp);
}

/**
 * Elimina una fuente de información de la base oficial (DELETE /api/v1/fuentes/{id}).
 */
export async function eliminarFuenteRemota(fuenteId: string): Promise<void> {
  await apiFetch<void>(`/fuentes/${fuenteId}`, {
    method: "DELETE",
  });
}
