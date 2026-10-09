/**
 * POLIS — Servicio de Integración de Asistencia en Mesas Presenciales con PostgreSQL
 * Conecta la planilla digital en puerta con /api/v1/mesas/{mesa_id}/participantes
 * Cumplimiento: Ley Estatutaria 1757 de 2015 y Sentencia C-150 de 2015.
 */

import { apiFetch } from "@/core/http/api-client";
import type {
  RegistroAsistencia,
  TipoDocumento,
  Genero,
  EnfoqueDiferencial,
} from "../models/asistencia";

export type NuevoAsistenteInput = Omit<RegistroAsistencia, "id" | "horaRegistro">;

export interface ParticipanteRespuesta {
  id: string;
  mesa_id: string;
  sujeto_id: string;
  usuario_id?: string | null;
  nombre_completo: string;
  rol_en_mesa: string;
  organizacion_comunitaria?: string | null;
  asistencia_confirmada: boolean;
  hora_ingreso: string;
  metadatos?: {
    tipo_documento?: string;
    numero_documento?: string;
    genero?: string;
    enfoque_diferencial?: string;
    organizacion_o_barrio?: string;
    telefono_whatsapp?: string | null;
    correo?: string | null;
    submesa_asignada?: string | null;
    [key: string]: unknown;
  };
}

export interface ParticipanteCrearPayload {
  sujeto_id: string;
  usuario_id?: string | null;
  nombre_completo: string;
  rol_en_mesa: string;
  organizacion_comunitaria?: string | null;
  asistencia_confirmada: boolean;
  metadatos: {
    tipo_documento: string;
    numero_documento: string;
    genero: string;
    enfoque_diferencial: string;
    organizacion_o_barrio: string;
    telefono_whatsapp?: string | null;
    correo?: string | null;
    submesa_asignada?: string | null;
    [key: string]: unknown;
  };
}

export function construirPayloadParticipante(datos: NuevoAsistenteInput): ParticipanteCrearPayload {
  const docLimpio = datos.numeroDocumento.trim().replace(/\s+/g, "");
  const sujetoId = `doc:${datos.tipoDocumento}:${docLimpio}`;

  return {
    sujeto_id: sujetoId,
    nombre_completo: datos.nombreCompleto.trim(),
    rol_en_mesa: "ciudadano",
    organizacion_comunitaria: datos.organizacionOBarrio.trim(),
    asistencia_confirmada: true,
    metadatos: {
      tipo_documento: datos.tipoDocumento,
      numero_documento: datos.numeroDocumento.trim(),
      genero: datos.genero,
      enfoque_diferencial: datos.enfoqueDiferencial,
      organizacion_o_barrio: datos.organizacionOBarrio.trim(),
      telefono_whatsapp: datos.telefonoWhatsApp?.trim() || null,
      correo: datos.correo?.trim() || null,
      submesa_asignada: datos.subMesaAsignada?.trim() || null,
    },
  };
}

export function mapearParticipanteARegistro(
  p: ParticipanteRespuesta,
  mesaIdFallback?: string
): RegistroAsistencia {
  const meta = p.metadatos || {};
  return {
    id: p.id,
    mesaId: p.mesa_id || mesaIdFallback || "",
    nombreCompleto: p.nombre_completo,
    tipoDocumento: (meta.tipo_documento as TipoDocumento) || "CC",
    numeroDocumento:
      (meta.numero_documento as string) ||
      (p.sujeto_id.startsWith("doc:") ? p.sujeto_id.split(":")[2] || p.sujeto_id : p.sujeto_id),
    genero: (meta.genero as Genero) || "mujer",
    enfoqueDiferencial: (meta.enfoque_diferencial as EnfoqueDiferencial) || "ninguno",
    organizacionOBarrio: p.organizacion_comunitaria || (meta.organizacion_o_barrio as string) || "",
    telefonoWhatsApp: (meta.telefono_whatsapp as string) || undefined,
    correo: (meta.correo as string) || undefined,
    subMesaAsignada: (meta.submesa_asignada as string) || undefined,
    horaRegistro: p.hora_ingreso,
    pendienteSincronizacion: false,
    sincronizadoEn: new Date().toISOString(),
  };
}

/**
 * Registra un asistente presencial en PostgreSQL llamando a POST /api/v1/mesas/{mesaId}/participantes
 */
export async function registrarAsistenteMesa(
  mesaId: string,
  datos: NuevoAsistenteInput
): Promise<ParticipanteRespuesta> {
  const payload = construirPayloadParticipante(datos);
  return await apiFetch<ParticipanteRespuesta>(`/mesas/${encodeURIComponent(mesaId)}/participantes`, {
    method: "POST",
    body: payload,
  });
}

/**
 * Lista los asistentes confirmados en PostgreSQL para una mesa específica
 */
export async function listarAsistentesMesa(mesaId: string): Promise<ParticipanteRespuesta[]> {
  return await apiFetch<ParticipanteRespuesta[]>(`/mesas/${encodeURIComponent(mesaId)}/participantes`);
}
