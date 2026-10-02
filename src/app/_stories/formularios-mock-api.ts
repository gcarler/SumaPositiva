import { formulariosRemotos } from "@/features/formularios/services/formularios-remotos";
import { useFormulariosStore } from "@/features/formularios/state/formularios-store";
/** Transporte aislado de historias. Nunca realiza peticiones al backend real. */
export function simularApiFormularios() {
  const anterior = { ...formulariosRemotos };
  Object.assign(formulariosRemotos, {
    revalidar: async () => true,
    listar: async () =>
      useFormulariosStore
        .getState()
        .formularios.filter((f) => f.origenDatos === "api"),
    crear: async (form: Parameters<typeof formulariosRemotos.crear>[0]) =>
      structuredClone(form),
    actualizar: async (
      form: Parameters<typeof formulariosRemotos.actualizar>[0],
    ) => structuredClone(form),
    eliminar: async () => {},
    respuestas: async (id: string) =>
      structuredClone(
        useFormulariosStore
          .getState()
          .respuestas.filter((r) => r.formularioId === id),
      ),
    enviar: async () => {},
  } satisfies Partial<typeof formulariosRemotos>);
  return () => Object.assign(formulariosRemotos, anterior);
}
