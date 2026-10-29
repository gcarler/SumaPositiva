"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  ESTADOS_CANONICOS,
  ESTADOS_CANONICOS_ORDER,
  MODULOS_PROYECTOS,
  type ActividadProyecto,
  type EstadoCanonico,
} from "../models/actividad-proyecto";

/**
 * Tablero Kanban genérico de la vista Proyectos.
 * Agrupa por estado canónico y conserva el módulo dueño como chip de origen
 * (Regla 6: origen legible por texto, no solo por color). MVP read-only:
 * el arrastre no reordena el estado — la edición delega al módulo dueño;
 * el arrastre visualista queda deshabilitado con cursor de selección.
 */
interface PropsKanban {
  actividades: ActividadProyecto[];
  onAbrir: (actividad: ActividadProyecto) => void;
}

const TONO_POR_ESTADO: Record<EstadoCanonico, string> = {
  pendiente: "text-text-secondary",
  programada: "text-ember",
  en_progreso: "text-info",
  completada: "text-success",
  reprogramada: "text-warning",
  cancelada: "text-warning",
};

export function KanbanProyectos({ actividades, onAbrir }: PropsKanban) {
  const porEstado = new Map<EstadoCanonico, ActividadProyecto[]>();
  for (const estado of ESTADOS_CANONICOS_ORDER) porEstado.set(estado, []);
  for (const a of actividades) porEstado.get(a.estado_canonico)?.push(a);

  return (
    <div role="list" aria-label="Tablero Kanban de proyectos" className="flex gap-3 overflow-x-auto pb-2">
        {ESTADOS_CANONICOS_ORDER.map((estado) => {
          const cfg = ESTADOS_CANONICOS[estado];
          const tarjeta = porEstado.get(estado) ?? [];
          return (
            <section
              key={estado}
              role="listitem"
              aria-label={`${cfg.label}: ${tarjeta.length} actividades`}
              className="w-64 shrink-0 rounded-lg border border-border bg-surface-1"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-border bg-surface-2 px-3 py-2">
                <h3 className={`text-xs font-bold ${TONO_POR_ESTADO[estado]}`}>{cfg.label}</h3>
                <Badge variant={cfg.tone} className="text-[9px]">
                  {tarjeta.length}
                </Badge>
              </div>
              <ol className="flex max-h-[560px] flex-col gap-2 overflow-y-auto p-2">
                {tarjeta.length === 0 ? (
                  <li className="px-1 py-2 text-[10px] text-text-tertiary">Sin actividades</li>
                ) : (
                  tarjeta.map((a) => {
                    const modulo = MODULOS_PROYECTOS[a.modulo_dueno];
                    return (
                      <li key={a.id}>
                        <Button
                          type="button"
                          variant="unstyled"
                          onClick={() => onAbrir(a)}
                          aria-label={`${modulo.label}: ${a.titulo}. Estado ${cfg.label}${a.avance_pct > 0 ? `, avance ${a.avance_pct}%` : ""}`}
                          className="mb-0 flex w-full flex-col items-start gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-2 text-left transition-colors hover:bg-surface-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ember)]"
                        >
                          <span className="flex w-full items-center gap-1.5">
                            <span className="truncate rounded-sm bg-primary/10 px-1 font-mono text-[9px] font-bold text-primary">
                              {modulo.label}
                            </span>
                            {a.avance_pct > 0 && (
                              <span className="ml-auto text-[9px] font-semibold tabular-nums text-text-secondary">
                                {Math.round(a.avance_pct)}%
                              </span>
                            )}
                          </span>
                          <span className="whitespace-normal break-words text-2xs font-semibold text-text-primary" title={a.titulo}>
                            {a.titulo}
                          </span>
                          <span className="whitespace-normal break-words text-[10px] text-text-tertiary" title={a.etapa ?? a.descripcion}>
                            {a.etapa ?? (a.descripcion || "—")}
                          </span>
                        </Button>
                      </li>
                    );
                  })
                )}
              </ol>
            </section>
          );
        })}
      </div>
  );
}
