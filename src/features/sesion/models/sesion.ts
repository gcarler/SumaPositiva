import type { Usuario } from "@/features/sesion/services/identidad-api";

export interface IdentidadCiudadano {
  /** Nombre público mostrado en los aportes */
  nombre: string;
  /** Correo opcional para respuestas del equipo técnico */
  email?: string;
  /** Ciudad o localidad opcional (contexto territorial) */
  ciudad?: string;
}

export type RolInstitucional = string;

export type ModoSesion = "anonimo" | "identidad" | "institucional";

export interface Sesion {
  modo: ModoSesion;
  /** Presente cuando modo === "identidad" o "institucional" */
  identidad?: IdentidadCiudadano;
  /** ISO — cuándo se estableció la sesión */
  desde: string;
  token?: string;
  sesionId?: string;
  expiraEn?: string;
  
  // Extensiones PBAC
  rol?: RolInstitucional;
  permisos?: string[];
  usuarioId?: string;
  usuario?: Usuario;
  esInstitucional?: boolean;
}
