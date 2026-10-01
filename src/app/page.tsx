"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Topbar } from "@/components/layout/topbar";
import { Footer } from "@/components/layout/footer";
import { InicioView } from "@/components/views/inicio-view";
import { ExplorarView } from "@/components/views/explorar-view";
import { MesasView } from "@/components/views/mesas-view";
import { usePoliticasStore } from "@/stores/politicas-store";

/**
 * POLIS — Plataforma de Participación Ciudadana en Políticas Públicas.
 *
 * Arquitectura Zero-Modals: las vistas viven aquí (client-side), y toda
 * la navegación detallada (Política → Fase → Línea → Aporte) ocurre en
 * paneles laterales apilados montados globalmente en el layout raíz.
 */

export default function Home() {
  const vista = usePoliticasStore((s) => s.vista);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [vista]);

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={vista}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {vista === "inicio" ? (
              <InicioView />
            ) : vista === "mesas" ? (
              <MesasView />
            ) : (
              <ExplorarView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
