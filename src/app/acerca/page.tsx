import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Scale,
  MapPin,
  Users,
  Building2,
  ExternalLink,
  Mail,
  ArrowLeft,
  GitBranch,
  Layers,
} from "lucide-react";
import { Footer } from "@/shared/layout/footer";
import { Badge } from "@/shared/ui/badge";
import { IsotipoPolis, LogoPolis } from "@/shared/branding/logo-polis";

export const metadata: Metadata = {
  title: "Acerca de POLIS — Plataforma Integral de Participación y Gobernanza",
  description:
    "Conozca el sistema POLIS: plataforma integral de deliberación comunitaria, inteligencia territorial, trazabilidad y fe pública transaccional desarrollada y de propiedad de Ples SAS.",
};

export default function AcercaPage() {
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
          <span className="text-[var(--text-primary)] font-medium">Acerca de POLIS</span>
        </div>

        {/* Encabezado Principal */}
        <header className="space-y-4 border-b border-[var(--border)] pb-8 mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] p-2.5 shadow-xs">
              <LogoPolis className="h-9 sm:h-11 w-auto text-[var(--text-primary)]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ember" className="text-[11px] font-semibold uppercase tracking-wider">
              Sistema Institucional
            </Badge>
            <span className="text-xs text-[var(--text-tertiary)]" aria-hidden="true">•</span>
            <Badge variant="outline" className="text-[11px] font-medium">
              Propiedad de Ples SAS
            </Badge>
            <span className="text-xs text-[var(--text-tertiary)]" aria-hidden="true">•</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Gobernanza y Participación Ciudadana
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            POLIS — Plataforma Integral de Participación, Inteligencia Territorial y Seguridad Humana
          </h1>

          <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
            POLIS es la infraestructura tecnológica y doctrinal concebida para articular la deliberación comunitaria,
            el geodiagnóstico territorial situacional y la fe pública transaccional de los aportes ciudadanos, garantizando
            la trazabilidad verificable del ciclo completo de las políticas públicas.
          </p>

          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Deliberación
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                Mesas Ciudadanas
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Geodiagnóstico
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                Inteligencia Espacial
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Marco Jurídico
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                Ley 1757 / C-150
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                Fe Pública
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                POLIS Herald
              </p>
            </div>
          </div>
        </header>

        {/* Sección: Qué es el sistema POLIS */}
        <section aria-labelledby="seccion-que-es" className="mb-12 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1.5 shadow-xs">
              <IsotipoPolis className="size-full" />
            </div>
            <div>
              <h2 id="seccion-que-es" className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                ¿Qué es el Sistema POLIS?
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Misión, fundamentos operativos y arquitectura de gobernanza
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 space-y-4">
            <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
              POLIS (Plataforma de Operación Local e Inteligencia Social) es una plataforma integral de gobernanza democrática
              diseñada para canalizar la voz y prioridades de las comunidades hacia la toma de decisiones institucionales vinculantes.
              Nacida para superar los modelos tradicionales de consulta pasiva, POLIS transforma la participación en un proceso
              auditable, continuo y estructurado en tiempo real.
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
              A través de módulos interconectados, POLIS enlaza el diagnóstico situado en los barrios, la formulación de alternativas
              de solución, el costeo presupuestal plurianual (FONSET, SGP, SGR) y el seguimiento a metas del Plan de Desarrollo
              Distrital (PDD), protegiendo la dignidad y no revictimización de los participantes bajo el principio de acción sin daño.
            </p>
          </div>
        </section>

        {/* Sección: Alcances Institucionales */}
        <section aria-labelledby="seccion-alcances" className="mb-12 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--info)] border border-[var(--border)]">
              <Layers className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="seccion-alcances" className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                Alcances Institucionales del Sistema
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Pilares funcionales de la plataforma para la gestión pública distrital
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pilar 1: Deliberación */}
            <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[var(--ember)]" aria-hidden="true" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  1. Deliberación Comunitaria y Diálogo Social
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Soporte integral a mesas de trabajo territoriales y temáticas (35 mesas canónicas distritales),
                papelógrafos digitales, actas de consenso estructuradas, priorización ciudadana de iniciativas
                y salvaguarda estricta de datos personales sensibles (PII).
              </p>
            </article>

            {/* Pilar 2: Geodiagnóstico */}
            <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-[var(--info)]" aria-hidden="true" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  2. Geodiagnóstico Territorial e Inteligencia Espacial
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Visualización geoespacial de vulnerabilidades, cruce de capas cartográficas oficiales (SIEDCO, DANE,
                delitos de alto impacto, seguridad humana) y georreferenciación de necesidades barriales para orientar
                la inversión pública con evidencia empírica.
              </p>
            </article>

            {/* Pilar 3: Trazabilidad y Marco Legal */}
            <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="size-5 text-[var(--text-primary)]" aria-hidden="true" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  3. Trazabilidad del Ciclo de Políticas Públicas
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Cumplimiento riguroso de la Ley Estatutaria 1757 de 2015 y la Sentencia C-150 de 2015 de la Corte Constitucional.
                Cada propuesta ciudadana transita por un ciclo inmutable: radicación, diagnóstico causal, viabilidad jurídica/fiscal,
                costeo presupuestal y articulación con metas de gobierno.
              </p>
            </article>

            {/* Pilar 4: Fe Pública Transaccional */}
            <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[var(--success)]" aria-hidden="true" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  4. Fe Pública Transaccional (POLIS Herald)
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Módulo oficial de fe pública que emite constancias solemnes de radicado (POL-2026-XXXX) con códigos QR
                criptográficos verificables públicamente, sellos de tiempo inmutables y trazabilidad de entrega de notificaciones
                transaccionales.
              </p>
            </article>
          </div>
        </section>

        {/* Sección: Titularidad y Propiedad — Ples SAS */}
        <section aria-labelledby="seccion-titularidad" className="mb-12 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]">
              <Building2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="seccion-titularidad" className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                Titularidad y Propiedad Intelectual
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Autoría, desarrollo tecnológico y derechos de la plataforma
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
              <div>
                <span className="label-micro uppercase font-bold tracking-widest text-[var(--ember)]">
                  Desarrollador y Propietario Exclusivo
                </span>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                  Ples SAS
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Ingeniería de software, analítica territorial y gobernanza algorítmica
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://ples.com.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-base)] hover:border-[var(--border-strong)]"
                >
                  <span>Sitio Web Oficial</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
                <a
                  href="mailto:contacto@ples.com.co"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-base)] hover:border-[var(--border-strong)]"
                >
                  <Mail className="size-3.5" aria-hidden="true" />
                  <span>contacto@ples.com.co</span>
                </a>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p>
                La plataforma <strong>POLIS</strong> (código fuente, modelos analíticos, arquitectura de microservicios,
                diseño de experiencia de usuario, marcas y componentes del sistema) es de <strong>propiedad exclusiva
                y ha sido desarrollada íntegramente por Ples SAS</strong>.
              </p>
              <p>
                La Alcaldía Mayor de Cartagena de Indias, sus secretarías y las entidades distritales operan el sistema
                en calidad de usuarios institucionales y convocantes democráticos en el marco de la formulación de la
                Política Pública de Seguridad Humana y Convivencia Ciudadana 2026–2036.
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Todos los derechos morales y patrimoniales de autor sobre el software POLIS corresponden a Ples SAS
                conforme a la legislación colombiana (Ley 23 de 1982, Decisión 351 de la CAN) y tratados internacionales de OMPI.
              </p>
            </div>
          </div>
        </section>

        {/* Enlaces y Navegación Institucional */}
        <section aria-labelledby="seccion-navegacion" className="space-y-4">
          <h2 id="seccion-navegacion" className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Explorar Módulos de la Plataforma
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/marco-legal"
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Marco Legal</p>
                <p className="text-xs text-[var(--text-secondary)]">Fundamentos constitucionales y doctrinales</p>
              </div>
              <Scale className="size-5 text-[var(--text-tertiary)]" aria-hidden="true" />
            </Link>

            <Link
              href="/trazabilidad"
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Trazabilidad</p>
                <p className="text-xs text-[var(--text-secondary)]">Ciclo de vida de los aportes ciudadanos</p>
              </div>
              <GitBranch className="size-5 text-[var(--text-tertiary)]" aria-hidden="true" />
            </Link>

            <Link
              href="/contacto"
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Contacto</p>
                <p className="text-xs text-[var(--text-secondary)]">Atención ciudadana y canales distritales</p>
              </div>
              <Mail className="size-5 text-[var(--text-tertiary)]" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
