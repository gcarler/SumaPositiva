"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Landmark,
  BookOpen,
  Building2,
  Globe2,
  ShieldCheck,
  FileCode,
  Lock,
  Layers,
  MapPin,
  Scale,
  ArrowLeft,
  ChevronRight,
  FileText,
  Cpu,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  type AmbitoMarco,
  PILARES_INFO,
  SECCIONES_MARCO_LEGAL,
} from "../data/marcos-legales-data";

type TabFiltro = "todos" | AmbitoMarco;

const ICON_MAP = {
  Landmark,
  BookOpen,
  Building2,
  Globe2,
  ShieldCheck,
  FileCode,
  Lock,
  Layers,
  MapPin,
  Coins: Scale,
};

export function MarcoLegalView() {
  const [tabActiva, setTabActiva] = useState<TabFiltro>("todos");
  const tablistRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  // Gestión de anclas históricas y retrocompatibilidad de URL (#distrital, #plataforma, etc.)
  useEffect(() => {
    function sincronizarConHash() {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (!hash) return;

      // Buscar si el hash pertenece a una sección específica
      const seccionEncontrada = SECCIONES_MARCO_LEGAL.find(
        (sec) =>
          sec.id.toLowerCase() === hash ||
          sec.normas.some((n) => n.anclaId?.toLowerCase() === hash),
      );

      if (seccionEncontrada) {
        // Si el usuario está filtrando por una pestaña que oculta la sección, cambiamos automáticamente
        setTabActiva((actual) => {
          if (actual !== "todos" && actual !== seccionEncontrada.ambito) {
            return seccionEncontrada.ambito;
          }
          return actual;
        });

        // Scroll suave al elemento destino
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      } else if (hash === "plataforma") {
        setTabActiva("plataforma");
        setTimeout(() => {
          const el = document.getElementById("plataforma");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }

    sincronizarConHash();
    window.addEventListener("hashchange", sincronizarConHash);
    return () => window.removeEventListener("hashchange", sincronizarConHash);
  }, []);

  // Filtrado de secciones según la pestaña activa
  const seccionesVisibles = SECCIONES_MARCO_LEGAL.filter((seccion) => {
    if (tabActiva === "todos") return true;
    return seccion.ambito === tabActiva;
  });

  const seccionesPolitica = SECCIONES_MARCO_LEGAL.filter((s) => s.ambito === "politica");
  const seccionesPlataforma = SECCIONES_MARCO_LEGAL.filter((s) => s.ambito === "plataforma");

  // Navegación accesible por teclado en el Tablist (WCAG 2.1 AA)
  const tabsList: Array<{ id: TabFiltro; label: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "todos", label: "Vista Integrada (Ambos Marcos)", count: SECCIONES_MARCO_LEGAL.length, icon: Layers },
    { id: "politica", label: "Política Pública de Seguridad Humana", count: seccionesPolitica.length, icon: Building2 },
    { id: "plataforma", label: "Plataforma POLIS (Ples SAS)", count: seccionesPlataforma.length, icon: Cpu },
  ];

  function manejarTecladoTabs(e: React.KeyboardEvent<HTMLButtonElement>, indexActual: number) {
    let siguienteIndex = indexActual;
    if (e.key === "ArrowRight") {
      siguienteIndex = (indexActual + 1) % tabsList.length;
    } else if (e.key === "ArrowLeft") {
      siguienteIndex = (indexActual - 1 + tabsList.length) % tabsList.length;
    } else if (e.key === "Home") {
      siguienteIndex = 0;
    } else if (e.key === "End") {
      siguienteIndex = tabsList.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const siguienteTab = tabsList[siguienteIndex].id;
    setTabActiva(siguienteTab);

    if (tablistRef.current) {
      const botones = tablistRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      botones[siguienteIndex]?.focus();
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1"
    >
      {/* Miga de pan accesible */}
      <nav aria-label="Ruta de navegación" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Inicio</span>
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--text-primary)] font-medium">
          Marcos Jurídicos, Doctrinales y Normativos
        </span>
      </nav>

      {/* Encabezado Principal Institucional */}
      <header className="space-y-6 border-b border-[var(--border)] pb-8 mb-8 sm:mb-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="ember" className="text-[11px] font-semibold uppercase tracking-wider">
            Arquitectura Jurídica y Doctrinal
          </Badge>
          <span className="text-xs text-[var(--text-tertiary)]" aria-hidden="true">•</span>
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Doble Marco Institucional Diferenciado
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Marcos Jurídicos, Doctrinales y Normativos
          </h1>
          <p className="max-w-4xl text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
            La plataforma <strong>POLIS</strong> y el proceso territorial de Cartagena de Indias se fundamentan
            en <strong>dos esferas jurídicas e institucionales diferenciadas pero complementarias</strong>: el marco
            sustantivo de la <em>Política Pública de Seguridad Humana</em> (mandato distrital de derechos y convivencia)
            y el marco normativo de la <em>Plataforma Cívica Digital</em> (fe pública, validez probatoria de mensajes
            de datos y protección estricta de datos personales operada por Ples SAS).
          </p>
        </div>

        {/* Comparativa Conceptual de los Dos Pilares */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Tarjeta Pilar A */}
          <article
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-xs relative overflow-hidden flex flex-col justify-between"
            style={{ borderTop: `4px solid ${PILARES_INFO.politica.colorBorder}` }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--ember)]">
                  Pilar Sustantivo 1
                </span>
                <Badge variant="ember" className="text-[10px]">
                  Cartagena de Indias
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {PILARES_INFO.politica.nombre}
              </h2>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5 mb-2">
                {PILARES_INFO.politica.entidad}
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)] mb-4">
                {PILARES_INFO.politica.objeto}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border)]">
              {PILARES_INFO.politica.kpis.map((kpi, idx) => (
                <div key={idx} className="bg-[var(--surface-2)] p-2 rounded-md">
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                    {kpi.etiqueta}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {kpi.valor}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* Tarjeta Pilar B */}
          <article
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-xs relative overflow-hidden flex flex-col justify-between"
            style={{ borderTop: `4px solid ${PILARES_INFO.plataforma.colorBorder}` }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-primary-base, #0ea5e9)]">
                  Pilar Tecnológico 2
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Ples SAS · Fe Pública
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {PILARES_INFO.plataforma.nombre}
              </h2>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5 mb-2">
                {PILARES_INFO.plataforma.entidad}
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)] mb-4">
                {PILARES_INFO.plataforma.objeto}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border)]">
              {PILARES_INFO.plataforma.kpis.map((kpi, idx) => (
                <div key={idx} className="bg-[var(--surface-2)] p-2 rounded-md">
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                    {kpi.etiqueta}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {kpi.valor}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </header>

      {/* Conmutador Interactivo Accesible de Ámbitos (Segmented Switcher / Tabs) */}
      <section aria-labelledby="conmutador-ambitos-titulo" className="mb-8">
        <h2 id="conmutador-ambitos-titulo" className="sr-only">
          Conmutador de perspectiva del marco legal
        </h2>
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Perspectivas del marco normativo"
          className="inline-flex w-full flex-wrap sm:flex-nowrap p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-2xs gap-1.5"
        >
          {tabsList.map((t, idx) => {
            const Icono = t.icon;
            const esActiva = tabActiva === t.id;
            return (
              <Button
                key={t.id}
                variant="unstyled"
                size="unstyled"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={esActiva}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={esActiva ? 0 : -1}
                onClick={() => setTabActiva(t.id)}
                onKeyDown={(e) => manejarTecladoTabs(e, idx)}
                className={`flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  esActiva
                    ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icono className={`size-4 shrink-0 ${esActiva ? "text-[var(--ember)]" : "text-[var(--text-tertiary)]"}`} />
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    esActiva
                      ? "bg-[var(--surface-2)] text-[var(--text-primary)] font-bold"
                      : "bg-[var(--surface-2)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {t.count}
                </span>
              </Button>
            );
          })}
        </div>
      </section>

      {/* Navegación rápida móvil horizontal */}
      <nav aria-label="Navegación rápida de secciones" className="block lg:hidden mb-8">
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
          Saltar a sección en esta vista:
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {seccionesVisibles.map((seccion) => (
            <a
              key={seccion.id}
              href={`#${seccion.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--ember)] hover:text-[var(--ember)] shadow-2xs"
            >
              <span>{seccion.tituloCorto}</span>
              <span className="text-[10px] rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[var(--text-tertiary)]">
                {seccion.conteo}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {/* Layout en Rejilla 12 Columnas para Desktop */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        {/* Columna Lateral Sticky (lg:col-span-4) */}
        <aside className="hidden lg:block lg:col-span-4">
          <div className="sticky top-24 self-start space-y-6">
            {/* Índice de navegación interactivo */}
            <nav
              aria-label="Índice del marco legal"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-[var(--ember)]" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    Índice de Secciones
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                  {seccionesVisibles.length} de {SECCIONES_MARCO_LEGAL.length}
                </span>
              </div>

              {/* Secciones agrupadas en el índice */}
              <div className="space-y-4">
                {(tabActiva === "todos" || tabActiva === "politica") && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--ember)] uppercase tracking-wider pb-1.5 mb-1 border-b border-[var(--border)]">
                      <span>Pilar 1: Política Pública</span>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Cartagena</span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {seccionesPolitica.map((seccion) => {
                        const Icono = ICON_MAP[seccion.icono] ?? Landmark;
                        return (
                          <li key={seccion.id}>
                            <a
                              href={`#${seccion.id}`}
                              className="group flex items-center justify-between rounded-lg p-2 text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border)]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[var(--text-tertiary)] group-hover:bg-[var(--ember)]/10 group-hover:text-[var(--ember)] transition-colors">
                                  <Icono className="size-3" aria-hidden="true" />
                                </span>
                                <span className="truncate font-medium group-hover:underline">
                                  {seccion.tituloCorto}
                                </span>
                              </div>
                              <span className="ml-1.5 shrink-0 text-[10px] font-mono text-[var(--text-tertiary)]">
                                {seccion.conteo}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {(tabActiva === "todos" || tabActiva === "plataforma") && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-primary-base, #0ea5e9)] uppercase tracking-wider pb-1.5 mb-1 border-b border-[var(--border)]">
                      <span>Pilar 2: Plataforma POLIS</span>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Ples SAS</span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {seccionesPlataforma.map((seccion) => {
                        const Icono = ICON_MAP[seccion.icono] ?? FileCode;
                        return (
                          <li key={seccion.id}>
                            <a
                              href={`#${seccion.id}`}
                              className="group flex items-center justify-between rounded-lg p-2 text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border)]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[var(--text-tertiary)] group-hover:bg-[var(--color-primary-base, #0ea5e9)]/10 group-hover:text-[var(--color-primary-base, #0ea5e9)] transition-colors">
                                  <Icono className="size-3" aria-hidden="true" />
                                </span>
                                <span className="truncate font-medium group-hover:underline">
                                  {seccion.tituloCorto}
                                </span>
                              </div>
                              <span className="ml-1.5 shrink-0 text-[10px] font-mono text-[var(--text-tertiary)]">
                                {seccion.conteo}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </nav>

            {/* Tarjeta de Contexto Mandato Distrital */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-[var(--ember)]" aria-hidden="true" />
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Mandato Distrital de Cartagena
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                El <strong>Acuerdo 139 de 2024</strong> y el <strong>Decreto Distrital 037 de 2026</strong> ordenan
                la formulación participativa y el seguimiento vinculante de la Seguridad Humana en las 35 mesas de trabajo.
              </p>
              <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
                <Link
                  href="/seguridad-humana"
                  className="inline-flex items-center justify-between text-xs font-medium text-[var(--ember)] hover:underline"
                >
                  <span>¿Qué es la Seguridad Humana?</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/geovisor"
                  className="inline-flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                >
                  <span>Explorar Geovisor Territorial</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Tarjeta de Titularidad y Fe Pública Ples SAS */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--color-primary-base, #0ea5e9)]" aria-hidden="true" />
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Fe Pública y Software Cívico
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                La plataforma POLIS es propiedad intelectual y desarrollada por <strong>Ples SAS</strong> bajo
                estrictos estándares de la <strong>Ley 527 de 1999</strong> (equivalencia legal) y la <strong>Ley 1581 de 2012</strong> (Habeas Data).
              </p>
              <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
                <Link
                  href="/acerca"
                  className="inline-flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                >
                  <span>Acerca de POLIS y Ples SAS</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/indicadores"
                  className="inline-flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                >
                  <span>Catálogo Cívico de Indicadores</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Columna Principal de Secciones Normativas (lg:col-span-8) */}
        <div
          role="tabpanel"
          id={`${baseId}-panel-${tabActiva}`}
          aria-labelledby={`${baseId}-tab-${tabActiva}`}
          className="lg:col-span-8 space-y-12"
        >
          {/* Ancla oculta para compatibilidad retroactiva con #plataforma */}
          <div id="plataforma" className="scroll-mt-24" aria-hidden="true" />

          {/* Renderizado de Secciones Normativas */}
          {seccionesVisibles.map((seccion, indexSeccion) => {
            const Icono = ICON_MAP[seccion.icono] ?? Landmark;
            const esPrimerPilarB =
              tabActiva === "todos" &&
              seccion.ambito === "plataforma" &&
              indexSeccion === seccionesPolitica.length;

            return (
              <div key={seccion.id} className="space-y-6">
                {/* Separador de Ámbito en la Vista Integrada */}
                {esPrimerPilarB && (
                  <div className="my-10 pt-8 border-t-2 border-dashed border-[var(--border)]">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-base, #0ea5e9)] mb-1">
                      <Cpu className="size-4" aria-hidden="true" />
                      <span>Transición de Ámbito Normativo</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                      Pilar 2: Plataforma Cívica Digital, Ecosistema de Datos y Fe Pública (Ples SAS)
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                      Leyes y decretos que gobiernan la validez probatoria de los mensajes de datos (Ley 527),
                      el sellado inmutable SHA-256 de actas, la privacidad de datos (Ley 1581) y la gobernanza tecnológica.
                    </p>
                  </div>
                )}

                <section
                  id={seccion.id}
                  className="scroll-mt-24 space-y-5"
                  aria-labelledby={`titulo-${seccion.id}`}
                >
                  {/* Encabezado de Sección */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--ember)]">
                        {seccion.epigrafe}
                      </p>
                      <div className="mt-1 flex items-center gap-2.5">
                        <Icono className="size-5 text-[var(--text-primary)]" aria-hidden="true" />
                        <h2
                          id={`titulo-${seccion.id}`}
                          className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]"
                        >
                          {seccion.titulo}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={seccion.ambito === "politica" ? "ember" : "default"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {seccion.ambito === "politica" ? "Cartagena" : "Ples SAS"}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        {seccion.conteo}
                      </Badge>
                    </div>
                  </div>

                  {/* Fichas Normativas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {seccion.normas.map((norma) => {
                      const esExtensa = norma.expandir === true;
                      return (
                        <article
                          key={norma.id}
                          id={norma.anclaId}
                          className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5 shadow-xs transition-all hover:border-[var(--border-strong)] hover:shadow-md flex flex-col justify-between ${
                            esExtensa ? "md:col-span-2" : ""
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug">
                                  {norma.nombre}
                                </h3>
                                {norma.subtitulo && (
                                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                    {norma.subtitulo}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant={norma.badgeVariant ?? "outline"}
                                className="text-[10px] uppercase font-bold shrink-0"
                              >
                                {norma.nivel}
                              </Badge>
                            </div>

                            <p className="text-xs sm:text-sm font-semibold text-[var(--ember)] mb-3">
                              {norma.enfasis}
                            </p>

                            <ul className="space-y-2 list-disc pl-4 sm:pl-5 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                              {norma.puntos.map((punto, idxPunto) => (
                                <li key={idxPunto} className="marker:text-[var(--text-tertiary)]">
                                  {punto}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {norma.citaOficial && (
                            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-tertiary)]">
                              <FileText className="size-3 text-[var(--text-tertiary)] shrink-0" aria-hidden="true" />
                              <span className="truncate">{norma.citaOficial}</span>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            );
          })}

          {/* Retorno al inicio de página */}
          <div className="pt-8 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-[var(--text-tertiary)]">
              Marco legal verificado · República de Colombia y Distrito de Cartagena de Indias
            </span>
            <a
              href="#main-content"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--ember)] transition-colors"
            >
              <span>Volver al inicio ↑</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
