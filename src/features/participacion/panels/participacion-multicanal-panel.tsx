"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useTableroConsolidado, useDesgloseWeb, useDesgloseMesas, useEscenariosEspeciales } from "../services/use-participacion-queries";
import { SectionLabel } from "@/shared/components/participation-ui";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";

export function ParticipacionMulticanalPanel({ entryKey, props }: { entryKey: string, props: { canalInicial?: string } }) {
  const { closeTop, openPanel } = usePanels();
  const [tab, setTab] = useState(props.canalInicial || "consolidado");

  const { data: consolidado, isLoading: loadingConsolidado } = useTableroConsolidado();
  const { data: web, isLoading: loadingWeb } = useDesgloseWeb();
  const { data: mesas, isLoading: loadingMesas } = useDesgloseMesas();
  const { data: escenarios, isLoading: loadingEscenarios } = useEscenariosEspeciales();

  return (
    <PanelShell
      entryKey={entryKey}
      title="Tablero de Asistencia y Participación"
      subtitle="Registro consolidado multicanal y desagregado poblacional"
      crumbs={[{ label: "Participación" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-4">
            <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
            <TabsTrigger value="web">Canal Web</TabsTrigger>
            <TabsTrigger value="mesas">Mesas</TabsTrigger>
            <TabsTrigger value="escenarios">Escenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="consolidado" className="space-y-6 mt-0">
            {loadingConsolidado ? <div className="text-sm text-[var(--text-secondary)]">Cargando...</div> : consolidado && (
              <>
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center">
                    <span className="block text-3xl font-bold text-[var(--ember)]">{consolidado.totalCartageneros.toLocaleString()}</span>
                    <span className="text-xs text-[var(--text-secondary)]">Total Cartageneros (Únicos)</span>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Canal Web</span>
                        <span className="text-[var(--text-primary)] font-medium">{consolidado.participacionWeb.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Mesas Presenciales</span>
                        <span className="text-[var(--text-primary)] font-medium">{consolidado.participacionMesas.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Escenarios Especiales</span>
                        <span className="text-[var(--text-primary)] font-medium">{consolidado.participacionEscenarios.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="space-y-4">
                  <SectionLabel>Desglose Demográfico Global</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                      <h4 className="text-xs font-medium text-[var(--text-primary)]">Por Género</h4>
                      {Object.entries({ Mujeres: consolidado.desglose.mujeres, Hombres: consolidado.desglose.hombres, Otros: consolidado.desglose.otros }).map(([label, val]) => (
                        <div key={label} className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-[var(--text-secondary)]">{label}</span>
                            <span className="text-[var(--text-primary)] font-medium">{val}</span>
                          </div>
                          <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                            <div className="bg-[var(--info)] h-1.5 rounded-full" style={{ width: `${(val/consolidado.totalCartageneros)*100}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                      <h4 className="text-xs font-medium text-[var(--text-primary)]">Enfoque Diferencial</h4>
                      {Object.entries(consolidado.desglose.enfoqueDiferencial).map(([label, val]) => (
                        <div key={label} className="flex justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                          <span className="text-[var(--text-secondary)]">{label}</span>
                          <span className="text-[var(--text-primary)] font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          <TabsContent value="web" className="space-y-6 mt-0">
            {loadingWeb ? <div className="text-sm text-[var(--text-secondary)]">Cargando...</div> : web && (
              <section className="space-y-4">
                <SectionLabel>Participación por Línea Estratégica (Canal Web)</SectionLabel>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                  {Object.entries(web.porLineaEstrategica).map(([label, val]) => (
                    <div key={label} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-[var(--text-secondary)]">{label}</span>
                        <span className="text-[var(--text-primary)] font-medium">{val}</span>
                      </div>
                      <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                        <div className="bg-[var(--ember)] h-1.5 rounded-full" style={{ width: `${(val/web.totalAportes)*100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="mesas" className="space-y-6 mt-0">
            {loadingMesas ? <div className="text-sm text-[var(--text-secondary)]">Cargando...</div> : mesas && (
              <section className="space-y-4">
                <SectionLabel>Asistencia por Mesa Deliberativa</SectionLabel>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
                  {Object.entries(mesas.porMesa).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                      <span className="text-[var(--text-primary)]">{val} asistentes</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="escenarios" className="space-y-6 mt-0">
            <div className="flex justify-between items-center">
              <SectionLabel>Escenarios Especiales de Co-creación</SectionLabel>
              <Button size="sm" onClick={() => openPanel("escenario-editor", {})}>
                <Plus className="mr-2 size-4" />
                Registrar Escenario
              </Button>
            </div>
            {loadingEscenarios ? <div className="text-sm text-[var(--text-secondary)]">Cargando...</div> : escenarios && (
              <div className="space-y-3">
                {escenarios.map(esc => (
                  <div key={esc.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm text-[var(--text-primary)]">{esc.titulo}</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{esc.entidadConvocante} • {new Date(esc.fecha).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-[var(--surface-2)] text-[var(--text-primary)] text-[10px] uppercase tracking-wider px-2 py-1 rounded-md">
                        {esc.asistentes} asistentes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PanelShell>
  );
}
