"use client";

import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { EmptyState } from "@/shared/ui/empty-state";
import type { VariableMapa } from "../data/estadisticas.data";
import { useAnaliticaMultifuente } from "../services/analitica-multifuente-api";
import { useGeovisorAnaliticaStore } from "../state/geovisor-analitica-store";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

interface GeovisorBiSidebarProps {
  territorioId: string;
  onSelectTerritorio: (id: string) => void;
  variableMapa: VariableMapa;
  onOpenDetalleDrawer?: (territorioId: string) => void;
}

export function GeovisorBiSidebar({ onSelectTerritorio }: GeovisorBiSidebarProps) {
  const consulta = useAnaliticaMultifuente();
  const filtros = useGeovisorAnaliticaStore((s) => s.filtros);
  const setSerieX = useGeovisorAnaliticaStore((s) => s.setSerieX);
  const datos = consulta.data;
  return (
    <aside aria-label="Ficha estadística del territorio" className="min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <header><h2 className="text-base font-semibold">Evidencia del territorio</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">{datos?.territorios.find((t) => t.id === filtros.codigo_territorio)?.nombre ?? filtros.codigo_territorio ?? "Todos los territorios del banco"}</p></header>
      {consulta.isLoading ? <p role="status" className="text-sm">Consultando observaciones…</p> : consulta.isError ? <Notice tone="danger" title="No fue posible consultar el territorio"><Button size="sm" variant="outline" onClick={() => void consulta.refetch()}>Reintentar</Button></Notice> : !datos?.series.length ? <EmptyState title="Sin observaciones con esta selección" description="Una cifra municipal no se replica a una localidad, UCG o barrio." /> : <>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[var(--text-secondary)]">Observaciones</dt><dd className="text-xl font-semibold">{datos.total_observaciones.toLocaleString("es-CO")}</dd></div><div><dt className="text-xs text-[var(--text-secondary)]">Series distintas</dt><dd className="text-xl font-semibold">{datos.series.length.toLocaleString("es-CO")}</dd></div></dl>
        <p className="text-xs text-[var(--text-secondary)]">Selecciona una serie para revisar sus valores, fuente y cobertura temporal.</p>
        <ul className="space-y-2">{datos.series.slice(0, 20).map((serie) => <li key={serie.id}><Button variant="outline" className="h-auto w-full min-w-0 justify-start whitespace-normal p-3 text-left" onClick={() => { onSelectTerritorio(serie.codigo_territorio); setSerieX(serie.id); useGeovisorLayoutStore.getState().openView("graficos"); }}><span className="min-w-0 break-words"><span className="block text-xs font-semibold">{serie.nombre}</span><span className="block text-xs text-[var(--text-secondary)]">{serie.fuente} · {serie.unidad} · {serie.anios[0]}–{serie.anios.at(-1)}</span></span></Button></li>)}</ul>
        {datos.series.length > 20 && <p className="text-xs text-[var(--text-secondary)]">Se muestran las primeras 20 series; el panel Gráficos permite elegir entre todas las series filtradas.</p>}
        <Notice title="Lectura descriptiva">Las series conservan su escala y procedencia. Esta ficha no calcula un índice sintético de seguridad humana.</Notice>
      </>}
    </aside>
  );
}
