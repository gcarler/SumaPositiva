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

const MODULOS_FACILITADOR: ModuloUsuario[] = ["mesas", "formularios"];
const MODULOS_LECTURA: ModuloUsuario[] = [
  "mesas",
  "formularios",
  "geovisor",
  "contenido",
];

/** Datos de demostración aislados del directorio institucional persistido. */
const usuariosDemo: UsuarioPlatafoma[] = [
  {
    id: "demo-ana-perez",
    nombre: "Ana Pérez",
    correo: "ana.perez@cartagena.gov.co",
    rol: "facilitador_mesa",
    activo: true,
    creadoEn: "2026-02-10T14:00:00.000Z",
    ultimoAcceso: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    modulos: MODULOS_FACILITADOR,
  },
  {
    id: "demo-carlos-martinez",
    nombre: "Carlos Martínez",
    correo: "carlos.martinez@cartagena.gov.co",
    rol: "auditor_forense",
    activo: true,
    creadoEn: "2026-02-12T14:00:00.000Z",
    ultimoAcceso: new Date(Date.now() - 24 * 3_600_000).toISOString(),
    modulos: MODULOS_LECTURA,
  },
  {
    id: "demo-juan-mendoza",
    nombre: "Juan Mendoza",
    correo: "juan.mendoza@cartagena.gov.co",
    rol: "autoridad_distrital",
    activo: false,
    creadoEn: "2026-02-15T14:00:00.000Z",
    modulos: MODULOS_LECTURA,
  },
  {
    id: "demo-maria-torres",
    nombre: "María Torres",
    correo: "maria.torres@cartagena.gov.co",
    rol: "facilitador_mesa",
    activo: true,
    creadoEn: "2026-03-01T14:00:00.000Z",
    ultimoAcceso: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    modulos: MODULOS_FACILITADOR,
  },
  {
    id: "demo-luis-hernandez",
    nombre: "Luis Hernández",
    correo: "luis.hernandez@cartagena.gov.co",
    rol: "administrador_identidades",
    activo: true,
    creadoEn: "2026-01-20T14:00:00.000Z",
    ultimoAcceso: new Date(Date.now() - 45 * 60_000).toISOString(),
    modulos: ["mesas", "formularios", "geovisor", "usuarios", "contenido", "configuracion"],
  },
  {
    id: "demo-laura-diaz",
    nombre: "Laura Díaz",
    correo: "laura.diaz@cartagena.gov.co",
    rol: "auditor_forense",
    activo: true,
    creadoEn: "2026-03-04T14:00:00.000Z",
    ultimoAcceso: "2026-09-30T15:10:00.000Z",
    modulos: MODULOS_LECTURA,
  },
  {
    id: "demo-andres-gomez",
    nombre: "Andrés Gómez",
    correo: "andres.gomez@cartagena.gov.co",
    rol: "autoridad_distrital",
    activo: true,
    creadoEn: "2026-04-02T14:00:00.000Z",
    ultimoAcceso: new Date(Date.now() - 8 * 3_600_000).toISOString(),
    modulos: MODULOS_LECTURA,
  },
  {
    id: "demo-camila-rojas",
    nombre: "Camila Rojas",
    correo: "camila.rojas@cartagena.gov.co",
    rol: "facilitador_mesa",
    activo: true,
    creadoEn: "2026-04-18T14:00:00.000Z",
    ultimoAcceso: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    modulos: MODULOS_FACILITADOR,
  },
];

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
  usuarios: usuariosDemo,
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
