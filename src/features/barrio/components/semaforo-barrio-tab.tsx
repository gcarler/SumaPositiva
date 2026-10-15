"use client";

import type { BarrioCartagena } from "../data/barrios-cartagena";
import { Badge } from "@/shared/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  Building,
} from "lucide-react";

interface SemaforoBarrioTabProps {
  barrio: BarrioCartagena;
}

type NivelSemaforo = "verde" | "amarillo" | "rojo";

interface IndicadorSemaforo {
  id: string;
  nombre: string;
  categoria: string;
  nivel: NivelSemaforo;
  valorActual: string;
  metaCuatrienio: string;
  fuente: string;
  estadoTexto: string;
  diagnosticoBarrial: string;
  icono: "seguridad" | "convivencia" | "participacion" | "percepcion";
}

export function SemaforoBarrioTab({ barrio }: SemaforoBarrioTabProps) {
  const indicadores: IndicadorSemaforo[] = [
    {
      id: "ind-1",
      nombre: "Tasa de Homicidios y Violencia Letal",
      categoria: "Seguridad y Protección a la Vida",
      nivel: "amarillo",
      valorActual: "34.8 por 100k hab.",
      metaCuatrienio: "Reducción a ≤ 18.0",
      fuente: "Medicina Legal / Policía Nacional (SIEDCO 2024–2025)",
      estadoTexto: "Atención Focalizada",
      diagnosticoBarrial: `Sectores de ${barrio.nombre} y corredores aledaños cuentan con priorización del Plan Titán 24 para control de armas y patrullaje preventivo.`,
      icono: "seguridad",
    },
    {
      id: "ind-2",
      nombre: "Hurtos a Personas y Comercio",
      categoria: "Patrimonio y Tranquilidad",
      nivel: "amarillo",
      valorActual: "612 casos / 100k hab.",
      metaCuatrienio: "Reducción del 25%",
      fuente: "Policía Metropolitana de Cartagena",
      estadoTexto: "Vigilancia Activa",
      diagnosticoBarrial:
        "Instalación de cámaras conectadas al CAD 123 y luminarias LED en paraderos de transporte público del sector.",
      icono: "seguridad",
    },
    {
      id: "ind-3",
      nombre: "Pactos de Convivencia y Desarme Juvenil",
      categoria: "Tejido Social y Paz Territorial",
      nivel: "verde",
      valorActual: "8 pactos barriales activos",
      metaCuatrienio: "Cero fronteras invisibles",
      fuente: "Secretaría del Interior y Convivencia Ciudadana",
      estadoTexto: "Avance Positivo",
      diagnosticoBarrial: `En ${barrio.localidad} operan gestores de convivencia comunitarios mediando conflictos entre sectores juveniles.`,
      icono: "convivencia",
    },
    {
      id: "ind-4",
      nombre: "Percepción de Seguridad en el Barrio",
      categoria: "Confianza Ciudadana",
      nivel: "amarillo",
      valorActual: "31.8% favorable",
      metaCuatrienio: "Superar el 50%",
      fuente: "Encuesta Cartagena Cómo Vamos (2024–2025)",
      estadoTexto: "En Recuperación",
      diagnosticoBarrial:
        "La comunidad demanda mayor presencia policial en horarios nocturnos y recuperación de parques vecinales.",
      icono: "percepcion",
    },
    {
      id: "ind-5",
      nombre: "Mesas de Diálogo y Acuerdos Ciudadanos",
      categoria: "Gobernanza y Participación",
      nivel: "verde",
      valorActual: "37 mesas / 38 agendas",
      metaCuatrienio: "100% cobertura distrital",
      fuente: "Alcaldía Mayor de Cartagena de Indias",
      estadoTexto: "Meta Cumplida",
      diagnosticoBarrial: `Mesa asignada: ${barrio.mesaCodigo} (${barrio.mesaNombre}) con compromisos territoriales vigentes.`,
      icono: "participacion",
    },
  ];

  const renderBadgeNivel = (nivel: NivelSemaforo, texto: string) => {
    if (nivel === "verde") {
      return (
        <Badge
          variant="outline"
          className="gap-1 border-[var(--border-strong)] text-[var(--success)] bg-[var(--surface-2)] text-[11px]"
        >
          <CheckCircle2 className="size-3" />
          <span>{texto}</span>
        </Badge>
      );
    }
    if (nivel === "amarillo") {
      return (
        <Badge
          variant="outline"
          className="gap-1 border-[var(--border-strong)] text-[var(--ember)] bg-[var(--ember-soft)] text-[11px]"
        >
          <AlertTriangle className="size-3" />
          <span>{texto}</span>
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="gap-1 border-[var(--border-strong)] text-[var(--danger)] bg-[var(--surface-2)] text-[11px]"
      >
        <AlertCircle className="size-3" />
        <span>{texto}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Explicación del semáforo para la comunidad */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--ember-soft)] text-[var(--ember)]">
            <Activity className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Semáforo de Seguridad y Convivencia
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Datos verificables para {barrio.nombre} y el Distrito de Cartagena
            </p>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="size-2.5 rounded-full bg-[var(--success)]" />
            <span className="text-[10px] font-bold text-[var(--text-primary)]">
              Verde
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)] leading-tight">
              Avance Positivo
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="size-2.5 rounded-full bg-[var(--ember)]" />
            <span className="text-[10px] font-bold text-[var(--text-primary)]">
              Amarillo
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)] leading-tight">
              Atención Focalizada
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="size-2.5 rounded-full bg-[var(--danger)]" />
            <span className="text-[10px] font-bold text-[var(--text-primary)]">
              Rojo
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)] leading-tight">
              Alerta Crítica
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetas de Indicadores */}
      <div className="space-y-3">
        {indicadores.map((ind) => (
          <div
            key={ind.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)] block">
                  {ind.categoria}
                </span>
                <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug mt-0.5">
                  {ind.nombre}
                </h4>
              </div>
              {renderBadgeNivel(ind.nivel, ind.estadoTexto)}
            </div>

            {/* Cifras clave */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface-2)] p-2">
              <div>
                <span className="text-[9px] text-[var(--text-tertiary)] block">
                  Dato Oficial Actual
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                  {ind.valorActual}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-tertiary)] block">
                  Meta Distrital
                </span>
                <span className="text-xs font-bold text-[var(--ember)] font-mono">
                  {ind.metaCuatrienio}
                </span>
              </div>
            </div>

            {/* Contexto territorial para el barrio */}
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              {ind.diagnosticoBarrial}
            </p>

            {/* Fuente Oficial */}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-[var(--border)] text-[10px] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1 truncate max-w-[280px]">
                <Building className="size-3 text-[var(--text-secondary)] shrink-0" />
                <span className="truncate">{ind.fuente}</span>
              </span>
              <span className="font-mono">2026</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
