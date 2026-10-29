"use client";

import {useMemo, useState} from "react";
import {HeroPageBanner} from "@/features/politicas/components/hero-page-banner";
import {SearchField} from "@/shared/ui/search-field";
import {FilterChip} from "@/shared/ui/filter-chip";
import {EmptyState} from "@/shared/ui/empty-state";
import {Button} from "@/shared/ui/button";
import {motion, useReducedMotion} from "framer-motion";
import {Search, RotateCcw, ArrowUpRight, MessageSquare, Layers, Building2} from "lucide-react";
import {useFases, useLineas, usePoliticas} from "@/features/politicas/services/use-politicas-queries";
import {usePanels} from "@/core/panels/panel-store";
import {FlujoInversionGobernanza} from "@/features/politicas/components/flujo-inversion-gobernanza";

/**
 * Vista Explorar — catálogo de líneas estratégicas de la Política Pública
 * de Seguridad Humana Integral de Cartagena (2026–2036).
 * Al hacer clic en una línea, se abre el panel lateral L3 (Zero-Modals).
 */

/** Quita el prefijo "Fase N" redundante del nombre sembrado de la fase. */
function limpiarPrefijoFase(nombre: string): string {
  return nombre.replace(/^Fase\s*\d+\s*[:·-]\s*/, "");
}

export function ExplorarView() {
  const reducedMotion = useReducedMotion();
  const { openPanel } = usePanels();

  const [faseFiltro, setFaseFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [pestana, setPestana] = useState<"lineas" | "gobernanza">("lineas");

  const politicasQuery = usePoliticas();
  const politicaPrincipal = politicasQuery.data?.[0];
  const fasesQuery = useFases();
  const lineasQuery = useLineas();
  const fases = fasesQuery.data ?? [];
  const lineasApi = lineasQuery.data ?? [];

  /* Obtener todas las líneas estratégicas con su fase correspondiente */
  const todasLasLineas = useMemo(() => {
    const faseMap = new Map(fases.map((f) => [f.id, f]));
    return lineasApi.map((linea) => {
      const fase = faseMap.get(linea.fase_id);
      return {
        id: linea.id,
        faseId: linea.fase_id,
        codigo: linea.codigo,
        titulo: linea.titulo,
        descripcion: linea.descripcion,
        aportes: [],
        aportesCount: linea.aportes_count ?? 0,
        faseNombre: fase?.nombre ?? "Fase de la política",
        faseOrden: fase?.orden ?? 1,
        faseEstado: fase?.estado ?? "activa",
      };
    });
  }, [fases, lineasApi]);

  /* TCA-04/TCA-05: los chips de fase muestran TODO el catálogo, no solo las
     fases con líneas publicadas — la secuencia debe coincidir con la
     estructura real del proceso; una fase sin líneas muestra su estado vacío
     explícito al filtrar. */
  const fasesDisponibles = fases;

  /* Filtro reactivo */
  const lineasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todasLasLineas.filter((linea) => {
      if (faseFiltro !== "todas" && linea.faseId !== faseFiltro) {
        return false;
      }
      if (q) {
        const texto = `${linea.codigo} ${linea.titulo} ${linea.descripcion} ${linea.faseNombre}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [todasLasLineas, faseFiltro, busqueda]);

  const hayFiltros = faseFiltro !== "todas" || busqueda !== "";

  const reset = () => {
    setFaseFiltro("todas");
    setBusqueda("");
  };

  return (
    <div className="container-fluid py-8 md:py-10 lg:py-12">
      <HeroPageBanner
        pageKey="explorar"
        className="mb-8"
      />

      {/* ---------- Selector de Pestañas ---------- */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
        <Button
          variant={pestana === "lineas" ? "default" : "outline"}
          size="sm"
          type="button"
          onClick={() => setPestana("lineas")}
          className="gap-2"
        >
          <Layers className="size-4" />
          <span>Líneas Estratégicas ({todasLasLineas.length})</span>
        </Button>
        <Button
          variant={pestana === "gobernanza" ? "default" : "outline"}
          size="sm"
          type="button"
          onClick={() => setPestana("gobernanza")}
          className="gap-2"
        >
          <Building2 className="size-4" />
          <span>Mapa de Inversión y Gobernanza (27 Dependencias)</span>
        </Button>
      </div>

      {pestana === "gobernanza" ? (
        <div className="mt-8">
          <FlujoInversionGobernanza />
        </div>
      ) : (
        <>
          {/* ---------- Filtros ---------- */}
          <div className="mt-8 space-y-4">
        {/* Búsqueda */}
        <SearchField
          className="max-w-lg"
          label="Buscar líneas estratégicas"
          value={busqueda}
          onValueChange={setBusqueda}
          placeholder="Buscar por código, título, fase o palabra clave…"
        />

        {/* Filtro por Fase de Política */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por fase de política"
        >
          <FilterChip
            active={faseFiltro === "todas"}
            onClick={() => setFaseFiltro("todas")}
          >
            Todas las fases
          </FilterChip>
          {fasesDisponibles.map((fase) => (
            <FilterChip
              key={fase.id}
              active={faseFiltro === fase.id}
              onClick={() =>
                setFaseFiltro(faseFiltro === fase.id ? "todas" : fase.id)
              }
            >
              {/* TCA-05: el nombre sembrado ya incluye el prefijo "Fase N:";
                  se elimina para no duplicar la referencia y conservar una
                  sola numeración visible. */}
              Fase 0{fase.orden}: {limpiarPrefijoFase(fase.nombre)}
            </FilterChip>
          ))}
        </div>
      </div>

      <h2 className="sr-only">Resultados de líneas estratégicas</h2>

      {/* ---------- Contador y Limpiar ---------- */}
      <div className="mt-8 flex items-center justify-between">
        <p
          className="text-xs text-[var(--text-tertiary)] tabular"
          aria-live="polite"
        >
          {lineasFiltradas.length}{" "}
          {lineasFiltradas.length === 1
            ? "línea estratégica"
            : "líneas estratégicas"}
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

      {/* ---------- Resultados ---------- */}
      {lineasFiltradas.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Search />}
          title="Sin resultados para esta búsqueda"
          description="Prueba con otro término o selecciona otra fase para consultar las líneas disponibles."
          action={
            <Button variant="outline" onClick={reset}>
              Ver todas las líneas
            </Button>
          }
        />
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lineasFiltradas.map((linea, index) => {
            return (
              <motion.button
                key={linea.id}
                type="button"
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.04,
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() =>
                  openPanel("linea", {
                    politicaId: politicaPrincipal?.id ?? "pol-001",
                    faseId: linea.faseId,
                    lineaId: linea.id,
                  })
                }
                className="ui-interactive-card group relative flex h-full w-full flex-col justify-between p-6 text-left"
              >
                <div>
                  {/* Cabecera de la tarjeta */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tracking-wider text-[var(--ember)]">
                      {linea.codigo}
                    </span>
                    <ArrowUpRight
                      className="size-4 text-[var(--text-tertiary)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      strokeWidth={1.75}
                    />
                  </div>

                  {/* Título y descripción */}
                  <h3 className="mt-3.5 text-base font-semibold leading-snug tracking-tight text-[var(--text-primary)]">
                    {linea.titulo}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {linea.descripcion}
                  </p>
                </div>

                {/* Pie con metadatos de Fase y Aportes */}
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
                    <span className="truncate">Fase 0{linea.faseOrden}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                    <MessageSquare className="size-3.5 text-[var(--ember)]" />
                    <span>
                      {linea.aportesCount > 0
                        ? `${linea.aportesCount} ${linea.aportesCount === 1 ? "aporte" : "aportes"} · Ver aportes`
                        : "Ver aportes"}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
