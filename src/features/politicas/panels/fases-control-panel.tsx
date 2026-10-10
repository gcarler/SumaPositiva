"use client";

import { useState } from "react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useQueryClient } from "@tanstack/react-query";
import { useFasesControl } from "./use-fases-control";
import {
  ejecutarCicloPoliticaIA,
  type RespuestaCicloPoliticaApi,
} from "../services/politicas-api";
import {
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function FasesControlPanel({ entryKey }: { entryKey: string }) {
  const { closeTop } = usePanels();
  const queryClient = useQueryClient();
  const {
    fases,
    cargando,
    errorCarga,
    conmutandoIds,
    cargar,
    toggleFase,
  } = useFasesControl({ queryClient });

  const [ejecutandoIA, setEjecutandoIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<RespuestaCicloPoliticaApi | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [problemaCentral, setProblemaCentral] = useState(
    "Déficit de convivencia, seguridad ciudadana y cohesión comunitaria en el Distrito de Cartagena"
  );
  const [lineasAccion, setLineasAccion] = useState(
    "Fortalecimiento de entornos protectores comunitarios y frentes de seguridad\nIluminación táctica y recuperación del espacio público en zonas críticas"
  );
  const [expandirFormulario, setExpandirFormulario] = useState(false);

  const handleEjecutarDiagnosticoIA = async () => {
    setEjecutandoIA(true);
    setErrorIA(null);
    try {
      const lineasArray = lineasAccion
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await ejecutarCicloPoliticaIA({
        titulo: "Política Distrital de Seguridad Humana Cartagena 2026",
        descripcion:
          "Estrategia integral interinstitucional y comunitaria para la garantía de derechos y seguridad humana.",
        problema_central: problemaCentral,
        lineas_accion: lineasArray,
        costo_estimado_total_cop: "1500000000.00",
        horizonte_anos: 4,
      });
      setResultadoIA(res);
    } catch (err) {
      setErrorIA(
        err instanceof Error ? err.message : "Error al ejecutar el ciclo multi-agente"
      );
    } finally {
      setEjecutandoIA(false);
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      title="Centro de Control de Fases de Política"
      subtitle="Interruptor maestro del ciclo metodológico y participación ciudadana"
      crumbs={[{ label: "Administración" }, { label: "Fases de la Política" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6 space-y-6">
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] flex items-start gap-3">
          <Sparkles className="size-5 text-[var(--ember)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Conforme al ciclo de formulación de política pública y la Ley 1757 de 2015, la apertura de
            cada fase habilita la captación deliberativa multicanal. El interruptor
            maestro controla la recepción de aportes y formularios web en tiempo
            real. Las operaciones requieren rol de Autoridad Distrital.
          </p>
        </div>

        <SectionLabel>Fases del Ciclo de Política Pública de Cartagena</SectionLabel>

        {errorCarga && (
          <div className="p-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--surface-1)] text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 text-[var(--danger)]">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al consultar fases en el servidor</p>
                <p className="mt-0.5 text-[var(--text-secondary)]">{errorCarga}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cargar}
              className="gap-1.5 shrink-0 text-xs"
            >
              <RefreshCw className="size-3" />
              Reintentar
            </Button>
          </div>
        )}

        {cargando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : fases.length === 0 && !errorCarga ? (
          <div className="p-6 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)]">
            No se encontraron fases configuradas en la base de datos de planeación.
          </div>
        ) : (
          <div className="space-y-4">
            {fases.map((fase) => {
              const estaConmutando = conmutandoIds.has(fase.id);
              return (
                <div
                  key={fase.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                        {fase.nombre}
                      </h4>
                      <StatusBadge
                        tone={
                          fase.estado === "activa"
                            ? "success"
                            : fase.estado === "en_revision"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {fase.estado.toUpperCase()}
                      </StatusBadge>
                      {estaConmutando && (
                        <span className="text-[10px] text-[var(--text-secondary)] animate-pulse">
                          Guardando...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Participación Web:{" "}
                      <span
                        className={
                          fase.habilitada_web
                            ? "text-primary font-medium"
                            : "text-[var(--text-secondary)]"
                        }
                      >
                        {fase.habilitada_web
                          ? "Habilitada (Aportes Activos)"
                          : "Cerrada al público"}
                      </span>
                      {fase.progreso_porcentaje != null && fase.progreso_porcentaje > 0 && (
                        <span className="ml-2 font-mono text-[10px]">
                          • {fase.progreso_porcentaje}% avance
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Label htmlFor={`switch-${fase.id}`} className="sr-only">
                      Alternar participación web para {fase.nombre}
                    </Label>
                    <Switch
                      id={`switch-${fase.id}`}
                      checked={fase.habilitada_web}
                      disabled={estaConmutando}
                      onCheckedChange={() =>
                        toggleFase(fase.id, fase.habilitada_web)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Diagnóstico Integral Multi-Agente (LangGraph / PolicyLifecycleGraph) */}
        <div className="pt-4 border-t border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SectionLabel>Diagnóstico Integral Multi-Agente</SectionLabel>
                <StatusBadge tone="neutral">LangGraph StateGraph</StatusBadge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Evalúa los 6 nodos del ciclo de política pública: diagnóstico causal, viabilidad jurídica (Ley 1454/715), consulta previa étnica, viabilidad fiscal (FONSET/ICLD), deliberación y devolución ciudadana C-150.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandirFormulario(!expandirFormulario)}
              className="gap-1.5 shrink-0 text-xs"
            >
              {expandirFormulario ? (
                <>
                  <ChevronUp className="size-3.5" />
                  Ocultar Parámetros
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  Configurar Parámetros
                </>
              )}
            </Button>
          </div>

          {expandirFormulario && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
              <div className="space-y-1">
                <Label htmlFor="input-problema-central" className="text-xs font-medium">
                  Problema Central de Diagnóstico
                </Label>
                <Textarea
                  id="input-problema-central"
                  value={problemaCentral}
                  onChange={(e) => setProblemaCentral(e.target.value)}
                  className="min-h-20 text-xs"
                  placeholder="Defina el problema central estructurado..."
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="input-lineas-accion" className="text-xs font-medium">
                  Líneas de Acción Estratégica (una por línea)
                </Label>
                <Textarea
                  id="input-lineas-accion"
                  value={lineasAccion}
                  onChange={(e) => setLineasAccion(e.target.value)}
                  className="min-h-20 text-xs"
                  placeholder="Línea 1&#10;Línea 2..."
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleEjecutarDiagnosticoIA}
              disabled={ejecutandoIA}
              className="gap-2 text-xs"
            >
              {ejecutandoIA ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Orquestando 6 Nodos del Ciclo...
                </>
              ) : (
                <>
                  <Cpu className="size-4" />
                  Ejecutar Diagnóstico Integral Multi-Agente
                </>
              )}
            </Button>
            {resultadoIA && (
              <span className="text-xs text-[var(--text-secondary)]">
                Fase alcanzada: <strong className="text-[var(--text-primary)]">{resultadoIA.fase_final}</strong>
              </span>
            )}
          </div>

          {errorIA && (
            <div className="p-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--surface-1)] text-xs text-[var(--danger)] flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorIA}</span>
            </div>
          )}

          {resultadoIA && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <FileCheck2 className="size-4 text-primary" />
                    Dictamen del Grafo de Ciclo de Vida
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Acto sugerido: <strong>{resultadoIA.acto_administrativo_sugerido}</strong> • {resultadoIA.iteraciones_totales} iteración(es)
                  </p>
                </div>
                <StatusBadge
                  tone={resultadoIA.ciclo_completado_exitosamente ? "success" : "warning"}
                >
                  {resultadoIA.ciclo_completado_exitosamente ? "CICLO COMPLETADO" : "EN REVISIÓN"}
                </StatusBadge>
              </div>

              {/* Matriz de los 6 nodos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>1. Diagnóstico Causal</span>
                    {resultadoIA.diagnostico_aprobado ? (
                      <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    ) : (
                      <XCircle className="size-3.5 text-[var(--warning)]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {resultadoIA.resultado_diagnostico?.coherencia_causal_porcentaje
                      ? `Coherencia: ${resultadoIA.resultado_diagnostico.coherencia_causal_porcentaje}%`
                      : "Estructura causal validada"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>2. Viabilidad Jurídica</span>
                    {resultadoIA.viabilidad_juridica_aprobada ? (
                      <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    ) : (
                      <XCircle className="size-3.5 text-[var(--warning)]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Ley 1454/11 y Ley 715/01
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>3. Consulta Previa</span>
                    <span className="font-mono text-[10px]">
                      {resultadoIA.consulta_previa_requerida ? "SU-123/18" : "No requerida"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {resultadoIA.consulta_previa_requerida
                      ? "Comunidades Étnicas / Insulares"
                      : "Área sin afectación directa étnica"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>4. Viabilidad Fiscal</span>
                    {resultadoIA.viabilidad_fiscal_aprobada ? (
                      <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    ) : (
                      <XCircle className="size-3.5 text-[var(--warning)]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {resultadoIA.resultado_fiscal?.fuentes_financiacion_validadas?.join(", ") ?? "FONSET / ICLD"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>5. Deliberación</span>
                    {resultadoIA.deliberacion_completada ? (
                      <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    ) : (
                      <XCircle className="size-3.5 text-[var(--warning)]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Mesas territoriales vinculadas
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>6. Devolución C-150</span>
                    {resultadoIA.devolucion_completada ? (
                      <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                    ) : (
                      <XCircle className="size-3.5 text-[var(--warning)]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Motivación sustancial garantizada
                  </p>
                </div>
              </div>

              {/* Bitácora de mensajes */}
              {resultadoIA.bitacora_mensajes && resultadoIA.bitacora_mensajes.length > 0 && (
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Bitácora de Convergencia Multi-Agente
                  </p>
                  <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                    {resultadoIA.bitacora_mensajes.map((msg, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                        <span className="text-primary">•</span>
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

