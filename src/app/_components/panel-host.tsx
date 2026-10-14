"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSesionStore } from "@/features/sesion/state/session-store";
import {
  panelPermitido,
  puedeEditar,
} from "@/features/plataforma/models/acceso";
import { PanelShell } from "@/core/panels/panel-shell";
import { Notice } from "@/shared/ui/notice";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePanelStore } from "@/core/panels/panel-store";
import {
  PANEL_WIDTHS,
  renderPanel,
} from "@/app/_composition/panel-registry";
import { AnimatedPanel } from "@/core/panels/panel-shell";

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
  const ruta = usePathname();
  const sesion = useSesionStore((s) => s.sesion);
  const cargando = useSesionStore((s) => s.cargando);
  const errorSesion = useSesionStore((s) => s.errorSesion);
  const interno = ruta?.startsWith("/plataforma") ?? false;
  const entries = usePanelStore((s) => s.entries);
  const closeTop = usePanelStore((s) => s.closeTop);
  const toggleMaximized = usePanelStore((s) => s.toggleMaximized);
  const open = entries.length > 0;
  const reducedMotion = useReducedMotion();
  const topKey = entries.at(-1)?.key;

  /* Bloquear scroll del body mientras haya paneles */
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const application = document.getElementById("polis-application");
      const previouslyInert = application?.inert ?? false;
      if (application) application.inert = true;
      return () => {
        document.body.style.overflow = prev;
        if (application) application.inert = previouslyInert;
      };
    }
  }, [open]);

  // Lazy panels may mount after the stack entry: observe until their content exists.
  useEffect(() => {
    if (!topKey) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusPanel = () => {
      const panel = document.querySelector<HTMLElement>(
        `[data-panel-entry="${topKey}"] [role="dialog"]`,
      );
      if (!panel) return false;
      panel.focus({ preventScroll: true });
      return true;
    };
    const observer = new MutationObserver(() => {
      if (focusPanel()) observer.disconnect();
    });
    if (!focusPanel())
      observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [topKey]);

  /* Escape: si el panel del tope está maximizado, primero restaura;
     en el siguiente Escape cierra. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || entries.length === 0) return;
      const top = entries[entries.length - 1];
      if (e.key === "Tab") {
        const panel = document.querySelector<HTMLElement>(
          `[data-panel-entry="${top.key}"] [role="dialog"]`,
        );
        if (
          !panel ||
          (e.target instanceof Element &&
            e.target.closest("[data-radix-popper-content-wrapper]"))
        )
          return;
        const controls = [
          ...panel.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ),
        ].filter(
          (element) =>
            element.getClientRects().length > 0 && !element.closest("[inert]"),
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          e.preventDefault();
          panel.focus();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === panel)
        ) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key !== "Escape") return;
      if (top.maximized) toggleMaximized(top.key);
      else closeTop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries, closeTop, toggleMaximized]);

  return (
    <AnimatePresence>
      {open && (
        <div
          key="panel-layer"
          className="fixed inset-0"
          style={{ zIndex: BASE_Z }}
        >
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
              const width = PANEL_WIDTHS[entry.type];
              let panelEntry = entry;
              if (interno && entry.type === "mesa") {
                panelEntry = {
                  ...entry,
                  props: {
                    ...entry.props,
                    soloLectura: !puedeEditar(sesion, "mesas"),
                  },
                };
              } else if (interno && entry.type === "formularios") {
                panelEntry = {
                  ...entry,
                  props: {
                    ...entry.props,
                    soloLectura: !puedeEditar(sesion, "formularios"),
                  },
                };
              }

              return (
                <motion.div
                  key={entry.key}
                  data-panel-entry={entry.key}
                  inert={depth > 0}
                  aria-hidden={depth > 0 || undefined}
                  className="absolute inset-y-0 right-0 w-full"
                  style={{
                    zIndex: i + 1,
                    pointerEvents: depth === 0 ? "auto" : "none",
                  }}
                  initial={{ x: reducedMotion ? 0 : "100%" }}
                  animate={{
                    x: `calc(-${depth * STEP_X}px)`,
                    scale: 1 - depth * 0.015,
                  }}
                  exit={{
                    x: reducedMotion ? 0 : "100%",
                    transition: {
                      duration: reducedMotion ? 0 : 0.28,
                      ease: [0.32, 0, 0.67, 0],
                    },
                  }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 320,
                          damping: 34,
                          mass: 0.9,
                        }
                  }
                >
                  {/* Capa de geometría: ancho por defecto (fluido, ver
                      PANEL_WIDTHS) o maximizado. La transición vive aquí
                      (CSS) para no pelear con el spring. */}
                  <div
                    className="relative ml-auto h-full"
                    style={{
                      maxWidth: entry.maximized ? "100vw" : width,
                      transition: reducedMotion
                        ? "none"
                        : `max-width 0.42s ${EASE_WIDTH}`,
                    }}
                  >
                    <AnimatedPanel>
                      {interno &&
                      (cargando ||
                        errorSesion ||
                        !panelPermitido(sesion, entry.type)) ? (
                        <PanelShell
                          entryKey={entry.key}
                          crumbs={[{ label: "Plataforma" }]}
                          title="Acceso restringido"
                          onClose={closeTop}
                          onCloseToKey={closeTop}
                        >
                          <div className="p-6">
                            <Notice tone="warning" title="Acción no disponible">
                              La sesión o el rol actual no permite esta acción.
                            </Notice>
                          </div>
                        </PanelShell>
                      ) : (
                        renderPanel(panelEntry)
                      )}
                    </AnimatedPanel>

                    {/* Atenuado de paneles detrás */}
                    {depth > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: Math.min(depth * 0.16, 0.4) }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="pointer-events-none absolute inset-0 bg-[var(--panel-dimmer)]"
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
