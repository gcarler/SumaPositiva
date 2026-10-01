import { apiFetch } from "@/core/http/api-client";
import type { Formulario, AnaliticaFormulario } from "../models/formulario";

export async function listarFormularios(): Promise<Formulario[]> {
  return apiFetch<Formulario[]>("/formularios");
}

export async function obtenerFormulario(id: string): Promise<Formulario> {
  return apiFetch<Formulario>(`/formularios/${id}`);
}

export async function crearFormulario(data: Omit<Formulario, "id" | "respuestasCount" | "creadoEn" | "actualizadoEn">): Promise<Formulario> {
  return apiFetch<Formulario>("/formularios", {
    method: "POST",
    body: data,
  });
}

export async function obtenerAnalitica(id: string): Promise<AnaliticaFormulario> {
  return apiFetch<AnaliticaFormulario>(`/formularios/${id}/analitica`);
}
