"use client";

import { useState, useMemo } from "react";
import {
  Compass,
  Building2,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Coins,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  DIMENSIONES_DETALLE_2026,
  obtenerDimensionPorId,
  obtenerEntidadConTitular,
  type DimensionDetalle,
} from "../data/dimensiones-detalle.data";
import { obtenerDependenciaPorId } from "../data/entidades-cartagena.data";

export function DimensionDetallePanel({
  entryKey = "panel-dimension-detalle",
  props = { dimensionId: "personal" },
}: {
  entryKey?: string;
  props?: { dimensionId: string };
} = {}) {
  const { closeTop, closeToKey, openPanel } = usePanels();
  const { setVista, irADimension } = useNavigationStore();

  const [dimensionActivaId, setDimensionActivaId] = useState<string>(
    props?.dimensionId || "personal"
  );

  const dimension = useMemo<DimensionDetalle>(() => {
    return (
      obtenerDimensionPorId(dimensionActivaId) ??
      DIMENSIONES_DETALLE_2026[0]
    );
  }, [dimensionActivaId]);

  const entidadLider = useMemo(() => {
    const raw = obtenerDependenciaPorId(dimension.entidadLiderId);
    return raw ? obtenerEntidadConTitular(raw) : null;
  }, [dimension]);

  const corresponsables = useMemo(() => {
    return dimension.corresponsables
      .map((item) => {
        const dep = obtenerDependenciaPorId(item.dependenciaId);
        if (!dep) return null;
        return {
          ...item,
          dependencia: obtenerEntidadConTitular(dep),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dimension]);

  const Icono = dimension.icono;

  // Las 7 dimensiones oficiales de la ONU
  const sieteDimensionesOnu = useMemo(() => {
    return DIMENSIONES_DETALLE_2026.filter((d) => d.id !== "crisis");
  }, []);

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[
        { label: "Marco Multidimensional ONU" },
        { label: dimension.nombreCorto },
      ]}
      kicker={`Dimensión ${dimension.numero} de 07 • ONU / PNUD`}
      title={dimension.nombre}
      subtitle={dimension.lema}
      onClose={closeTop}
      onCloseToKey={closeToKey}
    >
      <div className="w-full space-y-10 px-5 py-6 sm:px-6 lg:px-8">
        {/* ================= BARRA DE CAMBIO RÁPIDO ENTRE LAS 7 DIMENSIONES ================= */}
        <section aria-label="Navegación entre dimensiones" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Explorar las 7 Dimensiones ONU
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {dimension.codigo} activa
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {sieteDimensionesOnu.map((item) => {
              const estaActiva = item.id === dimension.id;
              const ItemIcon = item.icono;
              return (
                <Button
                  key={item.id}
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={() => setDimensionActivaId(item.id)}
                  aria-pressed={estaActiva}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    estaActiva
                      ? "bg-[var(--ember)] text-[var(--ember-foreground)] shadow-xs"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <ItemIcon className="size-3.5" aria-hidden="true" />
                  <span>
                    {item.numero} {item.nombreCorto}
                  </span>
                </Button>
              );
            })}
          </div>
        </section>

        {/* ================= BLOQUE 1: PARADIGMA ONU Y DEFINICIÓN PEDAGÓGICA ================= */}
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ember)]">
                <Icono className="size-5" aria-hidden="true" />
              </span>
              <div>
                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Pilar Fundamental ONU
                </span>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {dimension.pilarOnu}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="border-[var(--border-strong)] text-xs font-mono">
              Resolución ONU 66/290
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              ¿En qué consiste la {dimension.nombre} según las Naciones Unidas?
            </h3>
            {dimension.queEsExplicacionPedagogica.map((parrafo, idx) => (
              <p
                key={idx}
                className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base"
              >
                {parrafo}
              </p>
            ))}
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] p-3.5 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Marco Normativo: </span>
            <span>{dimension.marcoLegal}</span>
          </div>
        </section>

        {/* ================= BLOQUE 2: DIAGNÓSTICO EN CARTAGENA Y AMENAZAS ================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Diagnóstico Territorial en Cartagena de Indias
            </h3>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 leading-relaxed text-sm text-[var(--text-secondary)]">
            {dimension.contextoCartagena}
          </div>

          <div className="pt-2">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Amenazas y Vulnerabilidades Críticas que Atiende
              </h4>
              <span className="text-xs text-[var(--text-secondary)]">
                4 focos prioritarios
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {dimension.amenazasCriticas.map((amenaza, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden="true" />
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)]">
                        {amenaza.titulo}
                      </h5>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                        {amenaza.descripcion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= BLOQUE 3: ENFOQUE DIFERENCIAL Y TERRITORIAL ================= */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-[var(--ember)]" aria-hidden="true" />
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Enfoque Diferencial, Étnico (Ley 70/93) y de Género
              </h4>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                {dimension.enfoqueDiferencial}
              </p>
            </div>
          </div>
        </section>

        {/* ================= BLOQUE 4: INDICADORES TRAZADORES 2026–2036 Y METAS ================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Indicadores Trazadores Decenales (2026–2036)
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {dimension.indicadoresTrazadores.map((ind, i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {ind.indicador}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--text-tertiary)]">
                      Línea Base
                    </span>
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {ind.lineaBase}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-[var(--text-tertiary)]">
                      Meta 2036
                    </span>
                    <span className="font-bold text-[var(--success)]">
                      {ind.meta2036}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Metas del PDD */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Metas Clave del Plan de Desarrollo Distrital
            </h4>
            <ul className="mt-3 space-y-2.5">
              {dimension.metasClave.map((meta, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--ember)]" aria-hidden="true" />
                  <span>{meta}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= BLOQUE 5: GOBERNANZA DISTRITAL RESPONSABLE ================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-[var(--ember)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Gobernanza Distrital y Dependencias Responsables
            </h3>
          </div>

          {/* Entidad Líder */}
          {entidadLider && (
            <div className="rounded-xl border-2 border-[var(--ember)]/30 bg-[var(--surface-1)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge variant="ember" className="text-[10px] font-semibold uppercase">
                    Dependencia Líder
                  </Badge>
                  <h4 className="mt-1.5 text-base font-bold text-[var(--text-primary)]">
                    {entidadLider.nombre}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {entidadLider.titular}
                  </p>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] uppercase text-[var(--text-tertiary)]">
                    Presupuesto Asignado
                  </span>
                  <span className="text-sm font-bold text-[var(--ember)]">
                    {dimension.presupuestoTotalCop}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openPanel("rendicion-cuentas", {
                      dependenciaId: dimension.entidadLiderId,
                    })
                  }
                  className="gap-1.5 text-xs"
                >
                  <Coins className="size-3.5" aria-hidden="true" />
                  <span>Ver rendición de cuentas y ejecución presupuestal</span>
                  <ExternalLink className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Corresponsables */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Entidades Corresponsables ({corresponsables.length})
            </h4>

            <div className="space-y-2">
              {corresponsables.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {item.dependencia.nombre}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {item.proyectoClave}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit shrink-0 text-[10px]">
                    {item.rolEspecifico}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= BLOQUE 6: PARTICIPACIÓN CIUDADANA Y ACCIONES DIRECTAS ================= */}
        <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              ¿Cómo Puedes Incidir en Esta Dimensión?
            </h3>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {dimension.comoParticipar}
            </p>
          </div>

          <div className="grid gap-3 pt-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                irADimension(dimension.id);
                closeTop();
              }}
              className="w-full justify-between text-xs"
            >
              <span>Matriz de entidades</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVista("explorar");
                closeTop();
              }}
              className="w-full justify-between text-xs"
            >
              <span>Líneas y aportes</span>
              <Layers className="size-3.5" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVista("geovisor");
                closeTop();
              }}
              className="w-full justify-between text-xs"
            >
              <span>Geovisor territorial</span>
              <Compass className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
