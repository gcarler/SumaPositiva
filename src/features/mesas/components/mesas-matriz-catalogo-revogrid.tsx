"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  ExternalLink,
  Info,
  Search,
  TableProperties,
  CheckCircle2,
  Lock,
  Pencil,
  X,
  Plus,
  Layers,
  GitBranch,
  AlertTriangle,
  ShieldAlert,
  Target,
  Compass,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type {
  MesaDeTrabajo,
  ArbolProblemas,
  ArbolSoluciones,
  NodoArbol,
  ProblemaAbordadoMesa,
} from "@/features/mesas/models/mesas";
import { uidNodo } from "@/features/mesas/models/mesas";
import { actualizarMesaRemota } from "@/features/mesas/services/mesas-api";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { DIMENSIONES_ONU } from "./matriz-arbol-relatoria";
import { RevoGrid } from "@revolist/react-datagrid";
import { defineCustomElements } from "@revolist/revogrid/loader";

export interface FilaMesaMatriz {
  id: string;
  codigoOficial: string;
  nombre: string;
  estado: string;
  fecha: string;
  horario: string;
  lugarNombre: string;
  territorio: string;
  facilitadorNombre: string;
  totalAsistentes: number;
  dimensionOnu: string;
  problemaCentral: string;
}

export interface FilaMatrizMetodologicaMesa extends FilaMesaMatriz {
  mesaId: string;
  problemaId: string;
  problemaNumero: string;
  causaId: string;
  causaTexto: string;
  efectoId: string;
  efectoTexto: string;
  solucionId: string;
  solucionTexto: string;
  finId: string;
  finTexto: string;
  actorResponsable: string;
  criticidad: string;
}

export interface MesasMatrizCatalogoRevogridProps {
  mesas: MesaDeTrabajo[];
  onAbrirMesa: (mesaId: string) => void;
  readOnly?: boolean;
}

export function mesasAFilasMatriz(mesas: MesaDeTrabajo[]): FilaMesaMatriz[] {
  return mesas.map((m) => {
    const estadoLimpio = (m.estado || "PROGRAMADA").toUpperCase().replace(/_/g, " ");
    const lugar = m.lugar || "Sede territorial";
    const territorio = m.entidad || "Distrito de Cartagena";
    const facilitador =
      m.responsables?.find((r) => r.esFacilitador)?.nombre ||
      m.facilitador ||
      "Por asignar";
    const problema = m.arbolProblemas?.problemaCentral || "";

    return {
      id: m.id,
      codigoOficial: m.codigoOficial || m.shortcodeCiudadano || m.id.slice(0, 8),
      nombre: m.nombre || "Mesa Comunitaria",
      estado: estadoLimpio,
      fecha: m.fecha ? m.fecha.slice(0, 10) : "Por definir",
      horario: m.horario || "Por definir",
      lugarNombre: lugar,
      territorio: territorio,
      facilitadorNombre: facilitador,
      totalAsistentes: Number(m.totalAsistentes) || 0,
      dimensionOnu: m.dimensionOnu || "Multidimensional",
      problemaCentral: problema,
    };
  });
}

/**
 * Desglosa cada mesa en sus múltiples problemas, causas, efectos y soluciones propuestas
 * para su edición y desarrollo directo en la Vista Matriz RevoGrid.
 */
export function mesasAFilasMatrizMetodologica(
  mesas: MesaDeTrabajo[],
): FilaMatrizMetodologicaMesa[] {
  const resultado: FilaMatrizMetodologicaMesa[] = [];

  for (const m of mesas) {
    const estadoLimpio = (m.estado || "PROGRAMADA").toUpperCase().replace(/_/g, " ");
    const lugar = m.lugar || "Sede territorial";
    const territorio = m.entidad || "Distrito de Cartagena";
    const facilitador =
      m.responsables?.find((r) => r.esFacilitador)?.nombre ||
      m.facilitador ||
      "Por asignar";
    const codigo = m.codigoOficial || m.shortcodeCiudadano || m.id.slice(0, 8);
    const nombreMesa = m.nombre || "Mesa Comunitaria";
    const totalAsistentes = Number(m.totalAsistentes) || 0;
    const dimBase =
      m.arbolProblemas?.dimensionPrincipal || m.dimensionOnu || "Multidimensional";

    const arbolProb = m.arbolProblemas || {
      problemaCentral: "",
      causas: [],
      efectos: [],
    };
    const arbolSol = m.arbolSoluciones || {
      objetivoCentral: "",
      medios: [],
      fines: [],
    };

    // Construir lista de problemas abordados por la mesa
    const problemasMesa: Array<{
      id: string;
      texto: string;
      dimensionOnu?: string;
      objetivoSolucion?: string;
      actorResponsable?: string;
      criticidad?: string;
    }> = [
      {
        id: "problema_central",
        texto: arbolProb.problemaCentral || "",
        dimensionOnu: dimBase,
        objetivoSolucion: arbolSol.objetivoCentral || "",
        actorResponsable: territorio,
        criticidad: "alta",
      },
    ];

    for (const p of arbolProb.problemas || []) {
      problemasMesa.push({
        id: p.id,
        texto: p.texto || "",
        dimensionOnu: p.dimensionOnu || dimBase,
        objetivoSolucion: p.objetivoSolucion || "",
        actorResponsable: p.actorResponsable || territorio,
        criticidad: p.criticidad || "alta",
      });
    }

    const todasCausas = arbolProb.causas || [];
    const todosEfectos = arbolProb.efectos || [];
    const todosMedios = arbolSol.medios || [];
    const todosFines = arbolSol.fines || [];

    problemasMesa.forEach((prob, pIndex) => {
      const esPrincipal = prob.id === "problema_central";
      const coincideProblema = (pidRaw?: string) => {
        const pid = pidRaw || "problema_central";
        if (esPrincipal) {
          return pid === "problema_central" || pid === "principal";
        }
        return pid === prob.id;
      };

      const causasDeEsteProblema = todasCausas.filter((c) =>
        coincideProblema(c.metadatos?.problemaId),
      );

      const efectosDeEsteProblema = todosEfectos.filter((e) =>
        coincideProblema(e.metadatos?.problemaId),
      );

      const solucionesDeEsteProblema = todosMedios.filter((s) =>
        coincideProblema(s.metadatos?.problemaId),
      );

      const finesDeEsteProblema = todosFines.filter((f) =>
        coincideProblema(f.metadatos?.problemaId),
      );

      const maxFilasProblema = Math.max(
        1,
        causasDeEsteProblema.length,
        efectosDeEsteProblema.length,
        solucionesDeEsteProblema.length,
        finesDeEsteProblema.length,
      );

      for (let i = 0; i < maxFilasProblema; i++) {
        const causa = causasDeEsteProblema[i];
        const efecto = efectosDeEsteProblema[i];
        const solucion = solucionesDeEsteProblema[i];
        const fin = finesDeEsteProblema[i];

        const solucionTexto =
          solucion?.texto ||
          causa?.metadatos?.solucionPropuestaTexto ||
          (i === 0 ? prob.objetivoSolucion || "" : "");

        const dimFila =
          causa?.metadatos?.dimensionOnu ||
          solucion?.metadatos?.dimensionOnu ||
          efecto?.metadatos?.dimensionOnu ||
          prob.dimensionOnu ||
          dimBase;

        const actorFila =
          solucion?.metadatos?.actorResponsable ||
          causa?.metadatos?.actorResponsable ||
          prob.actorResponsable ||
          territorio;

        const criticidadFila =
          causa?.metadatos?.criticidad ||
          solucion?.metadatos?.criticidad ||
          prob.criticidad ||
          "alta";

        resultado.push({
          id: `${m.id}__${prob.id}__${i}`,
          mesaId: m.id,
          codigoOficial: codigo,
          nombre: nombreMesa,
          problemaId: prob.id,
          problemaNumero: `P${pIndex + 1}`,
          problemaCentral: prob.texto,
          causaId: causa?.id || "",
          causaTexto: causa?.texto || "",
          efectoId: efecto?.id || "",
          efectoTexto: efecto?.texto || "",
          solucionId: solucion?.id || "",
          solucionTexto,
          finId: fin?.id || "",
          finTexto: fin?.texto || "",
          dimensionOnu: dimFila,
          actorResponsable: actorFila,
          criticidad: criticidadFila,
          estado: estadoLimpio,
          fecha: m.fecha ? m.fecha.slice(0, 10) : "Por definir",
          horario: m.horario || "Por definir",
          lugarNombre: lugar,
          territorio,
          facilitadorNombre: facilitador,
          totalAsistentes,
        });
      }
    });
  }

  return resultado;
}

export function MesasMatrizCatalogoRevogrid({
  mesas,
  onAbrirMesa,
  readOnly = false,
}: MesasMatrizCatalogoRevogridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroDimension, setFiltroDimension] = useState<string>("TODAS");
  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string>(
    () => mesas[0]?.id || "",
  );
  const [problemaActivoId, setProblemaActivoId] = useState<string>("problema_central");

  // Estado del constructor rápido de Problemas, Causas, Efectos y Soluciones desde la Matriz
  const [mostrarConstructor, setMostrarConstructor] = useState<boolean>(false);
  const [nuevoProblemaTexto, setNuevoProblemaTexto] = useState<string>("");
  const [nuevaCausaTexto, setNuevaCausaTexto] = useState<string>("");
  const [nuevoEfectoTexto, setNuevoEfectoTexto] = useState<string>("");
  const [nuevaSolucionTexto, setNuevaSolucionTexto] = useState<string>("");
  const [nuevoFinTexto, setNuevoFinTexto] = useState<string>("");
  const [nuevaEntidadTexto, setNuevaEntidadTexto] = useState<string>("");

  // Estado local de mesas para edición optimista inmediata
  const [mesasLocales, setMesasLocales] = useState<MesaDeTrabajo[]>(() => mesas);

  useEffect(() => {
    setMesasLocales(mesas);
  }, [mesas]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        defineCustomElements();
      } catch {
        // En SSR o entornos de prueba se captura sin interrumpir
      }
    }
  }, []);

  // Filas metodológicas desglosadas (Mesas x Problemas x Causas x Efectos x Soluciones)
  const filasMetodologicas = useMemo(
    () => mesasAFilasMatrizMetodologica(mesasLocales),
    [mesasLocales],
  );

  // Sincronizar mesa activa
  useEffect(() => {
    if (mesasLocales.length > 0 && !mesasLocales.some((m) => m.id === mesaSeleccionadaId)) {
      setMesaSeleccionadaId(mesasLocales[0].id);
    }
  }, [mesasLocales, mesaSeleccionadaId]);

  const mesaActivaObj = useMemo(
    () => mesasLocales.find((m) => m.id === mesaSeleccionadaId) || mesasLocales[0],
    [mesasLocales, mesaSeleccionadaId],
  );

  // Problemas registrados en la mesa activa
  const problemasDeMesaActiva = useMemo(() => {
    if (!mesaActivaObj) return [{ id: "problema_central", texto: "Problema Central" }];
    const arbol = mesaActivaObj.arbolProblemas;
    const lista: Array<{ id: string; texto: string }> = [
      {
        id: "problema_central",
        texto: arbol?.problemaCentral || "Problema #1 (Principal)",
      },
    ];
    for (const p of arbol?.problemas || []) {
      lista.push({
        id: p.id,
        texto: p.texto || "Problema Abordado",
      });
    }
    return lista;
  }, [mesaActivaObj]);

  useEffect(() => {
    if (!problemasDeMesaActiva.some((p) => p.id === problemaActivoId)) {
      setProblemaActivoId("problema_central");
    }
  }, [problemasDeMesaActiva, problemaActivoId]);

  // Métricas globales de sistematización en la matriz
  const metricasMatriz = useMemo(() => {
    let totalProblemas = 0;
    let totalCausas = 0;
    let totalEfectos = 0;
    let totalSoluciones = 0;

    for (const m of mesasLocales) {
      const ap = m.arbolProblemas;
      const asol = m.arbolSoluciones;
      if (ap?.problemaCentral?.trim()) totalProblemas++;
      totalProblemas += ap?.problemas?.length || 0;
      totalCausas += ap?.causas?.length || 0;
      totalEfectos += ap?.efectos?.length || 0;
      totalSoluciones += (asol?.medios?.length || 0) + (asol?.fines?.length || 0);
      if (!asol?.medios?.length && asol?.objetivoCentral?.trim()) totalSoluciones++;
    }

    return {
      mesasCount: mesasLocales.length,
      filasCount: filasMetodologicas.length,
      totalProblemas,
      totalCausas,
      totalEfectos,
      totalSoluciones,
    };
  }, [mesasLocales, filasMetodologicas.length]);

  // Filtrado reactivo sobre todas las columnas metodológicas y logísticas
  const filasFiltradas = useMemo(() => {
    return filasMetodologicas.filter((f) => {
      if (filtroEstado !== "TODOS") {
        const est = f.estado.toUpperCase();
        if (filtroEstado === "PROGRAMADA" && !est.includes("PROGRAMADA")) return false;
        if (filtroEstado === "EN_CURSO" && !est.includes("CURSO") && !est.includes("ACTIVA")) return false;
        if (filtroEstado === "CERRADA" && !est.includes("CERRADA") && !est.includes("COMPLET")) return false;
      }

      if (filtroDimension !== "TODAS") {
        if (!f.dimensionOnu.toLowerCase().includes(filtroDimension.toLowerCase())) {
          return false;
        }
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincide =
          f.codigoOficial.toLowerCase().includes(q) ||
          f.nombre.toLowerCase().includes(q) ||
          f.problemaCentral.toLowerCase().includes(q) ||
          f.causaTexto.toLowerCase().includes(q) ||
          f.efectoTexto.toLowerCase().includes(q) ||
          f.solucionTexto.toLowerCase().includes(q) ||
          f.finTexto.toLowerCase().includes(q) ||
          f.actorResponsable.toLowerCase().includes(q) ||
          f.estado.toLowerCase().includes(q) ||
          f.fecha.toLowerCase().includes(q) ||
          f.lugarNombre.toLowerCase().includes(q) ||
          f.territorio.toLowerCase().includes(q) ||
          f.facilitadorNombre.toLowerCase().includes(q) ||
          f.dimensionOnu.toLowerCase().includes(q);
        if (!coincide) return false;
      }

      return true;
    });
  }, [filasMetodologicas, filtroEstado, filtroDimension, busqueda]);

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

  // Columnas de la Matriz RevoGrid con soporte integral de Problemas, Causas, Efectos y Soluciones
  const columnas = useMemo(
    () => [
      {
        prop: "codigoOficial",
        name: "Código",
        size: 100,
        sortable: true,
        readonly: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "nombre",
        name: "Mesa Territorial",
        size: 220,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "problemaNumero",
        name: "N.º Prob.",
        size: 80,
        sortable: true,
        readonly: true,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "problemaCentral",
        name: "Problema Abordado en la Mesa",
        size: 300,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "causaTexto",
        name: "Causa Identificada",
        size: 290,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "efectoTexto",
        name: "Efecto / Consecuencia",
        size: 280,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "solucionTexto",
        name: "Solución Propuesta / Acción",
        size: 300,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "finTexto",
        name: "Resultado / Fin Esperado",
        size: 260,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "dimensionOnu",
        name: "Dimensión ONU",
        size: 200,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "actorResponsable",
        name: "Entidad / Actor Responsable",
        size: 190,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "criticidad",
        name: "Prioridad",
        size: 105,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "estado",
        name: "Estado",
        size: 120,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "fecha",
        name: "Fecha",
        size: 120,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "horario",
        name: "Horario",
        size: 120,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "lugarNombre",
        name: "Lugar / Sede",
        size: 190,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "territorio",
        name: "Localidad / Territorio",
        size: 180,
        sortable: true,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "facilitadorNombre",
        name: "Facilitador(a)",
        size: 170,
        readonly: readOnly,
        cellProperties: cellMultilineProps,
      },
      {
        prop: "totalAsistentes",
        name: "Asistentes",
        size: 100,
        sortable: true,
        readonly: true,
        cellProperties: cellMultilineProps,
      },
    ],
    [readOnly],
  );

  const rowDefinitions = useMemo(
    () =>
      filasFiltradas.map((f, index) => {
        const maxLen = Math.max(
          (f.nombre || "").length,
          (f.problemaCentral || "").length,
          (f.causaTexto || "").length,
          (f.efectoTexto || "").length,
          (f.solucionTexto || "").length,
          (f.finTexto || "").length,
        );
        const lineasEstimadas = Math.max(2, Math.ceil(maxLen / 40));
        const size = Math.min(160, Math.max(64, lineasEstimadas * 20 + 18));
        return {
          type: "rgRow" as const,
          index,
          size,
        };
      }),
    [filasFiltradas],
  );

  // Función auxiliar para persistir cambios de una mesa en Estado Local, Zustand y Backend
  const persistirCambiosMesa = useCallback(
    async (mesaId: string, payload: Partial<MesaDeTrabajo>, etiqueta: string) => {
      setMesasLocales((prev) =>
        prev.map((m) => (m.id === mesaId ? { ...m, ...payload } : m)),
      );
      useMesasStore.getState().actualizarMesa(mesaId, payload);

      try {
        await actualizarMesaRemota(mesaId, payload);
        toast.success("Matriz sincronizada", {
          description: `${etiqueta} guardado automáticamente en la plataforma.`,
        });
      } catch (err: unknown) {
        const mensaje =
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el registro en la base de datos.";
        toast.error("Error al persistir cambios", {
          description: mensaje,
        });
      }
    },
    [],
  );

  // Manejo de edición directa en celda de Problemas, Causas, Efectos, Soluciones y Metadatos
  const aplicarEdicionCeldaMetodologica = useCallback(
    async (row: FilaMatrizMetodologicaMesa, prop: string, nuevoValor: string) => {
      if (readOnly || !row?.mesaId) return;
      const mesa = mesasLocales.find((m) => m.id === row.mesaId);
      if (!mesa) return;

      setMesaSeleccionadaId(mesa.id);

      const nuevoArbolProb: ArbolProblemas = {
        problemaCentral: mesa.arbolProblemas?.problemaCentral || "",
        dimensionPrincipal:
          mesa.arbolProblemas?.dimensionPrincipal || mesa.dimensionOnu || DIMENSIONES_ONU[0],
        problemas: mesa.arbolProblemas?.problemas
          ? JSON.parse(JSON.stringify(mesa.arbolProblemas.problemas))
          : [],
        causas: JSON.parse(JSON.stringify(mesa.arbolProblemas?.causas || [])),
        efectos: JSON.parse(JSON.stringify(mesa.arbolProblemas?.efectos || [])),
      };

      const nuevoArbolSol: ArbolSoluciones = {
        objetivoCentral: mesa.arbolSoluciones?.objetivoCentral || "",
        medios: JSON.parse(JSON.stringify(mesa.arbolSoluciones?.medios || [])),
        fines: JSON.parse(JSON.stringify(mesa.arbolSoluciones?.fines || [])),
      };

      const payload: Partial<MesaDeTrabajo> = {};
      let etiquetaCampo = prop;

      if (prop === "problemaCentral") {
        etiquetaCampo = "Problema abordado";
        if (row.problemaId === "problema_central") {
          nuevoArbolProb.problemaCentral = nuevoValor;
        } else {
          const probItem = (nuevoArbolProb.problemas || []).find(
            (p) => p.id === row.problemaId,
          );
          if (probItem) {
            probItem.texto = nuevoValor;
          }
          // Actualizar referencia de texto en causas, efectos y soluciones asociadas
          for (const c of nuevoArbolProb.causas) {
            if (c.metadatos?.problemaId === row.problemaId) {
              c.metadatos.problemaTexto = nuevoValor;
            }
          }
          for (const e of nuevoArbolProb.efectos) {
            if (e.metadatos?.problemaId === row.problemaId) {
              e.metadatos.problemaTexto = nuevoValor;
            }
          }
          for (const s of nuevoArbolSol.medios) {
            if (s.metadatos?.problemaId === row.problemaId) {
              s.metadatos.problemaTexto = nuevoValor;
            }
          }
        }
        payload.arbolProblemas = nuevoArbolProb;
        payload.arbolSoluciones = nuevoArbolSol;
      } else if (prop === "causaTexto") {
        etiquetaCampo = "Causa identificada";
        if (row.causaId) {
          const c = nuevoArbolProb.causas.find((item) => item.id === row.causaId);
          if (c) c.texto = nuevoValor;
        } else if (nuevoValor) {
          nuevoArbolProb.causas.push({
            id: uidNodo(),
            texto: nuevoValor,
            hijos: [],
            metadatos: {
              problemaId: row.problemaId,
              problemaTexto: row.problemaCentral,
              dimensionOnu: row.dimensionOnu,
              actorResponsable: row.actorResponsable,
              criticidad: (row.criticidad as "alta" | "media" | "baja") || "alta",
            },
          });
        }
        payload.arbolProblemas = nuevoArbolProb;
      } else if (prop === "efectoTexto") {
        etiquetaCampo = "Efecto territorial";
        if (row.efectoId) {
          const ef = nuevoArbolProb.efectos.find((item) => item.id === row.efectoId);
          if (ef) ef.texto = nuevoValor;
        } else if (nuevoValor) {
          nuevoArbolProb.efectos.push({
            id: uidNodo(),
            texto: nuevoValor,
            hijos: [],
            metadatos: {
              problemaId: row.problemaId,
              problemaTexto: row.problemaCentral,
              dimensionOnu: row.dimensionOnu,
              actorResponsable: row.actorResponsable,
              criticidad: (row.criticidad as "alta" | "media" | "baja") || "alta",
            },
          });
        }
        payload.arbolProblemas = nuevoArbolProb;
      } else if (prop === "solucionTexto") {
        etiquetaCampo = "Solución propuesta";
        if (row.solucionId) {
          const sol = nuevoArbolSol.medios.find((item) => item.id === row.solucionId);
          if (sol) sol.texto = nuevoValor;
        } else if (nuevoValor) {
          nuevoArbolSol.medios.push({
            id: uidNodo(),
            texto: nuevoValor,
            hijos: [],
            metadatos: {
              problemaId: row.problemaId,
              problemaTexto: row.problemaCentral,
              dimensionOnu: row.dimensionOnu,
              actorResponsable: row.actorResponsable,
              criticidad: (row.criticidad as "alta" | "media" | "baja") || "alta",
            },
          });
          if (!nuevoArbolSol.objetivoCentral) {
            nuevoArbolSol.objetivoCentral = nuevoValor;
          }
        }
        payload.arbolSoluciones = nuevoArbolSol;
      } else if (prop === "finTexto") {
        etiquetaCampo = "Resultado / Fin esperado";
        if (row.finId) {
          const fn = nuevoArbolSol.fines.find((item) => item.id === row.finId);
          if (fn) fn.texto = nuevoValor;
        } else if (nuevoValor) {
          nuevoArbolSol.fines.push({
            id: uidNodo(),
            texto: nuevoValor,
            hijos: [],
            metadatos: {
              problemaId: row.problemaId,
              problemaTexto: row.problemaCentral,
              dimensionOnu: row.dimensionOnu,
              actorResponsable: row.actorResponsable,
              criticidad: (row.criticidad as "alta" | "media" | "baja") || "alta",
            },
          });
        }
        payload.arbolSoluciones = nuevoArbolSol;
      } else if (prop === "dimensionOnu") {
        etiquetaCampo = "Dimensión ONU";
        payload.dimensionOnu = nuevoValor;
        if (row.causaId) {
          const c = nuevoArbolProb.causas.find((item) => item.id === row.causaId);
          if (c) {
            c.metadatos = { ...c.metadatos, dimensionOnu: nuevoValor };
            payload.arbolProblemas = nuevoArbolProb;
          }
        }
      } else if (prop === "actorResponsable") {
        etiquetaCampo = "Entidad responsable";
        if (row.solucionId) {
          const s = nuevoArbolSol.medios.find((item) => item.id === row.solucionId);
          if (s) {
            s.metadatos = { ...s.metadatos, actorResponsable: nuevoValor };
            payload.arbolSoluciones = nuevoArbolSol;
          }
        }
        if (row.causaId) {
          const c = nuevoArbolProb.causas.find((item) => item.id === row.causaId);
          if (c) {
            c.metadatos = { ...c.metadatos, actorResponsable: nuevoValor };
            payload.arbolProblemas = nuevoArbolProb;
          }
        }
      } else if (prop === "criticidad") {
        etiquetaCampo = "Prioridad / Criticidad";
        const critVal = (nuevoValor.toLowerCase() as "alta" | "media" | "baja") || "alta";
        if (row.causaId) {
          const c = nuevoArbolProb.causas.find((item) => item.id === row.causaId);
          if (c) {
            c.metadatos = { ...c.metadatos, criticidad: critVal };
            payload.arbolProblemas = nuevoArbolProb;
          }
        }
      } else if (prop === "nombre") {
        payload.nombre = nuevoValor;
        etiquetaCampo = "Nombre de la mesa";
      } else if (prop === "estado") {
        payload.estado = nuevoValor.toLowerCase().replace(/\s+/g, "_") as MesaDeTrabajo["estado"];
        etiquetaCampo = "Estado";
      } else if (prop === "fecha") {
        payload.fecha = nuevoValor === "Por definir" ? null : nuevoValor;
        etiquetaCampo = "Fecha";
      } else if (prop === "horario") {
        payload.horario = nuevoValor;
        etiquetaCampo = "Horario";
      } else if (prop === "lugarNombre") {
        payload.lugar = nuevoValor;
        etiquetaCampo = "Lugar / Sede";
      } else if (prop === "territorio") {
        payload.entidad = nuevoValor;
        etiquetaCampo = "Localidad / Territorio";
      } else if (prop === "facilitadorNombre") {
        payload.facilitador = nuevoValor;
        etiquetaCampo = "Facilitador(a)";
      }

      await persistirCambiosMesa(mesa.id, payload, etiquetaCampo);
    },
    [readOnly, mesasLocales, persistirCambiosMesa],
  );

  // Botones de acción rápida desde la barra de la Matriz para agregar Problema, Causa, Efecto o Solución a una mesa
  const agregarElementoAMesaActiva = async (
    tipo: "problema" | "causa" | "efecto" | "solucion" | "fin",
  ) => {
    if (readOnly || !mesaActivaObj) return;

    const nuevoArbolProb: ArbolProblemas = {
      problemaCentral:
        mesaActivaObj.arbolProblemas?.problemaCentral ||
        "Problema principal identificado en la mesa",
      dimensionPrincipal:
        mesaActivaObj.arbolProblemas?.dimensionPrincipal ||
        mesaActivaObj.dimensionOnu ||
        DIMENSIONES_ONU[0],
      problemas: mesaActivaObj.arbolProblemas?.problemas
        ? JSON.parse(JSON.stringify(mesaActivaObj.arbolProblemas.problemas))
        : [],
      causas: JSON.parse(JSON.stringify(mesaActivaObj.arbolProblemas?.causas || [])),
      efectos: JSON.parse(JSON.stringify(mesaActivaObj.arbolProblemas?.efectos || [])),
    };

    const nuevoArbolSol: ArbolSoluciones = {
      objetivoCentral:
        mesaActivaObj.arbolSoluciones?.objetivoCentral ||
        "Objetivo central de solución de la mesa",
      medios: JSON.parse(JSON.stringify(mesaActivaObj.arbolSoluciones?.medios || [])),
      fines: JSON.parse(JSON.stringify(mesaActivaObj.arbolSoluciones?.fines || [])),
    };

    const probSeleccionado =
      problemasDeMesaActiva.find((p) => p.id === problemaActivoId) ||
      problemasDeMesaActiva[0];
    const probId = probSeleccionado?.id || "problema_central";
    const probTexto = probSeleccionado?.texto || nuevoArbolProb.problemaCentral;
    const dim = nuevoArbolProb.dimensionPrincipal || DIMENSIONES_ONU[0];

    if (tipo === "problema") {
      const idNuevoProb = uidNodo();
      const numProb = (nuevoArbolProb.problemas?.length || 0) + 2;
      const nuevoProblema: ProblemaAbordadoMesa = {
        id: idNuevoProb,
        texto: `Problema #${numProb} abordado en ${mesaActivaObj.nombre}`,
        dimensionOnu: dim,
        objetivoSolucion: "Solución propuesta para este problema",
        actorResponsable: mesaActivaObj.entidad || "Distrito de Cartagena",
        criticidad: "alta",
      };
      nuevoArbolProb.problemas = [...(nuevoArbolProb.problemas || []), nuevoProblema];
      setProblemaActivoId(idNuevoProb);
      await persistirCambiosMesa(
        mesaActivaObj.id,
        { arbolProblemas: nuevoArbolProb },
        `Nuevo Problema #${numProb}`,
      );
      return;
    }

    if (tipo === "causa") {
      const nuevaCausa: NodoArbol = {
        id: uidNodo(),
        texto: "Nueva causa identificada (doble clic para editar)",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          dimensionOnu: dim,
          actorResponsable: mesaActivaObj.entidad || "Distrito de Cartagena",
          criticidad: "alta",
        },
      };
      nuevoArbolProb.causas.push(nuevaCausa);
      await persistirCambiosMesa(
        mesaActivaObj.id,
        { arbolProblemas: nuevoArbolProb },
        "Nueva causa agregada al problema",
      );
      return;
    }

    if (tipo === "efecto") {
      const nuevoEfecto: NodoArbol = {
        id: uidNodo(),
        texto: "Nuevo efecto o consecuencia (doble clic para editar)",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          dimensionOnu: dim,
          actorResponsable: mesaActivaObj.entidad || "Distrito de Cartagena",
          criticidad: "alta",
        },
      };
      nuevoArbolProb.efectos.push(nuevoEfecto);
      await persistirCambiosMesa(
        mesaActivaObj.id,
        { arbolProblemas: nuevoArbolProb },
        "Nuevo efecto agregado al problema",
      );
      return;
    }

    if (tipo === "solucion") {
      const nuevaSolucion: NodoArbol = {
        id: uidNodo(),
        texto: "Nueva solución propuesta / acción (doble clic para editar)",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          dimensionOnu: dim,
          actorResponsable: mesaActivaObj.entidad || "Distrito de Cartagena",
          criticidad: "alta",
        },
      };
      nuevoArbolSol.medios.push(nuevaSolucion);
      await persistirCambiosMesa(
        mesaActivaObj.id,
        { arbolSoluciones: nuevoArbolSol },
        "Nueva solución propuesta agregada",
      );
      return;
    }

    if (tipo === "fin") {
      const nuevoFin: NodoArbol = {
        id: uidNodo(),
        texto: "Nuevo resultado / fin esperado (doble clic para editar)",
        hijos: [],
        metadatos: {
          problemaId: probId,
          problemaTexto: probTexto,
          dimensionOnu: dim,
          actorResponsable: mesaActivaObj.entidad || "Distrito de Cartagena",
          criticidad: "alta",
        },
      };
      nuevoArbolSol.fines.push(nuevoFin);
      await persistirCambiosMesa(
        mesaActivaObj.id,
        { arbolSoluciones: nuevoArbolSol },
        "Nuevo resultado / fin esperado agregado",
      );
    }
  };

  // Registro completo desde el Constructor Rápido de la Vista Matriz
  const registrarCadenaCompletaEnMatriz = async () => {
    if (readOnly || !mesaActivaObj) return;

    const nuevoArbolProb: ArbolProblemas = {
      problemaCentral: mesaActivaObj.arbolProblemas?.problemaCentral || "",
      dimensionPrincipal:
        mesaActivaObj.arbolProblemas?.dimensionPrincipal ||
        mesaActivaObj.dimensionOnu ||
        DIMENSIONES_ONU[0],
      problemas: mesaActivaObj.arbolProblemas?.problemas
        ? JSON.parse(JSON.stringify(mesaActivaObj.arbolProblemas.problemas))
        : [],
      causas: JSON.parse(JSON.stringify(mesaActivaObj.arbolProblemas?.causas || [])),
      efectos: JSON.parse(JSON.stringify(mesaActivaObj.arbolProblemas?.efectos || [])),
    };

    const nuevoArbolSol: ArbolSoluciones = {
      objetivoCentral: mesaActivaObj.arbolSoluciones?.objetivoCentral || "",
      medios: JSON.parse(JSON.stringify(mesaActivaObj.arbolSoluciones?.medios || [])),
      fines: JSON.parse(JSON.stringify(mesaActivaObj.arbolSoluciones?.fines || [])),
    };

    const dim = nuevoArbolProb.dimensionPrincipal || DIMENSIONES_ONU[0];
    const entidad =
      nuevaEntidadTexto.trim() || mesaActivaObj.entidad || "Distrito de Cartagena";
    const textoSol =
      nuevaSolucionTexto.trim() || "Solución propuesta concertada en la mesa";

    let targetProbId = problemaActivoId;
    let targetProbTexto =
      problemasDeMesaActiva.find((p) => p.id === problemaActivoId)?.texto ||
      nuevoArbolProb.problemaCentral ||
      "Problema territorial abordado";

    if (nuevoProblemaTexto.trim()) {
      targetProbTexto = nuevoProblemaTexto.trim();
      if (!nuevoArbolProb.problemaCentral) {
        nuevoArbolProb.problemaCentral = targetProbTexto;
        targetProbId = "problema_central";
      } else {
        targetProbId = uidNodo();
        nuevoArbolProb.problemas = [
          ...(nuevoArbolProb.problemas || []),
          {
            id: targetProbId,
            texto: targetProbTexto,
            dimensionOnu: dim,
            objetivoSolucion: textoSol,
            actorResponsable: entidad,
            criticidad: "alta",
          },
        ];
        setProblemaActivoId(targetProbId);
      }
    }

    if (nuevaCausaTexto.trim()) {
      nuevoArbolProb.causas.push({
        id: uidNodo(),
        texto: nuevaCausaTexto.trim(),
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: targetProbTexto,
          solucionPropuestaTexto: textoSol,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      });
    }

    if (nuevoEfectoTexto.trim()) {
      nuevoArbolProb.efectos.push({
        id: uidNodo(),
        texto: nuevoEfectoTexto.trim(),
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: targetProbTexto,
          solucionPropuestaTexto: textoSol,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      });
    }

    if (nuevaSolucionTexto.trim()) {
      nuevoArbolSol.medios.push({
        id: uidNodo(),
        texto: nuevaSolucionTexto.trim(),
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: targetProbTexto,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      });
      if (!nuevoArbolSol.objetivoCentral) {
        nuevoArbolSol.objetivoCentral = nuevaSolucionTexto.trim();
      }
    }

    if (nuevoFinTexto.trim()) {
      nuevoArbolSol.fines.push({
        id: uidNodo(),
        texto: nuevoFinTexto.trim(),
        hijos: [],
        metadatos: {
          problemaId: targetProbId,
          problemaTexto: targetProbTexto,
          dimensionOnu: dim,
          actorResponsable: entidad,
          criticidad: "alta",
        },
      });
    }

    setNuevoProblemaTexto("");
    setNuevaCausaTexto("");
    setNuevoEfectoTexto("");
    setNuevaSolucionTexto("");
    setNuevoFinTexto("");
    setNuevaEntidadTexto("");

    await persistirCambiosMesa(
      mesaActivaObj.id,
      {
        arbolProblemas: nuevoArbolProb,
        arbolSoluciones: nuevoArbolSol,
      },
      "Cadena de Problema, Causa, Efecto y Solución",
    );
  };

  const handleAfterEdit = useCallback(
    (e: CustomEvent<Record<string, unknown>>) => {
      if (readOnly) return;
      const detail = e.detail;
      if (!detail) return;

      // Edición de celda individual
      if ("prop" in detail && "model" in detail) {
        const row = detail.model as FilaMatrizMetodologicaMesa;
        const prop = String(detail.prop);
        const val =
          detail.val !== undefined && detail.val !== null
            ? String(detail.val).trim()
            : "";
        if (row?.mesaId && prop) {
          aplicarEdicionCeldaMetodologica(row, prop, val);
        }
      }
      // Edición por rango o pegado múltiple desde portapapeles
      else if (
        "data" in detail &&
        typeof detail.data === "object" &&
        detail.data !== null
      ) {
        const dataObj = detail.data as Record<string, Record<string, unknown>>;
        const modelsObj =
          (detail.models as Record<number, FilaMatrizMetodologicaMesa> | undefined) ||
          {};
        Object.entries(dataObj).forEach(([rowIndexStr, updatedRow]) => {
          const idx = Number(rowIndexStr);
          const oldModel = modelsObj[idx] || filasFiltradas[idx];
          if (oldModel && updatedRow) {
            const keys: (keyof FilaMatrizMetodologicaMesa)[] = [
              "nombre",
              "problemaCentral",
              "causaTexto",
              "efectoTexto",
              "solucionTexto",
              "finTexto",
              "dimensionOnu",
              "actorResponsable",
              "criticidad",
              "estado",
              "fecha",
              "horario",
              "lugarNombre",
              "territorio",
              "facilitadorNombre",
            ];
            for (const key of keys) {
              if (
                updatedRow[key] !== undefined &&
                updatedRow[key] !== oldModel[key]
              ) {
                aplicarEdicionCeldaMetodologica(
                  oldModel,
                  key,
                  String(updatedRow[key]).trim(),
                );
              }
            }
          }
        });
      }
    },
    [readOnly, filasFiltradas, aplicarEdicionCeldaMetodologica],
  );

  // Registro del listener nativo del web component revo-grid
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
  }, [handleAfterEdit]);

  // Exportaciones estándar incluyendo Problemas, Causas, Efectos y Soluciones
  const copiarExcelTSV = async () => {
    const encabezados = [
      "Código",
      "Mesa Territorial",
      "N.º Problema",
      "Problema Abordado",
      "Causa Identificada",
      "Efecto / Consecuencia",
      "Solución Propuesta",
      "Resultado / Fin Esperado",
      "Dimensión ONU",
      "Entidad Responsable",
      "Prioridad",
      "Estado",
      "Fecha",
      "Horario",
      "Lugar",
      "Localidad",
      "Facilitador",
      "Asistentes",
    ];
    const lineas = [
      encabezados.join("\t"),
      ...filasFiltradas.map((f) =>
        [
          f.codigoOficial,
          `"${f.nombre.replace(/"/g, '""')}"`,
          f.problemaNumero,
          `"${f.problemaCentral.replace(/"/g, '""')}"`,
          `"${f.causaTexto.replace(/"/g, '""')}"`,
          `"${f.efectoTexto.replace(/"/g, '""')}"`,
          `"${f.solucionTexto.replace(/"/g, '""')}"`,
          `"${f.finTexto.replace(/"/g, '""')}"`,
          `"${f.dimensionOnu}"`,
          `"${f.actorResponsable.replace(/"/g, '""')}"`,
          f.criticidad,
          f.estado,
          f.fecha,
          f.horario,
          `"${f.lugarNombre.replace(/"/g, '""')}"`,
          `"${f.territorio.replace(/"/g, '""')}"`,
          `"${f.facilitadorNombre.replace(/"/g, '""')}"`,
          f.totalAsistentes,
        ].join("\t"),
      ),
    ];
    try {
      await navigator.clipboard.writeText(lineas.join("\n"));
      toast.success("Matriz copiada al portapapeles", {
        description: "Formato TSV compatible con Microsoft Excel y Google Sheets.",
      });
    } catch {
      toast.error("No se pudo acceder al portapapeles del navegador.");
    }
  };

  const descargarCSV = () => {
    const encabezados = [
      "Código",
      "Mesa Territorial",
      "N.º Problema",
      "Problema Abordado",
      "Causa Identificada",
      "Efecto / Consecuencia",
      "Solución Propuesta",
      "Resultado / Fin Esperado",
      "Dimensión ONU",
      "Entidad Responsable",
      "Prioridad",
      "Estado",
      "Fecha",
      "Horario",
      "Lugar",
      "Localidad",
      "Facilitador",
      "Asistentes",
    ];
    const lineas = [
      encabezados.join(";"),
      ...filasFiltradas.map((f) =>
        [
          `"${f.codigoOficial}"`,
          `"${f.nombre.replace(/"/g, '""')}"`,
          `"${f.problemaNumero}"`,
          `"${f.problemaCentral.replace(/"/g, '""')}"`,
          `"${f.causaTexto.replace(/"/g, '""')}"`,
          `"${f.efectoTexto.replace(/"/g, '""')}"`,
          `"${f.solucionTexto.replace(/"/g, '""')}"`,
          `"${f.finTexto.replace(/"/g, '""')}"`,
          `"${f.dimensionOnu}"`,
          `"${f.actorResponsable.replace(/"/g, '""')}"`,
          `"${f.criticidad}"`,
          `"${f.estado}"`,
          `"${f.fecha}"`,
          `"${f.horario}"`,
          `"${f.lugarNombre.replace(/"/g, '""')}"`,
          `"${f.territorio.replace(/"/g, '""')}"`,
          `"${f.facilitadorNombre.replace(/"/g, '""')}"`,
          f.totalAsistentes,
        ].join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `matriz_mesas_problemas_soluciones_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Archivo CSV descargado exitosamente");
  };

  return (
    <div className="space-y-3 w-full" data-testid="mesas-matriz-catalogo">
      {/* Barra de herramientas Pro de la matriz */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <TableProperties className="size-4 text-[var(--ember)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Matriz de Mesas Territoriales
            </span>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
              {`${mesasLocales.length} mesas · ${filasFiltradas.length} filas matriciales`}
            </span>
          </div>

          {/* Indicadores de Problemas, Causas, Efectos y Soluciones */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[var(--text-secondary)]">
              <AlertTriangle className="size-3 text-[var(--warning)]" />
              {metricasMatriz.totalProblemas} problemas
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[var(--text-secondary)]">
              <ShieldAlert className="size-3 text-[var(--ember)]" />
              {metricasMatriz.totalCausas} causas
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[var(--text-secondary)]">
              <Target className="size-3 text-[var(--info)]" />
              {metricasMatriz.totalEfectos} efectos
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[var(--text-secondary)]">
              <Compass className="size-3 text-[var(--success)]" />
              {metricasMatriz.totalSoluciones} soluciones
            </span>
          </div>

          {/* Indicador de modo de edición */}
          {readOnly ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
              <Lock className="size-3 text-[var(--text-tertiary)]" />
              Solo Lectura
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--success)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">
              <Pencil className="size-3" />
              Edición Directa Activa
            </span>
          )}
        </div>

        {/* Acciones de exportación */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={copiarExcelTSV}
            className="h-8 gap-1.5 text-xs"
            title="Copiar matriz para pegar directamente en Excel o Google Sheets"
          >
            <Copy className="size-3.5" />
            Copiar TSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={descargarCSV}
            className="h-8 gap-1.5 text-xs"
            title="Descargar matriz en archivo CSV"
          >
            <Download className="size-3.5" />
            Descargar CSV
          </Button>
        </div>
      </div>

      {/* Barra de Desarrollo de Problemas, Causas, Efectos y Soluciones por Mesa (Modo Edición) */}
      {!readOnly && mesasLocales.length > 0 && (
        <div
          data-testid="barra-desarrollo-problemas-matriz"
          className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-2.5"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] shrink-0">
              <Layers className="size-3.5 text-[var(--ember)]" />
              Mesa activa:
            </span>
            <div className="w-[260px] max-w-full shrink-0">
              <Select
                value={mesaSeleccionadaId}
                onValueChange={(val) => {
                  setMesaSeleccionadaId(val);
                  setProblemaActivoId("problema_central");
                }}
              >
                <SelectTrigger className="h-8 w-full max-w-full overflow-hidden text-xs bg-[var(--surface-1)]">
                  <SelectValue placeholder="Seleccionar mesa" />
                </SelectTrigger>
                <SelectContent>
                  {mesasLocales.map((m) => {
                    const cod = m.codigoOficial || m.shortcodeCiudadano || m.id.slice(0, 6);
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        {`${cod} — ${m.nombre.slice(0, 32)}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs font-medium text-[var(--text-secondary)] shrink-0">
              Problema:
            </span>
            <div className="w-[260px] max-w-full shrink-0">
              <Select value={problemaActivoId} onValueChange={setProblemaActivoId}>
                <SelectTrigger className="h-8 w-full max-w-full overflow-hidden text-xs bg-[var(--surface-1)]">
                  <SelectValue placeholder="Seleccionar problema" />
                </SelectTrigger>
                <SelectContent>
                  {problemasDeMesaActiva.map((prob, idx) => (
                    <SelectItem key={prob.id} value={prob.id}>
                      {`P${idx + 1}: ${prob.texto ? prob.texto.slice(0, 36) : "Sin definir"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones directos para añadir Problemas, Causas, Efectos y Soluciones a la mesa */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => agregarElementoAMesaActiva("problema")}
              className="h-8 gap-1 text-xs border-[var(--warning)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar un nuevo problema a la mesa seleccionada"
            >
              <Plus className="size-3 text-[var(--warning)]" />
              Problema
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => agregarElementoAMesaActiva("causa")}
              className="h-8 gap-1 text-xs border-[var(--ember)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar una nueva causa al problema seleccionado"
            >
              <Plus className="size-3 text-[var(--ember)]" />
              Causa
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => agregarElementoAMesaActiva("efecto")}
              className="h-8 gap-1 text-xs border-[var(--info)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar un nuevo efecto al problema seleccionado"
            >
              <Plus className="size-3 text-[var(--info)]" />
              Efecto
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => agregarElementoAMesaActiva("solucion")}
              className="h-8 gap-1 text-xs border-[var(--success)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar una nueva solución propuesta al problema seleccionado"
            >
              <Plus className="size-3 text-[var(--success)]" />
              Solución
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => agregarElementoAMesaActiva("fin")}
              className="h-8 gap-1 text-xs border-[var(--brand-polis-cyan)]/40 hover:bg-[var(--surface-1)]"
              title="Agregar un nuevo resultado o fin esperado"
            >
              <Plus className="size-3 text-[var(--brand-polis-cyan)]" />
              Fin
            </Button>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={() => setMostrarConstructor((v) => !v)}
              className="h-8 gap-1 text-xs"
              title="Abrir formulario rápido para registrar Problema + Causas + Efectos + Soluciones"
            >
              <GitBranch className="size-3" />
              {mostrarConstructor ? "Ocultar Constructor" : "+ Cadena Completa"}
            </Button>
          </div>
        </div>
      )}

      {/* Constructor Rápido Desplegable en la Vista Matriz */}
      {!readOnly && mostrarConstructor && mesaActivaObj && (
        <div
          data-testid="constructor-cadena-completa-matriz"
          className="space-y-2.5 rounded-xl border border-[var(--ember)]/30 bg-[var(--surface-1)] p-3.5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Desarrollo Rápido en Matriz para:{" "}
              <span className="text-[var(--ember)]">{mesaActivaObj.nombre}</span>
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Registra simultáneamente problema, causa, efecto y solución propuesta
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Input
              value={nuevoProblemaTexto}
              onChange={(e) => setNuevoProblemaTexto(e.target.value)}
              placeholder="1. Nuevo problema (o vacío para usar actual)..."
              className="h-8 text-xs"
            />
            <Input
              value={nuevaCausaTexto}
              onChange={(e) => setNuevaCausaTexto(e.target.value)}
              placeholder="2. Causa identificada..."
              className="h-8 text-xs"
            />
            <Input
              value={nuevoEfectoTexto}
              onChange={(e) => setNuevoEfectoTexto(e.target.value)}
              placeholder="3. Efecto o impacto..."
              className="h-8 text-xs"
            />
            <Input
              value={nuevaSolucionTexto}
              onChange={(e) => setNuevaSolucionTexto(e.target.value)}
              placeholder="4. Solución propuesta..."
              className="h-8 text-xs"
            />
            <Input
              value={nuevoFinTexto}
              onChange={(e) => setNuevoFinTexto(e.target.value)}
              placeholder="5. Resultado / Fin esperado..."
              className="h-8 text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Input
                value={nuevaEntidadTexto}
                onChange={(e) => setNuevaEntidadTexto(e.target.value)}
                placeholder="6. Entidad..."
                className="h-8 text-xs flex-1"
              />
              <Button
                variant="default"
                size="sm"
                type="button"
                onClick={registrarCadenaCompletaEnMatriz}
                className="h-8 px-3 text-xs shrink-0"
              >
                Registrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros Pro y Búsqueda en Vivo */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5">
        {/* Buscador de texto en vivo */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-[var(--text-tertiary)]" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, mesa, problema, causa, efecto, solución, lugar o facilitador..."
            className="h-8 pl-8 pr-8 text-xs"
            aria-label="Buscar en la matriz"
          />
          {busqueda && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-1 top-1 size-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Filtro por Estado */}
        <div className="w-[140px]">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              <SelectItem value="EN_CURSO">En curso / Activas</SelectItem>
              <SelectItem value="PROGRAMADA">Programadas</SelectItem>
              <SelectItem value="CERRADA">Completadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Dimensión ONU */}
        <div className="w-[190px]">
          <Select value={filtroDimension} onValueChange={setFiltroDimension}>
            <SelectTrigger className="h-8 text-xs">
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

        {/* Botón para abrir ficha de mesa seleccionada */}
        {mesaActivaObj && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => onAbrirMesa(mesaActivaObj.id)}
            className="h-8 gap-1.5 text-xs text-[var(--ember)] border-[var(--border)]"
            title={`Abrir panel de gestión para ${mesaActivaObj.codigoOficial || mesaActivaObj.nombre}`}
          >
            <ExternalLink className="size-3" />
            <span>
              Abrir {mesaActivaObj.codigoOficial || mesaActivaObj.shortcodeCiudadano || mesaActivaObj.id.slice(0, 8)}
            </span>
          </Button>
        )}
      </div>

      {/* Contenedor RevoGrid Pro */}
      <div
        ref={gridContainerRef}
        data-testid="revogrid-catalogo-container"
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
            "--rg-theme-header-height": "36px",
            height: "560px",
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
          range={true}
          resize={true}
          canFocus={true}
          useClipboard={true}
          rowHeaders={true}
          autoSizeColumn={true}
          theme="default"
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      {/* Pie informativo con atajos y guía de edición */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[var(--text-tertiary)] px-1">
        <span className="flex items-center gap-1.5">
          <Info className="size-3.5 shrink-0" />
          {readOnly
            ? "Modo consulta: selecciona celdas o rangos con Ctrl+C para copiar a Excel."
            : "Haz doble clic en cualquier celda para editar problemas, causas, efectos y soluciones propuestas, o usa los botones superiores (+ Problema, + Causa, + Efecto, + Solución)."}
        </span>

        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
          <CheckCircle2 className="size-3 text-[var(--success)]" />
          Matriz Multiproblema RevoGrid activa con sincronización automática de árboles MGA
        </span>
      </div>
    </div>
  );
}
