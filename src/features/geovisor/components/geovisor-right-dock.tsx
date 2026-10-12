"use client";

import React, { useState } from "react";
import {
  FileText,
  BarChart3,
  MapPin,
  CalendarClock,
  Users,
  ExternalLink,
  X,
  FileSearch,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui/tabs";
import { GeovisorBiSidebar } from "./geovisor-bi-sidebar";
import type { VariableMapa } from "../data/estadisticas.data";
import type { MesaGeovisor } from "../services/mesas-geovisor-api";
import { cn } from "@/shared/lib/utils";

export interface GeovisorRightDockProps {
  mesaSeleccionada: MesaGeovisor | null;
  onCerrarMesa: () => void;
  onAbrirPanelMesa?: (mesaId: string) => void;
  territorioId: string;
  onSelectTerritorio: (id: string) => void;
  variableMapa: VariableMapa;
  onOpenDetalleDrawer?: (territorioId: string) => void;
  defaultTab?: "mesa" | "territorio";
  className?: string;
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

export function GeovisorRightDock({
  mesaSeleccionada,
  onCerrarMesa,
  onAbrirPanelMesa,
  territorioId,
  onSelectTerritorio,
  variableMapa,
  onOpenDetalleDrawer,
  defaultTab = "mesa",
  className,
}: GeovisorRightDockProps) {
  const [prevMesaId, setPrevMesaId] = useState<string | null>(mesaSeleccionada?.id ?? null);
  const [tabActiva, setTabActiva] = useState<string>(defaultTab);

  if (mesaSeleccionada && mesaSeleccionada.id !== prevMesaId) {
    setPrevMesaId(mesaSeleccionada.id);
    setTabActiva("mesa");
  } else if (!mesaSeleccionada && prevMesaId !== null) {
    setPrevMesaId(null);
  }

  // Cálculo de porcentaje de asistencia vs meta estimada (~60 participantes estándar)
  const metaParticipacion = 60;
  const porcentajeAsistencia = mesaSeleccionada
    ? Math.min(100, Math.round((mesaSeleccionada.total_asistentes / metaParticipacion) * 100))
    : 0;

  return (
    <aside
      role="region"
      aria-label="Panel derecho del Geovisor: Inspector y Analítica BI"
      data-testid="geovisor-right-dock"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-[var(--surface-1)] text-[var(--text-primary)]",
        className
      )}
    >
      <Tabs
        value={tabActiva}
        onValueChange={setTabActiva}
        className="flex h-full flex-col"
      >
        {/* ENCABEZADO DE PESTAÑAS */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 px-2 pt-2">
          <TabsList className="grid h-8 w-full grid-cols-2 rounded-lg bg-[var(--surface-0)] p-0.5 border border-[var(--border)]">
            <TabsTrigger
              value="mesa"
              className="gap-1.5 text-xs py-1 data-[state=active]:bg-[var(--surface-1)] data-[state=active]:text-[var(--text-primary)]"
            >
              <FileText className="size-3.5 text-[var(--ember)]" />
              <span>Ficha Técnica</span>
            </TabsTrigger>
            <TabsTrigger
              value="territorio"
              className="gap-1.5 text-xs py-1 data-[state=active]:bg-[var(--surface-1)] data-[state=active]:text-[var(--text-primary)]"
            >
              <BarChart3 className="size-3.5 text-[var(--info)]" />
              <span>Territorio & BI</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PESTAÑA 1: FICHA TÉCNICA DE MESA */}
        <TabsContent
          value="mesa"
          className="m-0 flex-1 overflow-y-auto p-3 outline-none"
        >
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
                Haz clic sobre cualquier mesa en el mapa SIG, en el directorio izquierdo o
                en la consola de datos inferior para inspeccionar su ficha técnica de diálogo social.
              </p>
            </div>
          )}
        </TabsContent>

        {/* PESTAÑA 2: ANALÍTICA TERRITORIAL & BI */}
        <TabsContent
          value="territorio"
          className="m-0 flex-1 overflow-y-auto p-3 outline-none"
        >
          <GeovisorBiSidebar
            territorioId={territorioId}
            onSelectTerritorio={onSelectTerritorio}
            variableMapa={variableMapa}
            onOpenDetalleDrawer={onOpenDetalleDrawer}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
