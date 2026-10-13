"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarMesasGeovisor, type MesaGeovisor } from "../services/mesas-geovisor-api";
import { usePanels } from "@/core/panels/panel-store";
import { GeovisorWorkspaceLayout } from "../components/geovisor-workspace-layout";
import { GeovisorTopShelf } from "../components/geovisor-top-shelf";
import { GeovisorDockHost } from "../components/geovisor-dock-host";
import { GeovisorControles, type CapasConfig } from "../components/geovisor-controles";
import { GeovisorMesasDirectorio } from "../components/geovisor-mesas-directorio";
import { GeovisorFichaMesa } from "../components/geovisor-ficha-mesa";
import { GeovisorBiSidebar } from "../components/geovisor-bi-sidebar";
import { GeovisorCharts } from "../components/geovisor-charts";
import { GeovisorHurtosPanel } from "../components/geovisor-hurtos-panel";
import { MesasDataGrid } from "../components/mesas-datagrid/mesas-datagrid";
import type { ModoVistaMesas } from "../components/mesas-datagrid/datagrid-toolbar";
import type { VariableMapa } from "../data/estadisticas.data";
import type { MapaCartagenaHandle } from "../components/mapa-cartagena";
import { useGeovisorLayoutStore, type GeovisorViewId } from "../state/geovisor-layout-store";

const MapaCartagena = dynamic(() => import("../components/mapa-cartagena"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-full min-h-[36rem] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)] shadow-sm"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--ember)] border-t-transparent" />
        <span>Cargando Geovisor Territorial Power BI / Tableau…</span>
      </div>
    </div>
  ),
});

export function GeovisorView() {
  const { openPanel } = usePanels();
  const mapaRef = useRef<MapaCartagenaHandle | null>(null);

  const [territorioId, setTerritorioId] = useState<string>("todas");
  const [mesaIdSeleccionada, setMesaIdSeleccionada] = useState<string | null>(null);
  const { data: mesasGeovisor = [] } = useQuery({
    queryKey: ["geovisor", "mesas"],
    queryFn: listarMesasGeovisor,
    staleTime: 30_000,
    retry: 1,
  });
  const [barrioSeleccionado, setBarrioSeleccionado] = useState<string | null>(null);
  const [variableMapa, setVariableMapa] = useState<VariableMapa>("ish");
  const [modoVistaMesas, setModoVistaMesas] = useState<ModoVistaMesas>("tabla");
  const [anioHurto, setAnioHurto] = useState<number | null>(null);
  const [delitoHurto, setDelitoHurto] = useState<string | null>(null);

  const [capas, setCapas] = useState<CapasConfig>({
    localidades: true,
    corregimientos: true,
    barrios: true,
    puntos: true,
    etiquetas: true,
    isocronas: false,
    hurtoMotocicletas: false,
    hurtoResidencias: false,
    hurtoComercio: false,
  });

  const handleToggleCapa = useCallback((capa: keyof CapasConfig) => {
    setCapas((prev) => {
      const next = { ...prev, [capa]: !prev[capa] };
      if (capa === "hurtoMotocicletas" && next[capa]) setDelitoHurto("hurto_motocicletas");
      if (capa === "hurtoResidencias" && next[capa]) setDelitoHurto("hurto_residencias");
      if (capa === "hurtoComercio" && next[capa]) setDelitoHurto("hurto_comercio");
      return next;
    });
  }, []);

  const handleSelectTerritorio = useCallback(
    (id: string) => {
      setTerritorioId(id);
      setBarrioSeleccionado(null);
      if (id !== "todas") {
        openPanel("territorio", { territorioId: id });
      }
    },
    [openPanel]
  );

  const handleSelectBarrio = useCallback((barrioNombre: string) => {
    setBarrioSeleccionado(barrioNombre);
  }, []);

  const handleOpenDetalleDrawer = useCallback(
    (id: string) => {
      openPanel("territorio", { territorioId: id === "todas" ? "loc-1" : id });
    },
    [openPanel]
  );

  const mesasDelTerritorio = useMemo(() => {
    if (territorioId === "todas") return mesasGeovisor;
    return mesasGeovisor.filter(
      (mesa) => mesa.territorio_codigo?.toLowerCase() === territorioId.toLowerCase()
    );
  }, [mesasGeovisor, territorioId]);

  const handleExportarPng = useCallback(() => {
    mapaRef.current?.exportarPng();
  }, []);

  // Al seleccionar una mesa, muestra su ficha técnica (donde esté acoplada)
  const handleSelectMesa = useCallback((mesaId: string | null) => {
    setMesaIdSeleccionada(mesaId);
    if (mesaId) {
      useGeovisorLayoutStore.getState().openView("ficha");
    }
  }, []);

  const handleLocalizarMesaEnMapa = useCallback((mesa: MesaGeovisor) => {
    setMesaIdSeleccionada(mesa.id);
    useGeovisorLayoutStore.getState().openView("ficha");
    if (mesa.territorio_codigo) {
      setTerritorioId(mesa.territorio_codigo);
    }
    if (
      mesa.longitud_referencia !== null &&
      mesa.latitud_referencia !== null
    ) {
      mapaRef.current?.volarACoordenadas?.(
        mesa.longitud_referencia,
        mesa.latitud_referencia,
        15.5
      );
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleAbrirPanelMesa = useCallback(
    (mesaId: string) => {
      openPanel("mesa", { mesaId });
    },
    [openPanel]
  );

  const mesaActiva = useMemo(() => {
    if (!mesaIdSeleccionada) return null;
    return mesasGeovisor.find((m) => m.id === mesaIdSeleccionada) ?? null;
  }, [mesasGeovisor, mesaIdSeleccionada]);

  const renderView = (id: GeovisorViewId) => {
    switch (id) {
      case "filtros":
        return (
          <GeovisorTopShelf
            territorioId={territorioId}
            onTerritorioChange={handleSelectTerritorio}
            variableMapa={variableMapa}
            onVariableChange={setVariableMapa}
            onExportarPng={handleExportarPng}
          />
        );
      case "capas":
        return (
          <div className="p-3">
            <GeovisorControles
              capas={capas}
              onToggleCapa={handleToggleCapa}
              variableMapa={variableMapa}
              anioHurto={anioHurto}
              onAnioHurtoChange={setAnioHurto}
              onAbrirTableroHurtos={() => useGeovisorLayoutStore.getState().openView("hurtos")}
            />
          </div>
        );
      case "mesas":
        return (
          <GeovisorMesasDirectorio
            mesas={mesasGeovisor}
            mesaSeleccionadaId={mesaIdSeleccionada}
            onSelectMesa={handleSelectMesa}
            onLocalizarEnMapa={handleLocalizarMesaEnMapa}
          />
        );
      case "ficha":
        return (
          <GeovisorFichaMesa
            mesaSeleccionada={mesaActiva}
            onCerrarMesa={() => setMesaIdSeleccionada(null)}
            onAbrirPanelMesa={handleAbrirPanelMesa}
          />
        );
      case "territorio":
        return (
          <div className="p-3">
            <GeovisorBiSidebar
              territorioId={territorioId}
              onSelectTerritorio={handleSelectTerritorio}
              variableMapa={variableMapa}
              onOpenDetalleDrawer={handleOpenDetalleDrawer}
            />
          </div>
        );
      case "datagrid":
        return (
          <div className="p-3">
            <MesasDataGrid
              mesas={mesasGeovisor}
              seleccionada={mesaIdSeleccionada}
              onSeleccionar={handleSelectMesa}
              onAbrirPanelMesa={handleAbrirPanelMesa}
              onLocalizarEnMapa={handleLocalizarMesaEnMapa}
              modoVista={modoVistaMesas}
              onModoVistaChange={setModoVistaMesas}
            />
          </div>
        );
      case "graficos":
        return (
          <div className="p-3">
            <GeovisorCharts
              territorioId={territorioId}
              variableMapa={variableMapa}
              onTerritorioChange={handleSelectTerritorio}
              onVariableChange={setVariableMapa}
            />
          </div>
        );
      case "hurtos":
        return (
          <div className="h-full overflow-y-auto">
            <GeovisorHurtosPanel
              delitoSeleccionado={delitoHurto}
              onDelitoChange={(del) => {
                setDelitoHurto(del);
                if (del === "hurto_motocicletas") {
                  setCapas((c) => ({ ...c, hurtoMotocicletas: true, hurtoResidencias: false, hurtoComercio: false }));
                } else if (del === "hurto_residencias") {
                  setCapas((c) => ({ ...c, hurtoMotocicletas: false, hurtoResidencias: true, hurtoComercio: false }));
                } else if (del === "hurto_comercio") {
                  setCapas((c) => ({ ...c, hurtoMotocicletas: false, hurtoResidencias: false, hurtoComercio: true }));
                }
              }}
              anioSeleccionado={anioHurto}
              onAnioChange={setAnioHurto}
              onActivarCapaMapa={(del) => {
                if (del.includes("moto")) {
                  setCapas((c) => ({ ...c, hurtoMotocicletas: true, hurtoResidencias: false, hurtoComercio: false }));
                  setDelitoHurto("hurto_motocicletas");
                } else if (del.includes("resid")) {
                  setCapas((c) => ({ ...c, hurtoMotocicletas: false, hurtoResidencias: true, hurtoComercio: false }));
                  setDelitoHurto("hurto_residencias");
                } else if (del.includes("comerc")) {
                  setCapas((c) => ({ ...c, hurtoMotocicletas: false, hurtoResidencias: false, hurtoComercio: true }));
                  setDelitoHurto("hurto_comercio");
                }
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      {/* WORKSPACE PRINCIPAL: 4 PANELES ACOPLADOS CON PESTAÑAS (estilo IDE) */}
      <GeovisorWorkspaceLayout
        topSlot={<GeovisorDockHost dock="top" renderView={renderView} />}
        leftSlot={<GeovisorDockHost dock="left" renderView={renderView} />}
        centerSlot={
          <MapaCartagena
            ref={mapaRef}
            onSelectTerritorio={handleSelectTerritorio}
            selectedTerritorioId={territorioId}
            barrioSeleccionado={barrioSeleccionado}
            onSelectBarrio={handleSelectBarrio}
            variableMapa={variableMapa}
            capasVisibles={capas}
            mesas={mesasDelTerritorio}
            mesaSeleccionadaId={mesaIdSeleccionada}
            onSelectMesa={handleSelectMesa}
            anioHurto={anioHurto}
            delitoHurto={delitoHurto}
            onSelectHurto={() => useGeovisorLayoutStore.getState().openView("hurtos")}
          />
        }
        rightSlot={<GeovisorDockHost dock="right" renderView={renderView} />}
        bottomSlot={<GeovisorDockHost dock="bottom" renderView={renderView} />}
      />
    </div>
  );
}
