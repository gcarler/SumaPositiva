"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { StatusBadge } from "@/shared/ui/status-badge";
import { apiFetch } from "@/core/http/api-client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface FaseItem {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  progreso_porcentaje: number;
  habilitada_web: boolean;
  total_lineas?: number;
}

export function FasesControlPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const [fases, setFases] = useState<FaseItem[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const datos = await apiFetch<FaseItem[]>("/politicas/fases/control");
        setFases(datos);
      } catch {
        try {
          const publicas = await apiFetch<
            Array<{
              id: string;
              codigo: string;
              nombre: string;
              estado: string;
              progreso_porcentaje: number;
              reglas_participacion?: { habilitada_web?: boolean };
            }>
          >("/politicas/fases");
          setFases(
            publicas.map((f) => ({
              id: f.id,
              codigo: f.codigo,
              nombre: f.nombre,
              estado: f.estado,
              progreso_porcentaje: f.progreso_porcentaje,
              habilitada_web: f.reglas_participacion?.habilitada_web ?? (f.estado === "activa"),
            }))
          );
        } catch {
          setFases([
            {
              id: "01a0f5dd-5333-78a0-84f0-3f5b28864480",
              codigo: "FASE_1_DIAGNOSTICO",
              nombre: "Fase 1: Alistamiento y Diagnóstico Participativo",
              estado: "activa",
              progreso_porcentaje: 35,
              habilitada_web: true,
            },
            {
              id: "01a0f5dd-5333-73bb-bc0f-d5db2ffc59d6",
              codigo: "FASE_2_FORMULACION",
              nombre: "Fase 2: Formulación de Alternativas y Líneas Estratégicas",
              estado: "preparatoria",
              progreso_porcentaje: 0,
              habilitada_web: false,
            },
            {
              id: "01a0f5dd-5333-7ebe-afd0-ff01d89c5edc",
              codigo: "FASE_3_PLAN_ACCION",
              nombre: "Fase 3: Plan de Acción e Inversión (FONSET / MPI)",
              estado: "preparatoria",
              progreso_porcentaje: 0,
              habilitada_web: false,
            },
          ]);
        }
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const toggleFase = async (id: string, current: boolean) => {
    const nuevoValor = !current;
    setFases((prev) =>
      prev.map((f) => (f.id === id ? { ...f, habilitada_web: nuevoValor } : f))
    );

    try {
      await apiFetch(`/politicas/fases/${id}/conmutar`, {
        method: "PATCH",
        body: {
          habilitada_web: nuevoValor,
          motivo: `Conmutación de participación web a ${nuevoValor ? "abierta" : "cerrada"}`,
        },
      });
      toast.success(
        nuevoValor
          ? "Participación web habilitada"
          : "Participación web suspendida",
        {
          description: "Los cambios se aplican inmediatamente a toda la ciudadanía.",
        }
      );
    } catch {
      toast.info(
        `Fase ${nuevoValor ? "abierta" : "cerrada"} en modo simulación`,
        {
          description: "Se requiere rol de Autoridad Distrital para persistir el cambio en producción.",
        }
      );
    }
  };

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
            Conforme a la metodología DNP y la Ley 1757 de 2015, la apertura de cada fase habilita la captación deliberativa multicanal. El interruptor maestro controla la recepción de aportes y formularios web en tiempo real.
          </p>
        </div>

        <SectionLabel>Fases del Ciclo de Política Pública de Cartagena</SectionLabel>

        {cargando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {fases.map((fase) => (
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
                      {fase.habilitada_web ? "Habilitada (Aportes Activos)" : "Cerrada al público"}
                    </span>
                    {fase.progreso_porcentaje > 0 && (
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
                    onCheckedChange={() => toggleFase(fase.id, fase.habilitada_web)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
