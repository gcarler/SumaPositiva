import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SidePanel } from "./side-panel";
import { Button } from "./button";
import { FormField } from "./form-field";
import { Textarea } from "./textarea";
import { Notice } from "./notice";

const meta = {
  title: "Patrones/SidePanel",
  component: SidePanel,
  args: {
    title: "Construyamos una propuesta",
    kicker: "Participación ciudadana",
    subtitle:
      "Tu experiencia ayuda a identificar lo que necesita tu comunidad.",
    onClose: fn(),
    breadcrumbs: [
      { label: "Política de movilidad" },
      { label: "Formulación" },
      { label: "LE-01" },
    ],
    children: (
      <div className="ui-panel-body space-y-6">
        <Notice title="Tu aporte es público">
          Evita incluir datos personales de terceros.
        </Notice>
        <FormField label="Tu propuesta">
          {(props) => <Textarea {...props} placeholder="Describe tu idea…" />}
        </FormField>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          Descartar
        </Button>
        <Button size="sm">Publicar aporte</Button>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="ml-auto h-[640px] max-w-xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Panel visual sin stores de negocio. El host de la aplicación controla apilado, foco, Escape y retorno de foco. El contenido se desplaza mientras cabecera y acciones permanecen visibles.",
      },
    },
  },
} satisfies Meta<typeof SidePanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Cerrar panel" }),
    );
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
export const LongTitle: Story = {
  args: {
    title:
      "Formulación participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias",
  },
};
export const LongContent: Story = {
  args: {
    children: (
      <div className="ui-panel-body space-y-5">
        {Array.from({ length: 12 }, (_, index) => (
          <p
            key={index}
            className="text-sm leading-relaxed text-text-secondary"
          >
            Propuesta {index + 1}. La comunidad identifica necesidades, delibera
            sobre sus causas y construye acuerdos para mejorar el territorio.
          </p>
        ))}
      </div>
    ),
  },
};
function ResizablePanel() {
  const [maximized, setMaximized] = useState(false);
  return (
    <div
      className={maximized ? "h-[640px] w-full" : "ml-auto h-[640px] max-w-xl"}
    >
      <SidePanel
        title="Mesa territorial"
        onClose={fn()}
        maximized={maximized}
        onToggleMaximized={() => setMaximized(!maximized)}
      >
        <div className="ui-panel-body">
          <p className="text-text-secondary">
            Amplía el espacio para trabajar con comodidad.
          </p>
        </div>
      </SidePanel>
    </div>
  );
}
export const Maximizable: Story = {
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
  render: () => <ResizablePanel />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Maximizar panel" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Minimizar panel" }),
    ).toBeVisible();
  },
};
export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  args: { title: "Nueva propuesta" },
  decorators: [
    (Story) => (
      <div className="h-[700px] max-w-[360px]">
        <Story />
      </div>
    ),
  ],
};
