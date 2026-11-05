"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Filter,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import {
  type CatalogoIndicador,
  esUrlHttpsSegura,
} from "../services/indicadores-catalogo-api";
import { useCatalogoIndicadores } from "../services/use-indicadores-catalogo";

export const DIMENSIONES = [
  "todas",
  "PERS",
  "COM",
  "AMB",
  "ECON",
  "SALUD",
  "POL",
  "SAT",
] as const;

export const TIERS = ["todos", "A", "B", "C"] as const;

export const ETIQUETAS_DIMENSION: Record<string, string> = {
  PERS: "Personal y ciudadana",
  COM: "Convivencia y comunitaria",
  AMB: "Ambiental y del entorno físico",
  ECON: "Económica y medios de vida",
  SALUD: "Alimentaria y sanitaria",
  POL: "Política, institucional y derechos humanos",
  SAT: "Alertas tempranas y gestión de crisis",
};

export const DESCRIPCIONES_TIER: Record<
  "A" | "B" | "C",
  { titulo: string; detalle: string; variante: "success" | "info" | "warning" }
> = {
  A: {
    titulo: "Tier A — Verificado en banco oficial",
    detalle:
      "Línea base verificada y referenciada en el banco de fuentes oficiales de información pública distrital y nacional.",
    variante: "success",
  },
  B: {
    titulo: "Tier B — Fuente pública identificada",
    detalle:
      "Fuente pública identificada y documentada metodológicamente, pendiente de incorporación técnica en el banco de datos.",
    variante: "info",
  },
  C: {
    titulo: "Tier C — Sin fuente verificada",
    detalle:
      "Sin fuente oficial verificada disponible; no se publica ninguna cifra territorial hasta contar con registro certificado.",
    variante: "warning",
  },
};

function BadgeTier({ tier }: { tier: string }) {
  const variante = tier === "A" ? "success" : tier === "B" ? "info" : "warning";
  return (
    <Badge variant={variante} className="text-[10px] font-semibold whitespace-nowrap">
      {`Tier ${tier}`}
    </Badge>
  );
}

function BadgeEstado({ estado }: { estado: string }) {
  return (
    <Badge variant="outline" className="text-[10px] font-semibold whitespace-nowrap">
      {estado === "no_publicable" ? "No publicable" : estado}
    </Badge>
  );
}

/**
 * Ficha metodológica detallada para inspección exhaustiva de cada indicador.
 * Expone los 15 campos metodológicos requeridos por el contrato de fe pública
 * garantizando estructura HTML5 semántica y accesible para axe (cero dlitem o definition-list inválidos).
 */
export function IndicadorMetodologiaDetalle({
  indicador,
}: {
  indicador: CatalogoIndicador;
}) {
  return (
    <div
      data-testid={`metodologia-detalle-${indicador.codigo}`}
      className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {indicador.codigo}
            </span>
            <BadgeTier tier={indicador.tier} />
            <BadgeEstado estado={indicador.estado} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {indicador.nombre}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Dimensión canónica:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {indicador.dimension} — {ETIQUETAS_DIMENSION[indicador.dimension] ?? indicador.dimension}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {esUrlHttpsSegura(indicador.url_fuente) ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <a href={indicador.url_fuente} target="_blank" rel="noreferrer noopener">
                <span>Fuente oficial</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-xs text-[var(--text-tertiary)] bg-[var(--surface-2)]">
              {indicador.url_fuente === "NO_VERIFICADO"
                ? "Fuente: NO_VERIFICADO"
                : indicador.url_fuente || "Sin URL"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Bloque 1: Definición e Interpretación */}
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-0)] p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <Info className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
            Definición e Interpretación
          </h4>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Definición conceptual:</dt>
              <dd className="mt-0.5 leading-relaxed text-[var(--text-primary)]">
                {indicador.definicion || "No registrada"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Interpretación metodológica:</dt>
              <dd className="mt-0.5 leading-relaxed text-[var(--text-secondary)]">
                {indicador.interpretacion || "No registrada"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bloque 2: Construcción Matemática y Variables */}
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-0)] p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <FileText className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
            Construcción Matemática
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--text-tertiary)]">Fórmula de cálculo:</dt>
              <dd className="mt-0.5 font-mono text-xs leading-relaxed text-[var(--text-primary)] bg-[var(--surface-2)] p-1.5 rounded">
                {indicador.formula || "Sin fórmula especificada"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Numerador:</dt>
              <dd className="mt-0.5 leading-snug text-[var(--text-secondary)]">
                {indicador.numerador || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Denominador:</dt>
              <dd className="mt-0.5 leading-snug text-[var(--text-secondary)]">
                {indicador.denominador || "N/A"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--text-tertiary)]">Unidad de medida:</dt>
              <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                {indicador.unidad || "No especificada"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bloque 3: Cobertura Territorial y Temporalidad */}
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-0)] p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <ShieldCheck className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
            Cobertura y Temporalidad
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--text-tertiary)]">Tipo de territorio de fuente:</dt>
              <dd className="mt-0.5 text-[var(--text-primary)]">
                {indicador.tipo_territorio_fuente || "No especificado"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Periodicidad:</dt>
              <dd className="mt-0.5 text-[var(--text-secondary)]">
                {indicador.periodicidad || "No registrada"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Tipo de periodo:</dt>
              <dd className="mt-0.5 text-[var(--text-secondary)]">
                {indicador.tipo_periodo || "No registrado"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--text-tertiary)]">Año base de referencia:</dt>
              <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                {indicador.anio_base || "Pendiente"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bloque 4: Gobernanza, Custodio y Licencia */}
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-0)] p-3 md:col-span-2 lg:col-span-2">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <Info className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
            Gobernanza, Custodio y Licencia
          </h4>
          <dl className="grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Fuente primaria / oficial:</dt>
              <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
                {indicador.fuente || "No especificada"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Entidad custodia:</dt>
              <dd className="mt-0.5 text-[var(--text-secondary)]">
                {indicador.custodio || "No especificado"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Licencia de datos:</dt>
              <dd className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                {indicador.licencia || "Sin licencia"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">URL de verificación:</dt>
              <dd className="mt-0.5 break-all text-[11px]">
                {esUrlHttpsSegura(indicador.url_fuente) ? (
                  <a
                    href={indicador.url_fuente}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[var(--ember)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{indicador.url_fuente}</span>
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="font-mono text-[var(--text-tertiary)]">
                    {indicador.url_fuente || "Sin URL"}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bloque 5: Riesgo Metodológico y Estado */}
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-0)] p-3 md:col-span-2 lg:col-span-1">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <ShieldCheck className="size-3.5 text-[var(--ember)]" aria-hidden="true" />
            Riesgo Metodológico y Estado
          </h4>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Riesgo metodológico advertido:</dt>
              <dd className="mt-0.5 leading-relaxed text-[var(--text-secondary)]">
                {indicador.riesgo_metodologico || "Ninguno documentado"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-tertiary)]">Condición de divulgación:</dt>
              <dd className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                Estado <BadgeEstado estado={indicador.estado} />: no calcula ni divulga valores numéricos
                directos hasta su certificación formal.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function IndicadoresCatalogoView() {
  const setVista = useNavigationStore((s) => s.setVista);
  const [dimension, setDimension] = useState<string>("todas");
  const [tier, setTier] = useState<string>("todos");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

  // N-7: Debounce de búsqueda ≈300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busquedaInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaInput]);

  const filtros = useMemo(
    () => ({
      dimension: dimension === "todas" ? undefined : dimension,
      tier: tier === "todos" ? undefined : tier,
      busqueda: busquedaDebounced ? busquedaDebounced : undefined,
    }),
    [dimension, tier, busquedaDebounced],
  );

  useEffect(() => {
    setVista("indicadores");
  }, [setVista]);

  const { data, isLoading, isError } = useCatalogoIndicadores(filtros);
  const indicadores = data?.indicadores ?? [];

  const toggleExpandirFila = (codigo: string) => {
    setFilaExpandida((actual) => (actual === codigo ? null : codigo));
  };

  return (
    <div className="container-fluid w-full space-y-6 py-10">
      {/* Migas de pan y encabezado dinámico */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[var(--text-primary)]">Catálogo de indicadores</span>
        </div>
        <header className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
            Catálogo municipal de indicadores de seguridad humana
          </h1>
          <p className="max-w-4xl text-sm leading-relaxed text-[var(--text-secondary)]">
            {typeof data?.total === "number"
              ? `El catálogo registra actualmente ${data.total} indicadores municipales bajo el contrato metodológico validado, con definición conceptual, fórmula, denominador, custodio institucional, licencia de datos, año base y estado.`
              : "Catálogo municipal de indicadores bajo el contrato metodológico validado, con definición conceptual, fórmula, denominador, custodio institucional, licencia de datos, año base y estado."}{" "}
            Este instrumento metodológico describe la construcción técnica de las fuentes oficiales, no calcula ni divulga valores numéricos directos y mantiene cada indicador como «no publicable» hasta su certificación oficial.
          </p>
        </header>
      </div>

      {/* N-3: Leyenda cívica pedagógica de Tiers y explicación de 'no publicable' */}
      <section
        aria-labelledby="leyenda-tiers-titulo"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h2 id="leyenda-tiers-titulo" className="text-sm font-semibold text-[var(--text-primary)]">
              Madurez metodológica y principio de no publicación
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Gobernanza de fe pública y trazabilidad
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["A", "B", "C"] as const).map((tierKey) => {
            const info = DESCRIPCIONES_TIER[tierKey];
            return (
              <div
                key={tierKey}
                className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3"
              >
                <div className="flex items-center gap-2">
                  <BadgeTier tier={tierKey} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {info.titulo.split("—")[1]?.trim() ?? info.titulo}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {info.detalle}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text-primary)] font-semibold">
              ¿Por qué todos los indicadores registran el estado «No publicable»?
            </strong>{" "}
            El catálogo de POLIS es un marco de rigor técnico y verificación de fuentes oficiales, no un
            tablero de divulgación de cifras ni un cálculo dinámico de valores. Ningún indicador divulga
            cifras hasta que la autoridad respectiva certifique formalmente la fórmula, el denominador y
            la licencia de datos correspondiente.
          </p>
        </div>
      </section>

      {/* Filtros de consulta con ortografía corregida, debounce e id propagados por FormField */}
      <section
        aria-labelledby="filtros-catalogo"
        className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="filtros-catalogo" className="text-sm font-semibold text-[var(--text-primary)]">
            Filtros de consulta
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            Búsqueda combinada por dimensión, tier o término técnico
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <FormField id="filtro-catalogo-dimension" label="Dimensión">
            {(fieldProps) => (
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger
                  id={fieldProps.id}
                  aria-describedby={fieldProps["aria-describedby"]}
                  className="w-full"
                  aria-label="Filtrar por dimensión"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSIONES.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === "todas"
                        ? "Todas las dimensiones"
                        : `${id} — ${ETIQUETAS_DIMENSION[id]}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField id="filtro-catalogo-tier" label="Nivel Tier">
            {(fieldProps) => (
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger
                  id={fieldProps.id}
                  aria-describedby={fieldProps["aria-describedby"]}
                  className="w-full"
                  aria-label="Filtrar por nivel Tier"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === "todos"
                        ? "Todos los tiers"
                        : `Tier ${id} — ${id === "A" ? "Oficial" : id === "B" ? "Pública" : "Sin fuente"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField id="filtro-catalogo-busqueda" label="Búsqueda" className="sm:col-span-2">
            {(fieldProps) => (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
                  aria-hidden="true"
                />
                <Input
                  id={fieldProps.id}
                  aria-describedby={fieldProps["aria-describedby"]}
                  value={busquedaInput}
                  onChange={(e) => setBusquedaInput(e.target.value)}
                  placeholder="Nombre, fórmula, fuente, custodio o variable…"
                  className="pl-8 pr-8"
                  aria-label="Buscar por nombre, fórmula, fuente o custodio en el catálogo de indicadores"
                />
                {busquedaInput.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setBusquedaInput("")}
                    aria-label="Limpiar término de búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            )}
          </FormField>
        </div>

        {/* H297-06: Estado final coherente y región accesible role="status" */}
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5 text-xs text-[var(--text-tertiary)]"
        >
          <div className="flex items-center gap-2">
            <Filter className="size-3.5" aria-hidden="true" />
            <span>
              {isError
                ? "No fue posible cargar el catálogo"
                : isLoading
                  ? "Consultando catálogo…"
                  : typeof data?.total === "number"
                    ? `${data.total} ${data.total === 1 ? "indicador encontrado" : "indicadores encontrados"}`
                    : "No fue posible cargar el catálogo"}
            </span>
          </div>
          {(dimension !== "todas" || tier !== "todos" || busquedaInput.trim().length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDimension("todas");
                setTier("todos");
                setBusquedaInput("");
              }}
              className="h-7 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Restablecer filtros
            </Button>
          )}
        </div>
      </section>

      {/* Tabla principal de indicadores con fila expandible de metodología y cero tbody > div (H297-05) */}
      <section aria-labelledby="tabla-catalogo" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="tabla-catalogo" className="text-sm font-semibold text-[var(--text-primary)]">
            Inventario metodológico de indicadores
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            Haga clic en «Ver metodología» en cualquier fila para inspeccionar la ficha completa
          </span>
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)]"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Cargando catálogo de indicadores…</span>
          </div>
        ) : isError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--danger)]"
          >
            No fue posible consultar el catálogo de indicadores. Intente de nuevo más tarde.
          </div>
        ) : indicadores.length === 0 ? (
          <div
            role="status"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center text-sm text-[var(--text-secondary)]"
          >
            <p className="font-semibold text-[var(--text-primary)]">
              Sin resultados en el catálogo para los filtros seleccionados
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Pruebe cambiando la dimensión, el nivel Tier o borrando el término de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Ficha</TableHead>
                  <TableHead className="w-28 font-mono">Código</TableHead>
                  <TableHead className="min-w-[220px]">Nombre del indicador</TableHead>
                  <TableHead className="min-w-[180px]">Dimensión</TableHead>
                  <TableHead className="w-24">Unidad</TableHead>
                  <TableHead className="min-w-[140px]">Fuente</TableHead>
                  <TableHead className="w-20">Tier</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="w-24 text-right">Enlace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicadores.map((indicador) => {
                  const estaExpandida = filaExpandida === indicador.codigo;
                  const tieneUrlHttps = esUrlHttpsSegura(indicador.url_fuente);

                  return (
                    <Fragment key={indicador.codigo}>
                      <TableRow
                        className={estaExpandida ? "bg-[var(--surface-2)]" : undefined}
                      >
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleExpandirFila(indicador.codigo)}
                            aria-expanded={estaExpandida}
                            aria-controls={`metodologia-fila-${indicador.codigo}`}
                            aria-label={
                              estaExpandida
                                ? `Ocultar metodología del indicador ${indicador.codigo}`
                                : `Ver metodología del indicador ${indicador.codigo}`
                            }
                            className="size-7"
                          >
                            {estaExpandida ? (
                              <ChevronUp className="size-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {indicador.codigo}
                        </TableCell>
                        <TableCell className="min-w-[220px] max-w-sm text-xs font-medium text-[var(--text-primary)] leading-normal break-words">
                          <Button
                            variant="ghost"
                            onClick={() => toggleExpandirFila(indicador.codigo)}
                            className="h-auto p-0 text-left font-medium whitespace-normal hover:bg-transparent hover:underline focus-visible:ring-1 focus-visible:ring-[var(--focus)]"
                            aria-label={`Inspeccionar ficha metodológica de ${indicador.nombre}`}
                          >
                            {indicador.nombre}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {indicador.dimension}
                          </span>
                          <span className="block text-[11px] text-[var(--text-secondary)]">
                            {ETIQUETAS_DIMENSION[indicador.dimension] ?? indicador.dimension}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)]">
                          {indicador.unidad}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)]">
                          {indicador.fuente}
                        </TableCell>
                        <TableCell>
                          <BadgeTier tier={indicador.tier} />
                        </TableCell>
                        <TableCell>
                          <BadgeEstado estado={indicador.estado} />
                        </TableCell>
                        <TableCell className="text-right">
                          {tieneUrlHttps ? (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Ver enlace oficial de la fuente del indicador ${indicador.codigo}`}
                            >
                              <a
                                href={indicador.url_fuente}
                                target="_blank"
                                rel="noreferrer noopener"
                              >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                              </a>
                            </Button>
                          ) : (
                            <span
                              className="text-[11px] font-mono text-[var(--text-tertiary)]"
                              title="Sin enlace https oficial verificado"
                            >
                              {indicador.url_fuente === "NO_VERIFICADO"
                                ? "NO_VERIFICADO"
                                : (indicador.url_fuente || "—")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Fila expandible con la metodología completa (B-3 y H297-05) */}
                      {estaExpandida && (
                        <TableRow
                          id={`metodologia-fila-${indicador.codigo}`}
                          className="bg-[var(--surface-2)]"
                        >
                          <TableCell colSpan={9} className="p-3 sm:p-5">
                            <IndicadorMetodologiaDetalle indicador={indicador} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
