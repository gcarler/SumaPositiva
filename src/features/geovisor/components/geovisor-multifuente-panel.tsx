"use client";

import React, { useState, useMemo } from "react";
import {
  Database,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building2,
  RefreshCw,
  Layers,
  Check,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  useIndicadoresGeovisor,
  useIndicadoresFuente,
} from "../services/use-geovisor-queries";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";
import type { IndicadorMultifuente } from "../models/geovisor";
import { useGeovisorAnaliticaStore } from "../state/geovisor-analitica-store";
import { useAnaliticaMultifuente } from "../services/analitica-multifuente-api";
import { MultifuenteFiltros } from "./multifuente-filtros";

export interface GeovisorMultifuentePanelProps {
  territorioId?: string;
  onSelectTerritorio?: (id: string) => void;
  datosIniciales?: {
    total: number;
    limit: number;
    offset: number;
    indicadores: IndicadorMultifuente[];
  };
  cargandoInicial?: boolean;
}

export function GeovisorMultifuentePanel({
  onSelectTerritorio,
  datosIniciales,
  cargandoInicial = false,
}: GeovisorMultifuentePanelProps) {
  const compartidos = useGeovisorAnaliticaStore((s) => s.filtros);
  const seleccionarObservacion = useGeovisorAnaliticaStore((s) => s.seleccionarObservacion);
  const { data: analitica } = useAnaliticaMultifuente(datosIniciales === undefined);
  const firmaFiltros = JSON.stringify(compartidos);
  const [paginacion, setPaginacion] = useState({ firma: firmaFiltros, pagina: 0 });
  const pagina = paginacion.firma === firmaFiltros ? paginacion.pagina : 0;
  const setPagina = (valor: number | ((actual: number) => number)) => setPaginacion({ firma: firmaFiltros, pagina: typeof valor === "function" ? valor(pagina) : valor });
  const limite = 30;
  const indicadoresActivos = useGeovisorLayoutStore((s) => s.indicadoresMultifuenteActivos);
  const toggleIndicadorMultifuente = useGeovisorLayoutStore((s) => s.toggleIndicadorMultifuente);
  const filtros = useMemo(() => ({
    ...compartidos, limit: limite, offset: pagina * limite, fuente_exacta: true,
  }), [compartidos, pagina]);

  const {
    data: dataQuery,
    isLoading: isLoadingQuery,
    isError,
    refetch,
  } = useIndicadoresGeovisor(filtros);

  const data = datosIniciales ?? dataQuery;
  const isLoading = cargandoInicial || (isLoadingQuery && !datosIniciales);

  const indicadores: IndicadorMultifuente[] = data?.indicadores ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.ceil(total / limite);
  const { data: fuentesApi = [] } = useIndicadoresFuente();
  const totalBanco = fuentesApi.reduce((suma, item) => suma + item.total, 0);
  const renderBadgeRiesgo = (nivel: string) => {
    const n = nivel?.toLowerCase();
    if (n === "critico") {
      return (
        <Badge
          variant="destructive"
          className="text-[10px] px-1.5 font-semibold"
        >
          Crítico
        </Badge>
      );
    }
    if (n === "alto") {
      return (
        <Badge variant="warning" className="text-[10px] px-1.5 font-semibold">
          Alto
        </Badge>
      );
    }
    if (n === "medio") {
      return (
        <Badge variant="info" className="text-[10px] px-1.5 font-semibold">
          Medio
        </Badge>
      );
    }
    if (n === "bajo") {
      return (
        <Badge variant="success" className="text-[10px] px-1.5 font-semibold">
          Bajo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 font-semibold">
        Sin evaluar
      </Badge>
    );
  };

  return (
    <div
      role="region"
      aria-label="Panel del Banco Multifuente Oficial"
      className="flex flex-col h-full bg-[var(--surface-1)] text-xs text-[var(--text-primary)]"
    >
      {/* 1. Header con estadísticas consolidadas */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-0)]/50 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--ember)]/10 text-[var(--ember)]">
              <Database className="size-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Banco Multifuente de Seguridad Humana
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {fuentesApi.length > 0
                  ? `${fuentesApi.length} grupos de fuentes · ${totalBanco.toLocaleString("es-CO")} observaciones territoriales`
                  : "Consultando catálogo de fuentes"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-medium text-[var(--text-tertiary)]">
              {total.toLocaleString("es-CO")} indicadores encontrados
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => refetch()}
              title="Refrescar indicadores"
              aria-label="Refrescar indicadores"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

      </div>
      <div className="shrink-0 p-3">
        <MultifuenteFiltros datos={analitica} onTerritorioChange={onSelectTerritorio} />
      </div>

      {/* 4. Lista o Grid de Indicadores */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-[var(--ember)] border-t-transparent" />
            <span>Consultando banco de fuentes oficial...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-destructive gap-2">
            <AlertCircle className="size-6" />
            <span>
              No fue posible cargar los indicadores desde el servidor.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs mt-2"
            >
              Reintentar
            </Button>
          </div>
        ) : indicadores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] gap-2 text-center">
            <Filter className="size-7 text-[var(--text-tertiary)] opacity-60" />
            <p className="font-medium text-xs">
              No se encontraron indicadores con los filtros actuales.
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Prueba cambiando la dimensión, borrando la búsqueda o
              seleccionando todas las entidades.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {indicadores.map((ind) => {
              const numValor =
                typeof ind.valor === "number"
                  ? ind.valor
                  : parseFloat(String(ind.valor));
              const valorFormateado = !isNaN(numValor)
                ? numValor % 1 === 0
                  ? numValor.toLocaleString("es-CO")
                  : numValor.toLocaleString("es-CO", {
                      maximumFractionDigits: 2,
                    })
                : String(ind.valor);

              const meta = ind.metadatos ?? {};
              const urlFuente =
                typeof meta.url_fuente === "string" ? meta.url_fuente : null;
              const nota =
                typeof meta.nota_origen === "string" ? meta.nota_origen : null;

              return (
                <article
                  key={ind.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-xs hover:border-[var(--ember)]/40 transition-colors flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ember)]">
                        {ind.nombre_dimension ??
                          ind.codigo_dimension ??
                          "Seguridad Humana"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {renderBadgeRiesgo(ind.nivel_riesgo)}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-2)] text-[var(--text-secondary)]">
                          {ind.anio_corte}
                        </span>
                      </div>
                    </div>

                    <h3
                      className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2"
                      title={ind.nombre_indicador}
                    >
                      {ind.nombre_indicador}
                    </h3>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-[var(--border)]/60">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[18px] font-extrabold font-mono text-[var(--text-primary)]">
                        {valorFormateado}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                        {ind.unidad_medida}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-1">
                      <div
                        className="flex items-center gap-1 truncate max-w-[70%]"
                        title={ind.nombre_territorio ?? ind.codigo_territorio}
                      >
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">
                          {ind.nombre_territorio ??
                            ind.codigo_territorio ??
                            "Distrito"}
                        </span>
                      </div>
                      <span
                        className="truncate text-right font-medium text-[var(--text-secondary)]"
                        title={ind.fuente_datos}
                      >
                        {ind.fuente_datos?.split("-")[0]?.trim()}
                      </span>
                    </div>

                    {(urlFuente || nota) && (
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        {nota && (
                          <span
                            className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[85%]"
                            title={nota}
                          >
                            {nota}
                          </span>
                        )}
                        {urlFuente && (
                          <a
                            href={urlFuente}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[var(--ember)] hover:underline ml-auto shrink-0 font-medium"
                            title="Consultar procedencia declarada"
                          >
                            <span>Fuente</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => {
                        onSelectTerritorio?.(ind.codigo_territorio ?? ind.territorio_id);
                        seleccionarObservacion(ind);
                        useGeovisorLayoutStore.getState().openView("graficos");
                      }} aria-label={`Ver serie de ${ind.nombre_indicador}`}>
                        Ver serie
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          indicadoresActivos.some((item) => item.id === ind.id)
                            ? "ember"
                            : "outline"
                        }
                        onClick={() => {
                          toggleIndicadorMultifuente(ind);
                        }}
                        className="h-7 px-2.5 text-2xs gap-1.5 transition-colors"
                        title={
                          indicadoresActivos.some((item) => item.id === ind.id)
                            ? "Quitar este indicador del mapa"
                            : "Pintar este indicador en el mapa"
                        }
                      >
                        {indicadoresActivos.some(
                          (item) => item.id === ind.id,
                        ) ? (
                          <>
                            <Check className="size-3" aria-hidden="true" />
                            <span>Pintado en mapa</span>
                          </>
                        ) : (
                          <>
                            <Layers className="size-3" aria-hidden="true" />
                            <span>Pintar en mapa</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* 5. Paginación */}
      {totalPaginas > 1 && (
        <div className="p-2.5 border-t border-[var(--border)] bg-[var(--surface-0)] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--text-secondary)]">
            Mostrando {pagina * limite + 1}–
            {Math.min((pagina + 1) * limite, total)} de{" "}
            {total.toLocaleString("es-CO")}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              className="h-7 px-2 text-xs gap-1"
            >
              <ChevronLeft className="size-3" />
              <span>Anterior</span>
            </Button>
            <span className="text-[11px] font-mono px-2 text-[var(--text-primary)]">
              {pagina + 1} / {totalPaginas}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina((p) => p + 1)}
              className="h-7 px-2 text-xs gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
