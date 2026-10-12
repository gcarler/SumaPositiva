"use client";

import React from "react";
import {
  PanelTop,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

export interface GeovisorDockControlsProps {
  className?: string;
}

/**
 * GeovisorDockControls — Controles de Acoplamiento de Estudio (Tiling Dock Controls)
 * Permite alternar la visibilidad de los 4 paneles periféricos (Superior, Izquierdo, Derecho, Inferior),
 * maximizar el lienzo del mapa y restablecer la disposición por defecto.
 */
export function GeovisorDockControls({ className }: GeovisorDockControlsProps) {
  const clientStore = useGeovisorLayoutStore();
  const isServer = typeof window === "undefined";
  const store = isServer ? useGeovisorLayoutStore.getState() : clientStore;

  const {
    topOpen,
    leftOpen,
    rightOpen,
    bottomOpen,
    isMaximized,
    togglePanel,
    maximizeMap,
    resetLayout,
  } = store;

  return (
    <div
      role="toolbar"
      aria-label="Controles de paneles del Geovisor"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-xs",
        className
      )}
    >
      {/* 1. Toggle Panel Superior */}
      <Button
        type="button"
        variant={topOpen ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => togglePanel("top")}
        aria-label={topOpen ? "Ocultar panel superior" : "Mostrar panel superior"}
        aria-pressed={topOpen}
        title={
          topOpen
            ? "Ocultar panel superior (Filtros y KPIs)"
            : "Mostrar panel superior (Filtros y KPIs)"
        }
        data-testid="dock-toggle-top"
        className={cn(
          "size-7.5 rounded-lg transition-colors",
          topOpen
            ? "border border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--ember)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        <PanelTop className="size-4" aria-hidden="true" />
      </Button>

      {/* 2. Toggle Panel Izquierdo */}
      <Button
        type="button"
        variant={leftOpen ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => togglePanel("left")}
        aria-label={leftOpen ? "Ocultar panel izquierdo" : "Mostrar panel izquierdo"}
        aria-pressed={leftOpen}
        title={
          leftOpen
            ? "Ocultar panel izquierdo (Capas y Directorio de Mesas)"
            : "Mostrar panel izquierdo (Capas y Directorio de Mesas)"
        }
        data-testid="dock-toggle-left"
        className={cn(
          "size-7.5 rounded-lg transition-colors",
          leftOpen
            ? "border border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--ember)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        <PanelLeft className="size-4" aria-hidden="true" />
      </Button>

      {/* 3. Toggle Panel Derecho */}
      <Button
        type="button"
        variant={rightOpen ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => togglePanel("right")}
        aria-label={rightOpen ? "Ocultar panel derecho" : "Mostrar panel derecho"}
        aria-pressed={rightOpen}
        title={
          rightOpen
            ? "Ocultar panel derecho (Inspector y Ficha de Mesa)"
            : "Mostrar panel derecho (Inspector y Ficha de Mesa)"
        }
        data-testid="dock-toggle-right"
        className={cn(
          "size-7.5 rounded-lg transition-colors",
          rightOpen
            ? "border border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--ember)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        <PanelRight className="size-4" aria-hidden="true" />
      </Button>

      {/* 4. Toggle Panel Inferior */}
      <Button
        type="button"
        variant={bottomOpen ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => togglePanel("bottom")}
        aria-label={bottomOpen ? "Ocultar panel inferior" : "Mostrar panel inferior"}
        aria-pressed={bottomOpen}
        title={
          bottomOpen
            ? "Ocultar panel inferior (DataGrid de Mesas y Gráficos)"
            : "Mostrar panel inferior (DataGrid de Mesas y Gráficos)"
        }
        data-testid="dock-toggle-bottom"
        className={cn(
          "size-7.5 rounded-lg transition-colors",
          bottomOpen
            ? "border border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--ember)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        <PanelBottom className="size-4" aria-hidden="true" />
      </Button>

      {/* Separador vertical */}
      <div className="mx-0.5 h-4 w-px bg-[var(--border)]" aria-hidden="true" />

      {/* 5. Maximizar / Restaurar Mapa */}
      <Button
        type="button"
        variant={isMaximized ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={maximizeMap}
        aria-label={
          isMaximized ? "Restaurar paneles del Geovisor" : "Maximizar mapa"
        }
        aria-pressed={isMaximized}
        title={
          isMaximized
            ? "Restaurar paneles periféricos"
            : "Maximizar mapa (pantalla limpia)"
        }
        data-testid="dock-toggle-maximize"
        className={cn(
          "size-7.5 rounded-lg transition-colors",
          isMaximized
            ? "border border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--ember)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        {isMaximized ? (
          <Minimize2 className="size-3.5" aria-hidden="true" />
        ) : (
          <Maximize2 className="size-3.5" aria-hidden="true" />
        )}
      </Button>

      {/* 6. Restablecer Disposición */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={resetLayout}
        aria-label="Restablecer disposición por defecto"
        title="Restablecer disposición por defecto"
        data-testid="dock-reset-layout"
        className="size-7.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
