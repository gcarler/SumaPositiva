"use client";

import {useState, useMemo} from "react";
import Link from "next/link";
import {motion, useReducedMotion} from "framer-motion";
import {
  Compass,
  Building2,
  Search,
  Crown,
  ArrowRight,
  ExternalLink,
  MapPin,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronRight,
  FileCheck2
} from "lucide-react";
import {usePanels} from "@/core/panels/panel-store";
import {Button} from "@/shared/ui/button";
import {Input} from "@/shared/ui/input";
import {
  DEPENDENCIAS_CARTAGENA_2026,
  AVANCE_PROMEDIO_PDD_2026,
  FECHA_CORTE_AUDITORIA,
  obtenerDependenciaPorId
} from "../data/entidades-cartagena.data";
import {
  DIMENSIONES_DETALLE_2026,
  obtenerEntidadConTitular,
  type DimensionDetalle
} from "../data/dimensiones-detalle.data";

type ModoExploracion = "dimensiones" | "dependencias";
type TipoFiltroEntidad = "todas" | "secretaria" | "ente_descentralizado" | "unidad_asesora" | "alcaldia_local";
type SemaforoFiltro = "todos" | "verde" | "amarillo" | "rojo";

export function DimensionesView() {
  const reducedMotion = useReducedMotion();
  const { openPanel } = usePanels();

  // Estados de navegación interna
  const [modo, setModo] = useState<ModoExploracion>("dimensiones");
  const [dimensionSeleccionadaId, setDimensionSeleccionadaId] = useState<string>("personal");
  const [busqueda, setBusqueda] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltroEntidad>("todas");
  const [semaforoFiltro, setSemaforoFiltro] = useState<SemaforoFiltro>("todos");

  // Dimensión activa en Modo A
  const dimensionActiva = useMemo<DimensionDetalle>(() => {
    return (
      DIMENSIONES_DETALLE_2026.find((d) => d.id === dimensionSeleccionadaId) ??
      DIMENSIONES_DETALLE_2026[0]
    );
  }, [dimensionSeleccionadaId]);

  // Entidad Líder de la dimensión activa
  const entidadLider = useMemo(() => {
    const raw = obtenerDependenciaPorId(dimensionActiva.entidadLiderId);
    return raw ? obtenerEntidadConTitular(raw) : null;
  }, [dimensionActiva]);

  // Corresponsables enriquecidos con su rol y datos de la dependencia
  const corresponsablesEnriquecidos = useMemo(() => {
    return dimensionActiva.corresponsables
      .map((item) => {
        const dep = obtenerDependenciaPorId(item.dependenciaId);
        if (!dep) return null;
        return {
          ...item,
          dependencia: obtenerEntidadConTitular(dep),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dimensionActiva]);

  // Lista enriquecida de las 27+ dependencias para Modo B
  const dependenciasEnriquecidas = useMemo(() => {
    return DEPENDENCIAS_CARTAGENA_2026.map(obtenerEntidadConTitular);
  }, []);

  // Filtrado de dependencias en Modo B
  const dependenciasFiltradas = useMemo(() => {
    return dependenciasEnriquecidas.filter((dep) => {
      // Filtro por tipo
      if (tipoFiltro !== "todas") {
        if (tipoFiltro === "secretaria" && dep.tipo !== "secretaria") return false;
        if (
          tipoFiltro === "ente_descentralizado" &&
          !["ente_descentralizado", "empresa_industrial", "institucion_educativa"].includes(
            dep.tipo
          )
        )
          return false;
        if (tipoFiltro === "unidad_asesora" && dep.tipo !== "unidad_asesora") return false;
        if (tipoFiltro === "alcaldia_local" && dep.tipo !== "alcaldia_local") return false;
      }

      // Filtro por semáforo
      const avance = dep.avancePlanAccion2026 ?? 38.8;
      if (semaforoFiltro === "verde" && avance < 40) return false;
      if (semaforoFiltro === "amarillo" && (avance < 25 || avance >= 40)) return false;
      if (semaforoFiltro === "rojo" && avance >= 25) return false;

      // Filtro por texto de búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincide =
          dep.nombre.toLowerCase().includes(q) ||
          (dep.sigla?.toLowerCase() ?? "").includes(q) ||
          dep.codigo.toLowerCase().includes(q) ||
          dep.titular.toLowerCase().includes(q) ||
          dep.competenciaSeguridadHumana.toLowerCase().includes(q) ||
          (dep.palabrasClave ?? []).some((pk) => pk.toLowerCase().includes(q));
        if (!coincide) return false;
      }

      return true;
    });
  }, [dependenciasEnriquecidas, tipoFiltro, semaforoFiltro, busqueda]);

  // Manejador para abrir panel de rendición con entidad específica
  const verRendicionEntidad = (depId: string) => {
    openPanel("rendicion-cuentas", { dependenciaId: depId });
  };

  return (
    <div className="flex flex-col gap-8 pb-16 pt-6">
      {/* ================= HEADER INSTITUCIONAL ================= */}
      <section className="container-fluid">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
          {/* Acento cromático institucional de fondo */}
          <div
            className="absolute -right-20 -top-20 size-72 rounded-full opacity-10 pointer-events-none blur-3xl bg-[var(--ember)]"
            aria-hidden
          />

          <div className="max-w-4xl relative z-10 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--ember)]">
                <Layers className="size-3.5" />
                Arquitectura de Gobernanza 2026–2036
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                <FileCheck2 className="size-3.5 text-[var(--success)]" />
                Decreto 037 de 2026 MinInterior
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Dimensiones de Seguridad Humana y Estructura Distrital
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
              Conoce cómo se articula el gobierno de Cartagena frente al paradigma multidimensional
              de la ONU: cada una de las <strong>7 Dimensiones</strong> cuenta con una{" "}
              <strong>Entidad Líder</strong> legalmente responsable, un mosaico de{" "}
              <strong>Entidades Corresponsables</strong> con proyectos específicos, y metas auditadas
              del <em>Plan de Desarrollo 2024–2027 &quot;Cartagena Ciudad de Derechos&quot;</em>.
            </p>

            {/* Métrica Banner de Transparencia */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Dimensiones ONU</p>
                <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                  7 + 1 <span className="text-xs font-normal text-[var(--text-secondary)]">Crisis</span>
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Dependencias Distritales</p>
                <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">27 Oficiales</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Avance Promedio Auditado</p>
                <p className="mt-0.5 text-lg font-bold text-[var(--success)]">
                  {AVANCE_PROMEDIO_PDD_2026}%{" "}
                  <span className="text-[10px] font-normal text-[var(--text-secondary)]">al corte</span>
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">Auditoría Oficial</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--text-primary)] truncate" title={FECHA_CORTE_AUDITORIA}>
                  {FECHA_CORTE_AUDITORIA}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CONTROLES DE MODO Y BÚSQUEDA ================= */}
      <section className="container-fluid">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:p-4">
          {/* Conmutador de Modos A / B */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setModo("dimensiones")}
              aria-label="Explorar por Dimensiones ONU"
              className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                modo === "dimensiones"
                  ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Compass className="size-4 text-[var(--ember)]" />
              <span>Por Dimensiones ONU</span>
              <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.2 text-[10px] text-[var(--text-tertiary)]">
                8
              </span>
            </Button>

            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setModo("dependencias")}
              aria-label="Explorar por Dependencias Distritales"
              className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                modo === "dependencias"
                  ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Building2 className="size-4 text-[var(--info)]" />
              <span>Por Dependencias Distritales</span>
              <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.2 text-[10px] text-[var(--text-tertiary)]">
                27
              </span>
            </Button>
          </div>

          {/* Buscador Rápido en Vivo */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            <Input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                modo === "dimensiones"
                  ? "Buscar por tema, palabra clave o entidad..."
                  : "Buscar por dependencia, titular o sigla..."
              }
              className="pl-9 text-xs sm:text-sm bg-[var(--surface-2)] border-[var(--border)] focus:border-[var(--border-strong)]"
              aria-label="Buscar en la estructura institucional"
            />
          </div>

          {/* Botón Acceso Rápido a Rendición */}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => openPanel("rendicion-cuentas", {})}
            className="border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] gap-1.5"
            aria-label="Abrir panel de Rendición de Cuentas 2026"
          >
            <BarChart3 className="size-3.5 text-[var(--ember)]" />
            <span>Semáforo Completo</span>
          </Button>
        </div>
      </section>

      {/* ================= MODO A: POR DIMENSIONES ONU ================= */}
      {modo === "dimensiones" && (
        <section className="container-fluid flex flex-col gap-6">
          {/* Carrusel de Pestañas de las 8 Dimensiones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {DIMENSIONES_DETALLE_2026.map((dim) => {
              const Icono = dim.icono;
              const activa = dim.id === dimensionActiva.id;

              return (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  key={dim.id}
                  type="button"
                  onClick={() => setDimensionSeleccionadaId(dim.id)}
                  aria-label={`Seleccionar dimensión ${dim.nombre}`}
                  aria-current={activa ? "true" : undefined}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all relative overflow-hidden ${
                    activa
                      ? "border-[var(--border-strong)] bg-[var(--surface-2)] shadow-sm ring-1 ring-[var(--ember)]/40"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] tabular">
                      {dim.numero}
                    </span>
                    <span
                      className={`flex size-6 items-center justify-center rounded-md ${
                        activa
                          ? "bg-[var(--surface-3)] text-[var(--ember)]"
                          : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <Icono className="size-3.5" />
                    </span>
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold leading-tight ${
                        activa ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {dim.nombreCorto}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)] truncate">
                      {dim.codigo}
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* FICHA DETALLADA DE LA DIMENSIÓN SELECCIONADA */}
          <motion.div
            key={dimensionActiva.id}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {/* Cabecera de la Dimensión Activa */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ember)] border border-[var(--border)]">
                    {(() => {
                      const Icono = dimensionActiva.icono;
                      return <Icono className="size-6 sm:size-7" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ember)]">
                        Dimensión {dimensionActiva.codigo}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {dimensionActiva.marcoLegal}
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
                      {dimensionActiva.nombre}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm font-medium text-[var(--text-secondary)] italic">
                      &quot;{dimensionActiva.lema}&quot;
                    </p>
                  </div>
                </div>

                {/* Presupuesto Concurrente de la Dimensión */}
                <div className="flex flex-col items-start lg:items-end justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 min-w-[220px]">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Inversión Concurrente 2026
                  </span>
                  <span className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                    {dimensionActiva.presupuestoTotalCop}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Recursos PDD + Regalías + SGP
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                {dimensionActiva.descripcion}
              </p>
            </div>

            {/* SECCIÓN 1: ENTIDAD LÍDER ASIGNADA (DESTACADA) */}
            {entidadLider && (
              <div className="rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--surface-1)] p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[var(--surface-2)] border-b border-l border-[var(--border-strong)] px-4 py-1.5 rounded-bl-xl flex items-center gap-1.5 text-xs font-bold text-[var(--ember)]">
                  <Crown className="size-3.5" />
                  <span>ENTIDAD LÍDER LEGALMENTE RESPONSABLE</span>
                </div>

                <div className="flex flex-col gap-5 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[var(--surface-3)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--text-primary)]">
                          {entidadLider.codigo}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                          {entidadLider.tipo.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="mt-1 text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                        {entidadLider.nombre}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm font-medium text-[var(--ember)]">
                        🏛️ {entidadLider.titular}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => verRendicionEntidad(entidadLider.id)}
                        className="border-[var(--border-strong)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-2)] gap-1.5"
                        aria-label={`Ver rendición de cuentas de ${entidadLider.nombre}`}
                      >
                        <BarChart3 className="size-3.5 text-[var(--ember)]" />
                        <span>Ver Auditoría ({entidadLider.avancePlanAccion2026 ?? 38.8}%)</span>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Misión en el Plan de Acción 2026
                    </p>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--text-primary)]">
                      {entidadLider.misionPlanAccion2026 ?? entidadLider.competenciaSeguridadHumana}
                    </p>
                  </div>

                  {/* Datos Clave: Presupuesto y Canales de Atención */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Presupuesto y Fuentes 2026
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-[var(--text-primary)]">
                          ${entidadLider.presupuesto2026Cop ?? "Por definir"}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">asignado para el año</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(entidadLider.fuentesFinanciacion ?? ["ICLD", "SGP"]).map((fuente) => (
                          <span
                            key={fuente}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                          >
                            {fuente}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Canales Directos de Atención Ciudadana
                      </p>
                      <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-[var(--text-tertiary)] shrink-0" />
                          <span className="truncate">{entidadLider.canalAtencion?.direccion ?? "Palacio de la Aduana, Centro Histórico"}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <ExternalLink className="size-3.5 text-[var(--text-tertiary)] shrink-0" />
                          <span className="truncate">{entidadLider.canalAtencion?.web ?? "https://www.cartagena.gov.co"}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--text-tertiary)] truncate">
                            {entidadLider.canalAtencion?.canalVirtual ?? "Sede Electrónica Distrital"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 2: MOSAICO DE ENTIDADES CORRESPONSABLES */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>🤝 Entidades Corresponsables en la Dimensión</span>
                    <span className="rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 text-xs font-bold text-[var(--ember)]">
                      {corresponsablesEnriquecidos.length}
                    </span>
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Institutos y dependencias con compromisos específicos y ejecución coordinada
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {corresponsablesEnriquecidos.map((item) => {
                  const dep = item.dependencia;
                  const avance = dep.avancePlanAccion2026 ?? 38.8;

                  return (
                    <article
                      key={item.dependenciaId}
                      className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 text-xs font-bold text-[var(--text-primary)]">
                            {dep.sigla ?? dep.codigo}
                          </span>
                          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ember)] border border-[var(--border)]">
                            {item.rolEspecifico}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                            {dep.nombre}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] truncate">
                            {dep.titular}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                            Proyecto / Compromiso Clave
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {item.proyectoClave}
                          </p>
                        </div>
                      </div>

                      {/* Footer de Tarjeta con Avance y Botón Rendición */}
                      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                            Avance:
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              avance >= 40
                                ? "text-[var(--success)]"
                                : avance >= 25
                                ? "text-[var(--warning)]"
                                : "text-[var(--danger)]"
                            }`}
                          >
                            {avance}%
                          </span>
                        </div>

                        <Button
                          variant="unstyled"
                          size="unstyled"
                          type="button"
                          onClick={() => verRendicionEntidad(dep.id)}
                          aria-label={`Ver auditoría de ${dep.nombre}`}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ember)] hover:underline"
                        >
                          <span>Auditar</span>
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 3: PROGRAMAS Y METAS 2026 VINCULADAS + CTA */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[var(--ember)]" />
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    Metas Cuatrienales Priorizadas (2024–2027)
                  </h3>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[var(--text-secondary)]">
                  {dimensionActiva.metasClave.map((meta, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                      <span className="leading-snug">{meta}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botón de Acción 1-Clic a Reporte Formal */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                <Button
                  asChild
                  variant="default"
                  size="default"
                  className="gap-2 bg-[var(--ember)] text-[var(--text-inverse)] hover:opacity-95 font-semibold text-xs sm:text-sm px-5"
                >
                  <Link href={`/f/reporte-inseguridad?categoria=${dimensionActiva.id}`}>
                    <span>Crear Reporte Formal</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => openPanel("rendicion-cuentas", {})}
                  className="border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <span>Ver Todas las Cuentas</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ================= MODO B: POR DEPENDENCIAS DISTRITALES ================= */}
      {modo === "dependencias" && (
        <section className="container-fluid flex flex-col gap-6">
          {/* Filtros de Tipología y Semáforo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filtros por tipo de entidad */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "todas", label: "Todas las Entidades (27)" },
                { id: "secretaria", label: "Secretarías (8)" },
                { id: "ente_descentralizado", label: "Descentralizados (10)" },
                { id: "unidad_asesora", label: "Oficinas Asesoras (4)" },
                { id: "alcaldia_local", label: "Alcaldías Locales (3)" },
              ].map((tab) => (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  key={tab.id}
                  type="button"
                  onClick={() => setTipoFiltro(tab.id as TipoFiltroEntidad)}
                  aria-label={`Filtrar por ${tab.label}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tipoFiltro === tab.id
                      ? "bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-strong)]"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Filtros por semáforo */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium mr-1">
                Cumplimiento:
              </span>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setSemaforoFiltro(semaforoFiltro === "verde" ? "todos" : "verde")}
                aria-label="Filtrar entidades en verde mayor o igual a 40%"
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                  semaforoFiltro === "verde"
                    ? "bg-[var(--success)] text-[var(--text-inverse)]"
                    : "text-[var(--success)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                }`}
              >
                🟢 ≥40%
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setSemaforoFiltro(semaforoFiltro === "amarillo" ? "todos" : "amarillo")}
                aria-label="Filtrar entidades en amarillo 25 a 39%"
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                  semaforoFiltro === "amarillo"
                    ? "bg-[var(--warning)] text-[var(--text-inverse)]"
                    : "text-[var(--warning)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                }`}
              >
                🟡 25–39%
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setSemaforoFiltro(semaforoFiltro === "rojo" ? "todos" : "rojo")}
                aria-label="Filtrar entidades en rojo menor a 25%"
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                  semaforoFiltro === "rojo"
                    ? "bg-[var(--danger)] text-[var(--text-inverse)]"
                    : "text-[var(--danger)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                }`}
              >
                🔴 &lt;25%
              </Button>
            </div>
          </div>

          {/* Mosaico de las 27 Dependencias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dependenciasFiltradas.map((dep) => {
              const avance = dep.avancePlanAccion2026 ?? 38.8;

              return (
                <article
                  key={dep.id}
                  className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 transition-all hover:border-[var(--border-strong)] hover:shadow-md"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header de la Entidad */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--text-primary)]">
                            {dep.sigla ?? dep.codigo}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                            {dep.tipo.replace("_", " ")}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-[var(--text-primary)] leading-tight">
                          {dep.nombre}
                        </h3>
                      </div>

                      {/* Insignia de Avance */}
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-extrabold ${
                            avance >= 40
                              ? "text-[var(--success)]"
                              : avance >= 25
                              ? "text-[var(--warning)]"
                              : "text-[var(--danger)]"
                          }`}
                        >
                          {avance}%
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">ejecutado</span>
                      </div>
                    </div>

                    {/* Titular */}
                    <p className="text-xs font-medium text-[var(--ember)] border-l-2 border-[var(--ember)] pl-2">
                      {dep.titular}
                    </p>

                    {/* Barra cromática de progreso auditado */}
                    <div className="w-full">
                      <div className="h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            avance >= 40
                              ? "bg-[var(--success)]"
                              : avance >= 25
                              ? "bg-[var(--warning)]"
                              : "bg-[var(--danger)]"
                          }`}
                          style={{ width: `${Math.min(avance, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* MATRIZ DE PARTICIPACIÓN EN DIMENSIONES */}
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Participación en Dimensiones ONU
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {/* Badges de Líder con Corona */}
                        {dep.esLiderEn.map((dimId) => (
                          <span
                            key={`lider-${dimId}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--ember)]"
                            title={`Entidad Líder en Seguridad ${dimId}`}
                          >
                            <Crown className="size-3 text-[var(--ember)]" />
                            <span>Líder {dimId}</span>
                          </span>
                        ))}

                        {/* Badges de Corresponsable */}
                        {dep.esCorresponsableEn.map((dimId) => (
                          <span
                            key={`corresp-${dimId}`}
                            className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
                            title={`Corresponsable en Seguridad ${dimId}`}
                          >
                            {dimId}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Competencia de Seguridad Humana */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Competencia Legal de Seguridad
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] line-clamp-2">
                        {dep.competenciaSeguridadHumana}
                      </p>
                    </div>
                  </div>

                  {/* Footer de Tarjeta con Presupuesto y Botón */}
                  <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-medium text-[var(--text-tertiary)] block">
                        Presupuesto 2026:
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        ${dep.presupuesto2026Cop ?? "Por definir"}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => verRendicionEntidad(dep.id)}
                      aria-label={`Ver detalles y rendición de ${dep.nombre}`}
                      className="border-[var(--border)] text-xs text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] gap-1.5"
                    >
                      <BarChart3 className="size-3.5 text-[var(--ember)]" />
                      <span>Rendición</span>
                      <ExternalLink className="size-3 text-[var(--text-tertiary)]" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {dependenciasFiltradas.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
              <Search className="size-8 text-[var(--text-tertiary)] mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No se encontraron dependencias
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Intenta ajustando los términos de búsqueda o los filtros de tipología y semáforo.
              </p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setTipoFiltro("todas");
                  setSemaforoFiltro("todos");
                }}
                className="mt-4 text-xs"
              >
                Limpiar Filtros
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
