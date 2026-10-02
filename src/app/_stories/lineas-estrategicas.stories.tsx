import { PanelHost } from "@/app/_components/panel-host";
import { usePanelStore } from "@/core/panels/panel-store";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, expect, userEvent, within, waitFor } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArquitecturaPolitica } from "@/features/politicas/components/arquitectura-politica";
import { LineaEditorPanel } from "@/features/politicas/panels/linea-editor-panel";
import {
  lineasApi,
  type LineaPersistida,
} from "@/features/politicas/services/lineas-api";
import { matrizCsv } from "@/features/politicas/services/lineas-export";
import { useSesionStore } from "@/features/sesion/state/session-store";
const originales = { ...lineasApi };
const dimensiones = [
  "economica",
  "alimentaria",
  "salud",
  "ambiental",
  "personal",
  "comunitaria",
  "politica",
].map((codigo, i) => ({
  id: `01900000-0000-7000-8000-00000000000${i + 1}`,
  codigo,
  nombre: `Seguridad ${codigo}`,
  activa: true,
}));
const fases = [
  {
    id: "01900000-0000-7000-8000-000000000008",
    codigo: "FORMULACION",
    nombre: "Formulación",
  },
];
const linea: LineaPersistida = {
  id: "01900000-0000-7000-8000-000000000009",
  codigo: "LE-04",
  titulo: "Entornos seguros",
  descripcion: "Recuperar entornos barriales",
  fase_id: fases[0].id,
  dimension_id: dimensiones[3].id,
  problema_abordado: "Entornos deteriorados",
  objetivo_especifico: "Mejorar el entorno",
  entidad_lider: "Secretaría de Planeación",
  fuentes_financiacion: ["FONSET"],
  costo_estimado: "1000000",
  activa: true,
  sublineas: [
    {
      codigo: "LE-04.1",
      titulo: "Iluminación barrial",
      descripcion: "Proyecto de iluminación",
      meta_cuatrienal: "100 puntos",
      indicador_nombre: "Puntos iluminados",
      actor_coresponsable: "Infraestructura",
    },
  ],
};
const meta = {
  title: "POLIS/Plataforma/Líneas estratégicas",
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/plataforma/contenido" },
    },
    a11y: { test: "error" },
  },
  beforeEach: () => {
    const sesionAnterior = useSesionStore.getState();
    usePanelStore.getState().closeAll();
    Object.assign(lineasApi, {
      listar: fn().mockResolvedValue([structuredClone(linea)]),
      dimensiones: fn().mockResolvedValue(dimensiones),
      fases: fn().mockResolvedValue(fases),
      guardar: fn().mockResolvedValue(linea),
      eliminar: fn().mockRejectedValue(
        new Error("La línea tiene registros vinculados"),
      ),
    });
    useSesionStore.setState({
      cargando: false,
      errorSesion: null,
      sesion: {
        modo: "identidad",
        rol: "administrador_identidades",
        permisos: ["politicas:gestionar"],
        sesionId: "qa",
        usuarioId: "01900000-0000-7000-8000-000000000010",
        token: "qa",
        expiraEn: new Date(Date.now() + 3600000).toISOString(),
        desde: new Date().toISOString(),
      },
    });
    return () => {
      Object.assign(lineasApi, originales);
      usePanelStore.getState().closeAll();
      useSesionStore.setState(sesionAnterior);
    };
  },
  decorators: [
    (Story) => (
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Jerarquia: Story = {
  render: () => <ArquitecturaPolitica />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Seguridad politica")).toBeVisible();
    await userEvent.click(
      await c.findByRole("button", { name: /LE-04 · Entornos/ }),
    );
    await expect(await c.findByText("Iluminación barrial")).toBeVisible();
    await expect(c.getByText("100 puntos")).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: "Eliminar LE-04" }));
    await expect(
      c.getByRole("button", { name: "Confirmar eliminación" }),
    ).toBeVisible();
    await userEvent.click(
      c.getByRole("button", { name: "Confirmar eliminación" }),
    );
    await waitFor(() =>
      expect(lineasApi.eliminar).toHaveBeenCalledWith(linea.id),
    );
    await expect(c.getByText("Iluminación barrial")).toBeVisible();
    await expect(
      matrizCsv(dimensiones, [{ ...linea, titulo: "=1+1" }]),
    ).toContain("'=1+1");
  },
};
export const Editor: Story = {
  render: () => <LineaEditorPanel entryKey="qa-linea" lineaId={linea.id} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole("textbox", { name: "Título" })).toHaveValue(
      linea.titulo,
    );
    await userEvent.click(c.getByRole("button", { name: "Agregar sublínea" }));
    await expect(
      c.getAllByRole("textbox", { name: "Código hijo" })[1],
    ).toHaveValue("LE-04.2");
    await userEvent.type(
      c.getAllByRole("textbox", {
        name: "Título de la intervención",
      })[1],
      "Recuperar parques",
    );
    await userEvent.click(
      c.getByRole("button", { name: "Guardar línea estratégica" }),
    );
    await waitFor(() => expect(lineasApi.guardar).toHaveBeenCalled());
  },
};
export const Auditor: Story = {
  beforeEach: () => {
    useSesionStore.setState({
      sesion: {
        modo: "identidad",
        rol: "auditor_forense",
        permisos: [],
        sesionId: "auditor",
        desde: new Date().toISOString(),
      },
    });
  },
  render: () => <ArquitecturaPolitica />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Seguridad politica")).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: /LE-04 · Entornos/ }));
    await expect(
      c.queryByRole("button", { name: "Editar LE-04" }),
    ).not.toBeInTheDocument();
    await expect(
      c.queryByRole("button", { name: "Nueva Línea Estratégica" }),
    ).not.toBeInTheDocument();
  },
};
export const Movil: Story = {
  parameters: {
    viewport: {
      options: {
        movil: { name: "320px", styles: { width: "320px", height: "740px" } },
      },
    },
    viewportMode: "movil",
  },
  render: () => (
    <div style={{ width: 320, maxWidth: "100%" }}>
      <ArquitecturaPolitica />
    </div>
  ),
};
export const ErrorCarga: Story = {
  beforeEach: () => {
    lineasApi.listar = fn().mockRejectedValue(new Error("API no disponible"));
  },
  render: () => <ArquitecturaPolitica />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("API no disponible")).toBeVisible();
    await expect(c.getByRole("button", { name: "Reintentar" })).toBeVisible();
  },
};

export const EditorMovilOscuro: Story = {
  render: () => (
    <div className="dark" style={{ width: 320, maxWidth: "100%" }}>
      <LineaEditorPanel entryKey="movil" lineaId={linea.id} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByRole("textbox", { name: "Título" });
    const wrapper = canvasElement.firstElementChild as HTMLElement;
    await expect(wrapper.scrollWidth).toBeLessThanOrEqual(320);
  },
};
export const EditorMovilClaro: Story = {
  ...EditorMovilOscuro,
  render: () => (
    <div style={{ width: 320, maxWidth: "100%" }}>
      <LineaEditorPanel entryKey="movil" lineaId={linea.id} />
    </div>
  ),
};

export const NavegacionPanel: Story = {
  render: () => (
    <>
      <div id="polis-application">
        <ArquitecturaPolitica />
      </div>
      <PanelHost />
    </>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const boton = await c.findByRole("button", {
      name: "Nueva Línea Estratégica",
    });
    await userEvent.click(boton);
    const dialog = await c.findByRole(
      "dialog",
      {
        name: "Nueva línea estratégica",
      },
      { timeout: 10000 },
    );
    await waitFor(() => expect(dialog).toHaveFocus());
    await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(c.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(boton).toHaveFocus());
  },
};
