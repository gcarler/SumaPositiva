"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Check,
  Target,
  FileText,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

export function ValidacionMgaPanel({
  entryKey,
  props,
}: PanelComponentProps<"validacion-mga">) {
  const { closeTop } = usePanels();
  const { resultado, instrumentoNombre } = props;

  const esValido = resultado.es_valido;
  const puntaje = Math.round(resultado.puntaje_coherencia);

  const porcentajeColor = useMemo(() => {
    if (puntaje >= 75) return "text-success";
    if (puntaje >= 65) return "text-info";
    if (puntaje >= 50) return "text-warning";
    return "text-danger";
  }, [puntaje]);

  const barraColor = useMemo(() => {
    if (puntaje >= 75) return "bg-success";
    if (puntaje >= 65) return "bg-info";
    if (puntaje >= 50) return "bg-warning";
    return "bg-danger";
  }, [puntaje]);

  const handleExportarJson = () => {
    const dataStr = JSON.stringify(
      {
        instrumento: instrumentoNombre ?? "Instrumento Metodológico",
        fecha_evaluacion: new Date().toISOString(),
        resultado,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `dictamen_metodologico_${resultado.evaluacion_id.slice(0, 8)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Dictamen pericial metodológico exportado en formato JSON");
  };

  const handleCopiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado al portapapeles`);
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Diagnóstico Territorial" }]}
      kicker="Validación Metodológica · POLIS"
      title="Auditoría Causal y Evaluación Metodológica con IA"
      subtitle={
        instrumentoNombre
          ? `Evaluación metodológica: ${instrumentoNombre}`
          : "Validación pericial de árbol causal y consistencia de política"
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-6 pb-6 text-xs text-text-secondary">
        {/* Tarjeta de Puntaje y Veredicto Metodológico */}
        <div className="rounded-xl border border-border bg-surface-1 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-surface-2 border border-border">
                <Sparkles className="size-5 text-ember" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-text-primary">
                    Puntaje de Coherencia Metodológica
                  </span>
                  <Badge
                    variant="outline"
                    className={`font-semibold text-2xs ${
                      esValido
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-warning/30 bg-warning-soft text-warning"
                    }`}
                  >
                    {esValido ? "METODOLOGÍA VÁLIDA" : "REQUIERE AJUSTES"}
                  </Badge>
                </div>
                <p className="text-2xs text-text-tertiary">
                  Evaluación sintáctica y de consistencia causal de marco lógico
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-2xl font-black tabular-nums ${porcentajeColor}`}>
                {puntaje}%
              </span>
              <span className="text-2xs text-text-tertiary block">
                Umbral mínimo de coherencia: 65%
              </span>
            </div>
          </div>

          {/* Barra de progreso de coherencia */}
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full transition-all duration-500 rounded-full ${barraColor}`}
                style={{ width: `${puntaje}%` }}
              />
            </div>
            <div className="flex justify-between text-2xs text-text-tertiary">
              <span>0% Inconsistente</span>
              <span>65% Aceptable</span>
              <span>100% Óptimo</span>
            </div>
          </div>

          {/* Resumen Ejecutivo del concepto pericial */}
          <div className="rounded-lg border border-border/80 bg-surface-0/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-text-primary text-xs">
              <FileText className="size-3.5 text-ember" aria-hidden="true" />
              <span>Concepto Técnico del Agente de Diagnóstico</span>
            </div>
            <p className="text-xs leading-relaxed text-text-secondary">
              {resultado.resumen_ejecutivo}
            </p>
          </div>
        </div>

        {/* Problema Central Optimizado y Objetivo Central Derivado */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-ember" aria-hidden="true" />
                <span>Problema Central Optimizado</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-2xs px-1.5 text-text-tertiary hover:text-text-primary"
                onClick={() =>
                  handleCopiarTexto(
                    resultado.problema_central_optimizado,
                    "Problema optimizado"
                  )
                }
              >
                Copiar
              </Button>
            </div>
            <p className="text-xs font-medium text-text-primary leading-snug">
              {resultado.problema_central_optimizado}
            </p>
            <p className="text-2xs text-text-tertiary">
              Formulado con sustantivo negativo sin soluciones encubiertas.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Target className="size-3.5 text-success" aria-hidden="true" />
                <span>Objetivo Central Derivado</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-2xs px-1.5 text-text-tertiary hover:text-text-primary"
                onClick={() =>
                  handleCopiarTexto(
                    resultado.objetivo_central_derivado,
                    "Objetivo derivado"
                  )
                }
              >
                Copiar
              </Button>
            </div>
            <p className="text-xs font-medium text-text-primary leading-snug">
              {resultado.objetivo_central_derivado}
            </p>
            <p className="text-2xs text-text-tertiary">
              Enunciado en verbo infinitivo propositivo orientado a resultados.
            </p>
          </div>
        </div>

        {/* Diagnóstico Sintáctico Nodo por Nodo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-ember" aria-hidden="true" />
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                Auditoría Sintáctica y Causal por Nodo ({resultado.analisis_sintaxis.length})
              </h4>
            </div>
            <span className="text-2xs text-text-tertiary">
              {resultado.analisis_sintaxis.filter((a) => a.cumple_sintaxis).length} conformes ·{" "}
              {resultado.analisis_sintaxis.filter((a) => !a.cumple_sintaxis).length} observaciones
            </span>
          </div>

          <div className="space-y-2.5">
            {resultado.analisis_sintaxis.map((nodo, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-2 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-2xs font-mono">
                      {nodo.tipo_nodo}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-2xs font-semibold ${
                        nodo.cumple_sintaxis
                          ? "border-success/30 bg-success-soft text-success"
                          : "border-warning/30 bg-warning-soft text-warning"
                      }`}
                    >
                      {nodo.cumple_sintaxis ? (
                        <span className="flex items-center gap-1">
                          <Check className="size-3" aria-hidden="true" />
                          <span>Conforme</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="size-3" aria-hidden="true" />
                          <span>Ajuste Requerido</span>
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-2xs font-medium text-text-tertiary">
                    Texto actual evaluado:
                  </div>
                  <div className="text-xs text-text-primary font-medium">
                    &ldquo;{nodo.texto_original}&rdquo;
                  </div>
                </div>

                {!nodo.cumple_sintaxis && (
                  <div className="rounded-lg border border-warning/30 bg-warning-soft/30 p-2.5 space-y-1">
                    <div className="text-2xs font-semibold text-warning flex items-center gap-1">
                      <Lightbulb className="size-3" aria-hidden="true" />
                      <span>Reescritura sugerida por Agente IA:</span>
                    </div>
                    <div className="text-xs font-medium text-text-primary">
                      {nodo.texto_corregido_sugerido}
                    </div>
                  </div>
                )}

                <div className="text-2xs text-text-tertiary italic">
                  {nodo.observacion_metodologica}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recomendaciones Metodológicas */}
        {resultado.recomendaciones_dnp && resultado.recomendaciones_dnp.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
            <div className="flex items-center gap-2 font-bold text-text-primary text-xs uppercase tracking-wider">
              <Lightbulb className="size-4 text-ember" aria-hidden="true" />
              <span>Directrices Metodológicas para Formulación</span>
            </div>
            <ul className="space-y-2 list-none p-0 m-0">
              {resultado.recomendaciones_dnp.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-text-secondary rounded-lg bg-surface-0/60 p-2.5 border border-border/60"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ember-soft text-ember font-mono font-bold text-2xs">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botones de acción y exportación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarJson}
            className="w-full sm:w-auto h-8 text-xs gap-1.5"
          >
            <FileJson className="size-3.5 text-ember" aria-hidden="true" />
            <span>Exportar Dictamen JSON</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={closeTop}
            className="w-full sm:w-auto h-8 text-xs"
          >
            Cerrar Dictamen
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
