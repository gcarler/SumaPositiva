import { simularApiFormularios } from "./formularios-mock-api";
import { formulariosRemotos } from "@/features/formularios/services/formularios-remotos";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { QueryProvider } from "@/app/_composition/query-provider";
import { FormularioPublicoPage } from "@/features/formularios/views/formulario-publico-view";
import { CompartirFormulario } from "@/features/formularios/components/compartir-formulario";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import {
  formularioVacio,
  type Formulario,
} from "@/features/formularios/models/formulario";
const form: Formulario = {
  ...formularioVacio(),
  id: "publico-demo",
  origenDatos: "api",
  titulo: "Consulta ciudadana",
  descripcion: "Participa desde un enlace compartido.",
  estado: "activo",
  preguntas: [
    {
      id: "detalle",
      tipo: "texto_corto",
      texto: "Tu propuesta",
      orden: 0,
      obligatoria: true,
    },
  ],
  configuracion: {
    ...formularioVacio().configuracion,
    slug: "consulta-ciudadana",
    urlPublica: "https://seguridadhumanaintegral.org/f/consulta-ciudadana",
  },
};
const meta = {
  title: "Plataforma/Formularios públicos",
  parameters: { layout: "fullscreen", polis: { screen: true } },
  beforeEach: () => {
    const restaurar = simularApiFormularios();
    formulariosRemotos.publico = async () => structuredClone(form);
    const anterior = useFormulariosStore.getState();
    const sesion = useSesionStore.getState();
    useFormulariosStore.setState({
      formularios: [structuredClone(form)],
      respuestas: [],
    });
    useSesionStore.setState({ sesion: null, cargando: false });
    return () => {
      restaurar();
      useFormulariosStore.setState(anterior);
      useSesionStore.setState(sesion);
    };
  },
  render: () => (
    <QueryProvider>
      <FormularioPublicoPage slug={form.configuracion.slug} inicial={form} />
    </QueryProvider>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Publico: Story = {};
export const Oscuro: Story = { globals: { theme: "dark" } };
export const Movil: Story = {
  render: () => (
    <div className="w-80 max-w-full">
      <QueryProvider>
        <FormularioPublicoPage slug={form.configuracion.slug} inicial={form} />
      </QueryProvider>
    </div>
  ),
};
export const EnviarSinLogin: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(
      c.getByLabelText(/Tu propuesta/),
      "Mejorar el alumbrado",
    );
    await userEvent.click(c.getByRole("button", { name: "Enviar respuesta" }));
    await expect(await c.findByText("Respuesta recibida")).toBeVisible();
    expect(
      useFormulariosStore.getState().respuestas[0].respuestas.detalle,
    ).toBe("Mejorar el alumbrado");
  },
};
export const Cerrado: Story = {
  render: () => (
    <QueryProvider>
      <FormularioPublicoPage
        slug={form.configuracion.slug}
        inicial={{ ...form, estado: "cerrado" }}
      />
    </QueryProvider>
  ),
};
export const Compartir: Story = {
  render: () => (
    <div className="max-w-xl p-4">
      <CompartirFormulario form={form} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    expect(c.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
    expect(c.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      expect.stringContaining("t.me/share/url"),
    );
    await userEvent.click(c.getByRole("button", { name: "QR" }));
    await expect(c.getByRole("img", { name: /Código QR/ })).toBeVisible();
  },
};
export const CompartirMovil: Story = {
  render: () => (
    <div className="w-80 max-w-full p-4">
      <CompartirFormulario form={form} />
    </div>
  ),
};
export const CompartirBorrador: Story = {
  render: () => (
    <div className="p-4">
      <CompartirFormulario form={{ ...form, estado: "borrador" }} />
    </div>
  ),
};
