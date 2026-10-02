export type CategoriaNoticia =
  | "avance_politica"
  | "mesa_realizada"
  | "acuerdo_distrital"
  | "convocatoria"
  | "informe"
  | "logro";

export interface Noticia {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;           // 1-2 frases para cards y OG
  contenido: string;         // Markdown completo del artículo
  imagenPortada?: string;    // URL de imagen
  categoria: CategoriaNoticia;
  autor: string;             // "Secretaría de Planeación Distrital"
  publicadaEn: string;       // ISO date
  destacada: boolean;        // Aparece en hero del home
  etiquetas: string[];       // ["mesas", "localidad-1", "participacion"]
}
