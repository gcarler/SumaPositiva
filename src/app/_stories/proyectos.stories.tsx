import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, fn } from "storybook/test";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { QueryProvider } from "@/app/_composition/query-provider";
import { PanelHost } from "@/app/_components/panel-host";
import { PlataformaShell } from "@/features/plataforma/components/plataforma-shell";
import { ProyectosView } from "@/features/proyectos/views/proyectos-view";
import type { ActividadProyecto } from "@/features/proyectos/models/actividad-proyecto";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanelStore } from "@/core/panels/panel-store";
import { useAgendaStore } from "@/features/mesas/state/agenda-store";
import type { MesaAgenda } from "@/features/mesas/data/agenda.data";
import { identidadApi, type Usuario } from "@/features/sesion/services/identidad-api";
import { plataformaApi } from "@/features/plataforma/services/plataforma-api";
import type { AnexoActividad } from "@/features/proyectos/models/actividad-proyecto";

/* * Módulo Proyectos en aislamiento: estados no cubiertos por la historia
 * integradora de `plataforma-interna` (carga, error, vacío) y el caso de
 * ventanas largas de Comunicaciones sobre el calendario mensual.
 */

const perfil: Usuario = {
  id: "01900000-0000-7000-8000-000000000091",
  nombres: "Valeria",
  apellidos: "Cañas",
  correo: "valeria@example.org",
  codigo_rol: "gestor_bienestar_social",
  activo: true,
  correo_verificado_en: null,
  nivel_identidad: "declarada",
  permisos: [
    "proyectos:leer",
    "comunicaciones:gestionar",
    "comunicaciones:leer",
    "mesas:abrir",
    "formularios:gestionar",
    "seguimiento:gestionar",
  ],
};

const apiPlataformaOriginal = { ...plataformaApi };
const apiIdentidadOriginal = { ...identidadApi };
const fetchOriginal = window.fetch;

/** Prepara sesión y API de plataforma; devuelve el restaurado para el afterEach. */
function prepararShell(): () => void {
  const sesionOriginal = useSesionStore.getState();
  useSesionStore.getState().iniciarSesion({
    usuario: perfil,
    rol: perfil.codigo_rol,
    permisos: perfil.permisos,
    nivel_identidad: "declarada",
    token_acceso: "token-storybook-proyectos",
    expira_en: "2099-01-01T00:00:00Z",
  });
  usePanelStore.getState().closeAll();
  void getRouter().replace?.("/plataforma/proyectos");

  Object.assign(identidadApi, {
    perfil: fn(async () => perfil),
    roles: fn(async () => ({ total: 0, elementos: [] })),
  });
  Object.assign(plataformaApi, {
    territorios: fn(async () => []),
    geometria: fn(async () => ({ type: "FeatureCollection" as const, features: [] })),
    fases: fn(async () => []),
    lineas: fn(async () => []),
    aportes: fn(async () => ({ total: 0, elementos: [] })),
    telemetriaSql: fn(async () => ({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
      total_queries_recorded: 0,
      cache_hit_ratio_pct: 100,
      top_queries: [],
    })),
  } satisfies typeof plataformaApi);

  return () => {
    Object.assign(plataformaApi, apiPlataformaOriginal);
    Object.assign(identidadApi, apiIdentidadOriginal);
    window.fetch = fetchOriginal;
    usePanelStore.getState().closeAll();
    useSesionStore.setState(sesionOriginal);
  };
}

/** Intercepta `/api/v1/proyectos/actividades` y las rutas de anexos con el
 *  comportamiento indicado; el estado de anexos muta en memoria como lo
 *  haría el backend. */
function simularApiProyectos(
  respuesta: ActividadProyecto[] | "cuelga" | "error",
  anexos: AnexoActividad[] = [],
): void {
  const inventario = new Map<string, AnexoActividad>(anexos.map((a) => [a.id, a]));
  window.fetch = async (input, opciones) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    const anexosRuta = url.pathname.match(
      /^\/api\/v1\/proyectos\/actividades\/([^/]+)\/anexos(?:\/([^/]+))?(?:\/archivo)?$/,
    );
    if (anexosRuta) {
      const [, actividadId, anexoId] = anexosRuta;
      if (url.pathname.endsWith("/archivo")) {
        const anexo = inventario.get(anexoId ?? "");
        if (!anexo) return Response.json({ detail: "No existe" }, { status: 404 });
        return new Response(new Blob(["contenido-story"]), { status: 200 });
      }
      if (opciones?.method === "POST") {
        const form = opciones.body instanceof FormData ? opciones.body : undefined;
        const archivo = form?.get("archivo");
        const descripcion = form?.get("descripcion");
        const creado: AnexoActividad = {
          id: `anexo-nuevo-${inventario.size + 1}`,
          actividad_id: decodeURIComponent(actividadId),
          nombre_archivo: (archivo as unknown as File)?.name ?? "archivo.pdf",
          tipo_mime: "application/pdf",
          tamano_bytes: 1024,
          hash_sha256: "hash-story",
          descripcion: (descripcion as string | undefined) ?? null,
          subido_por: perfil.nombres,
          creado_en: new Date().toISOString(),
          url_descarga: url.pathname,
        };
        inventario.set(creado.id, creado);
        return Response.json(creado, { status: 201 });
      }
      if (opciones?.method === "DELETE") {
        inventario.delete(anexoId ?? "");
        return new Response(null, { status: 204 });
      }
      return Response.json([...inventario.values()]);
    }
    if (url.pathname === "/api/v1/proyectos/actividades") {
      if (respuesta === "cuelga") return new Promise(() => undefined);
      if (respuesta === "error") return Response.json({ detail: "fallo de simulación" }, { status: 503 });
      return Response.json(respuesta);
    }
    return fetchOriginal(input, opciones);
  };
}

/* Ventanas del módulo Comunicaciones que abarcan meses y años no visibles. */
function actividadVentanaLarga(): ActividadProyecto {
  const anio = new Date().getFullYear();
  return {
    id: `comunicaciones:tc-larga-${anio}`,
    modulo_dueno: "comunicaciones",
    recurso_id: `tc-larga-${anio}`,
    codigo: "TC-2026-0041",
    titulo: "Plan de barrido nocturno en 8 barrios priorizados",
    descripcion: "Cobertura plurianual de la vigencia",
    etapa: "Etapa 3: Despliegue Territorial y Temático",
    territorio: "",
    lugar: null,
    fecha_inicio: `${anio}-01-01`,
    fecha_fin: `${anio + 1}-02-28`,
    hora_inicio: null,
    hora_fin: null,
    estado_nativo: "pendiente",
    estado_canonico: "en_progreso",
    avance_pct: 37,
    responsable: "Reportero Regional",
    permiso_editar: "comunicaciones:gestionar",
  };
}

/* Datos base: fuentes cortas para no saturar el corte de 3 chips por celda. */
function mesActual(m: number, dia: number): string {
  return `${new Date().getFullYear()}-${String(m + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
/** Anexo de ejemplo adosado a la actividad; espeja la respuesta del backend. */
function anexoDeActividad(actividadId: string): AnexoActividad {
  return {
    id: "anexo-acta-1",
    actividad_id: actividadId,
    nombre_archivo: "Acta de la mesa.pdf",
    tipo_mime: "application/pdf",
    tamano_bytes: 20480,
    hash_sha256: "hash-ejemplo",
    descripcion: "Acta firmada de la sesión",
    subido_por: "Facilitador de Mesa",
    creado_en: new Date().toISOString(),
    url_descarga: "/api/v1/proyectos/archivo",
  };
}
function datosVentanaLarga(): ActividadProyecto[] {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const larga = actividadVentanaLarga();
  const diaDiez = mesActual(m, 10);
  return [
    larga,
    {
      id: "mesas:ag-cortas-1",
      modulo_dueno: "mesas",
      recurso_id: "ag-cortas-1",
      codigo: "AG-2026-0031",
      titulo: "Mesa de concertación en San Antoñito",
      descripcion: "Sesión única",
      etapa: "Mesa de Trabajo",
      territorio: "San Antoñito",
      lugar: "Cancha del barrio",
      fecha_inicio: diaDiez,
      fecha_fin: diaDiez,
      hora_inicio: "09:00",
      hora_fin: "12:00",
      estado_nativo: "programada",
      estado_canonico: "programada",
      avance_pct: 0,
      responsable: "Facilitador de Mesa",
      permiso_editar: "mesas:abrir",
    },
    {
      id: "comunicaciones:tc-cortas-1",
      modulo_dueno: "comunicaciones",
      recurso_id: "tc-cortas-1",
      codigo: "TC-2026-019",
      titulo: "Fotoreportaje sobre el desarme comunitario",
      descripcion: "Entrega digital",
      etapa: "Etapa 2: Historias y voces",
      territorio: "Getsemaní",
      lugar: null,
      fecha_inicio: diaDiez,
      fecha_fin: diaDiez,
      hora_inicio: null,
      hora_fin: null,
      estado_nativo: "en_progreso",
      estado_canonico: "en_progreso",
      avance_pct: 0,
      responsable: "Reportero Regional",
      permiso_editar: "comunicaciones:gestionar",
    },
    {
      id: "formularios:fq-cortas-1",
      modulo_dueno: "formularios",
      recurso_id: "fq-cortas-1",
      codigo: "FQ-2026-07",
      titulo: "Formulario de diagnóstico barrial abierto",
      descripcion: "Recoge por web",
      etapa: null,
      territorio: "",
      lugar: null,
      fecha_inicio: `${y}-01-10`,
      fecha_fin: null,
      hora_inicio: null,
      hora_fin: null,
      estado_nativo: "PUBLICADO",
      estado_canonico: "en_progreso",
      avance_pct: 0,
      responsable: "Coordinación de Formularios",
      permiso_editar: "formularios:gestionar",
    },
  ].map((a, i) => ({ ...(a as ActividadProyecto), id: `${a.id}-${i}` }));
}

const meta = {
  title: "Plataforma/Proyectos",
  parameters: {
    layout: "fullscreen",
    polis: { screen: true },
    nextjs: { appDirectory: true, navigation: { pathname: "/plataforma/proyectos" } },
  },
  beforeEach: () => prepararShell(),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/* Estado de carga: la vista muestra Skeleton mientras el agregado responde. */
export const ProyectosCargando: Story = {
  render: () => {
    simularApiProyectos("cuelga");
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // La pestaña activa (Gantt) muestra el Skeleton del kit mientras llega la respuesta.
    await expect(
      document.querySelector('[data-slot="skeleton"]'),
      "Skeleton visible durante la carga",
    ).not.toBeNull();
    await expect(c.getByRole("tablist")).toBeVisible();
    // Vista por defecto: Lista (encargo 2026-10-28; no Gantt).
    await expect(c.getByRole("tab", { name: "Lista" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

/* Estado de error: Notice con el detalle; la vista no deja la pantalla en blanco. */
export const ProyectosError: Story = {
  render: () => {
    simularApiProyectos("error");
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByText("No se pudieron cargar las actividades", {}, { timeout: 10000 }),
    ).toBeVisible();
    await expect(c.getByText(/fallo de simulación/)).toBeVisible();
  },
};

/* Estado vacío: EmptyState en la Lista y vacíos coherentes en Gantt y Kanban. */
export const ProyectosVacio: Story = {
  render: () => {
    simularApiProyectos([]);
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // La vista carga sin datos y muestra el estado vacío del kit en la Lista.
    await userEvent.click(c.getByRole("tab", { name: "Lista" }));
    await expect(
      await c.findByText("Sin actividades con los filtros actuales", {}, { timeout: 10000 }),
    ).toBeVisible();
    await expect(c.getByText(/Ajusta la búsqueda/)).toBeVisible();

    // El Gantt también comunica su vacío explícitamente (Regla 7).
    await userEvent.click(c.getByRole("tab", { name: "Gantt" }));
    await expect(
      await c.findByText(/No hay actividades en los filtros actuales/),
    ).toBeVisible();
  },
};

/* Ficha de actividad de detalle: la Lista abre el panel lateral con la
   proyección read-only del agregado (identidad, ubicación, ventana,
   descripción y módulo dueño). */
export const FichaActividad: Story = {
  render: () => {
    simularApiProyectos(datosVentanaLarga());
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByText("Total actividades", {}, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.click(c.getByRole("tab", { name: "Lista" }));
    const item = await c.findByRole(
      "button",
      { name: "Plan de barrido nocturno en 8 barrios priorizados" },
      { timeout: 10000 },
    );
    await userEvent.click(item);
    const ficha = await c.findByRole(
      "dialog",
      { name: "Plan de barrido nocturno en 8 barrios priorizados" },
      { timeout: 10000 },
    );
    await expect(ficha).toBeVisible();
  },
};

/* Edición de Mesas desde la ficha: con el store de agendas frío el editor
   de agenda debe hidratarse solo antes de permitir el guardado. */
export const EdicionAgendaDesdeFicha: Story = {
  render: () => {
    simularApiProyectos(datosVentanaLarga());
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    // Store de agendas pre-cargado: el editor hidrata desde este estado
    // (que se obtiene igualmente desde el backend real en producción).
    const agendaMesa: MesaAgenda = {
      id: "ag-cortas-1",
      nombre: "Mesa de concertación en San Antoñito",
      estado: "programada",
      fecha: mesActual(new Date().getMonth(), 10),
      horaInicio: "09:00",
      horaFin: "12:00",
      lugar: "Cancha del barrio",
      territorio: "San Antoñito",
      tipo: "territorial",
      responsable: "Facilitador de Mesa",
    } as unknown as MesaAgenda;
    useAgendaStore.setState({ agendas: [agendaMesa], cargando: false, error: null });

    const c = within(canvasElement);
    await expect(
      await c.findByText("Total actividades", {}, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.click(c.getByRole("tab", { name: "Lista" }));
    const item = await c.findByRole(
      "button",
      { name: "Mesa de concertación en San Antoñito" },
      { timeout: 10000 },
    );
    await userEvent.click(item);
    const ficha = await c.findByRole(
      "dialog",
      { name: "Mesa de concertación en San Antoñito" },
      { timeout: 10000 },
    );
    await expect(ficha).toBeVisible();
    await userEvent.click(
      await within(ficha).findByRole("button", { name: /Editar en Mesas/ }),
    );
    // El editor hidrata los campos desde el store (aunque llegue frío):
    const editor = await c.findByRole(
      "dialog",
      { name: "Mesa de concertación en San Antoñito" },
      { timeout: 10000 },
    );
    await expect(
      await within(editor).findByLabelText(/^Lugar/),
    ).toHaveValue("Cancha del barrio");
  },
};

/* Anexos desde la ficha: listar, cargar un archivo nuevo, descargarlo y
   eliminarlo. La ficha no duplica la gestión del módulo dueño: los adjuntos
   viven en el módulo Proyectos (tabla actividades_anexos). */
export const AnexosDesdeFicha: Story = {
  render: () => {
    const actividad = actividadVentanaLarga();
    simularApiProyectos([actividad], [anexoDeActividad(actividad.id)]);
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByText("Total actividades", {}, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.click(c.getByRole("tab", { name: "Lista" }));
    const item = await c.findByRole(
      "button",
      { name: "Plan de barrido nocturno en 8 barrios priorizados" },
      { timeout: 10000 },
    );
    await userEvent.click(item);
    const ficha = await c.findByRole(
      "dialog",
      { name: "Plan de barrido nocturno en 8 barrios priorizados" },
      { timeout: 10000 },
    );

    // Lista inicial: el anexo precargado aparece con sus metadatos.
    await within(ficha).findByText("Anexos y Archivos Adjuntos");
    const acta = await within(ficha).findByText("Acta de la mesa.pdf");
    await expect(acta).toBeVisible();

    // Carga de un archivo nuevo desde el control de archivo del kit.
    const input = ficha.querySelector<HTMLInputElement>('input[type="file"]');
    await expect(input).not.toBeNull();
    const archivo = new File(["%PDF-1.4 inform", "e de la mesa"], "informe_tecnico.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(input!, archivo);
    await userEvent.click(
      await within(ficha).findByRole("button", { name: /Adjuntar a actividad/ }),
    );
    const informe = await within(ficha).findByText("informe_tecnico.pdf", {}, { timeout: 10000 });
    await expect(informe).toBeVisible();

    // Eliminación con confirmación explícita en dos pasos.
    await userEvent.click(
      within(ficha).getByTitle("Eliminar anexo"),
    );
    await userEvent.click(
      within(ficha).getByRole("button", { name: "Confirmar" }),
    );
    await within(ficha).findByText("No hay archivos adjuntos en esta actividad.");
  },
};

/* Ventanas largas de Comunicaciones en el calendario mensual: la actividad
   que inició meses atrás y termina el próximo año aparece en la celda
   de cada día del mes en curso (sin filtrarse al mes de inicio). */
export const ProyectosVentanaLargaCalendario: Story = {
  render: () => {
    simularApiProyectos(datosVentanaLarga());
    return (
      <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByText("Total actividades", {}, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.click(c.getByRole("tab", { name: "Calendario" }));
    await expect(
      await c.findByRole("region", { name: "Calendario mensual de proyectos" }, { timeout: 10000 }),
    ).toBeVisible();

    // La ventana larga conserva su chip en el mes visible aunque su inicio sea otro mes:
    // aparece en múltiples celdas (una por día), por eso el matcher plural.
    const chipsLarga = await c.findAllByTitle(
      "Comunicaciones: Plan de barrido nocturno en 8 barrios priorizados",
      {},
      { timeout: 10000 },
    );
    await expect(chipsLarga.length).toBeGreaterThan(0);
    for (const chip of chipsLarga) {
      await expect(chip).toBeVisible();
    }
  },
};
