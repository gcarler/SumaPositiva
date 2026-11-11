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
  Save,
  Pencil,
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
  onGuardarMatriz?: () => void;
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
    actorResponsable: arbolProblemas.actorResponsableCentral || "",
    subMesaOrigen: arbolProblemas.subMesaOrigenCentral || "",
    criticidad: arbolProblemas.criticidadCentral || "alta",
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
    dimensionOnu:
      arbolSoluciones.dimensionObjetivo ||
      arbolProblemas.dimensionPrincipal ||
      "",
    actorResponsable:
      arbolSoluciones.actorResponsableObjetivo ||
      arbolProblemas.actorResponsableCentral ||
      "",
    subMesaOrigen:
      arbolSoluciones.subMesaOrigenObjetivo ||
      arbolProblemas.subMesaOrigenCentral ||
      "",
    criticidad: arbolSoluciones.criticidadObjetivo || "alta",
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
      solucionPropuesta: m.metadatos?.solucionPropuestaTexto || m.texto || "",
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
        solucionPropuesta: h.metadatos?.solucionPropuestaTexto || h.texto || "",
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
      } else if (prop === "actorResponsable") {
        nuevoProblemas.actorResponsableCentral = strVal;
        problemasModificado = true;
      } else if (prop === "subMesaOrigen") {
        nuevoProblemas.subMesaOrigenCentral = strVal;
        problemasModificado = true;
      } else if (prop === "criticidad") {
        nuevoProblemas.criticidadCentral =
          (strVal.toLowerCase() as "alta" | "media" | "baja") || "alta";
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
      } else if (prop === "problemaAsociado") {
        nuevoProblemas.problemaCentral = strVal;
        problemasModificado = true;
      } else if (prop === "dimensionOnu") {
        nuevoSoluciones.dimensionObjetivo = strVal;
        solucionesModificado = true;
      } else if (prop === "actorResponsable") {
        nuevoSoluciones.actorResponsableObjetivo = strVal;
        solucionesModificado = true;
      } else if (prop === "subMesaOrigen") {
        nuevoSoluciones.subMesaOrigenObjetivo = strVal;
        solucionesModificado = true;
      } else if (prop === "criticidad") {
        nuevoSoluciones.criticidadObjetivo =
          (strVal.toLowerCase() as "alta" | "media" | "baja") || "alta";
        solucionesModificado = true;
      }
      continue;
    }

    const aplicarAMetadatos = (nodo: NodoArbol | undefined) => {
      if (!nodo) return;
      if (prop === "texto") {
        nodo.texto = strVal;
        if (tipoCategoria.startsWith("medio")) {
          nodo.metadatos = nodo.metadatos || {};
          nodo.metadatos.solucionPropuestaTexto = strVal;
        }
      } else {
        nodo.metadatos = nodo.metadatos || {};
        if (prop === "problemaAsociado") nodo.metadatos.problemaTexto = strVal;
        if (prop === "solucionPropuesta") {
          nodo.metadatos.solucionPropuestaTexto = strVal;
          if (tipoCategoria.startsWith("medio")) {
            nodo.texto = strVal;
          }
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
  onGuardarMatriz,
  readOnly = false,
  submesasDisponibles = [],
}: MatrizRevogridRelatoriaProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const inputDescripcionRef = useRef<HTMLInputElement>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroDimension, setFiltroDimension] = useState<string>("TODAS");
  const [filtroProblemaId, setFiltroProblemaId] = useState<string>("TODOS");
  const [problemaActivoId, setProblemaActivoId] = useState<string>("problema_central");
  const [busqueda, setBusqueda] = useState<string>("");

  // Fila activa para el Editor Directo de Celda / Fila en la Matriz
  const [filaSeleccionadaId, setFilaSeleccionadaId] = useState<string>("problema_central");
  const [edicionLocalFila, setEdicionLocalFila] = useState<{
    filaId: string;
    texto?: string;
    solucionPropuesta?: string;
    actorResponsable?: string;
  } | null>(null);

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

  const filaSeleccionadaObj = useMemo(
    () =>
      filasFiltradas.find((f) => f.id === filaSeleccionadaId) ||
      filas.find((f) => f.id === filaSeleccionadaId) ||
      filasFiltradas[0] ||
      filas[0] ||
      null,
    [filasFiltradas, filas, filaSeleccionadaId],
  );

  const valorEditorTexto =
    filaSeleccionadaObj &&
    edicionLocalFila?.filaId === filaSeleccionadaObj.id &&
    edicionLocalFila.texto !== undefined
      ? edicionLocalFila.texto
      : filaSeleccionadaObj?.texto || "";

  const valorEditorSolucion =
    filaSeleccionadaObj &&
    edicionLocalFila?.filaId === filaSeleccionadaObj.id &&
    edicionLocalFila.solucionPropuesta !== undefined
      ? edicionLocalFila.solucionPropuesta
      : filaSeleccionadaObj?.solucionPropuesta || "";

  const valorEditorEntidad =
    filaSeleccionadaObj &&
    edicionLocalFila?.filaId === filaSeleccionadaObj.id &&
    edicionLocalFila.actorResponsable !== undefined
      ? edicionLocalFila.actorResponsable
      : filaSeleccionadaObj?.actorResponsable || "";

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

  const crearCellMultilineProps =
    (fontSize: string, fontWeight = "400") =>
    ({
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
          "line-height": "1.45",
          "font-size": fontSize,
          "font-weight": fontWeight,
          display: "flex",
          "align-items": "center",
          padding: "8px 10px",
          "overflow-y": "auto",
        },
      };
    };

  const columnas = useMemo(
    () => [
      {
        prop: "tipoNodo",
        name: "Categoría",
        size: 165,
        readonly: true,
        sortable: true,
        cellProperties: crearCellMultilineProps("12px", "600"),
      },
      {
        prop: "nivel",
        name: "Nivel / Jerarquía",
        size: 165,
        readonly: true,
        sortable: true,
        cellProperties: crearCellMultilineProps("13px", "500"),
      },
      {
        prop: "texto",
        name: "Descripción (Problema / Causa / Efecto / Solución)",
        size: 380,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("14px", "500"),
      },
      {
        prop: "solucionPropuesta",
        name: "Solución Propuesta / Acción Vinculada",
        size: 340,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("14px", "400"),
      },
      {
        prop: "actorResponsable",
        name: "Entidad Responsable",
        size: 210,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("13px", "400"),
      },
      {
        prop: "dimensionOnu",
        name: "Dimensión ONU",
        size: 230,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("12px", "500"),
      },
      {
        prop: "problemaAsociado",
        name: "Problema Abordado en la Mesa",
        size: 250,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("13px", "400"),
      },
      {
        prop: "subMesaOrigen",
        name: "Submesa / Colectivo",
        size: 140,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("13px", "400"),
      },
      {
        prop: "criticidad",
        name: "Criticidad",
        size: 110,
        readonly: readOnly,
        sortable: true,
        cellProperties: crearCellMultilineProps("12px", "600"),
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
        const lineasEstimadas = Math.max(2, Math.ceil(maxLen / 40));
        const size = Math.min(180, Math.max(76, lineasEstimadas * 22 + 22));
        return {
          type: "rgRow" as const,
          index,
          size,
        };
      }),
    [filasFiltradas],
  );

  const estadoActualRef = useRef({
    arbolProblemas,
    arbolSoluciones,
    filasFiltradas,
    columnas,
    readOnly,
    onActualizarProblemas,
    onActualizarSoluciones,
    onGuardarMatriz,
  });

  useEffect(() => {
    estadoActualRef.current = {
      arbolProblemas,
      arbolSoluciones,
      filasFiltradas,
      columnas,
      readOnly,
      onActualizarProblemas,
      onActualizarSoluciones,
      onGuardarMatriz,
    };
  }, [
    arbolProblemas,
    arbolSoluciones,
    filasFiltradas,
    columnas,
    readOnly,
    onActualizarProblemas,
    onActualizarSoluciones,
    onGuardarMatriz,
  ]);

  const celdaActivaRef = useRef<{
    row: FilaRevoGrid;
    prop: string;
  } | null>(null);

  const borradorEdicionRef = useRef<{
    row: FilaRevoGrid;
    prop: string;
    valor: string;
    editado: boolean;
  } | null>(null);

  const ultimoCommitRef = useRef<{
    firma: string;
    ts: number;
  } | null>(null);

  const confirmarBorradorPendienteRef = useRef<() => void>(() => {});

  const aplicarEdiciones = (
    updates: Array<{ row: FilaRevoGrid; prop: string; val: unknown }>,
    opciones?: { silencioso?: boolean },
  ) => {
    const {
      arbolProblemas: apActual,
      arbolSoluciones: asActual,
      readOnly: soloLecturaActual,
      onActualizarProblemas: onProb,
      onActualizarSoluciones: onSol,
    } = estadoActualRef.current;

    if (soloLecturaActual || updates.length === 0) return false;

    // Filtrar ediciones redundantes o duplicadas (p. ej. auto-commit en blur + afteredit inmediato)
    const ahora = Date.now();
    const updatesEfectivos = updates.filter(({ row, prop, val }) => {
      if (!row || !prop) return false;
      const strVal = typeof val === "string" ? val : String(val ?? "");
      const firma = `${row.id}::${prop}::${strVal}`;
      if (
        !opciones?.silencioso &&
        ultimoCommitRef.current &&
        ultimoCommitRef.current.firma === firma &&
        ahora - ultimoCommitRef.current.ts < 500
      ) {
        return false;
      }
      const valorPrevio = String(
        (row as unknown as Record<string, unknown>)[prop] ?? "",
      );
      if (strVal === valorPrevio) {
        return false;
      }
      if (!opciones?.silencioso) {
        ultimoCommitRef.current = { firma, ts: ahora };
      }
      return true;
    });

    if (updatesEfectivos.length === 0) return false;

    const {
      nuevoProblemas,
      nuevoSoluciones,
      problemasModificado,
      solucionesModificado,
    } = sincronizarEdicionesArboles({
      arbolProblemas: apActual,
      arbolSoluciones: asActual,
      updates: updatesEfectivos,
    });

    if (problemasModificado) {
      onProb(nuevoProblemas);
    }
    if (solucionesModificado) {
      onSol(nuevoSoluciones);
    }
    if (!opciones?.silencioso && (problemasModificado || solucionesModificado)) {
      toast.success("Matriz actualizada", {
        description: `${updatesEfectivos.length} campo(s) sincronizados con los árboles de problemas y soluciones.`,
      });
    }
    return problemasModificado || solucionesModificado;
  };

  const guardarEdicionDirectaEnMatriz = () => {
    if (readOnly) return;
    // 1. Si hay una celda abierta en RevoGrid, confirmar primero su borrador
    confirmarBorradorPendienteRef.current();

    // 2. Aplicar cualquier cambio pendiente del Editor Directo de Fila Seleccionada
    if (filaSeleccionadaObj) {
      const updates: Array<{ row: FilaRevoGrid; prop: string; val: unknown }> = [];
      if (valorEditorTexto !== (filaSeleccionadaObj.texto || "")) {
        updates.push({
          row: filaSeleccionadaObj,
          prop: "texto",
          val: valorEditorTexto,
        });
      }
      if (valorEditorSolucion !== (filaSeleccionadaObj.solucionPropuesta || "")) {
        updates.push({
          row: filaSeleccionadaObj,
          prop: "solucionPropuesta",
          val: valorEditorSolucion,
        });
      }
      if (valorEditorEntidad !== (filaSeleccionadaObj.actorResponsable || "")) {
        updates.push({
          row: filaSeleccionadaObj,
          prop: "actorResponsable",
          val: valorEditorEntidad,
        });
      }
      if (updates.length > 0) {
        aplicarEdiciones(updates, { silencioso: true });
      }
      setEdicionLocalFila(null);
    }

    // 3. Disparar guardado explícito en servidor si el contenedor lo provee
    if (estadoActualRef.current.onGuardarMatriz) {
      estadoActualRef.current.onGuardarMatriz();
    } else {
      toast.success("Cambios guardados en la matriz", {
        description: "El contenido fue incorporado y sincronizado en la matriz técnica.",
      });
    }
  };

  const handleAfterEdit = (e: CustomEvent<Record<string, unknown>>) => {
    if (estadoActualRef.current.readOnly) return;
    const detail = e.detail;
    if (!detail) return;

    borradorEdicionRef.current = null;
    const updates: Array<{ row: FilaRevoGrid; prop: string; val: unknown }> = [];

    if ("prop" in detail && "model" in detail && detail.model) {
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
      const filasActuales = estadoActualRef.current.filasFiltradas;
      Object.entries(dataObj).forEach(([rowIndexStr, updatedRow]) => {
        const idx = Number(rowIndexStr);
        const oldModel = modelsObj[idx] || filasActuales[idx];
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

    const resolverCeldaDesdeElemento = (el: Element | null) => {
      const cellEl = el?.closest(".rgCell[data-rgcol]") as HTMLElement | null;
      if (!cellEl) return null;
      const colAttr = cellEl.getAttribute("data-rgcol");
      const rowAttr =
        cellEl.getAttribute("data-rgrow") ??
        cellEl.closest("[data-rgrow]")?.getAttribute("data-rgrow") ??
        null;
      if (colAttr === null || rowAttr === null) return null;
      const colIdx = Number(colAttr);
      const rowIdx = Number(rowAttr);
      const prop = estadoActualRef.current.columnas[colIdx]?.prop;
      const fila = estadoActualRef.current.filasFiltradas[rowIdx];
      if (fila && prop) {
        return { row: fila, prop };
      }
      return null;
    };

    const obtenerCeldaActiva = () => {
      if (celdaActivaRef.current) {
        const actualizada = estadoActualRef.current.filasFiltradas.find(
          (f) => f.id === celdaActivaRef.current?.row.id,
        );
        if (actualizada) {
          celdaActivaRef.current = {
            row: actualizada,
            prop: celdaActivaRef.current.prop,
          };
        }
        return celdaActivaRef.current;
      }
      const focusedCell = container.querySelector(".rgCell.focused-cell");
      const desdeFoco = resolverCeldaDesdeElemento(focusedCell);
      if (desdeFoco) {
        celdaActivaRef.current = desdeFoco;
        return desdeFoco;
      }
      return null;
    };

    const capturarCeldaDesdeEvento = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, unknown>>).detail;
      if (!detail) return;
      const model = detail.model as FilaRevoGrid | undefined;
      const colIdx =
        typeof detail.colIndex === "number"
          ? detail.colIndex
          : typeof detail.x === "number"
            ? detail.x
            : undefined;
      const rowIdx =
        typeof detail.rowIndex === "number"
          ? detail.rowIndex
          : typeof detail.y === "number"
            ? detail.y
            : undefined;
      const prop =
        detail.prop !== undefined
          ? String(detail.prop)
          : colIdx !== undefined
            ? estadoActualRef.current.columnas[colIdx]?.prop
            : undefined;
      if (model && prop) {
        celdaActivaRef.current = { row: model, prop };
        setFilaSeleccionadaId(model.id);
      } else if (rowIdx !== undefined && prop) {
        const fila = estadoActualRef.current.filasFiltradas[rowIdx];
        if (fila) {
          celdaActivaRef.current = { row: fila, prop };
          setFilaSeleccionadaId(fila.id);
        }
      }
      if (e.type === "beforeedit") {
        borradorEdicionRef.current = null;
      }
    };

    const confirmarBorradorPendiente = () => {
      if (estadoActualRef.current.readOnly) return;
      const borrador = borradorEdicionRef.current;
      if (!borrador || !borrador.editado) return;

      const editEl = container.querySelector("revogr-edit");
      const inputEl = editEl?.querySelector("input, textarea") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;

      const filaFresca =
        estadoActualRef.current.filasFiltradas.find(
          (f) => f.id === borrador.row.id,
        ) || borrador.row;

      const valorFinal =
        inputEl !== null && inputEl !== undefined
          ? inputEl.value
          : borrador.valor;

      borradorEdicionRef.current = null;
      aplicarEdiciones([
        {
          row: filaFresca,
          prop: borrador.prop,
          val: valorFinal,
        },
      ]);
    };

    confirmarBorradorPendienteRef.current = confirmarBorradorPendiente;

    const onInputEditor = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest("revogr-edit")) return;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        const celda = borradorEdicionRef.current || obtenerCeldaActiva();
        if (celda) {
          borradorEdicionRef.current = {
            row: celda.row,
            prop: celda.prop,
            valor: target.value,
            editado: true,
          };
        }
      }
    };

    const onKeyDownEditor = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest("revogr-edit")) return;
      if (e.key === "Escape") {
        // Evitar que Escape cierre el PanelShell de la mesa cuando solo se cancela una celda
        borradorEdicionRef.current = null;
        e.stopPropagation();
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) {
          const celda = borradorEdicionRef.current || obtenerCeldaActiva();
          if (celda) {
            borradorEdicionRef.current = {
              row: celda.row,
              prop: celda.prop,
              valor: target.value,
              editado: true,
            };
          }
        }
      }
    };

    const onFocusOutEditor = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest("revogr-edit")) return;
      const related = e.relatedTarget as Node | null;
      const editEl = container.querySelector("revogr-edit");
      if (editEl && related && editEl.contains(related)) return;
      confirmarBorradorPendiente();
    };

    const onDocumentPointerDownCapture = (e: Event) => {
      const target = e.target as Element | null;
      const editEl = container.querySelector("revogr-edit");
      if (editEl) {
        if (target && editEl.contains(target)) return;
        confirmarBorradorPendiente();
      }
      if (target && container.contains(target)) {
        const nuevaCelda = resolverCeldaDesdeElemento(target);
        if (nuevaCelda) {
          celdaActivaRef.current = nuevaCelda;
          setFilaSeleccionadaId(nuevaCelda.row.id);
        }
      }
    };

    const listenerAfterEdit = (e: Event) => {
      handleAfterEdit(e as CustomEvent<Record<string, unknown>>);
    };

    gridEl.addEventListener("beforecellfocus", capturarCeldaDesdeEvento);
    gridEl.addEventListener("afterfocus", capturarCeldaDesdeEvento);
    gridEl.addEventListener("beforeedit", capturarCeldaDesdeEvento);
    gridEl.addEventListener("afteredit", listenerAfterEdit);
    container.addEventListener("input", onInputEditor, true);
    container.addEventListener("keydown", onKeyDownEditor, true);
    container.addEventListener("focusout", onFocusOutEditor, true);
    document.addEventListener("pointerdown", onDocumentPointerDownCapture, true);
    document.addEventListener("mousedown", onDocumentPointerDownCapture, true);

    return () => {
      confirmarBorradorPendiente();
      gridEl.removeEventListener("beforecellfocus", capturarCeldaDesdeEvento);
      gridEl.removeEventListener("afterfocus", capturarCeldaDesdeEvento);
      gridEl.removeEventListener("beforeedit", capturarCeldaDesdeEvento);
      gridEl.removeEventListener("afteredit", listenerAfterEdit);
      container.removeEventListener("input", onInputEditor, true);
      container.removeEventListener("keydown", onKeyDownEditor, true);
      container.removeEventListener("focusout", onFocusOutEditor, true);
      document.removeEventListener(
        "pointerdown",
        onDocumentPointerDownCapture,
        true,
      );
      document.removeEventListener(
        "mousedown",
        onDocumentPointerDownCapture,
        true,
      );
    };
  }, []);

  const agregarNuevoNodo = (
    tipo: "problema" | "causa" | "subcausa" | "efecto" | "medio" | "fin",
  ) => {
    if (readOnly) return;
    const id = uidNodo();
    const probTexto = problemaActivoObj?.texto || arbolProblemas.problemaCentral || "Problema Central";
    const probId = problemaActivoObj?.id || "problema_central";

    setFiltroTipo("TODOS");
    setBusqueda("");

    let nuevaFilaId = "problema_central";

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
      nuevaFilaId = `problema_adic_${id}`;
      toast.success("Nuevo problema agregado a la mesa", {
        description: "Edita su descripción en la barra de edición o directamente en la celda.",
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
      nuevaFilaId = `causa_${id}`;
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
      nuevaFilaId = `causa_ind_${id}`;
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
      nuevaFilaId = `efecto_${id}`;
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
      nuevaFilaId = `medio_${id}`;
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
      nuevaFilaId = `fin_${id}`;
      toast.success("Fin de impacto agregado a la cuadrícula");
    }

    setFilaSeleccionadaId(nuevaFilaId);
    setTimeout(() => {
      inputDescripcionRef.current?.focus();
      inputDescripcionRef.current?.select();
    }, 50);
  };

  const registrarCadenaCompletaRapida = () => {
    if (readOnly) return;
    const tieneAlgunValor =
      rapidoProblema.trim() ||
      rapidoCausa.trim() ||
      rapidoEfecto.trim() ||
      rapidoSolucion.trim();
    if (!tieneAlgunValor) {
      toast.info("Escribe al menos un campo (problema, causa, efecto o solución) para insertar.");
      return;
    }

    const textoProb =
      rapidoProblema.trim() ||
      problemaActivoObj?.texto ||
      arbolProblemas.problemaCentral ||
      "Problema central de la mesa";
    const textoCau = rapidoCausa.trim();
    const textoEfe = rapidoEfecto.trim();
    const textoSol = rapidoSolucion.trim();
    const entidad = rapidoEntidad.trim() || "Alcaldía Distrital / Secretaría Competente";
    const dim = arbolProblemas.dimensionPrincipal || DIMENSIONES_ONU[0];

    let targetProbId = problemaActivoId;
    const nuevosProblemasLista = [...(arbolProblemas.problemas || [])];
    let nuevoProblemaCentral = arbolProblemas.problemaCentral;
    let idFilaCreada = "problema_central";

    if (rapidoProblema.trim()) {
      if (!nuevoProblemaCentral) {
        nuevoProblemaCentral = rapidoProblema.trim();
        targetProbId = "problema_central";
        idFilaCreada = "problema_central";
      } else {
        targetProbId = uidNodo();
        nuevosProblemasLista.push({
          id: targetProbId,
          texto: rapidoProblema.trim(),
          dimensionOnu: dim,
          objetivoSolucion: textoSol || "Solución propuesta",
          actorResponsable: entidad,
          criticidad: "alta",
        });
        setProblemaActivoId(targetProbId);
        idFilaCreada = `problema_adic_${targetProbId}`;
      }
    }

    const nuevasCausas = [...(arbolProblemas.causas || [])];
    if (textoCau) {
      const idCau = uidNodo();
      nuevasCausas.push({
        id: idCau,
        texto: textoCau,
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: textoProb,
          solucionPropuestaTexto: textoSol || undefined,
          efectoAsociadoTexto: textoEfe || undefined,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      });
      idFilaCreada = `causa_${idCau}`;
    }

    const nuevosEfectos = [...(arbolProblemas.efectos || [])];
    if (textoEfe) {
      const idEfe = uidNodo();
      nuevosEfectos.push({
        id: idEfe,
        texto: textoEfe,
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: textoProb,
          solucionPropuestaTexto: textoSol || undefined,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      });
      idFilaCreada = `efecto_${idEfe}`;
    }

    onActualizarProblemas({
      ...arbolProblemas,
      problemaCentral: nuevoProblemaCentral,
      problemas: nuevosProblemasLista,
      causas: nuevasCausas,
      efectos: nuevosEfectos,
    });

    if (textoSol) {
      const idMed = uidNodo();
      const nuevoMedio: NodoArbol = {
        id: idMed,
        texto: textoSol,
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: textoProb,
          causaAsociadaTexto: textoCau || undefined,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      };
      onActualizarSoluciones({
        ...arbolSoluciones,
        objetivoCentral: arbolSoluciones.objetivoCentral || textoSol,
        medios: [...(arbolSoluciones.medios || []), nuevoMedio],
      });
      idFilaCreada = `medio_${idMed}`;
    }

    setFilaSeleccionadaId(idFilaCreada);
    setRapidoProblema("");
    setRapidoCausa("");
    setRapidoEfecto("");
    setRapidoSolucion("");
    setRapidoEntidad("");
    toast.success("Registro incorporado y guardado en la matriz");
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
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            Total Registros
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.total}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-xs font-medium text-[var(--warning)] flex items-center gap-1">
            <AlertTriangle className="size-3.5" />
            Problemas
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.problemasCount}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-xs font-medium text-[var(--ember)] flex items-center gap-1">
            <ShieldAlert className="size-3.5" />
            Causas
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.causas}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-xs font-medium text-[var(--info)] flex items-center gap-1">
            <Target className="size-3.5" />
            Efectos
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.efectos}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-xs font-medium text-[var(--success)] flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            Medios
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.medios}
          </span>
        </div>
        <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-xs font-medium text-[var(--brand-polis-cyan)] flex items-center gap-1">
            <Compass className="size-3.5" />
            Fines
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {metricas.fines}
          </span>
        </div>
      </div>

      {/* Selector de Problema Activo de la Mesa y Acciones Multiproblema */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <Layers className="size-4 text-[var(--ember)]" />
              Problema activo para agregar causas, efectos y soluciones:
            </span>
            <div className="w-[320px] max-w-full shrink-0">
              <Select value={problemaActivoId} onValueChange={setProblemaActivoId}>
                <SelectTrigger className="h-9 w-full max-w-full overflow-hidden text-sm bg-[var(--surface-1)]">
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
              className="h-9 gap-1 text-sm border-[var(--warning)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar un nuevo problema abordado en esta mesa"
            >
              <Plus className="size-3.5 text-[var(--warning)]" />
              Problema
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setMostrarConstructorRapido((v) => !v)}
              className="h-9 gap-1 text-sm border-[var(--ember)]/40 hover:bg-[var(--surface-1)]"
              title="Abrir constructor rápido de Problema + Causa + Efecto + Solución"
            >
              <GitBranch className="size-3.5 text-[var(--ember)]" />
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
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Registro Rápido Articulado (Problema &rarr; Causa &rarr; Efecto &rarr; Solución Propuesta)
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              Se inserta directamente en la cuadrícula RevoGrid
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              value={rapidoProblema}
              onChange={(e) => setRapidoProblema(e.target.value)}
              placeholder="1. Problema (o vacío para usar el activo)"
              className="h-9 text-sm"
            />
            <Input
              value={rapidoCausa}
              onChange={(e) => setRapidoCausa(e.target.value)}
              placeholder="2. Causa directa identificada..."
              className="h-9 text-sm"
            />
            <Input
              value={rapidoEfecto}
              onChange={(e) => setRapidoEfecto(e.target.value)}
              placeholder="3. Efecto o consecuencia..."
              className="h-9 text-sm"
            />
            <Input
              value={rapidoSolucion}
              onChange={(e) => setRapidoSolucion(e.target.value)}
              placeholder="4. Solución propuesta / acción..."
              className="h-9 text-sm"
            />
            <div className="flex items-center gap-1.5">
              <Input
                value={rapidoEntidad}
                onChange={(e) => setRapidoEntidad(e.target.value)}
                placeholder="5. Entidad responsable..."
                className="h-9 text-sm flex-1"
              />
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={registrarCadenaCompletaRapida}
                className="h-9 px-3 text-sm shrink-0"
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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" />
            <Input
              type="text"
              placeholder="Buscar en celdas de la cuadrícula…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 pl-8 text-sm bg-[var(--surface-2)]"
            />
          </div>

          {/* Filtro por Problema Abordado */}
          {catalogoProblemasMesa.length > 1 && (
            <div className="w-[175px]">
              <Select value={filtroProblemaId} onValueChange={setFiltroProblemaId}>
                <SelectTrigger className="h-9 w-full max-w-full overflow-hidden text-sm bg-[var(--surface-2)]">
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
          <div className="w-[155px]">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-9 w-full max-w-full overflow-hidden text-sm bg-[var(--surface-2)]">
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
          <div className="w-[195px]">
            <Select value={filtroDimension} onValueChange={setFiltroDimension}>
              <SelectTrigger className="h-9 w-full max-w-full overflow-hidden text-sm bg-[var(--surface-2)]">
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
                className="h-9 gap-1 text-sm border-[var(--ember)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nueva causa directa"
              >
                <Plus className="size-3.5 text-[var(--ember)]" />
                Causa
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("subcausa")}
                className="h-9 gap-1 text-sm border-[var(--ember)]/30 hover:bg-[var(--surface-2)]"
                title="Agregar nueva subcausa o causa raíz"
              >
                <Plus className="size-3.5 text-[var(--ember)]" />
                Subcausa
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("efecto")}
                className="h-9 gap-1 text-sm border-[var(--info)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nuevo efecto directo"
              >
                <Plus className="size-3.5 text-[var(--info)]" />
                Efecto
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("medio")}
                className="h-9 gap-1 text-sm border-[var(--success)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nuevo medio de intervención"
              >
                <Plus className="size-3.5 text-[var(--success)]" />
                Medio
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => agregarNuevoNodo("fin")}
                className="h-9 gap-1 text-sm border-[var(--brand-polis-cyan)]/40 hover:bg-[var(--surface-2)]"
                title="Agregar nuevo fin de impacto"
              >
                <Plus className="size-3.5 text-[var(--brand-polis-cyan)]" />
                Fin
              </Button>
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={guardarEdicionDirectaEnMatriz}
                data-testid="btn-guardar-en-matriz-toolbar"
                className="h-9 gap-1.5 text-sm font-semibold"
                title="Guardar en la matriz todos los textos ingresados"
              >
                <Save className="size-4" />
                Guardar en la matriz
              </Button>
            </>
          )}

          <div className="h-4 w-px bg-[var(--border)]" />

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={copiarExcelTSV}
            className="h-9 gap-1 text-sm"
            title="Copiar matriz en formato TSV para pegar directamente en Excel o Google Sheets"
          >
            <Copy className="size-3.5" />
            Copiar TSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={descargarCSV}
            className="h-9 gap-1 text-sm"
            title="Descargar matriz en archivo CSV para análisis estadístico"
          >
            <Download className="size-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Editor Directo de Fila / Celda Seleccionada en la Matriz */}
      {!readOnly && filaSeleccionadaObj && (
        <div
          data-testid="editor-directo-fila-matriz"
          className="space-y-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)]/70 p-3.5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                <Pencil className="size-4 text-[var(--ember)]" />
                Edición directa en la matriz:
              </span>
              <div className="w-[310px] max-w-full">
                <Select
                  value={filaSeleccionadaObj.id}
                  onValueChange={(val) => setFilaSeleccionadaId(val)}
                >
                  <SelectTrigger
                    aria-label="Seleccionar fila de la matriz para editar"
                    className="h-9 w-full max-w-full overflow-hidden text-sm bg-[var(--surface-1)]"
                  >
                    <SelectValue placeholder="Seleccionar fila a editar" />
                  </SelectTrigger>
                  <SelectContent>
                    {filasFiltradas.map((f, idx) => (
                      <SelectItem key={f.id} value={f.id}>
                        {`#${idx + 1} [${f.tipoNodo}] ${(f.texto || "Sin texto").slice(0, 48)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="rounded-md bg-[var(--surface-1)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {`${filaSeleccionadaObj.tipoNodo} · ${filaSeleccionadaObj.nivel}`}
              </span>
            </div>

            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={guardarEdicionDirectaEnMatriz}
              data-testid="btn-guardar-en-matriz-editor"
              className="h-9 gap-1.5 px-3.5 text-sm font-semibold"
            >
              <Save className="size-4" />
              Guardar en la matriz
            </Button>
          </div>

          <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-5 space-y-1">
              <span className="block truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Descripción ({filaSeleccionadaObj.tipoNodo})
              </span>
              <Input
                ref={inputDescripcionRef}
                data-testid="input-descripcion-fila-matriz"
                value={valorEditorTexto}
                onChange={(e) => {
                  const val = e.target.value;
                  setEdicionLocalFila((prev) => ({
                    ...(prev?.filaId === filaSeleccionadaObj.id
                      ? prev
                      : { filaId: filaSeleccionadaObj.id }),
                    texto: val,
                  }));
                  aplicarEdiciones(
                    [{ row: filaSeleccionadaObj, prop: "texto", val }],
                    { silencioso: true },
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    guardarEdicionDirectaEnMatriz();
                  }
                }}
                placeholder="Escribe aquí el texto para la matriz y presiona Enter o Guardar…"
                className="h-9 text-sm bg-[var(--surface-1)]"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <span className="block truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Solución Propuesta / Acción Vinculada
              </span>
              <Input
                data-testid="input-solucion-fila-matriz"
                value={valorEditorSolucion}
                onChange={(e) => {
                  const val = e.target.value;
                  setEdicionLocalFila((prev) => ({
                    ...(prev?.filaId === filaSeleccionadaObj.id
                      ? prev
                      : { filaId: filaSeleccionadaObj.id }),
                    solucionPropuesta: val,
                  }));
                  aplicarEdiciones(
                    [
                      {
                        row: filaSeleccionadaObj,
                        prop: "solucionPropuesta",
                        val,
                      },
                    ],
                    { silencioso: true },
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    guardarEdicionDirectaEnMatriz();
                  }
                }}
                placeholder="Solución o medio de intervención propuesto…"
                className="h-9 text-sm bg-[var(--surface-1)]"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <span className="block truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Entidad Responsable
              </span>
              <Input
                data-testid="input-entidad-fila-matriz"
                value={valorEditorEntidad}
                onChange={(e) => {
                  const val = e.target.value;
                  setEdicionLocalFila((prev) => ({
                    ...(prev?.filaId === filaSeleccionadaObj.id
                      ? prev
                      : { filaId: filaSeleccionadaObj.id }),
                    actorResponsable: val,
                  }));
                  aplicarEdiciones(
                    [
                      {
                        row: filaSeleccionadaObj,
                        prop: "actorResponsable",
                        val,
                      },
                    ],
                    { silencioso: true },
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    guardarEdicionDirectaEnMatriz();
                  }
                }}
                placeholder="Ej.: Alcaldía / Secretaría…"
                className="h-9 text-sm bg-[var(--surface-1)]"
              />
            </div>
          </div>
        </div>
      )}

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
            "--rg-theme-font-size": "14px",
            "--rg-theme-header-height": "40px",
            height: "600px",
          } as CSSProperties
        }
      >
        <RevoGrid
          columns={columnas}
          source={filasFiltradas}
          rowSize={76}
          rowDefinitions={rowDefinitions}
          resizeRow={true}
          readonly={readOnly}
          filter={true}
          range={!readOnly}
          resize={true}
          canFocus={true}
          useClipboard={true}
          rowHeaders={false}
          autoSizeColumn={true}
          theme="default"
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      {/* Nota metodológica accesible */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] px-1">
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
