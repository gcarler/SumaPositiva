"use client";

import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";

const subscribeNoop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
import {
  ArrowRight,
  MapPin,
  Scale,
  Compass,
  FileCheck2,
  Newspaper,
  Quote,
  Sparkles,
  Plus,
  Play,
  Layers,
  BarChart3,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { Progress } from "@/shared/ui/progress";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { usePanels } from "@/core/panels/panel-store";
import { noticiasPublicadasOrdenadas } from "@/features/noticias/state/noticias-store";
import { useNoticiasPublicas } from "@/features/noticias/services/use-noticias-queries";
import { useTestimoniosPublicos } from "@/features/testimonios/services/use-testimonios-queries";
import { useFases, useLineas } from "@/features/politicas/services/use-politicas-queries";
import { DimensionesGrid } from "@/features/politicas/components/dimensiones-grid";
import { EnrutadorCiudadanoInteligente } from "@/features/politicas/components/enrutador-ciudadano-inteligente";
import { FlujoInversionGobernanza } from "@/features/politicas/components/flujo-inversion-gobernanza";
import {
  useHeroConfigStore,
  obtenerOpcionHero,
  HERO_DEFAULT_IMAGE_ID,
  HERO_DEFAULT_OPACIDAD,
} from "@/features/politicas/state/hero-store";

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
  const { openPanel } = usePanels();
  const fasesQuery = useFases();
  const lineasQuery = useLineas();
  const fases = fasesQuery.data ?? [];
  const lineas = lineasQuery.data ?? [];
  const noticiasQuery = useNoticiasPublicas();
  const testimoniosQuery = useTestimoniosPublicos({ destacados: true });
  const noticias = noticiasQuery.data ?? [];
  const testimonios = testimoniosQuery.data ?? [];

  const ultimasNoticias = noticiasPublicadasOrdenadas(noticias).slice(0, 3);
  const testimoniosDestacados = testimonios.map((t) => ({
    ...t,
    nombre: t.nombre_autor ?? t.nombre,
    texto: t.relato ?? t.texto,
    foto: t.url_foto ?? t.foto,
    verificado: true,
  })).slice(0, 2);

  /* Métricas reales — datos trazables del backend */
  const totalLineas = lineas.length;
  const fasesCompletadas = fases.filter(
    (f) => f.estado === "completada" || f.estado === "cerrada"
  ).length;

  const stats = [
    { valor: totalLineas.toString(), label: "Líneas estratégicas" },
    { valor: `${fasesCompletadas} de ${fases.length || 3}`, label: "Fases DNP en curso" },
    { valor: "2026–2036", label: "Vigencia de la política" },
    { valor: "3 + Insular", label: "Localidades cubiertas" },
  ];

  /* Configuración del Backdrop Territorial (FEAT-HERO-01) */
  const heroImageId = useHeroConfigStore((s) => s.heroImageId);
  const opacidad = useHeroConfigStore((s) => s.opacidad);
  const montado = useMounted();

  const imagenActivaId = montado ? heroImageId : HERO_DEFAULT_IMAGE_ID;
  const opacidadActiva = montado ? opacidad : HERO_DEFAULT_OPACIDAD;
  const opcionHero = obtenerOpcionHero(imagenActivaId);

  return (
    <div className="space-y-20 pb-20 md:space-y-28 md:pb-28">
      {/* ================= HERO INSTITUCIONAL ================= */}
      <section className="relative overflow-hidden">
        {/* Backdrop fotográfico territorial ambiental (FEAT-HERO-01) */}
        {imagenActivaId !== "ninguna" && Boolean(opcionHero.archivo) && (
          <div
            className="pointer-events-none absolute inset-0 select-none overflow-hidden z-0"
            aria-hidden="true"
          >
            <img
              src={opcionHero.archivo}
              alt=""
              className="h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out"
              style={{ opacity: opacidadActiva / 100 }}
            />
            {/* Gradientes elegantes para protección de contraste y legibilidad WCAG AAA */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-0)] via-transparent to-[var(--surface-0)]/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-0)]/85 via-[var(--surface-0)]/40 to-transparent" />
          </div>
        )}

        <div className="bg-dotgrid absolute inset-0 z-0" aria-hidden />
        <div className="container-fluid relative z-10 pb-12 pt-12 md:pb-20 md:pt-16 lg:pb-24 lg:pt-20">
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
                <Button
                  variant="outline"
                  size="lg"
                  type="button"
                  onClick={() => openPanel("rendicion-cuentas", {})}
                  className="gap-2 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <BarChart3 className="size-4 text-[var(--ember)]" strokeWidth={1.75} />
                  Rendición de Cuentas 2026
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

      {/* ================= PILAR 1: ENRUTADOR CIUDADANO INTELIGENTE ================= */}
      <section id="enrutador-ciudadano" className="container-fluid">
        <EnrutadorCiudadanoInteligente />
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
            {fases.map((fase) => {
              let tone: StatusTone = "neutral";
              let labelEstado = "Próxima";
              if (fase.estado === "completada" || fase.estado === "cerrada") {
                tone = "success";
                labelEstado = "Completada";
              } else if (fase.estado === "activa") {
                tone = "warning";
                labelEstado = "En curso";
              }

              const progreso =
                fase.progreso_porcentaje != null
                  ? Number(fase.progreso_porcentaje)
                  : 0;

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
                        {fase.progreso_porcentaje != null
                          ? `${fase.progreso_porcentaje}%`
                          : "Sin medición"}
                      </span>
                    </div>
                    <Progress aria-label={`Progreso de ${fase.nombre}`} value={progreso} />
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

      {/* ================= PILAR 2: FLUJO DE INVERSIÓN Y GOBERNANZA ================= */}
      <section id="gobernanza-flujo" className="container-fluid">
        <FlujoInversionGobernanza />
      </section>

      {/* ================= ACTUALIDAD & VOCES CIUDADANAS (NOTICIAS + TESTIMONIOS) ================= */}
      <section className="container-fluid space-y-16">
        {/* Subsección: Últimas Noticias */}
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <Newspaper className="size-4 text-[var(--ember)]" />
                <p className="label-micro text-[var(--ember)]">Actualidad Institucional</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
                Últimas Noticias de la Política Pública
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Seguimiento continuo al cronograma, decisiones concertadas y avances de las 33 mesas de trabajo.
              </p>
            </div>
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={() => setVista("noticias")}
              className="group self-start md:self-auto gap-2"
            >
              <span>Ver todas las noticias</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ultimasNoticias.map((n) => (
              <article
                key={n.id}
                onClick={() => openPanel("noticia", { noticiaId: n.id })}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:border-[var(--border-strong)] hover:shadow-md cursor-pointer"
              >
                <div>
                  {n.imagenPortada && (
                    <div className="relative h-44 w-full overflow-hidden bg-[var(--surface-2)]">
                      <img
                        src={n.imagenPortada}
                        alt={n.titulo}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {n.destacada && (
                        <div className="absolute top-2.5 right-2.5">
                          <Badge variant="ember" className="text-[10px] shadow-sm">
                            Destacada
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] bg-[var(--surface-1)]/90 backdrop-blur-xs">
                          Prioridad #{n.ordenPrioridad}
                        </Badge>
                        {n.videoUrl && (
                          <Badge variant="secondary" className="text-[10px] shadow-sm gap-1">
                            <Play className="size-2.5 fill-current" />
                            Video
                          </Badge>
                        )}
                        {n.galeria && n.galeria.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] shadow-sm gap-1">
                            <Layers className="size-2.5" />
                            {n.galeria.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                      <time dateTime={n.publicadaEn}>
                        {new Date(n.publicadaEn).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                      <span className="truncate max-w-[140px]">{n.autor}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--ember)] transition-colors line-clamp-2">
                      {n.titulo}
                    </h3>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {n.resumen}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ember)] group-hover:underline">
                    <span>Leer más</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Subsección: Testimonios Destacados */}
        <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 md:p-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <Quote className="size-4 text-[var(--ember)]" />
                <p className="label-micro text-[var(--ember)]">Voces del Territorio</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
                Testimonios de la Comunidad
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Relatos en primera persona sobre la convivencia y la seguridad humana en barrios y corregimientos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              <Button
                variant="outline"
                size="default"
                type="button"
                onClick={() => setVista("testimonios")}
                className="gap-2"
              >
                <span>Leer más testimonios</span>
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="default"
                size="default"
                type="button"
                onClick={() => openPanel("testimonio-nuevo", {})}
                className="gap-2"
              >
                <Plus className="size-4" />
                <span>Comparte tu experiencia</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {testimoniosDestacados.map((t) => (
              <div
                key={t.id}
                className="relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6"
              >
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-2xl font-serif text-[var(--ember)] opacity-80 leading-none select-none">
                      ❝
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="ember" className="text-[10px] gap-1">
                        <Sparkles className="size-2.5" />
                        Destacado
                      </Badge>
                      {t.verificado && (
                        <StatusBadge tone="success" className="text-[10px]">
                          Verificado
                        </StatusBadge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm italic leading-relaxed text-[var(--text-primary)] mb-4">
                    &ldquo;{t.texto}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
                  <div className="size-9 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0 overflow-hidden">
                    {t.foto ? (
                      <img src={t.foto} alt={t.nombre} className="size-full object-cover" />
                    ) : (
                      <span>{t.nombre.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {t.nombre}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {[t.barrio, t.localidad].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
