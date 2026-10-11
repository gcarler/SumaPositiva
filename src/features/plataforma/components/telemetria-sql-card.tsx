"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Database,
  RefreshCw,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  plataformaApi,
  type DatabaseTelemetryResponse as DatabaseTelemetryData,
} from "../services/plataforma-api";

export function TelemetriaSqlCard() {
  const [telemetria, setTelemetria] = useState<DatabaseTelemetryData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [orden, setOrden] = useState<"tiempo_total" | "tiempo_medio" | "llamadas">("tiempo_total");

  const consultarTelemetria = useCallback(async (criterioOrden = orden) => {
    setCargando(true);
    try {
      const inicio = performance.now();
      const data = await plataformaApi.telemetriaSql(10, criterioOrden);
      const duracion = Math.round(performance.now() - inicio);
      setTelemetria(data);
      toast.success(`Telemetría SQL actualizada (${duracion} ms)`);
    } catch {
      toast.error("Error al obtener la telemetría de pg_stat_statements");
    } finally {
      setCargando(false);
    }
  }, [orden]);


  useEffect(() => {
    void consultarTelemetria();
  }, [consultarTelemetria]);

  const manejarCambioOrden = (nuevoOrden: string) => {
    const ordenTipado = nuevoOrden as "tiempo_total" | "tiempo_medio" | "llamadas";
    setOrden(ordenTipado);
    void consultarTelemetria(ordenTipado);
  };

  const top = telemetria?.top_queries ?? [];
  const latenciaMediaTotal = top.length > 0
    ? (top.reduce((acc, q) => acc + q.mean_ms, 0) / top.length).toFixed(2)
    : "—";

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-0 p-5">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-ember-soft p-2 text-ember">
            <Database className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Rendimiento SQL & Consultas en Tiempo Real (pg_stat_statements)
            </h3>
            <p className="text-xs text-text-secondary">
              Métricas de latencia, acierto en caché y volumen acumulado de PostgreSQL 18.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select value={orden} onValueChange={manejarCambioOrden}>
              <SelectTrigger size="sm" aria-label="Criterio de ordenación">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiempo_total">Tiempo Total (ms)</SelectItem>
                <SelectItem value="tiempo_medio">Latencia Media (ms)</SelectItem>
                <SelectItem value="llamadas">Frecuencia / Llamadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={cargando}
            onClick={() => void consultarTelemetria()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>Refrescar</span>
          </Button>
        </div>
      </div>

      {/* Badges / KPIs */}
      <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-[11px] font-medium">Cache Hit Ratio</span>
            <Zap className="size-3.5 text-ember" aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-text-primary">
              {telemetria ? `${telemetria.cache_hit_ratio_pct}%` : "—"}
            </span>
            <Badge
              variant={
                (telemetria?.cache_hit_ratio_pct ?? 0) >= 99 ? "success" : "warning"
              }
              className="text-[10px] px-1.5 py-0"
            >
              {(telemetria?.cache_hit_ratio_pct ?? 0) >= 99 ? "Excelente" : "Normal"}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-[11px] font-medium">Consultas Catalogadas</span>
            <Layers className="size-3.5 text-ember" aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-text-primary">
              {telemetria ? telemetria.total_queries_recorded.toLocaleString() : "—"}
            </span>
            <span className="text-[10px] text-text-tertiary">en búfer</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-[11px] font-medium">Latencia Media (Top)</span>
            <Clock className="size-3.5 text-ember" aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-text-primary">
              {latenciaMediaTotal !== "—" ? `${latenciaMediaTotal} ms` : "—"}
            </span>
            <span className="text-[10px] text-text-tertiary">promedio</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-[11px] font-medium">Estado del Motor</span>
            <Activity className="size-3.5 text-ember" aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <Badge
              variant={telemetria?.status === "ok" ? "success" : "warning"}
              className="text-xs"
            >
              {telemetria?.status === "ok" ? "Óptimo" : "En verificación"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Top SQL Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%] text-xs">Consulta SQL (Sanitizada)</TableHead>
              <TableHead className="text-right text-xs">Llamadas</TableHead>
              <TableHead className="text-right text-xs">Tiempo Total</TableHead>
              <TableHead className="text-right text-xs">Latencia Media</TableHead>
              <TableHead className="text-right text-xs">Filas</TableHead>
              <TableHead className="text-right text-xs">Cache Hit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-xs text-text-secondary">
                  {cargando ? "Cargando telemetría SQL..." : "No hay consultas catalogadas en pg_stat_statements"}
                </TableCell>
              </TableRow>
            ) : (
              top.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="max-w-md">
                    <code className="block truncate font-mono text-[11px] text-text-primary">
                      {item.query}
                    </code>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text-primary">
                    {item.calls.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text-secondary">
                    {item.total_ms.toFixed(2)} ms
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-text-primary">
                    {item.mean_ms.toFixed(2)} ms
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text-secondary">
                    {item.rows.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <Badge
                      variant={item.hit_ratio_pct >= 99 ? "success" : "info"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.hit_ratio_pct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
