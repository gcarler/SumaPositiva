export type CategoriaNoticia =
  | "avance_politica"
  | "mesa_realizada"
  | "acuerdo_distrital"
  | "convocatoria"
  | "informe"
  | "logro";

export type EstadoNoticia = "publicada" | "borrador" | "archivada";

export interface Noticia {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  contenido: string;            // Markdown
  imagenPortada?: string;       // URL o Base64
  galeria?: string[];           // Múltiples fotos de soporte
  videoUrl?: string;            // YouTube, Vimeo o MP4
  categoria: CategoriaNoticia;
  autor: string;
  publicadaEn: string;
  destacada: boolean;
  ordenPrioridad: number;       // 1 (máxima prioridad), 2, 3, etc.
  estado: EstadoNoticia;        // "publicada" | "borrador" | "archivada"
  etiquetas: string[];
}

export type NoticiaInput = Omit<Noticia, "id" | "slug" | "publicadaEn">;
