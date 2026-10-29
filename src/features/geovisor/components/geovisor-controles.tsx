"use client";

import React, { useState } from "react";
import {
  Database,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
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
import { useCapasGeovisor } from "../services/use-geovisor-queries";
import type { CapaEspacial } from "../models/geovisor";

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
  [key: string]: boolean | undefined;
}

export interface GeovisorControlesProps {
  capas: CapasConfig;
  onToggleCapa: (capa: keyof CapasConfig) => void;
  variableMapa?: VariableMapa;
  anioHurto?: number | null;
  onAnioHurtoChange?: (anio: number | null) => void;
  onAbrirTableroHurtos?: () => void;
  onAbrirBancoMultifuente?: () => void;
}

export function GeovisorControles({
  capas,
  onToggleCapa,
  anioHurto = null,
  onAnioHurtoChange,
  onAbrirTableroHurtos,
  onAbrirBancoMultifuente,
}: GeovisorControlesProps) {
  const { data: capasApi = [] } = useCapasGeovisor();
  const [seccionHurtosAbierta, setSeccionHurtosAbierta] = useState(true);
  const [seccionOficialesAbierta, setSeccionOficialesAbierta] = useState(true);

  // Clasificamos las capas de la API
  const capasOficiales = capasApi.filter(
    (c: CapaEspacial) => !c.codigo?.startsWith("HURTO_")
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 shadow-xs text-xs">
      {/* 1. Accesos Directos a los Bancos de Datos */}
      <div className="space-y-1.5 pb-2 border-b border-[var(--border)]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Vistas Analíticas Integradas
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {onAbrirBancoMultifuente && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onAbrirBancoMultifuente}
              className="w-full h-8 justify-start gap-2 text-xs font-semibold bg-[var(--ember)] text-[var(--ember-foreground)] hover:bg-[var(--ember)]/90"
            >
              <Database className="size-3.5 shrink-0" />
              <span>Banco Multifuente (2.449 Indicadores)</span>
            </Button>
          )}

          {onAbrirTableroHurtos && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAbrirTableroHurtos}
              data-testid="btn-sidebar-ver-estadisticas"
              className="w-full h-8 justify-start gap-2 text-xs font-semibold border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            >
              <ShieldAlert className="size-3.5 shrink-0 text-warning" />
              <span>Analítica de Hurtos (SIEDCO 2018–2026)</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Capas Oficiales del Sistema (Multifuente) */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSeccionOficialesAbierta((v) => !v)}
          className="h-auto w-full items-center justify-between px-0 py-1 font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] hover:bg-transparent hover:text-[var(--ember)]"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[var(--ember)]" />
            <span>Capas Multifuente ({capasOficiales.length || 10})</span>
          </div>
          {seccionOficialesAbierta ? (
            <ChevronUp className="size-3.5 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="size-3.5 text-[var(--text-tertiary)]" />
          )}
        </Button>

        {seccionOficialesAbierta && (
          <div className="space-y-2 pl-0.5">
            {capasOficiales.length > 0 ? (
              capasOficiales.map((c: CapaEspacial) => {
                const key = c.codigo ?? c.id;
                const estaActiva = Boolean(capas[key]);
                return (
                  <Label
                    key={c.id}
                    htmlFor={`capa-${key}`}
                    className="flex items-start justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal p-1.5 rounded-lg hover:bg-[var(--surface-0)] border border-transparent hover:border-[var(--border)]/60 transition-all"
                  >
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <Checkbox
                        checked={estaActiva}
                        onCheckedChange={() => onToggleCapa(key)}
                        id={`capa-${key}`}
                        className="mt-0.5"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-[11px] leading-tight text-[var(--text-primary)]">
                          {c.nombre}
                        </span>
                        {c.categoria && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {c.categoria}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="size-2.5 rounded-full shrink-0 mt-1 shadow-xs"
                      style={{ backgroundColor: c.color_hex || "var(--ember)" }}
                    />
                  </Label>
                );
              })
            ) : (
              <div className="text-[11px] text-[var(--text-secondary)] py-1">
                Cargando capas temáticas oficiales...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Capas Delictivas SIEDCO (Hurtos) */}
      <div className="space-y-2 border-t border-[var(--border)] pt-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSeccionHurtosAbierta((v) => !v)}
          className="h-auto w-full items-center justify-between px-0 py-1 font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] hover:bg-transparent hover:text-[var(--ember)]"
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 text-warning" />
            <span>Hurtos SIEDCO (2018–2026)</span>
          </div>
          {seccionHurtosAbierta ? (
            <ChevronUp className="size-3.5 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="size-3.5 text-[var(--text-tertiary)]" />
          )}
        </Button>

        {seccionHurtosAbierta && (
          <div className="space-y-2 pl-0.5">
            <Label
              htmlFor="capa-hurto-motos"
              className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal p-1 rounded-md hover:bg-[var(--surface-0)]"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={Boolean(capas.hurtoMotocicletas)}
                  onCheckedChange={() => onToggleCapa("hurtoMotocicletas")}
                  id="capa-hurto-motos"
                />
                <span className="font-medium text-xs">
                  Hurto Motocicletas{" "}
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    (4.683 casos)
                  </span>
                </span>
              </div>
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "#f97316" }} />
            </Label>

            <Label
              htmlFor="capa-hurto-residencias"
              className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal p-1 rounded-md hover:bg-[var(--surface-0)]"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={Boolean(capas.hurtoResidencias)}
                  onCheckedChange={() => onToggleCapa("hurtoResidencias")}
                  id="capa-hurto-residencias"
                />
                <span className="font-medium text-xs">
                  Hurto Residencias{" "}
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    (5.044 casos)
                  </span>
                </span>
              </div>
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "#8b5cf6" }} />
            </Label>

            <Label
              htmlFor="capa-hurto-comercio"
              className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal p-1 rounded-md hover:bg-[var(--surface-0)]"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={Boolean(capas.hurtoComercio)}
                  onCheckedChange={() => onToggleCapa("hurtoComercio")}
                  id="capa-hurto-comercio"
                />
                <span className="font-medium text-xs">
                  Hurto Comercio{" "}
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    (8.515 casos)
                  </span>
                </span>
              </div>
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: "#06b6d4" }} />
            </Label>

            {/* Selector de Año Delictivo */}
            <div className="pt-1.5 space-y-1">
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
                  className="w-full h-7 text-[11px]"
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
          </div>
        )}
      </div>

      {/* 4. Toggle de Etiquetas */}
      <div className="border-t border-[var(--border)] pt-2">
        <Label
          htmlFor="capa-etiquetas"
          className="flex items-center justify-between gap-2 cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] font-normal"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(capas.etiquetas)}
              onCheckedChange={() => onToggleCapa("etiquetas")}
              id="capa-etiquetas"
            />
            <span className="font-medium text-xs">Etiquetas de Polígonos</span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] font-bold">Aa</span>
        </Label>
      </div>
    </div>
  );
}
