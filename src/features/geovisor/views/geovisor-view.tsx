"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { useNavigationStore } from "@/core/navigation/navigation-store";
import { usePanels } from "@/core/panels/panel-store";
import { LEYENDA_TERRITORIAL } from "../data/territorios.data";

const MapaCartagena = dynamic(() => import("../components/mapa-cartagena"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-full min-h-[32rem] items-center justify-center rounded-2xl border border-border bg-surface-1 text-sm text-text-secondary"
    >
      Cargando mapa territorial…
    </div>
  ),
});

export function GeovisorView() {
  const { openPanel } = usePanels();
  const [territorioId, setTerritorioId] = useState<string | undefined>();

  const seleccionarTerritorio = useCallback(
    (id: string) => {
      setTerritorioId(id);
      openPanel("territorio", { territorioId: id });
    },
    [openPanel],
  );

  return (
    <div className="container-fluid py-6 md:py-8">
      <PageHeader
        eyebrow="Geovisor Territorial"
        title="Seguridad Humana en el Territorio de Cartagena"
        description="Explora las localidades, la zona corregimental y los datos estadísticos territoriales disponibles. Busca cualquiera de los 205 barrios del catálogo oficial."
      />

      <div
        aria-label="Leyenda de territorios"
        className="my-5 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-border bg-surface-1 p-4"
      >
        {LEYENDA_TERRITORIAL.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm text-text-secondary">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: `var(${item.token})` }}
            />
            {item.label}
          </div>
        ))}
      </div>

      <div className="h-[calc(100vh-5rem)] min-h-[36rem]">
        <MapaCartagena
          onSelectTerritorio={seleccionarTerritorio}
          selectedTerritorioId={territorioId}
        />
      </div>
      <p className="mt-3 text-xs text-text-tertiary">
        Mapa base © OpenStreetMap contributors. Los puntos son referencias territoriales; no representan límites barriales oficiales.
      </p>
    </div>
  );
}
