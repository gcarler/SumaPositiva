"use client";

import React from "react";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";

export interface GeovisorFichaMesaProps {
  mesaSeleccionada: MesaGeovisor | null;
  onCerrarMesa: () => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "Fecha no registrada";
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(
      new Date(`${fecha}T12:00:00`)
    );
  } catch {
    return fecha;
  }
}

const META_PARTICIPACION = 60;

/** Ficha técnica de la mesa seleccionada (aforo, acuerdos, evidencia y acciones). */
export function GeovisorFichaMesa({
  mesaSeleccionada,
  onCerrarMesa,
  onAbrirPanelMesa,
}: GeovisorFichaMesaProps) {
  const metaParticipacion = META_PARTICIPACION;
  const porcentajeAsistencia = mesaSeleccionada
    ? Math.min(100, Math.round((mesaSeleccionada.total_asistentes / metaParticipacion) * 100))
    : 0;

  return (
    <div data-testid="geovisor-ficha-mesa" className="h-full overflow-y-auto p-3">
          {mesaSeleccionada ? (
            <article
              className="flex flex-col gap-3 rounded-xl border border-[var(--ember)]/50 bg-[var(--surface-0)] p-3.5 shadow-xs"
              aria-label={`Ficha de mesa ${mesaSeleccionada.nombre}`}
            >
              {/* Header de la Ficha */}
              <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Cód. {mesaSeleccionada.id.toUpperCase()}
                    </span>
                    <StatusBadge
                      tone={mesaSeleccionada.realizada ? "success" : "warning"}
                    >
                      {mesaSeleccionada.realizada ? "Realizada" : "Programada"}
                    </StatusBadge>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                    {mesaSeleccionada.nombre}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCerrarMesa}
                  className="size-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label="Cerrar ficha de mesa"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Datos de Ubicación y Cronograma */}
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-[var(--ember)] shrink-0" />
                  <span className="font-medium text-[var(--text-primary)]">
                    {mesaSeleccionada.territorio_nombre ?? "Cartagena"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-3.5 text-[var(--text-tertiary)] shrink-0" />
                  <span>
                    {formatearFecha(mesaSeleccionada.fecha)}
                    {mesaSeleccionada.horario ? ` (${mesaSeleccionada.horario})` : ""}
                  </span>
                </div>
              </div>

              {/* Asistencia y Porcentaje de Cumplimiento */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Users className="size-3.5 text-[var(--info)]" />
                    Asistencia Registrada:
                  </span>
                  <span className="font-bold tabular text-[var(--text-primary)]">
                    {mesaSeleccionada.total_asistentes} participantes
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--ember)] transition-all"
                    style={{ width: `${porcentajeAsistencia}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[var(--text-tertiary)]">
                  <span>Aforo proyectado: {metaParticipacion}</span>
                  <span>{porcentajeAsistencia}% de meta</span>
                </div>
              </div>

              {/* Acuerdos y Compromisos */}
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                  Concertación Comunitaria
                </span>
                <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  Mesa vinculante para la formulación participativa de la Política
                  Distrital de Seguridad Humana. Consigna acuerdos en seguridad comunitaria,
                  convivencia y priorización barrial.
                </p>
              </div>

              {/* Galería de Fotografías */}
              {mesaSeleccionada.fotos && mesaSeleccionada.fotos.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Evidencia Territorial ({mesaSeleccionada.fotos.length})
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {mesaSeleccionada.fotos.map((foto) => (
                      <figure
                        key={foto.id}
                        className="overflow-hidden rounded-lg border border-[var(--border)]"
                      >
                        <img
                          src={foto.archivo_url}
                          alt={foto.descripcion || "Fotografía de la mesa"}
                          loading="lazy"
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones de la Ficha */}
              <div className="pt-2 flex flex-col gap-2">
                {onAbrirPanelMesa && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onAbrirPanelMesa(mesaSeleccionada.id)}
                    className="w-full gap-1.5 text-xs bg-[var(--ember)] text-[var(--surface-0)] hover:bg-[var(--ember)]/90"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Ver acta viva y papelógrafo</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCerrarMesa}
                  className="w-full text-xs text-[var(--text-secondary)]"
                >
                  Cerrar inspección
                </Button>
              </div>
            </article>
          ) : (
            /* Estado Vacío Explicativo */
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-[var(--text-tertiary)]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] mb-3">
                <FileSearch className="size-6 text-[var(--ember)]" />
              </div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                Ninguna mesa seleccionada
              </h4>
              <p className="max-w-xs text-[11px] leading-relaxed">
                Haz clic sobre cualquier mesa en el mapa SIG, en el directorio de mesas o
                en el DataGrid para inspeccionar su ficha técnica de diálogo social.
              </p>
            </div>
          )}
    </div>
  );
}
