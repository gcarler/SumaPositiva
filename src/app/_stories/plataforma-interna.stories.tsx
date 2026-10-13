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
import { ConfiguracionView } from "@/features/plataforma/views/configuracion-view";
import { PlataformaSidebar } from "@/features/plataforma/components/plataforma-sidebar";
import { PlataformaHeader } from "@/features/plataforma/components/plataforma-header";
import { MapaTerritoriosApi } from "@/features/geovisor/components/mapa-territorios-api";
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
    await expect(
      c.getAllByRole("button", { name: "Vista previa" }),
    ).toHaveLength(2);
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
