"use client";

import { useQuery } from "@tanstack/react-query";
import {
  obtenerSaludHerald,
  type EstadoSaludHerald,
  type SaludHeraldRespuesta,
} from "../services/notificaciones-api";
import {
  obtenerNombreTipoEvento,
  formatearSegundos,
  formatearLatido,
} from "../lib/herald-helpers";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  MailCheck,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface PanelSaludHeraldProps {
  className?: string;
}

const ESTADO_CONFIG: Record<
  EstadoSaludHerald,
  { label: string; tone: StatusTone; icon: typeof CheckCircle2; descripcion: string }
> = {
  saludable: {
    label: "Saludable",
    tone: "success",
    icon: CheckCircle2,
    descripcion: "El ejecutor y la cola de POLIS Herald operan con normalidad.",
  },
  degradado: {
    label: "Degradado",
    tone: "warning",
    icon: AlertTriangle,
    descripcion: "Se detectan demoras en cola, reintentos pendientes o latencias elevadas.",
  },
  critico: {
    label: "Crítico",
    tone: "danger",
    icon: AlertOctagon,
    descripcion: "El ejecutor se encuentra inactivo o la acumulación de fallos requiere intervención inmediata.",
  },
};

function formatearTasaExito(tasa: number): string {
  if (typeof tasa !== "number" || isNaN(tasa)) return "0.0%";
  const valor = tasa <= 1 ? tasa * 100 : tasa;
  return `${valor.toFixed(1)}%`;
}

export function PanelSaludHerald({ className = "" }: PanelSaludHeraldProps) {
  const {
    data,
    isPending,
    error,
    refetch,
    isFetching,
  } = useQuery<SaludHeraldRespuesta, Error>({
    queryKey: ["notificaciones", "salud"],
    queryFn: obtenerSaludHerald,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const isForbidden =
    error &&
    (error.message.includes("403") ||
      error.message.toLowerCase().includes("permiso") ||
      error.message.toLowerCase().includes("forbidden"));

  if (isForbidden) {
    return (
      <div
        role="region"
        aria-label="Panel de Salud POLIS Herald"
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm ${className}`}
      >
        <Notice
          tone="warning"
          title="Acceso restringido — Supervisión de POLIS Herald"
        >
          <p className="text-xs">
            No cuentas con el permiso de auditoría forense (<code>auditoria:leer</code>)
            requerido para consultar la salud del motor de notificaciones. Contacta al
            administrador del sistema.
          </p>
        </Notice>
      </div>
    );
  }

  if (isPending) {
    return (
      <div
        role="region"
        aria-label="Panel de Salud POLIS Herald"
        className={`space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-5 animate-pulse text-[var(--accent)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              POLIS Herald — Salud y Rendimiento de Entregas
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-xs text-[var(--text-secondary)]">
          <RefreshCw className="size-5 animate-spin text-[var(--accent)] mb-2" aria-hidden="true" />
          <span>Verificando estado de latidos, cola y métricas operativas…</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        role="region"
        aria-label="Panel de Salud POLIS Herald"
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm ${className}`}
      >
        <Notice
          tone="danger"
          title="No se pudo obtener el estado de salud de POLIS Herald"
        >
          <p className="text-xs mb-3">
            {error.message || "Error al conectar con el endpoint distrital /api/v1/notificaciones/salud."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
            className="text-xs"
          >
            <RefreshCw className="size-3.5 mr-1" aria-hidden="true" />
            Reintentar conexión
          </Button>
        </Notice>
      </div>
    );
  }

  if (!data) return null;

  const tieneEstructuraValida = Boolean(
    data &&
      typeof data === "object" &&
      data.ejecutor &&
      data.cola &&
      data.ultimas_24h
  );

  if (!tieneEstructuraValida) {
    return (
      <div
        role="region"
        aria-label="Panel de Salud POLIS Herald"
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm ${className}`}
      >
        <Notice
          tone="warning"
          title="Telemetría de POLIS Herald no disponible o incompleta"
        >
          <p className="text-xs mb-3">
            El servicio distrital de notificaciones no ha retornado la estructura completa de métricas, cola y salud del ejecutor.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
            className="text-xs"
          >
            <RefreshCw className="size-3.5 mr-1" aria-hidden="true" />
            Reintentar consulta
          </Button>
        </Notice>
      </div>
    );
  }

  const configEstado = ESTADO_CONFIG[data.estado] ?? ESTADO_CONFIG.saludable;
  const EstadoIcono = configEstado.icon;

  return (
    <div
      role="region"
      aria-label="Panel de Salud POLIS Herald"
      className={`space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm ${className}`}
    >
      {/* Cabecera y Semáforo Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border)] shrink-0">
            <Activity className="size-5 text-[var(--accent)]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                POLIS Herald — Salud y Monitoreo de Despacho
              </h3>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Fe Pública &amp; SLAs
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Monitoreo en tiempo real de la cola de constancias, latencia de despacho y salud del ejecutor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={isFetching}
            onClick={() => void refetch()}
            className="h-8 gap-1.5 text-xs border-[var(--border)]"
            title="Refrescar métricas de salud (auto-actualiza cada 30s)"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin text-[var(--accent)]" : ""}`}
              aria-hidden="true"
            />
            <span>Actualizar ahora</span>
          </Button>
        </div>
      </div>

      {/* Banner de Estado / Semáforo */}
      <div
        aria-live="polite"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5"
      >
        <div className="flex items-start sm:items-center gap-3">
          <EstadoIcono
            className={`size-6 shrink-0 ${
              data.estado === "saludable"
                ? "text-[var(--success)]"
                : data.estado === "degradado"
                ? "text-[var(--warning)]"
                : "text-[var(--destructive)]"
            }`}
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Estado general del subsistema:
              </span>
              <StatusBadge tone={configEstado.tone}>
                {configEstado.label}
              </StatusBadge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {configEstado.descripcion}
            </p>
          </div>
        </div>

        {data.motivos && data.motivos.length > 0 && (
          <div className="sm:text-right">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider block">
              Observaciones activas:
            </span>
            <ul className="text-xs text-[var(--text-secondary)] list-disc list-inside sm:list-none">
              {data.motivos.map((motivo, idx) => (
                <li key={idx} className="text-[var(--destructive)] font-medium">
                  {motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Grid de Estado del Ejecutor y SMTP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Ejecutor en segundo plano
            </span>
            <Cpu className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={data.ejecutor.activo ? "success" : "danger"}>
              {data.ejecutor.activo ? "Activo" : "Detenido"}
            </StatusBadge>
            <span className="text-xs text-[var(--text-secondary)]">
              Latido: {formatearLatido(data.ejecutor.ultimo_latido)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
            Último ciclo: {formatearLatido(data.ejecutor.ultimo_ciclo)}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Canal de Transporte
            </span>
            <Server className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={data.smtp_configurado ? "success" : "info"}>
              {data.smtp_configurado ? "SMTP Habilitado" : "Modo Outbox Simulado"}
            </StatusBadge>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
            {data.smtp_configurado
              ? "Despacho directo hacia servidor de correo configurado."
              : "Fe pública transaccional garantizada en bitácora local."}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Antigüedad en Cola
            </span>
            <Clock className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
          <div className="text-base font-bold text-[var(--text-primary)]">
            {formatearSegundos(data.cola.mas_antiguo_segundos)}
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            Edad del ítem más antiguo pendiente de procesamiento
          </p>
        </div>
      </div>

      {/* Métricas de Cola */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Zap className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>Estado de la Cola Transaccional</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
            <div className="text-xs text-[var(--text-secondary)]">Pendientes</div>
            <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
              {data.cola.pendientes}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">En espera de turno</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
            <div className="text-xs text-[var(--text-secondary)]">En Proceso</div>
            <div className="text-xl font-bold font-mono text-[var(--accent)] mt-1">
              {data.cola.procesando}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">En despacho actual</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
            <div className="text-xs text-[var(--text-secondary)]">Reintentables</div>
            <div className="text-xl font-bold font-mono text-[var(--warning)] mt-1">
              {data.cola.fallidos_reintentables}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Con reintento automático</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
            <div className="text-xs text-[var(--text-secondary)]">Agotados</div>
            <div className="text-xl font-bold font-mono text-[var(--destructive)] mt-1">
              {data.cola.agotados}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Requieren revisión manual</div>
          </div>
        </div>
      </div>

      {/* Rendimiento Últimas 24 Horas */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>Rendimiento y SLAs (Últimas 24 Horas)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2.5">
            <div className="text-[11px] text-[var(--text-secondary)]">Despachados</div>
            <div className="text-lg font-bold font-mono text-[var(--success)] mt-0.5">
              {data.ultimas_24h.enviados}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2.5">
            <div className="text-[11px] text-[var(--text-secondary)]">Simulados</div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">
              {data.ultimas_24h.simulados}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2.5">
            <div className="text-[11px] text-[var(--text-secondary)]">Fallidos</div>
            <div className="text-lg font-bold font-mono text-[var(--destructive)] mt-0.5">
              {data.ultimas_24h.fallidos}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2.5">
            <div className="text-[11px] text-[var(--text-secondary)]">Tasa de Éxito</div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">
              {formatearTasaExito(data.ultimas_24h.tasa_exito)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2.5">
            <div className="text-[11px] text-[var(--text-secondary)]">Latencia p50</div>
            <div className="text-lg font-bold font-mono text-[var(--text-secondary)] mt-0.5">
              {formatearSegundos(data.ultimas_24h.latencia_p50_s)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2.5">
            <div className="text-[11px] text-[var(--text-secondary)]">Latencia p95</div>
            <div className="text-lg font-bold font-mono text-[var(--text-secondary)] mt-0.5">
              {formatearSegundos(data.ultimas_24h.latencia_p95_s)}
            </div>
          </div>
        </div>
      </div>

      {/* Desglose por Tipo de Evento */}
      {data.por_tipo && data.por_tipo.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MailCheck className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
            <span>Desglose por Tipo de Notificación</span>
          </h4>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] font-semibold text-[var(--text-secondary)]">
                <tr>
                  <th scope="col" className="p-2.5 pl-3">Tipo de Evento</th>
                  <th scope="col" className="p-2.5 text-right">Enviados</th>
                  <th scope="col" className="p-2.5 text-right">Fallidos</th>
                  <th scope="col" className="p-2.5 text-right pr-3">Pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-1)]">
                {data.por_tipo.map((fila) => (
                  <tr key={fila.tipo_evento} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                    <td className="p-2.5 pl-3 font-medium text-[var(--text-primary)]">
                      {obtenerNombreTipoEvento(fila.tipo_evento)}
                      <span className="ml-1.5 font-mono text-[10px] text-[var(--text-tertiary)]">
                        ({fila.tipo_evento})
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono text-[var(--text-primary)]">
                      {fila.enviados}
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {fila.fallidos > 0 ? (
                        <span className="text-[var(--destructive)] font-bold">
                          {fila.fallidos}
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">0</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right pr-3 font-mono">
                      {fila.pendientes > 0 ? (
                        <span className="text-[var(--warning)] font-bold">
                          {fila.pendientes}
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
