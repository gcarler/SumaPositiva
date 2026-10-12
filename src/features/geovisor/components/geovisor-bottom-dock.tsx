"use client";

import React, { useState } from "react";
import {
  TableProperties,
  BarChart2,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui/tabs";
import { MesasDataGrid } from "./mesas-datagrid/mesas-datagrid";
import type { ModoVistaMesas } from "./mesas-datagrid/datagrid-toolbar";
import { GeovisorCharts } from "./geovisor-charts";
import type { VariableMapa } from "../data/estadisticas.data";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";
import { cn } from "@/shared/lib/utils";

export interface GeovisorBottomDockProps {
  mesas: MesaGeovisor[];
  mesaSeleccionadaId: string | null;
  onSeleccionarMesa: (id: string | null) => void;
  onLocalizarEnMapa?: (mesa: MesaGeovisor) => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
  territorioId: string;
  onTerritorioChange: (id: string) => void;
  variableMapa: VariableMapa;
  onVariableChange: (v: VariableMapa) => void;
  defaultTab?: "datagrid" | "graficos";
  className?: string;
}

export function GeovisorBottomDock({
  mesas,
  mesaSeleccionadaId,
  onSeleccionarMesa,
  onLocalizarEnMapa,
  onAbrirPanelMesa,
  territorioId,
  onTerritorioChange,
  variableMapa,
  onVariableChange,
  defaultTab = "datagrid",
  className,
}: GeovisorBottomDockProps) {
  const [modoVista, setModoVista] = useState<ModoVistaMesas>("tabla");

  const totalRealizadas = mesas.filter((m) => m.realizada).length;
  const totalProgramadas = mesas.filter((m) => !m.realizada).length;

  return (
    <section
      role="region"
      aria-label="Panel inferior del Geovisor: DataGrid de Mesas y Gráficos Estadísticos"
      data-testid="geovisor-bottom-dock"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-[var(--surface-1)] text-[var(--text-primary)]",
        className
      )}
    >
      <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
        {/* BARRA SUPERIOR DE LA CONSOLA CON PESTAÑAS Y RESUMEN */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-1.5">
          <TabsList className="h-8 rounded-lg bg-[var(--surface-0)] p-0.5 border border-[var(--border)]">
            <TabsTrigger
              value="datagrid"
              className="gap-1.5 text-xs py-1 data-[state=active]:bg-[var(--surface-1)] data-[state=active]:text-[var(--text-primary)]"
            >
              <TableProperties className="size-3.5 text-[var(--ember)]" />
              <span>DataGrid de Mesas ({mesas.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="graficos"
              className="gap-1.5 text-xs py-1 data-[state=active]:bg-[var(--surface-1)] data-[state=active]:text-[var(--text-primary)]"
            >
              <BarChart2 className="size-3.5 text-[var(--info)]" />
              <span>Gráficos Estadísticos</span>
            </TabsTrigger>
          </TabsList>

          {/* Badges de estado rápido */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-0)] px-2 py-0.5 text-[10px] font-medium text-[var(--ember)]">
              <Sparkles className="size-2.5" /> Consola Analítica
            </span>
            <StatusBadge tone="success" className="text-[10px] py-0 px-2">
              {totalRealizadas} Realizadas
            </StatusBadge>
            <StatusBadge tone="warning" className="text-[10px] py-0 px-2">
              {totalProgramadas} Programadas
            </StatusBadge>
          </div>
        </div>

        {/* PESTAÑA 1: DATAGRID DE MESAS */}
        <TabsContent
          value="datagrid"
          className="m-0 flex-1 overflow-auto p-3 outline-none"
        >
          <MesasDataGrid
            mesas={mesas}
            seleccionada={mesaSeleccionadaId}
            onSeleccionar={onSeleccionarMesa}
            onAbrirPanelMesa={onAbrirPanelMesa}
            onLocalizarEnMapa={onLocalizarEnMapa}
            modoVista={modoVista}
            onModoVistaChange={setModoVista}
          />
        </TabsContent>

        {/* PESTAÑA 2: GRÁFICOS ESTADÍSTICOS */}
        <TabsContent
          value="graficos"
          className="m-0 flex-1 overflow-auto p-3 outline-none"
        >
          <GeovisorCharts
            territorioId={territorioId}
            variableMapa={variableMapa}
            onTerritorioChange={onTerritorioChange}
            onVariableChange={onVariableChange}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
