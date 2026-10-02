import { z } from "zod";
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const fotoSchema = z.string().refine((valor) => {
  const m =
    /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(valor);
  if (!m || !m[1] || m[1].length % 4 !== 0) return false;
  const bytes =
    (m[1].length * 3) / 4 -
    (m[1].endsWith("==") ? 2 : m[1].endsWith("=") ? 1 : 0);
  return bytes > 0 && bytes <= MAX_FOTO_BYTES;
}, "Foto inválida o superior a 5 MB");
export const fotosSchema = z.array(fotoSchema).max(5);
export function leerFotos(valor: string | string[] | undefined): string[] {
  try {
    const r = fotosSchema.safeParse(
      typeof valor === "string" ? JSON.parse(valor) : valor,
    );
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}
export function errorFotos(fotos: unknown, max = 5): string | undefined {
  const r = fotosSchema.max(max).safeParse(fotos);
  return r.success
    ? undefined
    : `Adjunta hasta ${max} fotos válidas de máximo 5 MB, en JPG, PNG o WebP.`;
}
