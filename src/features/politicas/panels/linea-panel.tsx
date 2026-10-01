"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowUp,
  MessageSquarePlus,
  Target,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels, usePanelStore } from "@/stores/panel-store";
import {
  useFase,
  useLinea,
  usePolitica,
  usePoliticasStore,
} from "@/stores/politicas-store";
import type { Aporte, LineaEstrategica } from "@/types/domain";
import { SectionLabel, InitialAvatar, AnonAvatar, TipoAporteChip } from "../components/ui-bits";

/**
 * Panel L3 — Línea Estratégica con el muro de Aportes Ciudadanos.
 * Se apila sobre el panel de fase (L2). Desde aquí se abre el editor (L4).
 *
 * Cada aporte muestra su autor (identidad o anónimo con máscara) y las
 * fotos adjuntas: miniaturas que expanden un visor EN LÍNEA (cero modales).
 */

/* ---------- Visor de fotos en línea (dentro de la tarjeta) ---------- */

function VisorFotos({ fotos }: { fotos: string[] }) {
  const [activa, setActiva] = useState<number | null>(null);

  if (activa === null) {
    const visibles = fotos.slice(0, 3);
    const extra = fotos.length - visibles.length;
    return (
      <ul className="mt-3 grid grid-cols-3 gap-1.5">
        {visibles.map((src, i) => (
          <li key={`${i}-${src.slice(-16)}`} className="relative">
            <button
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              className="block aspect-video w-full overflow-hidden rounded-md border border-[var(--border)] transition-opacity hover:opacity-85"
            >
              <img src={src} alt={`Foto ${i + 1} del aporte`} className="size-full object-cover" loading="lazy" />
            </button>
            {i === visibles.length - 1 && extra > 0 && (
              <button
                type="button"
                onClick={() => setActiva(visibles.length - 1)}
                className="absolute inset-0 flex items-center justify-center rounded-md bg-black/45 text-xs font-semibold text-white transition-colors hover:bg-black/55"
                aria-label={`Ver las ${extra} fotos restantes`}
              >
                +{extra}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="relative mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
      <img
        src={fotos[activa]}
        alt={`Foto ${activa + 1} de ${fotos.length}`}
        className="mx-auto max-h-[420px] w-full object-contain"
      />

      {/* Contador */}
      <span className="label-micro absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--surface-0)]/85 px-2.5 py-1 text-[var(--text-secondary)] backdrop-blur-sm tabular">
        {activa + 1} / {fotos.length}
      </span>

      {/* Cerrar visor */}
      <button
        type="button"
        onClick={() => setActiva(null)}
        aria-label="Cerrar visor de fotos"
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
      >
        <X className="size-4" strokeWidth={1.5} />
      </button>

      {/* Navegación */}
      {fotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setActiva((activa - 1 + fotos.length) % fotos.length)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setActiva((activa + 1) % fotos.length)}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Tarjeta de aporte ---------- */

function AporteCard({
  aporte,
  lineaId,
  onApoyar,
}: {
  aporte: Aporte;
  lineaId: string;
  onApoyar: (lineaId: string, aporteId: string) => void;
}) {
  const anonimo = !aporte.autorId;
  const fotos = aporte.fotos ?? [];

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-center gap-2.5">
        {anonimo ? <AnonAvatar /> : <InitialAvatar name={aporte.autor} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--text-primary)]">
            {anonimo ? "Ciudadano anónimo" : aporte.autor}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {formatDistanceToNow(new Date(aporte.fecha), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>
        {fotos.length > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[var(--text-tertiary)] tabular">
            <Images className="size-3.5" strokeWidth={1.5} />
            {fotos.length}
          </span>
        )}
        <TipoAporteChip tipo={aporte.tipo} />
      </div>

      <h4 className="mt-3 text-sm font-medium leading-snug text-[var(--text-primary)]">
        {aporte.titulo}
      </h4>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {aporte.contenido}
      </p>

      {fotos.length > 0 && <VisorFotos fotos={fotos} />}

      {/* Apoyo */}
      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApoyar(lineaId, aporte.id)}
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
  );
}

/* ---------- Panel ---------- */

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
  const linea: LineaEstrategica | undefined = useLinea(
    props.politicaId,
    props.faseId,
    props.lineaId
  );

  const parentKeyPolitica = usePanelStore(
    (s) => s.entries.find((e) => e.type === "politica")?.key
  );
  const parentKeyFase = usePanelStore(
    (s) => s.entries.find((e) => e.type === "fase")?.key
  );

  if (!linea || !fase || !politica) {
    return (
      <PanelShell
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
      <div className="mx-auto w-full max-w-4xl space-y-6 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10">
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
                <AporteCard
                  key={aporte.id}
                  aporte={aporte}
                  lineaId={linea.id}
                  onApoyar={toggleApoyo}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
