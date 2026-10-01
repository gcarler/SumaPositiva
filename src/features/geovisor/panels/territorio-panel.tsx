"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useTerritorioDetalle } from "../services/use-geovisor-queries";
import { SectionLabel } from "@/shared/components/participation-ui";

export function TerritorioPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { territorioId: string };
}) {
  const { closeTop, closeToKey } = usePanels();
  const { data: territorio, isLoading, error } = useTerritorioDetalle(props.territorioId);

  if (isLoading) {
    return (
      <PanelShell entryKey={entryKey} title="Cargando..." crumbs={[{ label: "Geovisor" }]} onClose={closeTop} onCloseToKey={closeToKey}>
        <div className="p-6 text-sm text-[var(--text-secondary)]">Cargando información del territorio...</div>
      </PanelShell>
    );
  }

  if (error || !territorio) {
    return (
      <PanelShell entryKey={entryKey} title="Error" crumbs={[{ label: "Geovisor" }]} onClose={closeTop} onCloseToKey={closeToKey}>
        <div className="p-6 text-sm text-[var(--danger)]">Error al cargar el territorio.</div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      entryKey={entryKey}
      title={territorio.nombre}
      crumbs={[{ label: "Geovisor" }, { label: territorio.tipo }]}
      onClose={closeTop}
      onCloseToKey={closeToKey}
    >
      <div className="space-y-6 p-6">
        <section>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {territorio.descripcion}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-[var(--surface-1)] p-3 rounded-lg border border-[var(--border)]">
              <span className="block text-xs text-[var(--text-tertiary)]">Población</span>
              <span className="block font-medium text-[var(--text-primary)]">{territorio.habitantes.toLocaleString()} hab.</span>
            </div>
            <div className="bg-[var(--surface-1)] p-3 rounded-lg border border-[var(--border)]">
              <span className="block text-xs text-[var(--text-tertiary)]">Área</span>
              <span className="block font-medium text-[var(--text-primary)]">{territorio.area_ha.toLocaleString()} ha</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>Indicadores de Seguridad Humana</SectionLabel>
          <div className="space-y-2">
            {territorio.indicadores.map((ind, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--surface-1)] p-3 rounded-lg border border-[var(--border)]">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{ind.dimension}</span>
                <span className="text-sm text-[var(--text-primary)]">
                  {ind.valor} 
                  {ind.tendencia === "sube" ? " ↗" : ind.tendencia === "baja" ? " ↘" : " 〰"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>Participación</SectionLabel>
          <div className="bg-[var(--surface-1)] p-4 rounded-lg border border-[var(--border)] text-center">
            <span className="block text-2xl font-bold text-[var(--ember)]">{territorio.propuestas_count}</span>
            <span className="block text-xs text-[var(--text-secondary)] mt-1">Propuestas comunitarias vinculadas</span>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
