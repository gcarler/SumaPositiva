import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { GeovisorCharts } from "@/features/geovisor/components/geovisor-charts";

const meta = {
  title: "Plataforma/Geovisor/GeovisorCharts",
  component: GeovisorCharts,
  parameters: { layout: "padded", polis: { screen: true } },
  args: {
    territorioId: "loc-1",
    variableMapa: "ish",
    onTerritorioChange: fn(),
    onVariableChange: fn(),
  },
} satisfies Meta<typeof GeovisorCharts>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AnalisisSinSeleccion: Story = {};

export const LocalidadSeleccionada: Story = {
  args: { territorioId: "loc-2", variableMapa: "alertas" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /Seleccionar Localidad 3/ })[0]);
    await expect(args.onTerritorioChange).toHaveBeenCalledWith("loc-3");
    await userEvent.hover(canvas.getByRole("button", { name: /Mostrar dimensión Comunitaria/ }));
    await expect(args.onVariableChange).toHaveBeenCalledWith("comunitaria");
  },
};

export const TemaOscuro: Story = { globals: { theme: "dark" } };
