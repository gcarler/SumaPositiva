import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, userEvent, within, waitFor } from "storybook/test";
import MapaCartagena from "@/features/geovisor/components/mapa-cartagena";

/**
 * El mapa consulta el catálogo de capas mediante react-query: las historias
 * aisladas lo envuelven para que el fallo de red degrade a capas vacías.
 */
function ProveedorConsultas({ children }: { children: React.ReactNode }) {
  const [cliente] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
const meta = {
  title: "Plataforma/Geovisor/MapaCartagena",
  component: MapaCartagena,
  parameters: { layout: "fullscreen", polis: { screen: true } },
  args: { onSelectTerritorio: () => undefined },
  decorators: [
    (Historia: React.ComponentType) => (
      <ProveedorConsultas>
        <Historia />
      </ProveedorConsultas>
    ),
  ],
} satisfies Meta<typeof MapaCartagena>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MapaYBarrios: Story = {
  args: { onSelectTerritorio: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const mapHost = canvas.getByRole("application", {
      name: /Mapa interactivo de Cartagena de Indias/,
    });
    await waitFor(() => {
      expect(mapHost.querySelector(".ol-viewport")).toBeInTheDocument();
      expect(mapHost.querySelector(".ol-viewport canvas")).toBeInTheDocument();
    });

    const filtro = canvas.getByRole("combobox", { name: "Filtrar por localidad" });
    await expect(filtro).toHaveTextContent("Todas las localidades (205 barrios)");
    await userEvent.click(filtro);
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: /Localidad 2 \(53 barrios\)/,
      }),
    );
    await expect(filtro).toHaveTextContent("Localidad 2 (53 barrios)");

    const search = canvas.getByRole("textbox", { name: "Buscar territorio o barrio" });
    await userEvent.type(search, "boquilla");
    const suggestions = await canvas.findByRole("list", { name: "Resultados de búsqueda" });
    await expect(within(suggestions).getByText("LA BOQUILLA")).toBeVisible();
    await expect(within(suggestions).getByText(/Localidad 2 · UCG/)).toBeVisible();

    await userEvent.click(within(suggestions).getByRole("button", { name: /LA BOQUILLA/ }));
    await expect(search).toHaveValue("LA BOQUILLA");
    await expect(filtro).toHaveTextContent("Localidad 2 (53 barrios)");
    await expect(args.onSelectTerritorio).toHaveBeenCalledWith("loc-2");
    // El catálogo no ofrece geometría para mover el mapa a una ubicación barrial.
    await expect(canvas.getByText(/no coordenadas ni polígonos barriales/i)).toBeVisible();
  },
};

export const MapaOscuro: Story = { globals: { theme: "dark" } };
