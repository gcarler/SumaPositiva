"use client";

import React, { useState, useMemo } from "react";
import {
  Database,
  Search,
  ExternalLink,
  Shield,
  Users,
  Coins,
  TreePine,
  HeartPulse,
  Utensils,
  Vote,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building2,
  RefreshCw,
  Layers,
  Check,
} from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useIndicadoresGeovisor } from "../services/use-geovisor-queries";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";
import type { IndicadorMultifuente } from "../models/geovisor";

const DIMENSIONES = [
  { id: "todas", label: "Todas las Dimensiones", icon: Database, total: "2.449" },
  { id: "personal", label: "Seguridad Personal", icon: Shield, total: "938" },
  { id: "comunitaria", label: "Seguridad Comunitaria", icon: Users, total: "688" },
  { id: "economica", label: "Seguridad Económica", icon: Coins, total: "457" },
  { id: "ambiental", label: "Seguridad Ambiental", icon: TreePine, total: "221" },
  { id: "salud", label: "Seguridad en Salud", icon: HeartPulse, total: "74" },
  { id: "alimentaria", label: "Seguridad Alimentaria", icon: Utensils, total: "60" },
  { id: "politica", label: "Seguridad Política", icon: Vote, total: "11" },
] as const;

const FUENTES_OFICIALES = [
  { id: "todas", label: "Todas las Entidades Fuente" },
  { id: "DANE", label: "DANE (Pobreza, Empleo, FIES, Demografía)" },
  { id: "Medicina Legal", label: "Instituto Nacional de Medicina Legal (Forensis)" },
  { id: "Policia", label: "Policía Nacional (SIEDCO)" },
  { id: "Fiscalia", label: "Fiscalía General de la Nación (SPOA)" },
  { id: "DNP", label: "DNP TerriData (Salud, Coberturas, Inversión)" },
  { id: "Unidad", label: "Unidad para las Víctimas (RUV / IRV)" },
  { id: "ICBF", label: "ICBF (Primera Infancia y Nutrición)" },
  { id: "INS", label: "INS / SIVICAP (Calidad de Agua Potable IRCA)" },
  { id: "Defensoria", label: "Defensoría del Pueblo (SAT Alertas Tempranas)" },
] as const;

const TERRITORIOS = [
  { id: "todos", label: "Todos los Territorios" },
  { id: "DISTRITO-CTG", label: "Distrito de Cartagena (Consolidado)" },
  { id: "LOC-1", label: "Localidad 1 — Histórica y del Caribe Norte" },
  { id: "LOC-2", label: "Localidad 2 — De la Virgen y Turística" },
  { id: "LOC-3", label: "Localidad 3 — Industrial y de la Bahía" },
] as const;

export interface GeovisorMultifuentePanelProps {
  territorioId?: string;
  onSelectTerritorio?: (id: string) => void;
  datosIniciales?: { total: number; limit: number; offset: number; indicadores: IndicadorMultifuente[] };
  cargandoInicial?: boolean;
}

export function GeovisorMultifuentePanel({
  territorioId,
  onSelectTerritorio,
  datosIniciales,
  cargandoInicial = false,
}: GeovisorMultifuentePanelProps) {
  const [dimension, setDimension] = useState<string>("todas");
  const [fuente, setFuente] = useState<string>("todas");
  const [territorioFiltro, setTerritorioFiltro] = useState<string>(
    territorioId && territorioId !== "todas" ? territorioId : "todos"
  );
  const [busqueda, setBusqueda] = useState<string>("");
  const [pagina, setPagina] = useState<number>(0);
  const limite = 30;

  const indicadorMultifuenteActivo = useGeovisorLayoutStore((s) => s.indicadorMultifuenteActivo);
  const setIndicadorMultifuenteActivo = useGeovisorLayoutStore((s) => s.setIndicadorMultifuenteActivo);

  const filtros = useMemo(() => {
    return {
      limit: limite,
      offset: pagina * limite,
      dimension: dimension === "todas" ? undefined : dimension,
      fuente_datos: fuente === "todas" ? undefined : fuente,
      codigo_territorio: territorioFiltro === "todos" ? undefined : territorioFiltro,
      busqueda: busqueda.trim() ? busqueda.trim() : undefined,
    };
  }, [dimension, fuente, territorioFiltro, busqueda, pagina]);

  const { data: dataQuery, isLoading: isLoadingQuery, isError, refetch } = useIndicadoresGeovisor(filtros);

  const data = datosIniciales ?? dataQuery;
  const isLoading = cargandoInicial || (isLoadingQuery && !datosIniciales);

  const indicadores: IndicadorMultifuente[] = data?.indicadores ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.ceil(total / limite);

  const handleCambioDimension = (nuevaDim: string) => {
    setDimension(nuevaDim);
    setPagina(0);
  };

  const handleCambioFuente = (nuevaFuente: string) => {
    setFuente(nuevaFuente);
    setPagina(0);
  };

  const handleCambioTerritorio = (nuevoTerritorio: string) => {
    setTerritorioFiltro(nuevoTerritorio);
    setPagina(0);
    if (onSelectTerritorio && nuevoTerritorio !== "todos") {
      onSelectTerritorio(nuevoTerritorio);
    }
  };

  const renderBadgeRiesgo = (nivel: string) => {
    const n = nivel?.toLowerCase();
    if (n === "critico") {
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 font-semibold">
          Crítico
        </Badge>
      );
    }
    if (n === "alto") {
      return (
        <Badge variant="warning" className="text-[10px] px-1.5 font-semibold">Alto</Badge>
      );
    }
    if (n === "medio") {
      return (
        <Badge variant="info" className="text-[10px] px-1.5 font-semibold">Medio</Badge>
      );
    }
    return (        <Badge variant="success" className="text-[10px] px-1.5 font-semibold">Bajo</Badge>
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
                28 datasets oficiales · 2.449 observaciones georreferenciadas
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

        {/* 2. Chips de Dimensiones de Seguridad Humana */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {DIMENSIONES.map((d) => {
            const Icon = d.icon;
            const activa = dimension === d.id;
            return (
              <Button
                key={d.id}
                type="button"
                variant={activa ? "default" : "outline"}
                size="sm"
                onClick={() => handleCambioDimension(d.id)}
                className={`flex h-auto items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all shrink-0 ${
                  activa
                    ? "bg-[var(--ember)] text-[var(--ember-foreground)] border-[var(--ember)] shadow-sm hover:bg-[var(--ember)]/90 hover:text-[var(--ember-foreground)]"
                    : "bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="size-3" />
                <span>{d.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                    activa
                      ? "bg-[var(--ember-foreground)]/20 text-[var(--ember-foreground)]"
                      : "bg-[var(--surface-2)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {d.total}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* 3. Filtros secundarios: búsqueda, entidad fuente y territorio */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-0)]/30 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <Input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(0);
            }}
            placeholder="Buscar por indicador (ej. pobreza, dengue, agua)..."
            className="pl-8 h-8 text-[11px]"
          />
        </div>

        <div>
          <Select value={fuente} onValueChange={handleCambioFuente}>
            <SelectTrigger className="h-8 text-[11px]" aria-label="Filtrar por entidad oficial">
              <SelectValue placeholder="Entidad Oficial" />
            </SelectTrigger>
            <SelectContent>
              {FUENTES_OFICIALES.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={territorioFiltro} onValueChange={handleCambioTerritorio}>
            <SelectTrigger className="h-8 text-[11px]" aria-label="Filtrar por territorio">
              <SelectValue placeholder="Territorio" />
            </SelectTrigger>
            <SelectContent>
              {TERRITORIOS.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            <span>No fue posible cargar los indicadores desde el servidor.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs mt-2">
              Reintentar
            </Button>
          </div>
        ) : indicadores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] gap-2 text-center">
            <Filter className="size-7 text-[var(--text-tertiary)] opacity-60" />
            <p className="font-medium text-xs">No se encontraron indicadores con los filtros actuales.</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Prueba cambiando la dimensión, borrando la búsqueda o seleccionando todas las entidades.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {indicadores.map((ind) => {
              const numValor = typeof ind.valor === "number" ? ind.valor : parseFloat(String(ind.valor));
              const valorFormateado = !isNaN(numValor)
                ? numValor % 1 === 0
                  ? numValor.toLocaleString("es-CO")
                  : numValor.toLocaleString("es-CO", { maximumFractionDigits: 2 })
                : String(ind.valor);

              const meta = ind.metadatos ?? {};
              const urlFuente = typeof meta.url_fuente === "string" ? meta.url_fuente : null;
              const nota = typeof meta.nota_origen === "string" ? meta.nota_origen : null;

              return (
                <article
                  key={ind.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 shadow-xs hover:border-[var(--ember)]/40 transition-colors flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ember)]">
                        {ind.nombre_dimension ?? ind.codigo_dimension ?? "Seguridad Humana"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {renderBadgeRiesgo(ind.nivel_riesgo)}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-2)] text-[var(--text-secondary)]">
                          {ind.anio_corte}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2" title={ind.nombre_indicador}>
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
                      <div className="flex items-center gap-1 truncate max-w-[70%]" title={ind.nombre_territorio ?? ind.codigo_territorio}>
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{ind.nombre_territorio ?? ind.codigo_territorio ?? "Distrito"}</span>
                      </div>
                      <span className="truncate text-right font-medium text-[var(--text-secondary)]" title={ind.fuente_datos}>
                        {ind.fuente_datos?.split("-")[0]?.trim()}
                      </span>
                    </div>

                    {(urlFuente || nota) && (
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        {nota && (
                          <span className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[85%]" title={nota}>
                            {nota}
                          </span>
                        )}
                        {urlFuente && (
                          <a
                            href={urlFuente}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[var(--ember)] hover:underline ml-auto shrink-0 font-medium"
                            title="Ir a fuente oficial"
                          >
                            <span>Fuente</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant={indicadorMultifuenteActivo?.id === ind.id ? "ember" : "outline"}
                        onClick={() => {
                          if (indicadorMultifuenteActivo?.id === ind.id) {
                            setIndicadorMultifuenteActivo(null);
                          } else {
                            setIndicadorMultifuenteActivo(ind);
                          }
                        }}
                        className="h-7 px-2.5 text-2xs gap-1.5 transition-colors"
                        title={
                          indicadorMultifuenteActivo?.id === ind.id
                            ? "Quitar esta capa del mapa"
                            : "Pintar datos de esta capa en el mapa"
                        }
                      >
                        {indicadorMultifuenteActivo?.id === ind.id ? (
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
            Mostrando {pagina * limite + 1}–{Math.min((pagina + 1) * limite, total)} de {total.toLocaleString("es-CO")}
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
