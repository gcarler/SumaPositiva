"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, CalendarDays, MapPin, Users, FileText } from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels } from "@/stores/panel-store";
import { usePolitica } from "@/stores/politicas-store";
import { SECTOR_META, totalAportes, totalLineas } from "@/types/domain";
import {
  EstadoFaseChip,
  EstadoPoliticaChip,
  FaseTipoTag,
  HairlineProgress,
  SectionLabel,
  SectorTag,
} from "../components/ui-bits";

/**
 * Panel L1 — Detalle de la Política Pública.
 * Base de la pila Zero-Modals: desde aquí se exploran las fases (L2).
 */

export function PoliticaPanel({ entryKey, props }: { entryKey: string; props: { politicaId: string } }) {
  const { openPanel, closeTop, closeToKey } = usePanels();
  const politica = usePolitica(props.politicaId);

  if (!politica) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Políticas públicas" }]}
        title="Política no encontrada"
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          Esta política ya no está disponible.
        </p>
      </PanelShell>
    );
  }

  const activa = politica.fases.find((f) => f.estado === "activa");
  const progresoPromedio = Math.round(
    politica.fases.reduce((a, f) => a + f.progreso, 0) / politica.fases.length
  );

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Políticas públicas" }]}
      kicker={SECTOR_META[politica.sector].label}
      title={politica.titulo}
      subtitle={politica.resumen}
      onClose={closeTop}
      onCloseToKey={closeToKey}
      footer={
        activa ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-[var(--text-tertiary)]">
              Fase activa: <span className="text-[var(--text-secondary)]">{activa.nombre}</span>
            </p>
            <button
              type="button"
              onClick={() =>
                openPanel("fase", { politicaId: politica.id, faseId: activa.id })
              }
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90"
            >
              Participar
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="mx-auto w-full max-w-4xl space-y-8 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10">
        {/* ---------- Meta ---------- */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <EstadoPoliticaChip estado={politica.estado} />
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <MapPin className="size-3.5" strokeWidth={1.5} />
            {politica.cobertura}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] tabular">
            <CalendarDays className="size-3.5" strokeWidth={1.5} />
            {format(new Date(politica.fechaInicio), "d MMM yyyy", { locale: es })} —{" "}
            {format(new Date(politica.fechaCierre), "d MMM yyyy", { locale: es })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] tabular">
            <Users className="size-3.5" strokeWidth={1.5} />
            {politica.participantes.toLocaleString("es-CO")} participantes
          </span>
        </div>

        {/* ---------- El problema ---------- */}
        <section className="space-y-3">
          <SectionLabel>El problema</SectionLabel>
          <blockquote className="border-l-2 border-[var(--ember)] pl-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {politica.problema}
          </blockquote>
        </section>

        {/* ---------- Descripción ---------- */}
        <section className="space-y-3">
          <SectionLabel>Sobre la política</SectionLabel>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {politica.descripcion}
          </p>
        </section>

        {/* ---------- Progreso general ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span className="text-xs font-medium text-[var(--text-primary)] tabular">
                {progresoPromedio}%
              </span>
            }
          >
            Avance del proceso
          </SectionLabel>
          <HairlineProgress value={progresoPromedio} />
          <div className="flex justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)] tabular">
            <span>
              {politica.fases.length} fases · {totalLineas(politica)} líneas ·{" "}
              {totalAportes(politica)} aportes
            </span>
          </div>
        </section>

        {/* ---------- Fases ---------- */}
        <section className="space-y-3">
          <SectionLabel>Fases del proceso</SectionLabel>
          <ol className="space-y-2">
            {politica.fases.map((fase) => {
              const clickable = fase.lineas.length > 0;
              return (
                <li key={fase.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() =>
                      openPanel("fase", { politicaId: politica.id, faseId: fase.id })
                    }
                    className={`group w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition-all ${
                      clickable
                        ? "cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                        : "cursor-default opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular ${
                          fase.estado === "activa"
                            ? "border-[var(--ember)] text-[var(--ember)]"
                            : fase.estado === "completada"
                              ? "border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text-secondary)]"
                              : "border-[var(--border)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        {fase.orden}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {fase.nombre}
                          </p>
                          <EstadoFaseChip estado={fase.estado} />
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <FaseTipoTag tipo={fase.tipo} />
                          <span className="text-xs text-[var(--text-tertiary)] tabular">
                            {fase.lineas.length > 0
                              ? `${fase.lineas.length} líneas estratégicas`
                              : "Líneas por definir"}
                          </span>
                        </div>
                      </div>
                      {clickable && (
                        <ArrowRight
                          className="size-4 shrink-0 text-[var(--text-tertiary)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ember)]"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                    {fase.progreso > 0 && (
                      <div className="mt-3 pl-11">
                        <HairlineProgress value={fase.progreso} />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------- Nota metodológica ---------- */}
        <section className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <FileText className="mt-0.5 size-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Cada aporte ciudadano queda registrado en el acta de la fase correspondiente
            y recibe respuesta oficial antes del cierre de la consulta. El informe de
            trazabilidad es público.
          </p>
        </section>
      </div>
    </PanelShell>
  );
}
