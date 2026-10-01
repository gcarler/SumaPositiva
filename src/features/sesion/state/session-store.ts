"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ApiError, setBearerToken } from "@/core/http/api-client";
import type { IdentidadCiudadano, Sesion } from "@/features/sesion/models/sesion";
import { identidadApi, type Login, type Usuario } from "@/features/sesion/services/identidad-api";

interface SesionState {
  sesion: Sesion | null;
  elegirAnonimo: () => void;
  elegirIdentidad: (identidad: IdentidadCiudadano) => void;
  setSesionAnonima: (token: string, sesionId: string, expiraEn: string) => void;
  iniciarSesion: (datos: Login) => void;
  actualizarPerfil: (usuario: Usuario) => void;
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
  return sesion?.modo !== "anonimo" && sesion?.identidad ? sesion.identidad.nombre : ANONIMO_LABEL;
}

export const useSesionStore = create<SesionState>()(persist((set, get) => ({
  sesion: null,
  elegirAnonimo: () => {setBearerToken(null); set({sesion: {modo: "anonimo", desde: new Date().toISOString()}});},
  elegirIdentidad: (identidad) => set({sesion: {modo: "identidad", identidad, desde: new Date().toISOString()}}),
  setSesionAnonima: (token, sesionId, expiraEn) => {
    setBearerToken(token);
    set({sesion: {modo: "anonimo", desde: new Date().toISOString(), token, sesionId, expiraEn}});
  },
  iniciarSesion: (datos) => {
    setBearerToken(datos.token_acceso);
    set({sesion: {modo: datos.rol === "ciudadano" ? "identidad" : "institucional",
      identidad: {nombre: `${datos.usuario.nombres} ${datos.usuario.apellidos}`, email: datos.usuario.correo},
      usuarioId: datos.usuario.id, usuario: datos.usuario, rol: datos.rol, permisos: datos.permisos,
      token: datos.token_acceso, expiraEn: datos.expira_en, desde: new Date().toISOString()}});
  },
  actualizarPerfil: (usuario) => set((state) => ({sesion: state.sesion ? {...state.sesion,
    usuario, rol: usuario.codigo_rol, permisos: usuario.permisos,
    identidad: {nombre: `${usuario.nombres} ${usuario.apellidos}`, email: usuario.correo}} : null})),
  limpiarSesion: () => {setBearerToken(null); set({sesion: null});},
  cerrarSesion: async () => {
    if (get().sesion?.usuarioId) {
      try {await identidadApi.logout();}
      catch (error) {if (!(error instanceof ApiError && error.status === 401)) throw error;}
    }
    get().limpiarSesion();
  },
}), {
  name: "polis-sesion-v2", storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({sesion: state.sesion}),
  onRehydrateStorage: () => (state) => {
    if (state?.sesion?.expiraEn && Date.parse(state.sesion.expiraEn) > Date.now())
      setBearerToken(state.sesion.token ?? null);
    else state?.limpiarSesion();
  },
}));
