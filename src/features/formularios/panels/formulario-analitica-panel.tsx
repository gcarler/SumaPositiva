"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useFormularioAnalitica, useFormularioDetalle } from "../services/use-formularios-queries";
import { SectionLabel } from "@/shared/components/participation-ui";

export function FormularioAnaliticaPanel({ entryKey, props }: { entryKey: string, props: { formularioId: string } }) {
  const { closeTop } = usePanels();
  const { data: form } = useFormularioDetalle(props.formularioId);
  const { data: stats, isLoading } = useFormularioAnalitica(props.formularioId);

  if (isLoading || !stats) {
    return <PanelShell entryKey={entryKey} title="Analítica" crumbs={[{ label: "Formularios" }]} onClose={closeTop} onCloseToKey={closeTop}><div/></PanelShell>;
  }

  return (
    <PanelShell
      entryKey={entryKey}
      title="Analítica de Formulario"
      subtitle={form?.titulo}
      crumbs={[{ label: "Formularios" }, { label: "Analítica" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6 space-y-8">
        <section className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
            <span className="block text-2xl font-bold text-[var(--ember)]">{stats.totalRespuestas}</span>
            <span className="text-xs text-[var(--text-secondary)]">Respuestas Totales</span>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
            <span className="block text-2xl font-bold text-[var(--info)]">
              {stats.porEnfoqueDiferencial["Ley 1448/11"] || 0}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">Víctimas (Ley 1448)</span>
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel>Distribución de Respuestas por Pregunta</SectionLabel>
          <div className="space-y-6">
            {stats.respuestasPorPregunta.map((rp, i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                <h5 className="font-medium text-sm text-[var(--text-primary)]">Pregunta: {form?.preguntas.find(p => p.id === rp.preguntaId)?.texto || rp.preguntaId}</h5>
                {rp.promedioLikert && (
                  <div className="text-xs text-[var(--text-secondary)] bg-[var(--surface-2)] p-2 rounded w-fit">
                    Promedio: <span className="font-bold text-[var(--text-primary)]">{rp.promedioLikert.toFixed(1)} / 5</span>
                  </div>
                )}
                <div className="space-y-2">
                  {Object.entries(rp.conteo).map(([opcion, cantidad]) => {
                    const percent = (cantidad / stats.totalRespuestas) * 100;
                    return (
                      <div key={opcion} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-[var(--text-secondary)]">{opcion}</span>
                          <span className="text-[var(--text-primary)] font-medium">{cantidad} ({percent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                          <div className="bg-[var(--ember)] h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
