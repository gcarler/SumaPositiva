"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Compass } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { plataformaApi } from "../services/plataforma-api";
import { EstadoConsulta } from "../components/estado-consulta";
import { GeovisorHurtosPanel } from "@/features/geovisor/components/geovisor-hurtos-panel";
import { CollectionViewToggle } from "@/shared/ui/collection-view";
import { useCollectionView } from "@/core/preferences/collection-view-store";

const MapaApi = dynamic(
  () =>
    import("@/features/geovisor/components/mapa-territorios-api").then(
      (m) => m.MapaTerritoriosApi,
    ),
  { ssr: false, loading: () => <p role="status">Preparando mapa…</p> },
);

export function GeovisorAdministrativoView() {
  const [vista, setVista] = useCollectionView("geovisor");
  const [seleccion, setSeleccion] = useState<string>("");
  const territorios = useQuery({
    queryKey: ["plataforma", "territorios"],
    queryFn: plataformaApi.territorios,
  });
  const geometria = useQuery({
    queryKey: ["plataforma", "geometria"],
    queryFn: plataformaApi.geometria,
  });
  const territorio = territorios.data?.find((t) => t.id === seleccion);

  return (
    <>
      <PageHeader
        title="Geovisor administrativo"
        description="División territorial y geometrías registradas en el sistema."
      />

      {/* Sección principal: Gestor y explorador GeoJSON del Drive SIEDCO */}
      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Geovisor y Gestor de Capas GeoJSON — Drive SIEDCO (2018–2026)
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Herramienta integral de exploración tabular, pivot analítico y gestor de capas GeoJSON delictivas en Cartagena.
            </p>
          </div>
          <Button asChild variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
            <Link href="/geovisor">
              <span>Abrir Workbench Geovisor Pantalla Completa</span>
              <Compass className="size-3.5" />
            </Link>
          </Button>
        </div>
        <GeovisorHurtosPanel />
      </section>

      <section className="space-y-4" aria-label="División territorial registrada">
        <EstadoConsulta
          cargando={geometria.isPending}
          error={geometria.error}
          reintentar={geometria.refetch}
        />
        {geometria.data &&
          (geometria.data.features.length ? (
            <MapaApi datos={geometria.data} seleccionar={setSeleccion} />
          ) : (
            <Notice title="No hay geometrías registradas">
              El mapa aparecerá cuando existan geometrías en la base.
            </Notice>
          ))}
        <h2 className="text-lg font-semibold">Territorios registrados</h2>
        <CollectionViewToggle value={vista} onValueChange={setVista} label="Vista del catálogo territorial" />
        <EstadoConsulta
          cargando={territorios.isPending}
          error={territorios.error}
          reintentar={territorios.refetch}
        />
        <ul className={vista === "tarjetas" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {territorios.data?.map((t) => (
            <li key={t.id} className="min-w-0">
              <Button
                variant={seleccion === t.id ? "secondary" : "outline"}
                className="h-auto w-full justify-start whitespace-normal p-4 text-left"
                onClick={() => setSeleccion(t.id)}
                aria-pressed={seleccion === t.id}
              >
                <span className="min-w-0 space-y-1">
                  <span className="block font-semibold">{t.nombre}</span>
                  <span className="block text-xs text-text-secondary">{t.codigo} · {t.tipo_territorio}</span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
        {territorios.data?.length === 0 && (
          <p>No hay territorios registrados.</p>
        )}
        {territorio && (
          <div
            role="status"
            className="space-y-2 rounded-xl border border-border p-4"
          >
            <h3 className="font-semibold">{territorio.nombre}</h3>
            <p className="text-sm text-text-secondary">
              Código: {territorio.codigo} · {territorio.tipo_territorio}
            </p>
            <p className="text-sm text-text-secondary">
              Población estimada:{" "}
              {territorio.poblacion_estimada?.toLocaleString("es") ??
                "Sin dato"}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
