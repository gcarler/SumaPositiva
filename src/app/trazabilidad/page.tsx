import type { Metadata } from "next";
import { Footer } from "@/shared/layout/footer";
import { DiagramaTrazabilidad } from "./diagrama-trazabilidad";

export const metadata: Metadata = {
  title: "Trazabilidad — POLIS Cartagena de Indias",
  description:
    "Diagrama del flujo propuesto por POLIS para una política pública en Cartagena de Indias: actores, cinco fases y recorrido ilustrativo del aporte ciudadano hasta el proyecto y su seguimiento.",
};

/**
 * POLIS — Trazabilidad del ciclo de vida de la política pública.
 *
 * Diagrama UML interactivo (carriles de actores y fases) articulado con el
 * caso de Cartagena de Indias, su PDD (Acuerdo Distrital 139 de 2024)
 * y el perfil de siete dimensiones de Seguridad Humana de POLIS.
 */
export default function TrazabilidadPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <header className="max-w-3xl space-y-3">
            <p className="label-micro uppercase tracking-widest text-[var(--text-tertiary)]">
              Institucional
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Trazabilidad de la política pública
            </h1>
            <p className="text-base leading-relaxed text-[var(--text-secondary)]">
              Cómo una propuesta que nace en una mesa de trabajo de Cartagena se convierte
              en diagnóstico, decisión, proyecto y verificación: el ciclo completo de la
              Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC).
              El diagrama propone cinco fases de trabajo; la adopción y los vínculos
              de cada política deben acreditarse con sus documentos y registros.
            </p>
          </header>
          <DiagramaTrazabilidad />
        </div>
      </main>
      <Footer />
    </div>
  );
}
