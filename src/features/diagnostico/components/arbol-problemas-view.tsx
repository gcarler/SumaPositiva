"use client";

import {useEffect, useState, useMemo, useCallback} from "react";
import {toast} from "sonner";
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Target,
  AlertCircle,
  Layers,
  Info
} from "lucide-react";
import {Button} from "@/shared/ui/button";
import {Badge} from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {usePanels} from "@/core/panels/panel-store";
import {
  obtenerInstrumentos,
  obtenerArbol,
  evaluarDiagnosticoIA
} from "../services/mga-api";
import type {
  InstrumentoMGA,
  ArbolMGARespuesta,
  EntradaDiagnostico
} from "../models/mga";

interface ArbolProblemasViewProps {
  onVerValidacion?: (resultadoId: string) => void;
}

export function ArbolProblemasView({}: ArbolProblemasViewProps = {}) {
  const { openPanel } = usePanels();
  const [instrumentos, setInstrumentos] = useState<InstrumentoMGA[]>([]);
  const [instrumentoSeleccionadoId, setInstrumentoSeleccionadoId] = useState<string>("");
  const [arbol, setArbol] = useState<ArbolMGARespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoArbol, setCargandoArbol] = useState(false);
  const [evaluandoIA, setEvaluandoIA] = useState(false);
  const [vistaArbol, setVistaArbol] = useState<"problemas" | "objetivos">("problemas");

  // Cargar lista de instrumentos MGA
  const cargarInstrumentos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerInstrumentos();
      setInstrumentos(data);
      if (data.length > 0) {
        // Preferir el árbol de ESCNNA de Cartagena si existe
        const escnna = data.find((i) =>
          i.nombre.toLowerCase().includes("escnna")
        );
        const inicial = escnna ? escnna.id : data[0].id;
        setInstrumentoSeleccionadoId(inicial);
      }
    } catch {
      toast.error("Error al cargar instrumentos MGA.");
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar árbol cuando cambia el instrumento seleccionado
  const cargarArbolActual = useCallback(async (id: string) => {
    if (!id) return;
    setCargandoArbol(true);
    try {
      const datosArbol = await obtenerArbol(id);
      setArbol(datosArbol);
      // Sincronizar vista si el instrumento es explícitamente de objetivos
      if (datosArbol.instrumento.tipo_instrumento === "ARBOL_OBJETIVOS") {
        setVistaArbol("objetivos");
      } else {
        setVistaArbol("problemas");
      }
    } catch {
      toast.error("Error al obtener la estructura del árbol.");
    } finally {
      setCargandoArbol(false);
    }
  }, []);

  useEffect(() => {
    cargarInstrumentos();
  }, [cargarInstrumentos]);

  useEffect(() => {
    if (instrumentoSeleccionadoId) {
      cargarArbolActual(instrumentoSeleccionadoId);
    }
  }, [instrumentoSeleccionadoId, cargarArbolActual]);

  const instrumentoActual = useMemo(() => {
    return instrumentos.find((i) => i.id === instrumentoSeleccionadoId);
  }, [instrumentos, instrumentoSeleccionadoId]);

  // Ejecutar validación pericial causal con IA DNP
  const handleValidarConIA = async () => {
    if (!arbol || !arbol.nodo_central) {
      toast.error("El árbol actual no contiene un nodo central definido.");
      return;
    }

    setEvaluandoIA(true);
    try {
      const payload: EntradaDiagnostico = {
        politica_id: arbol.instrumento.id,
        titulo: arbol.instrumento.nombre,
        problema_central: arbol.nodo_central.contenido,
        causas_directas: arbol.causas_o_medios.map((c) => c.contenido),
        causas_indirectas: arbol.causas_o_medios.flatMap((c) =>
          (c.hijos || []).map((h) => h.contenido)
        ),
        efectos_directos: arbol.efectos_o_fines.map((e) => e.contenido),
        efectos_indirectos: arbol.efectos_o_fines.flatMap((e) =>
          (e.hijos || []).map((h) => h.contenido)
        ),
        propuestas_ciudadanas_raw: [
          "Mesa de concertación comunitaria Localidad 1",
          "Ruta de protección ICBF y Comisaría de Familia",
        ],
      };

      const resultado = await evaluarDiagnosticoIA(payload);

      openPanel("validacion-mga", {
        resultado,
        instrumentoNombre: arbol.instrumento.nombre,
        arbolTipo: vistaArbol,
      });

      toast.success(
        `Auditoría IA DNP completada: Coherencia ${Math.round(resultado.puntaje_coherencia)}%`
      );
    } catch {
      toast.error("Error al ejecutar la validación con el Agente DNP.");
    } finally {
      setEvaluandoIA(false);
    }
  };

  const totalCausasDirectas = arbol?.causas_o_medios.length || 0;
  const totalCausasIndirectas =
    arbol?.causas_o_medios.reduce((acc, c) => acc + (c.hijos?.length || 0), 0) || 0;
  const totalEfectosDirectos = arbol?.efectos_o_fines.length || 0;
  const totalEfectosIndirectos =
    arbol?.efectos_o_fines.reduce((acc, e) => acc + (e.hijos?.length || 0), 0) || 0;

  const esModoProblemas = vistaArbol === "problemas";

  return (
    <div className="space-y-6">
      {/* Barra de Controles y Selector de Instrumento MGA */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Selector de Instrumento */}
          <div className="space-y-1.5 flex-1 max-w-xl">
            <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider block">
              Instrumento MGA / Dimensión Cartagena
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={instrumentoSeleccionadoId}
                onValueChange={(val) => setInstrumentoSeleccionadoId(val)}
                disabled={cargando || instrumentos.length === 0}
              >
                <SelectTrigger className="w-full text-xs h-9 bg-surface-2 font-medium">
                  <SelectValue placeholder="Seleccionar instrumento territorial..." />
                </SelectTrigger>
                <SelectContent>
                  {instrumentos.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id} className="text-xs">
                      {inst.nombre} ({inst.tipo_instrumento === "ARBOL_PROBLEMAS" ? "Problemas" : "Objetivos"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => cargarArbolActual(instrumentoSeleccionadoId)}
                disabled={cargandoArbol || !instrumentoSeleccionadoId}
                className="h-9 px-2.5 shrink-0"
                title="Recargar árbol"
              >
                <RotateCw
                  className={`size-3.5 ${cargandoArbol ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>

          {/* Conmutador de Árbol (Problemas vs Objetivos) y Botón IA DNP */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Switcher */}
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-1">
              <Button
                variant={esModoProblemas ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaArbol("problemas")}
                className={`h-7 px-3 text-xs gap-1.5 font-medium transition-all ${
                  esModoProblemas
                    ? "bg-ember text-text-inverse hover:bg-ember/90"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <AlertCircle className="size-3.5" aria-hidden="true" />
                <span>Árbol de Problemas</span>
              </Button>
              <Button
                variant={!esModoProblemas ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaArbol("objetivos")}
                className={`h-7 px-3 text-xs gap-1.5 font-medium transition-all ${
                  !esModoProblemas
                    ? "bg-success text-text-inverse hover:bg-success/90"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Target className="size-3.5" aria-hidden="true" />
                <span>Árbol de Objetivos</span>
              </Button>
            </div>

            {/* Botón de Validación Causal IA DNP */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidarConIA}
              disabled={evaluandoIA || cargandoArbol || !arbol}
              className="h-9 px-4 text-xs font-semibold gap-2 border-ember/40 bg-ember-soft text-ember hover:bg-ember hover:text-text-inverse transition-colors"
            >
              <Sparkles
                className={`size-3.5 ${evaluandoIA ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{evaluandoIA ? "Auditando con IA..." : "Validar con Agente IA DNP"}</span>
            </Button>
          </div>
        </div>

        {/* Resumen institucional del instrumento */}
        {instrumentoActual && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/80 text-2xs text-text-tertiary">
            <span className="flex items-center gap-1.5 font-mono text-text-secondary">
              <Layers className="size-3 text-ember" aria-hidden="true" />
              <span>Nodos totales: {arbol?.total_nodos || 0}</span>
            </span>
            <span>·</span>
            <span>
              Causas / Medios: {totalCausasDirectas} directas · {totalCausasIndirectas} indirectas
            </span>
            <span>·</span>
            <span>
              Efectos / Fines: {totalEfectosDirectos} directos · {totalEfectosIndirectos} indirectos
            </span>
            <span>·</span>
            <Badge variant="outline" className="text-2xs font-medium">
              Estado: {instrumentoActual.estado}
            </Badge>
          </div>
        )}
      </div>

      {/* Canvas Jerárquico del Árbol MGA */}
      {cargandoArbol ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-surface-1">
          <div className="flex flex-col items-center gap-2">
            <RotateCw className="size-6 animate-spin text-ember" aria-hidden="true" />
            <span className="text-xs text-text-tertiary">
              Cargando estructura MGA de Cartagena...
            </span>
          </div>
        </div>
      ) : !arbol || !arbol.nodo_central ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-6 text-center">
          <Info className="size-8 text-text-tertiary mb-2" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">
            No se encontró un árbol MGA configurado
          </p>
          <p className="text-xs text-text-secondary max-w-md mt-1">
            Seleccione otro instrumento distrital o cree un nuevo árbol analítico desde la mesa de concertación.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECCIÓN SUPERIOR: EFECTOS O FINES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <ArrowUp
                  className={`size-4 ${esModoProblemas ? "text-ember" : "text-success"}`}
                  aria-hidden="true"
                />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  {esModoProblemas ? "Efectos del Problema Central" : "Fines del Objetivo Central"}
                </h4>
              </div>
              <span className="text-2xs text-text-tertiary">
                {esModoProblemas
                  ? "Impactos adversos en la calidad de vida y seguridad de Cartagena"
                  : "Impactos positivos y bienestar colectivo proyectado"}
              </span>
            </div>

            {/* Grid de Efectos o Fines */}
            <div className="grid gap-4 md:grid-cols-2">
              {arbol.efectos_o_fines.map((efecto, idx) => (
                <div
                  key={efecto.id || idx}
                  className="rounded-xl border border-border bg-surface-1 p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-2xs font-semibold ${
                        esModoProblemas
                          ? "border-ember/30 bg-ember-soft text-ember"
                          : "border-success/30 bg-success-soft text-success"
                      }`}
                    >
                      {esModoProblemas ? `Efecto Directo ${idx + 1}` : `Fin Directo ${idx + 1}`}
                    </Badge>
                    <span className="text-2xs text-text-tertiary font-mono">Nivel 1</span>
                  </div>

                  <p className="text-xs font-medium text-text-primary leading-snug">
                    {efecto.contenido}
                  </p>

                  {/* Hijos: Efectos Indirectos / Fines Indirectos */}
                  {efecto.hijos && efecto.hijos.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <span className="text-2xs font-semibold text-text-tertiary block">
                        {esModoProblemas ? "Efectos Indirectos (Largo Plazo):" : "Fines Indirectos:"}
                      </span>
                      <div className="space-y-1.5 pl-3 border-l-2 border-border">
                        {efecto.hijos.map((hijo, hIdx) => (
                          <div
                            key={hijo.id || hIdx}
                            className="rounded-lg bg-surface-2/60 p-2.5 text-2xs text-text-secondary font-medium"
                          >
                            <span className="font-semibold text-text-primary block mb-0.5">
                              {esModoProblemas ? `Impacto 1.${idx + 1}.${hIdx + 1}:` : `Fin 1.${idx + 1}.${hIdx + 1}:`}
                            </span>
                            {hijo.contenido}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN CENTRAL: NODO CENTRAL (PROBLEMA U OBJETIVO) */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full border-t border-dashed border-border" />
            </div>

            <div className="relative flex justify-center">
              <div
                className={`w-full max-w-2xl rounded-2xl border-2 p-5 shadow-lg space-y-2.5 text-center transition-all bg-surface-1 ${
                  esModoProblemas
                    ? "border-ember shadow-ember/5"
                    : "border-success shadow-success/5"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Badge
                    variant="outline"
                    className={`font-bold text-2xs uppercase tracking-wider ${
                      esModoProblemas
                        ? "border-ember bg-ember-soft text-ember"
                        : "border-success bg-success-soft text-success"
                    }`}
                  >
                    {esModoProblemas ? "Problema Central Distrital" : "Objetivo Central Distrital"}
                  </Badge>
                  <span className="text-2xs text-text-tertiary font-mono">Nivel 0 (Eje Causal)</span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-text-primary leading-snug">
                  {arbol.nodo_central.contenido}
                </h3>

                <p className="text-2xs text-text-tertiary max-w-lg mx-auto">
                  {esModoProblemas
                    ? "Situación negativa priorizada por la ciudadanía y articulada al Plan Distrital de Seguridad Humana de Cartagena."
                    : "Situación futura deseada y transformadora orientada a la garantía efectiva de derechos."}
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN INFERIOR: CAUSAS O MEDIOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <ArrowDown
                  className={`size-4 ${esModoProblemas ? "text-ember" : "text-success"}`}
                  aria-hidden="true"
                />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  {esModoProblemas ? "Causas del Problema Central" : "Medios para el Logro del Objetivo"}
                </h4>
              </div>
              <span className="text-2xs text-text-tertiary">
                {esModoProblemas
                  ? "Factores determinantes y raíces socioeconómicas e institucionales"
                  : "Acciones estratégicas e intervenciones programáticas de política pública"}
              </span>
            </div>

            {/* Grid de Causas o Medios */}
            <div className="grid gap-4 md:grid-cols-2">
              {arbol.causas_o_medios.map((causa, idx) => (
                <div
                  key={causa.id || idx}
                  className="rounded-xl border border-border bg-surface-1 p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-2xs font-semibold ${
                        esModoProblemas
                          ? "border-ember/30 bg-ember-soft text-ember"
                          : "border-success/30 bg-success-soft text-success"
                      }`}
                    >
                      {esModoProblemas ? `Causa Directa ${idx + 1}` : `Medio Directo ${idx + 1}`}
                    </Badge>
                    <span className="text-2xs text-text-tertiary font-mono">Nivel 1</span>
                  </div>

                  <p className="text-xs font-medium text-text-primary leading-snug">
                    {causa.contenido}
                  </p>

                  {/* Hijos: Causas Indirectas / Medios Indirectos */}
                  {causa.hijos && causa.hijos.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <span className="text-2xs font-semibold text-text-tertiary block">
                        {esModoProblemas ? "Causas Indirectas (Estructurales):" : "Medios Indirectos (Componentes):"}
                      </span>
                      <div className="space-y-1.5 pl-3 border-l-2 border-border">
                        {causa.hijos.map((hijo, hIdx) => (
                          <div
                            key={hijo.id || hIdx}
                            className="rounded-lg bg-surface-2/60 p-2.5 text-2xs text-text-secondary font-medium"
                          >
                            <span className="font-semibold text-text-primary block mb-0.5">
                              {esModoProblemas ? `Raíz 1.${idx + 1}.${hIdx + 1}:` : `Actividad 1.${idx + 1}.${hIdx + 1}:`}
                            </span>
                            {hijo.contenido}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
