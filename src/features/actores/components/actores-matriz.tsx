"use client";

import { useMemo } from "react";
import { Star, ShieldAlert, HeartHandshake, Eye, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { usePanels } from "@/core/panels/panel-store";
import type { ActorEstrategico, CuadranteMatriz, PosturaActor } from "../models/actor";
import { calcularCuadrante, useActoresFiltrados } from "../state/actores-store";

function formatearPostura(postura: PosturaActor): {
  etiqueta: string;
  variante: "success" | "info" | "warning" | "destructive" | "secondary";
} {
  switch (postura) {
    case "promotor_aliado":
      return { etiqueta: "Promotor / Aliado", variante: "success" };
    case "neutral_expectante":
      return { etiqueta: "Neutral / Expectante", variante: "info" };
    case "critico_opositor":
      return { etiqueta: "Crítico / Opositor", variante: "warning" };
    case "vulnerable_reclamante":
      return { etiqueta: "Vulnerable / Reclamante", variante: "destructive" };
    default:
      return { etiqueta: postura, variante: "secondary" };
  }
}

interface CuadranteProps {
  id: CuadranteMatriz;
  titulo: string;
  subtitulo: string;
  estrategia: string;
  actores: ActorEstrategico[];
  icono: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  claseEstilo: string;
  onSeleccionarActor: (id: string) => void;
}

function CuadranteCard({
  titulo,
  subtitulo,
  estrategia,
  actores,
  icono: Icono,
  claseEstilo,
  onSeleccionarActor,
}: CuadranteProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 sm:p-5 transition-all ${claseEstilo}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Icono className="size-4 shrink-0 text-ember" aria-hidden="true" />
            <h3 className="font-semibold text-text-primary text-sm sm:text-base">
              {titulo}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">{subtitulo}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs font-semibold">
          {actores.length} {actores.length === 1 ? "actor" : "actores"}
        </Badge>
      </div>

      <div className="mt-2.5 rounded-lg bg-surface-1/60 px-3 py-1.5 text-[11px] text-text-tertiary">
        <strong className="text-text-secondary font-medium">Estrategia recomendada:</strong>{" "}
        {estrategia}
      </div>

      <div className="mt-3.5 flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
        {actores.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/80 p-4 text-center text-xs text-text-tertiary">
            No hay actores clasificados en este cuadrante con los filtros activos.
          </div>
        ) : (
          actores.map((actor) => {
            const posturaInfo = formatearPostura(actor.postura);
            return (
              <div
                key={actor.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-3.5 shadow-sm transition-all hover:border-border-strong hover:shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {actor.codigo}
                    </span>
                    <Badge variant={posturaInfo.variante} className="text-[10px] py-0 px-1.5">
                      {posturaInfo.etiqueta}
                    </Badge>
                  </div>
                  <h4 className="mt-1 font-semibold text-text-primary text-xs leading-snug line-clamp-2">
                    {actor.nombre}
                  </h4>
                  <div className="mt-1 text-[11px] text-text-secondary line-clamp-1">
                    {actor.contacto.organizacion}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px]">
                  <div className="flex items-center gap-1 text-text-tertiary truncate">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate capitalize">
                      {actor.territorio.replace("_", " ")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSeleccionarActor(actor.id)}
                    className="h-6 px-2 text-[11px] text-ember hover:text-ember hover:bg-ember-soft gap-1"
                  >
                    <span>Ficha</span>
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ActoresMatriz() {
  const actores = useActoresFiltrados();
  const { openPanel } = usePanels();

  const cuadrantes = useMemo(() => {
    const grupos: Record<CuadranteMatriz, ActorEstrategico[]> = {
      aliados_clave: [],
      incidencia_estrategica: [],
      base_social: [],
      monitoreo: [],
    };

    for (const actor of actores) {
      const c = calcularCuadrante(actor.nivelPoder, actor.nivelInteres);
      grupos[c].push(actor);
    }

    return grupos;
  }, [actores]);

  const handleSeleccionarActor = (id: string) => {
    openPanel("actor-editor", { actorId: id });
  };

  return (
    <div className="space-y-4">
      {/* Guía de lectura de la matriz */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between text-xs text-text-secondary">
        <div>
          <strong className="text-text-primary font-semibold">
            Matriz Metodológica de Involucramiento (Poder vs. Interés):
          </strong>{" "}
          Herramienta de análisis relacional para priorizar canales de diálogo y gobernanza participativa.
        </div>
        <div className="flex items-center gap-3 shrink-0 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-ember" /> Eje Vertical: Poder de Decisión
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-info" /> Eje Horizontal: Interés e Incidencia
          </span>
        </div>
      </div>

      {/* Grilla 2x2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Q1: Gestionar de Cerca (Alto Poder / Alto Interés) */}
        <CuadranteCard
          id="aliados_clave"
          titulo="1. Gestionar de Cerca (Aliados Clave)"
          subtitulo="Alto Poder / Alto Interés en la Política"
          estrategia="Involucrar activamente en mesas técnicas decisorias y acuerdos vinculantes."
          actores={cuadrantes.aliados_clave}
          icono={Star}
          claseEstilo="border-ember/40 bg-surface-1"
          onSeleccionarActor={handleSeleccionarActor}
        />

        {/* Q2: Mantener Satisfechos (Alto Poder / Bajo-Medio Interés) */}
        <CuadranteCard
          id="incidencia_estrategica"
          titulo="2. Mantener Satisfechos (Incidencia Estratégica)"
          subtitulo="Alto Poder / Medio o Bajo Interés Directo"
          estrategia="Mantener alineados con informes ejecutivos periódicos para evitar resistencias."
          actores={cuadrantes.incidencia_estrategica}
          icono={ShieldAlert}
          claseEstilo="border-info/30 bg-surface-1"
          onSeleccionarActor={handleSeleccionarActor}
        />

        {/* Q3: Mantener Informados (Bajo-Medio Poder / Alto Interés) */}
        <CuadranteCard
          id="base_social"
          titulo="3. Mantener Informados (Base Social y Comunitaria)"
          subtitulo="Medio o Bajo Poder / Alto Interés y Afectación"
          estrategia="Canales de consulta pública permanente, papelógrafos territoriales y veedurías."
          actores={cuadrantes.base_social}
          icono={HeartHandshake}
          claseEstilo="border-success/30 bg-surface-1"
          onSeleccionarActor={handleSeleccionarActor}
        />

        {/* Q4: Monitorear (Bajo-Medio Poder / Bajo-Medio Interés) */}
        <CuadranteCard
          id="monitoreo"
          titulo="4. Monitorear (Mínimo Esfuerzo)"
          subtitulo="Medio o Bajo Poder / Medio o Bajo Interés"
          estrategia="Monitoreo informativo a través del portal y boletines generales de política."
          actores={cuadrantes.monitoreo}
          icono={Eye}
          claseEstilo="border-border bg-surface-1"
          onSeleccionarActor={handleSeleccionarActor}
        />
      </div>
    </div>
  );
}
