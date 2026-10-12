"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/shared/ui/resizable";
import {
  DOCK_LIMITS,
  useGeovisorLayoutStore,
  type DockPanelId,
} from "../state/geovisor-layout-store";
import { GeovisorWorkbenchBar } from "./geovisor-workbench-bar";
import { DRAG_MIME } from "./geovisor-dock-host";
import { DOCK_LABELS } from "./geovisor-view-registry";
import {
  GEOVISOR_VIEW_IDS,
  type GeovisorViewId,
} from "../state/geovisor-layout-store";

export interface GeovisorWorkspaceLayoutProps {
  /** Slot superior colapsable (filtros globales, KPIs, controles dock) */
  topSlot?: React.ReactNode;
  /** Slot izquierdo colapsable (capas SIG, directorio de 33 mesas) */
  leftSlot?: React.ReactNode;
  /** Slot central fijo y elástico (lienzo OpenLayers). Nunca se desmonta. */
  centerSlot: React.ReactNode;
  /** Slot derecho colapsable (ficha técnica de mesa, ranking BI, detalle barrial) */
  rightSlot?: React.ReactNode;
  /** Slot inferior colapsable (DataGrid de mesas, analítica y gráficos estadísticos) */
  bottomSlot?: React.ReactNode;
  /** Clases CSS adicionales para el contenedor exterior */
  className?: string;
}

export function GeovisorWorkspaceLayout({
  topSlot,
  leftSlot,
  centerSlot,
  rightSlot,
  bottomSlot,
  className,
}: GeovisorWorkspaceLayoutProps) {
  // Patrón SSR-safe para hidratación y pruebas con renderToString
  const isServer = typeof window === "undefined";
  const storeState = useGeovisorLayoutStore();
  const {
    topOpen,
    leftOpen,
    rightOpen,
    bottomOpen,
    sizes,
    setPanelSize,
    setPanelOpen,
    expandedDock,
  } = isServer ? useGeovisorLayoutStore.getState() : storeState;

  const topPanelRef = useRef<React.ElementRef<typeof ResizablePanel>>(null);
  const leftPanelRef = useRef<React.ElementRef<typeof ResizablePanel>>(null);
  const rightPanelRef = useRef<React.ElementRef<typeof ResizablePanel>>(null);
  const bottomPanelRef = useRef<React.ElementRef<typeof ResizablePanel>>(null);

  const hasTop = Boolean(topSlot);
  const hasLeft = Boolean(leftSlot);
  const hasRight = Boolean(rightSlot);
  const hasBottom = Boolean(bottomSlot);

  const isTopActive = hasTop && topOpen;
  const isLeftActive = hasLeft && leftOpen;
  const isRightActive = hasRight && rightOpen;
  const isBottomActive = hasBottom && bottomOpen;

  // Al arrastrar una pestaña, los paneles ocultos muestran una zona de soltado en su borde
  const [draggingView, setDraggingView] = useState(false);
  useEffect(() => {
    const onStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes(DRAG_MIME)) setDraggingView(true);
    };
    const onEnd = () => setDraggingView(false);
    window.addEventListener("dragstart", onStart);
    window.addEventListener("dragend", onEnd);
    window.addEventListener("drop", onEnd);
    return () => {
      window.removeEventListener("dragstart", onStart);
      window.removeEventListener("dragend", onEnd);
      window.removeEventListener("drop", onEnd);
    };
  }, []);

  const moveView = useGeovisorLayoutStore((st) => st.moveView);
  const hiddenDocks = (["top", "left", "right", "bottom"] as DockPanelId[]).filter(
    (d) => !{ top: isTopActive, left: isLeftActive, right: isRightActive, bottom: isBottomActive }[d]
  );
  const edgeClass: Record<DockPanelId, string> = {
    top: "inset-x-0 top-9 h-10",
    bottom: "inset-x-0 bottom-0 h-10",
    left: "inset-y-9 left-0 w-10",
    right: "inset-y-9 right-0 w-10",
  };

  // Expandir un panel a su máximo y restaurar su tamaño previo al volver a pulsar
  const previousExpanded = useRef<DockPanelId | null>(null);
  const savedSize = useRef<number | null>(null);
  useEffect(() => {
    const refs: Record<DockPanelId, React.RefObject<React.ElementRef<typeof ResizablePanel> | null>> = {
      top: topPanelRef,
      left: leftPanelRef,
      right: rightPanelRef,
      bottom: bottomPanelRef,
    };
    const prev = previousExpanded.current;
    previousExpanded.current = expandedDock;
    if (prev && prev !== expandedDock) {
      const restore = savedSize.current ?? useGeovisorLayoutStore.getState().sizes[prev];
      refs[prev].current?.resize(restore);
    }
    if (expandedDock) {
      savedSize.current = useGeovisorLayoutStore.getState().sizes[expandedDock];
      refs[expandedDock].current?.resize(DOCK_LIMITS[expandedDock].max);
    }
  }, [expandedDock]);

  // Sincronización imperativa de ref cuando el store muta externamente
  useEffect(() => {
    const panel = topPanelRef.current;
    if (!panel) return;
    if (isTopActive && panel.isCollapsed()) {
      panel.expand(sizes.top);
    } else if (!isTopActive && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isTopActive, sizes.top]);

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (isLeftActive && panel.isCollapsed()) {
      panel.expand(sizes.left);
    } else if (!isLeftActive && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isLeftActive, sizes.left]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (isRightActive && panel.isCollapsed()) {
      panel.expand(sizes.right);
    } else if (!isRightActive && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isRightActive, sizes.right]);

  useEffect(() => {
    const panel = bottomPanelRef.current;
    if (!panel) return;
    if (isBottomActive && panel.isCollapsed()) {
      panel.expand(sizes.bottom);
    } else if (!isBottomActive && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isBottomActive, sizes.bottom]);

  return (
    <div
      role="region"
      aria-label="Espacio de trabajo cartográfico y analítico de POLIS"
      data-testid="geovisor-workspace-layout"
      className={cn(
        "relative flex h-dvh w-full flex-col overflow-hidden bg-[var(--surface-0)] transition-all",
        className
      )}
    >
      <GeovisorWorkbenchBar />
      <ResizablePanelGroup
        direction="vertical"
        className="min-h-0 w-full flex-1"
        id="geovisor-vertical-group"
      >
        {/* PANEL DOCK SUPERIOR (Shelf) */}
        <ResizablePanel
          ref={topPanelRef}
          id="dock-panel-top"
          order={1}
          collapsible
          minSize={DOCK_LIMITS.top.min}
          maxSize={DOCK_LIMITS.top.max}
          defaultSize={isTopActive ? sizes.top : 0}
          onResize={(size) => {
            if (size > 0) setPanelSize("top", size);
          }}
          onCollapse={() => setPanelOpen("top", false)}
          onExpand={() => setPanelOpen("top", true)}
          aria-label="Panel superior de filtros y KPIs ejecutivos"
          className={cn(
            "bg-[var(--surface-1)] transition-colors",
            !isTopActive && "pointer-events-none"
          )}
        >
          <div
            className="h-full w-full overflow-auto"
            aria-hidden={!isTopActive}
            data-dock-panel="top"
          >
            {topSlot}
          </div>
        </ResizablePanel>

        {/* Separador Superior */}
        <ResizableHandle
          withHandle
          className={cn(!isTopActive && "hidden")}
          data-dock-handle="top"
        />

        {/* GRUPO HORIZONTAL INTERMEDIO (Izquierda + Canvas Central + Derecha) */}
        <ResizablePanel
          id="dock-panel-middle"
          order={2}
          minSize={30}
          className="relative flex h-full w-full overflow-hidden"
        >
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full w-full"
            id="geovisor-horizontal-group"
          >
            {/* PANEL DOCK IZQUIERDO (Capas SIG y Directorio de Mesas) */}
            <ResizablePanel
              ref={leftPanelRef}
              id="dock-panel-left"
              order={1}
              collapsible
              minSize={DOCK_LIMITS.left.min}
              maxSize={DOCK_LIMITS.left.max}
              defaultSize={isLeftActive ? sizes.left : 0}
              onResize={(size) => {
                if (size > 0) setPanelSize("left", size);
              }}
              onCollapse={() => setPanelOpen("left", false)}
              onExpand={() => setPanelOpen("left", true)}
              aria-label="Panel izquierdo de capas y mesas territoriales"
              className={cn(
                "bg-[var(--surface-1)] transition-colors",
                !isLeftActive && "pointer-events-none"
              )}
            >
              <div
                className="h-full w-full overflow-auto"
                aria-hidden={!isLeftActive}
                data-dock-panel="left"
              >
                {leftSlot}
              </div>
            </ResizablePanel>

            {/* Separador Izquierdo */}
            <ResizableHandle
              withHandle
              className={cn(!isLeftActive && "hidden")}
              data-dock-handle="left"
            />

            {/* PANEL CENTRAL: CANVAS MAPA OPENLAYERS (Fluido, elástico, nunca se desmonta) */}
            <ResizablePanel
              id="dock-panel-center"
              order={2}
              minSize={30}
              className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--surface-0)]"
            >
              <div
                className="relative h-full w-full overflow-hidden"
                data-dock-panel="center"
              >
                {centerSlot}
              </div>
            </ResizablePanel>

            {/* Separador Derecho */}
            <ResizableHandle
              withHandle
              className={cn(!isRightActive && "hidden")}
              data-dock-handle="right"
            />

            {/* PANEL DOCK DERECHO (Inspector, Ficha Técnica y Detalle BI) */}
            <ResizablePanel
              ref={rightPanelRef}
              id="dock-panel-right"
              order={3}
              collapsible
              minSize={DOCK_LIMITS.right.min}
              maxSize={DOCK_LIMITS.right.max}
              defaultSize={isRightActive ? sizes.right : 0}
              onResize={(size) => {
                if (size > 0) setPanelSize("right", size);
              }}
              onCollapse={() => setPanelOpen("right", false)}
              onExpand={() => setPanelOpen("right", true)}
              aria-label="Panel derecho de inspector SIG y ficha técnica"
              className={cn(
                "bg-[var(--surface-1)] transition-colors",
                !isRightActive && "pointer-events-none"
              )}
            >
              <div
                className="h-full w-full overflow-auto"
                aria-hidden={!isRightActive}
                data-dock-panel="right"
              >
                {rightSlot}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        {/* Separador Inferior */}
        <ResizableHandle
          withHandle
          className={cn(!isBottomActive && "hidden")}
          data-dock-handle="bottom"
        />

        {/* PANEL DOCK INFERIOR (DataGrid de Mesas y Gráficos Estadísticos) */}
        <ResizablePanel
          ref={bottomPanelRef}
          id="dock-panel-bottom"
          order={3}
          collapsible
          minSize={DOCK_LIMITS.bottom.min}
          maxSize={DOCK_LIMITS.bottom.max}
          defaultSize={isBottomActive ? sizes.bottom : 0}
          onResize={(size) => {
            if (size > 0) setPanelSize("bottom", size);
          }}
          onCollapse={() => setPanelOpen("bottom", false)}
          onExpand={() => setPanelOpen("bottom", true)}
          aria-label="Panel inferior de tabla de datos y gráficos analíticos"
          className={cn(
            "bg-[var(--surface-1)] transition-colors",
            !isBottomActive && "pointer-events-none"
          )}
        >
          <div
            className="h-full w-full overflow-auto"
            aria-hidden={!isBottomActive}
            data-dock-panel="bottom"
          >
            {bottomSlot}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {draggingView &&
        hiddenDocks.map((dock) => (
          <div
            key={dock}
            data-testid={`dock-dropzone-${dock}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData(DRAG_MIME);
              if (id && (GEOVISOR_VIEW_IDS as readonly string[]).includes(id)) {
                moveView(id as GeovisorViewId, dock);
              }
              setDraggingView(false);
            }}
            className={cn(
              "absolute z-20 flex items-center justify-center rounded-md border-2 border-dashed border-[var(--ember)] bg-[var(--surface-2)]/90 text-[10px] font-semibold text-[var(--ember)]",
              edgeClass[dock]
            )}
          >
            <span className={dock === "left" || dock === "right" ? "[writing-mode:vertical-rl]" : ""}>
              Soltar en panel {DOCK_LABELS[dock].toLowerCase()}
            </span>
          </div>
        ))}
    </div>
  );
}
