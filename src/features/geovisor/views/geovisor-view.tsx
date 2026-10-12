"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarMesasGeovisor, type MesaGeovisor } from "../services/mesas-geovisor-api";
import { usePanels } from "@/core/panels/panel-store";
import { GeovisorWorkspaceLayout } from "../components/geovisor-workspace-layout";
import { GeovisorTopShelf } from "../components/geovisor-top-shelf";
import { GeovisorLeftDock } from "../components/geovisor-left-dock";
import { GeovisorRightDock } from "../components/geovisor-right-dock";
import { GeovisorBottomDock } from "../components/geovisor-bottom-dock";
import type { CapasConfig } from "../components/geovisor-controles";
import type { VariableMapa } from "../data/estadisticas.data";
import type { MapaCartagenaHandle } from "../components/mapa-cartagena";
import { useGeovisorLayoutStore } from "../state/geovisor-layout-store";

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

  const [capas, setCapas] = useState<CapasConfig>({
    localidades: true,
    corregimientos: true,
    barrios: true,
    puntos: true,
    etiquetas: true,
    isocronas: false,
  });

  const handleToggleCapa = useCallback((capa: keyof CapasConfig) => {
    setCapas((prev) => ({ ...prev, [capa]: !prev[capa] }));
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

  // Al seleccionar una mesa, abre el dock derecho si estaba cerrado para ver la ficha
  const handleSelectMesa = useCallback((mesaId: string | null) => {
    setMesaIdSeleccionada(mesaId);
    if (mesaId) {
      useGeovisorLayoutStore.getState().setPanelOpen("right", true);
    }
  }, []);

  const handleLocalizarMesaEnMapa = useCallback((mesa: MesaGeovisor) => {
    setMesaIdSeleccionada(mesa.id);
    useGeovisorLayoutStore.getState().setPanelOpen("right", true);
    if (mesa.territorio_codigo) {
      setTerritorioId(mesa.territorio_codigo);
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

  return (
    <div className="container-fluid space-y-3 py-3 md:py-4">
      {/* WORKSPACE PRINCIPAL: 4 PANELES ACOPLADOS TIPO IDE (Tiling Docking System) */}
      <GeovisorWorkspaceLayout
        topSlot={
          <GeovisorTopShelf
            territorioId={territorioId}
            onTerritorioChange={handleSelectTerritorio}
            variableMapa={variableMapa}
            onVariableChange={setVariableMapa}
            onExportarPng={handleExportarPng}
          />
        }
        leftSlot={
          <GeovisorLeftDock
            capas={capas}
            onToggleCapa={handleToggleCapa}
            variableMapa={variableMapa}
            mesas={mesasGeovisor}
            mesaSeleccionadaId={mesaIdSeleccionada}
            onSelectMesa={handleSelectMesa}
            onLocalizarEnMapa={handleLocalizarMesaEnMapa}
          />
        }
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
          />
        }
        rightSlot={
          <GeovisorRightDock
            mesaSeleccionada={mesaActiva}
            onCerrarMesa={() => setMesaIdSeleccionada(null)}
            onAbrirPanelMesa={handleAbrirPanelMesa}
            territorioId={territorioId}
            onSelectTerritorio={handleSelectTerritorio}
            variableMapa={variableMapa}
            onOpenDetalleDrawer={handleOpenDetalleDrawer}
          />
        }
        bottomSlot={
          <GeovisorBottomDock
            mesas={mesasGeovisor}
            mesaSeleccionadaId={mesaIdSeleccionada}
            onSeleccionarMesa={handleSelectMesa}
            onLocalizarEnMapa={handleLocalizarMesaEnMapa}
            onAbrirPanelMesa={handleAbrirPanelMesa}
            territorioId={territorioId}
            onTerritorioChange={handleSelectTerritorio}
            variableMapa={variableMapa}
            onVariableChange={setVariableMapa}
          />
        }
      />

      {/* Footer de Metadatos de Fuentes Oficiales */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5 text-xs text-[var(--text-tertiary)]">
        <span>
          Fuentes oficiales: DANE 2025 • Policía Nacional / CCV (Ene–Sep 2025) • Alcaldía Mayor de Cartagena • Catastro Distrital.
        </span>
        <span>
          POLIS SIG Studio • 4 Paneles Acoplados • 33 Mesas Territoriales • 217 Barrios
        </span>
      </div>
    </div>
  );
}
