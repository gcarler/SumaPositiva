"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  Flame,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  obtenerResumenHurtos,
  type DelitoTipo,
  type ResumenHurtosResponse,
} from "../services/hurtos-api";

interface GeovisorHurtosPanelProps {
  delitoSeleccionado?: string | null;
  onDelitoChange?: (delito: string | null) => void;
  anioSeleccionado?: number | null;
  onAnioChange?: (anio: number | null) => void;
  onActivarCapaMapa?: (delito: string) => void;
}

const OPCIONES_DELITOS: Array<{ id: string; label: string; canonico: DelitoTipo | null; color: string }> = [
  { id: "TODOS", label: "Todos los Hurtos", canonico: null, color: "#ef4444" },
  { id: "hurto_motocicletas", label: "Hurto a Motocicletas", canonico: "HURTO MOTOCICLETA", color: "#f97316" },
  { id: "hurto_residencias", label: "Hurto a Residencias", canonico: "HURTO RESIDENCIAS", color: "#8b5cf6" },
  { id: "hurto_comercio", label: "Hurto a Comercio", canonico: "HURTO COMERCIO", color: "#06b6d4" },
];

const ANIOS_DISPONIBLES = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

export function GeovisorHurtosPanel({
  delitoSeleccionado = null,
  onDelitoChange,
  anioSeleccionado = null,
  onAnioChange,
  onActivarCapaMapa,
}: GeovisorHurtosPanelProps) {
  const [zonaFiltro, setZonaFiltro] = useState<string>("TODAS");

  const delitoActivo = delitoSeleccionado ?? "TODOS";
  const anioActivo = anioSeleccionado;

  const { data: resumen, isLoading, refetch } = useQuery<ResumenHurtosResponse>({
    queryKey: ["analitica-hurtos", delitoActivo, anioActivo, zonaFiltro],
    queryFn: () =>
      obtenerResumenHurtos({
        delito: delitoActivo === "TODOS" ? undefined : delitoActivo,
        anio: anioActivo ?? undefined,
        zona: zonaFiltro === "TODAS" ? undefined : zonaFiltro,
      }),
    staleTime: 60_000,
  });

  const maxCasosAnual = useMemo(() => {
    if (!resumen?.serie_anual || resumen.serie_anual.length === 0) return 1;
    return Math.max(...resumen.serie_anual.map((item) => item.cantidad), 1);
  }, [resumen]);

  const maxCasosMensual = useMemo(() => {
    if (!resumen?.serie_mensual || resumen.serie_mensual.length === 0) return 1;
    return Math.max(...resumen.serie_mensual.map((item) => item.cantidad), 1);
  }, [resumen]);

  const urbanaInfo = resumen?.distribucion_zona.find((z) => z.zona === "URBANA");
  const ruralInfo = resumen?.distribucion_zona.find((z) => z.zona === "RURAL");

  return (
    <div
      data-testid="geovisor-hurtos-panel"
      className="flex flex-col gap-4 p-4 text-[var(--text-primary)]"
    >
      {/* 1. Header con Badge SIEDCO y Selector de Delito */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--danger)]/10 text-[var(--danger)]">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                Analítica Espacial de Hurtos SIEDCO
              </h2>
              <Badge variant="outline" className="text-[10px] text-[var(--danger)] border-[var(--danger)]/30">
                2018–2026
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              12.280 registros georreferenciados consolidados por Policía Nacional y SIEDCO
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onActivarCapaMapa && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onActivarCapaMapa(delitoActivo)}
              className="h-8 gap-1 text-xs text-[var(--ember)] border-[var(--ember)]/30 hover:bg-[var(--ember)]/10"
              title="Activar y destacar capa delictiva en el mapa central"
            >
              <MapPin className="size-3.5" />
              <span>Ver en Mapa</span>
            </Button>
          )}

          {/* Botón de refresco */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 gap-1 text-xs"
            title="Actualizar datos analíticos"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* 2. Filtros Interactivos: Delito, Año y Zona */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Selector de Delito */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="select-delito-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Tipo de Delito
          </Label>
          <Select
            value={delitoActivo}
            onValueChange={(val) => onDelitoChange?.(val === "TODOS" ? null : val)}
          >
            <SelectTrigger id="select-delito-hurtos" className="h-9 text-xs" aria-label="Seleccionar tipo de delito">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCIONES_DELITOS.map((opc) => (
                <SelectItem key={opc.id} value={opc.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: opc.color }}
                    />
                    {opc.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de Año */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="select-anio-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Periodo / Año
          </Label>
          <Select
            value={anioActivo ? String(anioActivo) : "TODOS"}
            onValueChange={(val) => onAnioChange?.(val === "TODOS" ? null : Number(val))}
          >
            <SelectTrigger id="select-anio-hurtos" className="h-9 text-xs" aria-label="Seleccionar año">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="text-xs">
                Histórico Consolidado (2018–2026)
              </SelectItem>
              {ANIOS_DISPONIBLES.map((a) => (
                <SelectItem key={a} value={String(a)} className="text-xs">
                  Año {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selector de Zona */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="select-zona-hurtos" className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Ámbito Territorial
          </Label>
          <Select value={zonaFiltro} onValueChange={setZonaFiltro}>
            <SelectTrigger id="select-zona-hurtos" className="h-9 text-xs" aria-label="Seleccionar ámbito territorial">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="text-xs">Distrito Completo (Urbano + Rural)</SelectItem>
              <SelectItem value="URBANA" className="text-xs">Perímetro Urbano (75.3 km²)</SelectItem>
              <SelectItem value="RURAL" className="text-xs">Zona Rural e Insular (597.4 km²)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Tarjetas KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
            <span>Total Incidentes</span>
            <Flame className="size-3.5 text-[var(--danger)]" />
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {isLoading ? "…" : (resumen?.total_casos ?? 0).toLocaleString("es-CO")}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
            {anioActivo ? `Año ${anioActivo}` : "Acumulado 2018–2026"}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
            <span>Perímetro Urbano</span>
            <MapPin className="size-3.5 text-[var(--ember)]" />
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {isLoading ? "…" : (urbanaInfo?.cantidad ?? 0).toLocaleString("es-CO")}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
            {urbanaInfo?.porcentaje ?? 0}% del total distrital
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
            <span>Zona Rural / Insular</span>
            <Layers className="size-3.5 text-[var(--info)]" />
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {isLoading ? "…" : (ruralInfo?.cantidad ?? 0).toLocaleString("es-CO")}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
            {ruralInfo?.porcentaje ?? 0}% del total distrital
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium">
            <span>Modalidad Predominante</span>
            <CheckCircle2 className="size-3.5 text-[var(--success)]" />
          </div>
          <div className="mt-1 truncate text-xs font-bold text-[var(--text-primary)]" title={resumen?.top_armas[0]?.categoria ?? "N/A"}>
            {isLoading ? "…" : (resumen?.top_armas[0]?.categoria ?? "N/A")}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
            {resumen?.top_armas[0]?.porcentaje ?? 0}% de los eventos
          </p>
        </div>
      </div>

      {/* 4. Gráficos: Serie Anual y Serie Mensual */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Gráfico Serie Anual 2018–2026 */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Evolución Histórica Anual (2018–2026)
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Casos registrados por año en Cartagena
              </p>
            </div>
            <Calendar className="size-4 text-[var(--text-tertiary)]" />
          </div>

          <div className="flex h-36 items-end gap-1.5 pt-4">
            {resumen?.serie_anual.map((item) => {
              const alturaPct = Math.max(8, (item.cantidad / maxCasosAnual) * 100);
              const esSeleccionado = anioActivo === Number(item.etiqueta);
              return (
                <Button
                  key={item.etiqueta}
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => onAnioChange?.(esSeleccionado ? null : Number(item.etiqueta))}
                  className="group relative flex flex-1 flex-col items-center h-full justify-end focus:outline-none p-0"
                  title={`${item.etiqueta}: ${item.cantidad.toLocaleString("es-CO")} casos (${item.porcentaje}%)`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      esSeleccionado
                        ? "bg-[var(--danger)] ring-2 ring-[var(--danger)]/50"
                        : "bg-[var(--ember)]/80 hover:bg-[var(--ember)]"
                    }`}
                    style={{ height: `${alturaPct}%` }}
                  />
                  <span className="mt-1 text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                    {item.etiqueta.slice(2)}
                  </span>
                  <div className="pointer-events-none absolute -top-6 hidden rounded bg-[var(--surface-2)] px-1 py-0.5 text-[9px] font-bold text-[var(--text-primary)] shadow group-hover:block z-10 whitespace-nowrap">
                    {item.cantidad.toLocaleString("es-CO")}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Gráfico Serie Mensual */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Distribución Mensual
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {anioActivo ? `Meses del año ${anioActivo}` : "Consolidado mensual histórico"}
              </p>
            </div>
            <TrendingUp className="size-4 text-[var(--text-tertiary)]" />
          </div>

          <div className="flex h-36 items-end gap-1 pt-4">
            {resumen?.serie_mensual.map((item) => {
              const alturaPct = Math.max(8, (item.cantidad / maxCasosMensual) * 100);
              const mesCorto = item.etiqueta.slice(0, 3);
              return (
                <div
                  key={item.etiqueta}
                  className="group relative flex flex-1 flex-col items-center h-full justify-end"
                  title={`${item.etiqueta}: ${item.cantidad.toLocaleString("es-CO")} casos`}
                >
                  <div
                    className="w-full rounded-t bg-[var(--info)]/80 transition-all hover:bg-[var(--info)]"
                    style={{ height: `${alturaPct}%` }}
                  />
                  <span className="mt-1 text-[9px] text-[var(--text-secondary)]">
                    {mesCorto}
                  </span>
                  <div className="pointer-events-none absolute -top-6 hidden rounded bg-[var(--surface-2)] px-1 py-0.5 text-[9px] font-bold text-[var(--text-primary)] shadow group-hover:block z-10 whitespace-nowrap">
                    {item.cantidad}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Top Armas / Medios y Top Clases de Sitio */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Armas */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Top 5 Modalidades / Armas Empleadas
          </h3>
          <div className="flex flex-col gap-2 pt-1">
            {resumen?.top_armas.map((arma, idx) => (
              <div key={arma.categoria} className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-[var(--text-primary)] font-medium">
                    {idx + 1}. {arma.categoria}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[var(--text-secondary)]">
                    {arma.cantidad.toLocaleString("es-CO")} ({arma.porcentaje}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--danger)]"
                    style={{ width: `${Math.min(100, arma.porcentaje * 1.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sitios */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Top 5 Clases de Sitio de Ocurrencia
          </h3>
          <div className="flex flex-col gap-2 pt-1">
            {resumen?.top_sitios.map((sitio, idx) => (
              <div key={sitio.categoria} className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-[var(--text-primary)] font-medium">
                    {idx + 1}. {sitio.categoria}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[var(--text-secondary)]">
                    {sitio.cantidad.toLocaleString("es-CO")} ({sitio.porcentaje}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--ember)]"
                    style={{ width: `${Math.min(100, sitio.porcentaje * 1.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
