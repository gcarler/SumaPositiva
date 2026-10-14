"use client";

import { Button } from "@/shared/ui/button";

import { useMemo } from "react";
import { ArrowRight, Network } from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels, usePanelStore } from "@/core/panels/panel-store";
import { useFase, usePolitica } from "@/features/politicas/state/politicas-store";
import {
  useFases,
  useLineas,
  usePoliticas,
} from "@/features/politicas/services/use-politicas-queries";
import type { Fase, LineaEstrategica, PoliticaPublica } from "@/features/politicas/models/politicas";
import { EstadoFaseChip, FaseTipoTag } from "@/features/politicas/components/politica-ui";
import { HairlineProgress } from "@/shared/components/participation-ui";
import { Skeleton } from "@/shared/ui/skeleton";

/**
 * Panel L2 — Fase del proceso con sus Líneas Estratégicas.
 * Se apila sobre el panel de política (L1).
 */

export function FasePanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { politicaId: string; faseId: string };
}) {
  const { openPanel, closeTop, closeToKey } = usePanels();

  const lineasQuery = useLineas();
  const fasesQuery = useFases();
  const politicasQuery = usePoliticas();

  const storePolitica = usePolitica(props.politicaId);
  const storeFase = useFase(props.politicaId, props.faseId);

  const parentKey = usePanelStore(
    (s) => s.entries.find((e) => e.type === "politica")?.key
  );

  const fase: Fase | undefined = useMemo(() => {
    if (storeFase) return storeFase;
    const encontrada =
      fasesQuery.data?.find((f) => f.id === props.faseId || f.codigo === props.faseId) ??
      fasesQuery.data?.find((f) => f.estado === "activa") ??
      fasesQuery.data?.[0];
    if (!encontrada) return undefined;

    const lineasVinculadas: LineaEstrategica[] = (lineasQuery.data ?? [])
      .filter((l) => l.fase_id === encontrada.id)
      .map((l) => ({
        id: l.id,
        faseId: l.fase_id,
        codigo: l.codigo,
        titulo: l.titulo,
        descripcion: l.descripcion,
        aportes: [],
        aportesCount: l.aportes_count ?? 0,
      }));

    return {
      id: encontrada.id,
      politicaId: props.politicaId,
      orden: encontrada.orden,
      nombre: encontrada.nombre,
      tipo: "diagnostico",
      descripcion: encontrada.descripcion ?? "",
      estado: (encontrada.estado === "activa"
        ? "activa"
        : encontrada.estado === "completada"
        ? "completada"
        : "proxima") as "activa" | "completada" | "proxima",
      progreso: Number(encontrada.progreso_porcentaje ?? 0),
      lineas: lineasVinculadas,
    };
  }, [storeFase, props.faseId, fasesQuery.data, lineasQuery.data, props.politicaId]);

  const politica: PoliticaPublica = useMemo(() => {
    if (storePolitica) return storePolitica;
    const encontrada = politicasQuery.data?.find(
      (p) => p.id === props.politicaId || p.slug === props.politicaId
    );
    if (encontrada) return encontrada;
    if (politicasQuery.data && politicasQuery.data.length > 0) {
      return politicasQuery.data[0];
    }
    return {
      id: "pol-001",
      slug: "seguridad-humana-cartagena",
      titulo: "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036",
      resumen:
        "Construcción participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias.",
      descripcion:
        "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036.",
      problema: "",
      sector: "seguridad",
      estado: "consulta_publica",
      cobertura:
        "Distrito de Cartagena: 3 Localidades urbanas, 11 corregimientos y zonas insulares",
      fechaInicio: "2026-02-01",
      fechaCierre: "2026-12-31",
      participantes: 0,
      fases: [],
    };
  }, [storePolitica, politicasQuery.data, props.politicaId]);

  if ((fasesQuery.isLoading || lineasQuery.isLoading) && !fase) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[
          { label: "Políticas públicas", targetKey: parentKey },
          { label: "Fase" },
        ]}
        title="Cargando fase…"
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <div className="space-y-4 p-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="pt-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </PanelShell>
    );
  }

  if (!fase || !politica) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[
          { label: "Políticas públicas", targetKey: parentKey },
          { label: "Fase" },
        ]}
        title="Fase no disponible"
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          Esta fase ya no está disponible.
        </p>
      </PanelShell>
    );
  }

  const totalAportesFase = fase.lineas.reduce((a, l) => a + l.aportes.length, 0);

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[
        { label: politica.titulo, targetKey: parentKey },
        { label: `Fase ${fase.orden}` },
      ]}
      kicker={`Fase ${fase.orden} de ${politica.fases.length}`}
      title={fase.nombre}
      onClose={closeTop}
      onCloseToKey={closeToKey}
    >
      <div className="w-full space-y-8 px-5 py-6 sm:px-6 lg:px-8 2xl:px-10">
        {/* ---------- Contexto de la fase ---------- */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <EstadoFaseChip estado={fase.estado} />
            <FaseTipoTag tipo={fase.tipo} />
            <span className="ml-auto text-xs font-medium text-[var(--text-secondary)] tabular">
              {fase.progreso}% avanzado
            </span>
          </div>
          <HairlineProgress value={fase.progreso} />
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {fase.descripcion}
          </p>
        </section>

        {/* ---------- Líneas estratégicas ---------- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="label-micro text-[var(--text-tertiary)]">
              Líneas estratégicas
            </h3>
            {totalAportesFase > 0 && (
              <span className="text-xs text-[var(--text-tertiary)] tabular">
                {totalAportesFase} aportes en esta fase
              </span>
            )}
          </div>

          {fase.lineas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border-strong)] px-6 py-10 text-center">
              <Network className="size-5 text-[var(--text-tertiary)]" strokeWidth={1.5} />
              <p className="max-w-xs text-sm text-[var(--text-secondary)]">
                Las líneas estratégicas de esta fase se publicarán cuando el proceso
                la alcance. Te avisaremos.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {fase.lineas.map((linea) => (
                <li key={linea.id}>
                  <Button variant="unstyled" size="unstyled"
                    type="button"
                    onClick={() =>
                      openPanel("linea", {
                        politicaId: politica.id,
                        faseId: fase.id,
                        lineaId: linea.id,
                      })
                    }
                    className="group w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded border border-[var(--border-strong)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] tabular">
                        {linea.codigo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-[var(--text-primary)]">
                          {linea.titulo}
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {linea.descripcion}
                        </p>
                        <p className="mt-2.5 text-xs text-[var(--text-tertiary)] tabular">
                          {linea.aportes.length === 0
                            ? "Sin aportes aún — sé el primero"
                            : `${linea.aportes.length} ${
                                linea.aportes.length === 1
                                  ? "aporte ciudadano"
                                  : "aportes ciudadanos"
                              }`}
                        </p>
                      </div>
                      <ArrowRight
                        className="mt-1 size-4 shrink-0 text-[var(--text-tertiary)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ember)]"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
