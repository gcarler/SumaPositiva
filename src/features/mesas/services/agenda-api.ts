import { apiFetch } from "@/core/http/api-client";
import {
  type MesaAgenda,
  type TipoMesa,
  type EstadoMesa,
} from "@/features/mesas/data/agenda.data";

export interface AgendaBackendResponse {
  id: string;
  tipo: string;
  nombre: string;
  territorio?: string;
  lugar: string;
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  horaInicio?: string;
  horaFin?: string;
  estado: string;
  dimensiones_onu?: string[];
  dimensionesONU?: string[];
  responsable?: string | null;
  observaciones?: string | null;
  mesa_id?: string | null;
  creado_en?: string;
  actualizado_en?: string;
}

export function normalizarAgendaBackend(raw: AgendaBackendResponse): MesaAgenda {
  const tipo = (raw.tipo || "territorial") as TipoMesa;
  const estado = (raw.estado || "programada").toLowerCase() as EstadoMesa;
  const dimensiones =
    raw.dimensiones_onu || raw.dimensionesONU || ["Seguridad Personal"];

  return {
    id: raw.id,
    tipo,
    nombre: raw.nombre,
    territorio: raw.territorio || "Distrito de Cartagena",
    lugar: raw.lugar || "Por definir",
    fecha: raw.fecha ? String(raw.fecha).slice(0, 10) : "Por definir",
    horaInicio: raw.hora_inicio || raw.horaInicio || "Por definir",
    horaFin: raw.hora_fin || raw.horaFin || "Por definir",
    estado,
    dimensionesONU: dimensiones,
    responsable: raw.responsable ?? undefined,
    observaciones: raw.observaciones ?? undefined,
    mesa_id: raw.mesa_id ?? undefined,
  };
}

/**
 * Consulta el cronograma completo de agendas de mesas desde PostgreSQL.
 * Backend es la fuente de verdad (FastAPI /api/v1/mesas/agendas). Erradicado fallback silencioso (H-04).
 */
export async function listarAgendas(filtros?: {
  tipo?: string;
  estado?: string;
  fecha?: string;
}): Promise<MesaAgenda[]> {
  const params = new URLSearchParams();
  if (filtros?.tipo) params.set("tipo", filtros.tipo);
  if (filtros?.estado) params.set("estado", filtros.estado);
  if (filtros?.fecha) params.set("fecha", filtros.fecha);

  const query = params.toString() ? `?${params.toString()}` : "";
  const resp = await apiFetch<AgendaBackendResponse[]>(`/mesas/agendas${query}`);
  if (Array.isArray(resp)) {
    return resp.map(normalizarAgendaBackend);
  }
  return [];
}

/**
 * Consulta el detalle de una mesa de la agenda por su ID.
 * Erradicado fallback silencioso a catálogo estático (H-04).
 */
export async function obtenerAgenda(agendaId: string): Promise<MesaAgenda> {
  const resp = await apiFetch<AgendaBackendResponse>(`/mesas/agendas/${agendaId}`);
  if (resp && resp.id) {
    return normalizarAgendaBackend(resp);
  }
  throw new Error(`Agenda ${agendaId} no encontrada`);
}

/**
 * Registra una nueva mesa sobrevenida en la agenda remota.
 */
export async function crearAgendaRemota(
  datos: Partial<MesaAgenda> & { nombre: string; lugar: string; fecha: string }
): Promise<MesaAgenda> {
  const body = {
    id: datos.id,
    tipo: datos.tipo || "territorial",
    nombre: datos.nombre,
    territorio: datos.territorio || "Distrito de Cartagena",
    lugar: datos.lugar,
    fecha: datos.fecha,
    hora_inicio: datos.horaInicio || "08:30",
    hora_fin: datos.horaFin || "12:00",
    estado: datos.estado || "programada",
    dimensiones_onu: datos.dimensionesONU || ["Seguridad Personal"],
    responsable: datos.responsable,
    observaciones: datos.observaciones,
  };

  const resp = await apiFetch<AgendaBackendResponse>("/mesas/agendas", {
    method: "POST",
    body,
  });
  return normalizarAgendaBackend(resp);
}

/**
 * Actualiza los datos o estado de programación de una mesa (PATCH /mesas/agendas/{id}).
 */
export async function actualizarAgendaRemota(
  agendaId: string,
  datos: Partial<MesaAgenda>
): Promise<MesaAgenda> {
  const body: Record<string, unknown> = {};

  if (datos.tipo !== undefined) body.tipo = datos.tipo;
  if (datos.nombre !== undefined) body.nombre = datos.nombre;
  if (datos.territorio !== undefined) body.territorio = datos.territorio;
  if (datos.lugar !== undefined) body.lugar = datos.lugar;
  if (datos.fecha !== undefined) body.fecha = datos.fecha;
  if (datos.horaInicio !== undefined) body.hora_inicio = datos.horaInicio;
  if (datos.horaFin !== undefined) body.hora_fin = datos.horaFin;
  if (datos.estado !== undefined) body.estado = datos.estado;
  if (datos.dimensionesONU !== undefined) body.dimensiones_onu = datos.dimensionesONU;
  if (datos.responsable !== undefined) body.responsable = datos.responsable;
  if (datos.observaciones !== undefined) body.observaciones = datos.observaciones;

  const resp = await apiFetch<AgendaBackendResponse>(`/mesas/agendas/${agendaId}`, {
    method: "PATCH",
    body,
  });
  return normalizarAgendaBackend(resp);
}
