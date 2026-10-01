"use client";

import {
  ShieldCheck,
  Users,
  Briefcase,
  Leaf,
  Wheat,
  HeartPulse,
  Scale,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export const DIMENSIONES = [
  {
    num: "01",
    icono: ShieldCheck,
    titulo: "Seguridad Personal",
    desc: "Desarme, erradicación de violencias y prevención integral de ESCNNA en entornos escolares y turísticos.",
    color: "--ember",
  },
  {
    num: "02",
    icono: Users,
    titulo: "Seguridad Comunitaria",
    desc: "Cohesión social, mediación vecinal y salvaguardas étnicas para comunidades negras e insulares (Ley 70/93).",
    color: "--ember",
  },
  {
    num: "03",
    icono: Briefcase,
    titulo: "Seguridad Económica",
    desc: "Empleo digno, economía popular y alternativas productivas para jóvenes en riesgo.",
    color: "--ember",
  },
  {
    num: "04",
    icono: Leaf,
    titulo: "Seguridad Ambiental",
    desc: "Saneamiento y resiliencia en la Ciénaga de la Virgen, protección de la bahía y mitigación costera.",
    color: "--ember",
  },
  {
    num: "05",
    icono: Wheat,
    titulo: "Seguridad Alimentaria",
    desc: "Soberanía alimentaria, nutrición infantil y circuitos cortos con la zona rural corregimental.",
    color: "--ember",
  },
  {
    num: "06",
    icono: HeartPulse,
    titulo: "Seguridad en Salud",
    desc: "Atención primaria integral, salud mental y prevención comunitaria de adicciones.",
    color: "--ember",
  },
  {
    num: "07",
    icono: Scale,
    titulo: "Seguridad Política",
    desc: "Protección a liderazgos comunitarios, transparencia activa y ejercicio pleno de libertades.",
    color: "--ember",
  },
];

export function DimensionesGrid() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {DIMENSIONES.map((dim, i) => {
        const Icono = dim.icono;
        return (
          <motion.div
            key={dim.num}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 transition-colors hover:border-[var(--border-strong)]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular">
                  {dim.num}
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ember)]">
                  <Icono className="size-4" strokeWidth={1.75} />
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                {dim.titulo}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {dim.desc}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)]">
              <span className="size-1 rounded-full bg-[var(--ember)]" />
              <span>Dimensión ONU</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
