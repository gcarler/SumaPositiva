"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * POLIS — Sesión de participación (demo local, lista para JWT).
 *
 * El ciudadano elige: participar de forma ANÓNIMA o con IDENTIDAD.
 * Se persiste en localStorage para sobrevivir recargas.
 * Cuando exista backend FastAPI, `elegirIdentidad` se sustituirá por
 * el flujo de autenticación (JWT vía apiFetch) sin cambiar la UI.
 */

export interface IdentidadCiudadano {
  /** Nombre público mostrado en los aportes */
  nombre: string;
  /** Correo opcional para respuestas del equipo técnico */
  email?: string;
  /** Ciudad o localidad opcional (contexto territorial) */
  ciudad?: string;
}

export type ModoSesion = "anonimo" | "identidad";

export interface Sesion {
  modo: ModoSesion;
  /** Presente solo cuando modo === "identidad" */
  identidad?: IdentidadCiudadano;
  /** ISO — cuándo se estableció la sesión */
  desde: string;
}

interface SesionState {
  sesion: Sesion | null;
  elegirAnonimo: () => void;
  elegirIdentidad: (identidad: IdentidadCiudadano) => void;
  cerrarSesion: () => void;
}

export const ANONIMO_LABEL = "Ciudadano anónimo";

/** Nombre que aparecerá en los aportes según la sesión */
export function nombreParaPublicar(sesion: Sesion | null): string {
  if (!sesion || sesion.modo === "anonimo" || !sesion.identidad) {
    return ANONIMO_LABEL;
  }
  return sesion.identidad.nombre;
}

export const useSesionStore = create<SesionState>()(
  persist(
    (set) => ({
      sesion: null,

      elegirAnonimo: () =>
        set({
          sesion: { modo: "anonimo", desde: new Date().toISOString() },
        }),

      elegirIdentidad: (identidad) =>
        set({
          sesion: {
            modo: "identidad",
            identidad,
            desde: new Date().toISOString(),
          },
        }),

      cerrarSesion: () => set({ sesion: null }),
    }),
    {
      name: "polis-sesion-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sesion: s.sesion }),
    }
  )
);
