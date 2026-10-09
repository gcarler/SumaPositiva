"use client";

import { create } from "zustand";

export type RolPlataforma =
  | "autoridad_distrital"
  | "facilitador_mesa"
  | "auditor_forense"
  | "administrador_identidades";

export type ModuloUsuario =
  | "mesas"
  | "formularios"
  | "geovisor"
  | "noticias"
  | "testimonios"
  | "usuarios"
  | "contenido"
  | "configuracion";

export interface UsuarioPlatafoma {
  id: string;
  nombre: string;
  correo: string;
  rol: RolPlataforma;
  activo: boolean;
  creadoEn: string;
  ultimoAcceso?: string;
  foto?: string;
  modulos: string[];
}





interface UsuarioDraft {
  nombre: string;
  correo: string;
  rol: RolPlataforma;
  activo: boolean;
  modulos: ModuloUsuario[];
}

interface UsuariosState {
  usuarios: UsuarioPlatafoma[];
  guardar: (draft: UsuarioDraft, usuarioId?: string) => string;
  cambiarActivo: (usuarioId: string, activo: boolean) => void;
  getById: (usuarioId: string) => UsuarioPlatafoma | undefined;
}

export const useUsuariosStore = create<UsuariosState>((set, get) => ({
  usuarios: [],
  guardar: (draft, usuarioId) => {
    const id = usuarioId ?? `demo-${crypto.randomUUID()}`;
    const existente = get().usuarios.find((usuario) => usuario.id === id);
    const actualizado: UsuarioPlatafoma = {
      id,
      ...draft,
      modulos: draft.modulos,
      creadoEn: existente?.creadoEn ?? new Date().toISOString(),
      ultimoAcceso: existente?.ultimoAcceso,
    };
    set((state) => ({
      usuarios: existente
        ? state.usuarios.map((usuario) => (usuario.id === id ? actualizado : usuario))
        : [actualizado, ...state.usuarios],
    }));
    return id;
  },
  cambiarActivo: (usuarioId, activo) =>
    set((state) => ({
      usuarios: state.usuarios.map((usuario) =>
        usuario.id === usuarioId ? { ...usuario, activo } : usuario,
      ),
    })),
  getById: (usuarioId) => get().usuarios.find((usuario) => usuario.id === usuarioId),
}));
