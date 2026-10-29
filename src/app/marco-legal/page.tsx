import type { Metadata } from "next";
import Link from "next/link";
import {
  Landmark,
  BookOpen,
  Building2,
  Globe2,
  ShieldCheck,
  Scale,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Footer } from "@/shared/layout/footer";
import { Badge } from "@/shared/ui/badge";

export const metadata: Metadata = {
  title: "Marco legal — POLIS Cartagena de Indias",
  description:
    "Andamiaje jurídico y doctrinal de la Política Pública de Seguridad Humana de Cartagena: fundamentos constitucionales, marco nacional, distrital e internacional de seguridad humana.",
};

/**
 * POLIS — Marco legal y doctrinal.
 *
 * Página institucional estática adaptativa (Server Component):
 * consolida los fundamentos constitucionales, el marco normativo nacional,
 * distrital e internacional y las salvaguardas de no revictimización
 * con diseño fluido y responsivo en móviles, tablets y escritorios amplios.
 */

interface Norma {
  nombre: string;
  enfasis: string;
  puntos: string[];
  nivel: string;
  badgeVariant?: "ember" | "outline" | "info" | "success" | "secondary" | "default";
  expandir?: boolean;
}

interface Seccion {
  id: string;
  epigrafe: string;
  titulo: string;
  tituloCorto?: string;
  conteo: string;
  icono: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  normas: Norma[];
}

const SECCIONES: Seccion[] = [
  {
    id: "constitucional",
    epigrafe: "Fundamento superior",
    titulo: "Constitución Política de Colombia (1991)",
    tituloCorto: "Constitución (1991)",
    conteo: "5 artículos",
    icono: Landmark,
    normas: [
      {
        nombre: "Art. 1",
        enfasis: "Estado social de derecho participativo",
        nivel: "Constitución",
        badgeVariant: "ember",
        puntos: [
          "Colombia se constituye en un Estado social de derecho, fundado en el respeto de la dignidad humana.",
          "La democracia participativa es base del ordenamiento: las decisiones públicas se legitiman con intervención de la ciudadanía.",
        ],
      },
      {
        nombre: "Art. 2",
        enfasis: "Fines esenciales del Estado",
        nivel: "Constitución",
        badgeVariant: "ember",
        puntos: [
          "Las autoridades están para proteger los derechos, facilitar la participación y garantizar el orden social justo.",
        ],
      },
      {
        nombre: "Art. 74",
        enfasis: "Acceso a la información pública",
        nivel: "Constitución",
        badgeVariant: "ember",
        puntos: [
          "Toda persona tiene derecho a conocer los documentos públicos y el contenido de las decisiones de las autoridades, salvo excepciones constitucionales.",
        ],
      },
      {
        nombre: "Art. 103",
        enfasis: "Soberanía popular y mecanismos de participación",
        nivel: "Constitución",
        badgeVariant: "ember",
        puntos: [
          "El pueblo es soberano y ejerce su poder de manera directa: voto, plebiscito, referendo, consulta popular, cabildo abierto, iniciativa legislativa y revocatoria.",
        ],
      },
      {
        nombre: "Art. 209",
        enfasis: "Principios de la función administrativa",
        nivel: "Constitución",
        badgeVariant: "ember",
        expandir: true,
        puntos: [
          "Igualdad, moralidad, eficacia, economía, celeridad, imparcialidad y publicidad orientan la gestión pública y su verificación.",
        ],
      },
    ],
  },
  {
    id: "nacional",
    epigrafe: "Marco nacional",
    titulo: "Leyes y decretos de la República",
    tituloCorto: "Leyes Nacionales",
    conteo: "4 normas",
    icono: BookOpen,
    normas: [
      {
        nombre: "Ley Estatutaria 1757 de 2015",
        enfasis: "Participación democrática y control social",
        nivel: "Ley Estatutaria",
        badgeVariant: "outline",
        puntos: [
          "Promueve y protege el derecho a la participación democrática en la gestión y el control social.",
        ],
      },
      {
        nombre: "Ley 1712 de 2014",
        enfasis: "Transparencia y acceso a la información pública",
        nivel: "Ley Ordinaria",
        badgeVariant: "outline",
        puntos: [
          "Adopta el principio de máxima divulgación; las entidades y los ciudadanos publican y solicitan datos abiertos.",
        ],
      },
      {
        nombre: "Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013",
        enfasis: "Protección de datos personales (Habeas Data)",
        nivel: "Habeas Data",
        badgeVariant: "ember",
        expandir: true,
        puntos: [
          "Tratamiento ético, informado y limitado de los datos personales de los participantes.",
          "Despojo pericial de metadatos EXIF/GPS en evidencias comunitarias y anonimización por defecto.",
          "Salvaguardas reforzadas para líderes sociales y comunales.",
        ],
      },
      {
        nombre: "Ley 2294 de 2022",
        enfasis: "Plan Nacional de Desarrollo “Colombia Potencia Mundial de la Vida”",
        nivel: "Ley del PND",
        badgeVariant: "outline",
        puntos: [
          "Orienta la transformación territorial hacia la Seguridad Humana y la Justicia Social.",
        ],
      },
    ],
  },
  {
    id: "distrital",
    epigrafe: "Marco distrital",
    titulo: "Cartagena de Indias, Distrito Turístico y Cultural",
    tituloCorto: "Marco Distrital",
    conteo: "2 normas",
    icono: Building2,
    normas: [
      {
        nombre: "Acuerdo Distrital 139 de 2024",
        enfasis: "Plan de Desarrollo “Cartagena, Ciudad de Derechos” (2024–2027)",
        nivel: "Acuerdo Distrital",
        badgeVariant: "ember",
        puntos: [
          "Recoge la orientación distrital con la Línea Estratégica 1: Seguridad Humana.",
        ],
      },
      {
        nombre: "Decreto Distrital 037 de 2026",
        enfasis: "Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC)",
        nivel: "Decreto Distrital",
        badgeVariant: "ember",
        puntos: [
          "Ordena la formulación participativa y la implementación de la política pública con las 35 mesas de trabajo territoriales.",
        ],
      },
    ],
  },
  {
    id: "internacional",
    epigrafe: "Marco internacional",
    titulo: "Doctrina de Seguridad Humana",
    tituloCorto: "Doctrina ONU / PNUD",
    conteo: "3 instrumentos",
    icono: Globe2,
    normas: [
      {
        nombre: "Resolución 66/290 de la ONU (2012)",
        enfasis: "Consenso doctrinal de Seguridad Humana",
        nivel: "Resolución ONU",
        badgeVariant: "info",
        puntos: [
          "Libertad frente al miedo, libertad frente a la necesidad y libertad para vivir con dignidad.",
        ],
      },
      {
        nombre: "Informe PNUD (1994)",
        enfasis: "Enfoque centrado en las personas",
        nivel: "Informe Global",
        badgeVariant: "info",
        puntos: [
          "Siete dimensiones integrales: económica, alimentaria, de salud, ambiental, personal, comunitaria y política.",
        ],
      },
      {
        nombre: "Agenda 2030 y ODS",
        enfasis: "Objetivos asociados al marco POLIS",
        nivel: "Compromiso Global",
        badgeVariant: "info",
        expandir: true,
        puntos: [
          "Metas vinculadas a los ODS 1, 2, 3, 5, 8, 10, 11, 13 y 16.",
        ],
      },
    ],
  },
  {
    id: "salvaguardas",
    epigrafe: "Salvaguardas éticas",
    titulo: "No revictimización y acción sin daño",
    tituloCorto: "Salvaguardas",
    conteo: "1 protocolo",
    icono: ShieldCheck,
    normas: [
      {
        nombre: "Confidencialidad y Protección Comunitaria",
        enfasis: "Protección integral de víctimas y líderes comunitarios",
        nivel: "Salvaguarda Ética",
        badgeVariant: "success",
        expandir: true,
        puntos: [
          "Identidad y testimonios de víctimas resguardados durante todo el proceso participativo.",
          "Recolección, conservación y publicación de evidencias sin exponer ni revictimizar a las personas.",
          "Enfoque de acción sin daño: el aporte ciudadano nunca aumenta el riesgo de la persona que lo entrega.",
        ],
      },
    ],
  },
];

export default function MarcoLegalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-primary)]">
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1"
      >
        {/* Miga de pan / Retorno */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--text-primary)] font-medium">Marco legal institucional</span>
        </div>

        {/* Encabezado Principal Fluido */}
        <header className="space-y-4 border-b border-[var(--border)] pb-8 mb-8 sm:mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ember" className="text-[11px] font-semibold uppercase tracking-wider">
              Fundamento Jurídico
            </Badge>
            <span className="text-xs text-[var(--text-tertiary)]" aria-hidden="true">•</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Alcaldía Mayor de Cartagena de Indias
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Marco legal y doctrinal de POLIS
          </h1>

          <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
            Andamiaje jurídico y doctrinal que fundamenta la Política Pública de Seguridad Humana y Convivencia Ciudadana
            de Cartagena de Indias: principios constitucionales, marco normativo nacional y distrital, consensos
            internacionales y salvaguardas éticas para la no revictimización ciudadana.
          </p>

          {/* Franja de 4 tarjetas institucionales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Ámbitos
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                5 Niveles Normativos
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Base Distrital
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                Decreto 037 de 2026
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Participación
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                35 Mesas de Trabajo
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Garantía Ética
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                Acción sin Daño
              </p>
            </div>
          </div>
        </header>

        {/* Navegación móvil y tablet: barra de pestañas scrollable horizontal */}
        <nav aria-label="Navegación rápida de secciones" className="block lg:hidden mb-8">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Saltar a sección:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {SECCIONES.map((seccion) => (
              <a
                key={seccion.id}
                href={`#${seccion.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--ember)] hover:text-[var(--ember)] active:scale-95 shadow-2xs"
              >
                <span>{seccion.tituloCorto ?? seccion.titulo}</span>
                <span className="text-[10px] rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[var(--text-tertiary)]">
                  {seccion.conteo}
                </span>
              </a>
            ))}
          </div>
        </nav>

        {/* Layout en Rejilla 12 Columnas para Desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          {/* Columna Lateral Sticky (Desktop: lg:col-span-4) */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 self-start space-y-6">
              {/* Índice de navegación */}
              <nav
                aria-label="Índice del marco legal"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-[var(--ember)]" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      Índice Normativo
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                    5 Ámbitos
                  </span>
                </div>

                <ul className="space-y-1.5 text-xs">
                  {SECCIONES.map((seccion) => {
                    const Icono = seccion.icono;
                    return (
                      <li key={seccion.id}>
                        <a
                          href={`#${seccion.id}`}
                          className="group flex items-center justify-between rounded-lg p-2.5 text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border)]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--text-tertiary)] group-hover:bg-[var(--ember)]/10 group-hover:text-[var(--ember)] transition-colors">
                              <Icono className="size-3.5" aria-hidden="true" />
                            </span>
                            <span className="truncate font-medium group-hover:underline">
                              {seccion.tituloCorto ?? seccion.titulo}
                            </span>
                          </div>
                          <span className="ml-2 shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--text-tertiary)] group-hover:border-[var(--ember)]/40 group-hover:text-[var(--ember)]">
                            {seccion.conteo}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Tarjeta de Contexto Institucional Distrital */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-[var(--text-primary)]" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Mandato Distrital de Cartagena
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  El <strong>Decreto Distrital 037 de 2026</strong> consagra el proceso de formulación participativa
                  y seguimiento de la Política Pública de Seguridad Humana y Convivencia Ciudadana en las 3 localidades
                  y la zona insular y rural de Cartagena de Indias.
                </p>
                <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-2">
                  <Link
                    href="/geovisor"
                    className="inline-flex items-center justify-between text-xs font-medium text-[var(--ember)] hover:underline"
                  >
                    <span>Ver Geovisor Territorial</span>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/contacto"
                    className="inline-flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                  >
                    <span>Canales de Contacto y PQRSD</span>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Columna Principal de Secciones y Fichas Normativas (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-12">
            {SECCIONES.map((seccion) => {
              const Icono = seccion.icono;
              return (
                <section
                  key={seccion.id}
                  id={seccion.id}
                  className="scroll-mt-24 space-y-5"
                  aria-labelledby={`titulo-${seccion.id}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <p className="label-micro uppercase tracking-widest text-[var(--ember)]">
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
                    <Badge variant="outline" className="text-xs font-mono">
                      {seccion.conteo}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {seccion.normas.map((norma) => {
                      const esExtensa = norma.expandir === true;
                      return (
                        <article
                          key={norma.nombre}
                          className={`rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5 shadow-sm transition-all hover:border-[var(--border-strong)] hover:shadow-md flex flex-col justify-between ${
                            esExtensa ? "md:col-span-2" : ""
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-2">
                              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                                {norma.nombre}
                              </h3>
                              <Badge
                                variant={norma.badgeVariant ?? "outline"}
                                className="text-[10px] uppercase font-bold shrink-0"
                              >
                                {norma.nivel}
                              </Badge>
                            </div>

                            <p className="text-xs sm:text-sm font-medium text-[var(--ember)] mb-3">
                              {norma.enfasis}
                            </p>

                            <ul className="space-y-2 list-disc pl-4 sm:pl-5 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                              {norma.puntos.map((punto, idx) => (
                                <li key={idx} className="marker:text-[var(--text-tertiary)]">
                                  {punto}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* Retorno al inicio de página */}
            <div className="pt-8 border-t border-[var(--border)] flex justify-end">
              <a
                href="#main-content"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--ember)] transition-colors"
              >
                <span>Volver al inicio de la página ↑</span>
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
