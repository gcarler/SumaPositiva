"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Landmark,
  MapPin,
  Users,
  Users2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { EmptyState } from "@/shared/ui/empty-state";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useMesas } from "@/features/mesas/services/use-mesas-queries";
import { usePanels } from "@/core/panels/panel-store";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import type { MesaDeTrabajo } from "@/features/mesas/models/mesas";

type CategoriaMesa =
  | "TODAS"
  | "TERRITORIAL"
  | "RURAL_INSULAR"
  | "POBLACIONAL"
  | "SECTORIAL";

const CATEGORIAS: { id: CategoriaMesa; label: string; shortLabel: string }[] = [
  { id: "TODAS", label: "Todas las Mesas", shortLabel: "Todas" },
  { id: "TERRITORIAL", label: "Territoriales", shortLabel: "Territoriales" },
  {
    id: "RURAL_INSULAR",
    label: "Rurales e Insulares",
    shortLabel: "Rurales / Insulares",
  },
  { id: "POBLACIONAL", label: "Poblacionales", shortLabel: "Poblacionales" },
  { id: "SECTORIAL", label: "Sectoriales", shortLabel: "Sectoriales" },
];

function obtenerCategoria(mesa: MesaDeTrabajo): CategoriaMesa {
  const tipo = (mesa.tipoMesa || "").toUpperCase();
  if (tipo.includes("TERRITORIAL")) return "TERRITORIAL";
  if (tipo.includes("RURAL") || tipo.includes("INSULAR")) return "RURAL_INSULAR";
  if (tipo.includes("POBLACIONAL") || tipo.includes("ETN")) return "POBLACIONAL";
  if (tipo.includes("SECTORIAL")) return "SECTORIAL";

  const cod = (mesa.codigoOficial || "").toUpperCase();
  if (cod.startsWith("MT-")) return "TERRITORIAL";
  if (cod.startsWith("MR-")) return "RURAL_INSULAR";
  if (cod.startsWith("MP-")) return "POBLACIONAL";
  if (cod.startsWith("MS-")) return "SECTORIAL";

  return "SECTORIAL";
}

const ELEMENTOS_POR_PAGINA = 12;

/**
 * Vista pública de Mesas de Trabajo — Ciudadanía y Concertación.
 * Permite consultar el catálogo oficial de mesas distritales,
 * filtrar por categoría territorial/sectorial/poblacional,
 * y acceder a la planilla de asistencia o al acta comunitaria concertada.
 */
export function MesasView() {
  const reducedMotion = useReducedMotion();
  const { data: mesasRemotas } = useMesas();
  const mesasStore = useMesasStore((s) => s.mesas);
  const mesas = mesasRemotas ?? mesasStore;
  const { openPanel } = usePanels();
  const setVista = useNavigationStore((s) => s.setVista);

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<CategoriaMesa>("TODAS");
  const [pagina, setPagina] = useState(1);

  // Conteo por categoría
  const conteos = useMemo(() => {
    const counts: Record<CategoriaMesa, number> = {
      TODAS: mesas.length,
      TERRITORIAL: 0,
      RURAL_INSULAR: 0,
      POBLACIONAL: 0,
      SECTORIAL: 0,
    };
    for (const m of mesas) {
      const cat = obtenerCategoria(m);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [mesas]);

  // Filtrado compuesto
  const mesasFiltradas = useMemo(() => {
    return mesas.filter((m) => {
      // Filtro por categoría
      if (categoria !== "TODAS") {
        if (obtenerCategoria(m) !== categoria) return false;
      }
      // Filtro por búsqueda
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        m.nombre.toLowerCase().includes(q) ||
        m.entidad.toLowerCase().includes(q) ||
        m.lugar.toLowerCase().includes(q) ||
        m.facilitador.toLowerCase().includes(q) ||
        (m.codigoOficial && m.codigoOficial.toLowerCase().includes(q))
      );
    });
  }, [mesas, categoria, busqueda]);

  // Paginación
  const totalPaginas = Math.ceil(mesasFiltradas.length / ELEMENTOS_POR_PAGINA) || 1;
  const paginaAjustada = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAjustada - 1) * ELEMENTOS_POR_PAGINA;
  const mesasPaginadas = mesasFiltradas.slice(inicio, inicio + ELEMENTOS_POR_PAGINA);

  const cambiarCategoria = (cat: CategoriaMesa) => {
    setCategoria(cat);
    setPagina(1);
  };

  const cambiarBusqueda = (val: string) => {
    setBusqueda(val);
    setPagina(1);
  };

  return (
    <div className="container-fluid py-12 md:py-14 lg:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="Participación Ciudadana Distrital"
          title="Mesas de trabajo"
          description="Espacios de concertación y deliberación para construir acuerdos y documentar árboles de problemas y soluciones (Decreto Distrital 037/2026)."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVista("geovisor")}
            className="gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <MapPin className="size-3.5 text-[var(--ember)]" />
            <span className="hidden sm:inline">Ver en Geovisor</span>
          </Button>
        </div>
      </div>

      {/* Pestañas por Categoría */}
      <div className="mt-8 flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] pb-3">
        {CATEGORIAS.map((cat) => {
          const activa = categoria === cat.id;
          const count = conteos[cat.id] ?? 0;
          return (
            <Button
              variant="unstyled"
              size="unstyled"
              key={cat.id}
              type="button"
              onClick={() => cambiarCategoria(cat.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                activa
                  ? "bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>{cat.shortLabel}</span>
              <Badge
                variant={activa ? "default" : "secondary"}
                className={`text-[10px] px-1.5 py-0 h-4.5 ${
                  activa
                    ? "bg-[var(--surface-1)] text-[var(--text-primary)]"
                    : "bg-[var(--surface-3)] text-[var(--text-secondary)]"
                }`}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Buscador y Metadatos de Resultados */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          className="max-w-md w-full"
          label="Buscar mesas de trabajo"
          value={busqueda}
          onValueChange={cambiarBusqueda}
          placeholder="Buscar por nombre, barrio, corregimiento o código…"
        />
        <span className="text-xs text-[var(--text-tertiary)]">
          Mostrando {mesasFiltradas.length === 0 ? 0 : inicio + 1}–
          {Math.min(inicio + ELEMENTOS_POR_PAGINA, mesasFiltradas.length)} de{" "}
          <strong className="font-semibold text-[var(--text-primary)]">
            {mesasFiltradas.length}
          </strong>{" "}
          mesas
        </span>
      </div>

      {/* Listado de mesas */}
      <div className="mt-8">
        {mesasFiltradas.length === 0 ? (
          <EmptyState
            icon={<Users2 />}
            title="No se encontraron mesas de trabajo"
            description={
              busqueda
                ? `No hay mesas que coincidan con "${busqueda}". Prueba con otro término.`
                : "No hay mesas registradas en esta categoría."
            }
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setBusqueda("");
                  setCategoria("TODAS");
                  setPagina(1);
                }}
              >
                Restablecer filtros
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {mesasPaginadas.map((mesa, idx) => {
                const tieneActa =
                  !!mesa.sha256Acta ||
                  (mesa.plenaria?.acuerdos && mesa.plenaria.acuerdos.trim().length > 0) ||
                  mesa.estado === "cerrada";

                let fechaFormateada = mesa.fecha;
                try {
                  const d = new Date(`${mesa.fecha.slice(0, 10)}T12:00:00`);
                  if (!isNaN(d.getTime())) {
                    fechaFormateada = format(d, "d 'de' MMMM, yyyy", { locale: es });
                  }
                } catch {}

                return (
                  <motion.div
                    role="article"
                    aria-label={`Mesa ${mesa.nombre}`}
                    key={mesa.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: reducedMotion ? 0 : Math.min((idx % 12) * 0.025, 0.2),
                    }}
                    className="ui-interactive-card group relative flex min-w-0 flex-col justify-between p-6 text-left"
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--ember)] truncate max-w-[200px]">
                          <Landmark className="size-3.5 shrink-0" strokeWidth={1.5} />
                          <span className="truncate">{mesa.entidad}</span>
                        </span>
                        {tieneActa ? (
                          <StatusBadge tone="success">
                            <CheckCircle2 className="size-3" />
                            <span>Concertada</span>
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="ember">
                            <Clock className="size-3" />
                            <span>Programada</span>
                          </StatusBadge>
                        )}
                      </div>

                      {/* Título y Código Oficial */}
                      <div className="mt-3">
                        {mesa.codigoOficial && (
                          <span className="inline-block text-[11px] font-mono font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                            {mesa.codigoOficial}
                          </span>
                        )}
                        <h2 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--ember)] transition-colors line-clamp-2 mt-0.5">
                          {mesa.nombre}
                        </h2>
                      </div>

                      {/* Lugar y Fecha */}
                      <div className="mt-3.5 flex flex-col gap-1.5 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <MapPin
                            className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                            strokeWidth={1.5}
                          />
                          <span className="truncate">{mesa.lugar}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                          <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} />
                          <span>{fechaFormateada}</span>
                        </div>
                      </div>

                      {/* Acuerdos si existen */}
                      {mesa.plenaria.acuerdos ? (
                        <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)] border-l-2 border-[var(--ember)] pl-2.5 bg-[var(--surface-2)]/40 py-1 rounded-r">
                          {mesa.plenaria.acuerdos}
                        </p>
                      ) : null}
                    </div>

                    {/* Pie de tarjeta con acciones */}
                    <div className="mt-5 flex flex-wrap gap-2 items-center justify-between border-t border-[var(--border)] pt-3.5 text-xs">
                      <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" strokeWidth={1.5} />
                          {mesa.totalAsistentes}
                        </span>
                        {mesa.submesas.length > 0 && (
                          <span>
                            {mesa.submesas.length} submesa
                            {mesa.submesas.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/asistencia/${mesa.codigoOficial?.toLowerCase() || mesa.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
                          title="Planilla de Asistencia comunitaria"
                        >
                          <ClipboardList className="size-3" />
                          <span>Asistencia</span>
                        </Link>

                        <Button
                          variant="unstyled"
                          size="unstyled"
                          type="button"
                          onClick={() => openPanel("mesa", { mesaId: mesa.id })}
                          aria-label={`Ver ${tieneActa ? "acta" : "detalle"} de la mesa ${mesa.nombre}`}
                          className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--ember)] group-hover:translate-x-0.5 transition-transform cursor-pointer"
                        >
                          <span>{tieneActa ? "Acta" : "Detalle"}</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Paginador */}
            {totalPaginas > 1 && (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--border)] pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAjustada === 1}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Anterior</span>
                </Button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => {
                    const esActual = num === paginaAjustada;
                    return (
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        key={num}
                        type="button"
                        onClick={() => setPagina(num)}
                        className={`size-8 rounded-md text-xs font-medium transition-colors ${
                          esActual
                            ? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {num}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAjustada === totalPaginas}
                  className="gap-1 text-xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
