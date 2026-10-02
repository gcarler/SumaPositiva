import { z } from "zod";
import { apiFetch } from "@/core/http/api-client";
export const sublineaSchema = z.object({
  codigo: z.string().trim().min(1).max(50),
  titulo: z.string().trim().min(1).max(300),
  descripcion: z.string().max(10000),
  meta_cuatrienal: z.string().nullable(),
  indicador_nombre: z.string().nullable(),
  actor_coresponsable: z.string().nullable(),
});
export const lineaInputSchema = z
  .object({
    codigo: z.string().regex(/^LE-[0-9]{2,}$/, "Usa un código como LE-01"),
    titulo: z.string().trim().min(1, "Escribe un título").max(300),
    descripcion: z.string().trim().min(1, "Describe la línea").max(10000),
    problema_abordado: z.string(),
    objetivo_especifico: z.string(),
    fase_id: z.string().uuid("Selecciona una fase"),
    dimension_id: z.string().uuid("Selecciona una dimensión"),
    entidad_lider: z.string().trim().min(1).max(250),
    fuentes_financiacion: z.array(z.string()).min(1, "Selecciona una fuente"),
    costo_estimado: z
      .string()
      .regex(
        /^\d{1,16}(\.\d{1,2})?$/,
        "Usa un valor COP positivo con máximo dos decimales",
      ),
    activa: z.boolean(),
    sublineas: z.array(sublineaSchema).max(200),
  })
  .superRefine((data, ctx) => {
    const usados = new Set<string>();
    data.sublineas.forEach((s, i) => {
      if (
        !s.codigo.startsWith(data.codigo + ".") ||
        !/^[1-9][0-9]*$/.test(s.codigo.slice(data.codigo.length + 1)) ||
        usados.has(s.codigo)
      )
        ctx.addIssue({
          code: "custom",
          path: ["sublineas", i, "codigo"],
          message: "Código hijo único, por ejemplo LE-01.1",
        });
      usados.add(s.codigo);
    });
  });
const lineaRead = z.object({
  id: z.string(),
  codigo: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  fase_id: z.string(),
  dimension_id: z.string().nullable(),
  problema_abordado: z.string().nullable(),
  objetivo_especifico: z.string().nullable(),
  entidad_lider: z.string(),
  fuentes_financiacion: z.array(z.string()),
  costo_estimado: z.union([z.string(), z.number()]).transform(String),
  activa: z.boolean(),
  sublineas: z.array(sublineaSchema),
});
const dimension = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  activa: z.boolean(),
});
const fase = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
});
export type LineaInput = z.infer<typeof lineaInputSchema>;
export type LineaPersistida = z.infer<typeof lineaRead>;
export const LINEAS_KEY = ["politicas", "lineas-gestion"] as const;
export const lineasApi = {
  listar: async () =>
    z
      .array(lineaRead)
      .parse(await apiFetch<unknown>("/politicas/lineas/gestion")),
  dimensiones: async () =>
    z.array(dimension).parse(await apiFetch<unknown>("/politicas/dimensiones")),
  fases: async () =>
    z.array(fase).parse(await apiFetch<unknown>("/politicas/fases")),
  guardar: async (datos: LineaInput, id?: string) =>
    lineaRead.parse(
      await apiFetch<unknown>(
        id ? `/politicas/lineas/${id}` : "/politicas/lineas",
        { method: id ? "PUT" : "POST", body: datos, retry: { retries: 0 } },
      ),
    ),
  eliminar: (id: string) =>
    apiFetch<{ mensaje: string }>(`/politicas/lineas/${id}`, {
      method: "DELETE",
      retry: { retries: 0 },
    }),
};
