"use client";

import type { BarrioCartagena } from "../data/barrios-cartagena";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  CheckCircle2,
  Calendar,
  Building2,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface AcuerdosBarrioTabProps {
  barrio: BarrioCartagena;
  onIrAProponer: () => void;
}

export function AcuerdosBarrioTab({
  barrio,
  onIrAProponer,
}: AcuerdosBarrioTabProps) {
  // Acuerdos institucionales concertados para la Localidad y el Barrio
  const acuerdos = [
    {
      id: "ac-1",
      titulo: `Pacto Comunitario de Convivencia y Seguridad en ${barrio.nombre}`,
      descripcion:
        "Focalización de patrullaje preventivo y mediación comunitaria con líderes barriales y madres comunitarias para la reducción de riñas y desarme juvenil.",
      entidad: "Secretaría del Interior y Convivencia Ciudadana",
      plazo: "Vigencia 2026",
      estado: "Concertado en Mesa",
      tipo: "convivencia",
    },
    {
      id: "ac-2",
      titulo: "Corredores Seguros e Iluminación Pública Focalizada",
      descripcion:
        "Adecuación de luminarias autónomas y tecnología LED en los sectores de mayor tránsito escolar, paraderos de buses y callejones vulnerables.",
      entidad: "Distriseguridad / Secretaría de Infraestructura",
      plazo: "Fase 1 (Cuatrienio 2024–2027)",
      estado: "Priorizado",
      tipo: "infraestructura",
    },
    {
      id: "ac-3",
      titulo: "Red de Alarmas Comunitarias y Conexión con CAD 123",
      descripcion:
        "Instalación de sirenas y pulsadores vecinales vinculados al centro de despacho de la Policía Metropolitana para respuesta rápida en el sector.",
      entidad: "Distriseguridad / Policía Metropolitana",
      plazo: "En ejecución",
      estado: "En curso",
      tipo: "tecnologia",
    },
    {
      id: "ac-4",
      titulo: "Rutas de Oportunidad Laboral y Formación Juvenil",
      descripcion:
        "Cupos preferenciales en programas de capacitación técnica, bilingüismo y proyectos productivos para jóvenes de sectores populares.",
      entidad: "Secretaría de Participación y Desarrollo Social",
      plazo: "Convocatoria 2026",
      estado: "Concertado en Mesa",
      tipo: "social",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado contextual */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-[var(--ember)] border-[var(--border-strong)]"
          >
            {barrio.mesaCodigo}
          </Badge>
          <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
            <Calendar className="size-3" /> Mesas Territoriales 2026
          </span>
        </div>

        <h3 className="mt-2 text-sm font-bold text-[var(--text-primary)]">
          {barrio.mesaNombre}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
          Acuerdos ciudadanos pactados entre la Alcaldía Mayor de Cartagena, las
          Juntas de Acción Comunal y la comunidad de {barrio.nombre} (
          {barrio.localidad}).
        </p>

        {/* Prioridades barriales registradas */}
        <div className="mt-3 rounded-lg bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
            <ShieldAlert className="size-3 text-[var(--ember)]" />
            Prioridades concertadas para {barrio.nombre}:
          </span>
          <ul className="mt-1.5 space-y-1">
            {barrio.prioridades.map((p, idx) => (
              <li
                key={idx}
                className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5"
              >
                <span className="text-[var(--ember)] font-bold">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lista de Acuerdos */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Compromisos Oficiales con el Sector ({acuerdos.length})
        </h4>

        {acuerdos.map((ac) => (
          <div
            key={ac.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h5 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                {ac.titulo}
              </h5>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] border-[var(--border-strong)] text-[var(--success)] bg-[var(--surface-2)]"
              >
                <CheckCircle2 className="size-3 mr-1" />
                {ac.estado}
              </Badge>
            </div>

            <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              {ac.descripcion}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <Building2 className="size-3 text-[var(--text-secondary)]" />
                <span className="font-medium text-[var(--text-secondary)]">
                  {ac.entidad}
                </span>
              </span>
              <span className="font-mono text-[10px]">{ac.plazo}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Llamado a la acción: Proponer */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
        <p className="text-xs font-medium text-[var(--text-primary)]">
          ¿Tu calle o sector necesita otra solución prioritaria?
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          Radica tu propuesta directa con radicado oficial POL-2026-XXXX.
        </p>
        <div className="mt-3">
          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={onIrAProponer}
            className="w-full sm:w-auto gap-1.5 font-semibold text-xs"
          >
            <span>Radicar propuesta para {barrio.nombre}</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
