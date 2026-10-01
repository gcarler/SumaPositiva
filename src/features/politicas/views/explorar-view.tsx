"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { FilterChip } from "@/shared/ui/filter-chip";
import { EmptyState } from "@/shared/ui/empty-state";

import { Button } from "@/shared/ui/button";

import { motion } from "framer-motion";
import { Search, RotateCcw } from "lucide-react";
import {
  usePoliticasFiltradas,
  usePoliticasStore,
} from "@/features/politicas/state/politicas-store";
import {
  ESTADO_META,
  SECTOR_META,
  type EstadoPolitica,
  type Sector,
} from "@/features/politicas/models/politicas";
import { PoliticaCard } from "@/features/politicas/components/politica-card";

/**
 * Vista Explorar — catálogo de políticas con búsqueda y filtros.
 * Cada tarjeta abre el panel L1 (Zero-Modals).
 */

const SECTORES = Object.entries(SECTOR_META) as [Sector, { label: string }][];
const ESTADOS = Object.entries(ESTADO_META) as [
  EstadoPolitica,
  { label: string },
][];

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
      <PageHeader
        eyebrow="Catálogo"
        title="Políticas públicas en proceso"
        description="Cada política avanza por fases. Explora sus líneas estratégicas y aporta donde tu experiencia pueda hacer la diferencia."
      />

      {/* ---------- Filtros ---------- */}
      <div className="mt-10 space-y-4">
        {/* Búsqueda */}
        <SearchField
          className="max-w-lg"
          label="Buscar políticas"
          value={busqueda}
          onValueChange={setBusqueda}
          placeholder="Buscar por título, resumen o problema…"
        />

        {/* Estado */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por estado"
        >
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
              onClick={() =>
                setEstadoFiltro(estadoFiltro === id ? "todos" : id)
              }
            >
              {meta.label}
            </FilterChip>
          ))}
        </div>

        {/* Sector */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por sector"
        >
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
              onClick={() =>
                setSectorFiltro(sectorFiltro === id ? "todos" : id)
              }
            >
              {meta.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <h2 className="sr-only">Resultados de políticas</h2>
      {/* ---------- Resultados ---------- */}
      <div className="mt-8 flex items-center justify-between">
        <p
          className="text-xs text-[var(--text-tertiary)] tabular"
          aria-live="polite"
        >
          {politicas.length} {politicas.length === 1 ? "política" : "políticas"}
        </p>
        {hayFiltros && (
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--ember)]"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.5} />
            Limpiar filtros
          </Button>
        )}
      </div>

      {politicas.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Search />}
          title="Sin resultados para estos filtros"
          description="Prueba con otro término o ajusta los filtros para encontrar una política."
          action={
            <Button variant="outline" onClick={reset}>
              Ver todas las políticas
            </Button>
          }
        />
      ) : (
        <motion.div
          key={`${sectorFiltro}-${estadoFiltro}-${busqueda}`}
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {politicas.map((p, i) => (
            <PoliticaCard key={p.id} politica={p} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
