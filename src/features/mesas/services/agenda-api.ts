import { apiFetch } from "@/core/http/api-client";
import {
  AGENDA_MESAS,
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
    lugar: raw.lugar || "Lugar por definir",
    fecha: raw.fecha ? String(raw.fecha).slice(0, 10) : "2026-10-15",
    horaInicio: raw.hora_inicio || raw.horaInicio || "08:30",
    horaFin: raw.hora_fin || raw.horaFin || "12:00",
    estado,
    dimensionesONU: dimensiones,
    responsable: raw.responsable ?? undefined,
    observaciones: raw.observaciones ?? undefined,
  };
}

/**
 * Consulta el cronograma completo de agendas de mesas desde PostgreSQL.
 * Fallback a AGENDA_MESAS si la API no responde.
 */
export async function listarAgendas(filtros?: {
  tipo?: string;
  estado?: string;
  fecha?: string;
}): Promise<MesaAgenda[]> {
  try {
    const params = new URLSearchParams();
    if (filtros?.tipo) params.set("tipo", filtros.tipo);
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.fecha) params.set("fecha", filtros.fecha);

    const query = params.toString() ? `?${params.toString()}` : "";
    const resp = await apiFetch<AgendaBackendResponse[]>(`/mesas/agendas${query}`);
    if (Array.isArray(resp) && resp.length > 0) {
      return resp.map(normalizarAgendaBackend);
    }
  } catch {
    // Fallback transparente
  }
  return AGENDA_MESAS;
}

/**
 * Consulta el detalle de una mesa de la agenda por su ID.
 */
export async function obtenerAgenda(agendaId: string): Promise<MesaAgenda> {
  try {
    const resp = await apiFetch<AgendaBackendResponse>(`/mesas/agendas/${agendaId}`);
    if (resp && resp.id) {
      return normalizarAgendaBackend(resp);
    }
  } catch {
    // Fallback
  }
  const estatica = AGENDA_MESAS.find((m) => m.id === agendaId);
  if (estatica) return estatica;
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
