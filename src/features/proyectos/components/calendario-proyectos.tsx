"use client";

import { useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  MODULOS_PROYECTOS,
  type ActividadProyecto,
} from "../models/actividad-proyecto";

/**
 * Calendario mensual de la vista Proyectos.
 * MVP: muestra el mes en curso del navegador con un resumen por día
 * (hasta 3 actividades visibles y un contador «+N» para el resto).
 * Una actividad ocupa la celda de su día cada vez que el día cae dentro
 * de su ventana [fecha_inicio, fecha_fin]; ventanas abiertas solo marcan
 * su día de inicio. El clic en una fila abre el módulo dueño.
 */
interface PropsCalendario {
  actividades: ActividadProyecto[];
  onAbrir: (actividad: ActividadProyecto) => void;
}

const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function isoDe(dia: Date): string {
  const mes = `${dia.getMonth() + 1}`.padStart(2, "0");
  const dia2 = `${dia.getDate()}`.padStart(2, "0");
  return `${dia.getFullYear()}-${mes}-${dia2}`;
}

export function CalendarioProyectos({ actividades, onAbrir }: PropsCalendario) {
  // Ventanas largas (p. ej. Plan de Acción) ocupan una celda por cada día
  // dentro de su rango, sin recortes al mes visible; el tamaño del chip es
  // limitado por el corte de 3 visibles + «+N» por celda.
  const porDia = useMemo(() => {
    const mapa = new Map<string, ActividadProyecto[]>();
    for (const a of actividades) {
      const tocar = (f: string) => {
        const lista = mapa.get(f);
        if (lista) lista.push(a);
        else mapa.set(f, [a]);
      };
      if (a.fecha_fin) {
        for (let f = a.fecha_inicio; f <= a.fecha_fin; ) {
          tocar(f);
          const diaFecha = new Date(`${f}T00:00:00`);
          diaFecha.setDate(diaFecha.getDate() + 1);
          f = isoDe(diaFecha);
        }
      } else {
        tocar(a.fecha_inicio);
      }
    }
    return mapa;
  }, [actividades]);

  const celdas = useMemo(() => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const huecosInicio = (primerDia.getDay() + 6) % 7; // semana inicia en lunes
    const salida: (Date | null)[] = Array.from({ length: huecosInicio }, () => null);
    for (let d = 1; d <= ultimoDia.getDate(); d += 1) {
      salida.push(new Date(hoy.getFullYear(), hoy.getMonth(), d));
    }
    while (salida.length % 7 !== 0) salida.push(null);
    return salida;
  }, []);

  return (
    <section
      aria-label="Calendario mensual de proyectos"
      className="rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-text-primary">
          Calendario mensual: {new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
        </h2>
        <p className="text-2xs text-text-secondary">
          MVP: mes en curso; las ventanas largas ocupan cada día de su rango,
          incluso si inician en otro mes.
        </p>
      </div>
      {/* En 320 px la celda mides ~37 px y el texto del chip queda ilegible;
          la rejilla conserva un ancho mínimo legible y se desplaza dentro de
          su tarjeta (sin desbordamiento de la página, Regla 6). */}
      <div className="mt-3 overflow-x-auto">
      <div
        aria-label={`Calendario de ${new Date().toLocaleDateString("es-CO", { month: "long" })}`}
        className="grid min-w-[28rem] grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border"
      >
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="bg-surface-2 px-1 py-1 text-center text-2xs font-bold uppercase tracking-wider text-text-secondary"
          >
            {dia}
          </div>
        ))}
        {celdas.map((dia, indice) => {
          if (dia === null) {
            return <div key={`hueco-${indice}`} aria-hidden="true" />;
          }
          const isoDia = isoDe(dia);
          const actividadesDelDia = porDia.get(isoDia) ?? [];
          return (
            <div
              key={isoDia}
              aria-label={`${dia.toLocaleDateString("es-CO", { day: "numeric", month: "numeric" })}: ${actividadesDelDia.length} actividades`}
              className="min-h-24 bg-surface-1 p-1.5"
            >
              <span
                className={`text-2xs font-bold tabular-nums ${
                  actividadesDelDia.length > 0 ? "text-text-primary" : "text-text-tertiary"
                }`}
              >
                {dia.getDate()}
              </span>
              <ul className="mt-1 flex flex-col gap-0.5">
                {actividadesDelDia.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Button
                      type="button"
                      variant="unstyled"
                      onClick={() => onAbrir(a)}
                      aria-label={`${MODULOS_PROYECTOS[a.modulo_dueno].label}: ${a.titulo}`}
                      className="block w-full truncate rounded-sm border border-border bg-surface-2 px-1 py-0.5 text-left text-[9px] font-semibold text-text-primary hover:bg-surface-3"
                      title={`${MODULOS_PROYECTOS[a.modulo_dueno].label}: ${a.titulo}`}
                    >
                      {a.titulo}
                    </Button>
                  </li>
                ))}
                {actividadesDelDia.length > 3 && (
                  <li className="pl-1 text-[9px] text-text-tertiary">
                    {`+${actividadesDelDia.length - 3} más`}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      </div>
      <p className="mt-2 text-2xs text-text-secondary">
        Chips por módulo:
        {Object.values(MODULOS_PROYECTOS).map((m) => (
          <Badge key={m.label} variant="secondary" className="ml-1 text-[9px]">
            {m.label}
          </Badge>
        ))}
      </p>
    </section>
  );
}
