/**
 * POLIS — Servicio de Evidencias Fotográficas Sanitizadas (H-08 / AUD-19).
 * Conecta el cargador de fotos con POST /api/v1/evidencias/subir
 * Sanitiza metadatos EXIF y GPS para proteger a líderes sociales y comunitarios.
 * Cumplimiento: Ley 1581 de 2012 (Habeas Data) y salvaguardas forenses de Cartagena.
 */

import { apiFetch } from "@/core/http/api-client";
import { asegurarSesionActiva } from "@/features/aportes/services/aportes-api";

export interface EvidenciaSubidaRespuesta {
  id: string;
  propuesta_id: string | null;
  autor_sujeto_id: string | null;
  nombre_archivo_original: string;
  nombre_archivo_seguro: string;
  tamano_bytes: number;
  tipo_mime: string;
  hash_sha256: string;
  exif_despojado: boolean;
  despojo_exif_exitoso: boolean;
  ancho: number | null;
  alto: number | null;
  creado_en: string;
  archivo_url: string;
}

/**
 * Sube una imagen a /api/v1/evidencias/subir despojando metadatos EXIF/GPS.
 * En caso de fallo de red o del servidor, propaga el error (cero retornos simulados).
 */
export async function subirEvidenciaFotografica(
  archivo: File,
  propuestaId?: string
): Promise<EvidenciaSubidaRespuesta> {
  await asegurarSesionActiva();

  const formData = new FormData();
  formData.append("archivo", archivo);
  if (propuestaId) {
    formData.append("propuesta_id", propuestaId);
  }

  const raw = await apiFetch<Omit<EvidenciaSubidaRespuesta, "archivo_url">>("/evidencias/subir", {
    method: "POST",
    body: formData,
    retry: { retries: 0 },
  });

  return {
    ...raw,
    archivo_url: `/api/v1/evidencias/${raw.id}/archivo`,
  };
}
