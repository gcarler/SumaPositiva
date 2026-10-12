"use client";

import React from "react";
import { LayoutPanelLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import {
  GEOVISOR_VIEW_IDS,
  findViewDock,
  useGeovisorLayoutStore,
} from "../state/geovisor-layout-store";
import { DOCK_LABELS, GEOVISOR_VIEW_META } from "./geovisor-view-registry";
import { GeovisorDockControls } from "./geovisor-dock-controls";

/**
 * GeovisorWorkbenchBar — Barra permanente del espacio de trabajo.
 * Siempre visible (nunca se oculta con los paneles), de modo que el usuario puede
 * recuperar cualquier panel o vista aunque haya cerrado todo, como la barra de
 * título / menú Ver de VS Code.
 */
export function GeovisorWorkbenchBar({ className }: { className?: string }) {
  const clientStore = useGeovisorLayoutStore();
  const isServer = typeof window === "undefined";
  const { tabs, openView, closeView } = isServer ? useGeovisorLayoutStore.getState() : clientStore;

  return (
    <div
      data-testid="geovisor-workbench-bar"
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/70 px-2 py-1",
        className
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        <LayoutPanelLeft className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
        <span>Espacio de trabajo SIG</span>
      </div>

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="workbench-views-menu"
              className="h-7.5 gap-1.5 text-xs"
            >
              <LayoutPanelLeft className="size-3.5" aria-hidden="true" />
              Vistas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-[11px]">Mostrar u ocultar vistas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {GEOVISOR_VIEW_IDS.map((id) => {
              const meta = GEOVISOR_VIEW_META[id];
              const Icon = meta.icon;
              const dock = findViewDock(tabs, id);
              return (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={dock !== null}
                  onCheckedChange={(checked) => (checked ? openView(id) : closeView(id))}
                >
                  <Icon className={cn("size-3.5", meta.tone)} aria-hidden="true" />
                  <span>{meta.title}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                    {dock ? DOCK_LABELS[dock] : "Cerrada"}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <GeovisorDockControls />
      </div>
    </div>
  );
}
