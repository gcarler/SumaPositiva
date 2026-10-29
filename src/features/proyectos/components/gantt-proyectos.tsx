"use client";

import { Fragment, useMemo } from "react";
import { CalendarRange } from "lucide-react";
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
 * Diagrama de Gantt de la vista agregada de Proyectos.
 * La ventana temporal se calcula a partir de las actividades filtradas:
 * extremos redondeados al 1 y al fin de mes. Diferente del Gantt de
 * comunicaciones (ventana fija de la Fase de Diagnóstico) porque aquí
 * conviven fuentes con horizonte anual completo (Plan de Acción).
 * Reglas del kit: clases semánticas por estado (Regla 2), estado legible
 * además del color (Regla 6), clic en barra/fila abre el módulo dueño.
 */

function clasesBarra(estado: EstadoCanonico): string {
  switch (estado) {
    case "completada":
      return "bg-success/80 text-text-inverse hover:bg-success/90 hover:text-text-inverse";
    case "en_progreso":
      return "bg-info/80 text-text-inverse hover:bg-info/90 hover:text-text-inverse";
    case "reprogramada":
    case "cancelada":
      return "bg-warning/80 text-text-inverse hover:bg-warning/90 hover:text-text-inverse";
    case "programada":
      return "bg-ember/80 text-ember-foreground hover:bg-ember/90 hover:text-ember-foreground";
    default:
      return "bg-surface-3 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-secondary";
  }
}

function clasesPunto(estado: EstadoCanonico): string {
  switch (estado) {
    case "completada":
      return "bg-success";
    case "en_progreso":
      return "bg-info";
    case "reprogramada":
    case "cancelada":
      return "bg-warning";
    case "programada":
      return "bg-ember";
    default:
      return "border border-border bg-surface-3";
  }
}

function iso(d: Date): string {
  const mes = `${d.getMonth() + 1}`.padStart(2, "0");
  const dia = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

interface PropsGantt {
  actividades: ActividadProyecto[];
  onAbrir: (actividad: ActividadProyecto) => void;
}

export function GanttProyectos({ actividades, onAbrir }: PropsGantt) {
  const ordenadas = useMemo(
    () =>
      [...actividades].sort(
        (a, b) =>
          a.fecha_inicio.localeCompare(b.fecha_inicio) ||
          // Las ventanas abiertas (fecha_fin nula) van al final de su día de inicio.
          (a.fecha_fin ?? "9999-12-31").localeCompare(b.fecha_fin ?? "9999-12-31"),
      ),
    [actividades],
  );

  const ventana = useMemo(() => {
    if (ordenadas.length === 0) {
      const hoy = new Date();
      return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
    }
    const primeras = ordenadas.map((a) => a.fecha_inicio);
    const ultimas = ordenadas.map((a) => a.fecha_fin ?? a.fecha_inicio);
    const min = primeras.reduce((a, b) => (a < b ? a : b));
    const max = ultimas.reduce((a, b) => (a > b ? a : b));
    const dInicio = new Date(`${min}T00:00:00`);
    const dFin = new Date(`${max}T23:59:59.999`);
    return {
      desde: iso(new Date(dInicio.getFullYear(), dInicio.getMonth(), 1)),
      hasta: iso(new Date(dFin.getFullYear(), dFin.getMonth() + 1, 0)),
    };
  }, [ordenadas]);

  const inicioMs = new Date(`${ventana.desde}T00:00:00`).getTime();
  const finMs = new Date(`${ventana.hasta}T23:59:59.999`).getTime();
  const msVentana = Math.max(finMs - inicioMs, 1);

  // Meses de la ventana, con ancho proporcional implícito (flex-1 cada uno
  // divide en partes iguales del calendario; cada mes calendario tiene 1 parte).
  const meses = useMemo(() => {
    const salida: { titulo: string; desde: string; hasta: string }[] = [];
    const actual = new Date(`${ventana.desde}T00:00:00`);
    const fin = new Date(`${ventana.hasta}T00:00:00`);
    let guardas = 0;
    while (actual <= fin && guardas < 18) {
      const desdeMes = iso(actual);
      const hastaMes = iso(new Date(actual.getFullYear(), actual.getMonth() + 1, 0));
      salida.push({
        titulo: actual.toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
        desde: desdeMes,
        hasta: hastaMes,
      });
      actual.setMonth(actual.getMonth() + 1);
      guardas += 1;
    }
    return salida;
  }, [ventana]);

  const hoyIso = iso(new Date());
  const hoyPct = ((new Date(`${hoyIso}T12:00:00`).getTime() - inicioMs) / msVentana) * 100;

  function porcentaje(fecha: Date): number {
    return ((fecha.getTime() - inicioMs) / msVentana) * 100;
  }

  function recortar(a: ActividadProyecto): { izq: number; ancho: number } {
    const izq = Math.max(porcentaje(new Date(`${a.fecha_inicio}T00:00:00`)), 0);
    const fin = Math.min(
      porcentaje(new Date(`${a.fecha_fin ?? a.fecha_inicio}T23:59:59.999`)),
      100,
    );
    return { izq, ancho: Math.max(fin - izq, 1.5) };
  }

  function corto(isoFecha: string): string {
    return `${isoFecha.slice(8, 10)}/${isoFecha.slice(5, 7)}`;
  }

  if (ordenadas.length === 0) {
    return (
      <section
        aria-label="Diagrama de Gantt de proyectos"
        className="rounded-lg border border-border bg-surface-1 p-4 text-sm text-text-secondary"
      >
        No hay actividades en los filtros actuales para graficar.
      </section>
    );
  }

  return (
    <section
      aria-label="Diagrama de Gantt de proyectos"
      className="rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarRange className="size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold text-text-primary">Cronograma agregado</h3>
          <Badge variant="info" className="text-[9px]">
            {corto(ventana.desde)} – {corto(ventana.hasta)}
          </Badge>
        </div>
        <p className="text-2xs text-text-secondary">
          Ventana calculada según las actividades filtradas · Clic en una barra o
          fila para abrir el módulo dueño.
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-[720px] flex-col">
          {/* Encabezado: meses con ancho proporcional + rótulo de Hoy */}
          <div className="flex">
            <div
              aria-hidden="true"
              className="w-64 shrink-0 border-r border-border bg-surface-2 px-2 py-1"
            >
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-secondary">
                Actividad
              </span>
            </div>
            <div className="relative flex-1">
              <div className="flex border-b border-border">
                {meses.map((mes) => (
                  <div
                    key={mes.titulo}
                    className="flex-1 border-l border-border bg-surface-2 px-1.5 py-1 truncate text-2xs font-bold text-text-primary"
                    title={mes.titulo}
                  >
                    {mes.titulo.replace(" de ", " ")}
                  </div>
                ))}
              </div>
              <div className="relative h-4">
                {hoyPct >= 0 && hoyPct <= 100 && (
                  <span
                    className="absolute bottom-0 z-10 -translate-x-1/2 rounded-sm bg-ember/10 px-1 text-[9px] font-bold whitespace-nowrap text-ember"
                    style={{ left: `${hoyPct}%` }}
                  >
                    Hoy: {corto(hoyIso)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filas de actividades; banderas visibles por módulo (Regla 6). */}
          <div className="divide-y divide-border">
            {ordenadas.map((a) => {
              const cfg = ESTADOS_CANONICOS[a.estado_canonico];
              const modulo = MODULOS_PROYECTOS[a.modulo_dueno];
              const { izq, ancho } = recortar(a);
              return (
                <div key={a.id} className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onAbrir(a)}
                    aria-label={`${modulo.label}: ${a.titulo}, estado ${cfg.label}`}
                    className="h-auto w-64 shrink-0 flex-col items-start justify-start gap-1 rounded-none border-r border-border px-2 py-2 text-left normal-case hover:bg-surface-2 hover:text-text-primary"
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <span className="truncate font-mono text-[10px] font-bold text-primary">
                        {modulo.label}
                      </span>
                      <Badge variant={cfg.tone} className="ml-auto text-[9px]">
                        {cfg.label}
                      </Badge>
                    </span>
                    <span
                      className="whitespace-normal break-words w-full text-2xs font-semibold text-text-primary"
                      title={a.titulo}
                    >
                      {a.titulo}
                    </span>
                    <span
                      className="whitespace-normal break-words w-full text-[10px] font-normal text-text-tertiary"
                      title={a.responsable || a.territorio}
                    >
                      {a.responsable || a.territorio || modulo.label}
                    </span>
                  </Button>

                  <div className="relative flex-1">
                    {/* Fondo por mes para la retícula visual */}
                    <div className="absolute inset-0 flex">
                      {meses.map((mes) => (
                        <span
                          key={mes.desde}
                          aria-hidden="true"
                          className="flex-1 border-l border-border/40"
                        />
                      ))}
                    </div>
                    {/* Línea de «Hoy» */}
                    {hoyPct >= 0 && hoyPct <= 100 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-primary"
                        style={{ left: `${hoyPct}%` }}
                      />
                    )}
                    <div className="relative flex items-center" style={{ minHeight: 44 }}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onAbrir(a)}
                        aria-label={`${a.titulo}. Del ${a.fecha_inicio} al ${a.fecha_fin ?? "ventana abierta"}. Estado: ${cfg.label}`}
                        className={`absolute top-1/2 z-0 h-6 -translate-y-1/2 overflow-hidden rounded-md px-1.5 font-semibold ${clasesBarra(a.estado_canonico)}`}
                        style={{ left: `${izq}%`, width: `${ancho}%` }}
                      >
                        <span className="truncate text-[10px] tabular-nums whitespace-nowrap">
                          {a.estado_canonico === "pendiente" && !a.fecha_fin
                            ? corto(a.fecha_inicio)
                            : `${corto(a.fecha_inicio)} – ${a.fecha_fin ? corto(a.fecha_fin) : "abierto"}`}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-2xs text-text-secondary">
        Leyenda:
        {ESTADOS_CANONICOS_ORDER.map((estado) => (
          <Fragment key={estado}>
            {" · "}
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-full align-middle ${clasesPunto(estado)}`}
            />
            <span className="ml-0.5 align-middle">{ESTADOS_CANONICOS[estado].label}</span>
          </Fragment>
        ))}
      </p>
    </section>
  );
}
