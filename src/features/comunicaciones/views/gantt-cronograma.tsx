"use client";

import { Fragment } from "react";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  ESTADOS_TAREA,
  ESTATES_ORDER,
  type EstadoTarea,
  type TareaComunicacion,
} from "../models/tarea-comunicacion";

/**
 * Diagrama de Gantt del plan de comunicaciones.
 * Ventana fija de la Fase de Diagnóstico: 2026-10-27 → 2026-12-31 (66 días).
 * Cada tarea se proyecta con una barra proporcional a su rango de fechas
 * (fechas fuera de la ventana se recortan al borde y la etiqueta conserva el
 * rango real). Barras semánticas por estado con tokens del kit (Regla 2) y
 * texto visible con las fechas, además del Badge de estado en la columna
 * izquierda (Regla 6: el estado no depende solo del color). El clic en la
 * barra o en la fila abre el SidePanel del editor del Encargo 255.
 */
const INICIO_VENTANA = new Date("2026-10-27T00:00:00");
const FIN_VENTANA = new Date("2026-12-31T23:59:59.999");
const MS_VENTANA = FIN_VENTANA.getTime() - INICIO_VENTANA.getTime();

/** Hoy según la especificación del encargo: 28 de octubre de 2026 (la fase inició el 27 de octubre). */
const HOY = new Date("2026-10-28T12:00:00");

/**
 * Marcas de escala (quincenas y extremos) sobre la ventana.
 * Sin marca «28 Oct»: coincide con 0% y choca visualmente con el rótulo
 * «Hoy: 28 oct»; el borde del encabezado del mes delimita esa fecha.
 */
const MARCAS_ESCALA: { label: string; fecha: Date; secundaria: boolean }[] = [
  { label: "31 Oct", fecha: new Date("2026-10-31T00:00:00"), secundaria: true },
  { label: "15 Nov", fecha: new Date("2026-11-15T00:00:00"), secundaria: true },
  { label: "30 Nov", fecha: new Date("2026-11-30T00:00:00"), secundaria: false },
  { label: "15 Dic", fecha: new Date("2026-12-15T00:00:00"), secundaria: true },
  { label: "31 Dic", fecha: new Date("2026-12-31T00:00:00"), secundaria: true },
];

const MESES: { titulo: string; desde: string; hasta: string }[] = [
  { titulo: "Octubre (27–31)", desde: "2026-10-27", hasta: "2026-10-31" },
  { titulo: "Noviembre (1–30)", desde: "2026-11-01", hasta: "2026-11-30" },
  { titulo: "Diciembre (1–31)", desde: "2026-12-01", hasta: "2026-12-31" },
];

interface PropsGantt {
  tareas: TareaComunicacion[];
  onAbrir: (tarea: TareaComunicacion) => void;
}

function porcentaje(fecha: Date): number {
  return ((fecha.getTime() - INICIO_VENTANA.getTime()) / MS_VENTANA) * 100;
}

/** Ajusta la tarea a la ventana; una fecha fuera se recorta al borde. */
function recortar(tarea: TareaComunicacion): { izq: number; ancho: number } {
  const izq = Math.max(
    porcentaje(new Date(`${tarea.fecha_inicio}T00:00:00`)),
    0,
  );
  const fin = Math.min(
    porcentaje(new Date(`${tarea.fecha_fin}T23:59:59.999`)),
    100,
  );
  return { izq, ancho: Math.max(fin - izq, 1.5) };
}

/** Formato DD/MM para la etiqueta visible de cada barra. */
function corto(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Colores de barra por estado con clases semánticas del kit (Regla 2). */
function clasesBarra(estado: EstadoTarea): string {
  switch (estado) {
    case "completada":
      return "bg-success/80 text-text-inverse hover:bg-success/90 hover:text-text-inverse";
    case "en_progreso":
      return "bg-info/80 text-text-inverse hover:bg-info/90 hover:text-text-inverse";
    case "reprogramada":
      return "bg-warning/80 text-text-inverse hover:bg-warning/90 hover:text-text-inverse";
    default:
      return "bg-surface-3 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-secondary";
  }
}

/** Punto de la leyenda: solo el token de fondo por estado. */
function clasesPunto(estado: EstadoTarea): string {
  switch (estado) {
    case "completada":
      return "bg-success";
    case "en_progreso":
      return "bg-info";
    case "reprogramada":
      return "bg-warning";
    default:
      return "border border-border bg-surface-3";
  }
}

export function GanttCronograma({ tareas, onAbrir }: PropsGantt) {
  const ordenadas = [...tareas].sort(
    (a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.orden - b.orden,
  );
  const hoyPct = porcentaje(HOY);

  return (
    <section
      aria-label="Diagrama de Gantt del cronograma"
      className="rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarRange className="size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold text-text-primary">
            Fase de Diagnóstico
          </h3>
          <Badge variant="info" className="text-[9px]">
            27 Octubre – 31 Diciembre 2026
          </Badge>
        </div>
        <p className="text-2xs text-text-secondary">
          Escala del 27 de octubre al 31 de diciembre · Clic en una barra o fila
          para editar fechas en el panel lateral.
        </p>
      </div>

      {/* Contenedor responsivo: scroll horizontal en pantallas estrechas */}
      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-[680px] flex-col">
          {/* Encabezado: meses con ancho proporcional + etiqueta de Hoy */}
          <div className="flex">
            <div
              aria-hidden="true"
              className="w-56 shrink-0 border-r border-border bg-surface-2 px-2 py-1"
            >
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-secondary">
                Actividad
              </span>
            </div>
            <div className="relative flex-1">
              <div className="flex border-b border-border">
                {MESES.map((mes) => (
                  <div
                    key={mes.titulo}
                    className="flex-1 border-l border-border bg-surface-2 px-1.5 py-1 text-2xs font-bold text-text-primary"
                  >
                    {mes.titulo}
                  </div>
                ))}
              </div>

              {/* Regla quincenal + rótulo accesible de «Hoy» */}
              <div className="relative h-4">
                {MARCAS_ESCALA.map((marca) => (
                  <span
                    key={marca.label}
                    aria-hidden="true"
                    className="absolute top-0.5 text-[9px] tabular-nums text-text-tertiary"
                    style={{ left: `calc(${porcentaje(marca.fecha)}% - 12px)` }}
                  >
                    {marca.label}
                  </span>
                ))}
                <span
                  className="absolute bottom-0 z-10 -translate-x-1/2 rounded-sm bg-ember/10 px-1 text-[9px] font-bold whitespace-nowrap text-ember"
                  style={{ left: `${hoyPct}%` }}
                >
                  Hoy: 28 oct
                </span>
              </div>
            </div>
          </div>

          {/* Filas de tareas */}
          <div className="divide-y divide-border">
            {ordenadas.map((tarea) => {
              const cfg = ESTADOS_TAREA[tarea.estado] ?? ESTADOS_TAREA.pendiente;
              const { izq, ancho } = recortar(tarea);
              return (
                <div key={tarea.id} className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onAbrir(tarea)}
                    aria-label={`Editar tarea ${tarea.codigo}: ${tarea.titulo}, estado ${cfg.label}`}
                    className="h-auto w-56 shrink-0 flex-col items-start justify-start gap-1 rounded-none border-r border-border px-2 py-2 text-left normal-case hover:bg-surface-2 hover:text-text-primary"
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <span className="font-mono text-2xs font-bold text-primary">
                        {tarea.codigo}
                      </span>
                      <Badge
                        variant={cfg.tone}
                        className="ml-auto text-[9px]"
                      >
                        {cfg.label}
                      </Badge>
                    </span>
                    <span
                      className="line-clamp-2 w-full text-2xs font-semibold text-text-primary"
                      title={tarea.titulo}
                    >
                      {tarea.titulo}
                    </span>
                    <span
                      className="w-full truncate text-[10px] font-normal text-text-tertiary"
                      title={tarea.responsable}
                    >
                      Resp: {tarea.responsable}
                    </span>
                  </Button>

                  {/* Carril temporal: retícula quincenal + línea de Hoy + barra */}
                  <div className="relative flex-1">
                    {MARCAS_ESCALA.map((marca) => (
                      <span
                        key={marca.label}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 border-l border-border/60"
                        style={{ left: `${porcentaje(marca.fecha)}%` }}
                      />
                    ))}

                    {/* Línea de «Hoy» continua en toda la columna temporal */}
                    <span
                      aria-hidden={tarea !== ordenadas[0]}
                      role={tarea === ordenadas[0] ? "figure" : undefined}
                      className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-primary"
                      style={{ left: `${hoyPct}%` }}
                      aria-label={
                        tarea === ordenadas[0]
                          ? "Indicador de hoy: 28 de octubre de 2026"
                          : undefined
                      }
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onAbrir(tarea)}
                      aria-label={`${tarea.codigo}: ${tarea.titulo}. Del ${tarea.fecha_inicio} al ${tarea.fecha_fin}. Estado: ${cfg.label}`}
                      className={`absolute top-1/2 z-0 h-6 -translate-y-1/2 overflow-hidden rounded-md px-1.5 font-semibold ${clasesBarra(tarea.estado)}`}
                      style={{ left: `${izq}%`, width: `${ancho}%` }}
                    >
                      <span className="truncate text-[10px] tabular-nums whitespace-nowrap">
                        {corto(tarea.fecha_inicio)} – {corto(tarea.fecha_fin)}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda con texto visible junto a cada punto (Regla 6) */}
      <p className="mt-3 text-2xs text-text-secondary">
        Leyenda:
        {ESTATES_ORDER.map((estado) => (
          <Fragment key={estado}>
            {" · "}
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-full align-middle ${clasesPunto(estado)}`}
            />
            <span className="ml-0.5 align-middle">
              {ESTADOS_TAREA[estado].label}
            </span>
          </Fragment>
        ))}
      </p>
    </section>
  );
}
