"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  Users,
  Leaf,
  Coins,
  Wheat,
  Landmark,
  AlertTriangle,
  Building2,
  MapPin,
  Filter,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { usePanels } from "@/core/panels/panel-store";
import {
  DEPENDENCIAS_CARTAGENA_2026,
} from "../data/entidades-cartagena.data";

interface DimensionItem {
  id: string;
  codigo: string;
  nombre: string;
  colorVar: string;
  icono: React.ElementType;
  descripcion: string;
}

const DIMENSIONES_ONU: DimensionItem[] = [
  {
    id: "dim-personal",
    codigo: "personal",
    nombre: "Seguridad Personal y Ciudadana",
    colorVar: "var(--danger)",
    icono: Shield,
    descripcion: "Protección frente al delito, armas, violencia letal y amenazas a la integridad física.",
  },
  {
    id: "dim-comunitaria",
    codigo: "comunitaria",
    nombre: "Convivencia y Seguridad Comunitaria",
    colorVar: "var(--ember)",
    icono: Users,
    descripcion: "Cultura ciudadana, fortalecimiento comunal (JAC) y cohesión social sin pandillas.",
  },
  {
    id: "dim-ambiental",
    codigo: "ambiental",
    nombre: "Seguridad Ambiental y del Entorno",
    colorVar: "var(--success)",
    icono: Leaf,
    descripcion: "Saneamiento de caños, Ciénaga de la Virgen, alumbrado y drenajes pluviales.",
  },
  {
    id: "dim-economica",
    codigo: "economica",
    nombre: "Seguridad Económica y Medios de Vida",
    colorVar: "var(--warning)",
    icono: Coins,
    descripcion: "Superación de la pobreza, formalización laboral y combate a la usura (gota a gota).",
  },
  {
    id: "dim-alimentaria",
    codigo: "alimentaria",
    nombre: "Seguridad Alimentaria y Sanitaria",
    colorVar: "var(--warning)",
    icono: Wheat,
    descripcion: "Red de comedores comunitarios, PAE escolar, atención en salud y control de dengue.",
  },
  {
    id: "dim-politica",
    codigo: "politica",
    nombre: "Seguridad Política e Institucional",
    colorVar: "var(--info)",
    icono: Landmark,
    descripcion: "Transparencia contractual, gobierno abierto, presupuesto participativo y DD.HH.",
  },
  {
    id: "dim-crisis",
    codigo: "crisis",
    nombre: "Alertas Tempranas y Gestión del Riesgo",
    colorVar: "var(--danger)",
    icono: AlertTriangle,
    descripcion: "Gestión ante desastres hidroclimáticos, erosión costera, marejadas e incendios.",
  },
];

interface TerritorioItem {
  id: string;
  nombre: string;
  subtitulo: string;
  barrios: string;
}

const TERRITORIOS_CARTAGENA: TerritorioItem[] = [
  {
    id: "loc-1",
    nombre: "Localidad 1 — Histórica y Caribe Norte",
    subtitulo: "Centro, Bocagrande, La Boquilla, Crespo",
    barrios: "Getsemaní, San Diego, Canapote, Marbella, Manzanillo e Islas del Rosario",
  },
  {
    id: "loc-2",
    nombre: "Localidad 2 — De la Virgen y Turística",
    subtitulo: "Cuenca Ciénaga de la Virgen y zona oriental",
    barrios: "Olaya Herrera, El Pozón, Boston, La Esperanza, Fredonia, Chiquinquirá",
  },
  {
    id: "loc-3",
    nombre: "Localidad 3 — Industrial y de la Bahía",
    subtitulo: "Corredor portuario, industrial y sur",
    barrios: "Nelson Mandela, San José de los Campanos, Pasacaballos, Membrillal, Albornoz",
  },
  {
    id: "rural-insular",
    nombre: "Zona Rural e Insular",
    subtitulo: "Corregimientos e Islas con Consulta Previa",
    barrios: "Barú, Bocachica, Tierrabomba, Bayunca, Pontezuela, Arroyo de Piedra",
  },
];

export function FlujoInversionGobernanza() {
  const { openPanel } = usePanels();
  const [dimensionFiltro, setDimensionFiltro] = useState<string | null>(null);
  const [dependenciaFiltro, setDependenciaFiltro] = useState<string | null>(null);
  const [territorioFiltro, setTerritorioFiltro] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas");

  const dependenciasFiltradas = useMemo(() => {
    return DEPENDENCIAS_CARTAGENA_2026.filter((dep) => {
      // Filtro tipo
      if (tipoFiltro !== "todas") {
        if (tipoFiltro === "secretaria" && dep.tipo !== "secretaria") return false;
        if (tipoFiltro === "ente_descentralizado" && !["ente_descentralizado", "empresa_industrial", "institucion_educativa"].includes(dep.tipo)) return false;
        if (tipoFiltro === "unidad_asesora" && dep.tipo !== "unidad_asesora") return false;
        if (tipoFiltro === "alcaldia_local" && dep.tipo !== "alcaldia_local") return false;
      }
      // Filtro dimensión
      if (dimensionFiltro) {
        const tieneDim = dep.dimensionesPrincipales.some(
          (d) => d.toLowerCase() === dimensionFiltro.toLowerCase() ||
                 (dimensionFiltro === "alimentaria" && (d === "alimentaria" || d === "salud"))
        );
        if (!tieneDim) return false;
      }
      // Filtro territorio
      if (territorioFiltro) {
        if (dep.territoriosPrioritarios && !dep.territoriosPrioritarios.includes(territorioFiltro)) {
          return false;
        }
      }
      return true;
    });
  }, [dimensionFiltro, territorioFiltro, tipoFiltro]);

  const dependenciasResaltadasIds = useMemo(() => {
    return new Set(dependenciasFiltradas.map((d) => d.id));
  }, [dependenciasFiltradas]);

  const territoriosResaltadosIds = useMemo(() => {
    const s = new Set<string>();
    if (dependenciaFiltro) {
      const dep = DEPENDENCIAS_CARTAGENA_2026.find((d) => d.id === dependenciaFiltro);
      dep?.territoriosPrioritarios?.forEach((t) => s.add(t));
    } else {
      dependenciasFiltradas.forEach((dep) => {
        dep.territoriosPrioritarios?.forEach((t) => s.add(t));
      });
    }
    return s;
  }, [dependenciaFiltro, dependenciasFiltradas]);

  const dimensionesResaltadasCodigos = useMemo(() => {
    const s = new Set<string>();
    if (dependenciaFiltro) {
      const dep = DEPENDENCIAS_CARTAGENA_2026.find((d) => d.id === dependenciaFiltro);
      dep?.dimensionesPrincipales.forEach((d) => s.add(d));
    } else if (territorioFiltro) {
      dependenciasFiltradas.forEach((dep) => {
        dep.dimensionesPrincipales.forEach((d) => s.add(d));
      });
    }
    return s;
  }, [dependenciaFiltro, territorioFiltro, dependenciasFiltradas]);

  const dependenciaActivaDetalle = useMemo(() => {
    if (dependenciaFiltro) {
      return DEPENDENCIAS_CARTAGENA_2026.find((d) => d.id === dependenciaFiltro);
    }
    return null;
  }, [dependenciaFiltro]);

  const handleReset = () => {
    setDimensionFiltro(null);
    setDependenciaFiltro(null);
    setTerritorioFiltro(null);
    setTipoFiltro("todas");
  };

  const hayFiltroActivo = Boolean(dimensionFiltro || dependenciaFiltro || territorioFiltro || tipoFiltro !== "todas");

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 lg:p-10 shadow-lg space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-2 rounded-full bg-[var(--ember)]" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ember)]">
              Pilar 2 — Visualizador de Gobernanza e Inversión Multinivel
            </p>
            <Badge variant="outline" className="border-[var(--border)] text-[10px]">
              27 Dependencias Oficiales
            </Badge>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Flujo de Inversión y Competencias en Cartagena
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-3xl">
            Explora las conexiones dinámicas entre las 7 Dimensiones de Seguridad Humana (Decreto 037/26),
            las 27 dependencias de la Alcaldía Mayor y los territorios distritales donde se ejecutan los proyectos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {hayFiltroActivo && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleReset}
              className="gap-1.5 text-xs text-[var(--text-secondary)]"
            >
              <RotateCcw className="size-3.5" />
              Restablecer
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={() => openPanel("rendicion-cuentas", {})}
            className="gap-1.5 bg-[var(--ember)] text-[var(--text-inverse)] hover:bg-[var(--ember)]"
          >
            <BarChart3 className="size-3.5" />
            Tablero de Cuentas 2026
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos de Dependencias */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-tertiary)] flex items-center gap-1">
            <Filter className="size-3 text-[var(--ember)]" />
            Entidades:
          </span>
          {[
            { id: "todas", label: "Todas (27)" },
            { id: "secretaria", label: "Secretarías (8)" },
            { id: "ente_descentralizado", label: "Descentralizados (12)" },
            { id: "unidad_asesora", label: "Unidades Asesoras (6)" },
            { id: "alcaldia_local", label: "Alcaldías Locales (3)" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setTipoFiltro(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                tipoFiltro === tab.id
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--ember)]"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="text-xs text-[var(--text-tertiary)]">
          Mostrando <span className="font-bold text-[var(--text-primary)]">{dependenciasFiltradas.length}</span> dependencias conectadas
        </div>
      </div>

      {/* Grid de 3 Columnas Conectadas */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna 1: 7 Dimensiones ONU */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--ember)]" />
              1. Dimensión ONU (Decreto 037)
            </h3>
            {dimensionFiltro && (
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setDimensionFiltro(null)}
                className="text-[10px] text-[var(--ember)] hover:underline"
              >
                Quitar filtro
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {DIMENSIONES_ONU.map((dim) => {
              const Icon = dim.icono;
              const activo = dimensionFiltro === dim.codigo;
              const conectado =
                !dimensionFiltro &&
                (dimensionesResaltadasCodigos.size === 0 || dimensionesResaltadasCodigos.has(dim.codigo));

              return (
                <Button
                  key={dim.id}
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => {
                    setDimensionFiltro(activo ? null : dim.codigo);
                    setDependenciaFiltro(null);
                  }}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${
                    activo
                      ? "border-[var(--ember)] bg-[var(--surface-3)] shadow-md"
                      : conectado
                        ? "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-3)]"
                        : "border-[var(--border)]/40 bg-[var(--surface-2)]/40 opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-7 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${dim.colorVar} 15%, transparent)`,
                          color: dim.colorVar,
                        }}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {dim.nombre}
                      </span>
                    </div>
                    {activo && (
                      <span className="size-2 rounded-full bg-[var(--ember)]" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--text-secondary)] line-clamp-2">
                    {dim.descripcion}
                  </p>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Columna 2: Dependencias Distritales */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Building2 className="size-3.5 text-[var(--ember)]" />
              2. Dependencias Distritales (Cartagena)
            </h3>
            {dependenciaFiltro && (
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setDependenciaFiltro(null)}
                className="text-[10px] text-[var(--ember)] hover:underline"
              >
                Quitar selección
              </Button>
            )}
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {dependenciasFiltradas.map((dep) => {
              const seleccionado = dependenciaFiltro === dep.id;
              const resaltada = dependenciasResaltadasIds.has(dep.id);

              return (
                <div
                  key={dep.id}
                  onClick={() => setDependenciaFiltro(seleccionado ? null : dep.id)}
                  className={`cursor-pointer rounded-xl p-3 border transition-all ${
                    seleccionado
                      ? "border-[var(--ember)] bg-[var(--surface-3)] shadow-md"
                      : resaltada
                        ? "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-3)]"
                        : "border-[var(--border)]/40 bg-[var(--surface-2)]/40 opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--ember)]">
                          {dep.sigla ?? dep.codigo}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-tertiary)]">
                          {dep.tipo.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-[var(--text-primary)] truncate">
                        {dep.nombre}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className="text-xs font-bold"
                        style={{
                          color:
                            (dep.avancePlanAccion2026 ?? 38.8) >= 40
                              ? "var(--success)"
                              : (dep.avancePlanAccion2026 ?? 38.8) >= 25
                                ? "var(--warning)"
                                : "var(--danger)",
                        }}
                      >
                        {dep.avancePlanAccion2026 ?? 38.8}%
                      </span>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[11px] text-[var(--text-secondary)] line-clamp-1">
                    {dep.competenciaSeguridadHumana}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
                    <span>{dep.presupuesto2026Cop ?? "$25.000M"}</span>
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPanel("rendicion-cuentas", { dependenciaId: dep.id });
                      }}
                      className="text-[var(--ember)] hover:underline text-[10px]"
                    >
                      Auditar ficha →
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna 3: Territorios Distritales */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[var(--ember)]" />
              3. Territorios de Intervención
            </h3>
            {territorioFiltro && (
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setTerritorioFiltro(null)}
                className="text-[10px] text-[var(--ember)] hover:underline"
              >
                Quitar filtro
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {TERRITORIOS_CARTAGENA.map((terr) => {
              const activo = territorioFiltro === terr.id;
              const conectado =
                !territorioFiltro &&
                (territoriosResaltadosIds.size === 0 || territoriosResaltadosIds.has(terr.id));

              return (
                <Button
                  key={terr.id}
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => {
                    setTerritorioFiltro(activo ? null : terr.id);
                  }}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${
                    activo
                      ? "border-[var(--ember)] bg-[var(--surface-3)] shadow-md"
                      : conectado
                        ? "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-3)]"
                        : "border-[var(--border)]/40 bg-[var(--surface-2)]/40 opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {terr.nombre}
                    </span>
                    {activo && (
                      <span className="size-2 rounded-full bg-[var(--ember)]" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-[var(--ember)]">
                    {terr.subtitulo}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--text-tertiary)] line-clamp-2">
                    {terr.barrios}
                  </p>
                </Button>
              );
            })}
          </div>

          {/* Ficha Resumen Rápida si hay Dependencia Seleccionada */}
          {dependenciaActivaDetalle && (
            <div className="rounded-xl border border-[var(--ember)]/40 bg-[var(--surface-2)] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Ficha Rápida: {dependenciaActivaDetalle.sigla ?? dependenciaActivaDetalle.codigo}</span>
                <span className="text-[var(--ember)]">{dependenciaActivaDetalle.avancePlanAccion2026 ?? 38.8}%</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {dependenciaActivaDetalle.misionPlanAccion2026 ?? dependenciaActivaDetalle.competenciaSeguridadHumana}
              </p>
              <div className="pt-2 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => openPanel("rendicion-cuentas", { dependenciaId: dependenciaActivaDetalle.id })}
                >
                  Ver Plan de Acción 2026 Completo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
