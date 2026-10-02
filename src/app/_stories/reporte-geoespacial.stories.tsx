import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { FotosPregunta } from "@/features/formularios/components/fotos-pregunta";
import { PreguntaUbicacionFotos } from "@/features/formularios/components/pregunta-ubicacion-fotos";
import { FORMULARIO_REPORTE_INSEGURIDAD } from "@/features/formularios/data/reporte-inseguridad";
function Fotos() {
  const [fotos, setFotos] = useState<string[]>([]);
  return <FotosPregunta fotos={fotos} cambiar={setFotos} />;
}
function Punto() {
  const [valor, setValor] = useState("");
  return (
    <PreguntaUbicacionFotos
      pregunta={FORMULARIO_REPORTE_INSEGURIDAD.preguntas.find(
        (p) => p.id === "P5",
      )!}
      valor={valor}
      cambiar={setValor}
      dimension="d1"
    />
  );
}
const meta = {
  title: "Plataforma/Reporte geoespacial",
  parameters: { layout: "padded" },
  render: () => <Punto />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Mapa: Story = {};
export const Oscuro: Story = { globals: { theme: "dark" } };
export const Movil: Story = {
  render: () => (
    <div className="w-80 max-w-full">
      <Punto />
    </div>
  ),
};
export const FotosLimite: Story = {
  render: () => <Fotos />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+xQAAAAASUVORK5CYII=",
      ),
      (x) => x.charCodeAt(0),
    );
    const fotos = Array.from(
      { length: 5 },
      (_, i) => new File([bytes], `foto-${i}.png`, { type: "image/png" }),
    );
    await userEvent.upload(c.getByLabelText("Adjuntar fotos"), [
      ...fotos,
      fotos[0],
    ]);
    await waitFor(() =>
      expect(c.getByRole("alert")).toHaveTextContent(
        "Solo puedes adjuntar 5 fotos",
      ),
    );
    expect(c.queryAllByRole("img")).toHaveLength(0);
    await userEvent.upload(
      c.getByLabelText("Adjuntar fotos"),
      fotos.slice(0, 3),
    );
    await waitFor(() => expect(c.getAllByRole("img")).toHaveLength(3));
    expect(c.getByRole("button", { name: "Agregar fotos" })).toBeVisible();
    await userEvent.upload(c.getByLabelText("Adjuntar fotos"), fotos.slice(3));
    await waitFor(() => expect(c.getAllByRole("img")).toHaveLength(5));
    expect(c.queryByRole("button", { name: "Agregar fotos" })).toBeNull();
    await userEvent.click(c.getByRole("button", { name: "Eliminar foto 1" }));
    expect(c.getAllByRole("img")).toHaveLength(4);
    expect(c.getByRole("button", { name: "Agregar fotos" })).toBeVisible();
  },
};
