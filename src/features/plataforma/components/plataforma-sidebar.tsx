"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ClipboardList,
  Map,
  Users2,
  Users,
  FileText,
  Newspaper,
  MessageCircle,
  Database,
  BarChart3,
  Workflow,
  CheckSquare,
  Settings,
  ArrowLeft,
  Menu,
  Radio,
  KanbanSquare,
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  PlusCircle,
  BarChart,
  Compass,
  Clock,
  Calendar,
  FileCheck,
  Edit3,
  UserPlus,
  ShieldAlert,
  Layers,
  Sliders,
  MessageSquare,
  Image,
  Network,
  UserCheck,
  GitFork,
  FolderGit2,
  DollarSign,
  CreditCard,
  Target,
  BookOpen,
  ListChecks,
  Link2,
  Award,
  LayoutGrid,
  Table,
  CalendarDays,
  Activity,
  CircleDot,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { IsotipoPolis } from "@/shared/branding/logo-polis";
import { useSesionStore } from "@/features/sesion/state/session-store";
import {
  useConfiguracionPlataformaStore,
  SIDEBAR_ANCHO_MIN,
  SIDEBAR_ANCHO_MAX,
} from "../state/configuracion-store";
import {
  SECCIONES_SIDEBAR,
  modulosPermitidos,
  submodulosPermitidos,
  type ModuloPlataforma,
  type SubmoduloPlataforma,
} from "../models/acceso";
import { abrirPanelSeguro } from "../services/panel-dispatcher";
import { useCollectionPreferences } from "@/core/preferences/collection-view-store";

export const ICONOS = {
  dashboard: Home,
  proyectos: KanbanSquare,
  formularios: ClipboardList,
  geovisor: Map,
  mesas: Users2,
  usuarios: Users,
  contenido: FileText,
  noticias: Newspaper,
  comunicaciones: Radio,
  testimonios: MessageCircle,
  fuentes: Database,
  actores: Users,
  diagnostico: BarChart3,
  alternativas: Workflow,
  seguimiento: CheckSquare,
  configuracion: Settings,
} satisfies Record<ModuloPlataforma, typeof Home>;

const SUBMODULO_ICONOS: Record<string, typeof Home> = {
  BarChart3,
  TrendingUp,
  MapPin,
  CheckCircle2,
  ClipboardList,
  PlusCircle,
  BarChart,
  Map,
  Compass,
  Users2,
  Clock,
  Calendar,
  FileCheck,
  Edit3,
  FileText,
  Users,
  UserPlus,
  ShieldAlert,
  Layers,
  Workflow,
  Sliders,
  Newspaper,
  MessageSquare,
  Image,
  Database,
  Network,
  UserCheck,
  GitFork,
  FolderGit2,
  DollarSign,
  CreditCard,
  Target,
  CheckSquare,
  BookOpen,
  ListChecks,
  Link2,
  Award,
  LayoutGrid,
  Table,
  CalendarDays,
  Radio,
  Activity,
  CircleDot,
};

export function PlataformaSidebar() {
  const router = useRouter();
  const ruta = usePathname();
  const [esDesktop, setEsDesktop] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const actualizar = () => setEsDesktop(mq.matches);
    actualizar();
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);

  const clientSesion = useSesionStore((s) => s.sesion);
  const sesion =
    typeof window === "undefined"
      ? useSesionStore.getState().sesion
      : clientSesion;

  const clientSidebarColapsado = useConfiguracionPlataformaStore(
    (s) => s.sidebarColapsado
  );
  const sidebarColapsado =
    typeof window === "undefined"
      ? useConfiguracionPlataformaStore.getState().sidebarColapsado
      : clientSidebarColapsado;

  const clientSidebarAncho = useConfiguracionPlataformaStore(
    (s) => s.sidebarAncho
  );
  const sidebarAncho =
    typeof window === "undefined"
      ? useConfiguracionPlataformaStore.getState().sidebarAncho
      : clientSidebarAncho;

  const clientModulosExpandidos = useConfiguracionPlataformaStore(
    (s) => s.modulosExpandidos
  );
  const modulosExpandidos =
    typeof window === "undefined"
      ? useConfiguracionPlataformaStore.getState().modulosExpandidos
      : clientModulosExpandidos;

  const clientSubvistaPlataforma = useConfiguracionPlataformaStore(
    (s) => s.subvistaPlataforma
  );
  const subvistaPlataforma =
    typeof window === "undefined"
      ? useConfiguracionPlataformaStore.getState().subvistaPlataforma
      : clientSubvistaPlataforma;

  const clientVistasColeccion = useCollectionPreferences((s) => s.views);
  const vistasColeccion =
    typeof window === "undefined"
      ? useCollectionPreferences.getState().views
      : clientVistasColeccion;

  const toggleSidebarColapsado = useConfiguracionPlataformaStore(
    (s) => s.toggleSidebarColapsado
  );
  const setSidebarColapsado = useConfiguracionPlataformaStore(
    (s) => s.setSidebarColapsado
  );
  const setSidebarAncho = useConfiguracionPlataformaStore(
    (s) => s.setSidebarAncho
  );
  const resetSidebarAncho = useConfiguracionPlataformaStore(
    (s) => s.resetSidebarAncho
  );
  const toggleModuloExpandido = useConfiguracionPlataformaStore(
    (s) => s.toggleModuloExpandido
  );
  const setSubvistaModulo = useConfiguracionPlataformaStore(
    (s) => s.setSubvistaModulo
  );
  const setPanelPendiente = useConfiguracionPlataformaStore(
    (s) => s.setPanelPendiente
  );

  // Lista de módulos permitidos para la sesión actual
  const permitidos = useMemo(() => modulosPermitidos(sesion), [sesion]);

  // Función para determinar si una ruta está activa
  const esRutaActiva = useCallback(
    (mRuta: string) => {
      if (mRuta === "/plataforma") {
        return ruta === "/plataforma";
      }
      return ruta === mRuta || ruta.startsWith(`${mRuta}/`);
    },
    [ruta]
  );

  // Determinar si un submódulo está visualmente activo
  const calcularSubmoduloActivo = useCallback(
    (sub: SubmoduloPlataforma, rutaModulo: string) => {
      if (!esRutaActiva(rutaModulo)) return false;

      switch (sub.accion.tipo) {
        case "subvista": {
          const subvistaGuardada = subvistaPlataforma[sub.accion.moduloId];
          if (subvistaGuardada) {
            return subvistaGuardada === sub.accion.valor;
          }
          // Valores por defecto
          if (sub.accion.moduloId === "dashboard" && sub.accion.valor === "resumen_ejecutivo")
            return true;
          if (sub.accion.moduloId === "seguimiento" && sub.accion.valor === "triada_motores")
            return true;
          if (sub.accion.moduloId === "diagnostico" && sub.accion.valor === "linea_base")
            return true;
          if (sub.accion.moduloId === "alternativas" && sub.accion.valor === "banco_mga")
            return true;
          if (sub.accion.moduloId === "contenido" && sub.accion.valor === "arquitectura")
            return true;
          if (sub.accion.moduloId === "mesas" && sub.accion.valor === "TODAS")
            return true;
          if (sub.accion.moduloId === "usuarios" && sub.accion.valor === "directorio")
            return true;
          if (sub.accion.moduloId === "noticias" && sub.accion.valor === "boletines")
            return true;
          if (sub.accion.moduloId === "testimonios" && sub.accion.valor === "moderacion")
            return true;
          if (sub.accion.moduloId === "fuentes" && sub.accion.valor === "monitoreo")
            return true;
          if (sub.accion.moduloId === "actores" && sub.accion.valor === "mapa")
            return true;
          if (sub.accion.moduloId === "geovisor" && sub.accion.valor === "mapa")
            return true;
          return false;
        }
        case "coleccion": {
          const vistaActual = vistasColeccion[sub.accion.scope] ?? "lista";
          const vistaEsperada = sub.accion.vista === "cards" ? "tarjetas" : "lista";
          return vistaActual === vistaEsperada;
        }
        default:
          return false;
      }
    },
    [esRutaActiva, subvistaPlataforma, vistasColeccion]
  );

  // Ejecución segura de la acción del submódulo
  const ejecutarAccionSubmodulo = useCallback(
    (sub: SubmoduloPlataforma, rutaModulo: string) => {
      setAbierto(false);

      switch (sub.accion.tipo) {
        case "subvista": {
          setSubvistaModulo(sub.accion.moduloId, sub.accion.valor);
          if (ruta !== rutaModulo) {
            router.push(rutaModulo);
          }
          break;
        }
        case "coleccion": {
          const modoColeccion = sub.accion.vista === "cards" ? "tarjetas" : "lista";
          useCollectionPreferences.getState().setView(sub.accion.scope, modoColeccion);
          if (ruta !== rutaModulo) {
            router.push(rutaModulo);
          }
          break;
        }
        case "ancla": {
          if (ruta !== rutaModulo) {
            router.push(`${rutaModulo}${sub.accion.hash}`);
          } else {
            const elem = document.querySelector(sub.accion.hash);
            elem?.scrollIntoView({ behavior: "smooth" });
          }
          break;
        }
        case "panel": {
          if (ruta !== rutaModulo) {
            setPanelPendiente({ id: sub.accion.panelId });
            router.push(rutaModulo);
          } else {
            abrirPanelSeguro(sub.accion.panelId);
          }
          break;
        }
      }
    },
    [ruta, router, setSubvistaModulo, setPanelPendiente]
  );

  // Redimensionamiento con arrastre de mouse/touch
  const iniciarArrastre = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      setArrastrando(true);

      const handlePointerMove = (ev: PointerEvent) => {
        const nuevoAncho = ev.clientX;
        const colapsadoActual =
          useConfiguracionPlataformaStore.getState().sidebarColapsado;
        if (nuevoAncho < 140) {
          if (!colapsadoActual) {
            setSidebarColapsado(true);
          }
        } else {
          if (colapsadoActual && nuevoAncho >= 180) {
            setSidebarColapsado(false);
          }
          if (!colapsadoActual || nuevoAncho >= 180) {
            setSidebarAncho(nuevoAncho);
          }
        }
      };

      const handlePointerUp = () => {
        setArrastrando(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [setSidebarColapsado, setSidebarAncho]
  );

  const manejarDobleClic = useCallback(() => {
    resetSidebarAncho();
  }, [resetSidebarAncho]);

  const manejarTecladoSeparador = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (sidebarAncho - 16 < SIDEBAR_ANCHO_MIN) {
          setSidebarColapsado(true);
        } else {
          setSidebarAncho(sidebarAncho - 16);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (sidebarColapsado) {
          setSidebarColapsado(false);
          setSidebarAncho(SIDEBAR_ANCHO_MIN);
        } else {
          setSidebarAncho(sidebarAncho + 16);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        setSidebarColapsado(false);
        setSidebarAncho(SIDEBAR_ANCHO_MIN);
      } else if (e.key === "End") {
        e.preventDefault();
        setSidebarColapsado(false);
        setSidebarAncho(SIDEBAR_ANCHO_MAX);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSidebarColapsado();
      }
    },
    [sidebarAncho, sidebarColapsado, setSidebarAncho, setSidebarColapsado, toggleSidebarColapsado]
  );

  // Filtrado por buscador
  const terminoBusqueda = busqueda.trim().toLowerCase();

  return (
    <aside
      style={
        esDesktop && !sidebarColapsado
          ? { width: `${sidebarAncho}px` }
          : undefined
      }
      className={`shrink-0 border-b border-[var(--border)] bg-[var(--surface-1)] ${
        arrastrando ? "" : "transition-all duration-200 ease-in-out"
      } lg:sticky lg:top-0 lg:h-screen lg:overflow-visible lg:border-b-0 lg:border-r relative flex flex-col ${
        sidebarColapsado ? "lg:w-16" : "lg:w-64"
      }`}
    >
      {/* Tirador Resizable en borde derecho (visible en desktop) */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Ajustar ancho de la barra lateral"
        aria-valuenow={sidebarColapsado ? 64 : sidebarAncho}
        aria-valuemin={SIDEBAR_ANCHO_MIN}
        aria-valuemax={SIDEBAR_ANCHO_MAX}
        onPointerDown={iniciarArrastre}
        onDoubleClick={manejarDobleClic}
        onKeyDown={manejarTecladoSeparador}
        className={`hidden lg:flex absolute top-0 right-0 w-1.5 h-full cursor-col-resize select-none hover:bg-[var(--brand-polis-cyan)]/50 focus:bg-[var(--brand-polis-blue)] transition-colors z-20 ${
          arrastrando ? "bg-[var(--brand-polis-blue)] w-2" : "bg-transparent"
        }`}
        title="Arrastra para ajustar el ancho (doble clic para restaurar 272px)"
      />

      {/* Cabecera del Sidebar */}
      <div
        className={`flex items-center ${
          sidebarColapsado ? "lg:justify-center p-3" : "justify-between p-4"
        } gap-2 border-b border-[var(--border)] relative`}
      >
        <Link
          href="/plataforma"
          className="flex items-center gap-2.5 min-w-0 group"
          aria-label="POLIS Gestión interna - Inicio"
          title="POLIS Gestión interna"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1 shadow-2xs group-hover:border-[var(--brand-polis-cyan)] transition-colors">
            <IsotipoPolis className="size-full" />
          </div>
          <div
            className={`min-w-0 flex flex-col leading-tight ${
              sidebarColapsado ? "lg:hidden" : ""
            }`}
          >
            <span className="text-xs font-extrabold tracking-tight text-[var(--text-primary)]">
              POLIS{" "}
              <span className="font-semibold text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]">
                · Gestión
              </span>
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] truncate">
              Área de Trabajo Técnica
            </span>
          </div>
        </Link>

        {/* Botón circular Figma en el borde derecho superior para colapsar/expandir en desktop */}
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={toggleSidebarColapsado}
          aria-label={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}
          title={sidebarColapsado ? "Expandir barra lateral" : "Reducir barra lateral a iconos"}
          className="hidden lg:inline-flex absolute -right-3 top-5 z-30 size-6 p-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] shadow-xs hover:bg-[var(--brand-polis-blue)] hover:text-[var(--text-inverse)] hover:border-[var(--brand-polis-blue)] transition-all cursor-pointer"
        >
          {sidebarColapsado ? (
            <ChevronRight className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Mostrar navegación interna"
          aria-expanded={abierto}
          aria-controls="navegacion-interna"
          onClick={() => setAbierto(!abierto)}
        >
          <Menu aria-hidden="true" />
        </Button>
      </div>

      {/* Buscador de módulos y submódulos (modo expandido) */}
      {!sidebarColapsado && (
        <div className="px-3 pt-3 pb-1 border-b border-[var(--border)]/50">
          <div className="relative flex items-center">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 size-3.5 text-[var(--text-tertiary)] pointer-events-none"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar módulo o submódulo..."
              aria-label="Buscar módulo o submódulo"
              className="h-8 pl-8 pr-7 text-xs bg-[var(--surface-2)] border-[var(--border)] rounded-lg focus:border-[var(--brand-polis-cyan)] w-full"
            />
            {busqueda && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setBusqueda("")}
                className="absolute right-1 size-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Limpiar búsqueda"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Árbol Jerárquico de Módulos y Submódulos agrupados por Sección */}
      <nav
        id="navegacion-interna"
        aria-label="Navegación de plataforma"
        className={`${abierto ? "block" : "hidden"} flex-1 space-y-4 p-2 lg:block overflow-y-auto`}
      >
        {SECCIONES_SIDEBAR.map((seccion) => {
          // Filtrar módulos pertenecientes a esta sección
          const modulosDeSeccion = permitidos.filter(
            (m) => m.seccion === seccion.id
          );

          if (modulosDeSeccion.length === 0) return null;

          // Filtrar por término de búsqueda si existe
          const modulosFiltrados = modulosDeSeccion.filter((m) => {
            if (!terminoBusqueda) return true;
            const coincideModulo =
              m.titulo.toLowerCase().includes(terminoBusqueda) ||
              m.descripcion.toLowerCase().includes(terminoBusqueda);
            const subs = submodulosPermitidos(sesion, m);
            const coincideSub = subs.some(
              (s) =>
                s.etiqueta.toLowerCase().includes(terminoBusqueda) ||
                (s.descripcion && s.descripcion.toLowerCase().includes(terminoBusqueda))
            );
            return coincideModulo || coincideSub;
          });

          if (modulosFiltrados.length === 0) return null;

          return (
            <div key={seccion.id} className="space-y-1">
              {/* Título de sección (solo modo expandido) */}
              {!sidebarColapsado && (
                <div className="px-3 pt-1 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {seccion.titulo}
                  </span>
                </div>
              )}

              {/* Lista de módulos */}
              <div className="space-y-1">
                {modulosFiltrados.map((m) => {
                  const Icono = ICONOS[m.id];
                  const activo = esRutaActiva(m.ruta);
                  const submodulos = submodulosPermitidos(sesion, m);
                  const tieneSubmodulos = submodulos.length > 0;

                  // Estado expandido: activo por ruta, por término de búsqueda o por store
                  const forzadoExpandido =
                    !!terminoBusqueda || (activo && modulosExpandidos[m.id] !== false);
                  const estaExpandido = forzadoExpandido || !!modulosExpandidos[m.id];

                  // Si está colapsado a solo iconos
                  if (sidebarColapsado) {
                    return (
                      <Button
                        key={m.id}
                        asChild
                        variant="unstyled"
                        size="unstyled"
                        className={`relative flex items-center justify-center w-full rounded-lg py-2.5 text-xs font-medium transition-all duration-150 ease-out ${
                          activo
                            ? "bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] font-semibold ring-1 ring-inset ring-[var(--brand-polis-blue)]/20 dark:ring-[var(--brand-polis-sky)]/25 shadow-2xs before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[var(--brand-polis-blue)] dark:before:bg-[var(--brand-polis-sky)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--brand-polis-blue)] dark:hover:text-[var(--brand-polis-sky)] hover:bg-[var(--brand-polis-blue)]/[0.06] dark:hover:bg-[var(--surface-2)]"
                        }`}
                        title={`${m.titulo} · ${m.descripcion}`}
                      >
                        <Link
                          href={m.ruta}
                          aria-current={activo ? "page" : undefined}
                          aria-label={m.titulo}
                          onClick={() => setAbierto(false)}
                          className="flex items-center justify-center gap-2.5 min-w-0"
                        >
                          <Icono
                            aria-hidden="true"
                            className={`size-4 shrink-0 transition-colors ${
                              activo
                                ? "text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]"
                                : "text-[var(--text-tertiary)]"
                            }`}
                          />
                        </Link>
                      </Button>
                    );
                  }

                  // Modo expandido: renderiza módulo con acordeón de submódulos
                  return (
                    <div key={m.id} className="space-y-0.5">
                      <div
                        className={`group relative flex items-center justify-between rounded-lg py-1.5 px-2.5 text-xs font-medium transition-all duration-150 ease-out ${
                          activo
                            ? "bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] font-semibold shadow-2xs ring-1 ring-inset ring-[var(--brand-polis-blue)]/20 dark:ring-[var(--brand-polis-sky)]/25 before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-[var(--brand-polis-blue)] dark:before:bg-[var(--brand-polis-sky)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-polis-blue)]/[0.06] dark:hover:bg-[var(--surface-2)] hover:ring-1 hover:ring-inset hover:ring-[var(--border-strong)]/50"
                        }`}
                      >
                        {/* Enlace principal al módulo */}
                        <Link
                          href={m.ruta}
                          aria-current={activo ? "page" : undefined}
                          aria-label={m.titulo}
                          onClick={() => setAbierto(false)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 py-1"
                          title={m.descripcion}
                        >
                          <Icono
                            aria-hidden="true"
                            className={`size-4 shrink-0 transition-colors ${
                              activo
                                ? "text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]"
                                : "text-[var(--text-tertiary)] group-hover:text-[var(--brand-polis-blue)] dark:group-hover:text-[var(--brand-polis-sky)]"
                            }`}
                          />
                          <span className="truncate">{m.titulo}</span>
                        </Link>

                        {/* Botón acordeón para expandir/contraer submódulos */}
                        {tieneSubmodulos && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleModuloExpandido(m.id)}
                            aria-label={
                              estaExpandido
                                ? `Contraer submódulos de ${m.titulo}`
                                : `Expandir submódulos de ${m.titulo}`
                            }
                            className="size-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0"
                          >
                            {estaExpandido ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Rama de submódulos anidados */}
                      {tieneSubmodulos && estaExpandido && (
                        <div className="ml-4 pl-3 border-l border-[var(--border-strong)]/60 space-y-0.5 my-1 flex flex-col items-stretch">
                          {submodulos.map((sub) => {
                            const esSubActivo = calcularSubmoduloActivo(sub, m.ruta);
                            const SubIcono =
                              SUBMODULO_ICONOS[sub.icono] ?? CircleDot;

                            return (
                              <Button
                                key={sub.id}
                                variant="unstyled"
                                size="unstyled"
                                onClick={() => ejecutarAccionSubmodulo(sub, m.ruta)}
                                className={`group/sub relative flex items-center justify-start gap-2.5 w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ease-out ${
                                  esSubActivo
                                    ? "bg-[var(--brand-polis-blue)]/10 dark:bg-[var(--brand-polis-sky)]/15 text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)] font-semibold ring-1 ring-inset ring-[var(--brand-polis-blue)]/15 dark:ring-[var(--brand-polis-sky)]/20 shadow-2xs before:content-[''] before:absolute before:-left-[13px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[var(--brand-polis-blue)] dark:before:bg-[var(--brand-polis-sky)]"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-polis-blue)]/[0.06] dark:hover:bg-[var(--surface-2)]/80 before:content-[''] before:absolute before:-left-[13px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-transparent hover:before:bg-[var(--brand-polis-blue)]/50 dark:hover:before:bg-[var(--brand-polis-sky)]/50"
                                }`}
                                title={sub.descripcion ?? sub.etiqueta}
                              >
                                <SubIcono
                                  className={`size-3.5 shrink-0 transition-colors ${
                                    esSubActivo
                                      ? "text-[var(--brand-polis-blue)] dark:text-[var(--brand-polis-sky)]"
                                      : "text-[var(--text-tertiary)] group-hover/sub:text-[var(--brand-polis-blue)] dark:group-hover/sub:text-[var(--brand-polis-sky)]"
                                  }`}
                                />
                                <span className="truncate text-left">{sub.etiqueta}</span>
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Enlace de regreso al portal ciudadano */}
        <div className="border-t border-[var(--border)] pt-3 mt-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className={`w-full ${
              sidebarColapsado ? "lg:justify-center lg:px-0" : "justify-start"
            } text-xs border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
            title="Volver al portal ciudadano"
          >
            <Link href="/" aria-label="Volver al portal ciudadano">
              <ArrowLeft
                aria-hidden="true"
                className="size-3.5 text-[var(--ember)] shrink-0"
              />
              <span className={sidebarColapsado ? "lg:hidden" : ""}>
                Volver al portal ciudadano
              </span>
            </Link>
          </Button>
        </div>

        {/* Indicador de Notificaciones Oficiales Google Workspace */}
        {!sidebarColapsado && (
          <div className="hidden lg:block mt-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[10px] text-[var(--text-tertiary)] space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <span
                className="size-1.5 rounded-full bg-[var(--success)]"
                aria-hidden="true"
              />
              <span>Notificaciones oficiales</span>
            </div>
            <p className="leading-tight">
              Vinculadas a Google Workspace institucional para trazabilidad de
              mesas y compromisos.
            </p>
          </div>
        )}
      </nav>
    </aside>
  );
}
