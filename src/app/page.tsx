"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Topbar } from "@/app/_components/topbar";
import { Footer } from "@/shared/layout/footer";
import { InicioView } from "@/features/politicas/views/inicio-view";
import { ExplorarView } from "@/features/politicas/views/explorar-view";
import { MesasView } from "@/features/mesas/views/mesas-view";
import { GeovisorView } from "@/features/geovisor/views/geovisor-view";
import { NoticiasView } from "@/features/noticias/views/noticias-view";
import { TestimoniosView } from "@/features/testimonios/views/testimonios-view";
import { DimensionesView } from "@/features/politicas/views/dimensiones-view";
import { useNavigationStore } from "@/core/navigation/navigation-store";

import { SidebarProvider } from "@/shared/ui/sidebar";

/**
 * POLIS — Plataforma de Participación Ciudadana en Políticas Públicas.
 *
 * Arquitectura Zero-Modals: las vistas viven aquí (client-side), y toda
 * la navegación detallada (Política → Fase → Línea → Aporte) ocurre en
 * paneles laterales apilados montados globalmente en el layout raíz.
 */

export default function Home() {
  const reducedMotion = useReducedMotion();
  const vista = useNavigationStore((s) => s.vista);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [vista]);

  return (
    <SidebarProvider id="polis-application">
      <div className="flex min-h-screen flex-col flex-1 min-w-0">
        <a className="ui-skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <Topbar />

        {/* Banner cívico móvil: Modo Barrio */}
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-center text-xs text-[var(--text-secondary)]">
          ¿En tu celular con datos prepago?{" "}
          <Link
            href="/barrio"
            className="font-semibold text-[var(--ember)] underline underline-offset-2"
          >
            Activar Modo Barrio (Bajo consumo)
          </Link>
        </div>

        <main id="main-content" tabIndex={-1} className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={vista}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {vista === "inicio" ? (
                <InicioView />
              ) : vista === "dimensiones" ? (
                <DimensionesView />
              ) : vista === "mesas" ? (
                <MesasView />
              ) : vista === "geovisor" ? (
                <GeovisorView />
              ) : vista === "noticias" ? (
                <NoticiasView />
              ) : vista === "testimonios" ? (
                <TestimoniosView />
              ) : (
                <ExplorarView />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </SidebarProvider>
  );
}
