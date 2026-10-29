import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { identidadApi, type Usuario } from "./identidad-api";
import { sincronizarSesion } from "./sincronizar-sesion";
import { useSesionStore, sesionLimitadaPorMfa } from "../state/session-store";
import {
  apiFetch,
  setBearerToken,
  setUnauthorizedHandler,
  ApiError,
} from "@/core/http/api-client";
const usuario: Usuario = {
  id: "01900000-0000-7000-8000-000000000001",
  correo: "prueba@example.org",
  nombres: "Ana",
  apellidos: "Prueba",
  codigo_rol: "ciudadano",
  permisos: [],
  activo: true,
  nivel_identidad: "declarada",
  correo_verificado_en: null,
};
beforeEach(() =>
  useSesionStore.setState({
    cargando: true,
    errorSesion: null,
    sesion: {
      modo: "institucional",
      usuarioId: usuario.id,
      token: "anterior",
      rol: "administrador_identidades",
      expiraEn: "2099-01-01T00:00:00Z",
      desde: "2026-10-01",
    },
  }),
);
afterEach(() => {
  vi.restoreAllMocks();
  useSesionStore.getState().limpiarSesion();
});
test("perfil remoto corrige el rol restaurado antes de habilitarlo", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue(usuario);
  vi.spyOn(identidadApi, "mfaEstado").mockResolvedValue({
    activo: false,
    activado_en: null,
    codigos_restantes: 0,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
  await sincronizarSesion();
  expect(useSesionStore.getState().sesion?.rol).toBe("ciudadano");
  expect(useSesionStore.getState().cargando).toBe(false);
});
test("revocación 401 limpia la sesión", async () => {
  vi.spyOn(identidadApi, "perfil").mockRejectedValue(
    new ApiError(401, "Revocada"),
  );
  await sincronizarSesion();
  expect(useSesionStore.getState().sesion).toBeNull();
});
test("caducidad impide consultar perfil y limpia sesión", async () => {
  const perfil = vi.spyOn(identidadApi, "perfil");
  useSesionStore.setState({
    sesion: { ...useSesionStore.getState().sesion!, expiraEn: "2020-01-01" },
  });
  await sincronizarSesion();
  expect(perfil).not.toHaveBeenCalled();
  expect(useSesionStore.getState().sesion).toBeNull();
});
test("503 deja el área interna bloqueada con error recuperable", async () => {
  vi.spyOn(identidadApi, "perfil").mockRejectedValue(
    new ApiError(503, "Identidad no disponible"),
  );
  await sincronizarSesion();
  expect(useSesionStore.getState().errorSesion).toBe("Identidad no disponible");
  expect(useSesionStore.getState().cargando).toBe(false);
});
test("un perfil antiguo no sobrescribe un login más reciente", async () => {
  let resolver: (u: Usuario) => void = () => {};
  vi.spyOn(identidadApi, "perfil").mockImplementation(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  const revision = sincronizarSesion();
  useSesionStore.setState({
    sesion: {
      ...useSesionStore.getState().sesion!,
      token: "nuevo",
      rol: "autoridad_distrital",
    },
    cargando: false,
  });
  resolver(usuario);
  await revision;
  expect(useSesionStore.getState().sesion?.rol).toBe("autoridad_distrital");
  expect(useSesionStore.getState().sesion?.token).toBe("nuevo");
});
test("un perfil de cuenta desactivada limpia el acceso", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    activo: false,
  });
  await sincronizarSesion();
  expect(useSesionStore.getState().sesion).toBeNull();
});

/* Recordatorio 186: al restaurar sesión o tras un cambio de rol, el perfil
 * puede llegar con permisos vacíos conservando el rol interno; la restricción
 * se deriva del estado MFA consultado, no del token del login. */
test("restauración con rol que exige MFA consulta el estado real y siembra la restricción", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "administrador_identidades",
    mfa_activo: false,
  });
  const mfaEstado = vi.spyOn(identidadApi, "mfaEstado").mockResolvedValue({
    activo: false,
    activado_en: null,
    codigos_restantes: 0,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
  await sincronizarSesion();
  expect(mfaEstado).toHaveBeenCalledOnce();
  expect(useSesionStore.getState().estadoMfa).toEqual({
    activo: false,
    activado_en: null,
    codigos_restantes: 0,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
  /* La sesión no se destruye: queda limitada a perfil/estado/iniciar/activar/logout. */
  expect(useSesionStore.getState().sesion?.rol).toBe("administrador_identidades");
  expect(useSesionStore.getState().sesion?.token).toBe("anterior");
  expect(useSesionStore.getState().errorSesion).toBeNull();
});

test("sesión activa no acreditada también queda representada como restringida", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "autoridad_distrital",
    mfa_activo: true,
  });
  vi.spyOn(identidadApi, "mfaEstado").mockResolvedValue({
    activo: true,
    activado_en: "2026-01-01T00:00:00Z",
    codigos_restantes: 10,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
  await sincronizarSesion();
  expect(useSesionStore.getState().estadoMfa).toEqual({
    activo: true,
    activado_en: "2026-01-01T00:00:00Z",
    codigos_restantes: 10,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
});

test("503 de mfa/estado queda como lectura no disponible y no da acceso", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "administrador_identidades",
    mfa_activo: false,
  });
  vi.spyOn(identidadApi, "mfaEstado").mockRejectedValue(
    new ApiError(503, "Lectura no disponible"),
  );
  await sincronizarSesion();
  expect(useSesionStore.getState().estadoMfa).toBe("nodisponible");
  expect(useSesionStore.getState().sesion?.token).toBe("anterior");
  expect(useSesionStore.getState().errorSesion).toBeNull();
  /* La restricción derivada no se transforma en acceso por rol nominal. */
  expect(
    sesionLimitadaPorMfa(
      useSesionStore.getState().sesion,
      useSesionStore.getState().estadoMfa,
    ),
  ).toBe(true);
});

test("401 de mfa/estado limpia la sesión", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "administrador_identidades",
    mfa_activo: false,
  });
  vi.spyOn(identidadApi, "mfaEstado").mockRejectedValue(
    new ApiError(401, "Revocada"),
  );
  await sincronizarSesion();
  expect(useSesionStore.getState().sesion).toBeNull();
});

test("409 de mfa/estado también queda como lectura no disponible", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "administrador_identidades",
    mfa_activo: false,
  });
  vi.spyOn(identidadApi, "mfaEstado").mockRejectedValue(
    new ApiError(409, "Factor activo no puede reiniciar enrolamiento"),
  );
  await sincronizarSesion();
  expect(useSesionStore.getState().estadoMfa).toBe("nodisponible");
  expect(useSesionStore.getState().sesion?.token).toBe("anterior");
  expect(useSesionStore.getState().errorSesion).toBeNull();
});

test("perfil con permisos plenos no consulta el estado MFA", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "administrador_identidades",
    permisos: ["usuarios:leer", "identidad:auditar"],
    mfa_activo: true,
  });
  const mfaEstado = vi.spyOn(identidadApi, "mfaEstado");
  await sincronizarSesion();
  expect(mfaEstado).not.toHaveBeenCalled();
  expect(useSesionStore.getState().estadoMfa).toBeNull();
});

test("cambio de rol a uno exigente restringe la sesión ya activa", async () => {
  vi.spyOn(identidadApi, "perfil").mockResolvedValue({
    ...usuario,
    codigo_rol: "administrador_identidades",
    permisos: [],
    mfa_activo: false,
  });
  vi.spyOn(identidadApi, "mfaEstado").mockResolvedValue({
    activo: false,
    activado_en: null,
    codigos_restantes: 0,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
  await sincronizarSesion();
  expect(useSesionStore.getState().sesion?.rol).toBe("administrador_identidades");
  expect(useSesionStore.getState().sesion?.permisos).toEqual([]);
  expect(useSesionStore.getState().estadoMfa).toEqual({
    activo: false,
    activado_en: null,
    codigos_restantes: 0,
    exigido_por_rol: true,
    sesion_verificada: false,
  });
});

test("un 401 del envío anónimo no cierra la sesión institucional", async () => {
  const cerrar = vi.fn();
  setBearerToken("institucional");
  setUnauthorizedHandler(cerrar);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(
    async () =>
      new Response("{}", {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch;
  try {
    await expect(
      apiFetch("/prueba", {
        headers: { Authorization: "Bearer anonimo" },
        retry: { retries: 0 },
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(cerrar).not.toHaveBeenCalled();
    await expect(
      apiFetch("/prueba", { retry: { retries: 0 } }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(cerrar).toHaveBeenCalledOnce();
  } finally {
    globalThis.fetch = originalFetch;
    setUnauthorizedHandler(null);
    setBearerToken(null);
  }
});
