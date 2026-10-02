import { v4 as uuid } from "uuid";
export const ORIGEN_FORMULARIOS = "https://seguridadhumanaintegral.org";
export function generarSlug(titulo: string): string {
  const base =
    titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-")
      .slice(0, 60)
      .replace(/-$/, "") || "formulario";
  // UUID evita colisiones cuando varios formularios se crean en el mismo milisegundo.
  return `${base}-${uuid().slice(0, 8)}`;
}
export function urlFormulario(slug: string): string {
  return `${ORIGEN_FORMULARIOS}/f/${encodeURIComponent(slug)}`;
}
export function enlacesCompartir(titulo: string, url: string) {
  return {
    whatsapp: `https://wa.me/?${new URLSearchParams({ text: `Participa en "${titulo}"\n${url}` })}`,
    telegram: `https://t.me/share/url?${new URLSearchParams({ url, text: titulo })}`,
    correo: `mailto:?${new URLSearchParams({ subject: titulo, body: `Te invito a participar:\n${url}` })}`,
    qr: `https://api.qrserver.com/v1/create-qr-code/?${new URLSearchParams({ size: "200x200", data: url })}`,
  };
}
