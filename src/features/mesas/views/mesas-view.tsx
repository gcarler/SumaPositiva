"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { EmptyState } from "@/shared/ui/empty-state";

import { Button } from "@/shared/ui/button";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Landmark,
  MapPin,
  Plus,
  Users,
  Users2,
  ArrowRight,
} from "lucide-react";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { usePanels } from "@/core/panels/panel-store";

/**
 * Vista de Mesas de Trabajo — Área de trabajo participativa.
 * Muestra el catálogo de mesas deliberativas y permite crear nuevas.
 * Siguiendo la arquitectura Zero-Modals, cada tarjeta abre el panel correspondiente.
 */

export function MesasView() {
  const reducedMotion = useReducedMotion();
  const mesas = useMesasStore((s) => s.mesas);
  const { openPanel } = usePanels();
  const [busqueda, setBusqueda] = useState("");

  const mesasFiltradas = mesas.filter((m) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      m.nombre.toLowerCase().includes(q) ||
      m.entidad.toLowerCase().includes(q) ||
      m.lugar.toLowerCase().includes(q) ||
      m.facilitador.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid py-12 md:py-14 lg:py-16">
      <PageHeader
        eyebrow="Área de trabajo"
        title="Mesas de trabajo"
        description="Espacios de deliberación para construir acuerdos y documentar árboles de problemas y soluciones, en comunidad."
        action={
          <Button onClick={() => openPanel("mesa-editor", {})}>
            <Plus className="size-4" aria-hidden="true" />
            Crear mesa
          </Button>
        }
      />
      <SearchField
        className="mt-8 max-w-lg"
        label="Buscar mesas de trabajo"
        value={busqueda}
        onValueChange={setBusqueda}
        placeholder="Buscar por nombre, entidad, lugar o facilitador…"
      />

      {/* Listado de mesas */}
      <div className="mt-8">
        {mesasFiltradas.length === 0 ? (
          <EmptyState
            icon={<Users2 />}
            title="No se encontraron mesas de trabajo"
            description="Prueba con otro término o crea una mesa para comenzar a construir acuerdos."
            action={
              <Button variant="outline" onClick={() => setBusqueda("")}>
                Limpiar búsqueda
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {mesasFiltradas.map((mesa, idx) => (
              <motion.button
                type="button"
                key={mesa.id}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => openPanel("mesa", { mesaId: mesa.id })}
                className="ui-interactive-card group relative flex min-w-0 flex-col justify-between p-6 text-left"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--ember)]">
                      <Landmark className="size-3.5" strokeWidth={1.5} />
                      {mesa.entidad}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" strokeWidth={1.5} />
                      {format(new Date(mesa.fecha), "d 'de' MMMM, yyyy", {
                        locale: es,
                      })}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--ember)] transition-colors line-clamp-2">
                    {mesa.nombre}
                  </h2>

                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <MapPin
                      className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                      strokeWidth={1.5}
                    />
                    <span className="truncate">{mesa.lugar}</span>
                  </div>

                  {mesa.plenaria.acuerdos ? (
                    <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)] border-l-2 border-[var(--border)] pl-3">
                      {mesa.plenaria.acuerdos}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap gap-3 items-center justify-between border-t border-[var(--border)] pt-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-[var(--text-tertiary)]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" strokeWidth={1.5} />
                      {mesa.totalAsistentes} asistentes
                    </span>
                    <span>
                      {mesa.submesas.length} submesa
                      {mesa.submesas.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] group-hover:translate-x-0.5 transition-transform">
                    Ver acta <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
