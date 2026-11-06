import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PanelHost } from "@/app/_components/panel-host";
import { QueryProvider } from "@/app/_composition/query-provider";
import { usePanelStore } from "@/core/panels/panel-store";
import { useCompromisosStore } from "@/features/seguimiento/state/compromisos-store";
import { COMPROMISOS_PAS_CANONICOS } from "@/features/seguimiento/data/compromisos-pas.data";
import { useSesionStore } from "@/features/sesion/state/session-store";

const meta = {
  title: "Plataforma/Compromisos PAS",
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  beforeEach: () => {
    const anterior = useCompromisosStore.getState();
    const sesionAnterior = useSesionStore.getState();
    usePanelStore.getState().closeAll();
    useSesionStore.getState().limpiarSesion();
    useCompromisosStore.setState({ compromisos: [], cargando: false });
    return () => {
      usePanelStore.getState().closeAll();
      useCompromisosStore.setState(anterior);
      useSesionStore.setState(sesionAnterior);
    };
  },
  render: () => <QueryProvider><PanelHost /></QueryProvider>,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const IdentificadorObsoleto: Story = {
  beforeEach: () => usePanelStore.getState().openPanel("compromiso-editor", { compromisoId: "id-obsoleto", modo: "editar" }),
  play: async ({ canvasElement }) => {
    const dialogo = within(await within(canvasElement).findByRole("dialog"));
    await expect(dialogo.getByRole("alert")).toHaveTextContent("El compromiso seleccionado no está en la lista actual");
    await expect(dialogo.queryByRole("spinbutton")).not.toBeInTheDocument();
    await expect(dialogo.queryByRole("button", { name: /Actualizar Avance|Registrar/ })).not.toBeInTheDocument();
  },
};

export const ConsultaExistente: Story = {
  beforeEach: () => {
    useCompromisosStore.setState({ compromisos: [structuredClone(COMPROMISOS_PAS_CANONICOS[0])] });
    usePanelStore.getState().openPanel("compromiso-editor", { compromisoId: COMPROMISOS_PAS_CANONICOS[0].id, modo: "ver", soloLectura: true });
  },
  play: async ({ canvasElement }) => {
    const dialogo = within(await within(canvasElement).findByRole("dialog"));
    await expect(dialogo.getByLabelText(/Valor Acumulado Medido/)).toBeDisabled();
    await expect(dialogo.queryByText("Datos del Nuevo Compromiso PAS")).not.toBeInTheDocument();
  },
};
