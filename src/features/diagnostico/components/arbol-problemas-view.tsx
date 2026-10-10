"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Target,
  AlertCircle,
  Layers,
  Info,
  ArrowRightLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { usePanels } from "@/core/panels/panel-store";
import { useSesionStore, tienePermiso } from "@/features/sesion/state/session-store";
import { puedeEditar } from "@/features/plataforma/models/acceso";
import {
  obtenerInstrumentos,
  obtenerArbol,
  evaluarDiagnosticoIA,
  convertirAObjetivos,
  agregarNodoArbol,
  actualizarNodoArbol,
  eliminarNodoArbol,
} from "../services/arbol-causal-api";
import type {
  InstrumentoMGA,
  ArbolMGARespuesta,
  EntradaDiagnostico,
  NodoArbolMGA,
  TipoNodoMGA,
  TipoRelacionMGA,
} from "../models/arbol-causal";

interface ArbolProblemasViewProps {
  onVerValidacion?: (resultadoId: string) => void;
}

export function ArbolProblemasView({}: ArbolProblemasViewProps = {}) {
  const { openPanel } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const puedeGestionar =
    tienePermiso(sesion, "instrumentos:gestionar") ||
    puedeEditar(sesion, "diagnostico");

  const [instrumentos, setInstrumentos] = useState<InstrumentoMGA[]>([]);
  const [instrumentoSeleccionadoId, setInstrumentoSeleccionadoId] = useState<string>("");
  const [arbol, setArbol] = useState<ArbolMGARespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoArbol, setCargandoArbol] = useState(false);
  const [evaluandoIA, setEvaluandoIA] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [guardandoNodo, setGuardandoNodo] = useState(false);
  const [vistaArbol, setVistaArbol] = useState<"problemas" | "objetivos">("problemas");

  // Edición inline de un nodo existente
  const [nodoEnEdicion, setNodoEnEdicion] = useState<{
    id: string;
    contenido: string;
  } | null>(null);

  // Creación inline de un nuevo nodo
  const [nuevoNodoConfig, setNuevoNodoConfig] = useState<{
    tipo_nodo: TipoNodoMGA;
    tipo_relacion: TipoRelacionMGA;
    nodo_padre_id: string | null;
    nivel: number;
    contenido: string;
    etiqueta: string;
  } | null>(null);

  // Cargar lista de instrumentos de diagnóstico
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
      toast.error("Error al cargar instrumentos de diagnóstico.");
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

  // Conversión canónica a Árbol de Objetivos
  const handleConvertirAObjetivos = async () => {
    if (!instrumentoSeleccionadoId) return;
    setConvirtiendo(true);
    try {
      const nuevoArbol = await convertirAObjetivos(instrumentoSeleccionadoId);
      toast.success("Árbol de Objetivos generado exitosamente bajo metodología de marco lógico.");
      await cargarInstrumentos();
      setInstrumentoSeleccionadoId(nuevoArbol.instrumento.id);
      setArbol(nuevoArbol);
      setVistaArbol("objetivos");
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : "Error al convertir el árbol a objetivos.";
      toast.error(mensaje);
    } finally {
      setConvirtiendo(false);
    }
  };

  // Iniciar creación de nodo
  const handleAbrirNuevoNodo = (
    tipo_nodo: TipoNodoMGA,
    tipo_relacion: TipoRelacionMGA,
    nodo_padre_id: string | null,
    nivel: number,
    etiqueta: string
  ) => {
    setNodoEnEdicion(null);
    setNuevoNodoConfig({
      tipo_nodo,
      tipo_relacion,
      nodo_padre_id,
      nivel,
      contenido: "",
      etiqueta,
    });
  };

  // Guardar nuevo nodo
  const handleGuardarNuevoNodo = async () => {
    if (!nuevoNodoConfig || !instrumentoSeleccionadoId) return;
    if (!nuevoNodoConfig.contenido.trim()) {
      toast.error("El contenido del nodo no puede estar vacío.");
      return;
    }
    setGuardandoNodo(true);
    try {
      await agregarNodoArbol(instrumentoSeleccionadoId, {
        tipo_nodo: nuevoNodoConfig.tipo_nodo,
        tipo_relacion: nuevoNodoConfig.tipo_relacion,
        nodo_padre_id: nuevoNodoConfig.nodo_padre_id,
        nivel: nuevoNodoConfig.nivel,
        contenido: nuevoNodoConfig.contenido.trim(),
      });
      toast.success(`${nuevoNodoConfig.etiqueta} agregado exitosamente.`);
      setNuevoNodoConfig(null);
      await cargarArbolActual(instrumentoSeleccionadoId);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : "Error al agregar el nodo causal.";
      toast.error(mensaje);
    } finally {
      setGuardandoNodo(false);
    }
  };

  // Iniciar edición de nodo existente
  const handleIniciarEdicion = (nodo: NodoArbolMGA) => {
    setNuevoNodoConfig(null);
    setNodoEnEdicion({
      id: nodo.id,
      contenido: nodo.contenido,
    });
  };

  // Guardar edición de nodo
  const handleGuardarEdicion = async (nodoId: string) => {
    if (!nodoEnEdicion || !instrumentoSeleccionadoId) return;
    if (!nodoEnEdicion.contenido.trim()) {
      toast.error("El contenido no puede estar vacío.");
      return;
    }
    setGuardandoNodo(true);
    try {
      await actualizarNodoArbol(instrumentoSeleccionadoId, nodoId, {
        contenido: nodoEnEdicion.contenido.trim(),
      });
      toast.success("Nodo causal actualizado correctamente.");
      setNodoEnEdicion(null);
      await cargarArbolActual(instrumentoSeleccionadoId);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : "Error al actualizar el nodo.";
      toast.error(mensaje);
    } finally {
      setGuardandoNodo(false);
    }
  };

  // Eliminar nodo
  const handleEliminarNodo = async (nodoId: string) => {
    if (!instrumentoSeleccionadoId) return;
    const seguro = window.confirm(
      "¿Confirma la eliminación de este nodo causal del árbol?"
    );
    if (!seguro) return;

    setGuardandoNodo(true);
    try {
      await eliminarNodoArbol(instrumentoSeleccionadoId, nodoId);
      toast.success("Nodo causal eliminado correctamente.");
      if (nodoEnEdicion?.id === nodoId) setNodoEnEdicion(null);
      await cargarArbolActual(instrumentoSeleccionadoId);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : "Error al eliminar el nodo.";
      toast.error(mensaje);
    } finally {
      setGuardandoNodo(false);
    }
  };

  // Ejecutar validación pericial causal con IA
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
        `Auditoría IA completada: Coherencia ${Math.round(resultado.puntaje_coherencia)}%`
      );
    } catch {
      toast.error("Error al ejecutar la validación con el Agente IA.");
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
      {/* Barra de Controles y Selector de Instrumento */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Selector de Instrumento */}
          <div className="space-y-1.5 flex-1 max-w-xl">
            <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider block">
              Instrumento / Dimensión Cartagena
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

          {/* Conmutador de Árbol (Problemas vs Objetivos), Conversor y Botón IA */}
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

            {/* Botón Convertir a Árbol de Objetivos */}
            {esModoProblemas && puedeGestionar && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvertirAObjetivos}
                disabled={convirtiendo || cargandoArbol || !arbol}
                className="h-9 px-3 text-xs font-semibold gap-1.5 border-success/40 bg-success-soft text-success hover:bg-success hover:text-text-inverse transition-colors"
                title="Generar árbol de objetivos equivalente bajo metodología de marco lógico"
              >
                <ArrowRightLeft
                  className={`size-3.5 ${convirtiendo ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>{convirtiendo ? "Convirtiendo..." : "Convertir a Objetivos"}</span>
              </Button>
            )}

            {/* Botón de Validación Causal IA */}
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
              <span>{evaluandoIA ? "Auditando con IA..." : "Validar con Agente IA"}</span>
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

      {/* Canvas Jerárquico del Árbol Causal */}
      {cargandoArbol ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-surface-1">
          <div className="flex flex-col items-center gap-2">
            <RotateCw className="size-6 animate-spin text-ember" aria-hidden="true" />
            <span className="text-xs text-text-tertiary">
              Cargando estructura causal de Cartagena...
            </span>
          </div>
        </div>
      ) : !arbol || !arbol.nodo_central ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-6 text-center">
          <Info className="size-8 text-text-tertiary mb-2" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">
            No se encontró un árbol causal configurado
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
              <div className="flex items-center gap-3">
                <span className="text-2xs text-text-tertiary hidden sm:inline">
                  {esModoProblemas
                    ? "Impactos adversos en la calidad de vida y seguridad de Cartagena"
                    : "Impactos positivos y bienestar colectivo proyectado"}
                </span>
                {puedeGestionar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleAbrirNuevoNodo(
                        esModoProblemas ? "EFECTO_DIRECTO" : "FIN_DIRECTO",
                        "EFECTO",
                        arbol?.nodo_central?.id ?? null,
                        1,
                        esModoProblemas ? "Efecto Directo" : "Fin Directo"
                      )
                    }
                    disabled={guardandoNodo}
                    className="h-7 px-2.5 text-2xs font-semibold gap-1"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    <span>{esModoProblemas ? "Agregar Efecto" : "Agregar Fin"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Formulario Inline: Nuevo Efecto / Fin Directo */}
            {nuevoNodoConfig &&
              nuevoNodoConfig.nivel === 1 &&
              nuevoNodoConfig.tipo_relacion === "EFECTO" && (
                <div className="rounded-xl border-2 border-dashed border-ember/60 bg-surface-2/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-2xs font-semibold border-ember/40 text-ember">
                      Nuevo {nuevoNodoConfig.etiqueta}
                    </Badge>
                    <span className="text-2xs text-text-tertiary">Directo (Nivel 1)</span>
                  </div>
                  <Textarea
                    value={nuevoNodoConfig.contenido}
                    onChange={(e) =>
                      setNuevoNodoConfig({ ...nuevoNodoConfig, contenido: e.target.value })
                    }
                    placeholder={
                      esModoProblemas
                        ? "Describa el efecto adverso en la población o territorio..."
                        : "Describa el fin o impacto positivo buscado..."
                    }
                    className="text-xs min-h-[70px] bg-surface-1"
                    disabled={guardandoNodo}
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNuevoNodoConfig(null)}
                      disabled={guardandoNodo}
                      className="h-7 px-2.5 text-xs"
                    >
                      <X className="size-3 mr-1" aria-hidden="true" />
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGuardarNuevoNodo}
                      disabled={guardandoNodo || !nuevoNodoConfig.contenido.trim()}
                      className="h-7 px-3 text-xs bg-ember text-text-inverse hover:bg-ember/90"
                    >
                      <Check className="size-3 mr-1" aria-hidden="true" />
                      {guardandoNodo ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              )}

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
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs text-text-tertiary font-mono">Nivel 1</span>
                      {puedeGestionar && (
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAbrirNuevoNodo(
                                esModoProblemas ? "EFECTO_INDIRECTO" : "FIN_INDIRECTO",
                                "EFECTO",
                                efecto.id,
                                2,
                                esModoProblemas ? "Efecto Indirecto" : "Fin Indirecto"
                              )
                            }
                            disabled={guardandoNodo}
                            className="size-6 p-0 text-text-tertiary hover:text-text-primary"
                            title="Agregar sub-efecto indirecto"
                          >
                            <Plus className="size-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIniciarEdicion(efecto)}
                            disabled={guardandoNodo}
                            className="size-6 p-0 text-text-tertiary hover:text-text-primary"
                            title="Editar efecto"
                          >
                            <Pencil className="size-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminarNodo(efecto.id)}
                            disabled={guardandoNodo}
                            className="size-6 p-0 text-text-tertiary hover:text-error"
                            title="Eliminar efecto"
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenido o Edición inline */}
                  {nodoEnEdicion?.id === efecto.id ? (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        value={nodoEnEdicion.contenido}
                        onChange={(e) =>
                          setNodoEnEdicion({ ...nodoEnEdicion, contenido: e.target.value })
                        }
                        className="text-xs min-h-[60px] bg-surface-2"
                        disabled={guardandoNodo}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNodoEnEdicion(null)}
                          disabled={guardandoNodo}
                          className="h-6 px-2 text-2xs"
                        >
                          <X className="size-3 mr-1" aria-hidden="true" />
                          Cancelar
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleGuardarEdicion(efecto.id)}
                          disabled={guardandoNodo || !nodoEnEdicion.contenido.trim()}
                          className="h-6 px-2.5 text-2xs bg-ember text-text-inverse hover:bg-ember/90"
                        >
                          <Check className="size-3 mr-1" aria-hidden="true" />
                          {guardandoNodo ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-text-primary leading-snug">
                      {efecto.contenido}
                    </p>
                  )}

                  {/* Formulario Inline: Nuevo Sub-nodo de este Efecto */}
                  {nuevoNodoConfig &&
                    nuevoNodoConfig.nodo_padre_id === efecto.id && (
                      <div className="p-2.5 rounded-lg border border-dashed border-border bg-surface-2/80 space-y-2">
                        <span className="text-2xs font-semibold text-text-secondary block">
                          Nuevo {nuevoNodoConfig.etiqueta}:
                        </span>
                        <Textarea
                          value={nuevoNodoConfig.contenido}
                          onChange={(e) =>
                            setNuevoNodoConfig({ ...nuevoNodoConfig, contenido: e.target.value })
                          }
                          placeholder="Descripción del impacto indirecto..."
                          className="text-2xs min-h-[50px] bg-surface-1"
                          disabled={guardandoNodo}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNuevoNodoConfig(null)}
                            disabled={guardandoNodo}
                            className="h-6 px-2 text-2xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleGuardarNuevoNodo}
                            disabled={guardandoNodo || !nuevoNodoConfig.contenido.trim()}
                            className="h-6 px-2.5 text-2xs bg-ember text-text-inverse hover:bg-ember/90"
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}

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
                            className="rounded-lg bg-surface-2/60 p-2.5 text-2xs text-text-secondary font-medium space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-text-primary block">
                                {esModoProblemas ? `Impacto 1.${idx + 1}.${hIdx + 1}:` : `Fin 1.${idx + 1}.${hIdx + 1}:`}
                              </span>
                              {puedeGestionar && (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleIniciarEdicion(hijo)}
                                    disabled={guardandoNodo}
                                    className="size-5 p-0 text-text-tertiary hover:text-text-primary"
                                    title="Editar sub-nodo"
                                  >
                                    <Pencil className="size-2.5" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEliminarNodo(hijo.id)}
                                    disabled={guardandoNodo}
                                    className="size-5 p-0 text-text-tertiary hover:text-error"
                                    title="Eliminar sub-nodo"
                                  >
                                    <Trash2 className="size-2.5" aria-hidden="true" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {nodoEnEdicion?.id === hijo.id ? (
                              <div className="space-y-1.5 pt-1">
                                <Textarea
                                  value={nodoEnEdicion.contenido}
                                  onChange={(e) =>
                                    setNodoEnEdicion({ ...nodoEnEdicion, contenido: e.target.value })
                                  }
                                  className="text-2xs min-h-[45px] bg-surface-1"
                                  disabled={guardandoNodo}
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNodoEnEdicion(null)}
                                    disabled={guardandoNodo}
                                    className="h-5 px-1.5 text-2xs"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleGuardarEdicion(hijo.id)}
                                    disabled={guardandoNodo || !nodoEnEdicion.contenido.trim()}
                                    className="h-5 px-2 text-2xs bg-ember text-text-inverse hover:bg-ember/90"
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span>{hijo.contenido}</span>
                            )}
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
                  {puedeGestionar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleIniciarEdicion(arbol.nodo_central!)}
                      disabled={guardandoNodo}
                      className="size-6 p-0 text-text-tertiary hover:text-text-primary ml-1"
                      title="Editar nodo central"
                    >
                      <Pencil className="size-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                {nodoEnEdicion?.id === arbol.nodo_central.id ? (
                  <div className="space-y-2 pt-1 max-w-lg mx-auto">
                    <Textarea
                      value={nodoEnEdicion.contenido}
                      onChange={(e) =>
                        setNodoEnEdicion({ ...nodoEnEdicion, contenido: e.target.value })
                      }
                      className="text-sm font-semibold text-center min-h-[60px] bg-surface-2"
                      disabled={guardandoNodo}
                      autoFocus
                    />
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNodoEnEdicion(null)}
                        disabled={guardandoNodo}
                        className="h-7 px-3 text-xs"
                      >
                        <X className="size-3 mr-1" aria-hidden="true" />
                        Cancelar
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleGuardarEdicion(arbol.nodo_central!.id)}
                        disabled={guardandoNodo || !nodoEnEdicion.contenido.trim()}
                        className="h-7 px-3 text-xs bg-ember text-text-inverse hover:bg-ember/90"
                      >
                        <Check className="size-3 mr-1" aria-hidden="true" />
                        {guardandoNodo ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <h3 className="text-sm sm:text-base font-bold text-text-primary leading-snug">
                    {arbol.nodo_central.contenido}
                  </h3>
                )}

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
              <div className="flex items-center gap-3">
                <span className="text-2xs text-text-tertiary hidden sm:inline">
                  {esModoProblemas
                    ? "Factores determinantes y raíces socioeconómicas e institucionales"
                    : "Acciones estratégicas e intervenciones programáticas de política pública"}
                </span>
                {puedeGestionar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleAbrirNuevoNodo(
                        esModoProblemas ? "CAUSA_DIRECTA" : "MEDIO_DIRECTO",
                        "CAUSA",
                        arbol?.nodo_central?.id ?? null,
                        1,
                        esModoProblemas ? "Causa Directa" : "Medio Directo"
                      )
                    }
                    disabled={guardandoNodo}
                    className="h-7 px-2.5 text-2xs font-semibold gap-1"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    <span>{esModoProblemas ? "Agregar Causa" : "Agregar Medio"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Formulario Inline: Nueva Causa / Medio Directo */}
            {nuevoNodoConfig &&
              nuevoNodoConfig.nivel === 1 &&
              nuevoNodoConfig.tipo_relacion === "CAUSA" && (
                <div className="rounded-xl border-2 border-dashed border-ember/60 bg-surface-2/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-2xs font-semibold border-ember/40 text-ember">
                      Nueva {nuevoNodoConfig.etiqueta}
                    </Badge>
                    <span className="text-2xs text-text-tertiary">Directa (Nivel 1)</span>
                  </div>
                  <Textarea
                    value={nuevoNodoConfig.contenido}
                    onChange={(e) =>
                      setNuevoNodoConfig({ ...nuevoNodoConfig, contenido: e.target.value })
                    }
                    placeholder={
                      esModoProblemas
                        ? "Describa la causa directa o factor determinante..."
                        : "Describa el medio o intervención directa..."
                    }
                    className="text-xs min-h-[70px] bg-surface-1"
                    disabled={guardandoNodo}
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNuevoNodoConfig(null)}
                      disabled={guardandoNodo}
                      className="h-7 px-2.5 text-xs"
                    >
                      <X className="size-3 mr-1" aria-hidden="true" />
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGuardarNuevoNodo}
                      disabled={guardandoNodo || !nuevoNodoConfig.contenido.trim()}
                      className="h-7 px-3 text-xs bg-ember text-text-inverse hover:bg-ember/90"
                    >
                      <Check className="size-3 mr-1" aria-hidden="true" />
                      {guardandoNodo ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              )}

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
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs text-text-tertiary font-mono">Nivel 1</span>
                      {puedeGestionar && (
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAbrirNuevoNodo(
                                esModoProblemas ? "CAUSA_INDIRECTA" : "MEDIO_INDIRECTO",
                                "CAUSA",
                                causa.id,
                                2,
                                esModoProblemas ? "Causa Indirecta" : "Medio Indirecto"
                              )
                            }
                            disabled={guardandoNodo}
                            className="size-6 p-0 text-text-tertiary hover:text-text-primary"
                            title="Agregar sub-causa indirecta"
                          >
                            <Plus className="size-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIniciarEdicion(causa)}
                            disabled={guardandoNodo}
                            className="size-6 p-0 text-text-tertiary hover:text-text-primary"
                            title="Editar causa"
                          >
                            <Pencil className="size-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminarNodo(causa.id)}
                            disabled={guardandoNodo}
                            className="size-6 p-0 text-text-tertiary hover:text-error"
                            title="Eliminar causa"
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenido o Edición inline */}
                  {nodoEnEdicion?.id === causa.id ? (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        value={nodoEnEdicion.contenido}
                        onChange={(e) =>
                          setNodoEnEdicion({ ...nodoEnEdicion, contenido: e.target.value })
                        }
                        className="text-xs min-h-[60px] bg-surface-2"
                        disabled={guardandoNodo}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNodoEnEdicion(null)}
                          disabled={guardandoNodo}
                          className="h-6 px-2 text-2xs"
                        >
                          <X className="size-3 mr-1" aria-hidden="true" />
                          Cancelar
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleGuardarEdicion(causa.id)}
                          disabled={guardandoNodo || !nodoEnEdicion.contenido.trim()}
                          className="h-6 px-2.5 text-2xs bg-ember text-text-inverse hover:bg-ember/90"
                        >
                          <Check className="size-3 mr-1" aria-hidden="true" />
                          {guardandoNodo ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-text-primary leading-snug">
                      {causa.contenido}
                    </p>
                  )}

                  {/* Formulario Inline: Nuevo Sub-nodo de esta Causa */}
                  {nuevoNodoConfig &&
                    nuevoNodoConfig.nodo_padre_id === causa.id && (
                      <div className="p-2.5 rounded-lg border border-dashed border-border bg-surface-2/80 space-y-2">
                        <span className="text-2xs font-semibold text-text-secondary block">
                          Nueva {nuevoNodoConfig.etiqueta}:
                        </span>
                        <Textarea
                          value={nuevoNodoConfig.contenido}
                          onChange={(e) =>
                            setNuevoNodoConfig({ ...nuevoNodoConfig, contenido: e.target.value })
                          }
                          placeholder="Descripción de la causa raíz / factor indirecto..."
                          className="text-2xs min-h-[50px] bg-surface-1"
                          disabled={guardandoNodo}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNuevoNodoConfig(null)}
                            disabled={guardandoNodo}
                            className="h-6 px-2 text-2xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleGuardarNuevoNodo}
                            disabled={guardandoNodo || !nuevoNodoConfig.contenido.trim()}
                            className="h-6 px-2.5 text-2xs bg-ember text-text-inverse hover:bg-ember/90"
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}

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
                            className="rounded-lg bg-surface-2/60 p-2.5 text-2xs text-text-secondary font-medium space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-text-primary block">
                                {esModoProblemas ? `Raíz 1.${idx + 1}.${hIdx + 1}:` : `Actividad 1.${idx + 1}.${hIdx + 1}:`}
                              </span>
                              {puedeGestionar && (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleIniciarEdicion(hijo)}
                                    disabled={guardandoNodo}
                                    className="size-5 p-0 text-text-tertiary hover:text-text-primary"
                                    title="Editar sub-nodo"
                                  >
                                    <Pencil className="size-2.5" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEliminarNodo(hijo.id)}
                                    disabled={guardandoNodo}
                                    className="size-5 p-0 text-text-tertiary hover:text-error"
                                    title="Eliminar sub-nodo"
                                  >
                                    <Trash2 className="size-2.5" aria-hidden="true" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {nodoEnEdicion?.id === hijo.id ? (
                              <div className="space-y-1.5 pt-1">
                                <Textarea
                                  value={nodoEnEdicion.contenido}
                                  onChange={(e) =>
                                    setNodoEnEdicion({ ...nodoEnEdicion, contenido: e.target.value })
                                  }
                                  className="text-2xs min-h-[45px] bg-surface-1"
                                  disabled={guardandoNodo}
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNodoEnEdicion(null)}
                                    disabled={guardandoNodo}
                                    className="h-5 px-1.5 text-2xs"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleGuardarEdicion(hijo.id)}
                                    disabled={guardandoNodo || !nodoEnEdicion.contenido.trim()}
                                    className="h-5 px-2 text-2xs bg-ember text-text-inverse hover:bg-ember/90"
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span>{hijo.contenido}</span>
                            )}
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
