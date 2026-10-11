"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface SystemHealthData {
  status: "ok" | "degraded" | "unavailable";
  timestamp: string;
  version: string;
  environment: string;
  database: {
    status: "ok" | "unavailable";
    ping_ms: number;
    active_connections: number;
    max_connections: number;
    migrations_status: "ok" | "pending" | "unknown";
    extensions_status: "ok" | "missing" | "unknown";
    installed_extensions: string[];
  };
  process: {
    uptime_seconds: number;
    memory_rss_mb: number;
    total_requests: number;
    requests_2xx: number;
    requests_4xx: number;
    requests_5xx: number;
    error_rate_pct: number;
    avg_latency_ms: number;
  };
  storage: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    used_pct: number;
  };
  observability: {
    sentry_status: "activo" | "desactivado";
  };
}

export function SaludSistemaSection() {
  const [salud, setSalud] = useState<SystemHealthData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [swActivo, setSwActivo] = useState(false);

  const consultarSalud = useCallback(async () => {
    setCargando(true);
    try {
      const apiBase =
        (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
        "/api/v1";
      const inicio = performance.now();
      const res = await fetch(`${apiBase}/health/system`);
      const duracion = Math.round(performance.now() - inicio);

      if (res.ok) {
        const data = (await res.json()) as SystemHealthData;
        setSalud(data);
        toast.success(`Salud del sistema verificada (${duracion} ms)`);
      } else {
        toast.error("El backend distrital reportó degradación");
      }
    } catch {
      toast.error("No se pudo conectar con el endpoint de observabilidad");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void consultarSalud();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setSwActivo(regs.length > 0);
      });
    }
  }, [consultarSalud]);

  const formatearUptime = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m ${Math.floor(segundos % 60)}s`;
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-1 xl:col-span-2">
      <header className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-ember-soft p-2.5 text-ember">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-text-primary">
              Salud del Sistema y Observabilidad
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Diagnóstico en tiempo real de FastAPI, PostgreSQL (bd_csh), PWA y almacenamiento.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={cargando}
          onClick={() => void consultarSalud()}
          className="gap-2 text-xs"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          <span>Comprobar salud en tiempo real</span>
        </Button>
      </header>

      <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Backend FastAPI */}
        <TarjetaMetrica
          icono={<Server className="size-4" />}
          titulo="FastAPI (polis-backend)"
          estado={salud?.database.status === "ok" ? "success" : "warning"}
          estadoTexto={salud?.database.status === "ok" ? "Operativo" : "Verificando"}
          detalles={[
            `Latencia DB: ${salud?.database.ping_ms ?? "—"} ms`,
            `Uptime: ${salud ? formatearUptime(salud.process.uptime_seconds) : "—"}`,
            `Memoria RSS: ${salud?.process.memory_rss_mb ?? "—"} MB`,
          ]}
        />

        {/* PostgreSQL bd_csh */}
        <TarjetaMetrica
          icono={<Database className="size-4" />}
          titulo="PostgreSQL (bd_csh)"
          estado={salud?.database.status === "ok" ? "success" : "warning"}
          estadoTexto={salud?.database.status === "ok" ? "Conectado" : "Verificando"}
          detalles={[
            `Conexiones: ${salud?.database.active_connections ?? "—"} / ${salud?.database.max_connections ?? 100}`,
            `Migraciones: ${salud?.database.migrations_status === "ok" ? "Al día" : "Pendiente"}`,
            `Extensiones: ${salud?.database.extensions_status === "ok" ? "PostGIS / pgcrypto" : "Verificando"}`,
          ]}
        />

        {/* Frontend Next.js & PWA */}
        <TarjetaMetrica
          icono={<Wifi className="size-4" />}
          titulo="Frontend & PWA Offline"
          estado={swActivo ? "success" : "info"}
          estadoTexto={swActivo ? "PWA Activa" : "En línea"}
          detalles={[
            "Next.js 16 Standalone",
            `Service Worker: ${swActivo ? "Registrado" : "Estándar"}`,
            "Modo Barrio & IndexedDB: Habilitado",
          ]}
        />

        {/* Almacenamiento & Telemetría */}
        <TarjetaMetrica
          icono={<HardDrive className="size-4" />}
          titulo="Almacenamiento y Telemetría"
          estado={
            salud?.storage && salud.storage.used_pct > 90 ? "warning" : "success"
          }
          estadoTexto={`${salud?.storage.used_pct ?? "—"}% usado`}
          detalles={[
            `Libre: ${salud?.storage.free_gb ?? "—"} GB`,
            `Total: ${salud?.storage.total_gb ?? "—"} GB`,
            `Sentry: ${salud?.observability.sentry_status ?? "desactivado"}`,
          ]}
        />
      </div>
    </section>
  );
}

function TarjetaMetrica({
  icono,
  titulo,
  estado,
  estadoTexto,
  detalles,
}: {
  icono: ReactNode;
  titulo: string;
  estado: "success" | "warning" | "info";
  estadoTexto: string;
  detalles: string[];
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-text-primary">
          <span className="text-text-secondary">{icono}</span>
          <p className="text-xs font-semibold">{titulo}</p>
        </div>
        <Badge variant={estado} className="text-[11px] px-2 py-0.5">
          {estado === "success" && (
            <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
          )}
          {estadoTexto}
        </Badge>
      </div>

      <div className="space-y-1 text-[11px] text-text-secondary">
        {detalles.map((d, i) => (
          <p key={i} className="truncate">
            {d}
          </p>
        ))}
      </div>
    </div>
  );
}
