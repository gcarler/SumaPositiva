"use client";

import { useMemo } from "react";
import { Download, ExternalLink, SlidersHorizontal, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { usePanels } from "@/core/panels/panel-store";
import type { EstadoEntrega, FuenteInformacion } from "../models/fuente";
import { useFuentesFiltradas, useFuentesStore } from "../state/fuentes-store";
import { sanitizarCsv } from "@/shared/lib/csv";

function formatearEstado(estado: EstadoEntrega): {
  etiqueta: string;
  variante: "success" | "info" | "warning" | "destructive" | "ember";
} {
  switch (estado) {
    case "entregada":
      return { etiqueta: "Entregada", variante: "success" };
    case "en_termino":
      return { etiqueta: "En Término", variante: "info" };
    case "incompleta":
      return { etiqueta: "Incompleta", variante: "warning" };
    case "vencida_sin_entrega":
      return { etiqueta: "Vencida sin Entrega", variante: "destructive" };
    case "requerimiento_insistencia":
      return { etiqueta: "Insistencia Radicada", variante: "ember" };
    default:
      return { etiqueta: estado, variante: "info" };
  }
}

export function FuentesDataGrid() {
  const fuentes = useFuentesFiltradas();
  const totalTodas = useFuentesStore((s) => s.fuentes.length);
  const { openPanel } = usePanels();

  const handleExportarCsv = () => {
    if (fuentes.length === 0) {
      toast.error("No hay registros para exportar con los filtros seleccionados");
      return;
    }

    const cabeceras = [
      "ID",
      "Código",
      "Entidad",
      "Nombre de Fuente",
      "Tipo",
      "Ámbito",
      "Dimensión Seguridad",
      "Periodicidad",
      "Radicado Solicitud",
      "Fecha Solicitud",
      "Fecha Límite",
      "Estado Entrega",
      "Variables Solicitadas",
      "Resumen Datos Entregados",
      "URL Adjunto",
      "Responsable",
      "Email Responsable",
      "Observaciones de Calidad",
      "Última Actualización",
    ];

    const filas = fuentes.map((f) => [
      sanitizarCsv(f.id),
      sanitizarCsv(f.codigo),
      sanitizarCsv(f.entidad),
      sanitizarCsv(f.nombreFuente),
      sanitizarCsv(f.tipo),
      sanitizarCsv(f.ambito),
      sanitizarCsv(f.dimensionSeguridad),
      sanitizarCsv(f.periodicidad),
      sanitizarCsv(f.radicadoSolicitud ?? ""),
      sanitizarCsv(f.fechaSolicitud ?? ""),
      sanitizarCsv(f.fechaLimiteRespuesta ?? ""),
      sanitizarCsv(f.estadoEntrega),
      sanitizarCsv(f.variablesSolicitadas.join("; ")),
      sanitizarCsv(f.datosEntregadosResumen ?? ""),
      sanitizarCsv(f.archivoAdjuntoUrl ?? ""),
      sanitizarCsv(f.responsableContacto?.nombre ?? ""),
      sanitizarCsv(f.responsableContacto?.email ?? ""),
      sanitizarCsv(f.observacionesCalidad ?? ""),
      sanitizarCsv(f.actualizadoEn),
    ]);

    const contenidoCsv = "\uFEFF" + [cabeceras.join(","), ...filas.map((fila) => fila.join(","))].join("\r\n");
    const blob = new Blob([contenidoCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `polis_fuentes_informacion_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${fuentes.length} fuentes exportadas a CSV con éxito`);
  };

  const handleExportarJson = () => {
    if (fuentes.length === 0) {
      toast.error("No hay registros para exportar con los filtros seleccionados");
      return;
    }

    const dataStr = JSON.stringify(fuentes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `polis_fuentes_informacion_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${fuentes.length} fuentes exportadas a JSON`);
  };

  const abrirGestion = (fuente: FuenteInformacion) => {
    openPanel("fuente-editor", { fuenteId: fuente.id });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-text-secondary">
          Mostrando <strong className="text-text-primary">{fuentes.length}</strong> de{" "}
          <strong className="text-text-primary">{totalTodas}</strong> fuentes de información registradas
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="size-3.5" aria-hidden="true" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportarCsv} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="size-4" aria-hidden="true" />
                <span>Exportar CSV (Excel)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportarJson} className="gap-2 cursor-pointer">
                <FileJson className="size-4" aria-hidden="true" />
                <span>Exportar JSON</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[110px] text-xs font-semibold text-text-secondary">Código</TableHead>
                <TableHead className="min-w-[240px] text-xs font-semibold text-text-secondary">Entidad y Fuente</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold text-text-secondary">Ámbito / Tipo</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold text-text-secondary">Dimensión</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold text-text-secondary">Radicación / Fechas</TableHead>
                <TableHead className="w-[150px] text-xs font-semibold text-text-secondary">Estado Entrega</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-semibold text-text-secondary">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-text-secondary">
                      <SlidersHorizontal className="size-6 text-text-tertiary" aria-hidden="true" />
                      <p className="text-sm font-medium text-text-primary">
                        No se encontraron fuentes con los criterios seleccionados
                      </p>
                      <p className="text-xs text-text-tertiary">
                        Intenta ajustar o reiniciar los filtros de búsqueda.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fuentes.map((fuente) => {
                  const estadoInfo = formatearEstado(fuente.estadoEntrega);
                  return (
                    <TableRow
                      key={fuente.id}
                      className="border-border transition-colors hover:bg-surface-2"
                    >
                      <TableCell className="align-top font-mono text-xs font-medium text-text-secondary">
                        {fuente.codigo}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-semibold text-text-primary">
                            {fuente.nombreFuente}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {fuente.entidad}
                          </div>
                          {fuente.archivoAdjuntoUrl && (
                            <a
                              href={fuente.archivoAdjuntoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-ember hover:underline"
                            >
                              <span>Ver recurso</span>
                              <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="text-xs font-medium capitalize text-text-primary">
                            {fuente.ambito}
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {fuente.tipo}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="secondary" className="capitalize text-[11px]">
                          {fuente.dimensionSeguridad}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 text-xs">
                          {fuente.radicadoSolicitud ? (
                            <div className="font-mono text-[11px] font-medium text-text-primary">
                              {fuente.radicadoSolicitud}
                            </div>
                          ) : (
                            <span className="text-text-tertiary italic">Sin radicar</span>
                          )}
                          {fuente.fechaLimiteRespuesta && (
                            <div className="text-[11px] text-text-secondary">
                              Límite: {fuente.fechaLimiteRespuesta}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={estadoInfo.variante} className="text-xs">
                          {estadoInfo.etiqueta}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirGestion(fuente)}
                          className="h-8 text-xs"
                        >
                          Gestionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
