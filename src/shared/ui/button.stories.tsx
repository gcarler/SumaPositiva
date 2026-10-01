import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Componentes/Button",
  component: Button,
  args: { children: "Participar", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "ember",
        "outline",
        "secondary",
        "ghost",
        "link",
        "destructive",
      ],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg", "icon", "icon-sm"],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Acciones con foco visible, tamaño consistente y estados disabled/loading. `asChild` permite enlaces; especifica `type=submit` en formularios. Usa `unstyled` únicamente en controles compuestos.",
      },
    },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Participar" }),
    );
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const Ember: Story = { args: { variant: "ember" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Link: Story = {
  args: { variant: "link", children: "Ver metodología" },
};
export const Destructive: Story = {
  args: { variant: "destructive", children: "Eliminar borrador" },
};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = {
  args: { loading: true, loadingLabel: "Publicando…" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button")).toBeDisabled();
  },
};
export const WithIcon: Story = {
  args: {
    children: (
      <>
        Crear mesa
        <ArrowRight aria-hidden="true" />
      </>
    ),
  },
};
export const IconOnly: Story = {
  args: {
    size: "icon",
    variant: "outline",
    "aria-label": "Crear mesa",
    children: <Plus aria-hidden="true" />,
  },
};
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Compacto</Button>
      <Button>Estándar</Button>
      <Button size="lg">Destacado</Button>
    </div>
  ),
};
export const AsLink: Story = {
  args: {
    asChild: true,
    children: <a href="#contenido">Explorar políticas</a>,
  },
};

export const TarjetaConReflujo: Story = {
  render: () => (
    <div className="w-64">
      <Button variant="unstyled" size="unstyled" className="w-full rounded-lg border border-border p-4 text-left">
        Una tarjeta con texto extenso debe conservar todo su contenido al ajustarse al ancho de una pantalla pequeña.
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(getComputedStyle(button).whiteSpace).toBe("normal");
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
  },
};
