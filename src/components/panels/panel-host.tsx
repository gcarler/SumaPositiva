"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePanelStore } from "@/stores/panel-store";
import { PANEL_REGISTRY, PANEL_WIDTHS } from "./registry";
import { AnimatedPanel } from "./panel-shell";

/**
 * PanelHost — punto único de montaje del sistema Zero-Modals.
 * Se instala una sola vez en el layout raíz: cualquier vista puede
 * abrir paneles y la pila se renderiza globalmente sobre la app.
 *
 * Efecto de apilado: los paneles inferiores se desplazan a la izquierda,
 * escalan levemente y se atenúan — el panel superior queda activo.
 * El panel del tope puede MAXIMIZARSE (toda la pantalla) o volver a su
 * ancho por defecto; la transición de ancho es CSS (max-width) para que
 * sea fluida incluso combinada con el spring de entrada.
 */

const BASE_Z = 60;
const STEP_X = 46; // desplazamiento horizontal por nivel de profundidad
const MAX_DEPTH = 4;
const EASE_WIDTH = "cubic-bezier(0.22, 1, 0.36, 1)";

export function PanelHost() {
  const entries = usePanelStore((s) => s.entries);
  const closeTop = usePanelStore((s) => s.closeTop);
  const toggleMaximized = usePanelStore((s) => s.toggleMaximized);
  const open = entries.length > 0;

  /* Bloquear scroll del body mientras haya paneles */
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  /* Escape: si el panel del tope está maximizado, primero restaura;
     en el siguiente Escape cierra. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || entries.length === 0) return;
      const top = entries[entries.length - 1];
      if (top.maximized) toggleMaximized(top.key);
      else closeTop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries, closeTop, toggleMaximized]);

  return (
    <AnimatePresence>
      {open && (
        <div key="panel-layer" className="fixed inset-0" style={{ zIndex: BASE_Z }}>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Cerrar panel"
            onClick={closeTop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 cursor-default bg-[var(--overlay)] backdrop-blur-[2px]"
            style={{ zIndex: 0 }}
          />

          {/* Pila de paneles */}
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => {
              const depth = Math.min(entries.length - 1 - i, MAX_DEPTH);
              const PanelComponent = PANEL_REGISTRY[entry.type];
              const width = PANEL_WIDTHS[entry.type];

              return (
                <motion.div
                  key={entry.key}
                  className="absolute inset-y-0 right-0 w-full"
                  style={{ zIndex: i + 1, pointerEvents: depth === 0 ? "auto" : "none" }}
                  initial={{ x: "100%" }}
                  animate={{
                    x: `calc(-${depth * STEP_X}px)`,
                    scale: 1 - depth * 0.015,
                  }}
                  exit={{ x: "100%", transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
                  transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
                >
                  {/* Capa de geometría: ancho por defecto o maximizado.
                      La transición vive aquí (CSS) para no pelear con el spring. */}
                  <div
                    className="relative ml-auto h-full"
                    style={{
                      maxWidth: entry.maximized ? "100vw" : `${width}px`,
                      transition: `max-width 0.42s ${EASE_WIDTH}`,
                    }}
                  >
                    <AnimatedPanel>
                      <PanelComponent entryKey={entry.key} props={entry.props} />
                    </AnimatedPanel>

                    {/* Atenuado de paneles detrás */}
                    {depth > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: Math.min(depth * 0.16, 0.4) }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="pointer-events-none absolute inset-0 bg-black"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
