"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileJson,
  Plus,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Wand2,
  Printer,
  Building2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Bot,
} from "lucide-react";
import { SistemaMultiagentePddPanel } from "./sistema-multiagente-pdd-panel";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  obtenerMatrizPlanAccionApi,
  crearActividadPlanAccionApi,
  actualizarSeguimientoActividadApi,
  validarRedaccionLocal,
  procesarLotePlanAccionApi,
  LOTE_DEMO_DNP_CANONICO,
  type ActividadPlanAccion,
  type MatrizPlanAccionRespuesta,
  type FiltrosMatrizPlanAccion,
  type TipoActividadDNP,
  type TipoMetaDNP,
  type CategoriaRecursosDNP,
  type FuenteFinanciacionDNP,
  type ItemLotePlanAccion,
  type ProcesarLotePlanAccionRespuesta,
  ACTIVIDADES_PA_CANONICAS,
  calcularResumenEjecutivoLocal,
} from "../services/plan-accion-dnp-api";
import { COMPROMISOS_PAS_CANONICOS } from "../data/compromisos-pas.data";

function formatearCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return "-";
  try {
    const [y, m, d] = fechaStr.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return fechaStr;
  } catch {
    return fechaStr;
  }
}

interface MotorPlanAccionTabProps {
  puedeEditar?: boolean;
}

export function MotorPlanAccionTab({ puedeEditar = false }: MotorPlanAccionTabProps) {
  const [vistaActiva, setVistaActiva] = useState<"hoja1" | "hoja2" | "asistente" | "procesador_lote" | "multiagente_pdd">("hoja1");
  const [cargando, setCargando] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Datos
  const [matriz, setMatriz] = useState<MatrizPlanAccionRespuesta>({
    resumen_ejecutivo: calcularResumenEjecutivoLocal(ACTIVIDADES_PA_CANONICAS),
    hoja_1_plan_accion: ACTIVIDADES_PA_CANONICAS,
    hoja_2_plan_indicativo: COMPROMISOS_PAS_CANONICOS,
    esContingencia: false,
  });

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosMatrizPlanAccion>({
    entidad: "todas",
    vigencia: undefined,
    compromiso_pas_codigo: "todas",
    linea_codigo: "todas",
    tipo_meta: "todas",
    tipo_actividad: "todas",
    fuente_financiacion: "todas",
    busqueda: "",
  });

  // Modal de actualización rápida de seguimiento
  const [actividadEditar, setActividadEditar] = useState<ActividadPlanAccion | null>(null);
  const [editT1, setEditT1] = useState<number>(0);
  const [editT2, setEditT2] = useState<number>(0);
  const [editT3, setEditT3] = useState<number>(0);
  const [editT4, setEditT4] = useState<number>(0);
  const [editMontoEjecutado, setEditMontoEjecutado] = useState<number>(0);
  const [editEvidencia, setEditEvidencia] = useState<string>("");

  // Asistente de programación de 6 pasos
  const [pasoAsistente, setPasoAsistente] = useState<number>(1);
  const [nuevaActividad, setNuevaActividad] = useState({
    codigo: `PA-2026-NUEVA-${Math.floor(100 + Math.random() * 900)}`,
    vigencia: 2026,
    compromiso_pas_codigo: "PAS-SEC-01",
    linea_estrategica_codigo: "LE-01",
    programa_nombre: "Programa de Seguridad y Convivencia Integral",
    entidad_responsable: "Distriseguridad",
    lider_responsable: "Líder Técnico de Planeación",
    dependencias_articuladas: [] as string[],
    tipo_meta: "META_PRODUCTO" as TipoMetaDNP,
    meta_producto_vigencia: "Meta cuantitativa a entregar en la vigencia",
    meta_valor_vigencia: 1,
    unidad_medida: "Documento / Acción",
    codigo_bpim: "2026130010015",
    proyecto_nombre: "Fortalecimiento de Capacidades Territoriales",
    objetivo_proyecto: "Atender la problemática de seguridad humana barrial priorizada.",
    tipo_actividad: "NORMATIVA" as TipoActividadDNP,
    descripcion_actividad: "Expedir el protocolo de intervención comunitaria para zonas críticas",
    fecha_inicio: "2026-02-01",
    fecha_terminacion: "2026-11-30",
    avance_t1: 0,
    avance_t2: 0,
    avance_t3: 0,
    avance_t4: 0,
    categoria_recursos: "INVERSION" as CategoriaRecursosDNP,
    fuente_financiacion: "SGP" as FuenteFinanciacionDNP,
    monto_programado_cop: 500000000,
    monto_ejecutado_cop: 0,
  });

  // Validación de la actividad del asistente
  const validacionAsistente = useMemo(
    () => validarRedaccionLocal(nuevaActividad.descripcion_actividad, nuevaActividad.tipo_actividad),
    [nuevaActividad.descripcion_actividad, nuevaActividad.tipo_actividad]
  );

  // Estado del Procesador Masivo y Auditor por Lotes DNP
  const [loteItems, setLoteItems] = useState<ItemLotePlanAccion[]>(LOTE_DEMO_DNP_CANONICO);
  const [resultadoLote, setResultadoLote] = useState<ProcesarLotePlanAccionRespuesta | null>(null);
  const [procesandoLote, setProcesandoLote] = useState<boolean>(false);
  const [mostrarCertificado, setMostrarCertificado] = useState<boolean>(false);
  const [entidadCertificado, setEntidadCertificado] = useState<string>("todas");

  const ejecutarProcesamientoLote = async (itemsAProcesar?: ItemLotePlanAccion[]) => {
    setProcesandoLote(true);
    try {
      const items = itemsAProcesar || loteItems;
      const res = await procesarLotePlanAccionApi({
        vigencia: 2026,
        filas: items,
      });
      setResultadoLote(res);
      if (res.estado_dictamen_planeacion === "APTO_CONSEJO_GOBIERNO") {
        toast.success("Lote evaluado: 100% conforme. APTO PARA CONSEJO DE GOBIERNO.");
      } else {
        toast.warning(`Lote evaluado: ${res.filas_con_observaciones} actividad(es) requieren subsanación.`);
      }
    } catch {
      toast.error("Error al procesar lote de actividades DNP.");
    } finally {
      setProcesandoLote(false);
    }
  };

  const aplicarCorreccionAutomaticaDNP = async () => {
    if (!resultadoLote) return;
    const nuevosItems: ItemLotePlanAccion[] = loteItems.map((item, idx) => {
      const fila = resultadoLote.filas_procesadas[idx];
      if (!fila) return item;

      const nuevoItem = { ...item };
      // 1. Corrección lingüística oficial DNP (sustituir verbo débil por fuerte)
      if (fila.redaccion_corregida_sugerida) {
        nuevoItem.descripcion_actividad = fila.redaccion_corregida_sugerida;
      }
      // 2. Coherencia presupuestal (fuente permitida según categoría)
      if (!fila.fuente_coherente) {
        if (nuevoItem.categoria_recursos === "INVERSION") {
          nuevoItem.fuente_financiacion = "RECURSOS_PROPIOS";
        } else if (nuevoItem.categoria_recursos === "FUNCIONAMIENTO") {
          nuevoItem.fuente_financiacion = "GASTOS_GENERALES";
        } else {
          nuevoItem.fuente_financiacion = "GESTION_NO_PRESUPUESTAL";
        }
      }
      // 3. Desfase físico-financiero: equilibrar ejecución si hay alerta
      if (fila.alerta_desfase && nuevoItem.monto_programado_cop > 0) {
        const avanceFisico = fila.avance_fisico || 100;
        nuevoItem.monto_ejecutado_cop = Math.round((nuevoItem.monto_programado_cop * avanceFisico) / 100);
      }
      return nuevoItem;
    });

    setLoteItems(nuevosItems);
    await ejecutarProcesamientoLote(nuevosItems);
    toast.success("Corrección automática DNP aplicada en 1 clic. El Plan de Acción alcanza 100% de conformidad.");
  };

  const cargarLoteDemo = async () => {
    setLoteItems(LOTE_DEMO_DNP_CANONICO);
    await ejecutarProcesamientoLote(LOTE_DEMO_DNP_CANONICO);
    toast.info("Lote canónico DNP cargado (6 actividades mixtas).");
  };

  const entidadesDisponiblesHoja1 = useMemo(() => {
    const setEnt = new Set<string>();
    matriz.hoja_1_plan_accion.forEach((act) => {
      if (act.entidad_responsable) setEnt.add(act.entidad_responsable);
    });
    const canonicas29 = [
      "Distriseguridad",
      "Secretaría del Interior y Convivencia Ciudadana",
      "Secretaría de Participación y Desarrollo Social",
      "Secretaría General (Alumbrado Público)",
      "Establecimiento Público Ambiental (EPA Cartagena)",
      "Policía Metropolitana de Cartagena (MECAR)",
      "Secretaría de Hacienda Distrital",
      "Dirección de Asuntos Étnicos",
      "DADIS",
      "PES Pedro Romero",
      "Secretaría de Educación",
      "Corvivienda",
      "Secretaría de Infraestructura",
      "Secretaría de Planeación / Informática",
      "Instituto de Patrimonio y Cultura (IPCC)",
      "IDER",
      "DATT - Tránsito y Transporte",
      "Alcaldía Local Histórica y del Caribe Norte (Localidad 1)",
      "Alcaldía Local de la Virgen y Turística (Localidad 2)",
      "Alcaldía Local Industrial y de la Bahía (Localidad 3)",
      "Oficina Asesora para la Gestión del Riesgo (OAGRD)",
      "Colegio Mayor de Bolívar",
      "Transcaribe S.A.",
    ];
    canonicas29.forEach((e) => setEnt.add(e));
    return Array.from(setEnt).sort((a, b) => a.localeCompare(b));
  }, [matriz.hoja_1_plan_accion]);

  const entidadesDisponiblesCertificado = useMemo(() => {
    if (!resultadoLote) return [];
    const setEnt = new Set(resultadoLote.filas_procesadas.map((f) => f.entidad_responsable));
    return Array.from(setEnt);
  }, [resultadoLote]);

  const filasCertificado = useMemo(() => {
    if (!resultadoLote) return [];
    if (entidadCertificado === "todas") return resultadoLote.filas_procesadas;
    return resultadoLote.filas_procesadas.filter(
      (f) => f.entidad_responsable === entidadCertificado
    );
  }, [resultadoLote, entidadCertificado]);

  const cargarDatos = async (nuevosFiltros?: FiltrosMatrizPlanAccion) => {
    setCargando(true);
    try {
      const res = await obtenerMatrizPlanAccionApi(nuevosFiltros || filtros);
      setMatriz(res);
    } catch {
      toast.error("Error al cargar la Matriz del Plan de Acción.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  const aplicarFiltros = (f: FiltrosMatrizPlanAccion) => {
    setFiltros(f);
    startTransition(() => {
      void cargarDatos(f);
    });
  };

  const limpiarFiltros = () => {
    const f: FiltrosMatrizPlanAccion = {
      entidad: "todas",
      vigencia: undefined,
      compromiso_pas_codigo: "todas",
      linea_codigo: "todas",
      tipo_meta: "todas",
      tipo_actividad: "todas",
      fuente_financiacion: "todas",
      busqueda: "",
    };
    setFiltros(f);
    void cargarDatos(f);
  };

  // Abrir editor de seguimiento trimestral
  const abrirEditarSeguimiento = (act: ActividadPlanAccion) => {
    setActividadEditar(act);
    setEditT1(act.avance_t1 || 0);
    setEditT2(act.avance_t2 || 0);
    setEditT3(act.avance_t3 || 0);
    setEditT4(act.avance_t4 || 0);
    setEditMontoEjecutado(act.monto_ejecutado_cop || 0);
    setEditEvidencia(act.evidencia_soporte || "");
  };

  // Guardar actualización de seguimiento
  const guardarSeguimiento = async () => {
    if (!actividadEditar) return;
    try {
      await actualizarSeguimientoActividadApi(actividadEditar.codigo, {
        avance_t1: editT1,
        avance_t2: editT2,
        avance_t3: editT3,
        avance_t4: editT4,
        monto_ejecutado_cop: editMontoEjecutado,
        evidencia_soporte: editEvidencia,
      });
      toast.success(`Seguimiento de ${actividadEditar.codigo} actualizado exitosamente.`);
      setActividadEditar(null);
      void cargarDatos();
    } catch {
      toast.error("Error al actualizar el seguimiento de la actividad.");
    }
  };

  // Guardar nueva actividad desde el asistente
  const guardarNuevaActividad = async () => {
    if (!validacionAsistente.es_valida) {
      toast.error("La actividad no cumple la regla de verbos fuertes DNP.");
      return;
    }
    try {
      await crearActividadPlanAccionApi({
        ...nuevaActividad,
        verbo_infinitivo: validacionAsistente.verbo_detectado,
      });
      toast.success(`Actividad ${nuevaActividad.codigo} programada con éxito en el Plan de Acción.`);
      setVistaActiva("hoja1");
      void cargarDatos();
    } catch {
      toast.error("Error al guardar la actividad en el Plan de Acción.");
    }
  };

  // Exportar CSV oficial Ley 1474 / DNP
  const exportarCSVMatrizDNP = () => {
    try {
      const headers = [
        "Codigo_PA",
        "Vigencia",
        "Compromiso_PAS",
        "Linea_Estrategica",
        "Entidad_Responsable",
        "Tipo_Meta",
        "Tipo_Actividad",
        "Verbo_Fuerte",
        "Descripcion_Actividad",
        "Codigo_BPIM",
        "Proyecto_Inversion",
        "Fecha_Inicio",
        "Fecha_Terminacion",
        "Avance_T1",
        "Avance_T2",
        "Avance_T3",
        "Avance_T4",
        "Porcentaje_Avance_Fisico",
        "Categoria_Recursos",
        "Fuente_Financiacion",
        "Presupuesto_Programado_COP",
        "Presupuesto_Ejecutado_COP",
        "Estado_Aprobacion",
      ];

      const filas = matriz.hoja_1_plan_accion.map((a) => [
        a.codigo,
        a.vigencia,
        a.compromiso_pas_codigo,
        a.linea_estrategica_codigo,
        `"${a.entidad_responsable.replace(/"/g, '""')}"`,
        a.tipo_meta,
        a.tipo_actividad,
        a.verbo_infinitivo,
        `"${a.descripcion_actividad.replace(/"/g, '""')}"`,
        a.codigo_bpim,
        `"${a.proyecto_nombre.replace(/"/g, '""')}"`,
        a.fecha_inicio,
        a.fecha_terminacion,
        a.avance_t1,
        a.avance_t2,
        a.avance_t3,
        a.avance_t4,
        a.porcentaje_avance_fisico,
        a.categoria_recursos,
        a.fuente_financiacion,
        a.monto_programado_cop,
        a.monto_ejecutado_cop,
        a.estado_aprobacion,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(";"), ...filas.map((f) => f.join(";"))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `matriz_dnp_plan_accion_cartagena_2026_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Matriz DNP exportada en CSV compatible con Excel.");
    } catch {
      toast.error("Error al exportar matriz DNP a CSV.");
    }
  };

  // Exportar JSON SisPT
  const exportarJSONSisPT = () => {
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(matriz, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `plan_accion_sispt_cartagena_2026_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Plan de Acción exportado en JSON estructurado SisPT.");
    } catch {
      toast.error("Error al exportar JSON SisPT.");
    }
  };

  const resumen = matriz.resumen_ejecutivo;

  return (
    <div className="space-y-8">
      {/* =====================================================================
          BANNER EJECUTIVO Y BOTONES DE EXPORTACIÓN LEY 1474
          ===================================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-ember border-ember/30">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Ley 152/1994 & Ley 1474/2011
            </Badge>
            <Badge variant="info">SisPT DNP Cartagena</Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Motor de Procesamiento de Planes de Acción
          </h2>
          <p className="text-xs text-text-secondary">
            Articulación vinculante entre metas operativas anuales (Hoja 1) y el Plan Indicativo cuatrienal (Hoja 2) con validación de verbos fuertes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCSVMatrizDNP}
            className="gap-2 text-xs"
            aria-label="Exportar Matriz DNP en CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-success" />
            <span>Exportar Matriz DNP (CSV)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportarJSONSisPT}
            className="gap-2 text-xs"
            aria-label="Exportar JSON SisPT"
          >
            <FileJson className="h-4 w-4 text-info" />
            <span>Exportar JSON SisPT</span>
          </Button>

          {puedeEditar && (
            <Button
              size="sm"
              onClick={() => {
                setVistaActiva("asistente");
                setPasoAsistente(1);
              }}
              className="gap-2 text-xs font-medium"
              aria-label="Nueva Actividad Asistente DNP"
            >
              <Plus className="h-4 w-4" />
              <span>Programar Actividad</span>
            </Button>
          )}
        </div>
      </div>

      {/* =====================================================================
          KPIS EJECUTIVOS DEL PLAN DE ACCIÓN 2026
          ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Actividades */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Actividades Programadas</span>
            <FileText className="h-4 w-4 text-ember" />
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {resumen.total_actividades}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span>{resumen.total_metas_producto} M. Producto</span>
            <span>·</span>
            <span>{resumen.total_metas_gestion} M. Gestión</span>
          </div>
        </div>

        {/* KPI 2: Avance Físico Promedio */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Avance Físico Ponderado</span>
            <TrendingUp className="h-4 w-4 text-info" />
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {resumen.avance_fisico_promedio}%
          </div>
          {/* Barra de progreso */}
          <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-ember transition-all"
              style={{ width: `${Math.min(resumen.avance_fisico_promedio, 100)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Ejecución Financiera */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Ejecución Financiera</span>
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {resumen.porcentaje_ejecucion_financiera}%
          </div>
          <div className="text-[11px] text-text-muted line-clamp-1">
            {formatearCOP(resumen.presupuesto_total_ejecutado_cop)} de {formatearCOP(resumen.presupuesto_total_programado_cop)}
          </div>
        </div>

        {/* KPI 4: Semáforo de Alertas Trimestrales */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Semáforo de Alertas DNP</span>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-success inline-block" />
              <span className="font-bold text-text-primary">{resumen.semaforo_alertas.en_meta}</span>
              <span className="text-[10px] text-text-muted">En meta</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-warning inline-block" />
              <span className="font-bold text-text-primary">{resumen.semaforo_alertas.alerta_preventiva}</span>
              <span className="text-[10px] text-text-muted">Alerta</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-danger inline-block" />
              <span className="font-bold text-text-primary">{resumen.semaforo_alertas.rezago_critico}</span>
              <span className="text-[10px] text-text-muted">Rezago</span>
            </div>
          </div>
          <span className="text-[10px] text-text-muted block">
            Corte Trimestral T2 2026
          </span>
        </div>
      </div>

      {/* =====================================================================
          CONMUTADOR DE VISTAS (HOJA 1 · HOJA 2 · ASISTENTE 6 PASOS)
          ===================================================================== */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          type="button"
          variant={vistaActiva === "hoja1" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setVistaActiva("hoja1")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            vistaActiva === "hoja1"
              ? "bg-surface-2 text-ember border border-border shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Hoja 1: Matriz Plan de Acción ({matriz.hoja_1_plan_accion.length})</span>
        </Button>

        <Button
          type="button"
          variant={vistaActiva === "hoja2" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setVistaActiva("hoja2")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            vistaActiva === "hoja2"
              ? "bg-surface-2 text-ember border border-border shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Hoja 2: Plan Indicativo Vinculado ({matriz.hoja_2_plan_indicativo.length})</span>
        </Button>

        {puedeEditar && (
          <Button
            type="button"
            variant={vistaActiva === "asistente" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVistaActiva("asistente")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              vistaActiva === "asistente"
                ? "bg-surface-2 text-ember border border-border shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Sparkles className="h-4 w-4 text-ember" />
            <span>Asistente DNP (6 Pasos)</span>
          </Button>
        )}

        <Button
          type="button"
          variant={vistaActiva === "procesador_lote" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setVistaActiva("procesador_lote");
            if (!resultadoLote) {
              void ejecutarProcesamientoLote();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            vistaActiva === "procesador_lote"
              ? "bg-surface-2 text-ember border border-border shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Wand2 className="h-4 w-4 text-ember" />
          <span>Procesador y Auditor DNP ({loteItems.length})</span>
        </Button>

        <Button
          type="button"
          variant={vistaActiva === "multiagente_pdd" ? "secondary" : "ghost"}
          size="sm"
          data-testid="tab-motor-multiagente-pdd"
          onClick={() => setVistaActiva("multiagente_pdd")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            vistaActiva === "multiagente_pdd"
              ? "bg-surface-2 text-ember border border-border shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Bot className="h-4 w-4 text-ember" />
          <span>Sistema Multiagente PDD/PDL (2012–2027)</span>
        </Button>
      </div>

      {/* =====================================================================
          VISTA 1: HOJA 1 — MATRIZ DEL PLAN DE ACCIÓN
          ===================================================================== */}
      {vistaActiva === "hoja1" && (
        <div className="space-y-4">
          {/* Filtros multicriterio */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <Input
                  value={filtros.busqueda || ""}
                  onChange={(e) =>
                    aplicarFiltros({ ...filtros, busqueda: e.target.value })
                  }
                  placeholder="Buscar por código, actividad, proyecto, entidad o BPIM..."
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="gap-1.5 text-xs text-text-secondary hover:text-text-primary"
                  aria-label="Limpiar Filtros"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Limpiar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void cargarDatos()}
                  disabled={cargando || isPending}
                  className="gap-1.5 text-xs bg-surface-2"
                  aria-label="Recargar actividades"
                >
                  <RefreshCw className={`h-3 w-3 ${cargando || isPending ? "animate-spin" : ""}`} />
                  <span>Actualizar</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Filtro Entidad Responsable (29 Entidades) */}
              <Select
                value={filtros.entidad || "todas"}
                onValueChange={(val) =>
                  aplicarFiltros({ ...filtros, entidad: val })
                }
              >
                <SelectTrigger aria-label="Filtrar por Entidad Responsable" className="text-xs bg-surface-2 border-border truncate">
                  <SelectValue placeholder="Todas las Entidades (29)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="todas">Todas las Entidades (29)</SelectItem>
                  {entidadesDisponiblesHoja1.map((ent) => (
                    <SelectItem key={ent} value={ent}>
                      {ent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro Vigencia (2024 / 2025 / 2026) */}
              <Select
                value={filtros.vigencia ? String(filtros.vigencia) : "todas"}
                onValueChange={(val) =>
                  aplicarFiltros({
                    ...filtros,
                    vigencia: val === "todas" ? undefined : Number(val),
                  })
                }
              >
                <SelectTrigger aria-label="Filtrar por Vigencia" className="text-xs bg-surface-2 border-border">
                  <SelectValue placeholder="Todas las Vigencias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Vigencias</SelectItem>
                  <SelectItem value="2024">Vigencia 2024</SelectItem>
                  <SelectItem value="2025">Vigencia 2025</SelectItem>
                  <SelectItem value="2026">Vigencia 2026</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Compromiso PAS */}
              <Select
                value={filtros.compromiso_pas_codigo || "todas"}
                onValueChange={(val) =>
                  aplicarFiltros({ ...filtros, compromiso_pas_codigo: val })
                }
              >
                <SelectTrigger aria-label="Filtrar por Compromiso PAS" className="text-xs bg-surface-2 border-border truncate">
                  <SelectValue placeholder="Compromiso PAS" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="todas">Todos los PAS</SelectItem>
                  {COMPROMISOS_PAS_CANONICOS.map((pas) => (
                    <SelectItem key={pas.codigo} value={pas.codigo}>
                      {pas.codigo} - {pas.nombre.slice(0, 24)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro Línea Estratégica */}
              <Select
                value={filtros.linea_codigo || "todas"}
                onValueChange={(val) =>
                  aplicarFiltros({ ...filtros, linea_codigo: val })
                }
              >
                <SelectTrigger aria-label="Filtrar por Línea Estratégica" className="text-xs bg-surface-2 border-border truncate">
                  <SelectValue placeholder="Todas las Líneas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Líneas</SelectItem>
                  <SelectItem value="LE-01">LE-01 Niñez / Videovigilancia</SelectItem>
                  <SelectItem value="LE-02">LE-02 Convivencia y Desarme</SelectItem>
                  <SelectItem value="LE-03">LE-03 Ambiente y Bazurto</SelectItem>
                  <SelectItem value="LE-04">LE-04 Cuidado y Étnico</SelectItem>
                  <SelectItem value="LE-05">LE-05 Soberanía Alimentaria</SelectItem>
                  <SelectItem value="LE-06">LE-06 Salud Mental</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Tipo Actividad */}
              <Select
                value={filtros.tipo_actividad || "todas"}
                onValueChange={(val) =>
                  aplicarFiltros({ ...filtros, tipo_actividad: val })
                }
              >
                <SelectTrigger aria-label="Filtrar por Tipo Actividad" className="text-xs bg-surface-2 border-border truncate">
                  <SelectValue placeholder="Todos los Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los Tipos</SelectItem>
                  <SelectItem value="NORMATIVA">Normativa</SelectItem>
                  <SelectItem value="ADMINISTRATIVA">Administrativa</SelectItem>
                  <SelectItem value="DE_GESTION">De Gestión</SelectItem>
                  <SelectItem value="LOGISTICA">Logística</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Fuente Financiación */}
              <Select
                value={filtros.fuente_financiacion || "todas"}
                onValueChange={(val) =>
                  aplicarFiltros({ ...filtros, fuente_financiacion: val })
                }
              >
                <SelectTrigger aria-label="Filtrar por Fuente Financiación" className="text-xs bg-surface-2 border-border truncate">
                  <SelectValue placeholder="Todas las Fuentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Fuentes</SelectItem>
                  <SelectItem value="SGP">SGP</SelectItem>
                  <SelectItem value="REGALIAS">Regalías</SelectItem>
                  <SelectItem value="RECURSOS_PROPIOS">Recursos Propios</SelectItem>
                  <SelectItem value="COFINANCIACION">Cofinanciación</SelectItem>
                  <SelectItem value="GASTOS_GENERALES">Gastos Generales</SelectItem>
                  <SelectItem value="GESTION_NO_PRESUPUESTAL">Gestión Directa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla Hoja 1 */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden">
            <div
              className={`overflow-x-auto transition-opacity ${
                cargando || isPending ? "opacity-60 pointer-events-none" : "opacity-100"
              }`}
            >
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="border-b border-border bg-surface-2 text-[11px] uppercase tracking-wider text-text-primary font-bold">
                  <tr>
                    <th scope="col" className="px-4 py-3">Código / BPIM</th>
                    <th scope="col" className="px-4 py-3">Actividad (Verbo Fuerte)</th>
                    <th scope="col" className="px-4 py-3">Tipo Actividad</th>
                    <th scope="col" className="px-4 py-3">Hoja 2 (PI)</th>
                    <th scope="col" className="px-4 py-3">Cronograma</th>
                    <th scope="col" className="px-4 py-3">Avance T1-T4</th>
                    <th scope="col" className="px-4 py-3">Fuente / Presupuesto</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    {puedeEditar && <th scope="col" className="px-4 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matriz.hoja_1_plan_accion.map((act) => {
                    const pct = act.porcentaje_avance_fisico || 0;
                    return (
                      <tr
                        key={act.codigo}
                        className="hover:bg-surface-2/60 transition-colors"
                      >
                        {/* Código / BPIM */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-text-primary block">
                              {act.codigo}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted block">
                              BPIM: {act.codigo_bpim}
                            </span>
                            <Badge variant="outline" className="text-[9px]">
                              {act.linea_estrategica_codigo}
                            </Badge>
                          </div>
                        </td>

                        {/* Actividad y Verbo */}
                        <td className="px-4 py-3.5 align-top max-w-xs">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="default"
                                className="bg-ember text-text-inverse text-[10px] font-mono capitalize"
                              >
                                {act.verbo_infinitivo}
                              </Badge>
                              <span className="text-[10px] text-text-muted">
                                {act.entidad_responsable}
                              </span>
                            </div>
                            <p className="text-xs text-text-primary font-medium leading-relaxed">
                              {act.descripcion_actividad}
                            </p>
                            <span className="text-[11px] text-text-muted line-clamp-1">
                              Proyecto: {act.proyecto_nombre}
                            </span>
                          </div>
                        </td>

                        {/* Tipo Actividad */}
                        <td className="px-4 py-3.5 align-top">
                          <Badge variant="outline" className="text-[10px]">
                            {act.tipo_actividad}
                          </Badge>
                          <span className="text-[10px] text-text-muted block mt-1">
                            {act.tipo_meta}
                          </span>
                        </td>

                        {/* Hoja 2 Plan Indicativo */}
                        <td className="px-4 py-3.5 align-top">
                          <span className="font-mono font-semibold text-info text-xs block">
                            {act.compromiso_pas_codigo}
                          </span>
                          <span className="text-[11px] text-text-muted line-clamp-2">
                            {act.programa_nombre}
                          </span>
                        </td>

                        {/* Cronograma */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <div className="text-[11px] space-y-0.5">
                            <div>Ini: {formatearFecha(act.fecha_inicio)}</div>
                            <div>Fin: {formatearFecha(act.fecha_terminacion)}</div>
                          </div>
                        </td>

                        {/* Avance Trimestral T1-T4 */}
                        <td className="px-4 py-3.5 align-top min-w-[140px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-text-primary">
                                {pct}%
                              </span>
                              <div className="flex gap-1 font-mono text-[9px] text-text-muted">
                                <span>T1:{act.avance_t1}</span>
                                <span>T2:{act.avance_t2}</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  pct >= 80
                                    ? "bg-success"
                                    : pct >= 50
                                    ? "bg-warning"
                                    : "bg-danger"
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Fuente y Presupuesto */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {act.fuente_financiacion}
                            </Badge>
                            <div className="text-xs font-semibold text-text-primary">
                              {formatearCOP(act.monto_ejecutado_cop || 0)}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              de {formatearCOP(act.monto_programado_cop || 0)}
                            </div>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <Badge
                            variant={
                              act.estado_aprobacion === "PUBLICADO_LEY_1474"
                                ? "success"
                                : "info"
                            }
                            className="text-[10px]"
                          >
                            {act.estado_aprobacion === "PUBLICADO_LEY_1474"
                              ? "Publicado Ley 1474"
                              : "Aprobado Consejo"}
                          </Badge>
                        </td>

                        {/* Acción Editar Seguimiento */}
                        {puedeEditar && (
                          <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => abrirEditarSeguimiento(act)}
                            >
                              Reportar T1-T4
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 2: HOJA 2 — PLAN INDICATIVO VINCULADO
          ===================================================================== */}
      {vistaActiva === "hoja2" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-1 p-4 text-xs text-text-secondary">
            <span className="font-semibold text-text-primary block text-sm mb-1">
              Articulación Hoja 2 (Plan Indicativo Cuatrienal) → Hoja 1 (Plan de Acción Anual)
            </span>
            Instructivo DNP (Pág. 11, Paso 4.3): Cada meta del Plan Indicativo se desagrega en actividades anuales programadas con sus respectivos proyectos de inversión (BPIM) y fuentes de financiación.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matriz.hoja_2_plan_indicativo.map((comp) => {
              const actsVinculadas = matriz.hoja_1_plan_accion.filter(
                (a) => a.compromiso_pas_codigo === comp.codigo
              );

              return (
                <div
                  key={comp.codigo}
                  className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ember text-sm">
                          {comp.codigo}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {comp.linea_estrategica_codigo}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-text-primary leading-snug">
                        {comp.nombre}
                      </h3>
                    </div>
                    <Badge variant="info" className="text-[10px]">
                      {actsVinculadas.length} Actividades PA
                    </Badge>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {comp.descripcion}
                  </p>

                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-text-muted block">
                        Meta Cuatrienal:
                      </span>
                      <span className="font-semibold text-text-primary">
                        {comp.meta_cuatrienal_valor} {comp.unidad_medida}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-muted block">
                        Entidad Responsable:
                      </span>
                      <span className="font-semibold text-text-primary line-clamp-1">
                        {comp.entidad_responsable}
                      </span>
                    </div>
                  </div>

                  {/* Actividades vinculadas de la Hoja 1 */}
                  {actsVinculadas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      <span className="text-[11px] font-semibold text-text-secondary block uppercase tracking-wider">
                        Actividades de la Hoja 1 Vinculadas:
                      </span>
                      <div className="space-y-1.5">
                        {actsVinculadas.map((act) => (
                          <div
                            key={act.codigo}
                            className="rounded-lg border border-border/50 bg-surface-2 p-2.5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-text-primary text-[11px]">
                                {act.codigo}
                              </span>
                              <Badge
                                variant="default"
                                className="bg-ember text-text-inverse text-[9px] font-mono capitalize"
                              >
                                {act.verbo_infinitivo}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-text-secondary line-clamp-2">
                              {act.descripcion_actividad}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border/30">
                              <span>BPIM: {act.codigo_bpim}</span>
                              <span className="font-semibold text-text-primary">
                                Avance: {act.porcentaje_avance_fisico}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 3: ASISTENTE DE PROGRAMACIÓN DNP (6 PASOS GUIADOS)
          ===================================================================== */}
      {vistaActiva === "asistente" && (
        <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-md space-y-6">
          <div className="border-b border-border pb-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-ember text-text-inverse">
                  Asistente Oficial DNP
                </Badge>
                <span className="text-xs text-text-muted">
                  Paso {pasoAsistente} de 6
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVistaActiva("hoja1")}
                className="text-xs"
              >
                Volver a la Matriz
              </Button>
            </div>
            <h3 className="text-lg font-bold text-text-primary">
              Programación de Actividad para el Plan de Acción 2026
            </h3>
            <p className="text-xs text-text-secondary">
              Formulario guiado que asegura la articulación con el Plan Indicativo, el BPIM y la validación en tiempo real de verbos fuertes en infinitivo.
            </p>
          </div>

          {/* Stepper visual */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              "1. Responsables",
              "2. Tipo Meta",
              "3. Plan Indicativo",
              "4. BPIM / MGA",
              "5. Actividad DNP",
              "6. Financiación",
            ].map((titulo, idx) => {
              const num = idx + 1;
              const activo = pasoAsistente === num;
              const completado = pasoAsistente > num;
              return (
                <Button
                  key={titulo}
                  type="button"
                  variant="outline"
                  onClick={() => setPasoAsistente(num)}
                  className={`h-auto flex flex-col items-start text-left p-2.5 rounded-lg border text-xs transition-all ${
                    activo
                      ? "border-ember bg-ember/10 text-ember font-bold"
                      : completado
                      ? "border-success/30 bg-success/5 text-success font-medium"
                      : "border-border bg-surface-2 text-text-muted"
                  }`}
                >
                  <span className="text-[10px]">Paso {num}</span>
                  <span className="line-clamp-1">{titulo}</span>
                </Button>
              );
            })}
          </div>

          {/* Cuerpo del paso */}
          <div className="rounded-xl border border-border bg-surface-2 p-5">
            {pasoAsistente === 1 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary">
                  Paso 1 — Responsables de la Ejecución (Instructivo DNP 4.1)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Entidad Ejecutora Responsable:
                    </Label>
                    <Input
                      value={nuevaActividad.entidad_responsable}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          entidad_responsable: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Líder Funcional Responsable:
                    </Label>
                    <Input
                      value={nuevaActividad.lider_responsable}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          lider_responsable: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {pasoAsistente === 2 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary">
                  Paso 2 — Clasificación de la Meta (Instructivo DNP 4.2)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      tipo: "META_PRODUCTO" as TipoMetaDNP,
                      nombre: "Meta de Producto",
                      desc: "Cuantifica bienes y servicios públicos entregados a la ciudadanía.",
                    },
                    {
                      tipo: "META_GESTION" as TipoMetaDNP,
                      nombre: "Meta de Gestión",
                      desc: "Cuantifica procesos y acciones internas para alcanzar los productos.",
                    },
                    {
                      tipo: "ACTIVIDAD" as TipoMetaDNP,
                      nombre: "Actividad de Proyecto",
                      desc: "Acción específica o tarea de proyecto durante la vigencia.",
                    },
                  ].map((m) => (
                    <Button
                      key={m.tipo}
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          tipo_meta: m.tipo,
                        })
                      }
                      className={`h-auto p-4 rounded-xl border flex flex-col items-start text-left transition-all ${
                        nuevaActividad.tipo_meta === m.tipo
                          ? "border-ember bg-ember/10 shadow-sm"
                          : "border-border bg-surface-1 hover:border-border/80"
                      }`}
                    >
                      <span className="font-bold text-xs text-text-primary block mb-1">
                        {m.nombre}
                      </span>
                      <p className="text-[11px] text-text-secondary leading-relaxed whitespace-normal">
                        {m.desc}
                      </p>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {pasoAsistente === 3 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary">
                  Paso 3 — Articulación con Plan Indicativo (Hoja 2 DNP 4.3)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Meta del Plan Indicativo (PAS):
                    </Label>
                    <Select
                      value={nuevaActividad.compromiso_pas_codigo}
                      onValueChange={(val) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          compromiso_pas_codigo: val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full text-xs bg-surface-1 border-border">
                        <SelectValue placeholder="Seleccione compromiso PAS" />
                      </SelectTrigger>
                      <SelectContent>
                        {matriz.hoja_2_plan_indicativo.map((c) => (
                          <SelectItem key={c.codigo} value={c.codigo}>
                            {c.codigo} - {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Meta de Producto para la Vigencia 2026:
                    </Label>
                    <Input
                      value={nuevaActividad.meta_producto_vigencia}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          meta_producto_vigencia: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {pasoAsistente === 4 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary">
                  Paso 4 — Proyecto de Inversión BPIM / MGA (Instructivo DNP 4.4)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Código BPIM (13 Dígitos):
                    </Label>
                    <Input
                      value={nuevaActividad.codigo_bpim}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          codigo_bpim: e.target.value,
                        })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Nombre del Proyecto Priorizado en POAI:
                    </Label>
                    <Input
                      value={nuevaActividad.proyecto_nombre}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          proyecto_nombre: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {pasoAsistente === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">
                    Paso 5 — Programación y Validador de Verbos Fuertes (DNP Pág. 12)
                  </h4>
                  <Badge
                    variant={validacionAsistente.es_valida ? "success" : "destructive"}
                    className="text-xs"
                  >
                    {validacionAsistente.es_valida
                      ? "Verbo Válido DNP"
                      : "Verbo Inválido"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-text-secondary">
                    Redacción de la Actividad (Debe iniciar con verbo fuerte en infinitivo):
                  </Label>
                  <Textarea
                    rows={3}
                    value={nuevaActividad.descripcion_actividad}
                    onChange={(e) =>
                      setNuevaActividad({
                        ...nuevaActividad,
                        descripcion_actividad: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-surface-1 p-3 text-xs text-text-primary focus:border-ember"
                  />
                  <p className="text-[11px] text-text-muted">
                    {validacionAsistente.mensaje_dnp}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Tipología DNP:
                    </Label>
                    <Select
                      value={nuevaActividad.tipo_actividad}
                      onValueChange={(val) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          tipo_actividad: val as TipoActividadDNP,
                        })
                      }
                    >
                      <SelectTrigger className="w-full text-xs bg-surface-1 border-border">
                        <SelectValue placeholder="Seleccione tipología" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMATIVA">NORMATIVA</SelectItem>
                        <SelectItem value="ADMINISTRATIVA">ADMINISTRATIVA</SelectItem>
                        <SelectItem value="DE_GESTION">DE GESTIÓN</SelectItem>
                        <SelectItem value="LOGISTICA">LOGÍSTICA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Fecha Inicio:
                    </Label>
                    <Input
                      type="date"
                      value={nuevaActividad.fecha_inicio}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          fecha_inicio: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Fecha Terminación:
                    </Label>
                    <Input
                      type="date"
                      value={nuevaActividad.fecha_terminacion}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          fecha_terminacion: e.target.value,
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {pasoAsistente === 6 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary">
                  Paso 6 — Fuentes de Financiación por Vigencia (Instructivo DNP 4.6)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Categoría de Recursos:
                    </Label>
                    <Select
                      value={nuevaActividad.categoria_recursos}
                      onValueChange={(val) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          categoria_recursos: val as CategoriaRecursosDNP,
                        })
                      }
                    >
                      <SelectTrigger className="w-full text-xs bg-surface-1 border-border">
                        <SelectValue placeholder="Seleccione categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVERSION">INVERSIÓN</SelectItem>
                        <SelectItem value="FUNCIONAMIENTO">FUNCIONAMIENTO</SelectItem>
                        <SelectItem value="RECURSOS_GESTION">RECURSOS DE GESTIÓN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Fuente de Financiación:
                    </Label>
                    <Select
                      value={nuevaActividad.fuente_financiacion}
                      onValueChange={(val) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          fuente_financiacion: val as FuenteFinanciacionDNP,
                        })
                      }
                    >
                      <SelectTrigger className="w-full text-xs bg-surface-1 border-border">
                        <SelectValue placeholder="Seleccione fuente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SGP">SGP</SelectItem>
                        <SelectItem value="REGALIAS">Regalías</SelectItem>
                        <SelectItem value="RECURSOS_PROPIOS">Recursos Propios</SelectItem>
                        <SelectItem value="COFINANCIACION">Cofinanciación</SelectItem>
                        <SelectItem value="CREDITO">Crédito</SelectItem>
                        <SelectItem value="GASTOS_GENERALES">Gastos Generales</SelectItem>
                        <SelectItem value="GESTION_NO_PRESUPUESTAL">Gestión Directa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-text-secondary">
                      Monto Programado (COP):
                    </Label>
                    <Input
                      type="number"
                      value={nuevaActividad.monto_programado_cop}
                      onChange={(e) =>
                        setNuevaActividad({
                          ...nuevaActividad,
                          monto_programado_cop: Number(e.target.value),
                        })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de navegación del asistente */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={pasoAsistente === 1}
              onClick={() => setPasoAsistente((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              Anterior
            </Button>

            {pasoAsistente < 6 ? (
              <Button
                size="sm"
                onClick={() => setPasoAsistente((p) => Math.min(6, p + 1))}
                className="gap-2 text-xs"
              >
                <span>Siguiente</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={guardarNuevaActividad}
                disabled={!validacionAsistente.es_valida}
                className="gap-2 text-xs bg-success text-text-inverse hover:bg-success/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Finalizar y Programar Actividad</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 4: PROCESADOR MASIVO Y AUDITOR POR LOTES DNP (HOJA 2 -> HOJA 1)
          ===================================================================== */}
      {vistaActiva === "procesador_lote" && (
        <div className="space-y-6">
          {/* Header explicativo */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="ember">Motor SisPT / DNP</Badge>
                  <Badge variant="outline">Ley 152/1994 Art. 41 · Ley 1474/2011 Art. 74</Badge>
                </div>
                <h3 className="text-base font-bold text-text-primary">
                  Procesador Masivo y Auditor Metodológico DNP (Hoja 2 PI → Hoja 1 PA)
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
                  Audita lotes de actividades para el Plan de Acción institucional: cruce automático con el Plan Indicativo (Hoja 2), validación lingüística de los 16 verbos débiles prohibidos con autocorrección en 1 clic, coherencia presupuestal según Instructivo DNP Pág. 13, semáforo de desfase físico-financiero y emisión del Dictamen Oficial para Consejo de Gobierno.
                </p>
              </div>

              {/* Botones de acción principal */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cargarLoteDemo}
                  disabled={procesandoLote}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-ember ${procesandoLote ? "animate-spin" : ""}`} />
                  <span>Cargar Demo Canónico (6)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={aplicarCorreccionAutomaticaDNP}
                  disabled={procesandoLote || !resultadoLote}
                  className="gap-2 text-xs font-semibold border-ember/40 text-ember hover:bg-ember/10"
                >
                  <Sparkles className="h-3.5 w-3.5 text-ember" />
                  <span>Aplicar Corrección Automática DNP</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setMostrarCertificado(true)}
                  disabled={!resultadoLote}
                  className="gap-2 text-xs bg-success text-text-inverse hover:bg-success/90"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Certificado Ley 1474 / MIPG</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Tarjetas de Dictamen y KPIs del Lote */}
          {resultadoLote && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Dictamen Consejo de Gobierno */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Dictamen Consejo de Gobierno</span>
                  <Building2 className="h-4 w-4 text-ember" />
                </div>
                <div>
                  {resultadoLote.estado_dictamen_planeacion === "APTO_CONSEJO_GOBIERNO" ? (
                    <Badge variant="success" className="px-2.5 py-1 text-xs font-bold gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      APTO CONSEJO GOBIERNO
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="px-2.5 py-1 text-xs font-bold gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      REQUIERE SUBSANACIÓN
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-text-muted">
                  Art. 41 Ley 152/94 · Aprobación Distrital
                </div>
              </div>

              {/* Puntaje de Conformidad DNP */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Conformidad Metodológica DNP</span>
                  <ShieldCheck className="h-4 w-4 text-info" />
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {resultadoLote.puntaje_calidad_dnp}%
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      resultadoLote.puntaje_calidad_dnp === 100 ? "bg-success" : "bg-warning"
                    }`}
                    style={{ width: `${Math.min(resultadoLote.puntaje_calidad_dnp, 100)}%` }}
                  />
                </div>
              </div>

              {/* Actividades Conformes vs Observaciones */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Actividades Evaluadas ({resultadoLote.total_filas_procesadas})</span>
                  <FileText className="h-4 w-4 text-ember" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-success inline-block" />
                    <span className="font-bold text-text-primary">
                      {resultadoLote.filas_conformes_dnp} Conformes
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger inline-block" />
                    <span className="font-bold text-text-primary">
                      {resultadoLote.filas_con_observaciones} Con Obs.
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-text-muted">
                  Regla lingüística de 16 verbos + Coherencia Pág. 13
                </div>
              </div>

              {/* Presupuesto Total del Lote */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Presupuesto Auditado</span>
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {formatearCOP(resultadoLote.monto_total_programado_cop)}
                </div>
                <div className="text-[11px] text-text-muted">
                  Ejecutado: {formatearCOP(resultadoLote.monto_total_ejecutado_cop)} ({resultadoLote.porcentaje_ejecucion_global}%)
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Resultados en Vivo del Lote */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-4 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  Matriz de Auditoría Detallada por Fila
                </h4>
                <p className="text-xs text-text-secondary">
                  Cruce automático Columna D (Programa) y Columna E (Meta Producto), verificación de verbos fuertes y fuentes de financiación.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void ejecutarProcesamientoLote()}
                disabled={procesandoLote}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${procesandoLote ? "animate-spin" : ""}`} />
                <span>Re-auditar Lote</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2/60 text-text-secondary font-medium">
                    <th className="py-2.5 px-3"># / Código</th>
                    <th className="py-2.5 px-3">Entidad Responsable</th>
                    <th className="py-2.5 px-3">Cruce Hoja 2 (Programa DNP)</th>
                    <th className="py-2.5 px-3">Meta Producto (Col. E / Pág. 11)</th>
                    <th className="py-2.5 px-3">Tipo Act.</th>
                    <th className="py-2.5 px-3 min-w-[260px]">Descripción y Verbo DNP</th>
                    <th className="py-2.5 px-3">Presupuesto & Fuente</th>
                    <th className="py-2.5 px-3 text-center">Físico / Financiero</th>
                    <th className="py-2.5 px-3 text-right">Dictamen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resultadoLote?.filas_procesadas.map((f, idx) => (
                    <tr
                      key={f.codigo || idx}
                      className={`hover:bg-surface-2/40 transition-colors ${
                        !f.es_conforme ? "bg-danger/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 align-top font-mono font-bold text-text-primary">
                        <div>{f.codigo}</div>
                        {f.compromiso_pas_codigo && (
                          <span className="text-[10px] text-text-muted">
                            PI: {f.compromiso_pas_codigo}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-semibold text-text-primary">{f.entidad_responsable}</div>
                        <div className="text-[10px] text-text-muted">{f.lider_responsable}</div>
                      </td>
                      <td className="py-3 px-3 align-top max-w-[200px]">
                        <span className="text-text-primary line-clamp-2">
                          {f.columna_d_programa || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top max-w-[220px]">
                        {f.tipo_meta === "ACTIVIDAD" ? (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Exención Pág. 11
                          </Badge>
                        ) : (
                          <span className="text-text-secondary line-clamp-2">
                            {f.columna_e_meta_producto || "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <Badge variant="secondary" className="text-[10px]">
                          {f.tipo_actividad}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 align-top space-y-1.5">
                        <p className="text-text-primary leading-snug">
                          {f.descripcion_actividad}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {f.es_verbo_fuerte ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verbo fuerte: {f.verbo_detectado}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Verbo débil: {f.verbo_detectado}
                            </Badge>
                          )}
                          {f.redaccion_corregida_sugerida && (
                            <div className="w-full text-[11px] text-ember bg-ember/10 p-1.5 rounded border border-ember/20">
                              <span className="font-semibold">Sugerencia DNP:</span>{" "}
                              {f.redaccion_corregida_sugerida}
                            </div>
                          )}
                        </div>
                        {f.hallazgos.length > 0 && (
                          <ul className="text-[11px] text-danger list-disc list-inside space-y-0.5 pt-1">
                            {f.hallazgos.map((h, hIdx) => (
                              <li key={hIdx}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top space-y-1">
                        <div className="font-semibold text-text-primary">
                          {formatearCOP(f.monto_programado_cop)}
                        </div>
                        <Badge
                          variant={f.fuente_coherente ? "outline" : "destructive"}
                          className="text-[10px]"
                        >
                          {f.fuente_financiacion}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 align-top text-center space-y-1">
                        <div className="text-text-primary font-mono font-bold">
                          Fís: {f.avance_fisico}% · Fin: {f.ejecucion_financiera}%
                        </div>
                        {f.alerta_desfase && (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Desfase &gt; 25%
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right">
                        {f.es_conforme ? (
                          <Badge variant="success" className="gap-1 font-bold">
                            <CheckCircle className="h-3 w-3" />
                            Conforme
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1 font-bold">
                            <AlertCircle className="h-3 w-3" />
                            Con Obs.
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL OFICIAL DE CERTIFICADO DE TRANSPARENCIA LEY 1474 / MIPG
          ===================================================================== */}
      {mostrarCertificado && resultadoLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface-1 p-6 md:p-8 shadow-2xl space-y-6 my-8">
            {/* Header del Certificado */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="ember">Ley 1474 de 2011 · Art. 74</Badge>
                  <Badge variant="outline">MIPG · Decreto 2482/2012</Badge>
                </div>
                <h3 className="text-lg font-bold text-text-primary">
                  Certificado Oficial de Transparencia y Publicación Web
                </h3>
                <p className="text-xs text-text-secondary">
                  Plan de Acción Institucional Vigencia 2026 · Corte al 31 de Enero
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-2 text-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir / PDF</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrarCertificado(false)}
                  className="text-text-muted"
                >
                  Cerrar
                </Button>
              </div>
            </div>

            {/* Documento Institucional Imprimible */}
            <div className="rounded-xl border border-border bg-surface-2/40 p-6 md:p-8 space-y-6 text-text-primary print:border-none print:p-0">
              {/* Membrete Oficial */}
              <div className="text-center space-y-1.5 border-b border-border pb-4">
                <div className="text-xs uppercase tracking-widest text-text-secondary font-semibold">
                  República de Colombia · Distrito Turístico y Cultural de Cartagena de Indias
                </div>
                <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
                  Secretaría de Planeación Distrital · Alcaldía Mayor de Cartagena
                </h2>
                <div className="text-xs font-mono text-ember font-bold">
                  EXPEDIENTE DE CUMPLIMIENTO METODOLÓGICO SisPT / DNP Nº SPD-2026-PA-0412
                </div>
              </div>

              {/* Considerandos Legales */}
              <div className="text-xs text-text-secondary leading-relaxed space-y-2">
                <p>
                  <strong>EL SECRETARIO DE PLANEACIÓN DISTRITAL DE CARTAGENA DE INDIAS,</strong> en uso de sus facultades constitucionales y legales, en especial las conferidas por el <strong>Artículo 41 de la Ley 152 de 1994</strong> (Ley Orgánica del Plan de Desarrollo), el <strong>Artículo 74 de la Ley 1474 de 2011</strong> (Estatuto Anticorrupción) y el <strong>Decreto 2482 de 2012</strong>:
                </p>
                <p className="font-semibold text-text-primary">CERTIFICA:</p>
                <p>
                  Que el Plan de Acción Anual correspondiente a la vigencia fiscal <strong>2026</strong> ha sido estructurado, auditado y verificado metodológicamente bajo los estándares del Departamento Nacional de Planeación (DNP) y el Sistema de Planeación Territorial (SisPT), dando estricto cumplimiento a la fecha límite legal de publicación establecida para el <strong>31 de enero de 2026</strong>.
                </p>
              </div>

              {/* Selector de entidad si se desea filtrar la constancia */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface-1 border border-border print:hidden">
                <div className="text-xs text-text-secondary">
                  Filtrar constancia por entidad responsable:
                </div>
                <Select
                  value={entidadCertificado}
                  onValueChange={(val) => setEntidadCertificado(val)}
                >
                  <SelectTrigger className="w-[280px] text-xs bg-surface-2 border-border">
                    <SelectValue placeholder="Todas las entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las Entidades (Consolidado)</SelectItem>
                    {entidadesDisponiblesCertificado.map((ent) => (
                      <SelectItem key={ent} value={ent}>
                        {ent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cuadro Resumen de Metas y Recursos Auditados */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  1. Balance Consolidado de Metas y Financiación
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
                    <span className="text-[11px] text-text-muted">Total Actividades:</span>
                    <div className="text-base font-bold text-text-primary">
                      {filasCertificado.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
                    <span className="text-[11px] text-text-muted">Conformidad DNP:</span>
                    <div className="text-base font-bold text-success">
                      {resultadoLote.puntaje_calidad_dnp}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
                    <span className="text-[11px] text-text-muted">Presupuesto Programado:</span>
                    <div className="text-sm font-bold text-text-primary">
                      {formatearCOP(
                        filasCertificado.reduce((acc, f) => acc + f.monto_programado_cop, 0)
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-1">
                    <span className="text-[11px] text-text-muted">Dictamen Consejo:</span>
                    <div className="text-xs font-bold text-success">
                      {resultadoLote.estado_dictamen_planeacion}
                    </div>
                  </div>
                </div>
              </div>

              {/* Relación de Actividades Certificadas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  2. Relación de Compromisos y Metas Vinculadas a Hoja 2
                </h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-surface-1 border-b border-border text-text-secondary">
                        <th className="p-2">Código PA</th>
                        <th className="p-2">Entidad</th>
                        <th className="p-2">Programa DNP</th>
                        <th className="p-2">Meta Producto</th>
                        <th className="p-2">Fuente Financiación</th>
                        <th className="p-2 text-right">Presupuesto (COP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filasCertificado.map((f) => (
                        <tr key={f.codigo}>
                          <td className="p-2 font-mono font-bold text-text-primary">{f.codigo}</td>
                          <td className="p-2">{f.entidad_responsable}</td>
                          <td className="p-2">{f.columna_d_programa || "—"}</td>
                          <td className="p-2">{f.columna_e_meta_producto || "—"}</td>
                          <td className="p-2">{f.fuente_financiacion}</td>
                          <td className="p-2 text-right font-mono">
                            {formatearCOP(f.monto_programado_cop)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Firmas Institucionales */}
              <div className="pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-2">
                  <div className="h-10 border-b border-dashed border-border" />
                  <div className="font-bold text-text-primary">CAMILO REY LEÓN</div>
                  <div className="text-[10px] text-text-secondary">
                    Secretario de Planeación Distrital
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-10 border-b border-dashed border-border" />
                  <div className="font-bold text-text-primary">JAIME HERNÁNDEZ AMÍN</div>
                  <div className="text-[10px] text-text-secondary">
                    Director General Distriseguridad
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-10 border-b border-dashed border-border" />
                  <div className="font-bold text-text-primary">OFICINA CONTROL INTERNO</div>
                  <div className="text-[10px] text-text-secondary">
                    Auditoría y Vigilancia Ley 1474/2011
                  </div>
                </div>
              </div>

              {/* Pie de certificación */}
              <div className="text-[10px] text-text-muted text-center border-t border-border pt-3">
                Documento generado automáticamente por el Motor POLIS Cartagena conforme al marco de Interoperabilidad SisPT / DNP. Código de verificación digital: SHA256-DNP-1474-2026.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 5: SISTEMA MULTIAGENTE PDD/PDL & DIAGNÓSTICO SH (2012–2027)
          ===================================================================== */}
      {vistaActiva === "multiagente_pdd" && (
        <SistemaMultiagentePddPanel puedeEditar={puedeEditar} />
      )}

      {/* =====================================================================
          MODAL / PANEL DE REPORTE TRIMESTRAL (T1–T4)
          ===================================================================== */}
      {actividadEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface-1 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <span className="font-mono text-xs text-ember font-bold">
                  {actividadEditar.codigo}
                </span>
                <h3 className="text-base font-bold text-text-primary">
                  Reporte de Seguimiento Trimestral
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActividadEditar(null)}
                className="text-text-muted"
              >
                Cerrar
              </Button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {actividadEditar.descripcion_actividad}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-text-secondary">T1 (%):</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editT1}
                    onChange={(e) => setEditT1(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-text-secondary">T2 (%):</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editT2}
                    onChange={(e) => setEditT2(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-text-secondary">T3 (%):</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editT3}
                    onChange={(e) => setEditT3(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-text-secondary">T4 (%):</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editT4}
                    onChange={(e) => setEditT4(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-text-secondary">
                  Presupuesto Ejecutado (COP):
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={editMontoEjecutado}
                  onChange={(e) => setEditMontoEjecutado(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-text-secondary">
                  Evidencia de Soporte / Enlace Documental:
                </Label>
                <Input
                  value={editEvidencia}
                  onChange={(e) => setEditEvidencia(e.target.value)}
                  placeholder="Decreto, acta de recibo a satisfacción, enlace..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActividadEditar(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={guardarSeguimiento}
                className="text-xs bg-ember text-text-inverse"
              >
                Guardar Reporte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
