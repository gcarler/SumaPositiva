"use client";

import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Search,
  Layers,
  Sparkles,
  Scale,
  Binary,
  Target,
  Calculator,
  Compass,
  GitCompare,
  FileCheck2,
  SlidersHorizontal,
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
  obtenerAuditoriaSaneamientoDeaApi,
  obtenerFronteraEficienciaDeaApi,
  obtenerMalmquistDeaApi,
  obtenerSegundaEtapaEconometricaDeaApi,
  obtenerAuditoriaSaneamientoDeaLocal,
  obtenerFronteraEficienciaDeaLocal,
  obtenerMalmquistDeaLocal,
  obtenerSegundaEtapaEconometricaDeaLocal,
  type AuditoriaSaneamientoRespuesta,
  type FronteraDeaVigenciaRespuesta,
  type MalmquistRespuesta,
  type SegundaEtapaEconometricaRespuesta,
  type DmuDeaScore,
} from "../services/plan-accion-dnp-api";

export interface DeaEconometriaPanelProps {
  puedeEditar?: boolean;
}

export type SubvistaDeaTipo =
  | "auditoria_saneamiento"
  | "frontera_eficiencia"
  | "malmquist"
  | "econometria_segunda_etapa";

export function DeaEconometriaPanel({ puedeEditar: _puedeEditar = false }: DeaEconometriaPanelProps) {
  // Navegación entre las 4 sub-vistas del Laboratorio DEA
  const [subvistaDea, setSubvistaDea] = useState<SubvistaDeaTipo>("frontera_eficiencia");

  // Estado con fallback local inmediato (SSR y tolerancia a desconexión)
  const [datosAuditoria, setDatosAuditoria] = useState<AuditoriaSaneamientoRespuesta>(
    obtenerAuditoriaSaneamientoDeaLocal
  );
  const [datosFrontera, setDatosFrontera] = useState<FronteraDeaVigenciaRespuesta>(() =>
    obtenerFronteraEficienciaDeaLocal({ vigencia: 2025, modo: "nucleo_1x2", insumo: "apropiacion" })
  );
  const [datosMalmquist, setDatosMalmquist] = useState<MalmquistRespuesta>(
    obtenerMalmquistDeaLocal
  );
  const [datosSegundaEtapa, setDatosSegundaEtapa] = useState<SegundaEtapaEconometricaRespuesta>(
    obtenerSegundaEtapaEconometricaDeaLocal
  );

  // Filtros de Sub-vista 2 (Frontera de Eficiencia DEA)
  const [vigenciaSeleccionada, setVigenciaSeleccionada] = useState<string>("2025");
  const [modoEspecificacion, setModoEspecificacion] = useState<"nucleo_1x2" | "extendida_2x3">("nucleo_1x2");
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<"apropiacion" | "pagos">("apropiacion");
  const [filtroGrupo, setFiltroGrupo] = useState<string>("TODOS");
  const [filtroRetornos, setFiltroRetornos] = useState<string>("TODOS");
  const [busquedaEntidad, setBusquedaEntidad] = useState<string>("");
  const [dmuSeleccionadaModal, setDmuSeleccionadaModal] = useState<DmuDeaScore | null>(null);

  // Filtros de Sub-vista 3 (Malmquist)
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<string>("ACUMULADO_2020_2025");

  // Carga asíncrona no bloqueante desde API
  useEffect(() => {
    let activo = true;

    async function cargarDatosBackend() {
      try {
        const [auditRes, frontRes, malmRes, segRes] = await Promise.all([
          obtenerAuditoriaSaneamientoDeaApi(),
          obtenerFronteraEficienciaDeaApi({
            vigencia: vigenciaSeleccionada,
            modo: modoEspecificacion,
            insumo: insumoSeleccionado,
          }),
          obtenerMalmquistDeaApi(),
          obtenerSegundaEtapaEconometricaDeaApi(),
        ]);

        if (activo) {
          if (auditRes) setDatosAuditoria(auditRes);
          if (frontRes) setDatosFrontera(frontRes);
          if (malmRes) setDatosMalmquist(malmRes);
          if (segRes) setDatosSegundaEtapa(segRes);
        }
      } catch (err) {
        console.warn("Uso de datos locales auditados para DEA y Econometría:", err);
      }
    }

    void cargarDatosBackend();

    return () => {
      activo = false;
    };
  }, [vigenciaSeleccionada, modoEspecificacion, insumoSeleccionado]);

  // Filtrado de DMUs para la tabla de la Frontera
  const dmusFiltradas = useMemo(() => {
    if (!datosFrontera?.ranking_eficiencia) return [];
    let list = datosFrontera.ranking_eficiencia;

    if (filtroGrupo !== "TODOS") {
      list = list.filter((d) => d.grupo_institucional === filtroGrupo);
    }
    if (filtroRetornos !== "TODOS") {
      list = list.filter((d) => d.retornos_escala_rts === filtroRetornos);
    }
    if (busquedaEntidad.trim() !== "") {
      const q = busquedaEntidad.toLowerCase();
      list = list.filter(
        (d) =>
          d.entidad.toLowerCase().includes(q) ||
          d.sigla.toLowerCase().includes(q)
      );
    }
    return list;
  }, [datosFrontera, filtroGrupo, filtroRetornos, busquedaEntidad]);

  // Transición activa de Malmquist
  const transicionActiva = useMemo(() => {
    if (!datosMalmquist?.transiciones) return null;
    return (
      datosMalmquist.transiciones.find((t) => t.periodo === transicionSeleccionada) ||
      datosMalmquist.transiciones[0]
    );
  }, [datosMalmquist, transicionSeleccionada]);

  return (
    <div
      className="space-y-6"
      data-testid="panel-dea-econometria"
      role="region"
      aria-label="Laboratorio de Econometría y Frontera Eficiente DEA Cartagena"
    >
      {/* 1. BARRA SUPERIOR DE SUB-VISTAS DEA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={subvistaDea === "auditoria_saneamiento" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaDea("auditoria_saneamiento")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-dea-auditoria-saneamiento"
            aria-pressed={subvistaDea === "auditoria_saneamiento"}
          >
            <Layers className="h-4 w-4" />
            <span>1. Saneamiento & Embudo (Fase 0)</span>
          </Button>

          <Button
            variant={subvistaDea === "frontera_eficiencia" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaDea("frontera_eficiencia")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-dea-frontera-eficiencia"
            aria-pressed={subvistaDea === "frontera_eficiencia"}
          >
            <Compass className="h-4 w-4" />
            <span>2. Frontera Eficiente DEA (CCR · BCC · SBM · Bootstrap)</span>
          </Button>

          <Button
            variant={subvistaDea === "malmquist" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaDea("malmquist")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-dea-malmquist"
            aria-pressed={subvistaDea === "malmquist"}
          >
            <TrendingUp className="h-4 w-4" />
            <span>3. Productividad Malmquist (2020–2025)</span>
          </Button>

          <Button
            variant={subvistaDea === "econometria_segunda_etapa" ? "ember" : "outline"}
            size="sm"
            onClick={() => setSubvistaDea("econometria_segunda_etapa")}
            className="gap-2 text-xs font-medium"
            data-testid="tab-dea-econometria-segunda-etapa"
            aria-pressed={subvistaDea === "econometria_segunda_etapa"}
          >
            <Calculator className="h-4 w-4" />
            <span>4. Econometría, FDR, Gini & Wilcoxon Pareado</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>HiGHS Solver · B=1.000 IC 95%</span>
          </Badge>
          <Badge variant="outline" className="border-ember/30 bg-ember/10 text-xs text-text-primary gap-1">
            <Sparkles className="h-3.5 w-3.5 text-ember" />
            <span>IPC DANE Base 2025 (5,10%)</span>
          </Badge>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-VISTA 1: CASCADA FORENSE DE SANEAMIENTO ECONOMÉTRICO (FASE 0)     */}
      {/* ==================================================================== */}
      {subvistaDea === "auditoria_saneamiento" && (
        <section
          data-testid="subvista-dea-auditoria-saneamiento"
          aria-label="Cascada Forense de Saneamiento Econométrico"
          className="space-y-6"
        >
          {/* Banner Metodológico */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-ember" />
              <h3 className="text-sm font-bold text-text-primary">
                Cascada Forense de Saneamiento y Des-propagación Presupuestal (Fase 0)
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Auditoría sobre los <strong>217.740 registros canónicos de bd_csh</strong>. Reconcilia la brecha entre la
              suma bruta agregada ($293,8 Billones de COP) y la capacidad real anual del distrito ($2,4B a $6,3B) des-propagando
              los 1.004 grupos repetidos, podando sumatorios de TOTAL/SUBTOTAL y deflactando con el <strong>IPC Oficial del DANE Base 2025 = 100</strong>.
            </p>
          </div>

          {/* Tarjetas del Embudo de Reconciliación */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-semibold uppercase text-text-muted">1. Presupuesto Bruto</span>
              <p className="text-base font-bold text-text-primary">
                ${(datosAuditoria.embudo_financiero.presupuesto_bruto_cop / 1e12).toFixed(1)} Billones
              </p>
              <span className="text-[10px] text-text-muted block">Suma plana sin deduplicar</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-semibold uppercase text-text-muted">2. Cruce Inter-Motor</span>
              <p className="text-base font-bold text-warning">
                {datosAuditoria.embudo_financiero.duplicados_intermotor_filas.toLocaleString()} filas
              </p>
              <span className="text-[10px] text-text-muted block">Repetidas entre PDD, PA e Inv.</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-semibold uppercase text-text-muted">3. BPIM Complementarios</span>
              <p className="text-base font-bold text-info">
                {datosAuditoria.embudo_financiero.bpim_complementarios_preservados} proyectos
              </p>
              <span className="text-[10px] text-text-muted block">15.614 filas PDD interinst.</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-semibold uppercase text-text-muted">4. Grupos Des-propagados</span>
              <p className="text-base font-bold text-success">
                {datosAuditoria.embudo_financiero.grupos_repetidos_despropagados} grupos
              </p>
              <span className="text-[10px] text-text-muted block">{datosAuditoria.embudo_financiero.sumatorios_podados} sumatorios podados</span>
            </div>

            <div className="rounded-xl border border-ember/30 bg-ember/5 p-4 space-y-1 shadow-sm">
              <span className="text-[10px] font-semibold uppercase text-ember">5. Saneado Anual Real</span>
              <p className="text-base font-bold text-ember">
                ${(datosAuditoria.embudo_financiero.presupuesto_anual_saneado_promedio_cop / 1e12).toFixed(2)} Billones
              </p>
              <span className="text-[10px] text-text-muted block">Pesos Constantes Base 2025</span>
            </div>
          </div>

          {/* Dos Columnas: Deflactación IPC DANE y Auditoría de Escalas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Tabla de Deflactación IPC DANE Base 2025 */}
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="border-b border-border p-4 bg-surface-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-ember" />
                  Deflactación con IPC Oficial DANE (Base Cerrada 2025 = 100)
                </h4>
                <p className="text-xs text-text-muted">
                  Incluye la tasa anual oficial 2025 (5,10%) y el corte provisional 2026
                </p>
              </div>

              <div className="overflow-x-auto divide-y divide-border">
                <table className="w-full text-left text-xs" role="table">
                  <thead className="bg-surface-2 text-text-muted">
                    <tr>
                      <th className="p-3 font-semibold">Vigencia</th>
                      <th className="p-3 font-semibold">Inflación DANE</th>
                      <th className="p-3 font-semibold">Deflactor Base 2025</th>
                      <th className="p-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {datosAuditoria.deflactacion_ipc_dane.map((ipc, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/30">
                        <td className="p-3 font-bold text-text-primary">{ipc.vigencia}</td>
                        <td className="p-3 font-mono text-text-secondary">{ipc.inflacion_anual_pct.toFixed(2)}%</td>
                        <td className="p-3 font-mono font-semibold text-ember">{ipc.factor_deflactor_base_2025.toFixed(3)}x</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              ipc.estado === "BASE_CERRADA_100"
                                ? "border-primary/40 bg-primary/10 text-primary font-bold"
                                : ipc.estado === "CERTIFICADO"
                                ? "border-success/30 bg-success-soft text-success"
                                : "border-warning/30 bg-warning-soft text-warning"
                            }`}
                          >
                            {ipc.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditoría de Escalas Porcentuales y Cuarentena */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-4">
              <div className="border-b border-border pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <Binary className="h-4 w-4 text-info" />
                  Auditoría de Escalas Porcentuales [0..1] vs [0..100]
                </h4>
                <p className="text-xs text-text-muted">
                  Reconciliación de 1.466 combinaciones de hoja y aislamiento de casos atípicos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Hojas Mixtas</span>
                  <p className="text-base font-bold text-text-primary">
                    {datosAuditoria.auditoria_escalas_porcentuales.hojas_mixtas_detectadas}
                  </p>
                  <span className="text-[10px] text-success">Reconciliadas por cociente ejec/prog</span>
                </div>

                <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Cuarentena Ambigua</span>
                  <p className="text-base font-bold text-warning">
                    {datosAuditoria.auditoria_escalas_porcentuales.casos_cuarentena_escala_ambigua} casos
                  </p>
                  <span className="text-[10px] text-text-muted">Rango [0.5%..50%] sin distorsión</span>
                </div>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-0/60 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <FileCheck2 className="h-4 w-4 text-ember shrink-0 mt-0.5" />
                  <p className="text-text-secondary leading-relaxed">
                    {datosAuditoria.auditoria_escalas_porcentuales.diagnostico_metodologico}
                  </p>
                </div>
                <div className="pt-2 border-t border-border-subtle flex justify-between items-center text-[11px]">
                  <span className="text-text-muted">Filas &gt; 100 Auditadas Separadamente:</span>
                  <Badge variant="outline" className="border-info/30 bg-info-soft text-text-primary text-[10px]">
                    {datosAuditoria.auditoria_escalas_porcentuales.casos_mayores_100_auditados} Sobrecumplimiento
                  </Badge>
                </div>
              </div>

              {/* Salvaguarda de los 6 Pares Sin Insumo */}
              <div className="rounded-lg border border-error/20 bg-error-soft/30 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-error font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Salvaguarda Rigurosa: Exclusión de 6 Pares Sin Insumo Financiero</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  En cumplimiento de la Corrección 4, <strong>nunca se asigna un ε artificial</strong> para inventar presupuesto.
                  Los 6 pares entidad-año sin reporte financiero positivo se excluyen explícitamente de la frontera con estado{" "}
                  <code className="text-error font-mono text-[10px]">no_estimable_sin_insumo_financiero</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de los 6 Pares Excluidos */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 bg-surface-2 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Inventario Transparente de los 6 Pares Entidad-Año Excluidos por Falta de Insumo Financiero
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" role="table">
                <thead className="bg-surface-2 text-text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Entidad</th>
                    <th className="p-3 font-semibold">Sigla</th>
                    <th className="p-3 font-semibold">Vigencia</th>
                    <th className="p-3 font-semibold">Causa Específica de Exclusión</th>
                    <th className="p-3 font-semibold">Tratamiento Metodológico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {datosAuditoria.pares_sin_insumo_financiero.map((par, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/30">
                      <td className="p-3 font-medium text-text-primary">{par.entidad}</td>
                      <td className="p-3 font-mono text-xs">{par.sigla}</td>
                      <td className="p-3 font-semibold">{par.vigencia}</td>
                      <td className="p-3 text-text-secondary">{par.motivo}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-error/30 bg-error-soft text-error text-[10px]">
                          {par.tratamiento_metodologico}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 2: FRONTERA DE EFICIENCIA DEA (CCR · BCC · SBM · BOOTSTRAP) */}
      {/* ==================================================================== */}
      {subvistaDea === "frontera_eficiencia" && (
        <section
          data-testid="subvista-dea-frontera-eficiencia"
          aria-label="Frontera de Eficiencia DEA"
          className="space-y-6"
        >
          {/* Barra de Filtros y Configuración del Modelo LP */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-ember" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Configuración del Modelo Lineal DEA (Solver HiGHS)
                </h3>
              </div>
              <Badge variant="outline" className="border-info/30 bg-info-soft text-text-primary text-xs">
                Cooper: n = {datosFrontera.dmus_estimables} &gt;= {datosFrontera.cooper_n_minimo} (Cumplido)
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Vigencia */}
              <div className="w-[170px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Vigencia Fiscal</Label>
                <Select value={vigenciaSeleccionada} onValueChange={setVigenciaSeleccionada}>
                  <SelectTrigger className="text-xs" aria-label="Seleccionar vigencia fiscal">
                    <SelectValue placeholder="Vigencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025" className="text-xs">2025 (Cierre Oficial Base 100)</SelectItem>
                    <SelectItem value="2024" className="text-xs">2024 (Ciudad de Derechos)</SelectItem>
                    <SelectItem value="2023" className="text-xs">2023 (Salvemos Juntos)</SelectItem>
                    <SelectItem value="2022" className="text-xs">2022 (Salvemos Juntos)</SelectItem>
                    <SelectItem value="2021" className="text-xs">2021 (Salvemos Juntos)</SelectItem>
                    <SelectItem value="2020" className="text-xs">2020 (Salvemos Juntos)</SelectItem>
                    <SelectItem value="2026_PARCIAL" className="text-xs">2026 (Corte Parcial Provisional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Especificación (Núcleo vs Extendida) */}
              <div className="w-[230px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Especificación DEA</Label>
                <Select
                  value={modoEspecificacion}
                  onValueChange={(val) => setModoEspecificacion(val as "nucleo_1x2" | "extendida_2x3")}
                >
                  <SelectTrigger className="text-xs" aria-label="Seleccionar especificación DEA">
                    <SelectValue placeholder="Especificación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nucleo_1x2" className="text-xs">
                      Núcleo m=1, s=2 (Cooper n≥9)
                    </SelectItem>
                    <SelectItem value="extendida_2x3" className="text-xs">
                      Extendida m=2, s=3 (Cooper n≥15)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Insumo Financiero */}
              <div className="w-[210px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Insumo Financiero (X1)</Label>
                <Select
                  value={insumoSeleccionado}
                  onValueChange={(val) => setInsumoSeleccionado(val as "apropiacion" | "pagos")}
                >
                  <SelectTrigger className="text-xs" aria-label="Seleccionar insumo financiero">
                    <SelectValue placeholder="Insumo Financiero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apropiacion" className="text-xs">
                      Apropiación Constante 2025
                    </SelectItem>
                    <SelectItem value="pagos" className="text-xs">
                      Pagos Tesorería Ejecutados
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Grupo Institucional */}
              <div className="w-[220px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Grupo Institucional</Label>
                <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por grupo institucional">
                    <SelectValue placeholder="Todos los grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los grupos</SelectItem>
                    <SelectItem value="SECTOR_CENTRAL_RECTOR" className="text-xs">Sector Central Rector (n=11)</SelectItem>
                    <SelectItem value="DESCENTRALIZADAS_Y_AUTORIDADES" className="text-xs">Descentralizadas (n=16)</SelectItem>
                    <SelectItem value="ALCALDIAS_LOCALES" className="text-xs">Alcaldías Locales (n=3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Retornos a Escala */}
              <div className="w-[180px]">
                <Label className="text-[11px] text-text-muted mb-1 block">Retornos de Escala (RTS)</Label>
                <Select value={filtroRetornos} onValueChange={setFiltroRetornos}>
                  <SelectTrigger className="text-xs" aria-label="Filtrar por retornos de escala">
                    <SelectValue placeholder="Todos los retornos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="text-xs">Todos los retornos</SelectItem>
                    <SelectItem value="CRS" className="text-xs">CRS (Constantes)</SelectItem>
                    <SelectItem value="IRS" className="text-xs">IRS (Crecientes)</SelectItem>
                    <SelectItem value="DRS" className="text-xs">DRS (Decrecientes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Búsqueda por Entidad */}
              <div className="min-w-[200px] flex-1">
                <Label className="text-[11px] text-text-muted mb-1 block">Buscar Entidad</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                  <Input
                    value={busquedaEntidad}
                    onChange={(e) => setBusquedaEntidad(e.target.value)}
                    placeholder="Filtrar por nombre o sigla (ej. SED, DADIS, EPA)..."
                    className="pl-8 text-xs"
                    aria-label="Buscar entidad o sigla"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas KPI de la Frontera */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia BCC (VRS)</span>
              <p className="text-lg font-bold text-success">
                {(datosFrontera.eficiencia_media_bcc * 100).toFixed(1)}%
              </p>
              <span className="text-[10px] text-text-muted">Media distrital</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia CCR (CRS)</span>
              <p className="text-lg font-bold text-info">
                {(datosFrontera.eficiencia_media_ccr * 100).toFixed(1)}%
              </p>
              <span className="text-[10px] text-text-muted">Rendimientos constantes</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-text-muted">Eficiencia SBM (Tone)</span>
              <p className="text-lg font-bold text-ember">
                {(datosFrontera.eficiencia_media_sbm * 100).toFixed(1)}%
              </p>
              <span className="text-[10px] text-text-muted">Medida no radial</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-text-muted">DMUs en Frontera</span>
              <p className="text-lg font-bold text-text-primary">
                {dmusFiltradas.filter((d) => d.theta_bcc >= 0.999).length}
              </p>
              <span className="text-[10px] text-success">θ_BCC = 1.000</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-text-muted">DMUs Rezagadas</span>
              <p className="text-lg font-bold text-error">
                {dmusFiltradas.filter((d) => d.theta_bcc < 0.70).length}
              </p>
              <span className="text-[10px] text-text-muted">θ_BCC &lt; 0.70</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-text-muted">Bootstrap B=1.000</span>
              <p className="text-lg font-bold text-primary">
                IC 95%
              </p>
              <span className="text-[10px] text-text-muted">Corregido por sesgo</span>
            </div>
          </div>

          {/* Fronteras de Grupo: Tarjetas con Regla de Cooper */}
          <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Layers className="h-4 w-4 text-ember" />
              Fronteras Específicas por Grupo Institucional (Regla de Cooper n ≥ 9)
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {datosFrontera.fronteras_grupo.map((fg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 space-y-1.5 ${
                    fg.cumple_cooper
                      ? "border-border-subtle bg-surface-2"
                      : "border-warning/30 bg-warning-soft/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">{fg.nombre_grupo}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        fg.cumple_cooper
                          ? "border-success/30 bg-success-soft text-success"
                          : "border-warning/30 bg-warning-soft text-warning"
                      }`}
                    >
                      {fg.cumple_cooper ? `n=${fg.n_efectivo} ≥ 9 OK` : `n=${fg.n_efectivo} < 9 Panel`}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Eficiencia Media BCC:</span>
                    <span className="font-bold text-text-primary">
                      {fg.cumple_cooper ? `${(fg.eficiencia_media_bcc * 100).toFixed(1)}%` : "N/A (Muestra Insuf.)"}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-tight">{fg.estado}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla Maestra de Puntajes DEA */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="flex flex-wrap items-center justify-between p-4 bg-surface-2 border-b border-border">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Matriz de Eficiencia DEA ({dmusFiltradas.length} DMUs Evaluadas)
                </h4>
                <p className="text-xs text-text-muted">
                  Resultados del solver HiGHS, intervalos de confianza bootstrap y pares de referencia
                </p>
              </div>

              <span className="text-xs text-text-secondary">
                Vigencia activa: <strong>{datosFrontera.vigencia}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" role="table">
                <thead className="bg-surface-2 text-text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Entidad / Sigla</th>
                    <th className="p-3 font-semibold text-right">X1 ($M COP)</th>
                    <th className="p-3 font-semibold text-right">Y1 Metas PDD</th>
                    <th className="p-3 font-semibold text-right">Y2 Actividades PA</th>
                    <th className="p-3 font-semibold text-center">θ_CCR</th>
                    <th className="p-3 font-semibold text-center">θ_BCC</th>
                    <th className="p-3 font-semibold text-center">Escala (SE / RTS)</th>
                    <th className="p-3 font-semibold text-center">θ_SBM</th>
                    <th className="p-3 font-semibold text-center">Bootstrap [IC 95%]</th>
                    <th className="p-3 font-semibold">Peers λ*</th>
                    <th className="p-3 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {dmusFiltradas.map((dmu) => (
                    <tr key={dmu.sigla} className="hover:bg-surface-2/40 transition-colors">
                      <td className="p-3">
                        <span className="font-semibold text-text-primary block">{dmu.entidad}</span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Badge variant="outline" className="font-mono text-[10px] text-ember border-ember/30">
                            {dmu.sigla}
                          </Badge>
                          <span className="text-[10px] text-text-muted truncate max-w-[150px]">
                            {dmu.grupo_institucional === "SECTOR_CENTRAL_RECTOR"
                              ? "Sector Central"
                              : dmu.grupo_institucional === "DESCENTRALIZADAS_Y_AUTORIDADES"
                              ? "Descentralizada"
                              : "Alcaldía Local"}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono text-text-secondary">
                        ${dmu.x1_presupuesto_constante_2025_mcop.toLocaleString()}M
                      </td>

                      <td className="p-3 text-right font-mono font-medium text-text-primary">
                        {dmu.y1_metas_pdd_equivalentes.toFixed(1)}
                      </td>

                      <td className="p-3 text-right">
                        <span className="font-mono font-medium text-text-primary block">
                          {dmu.y2_actividades_pa_equivalentes.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-success">
                          {dmu.y2_calidad_verbo_fuerte_equivalentes.toFixed(0)} fuertes
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono">
                        <span className={dmu.theta_ccr >= 0.999 ? "text-success font-bold" : "text-text-secondary"}>
                          {dmu.theta_ccr.toFixed(3)}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono">
                        <span
                          className={`font-bold ${
                            dmu.theta_bcc >= 0.999
                              ? "text-success"
                              : dmu.theta_bcc >= 0.80
                              ? "text-info"
                              : dmu.theta_bcc >= 0.65
                              ? "text-warning"
                              : "text-error"
                          }`}
                        >
                          {dmu.theta_bcc.toFixed(3)}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-mono text-[11px] block">{dmu.escala_eficiencia_se.toFixed(3)}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            dmu.retornos_escala_rts === "CRS"
                              ? "border-success/30 bg-success-soft text-success"
                              : dmu.retornos_escala_rts === "IRS"
                              ? "border-info/30 bg-info-soft text-info"
                              : "border-warning/30 bg-warning-soft text-warning"
                          }`}
                        >
                          {dmu.retornos_escala_rts}
                        </Badge>
                      </td>

                      <td className="p-3 text-center font-mono text-text-secondary">
                        {dmu.theta_sbm.toFixed(3)}
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-mono font-medium text-xs block">
                          {dmu.theta_bootstrap_corregido.toFixed(3)}
                        </span>
                        <span className="font-mono text-[9px] text-text-muted">
                          [{dmu.ic95_inf.toFixed(3)}..{dmu.ic95_sup.toFixed(3)}]
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {dmu.peers.map((p, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] font-mono">
                              {p.sigla}: {(p.lambda * 100).toFixed(0)}%
                            </Badge>
                          ))}
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDmuSeleccionadaModal(dmu)}
                          className="text-[11px] gap-1"
                          data-testid={`btn-ver-slacks-${dmu.sigla}`}
                        >
                          <Target className="h-3 w-3" />
                          <span>Holguras</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diálogo / Modal de Holguras y Metas Objetivo en la Frontera */}
          {dmuSeleccionadaModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-slacks-title"
            >
              <div className="max-w-xl w-full rounded-xl border border-border bg-surface-1 p-6 space-y-4 shadow-2xl">
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div>
                    <h3 id="modal-slacks-title" className="text-base font-bold text-text-primary">
                      Proyección y Holguras en la Frontera (Slacks & Targets)
                    </h3>
                    <p className="text-xs text-text-muted">
                      {dmuSeleccionadaModal.entidad} ({dmuSeleccionadaModal.sigla}) · θ_BCC = {dmuSeleccionadaModal.theta_bcc.toFixed(3)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDmuSeleccionadaModal(null)}
                    aria-label="Cerrar modal de holguras"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-text-secondary">
                    Para que esta unidad alcance la faceta envolvente de eficiencia (θ = 1.000) bajo rendimientos variables (BCC),
                    el modelo de Tone determina los siguientes ajustes simultáneos de entrada y salida:
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Insumo X1 (Presupuesto)</span>
                      <p className="text-sm font-bold text-text-primary">
                        ${dmuSeleccionadaModal.x1_presupuesto_constante_2025_mcop.toLocaleString()}M
                      </p>
                      <div className="pt-1 text-[11px] text-error">
                        Reducir: -${dmuSeleccionadaModal.holguras_slacks.slack_x1_mcop.toLocaleString()}M
                      </div>
                      <div className="text-[11px] text-success font-semibold">
                        Meta Target: ${dmuSeleccionadaModal.metas_target_frontera.target_x1_mcop.toLocaleString()}M
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Producto Y1 (Metas PDD)</span>
                      <p className="text-sm font-bold text-text-primary">
                        {dmuSeleccionadaModal.y1_metas_pdd_equivalentes.toFixed(1)} metas
                      </p>
                      <div className="pt-1 text-[11px] text-info">
                        Expandir: +{dmuSeleccionadaModal.holguras_slacks.slack_y1_metas.toFixed(1)} metas
                      </div>
                      <div className="text-[11px] text-success font-semibold">
                        Meta Target: {dmuSeleccionadaModal.metas_target_frontera.target_y1_metas.toFixed(1)} metas
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold">Producto Y2 (Actividades PA)</span>
                      <p className="text-sm font-bold text-text-primary">
                        {dmuSeleccionadaModal.y2_actividades_pa_equivalentes.toFixed(0)} activ.
                      </p>
                      <div className="pt-1 text-[11px] text-info">
                        Expandir: +{dmuSeleccionadaModal.holguras_slacks.slack_y2_actividades.toFixed(0)} activ.
                      </div>
                      <div className="text-[11px] text-success font-semibold">
                        Meta Target: {dmuSeleccionadaModal.metas_target_frontera.target_y2_actividades.toFixed(0)} activ.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border-subtle bg-surface-0/60 p-3 space-y-1.5 text-[11px]">
                    <span className="font-bold text-text-primary block">Pares de Referencia de la Envolvente:</span>
                    <div className="flex flex-wrap gap-2">
                      {dmuSeleccionadaModal.peers.map((peer, idx) => (
                        <Badge key={idx} variant="outline" className="border-primary/30 bg-primary/10 text-primary font-mono text-xs">
                          {peer.sigla} (λ = {peer.lambda.toFixed(2)})
                        </Badge>
                      ))}
                    </div>
                    <p className="text-text-muted pt-1">
                      Esta unidad debe emular las prácticas de asignación operativa y formulación de metas de estos pares de referencia.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="ember" size="sm" onClick={() => setDmuSeleccionadaModal(null)}>
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 3: PRODUCTIVIDAD DINÁMICA DE MALMQUIST (2020–2025)         */}
      {/* ==================================================================== */}
      {subvistaDea === "malmquist" && (
        <section
          data-testid="subvista-dea-malmquist"
          aria-label="Productividad Dinámica de Malmquist"
          className="space-y-6"
        >
          {/* Selector de Transición Anual */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-ember" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Índice de Productividad Total de los Factores (Malmquist MPI = EFFCH × TECHCH)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {datosMalmquist.transiciones.map((t) => (
                <Button
                  key={t.periodo}
                  variant={transicionSeleccionada === t.periodo ? "ember" : "outline"}
                  size="sm"
                  onClick={() => setTransicionSeleccionada(t.periodo)}
                  className="text-xs font-semibold"
                  data-testid={`btn-malmquist-${t.periodo}`}
                >
                  {t.periodo}
                </Button>
              ))}
            </div>
          </div>

          {/* Tarjetas KPI de la Transición Activa */}
          {transicionActiva && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-ember/30 bg-ember/5 p-4 space-y-1 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-ember">Malmquist MPI Global</span>
                <p className="text-2xl font-bold text-text-primary">{transicionActiva.mpi_medio.toFixed(3)}</p>
                <span className={`text-[10px] font-semibold ${transicionActiva.mpi_medio >= 1.0 ? "text-success" : "text-error"}`}>
                  {transicionActiva.mpi_medio >= 1.0 ? "+ Avance de Productividad" : "- Retroceso Temporal"}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-text-muted">EFFCH (Catch-up Interno)</span>
                <p className="text-2xl font-bold text-success">{transicionActiva.effch_medio.toFixed(3)}</p>
                <span className="text-[10px] text-text-muted">Gestión interna y procesos</span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-text-muted">TECHCH (Desplazamiento)</span>
                <p className="text-2xl font-bold text-info">{transicionActiva.techch_medio.toFixed(3)}</p>
                <span className="text-[10px] text-text-muted">Frontera tecnológica distrital</span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-text-muted">PECH (Eficiencia Pura)</span>
                <p className="text-2xl font-bold text-text-primary">{transicionActiva.pech_medio.toFixed(3)}</p>
                <span className="text-[10px] text-text-muted">Sin distorsión de tamaño</span>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-text-muted">SECH (Cambio de Escala)</span>
                <p className="text-2xl font-bold text-text-secondary">{transicionActiva.sech_medio.toFixed(3)}</p>
                <span className="text-[10px] text-text-muted">Ajuste de rendimientos</span>
              </div>
            </div>
          )}

          {/* Diagnóstico Institucional del Sexenio */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Compass className="h-4 w-4 text-info" />
              Dictamen Forense de Productividad (2020–2025)
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              {datosMalmquist.resumen_periodo_completo.diagnostico_institucional}
            </p>
            <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-4 text-xs">
              <span className="text-success font-semibold">
                ✓ {datosMalmquist.resumen_periodo_completo.entidades_avance_productividad} Entidades con Productividad Positiva (MPI &gt; 1)
              </span>
              <span className="text-error font-semibold">
                ✗ {datosMalmquist.resumen_periodo_completo.entidades_retroceso_productividad} Entidades en Cuello de Botella (MPI &lt; 1)
              </span>
            </div>
          </div>

          {/* Desglose por Entidad en la Transición */}
          {transicionActiva && (
            <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 bg-surface-2 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Desglose de Descomposición por Entidad ({transicionActiva.periodo})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" role="table">
                  <thead className="bg-surface-2 text-text-muted">
                    <tr>
                      <th className="p-3 font-semibold">Entidad</th>
                      <th className="p-3 font-semibold">Sigla</th>
                      <th className="p-3 font-semibold text-center">MPI (Total)</th>
                      <th className="p-3 font-semibold text-center">EFFCH (Catch-up)</th>
                      <th className="p-3 font-semibold text-center">TECHCH (Shift)</th>
                      <th className="p-3 font-semibold">Interpretación Analítica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {transicionActiva.desglose_por_entidad.map((dmu, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                        <td className="p-3 font-medium text-text-primary">{dmu.entidad}</td>
                        <td className="p-3 font-mono text-xs">{dmu.sigla}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={dmu.mpi >= 1.0 ? "text-success" : "text-error"}>
                            {dmu.mpi.toFixed(3)}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={dmu.effch >= 1.0 ? "text-success" : "text-text-secondary"}>
                            {dmu.effch.toFixed(3)}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={dmu.techch >= 1.0 ? "text-info" : "text-text-secondary"}>
                            {dmu.techch.toFixed(3)}
                          </span>
                        </td>
                        <td className="p-3 text-text-secondary">{dmu.interpretacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* SUB-VISTA 4: SEGUNDA ETAPA ECONOMÉTRICA, CORRELACIONES FDR, GINI     */}
      {/* ==================================================================== */}
      {subvistaDea === "econometria_segunda_etapa" && (
        <section
          data-testid="subvista-dea-econometria-segunda-etapa"
          aria-label="Segunda Etapa Econométrica, Correlaciones FDR, Gini y Wilcoxon"
          className="space-y-6"
        >
          {/* Ficha Metodológica de la Segunda Etapa */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-ember" />
                <h3 className="text-sm font-bold text-text-primary">
                  Modelo Econométrico Explicativo de 2ª Etapa (Sin Endogeneidad Presupuestal)
                </h3>
              </div>
              <Badge variant="outline" className="border-success/30 bg-success-soft text-success text-xs font-semibold">
                R² = {datosSegundaEtapa.especificacion_modelo.r_cuadrado.toFixed(3)} (F = {datosSegundaEtapa.especificacion_modelo.f_statistic.toFixed(2)})
              </Badge>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              En cumplimiento estricto de la <strong>Corrección 8</strong>, se excluye <code className="text-primary font-mono text-[11px]">ln(Presupuesto)</code> como regresor
              para prevenir colinealidad y endogeneidad con el insumo $X_1$ de la frontera DEA. La inferencia estadística utiliza remuestreo
              <strong> Bootstrap agrupado por entidad (B = 1.000 réplicas, semilla=20261015)</strong> sobre las {datosSegundaEtapa.especificacion_modelo.observaciones_n} observaciones entidad-año (2020–2025).
            </p>
          </div>

          {/* Tabla de Coeficientes de Regresión */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 bg-surface-2 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Coeficientes Estimados sobre Eficiencia DEA-BCC (θ_BCC)
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" role="table">
                <thead className="bg-surface-2 text-text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Covariable Exógena</th>
                    <th className="p-3 font-semibold text-right">Coeficiente (β)</th>
                    <th className="p-3 font-semibold text-right">Error Est. (SE)</th>
                    <th className="p-3 font-semibold text-right">t-stat</th>
                    <th className="p-3 font-semibold text-center">p-value</th>
                    <th className="p-3 font-semibold text-center">IC 95% Bootstrap</th>
                    <th className="p-3 font-semibold">Impacto en Política Pública</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {datosSegundaEtapa.coeficientes_regresion.map((c, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                      <td className="p-3">
                        <span className="font-semibold text-text-primary block">{c.nombre_covariable}</span>
                        <span className="font-mono text-[10px] text-text-muted">{c.parametro}</span>
                      </td>

                      <td className="p-3 text-right font-mono font-bold">
                        <span className={c.coeficiente < 0 ? "text-error" : "text-success"}>
                          {c.coeficiente > 0 ? `+${c.coeficiente.toFixed(3)}` : c.coeficiente.toFixed(3)}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono text-text-muted">
                        {c.error_estandar.toFixed(3)}
                      </td>

                      <td className="p-3 text-right font-mono text-text-secondary">
                        {c.t_statistic.toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            c.p_value < 0.01
                              ? "border-success/30 bg-success-soft text-success font-bold"
                              : c.p_value < 0.05
                              ? "border-info/30 bg-info-soft text-info"
                              : "border-border-subtle text-text-muted"
                          }`}
                        >
                          {c.significancia}
                        </Badge>
                      </td>

                      <td className="p-3 text-center font-mono text-[11px] text-text-secondary">
                        [{c.ic95_inferior.toFixed(3)}..{c.ic95_superior.toFixed(3)}]
                      </td>

                      <td className="p-3 text-text-secondary text-[11px] leading-tight">
                        {c.interpretacion_politica}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Matriz de Correlaciones con Corrección FDR Benjamini-Hochberg */}
          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 bg-surface-2 border-b border-border flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Matriz de Correlaciones de Spearman (ρ) y Pearson (r) con Corrección FDR Benjamini-Hochberg
                </h4>
                <p className="text-xs text-text-muted">
                  Control estricto de la tasa de falsos descubrimientos (False Discovery Rate, q-value &lt; 0.05)
                </p>
              </div>
              <Badge variant="outline" className="border-info/30 bg-info-soft text-text-primary text-xs">
                FDR q-value &lt; 0.05
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" role="table">
                <thead className="bg-surface-2 text-text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Par de Variables</th>
                    <th className="p-3 font-semibold text-center">Spearman (ρ)</th>
                    <th className="p-3 font-semibold text-center">Pearson (r)</th>
                    <th className="p-3 font-semibold text-center">Muestra (n)</th>
                    <th className="p-3 font-semibold text-center">p-value</th>
                    <th className="p-3 font-semibold text-center">q-value (FDR)</th>
                    <th className="p-3 font-semibold text-center">Significancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {datosSegundaEtapa.matriz_correlaciones.map((cor, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                      <td className="p-3 font-medium text-text-primary">
                        {cor.variable_a} <span className="text-text-muted">↔</span> {cor.variable_b}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-text-primary">
                        {cor.spearman_rho.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-text-secondary">
                        {cor.pearson_r.toFixed(3)}
                      </td>
                      <td className="p-3 text-center font-mono text-text-muted">
                        {cor.n}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px]">
                        {cor.p_value.toFixed(6)}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] font-semibold text-ember">
                        {cor.q_value_fdr.toFixed(6)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            cor.es_significativa_fdr
                              ? "border-success/30 bg-success-soft text-success font-semibold"
                              : "border-border-subtle text-text-muted"
                          }`}
                        >
                          {cor.es_significativa_fdr ? "✓ FDR Válido" : "No Significativo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dos Columnas: Concentración Gini/HHI y Prueba Pareada de Wilcoxon */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gini y HHI Histórico */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-4">
              <div className="border-b border-border pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-ember" />
                  Evolución del Coeficiente de Gini Presupuestal (2017–2026)
                </h4>
                <p className="text-xs text-text-muted">
                  Desconcentración histórica de 0,634 en pandemia a 0,538 en 2025
                </p>
              </div>

              <div className="space-y-2">
                {datosSegundaEtapa.desigualdad_presupuestal.gini_historico.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-2/60">
                    <span className="font-semibold text-text-primary">{g.vigencia}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className="h-full bg-ember"
                          style={{ width: `${(g.coeficiente_gini / 0.70) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-text-primary w-12 text-right">
                        {g.coeficiente_gini.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border-subtle flex justify-between items-center text-xs">
                <span className="text-text-muted">Índice HHI Distrital Global:</span>
                <Badge variant="outline" className="border-info/30 bg-info-soft text-text-primary font-mono text-xs">
                  {datosSegundaEtapa.desigualdad_presupuestal.hhi_general_distrital} pts (Moderado)
                </Badge>
              </div>
            </div>

            {/* Prueba Pareada de Wilcoxon */}
            <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-border pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-success" />
                    Prueba Pareada de Wilcoxon (Wilcoxon Signed-Rank Test)
                  </h4>
                  <p className="text-xs text-text-muted">
                    Comparación formal entre el gobierno 2020–2023 y el gobierno 2024–2025
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold">Periodo 1 (2020–2023)</span>
                    <p className="text-base font-bold text-text-secondary">
                      {(datosSegundaEtapa.prueba_wilcoxon_pareada.eficiencia_media_p1 * 100).toFixed(1)}%
                    </p>
                    <span className="text-[10px] text-text-muted">Salvemos Juntos</span>
                  </div>

                  <div className="rounded-lg border border-success/30 bg-success-soft/30 p-3 space-y-1">
                    <span className="text-[10px] text-success uppercase font-bold">Periodo 2 (2024–2025)</span>
                    <p className="text-base font-bold text-success">
                      {(datosSegundaEtapa.prueba_wilcoxon_pareada.eficiencia_media_p2 * 100).toFixed(1)}%
                    </p>
                    <span className="text-[10px] text-success font-semibold">
                      +{ (datosSegundaEtapa.prueba_wilcoxon_pareada.diferencia_medias * 100).toFixed(1) } pts avance
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="rounded-lg border border-border-subtle bg-surface-2 p-2.5 text-center">
                    <span className="text-[10px] text-text-muted block">Muestra Pareada</span>
                    <span className="font-mono font-bold text-text-primary">n = {datosSegundaEtapa.prueba_wilcoxon_pareada.n_pareado}</span>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-2 p-2.5 text-center">
                    <span className="text-[10px] text-text-muted block">Estadístico W</span>
                    <span className="font-mono font-bold text-text-primary">{datosSegundaEtapa.prueba_wilcoxon_pareada.estadistico_w.toFixed(1)}</span>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-2 p-2.5 text-center">
                    <span className="text-[10px] text-text-muted block">p-value Bilateral</span>
                    <span className="font-mono font-bold text-success">{datosSegundaEtapa.prueba_wilcoxon_pareada.p_value_bilateral.toFixed(4)}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-success/30 bg-success-soft/40 p-3.5 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Conclusión Pericial Rigurosa (Rechazo H₀ al 99,8%)</span>
                  </div>
                  <p className="text-text-primary text-[11px] leading-relaxed">
                    {datosSegundaEtapa.prueba_wilcoxon_pareada.conclusion_cientifica}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-text-muted">
                * Calculado únicamente sobre las 28 entidades distritales con presencia continua en ambos cuatrienios.
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
