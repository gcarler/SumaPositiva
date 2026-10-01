import { apiFetch } from "@/core/http/api-client";
import type { TableroConsolidado, DesgloseWeb, DesgloseMesas, EscenarioEspecial } from "../models/participacion";

export async function obtenerConsolidado(): Promise<TableroConsolidado> {
  return apiFetch<TableroConsolidado>("/participacion/consolidado");
}

export async function obtenerDesgloseWeb(): Promise<DesgloseWeb> {
  return apiFetch<DesgloseWeb>("/participacion/web");
}

export async function obtenerDesgloseMesas(): Promise<DesgloseMesas> {
  return apiFetch<DesgloseMesas>("/participacion/mesas");
}

export async function listarEscenarios(): Promise<EscenarioEspecial[]> {
  return apiFetch<EscenarioEspecial[]>("/participacion/escenarios");
}

export async function guardarEscenario(data: Partial<EscenarioEspecial>): Promise<EscenarioEspecial> {
  return apiFetch<EscenarioEspecial>("/participacion/escenarios", {
    method: "POST",
    body: data,
  });
}
