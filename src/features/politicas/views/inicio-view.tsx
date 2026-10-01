"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  Scale,
  Compass,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Progress } from "@/shared/ui/progress";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { usePoliticaPrincipal } from "@/features/politicas/state/politicas-store";
import { totalAportes } from "@/features/politicas/models/politicas";
import { DimensionesGrid } from "@/features/politicas/components/dimensiones-grid";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const TERRITORIOS = [
  {
    id: "loc-1",
    nombre: "Localidad 1 — Histórica y del Caribe Norte",
    descripcion:
      "Centro Histórico, Getsemaní, San Diego, Cabrero, Marbella, Crespo, Canapote y barrios aledaños al borde costero norte.",
  },
  {
    id: "loc-2",
    nombre: "Localidad 2 — De la Virgen y Turística",
    descripcion:
      "El Pozón, Olaya Herrera, Boston, La Esperanza, Fredonia y cuenca suroccidental de la Ciénaga de la Virgen.",
  },
  {
    id: "loc-3",
    nombre: "Localidad 3 — Industrial y de la Bahía",
    descripcion:
      "Nelson Mandela, San José de los Campanos, Arroz Barato, Albornoz, Policarpa y zona de influencia portuario-industrial.",
  },
  {
    id: "rural-insular",
    nombre: "Zona Corregimental e Insular",
    descripcion:
      "La Boquilla, Tierrabomba, Barú, Pasacaballos, Bayunca, Arroyo de Piedra y comunidades étnicas con consulta previa (Ley 70/93).",
  },
];

export function InicioView() {
  const reducedMotion = useReducedMotion();
  const setVista = useNavigationStore((s) => s.setVista);
  const politica = usePoliticaPrincipal();

  if (!politica) {
    return null;
  }

  /* Métricas vivas requeridas */
  const totalParticipantes = politica.participantes.toLocaleString("es-CO");
  const totalAportesCiudadanos = totalAportes(politica).toLocaleString("es-CO");
  const lineasConAportes = politica.fases.reduce(
    (acc, f) => acc + f.lineas.filter((l) => l.aportes.length > 0).length,
    0
  );
  const fasesCompletadas = politica.fases.filter(
    (f) => f.estado === "completada"
  ).length;

  const stats = [
    { valor: totalParticipantes, label: "Ciudadanos participando" },
    { valor: totalAportesCiudadanos, label: "Aportes ciudadanos radicados" },
    { valor: lineasConAportes.toString().padStart(2, "0"), label: "Líneas estratégicas abiertas" },
    { valor: `${fasesCompletadas} de ${politica.fases.length}`, label: "Fases DNP completadas" },
  ];

  return (
    <div className="space-y-20 pb-20 md:space-y-28 md:pb-28">
      {/* ================= HERO INSTITUCIONAL ================= */}
      <section className="relative overflow-hidden">
        <div className="bg-dotgrid absolute inset-0" aria-hidden />
        <div className="container-fluid relative pb-12 pt-12 md:pb-20 md:pt-16 lg:pb-24 lg:pt-20">
          <div className="grid gap-12 xl:grid-cols-12 xl:items-end xl:gap-16">
            <div className="xl:col-span-7 2xl:col-span-8">
              <motion.p
                {...(reducedMotion ? { initial: false as const } : fadeUp)}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <span className="size-2 rounded-full bg-[var(--ember)]" aria-hidden />
                <span className="label-micro text-[var(--text-secondary)]">
                  Distrito Turístico y Cultural de Cartagena de Indias
                </span>
              </motion.p>

              <motion.h1
                {...(reducedMotion ? { initial: false as const } : fadeUp)}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="display-tight mt-6 text-[clamp(2.25rem,4vw,5.25rem)] font-semibold text-[var(--text-primary)]"
              >
                Política Pública de Seguridad Humana Integral{" "}
                <span className="text-fade block sm:inline">2026–2036</span>
              </motion.h1>

              <motion.p
                {...(reducedMotion ? { initial: false as const } : fadeUp)}
                transition={{ duration: 0.55, delay: 0.16 }}
                className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-base lg:text-lg"
              >
                Garantizando las libertades frente al miedo, la necesidad y la indignidad mediante la
                participación vinculante de la ciudadanía (Decreto Nacional 037 de 2026 — Sentencia C-150 de 2015).
              </motion.p>

              {/* 3 Botones de acción */}
              <motion.div
                {...(reducedMotion ? { initial: false as const } : fadeUp)}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="mt-9 flex flex-wrap items-center gap-3.5"
              >
                <Button
                  variant="default"
                  size="lg"
                  type="button"
                  onClick={() => setVista("explorar")}
                  className="group"
                >
                  Dejar mi Aporte Territorial
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.75}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  type="button"
                  asChild
                >
                  <a href="#fases-dnp">
                    <FileCheck2 className="size-4 text-[var(--text-secondary)]" strokeWidth={1.75} />
                    Ver Diagnóstico Participativo
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  type="button"
                  onClick={() => setVista("geovisor")}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Compass className="size-4 text-[var(--ember)]" strokeWidth={1.75} />
                  Geovisor de Seguridad
                </Button>
              </motion.div>
            </div>

            {/* Métricas vivas */}
            <motion.dl
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] md:grid-cols-4 xl:col-span-5 xl:grid-cols-2 2xl:col-span-4"
            >
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col-reverse px-6 py-6 lg:px-7 lg:py-7 ${
                    [
                      "",
                      "border-l border-[var(--border)]",
                      "border-t border-[var(--border)] md:border-l md:border-t-0 xl:border-t xl:border-l-0",
                      "border-l border-t border-[var(--border)] md:border-t-0 xl:border-t",
                    ][i]
                  }`}
                >
                  <dt className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    {s.label}
                  </dt>
                  <dd className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular md:text-3xl xl:text-[1.85rem] 2xl:text-3xl">
                    {s.valor}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>
      </section>

      {/* ================= 7 DIMENSIONES ONU ================= */}
      <section id="dimensiones" className="container-fluid">
        <div className="mb-8 max-w-2xl">
          <p className="label-micro text-[var(--ember)]">Marco Multidimensional ONU</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
            Las 7 Dimensiones de la Seguridad Humana
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
            La política pública territorializa las libertades frente al miedo, la necesidad y la
            indignidad, organizando las alternativas ciudadanas en los siete ejes definidos por las Naciones Unidas.
          </p>
        </div>

        <DimensionesGrid />
      </section>

      {/* ================= CICLO DNP ================= */}
      <section id="fases-dnp" className="border-y border-[var(--border)] bg-[var(--surface-2)]">
        <div className="container-fluid py-16 md:py-24">
          <div className="mb-10 max-w-2xl">
            <p className="label-micro text-[var(--text-tertiary)]">Metodología DNP & CONPES</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
              Ciclo de Formulación de la Política
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
              Progreso auditado y trazable de cada fase metodológica en el marco de la planeación
              territorial de Cartagena de Indias.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {politica.fases.map((fase) => {
              let tone: StatusTone = "neutral";
              let labelEstado = "Próxima";
              if (fase.estado === "completada") {
                tone = "success";
                labelEstado = "Completada";
              } else if (fase.estado === "activa") {
                tone = "warning";
                labelEstado = "En curso";
              }

              return (
                <div
                  key={fase.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular">
                        Fase 0{fase.orden}
                      </span>
                      <StatusBadge tone={tone}>{labelEstado}</StatusBadge>
                    </div>

                    <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                      {fase.nombre}
                    </h3>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {fase.descripcion}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[var(--border)] pt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span className="font-medium">Progreso</span>
                      <span className="font-semibold tabular text-[var(--text-primary)]">
                        {fase.progreso}%
                      </span>
                    </div>
                    <Progress value={fase.progreso} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= TERRITORIOS DE CARTAGENA ================= */}
      <section className="container-fluid">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="label-micro text-[var(--ember)]">Anclaje Territorial</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
              Territorios de Cartagena de Indias
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
              Participación descentralizada en las tres localidades urbanas y la zona insular-corregimental
              con salvaguardas de consulta previa.
            </p>
          </div>
          <Button
            variant="outline"
            size="default"
            type="button"
            onClick={() => setVista("geovisor")}
            className="self-start md:self-auto"
          >
            <MapPin className="size-4 text-[var(--ember)]" />
            Explorar en Geovisor
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TERRITORIOS.map((terr) => (
            <div
              key={terr.id}
              className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 transition-colors hover:border-[var(--border-strong)]"
            >
              <div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ember)]">
                  <MapPin className="size-4" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                  {terr.nombre}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {terr.descripcion}
                </p>
              </div>

              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setVista("geovisor")}
                  className="w-full justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <span>Ver en Geovisor</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GARANTÍA C-150/15 ================= */}
      <section className="container-fluid">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 md:p-12">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-[var(--ember)]/5 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ember)]">
                <Scale className="size-4" strokeWidth={1.75} />
                <span className="uppercase tracking-wider">Mandato Constitucional Vinculante</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-2xl">
                Garantía de Devolución de Razones — Sentencia C-150 de 2015
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
                Cada propuesta ciudadana recibe respuesta oficial con sustentación técnica antes del cierre de
                la consulta pública. El Estado distrital no puede descartar aportes de forma silenciosa ni arbitraria.
              </p>
            </div>

            <Button
              variant="default"
              size="lg"
              type="button"
              onClick={() => setVista("explorar")}
              className="shrink-0 group"
            >
              Consultar estado de mi propuesta
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.75}
              />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
