"use client";

import { useState, useMemo } from "react";
import {
  BARRIOS_CARTAGENA,
  type BarrioCartagena,
} from "../data/barrios-cartagena";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { MapPin, Scale, Search } from "lucide-react";

interface BarrioSelectorProps {
  barrioSeleccionado: BarrioCartagena;
  onCambiarBarrio: (barrio: BarrioCartagena) => void;
}

export function BarrioSelector({
  barrioSeleccionado,
  onCambiarBarrio,
}: BarrioSelectorProps) {
  const [busqueda, setBusqueda] = useState("");
  const destacados = BARRIOS_CARTAGENA.filter((b) => b.destacado);

  const barriosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return BARRIOS_CARTAGENA;
    return BARRIOS_CARTAGENA.filter(
      (b) =>
        b.nombre.toLowerCase().includes(q) ||
        b.localidad.toLowerCase().includes(q) ||
        (b.ucg && `ucg ${b.ucg}`.toLowerCase().includes(q))
    );
  }, [busqueda]);

  const porLocalidad = useMemo(() => {
    return {
      1: barriosFiltrados.filter((b) => b.localidadNumero === 1),
      2: barriosFiltrados.filter((b) => b.localidadNumero === 2),
      3: barriosFiltrados.filter((b) => b.localidadNumero === 3),
    };
  }, [barriosFiltrados]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ember-soft)] text-[var(--ember)] border border-[var(--border)]">
            <MapPin className="size-4" strokeWidth={2} />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Territorio Seleccionado
            </span>
            <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight flex items-center gap-2">
              <span>{barrioSeleccionado.nombre}</span>
              <span className="text-[11px] font-mono text-[var(--ember)] font-semibold">
                ({barrioSeleccionado.localidadNumero === 1 ? "Loc. 1" : barrioSeleccionado.localidadNumero === 2 ? "Loc. 2" : "Loc. 3"}{barrioSeleccionado.ucg ? ` • UCG ${barrioSeleccionado.ucg}` : ""})
              </span>
            </h2>
          </div>
        </div>

        {/* Selector canónico completo con los 205 barrios del POT */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative min-w-[170px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar barrio o corregimiento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 pl-8 text-xs bg-[var(--surface-0)] border-[var(--border)]"
              aria-label="Filtrar catálogo de barrios y corregimientos del POT"
            />
          </div>

          <Select
            value={barrioSeleccionado.id}
            onValueChange={(val) => {
              const encontrado = BARRIOS_CARTAGENA.find((b) => b.id === val);
              if (encontrado) onCambiarBarrio(encontrado);
            }}
          >
            <SelectTrigger
              className="w-full sm:min-w-[210px] text-xs h-9 bg-[var(--surface-0)]"
              aria-label="Seleccionar barrio o corregimiento de Cartagena"
            >
              <SelectValue placeholder="Seleccionar barrio..." />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {porLocalidad[2].length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[11px] font-bold text-[var(--ember)]">
                    Localidad 2 — De la Virgen y Turística ({porLocalidad[2].length})
                  </SelectLabel>
                  {porLocalidad[2].map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.nombre} {b.ucg ? `(UCG ${b.ucg})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {porLocalidad[3].length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[11px] font-bold text-[var(--ember)]">
                    Localidad 3 — Industrial y de la Bahía ({porLocalidad[3].length})
                  </SelectLabel>
                  {porLocalidad[3].map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.nombre} {b.ucg ? `(UCG ${b.ucg})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {porLocalidad[1].length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[11px] font-bold text-[var(--ember)]">
                    Localidad 1 — Histórica y Caribe Norte ({porLocalidad[1].length})
                  </SelectLabel>
                  {porLocalidad[1].map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.nombre} {b.ucg ? `(UCG ${b.ucg})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Nota institucional de concordancia con el POT de Cartagena */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-[11px] text-[var(--text-secondary)] flex items-start sm:items-center gap-2">
        <Scale className="size-3.5 text-[var(--ember)] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        <span className="leading-tight">
          <strong className="text-[var(--text-primary)]">Catálogo Oficial POT:</strong> El listado de 205 barrios, corregimientos e islas disponible en POLIS obedece formalmente al <strong>Plan de Ordenamiento Territorial (POT)</strong> y a las Unidades Comuneras de Gobierno (UCG) de Cartagena de Indias.
        </span>
      </div>

      {/* Chips de acceso rápido táctil para celulares */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-tertiary)] mr-1">
          Barrios populares frecuentes:
        </span>
        {destacados.slice(0, 6).map((b) => {
          const activo = b.id === barrioSeleccionado.id;
          return (
            <Button
              key={b.id}
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => onCambiarBarrio(b)}
              aria-pressed={activo}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                activo
                  ? "bg-[var(--ember)] text-[var(--text-inverse)] shadow-xs"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border)]"
              }`}
            >
              {b.nombre}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
