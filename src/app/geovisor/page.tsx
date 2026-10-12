"use client";

import { useEffect } from "react";
import { GeovisorView } from "@/features/geovisor/views/geovisor-view";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { SidebarProvider } from "@/shared/ui/sidebar";

export default function GeovisorPublicPage() {
  const setVista = useNavigationStore((s) => s.setVista);

  useEffect(() => {
    setVista("geovisor");
  }, [setVista]);

  return (
    <SidebarProvider id="polis-geovisor">
      <div className="flex h-dvh w-screen flex-col overflow-hidden bg-[var(--surface-0)]">
        <a className="ui-skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <main id="main-content" tabIndex={-1} className="h-full w-full flex-1 min-h-0 min-w-0 overflow-hidden">
          <GeovisorView />
        </main>
      </div>
    </SidebarProvider>
  );
}
