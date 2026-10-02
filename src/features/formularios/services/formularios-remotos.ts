import { z } from "zod";
import { apiFetch, setBearerToken } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  Formulario,
  RespuestaCiudadana,
  ValoresRespuesta,
} from "../models/formulario";
import { formularioSchema } from "./formulario-schema";
const prefijo = "/formularios";
const respuestaSchema = z.object({
  id: z.string(),
  formulario_id: z.string(),
  sujeto_id: z.string(),
  datos_respuesta: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string())]),
  ),
  datos_enfoque: z.record(z.string(), z.unknown()),
  creado_en: z.string(),
});
async function sesionParaResponder() {
  const sesion = useSesionStore.getState().sesion;
  if (
    sesion?.token &&
    sesion.expiraEn &&
    Date.parse(sesion.expiraEn) > Date.now()
  ) {
    setBearerToken(sesion.token);
    return;
  }
  const datos = z
    .object({
      token_acceso: z.string(),
      sesion_id: z.string(),
      expira_en_segundos: z.number(),
    })
    .parse(
      await apiFetch<unknown>("/sesion/anonima", {
        method: "POST",
        retry: { retries: 0 },
      }),
    );
  useSesionStore
    .getState()
    .setSesionAnonima(
      datos.token_acceso,
      datos.sesion_id,
      new Date(Date.now() + datos.expira_en_segundos * 1000).toISOString(),
    );
}
async function revalidar(form: Formulario): Promise<boolean> {
  // Caché derivada: la escritura ya está confirmada en PostgreSQL.
  try {
    await apiFetch("/api/formularios/revalidar", {
      baseUrl: "",
      method: "POST",
      body: { slug: form.configuracion.slug },
      retry: { retries: 0 },
    });
    return true;
  } catch {
    // No convertir una escritura confirmada en un fallo ni repetir el POST.
    return false;
  }
}
export const formulariosRemotos = {
  revalidar,
  listar: async (): Promise<Formulario[]> =>
    z
      .array(formularioSchema)
      .parse(await apiFetch<unknown>(`${prefijo}/constructor`)),
  crear: async (form: Formulario): Promise<Formulario> => {
    const guardado = formularioSchema.parse(
      await apiFetch<unknown>(`${prefijo}/constructor`, {
        method: "POST",
        body: form,
        retry: { retries: 0 },
      }),
    );
    return guardado;
  },
  actualizar: async (form: Formulario): Promise<Formulario> => {
    const guardado = formularioSchema.parse(
      await apiFetch<unknown>(`${prefijo}/constructor/${form.id}`, {
        method: "PUT",
        body: form,
        retry: { retries: 0 },
      }),
    );
    return guardado;
  },
  eliminar: async (id: string): Promise<void> => {
    await apiFetch(`${prefijo}/${id}`, {
      method: "DELETE",
      retry: { retries: 0 },
    });
  },
  publico: async (slug: string): Promise<Formulario> =>
    formularioSchema.parse(
      await apiFetch<unknown>(
        `${prefijo}/publicos/${encodeURIComponent(slug)}`,
      ),
    ),
  privado: async (slug: string): Promise<Formulario> =>
    formularioSchema.parse(
      await apiFetch<unknown>(
        `${prefijo}/constructor/slug/${encodeURIComponent(slug)}`,
      ),
    ),
  respuestas: async (id: string): Promise<RespuestaCiudadana[]> => {
    const filas = z
      .array(respuestaSchema)
      .parse(await apiFetch<unknown>(`${prefijo}/${id}/respuestas`));
    return filas.map((r) => ({
      id: r.id,
      formularioId: r.formulario_id,
      sesionId: r.sujeto_id,
      respuestas: r.datos_respuesta,
      enfoqueDiferencial:
        typeof r.datos_enfoque.enfoqueDiferencial === "string"
          ? r.datos_enfoque.enfoqueDiferencial
          : undefined,
      enviadoEn: r.creado_en,
    }));
  },
  enviar: async (
    form: Formulario,
    respuestas: ValoresRespuesta,
    enfoqueDiferencial?: string,
  ): Promise<void> => {
    await sesionParaResponder();
    respuestaSchema.parse(
      await apiFetch<unknown>(`${prefijo}/${form.id}/respuestas`, {
        method: "POST",
        body: {
          datos_respuesta: respuestas,
          datos_enfoque: {
            enfoqueDiferencial: enfoqueDiferencial ?? "Ninguno",
          },
        },
        retry: { retries: 0 },
      }),
    );
  },
};
