import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { SesionSync } from "@/app/_composition/sesion-sync";
import Home from "@/app/page";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within, waitFor } from "storybook/test";
import { QueryProvider } from "@/app/_composition/query-provider";
import { PanelHost } from "@/app/_components/panel-host";
import { usePanelStore } from "@/core/panels/panel-store";
import { ApiError, setBearerToken } from "@/core/http/api-client";
import {
  identidadApi,
  type Usuario,
  type Rol,
  type Login,
} from "@/features/sesion/services/identidad-api";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { SesionPanel } from "@/features/sesion/panels/sesion-panel";
import { UsuariosPanel } from "@/features/sesion/panels/usuarios-panel";

const usuario: Usuario = {
  id: "01900000-0000-7000-8000-000000000001",
  correo: "ana@example.org",
  nombres: "Ana",
  apellidos: "Torres",
  codigo_rol: "administrador_identidades",
  activo: true,
  nivel_identidad: "declarada",
  correo_verificado_en: null,
  permisos: [
    "usuarios:leer",
    "usuarios:gestionar",
    "roles:gestionar",
    "identidad:auditar",
  ],
};
const roles: Rol[] = [
  {
    id: "01900000-0000-7000-8000-000000000002",
    codigo: "ciudadano",
    nombre: "Ciudadano",
    permisos: ["aportes:crear"],
    sistema: true,
  },
  {
    id: "01900000-0000-7000-8000-000000000003",
    codigo: "operador",
    nombre: "Operador",
    permisos: ["usuarios:leer"],
    sistema: false,
  },
];
const login: Login = {
  usuario,
  rol: usuario.codigo_rol,
  permisos: usuario.permisos,
  nivel_identidad: "declarada",
  token_acceso: "token-exclusivo-de-storybook",
  expira_en: "2099-01-01T00:00:00Z",
};
const originales = { ...identidadApi };
const mensaje = { mensaje: "Solicitud completada" };

const meta = {
  title: "Plataforma/Identidad",
  parameters: { layout: "fullscreen", polis: { screen: true } },
  beforeEach: () => {
    usePanelStore.getState().closeAll();
    useSesionStore.getState().limpiarSesion();
    Object.assign(identidadApi, {
      login: fn(async () => structuredClone(login)),
      loginGoogle: fn(async () => structuredClone(login)),
      registrar: fn(async () => structuredClone(usuario)),
      perfil: fn(async () => structuredClone(usuario)),
      editarPerfil: fn(async () => structuredClone(usuario)),
      logout: fn(async () => mensaje),
      sesiones: fn(async () => [
        {
          id: "01900000-0000-7000-8000-000000000004",
          creada_en: "2026-10-01T12:00:00Z",
          expira_en: "2099-01-01T00:00:00Z",
          actual: true,
        },
      ]),
      revocarSesion: fn(async () => mensaje),
      cambiarContrasena: fn(async () => mensaje),
      solicitarRecuperacion: fn(async () => mensaje),
      confirmarRecuperacion: fn(async () => mensaje),
      solicitarVerificacion: fn(async () => mensaje),
      confirmarVerificacion: fn(async () => mensaje),
      solicitarMagicLink: fn(async () => mensaje),
      confirmarMagicLink: fn(async () => structuredClone(login)),
      usuarios: fn(async () => ({
        total: 1,
        elementos: [structuredClone(usuario)],
      })),
      crearUsuario: fn(async () => structuredClone(usuario)),
      editarUsuario: fn(async () => structuredClone(usuario)),
      revocarUsuario: fn(async () => mensaje),
      roles: fn(async () => structuredClone(roles)),
      permisos: fn(async () => ({
        "usuarios:leer": "Consultar usuarios",
        "mesas:abrir": "Crear mesas",
      })),
      crearRol: fn(async () => structuredClone(roles[1])),
      editarRol: fn(async () => structuredClone(roles[1])),
      eliminarRol: fn(async () => mensaje),
      eventos: fn(async () => []),
    } satisfies typeof identidadApi);
    usePanelStore.getState().openPanel("sesion", {});
    return () => {
      Object.assign(identidadApi, originales);
      usePanelStore.getState().closeAll();
      useSesionStore.getState().limpiarSesion();
      setBearerToken(null);
    };
  },
  render: () => (
    <QueryProvider>
      <PanelHost />
    </QueryProvider>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
// Importaciones directas: las historias usan las mismas implementaciones del producto.
export const LoginPanel: Story = {
  render: () => (
    <QueryProvider>
      <SesionPanel entryKey="sesion-story" />
    </QueryProvider>
  ),
};
export const LoginOscuro: Story = { globals: { theme: "dark" } };
export const LoginMovil: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
export const LoginCorrecto: Story = {
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.type(
      panel.getByLabelText("Correo electrónico", { exact: false }),
      "ana@example.org",
    );
    await userEvent.type(
      panel.getByLabelText(/^Contraseña/),
      "ClavePrueba2026*",
    );
    await userEvent.click(
      panel.getAllByRole("button", { name: "Iniciar sesión" })[1],
    );
    await waitFor(() =>
      expect(useSesionStore.getState().sesion?.usuarioId).toBe(usuario.id),
    );
    await waitFor(() =>
      expect(getRouter().push).toHaveBeenCalledWith("/plataforma"),
    );
    await expect(usePanelStore.getState().entries).toHaveLength(0);
  },
};
export const CredencialesIncorrectas: Story = {
  beforeEach: () => {
    identidadApi.login = fn(async () => {
      throw new ApiError(401, "Correo o contraseña incorrectos");
    });
  },
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    const correo = panel.getByLabelText("Correo electrónico", { exact: false });
    await userEvent.type(correo, "ana@example.org");
    await userEvent.type(panel.getByLabelText(/^Contraseña/), "ClaveErrada");
    await userEvent.click(
      panel.getAllByRole("button", { name: "Iniciar sesión" })[1],
    );
    await expect(
      await panel.findByText("Correo o contraseña incorrectos"),
    ).toBeVisible();
    await expect(correo).toHaveValue("ana@example.org");
    await expect(useSesionStore.getState().sesion).toBeNull();
  },
};
export const Registro: Story = {
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(panel.getByRole("button", { name: "Crear cuenta" }));
    await userEvent.type(
      panel.getByLabelText("Correo electrónico", { exact: false }),
      "ana@example.org",
    );
    await userEvent.type(
      panel.getByLabelText("Nombres", { exact: false }),
      "Ana",
    );
    await userEvent.type(
      panel.getByLabelText("Apellidos", { exact: false }),
      "Torres",
    );
    await userEvent.type(
      panel.getByLabelText(/^Contraseña/),
      "ClavePrueba2026*",
    );
    await userEvent.type(
      panel.getByLabelText("Confirmar contraseña", { exact: false }),
      "ClavePrueba2026*",
    );
    await userEvent.click(
      panel.getAllByRole("button", { name: "Crear cuenta" })[1],
    );
    await expect(await panel.findByText(/Cuenta creada/)).toBeVisible();
    await expect(identidadApi.registrar).toHaveBeenCalledWith({
      correo: "ana@example.org",
      nombres: "Ana",
      apellidos: "Torres",
      contrasena: "ClavePrueba2026*",
    });
  },
};
export const Recuperar: Story = {
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(
      panel.getByRole("button", { name: "Olvidé mi contraseña" }),
    );
    await userEvent.type(
      panel.getByLabelText("Correo electrónico", { exact: false }),
      "ana@example.org",
    );
    await userEvent.click(
      panel.getByRole("button", { name: "Solicitar enlace" }),
    );
    await waitFor(() =>
      expect(identidadApi.solicitarRecuperacion).toHaveBeenCalledWith(
        "ana@example.org",
      ),
    );
  },
};
export const Restablecer: Story = {
  beforeEach: () => {
    usePanelStore.getState().closeAll();
    usePanelStore
      .getState()
      .openPanel("sesion", { accion: "recuperar", token: "enlace-story" });
  },
};
export const VerificarCorreo: Story = {
  beforeEach: () => {
    usePanelStore.getState().closeAll();
    usePanelStore
      .getState()
      .openPanel("sesion", { accion: "verificar", token: "enlace-story" });
  },
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(
      panel.getByRole("button", { name: "Verificar correo" }),
    );
    await waitFor(() =>
      expect(identidadApi.confirmarVerificacion).toHaveBeenCalledWith(
        "enlace-story",
      ),
    );
  },
};
export const MiCuenta: Story = {
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
  },
};
export const CerrarSesion: Story = {
  ...MiCuenta,
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(
      await panel.findByRole("button", { name: "Cerrar sesión" }),
    );
    await waitFor(() => expect(useSesionStore.getState().sesion).toBeNull());
    await expect(identidadApi.logout).toHaveBeenCalledOnce();
  },
};
export const Usuarios: Story = {
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
  },
  render: () => (
    <QueryProvider>
      <UsuariosPanel entryKey="usuarios-story" />
    </QueryProvider>
  ),
};
export const UsuariosOscuro: Story = {
  ...Usuarios,
  globals: { theme: "dark" },
};
export const UsuariosVacio: Story = {
  ...Usuarios,
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
    identidadApi.usuarios = fn(async () => ({ total: 0, elementos: [] }));
  },
};
export const UsuariosError: Story = {
  ...Usuarios,
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
    identidadApi.usuarios = fn(async () => {
      throw new ApiError(503, "Servicio no disponible");
    });
  },
};
export const EditarRol: Story = {
  ...Usuarios,
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(
      panel.getByRole("button", { name: "Roles y permisos" }),
    );
    await userEvent.click(
      await panel.findByRole("button", { name: "Editar Operador" }),
    );
    await userEvent.click(panel.getByRole("checkbox", { name: /Crear mesas/ }));
    await userEvent.type(
      panel.getByLabelText("Motivo del cambio", { exact: false }),
      "Asignación autorizada para operación",
    );
    await userEvent.click(panel.getByRole("button", { name: "Guardar rol" }));
    await waitFor(() =>
      expect(identidadApi.editarRol).toHaveBeenCalledWith("operador", {
        nombre: "Operador",
        permisos: ["usuarios:leer", "mesas:abrir"],
        motivo: "Asignación autorizada para operación",
      }),
    );
  },
};
export const SinPermiso: Story = {
  ...Usuarios,
  beforeEach: () => {
    useSesionStore
      .getState()
      .iniciarSesion({
        ...login,
        permisos: [],
        usuario: { ...usuario, permisos: [], codigo_rol: "ciudadano" },
      });
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
  },
};

export const SelectEnPanelApilado: Story = {
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    let panel = within(await canvas.findByRole("dialog"));
    await expect(
      panel.getByRole("link", { name: "Administrar usuarios y permisos" }),
    ).toHaveAttribute("href", "/plataforma/usuarios");
    // Verificar el Select del kit dentro de una pila de paneles, independientemente
    // del enlace que ahora lleva a la ruta privada de administración.
    usePanelStore.getState().openPanel("usuarios", {});
    panel = within(
      await canvas.findByRole("dialog", { name: "Usuarios y permisos" }),
    );
    await userEvent.click(
      await panel.findByRole("button", { name: "Crear usuario" }),
    );
    await userEvent.click(panel.getByRole("combobox", { name: /Rol/ }));
    const opcion = await within(document.body).findByRole("option", {
      name: "Operador",
    });
    await waitFor(() => {
      const rect = opcion.getBoundingClientRect();
      const elemento = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      expect(elemento === opcion || opcion.contains(elemento)).toBe(true);
    });
    await userEvent.click(opcion);
    await expect(
      panel.getByRole("combobox", { name: /Rol/ }),
    ).toHaveTextContent("Operador");
  },
};
export const NavegacionAdministrador: Story = {
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
  },
  render: () => (
    <QueryProvider>
      <Home />
      <PanelHost />
    </QueryProvider>
  ),
};
export const NavegacionAdministradorOscuro: Story = {
  ...NavegacionAdministrador,
  globals: { theme: "dark" },
};

let rechazarPerfil: ((error: Error) => void) | undefined;
let perfilPendiente: Promise<Usuario> | undefined;
export const SesionNuevaConRespuestaAnterior: Story = {
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    perfilPendiente = new Promise<Usuario>((_, reject) => {
      rechazarPerfil = reject;
    });
    identidadApi.perfil = fn(
      () => perfilPendiente ?? Promise.reject(new Error("Sin solicitud")),
    );
  },
  render: () => (
    <QueryProvider>
      <SesionSync />
      <PanelHost />
    </QueryProvider>
  ),
  play: async () => {
    await waitFor(() => expect(identidadApi.perfil).toHaveBeenCalled());
    useSesionStore
      .getState()
      .iniciarSesion({ ...login, token_acceso: "sesion-nueva-story" });
    rechazarPerfil?.(new ApiError(401, "La sesión anterior fue revocada"));
    await perfilPendiente?.catch(() => undefined);
    await expect(useSesionStore.getState().sesion?.token).toBe(
      "sesion-nueva-story",
    );
  },
};
