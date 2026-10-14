"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Compass,
  Copy,
  Cpu,
  Database,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  obtenerResumenEjecutivoInteligenciaApi,
  obtenerPatologiasDnpApi,
  obtenerContinuidadGobiernosApi,
  obtenerRadarTransparenciaApi,
  obtenerAlineacionTerritorialApi,
  buscarTransversalDuplicidadApi,
  obtenerSimuladorCierreApi,
  obtenerResumenEjecutivoInteligenciaLocal,
  obtenerPatologiasDnpLocal,
  obtenerContinuidadGobiernosLocal,
  obtenerRadarTransparenciaLocal,
  obtenerAlineacionTerritorialLocal,
  buscarTransversalDuplicidadLocal,
  obtenerSimuladorCierreLocal,
  DIMENSIONES_SEGURIDAD_HUMANA_INFO,
  PERIODOS_GOBIERNO_INFO,
  ENTIDADES_CANONICAS_30_BD,
  type SemaforoPredictivo,
  type Motor1PatologiasDnpRespuesta,
  type Motor2ContinuidadGobiernosRespuesta,
  type Motor3RadarTransparenciaRespuesta,
  type Motor4AlineacionTerritorialRespuesta,
  type Motor5BuscadorDuplicidadRespuesta,
  type Motor6SimuladorCierreRespuesta,
  type ResumenEjecutivoInteligenciaM0Respuesta,
} from "../services/plan-accion-dnp-api";

export type MotorInteligenciaId =
  | "patologias_dnp"
  | "continuidad_gobiernos"
  | "radar_transparencia"
  | "alineacion_territorial"
  | "buscador_duplicidad"
  | "simulador_cierre";

export interface InteligenciaForense6MPanelProps {
  puedeEditar?: boolean;
}

export function InteligenciaForense6MPanel({
  puedeEditar: _puedeEditar = false,
}: InteligenciaForense6MPanelProps) {
  // Motor activo
  const [motorActivo, setMotorActivo] = useState<MotorInteligenciaId>("patologias_dnp");

  // Filtros globales
  const [filtroDimension, setFiltroDimension] = useState<string>("TODAS");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("TODOS");
  const [filtroEntidad, setFiltroEntidad] = useState<string>("TODAS");

  // Datos de los 6 motores (inicializados localmente para SSR / resiliencia inmediata)
  const [m0Resumen, setM0Resumen] = useState<ResumenEjecutivoInteligenciaM0Respuesta>(
    obtenerResumenEjecutivoInteligenciaLocal
  );
  const [m1Data, setM1Data] = useState<Motor1PatologiasDnpRespuesta>(() =>
    obtenerPatologiasDnpLocal()
  );
  const [m2Data, setM2Data] = useState<Motor2ContinuidadGobiernosRespuesta>(() =>
    obtenerContinuidadGobiernosLocal()
  );
  const [m3Data, setM3Data] = useState<Motor3RadarTransparenciaRespuesta>(() =>
    obtenerRadarTransparenciaLocal()
  );
  const [m4Data, setM4Data] = useState<Motor4AlineacionTerritorialRespuesta>(
    obtenerAlineacionTerritorialLocal
  );
  const [m5Data, setM5Data] = useState<Motor5BuscadorDuplicidadRespuesta>(() =>
    buscarTransversalDuplicidadLocal({ q: "seguridad" })
  );
  const [m6Data, setM6Data] = useState<Motor6SimuladorCierreRespuesta>(() =>
    obtenerSimuladorCierreLocal()
  );

  // Estados interactivos para Motor 5 (Buscador)
  const [queryBusqueda, setQueryBusqueda] = useState<string>("seguridad");
  const [buscando, setBuscando] = useState<boolean>(false);

  // Estados interactivos para Motor 6 (Simulador de Cierre)
  const [aceleracionFactorPct, setAceleracionFactorPct] = useState<number>(0);

  // Carga asíncrona de datos desde el backend (con fallback automático)
  useEffect(() => {
    let cancelado = false;
    async function cargarMotores() {
      try {
        const [r0, r1, r2, r3, r4, r6] = await Promise.all([
          obtenerResumenEjecutivoInteligenciaApi(),
          obtenerPatologiasDnpApi({
            dimension: filtroDimension !== "TODAS" ? filtroDimension : undefined,
            periodo: filtroPeriodo !== "TODOS" ? filtroPeriodo : undefined,
            entidad: filtroEntidad !== "TODAS" ? filtroEntidad : undefined,
          }),
          obtenerContinuidadGobiernosApi({
            dimension: filtroDimension !== "TODAS" ? filtroDimension : undefined,
            entidad: filtroEntidad !== "TODAS" ? filtroEntidad : undefined,
          }),
          obtenerRadarTransparenciaApi({
            entidad: filtroEntidad !== "TODAS" ? filtroEntidad : undefined,
          }),
          obtenerAlineacionTerritorialApi(),
          obtenerSimuladorCierreApi({
            dimension: filtroDimension !== "TODAS" ? filtroDimension : undefined,
            entidad: filtroEntidad !== "TODAS" ? filtroEntidad : undefined,
          }),
        ]);
        if (!cancelado) {
          if (r0) setM0Resumen(r0);
          if (r1) setM1Data(r1);
          if (r2) setM2Data(r2);
          if (r3) setM3Data(r3);
          if (r4) setM4Data(r4);
          if (r6) setM6Data(r6);
        }
      } catch (err) {
        console.warn("Fallo cargando motores de inteligencia, usando dataset semilla:", err);
      }
    }
    void cargarMotores();
    return () => {
      cancelado = true;
    };
  }, [filtroDimension, filtroPeriodo, filtroEntidad]);

  // Ejecución de búsqueda para Motor 5
  const ejecutarBusqueda = async (termino: string) => {
    setBuscando(true);
    try {
      const res = await buscarTransversalDuplicidadApi({
        q: termino,
        dimension: filtroDimension !== "TODAS" ? filtroDimension : undefined,
        periodo: filtroPeriodo !== "TODOS" ? filtroPeriodo : undefined,
      });
      setM5Data(res);
    } catch {
      setM5Data(
        buscarTransversalDuplicidadLocal({
          q: termino,
          dimension: filtroDimension !== "TODAS" ? filtroDimension : undefined,
          periodo: filtroPeriodo !== "TODOS" ? filtroPeriodo : undefined,
        })
      );
    } finally {
      setBuscando(false);
    }
  };

  // Entidades filtradas para el Ranking de Patologías (Motor 1)
  const rankingFiltradoM1 = useMemo(() => {
    let list = m1Data.ranking_entidades_dnp;
    if (filtroEntidad !== "TODAS") {
      const term = filtroEntidad.toLowerCase();
      list = list.filter(
        (e) => e.nombre.toLowerCase().includes(term) || e.sigla.toLowerCase().includes(term)
      );
    }
    return list;
  }, [m1Data.ranking_entidades_dnp, filtroEntidad]);

  // Simulador Predictivo con Aceleración Dinámica (Motor 6)
  const proyeccionesSimuladasM6 = useMemo(() => {
    return m6Data.proyecciones_por_entidad.map((ent) => {
      const base = ent.proyeccion_cierre_2027_pct;
      const boost = (100 - base) * (aceleracionFactorPct / 100);
      const nuevaProyeccion = Math.min(100, Number((base + boost).toFixed(1)));
      let nuevoSemaforo: SemaforoPredictivo = ent.semaforo_predictivo;
      if (nuevaProyeccion >= 80) nuevoSemaforo = "CUMPLIRA";
      else if (nuevaProyeccion >= 50) nuevoSemaforo = "RIESGO_MODERADO";
      else nuevoSemaforo = "INCUMPLIMIENTO_INMINENTE";

      return {
        ...ent,
        proyeccion_simulada_pct: nuevaProyeccion,
        semaforo_simulado: nuevoSemaforo,
      };
    });
  }, [m6Data.proyecciones_por_entidad, aceleracionFactorPct]);

  // Chips de búsqueda rápida para Motor 5
  const chipsSugeridosM5 = [
    "Cámaras de seguridad",
    "Primera infancia",
    "Caños y lagos",
    "Habitante de calle",
    "Embarazo adolescente",
    "Vendedores informales",
  ];

  return (
    <div
      data-testid="panel-inteligencia-forense-6m"
      className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      {/* CABECERA EJECUTIVA M0 */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-card-foreground">
              Laboratorio de Inteligencia Forense de 6 Motores
            </h2>
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary"
            >
              <Cpu className="mr-1 h-3 w-3" />
              bd_csh Canónica
            </Badge>
            <Badge
              variant="outline"
              className="border-border bg-muted/60 text-xs font-medium text-muted-foreground"
            >
              <Database className="mr-1 h-3 w-3" />
              217.740 Registros Saneados (99,97%)
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Auditoría algorítmica profunda sobre los 3 Gobiernos (2016–2026), 30 Entidades Oficiales,
            8 Dimensiones de Seguridad Humana, 12.280 hurtos y 33 Mesas Ciudadanas.
          </p>
        </div>

        {/* CONTADORES KPI RESUMEN UNIVERSO */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <span className="block text-xs font-medium text-muted-foreground">Libros Activos</span>
            <span className="text-lg font-bold text-card-foreground">
              {m0Resumen.universo.total_archivos_activos.toLocaleString("es-CO")}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <span className="block text-xs font-medium text-muted-foreground">Entidades Canónicas</span>
            <span className="text-lg font-bold text-card-foreground">
              {m0Resumen.universo.entidades_canonicas} / 30
            </span>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <span className="block text-xs font-medium text-muted-foreground">Proyectos BPIM</span>
            <span className="text-lg font-bold text-card-foreground">
              {m0Resumen.universo.bpims_unicos.toLocaleString("es-CO")}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5 text-center">
            <span className="block text-xs font-medium text-muted-foreground">Metas PDD</span>
            <span className="text-lg font-bold text-card-foreground">
              {m0Resumen.universo.metas_pdd_unicas.toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS GLOBALES */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
        {/* Filtro Dimensión */}
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            Dimensión de Seguridad Humana:
          </Label>
          <Select value={filtroDimension} onValueChange={setFiltroDimension}>
            <SelectTrigger
              data-testid="filtro-global-dimension"
              aria-label="Filtrar por Dimensión de Seguridad Humana"
              className="h-8 text-xs bg-background"
            >
              <SelectValue placeholder="Todas las Dimensiones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas las 8 Dimensiones</SelectItem>
              {DIMENSIONES_SEGURIDAD_HUMANA_INFO.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nombre} ({d.registros_bd.toLocaleString("es-CO")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Periodo */}
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            Periodo de Gobierno:
          </Label>
          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger
              data-testid="filtro-global-periodo"
              aria-label="Filtrar por Periodo de Gobierno"
              className="h-8 text-xs bg-background"
            >
              <SelectValue placeholder="Todos los Periodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los 3 Periodos (2016–2026)</SelectItem>
              {PERIODOS_GOBIERNO_INFO.map((p) => (
                <SelectItem key={p.codigo} value={p.codigo}>
                  {p.nombre} ({p.total_registros.toLocaleString("es-CO")} filas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Entidad */}
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            Entidad Distrital:
          </Label>
          <Select value={filtroEntidad} onValueChange={setFiltroEntidad}>
            <SelectTrigger
              data-testid="filtro-global-entidad"
              aria-label="Filtrar por Entidad Distrital"
              className="h-8 text-xs bg-background"
            >
              <SelectValue placeholder="Todas las Entidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas las 30 Entidades Oficiales</SelectItem>
              {ENTIDADES_CANONICAS_30_BD.map((e) => (
                <SelectItem key={e.sigla} value={e.nombre}>
                  {e.sigla} · {e.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SELECTOR DE LOS 6 MOTORES ANALÍTICOS */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          type="button"
          size="sm"
          variant={motorActivo === "patologias_dnp" ? "default" : "outline"}
          onClick={() => setMotorActivo("patologias_dnp")}
          data-testid="selector-motor-patologias-dnp"
          className="text-xs"
        >
          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
          M1 · Patologías DNP & Espejismo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={motorActivo === "continuidad_gobiernos" ? "default" : "outline"}
          onClick={() => setMotorActivo("continuidad_gobiernos")}
          data-testid="selector-motor-continuidad-gobiernos"
          className="text-xs"
        >
          <Layers className="mr-1.5 h-3.5 w-3.5" />
          M2 · ADN 3 Gobiernos & 8 Dimensiones
        </Button>
        <Button
          type="button"
          size="sm"
          variant={motorActivo === "radar_transparencia" ? "default" : "outline"}
          onClick={() => setMotorActivo("radar_transparencia")}
          data-testid="selector-motor-radar-transparencia"
          className="text-xs"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          M3 · Radar Copy-Paste & 30×11
        </Button>
        <Button
          type="button"
          size="sm"
          variant={motorActivo === "alineacion_territorial" ? "default" : "outline"}
          onClick={() => setMotorActivo("alineacion_territorial")}
          data-testid="selector-motor-alineacion-territorial"
          className="text-xs"
        >
          <Compass className="mr-1.5 h-3.5 w-3.5" />
          M4 · Alineación Territorial
        </Button>
        <Button
          type="button"
          size="sm"
          variant={motorActivo === "buscador_duplicidad" ? "default" : "outline"}
          onClick={() => setMotorActivo("buscador_duplicidad")}
          data-testid="selector-motor-buscador-duplicidad"
          className="text-xs"
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          M5 · Buscador & Duplicidad
        </Button>
        <Button
          type="button"
          size="sm"
          variant={motorActivo === "simulador_cierre" ? "default" : "outline"}
          onClick={() => setMotorActivo("simulador_cierre")}
          data-testid="selector-motor-simulador-cierre"
          className="text-xs"
        >
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          M6 · Simulador Cierre 2027
        </Button>
      </div>

      {/* ===================================================================== */}
      {/* VISTA MOTOR 1: PATOLOGÍAS DNP Y EFECTO ESPEJISMO */}
      {/* ===================================================================== */}
      {motorActivo === "patologias_dnp" && (
        <div data-testid="vista-motor-patologias-dnp" className="space-y-6">
          {/* Tarjetas de Resumen Patologías */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Balance Lingüístico DNP
                </span>
                <Badge variant="outline" className="text-xs font-semibold text-primary">
                  42,2% Fuertes
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold text-card-foreground">
                {m1Data.resumen_global.actividades_verbo_fuerte.toLocaleString("es-CO")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                vs. {m1Data.resumen_global.actividades_verbo_debil.toLocaleString("es-CO")} verbos
                débiles prohibidos (57,8% tasa de "reunionitis").
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Efecto Espejismo Operativo
                </span>
                <Badge variant="outline" className="border-border bg-muted/60 text-xs">
                  {m1Data.resumen_global.total_alertas_espejismo} Alertas
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold text-card-foreground">
                {m1Data.resumen_global.total_alertas_espejismo}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Planes de acción al ≥75% de avance con metas del PDD estancadas en ≤35%.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Desacople Físico-Financiero
                </span>
                <Badge variant="outline" className="border-border bg-muted/60 text-xs">
                  {m1Data.resumen_global.total_alertas_sobreejecucion_financiera} Alertas
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold text-card-foreground">
                {m1Data.resumen_global.total_alertas_sobreejecucion_financiera}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Giro en tesorería al ≥75% con avance físico de obra o entrega comunitaria ≤35%.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Cuello de Botella Contractual
                </span>
                <Badge variant="outline" className="border-border bg-muted/60 text-xs">
                  {m1Data.resumen_global.total_alertas_cuello_botella_contractual} Alertas
                </Badge>
              </div>
              <div className="mt-2 text-2xl font-bold text-card-foreground">
                {m1Data.resumen_global.total_alertas_cuello_botella_contractual}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Apropiación presupuestal vigente con $0 en compromisos RP y obligaciones contractuales.
              </p>
            </div>
          </div>

          {/* Tabla Ranking DNP de las 30 Entidades */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold text-card-foreground">
                Ranking de Calidad Técnica DNP (30 Entidades Oficiales de Cartagena)
              </h3>
              <p className="text-xs text-muted-foreground">
                Puntaje 0–100 ponderando formulación con verbos fuertes en infinitivo, trazabilidad BPIM
                y consistencia físico-financiera.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Entidad Oficial</th>
                    <th className="p-3 text-center">Índice DNP</th>
                    <th className="p-3 text-center">% Verbo Fuerte</th>
                    <th className="p-3 text-center">Avance PDD</th>
                    <th className="p-3 text-center">Avance PA</th>
                    <th className="p-3 text-right">Apropiación</th>
                    <th className="p-3">Diagnóstico Patológico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankingFiltradoM1.map((ent, idx) => (
                    <tr key={ent.sigla} className="hover:bg-muted/20">
                      <td className="p-3 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 font-medium text-card-foreground">
                        <div>{ent.nombre}</div>
                        <span className="font-mono text-[10px] text-muted-foreground">{ent.sigla}</span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            ent.indice_calidad_dnp_100 >= 75
                              ? "bg-primary/10 text-primary font-bold"
                              : ent.indice_calidad_dnp_100 >= 50
                              ? "bg-muted text-card-foreground"
                              : "bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {ent.indice_calidad_dnp_100.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {ent.porcentaje_verbo_fuerte.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center font-mono">
                        {ent.avance_estrategico_promedio_pct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center font-mono">
                        {ent.avance_operativo_promedio_pct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-mono">
                        ${(ent.apropiacion_total_cop / 1_000_000_000).toFixed(1)}B
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${
                            ent.patologia_predominante === "SALUDABLE"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {ent.patologia_predominante.replace(/_/g, " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Casos Críticos de Muestra */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">
              Casos Críticos Detectados en Auditoría Forense
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {m1Data.casos_criticos.map((caso) => (
                <div key={caso.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                      {caso.tipo_patologia.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      Vigencia {caso.vigencia}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-card-foreground">{caso.entidad}</h4>
                  <p className="text-xs text-muted-foreground italic">"{caso.descripcion}"</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-border">
                    <div>Avance PDD: {caso.avance_estrategico_pct}%</div>
                    <div>Avance PA: {caso.avance_fisico_pct}%</div>
                    <div>Apropiación: ${(caso.apropiacion_cop / 1_000_000).toFixed(0)}M</div>
                    <div>Pagos: ${(caso.pagos_cop / 1_000_000).toFixed(0)}M</div>
                  </div>
                  <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                    <strong>Dictamen:</strong> {caso.diagnostico}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA MOTOR 2: ADN CONTINUIDAD 3 GOBIERNOS Y 8 DIMENSIONES */}
      {/* ===================================================================== */}
      {motorActivo === "continuidad_gobiernos" && (
        <div data-testid="vista-motor-continuidad-gobiernos" className="space-y-6">
          {/* Comparativa 3 Gobiernos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Object.values(m2Data.comparativa_periodos).map((per) => (
              <div key={per.periodo} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {per.periodo}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    {per.archivos_unicos} archivos
                  </span>
                </div>
                <h3 className="text-sm font-bold text-card-foreground">{per.nombre}</h3>
                <div className="space-y-1 text-xs text-muted-foreground font-mono">
                  <div>Registros: {per.total_registros.toLocaleString("es-CO")}</div>
                  <div>Entidades activas: {per.entidades_activas}</div>
                  <div>BPIMs únicos: {per.bpims_unicos}</div>
                  <div>Metas únicas: {per.metas_unicas}</div>
                  <div>Apropiación: ${(per.apropiacion_total_cop / 1_000_000_000_000).toFixed(2)}B COP</div>
                </div>
              </div>
            ))}
          </div>

          {/* Continuidad BPIM */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Tasa de Continuidad Institucional BPIM (16,7%)
                </h3>
                <p className="text-xs text-muted-foreground">
                  De 1.516 códigos BPIM históricos en bd_csh, solo 253 sobreviven en ≥2 administraciones.
                  1.263 son proyectos "huérfanos" que fenecen al cambiar el alcalde.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-primary">
                {m2Data.continuidad_bpim.tasa_continuidad_institucional_pct}% Continuidad
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Proyectos Continuos Sobrevivientes:</h4>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {m2Data.continuidad_bpim.proyectos_continuos_destacados.map((proy) => (
                  <div key={proy.codigo_bpim} className="rounded border border-border bg-muted/20 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">{proy.codigo_bpim}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {proy.estado_continuidad.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-1 font-semibold text-card-foreground">{proy.nombre_proyecto}</div>
                    <div className="mt-1 text-muted-foreground">
                      Entidades: {proy.entidades.join(", ")}
                    </div>
                    <div className="mt-1 font-mono text-muted-foreground">
                      Apropiación acumulada: ${(proy.apropiacion_acumulada_cop / 1_000_000_000).toFixed(1)}B
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Migración de Dimensiones */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">
              Migración de Prioridades en las 8 Dimensiones de Seguridad Humana
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Dimensión</th>
                    <th className="p-2.5 text-center">Antes 2020</th>
                    <th className="p-2.5 text-center">2020–2023</th>
                    <th className="p-2.5 text-center">2024–2027</th>
                    <th className="p-2.5 text-center">Tendencia</th>
                    <th className="p-2.5">Diagnóstico Forense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {m2Data.migracion_dimensiones_seguridad.map((dim) => (
                    <tr key={dim.dimension} className="hover:bg-muted/20">
                      <td className="p-2.5 font-medium text-card-foreground">{dim.dimension}</td>
                      <td className="p-2.5 text-center font-mono">{dim.pct_antes_2020.toFixed(1)}%</td>
                      <td className="p-2.5 text-center font-mono">{dim.pct_2020_2023.toFixed(1)}%</td>
                      <td className="p-2.5 text-center font-mono">{dim.pct_2024_2027.toFixed(1)}%</td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            dim.tendencia === "CRECIENTE"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {dim.tendencia}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-muted-foreground">{dim.comentario_forense}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA MOTOR 3: RADAR TRANSPARENCIA Y COPY-PASTE */}
      {/* ===================================================================== */}
      {motorActivo === "radar_transparencia" && (
        <div data-testid="vista-motor-radar-transparencia" className="space-y-6">
          {/* Banner de Archivos Clonados */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-card-foreground">
                5 Archivos con Corte Clonado Detectados (CONTENIDO_IDENTICO_OTRO_CORTE)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Auditoría SHA-256 tabular demostró que estos 5 archivos presentan celdas y avances
              idénticos a otros cortes trimestrales sin actualización de gestión.
            </p>
            <div className="space-y-2">
              {m3Data.archivos_corte_clonado.map((arc, i) => (
                <div key={i} className="rounded border border-border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-card-foreground">{arc.nombre_archivo}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {arc.entidad}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-mono text-[11px]">
                    <span>Vigencia: {arc.vigencia}</span>
                    <span>Corte: {arc.corte_periodo}</span>
                    <span>Clonado de: {arc.corte_clonado_de}</span>
                    <span>Filas: {arc.filas_extraidas}</span>
                  </div>
                  <p className="text-muted-foreground italic text-[11px]">{arc.motivo_alerta}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DADIS 2021 Fusión Clon */}
          {m3Data.clones_tabulares_mismo_corte.map((clon, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
              <span className="font-bold text-primary">Saneamiento Exitoso de Clon Tabular:</span>
              <p className="text-muted-foreground">
                {clon.archivo_absorbente} ({clon.entidad}) fusionó {clon.filas_eliminadas_deduplicadas} filas
                idénticas duplicadas, preservando la unicidad del catálogo.
              </p>
            </div>
          ))}

          {/* Metas Zombies y Diciembre Mágico */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Metas Zombies */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-card-foreground">
                Metas Congeladas ("Zombies" T1..T4 Inmutables)
              </h3>
              <p className="text-xs text-muted-foreground">
                Actividades con 4 trimestres consecutivos reportando el mismo valor sin variación.
              </p>
              <div className="space-y-2">
                {m3Data.metas_congeladas_zombies.map((z, idx) => (
                  <div key={idx} className="rounded border border-border bg-muted/20 p-2.5 text-xs">
                    <div className="font-semibold text-card-foreground">{z.entidad}</div>
                    <div className="text-muted-foreground italic">"{z.descripcion_actividad}"</div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      T1: {z.avance_t1}% · T2: {z.avance_t2}% · T3: {z.avance_t3}% · T4: {z.avance_t4}% (Congelado)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Diciembre Mágico */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-card-foreground">
                Efecto "Diciembre Mágico" (Hockey-Stick en T4)
              </h3>
              <p className="text-xs text-muted-foreground">
                Saltos abruptos de ≥50 puntos porcentuales en el último trimestre o cierre anual.
              </p>
              <div className="space-y-2">
                {m3Data.efecto_diciembre_magico.map((d, idx) => (
                  <div key={idx} className="rounded border border-border bg-muted/20 p-2.5 text-xs">
                    <div className="font-semibold text-card-foreground">{d.entidad} (Vigencia {d.vigencia})</div>
                    <div className="text-muted-foreground italic">"{d.indicador_o_actividad}"</div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Promedio T1–T3: {d.avance_t1_t3_promedio}% → T4: {d.avance_t4_anual}% (+{d.salto_abrupto_pts} pts)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA MOTOR 4: ALINEACIÓN TERRITORIAL (PLANES VS DELITO Y MESAS) */}
      {/* ===================================================================== */}
      {motorActivo === "alineacion_territorial" && (
        <div data-testid="vista-motor-alineacion-territorial" className="space-y-6">
          {/* Tarjetas de las 3 Localidades */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {m4Data.localidades.map((loc) => (
              <div key={loc.localidad} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold">
                    {loc.localidad}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      loc.estado_alineacion === "ALINEADO"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {loc.estado_alineacion.replace(/_/g, " ")}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-card-foreground">{loc.nombre_completo}</h3>
                <div className="space-y-1 text-xs text-muted-foreground font-mono">
                  <div>Registros territorializados: {loc.registros_triada.toLocaleString("es-CO")}</div>
                  <div>Apropiación presupuestal: ${(loc.apropiacion_cop / 1_000_000_000).toFixed(1)}B COP</div>
                  <div>Hurtos registrados: {loc.hurtos_registrados.toLocaleString("es-CO")} casos</div>
                  <div>Mesas ciudadanas: {loc.mesas_ciudadanas} ({loc.asistentes_mesas} asistentes)</div>
                  <div>Proporción Inversión: {loc.proporcion_inversion_pct}%</div>
                  <div>Proporción Delito: {loc.proporcion_delito_pct}%</div>
                  <div>Brecha Desalineación: {loc.brecha_desalineacion_pct > 0 ? `+${loc.brecha_desalineacion_pct}` : loc.brecha_desalineacion_pct}%</div>
                </div>
                <div className="pt-2 border-t border-border text-[11px] text-muted-foreground">
                  <strong>Barrios Foco:</strong> {loc.barrios_mencionados_top.join(", ")}
                </div>
              </div>
            ))}
          </div>

          {/* Barrios Foco Priorizados */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">
              Top Barrios Foco: Correlación Planes de Acción vs Hurtos y Demanda
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Barrio</th>
                    <th className="p-2.5">Localidad</th>
                    <th className="p-2.5 text-center">Actividades Tríada</th>
                    <th className="p-2.5 text-center">Hurtos SIEDCO</th>
                    <th className="p-2.5 text-center">Mesas Ciudadanas</th>
                    <th className="p-2.5 text-right">Apropiación Estimada</th>
                    <th className="p-2.5">Prioridad Atención</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {m4Data.barrios_foco.map((b) => (
                    <tr key={b.nombre} className="hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-card-foreground">{b.nombre}</td>
                      <td className="p-2.5 text-muted-foreground">{b.localidad}</td>
                      <td className="p-2.5 text-center font-mono">{b.actividades_triada}</td>
                      <td className="p-2.5 text-center font-mono">{b.casos_hurtos}</td>
                      <td className="p-2.5 text-center font-mono">{b.mesas_realizadas}</td>
                      <td className="p-2.5 text-right font-mono">
                        ${(b.apropiacion_estimada_cop / 1_000_000_000).toFixed(1)}B
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            b.prioridad_atencion === "MUY_ALTA"
                              ? "border-primary/40 bg-primary/10 text-primary font-bold"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {b.prioridad_atencion.replace(/_/g, " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA MOTOR 5: BUSCADOR TRANSVERSAL Y DUPLICIDAD */}
      {/* ===================================================================== */}
      {motorActivo === "buscador_duplicidad" && (
        <div data-testid="vista-motor-buscador-duplicidad" className="space-y-6">
          {/* Barra de Búsqueda */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                data-testid="input-buscador-transversal"
                placeholder="Buscar tema transversal (ej. cámaras, primera infancia, lagos)..."
                value={queryBusqueda}
                onChange={(e) => setQueryBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ejecutarBusqueda(queryBusqueda)}
                className="text-xs"
              />
              <Button
                type="button"
                size="sm"
                data-testid="btn-buscar-transversal"
                disabled={buscando}
                onClick={() => ejecutarBusqueda(queryBusqueda)}
                className="text-xs"
              >
                {buscando ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                Buscar
              </Button>
            </div>

            {/* Chips de sugerencias */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground">Sugerencias rápidas:</span>
              {chipsSugeridosM5.map((chip) => (
                <Button
                  key={chip}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => {
                    setQueryBusqueda(chip);
                    void ejecutarBusqueda(chip);
                  }}
                >
                  {chip}
                </Button>
              ))}
            </div>
          </div>

          {/* Resumen de Hallazgos */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-card-foreground">
                Resultados para "{m5Data.consulta.q}" ({m5Data.total_coincidencias} registros encontrados)
              </h3>
              <div className="font-mono text-xs text-muted-foreground">
                Presupuesto involucrado: ${(m5Data.presupuesto_asociado.apropiacion_total_cop / 1_000_000_000).toFixed(1)}B COP
              </div>
            </div>

            {/* Alertas de Duplicidad */}
            {m5Data.alertas_duplicidad_institucional.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <AlertOctagon className="h-3.5 w-3.5" />
                  Alertas de Duplicidad Interinstitucional ({m5Data.alertas_duplicidad_institucional.length}):
                </span>
                {m5Data.alertas_duplicidad_institucional.map((al, idx) => (
                  <div key={idx} className="rounded border border-border bg-muted/20 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-card-foreground">{al.tema_superpuesto}</span>
                      <span className="font-mono text-muted-foreground">Vigencia {al.vigencia}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Entidades superpuestas: {al.entidades.join(" ↔ ")}
                    </div>
                    <div className="text-muted-foreground">
                      Apropiación conjunta: ${(al.apropiacion_conjunta_cop / 1_000_000).toFixed(0)}M COP
                    </div>
                    <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                      <strong>Recomendación:</strong> {al.recomendacion}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Muestra de Registros */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Registros Coincidentes:</span>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {m5Data.muestra_registros.map((reg) => (
                  <div key={reg.id} className="rounded border border-border bg-background p-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-bold text-card-foreground">{reg.entidad}</span>
                      <span className="font-mono">{reg.vigencia} · {reg.motor_destino}</span>
                    </div>
                    <p className="mt-1 text-card-foreground">{reg.descripcion_actividad_o_meta}</p>
                    {reg.codigo_bpim && (
                      <span className="mt-1 inline-block font-mono text-[10px] text-muted-foreground">
                        BPIM: {reg.codigo_bpim}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA MOTOR 6: SIMULADOR PREDICTIVO CIERRE DE GOBIERNO (2024–2027) */}
      {/* ===================================================================== */}
      {motorActivo === "simulador_cierre" && (
        <div data-testid="vista-motor-simulador-cierre" className="space-y-6">
          {/* Cabecera del Horizonte */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-medium text-muted-foreground">Horizonte Cuatrienal</span>
              <div className="mt-1 text-lg font-bold text-card-foreground">
                2024–2027
              </div>
              <p className="text-xs text-muted-foreground">
                {m6Data.horizonte.trimestres_restantes} trimestres restantes (62.5% transcurrido).
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-medium text-muted-foreground">Entidades que Cumplirán</span>
              <div className="mt-1 text-lg font-bold text-primary">
                {m6Data.resumen_prediccion.entidades_cumpliran} de 30
              </div>
              <p className="text-xs text-muted-foreground">
                Proyección de cierre ≥80% a la velocidad histórica actual.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-medium text-muted-foreground">Riesgo Moderado</span>
              <div className="mt-1 text-lg font-bold text-card-foreground">
                {m6Data.resumen_prediccion.entidades_riesgo_moderado} de 30
              </div>
              <p className="text-xs text-muted-foreground">
                Proyección de cierre entre 50% y 79.9%.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-medium text-muted-foreground">Incumplimiento Inminente</span>
              <div className="mt-1 text-lg font-bold text-muted-foreground">
                {m6Data.resumen_prediccion.entidades_incumplimiento_inminente} de 30
              </div>
              <p className="text-xs text-muted-foreground">
                Proyección de cierre menor al 50% sin correctivos.
              </p>
            </div>
          </div>

          {/* Control Interactivo de Aceleración Trimestral */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" />
                  Simulador de Corrección de Cuellos de Botella (+{aceleracionFactorPct}% Impulso)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simula cuántos puntos porcentuales adicionales alcanza cada dependencia si se corrigen los trámites de contratación y liquidación.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 3, 5, 10, 15].map((boost) => (
                  <Button
                    key={boost}
                    type="button"
                    size="sm"
                    variant={aceleracionFactorPct === boost ? "default" : "outline"}
                    onClick={() => setAceleracionFactorPct(boost)}
                    className="h-7 text-xs px-2.5"
                  >
                    +{boost}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de Proyecciones por Entidad */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold text-card-foreground">
                Proyección de Cierre al 31 de Diciembre de 2027 por Dependencia
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3">Entidad</th>
                    <th className="p-3 text-center">Avance Actual</th>
                    <th className="p-3 text-center">Velocidad Anual</th>
                    <th className="p-3 text-center">Proyección 2027</th>
                    <th className="p-3 text-center">Semáforo Predictivo</th>
                    <th className="p-3 text-center">Aceleración Requerida</th>
                    <th className="p-3">Cuello de Botella Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {proyeccionesSimuladasM6.map((ent) => (
                    <tr key={ent.entidad} className="hover:bg-muted/20">
                      <td className="p-3 font-medium text-card-foreground">{ent.entidad}</td>
                      <td className="p-3 text-center font-mono">{ent.avance_actual_pct.toFixed(1)}%</td>
                      <td className="p-3 text-center font-mono">+{ent.velocidad_anual_historica_pct.toFixed(1)}%/año</td>
                      <td className="p-3 text-center font-mono font-bold">
                        {ent.proyeccion_simulada_pct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            ent.semaforo_simulado === "CUMPLIRA"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : ent.semaforo_simulado === "RIESGO_MODERADO"
                              ? "border-border bg-muted text-card-foreground"
                              : "border-border bg-muted/80 text-muted-foreground font-bold"
                          }`}
                        >
                          {ent.semaforo_simulado.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground">
                        +{ent.aceleracion_trimestral_requerida_pct.toFixed(2)}%/trim
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px] max-w-xs truncate">
                        {ent.cuello_botella_principal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
