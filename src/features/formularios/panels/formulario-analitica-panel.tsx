"use client";
import { CompartirFormulario } from "../components/compartir-formulario";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import {
  useFormularioDetalle,
  useFormularioAnalitica,
} from "../services/use-formularios-queries";
import { descargarGeoJson } from "../services/ubicacion-geografica";
import { descargarCsv } from "../services/formulario-analitica";
import { useFormulariosStore } from "../state/formularios-store";
export function FormularioAnaliticaPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { formularioId: string };
}) {
  const { closeTop } = usePanels();
  const { data: form, error } = useFormularioDetalle(props.formularioId);
  const { data: stats, error: errorStats } = useFormularioAnalitica(
    props.formularioId,
  );
  const respuestas = useFormulariosStore((s) => s.respuestas);
  return (
    <PanelShell
      entryKey={entryKey}
      title="Analítica de Formulario"
      subtitle={form?.titulo}
      crumbs={[{ label: "Formularios" }, { label: "Analítica" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!form || !stats}
            onClick={() => form && descargarCsv(form, respuestas)}
          >
            Exportar CSV
          </Button>
          {form?.preguntas.some((p) => p.tipo === "ubicacion_geografica") && (
            <Button
              variant="outline"
              disabled={!stats}
              onClick={() => descargarGeoJson(form, respuestas)}
            >
              Exportar puntos GeoJSON
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 p-6">
        <p className="text-xs text-text-secondary">
          Analítica de respuestas guardadas en POLIS.
        </p>
        {form && <CompartirFormulario form={form} />}
        {!form || !stats ? (
          <p role="alert">
            {error?.message ?? errorStats?.message ?? "Cargando analítica…"}
          </p>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-surface-1 p-4">
              <h3 className="text-sm">Respuestas Totales</h3>
              <p className="text-2xl font-bold text-ember">
                {stats.totalRespuestas}
              </p>
            </section>
            {stats.totalRespuestas === 0 && (
              <p role="status" className="text-sm text-text-secondary">
                Aún no hay respuestas. Los gráficos se actualizarán al
                recibirlas.
              </p>
            )}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">
                Distribución de Respuestas por Pregunta
              </h3>
              {stats.respuestasPorPregunta.map((rp) => {
                const p = form.preguntas.find((p) => p.id === rp.preguntaId);
                if (!p) return null;
                return (
                  <article
                    key={p.id}
                    className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-1 p-4"
                  >
                    <h4 className="break-words text-sm font-medium">
                      {p.texto}
                    </h4>
                    <p className="text-xs text-text-secondary">
                      {rp.total} respuestas a esta pregunta
                    </p>
                    {rp.promedio !== undefined && (
                      <dl className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <dt>Promedio</dt>
                          <dd className="font-semibold">
                            {rp.promedio.toFixed(2)}
                          </dd>
                        </div>
                        {p.tipo === "numero" && (
                          <>
                            <div>
                              <dt>Mínimo</dt>
                              <dd>{rp.minimo}</dd>
                            </div>
                            <div>
                              <dt>Máximo</dt>
                              <dd>{rp.maximo}</dd>
                            </div>
                          </>
                        )}
                      </dl>
                    )}
                    {[
                      "texto_corto",
                      "texto_largo",
                      "fecha",
                      "hora",
                      "carga_archivo",
                      "ubicacion_geografica",
                    ].includes(p.tipo) ? (
                      <ul className="space-y-2 text-sm">
                        {rp.ultimas.map((v, i) => (
                          <li
                            key={i}
                            className="whitespace-pre-wrap break-words rounded-lg bg-surface-2 p-2"
                          >
                            {v}
                          </li>
                        ))}
                        {!rp.ultimas.length && <li>Sin respuestas</li>}
                      </ul>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(rp.conteo).map(([opcion, cantidad]) => {
                          const percent = stats.totalRespuestas
                            ? (cantidad / stats.totalRespuestas) * 100
                            : 0;
                          return (
                            <div key={opcion} className="space-y-1">
                              <div className="flex flex-wrap justify-between gap-2 text-xs">
                                <span className="break-words">{opcion}</span>
                                <span>
                                  {cantidad} ({percent.toFixed(1)}%)
                                </span>
                              </div>
                              <Progress
                                aria-label={`${p.texto}: ${opcion}`}
                                value={percent}
                              />
                            </div>
                          );
                        })}
                        {p.tipo === "opcion_multiple" && (
                          <p className="text-xs text-text-secondary">
                            Porcentajes sobre todas las respuestas del
                            formulario; pueden sumar más del 100%.
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Enfoque Diferencial</h3>
              {Object.entries(stats.porEnfoqueDiferencial).map(
                ([label, total]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs">
                      {label}: {total}
                    </p>
                    <Progress
                      aria-label={`Enfoque diferencial: ${label}`}
                      value={
                        stats.totalRespuestas
                          ? (total / stats.totalRespuestas) * 100
                          : 0
                      }
                    />
                  </div>
                ),
              )}
            </section>
          </>
        )}
      </div>
    </PanelShell>
  );
}
