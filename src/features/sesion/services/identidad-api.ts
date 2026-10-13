import "@/core/zod-init";
import { z } from "zod";
import { apiFetch } from "@/core/http/api-client";

export const usuarioSchema = z.object({
  id: z.string().uuid(), correo: z.string().email(), nombres: z.string(), apellidos: z.string(),
  codigo_rol: z.string(), permisos: z.array(z.string()), activo: z.boolean(),
  nivel_identidad: z.string(), correo_verificado_en: z.string().nullable(),
  mfa_activo: z.boolean().optional(),
});
export type Usuario = z.infer<typeof usuarioSchema>;
export const rolSchema = z.object({ id: z.string().uuid(), codigo: z.string(), nombre: z.string(),
  permisos: z.array(z.string()), sistema: z.boolean() });
export type Rol = z.infer<typeof rolSchema>;
export const tokenSchema = z.object({token_acceso: z.string(), expira_en: z.string(),
  rol: z.string(), permisos: z.array(z.string()), nivel_identidad: z.string(), usuario: usuarioSchema,
  mfa_requerido: z.boolean().optional(),
  token_desafio_mfa: z.string().nullable().optional()});
export type Login = z.infer<typeof tokenSchema>;
export const mfaEstadoSchema = z.object({
  activo: z.boolean(),
  activado_en: z.string().nullable(),
  ultimo_uso_en: z.string().nullable(),
  codigos_restantes: z.number(),
});
export type MfaEstado = z.infer<typeof mfaEstadoSchema>;
export const mfaIniciarSchema = z.object({
  secreto_b32: z.string(),
  uri_totp: z.string(),
  qr_code_base64: z.string(),
});
export type MfaIniciar = z.infer<typeof mfaIniciarSchema>;
export const mfaActivarSchema = z.object({
  mensaje: z.string(),
  codigos_recuperacion: z.array(z.string()),
});
export type MfaActivar = z.infer<typeof mfaActivarSchema>;
export const mfaRecuperacionSchema = z.object({
  mensaje: z.string(),
  codigos_recuperacion: z.array(z.string()),
});
export type MfaRecuperacion = z.infer<typeof mfaRecuperacionSchema>;
const mensajeSchema = z.object({ mensaje: z.string() });
export const sesionSchema = z.object({id: z.string().uuid(), creada_en: z.string(),
  expira_en: z.string(), actual: z.boolean()});
export type SesionRemota = z.infer<typeof sesionSchema>;
export const eventoSchema = z.object({id: z.string().uuid(), actor_id: z.string().nullable(),
  objetivo_id: z.string().nullable(), accion: z.string(), detalle: z.record(z.string(), z.unknown()),
  creado_en: z.string()});
export type Evento = z.infer<typeof eventoSchema>;
export const ambitoTerritorialSchema = z.object({
  id: z.string().uuid(),
  usuario_id: z.string().uuid(),
  tipo_ambito: z.enum(["distrital", "localidad", "mesa"]),
  identificador_territorial: z.string(),
  activo: z.boolean(),
  asignado_en: z.string(),
});
export type AmbitoTerritorial = z.infer<typeof ambitoTerritorialSchema>;

async function consultar<T>(path: string, schema: z.ZodType<T>, options: Parameters<typeof apiFetch>[1] = {}) {
  return schema.parse(await apiFetch<unknown>(`/identidad${path}`, options));
}
export const identidadApi = {
  loginGoogle: (id_token: string) =>
    consultar("/oauth/google", tokenSchema, { method: "POST", body: { id_token } }),
  solicitarMagicLink: (correo: string) =>
    consultar("/magic-link/solicitar", mensajeSchema, { method: "POST", body: { correo } }),
  confirmarMagicLink: (token: string) =>
    consultar("/magic-link/confirmar", tokenSchema, { method: "POST", body: { token } }),
  login: (correo: string, contrasena: string) => consultar("/login", tokenSchema,
    { method: "POST", body: { correo, contrasena } }),
  registrar: (datos: {correo: string; contrasena: string; nombres: string; apellidos: string}) =>
    consultar("/registro", usuarioSchema, {method: "POST", body: datos}),
  perfil: () => consultar("/perfil", usuarioSchema),
  editarPerfil: (nombres: string, apellidos: string) => consultar("/perfil", usuarioSchema,
    {method: "PATCH", body: {nombres, apellidos}}),
  logout: () => consultar("/logout", mensajeSchema, {method: "POST"}),
  sesiones: () => consultar("/sesiones", z.array(sesionSchema)),
  revocarSesion: (id?: string) => consultar(id ? `/sesiones/${id}` : "/sesiones", mensajeSchema,
    {method: "DELETE"}),
  cambiarContrasena: (contrasena_actual: string, contrasena: string) => consultar("/contrasena",
    mensajeSchema, {method: "POST", body: {contrasena_actual, contrasena}}),
  solicitarRecuperacion: (correo: string) => consultar("/recuperacion/solicitar", mensajeSchema,
    {method: "POST", body: {correo}}),
  confirmarRecuperacion: (token: string, contrasena: string) => consultar("/recuperacion/confirmar",
    mensajeSchema, {method: "POST", body: {token, contrasena}}),
  solicitarVerificacion: () => consultar("/correo/solicitar", mensajeSchema, {method: "POST"}),
  confirmarVerificacion: (token: string) => consultar("/correo/confirmar", mensajeSchema,
    {method: "POST", body: {token}}),
  usuarios: (busqueda = "", desplazamiento = 0, limite = 20) => consultar(
    `/usuarios?${new URLSearchParams({busqueda, desplazamiento: String(desplazamiento), limite: String(limite)})}`,
    z.object({total: z.number(), elementos: z.array(usuarioSchema)})),
  crearUsuario: (datos: {correo: string; contrasena: string; nombres: string; apellidos: string;
    codigo_rol: string; motivo: string}) => consultar("/usuarios", usuarioSchema, {method: "POST", body: datos}),
  editarUsuario: (id: string, datos: {nombres: string; apellidos: string; codigo_rol: string;
    activo: boolean; motivo: string}) => consultar(`/usuarios/${id}`, usuarioSchema,
    {method: "PATCH", body: datos}),
  revocarUsuario: (id: string) => consultar(`/usuarios/${id}/revocar`, mensajeSchema, {method: "POST"}),
  roles: () => consultar("/roles", z.array(rolSchema)),
  permisos: () => consultar("/permisos", z.record(z.string(), z.string())),
  crearRol: (datos: {codigo: string; nombre: string; permisos: string[]; motivo: string}) =>
    consultar("/roles", rolSchema, {method: "POST", body: datos}),
  editarRol: (codigo: string, datos: {nombre: string; permisos: string[]; motivo: string}) =>
    consultar(`/roles/${encodeURIComponent(codigo)}`, rolSchema, {method: "PATCH", body: datos}),
  eliminarRol: (codigo: string, motivo: string) => consultar(
    `/roles/${encodeURIComponent(codigo)}?${new URLSearchParams({motivo})}`, mensajeSchema, {method: "DELETE"}),
  eventos: (desplazamiento = 0) => consultar(`/eventos?desplazamiento=${desplazamiento}`, z.array(eventoSchema)),
  mfaEstado: () => consultar("/mfa/estado", mfaEstadoSchema),
  mfaIniciar: () => consultar("/mfa/iniciar", mfaIniciarSchema, { method: "POST" }),
  mfaActivar: (codigo: string) =>
    consultar("/mfa/activar", mfaActivarSchema, { method: "POST", body: { codigo } }),
  mfaDesactivar: (contrasena: string) =>
    consultar("/mfa/desactivar", mensajeSchema, { method: "POST", body: { contrasena } }),
  mfaRegenerarRecuperacion: (codigo: string) =>
    consultar("/mfa/recuperacion/regenerar", mfaRecuperacionSchema, { method: "POST", body: { codigo } }),
  mfaVerificar: (token_desafio: string, codigo: string) =>
    consultar("/mfa/verificar", tokenSchema, { method: "POST", body: { token_desafio, codigo } }),
  ambitosUsuario: (usuarioId: string) =>
    consultar(`/usuarios/${usuarioId}/ambitos`, z.array(ambitoTerritorialSchema)),
  asignarAmbitoUsuario: (usuarioId: string, datos: { tipo_ambito: string; identificador_territorial: string; motivo: string }) =>
    consultar(`/usuarios/${usuarioId}/ambitos`, ambitoTerritorialSchema, { method: "POST", body: datos }),
  revocarAmbitoUsuario: (usuarioId: string, ambitoId: string, motivo: string) =>
    consultar(`/usuarios/${usuarioId}/ambitos/${ambitoId}?${new URLSearchParams({ motivo })}`, mensajeSchema, { method: "DELETE" }),
};
