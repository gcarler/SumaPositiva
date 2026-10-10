import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type { ActorEstrategico, ContactoActor, KpisActores } from "../models/actor";

export function normalizarActor(item: Record<string, unknown>): ActorEstrategico {
  const contactoRaw = (item.contacto as Record<string, unknown>) ?? {};
  const contacto: ContactoActor = {
    organizacion: String(contactoRaw.organizacion ?? item.nombre ?? "Organización Comunitaria"),
    cargo: String(contactoRaw.cargo ?? "Vocero Delegado"),
    nombreLider: contactoRaw.nombre_lider ? String(contactoRaw.nombre_lider) : undefined,
    telefono: contactoRaw.telefono ? String(contactoRaw.telefono) : undefined,
    email: contactoRaw.email ? String(contactoRaw.email) : undefined,
    direccion: contactoRaw.direccion ? String(contactoRaw.direccion) : undefined,
  };

  return {
    id: String(item.id ?? ""),
    codigo: String(item.codigo ?? ""),
    nombre: String(item.nombre ?? ""),
    tipo: (item.tipo as ActorEstrategico["tipo"]) ?? "comunitario",
    territorio: (item.territorio as ActorEstrategico["territorio"]) ?? "distrital",
    barrioVereda: item.barrio_vereda ? String(item.barrio_vereda) : undefined,
    dimensionesPrincipales: Array.isArray(item.dimensiones_principales)
      ? (item.dimensiones_principales as string[])
      : [],
    nivelPoder: (item.nivel_poder as ActorEstrategico["nivelPoder"]) ?? "medio",
    nivelInteres: (item.nivel_interes as ActorEstrategico["nivelInteres"]) ?? "alto",
    postura: (item.postura as ActorEstrategico["postura"]) ?? "promotor_aliado",
    contacto,
    mesasAsistidas: Array.isArray(item.mesas_asistidas)
      ? (item.mesas_asistidas as string[])
      : [],
    propuestasRadicadas: Number(item.propuestas_radicadas ?? 0),
    expectativasPrincipales: String(item.expectativas_principales ?? ""),
    accionesInvolucramiento: String(item.acciones_involucramiento ?? ""),
    es_demostracion: Boolean(item.es_demostracion),
    actualizadoEn: String(item.actualizado_en ?? new Date().toISOString()),
  };
}

export async function listarActoresApi(params?: {
  tipo?: string;
  territorio?: string;
  buscar?: string;
  es_demostracion?: boolean;
}): Promise<ActorEstrategico[]> {
  const query = new URLSearchParams();
  if (params?.tipo) query.set("tipo", params.tipo);
  if (params?.territorio) query.set("territorio", params.territorio);
  if (params?.buscar) query.set("buscar", params.buscar);
  if (params?.es_demostracion !== undefined) query.set("es_demostracion", String(params.es_demostracion));

  const qs = query.toString();
  const endpoint = qs ? `/actores?${qs}` : "/actores";
  const res = await apiFetch<Record<string, unknown>[]>(endpoint);
  if (Array.isArray(res)) {
    return res.map(normalizarActor);
  }
  return [];
}

export async function crearActorApi(
  actor: Omit<ActorEstrategico, "id" | "actualizadoEn">
): Promise<ActorEstrategico> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const payload = {
    codigo: actor.codigo,
    nombre: actor.nombre,
    tipo: actor.tipo,
    territorio: actor.territorio,
    barrio_vereda: actor.barrioVereda ?? null,
    dimensiones_principales: actor.dimensionesPrincipales,
    nivel_poder: actor.nivelPoder,
    nivel_interes: actor.nivelInteres,
    postura: actor.postura,
    contacto: {
      organizacion: actor.contacto.organizacion,
      cargo: actor.contacto.cargo,
      ...(actor.contacto.nombreLider ? { nombre_lider: actor.contacto.nombreLider } : {}),
      ...(actor.contacto.telefono ? { telefono: actor.contacto.telefono } : {}),
      ...(actor.contacto.email ? { email: actor.contacto.email } : {}),
      ...(actor.contacto.direccion ? { direccion: actor.contacto.direccion } : {}),
    },
    mesas_asistidas: actor.mesasAsistidas ?? [],
    propuestas_radicadas: actor.propuestasRadicadas ?? 0,
    expectativas_principales: actor.expectativasPrincipales,
    acciones_involucramiento: actor.accionesInvolucramiento,
    es_demostracion: Boolean(actor.es_demostracion),
  };

  const res = await apiFetch<Record<string, unknown>>("/actores", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return normalizarActor(res);
}

export async function actualizarActorApi(
  id: string,
  cambios: Partial<ActorEstrategico>
): Promise<ActorEstrategico> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const payload: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) payload.nombre = cambios.nombre;
  if (cambios.tipo !== undefined) payload.tipo = cambios.tipo;
  if (cambios.territorio !== undefined) payload.territorio = cambios.territorio;
  if (cambios.barrioVereda !== undefined) payload.barrio_vereda = cambios.barrioVereda;
  if (cambios.dimensionesPrincipales !== undefined) payload.dimensiones_principales = cambios.dimensionesPrincipales;
  if (cambios.nivelPoder !== undefined) payload.nivel_poder = cambios.nivelPoder;
  if (cambios.nivelInteres !== undefined) payload.nivel_interes = cambios.nivelInteres;
  if (cambios.postura !== undefined) payload.postura = cambios.postura;
  if (cambios.propuestasRadicadas !== undefined) payload.propuestas_radicadas = cambios.propuestasRadicadas;
  if (cambios.expectativasPrincipales !== undefined) payload.expectativas_principales = cambios.expectativasPrincipales;
  if (cambios.accionesInvolucramiento !== undefined) payload.acciones_involucramiento = cambios.accionesInvolucramiento;
  if (cambios.contacto !== undefined) {
    payload.contacto = {
      organizacion: cambios.contacto.organizacion,
      cargo: cambios.contacto.cargo,
      ...(cambios.contacto.nombreLider ? { nombre_lider: cambios.contacto.nombreLider } : {}),
      ...(cambios.contacto.telefono ? { telefono: cambios.contacto.telefono } : {}),
      ...(cambios.contacto.email ? { email: cambios.contacto.email } : {}),
      ...(cambios.contacto.direccion ? { direccion: cambios.contacto.direccion } : {}),
    };
  }

  const res = await apiFetch<Record<string, unknown>>(`/actores/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  return normalizarActor(res);
}

export async function eliminarActorApi(id: string): Promise<void> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  await apiFetch(`/actores/${id}`, {
    method: "DELETE",
    headers,
  });
}

export async function obtenerKpisActoresApi(): Promise<KpisActores> {
  const res = await apiFetch<KpisActores>("/actores/kpis");
  return {
    total_actores: Number(res.total_actores ?? 0),
    por_tipo: res.por_tipo ?? {},
    por_territorio: res.por_territorio ?? {},
    por_postura: res.por_postura ?? {},
    actores_demostracion: Number(res.actores_demostracion ?? 0),
  };
}
