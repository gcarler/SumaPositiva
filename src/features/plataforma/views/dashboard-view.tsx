"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { TERRITORIOS_CARTAGENA } from "@/features/geovisor/data/territorios.data";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { modulosPermitidos } from "../models/acceso";
import { ICONOS } from "../components/plataforma-sidebar";
import { EstadoConsulta } from "../components/estado-consulta";
import { plataformaApi } from "../services/plataforma-api";
export function DashboardView() {
  const sesion = useSesionStore((s) => s.sesion);
  const formularios = useFormulariosStore((s) => s.formularios);
  const mesas = useMesasStore((s) => s.mesas);
  const alertas = useQuery({
    queryKey: ["plataforma", "alertas"],
    queryFn: () => plataformaApi.aportes(true),
  });
  const proximas = mesas
    .filter(
      (m) => m.estado === "programada" && Date.parse(m.fecha) >= Date.now(),
    )
    .sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
  const territorio = [...TERRITORIOS_CARTAGENA].sort(
    (a, b) => b.aportesCiudadanos - a.aportesCiudadanos,
  )[0];
  const tarjetas = [
    {
      titulo: "Formularios activos",
      valor: formularios.filter((f) => f.estado === "activo").length,
      detalle: "Datos de demostración de esta sesión.",
    },
    {
      titulo: "Próximas mesas",
      valor: proximas.length,
      detalle: "Agenda de demostración; solo fechas futuras.",
    },
    {
      titulo: "Territorio más activo",
      valor: territorio?.nombre ?? "Sin datos",
      detalle: "Referencia de demostración por aportes.",
    },
    {
      titulo: "Usuarios registrados",
      valor: "Pendiente",
      detalle: "El total distrital aún no está conectado a este resumen.",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Gestión interna"
        title="Dashboard"
        description="Resumen de actividad y accesos disponibles para tu rol."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((t) => (
          <section
            key={t.titulo}
            className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-1 p-5"
          >
            <h2 className="text-sm font-medium text-text-secondary">
              {t.titulo}
            </h2>
            <p className="break-words text-xl font-semibold text-text-primary">
              {t.valor}
            </p>
            <p className="text-xs text-text-secondary">{t.detalle}</p>
          </section>
        ))}
      </div>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Accesos rápidos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modulosPermitidos(sesion)
            .filter((m) => m.id !== "dashboard")
            .map((m) => {
              const Icono = ICONOS[m.id];
              return (
                <Button
                  key={m.id}
                  asChild
                  variant="outline"
                  className="h-auto min-w-0 justify-start whitespace-normal p-5 text-left"
                >
                  <Link href={m.ruta}>
                    <Icono aria-hidden="true" className="size-8 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{m.titulo}</span>
                      <span className="mt-1 block text-sm font-normal text-text-secondary">
                        {m.descripcion}
                      </span>
                    </span>
                  </Link>
                </Button>
              );
            })}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Alertas ciudadanas recientes
        </h2>
        <EstadoConsulta
          cargando={alertas.isPending}
          error={alertas.error}
          reintentar={alertas.refetch}
        />
        {alertas.data &&
          (alertas.data.elementos.length ? (
            <ul className="space-y-2">
              {[...alertas.data.elementos]
                .sort(
                  (a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en),
                )
                .map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <p className="font-medium text-text-primary">{a.titulo}</p>
                    <p className="text-sm text-text-secondary">
                      {new Date(a.creado_en).toLocaleDateString("es")} ·{" "}
                      {a.estado}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">
              No hay alertas registradas.
            </p>
          ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Agenda próxima
        </h2>
        {proximas.length ? (
          <ul className="space-y-2">
            {proximas.slice(0, 5).map((m) => (
              <li key={m.id} className="rounded-xl border border-border p-4">
                <p>{m.nombre}</p>
                <p className="text-sm text-text-secondary">
                  {new Date(m.fecha).toLocaleDateString("es")} · {m.lugar}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">
            No hay mesas futuras en la agenda de demostración.
          </p>
        )}
      </section>
    </>
  );
}
