import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within, fn, userEvent, waitFor } from "storybook/test";
import { ApiError, setBearerToken } from "@/core/http/api-client";
import { QueryProvider } from "@/app/_composition/query-provider";
import { PanelHost } from "@/app/_components/panel-host";
import { usePanelStore } from "@/core/panels/panel-store";
import { PlataformaShell } from "@/features/plataforma/components/plataforma-shell";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { sincronizarSesion } from "@/features/sesion/services/sincronizar-sesion";
import { sesionActiva } from "@/features/plataforma/models/acceso";
import {
  identidadApi,
  type Usuario,
  type MfaEstado,
} from "@/features/sesion/services/identidad-api";

/* Recordatorio 186: la sesión puede llegar con permisos vacíos conservando el
 * rol interno (restaurada o tras un cambio de rol); la restricción se deriva
 * del estado MFA real consultado por la sincronización, no del login. */
const usuarioLimitado: Usuario = {
  id: "01900000-0000-7000-8000-000000000006",
  nombres: "Rosa",
  apellidos: "Martínez",
  correo: "rosa.martinez@cartagena.gov.co",
  codigo_rol: "administrador_identidades",
  activo: true,
  correo_verificado_en: null,
  nivel_identidad: "declarada",
  permisos: [],
  mfa_activo: false,
};
/* El mismo usuario con permisos efectivos, tal como debe responder el
 * endpoint /perfil una vez acreditada la sesión (contrato EDD 181). */
const usuarioPleno: Usuario = {
  ...usuarioLimitado,
  permisos: [
    "alternativas:gestionar",
    "indicadores:gestionar",
    "politicas:gestionar",
    "seguimiento:gestionar",
  ],
};
const estadoMfaExigido: MfaEstado = {
  activo: false,
  activado_en: null,
  codigos_restantes: 0,
  exigido_por_rol: true,
  sesion_verificada: false,
};
const estadoMfaActivoVerificado: MfaEstado = {
  activo: true,
  activado_en: "2026-10-26T00:00:00.000Z",
  codigos_restantes: 8,
  exigido_por_rol: true,
  sesion_verificada: true,
};
function responderPerfilPleno() {
  identidadApi.perfil = fn(async () => {
    setBearerToken(useSesionStore.getState().sesion?.token ?? null);
    return usuarioPleno;
  });
}

function sembrarSesionRestaurada() {
  useSesionStore.setState({
    cargando: false,
    errorSesion: null,
    estadoMfa: null,
    sesion: {
      modo: "institucional",
      identidad: {
        nombre: "Rosa Martínez",
        email: usuarioLimitado.correo,
      },
      usuarioId: usuarioLimitado.id,
      usuario: usuarioLimitado,
      rol: usuarioLimitado.codigo_rol,
      permisos: [],
      token: "token-sesion-limitada-storybook",
      expiraEn: "2099-01-01T00:00:00Z",
      desde: "2026-10-26T00:00:00.000Z",
    },
  });
}

const mfaIniciarResp = {
  secreto_b32: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  otpauth_uri: "otpauth://totp/POLIS:rosa.martinez@cartagena.gov.co?secret=JBSWY3DPEHPK3PXP",
  qr_code_base64:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
};
const mfaActivarResp = {
  mensaje: "MFA activado para esta sesión",
  codigos_recuperacion: [
    "AAAA-1111",
    "BBBB-2222",
    "CCCC-3333",
    "DDDD-4444",
    "EEEE-5555",
    "FFFF-6666",
    "GGGG-7777",
    "HHHH-8888",
  ],
};
const apiIdentidadOriginal = { ...identidadApi };

const meta = {
  title: "Plataforma/Sesión restringida por MFA",
  parameters: {
    layout: "fullscreen",
    polis: { screen: true },
    nextjs: { appDirectory: true, navigation: { pathname: "/plataforma" } },
  },
  beforeEach: async () => {
    const anterior = useSesionStore.getState();
    /* Aislamiento de persistencia (237): el store de sesión es module-sigleton
     * con persist en `sessionStorage` del tab, compartido por todas las
     * historias; una rehidratación tardía o un estado heredado de otra historia
     * puede sustituir la sesión sembrada a mitad del play. Se limpia el
     * snapshot persistido y se espera a que toda rehidratación pendiente
     * termine antes de sembrar; el estado sembrado queda como único válido. */
    useSesionStore.persist.clearStorage();
    await useSesionStore.persist.rehydrate();
    sembrarSesionRestaurada();
    usePanelStore.getState().closeAll();
    identidadApi.perfil = fn(async () => usuarioLimitado);
    identidadApi.mfaEstado = fn(async () => estadoMfaExigido);
    identidadApi.logout = fn(async () => ({ mensaje: "Sesión cerrada" }));
    /* Registro TOTP real del panel "Mi cuenta" (H2): inicia, confirma y
     * devuelve los códigos de recuperación; el perfil pleno lo instala
     * responderPerfilPleno() para simular la acreditación del backend. */
    identidadApi.mfaIniciar = fn(async () => mfaIniciarResp);
    identidadApi.mfaActivar = fn(async () => mfaActivarResp);
    identidadApi.sesiones = fn(async () => [
      {
        id: "01900000-0000-7000-8000-0000000000aa",
        creada_en: "2026-10-26T00:00:00.000Z",
        expira_en: "2099-01-01T00:00:00.000Z",
        actual: true,
      },
    ]);
    return () => {
      useSesionStore.setState(anterior);
      useSesionStore.getState().limpiarSesion();
      Object.assign(identidadApi, apiIdentidadOriginal);
    };
  },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <p>Contenido institucional oculto por la restricción.</p>
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const EnrolamientoPendiente: Story = {
  play: async ({ canvasElement }) => {
    /* Flujo 186 real: la restauración consulta el estado MFA porque el perfil
     * llega con permisos vacíos conservando el rol interno. */
    await sincronizarSesion();
    const c = within(canvasElement);
    await expect(
      await c.findByRole("heading", { name: "Acceso restringido" }),
    ).toBeVisible();
    await expect(
      await c.findByText(/Acceso restringido hasta activar/),
    ).toBeVisible();
    /* Acciones reales: configurar el factor y cerrar sesión; el contenido
     * institucional no queda disponible con el rol nominal. */
    await expect(
      c.getByRole("button", { name: "Configurar verificación en dos pasos" }),
    ).toBeVisible();
    await expect(
      c.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeVisible();
    await expect(
      c.queryByText("Contenido institucional oculto por la restricción."),
    ).toBeNull();
    expect(identidadApi.mfaEstado).toHaveBeenCalled();
  },
};

export const EnrolamientoPendienteOscuro: Story = {
  ...EnrolamientoPendiente,
  globals: { theme: "dark" },
};

/* Cambio de rol a uno exigente en una sesión ya activa: factor configurado
 * pero sin desafío de esta sesión; la acción correcta es volver a iniciar
 * sesión. */
export const SesionPreviaSinAcreditar: Story = {
  beforeEach: async () => {
    sembrarSesionRestaurada();
    useSesionStore.setState({
      estadoMfa: {
        activo: true,
        activado_en: "2026-09-01T00:00:00.000Z",
        codigos_restantes: 8,
        exigido_por_rol: true,
        sesion_verificada: false,
      },
    });
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByText(/Sesión sin verificar/),
    ).toBeVisible();
    await expect(
      c.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeVisible();
    await expect(
      c.queryByRole("button", {
        name: "Configurar verificación en dos pasos",
      }),
    ).toBeNull();
    await expect(
      c.queryByText("Contenido institucional oculto por la restricción."),
    ).toBeNull();
    await userEvent.click(c.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() =>
      expect(useSesionStore.getState().sesion).toBeNull(),
    );
    expect(identidadApi.logout).toHaveBeenCalledOnce();
  },
};

/* Reactivo H2 (221/ID06): la activación del factor desde "Mi cuenta" refresca
 * el perfil y la cabecera deja de anunciar "Acceso restringido" sin recargar
 * la página; el contenido institucional queda disponible en el mismo shell. */
export const ActivacionReflejaShell: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await sincronizarSesion();
    await expect(
      await c.findByRole("heading", { name: "Acceso restringido" }),
    ).toBeVisible();
    /* Registro del factor con el flujo real del panel de "Mi cuenta": el
     * acreditamiento llega del servidor y el permiso efectivo del perfil. */
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("sesion", {});
    const cuerpo = within(document.body);
    await userEvent.click(
      await cuerpo.findByRole("button", {
        name: "Configurar verificación en dos pasos (TOTP)",
      }),
    );
    await waitFor(() =>
      expect(identidadApi.mfaIniciar).toHaveBeenCalledOnce(),
    );
    await expect(
      await cuerpo.findByText(/Paso 1: Escanea el código QR/),
    ).toBeVisible();
    await userEvent.type(
      await cuerpo.findByLabelText(/Código de verificación/),
      "123456",
    );
    /* El backend acredita la sesión: la siguiente lectura del perfil trae
     * los permisos efectivos y el estado MFA de esa sesión. */
    responderPerfilPleno();
    identidadApi.mfaEstado = fn(async () => estadoMfaActivoVerificado);
    await userEvent.click(
      await cuerpo.findByRole("button", { name: "Verificar y activar MFA" }),
    );
    await waitFor(() =>
      expect(identidadApi.mfaActivar).toHaveBeenCalledWith("123456"),
    );
    await waitFor(() => expect(identidadApi.perfil).toHaveBeenCalledOnce());
    /* Sin recargar la página: el shell reacciona al store y deja de anunciar
     * "Acceso restringido"; muestra el contenido institucional del mismo shell. */
    await waitFor(() =>
      expect(
        c.queryByRole("heading", { name: "Acceso restringido" }),
      ).toBeNull(),
    );
    await expect(
      c.queryByText("Contenido institucional oculto por la restricción."),
    ).toBeVisible();
    /* El anuncio de "Acceso pleno" no se repite: la cuenta muestra el
     * resultado real y el shell institucional queda disponible. */
    await expect(await cuerpo.findByText(/AAAA-1111/)).toBeVisible();
    expect(sesionActiva(useSesionStore.getState().sesion)).toBe(true);
  },
};
export const ActivacionReflejaShellOscuro: Story = {
  ...ActivacionReflejaShell,
  globals: { theme: "dark" },
};

/* Reactivo H1 (221/ID06): lectura remota del estado MFA no disponible.
 * La plataforma bloquea la decisión (no anuncia acceso pleno ni restringido)
 * y conserva la sesión para el diálogo de recuperación. */
export const LecturaMfaNoDisponible: Story = {
  play: async ({ canvasElement }) => {
    identidadApi.mfaEstado = fn(async () => {
      throw new ApiError(503, "Servicio de MFA no disponible");
    });
    await sincronizarSesion();
    const c = within(canvasElement);
    await expect(
      await c.findByRole("heading", {
        name: "Verificación en dos pasos no disponible",
      }),
    ).toBeVisible();
    await expect(
      c.queryByText("Contenido institucional oculto por la restricción."),
    ).toBeNull();
    await expect(c.queryByText(/Acceso pleno/)).toBeNull();
    await expect(
      c.getByRole("button", { name: "Revisar acceso" }),
    ).toBeVisible();
  },
};
export const LecturaMfaNoDisponibleOscuro: Story = {
  ...LecturaMfaNoDisponible,
  globals: { theme: "dark" },
};
