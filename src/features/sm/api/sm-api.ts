/**
 * Cliente HTTP tipado para el subsistema SM Core.
 * Conecta con los endpoints administrativos de `/api/v1/sm/*`.
 *
 * No hay datos simulados: si la API falla, el error se propaga para que la
 * interfaz muestre el estado real y nunca anuncie un envío inexistente.
 */

import { apiFetch } from "@/core/http/api-client";
import type {
  SMConsentimientoIn,
  SMEventoIn,
  SMFiltrosMensajes,
  SMMensaje,
  SMResumenProcesamiento,
  SMSalud,
} from "../models/sm-types";

export async function obtenerSaludSM(): Promise<SMSalud> {
  return await apiFetch<SMSalud>("/sm/health");
}

export async function listarMensajesSM(
  filtros: SMFiltrosMensajes = {}
): Promise<SMMensaje[]> {
  const params = new URLSearchParams();
  if (filtros.canal && filtros.canal !== "todos") {
    params.set("canal", filtros.canal);
  }
  if (filtros.estado && filtros.estado !== "todos") {
    params.set("estado", filtros.estado);
  }
  if (filtros.limite) {
    params.set("limite", String(filtros.limite));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return await apiFetch<SMMensaje[]>(`/sm/messages${query}`);
}

export async function ejecutarWorkerSM(
  limite: number = 25
): Promise<SMResumenProcesamiento> {
  return await apiFetch<SMResumenProcesamiento>("/sm/worker/run-once", {
    method: "POST",
    body: { limite },
  });
}

export async function ingestarEventoSM(evento: SMEventoIn): Promise<SMMensaje> {
  return await apiFetch<SMMensaje>("/sm/events", {
    method: "POST",
    body: evento,
  });
}

export async function registrarConsentimientoSM(
  consentimiento: SMConsentimientoIn
): Promise<unknown> {
  return await apiFetch("/sm/consent", {
    method: "POST",
    body: consentimiento,
  });
}
