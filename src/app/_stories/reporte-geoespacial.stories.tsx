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
  beforeEach: () => {
    const fetchOriginal = window.fetch;
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
          ? input.url
          : input.href;
      if (url.includes("/evidencias/subir")) {
        let archivoUrl =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+xQAAAAASUVORK5CYII=";
        if (init?.body instanceof FormData) {
          const file = init.body.get("archivo");
          if (file instanceof File) {
            try {
              archivoUrl = URL.createObjectURL(file);
            } catch {}
          }
        }
        return Response.json({
          id: "foto-mock-" + Math.random().toString(36).slice(2),
          propuesta_id: null,
          autor_sujeto_id: null,
          nombre_archivo_original: "foto.png",
          nombre_archivo_seguro: "foto.png",
          tamano_bytes: 1024,
          tipo_mime: "image/png",
          hash_sha256: "hash123",
          exif_despojado: true,
          despojo_exif_exitoso: true,
          ancho: 100,
          alto: 100,
          creado_en: new Date().toISOString(),
          archivo_url: archivoUrl,
        });
      }
      if (url.includes("/sesion")) {
        return Response.json({
          token_acceso: "fake-jwt-token",
          tipo_token: "bearer",
          expira_en_segundos: 3600,
          sesion_id: "sesion-mock",
          huella_hash: "hash-mock",
          rol: "ciudadano_anonimo",
        });
      }
      return fetchOriginal(input, init);
    };
    return () => {
      window.fetch = fetchOriginal;
    };
  },
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
