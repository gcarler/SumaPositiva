"use client";

import {useEffect} from "react";
import {Download, FileJson, FileSpreadsheet, SlidersHorizontal, UserPlus} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/shared/ui/button";
import {Badge} from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/shared/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/shared/ui/dropdown-menu";
import {usePanels} from "@/core/panels/panel-store";
import type {CuadranteMatriz, PosturaActor} from "../models/actor";
import {calcularCuadrante, useActoresFiltrados, useActoresStore} from "../state/actores-store";
import {sanitizarCsv} from "@/shared/lib/csv";

function formatearCuadrante(cuadrante: CuadranteMatriz): {
  etiqueta: string;
  variante: "ember" | "info" | "success" | "secondary";
} {
  switch (cuadrante) {
    case "aliados_clave":
      return { etiqueta: "Aliados Clave", variante: "ember" };
    case "incidencia_estrategica":
      return { etiqueta: "Incidencia Estratégica", variante: "info" };
    case "base_social":
      return { etiqueta: "Base Social", variante: "success" };
    case "monitoreo":
      return { etiqueta: "Monitoreo", variante: "secondary" };
  }
}

function formatearPostura(postura: PosturaActor): {
  etiqueta: string;
  variante: "success" | "info" | "warning" | "destructive" | "secondary";
} {
  switch (postura) {
    case "promotor_aliado":
      return { etiqueta: "Promotor", variante: "success" };
    case "neutral_expectante":
      return { etiqueta: "Neutral", variante: "info" };
    case "critico_opositor":
      return { etiqueta: "Crítico", variante: "warning" };
    case "vulnerable_reclamante":
      return { etiqueta: "Reclamante", variante: "destructive" };
    default:
      return { etiqueta: postura, variante: "secondary" };
  }
}

export function ActoresDataGrid() {
  const actores = useActoresFiltrados();
  const totalTodos = useActoresStore((s) => s.actores.length);
  const cargarActores = useActoresStore((s) => s.cargarActores);
  const { openPanel } = usePanels();

  useEffect(() => {
    cargarActores();
  }, [cargarActores]);

  const handleExportarCsv = () => {
    if (actores.length === 0) {
      toast.error("No hay registros para exportar con los filtros seleccionados");
      return;
    }

    const cabeceras = [
      "ID",
      "Código",
      "Nombre",
      "Tipo",
      "Territorio",
      "Barrio o Vereda",
      "Dimensiones Principales",
      "Nivel de Poder",
      "Nivel de Interés",
      "Cuadrante Matriz",
      "Postura",
      "Organización",
      "Cargo",
      "Mesas Asistidas",
      "Propuestas Radicadas",
      "Expectativas Principales",
      "Estrategia de Involucramiento",
      "Es Demostración",
      "Última Actualización",
    ];

    const filas = actores.map((a) => {
      const c = calcularCuadrante(a.nivelPoder, a.nivelInteres);
      return [
        sanitizarCsv(a.id),
        sanitizarCsv(a.codigo),
        sanitizarCsv(a.nombre),
        sanitizarCsv(a.tipo),
        sanitizarCsv(a.territorio),
        sanitizarCsv(a.barrioVereda ?? ""),
        sanitizarCsv(a.dimensionesPrincipales.join("; ")),
        sanitizarCsv(a.nivelPoder),
        sanitizarCsv(a.nivelInteres),
        sanitizarCsv(c),
        sanitizarCsv(a.postura),
        sanitizarCsv(a.contacto?.organizacion ?? a.nombre),
        sanitizarCsv(a.contacto?.cargo ?? ""),
        sanitizarCsv(a.mesasAsistidas?.join("; ") ?? ""),
        sanitizarCsv(a.propuestasRadicadas ?? 0),
        sanitizarCsv(a.expectativasPrincipales),
        sanitizarCsv(a.accionesInvolucramiento),
        sanitizarCsv(a.es_demostracion ? "SÍ" : "NO"),
        sanitizarCsv(a.actualizadoEn),
      ];
    });

    const contenidoCsv = "\uFEFF" + [cabeceras.join(","), ...filas.map((fila) => fila.join(","))].join("\r\n");
    const blob = new Blob([contenidoCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `polis_mapeo_actores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${actores.length} actores exportados a CSV`);
  };

  const handleExportarJson = () => {
    if (actores.length === 0) {
      toast.error("No hay registros para exportar con los filtros seleccionados");
      return;
    }

    const dataStr = JSON.stringify(actores, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `polis_mapeo_actores_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${actores.length} actores exportados a JSON`);
  };

  const abrirGestion = (actorId: string) => {
    openPanel("actor-editor", { actorId });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-text-secondary">
          Mostrando <strong className="text-text-primary">{actores.length}</strong> de{" "}
          <strong className="text-text-primary">{totalTodos}</strong> actores caracterizados
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="size-3.5" aria-hidden="true" />
                <span>Exportar Directorio</span>
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
                <TableHead className="w-[100px] text-xs font-semibold text-text-secondary">Código</TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold text-text-secondary">Actor / Organización</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold text-text-secondary">Tipología</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold text-text-secondary">Territorio</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold text-text-secondary">Matriz Poder/Interés</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold text-text-secondary">Postura</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold text-text-secondary">Contacto</TableHead>
                <TableHead className="w-[90px] text-right text-xs font-semibold text-text-secondary">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-text-secondary">
                      <SlidersHorizontal className="size-6 text-text-tertiary" aria-hidden="true" />
                      <p className="text-sm font-semibold text-text-primary">
                        No hay actores registrados en la plataforma
                      </p>
                      <p className="text-xs text-text-tertiary max-w-md">
                        Inicia el mapeo de actores estratégicos registrando la primera organización comunitaria, institucional o gremial.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => openPanel("actor-editor", {})}
                        className="mt-3 gap-1.5"
                      >
                        <UserPlus className="size-3.5" aria-hidden="true" />
                        <span>Registrar actor</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                actores.map((actor) => {
                  const cuadrante = calcularCuadrante(actor.nivelPoder, actor.nivelInteres);
                  const cuadInfo = formatearCuadrante(cuadrante);
                  const postInfo = formatearPostura(actor.postura);
                  return (
                    <TableRow
                      key={actor.id}
                      className="border-border transition-colors hover:bg-surface-2"
                    >
                      <TableCell className="align-top font-mono text-xs font-medium text-text-secondary">
                        {actor.codigo}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-semibold text-text-primary text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{actor.nombre}</span>
                            {actor.es_demostracion && (
                              <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10 text-[9px] px-1 py-0 font-bold">
                                DEMO
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-text-secondary">
                            {actor.contacto?.organizacion || actor.nombre}
                          </div>
                          {actor.barrioVereda && (
                            <div className="text-[10px] text-text-tertiary">
                              {actor.barrioVereda}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {actor.tipo.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs capitalize text-text-secondary">
                        {actor.territorio.replace("_", " ")}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Badge variant={cuadInfo.variante} className="text-[10px]">
                            {cuadInfo.etiqueta}
                          </Badge>
                          <div className="text-[10px] text-text-tertiary">
                            Poder: <span className="capitalize">{actor.nivelPoder}</span> · Int: <span className="capitalize">{actor.nivelInteres}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={postInfo.variante} className="text-[10px]">
                          {postInfo.etiqueta}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium text-text-primary text-[11px]">
                            {actor.contacto?.organizacion || actor.nombre}
                          </div>
                          <div className="text-[10px] text-text-secondary">
                            {actor.contacto?.cargo || "Vocero / Delegado"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirGestion(actor.id)}
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
