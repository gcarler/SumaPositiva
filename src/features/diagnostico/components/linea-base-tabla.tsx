"use client";

import { PlusCircle, ArrowDown, ArrowUp, Database, Calendar } from "lucide-react";
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
import type { FichaIndicador, TipoIndicador } from "../models/indicador";

interface LineaBaseTablaProps {
  indicadores: FichaIndicador[];
  onMedicionRegistrada?: () => void;
}

function formatearValor(valor: string | number, unidad: string): string {
  const num = parseFloat(String(valor || 0));
  if (unidad.toLowerCase().includes("peso")) {
    return `$${num.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
  }
  if (unidad.toLowerCase().includes("porcent")) {
    return `${num.toFixed(1)}%`;
  }
  if (unidad.toLowerCase().includes("tasa")) {
    return `${num.toFixed(1)}`;
  }
  return `${num.toLocaleString("es-CO")} ${unidad}`;
}

function formatearTipo(tipo: TipoIndicador): {
  etiqueta: string;
  variante: "ember" | "info" | "success" | "secondary";
} {
  switch (tipo) {
    case "resultado":
      return { etiqueta: "Resultado", variante: "ember" };
    case "impacto":
      return { etiqueta: "Impacto", variante: "success" };
    case "producto":
      return { etiqueta: "Producto", variante: "info" };
    case "insumo":
      return { etiqueta: "Insumo", variante: "secondary" };
    default:
      return { etiqueta: tipo, variante: "secondary" };
  }
}

export function LineaBaseTabla({ indicadores }: LineaBaseTablaProps) {
  const { openPanel } = usePanels();

  const handleAbrirMedicion = (indicador: FichaIndicador) => {
    openPanel("medicion-editor", {
      fichaId: indicador.id,
      codigoIndicador: indicador.codigo,
      nombreIndicador: indicador.nombre,
      unidadMedida: indicador.unidad_medida,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-surface-2/60">
              <TableHead className="w-28 text-xs font-semibold">Código</TableHead>
              <TableHead className="min-w-[260px] text-xs font-semibold">Indicador DNP / Definición</TableHead>
              <TableHead className="w-28 text-xs font-semibold">Tipo</TableHead>
              <TableHead className="w-32 text-xs font-semibold">Línea Base</TableHead>
              <TableHead className="w-32 text-xs font-semibold">Valor Actual</TableHead>
              <TableHead className="w-36 text-xs font-semibold">Meta Cuatrienio</TableHead>
              <TableHead className="w-24 text-xs font-semibold text-center">Avance</TableHead>
              <TableHead className="min-w-[180px] text-xs font-semibold">Fuente Oficial</TableHead>
              <TableHead className="w-32 text-right text-xs font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicadores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-32 text-center text-xs text-text-tertiary"
                >
                  No se encontraron indicadores que coincidan con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              indicadores.map((ind) => {
                const tipoInfo = formatearTipo(ind.tipo_indicador);
                const avanceNum = parseFloat(String(ind.porcentaje_avance || 0));
                const esSentidoDescendente = ind.sentido_esperado === "descendente";

                return (
                  <TableRow
                    key={ind.id}
                    className="border-b border-border/60 transition-colors hover:bg-surface-2/40"
                  >
                    <TableCell className="font-mono text-xs font-bold text-text-primary">
                      {ind.codigo}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-xs text-text-primary">
                        {ind.nombre}
                      </div>
                      <div className="mt-0.5 text-[11px] text-text-tertiary line-clamp-2">
                        {ind.definicion}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tipoInfo.variante} className="text-[11px]">
                        {tipoInfo.etiqueta}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-text-primary">
                        {formatearValor(ind.linea_base_valor, ind.unidad_medida)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                        <Calendar className="size-2.5" aria-hidden="true" />
                        <span>Año {ind.linea_base_anio}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-text-primary">
                        {parseFloat(String(ind.valor_actual || 0)) > 0
                          ? formatearValor(ind.valor_actual, ind.unidad_medida)
                          : "Sin reporte"}
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        {ind.periodicidad}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-text-primary">
                        {formatearValor(ind.meta_cuatrienio, ind.unidad_medida)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                        {esSentidoDescendente ? (
                          <span className="flex items-center gap-0.5 text-info">
                            <ArrowDown className="size-2.5" aria-hidden="true" />
                            Reducción esperada
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-success">
                            <ArrowUp className="size-2.5" aria-hidden="true" />
                            Incremento esperado
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          avanceNum >= 50
                            ? "success"
                            : avanceNum > 0
                            ? "info"
                            : "outline"
                        }
                        className="text-[11px] font-semibold"
                      >
                        {avanceNum.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <Database className="size-3.5 shrink-0 mt-0.5 text-ember" aria-hidden="true" />
                        <div>
                          <span className="font-medium text-text-primary">
                            {ind.fuente_datos}
                          </span>
                          <div className="text-[10px] text-text-tertiary">
                            {ind.responsable_reporte}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirMedicion(ind)}
                        className="h-8 gap-1.5 text-xs border-border hover:border-ember/50 hover:bg-ember-soft"
                      >
                        <PlusCircle className="size-3.5 text-ember" aria-hidden="true" />
                        <span>Medición</span>
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
  );
}
