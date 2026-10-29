"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { TERRITORIOS_CARTAGENA } from "@/features/geovisor/data/territorios.data";
import { useSesionStore, tienePermiso } from "@/features/sesion/state/session-store";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import { modulosPermitidos } from "../models/acceso";
import { ICONOS } from "../components/plataforma-sidebar";
import { EstadoConsulta } from "../components/estado-consulta";
import { plataformaApi } from "../services/plataforma-api";
import { CollectionLayout, CollectionViewToggle } from "@/shared/ui/collection-view";
import { useCollectionView } from "@/core/preferences/collection-view-store";
export function DashboardView() {
  const [vista, setVista] = useCollectionView("dashboard");
  const sesion = useSesionStore((s) => s.sesion);
  const puedeLeerUsuarios = tienePermiso(sesion, "usuarios:leer");
  const usuariosQuery = useQuery({
    queryKey: ["identidad", "usuarios", "conteo-dashboard"],
    queryFn: () => identidadApi.usuarios("", 0, 1),
    enabled: puedeLeerUsuarios,
  });
  const formularios = useFormulariosStore((s) => s.formularios);
  const mesas = useMesasStore((s) => s.mesas);
  const alertas = useQuery({
    queryKey: ["plataforma", "alertas"],
    queryFn: () => plataformaApi.aportes(true),
  });
  const proximas = mesas
    .filter(
      (m) =>
        m.estado === "programada" &&
        Boolean(m.fecha && m.fecha !== "Por definir" && !isNaN(Date.parse(m.fecha)) && Date.parse(m.fecha) >= Date.now()),
    )
    .sort((a, b) => Date.parse(a.fecha ?? "") - Date.parse(b.fecha ?? ""));
  const territorio = [...TERRITORIOS_CARTAGENA].sort(
    (a, b) => b.aportesCiudadanos - a.aportesCiudadanos,
  )[0];

  const totalUsuarios = usuariosQuery.data?.total;

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
      valor: usuariosQuery.isLoading
        ? "..."
        : totalUsuarios !== undefined
          ? totalUsuarios
          : puedeLeerUsuarios
            ? 0
            : "Acceso restringido",
      detalle: puedeLeerUsuarios
        ? "Cuentas registradas en la base de datos distrital."
        : "Requiere permiso usuarios:leer para consultar el total.",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Gestión interna"
        title="Dashboard"
        description="Resumen de actividad y accesos disponibles para tu rol."
      />
      <CollectionViewToggle value={vista} onValueChange={setVista} label="Vista del dashboard" />
      <CollectionLayout view={vista} className="xl:grid-cols-4">
        {tarjetas.map((t) => (
          <section
            key={t.titulo}
            className={`min-w-0 rounded-xl border border-border bg-surface-1 p-5 ${vista === "lista" ? "grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]" : "space-y-3"}`}
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
      </CollectionLayout>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Accesos rápidos
        </h2>
        <CollectionLayout view={vista}>
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
        </CollectionLayout>
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
            <ul className={vista === "tarjetas" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
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
          <ul className={vista === "tarjetas" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
            {proximas.slice(0, 5).map((m) => (
              <li key={m.id} className="rounded-xl border border-border p-4">
                <p>{m.nombre}</p>
                <p className="text-sm text-text-secondary">
                  {m.fecha && m.fecha !== "Por definir" && !isNaN(Date.parse(m.fecha))
                    ? new Date(m.fecha).toLocaleDateString("es")
                    : "Por definir"}{" "}
                  · {m.lugar}
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
