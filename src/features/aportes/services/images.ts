/**
 * POLIS — Utilidades de imágenes en el cliente.
 * Compresión local vía canvas: las fotos se redimensionan y codifican
 * como JPEG antes de entrar al estado (dataURL). Cuando exista backend,
 * el mismo resultado se enviará como multipart a FastAPI.
 */

export interface OpcionesCompresion {
  /** Dimensión máxima (ancho o alto) en px — por defecto 1600 */
  maxDim?: number;
  /** Calidad JPEG 0–1 — por defecto 0.82 */
  quality?: number;
}

export const MAX_FOTOS_POR_APORTE = 4;
export const MAX_BYTES_FOTO_ORIGINAL = 5 * 1024 * 1024; // 5 MB

export function esImagenValida(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  return file.size <= MAX_BYTES_FOTO_ORIGINAL;
}

/** Convierte un File de imagen a dataURL JPEG comprimido y redimensionado */
export async function fileToDataUrlComprimido(
  file: File,
  opts: OpcionesCompresion = {}
): Promise<string> {
  const { maxDim = 1600, quality = 0.82 } = opts;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
