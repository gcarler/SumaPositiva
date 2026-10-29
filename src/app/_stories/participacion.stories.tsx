import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { QueryProvider } from "@/app/_composition/query-provider";
import { PanelHost } from "@/app/_components/panel-host";
import { usePanelStore } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type { Usuario } from "@/features/sesion/services/identidad-api";

const perfil: Usuario = {
  id: "01900000-0000-7000-8000-000000000001",
  nombres: "Ana",
  apellidos: "Torres",
  correo: "ana@example.org",
  codigo_rol: "funcionario",
  activo: true,
  correo_verificado_en: null,
  nivel_identidad: "declarada",
  permisos: [
    "usuarios:leer",
    "formularios:leer",
    "auditoria:leer",
  ],
};

/** Transporte aislado de historias: intercepta solo /participacion. Nunca toca el backend real. */
function simularApiParticipacion() {
  const fetchOriginal = window.fetch;
  window.fetch = async (input, opciones) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (url.pathname === "/api/v1/participacion/consolidado") {
      return Response.json({
        gran_total_participantes_distrital: 12451,
        participantes_unicos_identificados: 9877,
        total_canal_web: 5210,
        total_canal_mesas: 6230,
        total_canal_escenarios: 1011,
        porcentaje_canal_web: 41.84,
        porcentaje_canal_mesas: 50.03,
        porcentaje_canal_escenarios: 8.12,
        desglose_territorial_agregado: [
          { territorio: "La Popa", codigo: "LPO", total_participacion: 850 },
          { territorio: "San Diego", codigo: "SDI", total_participacion: 412 },
        ],
        fecha_corte: new Date().toISOString(),
      });
    }
    if (url.pathname === "/api/v1/participacion/canal-web") {
      return Response.json({
        total_aportes: 842,
        total_apoyos: 1963,
        total_respuestas_formularios: 512,
        participantes_unicos_web: 1480,
        por_linea_estrategica: [
          {
            linea_id: "l1",
            codigo: "L1",
            titulo: "Convivencia y seguridad humana",
            dimension_codigo: "ds",
            dimension_nombre: "Derechos sociales",
            total_aportes: 312,
            total_apoyos: 812,
          },
        ],
        por_dimension: [
          { dimension_id: "d1", codigo: "ds", nombre: "Derechos sociales", total_aportes: 418 },
        ],
        por_territorio: [
          { territorio_id: "t1", codigo: "LPO", nombre: "La Popa", total_aportes: 128 },
        ],
        porLineaEstrategica: { L1: 312 },
        porDimension: { ds: 418 },
      });
    }
    if (url.pathname === "/api/v1/participacion/canal-mesas") {
      return Response.json({
        total_mesas_principales: 15,
        total_submesas: 42,
        total_participantes: 6230,
        participantes_unicos_mesas: 4100,
        total_actas_cerradas: 12,
        jerarquia_mesas: [
          {
            id: "m1",
            codigo: "M-01",
            nombre: "Mesa de seguridad La Popa",
            path: "La Popa",
            tipo_mesa: "corregimiento",
            asistentes_conteo: 320,
            acta_firmada: false,
            submesas: [
              {
                id: "m1-s1",
                codigo: "M-01-1",
                nombre: "Barrio Olaya Herrera",
                path: "La Popa / Olaya Herrera",
                tipo_mesa: "barrio",
                asistentes_conteo: 80,
              },
            ],
            territorio: "LPO",
            territorio_nombre: "La Popa",
          },
        ],
        porMesa: { "M-01": 320 },
      });
    }
    if (url.pathname === "/api/v1/participacion/escenarios-especiales") {
      return Response.json([
        {
          id: "e1",
          codigo_unico: "ESC-001",
          nombre: "Foro Gremial de Comerciantes",
          tipo_escenario: "FORO_GREMIAL",
          territorio_id: "t1",
          territorio_nombre: "La Popa",
          fecha: "2026-10-02",
          lugar: "Plaza de la Aduana",
          entidad_convocante: "Cámara de Comercio de Cartagena",
          total_asistentes: 145,
          desglose_poblacional: { hombres: 62, mujeres: 78, otros: 5 },
          sintesis_acuerdos: null,
          estado: "REALIZADO",
        },
      ]);
    }
    return fetchOriginal(input, opciones);
  };
  return () => {
    window.fetch = fetchOriginal;
  };
}

const meta = {
  title: "Plataforma/Participación",
  parameters: { layout: "fullscreen", polis: { screen: true } },
  beforeEach: () => {
    const restaurarApiParticipacion = simularApiParticipacion();
    useSesionStore.getState().iniciarSesion({
      usuario: { ...perfil, codigo_rol: "funcionario" },
      rol: "funcionario",
      permisos: perfil.permisos,
      nivel_identidad: "declarada",
      token_acceso: "token-storybook",
      expira_en: "2099-01-01T00:00:00Z",
    });
    usePanelStore.getState().closeAll();
    return () => {
      restaurarApiParticipacion();
      usePanelStore.getState().closeAll();
      useSesionStore.getState().limpiarSesion();
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

export const MulticanalConsolidado: Story = {
  beforeEach: () =>
    usePanelStore.getState().openPanel("participacion-multicanal", {}),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    /* El tablist es operable por teclado (APG): flechas mueven el valor activo. */
    await expect(panel.getByRole("tablist")).toBeVisible();
    const tabConsolidado = panel.getByRole("tab", { name: "Consolidado" });
    const tabWeb = panel.getByRole("tab", { name: "Canal Web" });
    /* El panel consume los datos simulados: cifras del consolidado visibles. */
    await waitFor(async () => {
      await expect(panel.getByText(/12[.,]?451/)).toBeVisible();
    });
    tabConsolidado.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(tabWeb.getAttribute("aria-selected")).toBe("true"),
    );
    /* El canal web llega desde el mock: al menos una línea estratégica. */
    await expect(
      panel.getByText(/Convivencia y seguridad humana/i),
    ).toBeVisible();
  },
};
export const MulticanalConsolidadoOscuro: Story = {
  ...MulticanalConsolidado,
  globals: { theme: "dark" },
};

export const MesasDesglosadas: Story = {
  beforeEach: () =>
    usePanelStore
      .getState()
      .openPanel("participacion-multicanal", { canalInicial: "mesas" }),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await waitFor(() =>
      expect(
        panel.getByRole("tab", { selected: true }).textContent || "",
      ).toMatch(/mesa/i),
    );
    await expect(panel.getByText(/Mesa de seguridad La Popa/i)).toBeVisible();
    await expect(panel.getByText(/Olaya Herrera/i)).toBeVisible();
  },
};
export const MesasDesglosadasOscuro: Story = { ...MesasDesglosadas, globals: { theme: "dark" } };

export const Escenarios: Story = {
  beforeEach: () =>
    usePanelStore
      .getState()
      .openPanel("participacion-multicanal", { canalInicial: "escenarios" }),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await expect(
      panel.getByText(/Foro Gremial de Comerciantes/i),
    ).toBeVisible();
    await expect(panel.getByText(/Cámara de Comercio/i)).toBeVisible();
  },
};
export const EscenariosOscuro: Story = { ...Escenarios, globals: { theme: "dark" } };
