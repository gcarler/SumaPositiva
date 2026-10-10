"use client";

import {useEffect, useState, useMemo, useCallback} from "react";
import {toast} from "sonner";
import {
  Search,
  RotateCcw,
  MapPin,
  Users,
  ShieldAlert,
  BadgeCheck,
  Filter,
  ArrowRight
} from "lucide-react";
import {Button} from "@/shared/ui/button";
import {Input} from "@/shared/ui/input";
import {Badge} from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {usePanels} from "@/core/panels/panel-store";
import {
  listarTerritoriosDiagnostico,
  calcularResumenDiagnosticoTerritorial
} from "../services/territorios-api";
import type {
  FichaTerritorialDiagnostico,
  NivelRiesgo,
  LocalidadCartagena
} from "../models/territorio-diagnostico";

export function GeodiagnosticoTerritorialView() {
  const { openPanel } = usePanels();
  const [territorios, setTerritorios] = useState<FichaTerritorialDiagnostico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [localidadFiltro, setLocalidadFiltro] = useState<LocalidadCartagena | "TODAS">("TODAS");
  const [riesgoFiltro, setRiesgoFiltro] = useState<NivelRiesgo | "TODOS">("TODOS");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarTerritoriosDiagnostico({
        localidad: localidadFiltro,
        riesgo: riesgoFiltro,
        busqueda,
      });
      setTerritorios(data);
    } catch {
      toast.error("Error al sincronizar con el catálogo de geodiagnóstico.");
    } finally {
      setCargando(false);
    }
  }, [localidadFiltro, riesgoFiltro, busqueda]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const resumen = useMemo(() => {
    return calcularResumenDiagnosticoTerritorial(territorios);
  }, [territorios]);

  const hayFiltrosActivos =
    busqueda.trim() !== "" ||
    localidadFiltro !== "TODAS" ||
    riesgoFiltro !== "TODOS";

  const limpiarFiltros = () => {
    setBusqueda("");
    setLocalidadFiltro("TODAS");
    setRiesgoFiltro("TODOS");
  };

  const handleAbrirFicha = (territorioId: string) => {
    openPanel("ficha-territorial", { territorioId });
  };

  const badgeRiesgoClase = (nivel: NivelRiesgo) => {
    switch (nivel) {
      case "ALTO":
        return "border-danger/30 bg-danger-soft text-danger";
      case "MEDIO":
        return "border-warning/30 bg-warning-soft text-warning";
      default:
        return "border-success/30 bg-success-soft text-success";
    }
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas KPI de Resumen Territorial */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Cobertura Territorial */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
              Territorios Priorizados
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-surface-2">
              <MapPin className="size-3.5 text-ember" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
              {resumen.totalTerritorios}
            </span>
            <span className="text-2xs text-text-tertiary font-mono">
              / 15 oficiales
            </span>
          </div>
          <p className="text-2xs text-text-tertiary">
            3 Localidades urbanas, 9 UCGs y 6 corregimientos/islas
          </p>
        </div>

        {/* KPI 2: Focos de Alto Riesgo */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
              Zonas de Alto Riesgo
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-danger-soft/60">
              <ShieldAlert className="size-3.5 text-danger" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-danger tabular-nums">
              {resumen.altoRiesgoCount}
            </span>
            <span className="text-2xs text-text-tertiary">
              territorios críticos
            </span>
          </div>
          <p className="text-2xs text-text-tertiary">
            Fronteras invisibles, ESCNNA y amenaza por inundación
          </p>
        </div>

        {/* KPI 3: Población en Vulnerabilidad */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
              Población Vulnerable
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-surface-2">
              <Users className="size-3.5 text-ember" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
              {(resumen.poblacionTotalVulnerable / 1000).toFixed(0)}k
            </span>
            <span className="text-2xs text-text-tertiary">
              NBI prom: {resumen.promedioNbi}%
            </span>
          </div>
          <p className="text-2xs text-text-tertiary">
            Población focalizada bajo directrices de estratificación y Sisbén IV
          </p>
        </div>

        {/* KPI 4: Participación y Enfoque Étnico */}
        <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
              Participación y Ley 70
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-surface-2">
              <BadgeCheck className="size-3.5 text-success" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
              {resumen.totalPropuestasRadicadas}
            </span>
            <span className="text-2xs text-text-tertiary">
              propuestas · {resumen.territoriosEtnicosLey70Count} étnicos
            </span>
          </div>
          <p className="text-2xs text-text-tertiary">
            En {resumen.totalMesasRealizadas} mesas de trabajo territoriales realizadas
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="space-y-3 rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Filter className="size-3.5 text-ember" aria-hidden="true" />
            <span>Filtros y Búsqueda en Geodiagnóstico Distrital</span>
          </div>
          {hayFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="h-7 text-xs text-text-secondary hover:text-text-primary gap-1.5"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Búsqueda por texto */}
          <div className="relative sm:col-span-2">
            <Search
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Buscar por barrio, vereda, UCG o Consejo Comunitario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          {/* Filtro por Ámbito / Localidad */}
          <div>
            <Select
              value={localidadFiltro}
              onValueChange={(val) =>
                setLocalidadFiltro(val as LocalidadCartagena | "TODAS")
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Zona / Localidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las Zonas</SelectItem>
                <SelectItem value="LOCALIDAD_1">
                  Localidad 1: Histórica y Caribe
                </SelectItem>
                <SelectItem value="LOCALIDAD_2">
                  Localidad 2: De la Virgen y Turística
                </SelectItem>
                <SelectItem value="LOCALIDAD_3">
                  Localidad 3: Industrial y Bahía
                </SelectItem>
                <SelectItem value="CORREGIMENTAL_INSULAR">
                  Zona Corregimental e Insular (Ley 70)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Nivel de Riesgo */}
          <div>
            <Select
              value={riesgoFiltro}
              onValueChange={(val) => setRiesgoFiltro(val as NivelRiesgo | "TODOS")}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Nivel de Riesgo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los niveles</SelectItem>
                <SelectItem value="ALTO">Alto Riesgo</SelectItem>
                <SelectItem value="MEDIO">Medio Riesgo</SelectItem>
                <SelectItem value="MODERADO">Moderado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid Interactivo de Fichas Territoriales */}
      {cargando ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-surface-1">
          <span className="text-xs text-text-tertiary">
            Cargando fichas territoriales de Cartagena...
          </span>
        </div>
      ) : territorios.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-6 text-center">
          <MapPin className="size-8 text-text-tertiary mb-2" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">
            No se encontraron territorios con los filtros activos
          </p>
          <p className="text-xs text-text-secondary max-w-sm mt-1">
            Intente ajustando el término de búsqueda o seleccionando todas las zonas distritales.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={limpiarFiltros}
            className="mt-3 h-8 text-xs"
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {territorios.map((terr) => (
            <div
              key={terr.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface-1 p-4.5 space-y-3.5 transition-all hover:border-border-strong hover:shadow-xs"
            >
              <div className="space-y-3">
                {/* Cabecera de la ficha */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-2xs font-semibold ${badgeRiesgoClase(terr.nivelRiesgo)}`}
                      >
                        Riesgo {terr.nivelRiesgo}
                      </Badge>
                      <Badge variant="outline" className="text-2xs font-mono">
                        {terr.codigo}
                      </Badge>
                      {terr.esEtnicoLey70 && (
                        <Badge
                          variant="outline"
                          className="text-2xs border-ember/30 bg-ember-soft text-ember font-medium"
                          title="Consejo Comunitario de Comunidades Negras"
                        >
                          Ley 70/93
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-text-primary leading-tight">
                      {terr.nombre}
                    </h4>
                  </div>
                </div>

                <div className="text-2xs text-text-tertiary font-medium">
                  {terr.localidadNombre}
                </div>

                {/* Métricas clave */}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-2.5 text-center">
                  <div>
                    <span className="text-2xs text-text-tertiary block">Población</span>
                    <span className="text-xs font-bold text-text-primary tabular-nums">
                      {terr.poblacionEstimada >= 1000
                        ? `${(terr.poblacionEstimada / 1000).toFixed(0)}k`
                        : terr.poblacionEstimada}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-text-tertiary block">NBI</span>
                    <span className="text-xs font-bold text-text-primary tabular-nums">
                      {terr.porcentajeNbi}%
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-text-tertiary block">SAT</span>
                    <span className="text-xs font-bold text-danger tabular-nums">
                      {terr.alertasTempranasSat}
                    </span>
                  </div>
                </div>

                {/* Síntesis de problemática principal */}
                {terr.problematicasPriorizadas[0] && (
                  <div className="space-y-1">
                    <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider block">
                      Prioridad 1:
                    </span>
                    <p className="text-2xs text-text-secondary font-medium line-clamp-2 leading-snug">
                      {terr.problematicasPriorizadas[0].titulo}
                    </p>
                  </div>
                )}

                {/* Barrios destacados */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {terr.barriosPrincipales.slice(0, 3).map((b, i) => (
                    <span
                      key={i}
                      className="rounded bg-surface-2 px-1.5 py-0.5 text-2xs text-text-tertiary"
                    >
                      {b}
                    </span>
                  ))}
                  {terr.barriosPrincipales.length > 3 && (
                    <span className="text-2xs text-text-tertiary self-center">
                      +{terr.barriosPrincipales.length - 3} más
                    </span>
                  )}
                </div>
              </div>

              {/* Botón de apertura de panel */}
              <div className="pt-2 border-t border-border/80">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAbrirFicha(terr.id)}
                  className="w-full h-8 text-xs font-semibold gap-1.5 justify-between hover:bg-surface-2"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-ember" aria-hidden="true" />
                    <span>Ver Perfil Diagnóstico Completo</span>
                  </span>
                  <ArrowRight className="size-3 text-text-tertiary" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
