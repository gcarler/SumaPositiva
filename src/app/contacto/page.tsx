import type { Metadata } from "next";
import { Footer } from "@/shared/layout/footer";
import { BuzonContacto } from "./buzon-contacto";

export const metadata: Metadata = {
  title: "Contacto — POLIS Cartagena de Indias",
  description:
    "Canales de contacto y atención ciudadana de la Alcaldía Mayor de Cartagena de Indias para la Política Pública de Seguridad Humana: PQRSD, mesas de trabajo y buzón ciudadano POLIS.",
};

/**
 * Contacto y atención ciudadana.
 *
 * Canales oficiales de la Alcaldía Mayor de Cartagena de Indias — Secretaría
 * Interior y Convivencia Ciudadana / Secretaría de Planeación Distrital —
 * con la mención orientadora de las 35 mesas de trabajo y el buzón de
 * contacto en `buzon-contacto.tsx`.
 */
export default function ContactoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" tabIndex={-1} className="container-fluid flex-1 py-10">
        <header className="space-y-3">
          <p className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
            Institucional
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Contacto y atención ciudadana
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-[var(--text-secondary)]">
            Canales oficiales de la Alcaldía Mayor de Cartagena de Indias para participar
            en la construcción de la Política Pública de Seguridad Humana.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="datos-entidad" className="space-y-5">
            <h2 id="datos-entidad" className="text-xl font-semibold text-[var(--text-primary)]">
              Datos de la entidad convocante
            </h2>
            <dl className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm leading-relaxed text-[var(--text-secondary)]">
              <div>
                <dt className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
                  Entidades
                </dt>
                <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                  Alcaldía Mayor de Cartagena de Indias
                </dd>
                <dd>
                  Secretaría del Interior y Convivencia Ciudadana / Secretaría de
                  Planeación Distrital
                </dd>
              </div>
              <div>
                <dt className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
                  Sede
                </dt>
                <dd className="mt-1">
                  Centro Histórico, Plaza de la Aduana, Calle de la Inquisición #30-31,
                  Cartagena de Indias, D.T. y C., Bolívar, Colombia.
                </dd>
              </div>
              <div>
                <dt className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
                  Horario oficial de atención
                </dt>
                <dd className="mt-1">
                  Lunes a Viernes de 8:00 a.m. a 12:00 m. y de 2:00 p.m. a 5:00 p.m.
                </dd>
              </div>
              <div>
                <dt className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
                  Correo institucional / PQRSD
                </dt>
                <dd className="mt-1">
                  <a
                    href="mailto:seguridadhumana@cartagena.gov.co"
                    className="font-medium text-[var(--ember)] underline underline-offset-2"
                  >
                    seguridadhumana@cartagena.gov.co
                  </a>
                  <span className="block text-xs text-[var(--text-tertiary)]">
                    (canal virtual de atención ciudadana)
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="mesas-territoriales" className="space-y-5">
            <h2 id="mesas-territoriales" className="text-xl font-semibold text-[var(--text-primary)]">
              Mesas de trabajo territoriales
            </h2>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p>
                La PSHC se construye de forma participativa en{" "}
                <strong className="text-[var(--text-primary)]">
                  35 mesas de trabajo territoriales
                </strong>{" "}
                de las 3 localidades urbanas y de la zona rural e insular de Cartagena de
                Indias.
              </p>
              <p className="mt-3">
                Cada mesa convoca a la ciudadanía, organiza sus aportes y entrega un
                diagnóstico territorial que alimenta la línea estratégica de Seguridad
                Humana del Plan de Desarrollo “Cartagena, Ciudad de Derechos”.
              </p>
              <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                Consulta el calendario de convocatorias y el mapa de mesas durante el
                ciclo de formulación.
              </p>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="buzon-ciudadano"
          className="mt-12 max-w-2xl space-y-5"
        >
          <div className="space-y-2">
            <h2 id="buzon-ciudadano" className="text-xl font-semibold text-[var(--text-primary)]">
              Buzón de contacto
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Los campos marcados con asterisco son obligatorios.
            </p>
          </div>
          <BuzonContacto />
        </section>
      </main>
      <Footer />
    </div>
  );
}
