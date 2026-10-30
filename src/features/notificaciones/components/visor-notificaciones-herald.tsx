"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listarHistorialNotificaciones,
  type NotificacionLectura,
} from "../services/notificaciones-api";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Notice } from "@/shared/ui/notice";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Copy,
  Check,
  MailCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const EVENTO_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  radicacion: { label: "Radicación de Propuesta", tone: "ember" },
  perfil_actualizado: { label: "Perfil Actualizado", tone: "info" },
  contrasena_cambiada: { label: "Clave Modificada", tone: "warning" },
  gestion_institucional: { label: "Gestión Institucional", tone: "neutral" },
  alerta_pendientes: { label: "Compromiso Pendiente", tone: "warning" },
  respaldo: { label: "Respaldo Popular", tone: "success" },
  cambio_estado: { label: "Cambio de Estado", tone: "info" },
};

const ESTADO_BADGES: Record<string, { label: string; tone: StatusTone }> = {
  enviado: { label: "Despachado (SMTP)", tone: "success" },
  simulado: { label: "Fe Pública (Outbox)", tone: "info" },
  pendiente: { label: "En cola de envío", tone: "warning" },
  fallido: { label: "Error de despacho", tone: "danger" },
  error: { label: "Error de despacho", tone: "danger" },
};

const PAGE_SIZE = 10;

export function VisorNotificacionesHerald() {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [filtroRadicado, setFiltroRadicado] = useState("");
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string>("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: [
      "notificaciones",
      "historial",
      desplazamiento,
      filtroRadicado,
      filtroTipoEvento,
    ],
    queryFn: () =>
      listarHistorialNotificaciones({
        limite: PAGE_SIZE,
        desplazamiento,
        codigo_radicado: filtroRadicado || undefined,
        tipo_evento: filtroTipoEvento || undefined,
      }),
  });

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setDesplazamiento(0);
    setFiltroRadicado(busquedaInput.trim());
  };

  const handleLimpiarFiltros = () => {
    setBusquedaInput("");
    setFiltroRadicado("");
    setFiltroTipoEvento("");
    setDesplazamiento(0);
  };

  const copiarRadicado = (codigo: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codigo);
      setCopiadoId(codigo);
      toast.success(`Radicado ${codigo} copiado`);
      setTimeout(() => setCopiadoId(null), 2000);
    }
  };

  const total = data?.total ?? 0;
  const elementos = data?.elementos ?? [];
  const paginaActual = Math.floor(desplazamiento / PAGE_SIZE) + 1;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div
      role="region"
      aria-label="Visor de Fe Pública y Notificaciones POLIS Herald"
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm"
    >
      {/* Cabecera del Visor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
            <MailCheck className="size-4 text-[var(--accent)]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                POLIS Herald — Visor de Fe Pública
              </h4>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Auditoría Oficial
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Supervisión forense de constancias transaccionales y notificaciones ciudadanas (Sentencia C-150 de 2015).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={isFetching}
            onClick={() => void refetch()}
            className="h-8 gap-1.5 text-xs border-[var(--border)]"
            title="Refrescar registros"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin text-[var(--accent)]" : ""}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleBuscar} className="flex gap-2 flex-1 max-w-md">
          <Input
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
            placeholder="Buscar por radicado (ej. POL-2026)..."
            className="h-8 text-xs border-[var(--border)] bg-[var(--surface-2)]"
            aria-label="Filtrar por código de radicado"
          />
          <Button type="submit" size="sm" variant="default" className="h-8 px-3 text-xs gap-1">
            <Search className="size-3.5" aria-hidden="true" />
            <span>Buscar</span>
          </Button>
          {(filtroRadicado || filtroTipoEvento) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLimpiarFiltros}
              className="h-8 px-2.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Limpiar
            </Button>
          )}
        </form>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Button
            type="button"
            variant={!filtroTipoEvento ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFiltroTipoEvento("");
              setDesplazamiento(0);
            }}
            className="h-7 rounded-full px-2.5 text-[11px]"
          >
            Todos ({total})
          </Button>
          {Object.entries(EVENTO_LABELS).map(([key, config]) => (
            <Button
              key={key}
              type="button"
              variant={filtroTipoEvento === key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFiltroTipoEvento(filtroTipoEvento === key ? "" : key);
                setDesplazamiento(0);
              }}
              className="h-7 rounded-full px-2.5 text-[11px]"
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Estado de Carga y Errores */}
      {isPending && (
        <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
          <RefreshCw className="size-5 animate-spin mx-auto text-[var(--accent)] mb-2" />
          <span>Consultando bitácora de fe pública en el backend distrital…</span>
        </div>
      )}

      {error && (
        <Notice tone="danger" title="No se pudo cargar el historial de fe pública">
          <p className="text-xs">
            {error instanceof Error ? error.message : "Error de comunicación con el servicio de notificaciones."}
          </p>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Reintentar consulta
            </Button>
          </div>
        </Notice>
      )}

      {/* Lista de Notificaciones */}
      {!isPending && !error && elementos.length === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-6 text-center text-xs text-[var(--text-tertiary)]">
          <ShieldCheck className="size-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-60" />
          <p className="font-semibold text-[var(--text-secondary)]">
            No se encontraron constancias con los filtros seleccionados
          </p>
          <p className="mt-1">
            Cada nueva acción ejecutada en POLIS se registrará automáticamente en este visor.
          </p>
        </div>
      )}

      {!isPending && !error && elementos.length > 0 && (
        <div className="space-y-2">
          {elementos.map((item: NotificacionLectura) => {
            const eventoInfo = EVENTO_LABELS[item.tipo_evento] ?? {
              label: item.tipo_evento,
              tone: "neutral" as StatusTone,
            };
            const estadoInfo = ESTADO_BADGES[item.estado_envio] ?? {
              label: item.estado_envio,
              tone: "neutral" as StatusTone,
            };

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-3 hover:border-[var(--border-strong)] transition-colors text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[var(--text-primary)] tracking-wide">
                      {item.codigo_radicado}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => copiarRadicado(item.codigo_radicado)}
                      className="size-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      title="Copiar radicado"
                    >
                      {copiadoId === item.codigo_radicado ? (
                        <Check className="size-3 text-[var(--accent)]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                    <StatusBadge tone={eventoInfo.tone}>
                      {eventoInfo.label}
                    </StatusBadge>
                    <StatusBadge tone={estadoInfo.tone}>
                      {estadoInfo.label}
                    </StatusBadge>
                  </div>

                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {item.asunto}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
                    <span>
                      Destino: <strong className="text-[var(--text-secondary)]">{item.destinatario_correo}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(item.creado_en).toLocaleString("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    {item.error_detalle && (
                      <span className="text-[var(--destructive)] truncate max-w-xs" title={item.error_detalle}>
                        (Detalle: {item.error_detalle})
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <a
                    href={`/api/v1/notificaciones/radicado/${encodeURIComponent(item.codigo_radicado)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                    title="Verificar radicado en endpoint público"
                  >
                    <span>Verificar fe pública</span>
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {!isPending && !error && total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
          <span>
            Mostrando {desplazamiento + 1}–{Math.min(desplazamiento + PAGE_SIZE, total)} de {total} constancias
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={desplazamiento === 0}
              onClick={() => setDesplazamiento((prev) => Math.max(0, prev - PAGE_SIZE))}
              className="h-7 px-2 text-xs"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="px-2 font-mono text-[11px]">
              {paginaActual} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={desplazamiento + PAGE_SIZE >= total}
              onClick={() => setDesplazamiento((prev) => prev + PAGE_SIZE)}
              className="h-7 px-2 text-xs"
              aria-label="Página siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
