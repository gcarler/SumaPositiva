"use client";

import { motion } from "framer-motion";
import { Search, RotateCcw } from "lucide-react";
import { usePoliticasFiltradas, usePoliticasStore } from "@/stores/politicas-store";
import {
  ESTADO_META,
  SECTOR_META,
  type EstadoPolitica,
  type Sector,
} from "@/types/domain";
import { PoliticaCard } from "@/features/politicas/components/politica-card";

/**
 * Vista Explorar — catálogo de políticas con búsqueda y filtros.
 * Cada tarjeta abre el panel L1 (Zero-Modals).
 */

const SECTORES = Object.entries(SECTOR_META) as [Sector, { label: string }][];
const ESTADOS = Object.entries(ESTADO_META) as [EstadoPolitica, { label: string }][];

export function ExplorarView() {
  const politicas = usePoliticasFiltradas();
  const sectorFiltro = usePoliticasStore((s) => s.sectorFiltro);
  const estadoFiltro = usePoliticasStore((s) => s.estadoFiltro);
  const busqueda = usePoliticasStore((s) => s.busqueda);
  const setSectorFiltro = usePoliticasStore((s) => s.setSectorFiltro);
  const setEstadoFiltro = usePoliticasStore((s) => s.setEstadoFiltro);
  const setBusqueda = usePoliticasStore((s) => s.setBusqueda);

  const hayFiltros =
    sectorFiltro !== "todos" || estadoFiltro !== "todos" || busqueda !== "";

  const reset = () => {
    setSectorFiltro("todos");
    setEstadoFiltro("todos");
    setBusqueda("");
  };

  return (
    <div className="container-fluid py-12 md:py-14 lg:py-16">
      {/* Encabezado */}
      <p className="label-micro text-[var(--text-tertiary)]">Catálogo</p>
      <h1 className="display-tight mt-2 text-3xl font-semibold text-[var(--text-primary)] md:text-4xl lg:text-5xl">
        Políticas públicas en proceso
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
        Cada política avanza por fases; dentro de cada fase puedes entrar a sus líneas
        estratégicas y aportar donde quieras hacerlo.
      </p>

      {/* ---------- Filtros ---------- */}
      <div className="mt-10 space-y-4">
        {/* Búsqueda */}
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, resumen o problema…"
            aria-label="Buscar políticas"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-1)] py-2.5 pl-10 pr-4 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--ember)] focus:outline-none"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por estado">
          <FilterChip
            active={estadoFiltro === "todos"}
            onClick={() => setEstadoFiltro("todos")}
          >
            Todos los estados
          </FilterChip>
          {ESTADOS.map(([id, meta]) => (
            <FilterChip
              key={id}
              active={estadoFiltro === id}
              onClick={() => setEstadoFiltro(estadoFiltro === id ? "todos" : id)}
            >
              {meta.label}
            </FilterChip>
          ))}
        </div>

        {/* Sector */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por sector">
          <FilterChip
            active={sectorFiltro === "todos"}
            onClick={() => setSectorFiltro("todos")}
          >
            Todos los sectores
          </FilterChip>
          {SECTORES.map(([id, meta]) => (
            <FilterChip
              key={id}
              active={sectorFiltro === id}
              onClick={() => setSectorFiltro(sectorFiltro === id ? "todos" : id)}
            >
              {meta.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* ---------- Resultados ---------- */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-[var(--text-tertiary)] tabular" aria-live="polite">
          {politicas.length} {politicas.length === 1 ? "política" : "políticas"}
        </p>
        {hayFiltros && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--ember)]"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.5} />
            Limpiar filtros
          </button>
        )}
      </div>

      {politicas.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-16 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Sin resultados para estos filtros
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-[var(--text-tertiary)]">
            Prueba con otro término de búsqueda o combina menos filtros. Las consultas
            nuevas se publican cada mes.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Ver todas las políticas
          </button>
        </div>
      ) : (
        <motion.div
          key={`${sectorFiltro}-${estadoFiltro}-${busqueda}`}
          className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),480px))] [justify-content:space-between]"
        >
          {politicas.map((p, i) => (
            <PoliticaCard key={p.id} politica={p} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
        active
          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--text-inverse)]"
          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}
