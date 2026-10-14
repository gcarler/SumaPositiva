"use client";

import React, { useMemo } from "react";
import {
  Compass,
  Layers,
  Calendar,
  Download,
  ShieldAlert,
  Building2,
  Trees,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { VariableMapa } from "../data/estadisticas.data";
import { cn } from "@/shared/lib/utils";

export interface GeovisorTopShelfProps {
  zonaId?: string;
  territorioId?: string;
  onZonaChange?: (id: string) => void;
  onTerritorioChange?: (id: string) => void;
  delitoHurto?: string | null;
  onDelitoChange?: (delito: string | null) => void;
  anioHurto?: number | null;
  onAnioHurtoChange?: (anio: number | null) => void;
  variableMapa?: VariableMapa;
  onVariableChange?: (v: VariableMapa) => void;
  onExportarPng?: () => void;
  className?: string;
}

const OPCIONES_ZONA = [
  { id: "todas", nombre: "Distrito Completo (Urbano + Rural)" },
  { id: "URBANA", nombre: "ID_POLIG 1 — Perímetro Urbano (75,3 km²)" },
  { id: "RURAL", nombre: "ID_POLIG 2 — Zona Rural e Insular (597,4 km²)" },
] as const;

const OPCIONES_CAPA = [
  { id: "TODOS", nombre: "Consolidado 3 Capas Drive (18.242 casos)" },
  { id: "hurto_comercio", nombre: "Hurto a Comercio (8.515 casos · 5.907 reg.)" },
  { id: "hurto_residencias", nombre: "Hurto a Residencias (5.044 casos · 3.853 reg.)" },
  { id: "hurto_motocicletas", nombre: "Hurto a Motocicletas (4.683 casos · 2.520 reg.)" },
] as const;

const ANIOS_DISPONIBLES = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018] as const;

const CANONICAL_DRIVE_KPIS = {
  TODOS: {
    incidentes: 18242,
    features: 12280,
    urbano: 17684,
    pctUrbano: 96.9,
    rural: 558,
    pctRural: 3.1,
  },
  hurto_comercio: {
    incidentes: 8515,
    features: 5907,
    urbano: 8358,
    pctUrbano: 98.2,
    rural: 157,
    pctRural: 1.8,
  },
  hurto_residencias: {
    incidentes: 5044,
    features: 3853,
    urbano: 4869,
    pctUrbano: 96.5,
    rural: 175,
    pctRural: 3.5,
  },
  hurto_motocicletas: {
    incidentes: 4683,
    features: 2520,
    urbano: 4457,
    pctUrbano: 95.2,
    rural: 226,
    pctRural: 4.8,
  },
} as const;

export function GeovisorTopShelf({
  zonaId,
  territorioId,
  onZonaChange,
  onTerritorioChange,
  delitoHurto,
  onDelitoChange,
  anioHurto = null,
  onAnioHurtoChange,
  onExportarPng,
  className,
}: GeovisorTopShelfProps) {
  const zonaActiva = zonaId ?? territorioId ?? "todas";
  const handleZona = onZonaChange ?? onTerritorioChange ?? (() => {});
  const delitoClave = delitoHurto && delitoHurto in CANONICAL_DRIVE_KPIS ? delitoHurto as keyof typeof CANONICAL_DRIVE_KPIS : "TODOS";
  const anioActivo = anioHurto ? String(anioHurto) : "TODOS";

  // KPIs dinámicos calculados a partir de los datos oficiales del Drive
  const kpis = useMemo(() => {
    const base = CANONICAL_DRIVE_KPIS[delitoClave];
    let incidentes: number = base.incidentes;
    if (zonaActiva === "URBANA") incidentes = base.urbano;
    else if (zonaActiva === "RURAL") incidentes = base.rural;

    return {
      incidentes,
      features: base.features,
      urbano: base.urbano,
      pctUrbano: base.pctUrbano,
      rural: base.rural,
      pctRural: base.pctRural,
    };
  }, [delitoClave, zonaActiva]);

  return (
    <header
      role="region"
      aria-label="Panel superior de control cartográfico y KPIs ejecutivos"
      data-testid="geovisor-top-shelf"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-2.5 sm:px-3 bg-[var(--surface-1)] border-b border-[var(--border)]",
        className
      )}
    >
      {/* FILA SUPERIOR: Selectores de Zona GeoJSON, Capa GeoJSON y Año + Exportar PNG */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Selector 1: Zona GeoJSON */}
        <div className="flex items-center gap-1.5">
          <Compass className="size-3.5 text-[var(--ember)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Zona GeoJSON:
          </span>
          <Select value={zonaActiva} onValueChange={handleZona}>
            <SelectTrigger
              className="h-8 w-[190px] sm:w-[230px] text-xs bg-[var(--surface-0)] border-[var(--border)]"
              aria-label="Seleccionar zona GeoJSON"
            >
              <SelectValue placeholder="Seleccionar zona" />
            </SelectTrigger>
            <SelectContent>
              {OPCIONES_ZONA.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector 2: Capa GeoJSON */}
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-[var(--info)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Capa GeoJSON:
          </span>
          <Select
            value={delitoClave}
            onValueChange={(val) => onDelitoChange?.(val === "TODOS" ? null : val)}
          >
            <SelectTrigger
              className="h-8 w-[210px] sm:w-[260px] text-xs bg-[var(--surface-0)] border-[var(--border)]"
              aria-label="Seleccionar capa GeoJSON"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCIONES_CAPA.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector 3: Año Delictivo */}
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Año:
          </span>
          <Select
            value={anioActivo}
            onValueChange={(val) => onAnioHurtoChange?.(val === "TODOS" ? null : Number(val))}
          >
            <SelectTrigger
              className="h-8 w-[140px] sm:w-[160px] text-xs bg-[var(--surface-0)] border-[var(--border)]"
              aria-label="Seleccionar año delictivo"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">2018–2026 (Todos)</SelectItem>
              {ANIOS_DISPONIBLES.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  Año {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botón Exportar PNG */}
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

      {/* FILA INFERIOR: 4 KPI Chips Ejecutivos Reales del GeoJSON */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Chip 1: Total Incidentes GeoJSON */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <ShieldAlert className="size-3.5 text-[var(--danger)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Total Incidentes GeoJSON
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpis.incidentes.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* Chip 2: Registros GeoJSON Drive */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <Layers className="size-3.5 text-[var(--ember)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Registros GeoJSON (Drive)
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpis.features.toLocaleString("es-CO")} features
            </span>
          </div>
        </div>

        {/* Chip 3: Perímetro Urbano */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <Building2 className="size-3.5 text-[var(--info)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Perímetro Urbano (ID_POLIG 1)
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpis.urbano.toLocaleString("es-CO")} casos ({kpis.pctUrbano.toFixed(1).replace(".", ",")}%)
            </span>
          </div>
        </div>

        {/* Chip 4: Zona Rural e Insular */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)]/70 px-2.5 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]">
            <Trees className="size-3.5 text-[var(--success)]" />
          </div>
          <div className="min-w-0">
            <span className="truncate text-[10px] text-[var(--text-tertiary)] block">
              Zona Rural e Insular (ID_POLIG 2)
            </span>
            <span className="text-xs font-bold tabular text-[var(--text-primary)]">
              {kpis.rural.toLocaleString("es-CO")} casos ({kpis.pctRural.toFixed(1).replace(".", ",")}%)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
