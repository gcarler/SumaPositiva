"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Notice } from "@/shared/ui/notice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Inbox,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSMStore } from "../state/sm-store";
import {
  SM_CANALES_META,
  SM_ESTADOS_META,
  type SMCanal,
  type SMEstadoMensaje,
  type SMEstadoSalud,
} from "../models/sm-types";

interface SMPanelOperativoProps {
  className?: string;
  soloLectura?: boolean;
}

const ESTADO_SALUD_CONFIG: Record<
  SMEstadoSalud,
  { label: string; badgeVariant: "success" | "warning" | "destructive"; icon: typeof CheckCircle2; descripcion: string }
> = {
  saludable: {
    label: "Saludable",
    badgeVariant: "success",
    icon: CheckCircle2,
    descripcion: "El motor transaccional SM Core y sus adaptadores operan con normalidad.",
  },
  degradado: {
    label: "Degradado",
    badgeVariant: "warning",
    icon: AlertTriangle,
    descripcion: "Se detectan demoras en cola de outbox o reintentos acumulados.",
  },
  critico: {
    label: "Crítico",
    badgeVariant: "destructive",
    icon: AlertOctagon,
    descripcion: "Acumulación de mensajes agotados o indisponibilidad en adaptadores de canal.",
  },
};

function IconoCanal({ canal }: { canal: SMCanal }) {
  switch (canal) {
    case "correo":
      return <Mail className="size-3.5" aria-hidden="true" />;
    case "whatsapp":
      return <MessageCircle className="size-3.5" aria-hidden="true" />;
    case "telegram":
      return <Send className="size-3.5" aria-hidden="true" />;
    case "sms":
      return <MessageSquare className="size-3.5" aria-hidden="true" />;
    case "webhook":
      return <Webhook className="size-3.5" aria-hidden="true" />;
    default:
      return <Server className="size-3.5" aria-hidden="true" />;
  }
}

export function SMPanelOperativo({ className = "", soloLectura = false }: SMPanelOperativoProps) {
  const clientStore = useSMStore();
  const store = typeof window === "undefined" ? useSMStore.getState() : clientStore;
  const {
    salud,
    mensajes,
    cargando,
    ejecutandoWorker,
    ultimoResumenWorker,
    error,
    filtros,
    setFiltros,
    recargarTodo,
    ejecutarOutbox,
  } = store;

  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    void recargarTodo();
  }, [recargarTodo]);

  const handleEjecutarWorker = async () => {
    try {
      const resumen = await ejecutarOutbox(25);
      toast.success(
        `Ronda ejecutada: ${resumen.procesados} procesados, ${resumen.enviados} enviados, ${resumen.fallidos} fallidos, ${resumen.agotados} agotados.`
      );
    } catch {
      toast.error("Error al despachar la ronda de outbox en SM Core.");
    }
  };

  const handleCopiarHash = async (hash: string, id: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiadoId(id);
      toast.success("Hash forense copiado al portapapeles");
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      toast.error("No se pudo copiar el hash");
    }
  };

  // Sin respuesta de la API no se inventa salud ni canales: se muestra el error.
  const saludConfig = salud ? ESTADO_SALUD_CONFIG[salud.estado] : null;
  const IconoSalud = saludConfig?.icon ?? Server;

  const canalesVivos = salud?.canales_vivos ?? [];
  const totalMensajes = mensajes.length;
  const pendientes = salud?.pendientes ?? mensajes.filter((m) => m.estado === "pendiente" || m.estado === "encolado").length;
  const enviados = salud?.enviados ?? mensajes.filter((m) => m.estado === "enviado" || m.estado === "entregado").length;
  const fallidos = salud?.fallidos ?? mensajes.filter((m) => m.estado === "fallido").length;
  const agotados = mensajes.filter((m) => m.estado === "agotado").length;

  return (
    <section
      aria-label="Panel Operativo SM Core"
      data-testid="sm-panel-operativo"
      className={`space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6 ${className}`}
    >
      {error && (
        <Notice tone="danger" title="No se pudo consultar SM Core">
          <span className="text-xs">{error}</span>
        </Notice>
      )}

      {/* Encabezado y Estado de Salud Global */}
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--ember-soft)] text-[var(--ember)]">
              <Zap className="size-4" aria-hidden="true" />
            </span>
            <span className="label-micro text-[var(--ember)] uppercase font-bold tracking-wider">
              SM Core • Subnúcleo Transaccional
            </span>
            {saludConfig ? (
              <Badge variant={saludConfig.badgeVariant} className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <IconoSalud className="size-3" aria-hidden="true" />
                {saludConfig.label}
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <Server className="size-3" aria-hidden="true" />
                Sin datos
              </Badge>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Panel Operativo de Notificaciones y Outbox
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            {saludConfig?.descripcion ?? "No se pudo cargar el estado operativo. Revisa la conexión con la API de SM Core."}{" "}
            El contacto se conserva como seudónimo (hash) y el contenido se limita a resúmenes institucionales.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void recargarTodo()}
            disabled={cargando}
            className="text-xs h-8"
            aria-label="Actualizar métricas y mensajes de SM Core"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${cargando ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </Button>

          {!soloLectura && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleEjecutarWorker}
              disabled={ejecutandoWorker}
              className="text-xs h-8"
              data-testid="btn-ejecutar-outbox"
            >
              <Play className={`size-3.5 mr-1.5 ${ejecutandoWorker ? "animate-pulse" : ""}`} aria-hidden="true" />
              {ejecutandoWorker ? "Despachando..." : "Ejecutar ronda de outbox"}
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Estado */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="kpis-sm-core">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3.5">
          <div className="flex items-center justify-between text-[var(--text-tertiary)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendientes</span>
            <Clock className="size-3.5 text-[var(--warning)]" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {pendientes}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)]">En cola de salida</span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3.5">
          <div className="flex items-center justify-between text-[var(--text-tertiary)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Enviados</span>
            <CheckCircle2 className="size-3.5 text-[var(--success)]" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--success)]">
            {enviados}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)]">Despachados con éxito</span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3.5">
          <div className="flex items-center justify-between text-[var(--text-tertiary)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Fallidos</span>
            <AlertTriangle className="size-3.5 text-[var(--danger)]" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--danger)]">
            {fallidos}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)]">En reintento o error</span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3.5">
          <div className="flex items-center justify-between text-[var(--text-tertiary)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Agotados</span>
            <AlertOctagon className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {agotados}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)]">Límite reintentos</span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3.5">
          <div className="flex items-center justify-between text-[var(--text-tertiary)]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Canales Vivos</span>
            <Activity className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
          </div>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--ember)]">
            {canalesVivos.length}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] truncate block">
            {canalesVivos.join(", ")}
          </span>
        </div>
      </div>

      {/* Retroalimentación de la última ejecución del worker */}
      {ultimoResumenWorker && (
        <Notice
          tone="info"
          title="Última ronda de despacho de outbox ejecutada"
          className="text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
            <span className="text-[var(--text-secondary)]">Resultado del procesamiento por lote:</span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Procesados: <strong>{ultimoResumenWorker.procesados}</strong></span>
              <span>Enviados: <strong className="text-[var(--success)]">{ultimoResumenWorker.enviados}</strong></span>
              <span>Fallidos: <strong className="text-[var(--danger)]">{ultimoResumenWorker.fallidos}</strong></span>
              <span>Agotados: <strong>{ultimoResumenWorker.agotados}</strong></span>
            </div>
          </div>
        </Notice>
      )}

      {/* Visor de Canales Multicanal */}
      <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <Server className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
            Estado de Adaptadores y Canales Institucionales
          </h3>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Gobernanza Multicanal POLIS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {(Object.keys(SM_CANALES_META) as SMCanal[]).map((canal) => {
            const meta = SM_CANALES_META[canal];
            const estaVivo = canalesVivos.includes(canal);

            return (
              <div
                key={canal}
                className="flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5"
                data-testid={`canal-${canal}`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--text-primary)]">
                  <IconoCanal canal={canal} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {meta.label}
                    </p>
                    <span
                      className={`size-2 rounded-full shrink-0 ${
                        estaVivo ? "bg-[var(--success)]" : "bg-[var(--text-tertiary)]"
                      }`}
                      title={estaVivo ? "Canal operativo" : "Canal en reposo o inactivo"}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {estaVivo ? "Operativo" : "En reposo"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros y Tabla del Outbox */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Inbox className="size-4 text-[var(--ember)]" aria-hidden="true" />
              Bandeja de Salida (Outbox Transaccional)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Auditoría forense de mensajes despachados sin exposición de datos personales sensibles (Habeas Data Ley 1581).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filtros.canal ?? "todos"}
              onValueChange={(val) => setFiltros({ canal: val as SMCanal | "todos" })}
            >
              <SelectTrigger className="text-xs h-8 w-36">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos los canales</SelectItem>
                {(Object.keys(SM_CANALES_META) as SMCanal[]).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {SM_CANALES_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtros.estado ?? "todos"}
              onValueChange={(val) => setFiltros({ estado: val as SMEstadoMensaje | "todos" })}
            >
              <SelectTrigger className="text-xs h-8 w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos los estados</SelectItem>
                {(Object.keys(SM_ESTADOS_META) as SMEstadoMensaje[]).map((e) => (
                  <SelectItem key={e} value={e} className="text-xs">
                    {SM_ESTADOS_META[e].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla Accesible */}
        {totalMensajes === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-tertiary)] space-y-1.5">
            <Inbox className="size-8 mx-auto text-[var(--text-tertiary)]/50" aria-hidden="true" />
            <p className="font-semibold text-[var(--text-primary)]">
              No hay mensajes registrados en el outbox
            </p>
            <p>Los eventos institucionales disparados aparecerán listados aquí para auditoría forense.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
            <table className="w-full text-left text-xs" aria-label="Mensajes del Outbox SM Core">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5">ID / Evento</th>
                  <th scope="col" className="px-3.5 py-2.5">Canal</th>
                  <th scope="col" className="px-3.5 py-2.5">Asunto / Contenido</th>
                  <th scope="col" className="px-3.5 py-2.5">Hash Contacto (Ley 1581)</th>
                  <th scope="col" className="px-3.5 py-2.5">Estado</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {mensajes.map((msg) => {
                  const estadoMeta = SM_ESTADOS_META[msg.estado] ?? { label: msg.estado, badgeVariant: "outline" };
                  const canalMeta = SM_CANALES_META[msg.canal] ?? { label: msg.canal, badgeVariant: "outline" };
                  const hashTruncado = msg.contacto_hash ? `${msg.contacto_hash.substring(0, 8)}...${msg.contacto_hash.substring(msg.contacto_hash.length - 6)}` : "sin-hash";

                  return (
                    <tr
                      key={msg.id}
                      className="transition-colors hover:bg-[var(--surface-1)]"
                      data-testid={`fila-sm-${msg.id}`}
                    >
                      <td className="px-3.5 py-3 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                        <span className="font-semibold text-[var(--text-primary)] block">
                          {msg.id.substring(0, 10)}...
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {msg.actor}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Badge
                          variant={canalMeta.badgeVariant}
                          className="flex items-center gap-1 text-[10px] w-fit"
                        >
                          <IconoCanal canal={msg.canal} />
                          {canalMeta.label}
                        </Badge>
                      </td>

                      <td className="px-3.5 py-3 min-w-[200px] max-w-[320px]">
                        <p className="font-semibold text-[var(--text-primary)] truncate">
                          {msg.asunto || msg.plantilla || "Mensaje sin asunto"}
                        </p>
                        {msg.cuerpo && (
                          <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                            {msg.cuerpo}
                          </p>
                        )}
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)] flex items-center gap-1"
                            title={`Seudónimo SHA-256 del contacto: ${msg.contacto_hash} (tratamiento de datos Ley 1581 de 2012)`}
                          >
                            <Lock className="size-2.5 text-[var(--ember)]" aria-hidden="true" />
                            {hashTruncado}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void handleCopiarHash(msg.contacto_hash, msg.id)}
                            className="size-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            aria-label={`Copiar hash forense del mensaje ${msg.id}`}
                          >
                            {copiadoId === msg.id ? (
                              <CheckCircle2 className="size-3 text-[var(--success)]" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                        <span className="text-[9px] text-[var(--success)] flex items-center gap-0.5 mt-0.5 font-medium">
                          <ShieldCheck className="size-2.5" aria-hidden="true" />
                          Contacto seudonimizado
                        </span>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Badge variant={estadoMeta.badgeVariant} className="text-[10px]">
                          {estadoMeta.label}
                        </Badge>
                      </td>

                      <td className="px-3.5 py-3 text-right text-[11px] text-[var(--text-tertiary)] tabular whitespace-nowrap">
                        {msg.creado_en && !isNaN(new Date(msg.creado_en).getTime())
                          ? format(new Date(msg.creado_en), "d MMM, HH:mm", { locale: es })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
