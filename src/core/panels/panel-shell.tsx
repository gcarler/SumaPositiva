"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";
import { usePanelStore } from "@/core/panels/panel-store";
import { SidePanel } from "@/shared/ui/side-panel";

export interface Crumb {
  label: string;
  targetKey?: string;
}

interface PanelShellProps {
  entryKey: string;
  crumbs: Crumb[];
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  onCloseToKey: (key: string, inclusive?: boolean) => void;
  children: ReactNode;
}

/** Connect the reusable UI panel to the application's stack. */
export function PanelShell({
  entryKey,
  crumbs,
  onCloseToKey,
  ...props
}: PanelShellProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(props.onClose);
  useEffect(() => {
    onCloseRef.current = props.onClose;
  }, [props.onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const maximized = usePanelStore(
    (state) =>
      state.entries.find((entry) => entry.key === entryKey)?.maximized ?? false,
  );
  const toggleMaximized = usePanelStore((state) => state.toggleMaximized);
  return (
    <SidePanel
      {...props}
      currentKey={entryKey}
      maximized={maximized}
      onToggleMaximized={() => toggleMaximized(entryKey)}
      breadcrumbs={crumbs.map((crumb) => ({
        label: crumb.label,
        onSelect: crumb.targetKey
          ? () => onCloseToKey(crumb.targetKey!)
          : undefined,
      }))}
    />
  );
}

/** Animación estándar de entrada/salida de paneles */
export const panelVariants = {
  initial: { x: "100%" },
  animate: {
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 320,
      damping: 34,
      mass: 0.9,
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 40,
      mass: 0.9,
    },
  },
};

/** Wrapper animado que usan los paneles dentro del stack */
export function AnimatedPanel({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      inert={!present}
      aria-hidden={!present || undefined}
      variants={panelVariants}
      initial={reducedMotion ? false : "initial"}
      animate="animate"
      exit={reducedMotion ? { x: 0, transition: { duration: 0 } } : "exit"}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
