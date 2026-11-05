"use client";

import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AnaliticaMultifuente, OpcionAnalitica } from "../models/analitica-multifuente";
import { normalizarCodigoTerritorio, useGeovisorAnaliticaStore } from "../state/geovisor-analitica-store";

function Selector({ etiqueta, valor, opciones, onChange }: {
  etiqueta: string;
  valor?: string;
  opciones: OpcionAnalitica[];
  onChange: (valor: string | undefined) => void;
}) {
  return (
    <FormField label={etiqueta}>
      {({ id, ...accesibilidad }) => (
        <Select value={valor || "todos"} onValueChange={(v) => onChange(v === "todos" ? undefined : v)}>
          <SelectTrigger id={id} {...accesibilidad} className="w-full min-w-0 [&>span]:truncate">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {valor && !opciones.some((o) => o.id === valor) && <SelectItem value={valor}>{valor}</SelectItem>}
            {opciones.map((o) => <SelectItem value={o.id} key={o.id}>{o.nombre} ({o.total})</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}

export function MultifuenteFiltros({ datos, onTerritorioChange }: {
  datos?: AnaliticaMultifuente;
  onTerritorioChange?: (id: string) => void;
}) {
  const filtros = useGeovisorAnaliticaStore((s) => s.filtros);
  const setFiltros = useGeovisorAnaliticaStore((s) => s.setFiltros);
  const limpiar = useGeovisorAnaliticaStore((s) => s.limpiar);
  return (
    <section aria-label="Filtros compartidos del banco y las gráficas" className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Selector etiqueta="Territorio de los datos" valor={filtros.codigo_territorio} opciones={datos?.territorios ?? []} onChange={(codigo) => {
          setFiltros({ codigo_territorio: normalizarCodigoTerritorio(codigo) });
          onTerritorioChange?.(codigo ?? "todas");
        }} />
        <Selector etiqueta="Entidad fuente" valor={filtros.fuente_datos} opciones={datos?.fuentes ?? []} onChange={(fuente_datos) => setFiltros({ fuente_datos })} />
        <Selector etiqueta="Dimensión de seguridad humana" valor={filtros.dimension} opciones={datos?.dimensiones ?? []} onChange={(dimension) => setFiltros({ dimension })} />
        <FormField label="Desde el año">
          {(props) => <Input {...props} type="number" min={1900} max={2200} value={filtros.anio_desde ?? ""} onChange={(e) => setFiltros({ anio_desde: e.target.value ? Number(e.target.value) : undefined })} />}
        </FormField>
        <FormField label="Hasta el año">
          {(props) => <Input {...props} type="number" min={1900} max={2200} value={filtros.anio_hasta ?? ""} onChange={(e) => setFiltros({ anio_hasta: e.target.value ? Number(e.target.value) : undefined })} />}
        </FormField>
        <FormField label="Buscar indicador">
          {(props) => <Input {...props} value={filtros.busqueda ?? ""} onChange={(e) => setFiltros({ busqueda: e.target.value || undefined })} placeholder="Homicidios, población, empleo…" />}
        </FormField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormField label="Incluir ediciones previas para revisión">
          {({ id, ...props }) => <Checkbox id={id} {...props} checked={filtros.incluir_ediciones_previas ?? false} onCheckedChange={(valor) => setFiltros({ incluir_ediciones_previas: valor === true })} />}
        </FormField>
        <Button size="sm" variant="outline" onClick={() => { limpiar(); onTerritorioChange?.("todas"); }}>Limpiar filtros</Button>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">Estos filtros se comparten con Banco Multifuente, Gráficos y Territorio. El año es el declarado por cada fuente.</p>
    </section>
  );
}
