"use client";
import { useState } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { SearchField } from "@/shared/ui/search-field";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { usePanels } from "@/core/panels/panel-store";
import { puedeEditar } from "../models/acceso";
export function MesasGestionView() {
  const mesas = useMesasStore((s) => s.mesas);
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();
  const [busqueda, setBusqueda] = useState("");
  const editar = puedeEditar(sesion, "mesas");
  const lista = mesas.filter((m) =>
    `${m.nombre} ${m.entidad} ${m.lugar}`
      .toLocaleLowerCase("es")
      .includes(busqueda.toLocaleLowerCase("es")),
  );
  return (
    <>
      <PageHeader
        title="Mesas comunitarias"
        description="Consulta la agenda y los acuerdos; gestiona las mesas habilitadas para tu rol."
        action={
          editar && (
            <Button onClick={() => openPanel("mesa-editor", {})}>
              Crear mesa
            </Button>
          )
        }
      />
      <Notice title="Agenda de demostración">
        Las mesas creadas aquí son de prueba. La agenda local se restablece al
        recargar.
      </Notice>
      {!editar && (
        <Notice title="Solo lectura">
          Puedes consultar las mesas y sus acuerdos.
        </Notice>
      )}
      <SearchField
        label="Buscar mesas"
        value={busqueda}
        onValueChange={setBusqueda}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((m) => (
          <section
            key={m.id}
            className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-1 p-5"
          >
            <h2 className="break-words text-lg font-semibold text-text-primary">
              {m.nombre}
            </h2>
            <p className="text-sm text-text-secondary">
              {m.entidad} · {m.estado}
            </p>
            <p className="break-words text-sm text-text-secondary">
              {new Date(m.fecha).toLocaleDateString("es")} · {m.lugar}
            </p>
            <Button
              variant="outline"
              className="h-auto max-w-full whitespace-normal text-left"
              onClick={() =>
                openPanel("mesa", { mesaId: m.id, soloLectura: !editar })
              }
            >
              Ver mesa: {m.nombre}
            </Button>
          </section>
        ))}
      </div>
      {!lista.length && (
        <p className="text-sm text-text-secondary">No se encontraron mesas.</p>
      )}
    </>
  );
}
