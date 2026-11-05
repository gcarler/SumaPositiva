"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Filter,
  Loader2,
  Search,
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
import { useCatalogoIndicadores } from "../services/use-indicadores-catalogo";

const DIMENSIONES = [
  "todas",
  "PERS",
  "COM",
  "AMB",
  "ECON",
  "SALUD",
  "POL",
  "SAT",
] as const;

const TIERS = ["todos", "A", "B", "C"] as const;

const ETIQUETAS_DIMENSION: Record<string, string> = {
  PERS: "Personal",
  COM: "Comunitaria",
  AMB: "Ambiental",
  ECON: "Económica",
  SALUD: "Salud",
  POL: "Política",
  SAT: "Alertas tempranas",
};

function BadgeTier({ tier }: { tier: string }) {
  const variante = tier === "A" ? "success" : tier === "B" ? "info" : "warning";
  return (
    <Badge variant={variante} className="text-[10px] font-semibold">
      Tier {tier}
    </Badge>
  );
}

function BadgeEstado({ estado }: { estado: string }) {
  return (
    <Badge variant="outline" className="text-[10px] font-semibold">
      {estado === "no_publicable" ? "No publicable" : estado}
    </Badge>
  );
}

export function IndicadoresCatalogoView() {
  const setVista = useNavigationStore((s) => s.setVista);
  const [dimension, setDimension] = useState<string>("todas");
  const [tier, setTier] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  const filtros = useMemo(
    () => ({
      dimension: dimension === "todas" ? undefined : dimension,
      tier: tier === "todos" ? undefined : tier,
      busqueda: busqueda.trim() ? busqueda.trim() : undefined,
    }),
    [dimension, tier, busqueda],
  );

  useEffect(() => {
    setVista("indicadores");
  }, [setVista]);

  const { data, isLoading, isError } = useCatalogoIndicadores(filtros);
  const indicadores = data?.indicadores ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10">
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
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Los 24 indicadores siguen el contrato metodológico validado, con fórmula, denominador, fuente,
            URL, custodio, licencia, año base y estado. El catálogo no calcula valores y mantiene cada
            indicador como no publicable hasta su certificación.
          </p>
        </header>
      </div>

      <section aria-labelledby="filtros-catalogo" className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <h2 id="filtros-catalogo" className="text-sm font-semibold text-[var(--text-primary)]">
          Filtros
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <FormField label="Dimension">
            {() => (
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger className="w-full" aria-label="Filtrar por dimension">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSIONES.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === "todas" ? "Todas las dimensiones" : `${id} — ${ETIQUETAS_DIMENSION[id]}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Tier">
            {() => (
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="w-full" aria-label="Filtrar por tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === "todos" ? "Todos los tiers" : `Tier ${id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Busqueda" className="sm:col-span-2">
            {() => (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre, formula, fuente o custodio"
                  className="pl-8"
                  aria-label="Buscar en el catalogo de indicadores"
                />
              </div>
            )}
          </FormField>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Filter className="size-3.5" aria-hidden="true" />
          <span>
            {typeof data?.total === "number"
              ? `${data.total} indicadores encontrados`
              : "Consultando catalogo..."}
          </span>
        </div>
      </section>

      <section aria-labelledby="tabla-catalogo" className="space-y-4">
        <h2 id="tabla-catalogo" className="text-sm font-semibold text-[var(--text-primary)]">
          Indicadores
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando catálogo...
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm text-[var(--danger)]">
            No fue posible consultar el catálogo. Intente de nuevo más tarde.
          </div>
        ) : indicadores.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-secondary)]">
            Sin resultados para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dimensión</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicadores.map((indicador) => (
                  <TableRow key={indicador.codigo}>
                    <TableCell className="font-mono text-xs">{indicador.codigo}</TableCell>
                    <TableCell className="max-w-[320px] truncate text-xs font-medium">
                      {indicador.nombre}
                    </TableCell>
                    <TableCell className="text-xs">
                      {ETIQUETAS_DIMENSION[indicador.dimension] ?? indicador.dimension}
                    </TableCell>
                    <TableCell className="text-xs">{indicador.unidad}</TableCell>
                    <TableCell className="text-xs">{indicador.fuente}</TableCell>
                    <TableCell>
                      <BadgeTier tier={indicador.tier} />
                    </TableCell>
                    <TableCell>
                      <BadgeEstado estado={indicador.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      {indicador.url_fuente === "NO_VERIFICADO" ? (
                        <span className="text-xs text-[var(--text-tertiary)]">NO_VERIFICADO</span>
                      ) : (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ver fuente del indicador ${indicador.codigo}`}
                        >
                          <a href={indicador.url_fuente} target="_blank" rel="noreferrer noopener">
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
