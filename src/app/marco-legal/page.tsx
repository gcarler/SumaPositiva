import type { Metadata } from "next";
import { Footer } from "@/shared/layout/footer";

export const metadata: Metadata = {
  title: "Marco legal — POLIS Cartagena de Indias",
  description:
    "Andamiaje jurídico y doctrinal de la Política Pública de Seguridad Humana de Cartagena: fundamentos constitucionales, marco nacional, distrital e internacional de seguridad humana.",
};

/**
 * POLIS — Marco legal.
 *
 * Página institucional estática (Server Component): consolida los fundamentos
 * constitucionales, el marco normativo nacional, distrital e internacional y
 * las salvaguardas de no revictimización de la plataforma POLIS.
 */

interface Norma {
  nombre: string;
  enfasis: string;
  puntos: string[];
}

interface Seccion {
  id: string;
  epigrafe: string;
  titulo: string;
  normas: Norma[];
}

const SECCIONES: Seccion[] = [
  {
    id: "constitucional",
    epigrafe: "Fundamento superior",
    titulo: "Constitución Política de Colombia (1991)",
    normas: [
      {
        nombre: "Art. 1",
        enfasis: "Estado social de derecho participativo",
        puntos: [
          "Colombia se constituye en un Estado social de derecho, fundado en el respeto de la dignidad humana.",
          "La democracia participativa es base del ordenamiento: las decisiones públicas se legitiman con intervención de la ciudadanía.",
        ],
      },
      {
        nombre: "Art. 2",
        enfasis: "Fines esenciales del Estado",
        puntos: [
          "Las autoridades están para proteger los derechos, facilitar la participación y garantizar el orden social justo.",
        ],
      },
      {
        nombre: "Art. 74",
        enfasis: "Acceso a la información pública",
        puntos: [
          "Toda persona tiene derecho a conocer los documentos públicos y el contenido de las decisiones de las autoridades, salvo excepciones constitucionales.",
        ],
      },
      {
        nombre: "Art. 103",
        enfasis: "Soberanía popular y mecanismos de participación",
        puntos: [
          "El pueblo es soberano y ejerce su poder de manera directa: voto, plebiscito, referendo, consulta popular, cabildo abierto, iniciativa legislativa y revocatoria.",
        ],
      },
      {
        nombre: "Art. 209",
        enfasis: "Principios de la función administrativa",
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
    normas: [
      {
        nombre: "Ley Estatutaria 1757 de 2015",
        enfasis: "Participación democrática y control social",
        puntos: [
          "Promueve y protege el derecho a la participación democrática en la gestión y el control social.",
        ],
      },
      {
        nombre: "Ley 1712 de 2014",
        enfasis: "Transparencia y acceso a la información pública",
        puntos: [
          "Adopta el principio de máxima divulgación; las entidades y los ciudadanos publican y solicitan datos abiertos.",
        ],
      },
      {
        nombre: "Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013",
        enfasis: "Protección de datos personales (Habeas Data)",
        puntos: [
          "Tratamiento ético, informado y limitado de los datos personales de los participantes.",
          "Despojo pericial de metadatos EXIF/GPS en evidencias comunitarias y anonimización por defecto.",
          "Salvaguardas reforzadas para líderes sociales y comunales.",
        ],
      },
      {
        nombre: "Ley 2294 de 2022",
        enfasis: "Plan Nacional de Desarrollo “Colombia Potencia Mundial de la Vida”",
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
    normas: [
      {
        nombre: "Acuerdo Distrital 139 de 2024",
        enfasis: "Plan de Desarrollo “Cartagena, Ciudad de Derechos” (2024–2027)",
        puntos: [
          "Recoge la orientación distrital con la Línea Estratégica 1: Seguridad Humana.",
        ],
      },
      {
        nombre: "Decreto Distrital 037 de 2026",
        enfasis: "Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC)",
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
    normas: [
      {
        nombre: "Resolución 66/290 de la ONU (2012)",
        enfasis: "Consenso doctrinal de Seguridad Humana",
        puntos: [
          "Libertad frente al miedo, libertad frente a la necesidad y libertad para vivir con dignidad.",
        ],
      },
      {
        nombre: "Informe PNUD (1994)",
        enfasis: "Enfoque centrado en las personas",
        puntos: [
          "Siete dimensiones integrales: económica, alimentaria, de salud, ambiental, personal, comunitaria y política.",
        ],
      },
      {
        nombre: "Agenda 2030 y ODS",
        enfasis: "Objetivos asociados al marco POLIS",
        puntos: [
          "Metas vinculadas a los ODS 1, 2, 3, 5, 8, 10, 11, 13 y 16.",
        ],
      },
    ],
  },
  {
    id: "salvaguardas",
    epigrafe: "Salvaguardas",
    titulo: "No revictimización y acción sin daño",
    normas: [
      {
        nombre: "Confidencialidad",
        enfasis: "Protección integral de víctimas y líderes comunitarios",
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
    <div className="flex min-h-screen flex-col">
      <main id="main-content" tabIndex={-1} className="container-fluid flex-1 py-10">
        <header className="max-w-3xl space-y-3">
          <p className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
            Institucional
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Marco legal de POLIS
          </h1>
          <p className="text-base leading-relaxed text-[var(--text-secondary)]">
            Andamiaje jurídico y doctrinal de la Política Pública de Seguridad Humana de
            Cartagena de Indias: fundamentos constitucionales, marco normativo nacional,
            distrital e internacional, y salvaguardas para las personas participantes.
          </p>
        </header>

        <nav aria-label="Secciones del marco legal" className="mt-8 max-w-3xl">
          <ol className="flex flex-wrap gap-2">
            {SECCIONES.map((seccion) => (
              <li key={seccion.id}>
                <a
                  href={`#${seccion.id}`}
                  className="inline-block rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--ember)] hover:text-[var(--ember)]"
                >
                  {seccion.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 max-w-3xl space-y-8">
          {SECCIONES.map((seccion) => (
            <section
              key={seccion.id}
              id={seccion.id}
              className="scroll-mt-6 space-y-4"
              aria-labelledby={`titulo-${seccion.id}`}
            >
              <div>
                <p className="label-micro uppercase tracking-widest text-[var(--ember)]">
                  {seccion.epigrafe}
                </p>
                <h2
                  id={`titulo-${seccion.id}`}
                  className="mt-1 text-xl font-semibold text-[var(--text-primary)]"
                >
                  {seccion.titulo}
                </h2>
              </div>
              <ul className="space-y-4">
                {seccion.normas.map((norma) => (
                  <li
                    key={norma.nombre}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-5"
                  >
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {norma.nombre}
                      <span className="ml-2 font-normal text-[var(--text-secondary)]">
                        — {norma.enfasis}
                      </span>
                    </h3>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {norma.puntos.map((punto) => (
                        <li key={punto}>{punto}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
