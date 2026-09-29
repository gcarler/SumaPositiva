"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUp, MessageSquarePlus, Target } from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels, usePanelStore } from "@/stores/panel-store";
import {
  useFase,
  useLinea,
  usePolitica,
  usePoliticasStore,
} from "@/stores/politicas-store";
import { SectionLabel } from "../components/ui-bits";
import {
  InitialAvatar,
  TipoAporteChip,
} from "../components/ui-bits";

/**
 * Panel L3 — Línea Estratégica con el muro de Aportes Ciudadanos.
 * Se apila sobre el panel de fase (L2). Desde aquí se abre el editor (L4).
 */

export function LineaPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { politicaId: string; faseId: string; lineaId: string };
}) {
  const { openPanel, closeTop, closeToKey } = usePanels();
  const toggleApoyo = usePoliticasStore((s) => s.toggleApoyo);
  const politica = usePolitica(props.politicaId);
  const fase = useFase(props.politicaId, props.faseId);
  const linea = useLinea(props.politicaId, props.faseId, props.lineaId);

  const parentKeyPolitica = usePanelStore(
    (s) => s.entries.find((e) => e.type === "politica")?.key
  );
  const parentKeyFase = usePanelStore(
    (s) => s.entries.find((e) => e.type === "fase")?.key
  );

  if (!linea || !fase || !politica) {
    return (
      <PanelShell
        width={720}
        entryKey={entryKey}
        crumbs={[{ label: "Aportes" }]}
        title="Línea no disponible"
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          Esta línea estratégica ya no está disponible.
        </p>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      width={720}
      entryKey={entryKey}
      crumbs={[
        { label: politica.titulo, targetKey: parentKeyPolitica },
        { label: fase.nombre, targetKey: parentKeyFase },
        { label: linea.codigo },
      ]}
      kicker={`Línea estratégica ${linea.codigo}`}
      title={linea.titulo}
      onClose={closeTop}
      onCloseToKey={closeToKey}
      footer={
        <button
          type="button"
          onClick={() =>
            openPanel("aporte", {
              politicaId: props.politicaId,
              faseId: props.faseId,
              lineaId: props.lineaId,
            })
          }
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-[var(--text-primary)] py-2.5 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90"
        >
          <MessageSquarePlus className="size-4" strokeWidth={1.5} />
          Aportar a esta línea
        </button>
      }
    >
      <div className="space-y-6 px-6 py-6">
        {/* ---------- Contexto de la línea ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span className="text-xs text-[var(--text-tertiary)] tabular">
                {linea.aportes.length}{" "}
                {linea.aportes.length === 1 ? "aporte" : "aportes"}
              </span>
            }
          >
            Enfoque de la línea
          </SectionLabel>
          <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <Target className="mt-0.5 size-4 shrink-0 text-[var(--ember)]" strokeWidth={1.5} />
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {linea.descripcion}
            </p>
          </div>
        </section>

        {/* ---------- Muro de aportes ---------- */}
        <section className="space-y-3">
          <SectionLabel>Aportes ciudadanos</SectionLabel>

          {linea.aportes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-6 py-10 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Todavía no hay aportes en esta línea.
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Tu propuesta puede ser la primera en entrar al debate.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {linea.aportes.map((aporte) => (
                <li
                  key={aporte.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center gap-2.5">
                    <InitialAvatar name={aporte.autor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {aporte.autor}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {formatDistanceToNow(new Date(aporte.fecha), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                    <TipoAporteChip tipo={aporte.tipo} />
                  </div>

                  <h4 className="mt-3 text-sm font-medium leading-snug text-[var(--text-primary)]">
                    {aporte.titulo}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {aporte.contenido}
                  </p>

                  {/* Apoyo */}
                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleApoyo(linea.id, aporte.id)}
                      aria-pressed={aporte.apoyado}
                      aria-label={aporte.apoyado ? "Retirar apoyo" : "Apoyar este aporte"}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        aporte.apoyado
                          ? "border-[var(--ember)] bg-[var(--ember-soft)] text-[var(--ember)]"
                          : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--ember)] hover:text-[var(--ember)]"
                      }`}
                    >
                      <ArrowUp
                        className="size-3.5"
                        strokeWidth={1.5}
                        fill={aporte.apoyado ? "currentColor" : "none"}
                      />
                      <span className="tabular">{aporte.votos}</span>
                    </button>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {aporte.apoyado ? "Tu apoyo está registrado" : "Apoya este aporte"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
