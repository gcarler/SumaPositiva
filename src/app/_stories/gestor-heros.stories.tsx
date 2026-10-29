import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { createJSONStorage } from "zustand/middleware";
import { GestorHerosPlataforma } from "@/features/plataforma/components/gestor-heros-plataforma";
import { HERO_DEFAULT_IMAGE_ID, HERO_IMAGE_OPTIONS, useHeroConfigStore } from "@/features/politicas/state/hero-store";

const meta = {
  title: "Plataforma/Gestor de heros",
  component: GestorHerosPlataforma,
  args: { editar: true },
  beforeEach() {
    const fetchAnterior = globalThis.fetch;
    globalThis.fetch = async (entrada, opciones) => {
      const ruta = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      if (ruta.endsWith("/politicas/heros")) {
        if (opciones?.method === "PUT") return new Response(opciones.body?.toString() ?? "{}", { status: 200, headers: { "Content-Type": "application/json" } });
        const estado = useHeroConfigStore.getState();
        return Response.json({ slides: estado.slides, catalogoImagenes: estado.imagenesCatalogo,
          heroImageId: estado.heroImageId, opacidad: estado.opacidad, modoCarrusel: estado.modoCarrusel,
          intervaloSegundos: estado.intervaloSegundos, pageImages: estado.pageImages });
      }
      if (ruta.endsWith("/politicas/heros/subir-imagen")) return Response.json({ url: "/images/hero/hero-marco-logico.webp?subida=243" });
      throw new Error(`La historia no permite solicitudes externas: ${ruta}`);
    };
    const anterior = useHeroConfigStore.persist.getOptions().storage;
    const memoria = new Map<string, string>();
    useHeroConfigStore.persist.setOptions({ storage: createJSONStorage(() => ({
      getItem: (clave) => memoria.get(clave) ?? null,
      setItem: (clave, valor) => { memoria.set(clave, valor); },
      removeItem: (clave) => { memoria.delete(clave); },
    })) });
    useHeroConfigStore.getState().resetearHeroConfig();
    return () => {
      globalThis.fetch = fetchAnterior;
      useHeroConfigStore.getState().resetearHeroConfig();
      useHeroConfigStore.persist.setOptions({ storage: anterior });
    };
  },
  render: (args) => (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">Gestión de imágenes hero</h1>
      <h2 className="text-base font-semibold text-text-primary">Apariencia de los espacios públicos</h2>
      <GestorHerosPlataforma {...args} />
    </div>
  ),
} satisfies Meta<typeof GestorHerosPlataforma>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GestionCompleta: Story = {
  play: async ({ canvasElement }) => {
    const vista = within(canvasElement);
    await userEvent.click(vista.getByRole("button", { name: "Nueva imagen hero" }));
    await userEvent.type(vista.getByLabelText(/Título de la imagen/), "Encuentro vecinal 243");
    await userEvent.type(vista.getByLabelText(/Descripción de la imagen/), "Diálogo y acuerdos de la comunidad.");
    await userEvent.type(vista.getByLabelText(/Enfoque o tema territorial/), "Participación comunitaria");
    await userEvent.type(vista.getByLabelText(/URL o ruta de la imagen/), "/images/hero/hero-marco-logico.webp?catalogo=243");
    await userEvent.click(vista.getByRole("button", { name: "Guardar imagen" }));
    const tarjeta = await vista.findByRole("article", { name: "Encuentro vecinal 243" });
    const imagen = useHeroConfigStore.getState().imagenesCatalogo.find((fila) => fila.titulo === "Encuentro vecinal 243");
    if (!imagen) throw new Error("El alta no quedó en el catálogo");
    await expect(imagen.thumbnail).toBe(imagen.archivo);
    await expect(vista.getAllByRole("article")).toHaveLength(7);
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Asignar Encuentro vecinal 243" }));
    await expect(useHeroConfigStore.getState().heroImageId).toBe(imagen.id);
    await userEvent.click(within(tarjeta).getByRole("switch"));
    await expect(within(tarjeta).getByText("Deshabilitada")).toBeVisible();
    await expect(within(tarjeta).getByRole("button", { name: "Asignar Encuentro vecinal 243" })).toBeDisabled();
    await expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    await userEvent.click(within(tarjeta).getByRole("switch"));
    await expect(within(tarjeta).getByRole("switch")).toBeChecked();
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Asignar Encuentro vecinal 243" }));
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Eliminar Encuentro vecinal 243" }));
    await expect(vista.getByRole("button", { name: "Confirmar retiro" })).toBeVisible();
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(7);
    await userEvent.click(vista.getByRole("button", { name: "Cancelar" }));
    await expect(tarjeta).toBeVisible();
    await userEvent.click(within(tarjeta).getByRole("button", { name: "Eliminar Encuentro vecinal 243" }));
    await userEvent.click(vista.getByRole("button", { name: "Confirmar retiro" }));
    await waitFor(() => expect(vista.queryByRole("article", { name: "Encuentro vecinal 243" })).not.toBeInTheDocument());
    await expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
    await userEvent.click(vista.getByRole("button", { name: "Guardar Cambios en la Plataforma" }));
    await waitFor(() => expect(useHeroConfigStore.getState().cambiosPendientes).toBe(false));
  },
};

export const GestionCompletaOscura: Story = { ...GestionCompleta, globals: { theme: "dark" } };

export const ValidacionYTeclado: Story = {
  play: async ({ canvasElement }) => {
    const vista = within(canvasElement);
    const abrir = vista.getByRole("button", { name: "Nueva imagen hero" });
    abrir.focus();
    await userEvent.keyboard("{Enter}");
    await expect(vista.getByRole("form", { name: "Nueva imagen hero" })).toBeVisible();
    await userEvent.type(vista.getByLabelText(/Título de la imagen/), "Título conservado");
    await userEvent.type(vista.getByLabelText(/URL o ruta de la imagen/), "javascript:alert(1)");
    await userEvent.click(vista.getByRole("button", { name: "Guardar imagen" }));
    await expect(vista.getByLabelText(/URL o ruta de la imagen/)).toHaveAttribute("aria-invalid", "true");
    await expect(vista.getByLabelText(/Título de la imagen/)).toHaveValue("Título conservado");
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
    await expect(vista.getByRole("form", { name: "Nueva imagen hero" })).toBeVisible();
  },
};

export const BibliotecaVacia: Story = {
  beforeEach() {
    for (const imagen of HERO_IMAGE_OPTIONS) useHeroConfigStore.getState().eliminarImagen(imagen.id);
  },
  play: async ({ canvasElement }) => {
    const vista = within(canvasElement);
    await expect(vista.getByText(/No hay imágenes en la biblioteca/)).toBeVisible();
    await userEvent.click(vista.getByRole("button", { name: "Restaurar catálogo oficial" }));
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(0);
    await userEvent.click(vista.getByRole("button", { name: "Confirmar restauración" }));
    await waitFor(() => expect(vista.getAllByRole("article")).toHaveLength(6));
    await expect(useHeroConfigStore.getState().imagenesCatalogo.every((imagen) => imagen.habilitada)).toBe(true);
  },
};

export const SoloLectura: Story = {
  args: { editar: false },
  play: async ({ canvasElement }) => {
    const vista = within(canvasElement);
    await expect(vista.getByRole("button", { name: "Nueva imagen hero" })).toBeDisabled();
    await expect(vista.getByRole("button", { name: "Restaurar catálogo oficial" })).toBeDisabled();
    for (const control of vista.getAllByRole("switch")) await expect(control).toBeDisabled();
    for (const boton of vista.getAllByRole("button", { name: /^Eliminar / })) await expect(boton).toBeDisabled();
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
  },
};
