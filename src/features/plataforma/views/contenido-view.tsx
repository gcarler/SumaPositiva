"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanels } from "@/core/panels/panel-store";
import { plataformaApi } from "../services/plataforma-api";
import { EstadoConsulta } from "../components/estado-consulta";
import { puedeEditar } from "../models/acceso";
export function ContenidoView() {
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();
  const fases = useQuery({
    queryKey: ["plataforma", "fases"],
    queryFn: plataformaApi.fases,
  });
  const lineas = useQuery({
    queryKey: ["plataforma", "lineas"],
    queryFn: plataformaApi.lineas,
  });
  const aportes = useQuery({
    queryKey: ["plataforma", "aportes"],
    queryFn: () => plataformaApi.aportes(),
  });
  return (
    <>
      <PageHeader
        title="Contenido de la política"
        description="Fases, líneas estratégicas y aportes registrados en el sistema."
        action={
          puedeEditar(sesion, "contenido") && (
            <Button onClick={() => openPanel("fases-control", {})}>
              Gestionar fases y participación
            </Button>
          )
        }
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fases</h2>
        <EstadoConsulta
          cargando={fases.isPending}
          error={fases.error}
          reintentar={fases.refetch}
        />
        <ul className="space-y-3">
          {fases.data?.map((f) => (
            <li key={f.id} className="rounded-xl border border-border p-4">
              <h3 className="font-medium">{f.nombre}</h3>
              <p className="text-sm text-text-secondary">
                {f.estado} · {f.progreso_porcentaje}% de avance
              </p>
            </li>
          ))}
        </ul>
        {fases.data?.length === 0 && <p>No hay fases configuradas.</p>}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Líneas estratégicas</h2>
        <EstadoConsulta
          cargando={lineas.isPending}
          error={lineas.error}
          reintentar={lineas.refetch}
        />
        <ul className="space-y-3">
          {lineas.data?.map((l) => (
            <li key={l.id} className="rounded-xl border border-border p-4">
              <h3 className="font-medium">{l.titulo}</h3>
              <p className="text-sm text-text-secondary">{l.descripcion}</p>
              <p className="text-xs text-text-secondary">{l.entidad_lider}</p>
            </li>
          ))}
        </ul>
        {lineas.data?.length === 0 && <p>No hay líneas registradas.</p>}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Aportes ciudadanos</h2>
        <EstadoConsulta
          cargando={aportes.isPending}
          error={aportes.error}
          reintentar={aportes.refetch}
        />
        <ul className="space-y-3">
          {aportes.data?.elementos.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-4">
              <h3 className="font-medium">{a.titulo}</h3>
              <p className="text-sm text-text-secondary">
                {a.tipo_aporte} · {a.estado}
              </p>
            </li>
          ))}
        </ul>
        {aportes.data?.total === 0 && <p>No hay aportes registrados.</p>}
      </section>
    </>
  );
}
