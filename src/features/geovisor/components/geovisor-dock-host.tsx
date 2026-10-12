"use client";

import React, { useState } from "react";
import {
  ArrowRightLeft,
  EyeOff,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelTopDashed,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import {
  DOCK_PANEL_IDS,
  GEOVISOR_VIEW_IDS,
  findViewDock,
  useGeovisorLayoutStore,
  type DockPanelId,
  type GeovisorViewId,
} from "../state/geovisor-layout-store";
import { DOCK_LABELS, GEOVISOR_VIEW_META } from "./geovisor-view-registry";

const DRAG_MIME = "application/x-polis-geovisor-view";

export interface GeovisorDockHostProps {
  dock: DockPanelId;
  /** Renderiza el contenido de una vista (se monta al visitarla y se conserva oculta). */
  renderView: (viewId: GeovisorViewId) => React.ReactNode;
  className?: string;
}

/**
 * GeovisorDockHost — Contenedor con pestañas de un panel acoplado.
 * Cada panel (superior, izquierdo, derecho, inferior) aloja las vistas que el usuario
 * disponga: se pueden reordenar y mover entre paneles (arrastrando o desde el menú),
 * cerrar, reabrir y expandir el panel al máximo, al estilo de VS Code.
 */
export function GeovisorDockHost({ dock, renderView, className }: GeovisorDockHostProps) {
  const clientStore = useGeovisorLayoutStore();
  const isServer = typeof window === "undefined";
  const store = isServer ? useGeovisorLayoutStore.getState() : clientStore;
  const { tabs, activeTab, expandedDock, setActiveView, closeView, moveView, setPanelOpen, toggleDockExpanded } =
    store;

  const viewIds = tabs[dock];
  const active = activeTab[dock] ?? viewIds[0] ?? null;
  const isExpanded = expandedDock === dock;

  // Vistas visitadas: se mantienen montadas (ocultas) para conservar su estado local.
  const [visited, setVisited] = useState<ReadonlySet<GeovisorViewId>>(() => new Set());
  if (active && !visited.has(active)) {
    setVisited(new Set([...visited, active]));
  }

  const [dragOver, setDragOver] = useState(false);

  const closedViews = GEOVISOR_VIEW_IDS.filter((id) => findViewDock(tabs, id) === null);

  const readDragged = (e: React.DragEvent): GeovisorViewId | null => {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    return (GEOVISOR_VIEW_IDS as readonly string[]).includes(raw) ? (raw as GeovisorViewId) : null;
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const id = readDragged(e);
    if (id) moveView(id, dock, index);
  };

  const allowDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    }
  };

  return (
    <section
      role="region"
      aria-label={`Panel ${DOCK_LABELS[dock].toLowerCase()} del Geovisor`}
      data-testid={`geovisor-dock-host-${dock}`}
      data-dock-drop-active={dragOver ? "true" : undefined}
      onDragOver={allowDrop}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => handleDrop(e)}
      className={cn(
        "flex h-full w-full min-w-0 flex-col overflow-hidden bg-[var(--surface-1)] text-[var(--text-primary)]",
        dragOver && "ring-2 ring-inset ring-[var(--ember)]",
        className
      )}
    >
      <Tabs
        value={active ?? ""}
        onValueChange={(v) => setActiveView(dock, v as GeovisorViewId)}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        {/* BARRA DE PESTAÑAS */}
        <div className="flex shrink-0 items-center gap-1 border-b border-[var(--border)] bg-[var(--surface-2)]/60 px-1.5 pt-1">
          <TabsList
            aria-label={`Vistas del panel ${DOCK_LABELS[dock].toLowerCase()}`}
            className="h-8 min-w-0 flex-1 justify-start gap-0.5 overflow-x-auto rounded-none bg-transparent p-0"
          >
            {viewIds.map((id, index) => {
              const meta = GEOVISOR_VIEW_META[id];
              const Icon = meta.icon;
              const isActive = id === active;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={allowDrop}
                  onDrop={(e) => handleDrop(e, index)}
                  data-testid={`dock-tab-${id}`}
                  className={cn(
                    "group/tab inline-flex h-full shrink-0 items-center rounded-t-md border border-b-0 border-transparent",
                    isActive
                      ? "border-[var(--border)] bg-[var(--surface-1)] shadow-xs"
                      : "hover:bg-[var(--surface-1)]/60"
                  )}
                >
                  <TabsTrigger
                    value={id}
                    title={meta.description}
                    className="h-full flex-none gap-1.5 rounded-none border-0 bg-transparent px-2 text-xs font-medium shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    <Icon className={cn("size-3.5", meta.tone)} aria-hidden="true" />
                    <span>{meta.title}</span>
                  </TabsTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => closeView(id)}
                    aria-label={`Cerrar vista ${meta.title}`}
                    title={`Cerrar ${meta.title}`}
                    className="mr-0.5 size-5 rounded text-[var(--text-tertiary)] opacity-60 hover:opacity-100 group-hover/tab:opacity-100"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
          </TabsList>

          {/* ACCIONES DEL PANEL */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleDockExpanded(dock)}
            aria-label={isExpanded ? "Restaurar tamaño del panel" : "Expandir panel al máximo"}
            aria-pressed={isExpanded}
            title={isExpanded ? "Restaurar tamaño del panel" : "Expandir panel al máximo"}
            data-testid={`dock-expand-${dock}`}
            className="size-6 shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {isExpanded ? (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden="true" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Opciones del panel ${DOCK_LABELS[dock].toLowerCase()}`}
                title="Opciones del panel"
                data-testid={`dock-menu-${dock}`}
                className="size-6 shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <MoreHorizontal className="size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {active && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
                    <ArrowRightLeft className="size-3" aria-hidden="true" />
                    Mover «{GEOVISOR_VIEW_META[active].title}» a
                  </DropdownMenuLabel>
                  {DOCK_PANEL_IDS.filter((d) => d !== dock).map((d) => (
                    <DropdownMenuItem key={d} onSelect={() => moveView(active, d)}>
                      Panel {DOCK_LABELS[d].toLowerCase()}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
                <Plus className="size-3" aria-hidden="true" />
                Añadir vista aquí
              </DropdownMenuLabel>
              {GEOVISOR_VIEW_IDS.filter((id) => !viewIds.includes(id)).map((id) => {
                const meta = GEOVISOR_VIEW_META[id];
                const Icon = meta.icon;
                const where = findViewDock(tabs, id);
                return (
                  <DropdownMenuItem key={id} onSelect={() => moveView(id, dock)}>
                    <Icon className={cn("size-3.5", meta.tone)} aria-hidden="true" />
                    <span>{meta.title}</span>
                    {where && (
                      <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                        {DOCK_LABELS[where]}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              {GEOVISOR_VIEW_IDS.filter((id) => !viewIds.includes(id)).length === 0 && (
                <DropdownMenuItem disabled>Todas las vistas están en este panel</DropdownMenuItem>
              )}
              {closedViews.length > 0 && (
                <p className="px-2 pb-1 text-[10px] text-[var(--text-tertiary)]">
                  {closedViews.length} vista(s) cerrada(s) se reabren con «Añadir vista aquí».
                </p>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPanelOpen(dock, false)}>
                <EyeOff className="size-3.5" aria-hidden="true" />
                Ocultar panel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* CONTENIDO */}
        {viewIds.length === 0 ? (
          <div
            data-testid={`dock-empty-${dock}`}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs text-[var(--text-tertiary)]"
          >
            <PanelTopDashed className="size-6 stroke-1" aria-hidden="true" />
            <p className="max-w-[16rem] leading-relaxed">
              Panel {DOCK_LABELS[dock].toLowerCase()} vacío. Arrastra una pestaña hasta aquí o
              añade una vista.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => moveView(closedViews[0] ?? GEOVISOR_VIEW_IDS[0], dock)}
            >
              <Plus className="size-3" aria-hidden="true" />
              Añadir vista
            </Button>
          </div>
        ) : (
          viewIds
            .filter((id) => visited.has(id) || id === active)
            .map((id) => (
              <TabsContent
                key={id}
                value={id}
                forceMount
                hidden={id !== active}
                data-testid={`dock-view-${id}`}
                className="m-0 min-h-0 flex-1 overflow-auto outline-none data-[state=inactive]:hidden"
              >
                {renderView(id)}
              </TabsContent>
            ))
        )}
      </Tabs>
    </section>
  );
}
