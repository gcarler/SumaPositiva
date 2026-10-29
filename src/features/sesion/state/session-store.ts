"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ApiError, setBearerToken } from "@/core/http/api-client";
import type {
  IdentidadCiudadano,
  Sesion,
} from "@/features/sesion/models/sesion";
import {
  identidadApi,
  type Login,
  type MfaEstado,
  type Usuario,
} from "@/features/sesion/services/identidad-api";

/* Estado MFA con tres casos (220): el estado real del servidor, sin estado
 * (sin restricción derivada) y lectura no disponible (la consulta de
 * /mfa/estado falló: el acceso no puede elevarse por rol nominal). */
export type EstadoMfaAcceso = MfaEstado | null | "nodisponible";

interface SesionState {
  sesion: Sesion | null;
  cargando: boolean;
  errorSesion: string | null;
  /* Estado MFA real de la sesión (recordatorio 186): derivado de
   * GET /identidad/mfa/estado en la sincronización, no de la bandera de login.
   * No se persiste: se recalcula en cada restauración. */
  estadoMfa: EstadoMfaAcceso;
  elegirAnonimo: () => void;
  elegirIdentidad: (identidad: IdentidadCiudadano) => void;
  setSesionAnonima: (token: string, sesionId: string, expiraEn: string) => void;
  iniciarSesion: (datos: Login) => void;
  actualizarPerfil: (usuario: Usuario) => void;
  definirEstadoMfa: (estado: EstadoMfaAcceso) => void;
  limpiarSesion: () => void;
  cerrarSesion: () => Promise<void>;
}
export const ANONIMO_LABEL = "Ciudadano anónimo";
export function esInstitucional(sesion: Sesion | null): boolean {
  return !!sesion?.usuarioId && sesion.rol !== "ciudadano";
}
export function tienePermiso(sesion: Sesion | null, permiso: string): boolean {
  return !!sesion?.usuarioId && !!sesion.permisos?.includes(permiso);
}
export function nombreParaPublicar(sesion: Sesion | null): string {
  return sesion?.modo !== "anonimo" && sesion?.identidad
    ? sesion.identidad.nombre
    : ANONIMO_LABEL;
}

/* Restricción derivada del estado MFA (recordatorio 186 y hallazgo 2 de
 * EAF-ID-06/YYY): sesión limitada al enrolamiento, sesión activa sin
 * acreditar, o lectura del estado no disponible con rol nominal que
 * daría acceso; en ese último caso la sesión debe seguir restringida
 * hasta confirmar el estado (188 no transforma desconocido en acceso). */
export function sesionLimitadaPorMfa(
  sesion: Sesion | null,
  estado: EstadoMfaAcceso,
): boolean {
  if (!sesion?.usuarioId) return false;
  if (estado === "nodisponible") return (sesion.permisos ?? []).length === 0;
  if (!estado) return false;
  return (
    (estado.exigido_por_rol && !estado.activo) ||
    (estado.activo && !estado.sesion_verificada)
  );
}

export const useSesionStore = create<SesionState>()(
  persist(
    (set, get) => ({
      sesion: null,
      cargando: true,
      errorSesion: null,
      estadoMfa: null,
      elegirAnonimo: () => {
        setBearerToken(null);
        set({ sesion: { modo: "anonimo", desde: new Date().toISOString() } });
      },
      elegirIdentidad: (identidad) =>
        set({
          sesion: {
            modo: "identidad",
            identidad,
            desde: new Date().toISOString(),
          },
        }),
      setSesionAnonima: (token, sesionId, expiraEn) => {
        setBearerToken(token);
        set({
          sesion: {
            modo: "anonimo",
            desde: new Date().toISOString(),
            token,
            sesionId,
            expiraEn,
          },
        });
      },
      iniciarSesion: (datos) => {
        setBearerToken(datos.token_acceso);
        set({
          cargando: false,
          errorSesion: null,
          estadoMfa: null,
          sesion: {
            modo: datos.rol === "ciudadano" ? "identidad" : "institucional",
            identidad: {
              nombre: `${datos.usuario.nombres} ${datos.usuario.apellidos}`,
              email: datos.usuario.correo,
            },
            usuarioId: datos.usuario.id,
            usuario: datos.usuario,
            rol: datos.rol,
            permisos: datos.permisos,
            token: datos.token_acceso,
            expiraEn: datos.expira_en,
            desde: new Date().toISOString(),
          },
        });
      },
      actualizarPerfil: (usuario) =>
        set((state) => ({
          sesion: state.sesion
            ? {
                ...state.sesion,
                usuario,
                rol: usuario.codigo_rol,
                permisos: usuario.permisos,
                identidad: {
                  nombre: `${usuario.nombres} ${usuario.apellidos}`,
                  email: usuario.correo,
                },
              }
            : null,
        })),
      definirEstadoMfa: (estado) => set({ estadoMfa: estado }),
      limpiarSesion: () => {
        setBearerToken(null);
        set({
          sesion: null,
          cargando: false,
          errorSesion: null,
          estadoMfa: null,
        });
      },
      cerrarSesion: async () => {
        if (get().sesion?.usuarioId) {
          try {
            await identidadApi.logout();
          } catch (error) {
            if (!(error instanceof ApiError && error.status === 401))
              throw error;
          }
        }
        get().limpiarSesion();
      },
    }),
    {
      name: "polis-sesion-v2",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (state) => ({ sesion: state.sesion }),
      onRehydrateStorage: () => (state) => {
        if (
          state?.sesion?.expiraEn &&
          Date.parse(state.sesion.expiraEn) > Date.now()
        )
          setBearerToken(state.sesion.token ?? null);
        else state?.limpiarSesion();
      },
    },
  ),
);
