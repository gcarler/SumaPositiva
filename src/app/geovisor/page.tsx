"use client";

import { useEffect } from "react";
import { Topbar } from "@/app/_components/topbar";
import { Footer } from "@/shared/layout/footer";
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
      <div className="flex min-h-screen flex-col flex-1 min-w-0">
        <a className="ui-skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <Topbar />

        <main id="main-content" tabIndex={-1} className="flex-1">
          <GeovisorView />
        </main>

        <Footer />
      </div>
    </SidebarProvider>
  );
}
