/**
 * Pruebas unitarias para el Encargo 316:
 * - Botón de login visible en Topbar
 * - Delimitación estricta Ciudadano vs. Área de Trabajo (/plataforma)
 * - Armonización de la paleta visual de la plataforma
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { Topbar } from "@/app/_components/topbar";
import { PlataformaShell } from "./plataforma-shell";
import { PlataformaSidebar } from "./plataforma-sidebar";
import { PlataformaHeader } from "./plataforma-header";
import { useConfiguracionPlataformaStore } from "../state/configuracion-store";
import { abrirPanelSeguro } from "../services/panel-dispatcher";
import { usePanelStore } from "@/core/panels/panel-store";
import { CuentaUsuario } from "@/features/sesion/components/cuenta-usuario";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Sesion } from "@/features/sesion/models/sesion";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/plataforma",
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}));

function crearSesionCiudadano(): Sesion {
  return {
    modo: "identidad",
    usuarioId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    token: "jwt-ciudadano-valido",
    expiraEn: "2099-01-01T00:00:00Z",
    desde: "2026-11-08",
    rol: "ciudadano",
    permisos: ["propuestas:crear", "votos:emitir"],
    identidad: {
      nombre: "Carlos Martínez",
      email: "carlos.martinez@gmail.com",
      ciudad: "Cartagena",
    },
    usuario: {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      correo: "carlos.martinez@gmail.com",
      nombres: "Carlos",
      apellidos: "Martínez",
      codigo_rol: "ciudadano",
      activo: true,
      permisos: ["propuestas:crear", "votos:emitir"],
      nivel_identidad: "verificado",
      correo_verificado_en: "2026-11-08T00:00:00Z",
    },
  };
}

function crearSesionFormulador(): Sesion {
  return {
    modo: "institucional",
    usuarioId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    token: "jwt-formulador-valido",
    expiraEn: "2099-01-01T00:00:00Z",
    desde: "2026-11-08",
    rol: "facilitador_mesa",
    permisos: ["mesas:leer", "mesas:abrir", "mesas:acuerdos", "asistencia:verificar"],
    identidad: {
      nombre: "Dra. Carmen Valiente",
      email: "carmen.valiente@cartagena.gov.co",
      ciudad: "Cartagena",
    },
    usuario: {
      id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      correo: "carmen.valiente@cartagena.gov.co",
      nombres: "Carmen",
      apellidos: "Valiente",
      codigo_rol: "facilitador_mesa",
      activo: true,
      permisos: ["mesas:leer", "mesas:abrir", "mesas:acuerdos", "asistencia:verificar"],
      nivel_identidad: "institucional",
      correo_verificado_en: "2026-11-08T00:00:00Z",
    },
  };
}

function crearSesionAdmin(): Sesion {
  return {
    modo: "institucional",
    usuarioId: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    token: "jwt-admin-valido",
    expiraEn: "2099-01-01T00:00:00Z",
    desde: "2026-11-08",
    rol: "administrador_identidades",
    permisos: [
      "usuarios:leer",
      "usuarios:crear",
      "usuarios:roles",
      "auditoria:leer",
      "configuracion:leer",
      "configuracion:editar",
    ],
    identidad: {
      nombre: "Ing. Roberto Gómez",
      email: "roberto.gomez@cartagena.gov.co",
      ciudad: "Cartagena",
    },
    usuario: {
      id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      correo: "roberto.gomez@cartagena.gov.co",
      nombres: "Roberto",
      apellidos: "Gómez",
      codigo_rol: "administrador_identidades",
      activo: true,
      permisos: [
        "usuarios:leer",
        "usuarios:crear",
        "usuarios:roles",
        "auditoria:leer",
        "configuracion:leer",
        "configuracion:editar",
      ],
      nivel_identidad: "institucional",
      correo_verificado_en: "2026-11-08T00:00:00Z",
    },
  };
}


describe("Encargo 316: Botón de Login, Delimitación de Roles y Paleta Institucional", () => {
  beforeEach(() => {
    useConfiguracionPlataformaStore.getState().resetearConfiguracion();
    useSesionStore.setState({
      sesion: null,
      cargando: false,
      errorSesion: null,
      estadoMfa: null,
    });
  });

  describe("1. Topbar y Visibilidad del Botón de Login", () => {
    test("muestra botón visible de 'Iniciar sesión' cuando el usuario no tiene identidad", () => {
      // Estado sin sesión o anónimo
      useSesionStore.setState({
        sesion: {
          modo: "anonimo",
          desde: "2026-11-08",
        },
      });

      const html = renderToString(<Topbar />);

      expect(html).toContain("Iniciar sesión");
      expect(html).not.toContain("Área de Trabajo");
    });

    test("en sesión ciudadana muestra el nombre y badge 'Ciudadano', y NO muestra 'Área de Trabajo'", () => {
      useSesionStore.setState({
        sesion: crearSesionCiudadano(),
      });

      const html = renderToString(<Topbar />);

      expect(html).toContain("Carlos Martínez");
      expect(html).toContain("Ciudadano");
      // Delimitación estricta: un ciudadano no debe ver el botón de área de trabajo
      expect(html).not.toContain("Área de Trabajo");
      expect(html).not.toContain("Ir a la Plataforma");
    });

    test("en sesión institucional muestra 'Área de Trabajo →' para el equipo formulador", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });

      const html = renderToString(<Topbar />);

      expect(html).toContain("Dra. Carmen Valiente");
      expect(html).toContain("Área de Trabajo →");
    });
  });

  describe("2. Delimitación Estricta en PlataformaShell (/plataforma)", () => {
    test("muestra aviso pedagógico accesible cuando un ciudadano navega a /plataforma", () => {
      useSesionStore.setState({
        sesion: crearSesionCiudadano(),
      });

      const html = renderToString(
        <PlataformaShell>
          <div data-testid="contenido-interno">Panel Secreto</div>
        </PlataformaShell>
      );

      // Aviso pedagógico accesible
      expect(html).toContain("Área de Trabajo Técnica Institucional");
      expect(html).toContain("Espacio de trabajo reservado al equipo formulador");
      expect(html).toContain("Carlos Martínez");
      expect(html).toContain("Volver al Portal Ciudadano");
      // No debe renderizar el contenido interno técnico
      expect(html).not.toContain("Panel Secreto");
    });

    test("permite acceso al espacio técnico para usuarios con rol institucional", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });

      const queryClient = new QueryClient();
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <PlataformaShell>
            <div data-testid="contenido-interno">Panel de Gestión de Mesas</div>
          </PlataformaShell>
        </QueryClientProvider>
      );

      // Debe renderizar el shell y el contenido interno
      expect(html).toContain("Panel de Gestión de Mesas");
      expect(html).toContain("POLIS");
      expect(html).toContain("Gestión");
    });
  });

  describe("3. Armonización de Paleta y Navegación en Sidebar y Header", () => {
    test("PlataformaSidebar renderiza identidad POLIS y enlaces accesibles", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });
      useConfiguracionPlataformaStore.setState({ sidebarColapsado: false });

      const html = renderToString(<PlataformaSidebar />);

      expect(html).toContain("POLIS");
      expect(html).toContain("Gestión");
      expect(html).toContain("Área de Trabajo Técnica");
      expect(html).toContain("Volver al portal ciudadano");
      expect(html).toContain("lg:w-64");
      expect(html).toContain("Reducir barra lateral a iconos");
    });

    test("PlataformaSidebar en modo colapsado se reduce a iconos (lg:w-16) con botón de expandir", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });
      useConfiguracionPlataformaStore.setState({ sidebarColapsado: true });

      const html = renderToString(<PlataformaSidebar />);

      expect(html).toContain("lg:w-16");
      expect(html).toContain("Expandir barra lateral");
    });

    test("PlataformaHeader muestra identidad, badge de rol y accesos de cuenta", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });

      const queryClient = new QueryClient();
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <PlataformaHeader />
        </QueryClientProvider>
      );

      expect(html).toContain("Dra. Carmen Valiente");
      expect(html).toContain("Facilitador de mesa");
      expect(html).toContain("Mi cuenta");
      expect(html).toContain("Cerrar sesión");
      expect(html).toContain("Reducir barra lateral a iconos");
    });
  });

  describe("4. Delimitación y Aviso Pedagógico en CuentaUsuario (Mi cuenta)", () => {
    test("muestra aviso pedagógico de identidad ciudadana verificada en sesión ciudadana", () => {
      useSesionStore.setState({
        sesion: crearSesionCiudadano(),
      });

      const queryClient = new QueryClient();
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <CuentaUsuario />
        </QueryClientProvider>
      );

      expect(html).toContain("Identidad Ciudadana Verificada");
      expect(html).toContain("El espacio de trabajo técnico (/plataforma) está reservado para los equipos formuladores");
      expect(html).not.toContain("Ir al Área de Trabajo (/plataforma) →");
    });

    test("muestra tarjeta de acceso al área técnica en sesión institucional", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });

      const queryClient = new QueryClient();
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <CuentaUsuario />
        </QueryClientProvider>
      );

      expect(html).toContain("Área de Trabajo Institucional");
      expect(html).toContain("Ir al Área de Trabajo (/plataforma) →");
    });
  });

  describe("5. Encargo 323: Sidebar Jerárquico, Submódulos, Buscador y Redimensionamiento", () => {
    test("renderiza secciones, módulos y submódulos según permisos de facilitador_mesa", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });
      useConfiguracionPlataformaStore.setState({ sidebarColapsado: false });

      const html = renderToString(<PlataformaSidebar />);

      // Debe incluir sección de deliberación y módulo mesas con sus submódulos
      expect(html).toContain("Deliberación y Formulación");
      expect(html).toContain("Mesas");
      expect(html).toContain("Todas las mesas");
      expect(html).toContain("Mesas en curso");
      expect(html).toContain("Mesas programadas");

      // No debe incluir módulo usuarios ni submódulos de administración
      expect(html).not.toContain("Directorio de cuentas");
      expect(html).not.toContain("Consola de auditoría forense");
    });

    test("renderiza sección y submódulos de administración para administrador_identidades", () => {
      useSesionStore.setState({
        sesion: crearSesionAdmin(),
      });
      useConfiguracionPlataformaStore.setState({
        sidebarColapsado: false,
        modulosExpandidos: { usuarios: true },
      });

      const html = renderToString(<PlataformaSidebar />);

      // Debe incluir sección de administración y módulo usuarios
      expect(html).toContain("Administración y Gobernanza");
      expect(html).toContain("Usuarios y Roles");
      expect(html).toContain("Directorio de cuentas");
      expect(html).toContain("Consola de auditoría forense");
    });

    test("buscador visible en modo expandido y oculto en modo colapsado", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });

      // Expandido
      useConfiguracionPlataformaStore.setState({ sidebarColapsado: false });
      const htmlExpandido = renderToString(<PlataformaSidebar />);
      expect(htmlExpandido).toContain("Buscar módulo o submódulo...");
      expect(htmlExpandido).toContain('aria-label="Buscar módulo o submódulo"');

      // Colapsado
      useConfiguracionPlataformaStore.setState({ sidebarColapsado: true });
      const htmlColapsado = renderToString(<PlataformaSidebar />);
      expect(htmlColapsado).not.toContain("Buscar módulo o submódulo...");
    });

    test("tirador de redimensionamiento accesible con role separator y límites aria", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });
      useConfiguracionPlataformaStore.setState({
        sidebarColapsado: false,
        sidebarAncho: 280,
      });

      const html = renderToString(<PlataformaSidebar />);

      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-label="Ajustar ancho de la barra lateral"');
      expect(html).toContain('aria-orientation="vertical"');
      expect(html).toContain('aria-valuemin="200"');
      expect(html).toContain('aria-valuemax="420"');
    });

    test("store: persistencia, acotamiento de ancho (200-420px) y subvistas", () => {
      const store = useConfiguracionPlataformaStore.getState();

      // Clamp mínimo a 200px
      store.setSidebarAncho(120);
      expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(200);

      // Clamp máximo a 420px
      store.setSidebarAncho(550);
      expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(420);

      // Valor intermedio válido
      store.setSidebarAncho(310);
      expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(310);

      // Resetear restaura 272 y descolapsa
      useConfiguracionPlataformaStore.setState({ sidebarColapsado: true });
      store.resetSidebarAncho();
      expect(useConfiguracionPlataformaStore.getState().sidebarAncho).toBe(272);
      expect(useConfiguracionPlataformaStore.getState().sidebarColapsado).toBe(false);

      // Sincronización de subvistas
      store.setSubvistaModulo("seguimiento", "triada_motores");
      expect(
        useConfiguracionPlataformaStore.getState().subvistaPlataforma["seguimiento"]
      ).toBe("triada_motores");

      store.setSubvistaModulo("mesas", "EN_CURSO");
      expect(
        useConfiguracionPlataformaStore.getState().subvistaPlataforma["mesas"]
      ).toBe("EN_CURSO");
    });

    test("Encargo 324: submódulos Nivel 2 alineados a la izquierda (justify-start, text-left) y botón circular Figma con chevron (-right-3)", () => {
      useSesionStore.setState({
        sesion: crearSesionFormulador(),
      });
      useConfiguracionPlataformaStore.setState({
        sidebarColapsado: false,
        modulosExpandidos: { mesas: true },
      });

      const html = renderToString(<PlataformaSidebar />);

      // Botón circular Figma en el borde derecho superior
      expect(html).toContain("-right-3");
      expect(html).toContain("rounded-full");

      // Submódulos Nivel 2 alineados a la izquierda
      expect(html).toContain("justify-start");
      expect(html).toContain("text-left");
      expect(html).toContain("flex-col items-stretch");

      // Verificación en modo colapsado para chevron
      useConfiguracionPlataformaStore.setState({
        sidebarColapsado: true,
      });
      const htmlColapsado = renderToString(<PlataformaSidebar />);
      expect(htmlColapsado).toContain("-right-3");
      expect(htmlColapsado).toContain("Expandir barra lateral");
    });

    test("abrirPanelSeguro inicializa props como objeto vacío {} (nunca undefined) en mesa-editor y paneles de creación", () => {
      usePanelStore.getState().closeAll();
      const ok = abrirPanelSeguro("mesa-editor");
      expect(ok).toBe(true);

      const entries = usePanelStore.getState().entries;
      expect(entries.length).toBe(1);
      expect(entries[0].type).toBe("mesa-editor");
      expect(entries[0].props).toBeDefined();
      expect(entries[0].props).toEqual({});
    });

    test("Encargo 325: abrirPanelSeguro despacha identificadores y props seguras para indicadores, territorios, formularios y auditoría", () => {
      usePanelStore.getState().closeAll();

      // Indicador detalle provee indicadorId no vacío
      expect(abrirPanelSeguro("indicador-detalle")).toBe(true);
      let entry = usePanelStore.getState().entries.at(-1);
      expect(entry?.type).toBe("indicador-detalle");
      expect((entry?.props as { indicadorId?: string })?.indicadorId).toBeDefined();

      // Ficha territorial y Territorio geovisor
      expect(abrirPanelSeguro("ficha-territorial")).toBe(true);
      entry = usePanelStore.getState().entries.at(-1);
      expect(entry?.type).toBe("ficha-territorial");
      expect((entry?.props as { territorioId?: string })?.territorioId).toBe("terr-loc-1");

      expect(abrirPanelSeguro("territorio")).toBe(true);
      entry = usePanelStore.getState().entries.at(-1);
      expect(entry?.type).toBe("territorio");
      expect((entry?.props as { territorioId?: string })?.territorioId).toBe("loc-1");

      // Formulario analítica
      expect(abrirPanelSeguro("formulario-analitica")).toBe(true);
      entry = usePanelStore.getState().entries.at(-1);
      expect(entry?.type).toBe("formulario-analitica");
      expect((entry?.props as { formularioId?: string })?.formularioId).toBeDefined();

      // Auditoría consola
      expect(abrirPanelSeguro("auditoria-consola")).toBe(true);
      entry = usePanelStore.getState().entries.at(-1);
      expect(entry?.type).toBe("auditoria-consola");
      expect(entry?.props).toEqual({});
    });

    test("Encargo 325: submódulos de geovisor, actores y fuentes ofrecen navegación funcional por subvistas", () => {
      useSesionStore.setState({
        sesion: {
          modo: "institucional",
          usuarioId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
          token: "jwt-autoridad-valido",
          expiraEn: "2099-01-01T00:00:00Z",
          desde: "2026-11-08",
          rol: "autoridad_distrital",
          permisos: ["diagnostico:leer", "geovisor:leer", "actores:leer", "fuentes:leer", "politicas:gestionar"],
          identidad: {
            nombre: "Dr. Roberto Alcalde",
            email: "roberto.alcalde@cartagena.gov.co",
            ciudad: "Cartagena",
          },
          usuario: {
            id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
            correo: "roberto.alcalde@cartagena.gov.co",
            nombres: "Roberto",
            apellidos: "Alcalde",
            codigo_rol: "autoridad_distrital",
            activo: true,
            permisos: ["diagnostico:leer", "geovisor:leer", "actores:leer", "fuentes:leer", "politicas:gestionar"],
            nivel_identidad: "institucional",
            correo_verificado_en: "2026-11-08T00:00:00Z",
          },
        },
      });

      useConfiguracionPlataformaStore.setState({
        sidebarColapsado: false,
        modulosExpandidos: { geovisor: true, actores: true, fuentes: true },
      });

      const html = renderToString(<PlataformaSidebar />);

      // Geovisor: submódulos de Cartografía y resumen, Explorador y pivot SIEDCO, Gestor de capas GeoJSON
      expect(html).toContain("Cartografía y resumen");
      expect(html).toContain("Explorador y pivot SIEDCO");
      expect(html).toContain("Gestor de capas GeoJSON");

      // Actores: Directorio de actores y Matriz 2x2 Poder e Interés
      expect(html).toContain("Directorio de actores");
      expect(html).toContain("Matriz 2x2 Poder e Interés");

      // Fuentes: Monitoreo y catálogo, Fuentes radicadas
      expect(html).toContain("Monitoreo y catálogo");
      expect(html).toContain("Fuentes radicadas");
    });
  });
});
