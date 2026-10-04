"use client";

import { CheckSquare, FileEdit, Eye, AlertCircle, Building2 } from "lucide-react";
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
import type { CompromisoInstitucional } from "../models/compromiso";
import { ESTADOS_COMPROMISO } from "../models/compromiso";

interface CompromisosTablaProps {
  compromisos: CompromisoInstitucional[];
  puedeEditar: boolean;
}

export function formatCop(cop: number | null | undefined): string {
  if (cop === null || cop === undefined) return "Sin reporte";
  if (cop === 0) return "$ 0 COP";
  return `$ ${cop.toLocaleString("es-CO")} COP`;
}

function getProgressColor(porcentaje: number | null | undefined, estado: string): string {
  if (estado === "retrasado") return "bg-danger";
  if (estado === "en_riesgo") return "bg-warning";
  if (porcentaje !== null && porcentaje !== undefined && (porcentaje >= 100 || estado === "cumplido")) return "bg-success";
  if (porcentaje !== null && porcentaje !== undefined && porcentaje >= 50) return "bg-accent";
  return "bg-info";
}

export function CompromisosTabla({
  compromisos,
  puedeEditar,
}: CompromisosTablaProps) {
  const { openPanel } = usePanels();

  const handleAbrirPanel = (compromiso: CompromisoInstitucional) => {
    openPanel("compromiso-editor", {
      compromisoId: compromiso.id,
      modo: puedeEditar ? "editar" : "ver",
      soloLectura: !puedeEditar,
    });
  };

  if (compromisos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-12 text-center">
        <AlertCircle className="h-10 w-10 text-text-muted" />
        <h3 className="mt-3 text-base font-semibold text-text-primary">
          No se encontraron compromisos institucionales
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          No hay metas o compromisos que coincidan con los filtros de búsqueda o entidad seleccionada.
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
                Compromiso Institucional y Meta
              </TableHead>
              <TableHead className="w-[190px] font-semibold text-text-primary">
                Entidad Responsable
              </TableHead>
              <TableHead className="w-[150px] font-semibold text-text-primary">
                Línea / MGA
              </TableHead>
              <TableHead className="w-[180px] font-semibold text-text-primary">
                Avance Cuatrienal
              </TableHead>
              <TableHead className="w-[130px] text-center font-semibold text-text-primary">
                Estado
              </TableHead>
              <TableHead className="w-[150px] text-right font-semibold text-text-primary">
                Presupuesto Anual
              </TableHead>
              <TableHead className="w-[160px] text-right font-semibold text-text-primary">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compromisos.map((c) => {
              const infoEstado = ESTADOS_COMPROMISO[c.estado] ?? {
                label: c.estado,
                badgeVariant: "default" as const,
              };
              const colorProgreso = getProgressColor(c.porcentaje_cumplimiento, c.estado);

              return (
                <TableRow
                  key={c.id}
                  className="border-b border-border transition-colors hover:bg-surface-2/60"
                >
                  <TableCell className="font-mono text-xs font-semibold text-accent">
                    <div className="flex items-center gap-1.5">
                      <span>{c.codigo}</span>
                      {c.metadatos?.es_demostracion && (
                        <Badge variant="outline" className="text-[10px] text-warning border-warning/30 bg-warning/10">
                          DEMO
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-text-primary">
                        {c.nombre}
                      </span>
                      <span className="line-clamp-2 text-xs text-text-muted">
                        {c.meta_cuatrienal_descripcion}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                      <Badge variant="outline" className="text-xs">
                        {c.entidad_responsable}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-medium text-text-secondary">
                        {c.linea_estrategica_codigo}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {c.alternativa_mga_codigo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.porcentaje_cumplimiento === null || c.porcentaje_cumplimiento === undefined || c.estado === "sin_reporte" ? (
                      <div className="flex flex-col gap-0.5 text-xs text-text-muted">
                        <span className="font-medium text-text-secondary">Sin medición / Sin reporte</span>
                        <span className="text-[11px]">Meta: {c.meta_cuatrienal_valor.toLocaleString("es-CO")} {c.unidad_medida}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-text-primary">
                            {(c.avance_cuatrienal_valor ?? 0).toLocaleString("es-CO")} / {c.meta_cuatrienal_valor.toLocaleString("es-CO")} {c.unidad_medida}
                          </span>
                          <span className="font-mono font-semibold text-text-secondary">
                            {c.porcentaje_cumplimiento}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${colorProgreso}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, c.porcentaje_cumplimiento))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={infoEstado.badgeVariant}>
                      {infoEstado.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-medium text-text-primary">
                    {formatCop(c.presupuesto_anual_cop)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={puedeEditar ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAbrirPanel(c)}
                      className="gap-1.5 text-xs"
                    >
                      {puedeEditar ? (
                        <>
                          <FileEdit className="h-3.5 w-3.5" />
                          <span>Gestionar Avance</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Detalle</span>
                        </>
                      )}
                    </Button>
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
