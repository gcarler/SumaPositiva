"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, LayoutPanelLeft } from "lucide-react";
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
 * Siempre visible (nunca se oculta con los paneles), con botón de retorno al portal,
 * menú Ver de vistas, atribución de fuentes y conmutadores de los 4 paneles dock.
 */
export function GeovisorWorkbenchBar({ className }: { className?: string }) {
  const clientStore = useGeovisorLayoutStore();
  const isServer = typeof window === "undefined";
  const { tabs, openView, closeView } = isServer ? useGeovisorLayoutStore.getState() : clientStore;

  return (
    <div
      data-testid="geovisor-workbench-bar"
      className={cn(
        "flex h-9 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-2 text-xs",
        className
      )}
    >
      {/* Lado izquierdo: Botón «Volver al inicio» + Título SIG */}
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Link href="/" aria-label="Volver al inicio" data-testid="geovisor-btn-volver-inicio">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <Home className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Volver al inicio</span>
          </Link>
        </Button>

        <div className="h-4 w-px bg-[var(--border)]" aria-hidden="true" />

        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          <LayoutPanelLeft className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
          <span className="hidden md:inline">Espacio de trabajo SIG</span>
        </div>
      </div>

      {/* Centro: Fuentes oficiales discretas para no perder la atribución */}
      <div
        className="hidden xl:flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] truncate max-w-md 2xl:max-w-xl"
        title="Fuentes oficiales: DANE 2025 • Policía Nacional / CCV (Ene–Sep 2025) • Alcaldía Mayor de Cartagena • Catastro Distrital"
      >
        <span className="font-semibold text-[var(--text-secondary)]">Fuentes oficiales:</span>
        <span className="truncate">DANE 2025 • Policía Nacional / CCV • Alcaldía de Cartagena • Catastro Distrital</span>
      </div>

      {/* Lado derecho: Menú de Vistas y Controles de los 4 Paneles */}
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
