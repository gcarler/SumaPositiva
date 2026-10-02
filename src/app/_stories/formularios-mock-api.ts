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
    enviar: async (
      form: Parameters<typeof formulariosRemotos.enviar>[0],
      respuestas: Parameters<typeof formulariosRemotos.enviar>[1],
    ) => {
      useFormulariosStore.setState((s) => ({
        formularios: s.formularios.map((f) =>
          f.id === form.id
            ? { ...f, respuestasCount: f.respuestasCount + 1 }
            : f,
        ),
        respuestas: [
          ...s.respuestas,
          {
            id: crypto.randomUUID(),
            formularioId: form.id,
            respuestas: structuredClone(respuestas),
            enviadoEn: new Date().toISOString(),
          },
        ],
      }));
    },
  } satisfies Partial<typeof formulariosRemotos>);
  return () => Object.assign(formulariosRemotos, anterior);
}
