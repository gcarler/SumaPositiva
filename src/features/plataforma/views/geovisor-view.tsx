"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { plataformaApi } from "../services/plataforma-api";
import { EstadoConsulta } from "../components/estado-consulta";
const MapaApi = dynamic(
  () =>
    import("@/features/geovisor/components/mapa-territorios-api").then(
      (m) => m.MapaTerritoriosApi,
    ),
  { ssr: false, loading: () => <p role="status">Preparando mapa…</p> },
);
export function GeovisorAdministrativoView() {
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
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Territorios registrados</h2>
        <EstadoConsulta
          cargando={territorios.isPending}
          error={territorios.error}
          reintentar={territorios.refetch}
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {territorios.data?.map((t) => (
            <li key={t.id} className="min-w-0">
              <Button
                variant={seleccion === t.id ? "secondary" : "outline"}
                className="h-auto w-full justify-start whitespace-normal p-4 text-left"
                onClick={() => setSeleccion(t.id)}
                aria-pressed={seleccion === t.id}
              >
                {t.nombre} · {t.tipo_territorio}
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
