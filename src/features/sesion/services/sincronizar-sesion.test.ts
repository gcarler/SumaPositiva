import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { identidadApi, type Usuario } from "./identidad-api";
import { sincronizarSesion } from "./sincronizar-sesion";
import { useSesionStore } from "../state/session-store";
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
