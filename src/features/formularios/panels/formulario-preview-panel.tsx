"use client";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { useFormulariosStore } from "../state/formularios-store";
import { FormularioRuntime } from "../components/formulario-runtime";
import { validarFormulario } from "../services/formulario-engine";
export function FormularioPreviewPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: { borradorId: string };
}) {
  const { closeTop } = usePanels();
  const form = useFormulariosStore((s) => s.previews[props.borradorId]);
  const errors = form
    ? validarFormulario(form)
    : ["La vista previa no está disponible."];
  return (
    <PanelShell
      entryKey={entryKey}
      title="Vista Previa"
      subtitle={form?.titulo}
      crumbs={[{ label: "Formularios" }, { label: "Vista Previa" }]}
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="space-y-4 p-6">
        {errors.length ? (
          <div role="alert">
            <p>Completa el borrador para previsualizar:</p>
            <ul className="list-disc pl-4">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : (
          form && (
            <FormularioRuntime
              key={form.id}
              form={form}
              preview
              enviar={async () => {}}
            />
          )
        )}
      </div>
    </PanelShell>
  );
}
