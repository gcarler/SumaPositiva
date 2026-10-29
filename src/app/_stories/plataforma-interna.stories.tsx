import { FORMULARIOS_MOCK, RESPUESTAS_MOCK } from "@/features/formularios/__fixtures__/formularios.fixture";
import { simularApiFormularios } from "./formularios-mock-api";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor, fn } from "storybook/test";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { QueryProvider } from "@/app/_composition/query-provider";
import { PanelHost } from "@/app/_components/panel-host";
import { PlataformaShell } from "@/features/plataforma/components/plataforma-shell";
import { DashboardView } from "@/features/plataforma/views/dashboard-view";
import { FormulariosView } from "@/features/plataforma/views/formularios-view";
import { MesasGestionView } from "@/features/plataforma/views/mesas-view";
import { UsuariosGestionView } from "@/features/plataforma/views/usuarios-view";
import { GeovisorAdministrativoView } from "@/features/plataforma/views/geovisor-view";
import { ContenidoView } from "@/features/plataforma/views/contenido-view";
import { NoticiasPlataformaView } from "@/features/plataforma/views/noticias-view";
import { TestimoniosPlataformaView } from "@/features/plataforma/views/testimonios-view";
import { ComunicacionesView } from "@/features/comunicaciones/views/comunicaciones-view";
import type { TareaComunicacion } from "@/features/comunicaciones/models/tarea-comunicacion";
import { ProyectosView } from "@/features/proyectos/views/proyectos-view";
import type { ActividadProyecto } from "@/features/proyectos/models/actividad-proyecto";
import { ConfiguracionView } from "@/features/plataforma/views/configuracion-view";
import { PlataformaSidebar } from "@/features/plataforma/components/plataforma-sidebar";
import { PlataformaHeader } from "@/features/plataforma/components/plataforma-header";
import { MapaTerritoriosApi } from "@/features/geovisor/components/mapa-territorios-api";
import { BancoConocimientoDNPTab } from "@/features/seguimiento/components/banco-conocimiento-dnp-tab";
import { MotorPlanAccionTab } from "@/features/seguimiento/components/motor-plan-accion-tab";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import { usePanelStore } from "@/core/panels/panel-store";
import { plataformaApi } from "@/features/plataforma/services/plataforma-api";
import {
  identidadApi,
  type Usuario,
} from "@/features/sesion/services/identidad-api";
const perfil: Usuario = {
  id: "01900000-0000-7000-8000-000000000001",
  nombres: "Ana",
  apellidos: "Torres",
  correo: "ana@example.org",
  codigo_rol: "administrador_identidades",
  activo: true,
  correo_verificado_en: null,
  nivel_identidad: "declarada",
  permisos: [
    "usuarios:leer",
    "usuarios:gestionar",
    "roles:gestionar",
    "politicas:gestionar",
    "formularios:gestionar",
    "formularios:leer",
    "identidad:auditar",
    "auditoria:leer",
    "comunicaciones:gestionar",
    "comunicaciones:leer",
    "proyectos:leer",
    "mesas:abrir",
    "mesas:leer",
    "seguimiento:gestionar",
  ],
};
const apiOriginal = { ...plataformaApi };
const identidadOriginal = { ...identidadApi };
/* 8 cuentas de demo para la vista de usuarios; incluye a Ana Pérez para el flujo de "Perfil y accesos". */
const cuentasBase: Usuario[] = [
  perfil,
  { ...perfil, id: "demo-002", nombres: "Ana", apellidos: "Pérez", correo: "ana.perez@cartagena.gov.co" },
  { ...perfil, id: "demo-003", nombres: "Carlos", apellidos: "Molina", correo: "carlos.molina@cartagena.gov.co" },
  { ...perfil, id: "demo-004", nombres: "Diana", apellidos: "Vélez", correo: "diana.velez@cartagena.gov.co" },
  { ...perfil, id: "demo-005", nombres: "Ernesto", apellidos: "Sánchez", correo: "ernesto.sanchez@cartagena.gov.co" },
  { ...perfil, id: "demo-006", nombres: "Fernanda", apellidos: "Ruiz", correo: "fernanda.ruiz@cartagena.gov.co" },
  { ...perfil, id: "demo-007", nombres: "Gustavo", apellidos: "Salas", correo: "gustavo.salas@cartagena.gov.co" },
  { ...perfil, id: "demo-008", nombres: "Helena", apellidos: "Cardona", correo: "helena.cardona@cartagena.gov.co" },
];
/* Exhibición mutable de la historia: las invitaciones de la prueba se adjuntan sin fugar entre historias. */
let cuentasActuales: Usuario[] = structuredClone(cuentasBase);
const geometria = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-75.55, 10.4],
            [-75.5, 10.4],
            [-75.5, 10.45],
            [-75.55, 10.45],
            [-75.55, 10.4],
          ],
        ],
      },
      properties: {
        id: "territorio-prueba",
        nombre: "Territorio de prueba",
        codigo: "T-1",
        tipo_territorio: "localidad",
      },
    },
  ],
};
function autenticar(rol = "administrador_identidades") {
  useSesionStore.getState().iniciarSesion({
    usuario: { ...perfil, codigo_rol: rol },
    rol,
    permisos: perfil.permisos,
    nivel_identidad: "declarada",
    token_acceso: "token-storybook",
    expira_en: "2099-01-01T00:00:00Z",
  });
}
function simularApiTestimonios() {
  const fetchOriginal = window.fetch;
  window.fetch = async (input, opciones) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (url.pathname === "/api/v1/testimonios/resumen") {
      return Response.json({
        total_testimonios: 0,
        aprobados: 0,
        destacados: 0,
        pendientes: 0,
        rechazados: 0,
        por_territorio: [],
      });
    }
    if (url.pathname === "/api/v1/testimonios/gestion") return Response.json([]);
    return fetchOriginal(input, opciones);
  };
  return () => {
    window.fetch = fetchOriginal;
  };
}
const meta = {
  title: "Plataforma/Administración interna",
  parameters: {
    layout: "fullscreen",
    polis: { screen: true },
    nextjs: { appDirectory: true, navigation: { pathname: "/plataforma" } },
  },
  beforeEach: () => {
    const restaurarApiFormularios = simularApiFormularios();
    const restaurarApiTestimonios = simularApiTestimonios();
    const anterior = useSesionStore.getState();
    usePanelStore.getState().closeAll();
    useFormulariosStore.setState({formularios: structuredClone(FORMULARIOS_MOCK).map(f => ({...f, origenDatos: "api"})), respuestas: structuredClone(RESPUESTAS_MOCK), previews: {}});
    autenticar();
    Object.assign(plataformaApi, {
      territorios: fn(async () => [
        { ...geometria.features[0].properties, poblacion_estimada: 1200 },
      ]),
      geometria: fn(async () => structuredClone(geometria)),
      fases: fn(async () => [
        {
          id: "fase",
          codigo: "D",
          nombre: "Diagnóstico",
          estado: "activa",
          progreso_porcentaje: 35,
        },
      ]),
      lineas: fn(async () => [
        {
          id: "linea",
          titulo: "Convivencia",
          descripcion: "Entornos seguros",
          fase_id: "fase",
          entidad_lider: "Distrito",
        },
      ]),
      aportes: fn(async () => ({ total: 0, elementos: [] })),
      telemetriaSql: fn(async () => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
        total_queries_recorded: 120,
        cache_hit_ratio_pct: 99.8,
        top_queries: [
          {
            query: "SELECT count(*) FROM mesas_trabajo.mesas",
            calls: 42,
            total_ms: 12.4,
            mean_ms: 0.29,
            rows: 42,
            hit_ratio_pct: 99.9,
          },
        ],
      })),
    } satisfies typeof plataformaApi);

    Object.assign(identidadApi, {
      usuarios: fn(async () => ({
        total: cuentasActuales.length,
        elementos: structuredClone(cuentasActuales),
      })),
      roles: fn(async () => []),
      crearUsuario: fn(
        async (datos: {
          correo: string;
          contrasena: string;
          nombres: string;
          apellidos: string;
          codigo_rol: string;
          motivo: string;
        }) => {
          cuentasActuales = [
            ...cuentasActuales,
            {
              ...perfil,
              id: `demo-${Date.now().toString(36)}`,
              nombres: datos.nombres,
              apellidos: datos.apellidos,
              correo: datos.correo,
              codigo_rol: datos.codigo_rol ?? "ciudadano",
            },
          ];
          return { ...perfil, mensaje: "Invitación enviada y usuario registrado" };
        },
      ),
      editarUsuario: fn(
        async (
          _id: string,
          _datos: {
            nombres: string;
            apellidos: string;
            codigo_rol: string;
            activo: boolean;
            motivo: string;
          },
        ) => ({ mensaje: "Usuario institucional actualizado" }),
      ),
      ambitosUsuario: fn(async () => []),
      logout: fn(async () => ({ mensaje: "Sesión cerrada" })),
      perfil: fn(async () => perfil),
    });
    return () => {
      restaurarApiTestimonios();
      restaurarApiFormularios();
      cuentasActuales = structuredClone(cuentasBase);
      Object.assign(plataformaApi, apiOriginal);
      Object.assign(identidadApi, identidadOriginal);
      usePanelStore.getState().closeAll();
      useSesionStore.setState(anterior);
    };
  },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <DashboardView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Dashboard: Story = {};
export const DashboardOscuro: Story = { globals: { theme: "dark" } };
export const Formularios: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/plataforma/formularios" } },
  },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <FormulariosView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("button", { name: "Crear Formulario" }),
    ).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: "Crear Formulario" }));
    await expect(
      await c.findByRole(
        "dialog",
        { name: "Nuevo Formulario" },
        { timeout: 10000 },
      ),
    ).toBeVisible();
  },
};
export const FormulariosFacilitador: Story = {
  ...Formularios,
  beforeEach: () => autenticar("facilitador_mesa"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.queryByRole("button", { name: "Crear Formulario" }),
    ).toBeNull();
    const botones = await c.findAllByRole(
      "button",
      { name: "Vista previa" },
      { timeout: 10000 },
    );
    await expect(botones).toHaveLength(2);
  },
};
export const FormulariosAuditor: Story = {
  ...FormulariosFacilitador,
  beforeEach: () => autenticar("auditor_forense"),
};
export const Mesas: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/mesas" } } },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <MesasGestionView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
};
export const MesasAuditor: Story = {
  ...Mesas,
  beforeEach: () => autenticar("auditor_forense"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button", { name: "Crear mesa" })).toBeNull();
  },
};
export const Usuarios: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/usuarios" } } },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <UsuariosGestionView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    /* El SidePanel de POLIS no se porta fuera del árbol: el diálogo vive en el canvas. */
    await expect(
      await c.findByText("Mostrando 8 de 8 cuentas registradas"),
    ).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: "Invitar usuario" }));
    await expect(
      await c.findByRole("dialog", { name: "Invitar usuario" }),
    ).toBeVisible();
    /* Los labels obligatorios añaden "*" visibles: matcher por prefijo. */
    await userEvent.type(c.getByLabelText(/^Nombres/), "Prueba");
    await userEvent.type(c.getByLabelText(/^Apellidos/), "Cartagena");
    await userEvent.type(
      c.getByLabelText(/^Correo electrónico/),
      "prueba@cartagena.gov.co",
    );
    await userEvent.click(c.getByRole("button", { name: "Enviar invitación" }));
    await expect(await c.findByText("Prueba Cartagena")).toBeVisible();
    await userEvent.click(
      (await c.findAllByRole("button", { name: /Ana Pérez/ }))[0],
    );
    await expect(
      await c.findByRole("dialog", { name: "Perfil y accesos" }),
    ).toBeVisible();
    await expect(await c.findByText("Detalles de la cuenta")).toBeVisible();
    await userEvent.click(
      await c.findByRole("button", { name: "Editar rol y datos" }),
    );
    await expect(
      await c.findByRole("dialog", { name: "Editar usuario" }),
    ).toBeVisible();
  },
};
export const Contenido: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/contenido" } } },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <ContenidoView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
};
export const Noticias: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/noticias" } } },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <NoticiasPlataformaView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Gestión de Noticias" })).toBeVisible();
    await expect(c.getByRole("button", { name: /Nueva Noticia/ })).toBeVisible();
  },
};
export const NoticiasOscuro: Story = {
  ...Noticias,
  globals: { theme: "dark" },
};
export const Testimonios: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/testimonios" } } },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <TestimoniosPlataformaView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByRole("heading", { name: "Gestión y Moderación de Testimonios" }),
    ).toBeVisible();
    await expect(
      await c.findByRole("region", { name: "Cola de moderación de testimonios" }),
    ).toBeVisible();
    await expect(await c.findByText("No hay testimonios en estado pendiente en este momento.")).toBeVisible();
  },
};
export const TestimoniosOscuro: Story = {
  ...Testimonios,
  globals: { theme: "dark" },
};
export const Configuracion: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/plataforma/configuracion" } },
  },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <ConfiguracionView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Seguridad e identidad" })).toBeVisible();
    await expect(c.getByLabelText("Latitud")).toHaveValue("10.3997");
    await expect(c.getByText("@cartagena.gov.co")).toBeVisible();
  },
};
export const GeovisorReal: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/geovisor" } } },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <GeovisorAdministrativoView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(
      await c.findByRole("button", {
        name: "Territorio de prueba · localidad",
      }),
    );
    await expect(
      await c.findByText(
        `Población estimada: ${Number(1200).toLocaleString("es")}`,
      ),
    ).toBeVisible();
  },
};
export const MapaApi: Story = {
  render: () => (
    <main>
      <h1>Territorios registrados</h1>
      <MapaTerritoriosApi datos={geometria} seleccionar={fn()} />
    </main>
  ),
};
export const SinSesion: Story = {
  beforeEach: () => useSesionStore.getState().limpiarSesion(),
  play: async () => {
    await waitFor(() =>
      expect(getRouter().replace).toHaveBeenCalledWith("/?login=1"),
    );
  },
};
export const Ciudadano: Story = {
  beforeEach: () => autenticar("ciudadano"),
  play: async () => {
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalledWith("/"));
  },
};
export const RutaDenegada: Story = {
  parameters: { nextjs: { navigation: { pathname: "/plataforma/usuarios" } } },
  beforeEach: () => autenticar("autoridad_distrital"),
  play: async () => {
    await waitFor(() =>
      expect(getRouter().replace).toHaveBeenCalledWith("/plataforma"),
    );
  },
};
export const CerrarSesion: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalledWith("/"));
    await expect(useSesionStore.getState().sesion).toBeNull();
  },
};
export const SidebarAutoridad: Story = {
  beforeEach: () => autenticar("autoridad_distrital"),
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <h1>Área de autoridad distrital</h1>
      </PlataformaShell>
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("link", { name: "Noticias" })).toBeVisible();
    await expect(c.getByRole("link", { name: "Testimonios" })).toBeVisible();
    await expect(
      c.queryByRole("link", { name: "Usuarios y Roles" }),
    ).toBeNull();
    await expect(c.queryByRole("link", { name: "Configuración" })).toBeNull();
  },
};
export const SidebarComponent: Story = {
  render: () => (
    <div className="lg:flex">
      <PlataformaSidebar />
      <main>
        <h1>Navegación interna</h1>
      </main>
    </div>
  ),
};
export const HeaderComponent: Story = {
  render: () => (
    <QueryProvider>
      <main>
        <h1>Sesión interna</h1>
        <PlataformaHeader />
      </main>
    </QueryProvider>
  ),
};

export const MotorPlanAccionDNP: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/plataforma/seguimiento" } },
  },
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <div className="space-y-8">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Motor de Plan de Acción DNP y Banco de Conocimiento
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Instrumento Oficial SisPT / DNP articulado a Ley 152/94 y Ley 1474/11
            </p>
          </div>
          <MotorPlanAccionTab puedeEditar={true} />
          <div className="pt-6 border-t border-border">
            <BancoConocimientoDNPTab />
          </div>
        </div>
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      await c.findByText(
        "Motor de Procesamiento de Planes de Acción",
        {},
        { timeout: 10000 }
      )
    ).toBeVisible();
    await expect(
      await c.findByText(
        "Kit Financiero MHCP / DNP",
        {},
        { timeout: 10000 }
      )
    ).toBeVisible();
    await expect(
      await c.findByText(
        "Marco Normativo y Principios de Formulación Territorial",
        {},
        { timeout: 10000 }
      )
    ).toBeVisible();
  },
};

/* Mock de la API de comunicaciones para la historia de gestión tipo proyectos.
   Las mutaciones de la prueba mutan un clon local; el cleanup restaura. */
const TAREAS_BASE: TareaComunicacion[] = [
  {
    id: "tc-01",
    codigo: "TC-01",
    etapa: "Etapa 1: Pre-Producción y Banco de Evidencias",
    territorio: "Sala de Redacción",
    titulo: "Alineación técnica del equipo",
    descripcion: "Guiones de entrevistas",
    entregables: "Guion oficial",
    fecha_inicio: "2026-10-06",
    fecha_fin: "2026-10-06",
    estado: "pendiente",
    responsable: "Equipo de Comunicaciones",
    orden: 1,
  },
  {
    id: "tc-02",
    codigo: "TC-02",
    etapa: "Etapa 2: Gran Hito Inaugural",
    territorio: "Portal de los Dulces",
    titulo: "Cobertura audiovisual inauguración",
    descripcion: "Streaming institucional",
    entregables: "Link de transmisión",
    fecha_inicio: "2026-10-15",
    fecha_fin: "2026-10-15",
    estado: "en_progreso",
    responsable: "Equipo Audiovisual",
    orden: 2,
  },
  {
    id: "tc-03",
    codigo: "TC-03",
    etapa: "Etapa 2: Gran Hito Inaugural",
    territorio: "Centro Histórico",
    titulo: "Plan de medios del hito",
    descripcion: "Convocatoria de prensa",
    entregables: "Boletín distrital",
    fecha_inicio: "2026-10-14",
    fecha_fin: "2026-10-16",
    estado: "completada",
    responsable: "Gabinete de Comunicaciones",
    orden: 3,
  },
  // En-rango de la Fase de Diagnóstico (27-oct → 31-dic): espejo de la semilla TC-13
  {
    id: "tc-04",
    codigo: "TC-04",
    etapa: "Etapa 3: Despliegue Territorial y Temático",
    territorio: "Localidad 3: Industrial y de la Bahía",
    titulo: "Mesas territoriales de Bahía e Industrial",
    descripcion: "Cobertura del ciclo de mesas de la Localidad 3",
    entregables: "2 boletines + cápsulas testimoniales",
    fecha_inicio: "2026-11-01",
    fecha_fin: "2026-11-07",
    estado: "pendiente",
    responsable: "Reportero Asignado Localidad 3",
    orden: 4,
  },
];
function simularApiComunicaciones() {
  const fetchOriginal = window.fetch;
  let tareasActuales: TareaComunicacion[] = structuredClone(TAREAS_BASE);
  window.fetch = async (input, opciones) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (url.pathname === "/api/v1/comunicaciones/tareas") {
      if (opciones?.method === "POST") {
        const nueva = JSON.parse(String(opciones.body)) as TareaComunicacion;
        const guardada = { ...nueva, id: `tc-nuevo-${Date.now().toString(36)}` };
        tareasActuales = [...tareasActuales, guardada];
        return Response.json(guardada, { status: 201 });
      }
      return Response.json(tareasActuales);
    }
    const edicion = url.pathname.match(/^\/api\/v1\/comunicaciones\/tareas\/([^/]+)$/);
    if (edicion) {
      const id = edicion[1];
      const actual = tareasActuales.find((t) => t.id === id);
      if (!actual) return Response.json({ detalle: "ya no existe" }, { status: 404 });
      if (opciones?.method === "DELETE") {
        tareasActuales = tareasActuales.filter((t) => t.id !== id);
        return new Response(null, { status: 204 });
      }
      const cambios = opciones?.body
        ? (JSON.parse(String(opciones.body)) as Partial<TareaComunicacion>)
        : {};
      const actualizada = { ...actual, ...cambios };
      tareasActuales = tareasActuales.map((t) => (t.id === id ? actualizada : t));
      return Response.json(actualizada);
    }
    return fetchOriginal(input, opciones);
  };
  return () => {
    window.fetch = fetchOriginal;
    tareasActuales = structuredClone(TAREAS_BASE);
  };
}

export const ComunicacionesGestion: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/plataforma/comunicaciones" } },
  },
  beforeEach: () => simularApiComunicaciones(),
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <ComunicacionesView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Sin editor inline al abrir: el foco del usuario se conserva (listado intacto
    // y en su posición de scroll)
    await expect(c.queryByText("Editor de Tarea y Fechas")).toBeNull();
    await expect(await c.findByText("TC-01", {}, { timeout: 10000 })).toBeVisible();
    await expect(c.getByText("TC-02")).toBeVisible();
    await expect(c.getByText("TC-03")).toBeVisible();

    // Métricas ejecutivas: barra de progreso global accesible
    await expect(
      c.getByRole("progressbar", { name: "Avance global del plan de comunicaciones" }),
    ).toBeVisible();
    await expect(c.getByText("1 de 4 actividades completadas (25%)")).toBeVisible();

    // Tablero Kanban por estado
    await userEvent.click(c.getByRole("tab", { name: /Tablero Kanban/ }));
    await expect(
      await c.findByText("Cobertura audiovisual inauguración", {}, { timeout: 10000 }),
    ).toBeVisible();

    // Editar tarea abre el editor en el panel lateral Zero-Modals
    await userEvent.click(c.getByRole("button", { name: "Editar tarea TC-02" }));
    await expect(
      await c.findByRole("dialog", { name: "Editar tarea TC-02" }, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(await c.findByText("Cobertura audiovisual inauguración")).toBeVisible();

    // Cambio rápido de estado desde la tarjeta del cronograma (sin abrir formulario)
    await userEvent.click(c.getByRole("tab", { name: /Cronograma/ }));
    await expect(await c.findByText("TC-01", {}, { timeout: 10000 })).toBeVisible();
    await userEvent.click(
      c.getAllByRole("button", { name: "✓ Marcar lista" })[0]!,
    );
    // El estado persiste en la API mock y recalcula métricas sin abrir editor
    await expect(
      await c.findByText("2 de 4 actividades completadas (50%)", {}, { timeout: 10000 }),
    ).toBeVisible();

    // Diagrama de Gantt: ventana de la Fase de Diagnóstico 27-oct → 31-dic
    await userEvent.click(c.getByRole("tab", { name: /Diagrama de Gantt/ }));
    await expect(
      await c.findByRole("region", { name: "Diagrama de Gantt del cronograma" }, { timeout: 10000 }),
    ).toBeVisible();
    // Escala temporal visible con extremos y verdad de la fase
    await expect(c.getByText("Fase de Diagnóstico")).toBeVisible();
    await expect(c.getByText("27 Octubre – 31 Diciembre 2026")).toBeVisible();
    // Indicador accesible de «Hoy» (la fase inició hoy)
    await expect(c.getByText("Hoy: 28 oct")).toBeVisible();
    // Proyección de tareas sobre la ventana (rango real visible en la barra)
    await expect(
      c.getByRole("button", { name: "TC-02: Cobertura audiovisual inauguración. Del 2026-10-15 al 2026-10-15. Estado: En progreso" }),
    ).toBeVisible();
    // Cada barra muestra su rango de fechas en formato corto
    await expect(
      c.getByText("15/10 – 15/10"),
    ).toBeVisible();
    // La tarea en-rango TC-04 se proyecta con barra proporcional completa (1–7 nov)
    await expect(
      c.getByRole("button", { name: "TC-04: Mesas territoriales de Bahía e Industrial. Del 2026-11-01 al 2026-11-07. Estado: Pendiente" }),
    ).toBeVisible();
    await expect(c.getByText("01/11 – 07/11")).toBeVisible();

    // Clic en la fila de la izquierda abre el SidePanel del editor (Encargo 255)
    await userEvent.click(
      c.getByRole("button", { name: "Editar tarea TC-02: Cobertura audiovisual inauguración, estado En progreso" }),
    );
    await expect(
      await c.findByRole("dialog", { name: "Editar tarea TC-02" }, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(
      await c.findByRole("region", { name: "Diagrama de Gantt del cronograma" }),
    ).toBeVisible();
  },
};

/* Mock de la API agregada de Proyectos (read-only): una actividad por fuente. */
const ACTIVIDADES_BASE: ActividadProyecto[] = [
  {
    id: "comunicaciones:tc-04",
    modulo_dueno: "comunicaciones",
    recurso_id: "tc-04",
    codigo: "TC-04",
    titulo: "Mesas territoriales de Bahía e Industrial",
    descripcion: "Cobertura del ciclo de mesas de la Localidad 3",
    etapa: "Etapa 3: Despliegue Territorial y Temático",
    territorio: "Localidad 3: Industrial y de la Bahía",
    lugar: null,
    fecha_inicio: "2026-11-01",
    fecha_fin: "2026-11-07",
    hora_inicio: null,
    hora_fin: null,
    estado_nativo: "pendiente",
    estado_canonico: "pendiente",
    avance_pct: 0,
    responsable: "Reportero Asignado Localidad 3",
    permiso_editar: "comunicaciones:gestionar",
  },
  {
    id: "mesas:AG-2026-0117",
    modulo_dueno: "mesas",
    recurso_id: "AG-2026-0117",
    codigo: "AG-2026-0117",
    titulo: "Mesa territorial de Bahía: navegación y drenajes",
    descripcion: "Sesión de concertación;z de agenda",
    etapa: "Mesa de Trabajo",
    territorio: "Bahía",
    lugar: "Plaza de Mercado Bazurto",
    fecha_inicio: "2026-11-05",
    fecha_fin: "2026-11-05",
    hora_inicio: "08:30",
    hora_fin: "12:00",
    estado_nativo: "programada",
    estado_canonico: "programada",
    avance_pct: 0,
    responsable: "Facilitador de Mesa",
    permiso_editar: "mesas:abrir",
  },
  {
    id: "formularios:fq-01",
    modulo_dueno: "formularios",
    recurso_id: "fq-01",
    codigo: "FQ-01",
    titulo: "Encuesta de percepción de seguridad",
    descripcion: "Fase 1 del ciclo — web",
    etapa: null,
    territorio: "",
    lugar: null,
    fecha_inicio: "2026-10-20",
    fecha_fin: "2026-12-15",
    hora_inicio: null,
    hora_fin: null,
    estado_nativo: "PUBLICADO",
    estado_canonico: "en_progreso",
    avance_pct: 0,
    responsable: "",
    permiso_editar: "formularios:gestionar",
  },
  {
    id: "comunicaciones:tc-07",
    modulo_dueno: "comunicaciones",
    recurso_id: "tc-07",
    codigo: "TC-07",
    titulo: "Barrido de narrativa comunitaria en Localidad 4",
    descripcion: "Historias y voces del ciclo de participación",
    etapa: "Etapa 2: Historias y voces",
    territorio: "Localidad 4: San Luis",
    lugar: null,
    fecha_inicio: "2026-10-01",
    fecha_fin: "2026-11-30",
    hora_inicio: null,
    hora_fin: null,
    estado_nativo: "pendiente",
    estado_canonico: "en_progreso",
    avance_pct: 45,
    responsable: "Reportero Asignado Localidad 4",
    permiso_editar: "comunicaciones:gestionar",
  },
];
function simularApiProyectos() {
  const fetchOriginal = window.fetch;
  window.fetch = async (input, opciones) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    if (url.pathname === "/api/v1/proyectos/actividades") {
      const modulo = url.searchParams.get("modulo");
      const datos = modulo ? ACTIVIDADES_BASE.filter((a) => a.modulo_dueno === modulo) : ACTIVIDADES_BASE;
      return Response.json(datos);
    }
    return fetchOriginal(input, opciones);
  };
  return () => {
    window.fetch = fetchOriginal;
  };
}

export const ProyectosGestion: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/plataforma/proyectos" } },
  },
  beforeEach: () => simularApiProyectos(),
  render: () => (
    <QueryProvider>
      <PlataformaShell>
        <ProyectosView />
      </PlataformaShell>
      <PanelHost />
    </QueryProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // KPIs agregados a partir de las 4 fuentes simuladas
    await expect(await c.findByText("Total actividades", {}, { timeout: 10000 })).toBeVisible();
    const cuatros = await c.findAllByText("4", {}, { timeout: 10000 });
    await expect(cuatros.length).toBeGreaterThan(0);

    // Gantt agregado con ventana calculada (oct–nov de las actividades)
    await userEvent.click(c.getByRole("tab", { name: "Gantt" }));
    const ganttRegion = await c.findByRole(
      "region",
      { name: "Diagrama de Gantt de proyectos" },
      { timeout: 10000 },
    );
    await expect(ganttRegion).toBeVisible();
    const g = within(ganttRegion);
    // Fila visible por módulo con chip de origen (Regla 6)
    await expect(g.getByText("Mesas")).toBeVisible();
    const ganttComunicaciones = await g.findAllByText("Comunicaciones");
    await expect(ganttComunicaciones.length).toBeGreaterThan(0);

    // Kanban agrupado por estado canónico
    await userEvent.click(c.getByRole("tab", { name: "Kanban" }));
    await expect(
      await c.findByText("Mesa territorial de Bahía: navegación y drenajes", {}, { timeout: 10000 }),
    ).toBeVisible();

    // Calendario del mes en curso con chip de la agenda de mesas
    await userEvent.click(c.getByRole("tab", { name: "Calendario" }));
    await expect(
      await c.findByRole("region", { name: "Calendario mensual de proyectos" }, { timeout: 10000 }),
    ).toBeVisible();
    await expect(
      await c.findByText(/Calendario mensual/i, {}, { timeout: 10000 }),
    ).toBeVisible();

    // Lista: abre la ficha de la actividad y desde ella el editor nativo del
    // módulo comunicaciones (ficha → botón Editar → editor TC-04).
    await userEvent.click(c.getByRole("tab", { name: "Lista" }));
    await expect(
      await c.findByText("Mesas territoriales de Bahía e Industrial", {}, { timeout: 10000 }),
    ).toBeVisible();
    const itemBtn = await c.findByRole(
      "button",
      { name: "Mesas territoriales de Bahía e Industrial" },
      { timeout: 10000 },
    );
    await userEvent.click(itemBtn);
    const fichaDialog = await c.findByRole(
      "dialog",
      { name: /Mesas territoriales de Bahía e Industrial/ },
      { timeout: 10000 },
    );
    await expect(fichaDialog).toBeVisible();
    await userEvent.click(
      await within(fichaDialog).findByRole("button", { name: /Editar en Comunicaciones/ }),
    );
    await expect(
      await c.findByRole("dialog", { name: "Editar tarea TC-04" }, { timeout: 10000 }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");

    // Filtro por módulo reduce el listado
    await userEvent.click(c.getByRole("combobox", { name: "Filtrar por módulo" }));
    const opcionComunicaciones = await within(document.body).findByRole(
      "option",
      { name: /Comunicaciones/ },
      { timeout: 10000 },
    );
    await userEvent.click(opcionComunicaciones);
    await expect(await c.findByText("Barrido de narrativa comunitaria en Localidad 4")).toBeVisible();
  },
};

