"use client";

import {useState} from "react";
import {toast} from "sonner";
import {
  Layers,
  Plus,
  Trash2,
  CornerDownRight,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Target,
  Compass,
  Building2,
  Tag,
  AlertTriangle,
  FolderSync,
  FileSpreadsheet,
  Copy
} from "lucide-react";
import {Button} from "@/shared/ui/button";
import {Input} from "@/shared/ui/input";
import {Textarea} from "@/shared/ui/textarea";
import {Badge} from "@/shared/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/shared/ui/table";
import {Tabs, TabsList, TabsTrigger} from "@/shared/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/shared/ui/select";
import type {
  ArbolProblemas,
  ArbolSoluciones,
  NodoArbol,
  NodoArbolMetadatos
} from "@/features/mesas/models/mesas";
import {
  uidNodo,
  generarCSVMatrizEstructurada,
  arbolesAMatrizEstructurada
} from "@/features/mesas/models/mesas";

export const DIMENSIONES_ONU = [
  "Seguridad Personal y Convivencia",
  "Seguridad Ambiental y Cambio Climático",
  "Seguridad Económica y Empleo",
  "Seguridad Alimentaria y Nutrición",
  "Seguridad en Salud Integral",
  "Seguridad Comunitaria y Cohesión Social",
  "Seguridad Política y Derechos Humanos",
] as const;

export interface MatrizArbolRelatoriaProps {
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
  onActualizarProblemas: (arbol: ArbolProblemas) => void;
  onActualizarSoluciones: (arbol: ArbolSoluciones) => void;
  readOnly?: boolean;
  submesasDisponibles?: { id: string; nombre: string }[];
  onConsolidarSubmesas?: () => void;
  mesaId?: string;
  mesaNombre?: string;
  localidad?: string;
  onGenerarSintesisNarrativa?: () => void;
}

export function MatrizArbolRelatoria({
  arbolProblemas,
  arbolSoluciones,
  onActualizarProblemas,
  onActualizarSoluciones,
  readOnly = false,
  submesasDisponibles = [],
  onConsolidarSubmesas,
  mesaId,
  mesaNombre,
  localidad,
  onGenerarSintesisNarrativa,
}: MatrizArbolRelatoriaProps) {
  const [tabActiva, setTabActiva] = useState<"problemas" | "soluciones" | "mml">("problemas");

  // Edición temporal de nuevos nodos raíz
  const [nuevaCausaTexto, setNuevaCausaTexto] = useState("");
  const [nuevoEfectoTexto, setNuevoEfectoTexto] = useState("");
  const [nuevoMedioTexto, setNuevoMedioTexto] = useState("");
  const [nuevoFinTexto, setNuevoFinTexto] = useState("");

  /* ---------- Operaciones de Analítica y Exportación ---------- */

  const exportarCSV = () => {
    const csvContent = generarCSVMatrizEstructurada({
      mesaId: mesaId || "mesa-territorial",
      mesaNombre: mesaNombre || "Mesa de Trabajo Territorial",
      localidad: localidad || "Cartagena de Indias",
      arbolProblemas,
      arbolSoluciones,
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `matriz_arbol_${mesaId || "mesa"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Matriz exportada exitosamente en CSV normalizado para analítica de datos");
  };

  const copiarJSONEstructurado = async () => {
    const datosEstructurados = arbolesAMatrizEstructurada({
      mesaId,
      arbolProblemas,
      arbolSoluciones,
    });

    try {
      await navigator.clipboard.writeText(JSON.stringify(datosEstructurados, null, 2));
      toast.success("JSON estructurado copiado al portapapeles", {
        description: "Formato normalizado listo para modelos de IA o analítica.",
      });
    } catch {
      toast.error("No se pudo acceder al portapapeles.");
    }
  };

  /* ---------- Operaciones Árbol de Problemas ---------- */

  const setProblemaCentral = (texto: string) => {
    onActualizarProblemas({
      ...arbolProblemas,
      problemaCentral: texto,
    });
  };

  const agregarCausaRaiz = () => {
    const texto = nuevaCausaTexto.trim();
    if (!texto) return;
    const nuevo: NodoArbol = {
      id: uidNodo(),
      texto,
      hijos: [],
      metadatos: { criticidad: "media" },
    };
    onActualizarProblemas({
      ...arbolProblemas,
      causas: [...arbolProblemas.causas, nuevo],
    });
    setNuevaCausaTexto("");
  };

  const agregarCausaSecundaria = (causaId: string) => {
    const nuevoHijo: NodoArbol = {
      id: uidNodo(),
      texto: "Nueva causa secundaria (¿por qué ocurre?)",
      hijos: [],
    };
    onActualizarProblemas({
      ...arbolProblemas,
      causas: arbolProblemas.causas.map((c) =>
        c.id === causaId ? { ...c, hijos: [...(c.hijos || []), nuevoHijo] } : c
      ),
    });
  };

  const actualizarCausa = (
    causaId: string,
    hijoId: string | null,
    patch: Partial<NodoArbol> | { metadatos: Partial<NodoArbolMetadatos> }
  ) => {
    onActualizarProblemas({
      ...arbolProblemas,
      causas: arbolProblemas.causas.map((c) => {
        if (!hijoId) {
          if (c.id !== causaId) return c;
          if ("metadatos" in patch) {
            return {
              ...c,
              metadatos: { ...c.metadatos, ...patch.metadatos },
            };
          }
          return { ...c, ...patch };
        }
        if (c.id !== causaId) return c;
        return {
          ...c,
          hijos: (c.hijos || []).map((h) => {
            if (h.id !== hijoId) return h;
            if ("metadatos" in patch) {
              return {
                ...h,
                metadatos: { ...h.metadatos, ...patch.metadatos },
              };
            }
            return { ...h, ...patch };
          }),
        };
      }),
    });
  };

  const eliminarCausa = (causaId: string, hijoId: string | null) => {
    if (!hijoId) {
      onActualizarProblemas({
        ...arbolProblemas,
        causas: arbolProblemas.causas.filter((c) => c.id !== causaId),
      });
    } else {
      onActualizarProblemas({
        ...arbolProblemas,
        causas: arbolProblemas.causas.map((c) =>
          c.id === causaId
            ? { ...c, hijos: (c.hijos || []).filter((h) => h.id !== hijoId) }
            : c
        ),
      });
    }
  };

  const agregarEfecto = () => {
    const texto = nuevoEfectoTexto.trim();
    if (!texto) return;
    const nuevo: NodoArbol = {
      id: uidNodo(),
      texto,
      hijos: [],
      metadatos: { criticidad: "media" },
    };
    onActualizarProblemas({
      ...arbolProblemas,
      efectos: [...arbolProblemas.efectos, nuevo],
    });
    setNuevoEfectoTexto("");
  };

  const agregarEfectoSecundario = (efectoId: string) => {
    const nuevoHijo: NodoArbol = {
      id: uidNodo(),
      texto: "Nuevo efecto derivado o impacto conexo",
      hijos: [],
    };
    onActualizarProblemas({
      ...arbolProblemas,
      efectos: arbolProblemas.efectos.map((e) =>
        e.id === efectoId ? { ...e, hijos: [...(e.hijos || []), nuevoHijo] } : e
      ),
    });
  };

  const actualizarEfecto = (
    efectoId: string,
    hijoId: string | null,
    patch: Partial<NodoArbol> | { metadatos: Partial<NodoArbolMetadatos> }
  ) => {
    onActualizarProblemas({
      ...arbolProblemas,
      efectos: arbolProblemas.efectos.map((e) => {
        if (!hijoId) {
          if (e.id !== efectoId) return e;
          if ("metadatos" in patch) {
            return {
              ...e,
              metadatos: { ...e.metadatos, ...patch.metadatos },
            };
          }
          return { ...e, ...patch };
        }
        if (e.id !== efectoId) return e;
        return {
          ...e,
          hijos: (e.hijos || []).map((h) => {
            if (h.id !== hijoId) return h;
            if ("metadatos" in patch) {
              return {
                ...h,
                metadatos: { ...h.metadatos, ...patch.metadatos },
              };
            }
            return { ...h, ...patch };
          }),
        };
      }),
    });
  };

  const eliminarEfecto = (efectoId: string, hijoId: string | null) => {
    if (!hijoId) {
      onActualizarProblemas({
        ...arbolProblemas,
        efectos: arbolProblemas.efectos.filter((e) => e.id !== efectoId),
      });
    } else {
      onActualizarProblemas({
        ...arbolProblemas,
        efectos: arbolProblemas.efectos.map((e) =>
          e.id === efectoId
            ? { ...e, hijos: (e.hijos || []).filter((h) => h.id !== hijoId) }
            : e
        ),
      });
    }
  };

  /* ---------- Operaciones Árbol de Soluciones ---------- */

  const setObjetivoCentral = (texto: string) => {
    onActualizarSoluciones({
      ...arbolSoluciones,
      objetivoCentral: texto,
    });
  };

  const agregarMedio = () => {
    const texto = nuevoMedioTexto.trim();
    if (!texto) return;
    const nuevo: NodoArbol = {
      id: uidNodo(),
      texto,
      hijos: [],
      metadatos: { actorResponsable: "" },
    };
    onActualizarSoluciones({
      ...arbolSoluciones,
      medios: [...arbolSoluciones.medios, nuevo],
    });
    setNuevoMedioTexto("");
  };

  const agregarMedioSecundario = (medioId: string) => {
    const nuevoHijo: NodoArbol = {
      id: uidNodo(),
      texto: "Medio operativo o acción específica",
      hijos: [],
    };
    onActualizarSoluciones({
      ...arbolSoluciones,
      medios: arbolSoluciones.medios.map((m) =>
        m.id === medioId ? { ...m, hijos: [...(m.hijos || []), nuevoHijo] } : m
      ),
    });
  };

  const actualizarMedio = (
    medioId: string,
    hijoId: string | null,
    patch: Partial<NodoArbol> | { metadatos: Partial<NodoArbolMetadatos> }
  ) => {
    onActualizarSoluciones({
      ...arbolSoluciones,
      medios: arbolSoluciones.medios.map((m) => {
        if (!hijoId) {
          if (m.id !== medioId) return m;
          if ("metadatos" in patch) {
            return {
              ...m,
              metadatos: { ...m.metadatos, ...patch.metadatos },
            };
          }
          return { ...m, ...patch };
        }
        if (m.id !== medioId) return m;
        return {
          ...m,
          hijos: (m.hijos || []).map((h) => {
            if (h.id !== hijoId) return h;
            if ("metadatos" in patch) {
              return {
                ...h,
                metadatos: { ...h.metadatos, ...patch.metadatos },
              };
            }
            return { ...h, ...patch };
          }),
        };
      }),
    });
  };

  const eliminarMedio = (medioId: string, hijoId: string | null) => {
    if (!hijoId) {
      onActualizarSoluciones({
        ...arbolSoluciones,
        medios: arbolSoluciones.medios.filter((m) => m.id !== medioId),
      });
    } else {
      onActualizarSoluciones({
        ...arbolSoluciones,
        medios: arbolSoluciones.medios.map((m) =>
          m.id === medioId
            ? { ...m, hijos: (m.hijos || []).filter((h) => h.id !== hijoId) }
            : m
        ),
      });
    }
  };

  const agregarFin = () => {
    const texto = nuevoFinTexto.trim();
    if (!texto) return;
    const nuevo: NodoArbol = {
      id: uidNodo(),
      texto,
      hijos: [],
    };
    onActualizarSoluciones({
      ...arbolSoluciones,
      fines: [...arbolSoluciones.fines, nuevo],
    });
    setNuevoFinTexto("");
  };

  const agregarFinSecundario = (finId: string) => {
    const nuevoHijo: NodoArbol = {
      id: uidNodo(),
      texto: "Fin último de sostenibilidad",
      hijos: [],
    };
    onActualizarSoluciones({
      ...arbolSoluciones,
      fines: arbolSoluciones.fines.map((f) =>
        f.id === finId ? { ...f, hijos: [...(f.hijos || []), nuevoHijo] } : f
      ),
    });
  };

  const actualizarFin = (
    finId: string,
    hijoId: string | null,
    patch: Partial<NodoArbol> | { metadatos: Partial<NodoArbolMetadatos> }
  ) => {
    onActualizarSoluciones({
      ...arbolSoluciones,
      fines: arbolSoluciones.fines.map((f) => {
        if (!hijoId) {
          if (f.id !== finId) return f;
          if ("metadatos" in patch) {
            return {
              ...f,
              metadatos: { ...f.metadatos, ...patch.metadatos },
            };
          }
          return { ...f, ...patch };
        }
        if (f.id !== finId) return f;
        return {
          ...f,
          hijos: (f.hijos || []).map((h) => {
            if (h.id !== hijoId) return h;
            if ("metadatos" in patch) {
              return {
                ...h,
                metadatos: { ...h.metadatos, ...patch.metadatos },
              };
            }
            return { ...h, ...patch };
          }),
        };
      }),
    });
  };

  const eliminarFin = (finId: string, hijoId: string | null) => {
    if (!hijoId) {
      onActualizarSoluciones({
        ...arbolSoluciones,
        fines: arbolSoluciones.fines.filter((f) => f.id !== finId),
      });
    } else {
      onActualizarSoluciones({
        ...arbolSoluciones,
        fines: arbolSoluciones.fines.map((f) =>
          f.id === finId
            ? { ...f, hijos: (f.hijos || []).filter((h) => h.id !== hijoId) }
            : f
        ),
      });
    }
  };

  // Proyección rápida de soluciones a partir de los problemas registrados
  const derivarSoluciones = () => {
    const nuevoObj = arbolSoluciones.objetivoCentral.trim()
      ? arbolSoluciones.objetivoCentral
      : arbolProblemas.problemaCentral
      ? `Garantizar la superación y mitigación integral de: ${arbolProblemas.problemaCentral}`
      : "Garantizar la Seguridad Humana Territorial";

    const clonarNodos = (lista: NodoArbol[]): NodoArbol[] =>
      lista.map((n) => ({
        id: uidNodo(),
        texto: `Intervención integral sobre: ${n.texto}`,
        metadatos: { ...n.metadatos },
        hijos: (n.hijos || []).map((h) => ({
          id: uidNodo(),
          texto: `Acción específica sobre: ${h.texto}`,
          metadatos: { ...h.metadatos },
          hijos: [],
        })),
      }));

    onActualizarSoluciones({
      objetivoCentral: nuevoObj,
      medios: arbolSoluciones.medios.length > 0 ? arbolSoluciones.medios : clonarNodos(arbolProblemas.causas),
      fines: arbolSoluciones.fines.length > 0 ? arbolSoluciones.fines : clonarNodos(arbolProblemas.efectos),
    });
  };

  /* ---------- Métricas para la Matriz Integrada MML ---------- */
  const totalCausas = arbolProblemas.causas.length;
  const totalEfectos = arbolProblemas.efectos.length;
  const totalMedios = arbolSoluciones.medios.length;
  const totalFines = arbolSoluciones.fines.length;
  const coberturaSoluciones =
    totalCausas > 0 ? Math.min(100, Math.round((totalMedios / totalCausas) * 100)) : 100;
  const maxFilasMml = Math.max(totalCausas, totalMedios, totalEfectos, totalFines, 1);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
      {/* Barra de cabecera con tabs y acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[var(--ember)]" strokeWidth={2} />
            <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
              Matriz de Árbol de Problemas, Soluciones y Marco Lógico (DNP / CONPES)
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Estructuración causal conforme a la Metodología General Ajustada para relatorías territoriales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onConsolidarSubmesas && submesasDisponibles.length > 0 && !readOnly && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onConsolidarSubmesas}
              className="gap-1.5 text-xs text-[var(--ember)]"
              title="Importar y consolidar árboles diligenciados en las submesas"
            >
              <FolderSync className="size-3.5" strokeWidth={1.5} />
              Consolidar {submesasDisponibles.length} submesas
            </Button>
          )}

          <Tabs
            value={tabActiva}
            onValueChange={(v) => setTabActiva(v as "problemas" | "soluciones" | "mml")}
            className="w-auto"
          >
            <TabsList className="bg-[var(--surface-2)]">
              <TabsTrigger value="problemas" className="gap-1.5 text-xs">
                <ShieldAlert className="size-3.5" strokeWidth={1.5} />
                Árbol de Problemas
                {totalCausas > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                    {totalCausas}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="soluciones" className="gap-1.5 text-xs">
                <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
                Árbol de Soluciones
                {totalMedios > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                    {totalMedios}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mml" className="gap-1.5 text-xs">
                <Target className="size-3.5" strokeWidth={1.5} />
                Matriz Integrada MML
                <Badge
                  variant={coberturaSoluciones >= 80 ? "success" : "warning"}
                  className="ml-1 px-1.5 py-0 text-[10px]"
                >
                  {coberturaSoluciones}%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Barra de herramientas de analítica y datos */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Analítica y Datos:</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Estructuración para tabulación CONPES y cruce territorial
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={exportarCSV}
            className="h-7 gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Descargar matriz en CSV normalizado para análisis en Excel, PowerBI, Python o R"
          >
            <FileSpreadsheet className="size-3.5 text-[var(--success)]" strokeWidth={1.5} />
            Exportar datos (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={copiarJSONEstructurado}
            className="h-7 gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Copiar JSON estructurado para procesamiento en pipelines de IA o analítica territorial"
          >
            <Copy className="size-3.5 text-[var(--info)]" strokeWidth={1.5} />
            Copiar JSON estructurado
          </Button>
          {onGenerarSintesisNarrativa && !readOnly && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onGenerarSintesisNarrativa}
              className="h-7 gap-1.5 text-xs text-[var(--ember)]"
              title="Redactar borrador técnico para el campo de relatoría a partir de los datos de la matriz"
            >
              <Sparkles className="size-3.5 text-[var(--ember)]" strokeWidth={1.5} />
              Generar síntesis narrativa
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ÁRBOL DE PROBLEMAS (DIAGNÓSTICO TERRITORIAL)                       */}
      {/* ========================================================================= */}
      {tabActiva === "problemas" && (
        <div className="space-y-4">
          {/* Problema Central */}
          <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] p-3.5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ember)]">
                <Target className="size-3.5" strokeWidth={2} />
                Problema Central Territorial (Núcleo del Diagnóstico)
              </span>
              <div className="flex items-center gap-2">
                {!readOnly ? (
                  <div className="flex items-center gap-1">
                    <Tag className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                    <Select
                      value={arbolProblemas.dimensionPrincipal || ""}
                      onValueChange={(dim) =>
                        onActualizarProblemas({
                          ...arbolProblemas,
                          dimensionPrincipal: dim,
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="h-6 text-[10px]">
                        <SelectValue placeholder="Dimensión ONU principal…" />
                      </SelectTrigger>
                      <SelectContent>
                        {DIMENSIONES_ONU.map((dim) => (
                          <SelectItem key={dim} value={dim} className="text-xs">
                            {dim}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  arbolProblemas.dimensionPrincipal && (
                    <Badge variant="secondary" className="text-[10px]">
                      Dimensión ONU: {arbolProblemas.dimensionPrincipal}
                    </Badge>
                  )
                )}
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {readOnly ? "Visualización" : "Condición negativa o insatisfecha"}
                </span>
              </div>
            </div>
            {readOnly ? (
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {arbolProblemas.problemaCentral || "No se ha definido el problema central."}
              </p>
            ) : (
              <Textarea
                rows={2}
                value={arbolProblemas.problemaCentral}
                onChange={(e) => setProblemaCentral(e.target.value)}
                placeholder="Ej: Altos índices de violencia interpersonal y disputas territoriales que limitan la convivencia comunitaria en la Localidad…"
                className="w-full resize-none border-[var(--border)] bg-[var(--surface-0)] text-sm font-medium focus:border-[var(--ember)]"
              />
            )}
          </div>

          {/* Columnas: Causas (Raíz) y Efectos (Impactos) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Columna Izquierda: Causas */}
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Causas Raíz y Directas
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {totalCausas} identificadas
                  </Badge>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  «¿Por qué ocurre el problema?»
                </span>
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Registrar nueva causa directa..."
                    value={nuevaCausaTexto}
                    onChange={(e) => setNuevaCausaTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarCausaRaiz();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={agregarCausaRaiz}
                    disabled={!nuevaCausaTexto.trim()}
                    className="h-8 px-2.5 text-xs text-[var(--ember)]"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    Añadir
                  </Button>
                </div>
              )}

              <div className="space-y-2.5">
                {arbolProblemas.causas.length === 0 ? (
                  <p className="py-4 text-center text-xs italic text-[var(--text-tertiary)]">
                    No se han registrado causas directas en esta mesa.
                  </p>
                ) : (
                  arbolProblemas.causas.map((causa, idx) => (
                    <div
                      key={causa.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-xs font-bold text-[var(--text-tertiary)]">
                            {idx + 1}.
                          </span>
                          {readOnly ? (
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {causa.texto}
                            </span>
                          ) : (
                            <Input
                              value={causa.texto}
                              onChange={(e) =>
                                actualizarCausa(causa.id, null, { texto: e.target.value })
                              }
                              className="h-7 border-transparent bg-transparent px-1 text-xs font-medium focus:border-[var(--border)] focus:bg-[var(--surface-0)]"
                            />
                          )}
                        </div>

                        {!readOnly && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => agregarCausaSecundaria(causa.id)}
                              title="Añadir causa secundaria (pregunta '¿por qué ocurre?')"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                            >
                              <CornerDownRight className="size-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => eliminarCausa(causa.id, null)}
                              title="Eliminar causa"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--ember)]"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Metadatos de la causa */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)]/60 pt-2 text-[10px]">
                        {causa.metadatos?.origenSubmesaNombre && (
                          <Badge variant="outline" className="gap-1 border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
                            <FolderSync className="size-3" strokeWidth={1.5} />
                            Submesa: {causa.metadatos.origenSubmesaNombre}
                          </Badge>
                        )}

                        {!readOnly ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Tag className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                              <Select
                                value={causa.metadatos?.dimensionOnu || ""}
                                onValueChange={(dim) =>
                                  actualizarCausa(causa.id, null, {
                                    metadatos: { dimensionOnu: dim },
                                  })
                                }
                              >
                                <SelectTrigger size="sm" className="h-6 text-[10px]">
                                  <SelectValue placeholder="Dimensión ONU…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DIMENSIONES_ONU.map((dim) => (
                                    <SelectItem key={dim} value={dim} className="text-xs">
                                      {dim}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-1">
                              <AlertTriangle className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                              <Select
                                value={causa.metadatos?.criticidad || "media"}
                                onValueChange={(crit) =>
                                  actualizarCausa(causa.id, null, {
                                    metadatos: { criticidad: crit as "alta" | "media" | "baja" },
                                  })
                                }
                              >
                                <SelectTrigger size="sm" className="h-6 text-[10px]">
                                  <SelectValue placeholder="Criticidad…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="alta" className="text-xs">
                                    🔴 Alta criticidad
                                  </SelectItem>
                                  <SelectItem value="media" className="text-xs">
                                    🟠 Media criticidad
                                  </SelectItem>
                                  <SelectItem value="baja" className="text-xs">
                                    🟢 Baja criticidad
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <>
                            {causa.metadatos?.dimensionOnu && (
                              <Badge variant="secondary" className="text-[10px]">
                                {causa.metadatos.dimensionOnu}
                              </Badge>
                            )}
                            {causa.metadatos?.criticidad && (
                              <Badge
                                variant={
                                  causa.metadatos.criticidad === "alta"
                                    ? "destructive"
                                    : causa.metadatos.criticidad === "media"
                                    ? "warning"
                                    : "info"
                                }
                                className="text-[10px]"
                              >
                                Criticidad: {causa.metadatos.criticidad}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* Causas secundarias (hijos) */}
                      {causa.hijos && causa.hijos.length > 0 && (
                        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-[var(--border)]">
                          {causa.hijos.map((hijo, hIdx) => (
                            <div
                              key={hijo.id}
                              className="flex items-center justify-between gap-2 rounded bg-[var(--surface-0)] px-2 py-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                  {idx + 1}.{hIdx + 1}
                                </span>
                                {readOnly ? (
                                  <span className="truncate text-[var(--text-secondary)]">
                                    {hijo.texto}
                                  </span>
                                ) : (
                                  <Input
                                    value={hijo.texto}
                                    onChange={(e) =>
                                      actualizarCausa(causa.id, hijo.id, {
                                        texto: e.target.value,
                                      })
                                    }
                                    className="h-6 border-transparent bg-transparent px-1 text-[11px] text-[var(--text-secondary)] focus:border-[var(--border)]"
                                  />
                                )}
                              </div>
                              {!readOnly && (
                                <Button
                                  variant="unstyled"
                                  size="unstyled"
                                  type="button"
                                  onClick={() => eliminarCausa(causa.id, hijo.id)}
                                  title="Eliminar causa secundaria"
                                  className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--ember)]"
                                >
                                  <Trash2 className="size-3" strokeWidth={1.5} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna Derecha: Efectos e Impactos */}
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Efectos e Impactos Territoriales
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {totalEfectos} identificados
                  </Badge>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  «¿Qué consecuencias produce?»
                </span>
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Registrar efecto o impacto territorial..."
                    value={nuevoEfectoTexto}
                    onChange={(e) => setNuevoEfectoTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarEfecto();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={agregarEfecto}
                    disabled={!nuevoEfectoTexto.trim()}
                    className="h-8 px-2.5 text-xs text-[var(--ember)]"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    Añadir
                  </Button>
                </div>
              )}

              <div className="space-y-2.5">
                {arbolProblemas.efectos.length === 0 ? (
                  <p className="py-4 text-center text-xs italic text-[var(--text-tertiary)]">
                    No se han registrado efectos en esta mesa.
                  </p>
                ) : (
                  arbolProblemas.efectos.map((efecto, idx) => (
                    <div
                      key={efecto.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-xs font-bold text-[var(--text-tertiary)]">
                            {idx + 1}.
                          </span>
                          {readOnly ? (
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {efecto.texto}
                            </span>
                          ) : (
                            <Input
                              value={efecto.texto}
                              onChange={(e) =>
                                actualizarEfecto(efecto.id, null, { texto: e.target.value })
                              }
                              className="h-7 border-transparent bg-transparent px-1 text-xs font-medium focus:border-[var(--border)] focus:bg-[var(--surface-0)]"
                            />
                          )}
                        </div>

                        {!readOnly && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => agregarEfectoSecundario(efecto.id)}
                              title="Añadir efecto secundario o impacto derivado"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                            >
                              <CornerDownRight className="size-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => eliminarEfecto(efecto.id, null)}
                              title="Eliminar efecto"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--ember)]"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Metadatos del efecto */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)]/60 pt-2 text-[10px]">
                        {!readOnly ? (
                          <div className="flex items-center gap-1">
                            <Tag className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                            <Select
                              value={efecto.metadatos?.dimensionOnu || ""}
                              onValueChange={(dim) =>
                                actualizarEfecto(efecto.id, null, {
                                  metadatos: { dimensionOnu: dim },
                                })
                              }
                            >
                              <SelectTrigger size="sm" className="h-6 text-[10px]">
                                <SelectValue placeholder="Dimensión ONU…" />
                              </SelectTrigger>
                              <SelectContent>
                                {DIMENSIONES_ONU.map((dim) => (
                                  <SelectItem key={dim} value={dim} className="text-xs">
                                    {dim}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          efecto.metadatos?.dimensionOnu && (
                            <Badge variant="secondary" className="text-[10px]">
                              {efecto.metadatos.dimensionOnu}
                            </Badge>
                          )
                        )}
                      </div>

                      {/* Efectos secundarios */}
                      {efecto.hijos && efecto.hijos.length > 0 && (
                        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-[var(--border)]">
                          {efecto.hijos.map((hijo, hIdx) => (
                            <div
                              key={hijo.id}
                              className="flex items-center justify-between gap-2 rounded bg-[var(--surface-0)] px-2 py-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                  {idx + 1}.{hIdx + 1}
                                </span>
                                {readOnly ? (
                                  <span className="truncate text-[var(--text-secondary)]">
                                    {hijo.texto}
                                  </span>
                                ) : (
                                  <Input
                                    value={hijo.texto}
                                    onChange={(e) =>
                                      actualizarEfecto(efecto.id, hijo.id, {
                                        texto: e.target.value,
                                      })
                                    }
                                    className="h-6 border-transparent bg-transparent px-1 text-[11px] text-[var(--text-secondary)] focus:border-[var(--border)]"
                                  />
                                )}
                              </div>
                              {!readOnly && (
                                <Button
                                  variant="unstyled"
                                  size="unstyled"
                                  type="button"
                                  onClick={() => eliminarEfecto(efecto.id, hijo.id)}
                                  title="Eliminar efecto derivado"
                                  className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--ember)]"
                                >
                                  <Trash2 className="size-3" strokeWidth={1.5} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ÁRBOL DE SOLUCIONES (PROYECCIÓN ESTRATÉGICA)                        */}
      {/* ========================================================================= */}
      {tabActiva === "soluciones" && (
        <div className="space-y-4">
          {/* Objetivo Central y Botón Derivar */}
          <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--surface-2)] p-3.5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
                <Compass className="size-3.5" strokeWidth={2} />
                Objetivo Central Concertado (Transformación Positiva)
              </span>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={derivarSoluciones}
                  className="h-6 gap-1 text-[11px] text-[var(--success)]"
                  title="Transformar automáticamente causas en medios y efectos en fines"
                >
                  <Sparkles className="size-3" strokeWidth={1.5} />
                  Proyectar desde diagnóstico
                </Button>
              )}
            </div>
            {readOnly ? (
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {arbolSoluciones.objetivoCentral || "No se ha definido el objetivo central."}
              </p>
            ) : (
              <Textarea
                rows={2}
                value={arbolSoluciones.objetivoCentral}
                onChange={(e) => setObjetivoCentral(e.target.value)}
                placeholder="Ej: Fortalecer la convivencia pacífica y los entornos seguros mediante intervención comunitaria e institucional articulada…"
                className="w-full resize-none border-[var(--border)] bg-[var(--surface-0)] text-sm font-medium focus:border-[var(--success)]"
              />
            )}
          </div>

          {/* Columnas: Medios (Acciones) y Fines (Sostenibilidad) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Columna Izquierda: Medios */}
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Medios y Líneas de Acción
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {totalMedios} líneas
                  </Badge>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  «¿Cómo lo resolvemos?»
                </span>
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Registrar medio o línea de acción..."
                    value={nuevoMedioTexto}
                    onChange={(e) => setNuevoMedioTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarMedio();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={agregarMedio}
                    disabled={!nuevoMedioTexto.trim()}
                    className="h-8 px-2.5 text-xs text-[var(--success)]"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    Añadir
                  </Button>
                </div>
              )}

              <div className="space-y-2.5">
                {arbolSoluciones.medios.length === 0 ? (
                  <p className="py-4 text-center text-xs italic text-[var(--text-tertiary)]">
                    No se han registrado medios de intervención en esta mesa.
                  </p>
                ) : (
                  arbolSoluciones.medios.map((medio, idx) => (
                    <div
                      key={medio.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-xs font-bold text-[var(--text-tertiary)]">
                            {idx + 1}.
                          </span>
                          {readOnly ? (
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {medio.texto}
                            </span>
                          ) : (
                            <Input
                              value={medio.texto}
                              onChange={(e) =>
                                actualizarMedio(medio.id, null, { texto: e.target.value })
                              }
                              className="h-7 border-transparent bg-transparent px-1 text-xs font-medium focus:border-[var(--border)] focus:bg-[var(--surface-0)]"
                            />
                          )}
                        </div>

                        {!readOnly && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => agregarMedioSecundario(medio.id)}
                              title="Añadir medio operativo complementario"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                            >
                              <CornerDownRight className="size-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => eliminarMedio(medio.id, null)}
                              title="Eliminar medio"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--ember)]"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Metadatos del medio: Actor responsable y Dimensión ONU */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border)]/60 pt-2 text-[10px]">
                        {!readOnly ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Building2 className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                              <Input
                                placeholder="Actor responsable…"
                                value={medio.metadatos?.actorResponsable || ""}
                                onChange={(e) =>
                                  actualizarMedio(medio.id, null, {
                                    metadatos: { actorResponsable: e.target.value },
                                  })
                                }
                                className="h-6 w-36 px-1.5 text-[10px]"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Tag className="size-3 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                              <Select
                                value={medio.metadatos?.dimensionOnu || ""}
                                onValueChange={(dim) =>
                                  actualizarMedio(medio.id, null, {
                                    metadatos: { dimensionOnu: dim },
                                  })
                                }
                              >
                                <SelectTrigger size="sm" className="h-6 text-[10px]">
                                  <SelectValue placeholder="Dimensión ONU…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DIMENSIONES_ONU.map((dim) => (
                                    <SelectItem key={dim} value={dim} className="text-xs">
                                      {dim}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <>
                            {medio.metadatos?.actorResponsable && (
                              <Badge variant="outline" className="text-[10px] text-[var(--text-secondary)]">
                                Responsable: {medio.metadatos.actorResponsable}
                              </Badge>
                            )}
                            {medio.metadatos?.dimensionOnu && (
                              <Badge variant="secondary" className="text-[10px]">
                                {medio.metadatos.dimensionOnu}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* Medios secundarios */}
                      {medio.hijos && medio.hijos.length > 0 && (
                        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-[var(--border)]">
                          {medio.hijos.map((hijo, hIdx) => (
                            <div
                              key={hijo.id}
                              className="flex items-center justify-between gap-2 rounded bg-[var(--surface-0)] px-2 py-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                  {idx + 1}.{hIdx + 1}
                                </span>
                                {readOnly ? (
                                  <span className="truncate text-[var(--text-secondary)]">
                                    {hijo.texto}
                                  </span>
                                ) : (
                                  <Input
                                    value={hijo.texto}
                                    onChange={(e) =>
                                      actualizarMedio(medio.id, hijo.id, {
                                        texto: e.target.value,
                                      })
                                    }
                                    className="h-6 border-transparent bg-transparent px-1 text-[11px] text-[var(--text-secondary)] focus:border-[var(--border)]"
                                  />
                                )}
                              </div>
                              {!readOnly && (
                                <Button
                                  variant="unstyled"
                                  size="unstyled"
                                  type="button"
                                  onClick={() => eliminarMedio(medio.id, hijo.id)}
                                  title="Eliminar medio secundario"
                                  className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--ember)]"
                                >
                                  <Trash2 className="size-3" strokeWidth={1.5} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna Derecha: Fines */}
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Fines e Impacto Superior
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {totalFines} definidos
                  </Badge>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  «¿Para qué intervenimos?»
                </span>
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Registrar fin o impacto superior esperado..."
                    value={nuevoFinTexto}
                    onChange={(e) => setNuevoFinTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarFin();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={agregarFin}
                    disabled={!nuevoFinTexto.trim()}
                    className="h-8 px-2.5 text-xs text-[var(--success)]"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    Añadir
                  </Button>
                </div>
              )}

              <div className="space-y-2.5">
                {arbolSoluciones.fines.length === 0 ? (
                  <p className="py-4 text-center text-xs italic text-[var(--text-tertiary)]">
                    No se han registrado fines en esta mesa.
                  </p>
                ) : (
                  arbolSoluciones.fines.map((fin, idx) => (
                    <div
                      key={fin.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 transition-colors hover:border-[var(--border-strong)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-xs font-bold text-[var(--text-tertiary)]">
                            {idx + 1}.
                          </span>
                          {readOnly ? (
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {fin.texto}
                            </span>
                          ) : (
                            <Input
                              value={fin.texto}
                              onChange={(e) =>
                                actualizarFin(fin.id, null, { texto: e.target.value })
                              }
                              className="h-7 border-transparent bg-transparent px-1 text-xs font-medium focus:border-[var(--border)] focus:bg-[var(--surface-0)]"
                            />
                          )}
                        </div>

                        {!readOnly && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => agregarFinSecundario(fin.id)}
                              title="Añadir fin superior derivado"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                            >
                              <CornerDownRight className="size-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button
                              variant="unstyled"
                              size="unstyled"
                              type="button"
                              onClick={() => eliminarFin(fin.id, null)}
                              title="Eliminar fin"
                              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--ember)]"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Fines secundarios */}
                      {fin.hijos && fin.hijos.length > 0 && (
                        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-[var(--border)]">
                          {fin.hijos.map((hijo, hIdx) => (
                            <div
                              key={hijo.id}
                              className="flex items-center justify-between gap-2 rounded bg-[var(--surface-0)] px-2 py-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                  {idx + 1}.{hIdx + 1}
                                </span>
                                {readOnly ? (
                                  <span className="truncate text-[var(--text-secondary)]">
                                    {hijo.texto}
                                  </span>
                                ) : (
                                  <Input
                                    value={hijo.texto}
                                    onChange={(e) =>
                                      actualizarFin(fin.id, hijo.id, {
                                        texto: e.target.value,
                                      })
                                    }
                                    className="h-6 border-transparent bg-transparent px-1 text-[11px] text-[var(--text-secondary)] focus:border-[var(--border)]"
                                  />
                                )}
                              </div>
                              {!readOnly && (
                                <Button
                                  variant="unstyled"
                                  size="unstyled"
                                  type="button"
                                  onClick={() => eliminarFin(fin.id, hijo.id)}
                                  title="Eliminar fin derivado"
                                  className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--ember)]"
                                >
                                  <Trash2 className="size-3" strokeWidth={1.5} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MATRIZ INTEGRADA MML (MARCO LÓGICO DNP CONPES)                      */}
      {/* ========================================================================= */}
      {tabActiva === "mml" && (
        <div className="space-y-3">
          {/* Banner de indicadores metodológicos */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Causas Raíz
              </span>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {totalCausas}
              </span>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Efectos Identificados
              </span>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {totalEfectos}
              </span>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Medios de Acción
              </span>
              <span className="text-base font-bold text-[var(--success)]">
                {totalMedios}
              </span>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Fines Superiores
              </span>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {totalFines}
              </span>
            </div>
            <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-center sm:col-span-1">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Cobertura Causal
              </span>
              <span
                className="text-base font-bold"
                style={{
                  color: coberturaSoluciones >= 80 ? "var(--success)" : "var(--warning)",
                }}
              >
                {coberturaSoluciones}%
              </span>
            </div>
          </div>

          {/* Tabla de Marco Lógico */}
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <Table>
              <TableHeader className="bg-[var(--surface-2)]">
                <TableRow>
                  <TableHead className="w-8 text-center font-bold text-[11px]">#</TableHead>
                  <TableHead className="w-[22%] font-bold text-[11px] text-[var(--ember)]">
                    Diagnóstico: Causa Raíz
                  </TableHead>
                  <TableHead className="w-[20%] font-bold text-[11px] text-[var(--text-primary)]">
                    Impacto: Efecto Territorial
                  </TableHead>
                  <TableHead className="w-[22%] font-bold text-[11px] text-[var(--success)]">
                    Intervención: Medio / Acción
                  </TableHead>
                  <TableHead className="w-[18%] font-bold text-[11px] text-[var(--text-primary)]">
                    Propósito: Fin Esperado
                  </TableHead>
                  <TableHead className="w-[18%] font-bold text-[11px] text-[var(--info)]">
                    Dimensión ONU
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-[var(--surface-0)]">
                {Array.from({ length: maxFilasMml }).map((_, i) => {
                  const causa = arbolProblemas.causas[i];
                  const efecto = arbolProblemas.efectos[i];
                  const medio = arbolSoluciones.medios[i];
                  const fin = arbolSoluciones.fines[i];
                  const dimensionFila =
                    causa?.metadatos?.dimensionOnu ||
                    medio?.metadatos?.dimensionOnu ||
                    efecto?.metadatos?.dimensionOnu ||
                    arbolProblemas.dimensionPrincipal;

                  return (
                    <TableRow key={`mml-row-${i}`} className="hover:bg-[var(--surface-1)]">
                      <TableCell className="text-center font-mono text-xs font-bold text-[var(--text-tertiary)]">
                        {i + 1}
                      </TableCell>

                      {/* Columna Causa */}
                      <TableCell className="align-top">
                        {causa ? (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {causa.texto}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {causa.metadatos?.criticidad && (
                                <Badge
                                  variant={
                                    causa.metadatos.criticidad === "alta"
                                      ? "destructive"
                                      : causa.metadatos.criticidad === "media"
                                      ? "warning"
                                      : "info"
                                  }
                                  className="text-[9px] px-1 py-0"
                                >
                                  {causa.metadatos.criticidad}
                                </Badge>
                              )}
                              {causa.metadatos?.dimensionOnu && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  {causa.metadatos.dimensionOnu}
                                </Badge>
                              )}
                            </div>
                            {causa.hijos && causa.hijos.length > 0 && (
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                + {causa.hijos.length} causa(s) secundaria(s)
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>

                      {/* Columna Efecto */}
                      <TableCell className="align-top">
                        {efecto ? (
                          <div className="space-y-1">
                            <span className="text-xs text-[var(--text-primary)]">
                              {efecto.texto}
                            </span>
                            {efecto.metadatos?.dimensionOnu && (
                              <div>
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  {efecto.metadatos.dimensionOnu}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>

                      {/* Columna Medio */}
                      <TableCell className="align-top">
                        {medio ? (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {medio.texto}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {medio.metadatos?.actorResponsable && (
                                <Badge
                                  variant="outline"
                                  className="gap-0.5 border-[var(--border)] text-[9px] text-[var(--text-secondary)]"
                                >
                                  <Building2 className="size-2.5" strokeWidth={1.5} />
                                  {medio.metadatos.actorResponsable}
                                </Badge>
                              )}
                              {medio.metadatos?.dimensionOnu && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  {medio.metadatos.dimensionOnu}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : causa ? (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                            Sin medio formulado
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>

                      {/* Columna Fin */}
                      <TableCell className="align-top">
                        {fin ? (
                          <div className="space-y-1">
                            <span className="text-xs text-[var(--text-secondary)]">
                              {fin.texto}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>

                      {/* Columna Dimensión ONU */}
                      <TableCell className="align-top">
                        {dimensionFila ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5">
                            {dimensionFila}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
