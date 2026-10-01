/** Explicit demonstration adapter. Never substitutes mock data for a failed API request.
 * Server persistence requires its own matching DTO, permission and upload contract. */
import {
  useFormulariosStore,
  type DatosRespuesta,
} from "../state/formularios-store";
import type { DatosFormulario, Formulario } from "../models/formulario";
import { calcularAnalitica } from "./formulario-analitica";
export async function listarFormularios() {
  return useFormulariosStore.getState().formularios;
}
export async function obtenerFormulario(id: string) {
  const form = useFormulariosStore
    .getState()
    .formularios.find((f) => f.id === id);
  if (!form) throw new Error("Formulario no encontrado.");
  return form;
}
export async function crearFormulario(data: DatosFormulario) {
  return useFormulariosStore.getState().crearFormulario(data);
}
export async function actualizarFormulario(
  id: string,
  data: Partial<Formulario>,
) {
  useFormulariosStore.getState().actualizarFormulario(id, data);
  return obtenerFormulario(id);
}
export async function obtenerAnalitica(id: string) {
  const form = await obtenerFormulario(id);
  return calcularAnalitica(form, useFormulariosStore.getState().respuestas);
}
export async function enviarRespuesta(data: DatosRespuesta) {
  useFormulariosStore.getState().enviarRespuesta(data);
}
