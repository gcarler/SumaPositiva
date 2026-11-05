import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, fn, userEvent, within } from "storybook/test";
import { GeovisorCharts } from "@/features/geovisor/components/geovisor-charts";
import { ANALITICA_DEMO } from "@/features/geovisor/__fixtures__/analitica.fixture";
import { useGeovisorAnaliticaStore } from "@/features/geovisor/state/geovisor-analitica-store";

function EntornoAislado({ children }: { children: ReactNode }) {
  const [cliente] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

const meta = {
  title: "Plataforma/Datos/Series multifuente",
  component: GeovisorCharts,
  parameters: { layout: "padded", polis: { screen: true } },
  decorators: [(Story) => <EntornoAislado><Story /></EntornoAislado>],
  beforeEach: () => { useGeovisorAnaliticaStore.getState().limpiar(); },
  args: {
    datosIniciales: ANALITICA_DEMO,
    onTerritorioChange: fn(),
    onVariableChange: fn(),
  },
} satisfies Meta<typeof GeovisorCharts>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AnalisisSinSeleccion: Story = { args: { datosIniciales: { ...ANALITICA_DEMO, total_observaciones: 0, series: [], serie: null, cobertura_fuentes: [] } } };

export const LocalidadSeleccionada: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Barras por año" }));
    await expect(canvas.getByRole("button", { name: "Barras por año" })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("heading", { name: "Indicador ficticio de demostración" })).toBeVisible();
  },
};

export const TemaOscuro: Story = { globals: { theme: "dark" } };
