"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSesionStore, esInstitucional, tienePermiso } from "@/features/sesion/state/session-store";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { usePanels, type PanelType, type PanelPropsMap } from "@/core/panels/panel-store";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import {
  Building2,
  Users,
  MessagesSquare,
  PenTool,
  Map,
  Landmark,
  LineChart,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  EyeOff,
  FileSpreadsheet,
  PlusCircle,
  BarChart3,
  CalendarCheck2,
  Quote,
  Compass,
  Database,
  Layers,
} from "lucide-react";
import {useIsMobile} from "@/shared/hooks/use-mobile";
import {Button} from "@/shared/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/shared/ui/tooltip";

const ROL_LABELS: Record<string, string> = {
  autoridad_distrital: "Autoridad Distrital",
  facilitador_mesa: "Facilitador de Mesa",
  auditor_forense: "Auditor Forense",
  administrador_identidades: "Administrador de identidades",
};

type ModoSidebar = "expandido" | "iconos" | "oculto";

export interface SubModuloItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export interface ModuloItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  submodulos?: SubModuloItem[];
}

export const PERMISOS_MODULO: Record<string, string[]> = {
  usuarios: ["usuarios:leer"],
  motor_politicas: ["aportes:priorizar", "auditoria:leer", "politicas:gestionar"],
  forms: ["formularios:leer", "formularios:gestionar"],
  mesas_trabajo: ["mesas:abrir", "mesas:acuerdos"],
  asistencia: ["asistencia:verificar"],
  testimonios: ["testimonios:moderar", "aportes:priorizar"],
  geodatos: ["mesas:abrir", "auditoria:leer"],
  diagnostico: ["indicadores:gestionar", "auditoria:leer"],
  fuentes: ["fuentes:leer", "fuentes:gestionar", "auditoria:leer"],
  actores: ["auditoria:leer", "aportes:priorizar"],
  presupuesto: ["presupuesto:gestionar", "alternativas:gestionar"],
  indicadores: ["indicadores:gestionar", "auditoria:leer"],
  plataforma: ["usuarios:leer", "auditoria:leer", "politicas:gestionar"],
  auditoria: ["auditoria:leer", "identidad:auditar"],
};

export interface ParametrosConstruccionModulos {
  navigateTo: (viewName: "inicio" | "explorar" | "mesas" | "geovisor") => void;
  navigateToPlataforma: (path?: string) => void;
  openPanel: <T extends PanelType>(type: T, props: PanelPropsMap[T]) => void;
}

export function construirModulosInstitucionales({
  navigateTo,
  navigateToPlataforma,
  openPanel,
}: ParametrosConstruccionModulos): ModuloItem[] {
  return [
    {
      id: "usuarios",
      label: "Usuarios y permisos",
      icon: Users,
      onClick: () => navigateToPlataforma("usuarios"),
    },
    {
      id: "motor_politicas",
      label: "Políticas Públicas",
      icon: Building2,
      submodulos: [
        {
          id: "politicas_explorar",
          label: "Explorar Políticas",
          icon: Building2,
          onClick: () => navigateTo("explorar"),
        },
        {
          id: "politicas_fases",
          label: "Control de Fases DNP",
          icon: Building2,
          onClick: () => openPanel("fases-control", {}),
        },
      ],
    },
    {
      id: "forms",
      label: "Formularios y Consultas",
      icon: FileSpreadsheet,
      submodulos: [
        {
          id: "forms_creados",
          label: "Formularios Activos",
          icon: FileSpreadsheet,
          onClick: () => openPanel("formularios", {}),
        },
        {
          id: "forms_builder",
          label: "Constructor FormBuilder",
          icon: PlusCircle,
          onClick: () => openPanel("formulario-editor", {}),
        },
        {
          id: "forms_analitica",
          label: "Analítica y Métricas",
          icon: BarChart3,
          onClick: () => {
            const forms = useFormulariosStore.getState().formularios;
            if (forms && forms.length > 0) {
              openPanel("formulario-analitica", { formularioId: forms[0].id });
            } else {
              openPanel("formularios", {});
            }
          },
        },
      ],
    },
    {
      id: "mesas_trabajo",
      label: "Mesas de Trabajo",
      icon: MessagesSquare,
      submodulos: [
        {
          id: "mesas_registro",
          label: "Registro de Mesas",
          icon: MessagesSquare,
          onClick: () => navigateTo("mesas"),
        },
        {
          id: "mesas_papelografo",
          label: "Papelógrafo MGA",
          icon: PenTool,
          onClick: () => {
            navigateTo("mesas");
            const mesas = useMesasStore.getState().mesas;
            const mesaConSub = mesas.find((m) => m.submesas && m.submesas.length > 0) ?? mesas[0];
            if (mesaConSub && mesaConSub.submesas && mesaConSub.submesas.length > 0) {
              openPanel("papelografo", {
                mesaId: mesaConSub.id,
                submesaId: mesaConSub.submesas[0].id,
                arbol: "problemas",
              });
            } else if (mesaConSub) {
              openPanel("mesa", { mesaId: mesaConSub.id });
            }
          },
        },
        {
          id: "mesas_actas",
          label: "Actas Inmutables (C-150)",
          icon: ShieldCheck,
          onClick: () => {
            const mesas = useMesasStore.getState().mesas;
            const mesaValida = mesas.find((m) => Boolean(m.sha256Acta)) ?? mesas[0];
            if (mesaValida) {
              openPanel("mesa-acta", { mesaId: mesaValida.id });
            } else {
              navigateTo("mesas");
            }
          },
        },
      ],
    },
    {
      id: "asistencia",
      label: "Asistencia y Participación",
      icon: Users,
      submodulos: [
        {
          id: "asistencia_consolidado",
          label: "Tablero Distrital",
          icon: Users,
          onClick: () => openPanel("participacion-multicanal", { canalInicial: "consolidado" }),
        },
        {
          id: "asistencia_web",
          label: "Canal Web (por Línea)",
          icon: BarChart3,
          onClick: () => openPanel("participacion-multicanal", { canalInicial: "web" }),
        },
        {
          id: "asistencia_mesas",
          label: "Canal Mesas (Submesas)",
          icon: MessagesSquare,
          onClick: () => openPanel("participacion-multicanal", { canalInicial: "mesas" }),
        },
        {
          id: "asistencia_escenarios",
          label: "Escenarios Especiales",
          icon: CalendarCheck2,
          onClick: () => openPanel("participacion-multicanal", { canalInicial: "escenarios" }),
        },
      ],
    },
    {
      id: "testimonios",
      label: "Testimonios y Memoria",
      icon: Quote,
      submodulos: [
        {
          id: "testimonios_galeria",
          label: "Galería de Relatos",
          icon: Quote,
          onClick: () => openPanel("testimonios-galeria", {}),
        },
        {
          id: "testimonios_curaduria",
          label: "Curaduría y Moderación",
          icon: ShieldCheck,
          onClick: () => openPanel("testimonios-moderacion", {}),
        },
        {
          id: "testimonios_nuevo",
          label: "Registrar Relato",
          icon: PlusCircle,
          onClick: () => openPanel("testimonio-editor", {}),
        },
      ],
    },
    {
      id: "geodatos",
      label: "Geovisor Territorial",
      icon: Map,
      onClick: () => navigateTo("geovisor"),
    },
    {
      id: "diagnostico",
      label: "Diagnóstico y Línea Base",
      icon: Compass,
      onClick: () => navigateToPlataforma("diagnostico"),
    },
    {
      id: "fuentes",
      label: "Fuentes de Información",
      icon: Database,
      onClick: () => navigateToPlataforma("fuentes"),
    },
    {
      id: "actores",
      label: "Mapeo de Actores",
      icon: Users,
      onClick: () => navigateToPlataforma("actores"),
    },
    {
      id: "presupuesto",
      label: "Presupuesto FONSET",
      icon: Landmark,
      onClick: () => openPanel("asignacion-presupuestal", {}),
    },
    {
      id: "indicadores",
      label: "Indicadores DNP",
      icon: LineChart,
      onClick: () => openPanel("rendicion-cuentas", {}),
    },
    {
      id: "plataforma",
      label: "Plataforma Administrativa",
      icon: Layers,
      onClick: () => navigateToPlataforma(),
    },
    {
      id: "auditoria",
      label: "Auditoría y Control",
      icon: ShieldCheck,
      onClick: () => openPanel("auditoria-consola", {}),
    },
  ];
}

export function SidebarInstitucional() {
  const esMovil = useIsMobile();
  const sesion = useSesionStore((s) => s.sesion);
  const cerrarSesion = useSesionStore((s) => s.cerrarSesion);
    const setVista = useNavigationStore((s) => s.setVista);
  const { openPanel } = usePanels();
  const router = useRouter();

  // Estados de control del Sidebar
  const [modo, setModo] = useState<ModoSidebar>("expandido");
  const modoVisible: ModoSidebar = esMovil ? "oculto" : modo;
  const [ancho, setAncho] = useState<number>(280);
  const [submodulosAbiertos, setSubmodulosAbiertos] = useState<Record<string, boolean>>({
    mesas_trabajo: true,
    asistencia: false,
    forms: false,
  });

  const isResizingRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Redimensionamiento con mouse (Drag-to-Resize)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const nuevoAncho = Math.min(Math.max(moveEvent.clientX, 220), 480);
      setAncho(nuevoAncho);
      if (modo !== "expandido") setModo("expandido");
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [modo]);

  const toggleSubmodulo = (moduloId: string) => {
    setSubmodulosAbiertos((prev) => ({
      ...prev,
      [moduloId]: !prev[moduloId],
    }));
  };

  const navigateTo = (viewName: "inicio" | "explorar" | "mesas" | "geovisor") => {
    setVista(viewName);
  };

  const navigateToPlataforma = (path = "") => {
    router.push(`/plataforma${path ? `/${path}` : ""}`);
  };

  if (!esInstitucional(sesion)) return null;

  const rolLabel = (sesion?.rol && ROL_LABELS[sesion.rol]) || "Funcionario";

  const permisosModulo = PERMISOS_MODULO;
  const modulos = construirModulosInstitucionales({
    navigateTo,
    navigateToPlataforma,
    openPanel,
  });

  // Si está completamente oculto, renderizar el botón chevron flotante en la esquina inferior izquierda
  if (modoVisible === "oculto") {
    return (
      <TooltipProvider>
        <div className="fixed bottom-4 left-4 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                onClick={() => esMovil ? openPanel("sesion", {}) : setModo("expandido")}
                className="h-10 w-10 rounded-full shadow-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-transform hover:scale-105"
                aria-label={esMovil ? "Abrir cuenta y administración" : "Abrir menú institucional"}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs font-medium">Cuenta y menú institucional</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Ancho efectivo según el modo
  const anchoEfectivo = modo === "iconos" ? 56 : ancho;

  return (
    <TooltipProvider>
      <aside
        ref={sidebarRef}
        style={{ width: `${anchoEfectivo}px` }}
        className="relative z-30 flex h-screen flex-col border-r border-[var(--border)] bg-[var(--background)] transition-[width] duration-150 ease-out select-none shrink-0"
      >
        {/* Cabecera del Sidebar */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ember)] text-[var(--text-inverse)]">
              <Building2 className="h-4 w-4" />
            </div>
            {modo === "expandido" && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">POLIS</span>
                <span className="text-[10px] text-[var(--text-secondary)] truncate">{rolLabel}</span>
              </div>
            )}
          </div>

          {/* Botones de control de modo */}
          <div className="flex items-center gap-1">
            {modo === "expandido" ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setModo("iconos")}
                      aria-label="Contraer menú institucional"
                      className="h-7 w-7 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Colapsar a solo iconos</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setModo("oculto")}
                      aria-label="Ocultar menú institucional"
                      className="h-7 w-7 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Ocultar completamente</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setModo("expandido")}
                    aria-label="Expandir menú institucional"
                    className="h-7 w-7 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">Expandir barra lateral</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Contenido / Módulos de Navegación */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {modulos.filter((m) => permisosModulo[m.id]?.some((p) => tienePermiso(sesion, p))).map((modulo) => {
            const hasSub = modulo.submodulos && modulo.submodulos.length > 0;
            const isOpen = submodulosAbiertos[modulo.id] || false;
            const ModuloIcon = modulo.icon;

            // Modo Solo Iconos
            if (modo === "iconos") {
              return (
                <Tooltip key={modulo.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="unstyled"
                      type="button"
                      aria-label={modulo.label}
                      onClick={modulo.onClick || (() => toggleSubmodulo(modulo.id))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors mx-auto"
                    >
                      <ModuloIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="space-y-1">
                    <p className="text-xs font-semibold">{modulo.label}</p>
                    {hasSub && (
                      <div className="text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border)]">
                        {modulo.submodulos?.map((s) => (
                          <div key={s.id} className="py-0.5">• {s.label}</div>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            // Modo Expandido con Acordeón de Submódulos
            return (
              <div key={modulo.id} className="space-y-0.5">
                <Button
                  variant="unstyled"
                  type="button"
                  onClick={hasSub ? () => toggleSubmodulo(modulo.id) : modulo.onClick}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ModuloIcon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                    <span className="truncate">{modulo.label}</span>
                  </div>
                  {hasSub && (
                    <div className="shrink-0 text-[var(--text-tertiary)]">
                      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </div>
                  )}
                </Button>

                {hasSub && isOpen && (
                  <div className="ml-5 pl-2.5 border-l border-[var(--border)] space-y-0.5 pt-0.5">
                    {modulo.submodulos?.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Button
                          variant="unstyled"
                          key={sub.id}
                          type="button"
                          onClick={sub.onClick}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors text-left"
                        >
                          {SubIcon && <SubIcon className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{sub.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie del Sidebar: Usuario y Cierre */}
        <div className="border-t border-[var(--border)] p-2">
          {modo === "expandido" ? (
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)] transition-colors">
              <div className="flex flex-col truncate pr-2">
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {sesion?.identidad?.nombre || "Funcionario"}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] truncate">{rolLabel}</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cerrar sesión institucional"
                    onClick={() => {
                      void cerrarSesion().then(() => navigateTo("inicio")).catch((error: unknown) =>
                        toast.error(error instanceof Error ? error.message : "No se pudo cerrar la sesión"));
                    }}
                    className="h-7 w-7 text-[var(--danger)] hover:bg-[var(--surface-3)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Cerrar sesión institucional</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="unstyled"
                  type="button"
                  aria-label="Cerrar sesión institucional"
                  onClick={() => {
                    void cerrarSesion().then(() => navigateTo("inicio")).catch((error: unknown) =>
                      toast.error(error instanceof Error ? error.message : "No se pudo cerrar la sesión"));
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[var(--surface-2)] mx-auto"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">Cerrar sesión</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Borde Resizable (Drag to Resize) */}
        {modo === "expandido" && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-[var(--ember)] transition-colors z-40"
            title="Arrastra para cambiar el ancho del menú"
          />
        )}
      </aside>
    </TooltipProvider>
  );
}
