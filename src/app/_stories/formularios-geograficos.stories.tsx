import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { FormularioRuntime } from "@/features/formularios/components/formulario-runtime";
import { UbicacionPregunta } from "@/features/formularios/components/ubicacion-pregunta";
import {
  formularioVacio,
  type Formulario,
} from "@/features/formularios/models/formulario";
import { leerPunto } from "@/features/formularios/services/ubicacion-geografica";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
const form: Formulario = {
  ...formularioVacio(),
  id: "geografico",
  titulo: "Reporta un punto de Cartagena",
  estado: "activo",
  preguntas: [
    {
      id: "detalle",
      texto: "Describe lo que ocurre",
      tipo: "texto_corto",
      obligatoria: true,
      orden: 0,
    },
    {
      id: "punto",
      texto: "¿Dónde ocurre?",
      tipo: "ubicacion_geografica",
      obligatoria: true,
      orden: 1,
    },
  ],
};
function Punto() {
  const [valor, cambiar] = useState("");
  return (
    <UbicacionPregunta
      pregunta={form.preguntas[1]}
      valor={valor}
      cambiar={cambiar}
    />
  );
}
const meta = {
  title: "Plataforma/Formularios geográficos",
  parameters: { layout: "fullscreen", polis: { screen: true } },
  beforeEach: () => {
    const anterior = useFormulariosStore.getState();
    useFormulariosStore.setState({
      formularios: [structuredClone(form)],
      respuestas: [],
    });
    return () => useFormulariosStore.setState(anterior);
  },
  render: () => (
    <div className="min-w-0 p-4">
      <FormularioRuntime
        form={form}
        enviar={async (respuestas) => {
          useFormulariosStore
            .getState()
            .enviarRespuesta({ formularioId: form.id, respuestas });
        }}
      />
    </div>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Coordenadas: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(
      c.getByLabelText("Describe lo que ocurre", { exact: false }),
      "Falta alumbrado junto al parque",
    );
    await userEvent.type(
      await c.findByLabelText("Latitud", { exact: true }),
      "10.391",
    );
    await userEvent.type(
      c.getByLabelText("Longitud", { exact: true }),
      "-75.5144",
    );
    await userEvent.type(
      c.getByLabelText("Referencia del lugar (opcional)"),
      "Parque",
    );
    await userEvent.click(c.getByRole("button", { name: "Enviar respuestas" }));
    await waitFor(() => {
      const r = useFormulariosStore.getState().respuestas[0];
      expect(r.respuestas.detalle).toBe("Falta alumbrado junto al parque");
      expect(leerPunto(r.respuestas.punto)?.coordinates).toEqual([
        -75.5144, 10.391,
      ]);
    });
  },
};
export const MapaYLimpiar: Story = {
  render: () => (
    <div className="p-4">
      <Punto />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(
      await c.findByRole("button", { name: "Marcar centro del mapa" }),
    );
    await expect(c.getByLabelText("Latitud", { exact: true })).toHaveValue(
      10.391,
    );
    await expect(c.getByLabelText("Longitud", { exact: true })).toHaveValue(
      -75.5144,
    );
    await userEvent.click(c.getByRole("button", { name: "Quitar punto" }));
    await expect(c.getByLabelText("Latitud", { exact: true })).toHaveValue(
      null,
    );
    await expect(c.getByRole("status")).toHaveTextContent(
      "No hay un punto válido seleccionado.",
    );
  },
};
export const Obligatorio: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(
      c.getByLabelText("Describe lo que ocurre", { exact: false }),
      "Situación del barrio",
    );
    await userEvent.click(c.getByRole("button", { name: "Enviar respuestas" }));
    await expect(
      await c.findByText("Esta pregunta es obligatoria."),
    ).toBeVisible();
    expect(useFormulariosStore.getState().respuestas).toHaveLength(0);
  },
};
export const PuntoInvalido: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(
      c.getByLabelText("Describe lo que ocurre", { exact: false }),
      "Situación del barrio",
    );
    await userEvent.type(
      await c.findByLabelText("Latitud", { exact: true }),
      "95",
    );
    await userEvent.type(
      c.getByLabelText("Longitud", { exact: true }),
      "-75.5",
    );
    await userEvent.click(c.getByRole("button", { name: "Enviar respuestas" }));
    await expect(
      await c.findByText(
        "Selecciona un punto válido o introduce latitud y longitud válidas.",
      ),
    ).toBeVisible();
    expect(useFormulariosStore.getState().respuestas).toHaveLength(0);
  },
};
export const VistaPrevia: Story = {
  render: () => (
    <div className="p-4">
      <FormularioRuntime
        form={form}
        preview
        enviar={async () => {
          throw Error("La vista previa no envía");
        }}
      />
    </div>
  ),
};
export const Oscuro: Story = { globals: { theme: "dark" } };
export const Movil: Story = {
  render: () => (
    <div className="w-80 max-w-full p-4">
      <Punto />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByLabelText("Latitud", { exact: true });
    const contenedor = canvasElement.querySelector("section");
    expect(contenedor).not.toBeNull();
    expect(contenedor!.scrollWidth).toBeLessThanOrEqual(
      contenedor!.clientWidth,
    );
  },
};
function simularGps(denegado: boolean) {
  const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (
        exito: PositionCallback,
        error: PositionErrorCallback,
      ) => {
        setTimeout(() => {
          if (denegado)
            error({
              code: 1,
              message: "Permiso denegado",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          else
            exito({
              coords: { latitude: 10.391, longitude: -75.5144, accuracy: 12 },
            } as GeolocationPosition);
        }, 50);
      },
    },
  });
  return () => {
    if (original) Object.defineProperty(navigator, "geolocation", original);
    else Reflect.deleteProperty(navigator, "geolocation");
  };
}
export const UbicacionDispositivo: Story = {
  beforeEach: () => simularGps(false),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(
      c.getByLabelText("Describe lo que ocurre", { exact: false }),
      "Reporte con GPS",
    );
    await userEvent.click(
      await c.findByRole("button", { name: "Usar mi ubicación" }),
    );
    await waitFor(() =>
      expect(c.getByLabelText("Latitud", { exact: true })).toHaveValue(10.391),
    );
    await userEvent.click(c.getByRole("button", { name: "Enviar respuestas" }));
    await waitFor(() =>
      expect(
        leerPunto(
          useFormulariosStore.getState().respuestas[0]?.respuestas.punto,
        ),
      ).toMatchObject({ origen: "gps", precisionMetros: 12 }),
    );
  },
};
export const GpsDenegado: Story = {
  beforeEach: () => simularGps(true),
  render: () => (
    <div className="p-4">
      <Punto />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(
      await c.findByRole("button", { name: "Usar mi ubicación" }),
    );
    await expect(
      await c.findByText(/No se pudo obtener tu ubicación/),
    ).toBeVisible();
    await expect(c.getByLabelText("Latitud", { exact: true })).toHaveValue(
      null,
    );
  },
};
