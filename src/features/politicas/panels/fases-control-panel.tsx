"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useQueryClient } from "@tanstack/react-query";
import { useFasesControl } from "./use-fases-control";
import { Sparkles, AlertTriangle, RefreshCw } from "lucide-react";

export function FasesControlPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const queryClient = useQueryClient();
  const {
    fases,
    cargando,
    errorCarga,
    conmutandoIds,
    cargar,
    toggleFase,
  } = useFasesControl({ queryClient });

  return (
    <PanelShell
      entryKey={entryKey}
      title="Centro de Control de Fases DNP"
      subtitle="Interruptor maestro del ciclo metodológico y participación ciudadana"
      crumbs={[{ label: "Administración" }, { label: "Fases DNP" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6 space-y-6">
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] flex items-start gap-3">
          <Sparkles className="size-5 text-[var(--ember)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Conforme a la metodología DNP y la Ley 1757 de 2015, la apertura de
            cada fase habilita la captación deliberativa multicanal. El interruptor
            maestro controla la recepción de aportes y formularios web en tiempo
            real. Las operaciones requieren rol de Autoridad Distrital.
          </p>
        </div>

        <SectionLabel>Fases del Ciclo de Política Pública de Cartagena</SectionLabel>

        {errorCarga && (
          <div className="p-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--surface-1)] text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 text-[var(--danger)]">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al consultar fases en el servidor</p>
                <p className="mt-0.5 text-[var(--text-secondary)]">{errorCarga}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cargar}
              className="gap-1.5 shrink-0 text-xs"
            >
              <RefreshCw className="size-3" />
              Reintentar
            </Button>
          </div>
        )}

        {cargando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : fases.length === 0 && !errorCarga ? (
          <div className="p-6 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)]">
            No se encontraron fases configuradas en la base de datos de planeación.
          </div>
        ) : (
          <div className="space-y-4">
            {fases.map((fase) => {
              const estaConmutando = conmutandoIds.has(fase.id);
              return (
                <div
                  key={fase.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                        {fase.nombre}
                      </h4>
                      <StatusBadge
                        tone={
                          fase.estado === "activa"
                            ? "success"
                            : fase.estado === "en_revision"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {fase.estado.toUpperCase()}
                      </StatusBadge>
                      {estaConmutando && (
                        <span className="text-[10px] text-[var(--text-secondary)] animate-pulse">
                          Guardando...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Participación Web:{" "}
                      <span
                        className={
                          fase.habilitada_web
                            ? "text-primary font-medium"
                            : "text-[var(--text-secondary)]"
                        }
                      >
                        {fase.habilitada_web
                          ? "Habilitada (Aportes Activos)"
                          : "Cerrada al público"}
                      </span>
                      {fase.progreso_porcentaje != null && fase.progreso_porcentaje > 0 && (
                        <span className="ml-2 font-mono text-[10px]">
                          • {fase.progreso_porcentaje}% avance
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Label htmlFor={`switch-${fase.id}`} className="sr-only">
                      Alternar participación web para {fase.nombre}
                    </Label>
                    <Switch
                      id={`switch-${fase.id}`}
                      checked={fase.habilitada_web}
                      disabled={estaConmutando}
                      onCheckedChange={() =>
                        toggleFase(fase.id, fase.habilitada_web)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
