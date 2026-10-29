"use client";

import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { usePanels } from "@/core/panels/panel-store";
import { useResumenTestimonios } from "@/features/testimonios/services/use-testimonios-queries";
import { TestimoniosModeracionContenido } from "@/features/testimonios/panels/testimonios-moderacion-panel";
import { EstadoConsulta } from "../components/estado-consulta";

export function TestimoniosPlataformaView() {
  const { openPanel } = usePanels();
  const resumen = useResumenTestimonios();

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        title="Gestión y Moderación de Testimonios"
        description="Revisa los relatos comunitarios, registra testimonios institucionales o territoriales y gestiona su curaduría y publicación."
        action={
          <Button
            variant="ember"
            size="sm"
            onClick={() => openPanel("testimonio-editor", {})}
            className="gap-1.5"
          >
            <Plus className="size-4" aria-hidden="true" />
            Registrar Testimonio
          </Button>
        }
      />

      <EstadoConsulta
        cargando={resumen.isPending}
        error={resumen.error}
        reintentar={resumen.refetch}
      />

      {resumen.data && (
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metrica titulo="Borradores" valor={resumen.data.borradores ?? 0} />
          <Metrica titulo="Pendientes" valor={resumen.data.pendientes} />
          <Metrica titulo="Aprobados" valor={resumen.data.aprobados} />
          <Metrica titulo="Destacados" valor={resumen.data.destacados} />
          <Metrica titulo="Rechazados" valor={resumen.data.rechazados} />
        </dl>
      )}

      <section
        aria-label="Cola de moderación de testimonios"
        className="min-w-0 rounded-xl border border-border bg-surface-0"
      >
        <TestimoniosModeracionContenido />
      </section>
    </div>
  );
}

function Metrica({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <dt className="text-sm text-text-secondary">{titulo}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
        {valor}
      </dd>
    </div>
  );
}
