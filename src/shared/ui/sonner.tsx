"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Notifications stay above the panel header, clear of footer actions. */
const Toaster = (props: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-right"
      offset={80}
      closeButton
      toastOptions={{
        style: { background: "var(--surface-1)", color: "var(--text-primary)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", boxShadow: "var(--elevation-raised)" },
      }}
      {...props}
    />
  );
};

export { Toaster };
