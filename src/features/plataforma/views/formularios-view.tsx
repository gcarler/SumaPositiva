"use client";
import { PageHeader } from "@/shared/ui/page-header";
import { Notice } from "@/shared/ui/notice";
import { FormulariosContenido } from "@/features/formularios/panels/formularios-panel";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { puedeEditar } from "../models/acceso";
export function FormulariosView() {
  const sesion = useSesionStore((s) => s.sesion);
  const lectura = !puedeEditar(sesion, "formularios");
  return (
    <>
      <PageHeader
        eyebrow="Instrumentos de participación"
        title="Formularios"
        description="Construye formularios, consulta respuestas y revisa resultados."
      />
      {lectura && (
        <Notice title="Solo lectura">
          Tu rol o tus permisos permiten consultar formularios y su analítica.
        </Notice>
      )}
      <section aria-label="Gestión de formularios">
        <h2 className="sr-only">Formularios disponibles</h2>
        <FormulariosContenido soloLectura={lectura} />
      </section>
    </>
  );
}
