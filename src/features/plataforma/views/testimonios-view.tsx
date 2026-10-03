"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { useResumenTestimonios } from "@/features/testimonios/services/use-testimonios-queries";
import { TestimoniosModeracionContenido } from "@/features/testimonios/panels/testimonios-moderacion-panel";
import { EstadoConsulta } from "../components/estado-consulta";

export function TestimoniosPlataformaView() {
  const resumen = useResumenTestimonios();

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        title="Moderación de Testimonios"
        description="Revisa los relatos comunitarios, aplica las salvaguardas institucionales y gestiona su publicación."
      />

      <EstadoConsulta
        cargando={resumen.isPending}
        error={resumen.error}
        reintentar={resumen.refetch}
      />

      {resumen.data && (
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
