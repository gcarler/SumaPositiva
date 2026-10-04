import { apiFetch } from "@/core/http/api-client";
import type {
  TableroConsolidado,
  DesgloseWeb,
  DesgloseMesas,
  EscenarioEspecial,
  DesgloseCanalEscenarios,
  EscenarioEspecialCrear,
} from "../models/participacion";
export function normalizarConsolidado(raw: Partial<TableroConsolidado> | null | undefined): TableroConsolidado {
  const granTotal = Number(raw?.gran_total_participantes_distrital ?? raw?.totalCartageneros ?? 0);
  const web = Number(raw?.total_canal_web ?? raw?.participacionWeb ?? 0);
  const mesas = Number(raw?.total_canal_mesas ?? raw?.participacionMesas ?? 0);
  const escenarios = Number(raw?.total_canal_escenarios ?? raw?.participacionEscenarios ?? 0);
  const unicos = Number(raw?.participantes_unicos_identificados ?? granTotal);

  const pctWeb = raw?.porcentaje_canal_web ?? (granTotal > 0 ? Number(((web / granTotal) * 100).toFixed(2)) : 0);
  const pctMesas = raw?.porcentaje_canal_mesas ?? (granTotal > 0 ? Number(((mesas / granTotal) * 100).toFixed(2)) : 0);
  const pctEscenarios = raw?.porcentaje_canal_escenarios ?? (granTotal > 0 ? Number(((escenarios / granTotal) * 100).toFixed(2)) : 0);

  const fechaCorte = raw?.fecha_corte ?? raw?.ultimaActualizacion ?? new Date().toISOString();

  return {
    gran_total_participantes_distrital: granTotal,
    participantes_unicos_identificados: unicos,
    total_canal_web: web,
    total_canal_mesas: mesas,
    total_canal_escenarios: escenarios,
    porcentaje_canal_web: pctWeb,
    porcentaje_canal_mesas: pctMesas,
    porcentaje_canal_escenarios: pctEscenarios,
    desglose_territorial_agregado: raw?.desglose_territorial_agregado ?? [],
    fecha_corte: fechaCorte,

    // Compatibilidad UI
    totalCartageneros: granTotal,
    participacionWeb: web,
    participacionMesas: mesas,
    participacionEscenarios: escenarios,
    desglose: raw?.desglose ?? {
      hombres: Math.round(granTotal * 0.46),
      mujeres: Math.round(granTotal * 0.53),
      otros: Math.round(granTotal * 0.01),
      jovenes: Math.round(granTotal * 0.3),
      adultos: Math.round(granTotal * 0.5),
      adultosMayores: Math.round(granTotal * 0.2),
      enfoqueDiferencial: {},
    },
    ultimaActualizacion: fechaCorte,
  };
}

export function normalizarDesgloseWeb(raw: Partial<DesgloseWeb> | null | undefined): DesgloseWeb {
  const totalAportes = Number(raw?.total_aportes ?? raw?.totalAportes ?? 0);
  const porLinea = raw?.por_linea_estrategica ?? [];
  const porDimension = raw?.por_dimension ?? [];
  const porTerritorio = raw?.por_territorio ?? [];

  // Reconstruir mapas porLineaEstrategica y porDimension para retrocompatibilidad UI
  const porLineaMap: Record<string, number> = raw?.porLineaEstrategica ? { ...raw.porLineaEstrategica } : {};
  if (porLinea.length > 0) {
    for (const item of porLinea) {
      const key = item.titulo || item.codigo;
      if (key) {
        porLineaMap[key] = item.total_aportes;
      }
    }
  }

  const porDimensionMap: Record<string, number> = raw?.porDimension ? { ...raw.porDimension } : {};
  if (porDimension.length > 0) {
    for (const item of porDimension) {
      const key = item.nombre || item.codigo;
      if (key) {
        porDimensionMap[key] = item.total_aportes;
      }
    }
  }

  return {
    total_aportes: totalAportes,
    total_apoyos: Number(raw?.total_apoyos ?? 0),
    total_respuestas_formularios: Number(raw?.total_respuestas_formularios ?? 0),
    participantes_unicos_web: Number(raw?.participantes_unicos_web ?? 0),
    por_linea_estrategica: porLinea,
    por_dimension: porDimension,
    por_territorio: porTerritorio,

    // Compatibilidad UI
    totalAportes,
    porLineaEstrategica: porLineaMap,
    porDimension: porDimensionMap,
  };
}

export function normalizarDesgloseMesas(raw: Partial<DesgloseMesas> | null | undefined): DesgloseMesas {
  const totalParticipantes = Number(raw?.total_participantes ?? raw?.totalAsistentes ?? 0);
  const jerarquia = raw?.jerarquia_mesas ?? [];

  const porMesaMap: Record<string, number> = raw?.porMesa ? { ...raw.porMesa } : {};
  if (jerarquia.length > 0) {
    for (const item of jerarquia) {
      const key = item.nombre || item.codigo;
      if (key) {
        porMesaMap[key] = item.asistentes_conteo;
      }
    }
  }

  return {
    total_mesas_principales: Number(raw?.total_mesas_principales ?? 0),
    total_submesas: Number(raw?.total_submesas ?? 0),
    total_participantes: totalParticipantes,
    participantes_unicos_mesas: Number(raw?.participantes_unicos_mesas ?? totalParticipantes),
    total_actas_cerradas: Number(raw?.total_actas_cerradas ?? 0),
    jerarquia_mesas: jerarquia,

    // Compatibilidad UI
    totalAsistentes: totalParticipantes,
    porMesa: porMesaMap,
  };
}

export function normalizarEscenario(raw: Partial<EscenarioEspecial>): EscenarioEspecial {
  const totalAsistentes = Number(raw.total_asistentes ?? raw.asistentes ?? 0);
  const nombre = raw.nombre || raw.titulo || "Escenario Especial";
  const tipo = raw.tipo_escenario || raw.tipo || "OTRO";
  const entidad = raw.entidad_convocante || raw.entidadConvocante || "Alcaldía Mayor de Cartagena";

  const rawPoblacional = raw.desglose_poblacional ?? (raw.desglose as Record<string, unknown>) ?? {};

  return {
    id: raw.id || "",
    codigo_unico: raw.codigo_unico || `ESC-${raw.id?.slice(0, 6) || "000"}`,
    nombre,
    tipo_escenario: tipo,
    territorio_id: raw.territorio_id ?? raw.territorioId ?? null,
    territorio_nombre: raw.territorio_nombre ?? null,
    fecha: raw.fecha || new Date().toISOString().split("T")[0],
    lugar: raw.lugar || "Cartagena de Indias",
    entidad_convocante: entidad,
    total_asistentes: totalAsistentes,
    desglose_poblacional: rawPoblacional,
    sintesis_acuerdos: raw.sintesis_acuerdos ?? null,
    url_evidencia: raw.url_evidencia ?? null,
    estado: raw.estado || "REALIZADO",
    creado_en: raw.creado_en,
    actualizado_en: raw.actualizado_en,

    // Compatibilidad UI
    titulo: nombre,
    tipo,
    territorioId: raw.territorio_id ?? raw.territorioId ?? undefined,
    entidadConvocante: entidad,
    asistentes: totalAsistentes,
    desglose: raw.desglose ?? {
      hombres: Number(rawPoblacional.hombres ?? 0),
      mujeres: Number(rawPoblacional.mujeres ?? 0),
      otros: Number(rawPoblacional.otros ?? 0),
      jovenes: Number(rawPoblacional.jovenes ?? 0),
      adultos: Number(rawPoblacional.adultos ?? 0),
      adultosMayores: Number(rawPoblacional.adultosMayores ?? 0),
      enfoqueDiferencial: (rawPoblacional.enfoqueDiferencial as Record<string, number>) ?? {},
    },
  };
}

export async function obtenerConsolidado(): Promise<TableroConsolidado> {
  const raw = await apiFetch<Partial<TableroConsolidado>>("/participacion/consolidado");
  return normalizarConsolidado(raw);
}

export async function obtenerDesgloseWeb(): Promise<DesgloseWeb> {
  const raw = await apiFetch<Partial<DesgloseWeb>>("/participacion/canal-web");
  return normalizarDesgloseWeb(raw);
}

export async function obtenerDesgloseMesas(): Promise<DesgloseMesas> {
  const raw = await apiFetch<Partial<DesgloseMesas>>("/participacion/canal-mesas");
  return normalizarDesgloseMesas(raw);
}

export async function obtenerDesgloseEscenarios(): Promise<DesgloseCanalEscenarios> {
  const raw = await apiFetch<{
    total_escenarios: number;
    total_asistentes: number;
    por_tipo: Record<string, number>;
    escenarios: Partial<EscenarioEspecial>[];
  }>("/participacion/canal-escenarios");
  return {
    total_escenarios: raw.total_escenarios ?? 0,
    total_asistentes: raw.total_asistentes ?? 0,
    por_tipo: raw.por_tipo ?? {},
    escenarios: (raw.escenarios ?? []).map(normalizarEscenario),
  };
}

export async function listarEscenarios(): Promise<EscenarioEspecial[]> {
  const raw = await apiFetch<Partial<EscenarioEspecial>[]>("/participacion/escenarios-especiales");
  return (raw ?? []).map(normalizarEscenario);
}

export async function guardarEscenario(
  data: Partial<EscenarioEspecial> | EscenarioEspecialCrear
): Promise<EscenarioEspecial> {
  const nombre = data.nombre || data.titulo || "Nuevo Escenario Especial";
  const payload: EscenarioEspecialCrear = {
    codigo_unico: data.codigo_unico || `ESC-${Date.now().toString().slice(-4)}`,
    nombre,
    tipo_escenario: (data.tipo_escenario || data.tipo || "ENCUENTRO_COMUNITARIO").toUpperCase(),
    territorio_id: data.territorio_id || data.territorioId || null,
    fecha: data.fecha || new Date().toISOString().split("T")[0],
    lugar: data.lugar || "Cartagena de Indias",
    entidad_convocante: data.entidad_convocante || data.entidadConvocante || "Secretaría del Interior",
    total_asistentes: Number(data.total_asistentes ?? data.asistentes ?? 0),
    desglose_poblacional: data.desglose_poblacional || (data.desglose as Record<string, unknown>) || {},
    sintesis_acuerdos: data.sintesis_acuerdos || null,
    url_evidencia: data.url_evidencia || null,
    estado: data.estado || "REALIZADO",
  };

  const resp = await apiFetch<Partial<EscenarioEspecial>>("/participacion/escenarios-especiales", {
    method: "POST",
    body: payload,
  });
  return normalizarEscenario(resp);
}
