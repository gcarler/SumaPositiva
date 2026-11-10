"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  ArrowRight,
  BookOpen,
  MapPin,
  Sparkles,
  HelpCircle,
  Scale,
  Users,
  Building2,
  FileCheck2,
  Search,
  X,
  ChevronDown,
  Tag,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { IsotipoPolis } from "@/shared/branding/logo-polis";

import {
  DIMENSIONES,
  PILARES_ONU,
  COMPARATIVA_PARADIGMA,
  PREGUNTAS_ABC,
} from "../data/seguridad-humana.data";

const COMPARATIVA = COMPARATIVA_PARADIGMA;

const CATEGORIAS_FAQ = [
  { id: "todas", label: "Todas las Preguntas" },
  { id: "doctrina", label: "Doctrina y Pilares" },
  { id: "participacion", label: "Participación y JAC" },
  { id: "garantias", label: "Garantías y Presupuesto" },
  { id: "territorio", label: "Territorio y Datos" },
];

export function SeguridadHumanaView() {
  const [dimensionActiva, setDimensionActiva] = useState<string>("personal");
  const [pilarActivo] = useState<string>("miedo");
  const [categoriaFaq, setCategoriaFaq] = useState<string>("todas");
  const [busquedaFaq, setBusquedaFaq] = useState<string>("");
  const [faqsAbiertas, setFaqsAbiertas] = useState<Record<string, boolean>>({
    "faq-1": true,
  });

  const toggleFaq = (id: string) => {
    setFaqsAbiertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const dimSeleccionada =
    DIMENSIONES.find((d) => d.id === dimensionActiva) ?? DIMENSIONES[0];

  const terminoNormalizado = busquedaFaq.toLowerCase().trim();

  const faqsFiltradas = PREGUNTAS_ABC.filter((faq) => {
    const coincideCategoria =
      categoriaFaq === "todas" || faq.categoria === categoriaFaq;
    if (!terminoNormalizado) return coincideCategoria;
    const coincideTexto =
      faq.pregunta.toLowerCase().includes(terminoNormalizado) ||
      faq.respuesta.toLowerCase().includes(terminoNormalizado) ||
      (faq.destacado && faq.destacado.toLowerCase().includes(terminoNormalizado)) ||
      (faq.etiquetas &&
        faq.etiquetas.some((tag) =>
          tag.toLowerCase().includes(terminoNormalizado)
        ));
    return coincideCategoria && coincideTexto;
  });

  // Dividir en 2 columnas independientes para evitar descompensación vertical de alturas
  const columnaIzquierda = faqsFiltradas.filter((_, idx) => idx % 2 === 0);
  const columnaDerecha = faqsFiltradas.filter((_, idx) => idx % 2 !== 0);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Navegación Superior / Header de la Vista */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface-0)]/90 backdrop-blur-md">
        <div className="container-fluid flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-lg"
            aria-label="Ir a la página principal de POLIS"
          >
            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1">
              <IsotipoPolis className="size-full" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
                  POLIS
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]" aria-hidden="true">•</span>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Seguridad Humana
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">Cartagena 2026–2036</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/acerca"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
            >
              Acerca de POLIS
            </Link>
            <Link
              href="/barrio"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ember)] hover:underline"
            >
              Modo Barrio
            </Link>
            <Link
              href="/geovisor"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
            >
              Geovisor
            </Link>
            <Link
              href="/plataforma"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Acceso Institucional
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 pb-16">
        {/* ========================================================================= */}
        {/* SECCIÓN 1: HERO PEDAGÓGICO E INTRODUCCIÓN                                 */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="hero-title"
          className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-0)] py-14 sm:py-20"
        >
          <div className="container-fluid relative z-10 w-full text-center space-y-6">
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              <Badge variant="ember" className="text-xs font-semibold uppercase tracking-wider px-3 py-1">
                Paradigma de Política Pública 2026–2036
              </Badge>
              <Badge variant="outline" className="text-xs font-medium px-3 py-1">
                Resolución 66/290 de las Naciones Unidas
              </Badge>
            </div>

            <h1
              id="hero-title"
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.12]"
            >
              ¿Qué es la Seguridad Humana Integral?
            </h1>

            <p className="text-lg sm:text-2xl font-medium text-[var(--ember)] italic">
              «Poner la vida y la dignidad en el centro del territorio»
            </p>

            <p className="max-w-4xl mx-auto text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
              Durante décadas, la seguridad se entendió exclusivamente como patrullajes, blindajes y armas.
              Cartagena de Indias avanza hacia una doctrina integral: la verdadera seguridad florece cuando
              las familias no temen al salir a la calle, tienen agua, alimentos sanos, salud oportuna, trabajo
              digno y voz directa y vinculante para decidir sobre su barrio, su ciudad y su país.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href="#pilares-seccion"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                <span>Explorar los 3 Pilares y 7 Dimensiones</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>

              <a
                href="#caja-herramientas"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] px-5 py-3 text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
              >
                <Download className="size-4 text-[var(--ember)]" aria-hidden="true" />
                <span>Caja de Herramientas (Descargas)</span>
              </a>

              <a
                href="#preguntas-frecuentes"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] px-5 py-3 text-sm font-medium hover:text-[var(--text-primary)] transition-colors"
              >
                <HelpCircle className="size-4" aria-hidden="true" />
                <span>10 Preguntas Clave</span>
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: LOS 3 PILARES FUNDAMENTALES (ONU)                              */}
        {/* ========================================================================= */}
        <section
          id="pilares-seccion"
          aria-labelledby="pilares-title"
          className="container-fluid w-full py-14 sm:py-20 space-y-10"
        >
          <div className="text-center space-y-2 max-w-4xl mx-auto">
            <span className="label-micro uppercase font-bold tracking-widest text-[var(--text-tertiary)]">
              Marco Universal ONU
            </span>
            <h2 id="pilares-title" className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
              Los Tres Pilares de la Seguridad Humana
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Consagrados por la Asamblea General de la ONU, estos tres principios articulan la acción pública distrital:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {PILARES_ONU.map((pilar) => {
              const activo = pilarActivo === pilar.id;
              return (
                <article
                  key={pilar.id}
                  className={`flex flex-col justify-between rounded-2xl border p-6 sm:p-8 transition-all ${
                    activo
                      ? "border-[var(--ember)] bg-[var(--surface-1)] shadow-md ring-1 ring-[var(--ember)]/30"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                        Pilar ONU
                      </Badge>
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: pilar.colorToken }} />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                      {pilar.titulo}
                    </h3>
                    <p className="text-sm font-semibold text-[var(--ember)]">
                      {pilar.subtitulo}
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      {pilar.descripcion}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
                    {pilar.dimensiones.map((dim) => (
                      <Badge key={dim} variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
                        {dim}
                      </Badge>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 3: INFOGRAFÍA INTERACTIVA DE LAS 7 DIMENSIONES DE CARTAGENA        */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="dimensiones-title"
          className="border-y border-[var(--border)] bg-[var(--surface-1)] py-14 sm:py-20"
        >
          <div className="container-fluid w-full space-y-10">
            <div className="text-center space-y-2 max-w-4xl mx-auto">
              <Badge variant="ember" className="text-xs font-semibold uppercase tracking-wider px-3 py-1">
                Infografía Territorial Dinámica
              </Badge>
              <h2 id="dimensiones-title" className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                Las Siete (7) Dimensiones Integrales en Cartagena
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)]">
                Haz clic en cada dimensión para conocer el diagnóstico barrial real, el desafío crítico y la entidad distrital líder:
              </p>
            </div>

            {/* Selector de Dimensiones en pestañas/botones a ancho completo */}
            <div
              role="tablist"
              aria-label="Selector de dimensiones de seguridad humana"
              className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 w-full"
            >
              {DIMENSIONES.map((dim) => {
                const Icono = dim.icono;
                const seleccionada = dimensionActiva === dim.id;
                return (
                  <Button
                    key={dim.id}
                    variant="unstyled"
                    size="unstyled"
                    role="tab"
                    id={`tab-${dim.id}`}
                    aria-selected={seleccionada}
                    aria-controls={`panel-${dim.id}`}
                    type="button"
                    onClick={() => setDimensionActiva(dim.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
                      seleccionada
                        ? "border-[var(--ember)] bg-[var(--surface-2)] shadow-xs ring-1 ring-[var(--ember)]"
                        : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span
                      className={`flex size-9 sm:size-10 items-center justify-center rounded-xl mb-1.5 transition-transform ${
                        seleccionada
                          ? "bg-[var(--ember-soft)] text-[var(--ember)] scale-105"
                          : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <Icono className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                      {dim.nombreCorto}
                    </span>
                    <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5 font-mono font-semibold">
                      {dim.codigo}
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Ficha Dinámica Desplegada de la Dimensión Seleccionada */}
            <div
              id={`panel-${dimSeleccionada.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${dimSeleccionada.id}`}
              className="rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--surface-0)] p-6 sm:p-10 shadow-md space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-6">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-[var(--ember-soft)] text-[var(--ember)] border border-[var(--border)] shadow-xs">
                    <dimSeleccionada.icono className="size-7 sm:size-8" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-[var(--ember)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                        {dimSeleccionada.codigo}
                      </span>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)]">
                        {dimSeleccionada.nombre}
                      </h3>
                    </div>
                    <p className="text-sm sm:text-base italic font-medium text-[var(--ember)] mt-1.5">
                      «{dimSeleccionada.lema}»
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs sm:text-sm font-semibold px-3 py-1.5 self-start sm:self-center border-[var(--border-strong)] bg-[var(--surface-1)]">
                  Corresponsabilidad Distrital
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/60 p-5 space-y-2">
                    <span className="text-xs sm:text-sm uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                      Enfoque y Alcance
                    </span>
                    <p className="text-sm sm:text-base text-[var(--text-primary)] leading-relaxed font-normal">
                      {dimSeleccionada.descripcion}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-2">
                    <span className="text-xs sm:text-sm uppercase font-bold tracking-wider text-[var(--ember)]">
                      Liderazgo Institucional y Corresponsabilidad
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                      {dimSeleccionada.entidadLider}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border-l-4 border-l-[var(--danger)] border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-2">
                    <span className="text-xs sm:text-sm uppercase font-bold tracking-wider text-[var(--danger)]">
                      Desafío Crítico en Cartagena de Indias
                    </span>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] sm:text-[var(--text-primary)] leading-relaxed">
                      {dimSeleccionada.desafioCartagena}
                    </p>
                  </div>

                  <div className="rounded-2xl border-l-4 border-l-[var(--success)] border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-2">
                    <span className="text-xs sm:text-sm uppercase font-bold tracking-wider text-[var(--success)]">
                      Acciones que se pueden concertar (propuesta)
                    </span>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] sm:text-[var(--text-primary)] leading-relaxed">
                      {dimSeleccionada.ejemploTerritorial}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[var(--text-secondary)]">
                <span>
                  <strong className="text-[var(--text-primary)]">Marco legal de referencia:</strong> {dimSeleccionada.marcoNormativo}
                </span>
                <Link
                  href="/geovisor"
                  className="inline-flex items-center gap-1.5 font-bold text-sm text-[var(--ember)] hover:underline"
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  <span>Ver alertas en Geovisor Territorial</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 4: CUADRO COMPARATIVO: ¿QUÉ NO ES VS. ¿QUÉ SÍ ES?                  */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="comparativa-title"
          className="container-fluid w-full py-12 sm:py-16 space-y-8"
        >
          <div className="text-center space-y-2 max-w-4xl mx-auto">
            <span className="label-micro uppercase font-bold tracking-widest text-[var(--text-tertiary)]">
              Claridad Doctrinal y Pedagógica
            </span>
            <h2 id="comparativa-title" className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
              ¿Qué NO es vs. ¿Qué SÍ es la Seguridad Humana?
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Despejando mitos y falsas concepciones sobre la política pública distrital:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Columna: Lo que NO es */}
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--danger)]">
                  <XCircle className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--danger)]">
                    ¿Qué NO es la Política de Seguridad Humana?
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)]">Enfoques superados o restrictivos</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)]">
                {COMPARATIVA.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="size-2 rounded-full bg-[var(--danger)] mt-2 shrink-0" />
                    <span className="leading-relaxed">{item.noEs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna: Lo que SÍ es */}
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--success)]">
                  <CheckCircle2 className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--success)]">
                    ¿Qué SÍ es la Seguridad Humana Integral?
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)]">Doctrina viva, participativa y vinculante</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)]">
                {COMPARATIVA.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="size-2 rounded-full bg-[var(--success)] mt-2 shrink-0" />
                    <span className="font-semibold text-[var(--text-primary)] leading-relaxed">{item.siEs}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 5: PROPÓSITO Y ALCANCES (CIUDADANÍA VS. FUNCIONARIOS)             */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="alcances-title"
          className="border-t border-[var(--border)] bg-[var(--surface-1)] py-12 sm:py-16"
        >
          <div className="container-fluid w-full space-y-8">
            <div className="text-center space-y-2 max-w-4xl mx-auto">
              <span className="label-micro uppercase font-bold tracking-widest text-[var(--text-tertiary)]">
                Utilidad Pública
              </span>
              <h2 id="alcances-title" className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                ¿Para qué sirve y a quién beneficia?
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {/* Para la Ciudadanía */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ember)] border border-[var(--border)]">
                    <Users className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                      Para la Ciudadanía y Comunidades
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">Voz con poder vinculante en el territorio</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)]">
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <p className="font-bold text-[var(--text-primary)] text-base">Radicación con Fe Pública</p>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                      Cada aporte genera un radicado oficial que obliga a la Alcaldía a pronunciarse formalmente y dar respuesta motivada.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <p className="font-bold text-[var(--text-primary)] text-base">Atención a Riesgos Barriales</p>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                      Cartografía de inundaciones, focos delictivos o falta de comedores comunitarios georreferenciados en el Geovisor.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <p className="font-bold text-[var(--text-primary)] text-base">Veeduría y Trazabilidad (C-150)</p>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                      Garantía de recibir respuesta motivada sin dilaciones ni silencio administrativo, con QR único de seguimiento.
                    </p>
                  </div>
                </div>
              </div>

              {/* Para Funcionarios y Tomadores de Decisiones */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]">
                    <Building2 className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                      Para Servidores y Tomadores de Decisión
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-tertiary)]">Focalización y blindaje de legalidad institucional</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)]">
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <p className="font-bold text-[var(--text-primary)] text-base">Focalización del Gasto Público</p>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                      Inversión precisa de recursos FONSET, SGP y regalías donde la comunidad más lo necesita y con evidencia empírica.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <p className="font-bold text-[var(--text-primary)] text-base">Articulación Intersectorial</p>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                      Elimina la duplicidad de esfuerzos entre dependencias mediante metas coordinadas del Plan de Desarrollo Distrital.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                    <p className="font-bold text-[var(--text-primary)] text-base">Seguridad Jurídica y Planeación Distrital</p>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed">
                      Cumplimiento estricto de las directrices de la Secretaría de Planeación Distrital (Decreto 1070/2021) y trazabilidad del ciclo de políticas públicas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 6: CAJA DE HERRAMIENTAS PEDAGÓGICA Y DOCUMENTAL (TOOLBOX)         */}
        {/* ========================================================================= */}
        <section
          id="caja-herramientas"
          aria-labelledby="toolbox-title"
          className="container-fluid w-full py-12 sm:py-16 space-y-8"
        >
          <div className="text-center space-y-2 max-w-4xl mx-auto">
            <Badge variant="ember" className="text-[11px] font-semibold uppercase tracking-wider">
              Toolbox Ciudadano e Institucional
            </Badge>
            <h2 id="toolbox-title" className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
              Caja de Herramientas Pedagógica y Documental
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Descarga los documentos oficiales de estudio, láminas para talleres barriales y matrices de seguimiento:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {/* Documento 1: ABC Oficial */}
            <article className="flex flex-col justify-between rounded-2xl border-2 border-[var(--ember)] bg-[var(--surface-1)] p-6 shadow-xs space-y-4">
              <div className="space-y-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--ember-soft)] text-[var(--ember)]">
                  <BookOpen className="size-6" aria-hidden="true" />
                </span>
                <Badge variant="ember" className="text-[10px] font-bold">
                  Documento Central
                </Badge>
                <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                  ABC de la Seguridad Humana Integral
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Cartilla institucional completa con marco doctrinal ONU, preguntas frecuentes y glosario de términos.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <a
                  href="/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf"
                  download="ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] px-3 py-2.5 text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Download className="size-4" aria-hidden="true" />
                  <span>Descargar PDF</span>
                </a>
              </div>
            </article>

            {/* Documento 2: Presentación en Diapositivas */}
            <article className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 hover:border-[var(--border-strong)] transition-colors space-y-4">
              <div className="space-y-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--cyan)]">
                  <FileText className="size-6" aria-hidden="true" />
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Taller Comunitario
                </Badge>
                <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                  Presentación de Diagnóstico Barrial
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Guía ejecutiva en láminas horizontales para facilitadores, presidentes de JAC y asambleas de vecinos.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <a
                  href="/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf"
                  download="PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-0)] text-[var(--text-primary)] px-3 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Download className="size-4 text-[var(--ember)]" aria-hidden="true" />
                  <span>Descargar Láminas</span>
                </a>
              </div>
            </article>

            {/* Documento 3: Matriz de Metas e Indicadores */}
            <article className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 hover:border-[var(--border-strong)] transition-colors space-y-4">
              <div className="space-y-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--success)]">
                  <Scale className="size-6" aria-hidden="true" />
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Técnico y Distrital
                </Badge>
                <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                  Matriz de Metas e Indicadores PDD
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Ficha de seguimiento para auditoría ciudadana y verificación de metas presupuestales por dimensión.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <a
                  href="/docs/MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf"
                  download="MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-0)] text-[var(--text-primary)] px-3 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Download className="size-4 text-[var(--ember)]" aria-hidden="true" />
                  <span>Descargar Matriz</span>
                </a>
              </div>
            </article>

            {/* Documento 4: Guía para Facilitadores */}
            <article className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 hover:border-[var(--border-strong)] transition-colors space-y-4">
              <div className="space-y-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)]">
                  <FileCheck2 className="size-6" aria-hidden="true" />
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Protocolo Mesas
                </Badge>
                <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                  Guía de Facilitación para Mesas
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Protocolo metodológico de moderación, captura de aportes territoriales y acuerdos barriales.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <a
                  href="/docs/GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf"
                  download="GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-0)] text-[var(--text-primary)] px-3 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Download className="size-4 text-[var(--ember)]" aria-hidden="true" />
                  <span>Descargar Guía</span>
                </a>
              </div>
            </article>
          </div>

          {/* Enlaces cruzados a herramientas vivas */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 w-full">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Herramientas Interactivas Disponibles en POLIS
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link
                href="/acerca"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:border-[var(--ember)] transition-colors"
              >
                <span>Acerca de POLIS</span>
                <ArrowRight className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
              </Link>
              <Link
                href="/geovisor"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:border-[var(--ember)] transition-colors"
              >
                <span>Geovisor Territorial</span>
                <ArrowRight className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
              </Link>
              <Link
                href="/barrio"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:border-[var(--ember)] transition-colors"
              >
                <span>Modo Barrio</span>
                <ArrowRight className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
              </Link>
              <Link
                href="/marco-legal"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:border-[var(--ember)] transition-colors"
              >
                <span>Marco Legal (C-150)</span>
                <ArrowRight className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
              </Link>
              <Link
                href="/trazabilidad"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:border-[var(--ember)] transition-colors"
              >
                <span>Trazabilidad y QR</span>
                <ArrowRight className="size-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 7: MÓDULO INTERACTIVO: 10 PREGUNTAS CLAVE DEL ABC CIUDADANO       */}
        {/* ========================================================================= */}
        <section
          id="preguntas-frecuentes"
          aria-labelledby="faq-title"
          className="border-t border-[var(--border)] bg-[var(--surface-1)] py-14 sm:py-20"
        >
          <div className="container-fluid w-full space-y-10">
            {/* Encabezado Pedagógico */}
            <div className="text-center space-y-3 max-w-4xl mx-auto">
              <Badge variant="ember" className="text-xs font-semibold uppercase tracking-wider px-3 py-1">
                Pedagogía Ciudadana
              </Badge>
              <h2 id="faq-title" className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Las Diez (10) Preguntas Clave del ABC
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                Todo lo que un habitante, líder comunal o servidor público necesita comprender para participar con poder vinculante en el territorio:
              </p>
            </div>

            {/* Barra de Filtros por Categorías y Buscador en Tiempo Real */}
            <div className="space-y-4 max-w-5xl mx-auto">
              {/* Buscador */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                <Input
                  type="text"
                  value={busquedaFaq}
                  onChange={(e) => setBusquedaFaq(e.target.value)}
                  placeholder="Buscar por palabra clave (ej. JAC, FONSET, policía, C-150, POT, radicado)..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] py-3.5 pl-11 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-xs transition-colors focus:border-[var(--ember)] focus:outline-none focus:ring-2 focus:ring-[var(--ember)]/20"
                  aria-label="Buscar preguntas del ABC de Seguridad Humana"
                />
                {busquedaFaq && (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => setBusquedaFaq("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>

              {/* Pestañas de Categoría */}
              <div
                role="tablist"
                aria-label="Categorías de preguntas frecuentes"
                className="flex flex-wrap items-center justify-center gap-2 pt-1"
              >
                {CATEGORIAS_FAQ.map((cat) => {
                  const activa = categoriaFaq === cat.id;
                  const total =
                    cat.id === "todas"
                      ? PREGUNTAS_ABC.length
                      : PREGUNTAS_ABC.filter((f) => f.categoria === cat.id).length;
                  return (
                    <Button
                      key={cat.id}
                      variant="unstyled"
                      size="unstyled"
                      role="tab"
                      type="button"
                      aria-selected={activa}
                      onClick={() => setCategoriaFaq(cat.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                        activa
                          ? "bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs"
                          : "border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          activa
                            ? "bg-[var(--text-inverse)]/20 text-[var(--text-inverse)]"
                            : "bg-[var(--surface-2)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        {total}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Indicador de resultados */}
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] px-2 pt-1">
                <span>
                  Mostrando <strong>{faqsFiltradas.length}</strong> de {PREGUNTAS_ABC.length} preguntas clave
                </span>
                {(categoriaFaq !== "todas" || busquedaFaq) && (
                  <Button
                    variant="link"
                    size="unstyled"
                    type="button"
                    onClick={() => {
                      setCategoriaFaq("todas");
                      setBusquedaFaq("");
                    }}
                    className="font-semibold text-[var(--ember)] hover:underline text-xs"
                  >
                    Restablecer filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Listado en 2 Columnas Independientes (Evita Descompensación Vertical) */}
            {faqsFiltradas.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-10 text-center max-w-xl mx-auto space-y-3">
                <HelpCircle className="size-10 text-[var(--text-tertiary)] mx-auto" aria-hidden="true" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  No se encontraron preguntas para «{busquedaFaq}»
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Intenta con términos como <em>«JAC»</em>, <em>«FONSET»</em>, <em>«policía»</em>, <em>«C-150»</em> o <em>«barrio»</em>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setCategoriaFaq("todas");
                    setBusquedaFaq("");
                  }}
                  className="mt-2 text-xs"
                >
                  Ver todas las preguntas
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
                {/* Columna Izquierda */}
                <div className="space-y-4">
                  {columnaIzquierda.map((faq) => {
                    const abierta = !!faqsAbiertas[faq.id];
                    return (
                      <article
                        key={faq.id}
                        className={`rounded-2xl border transition-all duration-200 ${
                          abierta
                            ? "border-[var(--ember)] bg-[var(--surface-0)] shadow-xs ring-1 ring-[var(--ember)]/20"
                            : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)]"
                        }`}
                      >
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          type="button"
                          onClick={() => toggleFaq(faq.id)}
                          aria-expanded={abierta}
                          aria-controls={`contenido-${faq.id}`}
                          className="w-full flex items-start justify-between gap-4 p-5 sm:p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-2xl"
                        >
                          <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ember-soft)] text-sm font-extrabold text-[var(--ember)] shadow-2xs">
                              {faq.numero}
                            </span>
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                {faq.categoriaLabel}
                              </Badge>
                              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                                {faq.pregunta}
                              </h3>
                            </div>
                          </div>
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] transition-transform duration-200 ${
                              abierta ? "rotate-180 text-[var(--ember)]" : "text-[var(--text-secondary)]"
                            }`}
                            aria-hidden="true"
                          >
                            <ChevronDown className="size-4" />
                          </span>
                        </Button>

                        {abierta && (
                          <div
                            id={`contenido-${faq.id}`}
                            className="px-5 sm:px-6 pb-6 pt-2 border-t border-[var(--border)] space-y-4 animate-in fade-in duration-200"
                          >
                            {/* Cita Destacada / Takeaway */}
                            {faq.destacado && (
                              <div className="rounded-xl border-l-4 border-l-[var(--ember)] bg-[var(--surface-1)] p-3.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] italic flex items-start gap-2">
                                <Sparkles className="size-3.5 text-[var(--ember)] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{faq.destacado}</span>
                              </div>
                            )}

                            {/* Respuesta Oficial */}
                            <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                              {faq.respuesta}
                            </p>

                            {/* Etiquetas Temáticas */}
                            {faq.etiquetas && faq.etiquetas.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                <Tag className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                                {faq.etiquetas.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Enlace de Acción Rápida si existe */}
                            {faq.enlaceSugerido && (
                              <div className="pt-2 border-t border-[var(--border)]/60">
                                <Link
                                  href={faq.enlaceSugerido.href}
                                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--ember)] hover:underline"
                                >
                                  <span>{faq.enlaceSugerido.texto}</span>
                                  <ArrowRight className="size-3.5" aria-hidden="true" />
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  {columnaDerecha.map((faq) => {
                    const abierta = !!faqsAbiertas[faq.id];
                    return (
                      <article
                        key={faq.id}
                        className={`rounded-2xl border transition-all duration-200 ${
                          abierta
                            ? "border-[var(--ember)] bg-[var(--surface-0)] shadow-xs ring-1 ring-[var(--ember)]/20"
                            : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)]"
                        }`}
                      >
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          type="button"
                          onClick={() => toggleFaq(faq.id)}
                          aria-expanded={abierta}
                          aria-controls={`contenido-${faq.id}`}
                          className="w-full flex items-start justify-between gap-4 p-5 sm:p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-2xl"
                        >
                          <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ember-soft)] text-sm font-extrabold text-[var(--ember)] shadow-2xs">
                              {faq.numero}
                            </span>
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                {faq.categoriaLabel}
                              </Badge>
                              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                                {faq.pregunta}
                              </h3>
                            </div>
                          </div>
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] transition-transform duration-200 ${
                              abierta ? "rotate-180 text-[var(--ember)]" : "text-[var(--text-secondary)]"
                            }`}
                            aria-hidden="true"
                          >
                            <ChevronDown className="size-4" />
                          </span>
                        </Button>

                        {abierta && (
                          <div
                            id={`contenido-${faq.id}`}
                            className="px-5 sm:px-6 pb-6 pt-2 border-t border-[var(--border)] space-y-4 animate-in fade-in duration-200"
                          >
                            {/* Cita Destacada / Takeaway */}
                            {faq.destacado && (
                              <div className="rounded-xl border-l-4 border-l-[var(--ember)] bg-[var(--surface-1)] p-3.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] italic flex items-start gap-2">
                                <Sparkles className="size-3.5 text-[var(--ember)] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{faq.destacado}</span>
                              </div>
                            )}

                            {/* Respuesta Oficial */}
                            <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                              {faq.respuesta}
                            </p>

                            {/* Etiquetas Temáticas */}
                            {faq.etiquetas && faq.etiquetas.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                <Tag className="size-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                                {faq.etiquetas.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Enlace de Acción Rápida si existe */}
                            {faq.enlaceSugerido && (
                              <div className="pt-2 border-t border-[var(--border)]/60">
                                <Link
                                  href={faq.enlaceSugerido.href}
                                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--ember)] hover:underline"
                                >
                                  <span>{faq.enlaceSugerido.texto}</span>
                                  <ArrowRight className="size-3.5" aria-hidden="true" />
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 8: CTA DE PARTICIPACIÓN                                           */}
        {/* ========================================================================= */}
        <section aria-labelledby="cta-title" className="container-fluid w-full py-12 sm:py-16 text-center">
          <div className="w-full rounded-3xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)] p-8 sm:p-12 space-y-5 shadow-sm">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--ember-soft)] text-[var(--ember)]">
              <Sparkles className="size-6" aria-hidden="true" />
            </span>

            <h2 id="cta-title" className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              Tu voz transforma la seguridad de tu barrio
            </h2>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              No dejes que las decisiones de tu comunidad se tomen sin ti. Radica una propuesta, participa en
              la mesa de trabajo de tu localidad y ejerce veeduría con fe pública.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/barrio"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
              >
                <span>Radicar Propuesta Barrial</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>

              <Link
                href="/plataforma"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] px-5 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
              >
                <span>Acceder a POLIS Plataforma</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
