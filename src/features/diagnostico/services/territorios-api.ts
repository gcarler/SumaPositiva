/**
 * POLIS — Servicio de Consulta y Analítica Territorial para Diagnóstico
 * Consume y filtra los 15 territorios canónicos de Cartagena.
 */

import { TERRITORIOS_DIAGNOSTICO_CANONICOS } from "../data/territorios-diagnostico.data";
import type {
  FichaTerritorialDiagnostico,
  NivelRiesgo,
  LocalidadCartagena,
} from "../models/territorio-diagnostico";

export interface FiltrosTerritoriales {
  localidad?: LocalidadCartagena | "TODAS";
  riesgo?: NivelRiesgo | "TODOS";
  busqueda?: string;
}

export interface ResumenDiagnosticoTerritorial {
  totalTerritorios: number;
  altoRiesgoCount: number;
  medioRiesgoCount: number;
  moderadoRiesgoCount: number;
  poblacionTotalEstimada: number;
  poblacionTotalVulnerable: number;
  promedioNbi: number;
  totalPropuestasRadicadas: number;
  totalMesasRealizadas: number;
  territoriosEtnicosLey70Count: number;
}

export async function listarTerritoriosDiagnostico(
  filtros?: FiltrosTerritoriales
): Promise<FichaTerritorialDiagnostico[]> {
  let listado = [...TERRITORIOS_DIAGNOSTICO_CANONICOS];

  if (!filtros) {
    return listado;
  }

  const { localidad, riesgo, busqueda } = filtros;

  if (localidad && localidad !== "TODAS") {
    listado = listado.filter((t) => t.localidad === localidad);
  }

  if (riesgo && riesgo !== "TODOS") {
    listado = listado.filter((t) => t.nivelRiesgo === riesgo);
  }

  if (busqueda && busqueda.trim()) {
    const q = busqueda.trim().toLowerCase();
    listado = listado.filter((t) => {
      const matchNombre = t.nombre.toLowerCase().includes(q);
      const matchCodigo = t.codigo.toLowerCase().includes(q);
      const matchLocalidad = t.localidadNombre.toLowerCase().includes(q);
      const matchBarrio = t.barriosPrincipales.some((b) =>
        b.toLowerCase().includes(q)
      );
      const matchUcg = t.ucgsAbarcadas.some((u) => u.toLowerCase().includes(q));
      const matchEtnico = t.nombreComunidadNegra
        ? t.nombreComunidadNegra.toLowerCase().includes(q)
        : false;

      return (
        matchNombre ||
        matchCodigo ||
        matchLocalidad ||
        matchBarrio ||
        matchUcg ||
        matchEtnico
      );
    });
  }

  return listado;
}

export async function obtenerFichaTerritorial(
  id: string
): Promise<FichaTerritorialDiagnostico | undefined> {
  return TERRITORIOS_DIAGNOSTICO_CANONICOS.find((t) => t.id === id);
}

export function calcularResumenDiagnosticoTerritorial(
  territorios: FichaTerritorialDiagnostico[]
): ResumenDiagnosticoTerritorial {
  const total = territorios.length;
  if (total === 0) {
    return {
      totalTerritorios: 0,
      altoRiesgoCount: 0,
      medioRiesgoCount: 0,
      moderadoRiesgoCount: 0,
      poblacionTotalEstimada: 0,
      poblacionTotalVulnerable: 0,
      promedioNbi: 0,
      totalPropuestasRadicadas: 0,
      totalMesasRealizadas: 0,
      territoriosEtnicosLey70Count: 0,
    };
  }

  let alto = 0;
  let medio = 0;
  let moderado = 0;
  let poblacionTotal = 0;
  let poblacionVulnerableTotal = 0;
  let sumaNbi = 0;
  let propuestasTotal = 0;
  let mesasTotal = 0;
  let etnicos = 0;

  for (const t of territorios) {
    if (t.nivelRiesgo === "ALTO") alto++;
    else if (t.nivelRiesgo === "MEDIO") medio++;
    else moderado++;

    poblacionTotal += t.poblacionEstimada;
    poblacionVulnerableTotal += t.poblacionVulnerable;
    sumaNbi += t.porcentajeNbi;
    propuestasTotal += t.participacion.propuestasRadicadas;
    mesasTotal += t.participacion.mesasRealizadas;
    if (t.esEtnicoLey70) etnicos++;
  }

  return {
    totalTerritorios: total,
    altoRiesgoCount: alto,
    medioRiesgoCount: medio,
    moderadoRiesgoCount: moderado,
    poblacionTotalEstimada: poblacionTotal,
    poblacionTotalVulnerable: poblacionVulnerableTotal,
    promedioNbi: Number((sumaNbi / total).toFixed(1)),
    totalPropuestasRadicadas: propuestasTotal,
    totalMesasRealizadas: mesasTotal,
    territoriosEtnicosLey70Count: etnicos,
  };
}
