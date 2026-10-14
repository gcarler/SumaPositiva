"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import {
  DIMENSIONES_DETALLE_2026,
  type DimensionDetalle,
} from "../data/dimensiones-detalle.data";

// Exportación compatible para consumidores existentes
export const DIMENSIONES = DIMENSIONES_DETALLE_2026.filter((d) => d.id !== "crisis").map((d) => ({
  id: d.id,
  num: d.numero,
  icono: d.icono,
  titulo: d.nombreCorto,
  nombreCompleto: d.nombre,
  desc: d.descripcion,
  pilarOnu: d.pilarOnu,
  lema: d.lema,
  color: d.colorToken,
}));

export function DimensionesGrid() {
  const reducedMotion = useReducedMotion();
  const { openPanel } = usePanels();

  // Las 7 dimensiones fundamentales de la ONU (excluyendo la dimensión transversal de crisis)
  const dimensionesOnu = DIMENSIONES_DETALLE_2026.filter((d) => d.id !== "crisis");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {dimensionesOnu.map((dim: DimensionDetalle, i: number) => {
        const Icono = dim.icono;
        return (
          <motion.div
            key={dim.id}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className="h-full"
          >
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() =>
                openPanel("dimension-detalle", { dimensionId: dim.id })
              }
              aria-label={`Explorar la dimensión ${dim.numero}: ${dim.nombre}. ${dim.pilarOnu}`}
              className="group flex h-full w-full flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-left transition-all hover:border-[var(--ember)]/60 hover:bg-[var(--surface-2)]/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular">
                    {dim.numero}
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ember)] transition-colors group-hover:bg-[var(--ember)] group-hover:text-[var(--ember-foreground)]">
                    <Icono className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-3">
                  <span className="inline-block rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {dim.pilarOnu}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--ember)]">
                  {dim.nombre}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {dim.descripcion}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)]/70 pt-3 text-xs font-semibold text-[var(--ember)]">
                <span>Explorar dimensión a fondo</span>
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}
