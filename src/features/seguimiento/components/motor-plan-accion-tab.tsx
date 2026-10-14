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
} from "lucide-react";
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
  type ActividadPlanAccion,
  type MatrizPlanAccionRespuesta,
  type FiltrosMatrizPlanAccion,
  type TipoActividadDNP,
  type TipoMetaDNP,
  type CategoriaRecursosDNP,
  type FuenteFinanciacionDNP,
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
  const [vistaActiva, setVistaActiva] = useState<"hoja1" | "hoja2" | "asistente">("hoja1");
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
      </div>

      {/* =====================================================================
          VISTA 1: HOJA 1 — MATRIZ DEL PLAN DE ACCIÓN
          ===================================================================== */}
      {vistaActiva === "hoja1" && (
        <div className="space-y-4">
          {/* Filtros multicriterio */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <Input
                  value={filtros.busqueda || ""}
                  onChange={(e) =>
                    aplicarFiltros({ ...filtros, busqueda: e.target.value })
                  }
                  placeholder="Buscar por código, actividad, proyecto o BPIM..."
                  className="pl-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Select
                  value={filtros.linea_codigo || "todas"}
                  onValueChange={(val) =>
                    aplicarFiltros({ ...filtros, linea_codigo: val })
                  }
                >
                  <SelectTrigger aria-label="Filtrar por Línea Estratégica" className="text-xs bg-surface-2 border-border">
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

                <Select
                  value={filtros.tipo_actividad || "todas"}
                  onValueChange={(val) =>
                    aplicarFiltros({ ...filtros, tipo_actividad: val })
                  }
                >
                  <SelectTrigger aria-label="Filtrar por Tipo Actividad" className="text-xs bg-surface-2 border-border">
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

                <Select
                  value={filtros.fuente_financiacion || "todas"}
                  onValueChange={(val) =>
                    aplicarFiltros({ ...filtros, fuente_financiacion: val })
                  }
                >
                  <SelectTrigger aria-label="Filtrar por Fuente Financiación" className="text-xs bg-surface-2 border-border">
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="gap-1.5 text-xs"
                  aria-label="Limpiar Filtros"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Limpiar</span>
                </Button>
              </div>
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
