import { apiFetch } from "@/core/http/api-client";
import type { Noticia, NoticiaInput } from "../models/noticia";

type NoticiaApi = {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  contenido: string;
  imagen_portada: string | null;
  galeria: string[];
  video_url: string | null;
  categoria: Noticia["categoria"];
  autor: string;
  publicada_en: string;
  destacada: boolean;
  orden_prioridad: number;
  estado: Noticia["estado"];
  etiquetas: string[];
};

function adaptarNoticia(noticia: NoticiaApi): Noticia {
  return {
    id: noticia.id,
    slug: noticia.slug,
    titulo: noticia.titulo,
    resumen: noticia.resumen,
    contenido: noticia.contenido,
    imagenPortada: noticia.imagen_portada ?? undefined,
    galeria: noticia.galeria,
    videoUrl: noticia.video_url ?? undefined,
    categoria: noticia.categoria,
    autor: noticia.autor,
    publicadaEn: noticia.publicada_en,
    destacada: noticia.destacada,
    ordenPrioridad: noticia.orden_prioridad,
    estado: noticia.estado,
    etiquetas: noticia.etiquetas,
  };
}

function serializarNoticia(datos: NoticiaInput) {
  return {
    titulo: datos.titulo,
    resumen: datos.resumen,
    contenido: datos.contenido,
    imagen_portada: datos.imagenPortada ?? null,
    galeria: datos.galeria ?? [],
    video_url: datos.videoUrl ?? null,
    categoria: datos.categoria,
    autor: datos.autor,
    destacada: datos.destacada,
    orden_prioridad: datos.ordenPrioridad,
    estado: datos.estado,
    etiquetas: datos.etiquetas,
  };
}

export async function listarNoticiasPublicas(): Promise<Noticia[]> {
  const datos = await apiFetch<NoticiaApi[]>("/noticias");
  return datos.map(adaptarNoticia);
}

export async function listarNoticiasGestion(): Promise<Noticia[]> {
  const datos = await apiFetch<NoticiaApi[]>("/noticias/gestion");
  return datos.map(adaptarNoticia);
}

export async function obtenerNoticiaGestion(id: string): Promise<Noticia> {
  return adaptarNoticia(await apiFetch<NoticiaApi>(`/noticias/gestion/${id}`));
}

export async function obtenerNoticiaPublica(id: string): Promise<Noticia> {
  return adaptarNoticia(await apiFetch<NoticiaApi>(`/noticias/id/${id}`));
}

export async function crearNoticia(datos: NoticiaInput): Promise<Noticia> {
  return adaptarNoticia(await apiFetch<NoticiaApi>("/noticias/gestion", {
    method: "POST",
    body: serializarNoticia(datos),
  }));
}

export async function actualizarNoticia(id: string, datos: NoticiaInput): Promise<Noticia> {
  return adaptarNoticia(await apiFetch<NoticiaApi>(`/noticias/gestion/${id}`, {
    method: "PUT",
    body: serializarNoticia(datos),
  }));
}

export async function eliminarNoticia(id: string): Promise<void> {
  await apiFetch<void>(`/noticias/gestion/${id}`, { method: "DELETE" });
}
