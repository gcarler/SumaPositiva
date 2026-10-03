"use client";

import { useMemo } from "react";
import { FileEdit, ShieldAlert, Sparkles, MapPin, Eye, Scale } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { usePanels } from "@/core/panels/panel-store";
import type { AlternativaSolucion } from "../models/alternativa";
import {
  ESTADOS_ALTERNATIVA,
  SECTORES_MGA,
  LINEAS_ESTRATEGICAS_MAP,
  DIMENSIONES_ONU_MAP,
} from "../models/alternativa";

interface AlternativasTablaProps {
  alternativas: AlternativaSolucion[];
  puedeEditar: boolean;
}

export function formatCop(cop: number): string {
  if (!cop || cop === 0) return "$ 0 COP";
  return `$ ${cop.toLocaleString("es-CO")} COP`;
}

export function AlternativasTabla({
  alternativas,
  puedeEditar,
}: AlternativasTablaProps) {
  const { openPanel } = usePanels();

  const handleAbrirPanel = (alt: AlternativaSolucion) => {
    openPanel("alternativa-editor", {
      alternativaId: alt.id,
      modo: puedeEditar ? "editar" : "ver",
      soloLectura: !puedeEditar,
    });
  };

  const handleEvaluarViabilidad = (alt: AlternativaSolucion) => {
    openPanel("evaluacion-viabilidad", {
      alternativaId: alt.id,
      soloLectura: !puedeEditar,
    });
  };

  if (alternativas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-12 text-center">
        <Sparkles className="h-10 w-10 text-text-muted" />
        <h3 className="mt-3 text-base font-semibold text-text-primary">
          No se encontraron alternativas formuladas
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          No hay iniciativas que coincidan con los criterios de búsqueda o filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-surface-2 hover:bg-surface-2">
              <TableHead className="w-[120px] font-semibold text-text-primary">
                Código
              </TableHead>
              <TableHead className="min-w-[280px] font-semibold text-text-primary">
                Nombre de la Alternativa y Territorio
              </TableHead>
              <TableHead className="w-[190px] font-semibold text-text-primary">
                Sector / Dimensión
              </TableHead>
              <TableHead className="w-[160px] font-semibold text-text-primary">
                Línea Estratégica
              </TableHead>
              <TableHead className="w-[150px] text-right font-semibold text-text-primary">
                Costo Estimado
              </TableHead>
              <TableHead className="w-[90px] text-center font-semibold text-text-primary">
                Plazo
              </TableHead>
              <TableHead className="w-[140px] text-center font-semibold text-text-primary">
                Viabilidad MGA
              </TableHead>
              <TableHead className="w-[210px] text-right font-semibold text-text-primary">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alternativas.map((alt) => {
              const sectorInfo = SECTORES_MGA[alt.sector];
              const estadoInfo = ESTADOS_ALTERNATIVA[alt.estado];
              const lineaNombre =
                LINEAS_ESTRATEGICAS_MAP[alt.linea_estrategica_codigo] ??
                alt.linea_estrategica_codigo;
              const dimensionNombre =
                DIMENSIONES_ONU_MAP[alt.dimension_id] ?? alt.dimension_id;

              return (
                <TableRow
                  key={alt.id}
                  className="border-b border-border/50 hover:bg-surface-2/60 transition-colors"
                >
                  {/* Código */}
                  <TableCell className="font-mono text-xs font-semibold text-text-primary">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 border border-border">
                      {alt.codigo}
                    </span>
                  </TableCell>

                  {/* Nombre y Territorio */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-sm text-text-primary">
                        <span>{alt.nombre}</span>
                      </div>
                      <p className="line-clamp-2 text-xs text-text-muted">
                        {alt.descripcion}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                          <MapPin className="h-3 w-3 text-text-muted shrink-0" />
                          <span>{alt.territorio_cobertura}</span>
                        </span>
                        {alt.requiere_consulta_previa && (
                          <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning border border-warning/30">
                            <ShieldAlert className="h-3 w-3" />
                            Consulta Previa Ley 70/93
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Sector / Dimensión */}
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-medium"
                      >
                        {sectorInfo?.label ?? alt.sector}
                      </Badge>
                      <span className="text-[11px] text-text-muted">
                        Dim: {dimensionNombre}
                      </span>
                    </div>
                  </TableCell>

                  {/* Línea Estratégica */}
                  <TableCell>
                    <span
                      className="text-xs text-text-primary line-clamp-2"
                      title={lineaNombre}
                    >
                      {lineaNombre}
                    </span>
                  </TableCell>

                  {/* Costo Estimado */}
                  <TableCell className="text-right">
                    <div className="font-semibold text-sm text-text-primary">
                      {formatCop(alt.costo_estimado_cop)}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {alt.fuentes_financiacion_sugeridas?.join(", ") || "Por asignar"}
                    </div>
                  </TableCell>

                  {/* Plazo / Horizonte */}
                  <TableCell className="text-center font-medium text-xs text-text-primary">
                    {alt.horizonte_anios} {alt.horizonte_anios === 1 ? "año" : "años"}
                  </TableCell>

                  {/* Estado de Viabilidad */}
                  <TableCell className="text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold border ${estadoInfo.toneClass}`}
                    >
                      {estadoInfo.label}
                    </span>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs font-medium text-accent border-accent/30 hover:bg-accent-soft"
                        onClick={() => handleEvaluarViabilidad(alt)}
                        aria-label={`Evaluar viabilidad con IA para ${alt.codigo}`}
                        title="Evaluar viabilidad jurídica y fiscal con Agentes IA DNP"
                      >
                        <Scale className="h-3.5 w-3.5" />
                        <span>Evaluar IA</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs font-medium"
                        onClick={() => handleAbrirPanel(alt)}
                        aria-label={`${puedeEditar ? "Editar" : "Ver"} alternativa ${alt.codigo}`}
                      >
                        {puedeEditar ? (
                          <>
                            <FileEdit className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Ficha</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
