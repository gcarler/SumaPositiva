import type { Metadata } from "next";
import { Footer } from "@/shared/layout/footer";
import { DiagramaTrazabilidad } from "./diagrama-trazabilidad";

export const metadata: Metadata = {
  title: "Trazabilidad — POLIS Cartagena de Indias",
  description:
    "Diagrama UML del ciclo de vida completo de una política pública en Cartagena de Indias: carriles de actores, 5 fases metodológicas del DNP y línea de vida del dato ciudadano, del aporte en mesa al proyecto BPIM y su supervisión.",
};

/**
 * POLIS — Trazabilidad del ciclo de vida de la política pública.
 *
 * Diagrama UML interactivo (carriles de actores y fases) articulado con el
 * andamiaje metodológico del DNP y el caso de Cartagena de Indias
 * (Decreto Distrital 037 de 2026, Acuerdo Distrital 139 de 2024 y las 7
 * Dimensiones de Seguridad Humana).
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
              Política Pública de Seguridad Humana y Convivencia Ciudadana (PSHC),
              modelado en lenguaje UML con los carriles de los actores y las 5 fases
              metodológicas.
            </p>
          </header>
          <DiagramaTrazabilidad />
        </div>
      </main>
      <Footer />
    </div>
  );
}
