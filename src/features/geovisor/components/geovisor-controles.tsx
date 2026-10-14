"use client";

import React from "react";
import { Layers, BarChart3 } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { VariableMapa } from "../data/estadisticas.data";

export interface CapasConfig {
  localidades?: boolean;
  corregimientos?: boolean;
  barrios?: boolean;
  puntos?: boolean;
  etiquetas?: boolean;
  isocronas?: boolean;
  hurtoMotocicletas?: boolean;
  hurtoResidencias?: boolean;
  hurtoComercio?: boolean;
}

export interface GeovisorControlesProps {
  capas: CapasConfig;
  onToggleCapa: (capa: keyof CapasConfig) => void;
  variableMapa?: VariableMapa;
  anioHurto?: number | null;
  onAnioHurtoChange?: (anio: number | null) => void;
  onAbrirTableroHurtos?: () => void;
}

export function GeovisorControles({
  capas,
  onToggleCapa,
  anioHurto = null,
  onAnioHurtoChange,
  onAbrirTableroHurtos,
}: GeovisorControlesProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm text-xs">
      {/* 1. Encabezado */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
        <Layers className="size-4 text-[var(--ember)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Capas de Datos Estadísticos (SIEDCO 2018–2026)
        </h3>
      </div>

      {/* 2. Toggles de las 3 capas GeoJSON cargadas del Drive */}
      <div className="space-y-2.5">
        <Label
          htmlFor="capa-hurto-motos"
          className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(capas.hurtoMotocicletas)}
              onCheckedChange={() => onToggleCapa("hurtoMotocicletas")}
              id="capa-hurto-motos"
            />
            <span className="font-medium text-xs">
              Hurto a Motocicletas{" "}
              <span className="text-[11px] text-[var(--text-tertiary)]">
                (4.683 casos · 2.520 registros)
              </span>
            </span>
          </div>
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "#f97316" }} />
        </Label>

        <Label
          htmlFor="capa-hurto-residencias"
          className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(capas.hurtoResidencias)}
              onCheckedChange={() => onToggleCapa("hurtoResidencias")}
              id="capa-hurto-residencias"
            />
            <span className="font-medium text-xs">
              Hurto a Residencias{" "}
              <span className="text-[11px] text-[var(--text-tertiary)]">
                (5.044 casos · 3.853 registros)
              </span>
            </span>
          </div>
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "#8b5cf6" }} />
        </Label>

        <Label
          htmlFor="capa-hurto-comercio"
          className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(capas.hurtoComercio)}
              onCheckedChange={() => onToggleCapa("hurtoComercio")}
              id="capa-hurto-comercio"
            />
            <span className="font-medium text-xs">
              Hurto a Comercio{" "}
              <span className="text-[11px] text-[var(--text-tertiary)]">
                (8.515 casos · 5.907 registros)
              </span>
            </span>
          </div>
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "#06b6d4" }} />
        </Label>

        {/* 3. Toggle de Etiquetas */}
        <Label
          htmlFor="capa-etiquetas"
          className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal pt-1 border-t border-[var(--border)]"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(capas.etiquetas)}
              onCheckedChange={() => onToggleCapa("etiquetas")}
              id="capa-etiquetas"
            />
            <span className="font-medium text-xs">Etiquetas de Polígonos en Mapa</span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] font-bold">Aa</span>
        </Label>
      </div>

      {/* 4. Selector de Año Delictivo */}
      <div className="border-t border-[var(--border)] pt-2.5 space-y-1.5">
        <Label
          htmlFor="select-filtro-anio-geovisor"
          className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider"
        >
          Año Delictivo
        </Label>
        <Select
          value={anioHurto ? String(anioHurto) : "TODOS"}
          onValueChange={(val) => onAnioHurtoChange?.(val === "TODOS" ? null : Number(val))}
        >
          <SelectTrigger
            id="select-filtro-anio-geovisor"
            className="w-full h-8 text-[11px]"
            aria-label="Filtrar año delictivo"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS" className="text-xs">
              2018–2026 (Consolidado)
            </SelectItem>
            {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((a) => (
              <SelectItem key={a} value={String(a)} className="text-xs">
                Año {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 5. Cobertura Territorial Analizada */}
      <div className="border-t border-[var(--border)] pt-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Cobertura Territorial Analizada
          </span>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
            Cartagena de Indias
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2.5 space-y-1">
            <div className="flex items-center justify-between font-semibold text-xs text-[var(--text-primary)]">
              <span>Zona 1: Perímetro Urbano</span>
              <span className="size-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              75,28 km² · 17.684 casos · 234,9 casos/km²
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2.5 space-y-1">
            <div className="flex items-center justify-between font-semibold text-xs text-[var(--text-primary)]">
              <span>Zona 2: Rural e Insular</span>
              <span className="size-2 rounded-full border border-dashed border-[var(--text-tertiary)]" />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              597,38 km² · 558 casos · 0,9 casos/km²
            </p>
          </div>
        </div>
      </div>

      {/* 6. Botón «Ver Datos Estadísticos y Tablero» */}
      {onAbrirTableroHurtos && (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAbrirTableroHurtos}
            data-testid="btn-sidebar-ver-estadisticas"
            className="w-full h-8 gap-1.5 text-xs font-semibold border-[var(--ember)]/40 text-[var(--ember)] hover:bg-[var(--ember)]/10"
          >
            <BarChart3 className="size-3.5" />
            Ver Datos Estadísticos y Tablero
          </Button>
        </div>
      )}
    </div>
  );
}
