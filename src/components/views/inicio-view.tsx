"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  MessagesSquare,
  PenLine,
  SearchCheck,
  PanelsTopLeft,
} from "lucide-react";
import { usePoliticasStore } from "@/stores/politicas-store";
import { totalAportes } from "@/types/domain";
import { PoliticaCard } from "@/features/politicas/components/politica-card";

/**
 * Vista Inicio — hero editorial, métricas vivas, consultas activas
 * y explicación del proceso participativo.
 */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const METODOLOGIA = [
  {
    num: "01",
    icon: SearchCheck,
    titulo: "Diagnóstico",
    desc: "La ciudad identifica y prioriza los problemas reales de cada territorio con evidencia y cartografía social.",
  },
  {
    num: "02",
    icon: PenLine,
    titulo: "Formulación",
    desc: "Las líneas estratégicas se abren para que cualquier ciudadano aporte propuestas, anotaciones y preguntas.",
  },
  {
    num: "03",
    icon: MessagesSquare,
    titulo: "Deliberación",
    desc: "Los aportes se debaten, se apoyan y el equipo técnico responde uno a uno antes del cierre.",
  },
  {
    num: "04",
    icon: BadgeCheck,
    titulo: "Trazabilidad",
    desc: "Cada aporte queda en el acta oficial. El informe final muestra qué se incorporó y por qué.",
  },
];

export function InicioView() {
  const politicas = usePoliticasStore((s) => s.politicas);
  const setVista = usePoliticasStore((s) => s.setVista);

  const totalAportesCiudadanos = politicas.reduce((a, p) => a + totalAportes(p), 0);
  const totalParticipantes = politicas.reduce((a, p) => a + p.participantes, 0);
  const enConsulta = politicas.filter(
    (p) => p.estado === "consulta_publica" || p.estado === "en_deliberacion"
  ).length;
  const totalLineas = politicas.reduce(
    (a, p) => a + p.fases.reduce((x, f) => x + f.lineas.length, 0),
    0
  );

  const destacadas = politicas
    .filter((p) => p.estado === "consulta_publica" || p.estado === "en_deliberacion")
    .slice(0, 3);

  const stats = [
    { valor: enConsulta.toString().padStart(2, "0"), label: "Políticas en consulta" },
    { valor: totalLineas.toString(), label: "Líneas estratégicas abiertas" },
    { valor: totalAportesCiudadanos.toLocaleString("es-CO"), label: "Aportes ciudadanos" },
    { valor: totalParticipantes.toLocaleString("es-CO"), label: "Personas participando" },
  ];

  return (
    <div>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="bg-dotgrid absolute inset-0" aria-hidden />
        <div className="container-fluid relative pb-16 pt-14 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
          {/* En pantallas grandes el hero se divide: texto a la izquierda,
              métricas vivas a la derecha — aprovecha todo el ancho sin
              estirar la medida de lectura del texto. */}
          <div className="grid gap-12 xl:grid-cols-12 xl:items-end xl:gap-16">
            <div className="xl:col-span-7 2xl:col-span-8">
              <motion.p
                {...fadeUp}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <span className="size-1.5 rounded-full bg-[var(--ember)]" aria-hidden />
                <span className="label-micro text-[var(--text-secondary)]">
                  Plataforma de participación ciudadana
                </span>
              </motion.p>

              <motion.h1
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="display-tight mt-6 text-[clamp(2.5rem,4.2vw,5.75rem)] font-semibold text-[var(--text-primary)]"
              >
                Las políticas públicas
                <br />
                <span className="text-fade">se construyen contigo.</span>
              </motion.h1>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.16 }}
                className="mt-7 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-base lg:text-lg"
              >
                Explora las políticas en curso, entra fase por fase y línea por línea, y deja
                tu propuesta, anotación o pregunta exactamente donde se toma la decisión.
                Cada aporte queda registrado y recibe respuesta oficial.
              </motion.p>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => setVista("explorar")}
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3 text-[13px] font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 lg:px-7 lg:py-3.5 lg:text-sm"
                >
                  Explorar políticas
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </button>
                <a
                  href="#metodologia"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-6 py-3 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] lg:px-7 lg:py-3.5 lg:text-sm"
                >
                  Cómo funciona el proceso
                </a>
              </motion.div>
            </div>

            {/* Métricas vivas — columna derecha en xl, banda inferior en < xl.
                Bordes por celda: móvil 2×2, md 4-en-fila, xl 2×2. */}
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] md:grid-cols-4 xl:col-span-5 xl:grid-cols-2 2xl:col-span-4"
            >
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`px-6 py-6 lg:px-8 lg:py-8 ${
                    [
                      "",                                        // 0 — sin bordes
                      "border-l",                                // 1 — derecha siempre
                      "border-t md:border-l md:border-t-0 xl:border-t xl:border-l-0", // 2
                      "border-l border-t md:border-t-0 xl:border-t",                   // 3
                    ][i]
                  }`}
                >
                  <dd className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular md:text-3xl xl:text-[2rem] 2xl:text-4xl">
                    {s.valor}
                  </dd>
                  <dt className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    {s.label}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>
      </section>

      {/* ================= CONSULTAS ACTIVAS ================= */}
      <section className="container-fluid pb-20 md:pb-24">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="label-micro text-[var(--ember)]">En curso</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-2xl lg:text-3xl">
              Consultas abiertas ahora
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setVista("explorar")}
            className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Ver todas
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </button>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),720px))] [justify-content:space-between]">
          {destacadas.map((p, i) => (
            <PoliticaCard key={p.id} politica={p} index={i} />
          ))}
        </div>
      </section>

      {/* ================= METODOLOGÍA ================= */}
      <section id="metodologia" className="border-t border-[var(--border)] bg-[var(--surface-2)]">
        <div className="container-fluid py-20 md:py-24">
          <p className="label-micro text-[var(--text-tertiary)]">Metodología</p>
          <h2 className="display-tight mt-2 max-w-2xl text-3xl font-semibold text-[var(--text-primary)] md:text-4xl lg:text-[2.75rem]">
            Cuatro momentos, una sola conversación.
          </h2>

          <div className="mt-12 grid gap-x-8 gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),440px))] [justify-content:space-between]">
            {METODOLOGIA.map((paso, i) => {
              const Icon = paso.icon;
              return (
                <motion.div
                  key={paso.num}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="border-t border-[var(--border-strong)] pt-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular">
                      {paso.num}
                    </span>
                    <Icon className="size-4 text-[var(--text-secondary)]" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                    {paso.titulo}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {paso.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Nota de arquitectura de interacción */}
          <div className="mt-14 flex items-start gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <PanelsTopLeft className="mt-0.5 size-4 shrink-0 text-[var(--ember)]" strokeWidth={1.5} />
            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">
                Navegación sin ventanas emergentes.
              </span>{" "}
              Todo el recorrido — política, fase, línea estratégica y aporte — sucede en
              paneles laterales que se apilan: nunca pierdes el hilo de dónde estás, y
              puedes retroceder nivel a nivel.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
