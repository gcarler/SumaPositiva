import {
  FORMULARIOS_MOCK,
  RESPUESTAS_MOCK,
} from "@/features/formularios/data/formularios.mock";
import { simularApiFormularios } from "./formularios-mock-api";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { QueryProvider } from "@/app/_composition/query-provider";
import { PanelHost } from "@/app/_components/panel-host";
import { usePanelStore } from "@/core/panels/panel-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import { FormularioRuntime } from "@/features/formularios/components/formulario-runtime";
import {
  formularioVacio,
  type Formulario,
  type TipoPregunta,
} from "@/features/formularios/models/formulario";

const tipos: TipoPregunta[] = [
  "texto_corto",
  "texto_largo",
  "opcion_unica",
  "opcion_multiple",
  "lista_desplegable",
  "likert",
  "escala_lineal",
  "fecha",
  "hora",
  "numero",
  "carga_archivo",
  "ubicacion_geografica",
  "seccion",
  "descripcion",
];
const completa: Formulario = {
  ...formularioVacio(),
  id: "tipos",
  titulo: "Todos los tipos",
  estado: "activo",
  preguntas: tipos.map((tipo, orden) => ({
    id: tipo,
    tipo,
    texto: `Ejemplo ${tipo}`,
    obligatoria: false,
    orden,
    opciones: [
      { id: "a", texto: "Opción A" },
      { id: "otro", texto: "Otro", esOtro: true },
    ],
    escalaMin: 1,
    escalaMax: 5,
    tiposArchivo: "imagen",
  })),
  configuracion: { ...formularioVacio().configuracion },
};
const condicional: Formulario = {
  ...formularioVacio(),
  id: "condicional",
  titulo: "Formulario condicional",
  estado: "activo",
  preguntas: [
    {
      id: "origen",
      tipo: "opcion_unica",
      texto: "¿Quieres detallar?",
      obligatoria: true,
      orden: 0,
      opciones: [
        { id: "si", texto: "Sí" },
        { id: "no", texto: "No" },
      ],
    },
    {
      id: "detalle",
      tipo: "texto_largo",
      texto: "Describe tu propuesta",
      obligatoria: true,
      orden: 1,
      logica: [
        {
          preguntaOrigenId: "origen",
          operador: "igual",
          valor: "si",
          accion: "mostrar",
        },
      ],
    },
  ],
};
const meta = {
  title: "Plataforma/Formularios",
  parameters: { layout: "fullscreen", polis: { screen: true } },
  beforeEach: () => {
    const restaurarApiFormularios = simularApiFormularios();
    const anterior = useFormulariosStore.getState();
    useFormulariosStore.setState({
      formularios: structuredClone(FORMULARIOS_MOCK).map((f) => ({
        ...f,
        origenDatos: "api",
      })),
      respuestas: structuredClone(RESPUESTAS_MOCK),
      previews: {},
    });
    useSesionStore.getState().limpiarSesion();
    usePanelStore.getState().closeAll();
    return () => {
      restaurarApiFormularios();
      usePanelStore.getState().closeAll();
      useFormulariosStore.setState(anterior);
      useSesionStore.getState().limpiarSesion();
    };
  },
  render: () => (
    <QueryProvider>
      <PanelHost />
    </QueryProvider>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const EditorNuevo: Story = {
  beforeEach: () => usePanelStore.getState().openPanel("formulario-editor", {}),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await userEvent.type(
      panel.getByLabelText("Título del Formulario"),
      "Formulario creado en prueba",
    );
    await userEvent.click(
      panel.getByRole("button", { name: "Añadir Sección" }),
    );
    await userEvent.click(
      panel.getByRole("button", { name: "Añadir Pregunta" }),
    );
    await userEvent.type(
      panel.getByLabelText("Enunciado (1)"),
      "¿Qué necesitas?",
    );
    await userEvent.click(
      panel.getByRole("button", { name: "Guardar Formulario" }),
    );
    await waitFor(() =>
      expect(
        useFormulariosStore
          .getState()
          .formularios.some((f) => f.titulo === "Formulario creado en prueba"),
      ).toBe(true),
    );
  },
};
export const EdicionHidratada: Story = {
  beforeEach: () =>
    usePanelStore
      .getState()
      .openPanel("formulario-editor", { formularioId: "f1" }),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await expect(panel.getByLabelText("Título del Formulario")).toHaveValue(
      "Diagnóstico de Seguridad en mi Barrio",
    );
    await expect(panel.getByLabelText("Enunciado (5)")).toHaveValue(
      "¿Has participado en alguna mesa comunitaria?",
    );
    await userEvent.click(panel.getByRole("button", { name: "Vista Previa" }));
    const preview = within(
      await within(canvasElement).findByRole(
        "dialog",
        { name: "Vista Previa" },
        { timeout: 10000 },
      ),
    );
    await expect(
      preview.getByRole("combobox", { name: /En qué barrio/ }),
    ).toBeVisible();
    const antes = useFormulariosStore.getState().respuestas.length;
    await userEvent.keyboard("{Escape}");
    await expect(useFormulariosStore.getState().respuestas.length).toBe(antes);
  },
};
export const EditorOscuro: Story = {
  ...EdicionHidratada,
  globals: { theme: "dark" },
};
export const TodosLosTipos: Story = {
  render: () => (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl">Tipos de pregunta</h1>
      <h2 className="text-lg">Formulario de demostración</h2>
      <FormularioRuntime form={completa} preview enviar={async () => {}} />
    </main>
  ),
};
export const TodosLosTiposOscuro: Story = {
  ...TodosLosTipos,
  globals: { theme: "dark" },
};
export const Condicional: Story = {
  beforeEach: () => {
    useFormulariosStore.setState({
      formularios: [condicional],
      respuestas: [],
    });
    usePanelStore
      .getState()
      .openPanel("formulario-respuesta", { formularioId: condicional.id });
  },
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await expect(
      panel.queryByLabelText(/Describe tu propuesta/),
    ).not.toBeInTheDocument();
    await userEvent.click(panel.getByRole("radio", { name: "Sí" }));
    await userEvent.type(
      panel.getByLabelText(/Describe tu propuesta/),
      "Contenido que luego queda oculto",
    );
    await userEvent.click(panel.getByRole("radio", { name: "No" }));
    await expect(
      panel.queryByLabelText(/Describe tu propuesta/),
    ).not.toBeInTheDocument();
    await userEvent.click(
      panel.getByRole("button", { name: "Enviar respuestas" }),
    );
    await panel.findByText("Respuesta recibida");
    await expect(
      useFormulariosStore.getState().respuestas[0].respuestas,
    ).toEqual({ origen: "no" });
  },
};
export const RespuestaConSecciones: Story = {
  beforeEach: () =>
    usePanelStore
      .getState()
      .openPanel("formulario-respuesta", { formularioId: "f1" }),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await userEvent.click(
      panel.getByRole("combobox", { name: /En qué barrio/ }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "BOCAGRANDE",
      }),
    );
    await userEvent.click(panel.getByRole("radio", { name: "Hurto" }));
    await userEvent.click(panel.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(panel.getByRole("radio", { name: "4" }));
    await userEvent.click(panel.getByRole("radio", { name: "Sí" }));
    await userEvent.click(
      panel.getByRole("button", { name: "Enviar respuestas" }),
    );
    await panel.findByText("Respuesta recibida");
    await expect(
      useFormulariosStore.getState().formularios.find((f) => f.id === "f1")
        ?.respuestasCount,
    ).toBe(3);
  },
};
export const ValidacionObligatoria: Story = {
  beforeEach: () => {
    useFormulariosStore.setState({
      formularios: [condicional],
      respuestas: [],
    });
    usePanelStore
      .getState()
      .openPanel("formulario-respuesta", { formularioId: condicional.id });
  },
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await userEvent.click(
      panel.getByRole("button", { name: "Enviar respuestas" }),
    );
    await panel.findByText("Esta pregunta es obligatoria.");
    await expect(useFormulariosStore.getState().respuestas).toHaveLength(0);
  },
};
export const Cierre: Story = {
  beforeEach: () => {
    useFormulariosStore.setState((s) => ({
      formularios: s.formularios.map((f) =>
        f.id === "f1" ? { ...f, estado: "cerrado" } : f,
      ),
    }));
    usePanelStore
      .getState()
      .openPanel("formulario-respuesta", { formularioId: "f1" });
  },
};
export const RequiereSesion: Story = {
  beforeEach: () => {
    const f = useFormulariosStore.getState().formularios[0];
    useFormulariosStore.setState({
      formularios: [
        {
          ...f,
          configuracion: { ...f.configuracion, requiereAutenticacion: true },
        },
      ],
    });
    usePanelStore
      .getState()
      .openPanel("formulario-respuesta", { formularioId: f.id });
  },
};
export const Analitica: Story = {
  beforeEach: () =>
    usePanelStore
      .getState()
      .openPanel("formulario-analitica", { formularioId: "f1" }),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await waitFor(() =>
      expect(panel.getByRole("button", { name: "Exportar CSV" })).toBeEnabled(),
    );
    await expect(
      panel.getByText("Distribución de Respuestas por Pregunta"),
    ).toBeVisible();
  },
};
export const AnaliticaOscura: Story = {
  ...Analitica,
  globals: { theme: "dark" },
};
export const AnaliticaVacia: Story = {
  beforeEach: () => {
    useFormulariosStore.setState({ respuestas: [] });
    usePanelStore
      .getState()
      .openPanel("formulario-analitica", { formularioId: "f1" });
  },
};

export const CatalogoCiudadano: Story = {
  beforeEach: () =>
    usePanelStore.getState().openPanel("formularios", { soloRespuesta: true }),
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("dialog", {}, { timeout: 10000 }),
    );
    await expect(
      panel.queryByRole("button", { name: "Crear Formulario" }),
    ).not.toBeInTheDocument();
    await expect(
      panel.getAllByRole("button", { name: "Responder" }),
    ).toHaveLength(2);
    await userEvent.click(
      panel.getAllByRole("button", { name: "Responder" })[0],
    );
    await expect(
      await within(canvasElement).findByRole(
        "dialog",
        { name: "Diagnóstico de Seguridad en mi Barrio" },
        { timeout: 10000 },
      ),
    ).toBeVisible();
  },
};
