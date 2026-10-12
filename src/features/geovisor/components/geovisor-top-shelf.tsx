"use client";

import React, { useMemo } from "react";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  Compass,
  Layers,
  Download,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  type VariableMapa,
  VARIABLE_META,
  ESTADISTICAS_TERRITORIOS,
} from "../data/estadisticas.data";
import { GeovisorDockControls } from "./geovisor-dock-controls";
import { cn } from "@/shared/lib/utils";

export interface GeovisorTopShelfProps {
  territorioId: string;
  onTerritorioChange: (id: string) => void;
  variableMapa: VariableMapa;
  onVariableChange: (v: VariableMapa) => void;
  onExportarPng?: () => void;
  className?: string;
}

const OPCIONES_TERRITORIO = [
  { id: "todas", nombre: "Distrito Completo de Cartagena" },
  { id: "loc-1", nombre: "Localidad 1 — Histórica y del Caribe Norte" },
  { id: "loc-2", nombre: "Localidad 2 — De la Virgen y Turística" },
  { id: "loc-3", nombre: "Localidad 3 — Industrial y de la Bahía" },
  { id: "rural-insular", nombre: "Zona Corregimental e Insular" },
] as const;

export function GeovisorTopShelf({
  territorioId,
  onTerritorioChange,
  variableMapa,
  onVariableChange,
  onExportarPng,
  className,
}: GeovisorTopShelfProps) {
  // Cálculos consolidados de KPIs ejecutivos distritales
  const kpisGlobales = useMemo(() => {
    const macros = ESTADISTICAS_TERRITORIOS.filter((t) =>
      ["loc-1", "loc-2", "loc-3", "rural-insular"].includes(t.id)
    );

    const totalAportes = macros.reduce((acc, t) => acc + t.aportesCiudadanos, 0);
    const totalAlertas = macros.reduce((acc, t) => acc + t.alertas, 0);
    const pobTotal = macros.reduce((acc, t) => acc + t.poblacion, 0);
    const ishPonderado = Math.round(
      macros.reduce((acc, t) => acc + t.ish * t.poblacion, 0) / (pobTotal || 1)
    );

    return {
      ciudadanos: 8420,
      totalAportes,
      totalAlertas,
      ishPromedio: ishPonderado,
    };
  }, []);

  return (
    <header
      role="region"
      aria-label="Panel superior de control cartográfico y KPIs ejecutivos"
      data-testid="geovisor-top-shelf"
      className={cn(
        "flex flex-col justify-between gap-2.5 p-3 sm:px-4 sm:py-3 bg-[var(--surface-1)] border-b border-[var(--border)]",
        className
      )}
    >
      {/* FILA SUPERIOR: Selectores de Ámbito y Variable + Exportar PNG + Controles de Dock */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Selector de Ámbito */}
          <div className="flex items-center gap-1.5">
            <Compass className="size-3.5 text-[var(--ember)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Ámbito:
            </span>
            <Select value={territorioId} onValueChange={onTerritorioChange}>
              <SelectTrigger
                className="h-8 w-[190px] sm:w-[240px] text-xs bg-[var(--surface-0)] border-[var(--border)]"
                aria-label="Seleccionar territorio o localidad"
              >
                <SelectValue placeholder="Seleccionar ámbito" />
              </SelectTrigger>
              <SelectContent>
                {OPCIONES_TERRITORIO.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Variable Temática */}
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-[var(--info)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Variable:
            </span>
            <Select
              value={variableMapa}
              onValueChange={(val) => onVariableChange(val as VariableMapa)}
            >
              <SelectTrigger
                className="h-8 w-[190px] sm:w-[230px] text-xs bg-[var(--surface-0)] border-[var(--border)]"
                aria-label="Seleccionar variable temática"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VARIABLE_META) as VariableMapa[]).map((v) => (
                  <SelectItem key={v} value={v}>
                    {VARIABLE_META[v].label} ({VARIABLE_META[v].unidad})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exportar PNG */}
          {onExportarPng && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportarPng}
              className="h-8 gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Exportar mapa como imagen PNG"
            >
              <Download className="size-3 text-[var(--ember)]" />
              <span className="hidden sm:inline">Exportar PNG</span>
            </Button>
          )}
        </div>

        {/* CONTROLES DE LAYOUT ACOPLADO (Dock Controls) */}
        <div className="flex items-center">
          <GeovisorDockControls />
        </div>
      </div>

      {/* FILA INFERIOR: 4 KPI Chips Ejecutivos Compactos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Chip 1: Participantes */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <Users className="size-3.5 text-[var(--ember)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Ciudadanos Participando
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpisGlobales.ciudadanos.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Chip 2: Aportes */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <MessageSquare className="size-3.5 text-[var(--info)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Aportes Radicados
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpisGlobales.totalAportes.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Chip 3: Alertas SAT */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <AlertTriangle className="size-3.5 text-[var(--warning)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Alertas SAT Activas
            </span>
            <span className="text-xs font-bold tabular text-[var(--warning)]">
              {kpisGlobales.totalAlertas}
            </span>
          </div>
        </div>

        {/* Chip 4: ISH Promedio */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <ShieldCheck className="size-3.5 text-[var(--success)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              ISH Promedio Distrital
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpisGlobales.ishPromedio} / 100
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
