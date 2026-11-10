"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Download,
  Copy,
  Info,
  CheckCircle2,
  ShieldAlert,
  Target,
  Compass,
  Layers,
  GitBranch,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/ui/select";
import type {
  ArbolProblemas,
  ArbolSoluciones,
  NodoArbol,
  ProblemaAbordadoMesa,
} from "@/features/mesas/models/mesas";
import { uidNodo } from "@/features/mesas/models/mesas";
import { DIMENSIONES_ONU } from "./matriz-arbol-relatoria";
import { RevoGrid } from "@revolist/react-datagrid";
import { defineCustomElements } from "@revolist/revogrid/loader";

export interface FilaRevoGrid {
  id: string;
  nodoId: string;
  tipoNodo: string;
  nivel: string;
  problemaAsociado?: string;
  problemaId?: string;
  texto: string;
  solucionPropuesta?: string;
  dimensionOnu: string;
  actorResponsable: string;
  subMesaOrigen: string;
  criticidad: string;
  tipoCategoria:
    | "problema_central"
    | "problema_adicional"
    | "causa_directa"
    | "causa_indirecta"
    | "efecto_directo"
    | "efecto_indirecto"
    | "objetivo_central"
    | "medio_directo"
    | "medio_indirecto"
    | "fin_directo"
    | "fin_indirecto";
  parentId?: string;
}

export interface MatrizRevogridRelatoriaProps {
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
  onActualizarProblemas: (arbol: ArbolProblemas) => void;
  onActualizarSoluciones: (arbol: ArbolSoluciones) => void;
  readOnly?: boolean;
  submesasDisponibles?: { id: string; nombre: string }[];
  mesaId?: string;
  mesaNombre?: string;
  localidad?: string;
}

export function arbolesAFilasRevoGrid(
  arbolProblemas: ArbolProblemas,
  arbolSoluciones: ArbolSoluciones,
): FilaRevoGrid[] {
  const filas: FilaRevoGrid[] = [];
  const textoProblemaPrincipal =
    arbolProblemas.problemaCentral || "Problema central de la mesa";

  // 1. Problema Central
  filas.push({
    id: "problema_central",
    nodoId: "problema_central",
    tipoNodo: "Problema Central",
    nivel: "Tronco Central",
    problemaAsociado: textoProblemaPrincipal,
    problemaId: "problema_central",
    texto: arbolProblemas.problemaCentral || "",
    solucionPropuesta: arbolSoluciones.objetivoCentral || "",
    dimensionOnu: arbolProblemas.dimensionPrincipal || "",
    actorResponsable: "",
    subMesaOrigen: "",
    criticidad: "alta",
    tipoCategoria: "problema_central",
  });

  // 1.b Problemas Adicionales Abordados en la Mesa (Soporte Multiproblema)
  for (const p of arbolProblemas.problemas || []) {
    filas.push({
      id: `problema_adic_${p.id}`,
      nodoId: p.id,
      tipoNodo: "Problema Abordado",
      nivel: "Problema Territorial",
      problemaAsociado: p.texto || "Nuevo problema abordado",
      problemaId: p.id,
      texto: p.texto || "",
      solucionPropuesta: p.objetivoSolucion || "",
      dimensionOnu: p.dimensionOnu || arbolProblemas.dimensionPrincipal || "",
      actorResponsable: p.actorResponsable || "",
      subMesaOrigen: p.subMesaOrigen || "",
      criticidad: p.criticidad || "alta",
      tipoCategoria: "problema_adicional",
    });
  }

  const resolverTextoProblema = (probId?: string, probTextoMeta?: string) => {
    if (probTextoMeta) return probTextoMeta;
    if (probId && probId !== "problema_central") {
      const encontrado = (arbolProblemas.problemas || []).find((p) => p.id === probId);
      if (encontrado?.texto) return encontrado.texto;
    }
    return textoProblemaPrincipal;
  };

  // 2. Causas
  for (const c of arbolProblemas.causas || []) {
    const probId = c.metadatos?.problemaId || "problema_central";
    const probTexto = resolverTextoProblema(probId, c.metadatos?.problemaTexto);
    filas.push({
      id: `causa_${c.id}`,
      nodoId: c.id,
      tipoNodo: "Causa",
      nivel: "Directa (Raíz)",
      problemaAsociado: probTexto,
      problemaId: probId,
      texto: c.texto || "",
      solucionPropuesta: c.metadatos?.solucionPropuestaTexto || "",
      dimensionOnu:
        c.metadatos?.dimensionOnu || arbolProblemas.dimensionPrincipal || "",
      actorResponsable: c.metadatos?.actorResponsable || "",
      subMesaOrigen: c.metadatos?.origenSubmesaNombre || "",
      criticidad: c.metadatos?.criticidad || "media",
      tipoCategoria: "causa_directa",
    });
    for (const h of c.hijos || []) {
      const hProbId = h.metadatos?.problemaId || probId;
      filas.push({
        id: `causa_ind_${h.id}`,
        nodoId: h.id,
        tipoNodo: "Causa",
        nivel: "Indirecta (Subraíz)",
        problemaAsociado: resolverTextoProblema(hProbId, h.metadatos?.problemaTexto || probTexto),
        problemaId: hProbId,
        texto: h.texto || "",
        solucionPropuesta:
          h.metadatos?.solucionPropuestaTexto ||
          c.metadatos?.solucionPropuestaTexto ||
          "",
        dimensionOnu:
          h.metadatos?.dimensionOnu || c.metadatos?.dimensionOnu || "",
        actorResponsable: h.metadatos?.actorResponsable || "",
        subMesaOrigen:
          h.metadatos?.origenSubmesaNombre || c.metadatos?.origenSubmesaNombre || "",
        criticidad: h.metadatos?.criticidad || "media",
        tipoCategoria: "causa_indirecta",
        parentId: c.id,
      });
    }
  }

  // 3. Efectos
  for (const e of arbolProblemas.efectos || []) {
    const probId = e.metadatos?.problemaId || "problema_central";
    const probTexto = resolverTextoProblema(probId, e.metadatos?.problemaTexto);
    filas.push({
      id: `efecto_${e.id}`,
      nodoId: e.id,
      tipoNodo: "Efecto",
      nivel: "Directo (Copa)",
      problemaAsociado: probTexto,
      problemaId: probId,
      texto: e.texto || "",
      solucionPropuesta: e.metadatos?.solucionPropuestaTexto || "",
      dimensionOnu: e.metadatos?.dimensionOnu || "",
      actorResponsable: e.metadatos?.actorResponsable || "",
      subMesaOrigen: e.metadatos?.origenSubmesaNombre || "",
      criticidad: e.metadatos?.criticidad || "media",
      tipoCategoria: "efecto_directo",
    });
    for (const h of e.hijos || []) {
      filas.push({
        id: `efecto_ind_${h.id}`,
        nodoId: h.id,
        tipoNodo: "Efecto",
        nivel: "Indirecto / Impacto",
        problemaAsociado:
          h.metadatos?.problemaTexto || probTexto,
        problemaId: h.metadatos?.problemaId || probId,
        texto: h.texto || "",
        solucionPropuesta:
          h.metadatos?.solucionPropuestaTexto ||
          e.metadatos?.solucionPropuestaTexto ||
          "",
        dimensionOnu: h.metadatos?.dimensionOnu || "",
        actorResponsable: h.metadatos?.actorResponsable || "",
        subMesaOrigen:
          h.metadatos?.origenSubmesaNombre || e.metadatos?.origenSubmesaNombre || "",
        criticidad: h.metadatos?.criticidad || "media",
        tipoCategoria: "efecto_indirecto",
        parentId: e.id,
      });
    }
  }

  // 4. Objetivo Central
  filas.push({
    id: "objetivo_central",
    nodoId: "objetivo_central",
    tipoNodo: "Objetivo Central",
    nivel: "Propósito Central",
    problemaAsociado: textoProblemaPrincipal,
    problemaId: "problema_central",
    texto: arbolSoluciones.objetivoCentral || "",
    solucionPropuesta: arbolSoluciones.objetivoCentral || "",
    dimensionOnu: "",
    actorResponsable: "",
    subMesaOrigen: "",
    criticidad: "alta",
    tipoCategoria: "objetivo_central",
  });

  // 5. Medios (Soluciones propuestas)
  for (const m of arbolSoluciones.medios || []) {
    const probTexto =
      m.metadatos?.problemaTexto || textoProblemaPrincipal;
    const probId = m.metadatos?.problemaId || "problema_central";
    filas.push({
      id: `medio_${m.id}`,
      nodoId: m.id,
      tipoNodo: "Medio",
      nivel: "Directo (Estratégico)",
      problemaAsociado: probTexto,
      problemaId: probId,
      texto: m.texto || "",
      solucionPropuesta: m.texto || "",
      dimensionOnu: m.metadatos?.dimensionOnu || "",
      actorResponsable: m.metadatos?.actorResponsable || "",
      subMesaOrigen: m.metadatos?.origenSubmesaNombre || "",
      criticidad: m.metadatos?.criticidad || "media",
      tipoCategoria: "medio_directo",
    });
    for (const h of m.hijos || []) {
      filas.push({
        id: `medio_ind_${h.id}`,
        nodoId: h.id,
        tipoNodo: "Medio",
        nivel: "Indirecto (Actividad)",
        problemaAsociado:
          h.metadatos?.problemaTexto || probTexto,
        problemaId: h.metadatos?.problemaId || probId,
        texto: h.texto || "",
        solucionPropuesta: h.texto || "",
        dimensionOnu: h.metadatos?.dimensionOnu || "",
        actorResponsable: h.metadatos?.actorResponsable || "",
        subMesaOrigen:
          h.metadatos?.origenSubmesaNombre || m.metadatos?.origenSubmesaNombre || "",
        criticidad: h.metadatos?.criticidad || "media",
        tipoCategoria: "medio_indirecto",
        parentId: m.id,
      });
    }
  }

  // 6. Fines
  for (const f of arbolSoluciones.fines || []) {
    const probTexto =
      f.metadatos?.problemaTexto || textoProblemaPrincipal;
    const probId = f.metadatos?.problemaId || "problema_central";
    filas.push({
      id: `fin_${f.id}`,
      nodoId: f.id,
      tipoNodo: "Fin",
      nivel: "Directo (Resultado)",
      problemaAsociado: probTexto,
      problemaId: probId,
      texto: f.texto || "",
      solucionPropuesta: f.metadatos?.solucionPropuestaTexto || "",
      dimensionOnu: f.metadatos?.dimensionOnu || "",
      actorResponsable: f.metadatos?.actorResponsable || "",
      subMesaOrigen: f.metadatos?.origenSubmesaNombre || "",
      criticidad: f.metadatos?.criticidad || "media",
      tipoCategoria: "fin_directo",
    });
    for (const h of f.hijos || []) {
      filas.push({
        id: `fin_ind_${h.id}`,
        nodoId: h.id,
        tipoNodo: "Fin",
        nivel: "Fin Último / Impacto",
        problemaAsociado:
          h.metadatos?.problemaTexto || probTexto,
        problemaId: h.metadatos?.problemaId || probId,
        texto: h.texto || "",
        solucionPropuesta:
          h.metadatos?.solucionPropuestaTexto ||
          f.metadatos?.solucionPropuestaTexto ||
          "",
        dimensionOnu: h.metadatos?.dimensionOnu || "",
        actorResponsable: h.metadatos?.actorResponsable || "",
        subMesaOrigen:
          h.metadatos?.origenSubmesaNombre || f.metadatos?.origenSubmesaNombre || "",
        criticidad: h.metadatos?.criticidad || "media",
        tipoCategoria: "fin_indirecto",
        parentId: f.id,
      });
    }
  }

  return filas;
}

export function sincronizarEdicionesArboles(params: {
  arbolProblemas: ArbolProblemas;
  arbolSoluciones: ArbolSoluciones;
  updates: Array<{ row: FilaRevoGrid; prop: string; val: unknown }>;
}): {
  nuevoProblemas: ArbolProblemas;
  nuevoSoluciones: ArbolSoluciones;
  problemasModificado: boolean;
  solucionesModificado: boolean;
} {
  const { arbolProblemas, arbolSoluciones, updates } = params;
  const nuevoProblemas: ArbolProblemas = {
    ...arbolProblemas,
    problemas: arbolProblemas.problemas
      ? JSON.parse(JSON.stringify(arbolProblemas.problemas))
      : undefined,
    causas: JSON.parse(JSON.stringify(arbolProblemas.causas || [])),
    efectos: JSON.parse(JSON.stringify(arbolProblemas.efectos || [])),
  };
  const nuevoSoluciones: ArbolSoluciones = {
    ...arbolSoluciones,
    medios: JSON.parse(JSON.stringify(arbolSoluciones.medios || [])),
    fines: JSON.parse(JSON.stringify(arbolSoluciones.fines || [])),
  };

  let problemasModificado = false;
  let solucionesModificado = false;

  for (const { row, prop, val } of updates) {
    const strVal = typeof val === "string" ? val : String(val ?? "");
    const { tipoCategoria, nodoId, parentId } = row;

    if (tipoCategoria === "problema_central") {
      if (prop === "texto" || prop === "problemaAsociado") {
        nuevoProblemas.problemaCentral = strVal;
        problemasModificado = true;
      } else if (prop === "dimensionOnu") {
        nuevoProblemas.dimensionPrincipal = strVal;
        problemasModificado = true;
      } else if (prop === "solucionPropuesta") {
        nuevoSoluciones.objetivoCentral = strVal;
        solucionesModificado = true;
      }
      continue;
    }

    if (tipoCategoria === "problema_adicional") {
      const lista = nuevoProblemas.problemas || [];
      const item = lista.find((p) => p.id === nodoId);
      if (item) {
        if (prop === "texto" || prop === "problemaAsociado") item.texto = strVal;
        if (prop === "solucionPropuesta") item.objetivoSolucion = strVal;
        if (prop === "dimensionOnu") item.dimensionOnu = strVal;
        if (prop === "actorResponsable") item.actorResponsable = strVal;
        if (prop === "subMesaOrigen") item.subMesaOrigen = strVal;
        if (prop === "criticidad") item.criticidad = strVal as "alta" | "media" | "baja";
        problemasModificado = true;
      }
      continue;
    }

    if (tipoCategoria === "objetivo_central") {
      if (prop === "texto" || prop === "solucionPropuesta") {
        nuevoSoluciones.objetivoCentral = strVal;
        solucionesModificado = true;
      }
      continue;
    }

    const aplicarAMetadatos = (nodo: NodoArbol | undefined) => {
      if (!nodo) return;
      if (prop === "texto") {
        nodo.texto = strVal;
      } else {
        nodo.metadatos = nodo.metadatos || {};
        if (prop === "problemaAsociado") nodo.metadatos.problemaTexto = strVal;
        if (prop === "solucionPropuesta") {
          nodo.metadatos.solucionPropuestaTexto = strVal;
          // Si se escribe una solución propuesta desde una causa o efecto y no existe como medio, también la sincronizamos
          if (strVal.trim() && (tipoCategoria.startsWith("causa") || tipoCategoria.startsWith("efecto"))) {
            const yaExiste = nuevoSoluciones.medios.some(
              (m) => m.texto.toLowerCase() === strVal.trim().toLowerCase(),
            );
            if (!yaExiste) {
              nuevoSoluciones.medios.push({
                id: uidNodo(),
                texto: strVal.trim(),
                hijos: [],
                metadatos: {
                  problemaId: nodo.metadatos.problemaId,
                  problemaTexto: nodo.metadatos.problemaTexto || nuevoProblemas.problemaCentral,
                  dimensionOnu: nodo.metadatos.dimensionOnu,
                  actorResponsable: nodo.metadatos.actorResponsable,
                  criticidad: nodo.metadatos.criticidad || "media",
                },
              });
              solucionesModificado = true;
            }
          }
        }
        if (prop === "dimensionOnu") nodo.metadatos.dimensionOnu = strVal;
        if (prop === "actorResponsable") nodo.metadatos.actorResponsable = strVal;
        if (prop === "subMesaOrigen") nodo.metadatos.origenSubmesaNombre = strVal;
        if (prop === "criticidad") nodo.metadatos.criticidad = strVal as "alta" | "media" | "baja";
      }
    };

    if (tipoCategoria.startsWith("causa")) {
      if (tipoCategoria === "causa_directa") {
        const c = nuevoProblemas.causas.find((n) => n.id === nodoId);
        if (c) {
          aplicarAMetadatos(c);
          problemasModificado = true;
        }
      } else {
        const parent = nuevoProblemas.causas.find((n) => n.id === parentId);
        const hijo = parent?.hijos?.find((n) => n.id === nodoId);
        if (hijo) {
          aplicarAMetadatos(hijo);
          problemasModificado = true;
        }
      }
    } else if (tipoCategoria.startsWith("efecto")) {
      if (tipoCategoria === "efecto_directo") {
        const e = nuevoProblemas.efectos.find((n) => n.id === nodoId);
        if (e) {
          aplicarAMetadatos(e);
          problemasModificado = true;
        }
      } else {
        const parent = nuevoProblemas.efectos.find((n) => n.id === parentId);
        const hijo = parent?.hijos?.find((n) => n.id === nodoId);
        if (hijo) {
          aplicarAMetadatos(hijo);
          problemasModificado = true;
        }
      }
    } else if (tipoCategoria.startsWith("medio")) {
      if (tipoCategoria === "medio_directo") {
        const m = nuevoSoluciones.medios.find((n) => n.id === nodoId);
        if (m) {
          aplicarAMetadatos(m);
          solucionesModificado = true;
        }
      } else {
        const parent = nuevoSoluciones.medios.find((n) => n.id === parentId);
        const hijo = parent?.hijos?.find((n) => n.id === nodoId);
        if (hijo) {
          aplicarAMetadatos(hijo);
          solucionesModificado = true;
        }
      }
    } else if (tipoCategoria.startsWith("fin")) {
      if (tipoCategoria === "fin_directo") {
        const f = nuevoSoluciones.fines.find((n) => n.id === nodoId);
        if (f) {
          aplicarAMetadatos(f);
          solucionesModificado = true;
        }
      } else {
        const parent = nuevoSoluciones.fines.find((n) => n.id === parentId);
        const hijo = parent?.hijos?.find((n) => n.id === nodoId);
        if (hijo) {
          aplicarAMetadatos(hijo);
          solucionesModificado = true;
        }
      }
    }
  }

  return {
    nuevoProblemas,
    nuevoSoluciones,
    problemasModificado,
    solucionesModificado,
  };
}

export function MatrizRevogridRelatoria({
  arbolProblemas,
  arbolSoluciones,
  onActualizarProblemas,
  onActualizarSoluciones,
  readOnly = false,
  submesasDisponibles = [],
}: MatrizRevogridRelatoriaProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroDimension, setFiltroDimension] = useState<string>("TODAS");
  const [filtroProblemaId, setFiltroProblemaId] = useState<string>("TODOS");
  const [problemaActivoId, setProblemaActivoId] = useState<string>("problema_central");
  const [busqueda, setBusqueda] = useState<string>("");

  // Estado del constructor rápido multiproblema en la vista matriz
  const [mostrarConstructorRapido, setMostrarConstructorRapido] = useState<boolean>(false);
  const [rapidoProblema, setRapidoProblema] = useState<string>("");
  const [rapidoCausa, setRapidoCausa] = useState<string>("");
  const [rapidoEfecto, setRapidoEfecto] = useState<string>("");
  const [rapidoSolucion, setRapidoSolucion] = useState<string>("");
  const [rapidoEntidad, setRapidoEntidad] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        defineCustomElements();
      } catch {
        // Entornos de prueba o SSR sin customElements disponibles
      }
    }
  }, []);

  // Lista consolidada de problemas de la mesa
  const catalogoProblemasMesa = useMemo(() => {
    const lista: Array<{ id: string; texto: string }> = [
      {
        id: "problema_central",
        texto: arbolProblemas.problemaCentral || "Problema Central (Tronco)",
      },
    ];
    for (const p of arbolProblemas.problemas || []) {
      lista.push({
        id: p.id,
        texto: p.texto || "Problema Abordado",
      });
    }
    return lista;
  }, [arbolProblemas]);

  const problemaActivoObj = useMemo(
    () =>
      catalogoProblemasMesa.find((p) => p.id === problemaActivoId) ||
      catalogoProblemasMesa[0],
    [catalogoProblemasMesa, problemaActivoId],
  );

  const filas = useMemo(
    () => arbolesAFilasRevoGrid(arbolProblemas, arbolSoluciones),
    [arbolProblemas, arbolSoluciones],
  );

  const filasFiltradas = useMemo(() => {
    return filas.filter((f) => {
      if (filtroProblemaId !== "TODOS") {
        if (f.problemaId !== filtroProblemaId) return false;
      }

      if (filtroTipo !== "TODOS") {
        if (
          filtroTipo === "PROBLEMAS" &&
          !f.tipoCategoria.startsWith("causa") &&
          !f.tipoCategoria.startsWith("efecto") &&
          f.tipoCategoria !== "problema_central" &&
          f.tipoCategoria !== "problema_adicional"
        )
          return false;
        if (
          filtroTipo === "SOLUCIONES" &&
          !f.tipoCategoria.startsWith("medio") &&
          !f.tipoCategoria.startsWith("fin") &&
          f.tipoCategoria !== "objetivo_central"
        )
          return false;
        if (filtroTipo === "CAUSAS" && !f.tipoCategoria.startsWith("causa")) return false;
        if (filtroTipo === "EFECTOS" && !f.tipoCategoria.startsWith("efecto")) return false;
        if (filtroTipo === "MEDIOS" && !f.tipoCategoria.startsWith("medio")) return false;
        if (filtroTipo === "FINES" && !f.tipoCategoria.startsWith("fin")) return false;
      }

      if (filtroDimension !== "TODAS") {
        if (f.dimensionOnu !== filtroDimension) return false;
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincide =
          f.texto.toLowerCase().includes(q) ||
          (f.problemaAsociado || "").toLowerCase().includes(q) ||
          (f.solucionPropuesta || "").toLowerCase().includes(q) ||
          f.tipoNodo.toLowerCase().includes(q) ||
          f.nivel.toLowerCase().includes(q) ||
          f.actorResponsable.toLowerCase().includes(q) ||
          f.subMesaOrigen.toLowerCase().includes(q) ||
          f.dimensionOnu.toLowerCase().includes(q);
        if (!coincide) return false;
      }

      return true;
    });
  }, [filas, filtroProblemaId, filtroTipo, filtroDimension, busqueda]);

  const metricas = useMemo(() => {
    let problemasCount = 1 + (arbolProblemas.problemas?.length || 0);
    let causas = 0;
    let efectos = 0;
    let medios = 0;
    let fines = 0;
    for (const f of filas) {
      if (f.tipoCategoria.startsWith("causa")) causas++;
      else if (f.tipoCategoria.startsWith("efecto")) efectos++;
      else if (f.tipoCategoria.startsWith("medio")) medios++;
      else if (f.tipoCategoria.startsWith("fin")) fines++;
    }
    return { total: filas.length, problemasCount, causas, efectos, medios, fines };
  }, [filas, arbolProblemas.problemas]);

  const cellMultilineProps = ({
    model,
    prop,
  }: {
    model?: Record<string, unknown>;
    prop?: string | number;
  }) => {
    const raw = model && prop !== undefined ? model[String(prop)] : "";
    const textVal = raw !== undefined && raw !== null ? String(raw) : "";
    return {
      title: textVal,
      style: {
        "white-space": "normal",
        "word-break": "break-word",
        "overflow-wrap": "anywhere",
        "line-height": "1.35",
        display: "flex",
        "align-items": "center",
        padding: "6px 8px",
        "overflow-y": "auto",
      },
    };
  };

  const columnas = useMemo(
    () => [
      {
        prop: "tipoNodo",
        name: "Categoría",
        size: 115,
        readonly: true,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "nivel",
        name: "Nivel / Jerarquía",
        size: 120,
        readonly: true,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "texto",
        name: "Descripción (Problema / Causa / Efecto / Solución)",
        size: 350,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "solucionPropuesta",
        name: "Solución Propuesta / Acción Vinculada",
        size: 270,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "problemaAsociado",
        name: "Problema Abordado en la Mesa",
        size: 250,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "dimensionOnu",
        name: "Dimensión ONU",
        size: 200,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "actorResponsable",
        name: "Entidad Responsable",
        size: 180,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "subMesaOrigen",
        name: "Submesa / Colectivo",
        size: 150,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "criticidad",
        name: "Criticidad",
        size: 105,
        readonly: readOnly,
        sortable: true,
        cellProperties: cellMultilineProps,
      },
    ],
    [readOnly],
  );

  const rowDefinitions = useMemo(
    () =>
      filasFiltradas.map((f, index) => {
        const maxLen = Math.max(
          (f.texto || "").length,
          (f.problemaAsociado || "").length,
          (f.solucionPropuesta || "").length,
        );
        const lineasEstimadas = Math.max(2, Math.ceil(maxLen / 42));
        const size = Math.min(160, Math.max(64, lineasEstimadas * 20 + 18));
        return {
          type: "rgRow" as const,
          index,
          size,
        };
      }),
    [filasFiltradas],
  );

  const aplicarEdiciones = (
    updates: Array<{ row: FilaRevoGrid; prop: string; val: unknown }>,
  ) => {
    if (readOnly || updates.length === 0) return;

    const {
      nuevoProblemas,
      nuevoSoluciones,
      problemasModificado,
      solucionesModificado,
    } = sincronizarEdicionesArboles({
      arbolProblemas,
      arbolSoluciones,
      updates,
    });

    if (problemasModificado) {
      onActualizarProblemas(nuevoProblemas);
    }
    if (solucionesModificado) {
      onActualizarSoluciones(nuevoSoluciones);
    }
    toast.success("Matriz actualizada", {
      description: `${updates.length} campo(s) sincronizados con los árboles de problemas y soluciones.`,
    });
  };

  const handleAfterEdit = (e: CustomEvent<Record<string, unknown>>) => {
    if (readOnly) return;
    const detail = e.detail;
    if (!detail) return;

    const updates: Array<{ row: FilaRevoGrid; prop: string; val: unknown }> = [];

    if ("prop" in detail && "model" in detail) {
      updates.push({
        row: detail.model as FilaRevoGrid,
        prop: String(detail.prop),
        val: detail.val,
      });
    } else if (
      "data" in detail &&
      typeof detail.data === "object" &&
      detail.data !== null
    ) {
      const dataObj = detail.data as Record<string, Record<string, unknown>>;
      const modelsObj =
        (detail.models as Record<number, FilaRevoGrid> | undefined) || {};
      Object.entries(dataObj).forEach(([rowIndexStr, updatedRow]) => {
        const idx = Number(rowIndexStr);
        const oldModel = modelsObj[idx] || filasFiltradas[idx];
        if (oldModel && updatedRow) {
          const keys: (keyof FilaRevoGrid)[] = [
            "problemaAsociado",
            "texto",
            "solucionPropuesta",
            "dimensionOnu",
            "actorResponsable",
            "subMesaOrigen",
            "criticidad",
          ];
          for (const key of keys) {
            if (
              updatedRow[key] !== undefined &&
              updatedRow[key] !== oldModel[key]
            ) {
              updates.push({
                row: oldModel,
                prop: key,
                val: updatedRow[key],
              });
            }
          }
        }
      });
    }

    aplicarEdiciones(updates);
  };

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;
    const gridEl = container.querySelector("revo-grid");
    if (!gridEl) return;

    const listener = (e: Event) => {
      handleAfterEdit(e as CustomEvent<Record<string, unknown>>);
    };

    gridEl.addEventListener("afteredit", listener);
    return () => {
      gridEl.removeEventListener("afteredit", listener);
    };
  });

  const agregarNuevoNodo = (
    tipo: "problema" | "causa" | "subcausa" | "efecto" | "medio" | "fin",
  ) => {
    if (readOnly) return;
    const id = uidNodo();
    const probTexto = problemaActivoObj?.texto || arbolProblemas.problemaCentral || "Problema Central";
    const probId = problemaActivoObj?.id || "problema_central";

    if (tipo === "problema") {
      const listaActual = arbolProblemas.problemas || [];
      const numero = listaActual.length + 2;
      const nuevoProb: ProblemaAbordadoMesa = {
        id,
        texto: `Problema territorial #${numero} identificado en la mesa`,
        dimensionOnu: arbolProblemas.dimensionPrincipal || DIMENSIONES_ONU[0],
        objetivoSolucion: "Solución propuesta para mitigar este problema",
        criticidad: "alta",
        subMesaOrigen: submesasDisponibles[0]?.nombre,
      };
      onActualizarProblemas({
        ...arbolProblemas,
        problemas: [...listaActual, nuevoProb],
      });
      setProblemaActivoId(id);
      toast.success("Nuevo problema agregado a la mesa", {
        description: "Ahora puedes agregarle sus causas, efectos y soluciones propuestas en la matriz.",
      });
    } else if (tipo === "causa") {
      const nuevaCausa: NodoArbol = {
        id,
        texto: "Nueva causa formulada",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          criticidad: "media",
          dimensionOnu: arbolProblemas.dimensionPrincipal || DIMENSIONES_ONU[0],
          origenSubmesaNombre: submesasDisponibles[0]?.nombre,
        },
      };
      onActualizarProblemas({
        ...arbolProblemas,
        causas: [...arbolProblemas.causas, nuevaCausa],
      });
      toast.success("Causa directa agregada a la cuadrícula");
    } else if (tipo === "subcausa") {
      const causas = [...(arbolProblemas.causas || [])];
      if (causas.length === 0) {
        const nuevaCausa: NodoArbol = {
          id: uidNodo(),
          texto: "Causa directa principal",
          hijos: [
            {
              id,
              texto: "Nueva subcausa / causa raíz",
              hijos: [],
              metadatos: {
                problemaId: probId,
                problemaTexto: probTexto,
                criticidad: "media",
                dimensionOnu: arbolProblemas.dimensionPrincipal || DIMENSIONES_ONU[0],
              },
            },
          ],
          metadatos: {
            problemaId: probId,
            problemaTexto: probTexto,
            criticidad: "media",
            dimensionOnu: arbolProblemas.dimensionPrincipal || DIMENSIONES_ONU[0],
          },
        };
        onActualizarProblemas({
          ...arbolProblemas,
          causas: [nuevaCausa],
        });
      } else {
        const idxObjetivo = causas.findIndex(
          (c) => (c.metadatos?.problemaId || "problema_central") === probId,
        );
        const targetIdx = idxObjetivo >= 0 ? idxObjetivo : causas.length - 1;
        const padre = causas[targetIdx];
        causas[targetIdx] = {
          ...padre,
          hijos: [
            ...(padre.hijos || []),
            {
              id,
              texto: "Nueva subcausa / causa raíz",
              hijos: [],
              metadatos: {
                problemaId: probId,
                problemaTexto: probTexto,
                criticidad: "media",
                dimensionOnu: padre.metadatos?.dimensionOnu || DIMENSIONES_ONU[0],
              },
            },
          ],
        };
        onActualizarProblemas({
          ...arbolProblemas,
          causas,
        });
      }
      toast.success("Subcausa (causa indirecta) agregada a la matriz");
    } else if (tipo === "efecto") {
      const nuevoEfecto: NodoArbol = {
        id,
        texto: "Nuevo efecto proyectado",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          criticidad: "media",
          dimensionOnu: DIMENSIONES_ONU[0],
          origenSubmesaNombre: submesasDisponibles[0]?.nombre,
        },
      };
      onActualizarProblemas({
        ...arbolProblemas,
        efectos: [...arbolProblemas.efectos, nuevoEfecto],
      });
      toast.success("Efecto directo agregado a la cuadrícula");
    } else if (tipo === "medio") {
      const nuevoMedio: NodoArbol = {
        id,
        texto: "Nueva solución propuesta / medio de intervención",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          criticidad: "media",
          dimensionOnu: DIMENSIONES_ONU[0],
          origenSubmesaNombre: submesasDisponibles[0]?.nombre,
        },
      };
      onActualizarSoluciones({
        ...arbolSoluciones,
        medios: [...arbolSoluciones.medios, nuevoMedio],
      });
      toast.success("Solución propuesta (medio) agregada a la cuadrícula");
    } else if (tipo === "fin") {
      const nuevoFin: NodoArbol = {
        id,
        texto: "Nuevo fin esperado",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          criticidad: "media",
          dimensionOnu: DIMENSIONES_ONU[0],
          origenSubmesaNombre: submesasDisponibles[0]?.nombre,
        },
      };
      onActualizarSoluciones({
        ...arbolSoluciones,
        fines: [...arbolSoluciones.fines, nuevoFin],
      });
      toast.success("Fin de impacto agregado a la cuadrícula");
    }
  };

  const registrarCadenaCompletaRapida = () => {
    if (readOnly) return;
    const textoProb = rapidoProblema.trim() || problemaActivoObj?.texto || "Nuevo problema de la mesa";
    const textoCau = rapidoCausa.trim() || "Causa identificada en la mesa";
    const textoEfe = rapidoEfecto.trim() || "Efecto territorial identificado";
    const textoSol = rapidoSolucion.trim() || "Solución propuesta por la mesa";
    const entidad = rapidoEntidad.trim() || "Alcaldía Distrital / Secretaría Competente";
    const dim = arbolProblemas.dimensionPrincipal || DIMENSIONES_ONU[0];

    let targetProbId = problemaActivoId;
    const nuevosProblemasLista = [...(arbolProblemas.problemas || [])];
    let nuevoProblemaCentral = arbolProblemas.problemaCentral;

    if (rapidoProblema.trim()) {
      if (!nuevoProblemaCentral) {
        nuevoProblemaCentral = rapidoProblema.trim();
        targetProbId = "problema_central";
      } else {
        targetProbId = uidNodo();
        nuevosProblemasLista.push({
          id: targetProbId,
          texto: rapidoProblema.trim(),
          dimensionOnu: dim,
          objetivoSolucion: textoSol,
          actorResponsable: entidad,
          criticidad: "alta",
        });
      }
    }

    const nuevaCausa: NodoArbol = {
      id: uidNodo(),
      texto: textoCau,
      hijos: [],
      metadatos: {
        problemaId: targetProbId,
        problemaTexto: textoProb,
        solucionPropuestaTexto: textoSol,
        efectoAsociadoTexto: textoEfe,
        dimensionOnu: dim,
        actorResponsable: entidad,
        criticidad: "alta",
      },
    };

    const nuevoEfecto: NodoArbol = {
      id: uidNodo(),
      texto: textoEfe,
      hijos: [],
      metadatos: {
        problemaId: targetProbId,
        problemaTexto: textoProb,
        solucionPropuestaTexto: textoSol,
        dimensionOnu: dim,
        actorResponsable: entidad,
        criticidad: "alta",
      },
    };

    const nuevoMedio: NodoArbol = {
      id: uidNodo(),
      texto: textoSol,
      hijos: [],
      metadatos: {
        problemaId: targetProbId,
        problemaTexto: textoProb,
        causaAsociadaTexto: textoCau,
        dimensionOnu: dim,
        actorResponsable: entidad,
        criticidad: "alta",
      },
    };

    onActualizarProblemas({
      ...arbolProblemas,
      problemaCentral: nuevoProblemaCentral,
      problemas: nuevosProblemasLista,
      causas: [...(arbolProblemas.causas || []), nuevaCausa],
      efectos: [...(arbolProblemas.efectos || []), nuevoEfecto],
    });

    onActualizarSoluciones({
      ...arbolSoluciones,
      objetivoCentral: arbolSoluciones.objetivoCentral || textoSol,
      medios: [...(arbolSoluciones.medios || []), nuevoMedio],
    });

    setRapidoProblema("");
    setRapidoCausa("");
    setRapidoEfecto("");
    setRapidoSolucion("");
    setRapidoEntidad("");
    toast.success("Problema, causa, efecto y solución registrados en la matriz");
  };

  const copiarExcelTSV = async () => {
    const encabezados = [
      "Tipo de Nodo",
      "Nivel",
      "Problema Abordado",
      "Descripción / Contenido",
      "Solución Propuesta",
      "Dimensión ONU",
      "Entidad Responsable",
      "Submesa / Colectivo",
      "Criticidad",
    ];
    const lineas = [
      encabezados.join("\t"),
      ...filasFiltradas.map((f) =>
        [
          f.tipoNodo,
          f.nivel,
          `"${(f.problemaAsociado || "").replace(/"/g, '""')}"`,
          `"${f.texto.replace(/"/g, '""')}"`,
          `"${(f.solucionPropuesta || "").replace(/"/g, '""')}"`,
          `"${f.dimensionOnu}"`,
          `"${f.actorResponsable}"`,
          `"${f.subMesaOrigen}"`,
          f.criticidad,
        ].join("\t"),
      ),
    ];
    try {
      await navigator.clipboard.writeText(lineas.join("\n"));
      toast.success("Tabla copiada al portapapeles", {
        description: "Formato TSV compatible con Microsoft Excel y Google Sheets.",
      });
    } catch {
      toast.error("No se pudo acceder al portapapeles del navegador.");
    }
  };

  const descargarCSV = () => {
    const encabezados = [
      "Tipo de Nodo",
      "Nivel",
      "Problema Abordado",
      "Descripción / Contenido",
      "Solución Propuesta",
      "Dimensión ONU",
      "Entidad Responsable",
      "Submesa / Colectivo",
      "Criticidad",
    ];
    const lineas = [
      encabezados.join(";"),
      ...filasFiltradas.map((f) =>
        [
          `"${f.tipoNodo}"`,
          `"${f.nivel}"`,
          `"${(f.problemaAsociado || "").replace(/"/g, '""')}"`,
          `"${f.texto.replace(/"/g, '""')}"`,
          `"${(f.solucionPropuesta || "").replace(/"/g, '""')}"`,
          `"${f.dimensionOnu}"`,
          `"${f.actorResponsable}"`,
          `"${f.subMesaOrigen}"`,
          `"${f.criticidad}"`,
        ].join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `matriz_revogrid_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Archivo CSV descargado exitosamente");
  };

  return (
    <div className="space-y-4 w-full">
      {/* Barra de Contadores / Métricas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Total Registros
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.total}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-medium text-[var(--warning)] flex items-center gap-1">
            <AlertTriangle className="size-3" />
            Problemas
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.problemasCount}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-medium text-[var(--ember)] flex items-center gap-1">
            <ShieldAlert className="size-3" />
            Causas
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.causas}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-medium text-[var(--info)] flex items-center gap-1">
            <Target className="size-3" />
            Efectos
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.efectos}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-medium text-[var(--success)] flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Medios
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.medios}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[11px] font-medium text-[var(--brand-polis-cyan)] flex items-center gap-1">
            <Compass className="size-3" />
            Fines
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.fines}
          </span>
        </div>
      </div>

      {/* Selector de Problema Activo de la Mesa y Acciones Multiproblema */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Layers className="size-3.5 text-[var(--ember)]" />
              Problema activo para agregar causas, efectos y soluciones:
            </span>
            <div className="w-[300px] max-w-full shrink-0">
              <Select value={problemaActivoId} onValueChange={setProblemaActivoId}>
                <SelectTrigger className="h-8 w-full max-w-full overflow-hidden text-xs bg-[var(--surface-1)]">
                  <SelectValue placeholder="Seleccionar problema de la mesa" />
                </SelectTrigger>
                <SelectContent>
                  {catalogoProblemasMesa.map((prob, i) => (
                    <SelectItem key={prob.id} value={prob.id}>
                      {`P${i + 1}: ${prob.texto.slice(0, 65)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => agregarNuevoNodo("problema")}
              className="h-8 gap-1 text-xs border-[var(--warning)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar un nuevo problema abordado en esta mesa"
            >
              <Plus className="size-3 text-[var(--warning)]" />
              Problema
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setMostrarConstructorRapido((v) => !v)}
              className="h-8 gap-1 text-xs border-[var(--ember)]/40 hover:bg-[var(--surface-1)]"
              title="Abrir constructor rápido de Problema + Causa + Efecto + Solución"
            >
              <GitBranch className="size-3 text-[var(--ember)]" />
              {mostrarConstructorRapido ? "Ocultar Constructor Rápido" : "+ Cadena Completa (Problema · Causa · Efecto · Solución)"}
            </Button>
          </div>
        </div>
      )}

      {/* Constructor Rápido Multiproblema en la Vista Matriz */}
      {!readOnly && mostrarConstructorRapido && (
        <div
          data-testid="constructor-rapido-matriz-relatoria"
          className="space-y-3 rounded-xl border border-[var(--ember)]/30 bg-[var(--surface-1)] p-3.5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Registro Rápido Articulado (Problema &rarr; Causa &rarr; Efecto &rarr; Solución Propuesta)
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Se inserta directamente en la cuadrícula RevoGrid
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              value={rapidoProblema}
              onChange={(e) => setRapidoProblema(e.target.value)}
              placeholder="1. Problema (o vacío para usar el activo)"
              className="h-8 text-xs"
            />
            <Input
              value={rapidoCausa}
              onChange={(e) => setRapidoCausa(e.target.value)}
              placeholder="2. Causa directa identificada..."
              className="h-8 text-xs"
            />
            <Input
              value={rapidoEfecto}
              onChange={(e) => setRapidoEfecto(e.target.value)}
              placeholder="3. Efecto o consecuencia..."
              className="h-8 text-xs"
            />
            <Input
              value={rapidoSolucion}
              onChange={(e) => setRapidoSolucion(e.target.value)}
              placeholder="4. Solución propuesta / acción..."
              className="h-8 text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Input
                value={rapidoEntidad}
                onChange={(e) => setRapidoEntidad(e.target.value)}
                placeholder="5. Entidad responsable..."
                className="h-8 text-xs flex-1"
              />
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={registrarCadenaCompletaRapida}
                className="h-8 px-3 text-xs shrink-0"
              >
                Insertar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros y Operaciones */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Búsqueda textual */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
            <Input
              type="text"
              placeholder="Buscar en celdas de la cuadrícula…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 pl-8 text-xs bg-[var(--surface-2)]"
            />
          </div>

          {/* Filtro por Problema Abordado */}
          {catalogoProblemasMesa.length > 1 && (
            <div className="w-[160px]">
              <Select value={filtroProblemaId} onValueChange={setFiltroProblemaId}>
                <SelectTrigger className="h-8 text-xs bg-[var(--surface-2)]">
                  <SelectValue placeholder="Filtrar problema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los problemas</SelectItem>
                  {catalogoProblemasMesa.map((prob, i) => (
                    <SelectItem key={prob.id} value={prob.id}>
                      {`Problema #${i + 1}: ${prob.texto.slice(0, 35)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro por tipo de nodo */}
          <div className="w-[140px]">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-8 text-xs bg-[var(--surface-2)]">
                <SelectValue placeholder="Tipo de nodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los tipos</SelectItem>
                <SelectItem value="PROBLEMAS">Problemas</SelectItem>
                <SelectItem value="SOLUCIONES">Soluciones</SelectItem>
                <SelectItem value="CAUSAS">Solo Causas</SelectItem>
                <SelectItem value="EFECTOS">Solo Efectos</SelectItem>
                <SelectItem value="MEDIOS">Solo Medios</SelectItem>
                <SelectItem value="FINES">Solo Fines</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por dimensión ONU */}
          <div className="w-[160px]">
            <Select value={filtroDimension} onValueChange={setFiltroDimension}>
              <SelectTrigger className="h-8 text-xs bg-[var(--surface-2)]">
                <SelectValue placeholder="Dimensión ONU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las dimensiones</SelectItem>
                {DIMENSIONES_ONU.map((dim) => (
                  <SelectItem key={dim} value={dim}>
                    {dim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Acciones de Edición y Exportación */}
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("causa")}
                className="h-8 gap-1 text-xs border-[var(--ember)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nueva causa directa"
              >
                <Plus className="size-3 text-[var(--ember)]" />
                Causa
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("subcausa")}
                className="h-8 gap-1 text-xs border-[var(--ember)]/30 hover:bg-[var(--surface-2)]"
                title="Agregar nueva subcausa o causa raíz"
              >
                <Plus className="size-3 text-[var(--ember)]" />
                Subcausa
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("efecto")}
                className="h-8 gap-1 text-xs border-[var(--info)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nuevo efecto directo"
              >
                <Plus className="size-3 text-[var(--info)]" />
                Efecto
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("medio")}
                className="h-8 gap-1 text-xs border-[var(--success)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nuevo medio de intervención"
              >
                <Plus className="size-3 text-[var(--success)]" />
                Medio
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("fin")}
                className="h-8 gap-1 text-xs border-[var(--brand-polis-cyan)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nuevo fin de impacto"
              >
                <Plus className="size-3 text-[var(--brand-polis-cyan)]" />
                Fin
              </Button>
            </>
          )}

          <div className="h-4 w-px bg-[var(--border)]" />

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={copiarExcelTSV}
            className="h-8 gap-1 text-xs"
            title="Copiar matriz en formato TSV para pegar directamente en Excel o Google Sheets"
          >
            <Copy className="size-3" />
            Copiar TSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={descargarCSV}
            className="h-8 gap-1 text-xs"
            title="Descargar matriz en archivo CSV para análisis estadístico"
          >
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>

      {/* Contenedor Matriz RevoGrid */}
      <div
        ref={gridContainerRef}
        data-testid="revogrid-container"
        className="polis-revogrid-container w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xs"
        style={
          {
            "--rg-theme-background": "var(--surface-1)",
            "--rg-theme-text": "var(--text-primary)",
            "--rg-theme-header-bg": "var(--surface-2)",
            "--rg-theme-header-color": "var(--text-secondary)",
            "--rg-theme-header-border": "var(--border)",
            "--rg-theme-cell-border": "var(--border)",
            "--rg-theme-focused-bg": "var(--surface-2)",
            "--rg-theme-row-headers-bg": "var(--surface-2)",
            "--rg-theme-row-headers-color": "var(--text-tertiary)",
            "--rg-theme-font-family": "inherit",
            "--rg-theme-font-size": "12px",
            "--rg-theme-header-height": "34px",
            height: "540px",
          } as CSSProperties
        }
      >
        <RevoGrid
          columns={columnas}
          source={filasFiltradas}
          rowSize={64}
          rowDefinitions={rowDefinitions}
          resizeRow={true}
          readonly={readOnly}
          filter={true}
          range={!readOnly}
          resize={true}
          canFocus={true}
          useClipboard={true}
          rowHeaders={true}
          autoSizeColumn={true}
          theme="default"
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      {/* Nota metodológica accesible */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] px-1">
        <span className="flex items-center gap-1.5">
          <Info className="size-3.5 shrink-0" />
          Navegación tipo hoja de cálculo: usa flechas del teclado, doble clic para editar problemas, causas, efectos y soluciones, y Ctrl+V para pegar rangos.
        </span>
        <span>
          Mostrando {filasFiltradas.length} de {filas.length} aportes sistematizados
        </span>
      </div>
    </div>
  );
}
