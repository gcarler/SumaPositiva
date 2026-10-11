/**
 * POLIS — Gestor de Sincronización Outbox en Segundo Plano
 * Resiliencia territorial para facilitadores en zonas rurales e insulares de Cartagena.
 * Cumple estrictamente con UI004 (shared es autocontenido y no importa features, core ni app).
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  listarPendientes,
  eliminarPendiente,
  registrarIntentoFallo,
  contarTotalPendientes,
  type AsistenciaPendiente,
  type PropuestaPendiente,
} from "./db";

export interface SyncResultado {
  asistenciasExitosas: number;
  propuestasExitosas: number;
  errores: number;
}

export type AsistenciaSyncHandler = (
  mesaId: string,
  datos: Record<string, unknown>
) => Promise<unknown>;

export type PropuestaSyncHandler = (
  payload: Record<string, unknown>
) => Promise<unknown>;

let customAsistenciaHandler: AsistenciaSyncHandler | null = null;
let customPropuestaHandler: PropuestaSyncHandler | null = null;

export function registrarSincronizadores(handlers: {
  asistencia?: AsistenciaSyncHandler;
  propuesta?: PropuestaSyncHandler;
}): void {
  if (handlers.asistencia) customAsistenciaHandler = handlers.asistencia;
  if (handlers.propuesta) customPropuestaHandler = handlers.propuesta;
}

let syncEnCurso = false;

function obtenerTokenSesion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("polis-sesion-v2");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.sesion?.token || null;
  } catch {
    return null;
  }
}

/**
 * Normaliza y despacha una asistencia pendiente a FastAPI (/api/v1/mesas/{id}/participantes).
 */
async function despacharAsistencia(item: AsistenciaPendiente): Promise<void> {
  if (customAsistenciaHandler) {
    await customAsistenciaHandler(item.mesaId, item.datos);
    return;
  }

  const d = item.datos as Record<string, unknown>;
  let body: Record<string, unknown> = d;

  if (!d.sujeto_id && (d.numeroDocumento || d.numero_documento)) {
    const tipoDoc = String(d.tipoDocumento || d.tipo_documento || "CC");
    const numDoc = String(d.numeroDocumento || d.numero_documento || "").trim().replace(/\s+/g, "");
    body = {
      sujeto_id: `doc:${tipoDoc}:${numDoc}`,
      nombre_completo: String(d.nombreCompleto || d.nombre_completo || "").trim(),
      rol_en_mesa: "ciudadano",
      organizacion_comunitaria:
        String(d.organizacionOBarrio || d.organizacion_o_barrio || "").trim() || null,
      asistencia_confirmada: true,
      metadatos: {
        tipo_documento: tipoDoc,
        numero_documento: numDoc,
        genero: d.genero || "mujer",
        enfoque_diferencial: d.enfoqueDiferencial || d.enfoque_diferencial || "ninguno",
        organizacion_o_barrio: d.organizacionOBarrio || d.organizacion_o_barrio || "",
        telefono_whatsapp: d.telefonoWhatsApp || d.telefono_whatsapp || null,
        correo: d.correo || null,
        submesa_asignada: d.subMesaAsignada || d.submesa_asignada || null,
      },
    };
  }

  const token = obtenerTokenSesion();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const apiBase =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "/api/v1";
  const res = await fetch(`${apiBase}/mesas/${encodeURIComponent(item.mesaId)}/participantes`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
  }
}

/**
 * Despacha una propuesta ciudadana pendiente a FastAPI (/api/v1/aportes).
 */
async function despacharPropuesta(item: PropuestaPendiente): Promise<void> {
  if (customPropuestaHandler) {
    await customPropuestaHandler(item.payload);
    return;
  }

  const token = obtenerTokenSesion();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const apiBase =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "/api/v1";
  const res = await fetch(`${apiBase}/aportes`, {
    method: "POST",
    headers,
    body: JSON.stringify(item.payload),
  });

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
  }
}

/**
 * Procesa la cola de IndexedDB enviando asistencias y propuestas pendientes a FastAPI.
 */
export async function sincronizarTodo(): Promise<SyncResultado> {
  if (syncEnCurso) {
    return { asistenciasExitosas: 0, propuestasExitosas: 0, errores: 0 };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { asistenciasExitosas: 0, propuestasExitosas: 0, errores: 0 };
  }

  syncEnCurso = true;
  let asistenciasExitosas = 0;
  let propuestasExitosas = 0;
  let errores = 0;

  try {
    // 1. Sincronizar Asistencias a Mesas
    const asistencias = await listarPendientes<AsistenciaPendiente>("asistencias_pendientes");
    for (const item of asistencias) {
      if (item.intentos >= 5) {
        continue; // Límite de reintentos de seguridad
      }
      try {
        await despacharAsistencia(item);
        await eliminarPendiente("asistencias_pendientes", item.id);
        asistenciasExitosas++;
      } catch (err) {
        errores++;
        const msg = err instanceof Error ? err.message : String(err);
        await registrarIntentoFallo("asistencias_pendientes", item.id, msg);
      }
    }

    // 2. Sincronizar Propuestas Comunitarias
    const propuestas = await listarPendientes<PropuestaPendiente>("propuestas_pendientes");
    for (const item of propuestas) {
      if (item.intentos >= 5) {
        continue;
      }
      try {
        await despacharPropuesta(item);
        await eliminarPendiente("propuestas_pendientes", item.id);
        propuestasExitosas++;
      } catch (err) {
        errores++;
        const msg = err instanceof Error ? err.message : String(err);
        await registrarIntentoFallo("propuestas_pendientes", item.id, msg);
      }
    }

    const totalSubidos = asistenciasExitosas + propuestasExitosas;
    if (totalSubidos > 0) {
      toast.success(
        `¡Sincronización completada! ${totalSubidos} registro(s) subido(s) al servidor distrital.`
      );
    } else if (errores > 0) {
      toast.error(
        `Se presentaron errores al sincronizar ${errores} registro(s). Se reintentará automáticamente.`
      );
    }
  } finally {
    syncEnCurso = false;
  }

  return { asistenciasExitosas, propuestasExitosas, errores };
}

/**
 * Hook reactivo para consultar el estado de conectividad y la cola de sincronización.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true;
  });
  const [pendientesCount, setPendientesCount] = useState<number>(0);
  const [sincronizando, setSincronizando] = useState<boolean>(false);

  const refrescarPendientes = useCallback(async () => {
    try {
      const total = await contarTotalPendientes();
      setPendientesCount(total);
    } catch {
      // IndexedDB no disponible
    }
  }, []);

  const ejecutarSincronizacion = useCallback(async () => {
    if (sincronizando || !isOnline) return;
    setSincronizando(true);
    try {
      await sincronizarTodo();
    } finally {
      await refrescarPendientes();
      setSincronizando(false);
    }
  }, [isOnline, sincronizando, refrescarPendientes]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Conexión a Internet restablecida.");
      // Auto-sincronizar al recuperar señal
      void sincronizarTodo().then(() => void refrescarPendientes());
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Sin conexión. Operando en Modo Offline (Zonas Rurales/Insulares).");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresco inicial
    void refrescarPendientes();

    // Refrescar ante cambios de visibilidad
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refrescarPendientes();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refrescarPendientes]);

  return {
    isOnline,
    pendientesCount,
    sincronizando,
    sincronizarAhora: ejecutarSincronizacion,
    refrescarPendientes,
  };
}
