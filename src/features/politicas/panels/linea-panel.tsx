"use client";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Badge } from "@/shared/ui/badge";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowUp,
  MessageSquare,
  MessageSquarePlus,
  Target,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels, usePanelStore } from "@/core/panels/panel-store";
import {
  useFase,
  useLinea,
  usePolitica,
  usePoliticasStore,
} from "@/features/politicas/state/politicas-store";
import type { Aporte, LineaEstrategica } from "@/features/politicas/models/politicas";
import { SectionLabel, InitialAvatar, AnonAvatar } from "@/shared/components/participation-ui";
import { TipoAporteChip } from "@/features/politicas/components/politica-ui";
import {
  useAportes,
  useRespaldarAporte,
} from "@/features/aportes/services/use-aportes-queries";

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
  /* Selector del control que abrió el visor: devuelve el foco al cerrar. */
  const openerSel = useRef<string | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const thumbsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (activa !== null) {
      cerrarRef.current?.focus();
    } else if (openerSel.current) {
      const sel = openerSel.current;
      openerSel.current = null;
      thumbsRef.current?.querySelector<HTMLElement>(sel)?.focus();
    }
  }, [activa]);

  const abrir = (i: number, selector: string) => {
    openerSel.current = selector;
    setActiva(i);
  };

  const mover = (paso: number) =>
    setActiva((actual) =>
      actual === null ? actual : (actual + paso + fotos.length) % fotos.length,
    );

  /* Escape cierra SOLO el visor (preventDefault evita que PanelHost cierre
     el panel) y las flechas navegan mientras el foco está en el visor. */
  const onVisorKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setActiva(null);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      mover(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      mover(1);
    }
  };

  if (activa === null) {
    const visibles = fotos.slice(0, 3);
    const extra = fotos.length - visibles.length;
    return (
      <ul ref={thumbsRef} className="mt-3 grid grid-cols-3 gap-1.5">
        {visibles.map((src, i) => (
          <li key={`${i}-${src.slice(-16)}`} className="relative">
            <Button variant="unstyled" size="unstyled"
              type="button"
              data-foto-thumb={i}
              onClick={() => abrir(i, `[data-foto-thumb="${i}"]`)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              className="block aspect-video w-full overflow-hidden rounded-md border border-[var(--border)] transition-opacity hover:opacity-85"
            >
              <img src={src} alt={`Foto ${i + 1} del aporte`} className="size-full object-cover" loading="lazy" />
            </Button>
            {i === visibles.length - 1 && extra > 0 && (
              <Button variant="unstyled" size="unstyled"
                type="button"
                data-foto-more
                onClick={() =>
                  abrir(visibles.length - 1, "[data-foto-more]")
                }
                className="absolute inset-0 flex items-center justify-center rounded-md bg-[var(--panel-dimmer)]/80 text-xs font-semibold text-[var(--ember-foreground)] transition-colors hover:bg-[var(--panel-dimmer)]/90"
                aria-label={`Ver las ${extra} fotos restantes`}
              >
                +{extra}
              </Button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className="relative mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
      onKeyDown={onVisorKeyDown}
    >
      <img
        src={fotos[activa]}
        alt={`Foto ${activa + 1} de ${fotos.length}`}
        className="mx-auto max-h-[420px] w-full object-contain"
      />

      {/* Contador */}
      <span
        aria-live="polite"
        className="label-micro absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--surface-0)]/85 px-2.5 py-1 text-[var(--text-secondary)] backdrop-blur-sm tabular"
      >
        {activa + 1} / {fotos.length}
      </span>

      {/* Cerrar visor */}
      <Button variant="unstyled" size="unstyled"
        ref={cerrarRef}
        type="button"
        onClick={() => setActiva(null)}
        aria-label="Cerrar visor de fotos"
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
      >
        <X className="size-4" strokeWidth={1.5} />
      </Button>

      {/* Navegación */}
      {fotos.length > 1 && (
        <>
          <Button variant="unstyled" size="unstyled"
            type="button"
            onClick={() => setActiva((activa - 1 + fotos.length) % fotos.length)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </Button>
          <Button variant="unstyled" size="unstyled"
            type="button"
            onClick={() => setActiva((activa + 1) % fotos.length)}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-0)]/85 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </Button>
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
        {aporte.codigo_radicado && (
          <Badge
            variant="outline"
            className="font-mono text-[10px] tracking-wider text-[var(--text-secondary)] border-[var(--border-strong)]"
          >
            {aporte.codigo_radicado}
          </Badge>
        )}
        {aporte.metadatos?.canal === "whatsapp" && (
          <Badge
            variant="outline"
            className="gap-1 font-sans text-[10px] text-[var(--accent)] border-[var(--border-strong)]"
          >
            <MessageSquare className="size-3" strokeWidth={1.5} />
            <span>WhatsApp</span>
          </Badge>
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
        <Button variant="unstyled" size="unstyled"
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
        </Button>
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

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const UUID_CANONICO_LINEA = "01a0f61b-6252-73d5-b035-7671ed9cf089";
  const lineaIdApi = UUID_REGEX.test(props.lineaId) ? props.lineaId : UUID_CANONICO_LINEA;

  const {
    data: dataAportesApi,
    isLoading: cargandoAportes,
    isError: errorAportes,
    refetch: reintentarAportes,
  } = useAportes({ linea_id: lineaIdApi });

  const { mutate: mutarRespaldo } = useRespaldarAporte();

  const handleApoyar = (lineaId: string, aporteId: string) => {
    toggleApoyo(lineaId, aporteId);
    if (UUID_REGEX.test(aporteId)) {
      mutarRespaldo(aporteId);
    }
  };

  const listaAportesCombinada: Aporte[] = useMemo(() => {
    const apiItems = dataAportesApi?.elementos ?? [];
    const mapeados: Aporte[] = apiItems.map((el) => ({
      id: el.id,
      lineaId: props.lineaId,
      tipo: (el.tipo_aporte === "propuesta" || el.tipo_aporte === "anotacion" || el.tipo_aporte === "pregunta")
        ? el.tipo_aporte
        : "propuesta",
      titulo: el.titulo,
      contenido: el.descripcion,
      autor: el.es_anonimo ? "Ciudadano Anónimo" : el.autor_nombre,
      autorId: el.es_anonimo ? undefined : "identidad",
      votos: el.apoyos_contador ?? 0,
      apoyado: false,
      fecha: el.creado_en,
      fotos: Array.isArray(el.archivos_adjuntos)
        ? el.archivos_adjuntos.filter((f): f is string => typeof f === "string")
        : [],
      codigo_radicado: el.codigo_radicado,
      metadatos: el.metadatos,
    }));

    if (!linea?.aportes) return mapeados;
    const combinados = [...mapeados];
    for (const a of linea.aportes) {
      if (!combinados.some((c) => c.id === a.id)) {
        combinados.push(a);
      }
    }
    return combinados;
  }, [dataAportesApi, props.lineaId, linea]);

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
        <Button variant="default" size="sm"
          type="button"
          onClick={() =>
            openPanel("aporte", {
              politicaId: props.politicaId,
              faseId: props.faseId,
              lineaId: props.lineaId,
            })
          }
          className="group w-full"
        >
          <MessageSquarePlus className="size-4" strokeWidth={1.5} />
          Aportar a esta línea
        </Button>
      }
    >
      <div className="w-full space-y-6 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10">
        {/* ---------- Contexto de la línea ---------- */}
        <section className="space-y-3">
          <SectionLabel
            right={
              <span className="text-xs text-[var(--text-tertiary)] tabular">
                {listaAportesCombinada.length}{" "}
                {listaAportesCombinada.length === 1 ? "aporte" : "aportes"}
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

          {cargandoAportes ? (
            <div className="space-y-3" role="status" aria-label="Cargando aportes ciudadanos">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          ) : errorAportes ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                No se pudieron sincronizar los aportes con el servidor.
              </p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => reintentarAportes()}
                className="mt-3 inline-flex items-center gap-1.5"
              >
                <RefreshCw className="size-3.5" strokeWidth={1.5} />
                Reintentar
              </Button>
            </div>
          ) : listaAportesCombinada.length === 0 ? (
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
              {listaAportesCombinada.map((aporte) => (
                <AporteCard
                  key={aporte.id}
                  aporte={aporte}
                  lineaId={linea.id}
                  onApoyar={handleApoyar}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
