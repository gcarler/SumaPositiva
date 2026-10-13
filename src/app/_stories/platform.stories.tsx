import {FORMULARIOS_MOCK, RESPUESTAS_MOCK} from "@/features/formularios/__fixtures__/formularios.fixture";
import {useFormulariosStore} from "@/features/formularios/state/formularios-store";
import {simularApiFormularios} from "./formularios-mock-api";
import type {Meta, StoryObj} from "@storybook/nextjs-vite";
import {expect, userEvent, waitFor, within, fireEvent} from "storybook/test";
import {QueryProvider} from "@/app/_composition/query-provider";
import Home from "@/app/page";
import {PanelHost} from "@/app/_components/panel-host";
import {Toaster} from "@/shared/ui/sonner";
import {useNavigationStore} from "@/core/navigation/navigation-store";
import {usePanelStore} from "@/core/panels/panel-store";
import {usePoliticasStore} from "@/features/politicas/state/politicas-store";
import {useMesasStore} from "@/features/mesas/state/mesas-store";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {POLITICAS_MOCK} from "@/features/politicas/__fixtures__/politicas.fixture";
import {MESAS_MOCK} from "@/features/mesas/__fixtures__/mesas.fixture";

const meta = {
  title: "Plataforma/Pantallas",
  parameters: {
    layout: "fullscreen",
    polis: { screen: true },
    docs: {
      story: { inline: false },
      description: {
        component:
          "Pantallas reales de POLIS con datos de demostración aislados. Comparten componentes, tokens y comportamiento con la aplicación; no requieren API.",
      },
    },
  },
  beforeEach: () => {
    const restaurarFormularios = simularApiFormularios();
    const cacheAnterior = useFormulariosStore.getState();
    useFormulariosStore.setState({formularios: structuredClone(FORMULARIOS_MOCK).map(f=>({...f, origenDatos:"api"})), respuestas: structuredClone(RESPUESTAS_MOCK)});
    const fetchOriginal = window.fetch;
    // Aislar las pantallas de demostración: las consultas leen el store de la historia.
    window.fetch = async (entrada, opciones) => {
      const ruta = new URL(typeof entrada === "string" ? entrada : entrada instanceof Request ? entrada.url : entrada.href,
        window.location.origin).pathname;
      if (ruta.startsWith("/api/v1/")) {
        const mesaId = /^\/api\/v1\/mesas\/([^/]+)$/.exec(ruta)?.[1];
        const metodo = String(
          opciones?.method ?? (entrada instanceof Request ? entrada.method : "GET"),
        ).toUpperCase();
        if (ruta === "/api/v1/mesas") {
          /* F4: creación demo en la historia; responde 201 con id sin depender de un backend real (regla 8 del kit). */
          if (metodo === "POST") {
            const cuerpo =
              typeof opciones?.body === "string"
                ? JSON.parse(opciones.body)
                : opciones?.body ?? {};
            return Response.json(
              { ...cuerpo, id: `mesa-demo-${Date.now().toString(36)}` },
              { status: 201 },
            );
          }
          return Response.json(useMesasStore.getState().mesas);
        }
        if (mesaId) {
          const mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
          return mesa ? Response.json(mesa) : Response.json({detail: "Mesa no encontrada"}, {status: 404});
        }
        return Response.json({detail: "Ruta sin datos en esta historia"}, {status: 404});
      }
      return fetchOriginal(entrada, opciones);
    };
    usePanelStore.getState().closeAll();
    useNavigationStore.setState({ vista: "inicio" });
    usePoliticasStore.setState({
      politicas: structuredClone(POLITICAS_MOCK),
      busqueda: "",
      sectorFiltro: "todos",
      estadoFiltro: "todos",
    });
    useMesasStore.setState({ mesas: structuredClone(MESAS_MOCK) });
    useSesionStore.setState({ sesion: null });
    return () => {
      window.fetch = fetchOriginal;
      restaurarFormularios();
      useFormulariosStore.setState(cacheAnterior);
      usePanelStore.getState().closeAll();
      useSesionStore.setState({ sesion: null });
    };
  },
  render: () => (
    <QueryProvider>
      <Home />
      <PanelHost />
      <Toaster />
    </QueryProvider>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Inicio: Story = {};
export const InicioOscuro: Story = { globals: { theme: "dark" } };
export const Explorar: Story = {
  beforeEach: () => {
    useNavigationStore.setState({ vista: "explorar" });
  },
};
export const Mesas: Story = {
  beforeEach: () => {
    useNavigationStore.setState({ vista: "mesas" });
  },
};
export const SinResultados: Story = {
  beforeEach: () => {
    useNavigationStore.setState({ vista: "explorar" });
    usePoliticasStore.setState({ busqueda: "Una búsqueda sin coincidencias" });
  },
};
export const Politica: Story = {
  beforeEach: () => {
    usePanelStore.getState().openPanel("politica", { politicaId: "pol-001" });
  },
};
export const Fase: Story = {
  beforeEach: () => {
    usePanelStore
      .getState()
      .openPanel("fase", { politicaId: "pol-001", faseId: "fase-001-1" });
  },
};
export const Linea: Story = {
  beforeEach: () => {
    usePanelStore
      .getState()
      .openPanel("linea", {
        politicaId: "pol-001",
        faseId: "fase-001-1",
        lineaId: "lin-001-1-1",
      });
  },
};
export const NuevoAporte: Story = {
  beforeEach: () => {
    usePanelStore
      .getState()
      .openPanel("aporte", {
        politicaId: "pol-001",
        faseId: "fase-001-1",
        lineaId: "lin-001-1-1",
      });
  },
};
export const Participar: Story = {
  beforeEach: () => {
    usePanelStore.getState().openPanel("sesion", {});
  },
};
export const Mesa: Story = {
  beforeEach: () => {
    useNavigationStore.setState({ vista: "mesas" });
    usePanelStore.getState().openPanel("mesa", { mesaId: "mesa-001" });
  },
};
export const CrearMesa: Story = {
  beforeEach: () => {
    useNavigationStore.setState({ vista: "mesas" });
    usePanelStore.getState().openPanel("mesa-editor", {});
  },
};
export const Papelografo: Story = {
  beforeEach: () => {
    useNavigationStore.setState({ vista: "mesas" });
    usePanelStore
      .getState()
      .openPanel("papelografo", {
        mesaId: "mesa-001",
        submesaId: "sm-001-1",
        arbol: "problemas",
      });
  },
};
export const NavegacionConTeclado: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {
      name: /^Iniciar sesión$/i,
    });
    await userEvent.click(trigger);
    const dialog = await canvas.findByRole("dialog");
    await expect(dialog).toHaveFocus();
    await expect(
      canvasElement.querySelector("#polis-application"),
    ).toHaveAttribute("inert");
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
  },
};

export const CrearMesaCompleta: Story = {
  ...CrearMesa,
  /* F4: la creación demo se interpola EN LA HISTORIA (tras el beforeEach del meta)
     para garantizar que el POST /api/v1/mesas reciba 201 con id sin backend real
     (regla 8 del kit: las historias no hablan con servicios reales). */
  beforeEach: () => {
    /* Conservar el montaje original del editor (antes del spread de CrearMesa). */
    useNavigationStore.setState({ vista: "mesas" });
    usePanelStore.getState().openPanel("mesa-editor", {});
    const registrosPost: string[] = [];
    const registrosSubmit: string[] = [];
    (window as unknown as { __F4_POSTS__?: string[] }).__F4_POSTS__ = registrosPost;
    (window as unknown as { __F4_SUBMITS__?: string[] }).__F4_SUBMITS__ = registrosSubmit;
    (window as unknown as { __F4_ULTIMO__?: Record<string, unknown> }).__F4_ULTIMO__ = {};
    /* El comportamiento por defecto del submit nativo reinicia el iframe de la historia;
     * se cancela a nivel documento (fase de captura) sin tocar el componente real del panel.
     * React/RHF conserva el manejo propio del evento (preventDefault no corta la propagación). */
    const cancelarSubmitNativo = (evento: Event) => {
      evento.preventDefault();
      registrosSubmit.push(
        (evento.target instanceof HTMLElement && evento.target.id) || "submit-nativo",
      );
    };
    document.addEventListener("submit", cancelarSubmitNativo, true);
    const fetchOriginal = window.fetch;
    window.fetch = async (entrada, opciones) => {
      const url = new URL(
        typeof entrada === "string"
          ? entrada
          : entrada instanceof Request
            ? entrada.url
            : entrada.href,
        window.location.origin,
      );
      const esPostMesas =
        url.pathname === "/api/v1/mesas" &&
        String(opciones?.method ?? "GET").toUpperCase() === "POST";
      if (!esPostMesas) return fetchOriginal(entrada, opciones);
      registrosPost.push(url.pathname);
      const cuerpo =
        typeof opciones?.body === "string"
          ? JSON.parse(opciones.body)
          : opciones?.body ?? {};
      const id = `mesa-demo-${Date.now().toString(36)}`;
      (window as unknown as { __F4_ULTIMO__?: Record<string, unknown> }).__F4_ULTIMO__ = {
        nombre: cuerpo.nombre,
        id,
      };
      return Response.json(
        { ...cuerpo, id },
        { status: 201 },
      );
    };
    return () => {
      document.removeEventListener("submit", cancelarSubmitNativo, true);
      window.fetch = fetchOriginal;
      (window as unknown as { __F4_POSTS__?: string[]; __F4_SUBMITS__?: string[]; __F4_ULTIMO__?: Record<string, unknown> }).__F4_POSTS__ = undefined;
      (window as unknown as { __F4_POSTS__?: string[]; __F4_SUBMITS__?: string[]; __F4_ULTIMO__?: Record<string, unknown> }).__F4_SUBMITS__ = undefined;
      (window as unknown as { __F4_POSTS__?: string[]; __F4_SUBMITS__?: string[]; __F4_ULTIMO__?: Record<string, unknown> }).__F4_ULTIMO__ = undefined;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialogo = await canvas.findByRole("dialog");
    const panel = within(dialogo);
    await userEvent.type(
      panel.getByLabelText(/Nombre de la mesa/),
      "Mesa de convivencia barrial",
    );
    /* La fecha es un input nativo type="date": poblar con fireEvent (userEvent.type no lo llena de forma fiable). */
    await fireEvent.change(panel.getByLabelText(/Fecha/), {
      target: { value: "2026-10-15" },
    });
    await userEvent.type(panel.getByLabelText(/Lugar/), "Casa de la cultura");
    /* MESA-UBIC-02: Campo unificado de coordenadas (Latitud, Longitud) */
    await userEvent.type(panel.getByLabelText(/Coordenadas/i), "10.4, -75.6");
    const submit = panel.getByRole("button", { name: "Crear mesa" });
    await waitFor(() => expect(submit).toBeEnabled());
    /* Envío real del formulario del panel con reintentos: consulta FRESCA en cada intento
     * (los re-renders de la animación pueden desconectar el nodo), esperar a que el form no
     * esté `inert` y disparar el submit real del formulario del panel. */
    const ventana = window as unknown as {
      __F4_POSTS__?: string[];
      __F4_SUBMITS__?: string[];
      __F4_ULTIMO__?: Record<string, unknown>;
    };
    for (
      let intento = 0;
      (ventana.__F4_POSTS__?.some((ruta) => ruta.startsWith("/")) ?? false) ===
        false && intento < 3;
      intento += 1
    ) {
      const formularios = Array.from(
        document.querySelectorAll("#form-mesa-pro"),
      ) as HTMLFormElement[];
      expect(formularios.length).toBe(1);
      const formulario = formularios[formularios.length - 1];
      expect(formulario.isConnected).toBe(true);
      await waitFor(() => {
        expect(formulario.closest("[inert]")).toBeNull();
      }, { timeout: 5000 });
      await fireEvent.submit(formulario);
      await new Promise((r) => setTimeout(r, 400));
    }
    /* Diagnóstico de validación RHF: si el submit fue validado y abortado, aquí se ve el campo. */
    const invalidos = Array.from(
      document.querySelectorAll("#form-mesa-pro [aria-invalid='true']"),
    ).map((elemento) => elemento.getAttribute("id"));
    expect(invalidos).toEqual([]);
    /* Verificación instrumental: el POST real del panel debe llegar al mock con los datos del formulario. */
    await waitFor(
      () =>
        expect(ventana.__F4_POSTS__?.some((ruta) => ruta.startsWith("/"))).toBe(
          true,
        ),
      { timeout: 5000 },
    );
    expect(ventana.__F4_SUBMITS__?.length ?? 0).toBeGreaterThan(0);
    expect(ventana.__F4_ULTIMO__?.nombre).toBe("Mesa de convivencia barrial");
    /* El flujo real del panel (POST mock + normalización + store); al fallar imprime los nombres del store para el diagnóstico. */
    await waitFor(
      () =>
        expect(
          useMesasStore.getState().mesas.map((mesa) => mesa.nombre),
        ).toContain("Mesa de convivencia barrial"),
      { timeout: 5000 },
    );
    await expect(
      await canvas.findByRole("dialog", {
        name: "Mesa de convivencia barrial",
      }),
    ).toBeVisible();
  },
};

export const EscenarioAccesible: Story = {
  beforeEach: () => usePanelStore.getState().openPanel("escenario-editor", {}),
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    for (const label of ["Título del Escenario", "Fecha", "Entidad Convocante", "Hombres", "Mujeres", "Otros", "Víctimas (Ley 1448)", "Discapacidad (Ley 1618)"]) {
      await expect(panel.getByLabelText(label, { exact: true })).toBeVisible();
    }
    await expect(panel.getByRole("combobox", { name: "Tipo de Escenario" })).toBeVisible();
    await userEvent.type(panel.getByLabelText("Título del Escenario"), "Foro ciudadano");
    await expect(panel.getByLabelText("Título del Escenario")).toHaveValue("Foro ciudadano");
  },
};
export const EscenarioAccesibleOscuro: Story = { ...EscenarioAccesible, globals: { theme: "dark" } };

export const FormularioAccesible: Story = {
  beforeEach: () => usePanelStore.getState().openPanel("formulario-editor", {}),
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await expect(panel.getByLabelText("Título del Formulario")).toBeVisible();
    await expect(panel.getByLabelText("Descripción")).toBeVisible();
    await userEvent.click(panel.getByRole("button", { name: "Añadir Pregunta" }));
    await userEvent.type(panel.getByLabelText("Enunciado (1)"), "¿Qué propone?");
    await expect(panel.getByLabelText("Enunciado (1)")).toHaveValue("¿Qué propone?");
    await expect(panel.getByRole("combobox", { name: "Tipo (1)" })).toBeVisible();
    await userEvent.click(panel.getByLabelText("Requerida (1)"));
    await expect(panel.getByLabelText("Requerida (1)")).toBeChecked();
  },
};
export const FormularioAccesibleOscuro: Story = { ...FormularioAccesible, globals: { theme: "dark" } };

export const CatalogoConNombresAccesibles: Story = {
  beforeEach: () => usePanelStore.getState().openPanel("formularios", {}),
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await expect((await panel.findAllByRole("button", { name: /^Editar formulario:/ })).length).toBeGreaterThan(0);
    await expect(panel.getAllByRole("button", { name: /^Ver estadísticas del formulario:/ }).length).toBeGreaterThan(0);
  },
};

export const GaleriaAccesible: Story = {
  beforeEach: () => {
    simularApiFormularios();
        useFormulariosStore.setState({formularios: structuredClone(FORMULARIOS_MOCK).map(f=>({...f, origenDatos:"api"})), respuestas: structuredClone(RESPUESTAS_MOCK)});
    const fetchOriginal = window.fetch;
    window.fetch = async (entrada, opciones) => {
      const ruta = new URL(typeof entrada === "string" ? entrada : entrada instanceof Request ? entrada.url : entrada.href, window.location.origin).pathname;
      if (ruta.startsWith("/api/v1/testimonios")) {
        return Response.json(ruta.endsWith("/resumen") ? {
          total_testimonios: 1, aprobados: 1, destacados: 1, pendientes: 0, rechazados: 0,
          por_territorio: [{ territorio_id: "t1", nombre: "Localidad Histórica y del Caribe Norte", total_testimonios: 1 }],
        } : [{ id: "test-local", codigo_unico: "TEST-LOCAL", nombre_autor: "Persona de prueba comunitaria",
          titulo: "Relato de prueba", relato: "Contenido ficticio para comprobar la accesibilidad de la galería.",
          estado: "DESTACADO", metadatos_enfoque: {}, creado_en: "2026-10-01T00:00:00Z" }]);
      }
      return fetchOriginal(entrada, opciones);
    };
    usePanelStore.getState().openPanel("testimonios-galeria", {});
    return () => { window.fetch = fetchOriginal; };
  },
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    const territory = panel.getByRole("combobox", { name: "Filtrar testimonios por territorio" });
    await expect(territory).toBeVisible();
    await panel.findByText("Persona de prueba comunitaria");
    await userEvent.click(territory);
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole("option", { name: /Localidad Histórica/ }));
    await expect(territory).toHaveTextContent("Localidad Histórica y del Caribe Norte");
    const featured = panel.getByRole("button", { name: "Solo Destacados" });
    await expect(featured).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(featured);
    await expect(featured).toHaveAttribute("aria-pressed", "true");
  },
};
export const GaleriaAccesibleOscura: Story = { ...GaleriaAccesible, globals: { theme: "dark" } };

export const TerritoriosConTeclado: Story = {
  beforeEach: () => useNavigationStore.setState({ vista: "geovisor" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const territories = await canvas.findAllByRole("button", { name: /^(Explorar territorio:|Abrir ficha territorial:)/ });
    territories[0].focus();
    await expect(territories[0]).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByRole("dialog")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(territories[0]).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(await canvas.findByRole("dialog")).toBeVisible();
  },
};

export const AporteConEtiquetas: Story = {
  ...NuevoAporte,
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await expect(panel.getByLabelText(/Título/)).toBeVisible();
    await expect(panel.getByRole("textbox", { name: /Contenido|Desarrolla|Tu aporte/ })).toBeVisible();
  },
};
