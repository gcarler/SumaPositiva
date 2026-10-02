import { z } from "zod";
import { apiFetch, setBearerToken } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  Formulario,
  RespuestaCiudadana,
  ValoresRespuesta,
} from "../models/formulario";
import { formularioSchema } from "./formulario-schema";
import { fotosSchema } from "./fotos-respuesta";
const prefijo = "/formularios";
const geoRespuestaSchema = z.object({
  tipo: z.literal("ubicacion_geografica"),
  valor: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    barrio: z.string().optional(),
    fotos: fotosSchema.optional(),
  }),
});
const respuestaSchema = z.object({
  id: z.string(),
  formulario_id: z.string(),
  sujeto_id: z.string(),
  datos_respuesta: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), geoRespuestaSchema]),
  ),
  datos_enfoque: z.record(z.string(), z.unknown()),
  creado_en: z.string(),
});
async function sesionParaResponder(forzarAnonimo = false): Promise<string> {
  const sesion = useSesionStore.getState().sesion;
  if (
    sesion?.token &&
    sesion.expiraEn &&
    Date.parse(sesion.expiraEn) > Date.now() &&
    (!forzarAnonimo || !sesion.usuarioId)
  ) {
    setBearerToken(sesion.token);
    return sesion.token;
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
  if (!forzarAnonimo || !sesion?.usuarioId)
    useSesionStore
      .getState()
      .setSesionAnonima(
        datos.token_acceso,
        datos.sesion_id,
        new Date(Date.now() + datos.expira_en_segundos * 1000).toISOString(),
      );
  return datos.token_acceso;
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
      await apiFetch<unknown>(
        `${prefijo}/constructor/${form.idPersistido ?? form.id}`,
        {
          method: "PUT",
          body: form,
          retry: { retries: 0 },
        },
      ),
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
  respuestas: async (
    id: string,
    idPersistido?: string,
  ): Promise<RespuestaCiudadana[]> => {
    const filas = z
      .array(respuestaSchema)
      .parse(
        await apiFetch<unknown>(`${prefijo}/${idPersistido ?? id}/respuestas`),
      );
    return filas.map((r) => ({
      id: r.id,
      formularioId: id,
      sesionId: r.sujeto_id,
      respuestas: Object.fromEntries(
        Object.entries(r.datos_respuesta).map(([k, v]) => [
          k,
          typeof v === "object" && !Array.isArray(v)
            ? JSON.stringify({
                ...v,
                type: "Point",
                coordinates: [v.valor.lng, v.valor.lat],
                barrio: v.valor.barrio,
                fotos: v.valor.fotos ?? [],
              })
            : v,
        ]),
      ),
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
    const token = await sesionParaResponder(
      form.configuracion.respuestaAnonima,
    );
    respuestaSchema.parse(
      await apiFetch<unknown>(
        `${prefijo}/${form.idPersistido ?? form.id}/respuestas`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: {
            datos_respuesta: respuestas,
            datos_enfoque: {
              enfoqueDiferencial: enfoqueDiferencial ?? "Ninguno",
            },
          },
          retry: { retries: 0 },
        },
      ),
    );
  },
};
