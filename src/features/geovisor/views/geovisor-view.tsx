"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarMesasGeovisor } from "../services/mesas-geovisor-api";
import { PageHeader } from "@/shared/ui/page-header";
import { usePanels } from "@/core/panels/panel-store";
import { GeovisorKpiBar } from "../components/geovisor-kpi-bar";
import { GeovisorBiSidebar } from "../components/geovisor-bi-sidebar";
import { GeovisorControles, type CapasConfig } from "../components/geovisor-controles";
import { GeovisorCharts } from "../components/geovisor-charts";
import { MesasGeovisor } from "../components/mesas-geovisor";
import type { VariableMapa } from "../data/estadisticas.data";
import type { MapaCartagenaHandle } from "../components/mapa-cartagena";

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
    [openPanel],
  );

  const handleSelectBarrio = useCallback((barrioNombre: string) => {
    setBarrioSeleccionado(barrioNombre);
  }, []);

  const handleOpenDetalleDrawer = useCallback(
    (id: string) => {
      openPanel("territorio", { territorioId: id === "todas" ? "loc-1" : id });
    },
    [openPanel],
  );

  const mesasDelTerritorio = useMemo(() => {
    if (territorioId === "todas") return mesasGeovisor;
    return mesasGeovisor.filter((mesa) => mesa.territorio_codigo?.toLowerCase() === territorioId.toLowerCase());
  }, [mesasGeovisor, territorioId]);

  const handleExportarPng = useCallback(() => {
    mapaRef.current?.exportarPng();
  }, []);

  return (
    <div className="container-fluid space-y-4 py-5 md:py-6">
      <PageHeader
        eyebrow="Analítica Territorial Integral — POLIS BI"
        title="Geovisor Estadístico de Seguridad Humana de Cartagena"
        description="Plataforma de inteligencia territorial estilo Power BI / Tableau. Cruza 8 dimensiones estadísticas clave sobre las 3 Localidades, la Zona Corregimental e Insular y los 217 barrios catastrales de Cartagena de Indias."
      />

      {/* HEADER: Selector de Ámbito, Selector de Variable, Exportar PNG y 4 KPI Chips Globales */}
      <GeovisorKpiBar
        territorioId={territorioId}
        onTerritorioChange={handleSelectTerritorio}
        variableMapa={variableMapa}
        onVariableChange={setVariableMapa}
        onExportarPng={handleExportarPng}
      />

      {/* WORKSPACE PRINCIPAL TRIPARTITO: Controles SIG (Izq) + Mapa Coroplético (Centro) + Panel Analítico (Der) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 xl:grid-cols-12">
        {/* Columna Izquierda: Controles de Capas y Leyenda Dinámica (3 cols) */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4">
          <GeovisorControles
            capas={capas}
            onToggleCapa={handleToggleCapa}
            variableMapa={variableMapa}
          />
        </div>

        {/* Columna Central: Mapa Coroplético OpenLayers (5 cols en lg, 5 en xl) */}
        <div className="h-[600px] lg:col-span-5 lg:h-[720px] xl:col-span-5">
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
            onSelectMesa={setMesaIdSeleccionada}
          />
        </div>

        {/* Columna Derecha: Panel Analítico BI con KPIs, Barras CSS, Sparkline y Ranking (4 cols) */}
        <div className="lg:col-span-4 xl:col-span-4">
          <GeovisorBiSidebar
            territorioId={territorioId}
            onSelectTerritorio={handleSelectTerritorio}
            variableMapa={variableMapa}
            onOpenDetalleDrawer={handleOpenDetalleDrawer}
          />
        </div>
      </div>

      <MesasGeovisor
        mesas={mesasGeovisor}
        isLoading={false}
        isError={false}
        error={null}
        seleccionada={mesaIdSeleccionada}
        onSeleccionar={setMesaIdSeleccionada}
      />

      <section aria-label="Análisis estadístico territorial">
        <GeovisorCharts
          territorioId={territorioId}
          variableMapa={variableMapa}
          onTerritorioChange={handleSelectTerritorio}
          onVariableChange={setVariableMapa}
        />
      </section>

      {/* Footer de Metadatos de Fuentes Oficiales */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-tertiary)]">
        <span>
          Fuentes oficiales: DANE 2025 • Policía Nacional / CCV (Ene–Sep 2025) • Alcaldía Mayor de Cartagena • Catastro Distrital.
        </span>
        <span>
          POLIS BI Geovisor v2.0 • 9 territorios de análisis • 217 barrios
        </span>
      </div>
    </div>
  );
}
